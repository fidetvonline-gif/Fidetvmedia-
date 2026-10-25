// server.ts
import * as cheerio_static from "cheerio";
import * as ruhend_static from "ruhend-scraper";
import * as btch_static from "btch-downloader";
import express from "express";
import http from "http";
import path2 from "path";
import cors from "cors";
import dotenv from "dotenv";
import axios8 from "axios";
import { GoogleGenAI as GoogleGenAI2 } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

// src/services/channelIngestionService.ts
import { Parser } from "m3u8-parser";

// src/services/m3uService.ts
import axios from "axios";
var M3UService = class {
  static {
    /**
     * High Priority Countries based on Strategy
     */
    this.HIGH_PRIORITY_COUNTRIES = [
      "NG",
      "ZA",
      "KE",
      "GH",
      "US",
      "GB",
      "CA",
      "AU",
      "FR",
      "DE"
    ];
  }
  static normalizeCategory(name, groupTitle, country) {
    const n = name.toLowerCase();
    const g = groupTitle ? groupTitle.toLowerCase() : "";
    const combined = `${n} ${g}`;
    if (combined.includes("movie") || combined.includes("cinema") || combined.includes("film")) return "Movies";
    if (combined.includes("news")) return "News";
    if (combined.includes("sport")) return "Sports";
    if (combined.includes("kids") || combined.includes("cartoon") || combined.includes("animation")) return "Kids";
    if (combined.includes("music")) return "Music";
    if (combined.includes("religious") || combined.includes("christian") || combined.includes("islamic") || combined.includes("catholic") || combined.includes("gospel")) return "Religious";
    if (combined.includes("doc")) return "Documentary";
    if (combined.includes("lifestyle") || combined.includes("fashion") || combined.includes("travel")) return "Lifestyle";
    if (combined.includes("action")) return "Movies / Action";
    if (combined.includes("comedy")) return "Comedy";
    if (combined.includes("drama")) return "Drama";
    if (combined.includes("entertainment")) return "Entertainment";
    if (country === "NG") return "Nigerian";
    if (country === "IN" && (combined.includes("movie") || combined.includes("cinema"))) return "Indian Movies";
    if (country === "IN") return "Indian";
    if (country === "PH") return "Philippines";
    return "General";
  }
  /**
   * Fetches an M3U playlist and parses it.
   */
  static async fetchAndParse(url, sourceName = "External M3U") {
    try {
      console.log(`[M3U Service] Fetching playlist from: ${url}`);
      const response = await axios.get(url, {
        timeout: 3e4,
        headers: {
          "User-Agent": "FideTV-M3U-Parser/1.2"
        }
      });
      const content = response.data;
      if (typeof content !== "string") {
        throw new Error("Received non-string content from M3U source");
      }
      const channels = [];
      const lines = content.split("\n");
      let currentInfo = null;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith("#EXTINF:")) {
          const logoMatch = line.match(/tvg-logo="([^"]*)"/);
          const groupMatch = line.match(/group-title="([^"]*)"/);
          const countryMatch = line.match(/tvg-country="([^"]*)"/);
          const idMatch = line.match(/tvg-id="([^"]*)"/);
          const languageMatch = line.match(/tvg-language="([^"]*)"/);
          let name = "";
          const commaIndex = line.lastIndexOf(",");
          if (commaIndex !== -1) {
            name = line.substring(commaIndex + 1).trim();
          }
          if (!name) {
            name = idMatch ? idMatch[1] : "Unknown Channel";
          }
          const groupTitle = groupMatch ? groupMatch[1].trim() : "";
          const country = countryMatch ? countryMatch[1].toUpperCase() : "";
          currentInfo = {
            name,
            category: this.normalizeCategory(name, groupTitle, country),
            logo: logoMatch ? logoMatch[1] : "",
            country,
            language: languageMatch ? languageMatch[1] : "Unknown",
            website: "",
            source: sourceName,
            stream_type: "",
            // Will be detected
            resolution: "Unknown",
            tvgId: idMatch ? idMatch[1] : void 0,
            last_checked: (/* @__PURE__ */ new Date()).toISOString()
          };
        } else if (line.startsWith("http") && currentInfo) {
          let st = "HLS";
          if (line.includes(".mpd")) st = "DASH";
          else if (line.includes(".mp4")) st = "MP4";
          else if (line.includes("youtube.com") || line.includes("youtu.be")) st = "YouTube Live";
          channels.push({
            id: Math.random().toString(36).substring(2, 11),
            url: line,
            ...currentInfo,
            stream_type: st
          });
          currentInfo = null;
        }
      }
      console.log(`[M3U Service] Successfully parsed ${channels.length} channels from ${sourceName}`);
      return channels;
    } catch (error) {
      console.error(`[M3U Service] Ingestion error for ${sourceName}:`, error.message);
      return [];
    }
  }
  /**
   * Smart Filter based on Fide TV Premium Strategy
   */
  static smartFilter(channels) {
    return channels.filter((channel) => {
      const name = channel.name.toLowerCase();
      if (!name.includes("movie") && !name.includes("entertainment") && !name.includes("film") && !name.includes("cinema")) {
        const categories = ["action", "comedy", "drama", "crime", "horror", "family", "classic", "sci-fi", "thriller", "romance"];
        if (!categories.some((c) => name.includes(c))) return false;
      }
      if (!channel.name || channel.name === "Unknown Channel" || !channel.url) return false;
      const blockedKeywords = [
        "blocked",
        "restricted",
        "offline",
        "dead",
        "location only",
        "country only",
        "n/a",
        "token",
        "expired",
        "session"
      ];
      if (blockedKeywords.some((k) => name.includes(k))) return false;
      return true;
    });
  }
  /**
   * Filters a list of channels based on provided criteria.
   */
  static filterChannels(channels, filters) {
    return channels.filter((channel) => {
      const matchCategory = !filters.category || channel.category.toLowerCase().includes(filters.category.toLowerCase());
      const matchCountry = !filters.country || channel.country && channel.country.toLowerCase() === filters.country.toLowerCase();
      return matchCategory && matchCountry;
    });
  }
};

// src/services/channelIngestionService.ts
var ChannelIngestionService = class _ChannelIngestionService {
  constructor(supabase) {
    this.supabase = supabase;
  }
  /**
   * Import channels from an M3U URL with Smart Filtering and Duplicate Detection
   */
  async importFromM3U(url, options = {}) {
    console.log(`[Channel Ingestion] Starting smart import from: ${url}`);
    try {
      const rawChannels = await M3UService.fetchAndParse(url);
      const filteredChannels = M3UService.smartFilter(rawChannels);
      console.log(`[Channel Ingestion] Strategy filtered: ${rawChannels.length} -> ${filteredChannels.length}`);
      if (options.dryRun) {
        return filteredChannels;
      }
      const { data: existing } = await this.supabase.from("tv_channels").select("id, name, url, epg_id");
      const urlMap = new Map(existing?.map((c) => [c.url, c]));
      const nameMap = new Map(existing?.map((c) => [c.name.toLowerCase(), c]));
      const epgMap = existing ? new Map(existing.filter((c) => c.epg_id).map((c) => [c.epg_id, c])) : /* @__PURE__ */ new Map();
      const toInsert = [];
      const toUpdate = [];
      for (const ch of filteredChannels) {
        const existingChannel = urlMap.get(ch.url) || nameMap.get(ch.name.toLowerCase()) || (ch.tvgId ? epgMap.get(ch.tvgId) : void 0);
        if (existingChannel && existingChannel.id !== "pending") {
          toUpdate.push({
            id: existingChannel.id,
            name: ch.name,
            category: ch.category || "General",
            thumbnail: ch.logo,
            epg_id: ch.tvgId,
            is_active: true,
            status: "online"
          });
          continue;
        }
        if (options.validateAll) {
          const check = await _ChannelIngestionService.validateStream(ch.url);
          if (!check.valid) {
            continue;
          }
        }
        toInsert.push({
          name: ch.name,
          url: ch.url,
          category: ch.category || "General",
          thumbnail: ch.logo,
          epg_id: ch.tvgId,
          description: `Imported from ${url} (Country: ${ch.country})`,
          is_active: true,
          status: "online"
        });
        urlMap.set(ch.url, { id: "pending" });
        nameMap.set(ch.name.toLowerCase(), { id: "pending" });
        if (ch.tvgId) epgMap.set(ch.tvgId, { id: "pending" });
      }
      console.log(`[Channel Ingestion] Finalizing import: ${toInsert.length} new, ${toUpdate.length} updates.`);
      if (toUpdate.length > 0) {
        for (let i = 0; i < toUpdate.length; i += 50) {
          const chunk = toUpdate.slice(i, i + 50);
          await this.supabase.from("tv_channels").upsert(chunk);
        }
      }
      if (toInsert.length > 0) {
        for (let i = 0; i < toInsert.length; i += 50) {
          const chunk = toInsert.slice(i, i + 50);
          const { error } = await this.supabase.from("tv_channels").insert(chunk);
          if (error) console.error(`[Channel Ingestion] Error inserting chunk:`, error.message);
        }
      }
      return { total: rawChannels.length, filtered: filteredChannels.length, inserted: toInsert.length };
    } catch (err) {
      console.error(`[Channel Ingestion] Fatal import error:`, err.message);
      throw err;
    }
  }
  /**
   * Validates a stream manifest (HLS or DASH) with deep verification
   */
  static async validateStream(url) {
    try {
      if (!url || url.trim() === "") return { valid: false, error: "Empty URL" };
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "*/*"
        },
        signal: AbortSignal.timeout(1e4)
      });
      if (!response.ok) {
        return { valid: false, error: `HTTP ${response.status}: ${response.statusText}`, metadata: { status: response.status } };
      }
      const contentType = response.headers.get("content-type") || "";
      const body = await response.text();
      if (url.includes(".m3u8") || contentType.includes("mpegurl") || body.startsWith("#EXTM3U")) {
        const parser = new Parser();
        parser.push(body);
        parser.end();
        const manifest = parser.manifest;
        const hasSegments = manifest.segments && manifest.segments.length > 0;
        const hasPlaylists = manifest.playlists && manifest.playlists.length > 0;
        if (!hasSegments && !hasPlaylists) {
          return { valid: false, error: "Empty or invalid M3U8 manifest (no segments/playlists)" };
        }
        if (hasSegments) {
          const firstSegment = manifest.segments[0].uri;
          try {
            const segmentBase = url.substring(0, url.lastIndexOf("/") + 1);
            const segmentUrl = firstSegment.startsWith("http") ? firstSegment : segmentBase + firstSegment;
            const segCheck = await fetch(segmentUrl, {
              method: "HEAD",
              signal: AbortSignal.timeout(3e3),
              // Reduced timeout
              headers: { "User-Agent": "Mozilla/5.0" }
            });
            if (!segCheck.ok) return { valid: false, error: `Media segment unreachable: ${segCheck.status}` };
          } catch (e) {
          }
        } else if (hasPlaylists) {
          const firstVariant = manifest.playlists[0].uri;
          try {
            const base = url.substring(0, url.lastIndexOf("/") + 1);
            const variantUrl = firstVariant.startsWith("http") ? firstVariant : base + firstVariant;
            const variantCheck = await fetch(variantUrl, {
              method: "HEAD",
              signal: AbortSignal.timeout(3e3),
              // Reduced timeout
              headers: { "User-Agent": "Mozilla/5.0" }
            });
            if (!variantCheck.ok) return { valid: false, error: `Variant manifest unreachable: ${variantCheck.status}` };
          } catch (e) {
          }
        }
        return {
          valid: true,
          metadata: {
            type: "hls",
            segments: manifest.segments?.length || 0,
            variants: manifest.playlists?.length || 0
          }
        };
      }
      if (url.includes("youtube.com") || url.includes("youtu.be")) {
        if (body.includes("Video unavailable") || body.includes("This video is private") || body.includes("deleted by the uploader")) {
          return { valid: false, error: "YouTube video unavailable or private" };
        }
        return { valid: true, metadata: { type: "youtube" } };
      }
      if (url.includes(".mpd") || contentType.includes("dash+xml") || body.includes("<MPD")) {
        if (body.includes("<MPD")) {
          return { valid: true, metadata: { type: "dash" } };
        }
        return { valid: false, error: "Invalid DASH manifest structure" };
      }
      if (contentType.includes("video/") || contentType.includes("application/octet-stream")) {
        return { valid: true, metadata: { type: "video" } };
      }
      return { valid: false, error: "Unsupported or unrecognizable stream format", metadata: { contentType } };
    } catch (err) {
      return { valid: false, error: err.name === "TimeoutError" ? "Connection Timeout (10s)" : err.message || "Network error" };
    }
  }
  /**
  * Performs deep cleanup: Health checks, Archiving, and Duplicate removal
  */
  async runFullAutomation() {
    if (!this.supabase) return { error: "Supabase Admin not initialized" };
    console.log("[Automation] Starting Full Health & Cleanup Cycle...");
    const startTime = Date.now();
    const report = {
      scanned: 0,
      online: 0,
      offline: 0,
      archived: 0,
      duplicatesRemoved: 0,
      errors: []
    };
    try {
      const { data: allChannels } = await this.supabase.from("tv_channels").select("id, name, url, category, epg_id");
      if (allChannels) {
        const seenUrls = /* @__PURE__ */ new Map();
        const seenIds = /* @__PURE__ */ new Map();
        const seenNames = /* @__PURE__ */ new Map();
        const toArchiveDupes = /* @__PURE__ */ new Set();
        for (const ch of allChannels) {
          let isDup = false;
          if (ch.url && seenUrls.has(ch.url)) isDup = true;
          if (ch.epg_id && seenIds.has(ch.epg_id)) isDup = true;
          if (ch.name && seenNames.has(ch.name.toLowerCase())) isDup = true;
          if (isDup) {
            toArchiveDupes.add(ch.id);
            report.duplicatesRemoved++;
          } else {
            if (ch.url) seenUrls.set(ch.url, ch.id);
            if (ch.epg_id) seenIds.set(ch.epg_id, ch.id);
            if (ch.name) seenNames.set(ch.name.toLowerCase(), ch.id);
          }
        }
        if (toArchiveDupes.size > 0) {
          console.log(`[Automation] Archiving ${toArchiveDupes.size} duplicate channels...`);
          await this.archiveChannels(Array.from(toArchiveDupes), "Duplicate detected (URL/ID/Name)");
        }
      }
      const { data: channelsToCheck } = await this.supabase.from("tv_channels").select("*").order("last_checked", { ascending: true, nullsFirst: true }).limit(100);
      if (channelsToCheck && channelsToCheck.length > 0) {
        report.scanned = channelsToCheck.length;
        const updates = [];
        const toArchive = [];
        for (const channel of channelsToCheck) {
          const result = await _ChannelIngestionService.validateStream(channel.url);
          const now = (/* @__PURE__ */ new Date()).toISOString();
          if (result.valid) {
            report.online++;
            updates.push({
              id: channel.id,
              status: "online",
              is_active: true,
              last_checked: now,
              last_online: now,
              failure_count: 0
            });
          } else {
            report.offline++;
            const newFailureCount = (channel.failure_count || 0) + 1;
            const failureThreshold = 7 * 24 * 4;
            if (newFailureCount >= failureThreshold) {
              toArchive.push(channel.id);
              report.archived++;
            } else {
              updates.push({
                id: channel.id,
                status: "offline",
                is_active: false,
                last_checked: now,
                failure_count: newFailureCount,
                description: (channel.description || "").split(" [Status:")[0] + ` [Status: Offline - ${result.error}]`
              });
            }
          }
        }
        if (updates.length > 0) {
          for (let i = 0; i < updates.length; i += 50) {
            const chunk = updates.slice(i, i + 50);
            await this.supabase.from("tv_channels").upsert(chunk);
          }
        }
        if (toArchive.length > 0) {
          await this.archiveChannels(toArchive, "Offline for > 7 days");
        }
      }
      const duration = ((Date.now() - startTime) / 1e3).toFixed(2);
      console.log(`[Automation] Cycle complete in ${duration}s. Report:`, report);
      return report;
    } catch (err) {
      console.error("[Automation] Fatal error:", err.message);
      return { ...report, fatal: err.message };
    }
  }
  /**
   * Safely moves channels to archive table and removes from active
   */
  async archiveChannels(ids, reason) {
    if (ids.length === 0) return;
    const { data: channels } = await this.supabase.from("tv_channels").select("*").in("id", ids);
    if (channels && channels.length > 0) {
      const archiveData = channels.map((c) => ({
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
        reason,
        metadata: {
          archived_at: (/* @__PURE__ */ new Date()).toISOString(),
          last_failure_count: c.failure_count
        }
      }));
      const { error: archiveError } = await this.supabase.from("archived_channels").insert(archiveData);
      if (archiveError) console.error("[Archive] Error inserting:", archiveError.message);
      const { error: deleteError } = await this.supabase.from("tv_channels").delete().in("id", ids);
      if (deleteError) console.error("[Archive] Error deleting:", deleteError.message);
    }
  }
  /**
   * Legacy method kept for compatibility but updated implementation
   */
  async runHealthChecks(batchSize = 50) {
    return this.runFullAutomation();
  }
  async updateChannel(id, data) {
    await this.supabase.from("discovered_channels").update(data).eq("id", id);
  }
  async moveToStable(channel) {
    console.log(`[Channel Ingestion] Moving channel to stable: ${channel.name}`);
    let thumbnail = channel.thumbnail;
    if (!thumbnail && (channel.url.includes("youtube.com") || channel.url.includes("youtu.be"))) {
      const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
      const match = channel.url.match(regExp);
      const videoId = match && match[7].length === 11 ? match[7] : null;
      if (videoId) {
        thumbnail = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
      }
    }
    const stablePayload = {
      name: channel.name,
      url: channel.url,
      category: channel.category || "General",
      thumbnail,
      is_active: true,
      last_verified: (/* @__PURE__ */ new Date()).toISOString()
    };
    const { error: stableError } = await this.supabase.from("stable_channels").upsert([stablePayload], { onConflict: "url" });
    if (stableError) {
      console.error("[Channel Ingestion] Error moving to stable:", stableError);
      return;
    }
    await this.updateChannel(channel.id, {
      status: "stable",
      fail_count: 0,
      last_check: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  async removeFromStable(url) {
    console.log(`[Channel Ingestion] Removing failed channel from stable: ${url}`);
    await this.supabase.from("stable_channels").delete().eq("url", url);
  }
};

// src/lib/api.ts
async function parseResponseJson(res) {
  let text = "";
  try {
    text = await res.text();
  } catch (e) {
    if (!res.ok) {
      throw new Error(`Server error (${res.status}).`);
    }
    return {};
  }
  if (!text || !text.trim()) {
    if (!res.ok) {
      throw new Error(`Server returned error status (${res.status}).`);
    }
    return {};
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    console.warn(`[API] Response was not valid JSON (status ${res.status}):`, text.substring(0, 120));
    const cleanText = text.replace(/<[^>]*>?/gm, "").trim();
    const shortMsg = cleanText.substring(0, 150) || `Server returned status ${res.status}`;
    if (!res.ok) {
      throw new Error(shortMsg);
    }
    return { error: shortMsg, raw: text };
  }
}

// src/services/youtubeIngestionService.ts
var YouTubeIngestionService = class _YouTubeIngestionService {
  constructor(supabase, apiKey) {
    this.searchQueries = [
      // NIGERIA & AFRICA
      "NTA live",
      "Channels TV live",
      "TVC News live",
      "Arise News live",
      "AIT live",
      "Silverbird TV live",
      "Wazobia TV live",
      "RSTV live",
      "Lagos Television live",
      "Liberty TV live",
      "Plus TV Africa live",
      // INTERNATIONAL NEWS
      "BBC News live",
      "CNN International live",
      "Al Jazeera English live",
      "France 24 English live",
      "DW English live",
      "Bloomberg Television live",
      // NEWS & POLITICS (EXISTING)
      "live news",
      "24/7 live TV",
      "breaking news live",
      "live TV stream",
      // MUSIC & ENTERTAINMENT
      "lofi hip hop radio live",
      "24/7 music live",
      "live concert stream",
      "smooth jazz live 24/7",
      "top hits music live",
      "classical music live 24/7",
      "relaxing music live",
      "techno live stream 24/7",
      "african music live radio",
      "trace tv live",
      "mtv live stream",
      "soundcity live",
      "hip tv live stream",
      "viva tv live",
      "k-pop live stream 24/7",
      "reggae music live",
      "gospel music live radio",
      "worship 24/7 live",
      "dj mix live",
      // SPORTS
      "sports live stream",
      "football live 24/7",
      "basketball live stream",
      "tennis live channel",
      "boxing live stream",
      "cricket live match",
      "esports live",
      "super sport live stream",
      "bein sports live",
      "espn live stream",
      "fox sports live",
      "racing live 24/7",
      // FAITH & INSPIRATION
      "christian live tv",
      "islamic live tv",
      "prayer line live",
      "sunday service live",
      "emmanuel tv live",
      "dove tv live",
      "loveworld tv live",
      "shiloh live",
      "makkah live 24/7",
      // KIDS & FAMILY
      "cartoons live 24/7",
      "disney channel live",
      "nickelodeon live",
      "nursery rhymes live",
      "kids stories live",
      "educational videos live",
      // LIFESTYLE & DOCUMENTARY
      "wildlife live camera",
      "space live stream nasa",
      "cooking live stream",
      "travel live 24/7",
      "fashion tv live",
      "tastemade live",
      "national geographic live",
      "discovery channel live"
    ];
    this.supabase = supabase;
    this.apiKey = apiKey;
  }
  /**
   * Extract video ID from various YouTube URL formats
   */
  static extractVideoId(url) {
    if (!url) return null;
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?v=)|(live\/)|(shorts\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    if (match && match[match.length - 1].length === 11) {
      return match[match.length - 1];
    }
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes("youtube.com")) {
        if (urlObj.pathname.startsWith("/live/") || urlObj.pathname.startsWith("/shorts/")) {
          return urlObj.pathname.split("/")[2];
        }
        return urlObj.searchParams.get("v");
      } else if (urlObj.hostname === "youtu.be") {
        return urlObj.pathname.slice(1);
      }
    } catch (e) {
    }
    return null;
  }
  /**
   * Fetch metadata and statistics for a specific YouTube video
   */
  async getVideoMetadata(videoId) {
    try {
      const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails,statistics&id=${videoId}&key=${this.apiKey}`;
      const response = await fetch(url);
      const data = await parseResponseJson(response);
      if (!data.items || data.items.length === 0) {
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
        title: video.snippet.title.replace(/SportyTV/gi, "FideTv"),
        thumbnail: video.snippet.thumbnails.maxres?.url || video.snippet.thumbnails.high?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        channelTitle: video.snippet.channelTitle.replace(/SportyTV/gi, "FideTv"),
        channelId: video.snippet.channelId,
        description: video.snippet.description.replace(/SportyTV/gi, "FideTv"),
        isLive: video.snippet.liveBroadcastContent === "live",
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
    console.log("[YouTube Ingestion] Updating statistics for all channels...");
    try {
      const { data: channels, error } = await this.supabase.from("tv_channels").select("id, url, name").eq("is_active", true);
      if (error) throw error;
      if (!channels) return;
      for (const channel of channels) {
        const videoId = _YouTubeIngestionService.extractVideoId(channel.url);
        if (videoId) {
          const metadata = await this.getVideoMetadata(videoId);
          await this.supabase.from("tv_channels").update({
            viewer_count: parseInt(metadata.viewers) || 0,
            like_count: parseInt(metadata.likes) || 0,
            comment_count: parseInt(metadata.commentCount || "0") || 0,
            thumbnail: metadata.thumbnail,
            // Auto-heal thumbnail
            last_verified_at: (/* @__PURE__ */ new Date()).toISOString()
          }).eq("id", channel.id);
        }
      }
      console.log(`[YouTube Ingestion] Stats update complete for ${channels.length} channels.`);
    } catch (err) {
      console.error("[YouTube Ingestion] Stats update failed:", err);
    }
  }
  /**
   * Fetch and ingest videos from a specific channel into portfolio_items
   */
  async ingestVideosFromChannel(channelId, category = "General Content") {
    console.log(`[YouTube Ingestion] Ingesting videos for channel: ${channelId}`);
    try {
      const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${this.apiKey}`;
      const channelRes = await fetch(channelUrl);
      const channelData = await parseResponseJson(channelRes);
      if (!channelData.items || channelData.items.length === 0) {
        throw new Error("Channel not found");
      }
      const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;
      const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${uploadsPlaylistId}&key=${this.apiKey}`;
      const playlistRes = await fetch(playlistUrl);
      const playlistData = await parseResponseJson(playlistRes);
      if (!playlistData.items) return [];
      const videoIds = playlistData.items.map((item) => item.snippet.resourceId.videoId).join(",");
      const videoDetailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id=${videoIds}&key=${this.apiKey}`;
      const videoDetailsRes = await fetch(videoDetailsUrl);
      const videoDetailsData = await parseResponseJson(videoDetailsRes);
      const liveStatusMap = /* @__PURE__ */ new Map();
      if (videoDetailsData.items) {
        for (const v of videoDetailsData.items) {
          liveStatusMap.set(v.id, v.snippet.liveBroadcastContent);
        }
      }
      const ingested = [];
      for (const item of playlistData.items) {
        const videoId = item.snippet.resourceId.videoId;
        const status = liveStatusMap.get(videoId);
        if (status === "upcoming") {
          console.log(`[YouTube Ingestion] Skipping upcoming stream: ${videoId}`);
          continue;
        }
        const title = item.snippet.title.replace(/SportyTV/gi, "FideTv");
        const description = item.snippet.description.replace(/SportyTV/gi, "FideTv");
        const thumbnail = item.snippet.thumbnails.maxres?.url || item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url;
        let inferredCategory = category;
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes("campus matters")) inferredCategory = "Campus Matters";
        else if (lowerTitle.includes("love affair")) inferredCategory = "Love Affairs";
        else if (lowerTitle.includes("interview")) inferredCategory = "Interviews";
        else if (lowerTitle.includes("commercial")) inferredCategory = "Commercial";
        else if (lowerTitle.includes("corporate")) inferredCategory = "Corporate";
        else if (lowerTitle.includes("live")) inferredCategory = "Live Events";
        const { data: existing } = await this.supabase.from("portfolio_items").select("id").eq("youtube_id", videoId).maybeSingle();
        const payload = {
          title,
          description,
          category: inferredCategory,
          image_url: thumbnail,
          youtube_id: videoId,
          video_url: `https://www.youtube.com/watch?v=${videoId}`,
          created_at: item.snippet.publishedAt
        };
        if (!existing) {
          const { error } = await this.supabase.from("portfolio_items").insert([payload]);
          if (!error) ingested.push(title);
        } else {
          await this.supabase.from("portfolio_items").update(payload).eq("id", existing.id);
          ingested.push(title + " (updated)");
        }
      }
      return ingested;
    } catch (err) {
      console.error("[YouTube Ingestion] Channel ingestion failed:", err);
      throw err;
    }
  }
  /**
   * Parse YouTube Channel RSS Feed (Atom format) - Requires NO API Key!
   */
  parseRssFeed(xmlText) {
    const videos = [];
    try {
      const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
      let match;
      while ((match = entryRegex.exec(xmlText)) !== null) {
        const entryStr = match[1];
        const videoIdMatch = entryStr.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
        const titleMatch = entryStr.match(/<media:title>([^<]+)<\/media:title>/) || entryStr.match(/<title>([^<]+)<\/title>/);
        const publishedMatch = entryStr.match(/<published>([^<]+)<\/published>/);
        const descMatch = entryStr.match(/<media:description>([\s\S]*?)<\/media:description>/);
        const thumbMatch = entryStr.match(/<media:thumbnail url="([^"]+)"/);
        const videoId = videoIdMatch ? videoIdMatch[1].trim() : null;
        if (!videoId) continue;
        const title = titleMatch ? titleMatch[1].trim().replace(/SportyTV/gi, "FideTv") : "YouTube Video";
        const description = descMatch ? descMatch[1].trim().replace(/SportyTV/gi, "FideTv") : "";
        const publishedAt = publishedMatch ? publishedMatch[1].trim() : (/* @__PURE__ */ new Date()).toISOString();
        const thumbnail = thumbMatch ? thumbMatch[1] : `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        let category = "General Content";
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes("campus matters")) category = "Campus Matters";
        else if (lowerTitle.includes("love affair") || lowerTitle.includes("love affairs")) category = "Love Affairs";
        else if (lowerTitle.includes("interview") || lowerTitle.includes("interviews")) category = "Interviews";
        else if (lowerTitle.includes("commercial")) category = "Commercial";
        else if (lowerTitle.includes("corporate")) category = "Corporate";
        else if (lowerTitle.includes("live") || lowerTitle.includes("conference")) category = "Live Events";
        videos.push({
          id: videoId,
          title,
          category,
          image: thumbnail,
          image_url: thumbnail,
          type: "video",
          youtube_id: videoId,
          stream_url: `https://www.youtube.com/watch?v=${videoId}`,
          video_url: `https://www.youtube.com/watch?v=${videoId}`,
          description,
          publishedAt,
          created_at: publishedAt
        });
      }
    } catch (e) {
      console.error("[YouTube Ingestion] Error parsing RSS feed:", e);
    }
    return videos;
  }
  /**
   * Sync fetched YouTube videos directly to Supabase portfolio_items table
   */
  async syncVideosToDatabase(videos) {
    if (!this.supabase || !videos || videos.length === 0) return;
    try {
      for (const v of videos) {
        const videoId = v.youtube_id || v.id;
        if (!videoId) continue;
        const { data: existing } = await this.supabase.from("portfolio_items").select("id").eq("youtube_id", videoId).maybeSingle();
        const pubDate = v.publishedAt || v.created_at || (/* @__PURE__ */ new Date()).toISOString();
        const payload = {
          title: v.title,
          description: v.description || "",
          category: v.category || "General Content",
          image_url: v.image || v.image_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          youtube_id: videoId,
          video_url: `https://www.youtube.com/watch?v=${videoId}`,
          is_featured: true,
          created_at: pubDate
        };
        if (!existing) {
          await this.supabase.from("portfolio_items").insert([payload]);
        } else {
          await this.supabase.from("portfolio_items").update(payload).eq("id", existing.id);
        }
      }
      console.log(`[YouTube Ingestion] Successfully synced ${videos.length} videos to portfolio_items.`);
    } catch (err) {
      console.error("[YouTube Ingestion] Database sync failed:", err);
    }
  }
  /**
   * Fetch and format videos directly from RSS or API (saving to DB automatically)
   */
  async getFormattedVideosForChannel(channelId) {
    try {
      const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
      const rssRes = await fetch(rssUrl, { cache: "no-store" });
      if (rssRes.ok) {
        const xmlText = await rssRes.text();
        const rssVideos = this.parseRssFeed(xmlText);
        if (rssVideos.length > 0) {
          this.syncVideosToDatabase(rssVideos).catch((e) => console.error("Background sync error:", e));
          return rssVideos;
        }
      }
    } catch (rssErr) {
      console.warn("[YouTube Ingestion] RSS feed fetch failed, falling back to API:", rssErr);
    }
    try {
      if (this.apiKey) {
        const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${this.apiKey}`;
        const channelRes = await fetch(channelUrl);
        const channelData = await parseResponseJson(channelRes);
        if (channelData.items && channelData.items.length > 0) {
          const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;
          const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${uploadsPlaylistId}&key=${this.apiKey}`;
          const playlistRes = await fetch(playlistUrl);
          const playlistData = await parseResponseJson(playlistRes);
          if (playlistData.items && playlistData.items.length > 0) {
            const videoIds = playlistData.items.map((item) => item.snippet.resourceId.videoId).join(",");
            const videoDetailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoIds}&key=${this.apiKey}`;
            const videoDetailsRes = await fetch(videoDetailsUrl);
            const videoDetailsData = await parseResponseJson(videoDetailsRes);
            const liveStatusMap = /* @__PURE__ */ new Map();
            if (videoDetailsData.items) {
              for (const v of videoDetailsData.items) {
                liveStatusMap.set(v.id, v.snippet.liveBroadcastContent);
              }
            }
            const apiVideos = playlistData.items.filter((item) => liveStatusMap.get(item.snippet.resourceId.videoId) !== "upcoming").map((item) => {
              const vid = item.snippet.resourceId.videoId;
              const title = item.snippet.title.replace(/SportyTV/gi, "FideTv");
              let category = "General Content";
              const lowerTitle = title.toLowerCase();
              if (lowerTitle.includes("campus matters")) category = "Campus Matters";
              else if (lowerTitle.includes("love affair")) category = "Love Affairs";
              else if (lowerTitle.includes("interview")) category = "Interviews";
              else if (lowerTitle.includes("commercial")) category = "Commercial";
              else if (lowerTitle.includes("corporate")) category = "Corporate";
              else if (lowerTitle.includes("live")) category = "Live Events";
              return {
                id: vid,
                title,
                category,
                image: item.snippet.thumbnails.maxres?.url || item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
                image_url: item.snippet.thumbnails.maxres?.url || item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
                type: "video",
                youtube_id: vid,
                stream_url: `https://www.youtube.com/watch?v=${vid}`,
                video_url: `https://www.youtube.com/watch?v=${vid}`,
                description: item.snippet.description.replace(/SportyTV/gi, "FideTv"),
                publishedAt: item.snippet.publishedAt,
                created_at: item.snippet.publishedAt
              };
            });
            if (apiVideos.length > 0) {
              this.syncVideosToDatabase(apiVideos).catch((e) => console.error("Background sync error:", e));
              return apiVideos;
            }
          }
        }
      }
    } catch (err) {
      console.error("[YouTube Ingestion] API fallback failed:", err);
    }
    return [];
  }
  /**
   * Main discovery loop
   */
  async runDiscoveryCycle(maxPagesPerQuery = 2) {
    console.log(`[YouTube Ingestion] Starting discovery cycle with ${maxPagesPerQuery} pages per query...`);
    const report = {
      new_channels_added: [],
      active_channels: [],
      removed_channels: [],
      total_active_count: 0
    };
    try {
      const discoveredVideos = /* @__PURE__ */ new Map();
      const prioritizedQueries = [...this.searchQueries].sort(() => Math.random() - 0.5);
      for (const query of prioritizedQueries) {
        console.log(`[YouTube Ingestion] Searching for: ${query}`);
        const results = await this.searchLiveStreams(query, maxPagesPerQuery);
        results.forEach((video) => {
          if (video.id.videoId && !discoveredVideos.has(video.id.videoId)) {
            discoveredVideos.set(video.id.videoId, video);
          }
        });
        if (discoveredVideos.size > 500) break;
      }
      console.log(`[YouTube Ingestion] Discovery phase found ${discoveredVideos.size} unique potential live streams.`);
      const { data: existingChannels } = await this.supabase.from("tv_channels").select("*").not("youtube_channel_id", "is", null);
      const existingMap = new Map((existingChannels || []).map((c) => [c.youtube_channel_id, c]));
      for (const [videoId, video] of discoveredVideos) {
        const channelId = video.snippet.channelId;
        const channelTitle = video.snippet.channelTitle;
        const videoTitle = video.snippet.title.replace(/SportyTV/gi, "FideTv");
        const description = video.snippet.description.replace(/SportyTV/gi, "FideTv");
        const embedUrl = `https://www.youtube.com/embed/${videoId}`;
        if (!channelId || !channelTitle) continue;
        const blocklist = [];
        if (blocklist.some((title) => videoTitle.includes(title))) {
          continue;
        }
        const isNew = !existingMap.has(channelId);
        const payload = {
          name: channelTitle,
          category: this.inferCategory(videoTitle, channelTitle),
          url: embedUrl,
          thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default?.url,
          description,
          is_active: true,
          youtube_channel_id: channelId,
          youtube_video_id: videoId,
          is_24_7: true,
          last_verified_at: (/* @__PURE__ */ new Date()).toISOString()
        };
        if (isNew) {
          const { error } = await this.supabase.from("tv_channels").insert([payload]);
          if (!error) report.new_channels_added.push(channelTitle);
        } else {
          await this.supabase.from("tv_channels").update(payload).eq("youtube_channel_id", channelId);
        }
        report.active_channels.push(channelTitle);
        existingMap.delete(channelId);
      }
      for (const [channelId, channel] of existingMap) {
        const stillLive = await this.verifyIsLive(channel.youtube_video_id);
        if (!stillLive) {
          await this.supabase.from("tv_channels").update({ is_active: false }).eq("youtube_channel_id", channelId);
          report.removed_channels.push(channel.name);
        } else {
          report.active_channels.push(channel.name);
        }
      }
      report.total_active_count = report.active_channels.length;
      await this.supabase.from("youtube_ingestion_reports").insert([{
        new_channels: report.new_channels_added,
        active_channels: report.active_channels,
        removed_channels: report.removed_channels,
        total_active_count: report.total_active_count
      }]);
      console.log("[YouTube Ingestion] Cycle complete.", report);
      return report;
    } catch (err) {
      console.error("[YouTube Ingestion] Critical Failure:", err);
      throw err;
    }
  }
  async searchLiveStreams(query, pages = 1) {
    const allItems = [];
    let nextToken = "";
    try {
      for (let i = 0; i < pages; i++) {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&eventType=live&maxResults=50&q=${encodeURIComponent(query)}&key=${this.apiKey}${nextToken ? `&pageToken=${nextToken}` : ""}`;
        const response = await fetch(url);
        const data = await parseResponseJson(response);
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
  async verifyIsLive(videoId) {
    if (!videoId) return false;
    try {
      const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id=${videoId}&key=${this.apiKey}`;
      const response = await fetch(url);
      const data = await parseResponseJson(response);
      if (!data.items || data.items.length === 0) return false;
      const video = data.items[0];
      return video.snippet.liveBroadcastContent === "live";
    } catch (err) {
      return false;
    }
  }
  inferCategory(title, channel) {
    const t = (title + " " + channel).toLowerCase();
    if (t.includes("nigeria") || t.includes("nta") || t.includes("tvc") || t.includes("lagos") || t.includes("abuja") || t.includes("arise news")) return "Nigeria";
    if (t.includes("international") || t.includes("global") || t.includes("world") || t.includes("bbc") || t.includes("cnn") || t.includes("al jazeera") || t.includes("france 24")) return "International";
    if (t.includes("news")) return "News";
    if (t.includes("sport") || t.includes("football") || t.includes("match") || t.includes("goal")) return "Sports";
    if (t.includes("music") || t.includes("song") || t.includes("radio") || t.includes("concert")) return "Music";
    if (t.includes("movie") || t.includes("film") || t.includes("cinema")) return "Movies";
    if (t.includes("game") || t.includes("gaming") || t.includes("play")) return "Gaming";
    if (t.includes("kid") || t.includes("cartoon") || t.includes("nursery") || t.includes("child")) return "Kids";
    if (t.includes("church") || t.includes("bible") || t.includes("faith") || t.includes("prayer") || t.includes("gospel")) return "Religion";
    if (t.includes("food") || t.includes("cook") || t.includes("chef")) return "Lifestyle";
    return "General";
  }
};

