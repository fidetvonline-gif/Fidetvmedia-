import { SupabaseClient } from '@supabase/supabase-js';

export interface YoutubeDiscoveryReport {
  new_channels_added: string[];
  active_channels: string[];
  removed_channels: string[];
  total_active_count: number;
}

export class YouTubeIngestionService {
  private supabase: SupabaseClient;
  private apiKey: string;
  private searchQueries = [
    // NIGERIA & AFRICA
    'NTA live', 'Channels TV live', 'TVC News live', 'Arise News live',
    'AIT live', 'Silverbird TV live', 'Wazobia TV live', 'RSTV live',
    'Lagos Television live', 'Liberty TV live', 'Plus TV Africa live',

    // INTERNATIONAL NEWS
    'BBC News live', 'CNN International live', 'Al Jazeera English live', 
    'France 24 English live', 'DW English live', 'Bloomberg Television live',

    // NEWS & POLITICS (EXISTING)
    'live news', '24/7 live TV', 'breaking news live', 'live TV stream',
    
    // MUSIC & ENTERTAINMENT
    'lofi hip hop radio live', '24/7 music live', 'live concert stream',
    'smooth jazz live 24/7', 'top hits music live', 'classical music live 24/7',
    'relaxing music live', 'techno live stream 24/7', 'african music live radio',
    'trace tv live', 'mtv live stream', 'soundcity live', 'hip tv live stream',
    'viva tv live', 'k-pop live stream 24/7', 'reggae music live',
    'gospel music live radio', 'worship 24/7 live', 'dj mix live',
    
    // SPORTS
    'sports live stream', 'football live 24/7', 'basketball live stream',
    'tennis live channel', 'boxing live stream', 'cricket live match',
    'esports live', 'super sport live stream', 'bein sports live',
    'espn live stream', 'fox sports live', 'racing live 24/7',
    
    // FAITH & INSPIRATION
    'christian live tv', 'islamic live tv', 'prayer line live',
    'sunday service live', 'emmanuel tv live', 'dove tv live',
    'loveworld tv live', 'shiloh live', 'makkah live 24/7',
    
    // KIDS & FAMILY
    'cartoons live 24/7', 'disney channel live', 'nickelodeon live',
    'nursery rhymes live', 'kids stories live', 'educational videos live',
    
    // LIFESTYLE & DOCUMENTARY
    'wildlife live camera', 'space live stream nasa', 'cooking live stream',
    'travel live 24/7', 'fashion tv live', 'tastemade live',
    'national geographic live', 'discovery channel live'
  ];

  constructor(supabase: SupabaseClient, apiKey: string) {
    this.supabase = supabase;
    this.apiKey = apiKey;
  }

