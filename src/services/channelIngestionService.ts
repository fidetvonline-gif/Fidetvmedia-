
import { Parser } from 'm3u8-parser';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface ChannelStream {
  id?: string;
  name: string;
  url: string;
  category: string;
  status?: 'pending' | 'testing' | 'stable' | 'failed';
  fail_count?: number;
  last_check?: string;
}

export class ChannelIngestionService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Validates a stream manifest (HLS or DASH)
   */
  static async validateStream(url: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        signal: AbortSignal.timeout(8000)
      });

      if (!response.ok) {
        return { valid: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }

      const contentType = response.headers.get('content-type') || '';
      const body = await response.text();

      // HLS Validation
      if (url.includes('.m3u8') || contentType.includes('application/x-mpegURL') || contentType.includes('vnd.apple.mpegurl') || body.startsWith('#EXTM3U')) {
        const parser = new Parser();
        parser.push(body);
        parser.end();

        const manifest = parser.manifest;
        const hasSegments = manifest.segments && manifest.segments.length > 0;
        const hasPlaylists = manifest.playlists && manifest.playlists.length > 0;

        if (hasSegments || hasPlaylists) {
          return { valid: true };
        } else {
          return { valid: false, error: 'Valid HLS manifest but no segments or playlists found' };
        }
      }

      // DASH Validation
      if (url.includes('.mpd') || contentType.includes('application/dash+xml')) {
        if (body.includes('<MPD') && body.includes('</MPD>')) {
          return { valid: true };
        } else {
          return { valid: false, error: 'Invalid DASH manifest structure' };
        }
      }

      return { valid: false, error: 'Unsupported or unrecognizable stream format' };
    } catch (err: any) {
      return { valid: false, error: err.message || 'Unknown network error' };
    }
  }

  /**
   * Runs health checks on discovered channels
   */
  async runHealthChecks() {
    if (!this.supabase) {
      console.warn('[Channel Ingestion] Supabase Admin client not initialized. Skipping health checks.');
      return;
    }

    console.log('[Channel Ingestion] Starting health check cycle...');
    
    // 1. Get channels from tv_channels that were verified a while ago
    const { data: channels, error } = await this.supabase
      .from('tv_channels')
      .select('*')
      .eq('is_active', true)
      .limit(50);

    if (error) {
       console.error('[Channel Ingestion] Error fetching tv_channels:', error);
       return;
    }

    if (!channels || channels.length === 0) {
      console.log('[Channel Ingestion] No active channels found in tv_channels.');
      return;
    }

    for (const channel of channels) {
      const result = await ChannelIngestionService.validateStream(channel.url);
      
      if (result.valid) {
        // Success: Just continue, maybe we can update a timestamp that DOES exist like updated_at if it was there
        // but for now let's just log and move on
        console.log(`[Channel Ingestion] ${channel.name} is healthy.`);
      } else {
        console.warn(`[Channel Ingestion] Validation failed for ${channel.name} (${channel.url}): ${result.error}`);
        // If it fails, we can either mark it inactive or increment a fail counter if we had it.
        // For now, let's mark it as inactive if it truly fails.
        await this.supabase.from('tv_channels').update({ 
          is_active: false,
          description: (channel.description || '') + ` [Offline: ${result.error}]`
        }).eq('id', channel.id);
      }
    }
  }

  private async updateChannel(id: string, data: any) {
    await this.supabase.from('discovered_channels').update(data).eq('id', id);
  }

  private async moveToStable(channel: any) {
    console.log(`[Channel Ingestion] Moving channel to stable: ${channel.name}`);
    
    let thumbnail = channel.thumbnail;
    
    // Auto-fetch thumbnail if YouTube and missing
    if (!thumbnail && (channel.url.includes('youtube.com') || channel.url.includes('youtu.be'))) {
      const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
      const match = channel.url.match(regExp);
      const videoId = (match && match[7].length === 11) ? match[7] : null;
      if (videoId) {
        thumbnail = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
      }
    }

    const stablePayload = {
      name: channel.name,
      url: channel.url,
      category: channel.category || 'General',
      thumbnail: thumbnail,
      is_active: true,
      last_verified: new Date().toISOString()
    };

    // Upsert into stable_channels
    const { error: stableError } = await this.supabase
      .from('stable_channels')
      .upsert([stablePayload], { onConflict: 'url' });

    if (stableError) {
      console.error('[Channel Ingestion] Error moving to stable:', stableError);
      return;
    }

    // Update discovered status
    await this.updateChannel(channel.id, { 
      status: 'stable', 
      fail_count: 0, 
      last_check: new Date().toISOString() 
    });
  }

  private async removeFromStable(url: string) {
    console.log(`[Channel Ingestion] Removing failed channel from stable: ${url}`);
    await this.supabase.from('stable_channels').delete().eq('url', url);
  }
}