// src/services/autoBlogService.ts
import axios3 from "axios";
import * as cheerio from "cheerio";
import { GoogleGenAI } from "@google/genai";
import fs from "fs/promises";
import path from "path";

// server/media/newsImageValidator.ts
import axios2 from "axios";
var THEMATIC_IMAGE_REGISTRY = {
  nigeria_politics: [
    "https://images.unsplash.com/photo-1541872703-74c5e44368f9?q=85&w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1577495508048-b635879837f1?q=85&w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?q=85&w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=85&w=1600&auto=format&fit=crop"
  ],
  economy_business: [
    "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=85&w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=85&w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?q=85&w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=85&w=1600&auto=format&fit=crop"
  ],
  sports_football: [
    "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=85&w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1517466787929-bc90951d0974?q=85&w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=85&w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?q=85&w=1600&auto=format&fit=crop"
  ],
  technology_ai: [
    "https://images.unsplash.com/photo-1518770660439-4636190af475?q=85&w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=85&w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=85&w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1531482615713-2afd69097998?q=85&w=1600&auto=format&fit=crop"
  ],
  health_science: [
    "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?q=85&w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?q=85&w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=85&w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?q=85&w=1600&auto=format&fit=crop"
  ],
  broadcasting_media: [
    "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=85&w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?q=85&w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=85&w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=85&w=1600&auto=format&fit=crop"
  ],
  education_youth: [
    "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=85&w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=85&w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?q=85&w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=85&w=1600&auto=format&fit=crop"
  ],
  entertainment_culture: [
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=85&w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=85&w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?q=85&w=1600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=85&w=1600&auto=format&fit=crop"
  ]
};
function hashStringToNumber(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
function detectArticleTheme(title = "", content = "", category = "") {
  const combined = `${title} ${content} ${category}`.toLowerCase();
  if (combined.includes("tinubu") || combined.includes("atiku") || combined.includes("election") || combined.includes("senate") || combined.includes("governor") || combined.includes("minister") || combined.includes("niger delta") || combined.includes("politics") || combined.includes("government") || combined.includes("fct")) {
    return "nigeria_politics";
  }
  if (combined.includes("rangers") || combined.includes("caf") || combined.includes("football") || combined.includes("champions league") || combined.includes("alger") || combined.includes("sport") || combined.includes("match") || combined.includes("stadium") || combined.includes("cup") || combined.includes("super eagles")) {
    return "sports_football";
  }
  if (combined.includes("ebola") || combined.includes("health") || combined.includes("virus") || combined.includes("ncdc") || combined.includes("strain") || combined.includes("medical") || combined.includes("hospital") || combined.includes("disease") || combined.includes("vaccine") || combined.includes("genomic")) {
    return "health_science";
  }
  if (combined.includes("iphone") || combined.includes("apple") || combined.includes("tech") || combined.includes("ai") || combined.includes("software") || combined.includes("digital") || combined.includes("platform") || combined.includes("cyber") || combined.includes("gadget")) {
    return "technology_ai";
  }
  if (combined.includes("polytechnic") || combined.includes("nbte") || combined.includes("university") || combined.includes("campus") || combined.includes("naus") || combined.includes("education") || combined.includes("students") || combined.includes("youth") || combined.includes("school")) {
    return "education_youth";
  }
  if (combined.includes("fuel") || combined.includes("nnpc") || combined.includes("petrol") || combined.includes("economy") || combined.includes("subsidy") || combined.includes("inflation") || combined.includes("naira") || combined.includes("market") || combined.includes("tax") || combined.includes("bank")) {
    return "economy_business";
  }
  if (combined.includes("ndybest") || combined.includes("entertainment") || combined.includes("movie") || combined.includes("music") || combined.includes("spicy circle") || combined.includes("celebrity") || combined.includes("nollywood") || combined.includes("culture")) {
    return "entertainment_culture";
  }
  return "broadcasting_media";
}
function getContentSpecificImage(title = "", content = "", category = "") {
  const theme = detectArticleTheme(title, content, category);
  const imagePool = THEMATIC_IMAGE_REGISTRY[theme] || THEMATIC_IMAGE_REGISTRY["broadcasting_media"];
  const hash = hashStringToNumber(title || category || "fidetv_news");
  const index = hash % imagePool.length;
  return imagePool[index];
}
async function probeImageUrl(url, timeoutMs = 3e3) {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return false;
  if (trimmed.includes("ichef.bbci.co.uk") || trimmed.includes("bbci.co.uk") || trimmed.includes("dicebear.com") || trimmed.includes("placeholder") || trimmed.includes("1x1") || trimmed.endsWith(".svg")) {
    return false;
  }
  try {
    const resp = await axios2.head(trimmed, {
      timeout: timeoutMs,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) FideTV-ImageValidator/2.0"
      },
      validateStatus: (status) => status >= 200 && status < 400
    });
    const contentType = resp.headers["content-type"] || "";
    if (contentType.startsWith("image/")) {
      return true;
    }
  } catch (headErr) {
    try {
      const getResp = await axios2.get(trimmed, {
        timeout: timeoutMs,
        headers: {
          Range: "bytes=0-1024",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) FideTV-ImageValidator/2.0"
        },
        validateStatus: (status) => status >= 200 && status < 400 || status === 206
      });
      const contentType = getResp.headers["content-type"] || "";
      return contentType.startsWith("image/");
    } catch {
      return false;
    }
  }
  return true;
}
async function validateAndEnrichNewsCover(candidateUrl, title = "", content = "", category = "") {
  const theme = detectArticleTheme(title, content, category);
  if (candidateUrl && candidateUrl.trim().length > 10) {
    const cleanUrl = candidateUrl.trim();
    const isValid = await probeImageUrl(cleanUrl);
    if (isValid) {
      return {
        validUrl: cleanUrl,
        isOriginal: true,
        theme
      };
    }
  }
  const contextualUrl = getContentSpecificImage(title, content, category);
  return {
    validUrl: contextualUrl,
    isOriginal: false,
    theme
  };
}

