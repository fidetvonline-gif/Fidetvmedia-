import axios from 'axios';
import * as cheerio from 'cheerio';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs/promises';
import path from 'path';
import { SupabaseClient } from '@supabase/supabase-js';
import { validateAndEnrichNewsCover, getContentSpecificImage } from '../../server/media/newsImageValidator.js';

export interface AutoBlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
  image_url: string;
  image_urls?: string[];
  read_time: string;
  source_name: string;
  source_url?: string;
  region?: string;
  author_id: string;
  is_published: boolean;
  created_at: string;
  updated_at?: string;
  profiles: {
    username: string;
    avatar_url: string;
    role?: string;
  };
}

interface RawFeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  sourceName: string;
  defaultCategory: string;
  region?: string;
  imageUrl?: string;
  paragraphs?: string[];
  fullContent?: string;
}

const NEWS_SOURCES = [
  {
    name: 'Channels Television Nigeria',
    url: 'https://www.channelstv.com/feed/',
    defaultCategory: 'Global News & Culture',
    region: 'Nigeria'
  },
  {
    name: 'Vanguard Nigeria News',
    url: 'https://www.vanguardngr.com/feed/',
    defaultCategory: 'Global News & Culture',
    region: 'Nigeria'
  },
  {
    name: 'Punch Nigeria Wire',
    url: 'https://punchng.com/feed/',
    defaultCategory: 'Global News & Culture',
    region: 'Nigeria'
  },
  {
    name: 'Tech & Digital Innovation',
    url: 'https://feeds.bbci.co.uk/news/technology/rss.xml',
    defaultCategory: 'Technology & AI',
    region: 'Global'
  },
  {
    name: 'Entertainment & Arts Wire',
    url: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml',
    defaultCategory: 'Media & Entertainment',
    region: 'Global'
  },
  {
    name: 'Media Tech Disruptions',
    url: 'https://techcrunch.com/feed/',
    defaultCategory: 'Broadcasting & Streaming',
    region: 'Global'
  }
];

export class AutoBlogService {
  private static instance: AutoBlogService | null = null;
  private posts: AutoBlogPost[] = [];
  private nigeriaNewsCache: AutoBlogPost[] = [];
  private lastNigeriaFetchTime: string | null = null;
  private supabase: SupabaseClient | null = null;
  private isSyncing = false;
  private lastSyncTime: string | null = null;
  private storageFilePath: string;
  private syncIntervalHandle: NodeJS.Timeout | null = null;
  private lastPingReport: any = null;
  private channel: any = null;

  constructor(supabaseClient: SupabaseClient | null = null) {
    this.supabase = supabaseClient;
    this.storageFilePath = path.resolve(process.cwd(), 'src/data/auto_blogs.json');
  }

  public static getInstance(supabaseClient: SupabaseClient | null = null): AutoBlogService {
    if (!AutoBlogService.instance) {
      AutoBlogService.instance = new AutoBlogService(supabaseClient);
    } else if (supabaseClient && !AutoBlogService.instance.supabase) {
      AutoBlogService.instance.supabase = supabaseClient;
    }
    return AutoBlogService.instance;
  }

  public setSupabaseClient(client: SupabaseClient) {
    this.supabase = client;
  }

  public async init() {
    console.log('[AutoBlogService] Initializing automated blog news & sync engine...');
    await this.loadPersistedPosts();
    
    // Always pull latest from Supabase immediately on startup to ensure we aren't using stale bundled data
    await this.pullFromSupabase().catch(err => console.error('[AutoBlogService] Startup DB pull failed:', err));

    // Run full sync cycle (RSS + DB) in background
    setTimeout(() => {
      this.syncLatestNews().catch(err => {
        console.error('[AutoBlogService] Initial full sync error:', err);
      });
    }, 5000);

    // Schedule periodic automatic update every 30 minutes
    if (!this.syncIntervalHandle) {
      this.syncIntervalHandle = setInterval(() => {
        console.log('[AutoBlogService] Triggering scheduled automated news update cycle...');
        this.syncLatestNews().catch(err => {
          console.error('[AutoBlogService] Scheduled sync error:', err);
        });
      }, 30 * 60 * 1000);
    }

    // Initialize real-time listener to keep server cache in sync with DB
    this.setupRealtimeListener();
  }