  /**
   * Extract video ID from various YouTube URL formats
   */
  public static extractVideoId(url: string): string | null {
    if (!url) return null;
    
    // Support standard watch?v=, short youtu.be, embed/, v/, live/, shorts/
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?v=)|(live\/)|(shorts\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    
    if (match && match[match.length - 1].length === 11) {
      return match[match.length - 1];
    }
    
    // Fallback for simple URL paths if regex missed it
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('youtube.com')) {
        if (urlObj.pathname.startsWith('/live/') || urlObj.pathname.startsWith('/shorts/')) {
          return urlObj.pathname.split('/')[2];
        }
        return urlObj.searchParams.get('v');
      } else if (urlObj.hostname === 'youtu.be') {
        return urlObj.pathname.slice(1);
      }
    } catch (e) {}
    
    return null;
  }

  /**
   * Fetch metadata and statistics for a specific YouTube video
   */
  async getVideoMetadata(videoId: string) {
    try {
      const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails,statistics&id=${videoId}&key=${this.apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        // Fallback: Generate basic info if API fails or video not found via specific ID
        return {
          title: "YouTube Live Stream",
          thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
          channelTitle: "Unknown Channel",
          description: "",
          viewers: "0",
          likes: "0",
          isLive: false
        };
      }
      
      const video = data.items[0];
      const liveDetails = video.liveStreamingDetails;
      const stats = video.statistics;

      return {
        title: video.snippet.title.replace(/SportyTV/gi, 'FideTv'),
        thumbnail: video.snippet.thumbnails.maxres?.url || video.snippet.thumbnails.high?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        channelTitle: video.snippet.channelTitle.replace(/SportyTV/gi, 'FideTv'),
        channelId: video.snippet.channelId,
        description: video.snippet.description.replace(/SportyTV/gi, 'FideTv'),
        isLive: video.snippet.liveBroadcastContent === 'live',
        viewers: liveDetails?.concurrentViewers || "0",
        likes: stats?.likeCount || "0",
        commentCount: stats?.commentCount || "0"
      };
    } catch (err) {
      return {
        title: "YouTube Live Stream",
        thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
        channelTitle: "YouTube",
        description: "",
        viewers: "0",
        likes: "0",
        isLive: false
      };
    }
  }

  /**
   * Update statistics for all active channels in the database
   */
  async updateAllChannelStats() {
    console.log('[YouTube Ingestion] Updating statistics for all channels...');
    try {
      const { data: channels, error } = await this.supabase
        .from('tv_channels')
        .select('id, url, name')
        .eq('is_active', true);

      if (error) throw error;
      if (!channels) return;

      for (const channel of channels) {
        const videoId = YouTubeIngestionService.extractVideoId(channel.url);
        if (videoId) {
          const metadata = await this.getVideoMetadata(videoId);
          await this.supabase
            .from('tv_channels')
            .update({
              viewer_count: parseInt(metadata.viewers) || 0,
              like_count: parseInt(metadata.likes) || 0,
              comment_count: parseInt(metadata.commentCount || "0") || 0,
              thumbnail: metadata.thumbnail, // Auto-heal thumbnail
              last_verified_at: new Date().toISOString()
            })
            .eq('id', channel.id);
        }
      }
      console.log(`[YouTube Ingestion] Stats update complete for ${channels.length} channels.`);
    } catch (err) {
      console.error('[YouTube Ingestion] Stats update failed:', err);
    }
  }

  /**
   * Main discovery loop
   */
  async runDiscoveryCycle(maxPagesPerQuery: number = 2): Promise<YoutubeDiscoveryReport> {
    console.log(`[YouTube Ingestion] Starting discovery cycle with ${maxPagesPerQuery} pages per query...`);
    const report: YoutubeDiscoveryReport = {
      new_channels_added: [],
      active_channels: [],
      removed_channels: [],
      total_active_count: 0
    };

    try {
      // 1. Collect potential live streams from all queries
      const discoveredVideos = new Map<string, any>(); // Video ID -> Metadata

      // Randomize queries to avoid hitting same content every time
      const prioritizedQueries = [...this.searchQueries].sort(() => Math.random() - 0.5);

      for (const query of prioritizedQueries) {
        console.log(`[YouTube Ingestion] Searching for: ${query}`);
        const results = await this.searchLiveStreams(query, maxPagesPerQuery);
        results.forEach(video => {
          if (video.id.videoId && !discoveredVideos.has(video.id.videoId)) {
            discoveredVideos.set(video.id.videoId, video);
          }
        });
        
        // Safety break if we found a ton of content to stay within limits
        if (discoveredVideos.size > 500) break;
      }

      console.log(`[YouTube Ingestion] Discovery phase found ${discoveredVideos.size} unique potential live streams.`);

      // 2. Fetch current active channels from DB to track changes
      const { data: existingChannels } = await this.supabase
        .from('tv_channels')
        .select('*')
        .not('youtube_channel_id', 'is', null);

      const existingMap = new Map((existingChannels || []).map(c => [c.youtube_channel_id, c]));

      // 3. Process discovered streams
      for (const [videoId, video] of discoveredVideos) {
        const channelId = video.snippet.channelId;
        const channelTitle = video.snippet.channelTitle;
        const videoTitle = video.snippet.title.replace(/SportyTV/gi, 'FideTv');
        const description = video.snippet.description.replace(/SportyTV/gi, 'FideTv');
        const embedUrl = `https://www.youtube.com/embed/${videoId}`;

        // Basic validation: must have channel info
        if (!channelId || !channelTitle) continue;

        // Skip blocked content (Specific title match)
        const blocklist = ['LIVE | Mexico vs South Africa | FIFA World Cup 2026™ | FideTv'];
        if (blocklist.some(title => videoTitle.includes(title))) {
           continue;
        }

        const isNew = !existingMap.has(channelId);
        
        const payload = {
          name: channelTitle,
          category: this.inferCategory(videoTitle, channelTitle),
          url: embedUrl,
          thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default?.url,
          description: description,
          is_active: true,
          youtube_channel_id: channelId,
          youtube_video_id: videoId,
          is_24_7: true,
          last_verified_at: new Date().toISOString()
        };

        if (isNew) {
          const { error } = await this.supabase.from('tv_channels').insert([payload]);
          if (!error) report.new_channels_added.push(channelTitle);
        } else {
          // Update existing
          await this.supabase
            .from('tv_channels')
            .update(payload)
            .eq('youtube_channel_id', channelId);
        }
        
        report.active_channels.push(channelTitle);
        existingMap.delete(channelId); // Mark as still active
      }

      // 4. Handle dead channels (those in DB but not found in this live search)
      for (const [channelId, channel] of existingMap) {
        // Double check if it's still live before killing it (maybe it just didn't show in search)
        const stillLive = await this.verifyIsLive(channel.youtube_video_id);
        if (!stillLive) {
          await this.supabase
            .from('tv_channels')
            .update({ is_active: false })
            .eq('youtube_channel_id', channelId);
          report.removed_channels.push(channel.name);
        } else {
          report.active_channels.push(channel.name);
        }
      }

      report.total_active_count = report.active_channels.length;

      // 5. Save report to DB
      await this.supabase.from('youtube_ingestion_reports').insert([{
        new_channels: report.new_channels_added,
        active_channels: report.active_channels,
        removed_channels: report.removed_channels,
        total_active_count: report.total_active_count
      }]);

      console.log('[YouTube Ingestion] Cycle complete.', report);
      return report;
    } catch (err: any) {
      console.error('[YouTube Ingestion] Critical Failure:', err);
      throw err;
    }
  }

  private async searchLiveStreams(query: string, pages: number = 1): Promise<any[]> {
    const allItems: any[] = [];
    let nextToken = '';

    try {
      for (let i = 0; i < pages; i++) {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&eventType=live&maxResults=50&q=${encodeURIComponent(query)}&key=${this.apiKey}${nextToken ? `&pageToken=${nextToken}` : ''}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.error) {
          console.error(`[YouTube API Error] Query: ${query}`, data.error);
          break; 
        }
        
        if (data.items) {
          allItems.push(...data.items);
        }
        
        nextToken = data.nextPageToken;
        if (!nextToken) break;
      }
      
      return allItems;
    } catch (err) {
      console.error(`[YouTube Search Fetch Error] Query: ${query}`, err);
      return allItems;
    }
  }

  private async verifyIsLive(videoId: string): Promise<boolean> {
    if (!videoId) return false;
    try {
      const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id=${videoId}&key=${this.apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (!data.items || data.items.length === 0) return false;
      
      const video = data.items[0];
      return video.snippet.liveBroadcastContent === 'live';
    } catch (err) {
      return false;
    }
  }

  private inferCategory(title: string, channel: string): string {
    const t = (title + ' ' + channel).toLowerCase();
    
    // Geographical Mapping
    if (t.includes('nigeria') || t.includes('nta') || t.includes('tvc') || t.includes('lagos') || t.includes('abuja') || t.includes('arise news')) return 'Nigeria';
    if (t.includes('international') || t.includes('global') || t.includes('world') || t.includes('bbc') || t.includes('cnn') || t.includes('al jazeera') || t.includes('france 24')) return 'International';
    
    // Niche Mapping
    if (t.includes('news')) return 'News';
    if (t.includes('sport') || t.includes('football') || t.includes('match') || t.includes('goal')) return 'Sports';
    if (t.includes('music') || t.includes('song') || t.includes('radio') || t.includes('concert')) return 'Music';
    if (t.includes('movie') || t.includes('film') || t.includes('cinema')) return 'Movies';
    if (t.includes('game') || t.includes('gaming') || t.includes('play')) return 'Gaming';
    if (t.includes('kid') || t.includes('cartoon') || t.includes('nursery') || t.includes('child')) return 'Kids';
    if (t.includes('church') || t.includes('bible') || t.includes('faith') || t.includes('prayer') || t.includes('gospel')) return 'Religion';
    if (t.includes('food') || t.includes('cook') || t.includes('chef')) return 'Lifestyle';
    
    return 'General';
  }
}
