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
    try {
      const cached = safeLocalStorage.getItem('fidetv_live_blogs_v3');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return (AUTO_BLOGS as any[]) || [];
  }

  /**
   * Initializes real-time subscriptions with Supabase & periodic auto-polling
   */
  public init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    console.log('[NewsSyncService] Initializing news auto-updater and real-time subscription...');

    // Clear stale cache (older than 1 hour)
    try {
      safeLocalStorage.removeItem('fidetv_live_blogs_v3');
    } catch {}

    // Perform initial fetch & sync
    this.refreshNews();

    // 1. Auto-polling interval: fetch fresh articles every 2 minutes while page is open
    if (!this.pollIntervalHandle && typeof window !== 'undefined') {
      this.pollIntervalHandle = window.setInterval(() => {
        this.refreshNews();
      }, 120 * 1000);
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
      // Create real-time channel
      this.channel = supabase
        .channel('fidetv-news-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'news' },
          (payload: any) => {
            console.log('[NewsSyncService] Realtime DB change received:', payload.eventType, payload.new?.title);
            this.handleRealtimeEvent(payload);
          }
        )
        .on('broadcast', { event: 'news-updated' }, (payload: any) => {
          console.log('[NewsSyncService] Broadcast news update received:', payload);
          this.refreshNews();
        })
        .subscribe((status: string) => {
          console.log('[NewsSyncService] Supabase Realtime subscription status:', status);
        });
    } catch (err) {
      console.warn('[NewsSyncService] Realtime subscription init error:', err);
    }
  }

  private handleRealtimeEvent(payload: any) {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    if (eventType === 'INSERT' && newRecord) {
      const formatted: NewsType = this.formatDbRecord(newRecord);
      // Prepend or replace if already exists
      const filtered = this.currentNews.filter(n => n.id !== formatted.id && n.slug !== formatted.slug);
      this.currentNews = [formatted, ...filtered];
      this.notifyListeners();
    } else if (eventType === 'UPDATE' && newRecord) {
      const formatted: NewsType = this.formatDbRecord(newRecord);
      this.currentNews = this.currentNews.map(n => 
        (n.id === formatted.id || (formatted.slug && n.slug === formatted.slug)) ? formatted : n
      );
      this.notifyListeners();
    } else if (eventType === 'DELETE' && oldRecord) {
      this.currentNews = this.currentNews.filter(n => n.id !== oldRecord.id);
      this.notifyListeners();
    } else {
      this.refreshNews();
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
      tags: record.tags || ['Broadcasting', 'News'],
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

  /**
   * Fetch and synchronize news from both server API and Supabase
   */
  public async refreshNews(force = false): Promise<NewsType[]> {
    if (this.isSyncing) return this.currentNews;
    this.isSyncing = true;

    try {
      // 1. Fetch from unified backend news endpoint (which merges auto_blogs & database)
      let combined: NewsType[] = [];
      try {
        const url = force ? '/api/news?refresh=true' : '/api/news';
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            combined = data;
          }
        }
      } catch (e) {
        console.warn('[NewsSyncService] Backend /api/news warning:', e);
      }

      // 2. No redundant Supabase fetch needed; /api/news handles consolidation.

      // 3. Fallback to bundled data if empty
      if (combined.length === 0) {
        combined = (AUTO_BLOGS as any[]) || [];
      }

      // 4. Strict deduplication by slug, id, and normalized title
      const uniqueMap = new Map<string, NewsType>();
      for (const item of combined) {
        const key = item.slug || item.id || (item.title ? item.title.toLowerCase().trim() : Math.random().toString());
        if (!uniqueMap.has(key)) {
          // Ensure image_url is properly validated and high-resolution
          const finalItem = {
            ...item,
            image_url: item.image_url || getHighQualityImage(undefined, item.category, item.title)
          };
          uniqueMap.set(key, finalItem);
        }
      }

      const deduplicated = Array.from(uniqueMap.values());
      this.currentNews = deduplicated;
      this.lastSyncTime = new Date().toISOString();

      try {
        safeLocalStorage.setItem('fidetv_live_blogs_v3', JSON.stringify(deduplicated));
      } catch {}

      this.notifyListeners();
      return deduplicated;
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