  private setupRealtimeListener() {
    if (!this.supabase) return;

    try {
      console.log('[AutoBlogService] Setting up server-side real-time listener for "news" table...');
      this.channel = this.supabase
        .channel('server-news-sync')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'news' },
          async (payload: any) => {
            console.log('[AutoBlogService] Real-time DB change detected on server:', payload.eventType);
            // Refresh from DB to ensure we have the latest sorted state
            await this.pullFromSupabase();
          }
        )
        .subscribe();
    } catch (err) {
      console.error('[AutoBlogService] Real-time setup failed:', err);
    }
  }

  /**
   * Check whether the cached news is stale (older than maxAgeMinutes, or never synced)
   */
  public isStale(maxAgeMinutes = 15): boolean {
    if (!this.lastSyncTime) return true;
    const ageMs = Date.now() - new Date(this.lastSyncTime).getTime();
    return ageMs > maxAgeMinutes * 60 * 1000;
  }

  /**
   * Fast synchronization from Supabase database only (no external feed scraping).
   * Ensures the local posts array matches the database state.
   */
  public async pullFromSupabase(): Promise<number> {
    if (!this.supabase) return 0;
    
    try {
      const { data: dbRows, error: dbError } = await this.supabase
        .from('news')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(60);

      if (dbError) throw dbError;
      if (!dbRows || !Array.isArray(dbRows)) return 0;

      let syncedCount = 0;
      for (const row of dbRows) {
        const rowSlug = row.slug || this.generateSlug(row.title) || row.id;
        
        const formattedDbPost: AutoBlogPost = {
          id: row.id,
          slug: rowSlug,
          title: row.title,
          excerpt: row.excerpt || row.description || (row.content ? row.content.substring(0, 160) + '...' : ''),
          description: row.description || row.excerpt || '',
          content: row.content || '',
          category: row.category || 'News',
          tags: row.tags || ['Broadcasting', 'News'],
          image_url: row.image_url || 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?q=80&w=800',
          image_urls: row.image_urls || (row.image_url ? [row.image_url] : []),
          read_time: row.read_time || '4 min read',
          source_name: row.source_name || 'FideTV Media',
          author_id: row.author_id || 'fidetv_admin',
          is_published: true,
          created_at: row.created_at || new Date().toISOString(),
          profiles: {
            username: 'FideTV News Desk',
            avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=FideTV_NewsDesk',
            role: 'Official Editor'
          }
        };

        const existingIdx = this.posts.findIndex(p => p.id === row.id || p.slug === rowSlug);
        if (existingIdx >= 0) {
          // Update existing
          this.posts[existingIdx] = { ...this.posts[existingIdx], ...formattedDbPost };
        } else {
          // Add new
          this.posts.unshift(formattedDbPost);
          syncedCount++;
        }
      }

      // Sort and limit
      this.posts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      if (this.posts.length > 60) this.posts = this.posts.slice(0, 60);
      
      this.lastSyncTime = new Date().toISOString();
      
      // Broadcast update to all connected clients immediately
      if (syncedCount > 0) {
        console.log(`[AutoBlogService] Broadcasting ${syncedCount} new articles to 'realtime' channel...`);
        const broadcastChannel = this.supabase.channel('realtime');
        broadcastChannel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            broadcastChannel.send({
              type: 'broadcast',
              event: 'news-updated',
              payload: { 
                count: syncedCount, 
                timestamp: this.lastSyncTime,
                message: 'New articles have been synchronized'
              }
            }).then(() => {
              console.log('[AutoBlogService] Broadcast sent successfully.');
            }).catch(err => {
              console.warn('[AutoBlogService] Broadcast send failed:', err.message);
            });
          }
        });
      }

      return syncedCount;
    } catch (err: any) {
      console.error('[AutoBlogService] pullFromSupabase error:', err.message);
      return 0;
    }
  }

  private async loadPersistedPosts() {
    try {
      const data = await fs.readFile(this.storageFilePath, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const uniqueMap = new Map<string, AutoBlogPost>();
        for (const p of parsed) {
          const key = p.slug || p.id || (p.title ? p.title.toLowerCase().trim() : Math.random().toString());
          if (!uniqueMap.has(key)) {
            uniqueMap.set(key, p);
          }
        }
        this.posts = Array.from(uniqueMap.values());
        console.log(`[AutoBlogService] Loaded ${this.posts.length} unique blog posts from disk cache.`);
        return;
      }
    } catch {
      // Disk file empty or missing
    }

    this.posts = this.getSeedBlogPosts();
    await this.persistPosts();
  }

  public async persistPosts() {
    try {
      const dir = path.dirname(this.storageFilePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(this.storageFilePath, JSON.stringify(this.posts, null, 2), 'utf-8');
    } catch (err) {
      console.error('[AutoBlogService] Failed to persist posts to disk:', err);
    }
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 80);
  }

  private cleanHtml(raw: string): string {
    if (!raw) return '';
    return raw
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Scrapes an article webpage to extract authentic news photo and full multi-paragraph reporting.
   */
  public async scrapeWebArticle(url: string): Promise<{ imageUrl?: string; paragraphs: string[] }> {
    const result: { imageUrl?: string; paragraphs: string[] } = { paragraphs: [] };
    if (!url || !url.startsWith('http')) return result;

    try {
      const cleanUrl = url.split('?')[0];
      const resp = await axios.get(cleanUrl, {
        timeout: 7000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 FideTV-NewsBot/3.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        }
      });

      if (!resp.data || typeof resp.data !== 'string') return result;
      const $page = cheerio.load(resp.data);

      // 1. Extract authentic news photo
      let ogImg = $page('meta[property="og:image"]').attr('content') ||
                  $page('meta[name="twitter:image:src"]').attr('content') ||
                  $page('meta[name="twitter:image"]').attr('content') ||
                  $page('.post-content figure img').first().attr('src') ||
                  $page('article figure img').first().attr('src') ||
                  $page('.entry-content figure img').first().attr('src') ||
                  $page('figure img').first().attr('src') ||
                  '';

      if (ogImg) {
        ogImg = ogImg.trim();
        if (ogImg.includes('ichef.bbci.co.uk')) {
          ogImg = ogImg
            .replace(/\/ace\/standard\/\d+\//, '/ace/standard/1200/')
            .replace(/\/cpsprodpb\/[a-z0-9]+\/live\//, '/cpsprodpb/1200/live/')
            .replace(/\/branded_news\/\d+\//, '/branded_news/1200/');
        }
        const isLogo = ogImg.toLowerCase().includes('punch-logo') ||
                       ogImg.toLowerCase().includes('logo-500x179') ||
                       ogImg.toLowerCase().includes('default-avatar') ||
                       ogImg.toLowerCase().includes('1x1');
        if (!isLogo && ogImg.startsWith('http')) {
          result.imageUrl = ogImg;
        }
      }

      // 2. Extract full multi-paragraph reporting text
      const selectors = [
        '.post-content p',
        'article p',
        '[data-component="text-block"] p',
        '.entry-content p',
        'main article p',
        '.story-body p',
        '.article__body p',
        'main p'
      ];

      for (const sel of selectors) {
        if (result.paragraphs.length >= 4) break;
        $page(sel).each((_, el) => {
          const text = $page(el).text().trim();
          if (
            text.length > 25 &&
            !text.toLowerCase().startsWith('file photo') &&
            !text.toLowerCase().startsWith('photo:') &&
            !text.toLowerCase().startsWith('image caption') &&
            !text.includes('All rights reserved') &&
            !text.includes('Contact:') &&
            !text.includes('Follow BBC') &&
            !text.includes('Sign up for our') &&
            !text.includes('Download the BBC') &&
            !text.includes('Image source,') &&
            !text.includes('Get in touch') &&
            !text.includes('Listen to the latest') &&
            !text.includes('Read More:') &&
            !text.includes('advertisement')
          ) {
            result.paragraphs.push(text);
          }
        });
      }
    } catch {
      // Quiet fallback
    }

    return result;
  }

  public async fetchRawFeeds(): Promise<RawFeedItem[]> {
    const rawItems: RawFeedItem[] = [];

    for (const source of NEWS_SOURCES) {
      try {
        const response = await axios.get(source.url, {
          timeout: 8000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 FideTV-NewsBot/3.0'
          }
        });

        const xml = response.data;
        if (!xml || typeof xml !== 'string') continue;

        const $ = cheerio.load(xml, { xmlMode: true });
        const items = $('item').slice(0, 5).toArray();

        for (const el of items) {
          const title = $(el).find('title').first().text();
          const link = $(el).find('link').first().text();
          const desc = $(el).find('description').first().text();
          const pubDate = $(el).find('pubDate').first().text();
          const rawXml = $(el).html() || '';

          let imageUrl = '';
          const paragraphs: string[] = [];

          // A. Channels TV media:featured
          const featuredMatch = rawXml.match(/<media:featured[^>]+url="([^">]+)"/i);
          if (featuredMatch && featuredMatch[1]) {
            imageUrl = featuredMatch[1];
          }

          // B. media:content, media:thumbnail, enclosure
          if (!imageUrl) {
            imageUrl = $(el).find('media\\:content, content').attr('url') ||
                       $(el).find('media\\:thumbnail, thumbnail').attr('url') ||
                       $(el).find('enclosure[type^="image"]').attr('url') ||
                       '';
          }

          if (!imageUrl) {
            const bbcMatch = rawXml.match(/<media:thumbnail[^>]+url="([^">]+)"/i);
            if (bbcMatch && bbcMatch[1]) {
              imageUrl = bbcMatch[1].replace(/\/standard\/\d+\//, '/standard/976/');
            }
          }

          // C. Content:encoded (Channels TV, Vanguard, etc.)
          const contentEncoded = $(el).find('content\\:encoded').text();
          if (contentEncoded) {
            const $content = cheerio.load(contentEncoded);
            if (!imageUrl) {
              const contentImg = $content('img').first().attr('src');
              if (contentImg && !contentImg.includes('logo') && !contentImg.includes('1x1')) {
                imageUrl = contentImg;
              }
            }
            $content('p').each((_, p) => {
              const t = $content(p).text().trim();
              if (t.length > 20 && !t.includes('Vanguard News') && !t.includes('All rights reserved')) {
                paragraphs.push(t);
              }
            });
          }

          // D. If paragraphs or genuine image is still missing or is a generic logo, scrape article webpage
          const isLogoImg = imageUrl.toLowerCase().includes('punch-logo') || imageUrl.toLowerCase().includes('500x179');
          if ((paragraphs.length < 3 || !imageUrl || isLogoImg) && link) {
            const scraped = await this.scrapeWebArticle(link);
            if (scraped.imageUrl && (!imageUrl || isLogoImg)) {
              imageUrl = scraped.imageUrl;
            }
            if (scraped.paragraphs.length > paragraphs.length) {
              paragraphs.length = 0;
              paragraphs.push(...scraped.paragraphs);
            }
          }

          // E. YouTube embed thumbnail check
          if (imageUrl && (imageUrl.includes('youtube.com') || imageUrl.includes('youtu.be'))) {
            const ytMatch = imageUrl.match(/(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
            if (ytMatch && ytMatch[1]) {
              imageUrl = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
            }
          }

          // Reject logos
          if (imageUrl && (imageUrl.includes('punch-logo') || imageUrl.includes('500x179'))) {
            imageUrl = '';
          }

          const cleanedTitle = this.cleanHtml(title);
          const cleanedDesc = this.cleanHtml(desc);

          if (cleanedTitle && cleanedTitle.length > 10) {
            rawItems.push({
              title: cleanedTitle,
              link: link.trim(),
              description: cleanedDesc,
              pubDate: pubDate || new Date().toISOString(),
              sourceName: source.name,
              defaultCategory: source.defaultCategory,
              region: source.region,
              imageUrl: imageUrl.trim() || undefined,
              paragraphs: paragraphs.length > 0 ? paragraphs : undefined,
              fullContent: paragraphs.length > 0 ? paragraphs.join('\n\n') : cleanedDesc
            });
          }
        }
      } catch (feedErr: any) {
        console.warn(`[AutoBlogService] Failed to fetch feed ${source.name}:`, feedErr.message);
      }
    }

    return rawItems;
  }

  /**
   * Dedicated news aggregation filtered specifically by region ('Nigeria')
   */
  public async getNigeriaNews(forceRefresh = false): Promise<AutoBlogPost[]> {
    const now = Date.now();
    const cacheAge = this.lastNigeriaFetchTime ? now - new Date(this.lastNigeriaFetchTime).getTime() : Infinity;

    // Use cache if under 5 minutes old and forceRefresh is false
    if (!forceRefresh && this.nigeriaNewsCache.length > 0 && cacheAge < 5 * 60 * 1000) {
      return this.nigeriaNewsCache;
    }

    console.log('[AutoBlogService] Fetching & aggregating region-filtered Nigeria news feed...');
    const nigeriaItems: AutoBlogPost[] = [];

    // 1. First include any posts from our main synchronized posts that are tagged Nigeria or from Nigerian sources/topics
    for (const post of this.posts) {
      const isNigeria =
        post.region === 'Nigeria' ||
        post.source_name?.toLowerCase().includes('nigeria') ||
        post.source_name?.toLowerCase().includes('channels') ||
        post.source_name?.toLowerCase().includes('vanguard') ||
        post.title?.toLowerCase().includes('nigeria') ||
        post.title?.toLowerCase().includes('tinubu') ||
        post.title?.toLowerCase().includes('atiku') ||
        post.title?.toLowerCase().includes('akwa ibom') ||
        post.title?.toLowerCase().includes('nnpc') ||
        post.title?.toLowerCase().includes('enugu') ||
        post.title?.toLowerCase().includes('abuja') ||
        post.tags?.some(t => t.toLowerCase().includes('nigeria'));

      if (isNigeria) {
        nigeriaItems.push(post);
      }
    }

    // 2. Fetch live wire from external Nigeria news sources
    const nigerianSources = NEWS_SOURCES.filter(s => s.region === 'Nigeria');
    for (const src of nigerianSources) {
      try {
        const resp = await axios.get(src.url, {
          timeout: 7000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 FideTV-NigeriaWire/3.0'
          }
        });
        const $ = cheerio.load(resp.data, { xmlMode: true });

        const items = $('item').slice(0, 6).toArray();
        for (const el of items) {
          const title = this.cleanHtml($(el).find('title').first().text());
          const link = $(el).find('link').first().text().trim();
          const desc = this.cleanHtml($(el).find('description').first().text());
          const pubDate = $(el).find('pubDate').first().text().trim();
          const rawXml = $(el).html() || '';

          let imageUrl = '';
          const paragraphs: string[] = [];

          // A. Channels TV media:featured
          const featuredMatch = rawXml.match(/<media:featured[^>]+url="([^">]+)"/i);
          if (featuredMatch && featuredMatch[1]) {
            imageUrl = featuredMatch[1];
          }

          // B. media:content, media:thumbnail, enclosure
          if (!imageUrl) {
            imageUrl = $(el).find('media\\:content, content').attr('url') ||
                       $(el).find('media\\:thumbnail, thumbnail').attr('url') ||
                       $(el).find('enclosure[type^="image"]').attr('url') || '';
          }

          // C. Content:encoded (Channels TV, Vanguard)
          const contentEncoded = $(el).find('content\\:encoded').text();
          if (contentEncoded) {
            const $content = cheerio.load(contentEncoded);
            if (!imageUrl) {
              const contentImg = $content('img').first().attr('src');
              if (contentImg && !contentImg.includes('logo') && !contentImg.includes('1x1')) {
                imageUrl = contentImg;
              }
            }
            $content('p').each((_, p) => {
              const t = $content(p).text().trim();
              if (t.length > 20 && !t.includes('Vanguard News') && !t.includes('All rights reserved')) {
                paragraphs.push(t);
              }
            });
          }

          // D. Scrape webpage if needed for full paragraphs or real photo
          const isLogoImg = imageUrl.toLowerCase().includes('punch-logo') || imageUrl.toLowerCase().includes('500x179');
          if ((paragraphs.length < 3 || !imageUrl || isLogoImg) && link) {
            const scraped = await this.scrapeWebArticle(link);
            if (scraped.imageUrl && (!imageUrl || isLogoImg)) {
              imageUrl = scraped.imageUrl;
            }
            if (scraped.paragraphs.length > paragraphs.length) {
              paragraphs.length = 0;
              paragraphs.push(...scraped.paragraphs);
            }
          }

          if (imageUrl && (imageUrl.includes('youtube.com') || imageUrl.includes('youtu.be'))) {
            const ytMatch = imageUrl.match(/(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
            if (ytMatch && ytMatch[1]) imageUrl = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
          }

          if (imageUrl && (imageUrl.includes('punch-logo') || imageUrl.includes('500x179'))) {
            imageUrl = '';
          }

          if (title && title.length > 12) {
            const slug = this.generateSlug(title);
            const exists = nigeriaItems.some(n => n.slug === slug || n.title.toLowerCase() === title.toLowerCase());
            if (!exists) {
              // Validate cover image with our dedicated utility
              const validated = await validateAndEnrichNewsCover(imageUrl, title, desc, 'Global News & Culture');
              
              // Build raw item for full synthesis
              const rawNigeriaItem: RawFeedItem = {
                title,
                link,
                description: desc,
                pubDate: pubDate || new Date().toISOString(),
                sourceName: src.name,
                defaultCategory: 'Global News & Culture',
                region: 'Nigeria',
                imageUrl: validated.validUrl,
                paragraphs: paragraphs.length > 0 ? paragraphs : undefined,
                fullContent: paragraphs.length > 0 ? paragraphs.join('\n\n') : desc
              };

              const synthesized = this.synthesizeFallbackPost(rawNigeriaItem);

              const post: AutoBlogPost = {
                id: crypto.randomUUID(),
                slug,
                title: synthesized.title,
                excerpt: synthesized.excerpt,
                description: synthesized.excerpt,
                content: synthesized.content,
                category: 'Global News & Culture',
                tags: synthesized.tags,
                image_url: validated.validUrl,
                image_urls: [validated.validUrl],
                read_time: synthesized.read_time,
                source_name: src.name,
                source_url: link,
                region: 'Nigeria',
                author_id: 'fidetv-newsbot',
                is_published: true,
                created_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
                profiles: {
                  username: 'Nigeria Regional Bureau',
                  avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=NigeriaNewsDesk',
                  role: 'Regional Wire Desk'
                }
              };
              nigeriaItems.push(post);
            }
          }
        }
      } catch (err: any) {
        console.warn(`[AutoBlogService] Error fetching Nigeria wire ${src.name}:`, err.message);
      }
    }

    // 3. Deduplicate by slug or title
    const uniqueMap = new Map<string, AutoBlogPost>();
    for (const item of nigeriaItems) {
      const key = item.slug || item.id || item.title.toLowerCase().trim();
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      }
    }

    const result = Array.from(uniqueMap.values()).slice(0, 15);
    this.nigeriaNewsCache = result;
    this.lastNigeriaFetchTime = new Date().toISOString();
    return result;
  }

  private isValidGeminiKey(key?: string): boolean {
    if (!key) return false;
    const cleaned = key.trim().replace(/^['"]|['"]$/g, '');
    return cleaned !== '' && !cleaned.toLowerCase().includes('placeholder') && cleaned.length >= 15;
  }

  private async generateWithGemini(rawItem: RawFeedItem): Promise<{
    title: string;
    excerpt: string;
    content: string;
    category: string;
    tags: string[];
    read_time: string;
  } | null> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!this.isValidGeminiKey(apiKey)) {
      return null;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const fullSourceText = rawItem.paragraphs && rawItem.paragraphs.length > 0
        ? rawItem.paragraphs.join('\n\n')
        : (rawItem.fullContent || rawItem.description);

      const prompt = `You are the Lead Digital Media Editor and Journalist for FideTV Media Hub.
FideTV is a 24/7 digital broadcasting platform, live streaming hub, and modern African & international media network.

Analyze this breaking news story and its FULL wire reporting:
Headline: "${rawItem.title}"
Source: "${rawItem.sourceName}"
Category Suggestion: "${rawItem.defaultCategory}"
Region: "${rawItem.region || 'Global'}"

FULL WIRE REPORTING:
"""
${fullSourceText}
"""

CRITICAL INSTRUCTIONS:
1. Write a comprehensive, FULL-LENGTH journalistic news report in Markdown for FideTV's audience.
2. DO NOT summarize into a short brief. You MUST preserve ALL verified facts, official statements, direct quotes, chronological background, and key details from the original wire text.
3. Structure the article with clear sections:
   - ## Introduction & The Breaking Context
   - ## The Full Developing Story
   - ## In-Depth Background & Statements
   - ## Broadcast & Digital Media Perspective
   - ## FideTV Editorial Commentary
   - ## Key Takeaways (bulleted fact sheet)

Output ONLY valid JSON in this exact structure without markdown fences:
{
  "title": "A punchy, captivating journalistic headline",
  "excerpt": "A crisp, compelling 2-sentence summary hook (under 180 chars)",
  "category": "Broadcasting & Streaming | Technology & AI | Media & Entertainment | Global News & Culture | Creator Economy & Production | Sports & Live Events",
  "tags": ["tag1", "tag2", "tag3", "tag4"],
  "read_time": "5 min read",
  "content": "Full Markdown article text containing all sections and complete reporting."
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          maxOutputTokens: 2500,
          temperature: 0.7,
          responseMimeType: 'application/json'
        }
      });

      const responseText = response.text?.trim();
      if (!responseText) return null;

      const cleanJson = responseText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(cleanJson);

      if (parsed.title && parsed.content && parsed.content.length > 300) {
        return {
          title: parsed.title,
          excerpt: parsed.excerpt || rawItem.description.substring(0, 160) + '...',
          content: parsed.content,
          category: parsed.category || rawItem.defaultCategory,
          tags: Array.isArray(parsed.tags) ? parsed.tags : ['DigitalMedia', 'Broadcasting', 'News'],
          read_time: parsed.read_time || '5 min read'
        };
      }
    } catch (aiErr: any) {
      console.warn('[AutoBlogService] Gemini generation notice:', aiErr.message);
    }
    return null;
  }

  private synthesizeFallbackPost(rawItem: RawFeedItem): {
    title: string;
    excerpt: string;
    content: string;
    category: string;
    tags: string[];
    read_time: string;
  } {
    const title = rawItem.title;
    const category = rawItem.defaultCategory;
    const paras = rawItem.paragraphs && rawItem.paragraphs.length > 0 ? rawItem.paragraphs : [rawItem.description];
    
    // Accurate read time calculation
    const totalWordCount = paras.join(' ').split(/\s+/).length;
    const readTimeMinutes = Math.max(3, Math.ceil(totalWordCount / 200));
    const read_time = `${readTimeMinutes} min read`;

    // High quality excerpt from lead paragraph
    const leadPara = paras[0] || rawItem.description || 'Breaking coverage on major industry developments.';
    const excerpt = leadPara.length > 180 ? leadPara.substring(0, 177) + '...' : leadPara;

    let content: string;
    if (paras.length >= 3) {
      const lead = paras.slice(0, 2).join('\n\n');
      const middleStory = paras.slice(2, Math.floor(paras.length * 0.65)).join('\n\n');
      const deepDetails = paras.slice(Math.floor(paras.length * 0.65), Math.max(paras.length - 2, 2)).join('\n\n');
      const concluding = paras.slice(Math.max(paras.length - 2, 2)).join('\n\n');

      content = `${lead}

---

### 📰 The Full Developing Story & Context

${middleStory}

---

### 🔍 Background, Statements & Official Perspectives

${deepDetails || concluding}

${concluding && deepDetails ? `\n\n---\n\n### 🎙️ Perspectives & What Comes Next\n\n${concluding}` : ''}

---

### 📡 Industry & Broadcast Perspective

From a digital media infrastructure viewpoint, major developments like this illustrate the speed with which breaking events reverberate across national and international broadcast channels:
* **Live Wire Distribution**: Real-time multi-platform reporting delivering instantaneous updates to viewers.
* **In-Depth Journalistic Context**: Bringing verified facts, official statements, and unfiltered context over brief summaries.
* **Community Engagement**: Enabling audiences to follow continuous updates and engage through digital broadcasts.

---

### 💡 FideTV Media Editorial Note

At **FideTV Media**, our mission is to deliver comprehensive, unfiltered news covering international media, industry icons, technology, and broadcasting breakthroughs. Whether tracking pivotal governance milestones, cultural shifts, or technological infrastructure, we keep our community equipped with timely, high-fidelity reporting.

---

### 📌 Key Story Takeaways

1. **Primary Subject**: ${title}
2. **Category Focus**: ${category}
3. **Reading Time**: ${read_time}
4. **Source Attribution**: Reporting verified via *${rawItem.sourceName}* original coverage.`;
    } else {
      content = `${paras.join('\n\n')}

---

### 📡 Industry & Broadcast Perspective

From a digital media infrastructure viewpoint, updates of this magnitude demonstrate the critical importance of adaptable, high-capacity broadcasting systems:
* **Real-time Distribution**: The shift towards decentralized, multi-channel broadcast architectures.
* **Audience Interactivity**: Synchronized voice spaces and collaborative commentary.

---

### 💡 FideTV Editorial Commentary

At **FideTV Media**, our commitment is to provide transparent, continuous insights into the evolving landscape of broadcasting, streaming tech, and digital storytelling.

---

### 📌 Key Takeaways

1. **Impact**: Significant immediate relevance for digital media practitioners, creators, and audiences.
2. **Key Insight**: ${leadPara.substring(0, 120)}...
3. **Source Reference**: Live wire coverage courtesy of *${rawItem.sourceName}*.`;
    }

    const tags = [
      category.split(' ')[0].replace(/[^a-zA-Z]/g, ''),
      'Broadcasting',
      'MediaHub',
      'LiveUpdates',
      'FideTVNews'
    ];
    if (rawItem.region) tags.push(rawItem.region);

    return {
      title,
      excerpt,
      content,
      category,
      tags,
      read_time
    };
  }

  /**
   * Ping Search Engine Indexing Services (Google, Bing, IndexNow) whenever
   * news content is published or updated.
   */
  public async pingSearchEngineIndexing(sitemapUrl = 'https://fidetv.online/sitemap.xml'): Promise<any> {
    const results: any = {
      timestamp: new Date().toISOString(),
      sitemapUrl,
      targets: {}
    };

    // 1. Bing Sitemap Ping
    try {
      const bingPing = `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
      const bingResp = await axios.get(bingPing, { timeout: 5000, validateStatus: () => true });
      results.targets.bing = { status: bingResp.status, success: bingResp.status >= 200 && bingResp.status < 400 };
    } catch (e: any) {
      results.targets.bing = { status: 'error', error: e.message };
    }

    // 2. Google Sitemap Ping (handled safely)
    try {
      const googlePing = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
      const googleResp = await axios.get(googlePing, { timeout: 5000, validateStatus: () => true });
      results.targets.google = { status: googleResp.status, success: googleResp.status >= 200 && googleResp.status < 400 };
    } catch (e: any) {
      results.targets.google = { status: 'error', error: e.message };
    }

    // 3. IndexNow Notification
    try {
      const indexNowUrl = 'https://api.indexnow.org/indexnow';
      const indexNowResp = await axios.post(indexNowUrl, {
        host: 'fidetv.online',
        key: 'fidetv_seo_key_2026',
        urlList: [sitemapUrl, 'https://fidetv.online/news']
      }, { timeout: 5000, validateStatus: () => true });
      results.targets.indexNow = { status: indexNowResp.status, success: indexNowResp.status >= 200 && indexNowResp.status < 400 };
    } catch (e: any) {
      results.targets.indexNow = { status: 'error', error: e.message };
    }

    this.lastPingReport = results;
    console.log('[AutoBlogService] Search engine indexing ping dispatched:', JSON.stringify(results.targets));
    return results;
  }

  /**
   * Centralized synchronization service:
   * 1. Ingests fresh live feeds with validated, non-repetitive imagery.
   * 2. Synchronizes bidirectionally with Supabase database (fixing empty slugs & validating image URLs).
   * 3. Broadcasts real-time events to all active clients.
   * 4. Updates disk persistence.
   * 5. Pings search engine indexing.
   */
  public async syncLatestNews(): Promise<{
    addedCount: number;
    dbSyncedCount: number;
    totalPosts: number;
    lastSync: string;
    pingReport?: any;
  }> {
    if (this.isSyncing) {
      return {
        addedCount: 0,
        dbSyncedCount: 0,
        totalPosts: this.posts.length,
        lastSync: this.lastSyncTime || new Date().toISOString()
      };
    }

    this.isSyncing = true;
    console.log('[AutoBlogService] Starting centralized news synchronization cycle...');

    let addedCount = 0;
    let dbSyncedCount = 0;

    try {
      // Step A: Pull all existing news rows from Supabase database to ensure exact parity
      if (this.supabase) {
        try {
          const { data: dbRows, error: dbError } = await this.supabase
            .from('news')
            .select('*')
            .eq('is_published', true)
            .order('created_at', { ascending: false });

          if (!dbError && Array.isArray(dbRows)) {
            for (const row of dbRows) {
              const rowSlug = row.slug || this.generateSlug(row.title) || row.id;

              // Validate/enrich cover image
              const validatedImage = await validateAndEnrichNewsCover(
                row.image_url,
                row.title,
                row.content || row.description,
                row.category
              );

              // Update in database if slug was missing or image was improved
              if (!row.slug || (validatedImage.validUrl !== row.image_url && !row.image_url)) {
                await this.supabase
                  .from('news')
                  .update({
                    slug: rowSlug,
                    image_url: validatedImage.validUrl,
                    image_urls: [validatedImage.validUrl]
                  })
                  .eq('id', row.id);
              }

              const formattedDbPost: AutoBlogPost = {
                id: row.id,
                slug: rowSlug,
                title: row.title,
                excerpt: row.excerpt || row.description || (row.content ? row.content.substring(0, 160) + '...' : ''),
                description: row.description || row.excerpt || '',
                content: row.content || '',
                category: row.category || 'News',
                tags: row.tags || ['Broadcasting', 'News'],
                image_url: validatedImage.validUrl,
                image_urls: [validatedImage.validUrl],
                read_time: '4 min read',
                source_name: 'FideTV Media',
                author_id: row.author_id || 'fidetv_admin',
                is_published: true,
                created_at: row.created_at || new Date().toISOString(),
                profiles: {
                  username: 'FideTV News Desk',
                  avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=FideTV_NewsDesk',
                  role: 'Official Editor'
                }
              };

              // Merge into this.posts if not present
              const existingIdx = this.posts.findIndex(p => p.id === row.id || p.slug === rowSlug);
              if (existingIdx >= 0) {
                this.posts[existingIdx] = { ...this.posts[existingIdx], ...formattedDbPost };
              } else {
                this.posts.unshift(formattedDbPost);
                dbSyncedCount++;
              }
            }
            console.log(`[AutoBlogService] Synchronized ${dbRows.length} items from Supabase database.`);
          }
        } catch (dbErr: any) {
          console.warn('[AutoBlogService] Supabase pull error:', dbErr.message);
        }
      }

      // Step B: Ingest candidate news items from live feeds
      const rawItems = await this.fetchRawFeeds();
      console.log(`[AutoBlogService] Processing ${rawItems.length} candidate news items from live feeds...`);

      for (const item of rawItems) {
        if (addedCount >= 8) break;

        const tempSlug = this.generateSlug(item.title);
        const normalizedIncoming = item.title.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
        const incomingWords = item.title.toLowerCase().split(/\s+/).slice(0, 5).join(' ');

        const alreadyExists = this.posts.some(p => {
          const normalizedExisting = p.title.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
          const existingWords = p.title.toLowerCase().split(/\s+/).slice(0, 5).join(' ');
          
          return p.slug === tempSlug || 
                 p.id === item.link || 
                 normalizedExisting === normalizedIncoming ||
                 (incomingWords.length > 10 && existingWords === incomingWords);
        });
        
        if (alreadyExists) {
          console.log(`[AutoBlogService] Skipping duplicate news: "${item.title}"`);
          continue;
        }

        // Image validation utility to ensure valid, non-random, content-specific imagery
        const validatedCover = await validateAndEnrichNewsCover(
          item.imageUrl,
          item.title,
          item.description,
          item.defaultCategory
        );

        let generated = await this.generateWithGemini(item);
        if (!generated) {
          generated = this.synthesizeFallbackPost(item);
        }

        const id = crypto.randomUUID();
        let slug = this.generateSlug(generated.title) || tempSlug;
        if (this.posts.some(p => p.slug === slug)) {
          slug = `${slug}-${Date.now().toString(36).substring(4)}`;
        }

        const newPost: AutoBlogPost = {
          id,
          slug,
          title: generated.title,
          excerpt: generated.excerpt,
          description: generated.excerpt,
          content: generated.content,
          category: generated.category,
          tags: generated.tags,
          image_url: validatedCover.validUrl,
          image_urls: [validatedCover.validUrl],
          read_time: generated.read_time,
          source_name: item.sourceName,
          source_url: item.link,
          region: item.region || 'Global',
          author_id: 'fidetv-newsbot',
          is_published: true,
          created_at: new Date().toISOString(),
          profiles: {
            username: 'FideTV News Desk',
            avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=FideTV_NewsDesk',
            role: 'Automated News Curator'
          }
        };

        this.posts.unshift(newPost);
        addedCount++;

        // Sync new post to Supabase database
        if (this.supabase) {
          try {
            console.log('[AutoBlogService] Upserting to Supabase:', newPost.id, newPost.title);
            await this.supabase.from('news').upsert({
              id: newPost.id,
              slug: newPost.slug || newPost.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              title: newPost.title,
              excerpt: newPost.excerpt || '',
              description: newPost.description || '',
              content: newPost.content || '',
              category: newPost.category || 'News',
              tags: Array.from(new Set(newPost.tags || [])),
              image_url: newPost.image_url || '',
              image_urls: newPost.image_urls || [],
              is_published: true,
              created_at: newPost.created_at,
              author_id: newPost.author_id,
              read_time: newPost.read_time,
              source_name: newPost.source_name,
              source_url: newPost.source_url,
              region: newPost.region
            }, { onConflict: 'id' });
          } catch (dbErr: any) {
            console.error('[AutoBlogService] Supabase news upsert FAILED:', dbErr);
          }
        }
      }

      // Step C: Push any posts from this.posts that are missing in Supabase
      if (this.supabase) {
        try {
          const syncCandidates = this.posts.slice(0, 15);
          for (const post of syncCandidates) {
            await this.supabase.from('news').upsert({
              id: post.id,
              slug: post.slug,
              title: post.title,
              excerpt: post.excerpt,
              description: post.description,
              content: post.content,
              category: post.category,
              tags: Array.from(new Set(post.tags || [])),
              image_url: post.image_url,
              image_urls: post.image_urls || [post.image_url],
              is_published: true,
              created_at: post.created_at,
              read_time: post.read_time,
              source_name: post.source_name,
              source_url: post.source_url,
              region: post.region
            }, { onConflict: 'id' });
          }

          // Broadcast real-time update
          try {
            await this.supabase.channel('realtime').send({
              type: 'broadcast',
              event: 'news-updated',
              payload: { timestamp: new Date().toISOString(), totalPosts: this.posts.length }
            });
          } catch (bErr) {
            // Ignore broadcast fallback
          }
        } catch (syncDbErr: any) {
          console.warn('[AutoBlogService] Mass sync to Supabase notice:', syncDbErr.message);
        }
      }

      // Keep maximum 60 most recent posts
      if (this.posts.length > 60) {
        this.posts = this.posts.slice(0, 60);
      }

      await this.persistPosts();
      this.lastSyncTime = new Date().toISOString();

      // Step D: Trigger dynamic search engine indexing ping
      this.pingSearchEngineIndexing().catch(err => {
        console.warn('[AutoBlogService] Indexing ping notice:', err.message);
      });

      console.log(`[AutoBlogService] Sync cycle complete. Added ${addedCount} feed posts, synced ${dbSyncedCount} DB posts. Total active: ${this.posts.length}`);
    } catch (err: any) {
      console.error('[AutoBlogService] Sync error:', err);
    } finally {
      this.isSyncing = false;
    }

    return {
      addedCount,
      dbSyncedCount,
      totalPosts: this.posts.length,
      lastSync: this.lastSyncTime || new Date().toISOString(),
      pingReport: this.lastPingReport
    };
  }

  public getAllPosts(filter?: {
    category?: string;
    search?: string;
    limit?: number;
    page?: number;
  }): {
    posts: AutoBlogPost[];
    total: number;
    categories: string[];
    lastSync: string | null;
  } {
    let result = [...this.posts];

    if (filter?.category && filter.category !== 'All') {
      const catLower = filter.category.toLowerCase();
      result = result.filter(p => p.category?.toLowerCase() === catLower);
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        p =>
          p.title.toLowerCase().includes(q) ||
          p.excerpt?.toLowerCase().includes(q) ||
          p.content?.toLowerCase().includes(q) ||
          p.tags?.some(t => t.toLowerCase().includes(q))
      );
    }

    const total = result.length;
    const page = filter?.page || 1;
    const limit = filter?.limit || 20;
    const startIndex = (page - 1) * limit;

    const categories = [
      'All',
      'Broadcasting & Streaming',
      'Technology & AI',
      'Media & Entertainment',
      'Global News & Culture',
      'Creator Economy & Production',
      'Sports & Live Events'
    ];

    return {
      posts: result.slice(startIndex, startIndex + limit),
      total,
      categories,
      lastSync: this.lastSyncTime
    };
  }

  public getPostBySlugOrId(slugOrId: string): {
    post: AutoBlogPost | null;
    relatedPosts: AutoBlogPost[];
  } {
    const post =
      this.posts.find(p => p.slug === slugOrId || p.id === slugOrId) || null;

    let relatedPosts: AutoBlogPost[] = [];
    if (post) {
      relatedPosts = this.posts
        .filter(p => p.id !== post.id && (p.category === post.category || true))
        .slice(0, 3);
    }

    return { post, relatedPosts };
  }

  public getStatus() {
    return {
      status: 'active',
      isSyncing: this.isSyncing,
      lastSync: this.lastSyncTime,
      totalPosts: this.posts.length,
      sourcesCount: NEWS_SOURCES.length,
      nigeriaNewsCount: this.nigeriaNewsCache.length,
      lastPingReport: this.lastPingReport,
      syncIntervalMinutes: 30
    };
  }

  private getSeedBlogPosts(): AutoBlogPost[] {
    const now = Date.now();
    return [
      {
        id: 'fidetv-release-v2',
        slug: 'major-release-v2',
        title: 'FideTV Major Release: 25 Active Live Channels, Dynamic Audio Spaces & Mobile Optimization!',
        excerpt: 'We are thrilled to unveil a massive update to FideTV, boasting 25 active 24/7 live-streaming channels, brand-new real-time Audio Spaces, immersive mobile optimization, and seamless community interactions!',
        description: 'We are thrilled to unveil a massive update to FideTV, boasting 25 active 24/7 live-streaming channels, brand-new real-time Audio Spaces, immersive mobile optimization, and seamless community interactions!',
        content: `We are incredibly proud to announce the next major milestone for **FideTV Media Hub**! Our team has been working around the clock to bring you a fully synchronized, ultra-high performance media platform that is perfectly customized for both creators and visitors.

Here are the exciting new features and capabilities live on FideTV right now:

### 📺 25 Active 24/7 Live Broadcast Channels
FideTV now hosts **25 fully active, 24/7 high-definition broadcast channels** running continuously! Dive into a rich, curated array of live sports, interactive educational masterclasses, community discussion forums, creative documentaries, and direct cultural showcases. No matter your interests, there is a specialized active stream waiting for you on the **Live tab** right now!

### 🎙️ Interactive Live Audio Spaces
Introducing **FideTV Spaces**! Inspired by modern audio-conversational lobbies, you can now enter dedicated, browser-native live voice chat rooms directly on FideTV. Connect your microphone to host roundtable discussions, join community technical huddles, or participate in live broadcasting reviews alongside seasoned media pioneers.

### 📱 Full Mobile Experience Redesign
We have fully rebuilt our navigation structures to suit all mobile viewport sizes perfectly:
* **Always-Accessible Mobile Drawer**: Redesigned the slide-out navigation menu overlay with deep stacking clearance, protecting it from being covered by video players.
* **Direct Mobile Actions**: Repositioned the community join buttons to sit cleanly in mobile headers so you can easily engage with sub-communities on the fly.
* **Solid Background Clearance**: Handled ambient color alphas so the drawer menu remains crisp and highly legible regardless of content scrolling underneath it.

### 💬 Notice Wall & Collective Engagement
Collaborative teams can now write social shouts, post links, receive likes, and share milestones with fellow creatives directly inside localized sub-communities. It is the perfect bulletin board for managing community media assets, drone raw templates, or organizing schedules.

---

We are dedicated to building a supportive, highly specialized network for global Sub-Saharan and international digital broadcasting creators. We cannot wait to see you explore and participate in our newly polished services!

*Connect your profile, join a Creative Hub, or hop into a Live Space today to get started!*`,
        category: 'Platform Updates',
        tags: ['FideTV', 'LiveStreaming', 'AudioSpaces', 'Update'],
        read_time: '4 min read',
        source_name: 'FideTV Official',
        author_id: 'admin',
        is_published: true,
        image_url: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?q=80&w=800&auto=format&fit=crop',
        created_at: new Date(now - 3600000 * 2).toISOString(),
        profiles: {
          username: 'fidetv_admin',
          avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=fidetv_admin',
          role: 'Editor-in-Chief'
        }
      },
      {
        id: 'fidetv-auto-news-ai-broadcast',
        slug: 'next-gen-broadcasting-ai-video-pipelines',
        title: 'How Next-Gen AI Video Pipelines Are Transforming Global Live Broadcasting',
        excerpt: 'Broadcasting networks and independent digital studios are adopting automated AI video enhancement, instant multi-language audio dubbing, and edge transcoding to stream high-definition content to global audiences at record-low latency.',
        description: 'Broadcasting networks and independent digital studios are adopting automated AI video enhancement, instant multi-language audio dubbing, and edge transcoding to stream high-definition content to global audiences at record-low latency.',
        content: `The global media broadcasting industry is undergoing one of its most transformative shifts in decades. From real-time cloud video switching to synthetic speech translation and automated news curation, digital streaming hubs are breaking previous hardware boundaries.

---

### 🚀 The Rise of Edge Video Transcoding

Historically, transmitting low-latency live streams required massive multi-thousand dollar OB (Outside Broadcasting) trucks and dedicated satellite uplinks. Today, cloud edge transcoding algorithms can ingest multi-bitrate HLS and WebRTC video streams in under 500 milliseconds, distributing synchronized feeds across global content delivery networks.

Key technical milestones enabling this transition include:
* **Adaptive Bitrate Resiliency**: Instant switching between 1080p60 and mobile bandwidth constraints without stream drops.
* **Synchronized Data Tracks**: Injecting real-time interactive overlays, polls, and live community chat alongside the video container.
* **Serverless Media Pipelines**: Dynamic rendering of thumbnail clips, automated highlight reels, and instant VOD archiving.

---

### 🎙️ Real-Time Audio Spaces & Multi-Voice Synthesis

In addition to traditional video streams, interactive audio has emerged as the premier medium for immediate breaking discussions. Creators can spin up virtual broadcast booths, inviting listeners onto digital stages with studio-quality noise suppression and acoustic echo cancellation.

---

### 💡 The FideTV Media Vision

At FideTV, our objective is to fuse 24/7 IPTV continuous channels with participatory social spaces. Creators do not just watch the news; they dissect, comment, collaborate, and broadcast their perspectives to an engaged global audience in real time.`,
        category: 'Broadcasting & Streaming',
        tags: ['Broadcasting', 'StreamingTech', 'WebRTC', 'MediaInnovation'],
        read_time: '5 min read',
        source_name: 'FideTV Media Lab',
        author_id: 'fidetv-newsbot',
        is_published: true,
        image_url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=1200&auto=format&fit=crop',
        created_at: new Date(now - 3600000 * 6).toISOString(),
        profiles: {
          username: 'FideTV News Desk',
          avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=FideTV_Tech',
          role: 'Tech & Broadcasting Bureau'
        }
      },
      {
        id: 'fidetv-auto-news-creator-tools',
        slug: 'empowering-digital-creators-with-modern-production-studios',
        title: 'Empowering Independent Digital Creators With Modern Virtual Production Studios',
        excerpt: 'Independent content creators and regional media journalists are leveraging browser-based studios and automated newsrooms to compete with legacy television networks.',
        description: 'Independent content creators and regional media journalists are leveraging browser-based studios and automated newsrooms to compete with legacy television networks.',
        content: `The barrier between professional television studios and decentralized content creators has officially collapsed. Armed with high-performance web applications, creators across Africa, Europe, and the Americas can direct multi-camera productions straight from standard browsers.

---

### 📹 The New Creator Tech Stack

Modern creators no longer rely on single-platform walled gardens. Instead, they operate agile multi-channel ecosystems:
1. **Live Synchronous Hubs**: Hosting scheduled 24/7 broadcast playlists and special events.
2. **Dynamic Audio Rooms**: Hosting live debriefs, fan meet-and-greets, and sponsor interviews.
3. **Automated Blog & News Feeds**: Keeping community members informed between live broadcasts with fresh, search-optimized editorial coverage.

---

### 🌍 Bridging the Regional Media Divide

For emerging markets and Sub-Saharan digital media houses, browser-first broadcasting tools remove prohibitive capital expenditures. Digital creators can publish high-fidelity educational series, sports tournament streams, and cultural festivals directly to viewers on mobile devices.

FideTV continues to lead this movement by offering free channel ingestion, automated signal healing, and community notice boards for creative teams everywhere.`,
        category: 'Creator Economy & Production',
        tags: ['CreatorEconomy', 'DigitalMedia', 'Production', 'FideTV'],
        read_time: '4 min read',
        source_name: 'FideTV Insights',
        author_id: 'fidetv-newsbot',
        is_published: true,
        image_url: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=1200&auto=format&fit=crop',
        created_at: new Date(now - 3600000 * 12).toISOString(),
        profiles: {
          username: 'FideTV News Desk',
          avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=FideTV_Creators',
          role: 'Production Correspondent'
        }
      },
      {
        id: 'fidetv-auto-news-sports-streaming',
        slug: 'future-of-sports-broadcasting-interactive-telemetry-and-community',
        title: 'The Future of Sports Broadcasting: Interactive Telemetry and Community Co-Viewing',
        excerpt: 'Fans demand more than a one-way video feed. Discover how live stats, community voice lounges, and personalized camera angles are defining the new era of global sports streaming.',
        description: 'Fans demand more than a one-way video feed. Discover how live stats, community voice lounges, and personalized camera angles are defining the new era of global sports streaming.',
        content: `From football championships to grassroots athletic tournaments, sports broadcasting is experiencing an unprecedented evolution. Viewers are transforming from passive television spectators into engaged co-producers of the live sports experience.

---

### ⚽ The Co-Viewing Phenomenon

Studies show that over 78% of sports fans watch live matches with a second screen active. Rather than splitting attention across disjointed apps, modern platforms integrate synchronous watch parties directly into the viewing canvas:
* **Microphone-Enabled Lounges**: Allowing remote friend groups and global fan clubs to banter and react in real-time.
* **Instant Replay Scrubbing**: High-efficiency HLS buffers enabling viewers to review controversial plays without missing live action.
* **Community Scoreboards**: Real-time crowd reaction meters and gamified engagement badges.

---

### 🏆 FideTV Sports Coverage

FideTV's live sports lineup offers continuous coverage, highlighting both premier global tournaments and vital regional athletic showcases. Join our community sports hub to participate in live voice commentaries during upcoming game days!`,
        category: 'Sports & Live Events',
        tags: ['SportsStreaming', 'LiveEvents', 'FanEngagement', 'FideTVLive'],
        read_time: '4 min read',
        source_name: 'FideTV Sports Wire',
        author_id: 'fidetv-newsbot',
        is_published: true,
        image_url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1200&auto=format&fit=crop',
        created_at: new Date(now - 3600000 * 18).toISOString(),
        profiles: {
          username: 'FideTV Sports Desk',
          avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=FideTV_Sports',
          role: 'Sports Bureau Chief'
        }
      }
    ];
  }
}
