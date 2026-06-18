
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

      // 3. Batch Check existing to avoid duplicates by Name or URL or EPG ID
      // We already have UNIQUE(url) in DB, but we want to avoid name dupes too for that "Premium" feel.
      const { data: existing } = await this.supabase
        .from('tv_channels')
        .select('id, name, url, epg_id');
      
      const urlMap = new Map(existing?.map(c => [c.url, c]));
      const nameMap = new Map(existing?.map(c => [c.name.toLowerCase(), c]));
      const epgMap = existing ? new Map(existing.filter(c => c.epg_id).map(c => [c.epg_id, c])) : new Map();

      const toInsert: any[] = [];
      
      for (const ch of filteredChannels) {
        const existingChannel = urlMap.get(ch.url) || nameMap.get(ch.name.toLowerCase()) || (ch.tvgId ? epgMap.get(ch.tvgId) : undefined);
        
        if (existingChannel) {
          console.log(`[Channel Ingestion] Updating existing channel: ${ch.name}`);
          // Update
          await this.supabase.from('tv_channels').update({
            name: ch.name,
            category: ch.category || 'General',
            thumbnail: ch.logo,
            epg_id: ch.tvgId,
            is_active: true
          }).eq('id', existingChannel.id);
          continue;
        }

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
          epg_id: ch.tvgId,
          description: `Imported from ${url} (Country: ${ch.country})`,
          is_active: true
        });

        // Add to sets to avoid duplicates WITHIN the same batch
        urlMap.set(ch.url, { id: 'pending' });
        nameMap.set(ch.name.toLowerCase(), { id: 'pending' });
        if (ch.tvgId) epgMap.set(ch.tvgId, { id: 'pending' });
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
   * Validates a stream manifest (HLS or DASH) with deep verification
   */
  static async validateStream(url: string): Promise<{ valid: boolean; error?: string; metadata?: any }> {
    try {
      if (!url || url.trim() === '') return { valid: false, error: 'Empty URL' };

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
        },
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        return { valid: false, error: `HTTP ${response.status}: ${response.statusText}`, metadata: { status: response.status } };
      }

      const contentType = response.headers.get('content-type') || '';
      const body = await response.text();

      // HLS Validation
      if (url.includes('.m3u8') || contentType.includes('mpegurl') || body.startsWith('#EXTM3U')) {
        const parser = new Parser();
        parser.push(body);
        parser.end();

        const manifest = parser.manifest;
        const hasSegments = manifest.segments && manifest.segments.length > 0;
        const hasPlaylists = manifest.playlists && manifest.playlists.length > 0;

        if (!hasSegments && !hasPlaylists) {
          return { valid: false, error: 'Empty or invalid M3U8 manifest (no segments/playlists)' };
        }

        // Deep verification: Check the first media segment or variant
        if (hasSegments) {
          const firstSegment = manifest.segments[0].uri;
          try {
            const segmentBase = url.substring(0, url.lastIndexOf('/') + 1);
            const segmentUrl = firstSegment.startsWith('http') ? firstSegment : segmentBase + firstSegment;
            const segCheck = await fetch(segmentUrl, { 
              method: 'HEAD', 
              signal: AbortSignal.timeout(5000),
              headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            if (!segCheck.ok) return { valid: false, error: `Media segment unreachable: ${segCheck.status}` };
          } catch (e) {
            // Segment checking might fail due to strict CORS or relative paths, but M3U8 was readable
            console.warn(`[Health] Segment check failed for ${url}, but manifest is valid.`);
          }
        }

        return { 
          valid: true, 
          metadata: { 
            type: 'hls', 
            segments: manifest.segments?.length || 0,
            variants: manifest.playlists?.length || 0
          } 
        };
      }

      // YouTube Check
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        // For YouTube, we just check if the page exists and isn't a 404/deleted
        if (body.includes('Video unavailable') || body.includes('This video is private') || body.includes('deleted by the uploader')) {
          return { valid: false, error: 'YouTube video unavailable or private' };
        }
        return { valid: true, metadata: { type: 'youtube' } };
      }

      // DASH Validation
      if (url.includes('.mpd') || contentType.includes('dash+xml') || body.includes('<MPD')) {
        if (body.includes('<MPD')) {
          return { valid: true, metadata: { type: 'dash' } };
        }
        return { valid: false, error: 'Invalid DASH manifest structure' };
      }

      // If it's a direct video link
      if (contentType.includes('video/') || contentType.includes('application/octet-stream')) {
        return { valid: true, metadata: { type: 'video' } };
      }

      return { valid: false, error: 'Unsupported or unrecognizable stream format', metadata: { contentType } };
    } catch (err: any) {
      return { valid: false, error: err.name === 'TimeoutError' ? 'Connection Timeout (10s)' : err.message || 'Network error' };
    }
  }

   /**
   * Performs deep cleanup: Health checks, Archiving, and Duplicate removal
   */
  async runFullAutomation() {
    if (!this.supabase) return { error: 'Supabase Admin not initialized' };

    console.log('[Automation] Starting Full Health & Cleanup Cycle...');
    const startTime = Date.now();
    const report: any = {
      scanned: 0,
      online: 0,
      offline: 0,
      archived: 0,
      duplicatesRemoved: 0,
      errors: []
    };

    try {
      // 1. DUPLICATE REMOVAL
      // Detect duplicates by URL first
      const { data: allChannels } = await this.supabase
        .from('tv_channels')
        .select('id, name, url, category');

      if (allChannels) {
        const seenUrls = new Map<string, string>();
        const toArchiveDupes: string[] = [];

        for (const ch of allChannels) {
          if (seenUrls.has(ch.url)) {
            toArchiveDupes.push(ch.id);
            report.duplicatesRemoved++;
          } else {
            seenUrls.set(ch.url, ch.id);
          }
        }

        if (toArchiveDupes.length > 0) {
          console.log(`[Automation] Archiving ${toArchiveDupes.length} duplicate channels...`);
          await this.archiveChannels(toArchiveDupes, 'Duplicate URL detected');
        }
      }

      // 2. HEALTH CHECKS
      // Process in batches to avoid overwhelming services
      const { data: channelsToCheck } = await this.supabase
        .from('tv_channels')
        .select('*')
        .order('last_checked', { ascending: true, nullsFirst: true })
        .limit(100);

      if (channelsToCheck && channelsToCheck.length > 0) {
        report.scanned = channelsToCheck.length;

        for (const channel of channelsToCheck) {
          const result = await ChannelIngestionService.validateStream(channel.url);
          const now = new Date().toISOString();
          
          if (result.valid) {
            report.online++;
            await this.supabase.from('tv_channels').update({
              status: 'online',
              is_active: true,
              last_checked: now,
              last_online: now,
              failure_count: 0
            }).eq('id', channel.id);
          } else {
            report.offline++;
            const newFailureCount = (channel.failure_count || 0) + 1;
            
            // Logic: Archive if offline for more than 7 checks (if running every 15m, this is ~1.75 hours)
            // User requested 7 CONSECUTIVE DAYS. 
            // 7 days = 168 hours. 168 hours / 15m intervals = 672 failures.
            const failureThreshold = (7 * 24 * 4); 

            if (newFailureCount >= failureThreshold) {
              await this.archiveChannels([channel.id], `Offline for > 7 days (${result.error})`);
              report.archived++;
            } else {
              await this.supabase.from('tv_channels').update({
                status: 'offline',
                is_active: false,
                last_checked: now,
                failure_count: newFailureCount,
                description: (channel.description || '').split(' [Status:')[0] + ` [Status: Offline - ${result.error}]`
              }).eq('id', channel.id);
            }
          }
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`[Automation] Cycle complete in ${duration}s. Report:`, report);
      return report;
    } catch (err: any) {
      console.error('[Automation] Fatal error:', err.message);
      return { ...report, fatal: err.message };
    }
  }

  /**
   * Safely moves channels to archive table and removes from active
   */
  async archiveChannels(ids: string[], reason: string) {
    if (ids.length === 0) return;

    const { data: channels } = await this.supabase
      .from('tv_channels')
      .select('*')
      .in('id', ids);

    if (channels && channels.length > 0) {
      const archiveData = channels.map(c => ({
        original_id: c.id,
        name: c.name,
        url: c.url,
        category: c.category,
        thumbnail: c.thumbnail,
        icon: c.icon,
        description: c.description,
        country: c.country,
        language: c.language,
        stream_type: c.stream_type,
        backup_urls: c.backup_urls,
        epg_id: c.epg_id,
        is_active: false,
        reason: reason,
        metadata: {
          archived_at: new Date().toISOString(),
          last_failure_count: c.failure_count
        }
      }));

      // Insert into archive
      const { error: archiveError } = await this.supabase.from('archived_channels').insert(archiveData);
      if (archiveError) console.error('[Archive] Error inserting:', archiveError.message);

      // Delete from active
      const { error: deleteError } = await this.supabase.from('tv_channels').delete().in('id', ids);
      if (deleteError) console.error('[Archive] Error deleting:', deleteError.message);
    }
  }

  /**
   * Legacy method kept for compatibility but updated implementation
   */
  async runHealthChecks(batchSize: number = 50) {
    return this.runFullAutomation();
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