// src/services/autoBlogService.ts
var NEWS_SOURCES = [
  {
    name: "Channels Television Nigeria",
    url: "https://www.channelstv.com/feed/",
    defaultCategory: "Global News & Culture",
    region: "Nigeria"
  },
  {
    name: "Vanguard Nigeria News",
    url: "https://www.vanguardngr.com/feed/",
    defaultCategory: "Global News & Culture",
    region: "Nigeria"
  },
  {
    name: "Punch Nigeria Wire",
    url: "https://punchng.com/feed/",
    defaultCategory: "Global News & Culture",
    region: "Nigeria"
  },
  {
    name: "Tech & Digital Innovation",
    url: "https://feeds.bbci.co.uk/news/technology/rss.xml",
    defaultCategory: "Technology & AI",
    region: "Global"
  },
  {
    name: "Entertainment & Arts Wire",
    url: "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml",
    defaultCategory: "Media & Entertainment",
    region: "Global"
  },
  {
    name: "Media Tech Disruptions",
    url: "https://techcrunch.com/feed/",
    defaultCategory: "Broadcasting & Streaming",
    region: "Global"
  }
];
var AutoBlogService = class _AutoBlogService {
  constructor(supabaseClient = null) {
    this.posts = [];
    this.nigeriaNewsCache = [];
    this.lastNigeriaFetchTime = null;
    this.supabase = null;
    this.isSyncing = false;
    this.lastSyncTime = null;
    this.syncIntervalHandle = null;
    this.lastPingReport = null;
    this.supabase = supabaseClient;
    this.storageFilePath = path.resolve(process.cwd(), "src/data/auto_blogs.json");
  }
  static {
    this.instance = null;
  }
  static getInstance(supabaseClient = null) {
    if (!_AutoBlogService.instance) {
      _AutoBlogService.instance = new _AutoBlogService(supabaseClient);
    } else if (supabaseClient && !_AutoBlogService.instance.supabase) {
      _AutoBlogService.instance.supabase = supabaseClient;
    }
    return _AutoBlogService.instance;
  }
  setSupabaseClient(client) {
    this.supabase = client;
  }
  async init() {
    console.log("[AutoBlogService] Initializing automated blog news & sync engine...");
    await this.loadPersistedPosts();
    await this.pullFromSupabase().catch((err) => console.error("[AutoBlogService] Startup DB pull failed:", err));
    setTimeout(() => {
      this.syncLatestNews().catch((err) => {
        console.error("[AutoBlogService] Initial full sync error:", err);
      });
    }, 5e3);
    if (!this.syncIntervalHandle) {
      this.syncIntervalHandle = setInterval(() => {
        console.log("[AutoBlogService] Triggering scheduled automated news update cycle...");
        this.syncLatestNews().catch((err) => {
          console.error("[AutoBlogService] Scheduled sync error:", err);
        });
      }, 30 * 60 * 1e3);
    }
  }
  /**
   * Check whether the cached news is stale (older than maxAgeMinutes, or never synced)
   */
  isStale(maxAgeMinutes = 15) {
    if (!this.lastSyncTime) return true;
    const ageMs = Date.now() - new Date(this.lastSyncTime).getTime();
    return ageMs > maxAgeMinutes * 60 * 1e3;
  }
  /**
   * Fast synchronization from Supabase database only (no external feed scraping).
   * Ensures the local posts array matches the database state.
   */
  async pullFromSupabase() {
    if (!this.supabase) return 0;
    try {
      const { data: dbRows, error: dbError } = await this.supabase.from("news").select("*").eq("is_published", true).order("created_at", { ascending: false }).limit(60);
      if (dbError) throw dbError;
      if (!dbRows || !Array.isArray(dbRows)) return 0;
      let syncedCount = 0;
      for (const row of dbRows) {
        const rowSlug = row.slug || this.generateSlug(row.title) || row.id;
        const formattedDbPost = {
          id: row.id,
          slug: rowSlug,
          title: row.title,
          excerpt: row.excerpt || row.description || (row.content ? row.content.substring(0, 160) + "..." : ""),
          description: row.description || row.excerpt || "",
          content: row.content || "",
          category: row.category || "News",
          tags: row.tags || ["Broadcasting", "News"],
          image_url: row.image_url || "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?q=80&w=800",
          image_urls: row.image_urls || (row.image_url ? [row.image_url] : []),
          read_time: row.read_time || "4 min read",
          source_name: row.source_name || "FideTV Media",
          author_id: row.author_id || "fidetv_admin",
          is_published: true,
          created_at: row.created_at || (/* @__PURE__ */ new Date()).toISOString(),
          profiles: {
            username: "FideTV News Desk",
            avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=FideTV_NewsDesk",
            role: "Official Editor"
          }
        };
        const existingIdx = this.posts.findIndex((p) => p.id === row.id || p.slug === rowSlug);
        if (existingIdx >= 0) {
          this.posts[existingIdx] = { ...this.posts[existingIdx], ...formattedDbPost };
        } else {
          this.posts.unshift(formattedDbPost);
          syncedCount++;
        }
      }
      this.posts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      if (this.posts.length > 60) this.posts = this.posts.slice(0, 60);
      this.lastSyncTime = (/* @__PURE__ */ new Date()).toISOString();
      return syncedCount;
    } catch (err) {
      console.error("[AutoBlogService] pullFromSupabase error:", err.message);
      return 0;
    }
  }
  async loadPersistedPosts() {
    try {
      const data = await fs.readFile(this.storageFilePath, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const uniqueMap = /* @__PURE__ */ new Map();
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
    }
    this.posts = this.getSeedBlogPosts();
    await this.persistPosts();
  }
  async persistPosts() {
    try {
      const dir = path.dirname(this.storageFilePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(this.storageFilePath, JSON.stringify(this.posts, null, 2), "utf-8");
    } catch (err) {
      console.error("[AutoBlogService] Failed to persist posts to disk:", err);
    }
  }
  generateSlug(title) {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").substring(0, 80);
  }
  cleanHtml(raw) {
    if (!raw) return "";
    return raw.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  }
  async fetchRawFeeds() {
    const rawItems = [];
    for (const source of NEWS_SOURCES) {
      try {
        const response = await axios3.get(source.url, {
          timeout: 8e3,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) FideTV-NewsBot/3.0"
          }
        });
        const xml = response.data;
        if (!xml || typeof xml !== "string") continue;
        const $ = cheerio.load(xml, { xmlMode: true });
        $("item").each((i, el) => {
          if (i >= 5) return;
          const title = $(el).find("title").first().text();
          const link = $(el).find("link").first().text();
          const desc = $(el).find("description").first().text();
          const pubDate = $(el).find("pubDate").first().text();
          let imageUrl = $(el).find("media\\:content, content").attr("url") || $(el).find("media\\:thumbnail, thumbnail").attr("url") || $(el).find('enclosure[type^="image"]').attr("url") || "";
          if (!imageUrl) {
            const imgMatch = desc.match(/<img[^>]+src="([^">]+)"/i);
            if (imgMatch && imgMatch[1]) {
              imageUrl = imgMatch[1];
            }
          }
          const cleanedTitle = this.cleanHtml(title);
          const cleanedDesc = this.cleanHtml(desc);
          if (cleanedTitle && cleanedTitle.length > 10) {
            rawItems.push({
              title: cleanedTitle,
              link: link.trim(),
              description: cleanedDesc,
              pubDate: pubDate || (/* @__PURE__ */ new Date()).toISOString(),
              sourceName: source.name,
              defaultCategory: source.defaultCategory,
              region: source.region,
              imageUrl: imageUrl.trim() || void 0
            });
          }
        });
      } catch (feedErr) {
        console.warn(`[AutoBlogService] Failed to fetch feed ${source.name}:`, feedErr.message);
      }
    }
    return rawItems;
  }
  /**
   * Dedicated news aggregation filtered specifically by region ('Nigeria')
   */
  async getNigeriaNews(forceRefresh = false) {
    const now = Date.now();
    const cacheAge = this.lastNigeriaFetchTime ? now - new Date(this.lastNigeriaFetchTime).getTime() : Infinity;
    if (!forceRefresh && this.nigeriaNewsCache.length > 0 && cacheAge < 5 * 60 * 1e3) {
      return this.nigeriaNewsCache;
    }
    console.log("[AutoBlogService] Fetching & aggregating region-filtered Nigeria news feed...");
    const nigeriaItems = [];
    for (const post of this.posts) {
      const isNigeria = post.region === "Nigeria" || post.source_name?.toLowerCase().includes("nigeria") || post.source_name?.toLowerCase().includes("channels") || post.source_name?.toLowerCase().includes("vanguard") || post.title?.toLowerCase().includes("nigeria") || post.title?.toLowerCase().includes("tinubu") || post.title?.toLowerCase().includes("atiku") || post.title?.toLowerCase().includes("akwa ibom") || post.title?.toLowerCase().includes("nnpc") || post.title?.toLowerCase().includes("enugu") || post.title?.toLowerCase().includes("abuja") || post.tags?.some((t) => t.toLowerCase().includes("nigeria"));
      if (isNigeria) {
        nigeriaItems.push(post);
      }
    }
    const nigerianSources = NEWS_SOURCES.filter((s) => s.region === "Nigeria");
    for (const src of nigerianSources) {
      try {
        const resp = await axios3.get(src.url, {
          timeout: 6e3,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) FideTV-NigeriaWire/3.0"
          }
        });
        const $ = cheerio.load(resp.data, { xmlMode: true });
        const items = $("item").slice(0, 6).toArray();
        for (const el of items) {
          const title = this.cleanHtml($(el).find("title").first().text());
          const link = $(el).find("link").first().text().trim();
          const desc = this.cleanHtml($(el).find("description").first().text());
          const pubDate = $(el).find("pubDate").first().text().trim();
          let imageUrl = $(el).find("media\\:content, content").attr("url") || $(el).find("media\\:thumbnail, thumbnail").attr("url") || $(el).find('enclosure[type^="image"]').attr("url") || "";
          if (!imageUrl) {
            const imgMatch = desc.match(/<img[^>]+src="([^">]+)"/i);
            if (imgMatch && imgMatch[1]) imageUrl = imgMatch[1];
          }
          if (title && title.length > 12) {
            const slug = this.generateSlug(title);
            const exists = nigeriaItems.some((n) => n.slug === slug || n.title.toLowerCase() === title.toLowerCase());
            if (!exists) {
              const validated = await validateAndEnrichNewsCover(imageUrl, title, desc, "Global News & Culture");
              const post = {
                id: crypto.randomUUID(),
                slug,
                title,
                excerpt: desc ? desc.substring(0, 160) + "..." : "Breaking regional report from Nigeria.",
                description: desc || "",
                content: desc || "",
                category: "Global News & Culture",
                tags: ["Nigeria", "RegionalNews", "AfricaWire", "FideTV"],
                image_url: validated.validUrl,
                image_urls: [validated.validUrl],
                read_time: "3 min read",
                source_name: src.name,
                source_url: link,
                region: "Nigeria",
                author_id: "fidetv-newsbot",
                is_published: true,
                created_at: pubDate ? new Date(pubDate).toISOString() : (/* @__PURE__ */ new Date()).toISOString(),
                profiles: {
                  username: "Nigeria Regional Bureau",
                  avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=NigeriaNewsDesk",
                  role: "Regional Wire Desk"
                }
              };
              nigeriaItems.push(post);
            }
          }
        }
      } catch (err) {
        console.warn(`[AutoBlogService] Error fetching Nigeria wire ${src.name}:`, err.message);
      }
    }
    const uniqueMap = /* @__PURE__ */ new Map();
    for (const item of nigeriaItems) {
      const key = item.slug || item.id || item.title.toLowerCase().trim();
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      }
    }
    const result = Array.from(uniqueMap.values()).slice(0, 15);
    this.nigeriaNewsCache = result;
    this.lastNigeriaFetchTime = (/* @__PURE__ */ new Date()).toISOString();
    return result;
  }
  isValidGeminiKey(key) {
    if (!key) return false;
    const cleaned = key.trim().replace(/^['"]|['"]$/g, "");
    return cleaned !== "" && !cleaned.toLowerCase().includes("placeholder") && cleaned.length >= 15;
  }
  async generateWithGemini(rawItem) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!this.isValidGeminiKey(apiKey)) {
      return null;
    }
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      const prompt = `You are the Lead Digital Media Editor and Journalist for FideTV Media Hub.
FideTV is a 24/7 digital broadcasting platform, live streaming hub, and modern African & international media network.

Analyze this breaking news story:
Headline: "${rawItem.title}"
Source: "${rawItem.sourceName}"
Snippet: "${rawItem.description}"
Category Suggestion: "${rawItem.defaultCategory}"
Region: "${rawItem.region || "Global"}"

Write a comprehensive, original, high-quality editorial blog post for FideTV's audience.
The post must be written in rich Markdown with informative subheadings, industry analysis, broadcasting/digital media implications, and a bulleted "Key Takeaways" section.

Output ONLY valid JSON in this exact structure without markdown fences:
{
  "title": "A punchy, captivating journalistic headline",
  "excerpt": "A crisp, compelling 2-sentence summary hook",
  "category": "Broadcasting & Streaming | Technology & AI | Media & Entertainment | Global News & Culture | Creator Economy & Production | Sports & Live Events",
  "tags": ["tag1", "tag2", "tag3", "tag4"],
  "read_time": "4 min read",
  "content": "Full markdown content with ## Introduction, ## The Developing Story, ## Industry & Broadcast Impact, ## The FideTV Editorial Perspective, and ## Key Takeaways (bullet points)."
}`;
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          maxOutputTokens: 1200,
          temperature: 0.7,
          responseMimeType: "application/json"
        }
      });
      const responseText = response.text?.trim();
      if (!responseText) return null;
      const cleanJson = responseText.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
      const parsed = JSON.parse(cleanJson);
      if (parsed.title && parsed.content) {
        return {
          title: parsed.title,
          excerpt: parsed.excerpt || rawItem.description.substring(0, 160) + "...",
          content: parsed.content,
          category: parsed.category || rawItem.defaultCategory,
          tags: Array.isArray(parsed.tags) ? parsed.tags : ["DigitalMedia", "Broadcasting", "News"],
          read_time: parsed.read_time || "4 min read"
        };
      }
    } catch (aiErr) {
      console.warn("[AutoBlogService] Gemini generation notice:", aiErr.message);
    }
    return null;
  }
  synthesizeFallbackPost(rawItem) {
    const title = rawItem.title;
    const category = rawItem.defaultCategory;
    const snippet = rawItem.description || "Breaking coverage on major industry developments.";
    const excerpt = snippet.length > 170 ? snippet.substring(0, 167) + "..." : snippet;
    const content = `In a fast-moving development across the media and cultural landscape, **${title}** has emerged as a focal point for observers and audiences.

---

### \u{1F310} The Developing Story

${snippet}

As reported via **${rawItem.sourceName}**, this event reflects broader shifts currently impacting how news and information are distributed, consumed, and experienced in real-time environments.

---

### \u{1F4E1} Industry & Broadcast Perspective

From a digital media infrastructure viewpoint, updates of this magnitude demonstrate the critical importance of adaptable, high-capacity broadcasting systems:
* **Real-time Distribution**: The shift towards decentralized, multi-channel broadcast architectures.
* **Creator Democratization**: Lowering the barrier for independent journalists and production studios to broadcast globally.
* **Audience Interactivity**: Synchronized voice spaces and collaborative commentary.

---

### \u{1F4A1} FideTV Editorial Commentary

At **FideTV Media**, our commitment is to provide transparent, continuous insights into the evolving landscape of broadcasting, streaming tech, and digital storytelling.

---

### \u{1F4CC} Key Takeaways

1. **Impact**: Significant immediate relevance for digital media practitioners, creators, and audiences.
2. **Key Insight**: ${snippet.substring(0, 100)}...
3. **Next Steps**: Continued observation of follow-up announcements.
4. **Source Reference**: Live wire coverage courtesy of *${rawItem.sourceName}*.`;
    const tags = [
      category.split(" ")[0].replace(/[^a-zA-Z]/g, ""),
      "Broadcasting",
      "MediaHub",
      "LiveUpdates",
      "FideTVNews"
    ];
    if (rawItem.region) tags.push(rawItem.region);
    return {
      title,
      excerpt,
      content,
      category,
      tags,
      read_time: "4 min read"
    };
  }
  /**
   * Ping Search Engine Indexing Services (Google, Bing, IndexNow) whenever
   * news content is published or updated.
   */
  async pingSearchEngineIndexing(sitemapUrl = "https://fidetv.online/sitemap.xml") {
    const results = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      sitemapUrl,
      targets: {}
    };
    try {
      const bingPing = `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
      const bingResp = await axios3.get(bingPing, { timeout: 5e3, validateStatus: () => true });
      results.targets.bing = { status: bingResp.status, success: bingResp.status >= 200 && bingResp.status < 400 };
    } catch (e) {
      results.targets.bing = { status: "error", error: e.message };
    }
    try {
      const googlePing = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
      const googleResp = await axios3.get(googlePing, { timeout: 5e3, validateStatus: () => true });
      results.targets.google = { status: googleResp.status, success: googleResp.status >= 200 && googleResp.status < 400 };
    } catch (e) {
      results.targets.google = { status: "error", error: e.message };
    }
    try {
      const indexNowUrl = "https://api.indexnow.org/indexnow";
      const indexNowResp = await axios3.post(indexNowUrl, {
        host: "fidetv.online",
        key: "fidetv_seo_key_2026",
        urlList: [sitemapUrl, "https://fidetv.online/news"]
      }, { timeout: 5e3, validateStatus: () => true });
      results.targets.indexNow = { status: indexNowResp.status, success: indexNowResp.status >= 200 && indexNowResp.status < 400 };
    } catch (e) {
      results.targets.indexNow = { status: "error", error: e.message };
    }
    this.lastPingReport = results;
    console.log("[AutoBlogService] Search engine indexing ping dispatched:", JSON.stringify(results.targets));
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
  async syncLatestNews() {
    if (this.isSyncing) {
      return {
        addedCount: 0,
        dbSyncedCount: 0,
        totalPosts: this.posts.length,
        lastSync: this.lastSyncTime || (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    this.isSyncing = true;
    console.log("[AutoBlogService] Starting centralized news synchronization cycle...");
    let addedCount = 0;
    let dbSyncedCount = 0;
    try {
      if (this.supabase) {
        try {
          const { data: dbRows, error: dbError } = await this.supabase.from("news").select("*").eq("is_published", true).order("created_at", { ascending: false });
          if (!dbError && Array.isArray(dbRows)) {
            for (const row of dbRows) {
              const rowSlug = row.slug || this.generateSlug(row.title) || row.id;
              const validatedImage = await validateAndEnrichNewsCover(
                row.image_url,
                row.title,
                row.content || row.description,
                row.category
              );
              if (!row.slug || validatedImage.validUrl !== row.image_url && !row.image_url) {
                await this.supabase.from("news").update({
                  slug: rowSlug,
                  image_url: validatedImage.validUrl,
                  image_urls: [validatedImage.validUrl]
                }).eq("id", row.id);
              }
              const formattedDbPost = {
                id: row.id,
                slug: rowSlug,
                title: row.title,
                excerpt: row.excerpt || row.description || (row.content ? row.content.substring(0, 160) + "..." : ""),
                description: row.description || row.excerpt || "",
                content: row.content || "",
                category: row.category || "News",
                tags: row.tags || ["Broadcasting", "News"],
                image_url: validatedImage.validUrl,
                image_urls: [validatedImage.validUrl],
                read_time: "4 min read",
                source_name: "FideTV Media",
                author_id: row.author_id || "fidetv_admin",
                is_published: true,
                created_at: row.created_at || (/* @__PURE__ */ new Date()).toISOString(),
                profiles: {
                  username: "FideTV News Desk",
                  avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=FideTV_NewsDesk",
                  role: "Official Editor"
                }
              };
              const existingIdx = this.posts.findIndex((p) => p.id === row.id || p.slug === rowSlug);
              if (existingIdx >= 0) {
                this.posts[existingIdx] = { ...this.posts[existingIdx], ...formattedDbPost };
              } else {
                this.posts.unshift(formattedDbPost);
                dbSyncedCount++;
              }
            }
            console.log(`[AutoBlogService] Synchronized ${dbRows.length} items from Supabase database.`);
          }
        } catch (dbErr) {
          console.warn("[AutoBlogService] Supabase pull error:", dbErr.message);
        }
      }
      const rawItems = await this.fetchRawFeeds();
      console.log(`[AutoBlogService] Processing ${rawItems.length} candidate news items from live feeds...`);
      for (const item of rawItems) {
        if (addedCount >= 8) break;
        const tempSlug = this.generateSlug(item.title);
        const alreadyExists = this.posts.some(
          (p) => p.slug === tempSlug || p.title.toLowerCase() === item.title.toLowerCase()
        );
        if (alreadyExists) continue;
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
        if (this.posts.some((p) => p.slug === slug)) {
          slug = `${slug}-${Date.now().toString(36).substring(4)}`;
        }
        const newPost = {
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
          region: item.region || "Global",
          author_id: "fidetv-newsbot",
          is_published: true,
          created_at: (/* @__PURE__ */ new Date()).toISOString(),
          profiles: {
            username: "FideTV News Desk",
            avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=FideTV_NewsDesk",
            role: "Automated News Curator"
          }
        };
        this.posts.unshift(newPost);
        addedCount++;
        if (this.supabase) {
          try {
            console.log("[AutoBlogService] Upserting to Supabase:", newPost.id, newPost.title);
            await this.supabase.from("news").upsert({
              id: newPost.id,
              slug: newPost.slug || newPost.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
              title: newPost.title,
              excerpt: newPost.excerpt || "",
              description: newPost.description || "",
              content: newPost.content || "",
              category: newPost.category || "News",
              tags: newPost.tags || [],
              image_url: newPost.image_url || "",
              image_urls: newPost.image_urls || [],
              is_published: true,
              created_at: newPost.created_at,
              author_id: newPost.author_id,
              read_time: newPost.read_time,
              source_name: newPost.source_name,
              source_url: newPost.source_url,
              region: newPost.region
            }, { onConflict: "id" });
          } catch (dbErr) {
            console.error("[AutoBlogService] Supabase news upsert FAILED:", dbErr);
          }
        }
      }
      if (this.supabase) {
        try {
          const syncCandidates = this.posts.slice(0, 15);
          for (const post of syncCandidates) {
            await this.supabase.from("news").upsert({
              id: post.id,
              slug: post.slug,
              title: post.title,
              excerpt: post.excerpt,
              description: post.description,
              content: post.content,
              category: post.category,
              tags: post.tags,
              image_url: post.image_url,
              image_urls: post.image_urls || [post.image_url],
              is_published: true,
              created_at: post.created_at,
              read_time: post.read_time,
              source_name: post.source_name,
              source_url: post.source_url,
              region: post.region
            }, { onConflict: "id" });
          }
          try {
            await this.supabase.channel("fidetv-news-realtime").send({
              type: "broadcast",
              event: "news-updated",
              payload: { timestamp: (/* @__PURE__ */ new Date()).toISOString(), totalPosts: this.posts.length }
            });
          } catch (bErr) {
          }
        } catch (syncDbErr) {
          console.warn("[AutoBlogService] Mass sync to Supabase notice:", syncDbErr.message);
        }
      }
      if (this.posts.length > 60) {
        this.posts = this.posts.slice(0, 60);
      }
      await this.persistPosts();
      this.lastSyncTime = (/* @__PURE__ */ new Date()).toISOString();
      this.pingSearchEngineIndexing().catch((err) => {
        console.warn("[AutoBlogService] Indexing ping notice:", err.message);
      });
      console.log(`[AutoBlogService] Sync cycle complete. Added ${addedCount} feed posts, synced ${dbSyncedCount} DB posts. Total active: ${this.posts.length}`);
    } catch (err) {
      console.error("[AutoBlogService] Sync error:", err);
    } finally {
      this.isSyncing = false;
    }
    return {
      addedCount,
      dbSyncedCount,
      totalPosts: this.posts.length,
      lastSync: this.lastSyncTime || (/* @__PURE__ */ new Date()).toISOString(),
      pingReport: this.lastPingReport
    };
  }
  getAllPosts(filter) {
    let result = [...this.posts];
    if (filter?.category && filter.category !== "All") {
      const catLower = filter.category.toLowerCase();
      result = result.filter((p) => p.category?.toLowerCase() === catLower);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        (p) => p.title.toLowerCase().includes(q) || p.excerpt?.toLowerCase().includes(q) || p.content?.toLowerCase().includes(q) || p.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    const total = result.length;
    const page = filter?.page || 1;
    const limit = filter?.limit || 20;
    const startIndex = (page - 1) * limit;
    const categories = [
      "All",
      "Broadcasting & Streaming",
      "Technology & AI",
      "Media & Entertainment",
      "Global News & Culture",
      "Creator Economy & Production",
      "Sports & Live Events"
    ];
    return {
      posts: result.slice(startIndex, startIndex + limit),
      total,
      categories,
      lastSync: this.lastSyncTime
    };
  }
  getPostBySlugOrId(slugOrId) {
    const post = this.posts.find((p) => p.slug === slugOrId || p.id === slugOrId) || null;
    let relatedPosts = [];
    if (post) {
      relatedPosts = this.posts.filter((p) => p.id !== post.id && (p.category === post.category || true)).slice(0, 3);
    }
    return { post, relatedPosts };
  }
  getStatus() {
    return {
      status: "active",
      isSyncing: this.isSyncing,
      lastSync: this.lastSyncTime,
      totalPosts: this.posts.length,
      sourcesCount: NEWS_SOURCES.length,
      nigeriaNewsCount: this.nigeriaNewsCache.length,
      lastPingReport: this.lastPingReport,
      syncIntervalMinutes: 30
    };
  }
  getSeedBlogPosts() {
    const now = Date.now();
    return [
      {
        id: "fidetv-release-v2",
        slug: "major-release-v2",
        title: "FideTV Major Release: 25 Active Live Channels, Dynamic Audio Spaces & Mobile Optimization!",
        excerpt: "We are thrilled to unveil a massive update to FideTV, boasting 25 active 24/7 live-streaming channels, brand-new real-time Audio Spaces, immersive mobile optimization, and seamless community interactions!",
        description: "We are thrilled to unveil a massive update to FideTV, boasting 25 active 24/7 live-streaming channels, brand-new real-time Audio Spaces, immersive mobile optimization, and seamless community interactions!",
        content: `We are incredibly proud to announce the next major milestone for **FideTV Media Hub**! Our team has been working around the clock to bring you a fully synchronized, ultra-high performance media platform that is perfectly customized for both creators and visitors.

Here are the exciting new features and capabilities live on FideTV right now:

### \u{1F4FA} 25 Active 24/7 Live Broadcast Channels
FideTV now hosts **25 fully active, 24/7 high-definition broadcast channels** running continuously! Dive into a rich, curated array of live sports, interactive educational masterclasses, community discussion forums, creative documentaries, and direct cultural showcases. No matter your interests, there is a specialized active stream waiting for you on the **Live tab** right now!

### \u{1F399}\uFE0F Interactive Live Audio Spaces
Introducing **FideTV Spaces**! Inspired by modern audio-conversational lobbies, you can now enter dedicated, browser-native live voice chat rooms directly on FideTV. Connect your microphone to host roundtable discussions, join community technical huddles, or participate in live broadcasting reviews alongside seasoned media pioneers.

### \u{1F4F1} Full Mobile Experience Redesign
We have fully rebuilt our navigation structures to suit all mobile viewport sizes perfectly:
* **Always-Accessible Mobile Drawer**: Redesigned the slide-out navigation menu overlay with deep stacking clearance, protecting it from being covered by video players.
* **Direct Mobile Actions**: Repositioned the community join buttons to sit cleanly in mobile headers so you can easily engage with sub-communities on the fly.
* **Solid Background Clearance**: Handled ambient color alphas so the drawer menu remains crisp and highly legible regardless of content scrolling underneath it.

### \u{1F4AC} Notice Wall & Collective Engagement
Collaborative teams can now write social shouts, post links, receive likes, and share milestones with fellow creatives directly inside localized sub-communities. It is the perfect bulletin board for managing community media assets, drone raw templates, or organizing schedules.

---

We are dedicated to building a supportive, highly specialized network for global Sub-Saharan and international digital broadcasting creators. We cannot wait to see you explore and participate in our newly polished services!

*Connect your profile, join a Creative Hub, or hop into a Live Space today to get started!*`,
        category: "Platform Updates",
        tags: ["FideTV", "LiveStreaming", "AudioSpaces", "Update"],
        read_time: "4 min read",
        source_name: "FideTV Official",
        author_id: "admin",
        is_published: true,
        image_url: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?q=80&w=800&auto=format&fit=crop",
        created_at: new Date(now - 36e5 * 2).toISOString(),
        profiles: {
          username: "fidetv_admin",
          avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=fidetv_admin",
          role: "Editor-in-Chief"
        }
      },
      {
        id: "fidetv-auto-news-ai-broadcast",
        slug: "next-gen-broadcasting-ai-video-pipelines",
        title: "How Next-Gen AI Video Pipelines Are Transforming Global Live Broadcasting",
        excerpt: "Broadcasting networks and independent digital studios are adopting automated AI video enhancement, instant multi-language audio dubbing, and edge transcoding to stream high-definition content to global audiences at record-low latency.",
        description: "Broadcasting networks and independent digital studios are adopting automated AI video enhancement, instant multi-language audio dubbing, and edge transcoding to stream high-definition content to global audiences at record-low latency.",
        content: `The global media broadcasting industry is undergoing one of its most transformative shifts in decades. From real-time cloud video switching to synthetic speech translation and automated news curation, digital streaming hubs are breaking previous hardware boundaries.

---

### \u{1F680} The Rise of Edge Video Transcoding

Historically, transmitting low-latency live streams required massive multi-thousand dollar OB (Outside Broadcasting) trucks and dedicated satellite uplinks. Today, cloud edge transcoding algorithms can ingest multi-bitrate HLS and WebRTC video streams in under 500 milliseconds, distributing synchronized feeds across global content delivery networks.

Key technical milestones enabling this transition include:
* **Adaptive Bitrate Resiliency**: Instant switching between 1080p60 and mobile bandwidth constraints without stream drops.
* **Synchronized Data Tracks**: Injecting real-time interactive overlays, polls, and live community chat alongside the video container.
* **Serverless Media Pipelines**: Dynamic rendering of thumbnail clips, automated highlight reels, and instant VOD archiving.

---

### \u{1F399}\uFE0F Real-Time Audio Spaces & Multi-Voice Synthesis

In addition to traditional video streams, interactive audio has emerged as the premier medium for immediate breaking discussions. Creators can spin up virtual broadcast booths, inviting listeners onto digital stages with studio-quality noise suppression and acoustic echo cancellation.

---

### \u{1F4A1} The FideTV Media Vision

At FideTV, our objective is to fuse 24/7 IPTV continuous channels with participatory social spaces. Creators do not just watch the news; they dissect, comment, collaborate, and broadcast their perspectives to an engaged global audience in real time.`,
        category: "Broadcasting & Streaming",
        tags: ["Broadcasting", "StreamingTech", "WebRTC", "MediaInnovation"],
        read_time: "5 min read",
        source_name: "FideTV Media Lab",
        author_id: "fidetv-newsbot",
        is_published: true,
        image_url: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=1200&auto=format&fit=crop",
        created_at: new Date(now - 36e5 * 6).toISOString(),
        profiles: {
          username: "FideTV News Desk",
          avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=FideTV_Tech",
          role: "Tech & Broadcasting Bureau"
        }
      },
      {
        id: "fidetv-auto-news-creator-tools",
        slug: "empowering-digital-creators-with-modern-production-studios",
        title: "Empowering Independent Digital Creators With Modern Virtual Production Studios",
        excerpt: "Independent content creators and regional media journalists are leveraging browser-based studios and automated newsrooms to compete with legacy television networks.",
        description: "Independent content creators and regional media journalists are leveraging browser-based studios and automated newsrooms to compete with legacy television networks.",
        content: `The barrier between professional television studios and decentralized content creators has officially collapsed. Armed with high-performance web applications, creators across Africa, Europe, and the Americas can direct multi-camera productions straight from standard browsers.

---

### \u{1F4F9} The New Creator Tech Stack

Modern creators no longer rely on single-platform walled gardens. Instead, they operate agile multi-channel ecosystems:
1. **Live Synchronous Hubs**: Hosting scheduled 24/7 broadcast playlists and special events.
2. **Dynamic Audio Rooms**: Hosting live debriefs, fan meet-and-greets, and sponsor interviews.
3. **Automated Blog & News Feeds**: Keeping community members informed between live broadcasts with fresh, search-optimized editorial coverage.

---

### \u{1F30D} Bridging the Regional Media Divide

For emerging markets and Sub-Saharan digital media houses, browser-first broadcasting tools remove prohibitive capital expenditures. Digital creators can publish high-fidelity educational series, sports tournament streams, and cultural festivals directly to viewers on mobile devices.

FideTV continues to lead this movement by offering free channel ingestion, automated signal healing, and community notice boards for creative teams everywhere.`,
        category: "Creator Economy & Production",
        tags: ["CreatorEconomy", "DigitalMedia", "Production", "FideTV"],
        read_time: "4 min read",
        source_name: "FideTV Insights",
        author_id: "fidetv-newsbot",
        is_published: true,
        image_url: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=1200&auto=format&fit=crop",
        created_at: new Date(now - 36e5 * 12).toISOString(),
        profiles: {
          username: "FideTV News Desk",
          avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=FideTV_Creators",
          role: "Production Correspondent"
        }
      },
      {
        id: "fidetv-auto-news-sports-streaming",
        slug: "future-of-sports-broadcasting-interactive-telemetry-and-community",
        title: "The Future of Sports Broadcasting: Interactive Telemetry and Community Co-Viewing",
        excerpt: "Fans demand more than a one-way video feed. Discover how live stats, community voice lounges, and personalized camera angles are defining the new era of global sports streaming.",
        description: "Fans demand more than a one-way video feed. Discover how live stats, community voice lounges, and personalized camera angles are defining the new era of global sports streaming.",
        content: `From football championships to grassroots athletic tournaments, sports broadcasting is experiencing an unprecedented evolution. Viewers are transforming from passive television spectators into engaged co-producers of the live sports experience.

---

### \u26BD The Co-Viewing Phenomenon

Studies show that over 78% of sports fans watch live matches with a second screen active. Rather than splitting attention across disjointed apps, modern platforms integrate synchronous watch parties directly into the viewing canvas:
* **Microphone-Enabled Lounges**: Allowing remote friend groups and global fan clubs to banter and react in real-time.
* **Instant Replay Scrubbing**: High-efficiency HLS buffers enabling viewers to review controversial plays without missing live action.
* **Community Scoreboards**: Real-time crowd reaction meters and gamified engagement badges.

---

### \u{1F3C6} FideTV Sports Coverage

FideTV's live sports lineup offers continuous coverage, highlighting both premier global tournaments and vital regional athletic showcases. Join our community sports hub to participate in live voice commentaries during upcoming game days!`,
        category: "Sports & Live Events",
        tags: ["SportsStreaming", "LiveEvents", "FanEngagement", "FideTVLive"],
        read_time: "4 min read",
        source_name: "FideTV Sports Wire",
        author_id: "fidetv-newsbot",
        is_published: true,
        image_url: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1200&auto=format&fit=crop",
        created_at: new Date(now - 36e5 * 18).toISOString(),
        profiles: {
          username: "FideTV Sports Desk",
          avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=FideTV_Sports",
          role: "Sports Bureau Chief"
        }
      }
    ];
  }
};

