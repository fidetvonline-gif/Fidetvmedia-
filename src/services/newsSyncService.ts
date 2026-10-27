import { supabase } from '@/lib/supabase';
import { News as NewsType } from '@/types';
import { safeLocalStorage } from '@/lib/storage';
import { getHighQualityImage } from '@/lib/utils';
import AUTO_BLOGS from '@/data/auto_blogs.json';

type NewsChangeListener = (news: NewsType[]) => void;

class NewsSyncService {
  private static instance: NewsSyncService | null = null;
  private currentNews: NewsType[] = [];
  private listeners: Set<NewsChangeListener> = new Set();
  private channel: any = null;
  private isInitialized = false;
  private isSyncing = false;
  private lastSyncTime: string | null = null;
  private pollIntervalHandle: any = null;
  private visibilityListenerAdded = false;

  private constructor() {
    this.currentNews = this.loadInitialNews();
  }

  public static getInstance(): NewsSyncService {
    if (!NewsSyncService.instance) {
      NewsSyncService.instance = new NewsSyncService();
    }
    return NewsSyncService.instance;
  }

  private loadInitialNews(): NewsType[] {
    const seed = (AUTO_BLOGS as any[]) || [];
    try {
      const cached = safeLocalStorage.getItem('fidetv_live_blogs_v3');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const combined = [...parsed, ...seed];
          const map = new Map();
          for (const item of combined) {
            if (item && item.id && !map.has(item.id)) {
              map.set(item.id, item);
            }
          }
          return Array.from(map.values());
        }
      }
    } catch {
      // Fallback
    }
    return seed;
  }

  /**
   * Initializes real-time subscriptions with Supabase & periodic auto-polling
   */
  public init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    console.log('[NewsSyncService] Initializing news auto-updater and real-time subscription...');

    // Perform initial fetch & sync
    this.refreshNews();

    // 1. Auto-polling interval: fetch fresh articles every 60 seconds while page is open
    if (!this.pollIntervalHandle && typeof window !== 'undefined') {
      this.pollIntervalHandle = window.setInterval(() => {
        this.refreshNews();
      }, 60 * 1000);
    }

    // 2. Tab focus & visibility handler: refresh if inactive for >3 minutes
    if (!this.visibilityListenerAdded && typeof document !== 'undefined') {
      this.visibilityListenerAdded = true;
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          const now = Date.now();
          const lastSync = this.lastSyncTime ? new Date(this.lastSyncTime).getTime() : 0;
          if (now - lastSync > 3 * 60 * 1000) {
            console.log('[NewsSyncService] Tab regained visibility, auto-refreshing news feed...');
            this.refreshNews();
          }
        }
      });
    }

    try {
      // Create real-time channel as requested ('realtime')
      // We use a robust subscription strategy to ensure both DB changes and broadcasts are captured
      console.log('[NewsSyncService] Establishing connection to "realtime" channel...');
      
      this.channel = supabase
        .channel('realtime', {
          config: {
            broadcast: { self: true },
            presence: { key: 'news-viewer' }
          }
        })
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'news' },
          (payload: any) => {
            console.log('%c[NewsSyncService] DB EVENT RECEIVED:', 'color: #10b981; font-weight: bold;', payload.eventType, payload.new?.title);
            this.handleRealtimeEvent(payload);
          }
        )
        .on('broadcast', { event: 'news-updated' }, (payload: any) => {
          console.log('%c[NewsSyncService] BROADCAST RECEIVED:', 'color: #3b82f6; font-weight: bold;', payload);
          // When a broadcast is received, it means the server has finished a sync cycle
          // We trigger a refresh to get the latest data from the API
          this.refreshNews(true);
        })
        .subscribe((status: string, err?: any) => {
          if (status === 'SUBSCRIBED') {
            console.log('%c[NewsSyncService] Real-time connection established successfully.', 'color: #10b981;');
          } else if (status === 'CLOSED') {
            console.warn('[NewsSyncService] Real-time connection closed.');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('[NewsSyncService] Real-time channel error:', err);
            // Fallback: increase polling frequency if realtime is broken
            this.setupFallbackPolling(30000);
          }
        });
    } catch (err) {
      console.error('[NewsSyncService] Critical Realtime setup error:', err);
      this.setupFallbackPolling(60000);
    }
  }

  private setupFallbackPolling(ms: number) {
    if (this.pollIntervalHandle) {
      clearInterval(this.pollIntervalHandle);
    }
    this.pollIntervalHandle = setInterval(() => {
      console.log('[NewsSyncService] Fallback polling triggered...');
      this.refreshNews();
    }, ms);
  }


  private handleRealtimeEvent(payload: any) {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    if (eventType === 'INSERT' && newRecord) {
      if (newRecord.is_published === false) return;
      console.log('[NewsSyncService] Handling INSERT event for:', newRecord.title);
      const formatted: NewsType = this.formatDbRecord(newRecord);
      
      // Ensure we don't have duplicates
      const filtered = this.currentNews.filter(n => n.id !== formatted.id && n.slug !== formatted.slug);
      this.currentNews = [formatted, ...filtered];
      
      // Persist locally
      this.persistToCache();
      this.notifyListeners();
    } else if (eventType === 'UPDATE' && newRecord) {
      if (newRecord.is_published === false) {
        // If it was published but now unpublished, remove it
        this.currentNews = this.currentNews.filter(n => n.id !== newRecord.id);
      } else {
        console.log('[NewsSyncService] Handling UPDATE event for:', newRecord.title);
        const formatted: NewsType = this.formatDbRecord(newRecord);
        this.currentNews = this.currentNews.map(n => 
          (n.id === formatted.id || (formatted.slug && n.slug === formatted.slug)) ? formatted : n
        );
      }
      this.persistToCache();
      this.notifyListeners();
    } else if (eventType === 'DELETE' && oldRecord) {
      console.log('[NewsSyncService] Handling DELETE event for ID:', oldRecord.id);
      this.currentNews = this.currentNews.filter(n => n.id !== oldRecord.id);
      this.persistToCache();
      this.notifyListeners();
    } else {
      console.log('[NewsSyncService] Unknown realtime event type, triggering full refresh.');
      this.refreshNews(true);
    }
  }

  private formatDbRecord(record: any): NewsType {
    const slug = record.slug || record.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || record.id;
    return {
      id: record.id,
      slug,
      title: record.title,
      excerpt: record.excerpt || record.description || (record.content ? record.content.substring(0, 160) + '...' : ''),
      description: record.description || record.excerpt || '',
      content: record.content || '',
      category: record.category || 'News',
      tags: Array.from(new Set(record.tags || ['Broadcasting', 'News'])),
      image_url: record.image_url || getHighQualityImage(undefined, record.category, record.title),
      image_urls: record.image_urls || (record.image_url ? [record.image_url] : []),
      author_id: record.author_id || 'fidetv_admin',
      is_published: record.is_published ?? true,
      created_at: record.created_at || new Date().toISOString(),
      profiles: record.profiles || {
        username: 'FideTV News Desk',
        avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=FideTV_NewsDesk'
      }
    };
  }

  private persistToCache() {
    try {
      safeLocalStorage.setItem('fidetv_live_blogs_v3', JSON.stringify(this.currentNews));
    } catch (e) {
      // silent fail
    }
  }

  /**
   * Fetch and synchronize news from both server API and Supabase
   */
  public async refreshNews(force = false): Promise<NewsType[]> {
    if (this.isSyncing && !force) return this.currentNews;
    this.isSyncing = true;

    try {
      console.log(`[NewsSyncService] Syncing news wire (force=${force})...`);
      let combined: NewsType[] = [];
      
      // 1. Fetch from Supabase database directly
      try {
        const { data: dbNews, error: dbError } = await supabase
          .from('news')
          .select('*')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(60);
        if (!dbError && dbNews && dbNews.length > 0) {
          combined.push(...dbNews.map(r => this.formatDbRecord(r)));
        }
      } catch (e) {
        console.warn('[NewsSyncService] Supabase direct fetch warning:', e);
      }

      // 2. Fetch from backend /api/news endpoint to catch latest live feed dispatches
      try {
        const url = force ? '/api/news?refresh=true' : '/api/news';
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            combined.push(...data.map((r: any) => this.formatDbRecord(r)));
          }
        }
      } catch (e) {
        console.warn('[NewsSyncService] Backend /api/news warning:', e);
      }

      // 3. Fallback to bundled data if completely empty
      if (combined.length === 0 && this.currentNews.length === 0) {
        combined = (AUTO_BLOGS as any[]) || [];
      }

      // 3. Strict deduplication by slug, id, and normalized title
      if (combined.length > 0) {
        const uniqueMap = new Map<string, NewsType>();
        
        // Always add existing news first so posts never disappear
        for (const item of this.currentNews) {
          const key = item.slug || item.id || (item.title ? item.title.toLowerCase().trim() : '');
          if (key) uniqueMap.set(key, item);
        }

        // Add fresh items (overwriting if needed)
        for (const item of combined) {
          const key = item.slug || item.id || (item.title ? item.title.toLowerCase().trim() : Math.random().toString());
          
          // Ensure image_url is properly validated and high-resolution
          const finalItem = {
            ...item,
            image_url: item.image_url || getHighQualityImage(undefined, item.category, item.title)
          };
          uniqueMap.set(key, finalItem);
        }

        const deduplicated = Array.from(uniqueMap.values());
        // Sort by created_at descending
        deduplicated.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        this.currentNews = deduplicated;
        this.lastSyncTime = new Date().toISOString();
        this.persistToCache();
      }

      this.notifyListeners();
      return this.currentNews;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Force trigger full bidirectional synchronization across app environment and domain database
   */
  public async triggerFullSync(): Promise<{ success: boolean; message: string; count: number }> {
    try {
      const res = await fetch('/api/news/sync', { method: 'POST' });
      const data = await res.json();
      await this.refreshNews();
      return {
        success: data.success ?? true,
        message: data.message || 'News synchronization completed successfully.',
        count: this.currentNews.length
      };
    } catch (err: any) {
      await this.refreshNews();
      return {
        success: false,
        message: err.message || 'Sync failed',
        count: this.currentNews.length
      };
    }
  }

  public getNews(): NewsType[] {
    return this.currentNews;
  }

  public getLastSyncTime(): string | null {
    return this.lastSyncTime;
  }

  public subscribe(listener: NewsChangeListener): () => void {
    this.listeners.add(listener);
    // Call immediately with current state
    listener(this.currentNews);

    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentNews);
      } catch (e) {
        console.error('[NewsSyncService] Error in listener callback:', e);
      }
    });
  }

  public destroy() {
    if (this.pollIntervalHandle) {
      clearInterval(this.pollIntervalHandle);
      this.pollIntervalHandle = null;
    }
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.listeners.clear();
    this.isInitialized = false;
  }
}

export const newsSyncService = NewsSyncService.getInstance();
