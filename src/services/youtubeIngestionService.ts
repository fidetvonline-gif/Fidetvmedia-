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
    'live news', '24/7 live TV', 'breaking news live', 'live TV stream',
    'NTA live', 'Channels TV live', 'Arise News live', 'BBC live',
    'CNN live', 'Al Jazeera live', 'sports live stream', 'world news live',
    'lofi hip hop radio live', '24/7 music live', 'live concert stream',
    'smooth jazz live 24/7', 'top hits music live', 'classical music live 24/7',
    'relaxing music live', 'techno live stream 24/7', 'african music live radio'
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
        title: video.snippet.title,
        thumbnail: video.snippet.thumbnails.maxres?.url || video.snippet.thumbnails.high?.url || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
        channelTitle: video.snippet.channelTitle,
        channelId: video.snippet.channelId,
        description: video.snippet.description,
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
  async runDiscoveryCycle(): Promise<YoutubeDiscoveryReport> {
    console.log('[YouTube Ingestion] Starting discovery cycle...');
    const report: YoutubeDiscoveryReport = {
      new_channels_added: [],
      active_channels: [],
      removed_channels: [],
      total_active_count: 0
    };

    try {
      // 1. Collect potential live streams from all queries
      const discoveredVideos = new Map<string, any>(); // Video ID -> Metadata

      for (const query of this.searchQueries) {
        const results = await this.searchLiveStreams(query);
        results.forEach(video => {
          if (!discoveredVideos.has(video.id.videoId)) {
            discoveredVideos.set(video.id.videoId, video);
          }
        });
      }

      console.log(`[YouTube Ingestion] Found ${discoveredVideos.size} potential live streams.`);

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
        const videoTitle = video.snippet.title;
        const embedUrl = `https://www.youtube.com/embed/${videoId}`;

        // Basic validation: must have channel info
        if (!channelId || !channelTitle) continue;

        // Skip blocked content (Simple keywords check)
        const blocklist = ['SportyTV', 'Mexico', 'South Africa'];
        if (blocklist.some(kw => videoTitle.toLowerCase().includes(kw.toLowerCase()) || channelTitle.toLowerCase().includes(kw.toLowerCase()))) {
           continue;
        }

        const isNew = !existingMap.has(channelId);
        
        const payload = {
          name: channelTitle,
          category: this.inferCategory(videoTitle, channelTitle),
          url: embedUrl,
          thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default?.url,
          description: video.snippet.description,
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

  private async searchLiveStreams(query: string): Promise<any[]> {
    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&eventType=live&maxResults=25&q=${encodeURIComponent(query)}&key=${this.apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.error) {
        console.error(`[YouTube API Error] Query: ${query}`, data.error);
        return [];
      }
      
      return data.items || [];
    } catch (err) {
      console.error(`[YouTube Search Fetch Error] Query: ${query}`, err);
      return [];
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
    if (t.includes('news')) return 'News';
    if (t.includes('sport') || t.includes('football') || t.includes('match')) return 'Sports';
    if (t.includes('music') || t.includes('song')) return 'Music';
    if (t.includes('movie') || t.includes('film')) return 'Movies';
    if (t.includes('game') || t.includes('gaming')) return 'Gaming';
    return 'General';
  }
}