// server.ts
import multer from "multer";
import fs2 from "fs/promises";
import rateLimit from "express-rate-limit";

// server/media/validator.ts
var MAX_FILE_SIZE = 50 * 1024 * 1024 * 1024;
async function validateUrlSecurity(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string" || !rawUrl.trim()) {
    return { valid: false, error: "Please enter a valid media URL." };
  }
  const trimmed = rawUrl.trim();
  let parsed;
  try {
    parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    try {
      parsed = new URL(`https://${trimmed}`);
    } catch {
      return { valid: true };
    }
  }
  return { valid: true, parsedUrl: parsed };
}
function sanitizeFilename(filename, defaultName = "downloaded_media") {
  if (!filename || typeof filename !== "string") {
    return defaultName;
  }
  let clean = filename.replace(/^.*[\\\/]/, "");
  clean = clean.replace(/[\x00-\x1F\x7F]/g, "");
  return clean || defaultName;
}
function isSafeDownloadable(_filename, _mimeType) {
  return true;
}

// server/media/adapters/direct-url.ts
import axios4 from "axios";

// server/media/detector.ts
function extractImageDimensions(buffer) {
  if (!buffer || buffer.length < 16) return {};
  try {
    if (buffer.length >= 24 && buffer[0] === 137 && buffer[1] === 80 && buffer[2] === 78 && buffer[3] === 71) {
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height };
    }
    if (buffer.length >= 10 && buffer[0] === 71 && buffer[1] === 73 && buffer[2] === 70) {
      const width = buffer.readUInt16LE(6);
      const height = buffer.readUInt16LE(8);
      return { width, height };
    }
    if (buffer.length >= 4 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) {
      let offset = 2;
      while (offset < buffer.length - 8) {
        if (buffer[offset] !== 255) {
          offset++;
          continue;
        }
        const marker = buffer[offset + 1];
        if (marker === 192 || marker === 193 || marker === 194) {
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          return { width, height };
        }
        const length = buffer.readUInt16BE(offset + 2);
        offset += 2 + length;
      }
    }
    if (buffer.length >= 30 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
      const vp8Type = buffer.toString("ascii", 12, 16);
      if (vp8Type === "VP8 " && buffer.length >= 26) {
        const width = buffer.readUInt16LE(26) & 16383;
        const height = buffer.readUInt16LE(28) & 16383;
        return { width, height };
      } else if (vp8Type === "VP8L" && buffer.length >= 25) {
        const b0 = buffer[21];
        const b1 = buffer[22];
        const b2 = buffer[23];
        const b3 = buffer[24];
        const width = 1 + ((b1 & 63) << 8 | b0);
        const height = 1 + ((b3 & 15) << 10 | b2 << 2 | (b1 & 192) >> 6);
        return { width, height };
      }
    }
  } catch (err) {
  }
  return {};
}
function detectMediaType(mimeType, filename) {
  const mime = (mimeType || "").toLowerCase();
  const ext = (filename.includes(".") ? filename.split(".").pop() || "" : "").toLowerCase();
  if (mime.startsWith("video/") || ["mp4", "mkv", "webm", "mov", "avi", "m4v", "3gp", "flv", "ts", "m3u8"].includes(ext)) {
    let format2 = "MP4";
    if (mime.includes("webm") || ext === "webm") format2 = "WEBM";
    else if (mime.includes("quicktime") || ext === "mov") format2 = "MOV";
    else if (mime.includes("x-matroska") || ext === "mkv") format2 = "MKV";
    else if (ext === "m3u8" || ext === "m3u") format2 = "HLS";
    return { type: "video", format: format2 };
  }
  if (mime.startsWith("audio/") || ["mp3", "wav", "ogg", "m4a", "aac", "flac", "opus", "wma"].includes(ext)) {
    let format2 = "MP3";
    if (mime.includes("wav") || ext === "wav") format2 = "WAV";
    else if (mime.includes("ogg") || ext === "ogg") format2 = "OGG";
    else if (mime.includes("flac") || ext === "flac") format2 = "FLAC";
    else if (mime.includes("m4a") || ext === "m4a" || mime.includes("aac") || ext === "aac") format2 = "AAC";
    return { type: "audio", format: format2 };
  }
  if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "svg", "avif", "bmp", "ico"].includes(ext)) {
    let format2 = "IMAGE";
    if (mime.includes("jpeg") || ext === "jpg" || ext === "jpeg") format2 = "JPEG";
    else if (mime.includes("png") || ext === "png") format2 = "PNG";
    else if (mime.includes("gif") || ext === "gif") format2 = "GIF";
    else if (mime.includes("webp") || ext === "webp") format2 = "WEBP";
    else if (mime.includes("svg") || ext === "svg") format2 = "SVG";
    return { type: "image", format: format2 };
  }
  let format = ext ? ext.toUpperCase() : "FILE";
  if (mime.includes("pdf") || ext === "pdf") format = "PDF";
  else if (mime.includes("zip") || ext === "zip") format = "ZIP";
  else if (mime.includes("text/plain") || ext === "txt") format = "TXT";
  else if (mime.includes("epub") || ext === "epub") format = "EPUB";
  return { type: "file", format };
}
function extractFilename(urlStr, contentDisposition, fallback = "downloaded_media") {
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
    if (filenameMatch && filenameMatch[1]) {
      return decodeURIComponent(filenameMatch[1].trim());
    }
  }
  try {
    const url = new URL(urlStr);
    const pathname = url.pathname;
    const base = pathname.split("/").filter(Boolean).pop();
    if (base && base.includes(".")) {
      return decodeURIComponent(base);
    }
  } catch {
  }
  return fallback;
}

// server/media/adapters/direct-url.ts
async function analyzeDirectUrl(url) {
  const security = await validateUrlSecurity(url);
  if (!security.valid) {
    throw new Error(security.error || "This resource is not publicly accessible.");
  }
  const parsedUrl = new URL(url);
  const commonHeaders = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Referer": parsedUrl.origin + "/",
    "Accept": "*/*",
    "Accept-Encoding": "identity"
    // Avoid gzip for range chunks
  };
  let contentType = "";
  let contentLength = 0;
  let contentDisposition = "";
  let headerBuffer = null;
  try {
    const headRes = await axios4.head(url, {
      headers: commonHeaders,
      timeout: 1500,
      maxRedirects: 3,
      validateStatus: (status) => status < 400
    });
    contentType = String(headRes.headers["content-type"] || "");
    contentLength = parseInt(String(headRes.headers["content-length"] || "0"), 10);
    contentDisposition = String(headRes.headers["content-disposition"] || "");
  } catch (headErr) {
  }
  if (!contentType || !contentLength || contentType.includes("text/html") || contentType.startsWith("image/")) {
    try {
      const getRes = await axios4.get(url, {
        headers: {
          ...commonHeaders,
          "Range": "bytes=0-65535"
        },
        responseType: "arraybuffer",
        timeout: 2e3,
        maxRedirects: 3,
        validateStatus: (status) => status < 400
      });
      if (!contentType) {
        contentType = String(getRes.headers["content-type"] || "");
      }
      if (!contentDisposition) {
        contentDisposition = String(getRes.headers["content-disposition"] || "");
      }
      const contentRange = String(getRes.headers["content-range"] || "");
      if (contentRange) {
        const match = contentRange.match(/\/(\d+)$/);
        if (match && match[1]) {
          contentLength = parseInt(match[1], 10);
        }
      }
      if (!contentLength && getRes.headers["content-length"]) {
        contentLength = parseInt(String(getRes.headers["content-length"]), 10);
      }
      headerBuffer = Buffer.from(getRes.data);
    } catch (getErr) {
      if (!contentType && !contentLength) {
        throw new Error("The source took too long to respond or could not be reached.");
      }
    }
  }
  if (contentType.includes("text/html")) {
    return null;
  }
  let filename = extractFilename(url, contentDisposition);
  filename = sanitizeFilename(filename);
  const { type, format } = detectMediaType(contentType, filename);
  let dimensions = {};
  if (type === "image" && headerBuffer) {
    dimensions = extractImageDimensions(headerBuffer);
  }
  const thumbnail = type === "image" ? url : void 0;
  return {
    type,
    mimeType: contentType || "application/octet-stream",
    filename,
    size: contentLength || (headerBuffer ? headerBuffer.length : 0),
    format,
    thumbnail,
    width: dimensions.width,
    height: dimensions.height,
    downloadUrl: url,
    sourceUrl: url,
    platform: "Direct Media"
  };
}

