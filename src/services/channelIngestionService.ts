
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
    
    // 1. Get channels that need checking (not failed, or failed recently but not 3 times)
    const { data: channels, error } = await this.supabase
      .from('discovered_channels')
      .select('*')
      .neq('status', 'failed')
      .limit(20);

    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('not found') || error.code === 'PGRST205') {
        console.warn('[Channel Ingestion] Table "discovered_channels" not found. Please ensure your Supabase schema is up to date.');
      } else {
        console.error('[Channel Ingestion] Error fetching channels for check:', error);
      }
      return;
    }

    if (!channels || channels.length === 0) {
      console.log('[Channel Ingestion] No channels queue found for checking.');
      return;
    }

    for (const channel of channels) {
      const result = await ChannelIngestionService.validateStream(channel.url);
      
      if (result.valid) {
        // Success: Update status
        if (channel.status === 'stable') {
          await this.updateChannel(channel.id, { 
            status: 'stable', 
            fail_count: 0, 
            last_check: new Date().toISOString() 
          });
        } else {
          // If was pending/testing, move to testing or stable
          // For simplicity, move to stable after 1 successful check in this version
          // Requirement said: "Only accept verified HLS/DASH streams that pass a health check"
          await this.moveToStable(channel);
        }
      } else {
        // Failure: Increment fail count
        const newFailCount = (channel.fail_count || 0) + 1;
        const newStatus = newFailCount >= 3 ? 'failed' : 'testing';
        
        console.warn(`[Channel Ingestion] Validation failed for ${channel.name} (${channel.url}): ${result.error}. Fail count: ${newFailCount}`);
        
        await this.updateChannel(channel.id, {
          status: newStatus,
          fail_count: newFailCount,
          last_check: new Date().toISOString()
        });
        
        // Remove from stable if it was there? 
        // "Reject any stream that fails 3 consecutive checks"
        if (newStatus === 'failed') {
          await this.removeFromStable(channel.url);
        }
      }
    }
  }

  private async updateChannel(id: string, data: any) {
    await this.supabase.from('discovered_channels').update(data).eq('id', id);
  }

  private async moveToStable(channel: any) {
    console.log(`[Channel Ingestion] Moving channel to stable: ${channel.name}`);
    
    const stablePayload = {
      name: channel.name,
      url: channel.url,
      category: channel.category || 'General',
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

