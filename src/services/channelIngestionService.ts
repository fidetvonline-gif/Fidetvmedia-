
import { Parser } from 'm3u8-parser';
import { SupabaseClient } from '@supabase/supabase-js';
import { M3UService, M3UChannel } from './m3uService';

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
   * Import channels from an M3U URL with Smart Filtering and Duplicate Detection
   */
  async importFromM3U(url: string, options: { dryRun?: boolean; validateAll?: boolean } = {}) {
    console.log(`[Channel Ingestion] Starting smart import from: ${url}`);
    
    try {
      // 1. Fetch and Parse
      const rawChannels = await M3UService.fetchAndParse(url);
      
      // 2. Smart Filter (The Strategy)
      const filteredChannels = M3UService.smartFilter(rawChannels);
      console.log(`[Channel Ingestion] Strategy filtered: ${rawChannels.length} -> ${filteredChannels.length}`);

      if (options.dryRun) {
        return filteredChannels;
      }

      // 3. Batch Check existing to avoid duplicates by Name or URL
      // We already have UNIQUE(url) in DB, but we want to avoid name dupes too for that "Premium" feel.
      const { data: existing } = await this.supabase
        .from('tv_channels')
        .select('name, url');
      
      const existingUrls = new Set(existing?.map(c => c.url) || []);
      const existingNames = new Set(existing?.map(c => c.name.toLowerCase()) || []);

      const toInsert: any[] = [];
      
      for (const ch of filteredChannels) {
        if (existingUrls.has(ch.url)) continue;
        if (existingNames.has(ch.name.toLowerCase())) continue;

        // 4. Optional Stream Validation (Slow for huge lists, use sparingly)
        if (options.validateAll) {
          const check = await ChannelIngestionService.validateStream(ch.url);
          if (!check.valid) {
            console.log(`[Channel Ingestion] Skipping broken stream: ${ch.name}`);
            continue;
          }
        }

        toInsert.push({
          name: ch.name,
          url: ch.url,
          category: ch.category || 'General',
          thumbnail: ch.logo,
          description: `Imported from ${url} (Country: ${ch.country})`,
          is_active: true
        });

        // Add to sets to avoid duplicates WITHIN the same batch
        existingUrls.add(ch.url);
        existingNames.add(ch.name.toLowerCase());
      }

      console.log(`[Channel Ingestion] Finalizing import: ${toInsert.length} new unique channels.`);

      if (toInsert.length > 0) {
        // Upsert by chunks of 50 to avoid payload limits
        for (let i = 0; i < toInsert.length; i += 50) {
          const chunk = toInsert.slice(i, i + 50);
          const { error } = await this.supabase.from('tv_channels').insert(chunk);
          if (error) console.error(`[Channel Ingestion] Error inserting chunk:`, error.message);
        }
      }

      return { total: rawChannels.length, filtered: filteredChannels.length, inserted: toInsert.length };
    } catch (err: any) {
      console.error(`[Channel Ingestion] Fatal import error:`, err.message);
      throw err;
    }
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
  async runHealthChecks(batchSize: number = 50) {
    if (!this.supabase) {
      console.warn('[Channel Ingestion] Supabase Admin client not initialized. Skipping health checks.');
      return;
    }

    console.log(`[Channel Ingestion] Starting health check cycle (Batch: ${batchSize})...`);
    
    // 1. Get channels from tv_channels that haven't been checked recently or are failed
    // We alternate between checking active channels to keep them fresh
    // and inactive ones to see if they came back online.
    const checkInactive = Math.random() > 0.8; 

    let query = this.supabase
      .from('tv_channels')
      .select('*');
    
    if (checkInactive) {
      query = query.eq('is_active', false).limit(batchSize);
    } else {
      query = query.eq('is_active', true).order('last_verified', { ascending: true }).limit(batchSize);
    }

    const { data: channels, error } = await query;

    if (error) {
       console.error('[Channel Ingestion] Error fetching tv_channels for health check:', {
         message: error.message,
         details: error.details,
         hint: error.hint,
         code: error.code
       });
       return;
    }

    if (!channels || channels.length === 0) {
      console.log('[Channel Ingestion] No suitable channels found for health check cycle.');
      return;
    }

    console.log(`[Channel Ingestion] Checking ${channels.length} channels (${checkInactive ? 'Inactive' : 'Active'})...`);

    for (const channel of channels) {
      const result = await ChannelIngestionService.validateStream(channel.url);
      
      if (result.valid) {
        console.log(`[Channel Ingestion] ${channel.name} is HEALTHY.`);
        await this.supabase.from('tv_channels').update({ 
          is_active: true,
          last_verified: new Date().toISOString()
        }).eq('id', channel.id);
      } else {
        console.warn(`[Channel Ingestion] ! FAILED: ${channel.name} (${result.error})`);
        // If it was already inactive, just update the error message
        // If it was active, mark it inactive
        await this.supabase.from('tv_channels').update({ 
          is_active: false,
          description: (channel.description || '').split(' [Offline:')[0] + ` [Offline: ${result.error}]`,
          last_verified: new Date().toISOString()
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