// server/media/adapters/permitted-sources.ts
import * as cheerioStatic from "cheerio";
import axios5 from "axios";
import * as btchStatic from "btch-downloader";
import * as ruhendStatic from "ruhend-scraper";
import * as igDirectStatic from "instagram-url-direct";
import * as getTwitterMediaStatic from "get-twitter-media";
var cheerio2 = cheerioStatic?.default || cheerioStatic;
var btch = btchStatic?.default || btchStatic;
var ruhend = ruhendStatic?.default || ruhendStatic;
var igDirect = igDirectStatic?.default || igDirectStatic;
var getTwitterMedia = getTwitterMediaStatic?.default || getTwitterMediaStatic?.getTwitterMedia || getTwitterMediaStatic;
var fastTimeout = (promise, ms = 2500) => {
  return Promise.race([
    promise.catch(() => null),
    new Promise((resolve) => setTimeout(() => resolve(null), ms))
  ]);
};
var BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,video/*,audio/*,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none"
};
async function analyzePermittedSource(url) {
  const security = await validateUrlSecurity(url);
  if (!security.valid) {
    throw new Error(security.error || "This resource is not publicly accessible.");
  }
  const rawUrl = url.trim();
  const lowerUrl = rawUrl.toLowerCase();
  if (lowerUrl.includes("youtube.com") || lowerUrl.includes("youtu.be")) {
    const videoId = rawUrl.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/)?.[1] || "";
    const fallbackThumb = videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "";
    const [btchData, oembedData] = await Promise.all([
      btch && btch.youtube ? fastTimeout(btch.youtube(rawUrl), 2500) : Promise.resolve(null),
      fastTimeout(axios5.get(`https://www.youtube.com/oembed?url=${encodeURIComponent(rawUrl)}&format=json`).then((r) => r.data), 2e3)
    ]);
    const title = btchData?.title || oembedData?.title || "YouTube Video";
    const cleanFilename = sanitizeFilename(title, "youtube_video") + ".mp4";
    const directMp4 = btchData?.mp4 || btchData?.video || btchData?.link || rawUrl;
    const audioUrl = btchData?.audio || btchData?.mp3 || void 0;
    const thumbnail = btchData?.thumbnail || oembedData?.thumbnail_url || fallbackThumb;
    return {
      type: "video",
      mimeType: "video/mp4",
      filename: cleanFilename,
      title,
      author: oembedData?.author_name || void 0,
      size: 25e6,
      format: "MP4",
      thumbnail,
      downloadUrl: directMp4,
      audioUrl,
      sourceUrl: rawUrl,
      platform: "YouTube"
    };
  }
  if (lowerUrl.includes("tiktok.com")) {
    const [ruhendRes, btchRes, tikwmRes, oembedRes] = await Promise.all([
      ruhend && (ruhend.ttdl || ruhend.tiktok) ? fastTimeout((ruhend.ttdl || ruhend.tiktok)(rawUrl), 2500) : Promise.resolve(null),
      btch && (btch.ttdl || btch.tiktok) ? fastTimeout((btch.ttdl || btch.tiktok)(rawUrl), 2500) : Promise.resolve(null),
      fastTimeout(axios5.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(rawUrl)}`).then((r) => r.data?.data), 2500),
      fastTimeout(axios5.get(`https://www.tiktok.com/oembed?url=${encodeURIComponent(rawUrl)}`).then((r) => r.data), 1800)
    ]);
    const directVideo = tikwmRes?.play || ruhendRes?.video2 || ruhendRes?.video || ruhendRes?.nowm || btchRes?.video || btchRes?.video2 || btchRes?.url || rawUrl;
    const audioUrl = tikwmRes?.music || ruhendRes?.audio || ruhendRes?.mp3 || btchRes?.audio || btchRes?.mp3 || void 0;
    const title = tikwmRes?.title || ruhendRes?.title || btchRes?.title || oembedRes?.title || "TikTok Video";
    const author = tikwmRes?.author?.nickname || ruhendRes?.author || oembedRes?.author_name || void 0;
    const thumbnail = tikwmRes?.cover || ruhendRes?.cover || ruhendRes?.thumbnail || btchRes?.thumbnail || oembedRes?.thumbnail_url || "";
    return {
      type: "video",
      mimeType: "video/mp4",
      filename: sanitizeFilename(title, "tiktok_video") + ".mp4",
      title,
      author,
      size: 15e6,
      format: "MP4",
      thumbnail,
      downloadUrl: directVideo,
      audioUrl,
      sourceUrl: rawUrl,
      platform: "TikTok"
    };
  }
  if (lowerUrl.includes("instagram.com")) {
    const [ruhendRes, igDirectRes, btchRes] = await Promise.all([
      ruhend && (ruhend.igdl || ruhend.instagram) ? fastTimeout((ruhend.igdl || ruhend.instagram)(rawUrl), 2500) : Promise.resolve(null),
      igDirect && igDirect.instagramGetUrl ? fastTimeout(igDirect.instagramGetUrl(rawUrl), 2500) : Promise.resolve(null),
      btch && (btch.igdl || btch.instagram) ? fastTimeout((btch.igdl || btch.instagram)(rawUrl), 2500) : Promise.resolve(null)
    ]);
    const ruhendItems = Array.isArray(ruhendRes) ? ruhendRes : ruhendRes?.result || [ruhendRes];
    const ruhendItem = ruhendItems.find((it) => it && (it.url || it.video || it.link));
    const igDirectUrl = igDirectRes?.url_list?.[0];
    const btchUrl = btchRes?.url || btchRes?.link || (Array.isArray(btchRes?.result) ? btchRes.result[0]?.url : btchRes?.result);
    const directUrl = ruhendItem?.url || ruhendItem?.video || ruhendItem?.link || igDirectUrl || btchUrl || rawUrl;
    const thumbnail = ruhendItem?.thumbnail || "";
    return {
      type: "video",
      mimeType: "video/mp4",
      filename: "Instagram_Media_" + Date.now() + ".mp4",
      title: "Instagram Media",
      size: 18e6,
      format: "MP4",
      thumbnail,
      downloadUrl: directUrl,
      sourceUrl: rawUrl,
      platform: "Instagram"
    };
  }
  if (lowerUrl.includes("facebook.com") || lowerUrl.includes("fb.watch") || lowerUrl.includes("fb.com")) {
    const [ruhendRes, btchRes] = await Promise.all([
      ruhend && (ruhend.fbdl || ruhend.facebook) ? fastTimeout((ruhend.fbdl || ruhend.facebook)(rawUrl), 2500) : Promise.resolve(null),
      btch && (btch.fbdown || btch.facebook) ? fastTimeout((btch.fbdown || btch.facebook)(rawUrl), 2500) : Promise.resolve(null)
    ]);
    const directUrl = ruhendRes?.HD || ruhendRes?.video || ruhendRes?.Normal_video || ruhendRes?.url || btchRes?.HD || btchRes?.Normal_video || btchRes?.video || btchRes?.url || rawUrl;
    const title = ruhendRes?.title || btchRes?.title || "Facebook Video";
    const audioUrl = ruhendRes?.audio || btchRes?.audio || void 0;
    return {
      type: "video",
      mimeType: "video/mp4",
      filename: sanitizeFilename(title, "facebook_video") + ".mp4",
      title,
      size: 25e6,
      format: "MP4",
      downloadUrl: directUrl,
      audioUrl,
      sourceUrl: rawUrl,
      platform: "Facebook"
    };
  }
  if (lowerUrl.includes("twitter.com") || lowerUrl.includes("x.com")) {
    const [twitterMediaRes, btchRes, oembedRes] = await Promise.all([
      getTwitterMedia ? fastTimeout(getTwitterMedia(rawUrl), 2500) : Promise.resolve(null),
      btch && btch.twitter ? fastTimeout(btch.twitter(rawUrl), 2500) : Promise.resolve(null),
      fastTimeout(axios5.get(`https://publish.twitter.com/oembed?url=${encodeURIComponent(rawUrl)}`).then((r) => r.data), 1800)
    ]);
    let bestUrl;
    if (twitterMediaRes?.media && Array.isArray(twitterMediaRes.media)) {
      const sorted = [...twitterMediaRes.media].sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
      bestUrl = sorted[0]?.url;
    }
    const directVideo = bestUrl || btchRes?.hd || btchRes?.video || btchRes?.sd || btchRes?.url || rawUrl;
    const title = twitterMediaRes?.text?.substring(0, 60) || btchRes?.title || (oembedRes?.author_name ? `Post by ${oembedRes.author_name}` : "Twitter Video");
    return {
      type: "video",
      mimeType: "video/mp4",
      filename: sanitizeFilename(title, "twitter_video") + ".mp4",
      title,
      author: oembedRes?.author_name || void 0,
      size: 15e6,
      format: "MP4",
      downloadUrl: directVideo,
      sourceUrl: rawUrl,
      platform: "Twitter / X"
    };
  }
  if (lowerUrl.includes("spotify.com")) {
    const [btchRes, oembedRes] = await Promise.all([
      btch && btch.spotify ? fastTimeout(btch.spotify(rawUrl), 2500) : Promise.resolve(null),
      fastTimeout(axios5.get(`https://open.spotify.com/oembed?url=${encodeURIComponent(rawUrl)}`).then((r) => r.data), 1800)
    ]);
    const directUrl = btchRes?.download || btchRes?.url || btchRes?.link || rawUrl;
    const title = btchRes?.title ? `${btchRes.title} - ${btchRes.artist || ""}` : oembedRes?.title || "Spotify Track";
    const thumbnail = btchRes?.thumbnail || btchRes?.cover || oembedRes?.thumbnail_url || "";
    return {
      type: "audio",
      mimeType: "audio/mpeg",
      filename: sanitizeFilename(title, "spotify_track") + ".mp3",
      title,
      size: 9e6,
      format: "MP3",
      thumbnail,
      downloadUrl: directUrl,
      sourceUrl: rawUrl,
      platform: "Spotify"
    };
  }
  if (lowerUrl.includes("soundcloud.com")) {
    const [btchRes, oembedRes] = await Promise.all([
      btch && btch.soundcloud ? fastTimeout(btch.soundcloud(rawUrl), 2500) : Promise.resolve(null),
      fastTimeout(axios5.get(`https://soundcloud.com/oembed?url=${encodeURIComponent(rawUrl)}&format=json`).then((r) => r.data), 1800)
    ]);
    const directUrl = btchRes?.download || btchRes?.url || btchRes?.link || rawUrl;
    const title = btchRes?.title || oembedRes?.title || "SoundCloud Audio";
    const thumbnail = btchRes?.thumbnail || oembedRes?.thumbnail_url || "";
    return {
      type: "audio",
      mimeType: "audio/mpeg",
      filename: sanitizeFilename(title, "soundcloud_audio") + ".mp3",
      title,
      author: oembedRes?.author_name || void 0,
      size: 85e5,
      format: "MP3",
      thumbnail,
      downloadUrl: directUrl,
      sourceUrl: rawUrl,
      platform: "SoundCloud"
    };
  }
  if (lowerUrl.includes("pinterest.com") || lowerUrl.includes("pin.it")) {
    try {
      if (btch && btch.pinterest) {
        const res = await btch.pinterest(rawUrl);
        const directUrl = res?.url || res?.video || res?.link;
        if (directUrl) {
          const isVideo = directUrl.includes(".mp4") || String(res?.type).includes("video");
          return {
            type: isVideo ? "video" : "image",
            mimeType: isVideo ? "video/mp4" : "image/jpeg",
            filename: (isVideo ? "Pinterest_Video_" : "Pinterest_Pin_") + Date.now() + (isVideo ? ".mp4" : ".jpg"),
            title: res?.title || "Pinterest Media",
            size: isVideo ? 12e6 : 15e5,
            format: isVideo ? "MP4" : "JPG",
            downloadUrl: directUrl,
            sourceUrl: rawUrl,
            platform: "Pinterest"
          };
        }
      }
    } catch (e) {
    }
  }
  if (lowerUrl.includes("threads.net")) {
    try {
      if (btch && btch.threads) {
        const res = await btch.threads(rawUrl);
        const directUrl = res?.video || res?.image || res?.url;
        if (directUrl) {
          const isVideo = !!res?.video || directUrl.includes(".mp4");
          return {
            type: isVideo ? "video" : "image",
            mimeType: isVideo ? "video/mp4" : "image/jpeg",
            filename: "Threads_Media_" + Date.now() + (isVideo ? ".mp4" : ".jpg"),
            size: isVideo ? 15e6 : 12e5,
            format: isVideo ? "MP4" : "JPG",
            downloadUrl: directUrl,
            sourceUrl: rawUrl,
            platform: "Threads"
          };
        }
      }
    } catch (e) {
    }
  }
  if (lowerUrl.includes("capcut.com")) {
    try {
      if (btch && btch.capcut) {
        const res = await btch.capcut(rawUrl);
        const directUrl = res?.video || res?.url;
        if (directUrl) {
          return {
            type: "video",
            mimeType: "video/mp4",
            filename: sanitizeFilename(res?.title || "CapCut_Video", "capcut") + ".mp4",
            title: res?.title || "CapCut Video",
            size: 2e7,
            format: "MP4",
            downloadUrl: directUrl,
            sourceUrl: rawUrl,
            platform: "CapCut"
          };
        }
      }
    } catch (e) {
    }
  }
  if (lowerUrl.includes("reddit.com") || lowerUrl.includes("v.redd.it")) {
    try {
      let jsonUrl = rawUrl;
      if (!jsonUrl.endsWith(".json")) {
        jsonUrl = jsonUrl.split("?")[0].replace(/\/$/, "") + ".json";
      }
      const redditRes = await axios5.get(jsonUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) FideSaveMedia/2.0" },
        timeout: 4e3
      });
      const postData = redditRes.data?.[0]?.data?.children?.[0]?.data;
      if (postData) {
        const videoData = postData.secure_media?.reddit_video || postData.media?.reddit_video;
        if (videoData && videoData.fallback_url) {
          const directUrl = videoData.fallback_url.split("?")[0];
          return {
            type: "video",
            mimeType: "video/mp4",
            filename: sanitizeFilename(postData.title || "Reddit_Video", "reddit_video") + ".mp4",
            title: postData.title || "Reddit Video",
            size: 15e6,
            format: "MP4",
            thumbnail: postData.thumbnail && postData.thumbnail.startsWith("http") ? postData.thumbnail : "",
            downloadUrl: directUrl,
            sourceUrl: rawUrl,
            platform: "Reddit"
          };
        }
      }
    } catch (e) {
    }
  }
  if (lowerUrl.includes("drive.google.com")) {
    const fileIdMatch = rawUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || rawUrl.match(/id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      const fileId = fileIdMatch[1];
      const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      return {
        type: "file",
        mimeType: "application/octet-stream",
        filename: `Google_Drive_File_${fileId}.bin`,
        title: "Google Drive File",
        size: 25e6,
        format: "FILE",
        downloadUrl: directUrl,
        sourceUrl: rawUrl,
        platform: "Google Drive"
      };
    }
  }
  if (lowerUrl.includes("mediafire.com")) {
    try {
      if (btch && btch.mediafire) {
        const res = await btch.mediafire(rawUrl);
        if (res && (res.url || res.link)) {
          const directUrl = res.url || res.link;
          return {
            type: "file",
            mimeType: res.mime || "application/octet-stream",
            filename: sanitizeFilename(res.filename || "Mediafire_Download", "mediafire"),
            title: res.filename || "MediaFire File",
            size: parseInt(res.size || "0", 10) || 2e7,
            format: "FILE",
            downloadUrl: directUrl,
            sourceUrl: rawUrl,
            platform: "MediaFire"
          };
        }
      }
    } catch (e) {
    }
  }
  if (lowerUrl.includes("dropbox.com")) {
    const directUrl = rawUrl.includes("?") ? rawUrl.replace(/dl=0/g, "dl=1") : `${rawUrl}?dl=1`;
    return {
      type: "file",
      mimeType: "application/octet-stream",
      filename: sanitizeFilename(rawUrl.split("/").pop()?.split("?")[0] || "Dropbox_File", "dropbox_file"),
      title: "Dropbox File",
      size: 2e7,
      format: "FILE",
      downloadUrl: directUrl,
      sourceUrl: rawUrl,
      platform: "Dropbox"
    };
  }
  try {
    const pageRes = await axios5.get(rawUrl, {
      headers: BROWSER_HEADERS,
      timeout: 4500,
      maxRedirects: 5,
      maxContentLength: 8 * 1024 * 1024,
      validateStatus: (status) => status < 400
    });
    if (pageRes.status === 200 && typeof pageRes.data === "string") {
      const html = pageRes.data;
      const $ = cheerio2.load(html);
      const pageTitle = $('meta[property="og:title"]').attr("content") || $('meta[name="twitter:title"]').attr("content") || $("title").text().trim() || "Universal Web Media";
      const ogImage = $('meta[property="og:image"]').attr("content") || $('meta[name="twitter:image"]').attr("content") || $('link[rel="image_src"]').attr("href") || "";
      const makeAbsolute = (link) => {
        if (!link || typeof link !== "string") return null;
        const trimmed = link.trim();
        if (trimmed.startsWith("//")) return "https:" + trimmed;
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
        try {
          return new URL(trimmed, rawUrl).href;
        } catch {
          return null;
        }
      };
      const isForbiddenOrPlayerPage = (mediaUrl) => {
        const u = mediaUrl.toLowerCase();
        return u.includes("/embed/") || u.includes("youtube.com/watch") || u.includes("player.vimeo.com/video") || u.endsWith(".html") || u.endsWith(".htm") || u.endsWith(".php") || u.includes("googleads") || u.includes("doubleclick");
      };
      let jsonLdMediaUrl = null;
      let jsonLdType = null;
      let jsonLdTitle = null;
      let jsonLdThumb = null;
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const content = $(el).html();
          if (!content) return;
          const parsed = JSON.parse(content);
          const entries = Array.isArray(parsed) ? parsed : parsed["@graph"] || [parsed];
          for (const item of entries) {
            if (!item) continue;
            const itemType = String(item["@type"] || "").toLowerCase();
            if (itemType.includes("videoobject") || itemType.includes("clip")) {
              const stream = makeAbsolute(item.contentUrl || item.embedUrl || item.url);
              if (stream && !isForbiddenOrPlayerPage(stream)) {
                jsonLdMediaUrl = stream;
                jsonLdType = "video";
                jsonLdTitle = item.name || item.headline || null;
                jsonLdThumb = item.thumbnailUrl || null;
                break;
              }
            } else if (itemType.includes("audioobject") || itemType.includes("musicrecording")) {
              const stream = makeAbsolute(item.contentUrl || item.url);
              if (stream && !isForbiddenOrPlayerPage(stream)) {
                jsonLdMediaUrl = stream;
                jsonLdType = "audio";
                jsonLdTitle = item.name || null;
                break;
              }
            }
          }
        } catch {
        }
      });
      if (jsonLdMediaUrl && jsonLdType) {
        const ext = jsonLdType === "video" ? "mp4" : "mp3";
        return {
          type: jsonLdType,
          mimeType: jsonLdType === "video" ? "video/mp4" : "audio/mpeg",
          filename: sanitizeFilename(jsonLdTitle || pageTitle, jsonLdType) + "." + ext,
          title: jsonLdTitle || pageTitle,
          size: jsonLdType === "video" ? 22e6 : 75e5,
          format: ext.toUpperCase(),
          thumbnail: jsonLdThumb || ogImage,
          downloadUrl: jsonLdMediaUrl,
          sourceUrl: rawUrl,
          platform: "Universal Web Media"
        };
      }
      const rawVideo = $('meta[property="og:video:secure_url"]').attr("content") || $('meta[property="og:video"]').attr("content") || $('meta[property="og:video:url"]').attr("content") || $('meta[name="twitter:player:stream"]').attr("content") || $('meta[property="twitter:player:stream"]').attr("content");
      const rawAudio = $('meta[property="og:audio:secure_url"]').attr("content") || $('meta[property="og:audio"]').attr("content");
      const validVideoUrl = makeAbsolute(rawVideo);
      if (validVideoUrl && !isForbiddenOrPlayerPage(validVideoUrl)) {
        return {
          type: "video",
          mimeType: "video/mp4",
          filename: sanitizeFilename(pageTitle, "video") + ".mp4",
          title: pageTitle,
          size: 2e7,
          format: "MP4",
          thumbnail: ogImage,
          downloadUrl: validVideoUrl,
          sourceUrl: rawUrl,
          platform: "Universal Video"
        };
      }
      const validAudioUrl = makeAbsolute(rawAudio);
      if (validAudioUrl && !isForbiddenOrPlayerPage(validAudioUrl)) {
        return {
          type: "audio",
          mimeType: "audio/mpeg",
          filename: sanitizeFilename(pageTitle, "audio") + ".mp3",
          title: pageTitle,
          size: 8e6,
          format: "MP3",
          thumbnail: ogImage,
          downloadUrl: validAudioUrl,
          sourceUrl: rawUrl,
          platform: "Universal Audio"
        };
      }
      const html5VideoSrc = $("video source[src]").attr("src") || $("video[src]").attr("src") || $('source[type^="video/"]').attr("src") || $("video").attr("data-src") || $("video").attr("data-video-url");
      const validHtml5Video = makeAbsolute(html5VideoSrc);
      if (validHtml5Video && !isForbiddenOrPlayerPage(validHtml5Video)) {
        return {
          type: "video",
          mimeType: "video/mp4",
          filename: sanitizeFilename(pageTitle, "video") + ".mp4",
          title: pageTitle,
          size: 2e7,
          format: "MP4",
          thumbnail: ogImage,
          downloadUrl: validHtml5Video,
          sourceUrl: rawUrl,
          platform: "HTML5 Video"
        };
      }
      const html5AudioSrc = $("audio source[src]").attr("src") || $("audio[src]").attr("src") || $('source[type^="audio/"]').attr("src") || $("audio").attr("data-src");
      const validHtml5Audio = makeAbsolute(html5AudioSrc);
      if (validHtml5Audio && !isForbiddenOrPlayerPage(validHtml5Audio)) {
        return {
          type: "audio",
          mimeType: "audio/mpeg",
          filename: sanitizeFilename(pageTitle, "audio") + ".mp3",
          title: pageTitle,
          size: 8e6,
          format: "MP3",
          thumbnail: ogImage,
          downloadUrl: validHtml5Audio,
          sourceUrl: rawUrl,
          platform: "HTML5 Audio"
        };
      }
      const mediaRegex = /(https?:\/\/[^"'\s<>\\]+\.(?:mp4|webm|m4v|mp3|m4a|wav|ogg|m3u8)(?:\?[^"'\s<>\\]*)?)/gi;
      let matchedMediaUrl = null;
      let matchedIsAudio = false;
      $("script").each((_, scriptEl) => {
        if (matchedMediaUrl) return;
        const scriptText = $(scriptEl).html() || "";
        let m;
        while ((m = mediaRegex.exec(scriptText)) !== null) {
          const candidate = m[1];
          if (candidate && !isForbiddenOrPlayerPage(candidate)) {
            matchedMediaUrl = candidate;
            matchedIsAudio = /\.(?:mp3|m4a|wav|ogg)(?:\?|$)/i.test(candidate);
            break;
          }
        }
      });
      if (matchedMediaUrl) {
        const isAudio = matchedIsAudio;
        const ext = isAudio ? "mp3" : matchedMediaUrl.includes(".m3u8") ? "m3u8" : "mp4";
        return {
          type: isAudio ? "audio" : "video",
          mimeType: isAudio ? "audio/mpeg" : ext === "m3u8" ? "application/vnd.apple.mpegurl" : "video/mp4",
          filename: sanitizeFilename(pageTitle, isAudio ? "audio" : "video") + "." + (ext === "m3u8" ? "mp4" : ext),
          title: pageTitle,
          size: isAudio ? 75e5 : 25e6,
          format: ext.toUpperCase(),
          thumbnail: ogImage,
          downloadUrl: matchedMediaUrl,
          sourceUrl: rawUrl,
          platform: isAudio ? "Web Audio Stream" : "Web Video Stream"
        };
      }
      const isImgUrl = (u) => /\.(?:jpg|jpeg|png|webp|gif)(?:\?|$)/i.test(u);
      if (ogImage && isImgUrl(ogImage) && !ogImage.includes("favicon") && !ogImage.includes("logo")) {
        return {
          type: "image",
          mimeType: "image/jpeg",
          filename: sanitizeFilename(pageTitle, "image") + ".jpg",
          title: pageTitle,
          size: 2e6,
          format: "JPG",
          thumbnail: ogImage,
          downloadUrl: ogImage,
          sourceUrl: rawUrl,
          platform: "Web Image"
        };
      }
    }
  } catch (deepScrapeErr) {
    console.warn("[Universal Deep Scrape Error]:", deepScrapeErr?.message);
  }
  if (lowerUrl.includes("vimeo.com") || lowerUrl.includes("dailymotion.com") || lowerUrl.includes("twitch.tv")) {
    const platformName = lowerUrl.includes("vimeo.com") ? "Vimeo" : lowerUrl.includes("dailymotion.com") ? "Dailymotion" : "Twitch";
    return {
      type: "video",
      mimeType: "video/mp4",
      filename: `${platformName}_Video_${Date.now()}.mp4`,
      title: `${platformName} Video Stream`,
      size: 2e7,
      format: "MP4",
      downloadUrl: rawUrl,
      sourceUrl: rawUrl,
      platform: platformName
    };
  }
  return null;
}

// server/media/adapters/movie-adapter.ts
import axios6 from "axios";
async function analyzeMovieSource(url) {
  const security = await validateUrlSecurity(url);
  if (!security.valid) {
    throw new Error(security.error || "This resource is not publicly accessible.");
  }
  const lowerUrl = url.toLowerCase();
  const tmdbKey = process.env.TMDB_API_KEY;
  if (lowerUrl.includes("archive.org/details/")) {
    try {
      const match = url.match(/archive\.org\/details\/([a-zA-Z0-9_\-\.]+)/i);
      if (match && match[1]) {
        const identifier = match[1];
        const metaRes = await axios6.get(`https://archive.org/metadata/${identifier}`, { timeout: 2500 });
        const data = metaRes.data;
        const files = data?.files || [];
        const mp4Files = files.filter((f) => f.name && f.name.toLowerCase().endsWith(".mp4"));
        if (mp4Files.length > 0) {
          mp4Files.sort((a, b) => parseInt(b.size || "0", 10) - parseInt(a.size || "0", 10));
          const chosen = mp4Files[0];
          const downloadUrl = `https://archive.org/download/${identifier}/${encodeURIComponent(chosen.name)}`;
          const title = data?.metadata?.title || identifier.replace(/_/g, " ");
          const filename = sanitizeFilename(title, "archive_movie") + ".mp4";
          const size = parseInt(chosen.size || "0", 10) || 5e7;
          return {
            type: "video",
            mimeType: "video/mp4",
            filename,
            size,
            format: "MP4",
            thumbnail: `https://archive.org/services/img/${identifier}`,
            downloadUrl,
            sourceUrl: url,
            platform: "Internet Archive Movie",
            resolution: chosen.name.includes("1080") ? "1080p" : chosen.name.includes("720") ? "720p" : "HD"
          };
        }
      }
    } catch (archErr) {
      console.warn("[Movie-Adapter] Archive.org lookup failed:", archErr.message);
    }
  }
  let tmdbMovieId = null;
  const tmdbMatch = url.match(/themoviedb\.org\/movie\/(\d+)/i);
  if (tmdbMatch && tmdbMatch[1]) {
    tmdbMovieId = tmdbMatch[1];
  }
  const vidsrcMatch = url.match(/vidsrc\.[a-z]+\/embed\/movie\/(\d+)/i) || url.match(/[?&]id=(\d+)/i);
  if (!tmdbMovieId && vidsrcMatch && vidsrcMatch[1]) {
    tmdbMovieId = vidsrcMatch[1];
  }
  const multiembedMatch = url.match(/video_id=(\d+)/i);
  if (!tmdbMovieId && multiembedMatch && multiembedMatch[1]) {
    tmdbMovieId = multiembedMatch[1];
  }
  const twoEmbedMatch = url.match(/2embed\.[a-z]+\/.*[?&]id=(\d+)/i);
  if (!tmdbMovieId && twoEmbedMatch && twoEmbedMatch[1]) {
    tmdbMovieId = twoEmbedMatch[1];
  }
  const imdbMatch = url.match(/imdb\.com\/title\/(tt\d+)/i);
  if (!tmdbMovieId && imdbMatch && imdbMatch[1] && tmdbKey) {
    try {
      const findRes = await axios6.get(
        `https://api.themoviedb.org/3/find/${imdbMatch[1]}?external_source=imdb_id&api_key=${tmdbKey}`,
        { timeout: 2500 }
      );
      const movieResult = findRes.data?.movie_results?.[0];
      if (movieResult?.id) {
        tmdbMovieId = String(movieResult.id);
      }
    } catch (e) {
      console.warn("[Movie-Adapter] IMDb find failed:", e.message);
    }
  }
  const letterboxdMatch = url.match(/letterboxd\.com\/film\/([a-zA-Z0-9\-_]+)/i);
  let searchTitleQuery = "";
  if (!tmdbMovieId && letterboxdMatch && letterboxdMatch[1]) {
    searchTitleQuery = letterboxdMatch[1].replace(/[-_]/g, " ");
  }
  const rtMatch = url.match(/rottentomatoes\.com\/m\/([a-zA-Z0-9\-_]+)/i);
  if (!tmdbMovieId && !searchTitleQuery && rtMatch && rtMatch[1]) {
    searchTitleQuery = rtMatch[1].replace(/[-_]/g, " ");
  }
  const traktMatch = url.match(/trakt\.tv\/movies\/([a-zA-Z0-9\-_]+)/i);
  if (!tmdbMovieId && !searchTitleQuery && traktMatch && traktMatch[1]) {
    searchTitleQuery = traktMatch[1].replace(/[-_]/g, " ");
  }
  if (!tmdbMovieId && tmdbKey) {
    try {
      if (!searchTitleQuery) {
        const htmlRes = await axios6.get(url, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
          timeout: 2500,
          maxRedirects: 5,
          maxContentLength: 5 * 1024 * 1024
          // 5MB limit
        });
        const html = String(htmlRes.data || "");
        const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) || html.match(/<title>([^<]+)<\/title>/i);
        if (ogTitleMatch && ogTitleMatch[1]) {
          let rawTitle = ogTitleMatch[1].split("|")[0].split("-")[0].split("on Letterboxd")[0].trim();
          if (rawTitle.length > 2) {
            searchTitleQuery = rawTitle;
          }
        }
      }
      if (searchTitleQuery) {
        const searchRes = await axios6.get(
          `https://api.themoviedb.org/3/search/movie?api_key=${tmdbKey}&query=${encodeURIComponent(searchTitleQuery)}`,
          { timeout: 2500 }
        );
        const topResult = searchRes.data?.results?.[0];
        if (topResult?.id) {
          tmdbMovieId = String(topResult.id);
        }
      }
    } catch (e) {
      console.warn("[Movie-Adapter] Search query resolution failed:", e.message);
    }
  }
  if (tmdbMovieId && tmdbKey) {
    try {
      const detailsRes = await axios6.get(
        `https://api.themoviedb.org/3/movie/${tmdbMovieId}?api_key=${tmdbKey}&language=en-US`,
        { timeout: 2500 }
      );
      const movie = detailsRes.data;
      if (!movie || !movie.title) return null;
      const title = movie.title;
      const releaseYear = movie.release_date ? movie.release_date.split("-")[0] : "";
      const posterPath = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : "";
      const backdropPath = movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : "";
      const thumbnail = posterPath || backdropPath || "";
      const videosRes = await axios6.get(
        `https://api.themoviedb.org/3/movie/${tmdbMovieId}/videos?api_key=${tmdbKey}&language=en-US`,
        { timeout: 2500 }
      );
      const videos = videosRes.data?.results || [];
      const ytVideos = videos.filter((v) => v.site === "YouTube");
      const trailer = ytVideos.find((v) => v.type === "Trailer") || ytVideos.find((v) => v.type === "Teaser") || ytVideos[0];
      if (trailer && trailer.key) {
        const youtubeUrl = `https://www.youtube.com/watch?v=${trailer.key}`;
        try {
          const ytMedia = await analyzePermittedSource(youtubeUrl);
          if (ytMedia) {
            const cleanTitle2 = sanitizeFilename(`${title} ${releaseYear ? `(${releaseYear})` : ""} - ${trailer.name || "Official Video"}`);
            return {
              ...ytMedia,
              filename: `${cleanTitle2}.mp4`,
              thumbnail: thumbnail || ytMedia.thumbnail,
              platform: "TMDb Cinema (Official HD)",
              sourceUrl: url,
              resolution: trailer.size ? `${trailer.size}p HD` : ytMedia.resolution || "1080p"
            };
          }
        } catch (ytErr) {
          console.warn("[Movie-Adapter] YouTube resolution failed:", ytErr.message);
        }
        const cleanTitle = sanitizeFilename(`${title} ${releaseYear ? `(${releaseYear})` : ""} - Official Trailer`);
        return {
          type: "video",
          mimeType: "video/mp4",
          filename: `${cleanTitle}.mp4`,
          size: 25e6,
          format: "MP4",
          thumbnail,
          downloadUrl: `https://www.youtube.com/watch?v=${trailer.key}`,
          sourceUrl: url,
          platform: "TMDb Cinema (Official HD)",
          resolution: `${trailer.size || 1080}p HD`
        };
      }
      if (backdropPath) {
        return {
          type: "image",
          mimeType: "image/jpeg",
          filename: sanitizeFilename(`${title} ${releaseYear ? `(${releaseYear})` : ""} Master Artwork`) + ".jpg",
          size: 25e5,
          format: "JPG",
          thumbnail: posterPath,
          downloadUrl: backdropPath,
          sourceUrl: url,
          platform: "TMDb Cinema Asset",
          resolution: "4K Ultra HD"
        };
      }
    } catch (tmdbErr) {
      console.warn("[Movie-Adapter] TMDb movie processing error:", tmdbErr.message);
    }
  }
  return null;
}

// server/media/downloader.ts
import axios7 from "axios";
async function handleMediaDownload(req, res) {
  const url = req.body?.url || req.query?.url;
  const requestedFilename = req.body?.filename || req.query?.filename;
  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "Please enter a valid media URL." });
    return;
  }
  const security = await validateUrlSecurity(url);
  if (!security.valid) {
    res.status(400).json({ error: security.error || "This resource is not publicly accessible." });
    return;
  }
  const isVercel2 = process.env.VERCEL === "1" || !!process.env.VERCEL_URL;
  if (isVercel2) {
    console.log(`[Vercel Download] Bypassing proxy to avoid 4.5MB limit. Redirecting to source: ${url}`);
    res.redirect(302, url);
    return;
  }
  try {
    const targetUrl = new URL(url);
    const referer = targetUrl.origin;
    const axiosHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": referer,
      "Accept": "*/*",
      "Connection": "keep-alive"
    };
    if (req.headers.range) {
      axiosHeaders["Range"] = req.headers.range;
    }
    let response;
    try {
      response = await axios7({
        method: "get",
        url,
        responseType: "stream",
        timeout: 3e5,
        // 5 min timeout for streaming
        headers: axiosHeaders,
        maxRedirects: 10,
        validateStatus: (status) => status < 400
      });
    } catch (firstErr) {
      if (firstErr.response?.status === 403 || firstErr.response?.status === 401) {
        delete axiosHeaders["Referer"];
        response = await axios7({
          method: "get",
          url,
          responseType: "stream",
          timeout: 3e5,
          headers: axiosHeaders,
          maxRedirects: 10,
          validateStatus: (status) => status < 400
        });
      } else {
        throw firstErr;
      }
    }
    const contentType = String(response.headers["content-type"] || "application/octet-stream");
    if (contentType.includes("text/html")) {
      console.log(`[Media Download] URL returned HTML webpage. Redirecting to source: ${url}`);
      res.redirect(302, url);
      return;
    }
    const contentLengthHeader = response.headers["content-length"];
    const declaredLength = contentLengthHeader ? parseInt(String(contentLengthHeader), 10) : 0;
    if (declaredLength > MAX_FILE_SIZE) {
      res.status(413).json({ error: "This file exceeds the maximum supported size (250 MB)." });
      return;
    }
    const fallbackName = extractFilename(url, response.headers["content-disposition"] ? String(response.headers["content-disposition"]) : void 0);
    const rawName = requestedFilename || fallbackName;
    const cleanFilename = sanitizeFilename(rawName, "downloaded_media");
    if (!isSafeDownloadable(cleanFilename, contentType)) {
      res.status(403).json({ error: "Downloading this file type is restricted for safety reasons." });
      return;
    }
    res.status(response.status || 200);
    res.setHeader("Content-Type", contentType);
    if (declaredLength > 0) {
      res.setHeader("Content-Length", declaredLength.toString());
    }
    if (response.headers["content-range"]) {
      res.setHeader("Content-Range", String(response.headers["content-range"]));
    }
    if (response.headers["accept-ranges"]) {
      res.setHeader("Accept-Ranges", String(response.headers["accept-ranges"]));
    }
    res.setHeader("Content-Disposition", `attachment; filename="${cleanFilename}"`);
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("X-Content-Type-Options", "nosniff");
    let totalBytesStreamed = 0;
    let aborted = false;
    response.data.on("data", (chunk) => {
      totalBytesStreamed += chunk.length;
      if (totalBytesStreamed > MAX_FILE_SIZE) {
        if (!aborted) {
          aborted = true;
          console.warn(`[Media Download] Exceeded 250MB limit during streaming (${totalBytesStreamed} bytes). Aborting.`);
          response.data.destroy();
          if (!res.headersSent) {
            res.status(413).json({ error: "This file exceeds the maximum supported size (250 MB)." });
          } else {
            res.end();
          }
        }
      }
    });
    response.data.on("error", (err) => {
      console.error("[Media Stream Error]", err.message);
      if (!res.headersSent) {
        res.status(502).json({ error: "We couldn't save this media. Please try again." });
      } else {
        res.end();
      }
    });
    req.on("close", () => {
      if (!response.data.destroyed) {
        response.data.destroy();
      }
    });
    response.data.pipe(res);
  } catch (err) {
    console.error(`[Media Download Handler Error]`, err.message);
    if (!res.headersSent) {
      const status = err.response?.status || 500;
      if (status === 451 || status === 403 || status === 401) {
        res.redirect(302, url);
        return;
      } else if (status === 404) {
        res.status(404).json({ error: "This resource was not found at the source." });
      } else if (err.code === "ECONNABORTED" || err.message.includes("timeout")) {
        res.status(504).json({ error: "The source took too long to respond. Please try again." });
      } else {
        res.status(502).json({ error: "We couldn't save this media. Please try again." });
      }
    }
  }
}

// server/media/index.ts
async function analyzeMedia(rawUrl) {
  try {
    const url = rawUrl ? rawUrl.trim() : "";
    if (!url) {
      return {
        success: false,
        error: "Please enter a valid media URL."
      };
    }
    let securityValid = true;
    try {
      const security = await validateUrlSecurity(url);
      securityValid = security.valid;
    } catch (secErr) {
    }
    if (!securityValid) {
      return {
        success: false,
        error: "This resource URL is restricted or invalid."
      };
    }
    const lowerUrl = url.toLowerCase();
    const isSocialOrPlatform = /(youtube\.com|youtu\.be|tiktok\.com|instagram\.com|twitter\.com|x\.com|facebook\.com|fb\.watch|fb\.com|spotify\.com|soundcloud\.com|reddit\.com|v\.redd\.it|pinterest\.com|pin\.it|threads\.net|capcut\.com|drive\.google\.com|mediafire\.com|dropbox\.com|vimeo\.com|dailymotion\.com|twitch\.tv)/i.test(lowerUrl);
    const isDirectFileExtension = /\.(mp4|mp3|webm|wav|ogg|m4a|flac|mov|avi|mkv|jpg|jpeg|png|webp|gif|pdf|zip)(?:\?|$)/i.test(lowerUrl);
    try {
      if (isSocialOrPlatform) {
        const sourceResult = await analyzePermittedSource(url);
        if (sourceResult) {
          return { success: true, media: sourceResult };
        }
      } else if (isDirectFileExtension) {
        const directResult = await analyzeDirectUrl(url);
        if (directResult) {
          return { success: true, media: directResult };
        }
      } else {
        const directResult = await analyzeDirectUrl(url).catch(() => null);
        if (directResult) {
          return { success: true, media: directResult };
        }
        const sourceResult = await analyzePermittedSource(url).catch(() => null);
        if (sourceResult) {
          return { success: true, media: sourceResult };
        }
      }
    } catch (adapterErr) {
      console.warn("[Media Analyzer] Adapter pass warning:", adapterErr);
    }
    try {
      const movieResult = await analyzeMovieSource(url).catch(() => null);
      if (movieResult) {
        return { success: true, media: movieResult };
      }
    } catch (movieErr) {
    }
    try {
      const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
      const cleanHost = parsed.hostname.replace(/^www\./, "");
      const pathname = parsed.pathname;
      const lastPart = pathname.split("/").filter(Boolean).pop() || "media";
      const isAudioHint = /\.(mp3|wav|aac|ogg|m4a|flac)(?:\?|$)/i.test(url) || url.includes("audio") || url.includes("podcast") || url.includes("music") || url.includes("sound");
      const ext = isAudioHint ? "mp3" : "mp4";
      const cleanFilename = sanitizeFilename(lastPart.replace(/\.[^/.]+$/, ""), isAudioHint ? "audio_track" : "media_file") + "." + ext;
      return {
        success: true,
        media: {
          type: isAudioHint ? "audio" : "video",
          mimeType: isAudioHint ? "audio/mpeg" : "video/mp4",
          filename: cleanFilename,
          title: `${cleanHost.charAt(0).toUpperCase() + cleanHost.slice(1)} Media Stream`,
          size: isAudioHint ? 8e6 : 22e6,
          format: ext.toUpperCase(),
          downloadUrl: url,
          sourceUrl: url,
          platform: cleanHost || "FideTV"
        }
      };
    } catch (fallbackParseErr) {
      return {
        success: true,
        media: {
          type: "video",
          mimeType: "video/mp4",
          filename: "FideTV_Media_Download.mp4",
          title: "Direct Media Download",
          size: 2e7,
          format: "MP4",
          downloadUrl: url,
          sourceUrl: url,
          platform: "FideTV"
        }
      };
    }
  } catch (globalErr) {
    console.error("[Media Analyzer Global Catch]", globalErr);
    return {
      success: true,
      media: {
        type: "video",
        mimeType: "video/mp4",
        filename: "FideTV_Media_Stream.mp4",
        title: "Universal Media Stream",
        size: 2e7,
        format: "MP4",
        downloadUrl: rawUrl,
        sourceUrl: rawUrl,
        platform: "FideTV"
      }
    };
  }
}

// src/services/api/meetingRoutes.ts
import { Router } from "express";
import { AccessToken } from "livekit-server-sdk";
var router = Router();
router.post("/create-token", async (req, res) => {
  const { roomName, participantName } = req.body;
  if (!roomName || !participantName) {
    return res.status(400).json({ error: "Room and Participant names are required" });
  }
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    return res.status(500).json({ error: "LiveKit credentials missing" });
  }
  const at = new AccessToken(apiKey, apiSecret, { identity: participantName });
  at.addGrant({ roomJoin: true, room: roomName });
  res.json({ token: await at.toJwt() });
});
var meetingRoutes_default = router;

// server.ts
process.on("unhandledRejection", (reason) => {
  console.error("[Unhandled Rejection]", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[Uncaught Exception]", err);
});
dotenv.config();
var app = express();
app.use(cors());
app.set("trust proxy", 1);
var PORT = 3e3;
var isVercel = process.env.VERCEL === "1" || !!process.env.VERCEL_URL;
var getSafeClientIp = (req) => {
  try {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
      return forwarded.split(",")[0].trim();
    }
    if (Array.isArray(forwarded) && forwarded.length > 0) {
      return forwarded[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || "127.0.0.1";
  } catch {
    return "127.0.0.1";
  }
};
var apiLimiter = isVercel ? (req, res, next) => next() : rateLimit({
  windowMs: 15 * 60 * 1e3,
  max: 3e3,
  skip: (req) => {
    const p = req.path || "";
    return req.method === "GET" && (p.startsWith("/news") || p.startsWith("/channels") || p.startsWith("/blog") || p.startsWith("/health"));
  },
  message: {
    success: false,
    error: "Too many requests from this IP, please try again after 15 minutes",
    windowMinutes: 15,
    retryAfterSeconds: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: getSafeClientIp
});
var uploadLimiter = isVercel ? (req, res, next) => next() : rateLimit({
  windowMs: 60 * 60 * 1e3,
  max: 100,
  message: "Too many uploads from this IP, please try again later",
  validate: false,
  keyGenerator: getSafeClientIp
});
var mediaLimiter = isVercel ? (req, res, next) => next() : rateLimit({
  windowMs: 15 * 60 * 1e3,
  max: 150,
  message: { success: false, error: "Too many media requests. Please try again after a few minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: getSafeClientIp
});
app.use("/api/", apiLimiter);
var upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 },
  storage: multer.memoryStorage()
});
var _supabaseAdmin = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key || key.trim() === "") {
      console.error("[Backend] Supabase admin credentials (VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY) are missing in the environment.");
      return null;
    }
    try {
      _supabaseAdmin = createClient(url, key);
    } catch (err) {
      console.error("[Backend] Failed to initialize Supabase Admin client:", err);
      return null;
    }
  }
  return _supabaseAdmin;
}
var _isAppInitialized = false;
async function initApp(startServer = true) {
  if (_isAppInitialized) {
    return;
  }
  _isAppInitialized = true;
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://s.ytimg.com https://js.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://js.stripe.com; connect-src 'self' https://*.supabase.co https://*.googleapis.com wss://*.supabase.co; frame-ancestors 'self' https://*.google.com https://ai.studio;");
    next();
  });
  let lastAutomationReport = { status: "No cycle run yet" };
  const supabase = getSupabaseAdmin();
  const ingestService = supabase ? new ChannelIngestionService(supabase) : null;
  const autoBlogService = AutoBlogService.getInstance(supabase);
  autoBlogService.init().catch((err) => console.error("[AutoBlog] Init error:", err));
  const generateSitemapXml = (hostUrl) => {
    const baseUrl = hostUrl.startsWith("http") ? hostUrl : `https://${hostUrl}`;
    const staticPages = [
      { url: "", changefreq: "daily", priority: "1.0" },
      { url: "/news", changefreq: "hourly", priority: "0.9" },
      { url: "/live", changefreq: "always", priority: "0.9" },
      { url: "/fidesave", changefreq: "weekly", priority: "0.8" },
      { url: "/spaces", changefreq: "daily", priority: "0.8" },
      { url: "/about", changefreq: "monthly", priority: "0.5" },
      { url: "/contact", changefreq: "monthly", priority: "0.5" }
    ];
    const blogData = autoBlogService.getAllPosts({ limit: 100 });
    const posts = blogData.posts || [];
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;
    for (const page of staticPages) {
      xml += `  <url>
`;
      xml += `    <loc>${baseUrl}${page.url}</loc>
`;
      xml += `    <changefreq>${page.changefreq}</changefreq>
`;
      xml += `    <priority>${page.priority}</priority>
`;
      xml += `  </url>
`;
    }
    for (const post of posts) {
      const postUrl = `${baseUrl}/news/${post.slug || post.id}`;
      const lastMod = post.updated_at || post.created_at || (/* @__PURE__ */ new Date()).toISOString();
      xml += `  <url>
`;
      xml += `    <loc>${postUrl}</loc>
`;
      xml += `    <lastmod>${new Date(lastMod).toISOString().split("T")[0]}</lastmod>
`;
      xml += `    <changefreq>weekly</changefreq>
`;
      xml += `    <priority>0.8</priority>
`;
      xml += `  </url>
`;
    }
    xml += `</urlset>`;
    return xml;
  };
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const host = "fidetv.online";
      const xml = generateSitemapXml("https://" + host);
      res.type("application/xml");
      res.send(xml);
    } catch (err) {
      console.error("[Sitemap Error]", err);
      res.status(500).send("Error generating sitemap");
    }
  });
  let isAutomationRunning = false;
  if (ingestService && !isVercel) {
    console.log("[Background] Starting automation scheduler...");
    const expansionSources = [
      { name: "Global Index", url: "https://iptv-org.github.io/iptv/index.m3u" },
      { name: "Nigeria", url: "https://iptv-org.github.io/iptv/countries/ng.m3u" }
    ];
    setTimeout(async () => {
      if (isAutomationRunning) return;
      isAutomationRunning = true;
      console.log("[Background] Starting initial Database Expansion Cycle...");
      try {
        for (const source of expansionSources) {
          try {
            await ingestService.importFromM3U(source.url, { validateAll: false });
          } catch (e) {
            console.error(`[Background] Expansion failed for ${source.name}:`, e);
          }
        }
        console.log("[Background] Running initial database optimization...");
        lastAutomationReport = await ingestService.runFullAutomation();
      } finally {
        isAutomationRunning = false;
      }
    }, 10 * 60 * 1e3);
    setInterval(async () => {
      if (isAutomationRunning) return;
      isAutomationRunning = true;
      try {
        console.log("[Background] Running scheduled automation cycle...");
        lastAutomationReport = await ingestService.runFullAutomation();
      } finally {
        isAutomationRunning = false;
      }
    }, 12 * 60 * 60 * 1e3);
  }
  const apiRouter = express.Router();
  apiRouter.use(express.json());
  apiRouter.use("/meeting", meetingRoutes_default);
  apiRouter.use((req, res, next) => {
    console.log(`[API Router] ${req.method} ${req.url}`);
    next();
  });
  apiRouter.get("/fidesave-health", (req, res) => {
    res.json({
      status: "ok",
      service: "fidesave",
      environment: process.env.VERCEL ? "vercel-serverless" : "container",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  apiRouter.get("/health-check", async (req, res) => {
    const admin = getSupabaseAdmin();
    const results = {
      status: "checking",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      database: "unknown",
      tables: {},
      environment: {
        node_env: process.env.NODE_ENV,
        has_supabase_url: !!process.env.VITE_SUPABASE_URL,
        has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    };
    if (!admin) {
      results.status = "error";
      results.database = "missing credentials";
      return res.status(503).json(results);
    }
    try {
      const startTime = Date.now();
      const { data: testData, error: testError } = await admin.from("tv_channels").select("id").limit(1);
      results.latency_ms = Date.now() - startTime;
      if (testError) {
        results.status = "error";
        results.database = `error: ${testError.message}`;
      } else {
        results.database = "connected";
      }
      return res.json(results);
    } catch (err) {
      results.status = "error";
      results.error_details = err.message;
      return res.status(500).json(results);
    }
  });
  const validateLinkAccess = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const adminClient = getSupabaseAdmin();
    req.userProfile = { id: "guest", role: "guest" };
    if (!authHeader) {
      return next();
    }
    const token = authHeader.split(" ")[1];
    if (!token || token === "undefined") return next();
    if (!adminClient) {
      console.warn("[AuthMiddleware] Skipping profile check - Supabase Admin connection unavailable.");
      return next();
    }
    try {
      const authPromise = adminClient.auth.getUser(token);
      authPromise.catch(() => {
      });
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Auth timeout")), 5e3));
      const { data: { user }, error: authError } = await Promise.race([authPromise, timeoutPromise]);
      if (authError || !user) {
        console.warn("[AuthMiddleware] Session invalid or expired.");
        return next();
      }
      const { data: profile } = await adminClient.from("profiles").select("id, role, status").eq("id", user.id).maybeSingle();
      if (profile && (profile.status === "suspended" || profile.status === "blocked")) {
        return res.status(403).json({ error: "Your account is currently restricted from accessing this feature." });
      }
      req.userProfile = profile || { id: user.id, role: "user" };
      next();
    } catch (e) {
      next();
    }
  };
  const fetchTMDB = async (endpoint, params = {}) => {
    const tmdbKey = process.env.TMDB_API_KEY;
    if (!tmdbKey || tmdbKey === "YOUR_TMDB_API_KEY" || tmdbKey.length < 10) {
      console.warn("[TMDB] API Key missing or default");
      return null;
    }
    try {
      const response = await axios8.get(`https://api.themoviedb.org/3${endpoint}`, {
        params: { api_key: tmdbKey, ...params },
        headers: { "User-Agent": "FideTV-Agent/1.0" },
        timeout: 1e4
      });
      return response.data;
    } catch (e) {
      console.error(`[TMDB Error] ${endpoint}:`, e.response?.data || e.message);
      return null;
    }
  };
  const fetchOMDB = async (title) => {
    const omdbKey = process.env.OMDB_API_KEY;
    if (!omdbKey) return null;
    try {
      const response = await axios8.get(`https://www.omdbapi.com/`, {
        params: { apikey: omdbKey, t: title },
        timeout: 5e3
      });
      return response.data;
    } catch (e) {
      return null;
    }
  };
  apiRouter.get("/video-search", validateLinkAccess, async (req, res) => {
    try {
      const { q } = req.query;
      const query = (q || "").trim();
      const userProfile = req.userProfile || { id: "guest", role: "guest" };
      console.log(`[Universal-Search] Query: "${query || "Trending"}" | From: ${userProfile.id} (${userProfile.role})`);
      const allResults = [];
      const diagnostics = [];
      const FALLBACK_MOVIES = [
        { id: "tmdb_76600", title: "Avatar: The Way of Water", year: "2022", rating: "7.6", poster: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800", duration: "Movie", platform: "FideTV Library" },
        { id: "tmdb_872585", title: "Oppenheimer", year: "2023", rating: "8.1", poster: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=800", duration: "Movie", platform: "FideTV Library" },
        { id: "tmdb_693134", title: "Dune: Part Two", year: "2024", rating: "8.2", poster: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800", duration: "Movie", platform: "FideTV Library" },
        { id: "tmdb_569094", title: "Spider-Man: Across the Spider-Verse", year: "2023", rating: "8.4", poster: "https://images.unsplash.com/photo-1635805737707-575885ab0820?w=800", duration: "Movie", platform: "FideTV Library" },
        { id: "tmdb_155", title: "The Dark Knight", year: "2008", rating: "8.5", poster: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800", duration: "Movie", platform: "FideTV Library" },
        { id: "tmdb_157336", title: "Interstellar", year: "2014", rating: "8.4", poster: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800", duration: "Movie", platform: "FideTV Library" },
        { id: "tmdb_299534", title: "Avengers: Endgame", year: "2019", rating: "8.2", poster: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800", duration: "Movie", platform: "FideTV Library" },
        { id: "tmdb_533535", title: "Deadpool & Wolverine", year: "2024", rating: "7.7", poster: "https://images.unsplash.com/photo-1568832359672-e36cf5d74f54?w=800", duration: "Movie", platform: "FideTV Library" },
        { id: "tmdb_1022789", title: "Inside Out 2", year: "2024", rating: "7.6", poster: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800", duration: "Movie", platform: "FideTV Library" },
        { id: "tmdb_558449", title: "Gladiator II", year: "2024", rating: "7.5", poster: "https://images.unsplash.com/photo-1485099667858-394460167664?w=800", duration: "Movie", platform: "FideTV Library" },
        { id: "tmdb_912649", title: "Anikulapo: Rise of the Spectre", year: "2024", rating: "8.0", poster: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800", duration: "Nollywood / Series", platform: "FideTV Nollywood" },
        { id: "tmdb_1063879", title: "The Black Book", year: "2023", rating: "7.8", poster: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800", duration: "Nollywood / Action", platform: "FideTV Nollywood" }
      ];
      if (!query) {
        const trending = await fetchTMDB("/trending/movie/day", { language: "en-US" });
        if (trending?.results && Array.isArray(trending.results) && trending.results.length > 0) {
          trending.results.slice(0, 20).forEach((m) => {
            allResults.push({
              id: `tmdb_${m.id}`,
              title: m.title || m.original_title,
              year: (m.release_date || "").split("-")[0] || "TBA",
              rating: m.vote_average?.toFixed(1) || "N/A",
              poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : "https://images.unsplash.com/photo-1485099667858-394460167664?w=800",
              duration: "Movie",
              platform: "FideTV Library"
            });
          });
        }
      } else {
        const tmdbRes = await fetchTMDB("/search/movie", { query, language: "en-US", include_adult: false });
        if (tmdbRes?.results && Array.isArray(tmdbRes.results) && tmdbRes.results.length > 0) {
          console.log(`[Search] TMDB found ${tmdbRes.results.length} results`);
          tmdbRes.results.slice(0, 24).forEach((m) => {
            allResults.push({
              id: `tmdb_${m.id}`,
              title: m.title,
              year: (m.release_date || "").split("-")[0] || "TBA",
              rating: m.vote_average?.toFixed(1) || "N/A",
              poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : "https://images.unsplash.com/photo-1485099667858-394460167664?w=800",
              duration: "Movie",
              platform: "TMDb Metadata"
            });
          });
        }
      }
      if (allResults.length === 0) {
        console.log(`[Search] TMDB empty or unavailable. Utilizing fallback catalog for query: "${query}"`);
        if (!query) {
          allResults.push(...FALLBACK_MOVIES);
        } else {
          const lowerQ = query.toLowerCase();
          const matches = FALLBACK_MOVIES.filter(
            (m) => m.title.toLowerCase().includes(lowerQ) || m.platform.toLowerCase().includes(lowerQ) || m.duration.toLowerCase().includes(lowerQ)
          );
          if (matches.length > 0) {
            allResults.push(...matches);
          } else {
            allResults.push({
              id: `custom_${Date.now()}`,
              title: query.replace(/\b\w/g, (l) => l.toUpperCase()),
              year: "2024",
              rating: "8.0",
              poster: "https://images.unsplash.com/photo-1485099667858-394460167664?w=800",
              duration: "Movie",
              platform: "FideSave Media Search"
            });
          }
        }
      }
      const admin = getSupabaseAdmin();
      if (admin && allResults.length > 0) {
        try {
          const titles = allResults.map((r) => r.title);
          const { data: matches } = await admin.from("portfolio_items").select("title, video_url, youtube_id").in("title", titles);
          if (matches) {
            allResults.forEach((r) => {
              const matched = matches.find((m) => m.title.toLowerCase() === r.title.toLowerCase());
              if (matched) {
                r.internal_available = true;
                r.platform = "FideCloud HD - Available";
              }
            });
          }
        } catch (enrichErr) {
          console.warn("[Search Enrichment] Skipping DB check:", enrichErr);
        }
      }
      console.log(`[Universal-Search] Total unique results: ${allResults.length}`);
      return res.json({
        results: allResults.slice(0, 32),
        diagnostics: diagnostics.length > 0 ? diagnostics : ["Results aggregated successfully."]
      });
    } catch (err) {
      console.error("[Search Global Error]", err);
      res.status(500).json({ error: "Search failed. Please try again later." });
    }
  });
  apiRouter.post("/downloader/search", async (req, res) => {
    console.log("[Downloader-Search] Endpoint hit!");
    try {
      const { query, platform, limit = 12 } = req.body;
      if (!query) return res.status(400).json({ status: "error", error: "Query is required" });
      console.log(`[Downloader-Search] Query: "${query}" | Platform: ${platform}`);
      const searchResults = [];
      try {
        const ruhend2 = ruhend_static.default || ruhend_static;
        const ytSearch = ruhend2.ytsearch || ruhend2.search && ruhend2.search.youtube;
        if (ytSearch) {
          console.log("[Downloader-Search] Calling ytSearch...");
          const ytResults = await ytSearch(query);
          if (ytResults && Array.isArray(ytResults)) {
            ytResults.slice(0, limit).forEach((v) => {
              const vid = v.videoId || v.id;
              if (vid) {
                searchResults.push({
                  id: `yt_${vid}`,
                  title: v.title,
                  thumbnail: v.thumbnail || "",
                  duration: v.duration || "Video",
                  source: "YouTube",
                  qualities: ["360p", "720p", "1080p"],
                  hasSubtitles: true,
                  uploadDate: v.ago || "Recent"
                });
              }
            });
          }
        }
      } catch (e) {
        console.warn("[Downloader-Search] ruhend-scraper Search failed:", e);
      }
      console.log("[Downloader-Search] Final results count:", searchResults.length);
      return res.json({
        status: "success",
        results: searchResults.slice(0, limit)
      });
    } catch (err) {
      console.error("[Downloader-Search] Global error:", err);
      res.status(500).json({ status: "error", error: "Internal search error" });
    }
  });
  apiRouter.post("/downloader/get-link", validateLinkAccess, async (req, res) => {
    try {
      const { videoId, quality, format = "mp4" } = req.body;
      if (!videoId) return res.status(400).json({ status: "error", error: "Video ID is required" });
      console.log(`[Downloader-Link] Fetching for: ${videoId} | Quality: ${quality}`);
      if (videoId.startsWith("yt_")) {
        const vid = videoId.replace("yt_", "");
        const ytUrl = `https://www.youtube.com/watch?v=${vid}`;
        try {
          const ruhend2 = ruhend_static.default || ruhend_static;
          if (ruhend2.ytmp4) {
            const data = await ruhend2.ytmp4(ytUrl);
            if (data && (data.url || data.video || data.link)) {
              return res.json({
                status: "success",
                downloadUrl: data.url || data.video || data.link,
                fileName: (data.title || "video") + ".mp4",
                fileSize: data.size || "Variable",
                expiresIn: 3600
              });
            }
          }
          return res.json({
            status: "success",
            fileSize: "Variable",
            expiresIn: 3600
          });
        } catch (e) {
          console.error("[Downloader-Link] YouTube processing failed:", e);
        }
      }
      return res.json({
        status: "success",
        downloadUrl: `https://videodownloader.site/download?url=${encodeURIComponent(videoId)}`,
        fileName: "media_download.mp4",
        fileSize: "Variable",
        expiresIn: 3600
      });
    } catch (err) {
      console.error("[Downloader-Link] Global error:", err);
      res.status(500).json({ status: "error", error: "Failed to resolve download link" });
    }
  });
  apiRouter.get("/downloader/subtitles/:videoId", async (req, res) => {
    res.json({
      status: "success",
      subtitles: []
    });
  });
  apiRouter.post("/video-downloader", validateLinkAccess, async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });
    let workingUrl = url.trim();
    if (workingUrl.includes("web.facebook.com")) workingUrl = workingUrl.replace("web.facebook.com", "www.facebook.com");
    if (workingUrl.includes("facebook.com/share/r/")) {
      console.log(`[FideSave] Detected Facebook Reel Share: ${workingUrl}`);
    }
    if (workingUrl.includes("fb.watch")) workingUrl = workingUrl.replace("fb.watch/", "facebook.com/watch/?v=");
    console.log(`[FideSave] Universal Downloader requested: ${workingUrl}`);
    let universalMeta = {
      title: "Media Ready for Download",
      thumbnail: "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?w=800",
      platform: "Media Link",
      duration: "N/A"
    };
    try {
      const pageRes = await axios8.get(workingUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"
        },
        timeout: 4e3,
        validateStatus: (status) => status < 500
        // Don't throw on 4xx for metadata
      });
      if (pageRes.status === 200) {
        const $ = cheerio_static.load(pageRes.data);
        universalMeta.title = $('meta[property="og:title"]').attr("content") || $("title").text() || universalMeta.title;
        universalMeta.thumbnail = $('meta[property="og:image"]').attr("content") || universalMeta.thumbnail;
        const domainMatch = workingUrl.match(/https?:\/\/(?:www\.)?([^\/.]+)/);
        if (domainMatch) universalMeta.platform = domainMatch[1].charAt(0).toUpperCase() + domainMatch[1].slice(1);
      }
    } catch (e) {
      console.log(`[FideSave] Universal meta fetch failed (safe skip): ${workingUrl}`);
    }
    try {
      if (workingUrl.includes("youtube.com") || workingUrl.includes("youtu.be")) {
        try {
          console.log(`[FideSave] Processing YouTube: ${workingUrl}`);
          return res.json({
            ...universalMeta,
            platform: "YouTube",
            type: "youtube"
          });
        } catch (ytErr) {
          console.warn(`[FideSave] YouTube Initial Attempt Failed: ${ytErr.message}`);
          try {
            console.log("[FideSave] YouTube Fallback 1: Ruhend Scraper...");
            const ruhend2 = ruhend_static.default || ruhend_static;
            if (ruhend2.ytmp4) {
              const data = await ruhend2.ytmp4(workingUrl);
              if (data && (data.url || data.video || data.link)) {
                let vid = "";
                const match = workingUrl.match(/(?:v=|embed\/|youtu\.be\/|\/v\/|watch\?v=|^)([a-zA-Z0-9_-]{11})(?:[?&]|$)/);
                if (match) vid = match[1];
                return res.json({
                  ...universalMeta,
                  title: data.title || universalMeta.title,
                  videoUrl: data.url || data.video || data.link,
                  videoId: vid,
                  audioUrl: data.audio || data.mp3 || "",
                  thumbnail: data.thumbnail || universalMeta.thumbnail,
                  platform: "YouTube (Mirror 1)",
                  type: "youtube"
                });
              }
            }
          } catch (ruhendErr) {
            console.warn("[FideSave] YouTube Ruhend fallback failed:", ruhendErr.message);
          }
          try {
            console.log("[FideSave] YouTube Fallback 2: Btch Downloader...");
            const btch2 = btch_static.default || btch_static;
            if (btch2.youtube) {
              const data = await btch2.youtube(workingUrl);
              if (data && (data.url || data.video || data.link)) {
                return res.json({
                  ...universalMeta,
                  title: data.title || universalMeta.title,
                  videoUrl: data.url || data.video || data.link,
                  audioUrl: data.mp3 || data.audio || "",
                  platform: "YouTube (Mirror 2)",
                  type: "youtube"
                });
              }
            }
          } catch (btchErr) {
            console.warn("[FideSave] YouTube Btch fallback failed:", btchErr.message);
          }
          return res.status(403).json({
            error: "YouTube has restricted access from our current server region. To protect against bots, YouTube often requires a direct sign-in. Please try again or use another source."
          });
        }
      }
      if (workingUrl.endsWith(".m3u") || workingUrl.endsWith(".m3u8") || workingUrl.includes(".m3u8?")) {
        return res.json({
          ...universalMeta,
          videoUrl: workingUrl,
          type: "playlist"
        });
      }
      if (workingUrl.includes("tiktok.com") || workingUrl.includes("instagram.com") || workingUrl.includes("facebook.com") || workingUrl.includes("twitter.com") || workingUrl.includes("x.com") || workingUrl.includes("fb.watch") || workingUrl.includes("threads.net") || workingUrl.includes("capcut.com") || workingUrl.includes("snapchat.com")) {
        try {
          const ruhend2 = ruhend_static.default || ruhend_static;
          const btch2 = btch_static.default || btch_static;
          let data = null;
          if (workingUrl.includes("tiktok.com")) data = await (ruhend2.ttdl || ruhend2.tiktok)(workingUrl);
          else if (workingUrl.includes("instagram.com")) data = await (ruhend2.igdl || ruhend2.instagram)(workingUrl);
          else if (workingUrl.includes("facebook.com") || workingUrl.includes("fb.watch")) data = await (ruhend2.fbdl || ruhend2.facebook)(workingUrl);
          else if (workingUrl.includes("twitter.com") || workingUrl.includes("x.com")) data = await (ruhend2.twitter || btch2 && btch2.twitter)(workingUrl);
          else if (workingUrl.includes("threads.net")) data = await ruhend2.threads(workingUrl);
          else if (workingUrl.includes("capcut.com")) data = await ruhend2.capcut(workingUrl);
          else if (workingUrl.includes("snapchat.com")) data = await ruhend2.snapchat(workingUrl);
          if (!data && btch2) {
            if (workingUrl.includes("tiktok.com") && btch2.tiktok) data = await btch2.tiktok(workingUrl);
            else if (workingUrl.includes("instagram.com") && btch2.igdl) data = await btch2.igdl(workingUrl);
            else if (workingUrl.includes("facebook.com") && btch2.facebook) data = await btch2.facebook(workingUrl);
          }
          if (data && (data.url || data.video || data.link || data.result)) {
            const finalUrl = data.url || data.video || data.link || (data.result && Array.isArray(data.result) ? data.result[0]?.url || data.result[0] : data.result);
            if (finalUrl && typeof finalUrl === "string" && finalUrl.startsWith("http")) {
              return res.json({
                ...universalMeta,
                title: data.title || universalMeta.title,
                videoUrl: finalUrl,
                audioUrl: data.audio || data.mp3 || "",
                thumbnail: data.thumbnail || data.cover || universalMeta.thumbnail,
                platform: universalMeta.platform.toUpperCase()
              });
            }
          }
        } catch (e) {
          console.error("[Universal-Downloader] Scraper Error:", e.message);
        }
      }
      try {
        console.log(`[Universal-Downloader] Deep scraping: ${workingUrl}`);
        const pageRes = await axios8.get(workingUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36" },
          timeout: 6e3,
          validateStatus: (status) => status < 500
        });
        if (pageRes.status === 200) {
          const $ = cheerio_static.load(pageRes.data);
          const videoSrc = $('meta[property="og:video:secure_url"]').attr("content") || $('meta[property="og:video"]').attr("content") || $('meta[name="twitter:player:stream"]').attr("content") || $("video source").attr("src") || $("video").attr("src") || $('source[type="video/mp4"]').attr("src");
          if (videoSrc) {
            const absoluteUrl = videoSrc.startsWith("http") ? videoSrc : new URL(videoSrc, workingUrl).href;
            return res.json({
              ...universalMeta,
              videoUrl: absoluteUrl,
              type: "direct",
              note: "Discovered via universal deep-scrape"
            });
          }
        }
      } catch (e) {
        console.error("[Universal-Downloader] Deep scrape failure:", e.message);
      }
      return res.json({
        ...universalMeta,
        videoUrl: null,
        // Don't return original URL as videoUrl to prevent invalid proxying
        originalUrl: workingUrl,
        error: "Direct download links not found. Content may be private or restricted by provider."
      });
    } catch (error) {
      console.error("[FideSave] Downloader error:", error.message);
      res.status(500).json({ error: error.message || "Failed to parse link." });
    }
  });
  apiRouter.get("/movie-download-options", validateLinkAccess, async (req, res) => {
    try {
      const { title, id } = req.query;
      if (!title) return res.status(400).json({ error: "Movie title is required" });
      const admin = getSupabaseAdmin();
      const movieTitleStr = String(title || "");
      const links = [
        {
          quality: "1080p Very High HD (Direct Download)",
          type: "download",
          size: "Highest HD Quality",
          url: `https://www.9jarocks.net/?s=${encodeURIComponent(movieTitleStr)}`,
          source: "9jarocks.net (HD Hub)",
          note: "Direct high-speed movie download & release portal"
        },
        {
          quality: "High Speed HD File Mirror",
          type: "download",
          size: "Max Speed 1080p",
          url: `https://loadedfiles.net/?q=${encodeURIComponent(movieTitleStr)}`,
          source: "LoadedFiles (Download Server)",
          note: "Direct uploaded file download mirror"
        }
      ];
      console.log(`[Movie-Inventory] Checking official availability for: ${title} (ID: ${id})`);
      if (admin) {
        try {
          const { data: item } = await admin.from("portfolio_items").select("*").ilike("title", `${title}`).maybeSingle();
          if (item) {
            console.log(`[Inventory] Match found in library: ${item.id}`);
            if (item.video_url && item.video_url.includes(".supabase.co/storage")) {
              const urlParts = item.video_url.split("/storage/v1/object/public/")[1];
              if (urlParts) {
                const [bucket, ...pathArr] = urlParts.split("/");
                const path3 = pathArr.join("/");
                const { data: signed } = await admin.storage.from(bucket).createSignedUrl(path3, 3600);
                if (signed?.signedUrl) {
                  links.push({
                    quality: "FideTV HD (Official Master)",
                    type: "direct",
                    size: "Original Bitrate",
                    url: signed.signedUrl,
                    source: "FideCloud Storage",
                    note: "Direct master stream"
                  });
                }
              }
            } else if (item.video_url) {
              links.push({
                quality: "HD Stream (Verified)",
                type: "stream",
                size: "1080p",
                url: item.video_url,
                source: "FideTV Library"
              });
            } else if (item.youtube_id) {
              links.push({
                quality: "Official Preview / YouTube",
                type: "youtube",
                size: "1080p HD",
                url: `https://www.youtube.com/watch?v=${item.youtube_id}`,
                source: "YouTube Hub"
              });
            }
          }
        } catch (dbErr) {
          console.error("[Inventory] DB Link Error:", dbErr);
        }
      }
      const rawId = id ? String(id).replace("tmdb_", "").trim() : "";
      if (rawId && /^\d+$/.test(rawId)) {
        try {
          const tmdbVideos = await fetchTMDB(`/movie/${rawId}/videos`, { language: "en-US" });
          if (tmdbVideos?.results && Array.isArray(tmdbVideos.results)) {
            const ytVideos = tmdbVideos.results.filter((v) => v.site === "YouTube");
            const trailer = ytVideos.find((v) => v.type === "Trailer") || ytVideos[0];
            const teaser = ytVideos.find((v) => v.type === "Teaser" && v.key !== trailer?.key);
            if (trailer) {
              links.push({
                quality: `Official Trailer (${trailer.size || 1080}p HD)`,
                type: "youtube",
                size: `${trailer.size || 1080}p`,
                url: `https://www.youtube.com/watch?v=${trailer.key}`,
                source: "Official TMDb Trailer",
                note: trailer.name
              });
            }
            if (teaser) {
              links.push({
                quality: `Teaser / Clip (${teaser.size || 1080}p)`,
                type: "youtube",
                size: `${teaser.size || 1080}p`,
                url: `https://www.youtube.com/watch?v=${teaser.key}`,
                source: "Official Clip",
                note: teaser.name
              });
            }
          }
        } catch (tmdbErr) {
          console.warn("[Movie-Inventory] TMDB video fetch failed:", tmdbErr.message);
        }
        links.push({
          quality: "Full Movie Stream (Server 1)",
          type: "stream",
          size: "1080p HD",
          url: `https://vidsrc.to/embed/movie/${rawId}`,
          source: "Multi-Source Server 1",
          note: "High-speed multi-audio player"
        });
        links.push({
          quality: "Full Movie Stream (Server 2)",
          type: "stream",
          size: "Auto HD",
          url: `https://multiembed.mov/?video_id=${rawId}&tmdb=1`,
          source: "Multi-Source Server 2",
          note: "Fast global CDN mirror"
        });
        try {
          const providers = await fetchTMDB(`/movie/${rawId}/watch/providers`);
          const watchLink = providers?.results?.US?.link || (providers?.results ? Object.values(providers.results)[0] : null)?.link;
          if (watchLink) {
            links.push({
              quality: "Official Streaming Services",
              type: "stream",
              size: "Licensed Platforms",
              url: watchLink,
              source: "TMDb Watch Providers",
              note: "Find streaming platforms in your region"
            });
          }
        } catch (provErr) {
        }
      }
      if (links.length === 0) {
        links.push({
          quality: "Search Stream in FideSave",
          type: "fidesave",
          size: "Variable",
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(String(title) + " full movie")}`,
          source: "FideSave Search",
          note: "Search media streams directly"
        });
      }
      return res.json({ title, links });
    } catch (err) {
      console.error("[Search Inventory Hub Error]", err);
      res.status(500).json({ error: "Download service error" });
    }
  });
  apiRouter.get("/video-download-proxy", async (req, res) => {
    const { url, filename, inline } = req.query;
    if (!url || typeof url !== "string") return res.status(400).send("URL required");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");
    try {
      console.log(`[Download Proxy] Initiating download for: ${url}`);
      const targetUrl = new URL(url);
      const referer = targetUrl.origin;
      const axiosHeaders = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Referer": referer,
        "Accept": "*/*",
        "Connection": "keep-alive"
      };
      if (req.headers.range) {
        axiosHeaders["Range"] = req.headers.range;
      }
      const response = await axios8({
        method: "get",
        url,
        responseType: "stream",
        timeout: 3e5,
        // 5 minutes for very large video streams
        headers: axiosHeaders,
        maxRedirects: 10,
        validateStatus: (status) => status < 500
      });
      if (response.status >= 400) {
        console.error(`[Download Proxy Error] Source returned ${response.status}: ${url}`);
        return res.status(response.status).send(`The source file could not be accessed (Error ${response.status}). The link might be expired.`);
      }
      const contentType = response.headers["content-type"] || "application/octet-stream";
      if (contentType.includes("text/html")) {
        console.log(`[Download Proxy] URL returned HTML webpage. Redirecting to source: ${url}`);
        return res.redirect(302, url);
      }
      const cleanFilename = (filename || `fidesave-${Date.now()}.mp4`).replace(/[^a-zA-Z0-9.\-_]/g, "_");
      res.status(response.status);
      const passHeaders = ["content-type", "content-length", "content-range", "accept-ranges", "last-modified", "etag"];
      passHeaders.forEach((h) => {
        if (response.headers[h]) {
          res.setHeader(h, response.headers[h]);
        }
      });
      const userAgent = req.headers["user-agent"] || "";
      const isRokuOrTv = /roku|smarttv|smart-tv|googletv|appletv|hbbtv|netcast|webos/i.test(userAgent);
      const forceInline = inline === "1" || inline === "true" || isRokuOrTv;
      if (forceInline) {
        res.setHeader("Content-Disposition", `inline; filename="${cleanFilename}"`);
      } else {
        res.setHeader("Content-Disposition", `attachment; filename="${cleanFilename}"`);
      }
      res.setHeader("Cache-Control", "no-cache");
      response.data.on("error", (e) => {
        console.error("[Download Proxy Stream Error]", e.message);
        if (!res.headersSent) res.status(502).end();
        else res.end();
      });
      response.data.pipe(res);
    } catch (err) {
      console.error(`[Download Proxy Error] ${err.message}`);
      if (!res.headersSent) {
        res.status(502).send("Proxy failed: " + err.message);
      }
    }
  });
  const mediaHealthHandler = async (_req, res) => {
    try {
      const hasTmdb = !!process.env.TMDB_API_KEY && process.env.TMDB_API_KEY.trim() !== "";
      const hasOmdb = !!process.env.OMDB_API_KEY && process.env.OMDB_API_KEY.trim() !== "";
      const hasSupabase = !!(process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
      return res.json({
        status: "ok",
        service: "media-analysis",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        adapters: {
          direct_url: "active",
          permitted_sources: "active",
          movie_catalog: "active"
        },
        environment: {
          has_tmdb: hasTmdb,
          has_omdb: hasOmdb,
          has_supabase: hasSupabase
        },
        max_file_size_mb: 250
      });
    } catch (err) {
      return res.status(500).json({
        status: "error",
        service: "media-analysis",
        error: "Diagnostic check failed"
      });
    }
  };
  apiRouter.get("/health/media", mediaHealthHandler);
  apiRouter.get("/media/health", mediaHealthHandler);
  apiRouter.get("/media/diagnostic", async (req, res) => {
    try {
      const { execSync } = await import("child_process");
      let ffmpeg = "missing";
      let ytdlp = "missing";
      try {
        ffmpeg = execSync("ffmpeg -version").toString().split("\n")[0];
      } catch (e) {
      }
      try {
        ytdlp = execSync("yt-dlp --version").toString().trim();
      } catch (e) {
      }
      res.json({
        runtime: "ok",
        nodeVersion: process.version,
        environment: {
          VERCEL: process.env.VERCEL ? "present" : "missing",
          NODE_ENV: process.env.NODE_ENV
        },
        dependencies: {
          ffmpeg,
          ytdlp
        }
      });
    } catch (err) {
      res.json({ error: err.message });
    }
  });
  apiRouter.post("/media/analyze", mediaLimiter, async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");
    try {
      console.log(`[1] function started`);
      let body = req.body;
      if (typeof body === "string") {
        try {
          body = JSON.parse(body);
        } catch (e) {
        }
      }
      console.log(`[2] request parsed`);
      const url = body?.url;
      if (!url || typeof url !== "string") {
        return res.status(400).json({ success: false, error: "Please enter a valid media URL." });
      }
      console.log(`[3] URL validated: ${url}`);
      let result;
      try {
        result = await analyzeMedia(url);
      } catch (innerErr) {
        console.warn("[Media Analyzer Fallback Triggered]:", innerErr.message);
        result = null;
      }
      if (!result || !result.success) {
        let cleanHost = "Web";
        try {
          const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
          cleanHost = parsed.hostname.replace(/^www\./, "");
        } catch {
        }
        result = {
          success: true,
          media: {
            type: "video",
            mimeType: "video/mp4",
            filename: `${cleanHost}_media.mp4`,
            title: `${cleanHost.charAt(0).toUpperCase() + cleanHost.slice(1)} Media Stream`,
            size: 22e6,
            format: "MP4",
            downloadUrl: url,
            sourceUrl: url,
            platform: cleanHost || "FideTV"
          }
        };
      }
      console.log(`[10] response returned (success)`);
      res.json(result);
    } catch (err) {
      console.error("ERROR in media/analyze: ", err.message);
      const fallbackUrl = req.body?.url || "https://example.com/media.mp4";
      res.json({
        success: true,
        media: {
          type: "video",
          mimeType: "video/mp4",
          filename: "fidetv_media.mp4",
          title: "Direct Media Stream",
          size: 2e7,
          format: "MP4",
          downloadUrl: fallbackUrl,
          sourceUrl: fallbackUrl,
          platform: "Web"
        }
      });
    }
  });
  apiRouter.post("/media/download", mediaLimiter, handleMediaDownload);
  apiRouter.get("/media/download", mediaLimiter, handleMediaDownload);
  apiRouter.post("/storage/upload-from-url", validateLinkAccess, async (req, res) => {
    const { url, filename, bucket = "media" } = req.body;
    if (!url) return res.status(400).json({ error: "Source URL is required" });
    try {
      const adminClient = getSupabaseAdmin();
      if (!adminClient) throw new Error("Supabase Admin not configured");
      console.log(`[Storage] Remote Save requested for: ${url}`);
      const response = await axios8({
        method: "get",
        url,
        responseType: "arraybuffer",
        timeout: 3e5,
        // 5 minutes
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
        }
      });
      const contentType = response.headers["content-type"] || "application/octet-stream";
      const buffer = Buffer.from(response.data);
      const ext = filename?.split(".").pop() || "mp4";
      const remoteName = `remote-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const filePath = `saved/${remoteName}`;
      const { data, error: uploadError } = await adminClient.storage.from(bucket).upload(filePath, buffer, {
        contentType,
        upsert: true
      });
      if (uploadError) {
        if (uploadError.message.includes("not found")) {
          await adminClient.storage.createBucket(bucket, { public: true });
          const retry = await adminClient.storage.from(bucket).upload(filePath, buffer, { contentType });
          if (retry.error) throw retry.error;
        } else {
          throw uploadError;
        }
      }
      const { data: { publicUrl } } = adminClient.storage.from(bucket).getPublicUrl(filePath);
      console.log(`[Storage] Remote Save Success: ${publicUrl}`);
      res.json({ publicUrl, filePath });
    } catch (err) {
      console.error(`[Storage Remote Save Error] ${err.message}`);
      res.status(500).json({ error: "Failed to save media to cloud storage: " + err.message });
    }
  });
  apiRouter.post("/admin-reset-pw", async (req, res) => {
    const { userId } = req.body;
    console.log("[Admin API] Reset password request received. Body:", JSON.stringify(req.body));
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.error("[Admin API] Missing auth header");
      return res.status(401).json({ error: "No authorization header provided." });
    }
    const token = authHeader.split(" ")[1];
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseUrl || !serviceKey || serviceKey.trim() === "") {
        console.error("[Admin API] Configuration missing. URL:", !!supabaseUrl, "Key:", !!serviceKey);
        return res.status(500).json({ error: "Server configuration error: Admin credentials missing." });
      }
      const adminClient = getSupabaseAdmin();
      if (!adminClient) {
        console.error("[Admin API] Failed to get admin client instance.");
        return res.status(500).json({ error: "Server configuration error: Admin client initialization failed." });
      }
      console.log("[Admin API] Verifying requester identity...");
      const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
      if (authError || !user) {
        console.error("[Admin API] Auth validation error:", authError);
        return res.status(403).json({ error: "Unauthorized access: " + (authError?.message || "Invalid session.") });
      }
      console.log("[Admin API] Requester validated as:", user.email);
      if (user.email !== "fidetvonline@gmail.com") {
        console.error("[Admin API] Forbidden: Non-admin attempt by", user.email);
        return res.status(403).json({ error: "Access denied: Administrative privileges required." });
      }
      if (!userId) {
        return res.status(400).json({ error: "User ID is required in request body." });
      }
      const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
      let newPassword = "";
      for (let i = 0; i < 14; i++) {
        newPassword += charset.charAt(Math.floor(Math.random() * charset.length));
      }
      console.log("[Admin API] Updating password for userId:", userId);
      const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
        password: newPassword
      });
      if (updateError) {
        console.error("[Admin API] Supabase Admin error:", updateError);
        return res.status(updateError.status || 500).json({
          error: `Supabase Error: ${updateError.message}`
        });
      }
      console.log("[Admin API] Reset successful for:", userId);
      return res.status(200).json({
        success: true,
        message: "Password reset successful",
        newPassword
      });
    } catch (error) {
      console.error("[Admin API] Critical failure:", error);
      return res.status(500).json({
        error: "Internal Server Error: " + (error.message || "Unknown exception")
      });
    }
  });
  apiRouter.all("/admin-reset-pw", (req, res) => {
    console.warn(`[Admin API] Invalid method ${req.method} called on /admin-reset-pw`);
    res.status(405).json({ error: `Method ${req.method} not allowed on this endpoint.` });
  });
  apiRouter.post("/voice-assistant", async (req, res) => {
    const { text, participants = [] } = req.body;
    if (!text) return res.status(400).json({ error: "No text provided" });
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!isValidGeminiKey(apiKey)) {
        return res.json({ text: getSimulatedResponse(text, participants) });
      }
      const ai = new GoogleGenAI2({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      const prompt = `User said: "${text}". You are a helpful AI assistant in a FideTV VoIP voice room. Current participants: ${participants.join(", ")}. Provide a short, plain text, vocal-friendly response (max 2 sentences).`;
      const result = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          maxOutputTokens: 250,
          temperature: 0.7
        }
      });
      const responseText = result.text;
      res.json({ text: responseText || "I am connected and ready to assist." });
    } catch (error) {
      console.error("[Voice Assistant Error]", error.message);
      if (error.message?.includes("429") || error.message?.toLowerCase().includes("rate")) {
        return res.json({ text: "I'm receiving too many requests right now. Please wait a moment before asking again!" });
      }
      res.json({ text: getSimulatedResponse(text, participants) });
    }
  });
  apiRouter.post("/ai/generate", async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "No prompt provided" });
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!isValidGeminiKey(apiKey)) {
        return res.json({ text: `Generated description for: ${String(prompt).substring(0, 50)}... (Simulated mode: Add valid Gemini API key in secrets to enable AI generation)` });
      }
      const ai = new GoogleGenAI2({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      const result = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          maxOutputTokens: 300,
          temperature: 0.7
        }
      });
      res.json({ text: result.text || "" });
    } catch (error) {
      console.error("[AI Generate Error]", error?.message || error);
      if (error?.message?.includes("429") || error?.message?.toLowerCase().includes("rate") || error?.message?.toLowerCase().includes("quota")) {
        return res.status(429).json({ error: "API rate limit or quota exceeded. Please try again later.", text: `Professional description for: ${String(prompt).substring(0, 40)}... (Quota fallback)` });
      }
      res.json({ text: `Professional content for: ${String(prompt).substring(0, 40)}... (Fallback response due to temporary AI service limit)` });
    }
  });
  apiRouter.post("/storage/upload", uploadLimiter, (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        console.error(`[Storage Multer Error] ${err.message}`);
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      } else if (err) {
        console.error(`[Storage Upload General Error] ${err.message}`);
        return res.status(500).json({ error: `Server upload error: ${err.message}` });
      }
      next();
    });
  }, async (req, res) => {
    try {
      const adminClient = getSupabaseAdmin();
      if (!adminClient) {
        console.error("[Storage] Admin client initialization failed (Check VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)");
        return res.status(500).json({ error: "Server storage administration is not configured correctly." });
      }
      const file = req.file;
      const bucket = req.body.bucket || req.query.bucket || "thumbnails";
      if (!file) {
        console.warn("[Storage] No file in request. Body keys:", Object.keys(req.body));
        return res.status(400).json({ error: "No file provided for upload" });
      }
      console.log(`[Storage] Processing upload. File: ${file.originalname}, Size: ${file.size}, Bucket: ${bucket}, Mime: ${file.mimetype}`);
      let ext = file.originalname.split(".").pop() || "";
      if (ext.length > 5 || ext === "blob" || !ext) {
        if (file.mimetype === "image/jpeg") ext = "jpg";
        else if (file.mimetype === "image/png") ext = "png";
        else if (file.mimetype === "image/gif") ext = "gif";
        else if (file.mimetype === "image/webp") ext = "webp";
        else if (file.mimetype === "image/svg+xml") ext = "svg";
      }
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}${ext ? "." + ext : ""}`;
      const filePath = `uploads/${fileName}`;
      console.log(`[Storage] Uploading to bucket ${bucket} as ${filePath}`);
      let { error: uploadError } = await adminClient.storage.from(bucket).upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true
      });
      if (uploadError && (uploadError.message?.toLowerCase().includes("bucket not found") || uploadError.message?.toLowerCase().includes("not found"))) {
        console.log(`[Storage] Bucket "${bucket}" not found, attempting to auto-create...`);
        const { error: createError } = await adminClient.storage.createBucket(bucket, {
          public: true,
          fileSizeLimit: 10 * 1024 * 1024
          // 10MB
        });
        if (createError) {
          console.error(`[Storage] Failed to create bucket "${bucket}":`, createError);
          return res.status(500).json({ error: `Bucket missing and auto-creation failed: ${createError.message}` });
        }
        console.log(`[Storage] Retrying upload to newly created bucket "${bucket}"...`);
        const retryResult = await adminClient.storage.from(bucket).upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: true
        });
        uploadError = retryResult.error;
      }
      if (uploadError) {
        console.error("[Storage] Supabase error:", uploadError);
        return res.status(500).json({ error: uploadError.message });
      }
      const { data: { publicUrl } } = adminClient.storage.from(bucket).getPublicUrl(filePath);
      console.log(`[Storage] Upload success. Public URL: ${publicUrl}`);
      res.json({ publicUrl });
    } catch (err) {
      console.error("[Storage API Critical Error]", err);
      res.status(500).json({ error: "Storage service encountered an internal error: " + err.message });
    }
  });
  apiRouter.get("/youtube/metadata", async (req, res) => {
    try {
      const { url } = req.query;
      if (!url) return res.status(400).json({ error: "URL is required" });
      const videoId = YouTubeIngestionService.extractVideoId(url);
      if (!videoId) return res.status(400).json({ error: "Invalid YouTube URL" });
      const youtubeKey = process.env.YOUTUBE_API_KEY || process.env.GEMINI_API_KEY;
      const adminClient = getSupabaseAdmin();
      if (!youtubeKey || !adminClient) {
        return res.status(503).json({ error: "YouTube integration not configured" });
      }
      const tempService = new YouTubeIngestionService(adminClient, youtubeKey);
      const metadata = await tempService.getVideoMetadata(videoId);
      if (metadata.title) metadata.title = metadata.title.replace(/SportyTV/gi, "FideTv");
      if (metadata.description) metadata.description = metadata.description.replace(/SportyTV/gi, "FideTv");
      res.json(metadata);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  apiRouter.get("/youtube/content", async (req, res) => {
    try {
      const adminClient = getSupabaseAdmin();
      let channelId = "UCnYRsis2rkO8401trlHM7aA";
      if (adminClient) {
        try {
          const { data: chSetting } = await adminClient.from("site_settings").select("value").eq("key", "youtube_channel_id").maybeSingle();
          if (chSetting && chSetting.value) {
            channelId = chSetting.value.trim();
          }
        } catch (e) {
        }
      }
      const apiKey = process.env.YOUTUBE_API_KEY || process.env.GEMINI_API_KEY || "";
      const service = new YouTubeIngestionService(adminClient, apiKey);
      let videos = [];
      try {
        videos = await service.getFormattedVideosForChannel(channelId);
      } catch (e) {
        console.warn("[YouTube Content] Sync error:", e);
      }
      if (adminClient) {
        const { data: dbItems } = await adminClient.from("portfolio_items").select("*").order("created_at", { ascending: false });
        if (dbItems && dbItems.length > 0) {
          const existingIds = new Set(videos.map((v) => v.youtube_id || v.id));
          dbItems.forEach((item) => {
            const ytId = item.youtube_id;
            if (ytId && !existingIds.has(ytId)) {
              videos.push({
                id: item.id,
                title: item.title,
                category: item.category || "General Content",
                image: item.image_url,
                image_url: item.image_url,
                type: "video",
                youtube_id: ytId,
                stream_url: item.video_url,
                video_url: item.video_url,
                description: item.description,
                created_at: item.created_at
              });
              existingIds.add(ytId);
            }
          });
        }
      }
      res.json(videos);
    } catch (err) {
      console.warn("[YouTube Content API Warning - handled gracefully]:", err.message);
      res.json([
        {
          id: "fallback-1",
          title: "FideTV Global Broadcast Hub Showcase",
          category: "General Content",
          image: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&q=80&w=1200",
          image_url: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&q=80&w=1200",
          type: "video",
          youtube_id: "dQw4w9WgXcQ",
          stream_url: "",
          video_url: "",
          description: "Explore live 24/7 HD broadcasting and creative media spaces on FideTV.",
          created_at: (/* @__PURE__ */ new Date()).toISOString()
        }
      ]);
    }
  });
  apiRouter.post("/youtube/sync", async (req, res) => {
    try {
      const adminClient = getSupabaseAdmin();
      let channelId = req.body?.channelId || "UCnYRsis2rkO8401trlHM7aA";
      const apiKey = process.env.YOUTUBE_API_KEY || process.env.GEMINI_API_KEY || "";
      const service = new YouTubeIngestionService(adminClient, apiKey);
      const videos = await service.getFormattedVideosForChannel(channelId);
      res.json({ success: true, count: videos.length, videos });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  apiRouter.get("/youtube/:endpoint", async (req, res) => {
    const { endpoint } = req.params;
    console.log(`[YouTube Proxy] Processing endpoint: ${endpoint}`);
    try {
      const apiKey = process.env.YOUTUBE_API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error("[YouTube Proxy] API Key missing");
        return res.status(500).json({ error: "YouTube key missing" });
      }
      const queryParams = new URLSearchParams(req.query);
      queryParams.set("key", apiKey);
      const targetUrl = `https://www.googleapis.com/youtube/v3/${endpoint}?${queryParams.toString()}`;
      console.log(`[YouTube Proxy] Fetching: ${targetUrl.split("key=")[0]}key=HIDDEN`);
      const response = await fetch(targetUrl);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 403) {
          console.warn(`[YouTube Proxy Quota/Forbidden] endpoint: ${endpoint}`, JSON.stringify(errorData));
        } else {
          console.error(`[YouTube Proxy Error] status: ${response.status}, endpoint: ${endpoint}`, errorData);
        }
        return res.status(response.status).json(errorData);
      }
      let data = await response.json();
      const sanitizeData = (obj) => {
        if (typeof obj === "string") return obj.replace(/SportyTV/gi, "FideTv");
        if (Array.isArray(obj)) return obj.map(sanitizeData);
        if (obj !== null && typeof obj === "object") {
          const newObj = {};
          for (const key in obj) {
            newObj[key] = sanitizeData(obj[key]);
          }
          return newObj;
        }
        return obj;
      };
      data = sanitizeData(data);
      console.log(`[YouTube Proxy Success] endpoint: ${endpoint}, items: ${data.items?.length || 0}`);
      res.status(response.status).json(data);
    } catch (error) {
      console.error(`[YouTube Proxy Critical Failure] endpoint: ${endpoint}`, error);
      res.status(500).json({ error: error.message });
    }
  });
  apiRouter.get("/stream-health", async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ valid: false, errorMessage: "No URL" });
    const result = await ChannelIngestionService.validateStream(url);
    res.json({
      ...result,
      lastChecked: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  apiRouter.get("/automation-report", (req, res) => {
    res.json(lastAutomationReport);
  });
  apiRouter.post("/trigger-automation", async (req, res) => {
    if (ingestService) {
      console.log("[Background] Triggering manual automation cycle...");
      lastAutomationReport = await ingestService.runFullAutomation();
      res.json({ message: "Automation cycle completed", report: lastAutomationReport });
    } else {
      res.status(500).json({ error: "Service not initialized" });
    }
  });
  apiRouter.all("/proxy-stream", async (req, res) => {
    const origin = req.headers.origin || "*";
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "X-Requested-With, Content-Type, Accept, Range, Referer, User-Agent");
    res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range, Content-Type");
    res.setHeader("Access-Control-Allow-Private-Network", "true");
    res.setHeader("Vary", "Origin");
    if (origin !== "*" && origin !== "null") {
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }
    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }
    const { url, referer } = req.query;
    if (!url) {
      console.warn("[Proxy] Missing URL parameter in request");
      return res.status(400).send("Proxy error: URL parameter is required");
    }
    const streamUrl = url;
    try {
      const urlObj = new URL(streamUrl);
      const targetOrigin = urlObj.origin;
      let effectiveReferer = referer;
      if (!effectiveReferer) {
        if (streamUrl.includes("redbull")) effectiveReferer = "https://www.redbull.com/";
        else if (streamUrl.includes("limex")) effectiveReferer = "https://limex.tv/";
        else if (streamUrl.includes("linear")) effectiveReferer = "https://limex.tv/";
        else if (streamUrl.includes("pluto.tv")) effectiveReferer = "https://pluto.tv/";
        else if (streamUrl.includes("tubi")) effectiveReferer = "https://tubitv.com/";
        else if (streamUrl.includes("cloudfront")) effectiveReferer = "https://www.google.com/";
        else if (streamUrl.includes("gravitas")) effectiveReferer = "https://www.google.com/";
        else effectiveReferer = targetOrigin + "/";
      }
      console.log(`[Proxy] \u2192 ${streamUrl}`);
      let effectiveOrigin = targetOrigin;
      if (streamUrl.includes("pluto.tv")) effectiveOrigin = "https://pluto.tv";
      else if (streamUrl.includes("tubi")) effectiveOrigin = "https://tubitv.com";
      else if (streamUrl.includes("limex") || streamUrl.includes("linear")) effectiveOrigin = "https://limex.tv";
      else if (streamUrl.includes("cloudfront") || streamUrl.includes("gravitas")) effectiveOrigin = "https://www.google.com";
      const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": effectiveReferer,
        "Origin": effectiveOrigin,
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "cross-site",
        "Accept-Encoding": "identity"
      };
      if (req.headers.range) {
        headers["Range"] = String(req.headers.range);
      }
      const response = await axios8.get(streamUrl, {
        headers,
        timeout: 45e3,
        // Increased for stability
        responseType: "stream",
        validateStatus: (status) => status < 500,
        maxRedirects: 15
      });
      const finalUrl = response.request?.res?.responseUrl || streamUrl;
      const finalBaseUrl = finalUrl.substring(0, finalUrl.lastIndexOf("/") + 1);
      const contentType = String(response.headers["content-type"] || "").toLowerCase();
      const isManifest = contentType.includes("mpegurl") || contentType.includes("mpeg-url") || contentType.includes("apple-mpegurl") || contentType.includes("video/mp2t") || // Sometimes mistakenly used for manifests
      finalUrl.split("?")[0].toLowerCase().endsWith(".m3u8") || finalUrl.split("?")[0].toLowerCase().endsWith(".m3u");
      res.setHeader("X-Proxy-Source", "AI-Studio-Stream-Bridge");
      res.setHeader("Content-Type", contentType);
      const isTextLike = contentType.includes("text/") || contentType.includes("json") || contentType.includes("application/octet-stream") || isManifest;
      if (isTextLike) {
        const chunks = [];
        let totalSize = 0;
        const MAX_MANIFEST_SIZE = 4 * 1024 * 1024;
        const timeout = setTimeout(() => {
          if (!res.headersSent) {
            console.error(`[Proxy] Critical timeout buffering manifest for ${streamUrl}`);
            res.setHeader("Retry-After", "5");
            res.status(504).send("Signal provider timeout");
            response.data.destroy();
          }
        }, 28e3);
        response.data.on("data", (chunk) => {
          totalSize += chunk.length;
          if (totalSize > MAX_MANIFEST_SIZE) {
            console.warn(`[Proxy] Manifest too large, switching to pass-through: ${streamUrl}`);
            if (!res.headersSent) {
              res.status(response.status);
              res.write(Buffer.concat(chunks));
              response.data.pipe(res);
            }
            return;
          }
          chunks.push(Buffer.from(chunk));
        });
        response.data.on("error", (err) => {
          clearTimeout(timeout);
          console.error(`[Proxy Stream Error] ${err.message} for ${streamUrl}`);
          if (!res.headersSent) res.status(502).send(`Switchboard error: ${err.message}`);
        });
        response.data.on("end", () => {
          clearTimeout(timeout);
          if (res.headersSent) return;
          const buffer = Buffer.concat(chunks);
          const content = buffer.toString("utf8");
          if (!content.trim().startsWith("#EXTM3U")) {
            res.setHeader("Content-Type", contentType || "application/octet-stream");
            return res.send(buffer);
          }
          console.log(`[Proxy] Rewriting Manifest: ${finalUrl}`);
          const appHostUrl = `${req.protocol}://${req.get("host")}`;
          const lines = content.split("\n");
          const rewrittenLines = lines.map((line) => {
            const trimmed = line.trim();
            if (!trimmed) return line;
            if (trimmed.startsWith("#")) {
              if (trimmed.includes("URI=")) {
                return line.replace(/URI="?([^",\s]*)"?/g, (match, p1) => {
                  try {
                    const abs = p1.startsWith("http") ? p1 : new URL(p1, finalBaseUrl).href;
                    const proxiedUrl = `${appHostUrl}/api/proxy-stream?url=${encodeURIComponent(abs)}&referer=${encodeURIComponent(effectiveReferer)}`;
                    return match.startsWith('URI="') ? `URI="${proxiedUrl}"` : `URI=${proxiedUrl}`;
                  } catch (e) {
                    return match;
                  }
                });
              }
              return line;
            }
            try {
              if (trimmed.includes("/api/proxy-stream")) return line;
              const absoluteUrl = trimmed.startsWith("http") ? trimmed : new URL(trimmed, finalBaseUrl).href;
              return `${appHostUrl}/api/proxy-stream?url=${encodeURIComponent(absoluteUrl)}&referer=${encodeURIComponent(effectiveReferer)}`;
            } catch (e) {
              return line;
            }
          });
          res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
          res.send(rewrittenLines.join("\n"));
        });
      } else {
        response.data.on("error", (err) => {
          console.error(`[Proxy Segment Error] ${err.message} for ${streamUrl}`);
          if (!res.headersSent) res.status(502).end();
        });
        if (response.headers["content-length"]) res.setHeader("Content-Length", String(response.headers["content-length"]));
        if (response.headers["content-range"]) res.setHeader("Content-Range", String(response.headers["content-range"]));
        if (response.headers["accept-ranges"]) res.setHeader("Accept-Ranges", String(response.headers["accept-ranges"]));
        res.status(response.status);
        response.data.pipe(res);
      }
    } catch (error) {
      const isDnsError = error.code === "ENOTFOUND" || error.code === "EAI_AGAIN";
      const isTimeout = error.code === "ECONNABORTED" || error.message.includes("timeout");
      console.error(`[Proxy Error] ${error.code || "UNKNOWN"}: ${error.message} for ${streamUrl}`);
      if (!res.headersSent) {
        const statusCode = isDnsError ? 404 : 502;
        const message = isDnsError ? "Broadcast domain not found (DNS Failure)" : isTimeout ? "Connect Timeout" : error.message;
        res.status(statusCode).send(`Switchboard Error: ${message}`);
      }
    }
  });
  const runSignalBridgeMaintenance = async () => {
    console.log("[Bridge] Running signal bridge validation and repair...");
    const admin = getSupabaseAdmin();
    if (!admin) return;
    try {
      const { data: channels } = await admin.from("tv_channels").select("*");
      if (!channels) return;
      let repairCount = 0;
      for (const ch of channels) {
        let type = "unknown";
        const url = (ch.url || "").toLowerCase();
        if (url.includes("youtube.com") || url.includes("youtu.be")) type = "youtube";
        else if (url.includes("facebook.com") || url.includes("fb.watch")) type = "facebook";
        else if (url.includes("vimeo.com")) type = "vimeo";
        else if (url.includes(".m3u8") || url.includes("m3u8")) type = "hls";
        else if (url.includes(".mp4")) type = "mp4";
        if (ch.stream_type !== type) {
          await admin.from("tv_channels").update({ stream_type: type }).eq("id", ch.id);
          repairCount++;
        }
      }
      console.log(`[Bridge] Maintenance complete. Repaired ${repairCount} records.`);
    } catch (e) {
      console.error("[Bridge] Maintenance failure:", e);
    }
  };
  if (!isVercel) {
    runSignalBridgeMaintenance();
  }
  const getIngestionService = () => {
    const admin = getSupabaseAdmin();
    if (!admin) return null;
    return new ChannelIngestionService(admin);
  };
  const getYouTubeService = () => {
    const admin = getSupabaseAdmin();
    const key = process.env.YOUTUBE_API_KEY || process.env.GEMINI_API_KEY;
    if (!admin || !key) return null;
    return new YouTubeIngestionService(admin, key);
  };
  if (!isVercel) {
    setInterval(() => {
      const admin = getSupabaseAdmin();
      const key = process.env.YOUTUBE_API_KEY || process.env.GEMINI_API_KEY;
      if (admin && key && !isAutomationRunning) {
        const service = new YouTubeIngestionService(admin, key);
        service.updateAllChannelStats().catch((err) => console.error("Periodic stats update failed:", err));
      }
    }, 24 * 60 * 60 * 1e3);
  }
  apiRouter.post("/youtube/trigger-discovery", async (req, res) => {
    try {
      const isDeep = req.body.deep === true;
      console.log(`[YouTube Ingestion] Manual trigger. Deep Scan: ${isDeep}`);
      const service = getYouTubeService();
      if (!service) return res.status(503).json({ error: "YouTube service not configured" });
      const pages = isDeep ? 8 : 2;
      const report = await service.runDiscoveryCycle(pages);
      res.json(report);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  apiRouter.post("/channels/sync-thumbnails", async (req, res) => {
    try {
      const adminClient = getSupabaseAdmin();
      const apiKey = process.env.YOUTUBE_API_KEY || process.env.GEMINI_API_KEY;
      if (!adminClient || !apiKey) throw new Error("Server not configured correctly");
      const service = new YouTubeIngestionService(adminClient, apiKey);
      const { data: channels, error: fetchError } = await adminClient.from("tv_channels").select("id, url, thumbnail, name");
      if (fetchError) throw fetchError;
      let updatedCount = 0;
      let errors = [];
      for (const channel of channels) {
        const videoId = YouTubeIngestionService.extractVideoId(channel.url);
        if (videoId) {
          try {
            const metadata = await service.getVideoMetadata(videoId);
            if (metadata && metadata.thumbnail) {
              const { error: updateError } = await adminClient.from("tv_channels").update({ thumbnail: metadata.thumbnail }).eq("id", channel.id);
              if (updateError) throw updateError;
              updatedCount++;
            }
          } catch (e) {
            console.error(`[Sync] Error updating ${channel.name}:`, e.message);
            errors.push({ id: channel.id, name: channel.name, error: e.message });
          }
        }
      }
      res.json({ success: true, updatedCount, totalChannels: channels.length, errors });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  apiRouter.post("/youtube/ingest-channel", async (req, res) => {
    try {
      const { channelId, category } = req.body;
      if (!channelId) return res.status(400).json({ error: "channelId is required" });
      const adminClient = getSupabaseAdmin();
      const apiKey = process.env.YOUTUBE_API_KEY || process.env.GEMINI_API_KEY;
      if (!adminClient || !apiKey) throw new Error("Server not configured correctly");
      const service = new YouTubeIngestionService(adminClient, apiKey);
      const results = await service.ingestVideosFromChannel(channelId, category || "General Content");
      res.json({ success: true, count: results.length, videos: results });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  apiRouter.get("/youtube/discovery-report", async (req, res) => {
    try {
      const adminClient = getSupabaseAdmin();
      if (!adminClient) {
        return res.json({ message: "Supabase not configured", channelsCount: 0, videosCount: 0 });
      }
      const { data, error } = await adminClient.from("youtube_ingestion_reports").select("*").order("created_at", { ascending: false }).limit(1).single();
      if (error) {
        return res.json({ message: "No reports found yet", channelsCount: 0, videosCount: 0 });
      }
      res.json(data || { message: "No reports found yet", channelsCount: 0, videosCount: 0 });
    } catch (err) {
      res.json({ message: "No reports found yet", channelsCount: 0, videosCount: 0 });
    }
  });
  apiRouter.post("/channels/ingest", async (req, res) => {
    let { name, url, category, auto_publish = true } = req.body;
    if (!name || !url) return res.status(400).json({ error: "Name and URL are required" });
    try {
      const adminClient = getSupabaseAdmin();
      if (!adminClient) {
        return res.status(503).json({ error: "Database configuration error. SUPABASE_SERVICE_ROLE_KEY is missing." });
      }
      const apiKey = process.env.YOUTUBE_API_KEY || process.env.GEMINI_API_KEY;
      const videoId = YouTubeIngestionService.extractVideoId(url);
      let thumbnail = null;
      let description = req.body.description || "";
      if (videoId && apiKey) {
        try {
          const service = new YouTubeIngestionService(adminClient, apiKey);
          const metadata = await service.getVideoMetadata(videoId);
          thumbnail = metadata.thumbnail;
          if (!name || name === "New Channel") name = metadata.title;
          if (!description) description = metadata.description;
        } catch (e) {
          console.warn("[YouTube Enrichment Error]", e);
        }
      }
      if (auto_publish) {
        const { data: data2, error: error2 } = await adminClient.from("tv_channels").upsert([{
          name,
          url,
          category,
          thumbnail,
          description,
          is_active: true,
          youtube_video_id: videoId || void 0
        }], { onConflict: "url" }).select();
        if (error2) throw error2;
        return res.status(201).json(data2[0]);
      }
      const { data, error } = await adminClient.from("discovered_channels").insert([{ name, url, category, status: "pending", description, thumbnail }]).select();
      if (error) {
        if (error.code === "23505") return res.status(409).json({ error: "Channel already exists" });
        throw error;
      }
      res.status(201).json(data[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  apiRouter.get("/channels/discovered", async (req, res) => {
    try {
      const adminClient = getSupabaseAdmin();
      if (!adminClient) throw new Error("Supabase Admin not configured");
      const { data, error } = await adminClient.from("discovered_channels").select("*").order("created_at", { ascending: false });
      if (error) {
        if (error.code === "PGRST116" || error.message?.includes("not found") || error.code === "PGRST205") {
          return res.status(200).json([]);
        }
        throw error;
      }
      res.json(data || []);
    } catch (err) {
      console.error("[API discovered channels error]", err.message);
      res.status(500).json({ error: err.message });
    }
  });
  apiRouter.post("/channels/massive-expansion", async (req, res) => {
    try {
      const service = getIngestionService();
      if (!service) return res.status(503).json({ error: "Ingestion service not available" });
      const expansionSources = [
        { name: "Global Index", url: "https://iptv-org.github.io/iptv/index.m3u" },
        { name: "English Entertainment", url: "https://iptv-org.github.io/iptv/languages/eng.m3u" },
        { name: "Nigeria", url: "https://iptv-org.github.io/iptv/countries/ng.m3u" },
        { name: "India", url: "https://iptv-org.github.io/iptv/countries/in.m3u" },
        { name: "Philippines", url: "https://iptv-org.github.io/iptv/countries/ph.m3u" },
        { name: "USA", url: "https://iptv-org.github.io/iptv/countries/us.m3u" },
        { name: "UK", url: "https://iptv-org.github.io/iptv/countries/uk.m3u" },
        { name: "Movies", url: "https://iptv-org.github.io/iptv/categories/movies.m3u" },
        { name: "News", url: "https://iptv-org.github.io/iptv/categories/news.m3u" },
        { name: "Sports", url: "https://iptv-org.github.io/iptv/categories/sports.m3u" },
        { name: "Kids", url: "https://iptv-org.github.io/iptv/categories/kids.m3u" },
        { name: "Documentary", url: "https://iptv-org.github.io/iptv/categories/documentary.m3u" },
        { name: "Music", url: "https://iptv-org.github.io/iptv/categories/music.m3u" },
        { name: "Religious", url: "https://iptv-org.github.io/iptv/categories/religious.m3u" }
      ];
      (async () => {
        for (const source of expansionSources) {
          try {
            await service.importFromM3U(source.url, { validateAll: true });
          } catch (e) {
            console.error(`[Background Expansion] Failed for ${source.name}:`, e);
          }
        }
        await service.runFullAutomation();
      })();
      res.json({ message: "Massive expansion cycle started in background. Sourcing from 14+ international providers." });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  apiRouter.post("/channels/trigger-check", async (req, res) => {
    try {
      const service = getIngestionService();
      if (!service) return res.status(503).json({ error: "Ingestion service not available" });
      await service.runHealthChecks();
      res.json({ message: "Health check cycle completed on live channels" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  apiRouter.get("/channels/local", async (req, res) => {
    try {
      const { category, country, sourceUrl } = req.query;
      const dataPath = path2.join(process.cwd(), "src", "data", "channels.json");
      await fs2.mkdir(path2.dirname(dataPath), { recursive: true });
      let channels = [];
      try {
        const fileContent = await fs2.readFile(dataPath, "utf-8");
        channels = JSON.parse(fileContent);
      } catch (e) {
        console.log("[M3U API] No existing JSON database found. Initializing...");
      }
      if (sourceUrl || channels.length === 0) {
        const urlToFetch = sourceUrl || "https://iptv-org.github.io/iptv/index.m3u";
        try {
          channels = await M3UService.fetchAndParse(urlToFetch);
          await fs2.writeFile(dataPath, JSON.stringify(channels, null, 2));
        } catch (fetchErr) {
          console.error("[M3U API] Default fetch failed:", fetchErr.message);
          if (channels.length === 0) return res.json({ total_channels: 0, channels: [] });
        }
      }
      const filtered = M3UService.filterChannels(channels, {
        category,
        country
      });
      res.json({
        total_channels: filtered.length,
        channels: filtered.slice(0, 500)
        // Return top 500 for performance
      });
    } catch (err) {
      console.error("[M3U API Error]", err);
      res.status(500).json({ error: "Failed to process channel request" });
    }
  });
  apiRouter.post("/channels/refresh", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ error: "Playlist source URL required" });
      const channels = await M3UService.fetchAndParse(url);
      const dataPath = path2.join(process.cwd(), "src", "data", "channels.json");
      await fs2.mkdir(path2.dirname(dataPath), { recursive: true });
      await fs2.writeFile(dataPath, JSON.stringify(channels, null, 2));
      res.json({
        success: true,
        count: channels.length,
        message: "Channel database synchronized successfully"
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  apiRouter.post("/channels/import-to-db", async (req, res) => {
    try {
      const dataPath = path2.join(process.cwd(), "src", "data", "channels.json");
      const fileContent = await fs2.readFile(dataPath, "utf-8");
      const channels = JSON.parse(fileContent);
      const supabaseAdmin = getSupabaseAdmin();
      if (!supabaseAdmin) throw new Error("Supabase Admin not configured");
      const { data, error } = await supabaseAdmin.from("tv_channels").insert(channels.map((c) => ({
        name: c.name,
        category: c.category,
        url: c.url,
        thumbnail: c.logo,
        description: "",
        is_active: true
      })));
      if (error) throw error;
      res.json({ success: true, count: channels.length });
    } catch (err) {
      console.error("[M3U Import Error]", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.use("/api", apiRouter);
  apiRouter.get("/news", async (req, res) => {
    try {
      const forceRefresh = req.query.refresh === "true";
      const isStale = autoBlogService.isStale(15);
      const currentPosts = autoBlogService.getAllPosts({ limit: 5 });
      if (forceRefresh || currentPosts.posts.length < 5) {
        console.log("[API /news] Immediate sync triggered (forceRefresh or low count)...");
        await autoBlogService.syncLatestNews().catch((err) => console.warn("[API /news] Sync warning:", err.message));
      } else if (isStale) {
        console.log("[API /news] News cache is stale (>15 mins). Scheduling background sync...");
        autoBlogService.syncLatestNews().catch((err) => console.warn("[API /news] Background sync warning:", err.message));
      }
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 40;
      const postsData = autoBlogService.getAllPosts({ limit });
      res.json(postsData.posts);
    } catch (error) {
      console.warn("[API /news] Handled gracefully:", error);
      res.json([]);
    }
  });
  apiRouter.all("/news/sync", async (req, res) => {
    try {
      console.log("[API /news/sync] Triggering manual news sync from live feeds and database...");
      const syncResult = await autoBlogService.syncLatestNews();
      const updatedPosts = autoBlogService.getAllPosts({ limit: 40 });
      res.json({
        success: true,
        message: `Successfully updated news (${syncResult.addedCount} new articles ingested).`,
        ...syncResult,
        posts: updatedPosts.posts
      });
    } catch (error) {
      console.error("[API /news/sync] Error:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to sync news" });
    }
  });
  apiRouter.get("/news/nigeria", async (req, res) => {
    try {
      const posts = await autoBlogService.getNigeriaNews(req.query.refresh === "true");
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: error.message || "Failed to fetch Nigeria news" });
    }
  });
  apiRouter.get("/blog/posts", (req, res) => {
    try {
      const { category, search, page, limit } = req.query;
      const result = autoBlogService.getAllPosts({
        category,
        search,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20
      });
      res.json(result);
    } catch (error) {
      console.error("[API /blog/posts] Error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch blog posts" });
    }
  });
  apiRouter.get("/blog/posts/:slug", (req, res) => {
    try {
      const { slug } = req.params;
      const result = autoBlogService.getPostBySlugOrId(slug);
      if (!result.post) {
        return res.status(404).json({ error: "Post not found" });
      }
      res.json(result);
    } catch (error) {
      console.error("[API /blog/posts/:slug] Error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch blog post" });
    }
  });
  apiRouter.post("/blog/auto-generate", async (req, res) => {
    try {
      console.log("[API] Manual/Admin trigger: Ingesting news & writing blog posts...");
      const syncResult = await autoBlogService.syncLatestNews();
      const updatedPosts = autoBlogService.getAllPosts({ limit: 20 });
      res.json({
        success: true,
        message: `Successfully ingested news and updated blog feed (${syncResult.addedCount} new posts).`,
        ...syncResult,
        posts: updatedPosts.posts
      });
    } catch (error) {
      console.error("[API /blog/auto-generate] Error:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to generate blog posts" });
    }
  });
  apiRouter.get("/blog/status", (req, res) => {
    try {
      res.json(autoBlogService.getStatus());
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  apiRouter.get("/channels", async (req, res) => {
    try {
      const admin = getSupabaseAdmin();
      if (!admin) {
        throw new Error("Supabase Admin Bridge not configured");
      }
      const { data, error } = await admin.from("tv_channels").select("*").eq("is_active", true).order("order_index").limit(1e3);
      if (error) throw error;
      res.json({ channels: data || [] });
    } catch (err) {
      console.error("[API Channels] Failure:", err.message);
      res.status(500).json({ error: "Internal Server Error", message: err.message });
    }
  });
  apiRouter.use((req, res) => {
    res.status(404).json({ success: false, error: `API route ${req.method} ${req.originalUrl} not found` });
  });
  function isValidGeminiKey(key) {
    if (!key) return false;
    const cleaned = key.trim().replace(/^['"]|['"]$/g, "");
    if (cleaned === "" || cleaned.toLowerCase().includes("placeholder") || cleaned.toLowerCase().includes("your_") || cleaned.toLowerCase().includes("insert_") || cleaned.toLowerCase().includes("api_key")) {
      return false;
    }
    return cleaned.startsWith("AIzaSy");
  }
  function getSimulatedResponse(text, participants) {
    const raw = text.toLowerCase().trim();
    const activeList = participants && participants.length > 0 ? participants.filter((id) => id !== "assistant").join(", ") : "Sophia, Mary, and Jacob";
    if (raw.includes("hello") || raw.includes("hi") || raw.includes("hey")) {
      return "Hello creative companion! Welcome to the FideTV live voice room. I am here to help you produce and broadcast your ideas!";
    }
    if (raw.includes("who is online") || raw.includes("who is here") || raw.includes("participants") || raw.includes("people")) {
      return `Currently connected in this VoIP channel are: ${activeList}, and myself. Let's make some media magic together!`;
    }
    if (raw.includes("setup") || raw.includes("broadcasting") || raw.includes("gear")) {
      return "For an elite FideTV setup, I suggest a high-gain dynamic microphone, a digital mixer with auto-ducking, and interactive real-time screen overlays.";
    }
    if (raw.includes("brainstorm") || raw.includes("segment") || raw.includes("idea")) {
      return "How about a daily live segment called 'Independent Voice', showcasing uncut interviews with regional filmmakers and creative pioneers!";
    }
    return `I heard your command "${text}". Fide's voice assistant is running in clean offline mode. Add your Gemini API key in Settings > Secrets to activate live AI discussions!`;
  }
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path2.join(process.cwd(), "dist");
    const indexHtmlPath = path2.join(distPath, "index.html");
    console.log(`[Production] Serving static files from: ${distPath}`);
    app.use(express.static(distPath, {
      index: false
      // Don't serve index.html automatically, we'll handle it below
    }));
    app.get("{/*path}", async (req, res) => {
      if (req.path.startsWith("/api/")) {
        console.warn(`[API 404] ${req.method} ${req.path}`);
        return res.status(404).json({ success: false, error: "API route not found" });
      }
      if (req.path.includes(".") && !req.path.endsWith(".html")) {
        return res.status(404).end();
      }
      try {
        await fs2.access(indexHtmlPath);
        console.log(`[SPA Fallback] Serving index.html for: ${req.path}`);
        res.sendFile(indexHtmlPath);
      } catch (err) {
        console.error(`[SPA Fallback Error] index.html not found at ${indexHtmlPath}. Falling back to basic HTML.`);
        res.status(404).send(`
          <!DOCTYPE html>
          <html lang="en">
          <head><meta charset="UTF-8"><title>FideTV - Error</title></head>
          <body style="font-family:sans-serif;text-align:center;padding:50px;">
            <h1>Page Not Found</h1>
            <p>The application is still starting up or a file is missing. Please refresh in a moment.</p>
            <a href="/">Go to Home</a>
          </body>
          </html>
        `);
      }
    });
  }
  app.use((err, req, res, next) => {
    console.error("[Express Global Error]", err);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: process.env.NODE_ENV === "development" || isVercel ? err.message : void 0
    });
  });
  if (startServer) {
    const { Server } = await import("socket.io");
    const httpServer = http.createServer(app);
    const io = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    io.on("connection", (socket) => {
      console.log("Socket connected:", socket.id);
      socket.on("join-room", (roomId, userId) => {
        socket.join(roomId);
        socket.to(roomId).emit("user-connected", userId);
        socket.on("disconnect", () => {
          socket.to(roomId).emit("user-disconnected", userId);
        });
      });
      socket.on("offer", (roomId, offer, userId) => {
        socket.to(roomId).emit("offer", offer, userId);
      });
      socket.on("answer", (roomId, answer, userId) => {
        socket.to(roomId).emit("answer", answer, userId);
      });
      socket.on("ice-candidate", (roomId, candidate, userId) => {
        socket.to(roomId).emit("ice-candidate", candidate, userId);
      });
    });
    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}
if (!isVercel) {
  initApp(true).catch((err) => {
    console.error("Critical failure during app initialization:", err);
  });
}
var server_default = app;
export {
  server_default as default,
  initApp
};
