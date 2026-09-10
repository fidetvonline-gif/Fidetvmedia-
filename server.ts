import express from "express";
import http from "http";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { ChannelIngestionService } from "./src/services/channelIngestionService.js";
import { YouTubeIngestionService } from "./src/services/youtubeIngestionService.js";
import { M3UService } from "./src/services/m3uService.js";
import multer from "multer";
import fs from "fs/promises";
import rateLimit from "express-rate-limit";
import { analyzeMedia, handleMediaDownload } from "./server/media/index.js";

dotenv.config();

const app = express();
app.use(cors());
app.set("trust proxy", 1);
const PORT = 3000;

// Apply basic rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: "Too many requests from this IP, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  message: "Too many uploads from this IP, please try again later",
});

const mediaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  message: { success: false, error: "Too many media requests. Please try again after a few minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", apiLimiter);

const upload = multer({ 
  limits: { fileSize: 10 * 1024 * 1024 },
  storage: multer.memoryStorage()
});

// Check if we are running in a serverless environment (like Vercel)
const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL_URL;

let _supabaseAdmin: any = null;
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

export async function initApp(startServer = true) {
  // Global Security Headers Middleware
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://s.ytimg.com https://js.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://js.stripe.com; connect-src 'self' https://*.supabase.co https://*.googleapis.com wss://*.supabase.co; frame-ancestors 'self' https://*.google.com https://ai.studio;");
    next();
  });

  // Store the last automation report
  let lastAutomationReport: any = { status: "No cycle run yet" };

  // Database Setup
  const supabase = getSupabaseAdmin();
  const ingestService = supabase ? new ChannelIngestionService(supabase) : null;

  // Background Automation Task (Consolidated)
  let isAutomationRunning = false;
  if (ingestService && !isVercel) {
    console.log("[Background] Starting automation scheduler...");
    
    // Massive Ingestion: Only run this ONCE after 10 minutes if not already running
    const expansionSources = [
      { name: 'Global Index', url: 'https://iptv-org.github.io/iptv/index.m3u' },
      { name: 'Nigeria', url: 'https://iptv-org.github.io/iptv/countries/ng.m3u' }
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
    }, 10 * 60 * 1000);

    // Schedule periodic runs - Only once every 12 hours
    setInterval(async () => {
      if (isAutomationRunning) return;
      isAutomationRunning = true;
      try {
        console.log("[Background] Running scheduled automation cycle...");
        lastAutomationReport = await ingestService.runFullAutomation();
      } finally {
        isAutomationRunning = false;
      }
    }, 12 * 60 * 60 * 1000);
  }

  const apiRouter = express.Router();
  apiRouter.use(express.json());

  const { default: meetingRoutes } = await import("./src/services/api/meetingRoutes.js");
  apiRouter.use("/meeting", meetingRoutes);
  apiRouter.use((req, res, next) => {
    console.log(`[API Router] ${req.method} ${req.url}`);
    next();
  });

  // Health check endpoint
  apiRouter.get("/fidesave-health", (req, res) => {
    res.json({
      status: "ok",
      service: "fidesave",
      environment: process.env.VERCEL ? "vercel-serverless" : "container",
      timestamp: new Date().toISOString()
    });
  });

  apiRouter.get("/health-check", async (req, res) => {
    const admin = getSupabaseAdmin();
    const results: any = {
      status: "checking",
      timestamp: new Date().toISOString(),
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
      // 1. Connection check
      const startTime = Date.now();
      const { data: testData, error: testError } = await admin.from('tv_channels').select('id').limit(1);
      results.latency_ms = Date.now() - startTime;

      if (testError) {
        results.status = "error";
        results.database = `error: ${testError.message}`;
      } else {
        results.database = "connected";
      }

      // ... other health checks (truncated for brevity here)
      return res.json(results);
    } catch (err: any) {
      results.status = "error";
      results.error_details = err.message;
      return res.status(500).json(results);
    }
  });

  // Unified middleware to validate access permissions, ensuring users and admins have equal access based on 'profiles' table
  const validateLinkAccess = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    const adminClient = getSupabaseAdmin();
    
    // Default to guest
    (req as any).userProfile = { id: 'guest', role: 'guest' };

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
      // Add timeout to auth check to prevent hanging
      const authPromise = adminClient.auth.getUser(token);
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Auth timeout")), 5000));
      
      const { data: { user }, error: authError } = await (Promise.race([authPromise, timeoutPromise]) as any);
      
      if (authError || !user) {
         console.warn("[AuthMiddleware] Session invalid or expired.");
         return next();
      }

      const { data: profile } = await adminClient
         .from('profiles')
         .select('id, role, status')
         .eq('id', user.id)
         .maybeSingle();
      
      if (profile && (profile.status === 'suspended' || profile.status === 'blocked')) {
         return res.status(403).json({ error: "Your account is currently restricted from accessing this feature." });
      }

      (req as any).userProfile = profile || { id: user.id, role: 'user' };
      next();
    } catch (e: any) {
      next();
    }
  };

  // Helper for TMDB API calls
  const fetchTMDB = async (endpoint: string, params: any = {}) => {
    const tmdbKey = process.env.TMDB_API_KEY;
    if (!tmdbKey || tmdbKey === "YOUR_TMDB_API_KEY" || tmdbKey.length < 10) {
      console.warn("[TMDB] API Key missing or default");
      return null;
    }
    try {
      const response = await axios.get(`https://api.themoviedb.org/3${endpoint}`, {
        params: { api_key: tmdbKey, ...params },
        headers: { 'User-Agent': 'FideTV-Agent/1.0' },
        timeout: 10000
      });
      return response.data;
    } catch (e: any) {
      console.error(`[TMDB Error] ${endpoint}:`, e.response?.data || e.message);
      return null;
    }
  };

  // Helper for OMDB fallback
  const fetchOMDB = async (title: string) => {
    const omdbKey = process.env.OMDB_API_KEY;
    if (!omdbKey) return null;
    try {
      const response = await axios.get(`https://www.omdbapi.com/`, {
        params: { apikey: omdbKey, t: title },
        timeout: 5000
      });
      return response.data;
    } catch (e) {
      return null;
    }
  };

  // Video Downloader search endpoint - Using TMDB with robust fallback catalog
  apiRouter.get("/video-search", validateLinkAccess, async (req, res) => {
    try {
      const { q } = req.query;
      const query = (q as string || '').trim();
      const userProfile = (req as any).userProfile || { id: 'guest', role: 'guest' };
      console.log(`[Universal-Search] Query: "${query || 'Trending'}" | From: ${userProfile.id} (${userProfile.role})`);
      
      const allResults: any[] = [];
      const diagnostics: any[] = [];

      // Curated Blockbusters for instant offline/fallback catalog
      const FALLBACK_MOVIES = [
        { id: 'tmdb_76600', title: 'Avatar: The Way of Water', year: '2022', rating: '7.6', poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800', duration: 'Movie', platform: 'FideTV Library' },
        { id: 'tmdb_872585', title: 'Oppenheimer', year: '2023', rating: '8.1', poster: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=800', duration: 'Movie', platform: 'FideTV Library' },
        { id: 'tmdb_693134', title: 'Dune: Part Two', year: '2024', rating: '8.2', poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800', duration: 'Movie', platform: 'FideTV Library' },
        { id: 'tmdb_569094', title: 'Spider-Man: Across the Spider-Verse', year: '2023', rating: '8.4', poster: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=800', duration: 'Movie', platform: 'FideTV Library' },
        { id: 'tmdb_155', title: 'The Dark Knight', year: '2008', rating: '8.5', poster: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800', duration: 'Movie', platform: 'FideTV Library' },
        { id: 'tmdb_157336', title: 'Interstellar', year: '2014', rating: '8.4', poster: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800', duration: 'Movie', platform: 'FideTV Library' },
        { id: 'tmdb_299534', title: 'Avengers: Endgame', year: '2019', rating: '8.2', poster: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800', duration: 'Movie', platform: 'FideTV Library' },
        { id: 'tmdb_533535', title: 'Deadpool & Wolverine', year: '2024', rating: '7.7', poster: 'https://images.unsplash.com/photo-1568832359672-e36cf5d74f54?w=800', duration: 'Movie', platform: 'FideTV Library' },
        { id: 'tmdb_1022789', title: 'Inside Out 2', year: '2024', rating: '7.6', poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800', duration: 'Movie', platform: 'FideTV Library' },
        { id: 'tmdb_558449', title: 'Gladiator II', year: '2024', rating: '7.5', poster: 'https://images.unsplash.com/photo-1485099667858-394460167664?w=800', duration: 'Movie', platform: 'FideTV Library' },
        { id: 'tmdb_912649', title: 'Anikulapo: Rise of the Spectre', year: '2024', rating: '8.0', poster: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800', duration: 'Nollywood / Series', platform: 'FideTV Nollywood' },
        { id: 'tmdb_1063879', title: 'The Black Book', year: '2023', rating: '7.8', poster: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800', duration: 'Nollywood / Action', platform: 'FideTV Nollywood' }
      ];

      // 1. If no query, get current trending movies
      if (!query) {
        const trending = await fetchTMDB('/trending/movie/day', { language: 'en-US' });
        if (trending?.results && Array.isArray(trending.results) && trending.results.length > 0) {
          trending.results.slice(0, 20).forEach((m: any) => {
            allResults.push({
              id: `tmdb_${m.id}`,
              title: m.title || m.original_title,
              year: (m.release_date || '').split('-')[0] || 'TBA',
              rating: m.vote_average?.toFixed(1) || 'N/A',
              poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : 'https://images.unsplash.com/photo-1485099667858-394460167664?w=800',
              duration: 'Movie',
              platform: 'FideTV Library'
            });
          });
        }
      } else {
        // 2. TMDB Search (Primary source)
        const tmdbRes = await fetchTMDB('/search/movie', { query, language: 'en-US', include_adult: false });
        if (tmdbRes?.results && Array.isArray(tmdbRes.results) && tmdbRes.results.length > 0) {
          console.log(`[Search] TMDB found ${tmdbRes.results.length} results`);
          tmdbRes.results.slice(0, 24).forEach((m: any) => {
            allResults.push({
              id: `tmdb_${m.id}`,
              title: m.title,
              year: (m.release_date || '').split('-')[0] || 'TBA',
              rating: m.vote_average?.toFixed(1) || 'N/A',
              poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : 'https://images.unsplash.com/photo-1485099667858-394460167664?w=800',
              duration: 'Movie',
              platform: 'TMDb Metadata'
            });
          });
        }
      }

      // 3. Fallback: Search internal database or fallback collection if TMDB returned empty
      if (allResults.length === 0) {
        console.log(`[Search] TMDB empty or unavailable. Utilizing fallback catalog for query: "${query}"`);
        if (!query) {
          allResults.push(...FALLBACK_MOVIES);
        } else {
          const lowerQ = query.toLowerCase();
          const matches = FALLBACK_MOVIES.filter(m => 
            m.title.toLowerCase().includes(lowerQ) || 
            m.platform.toLowerCase().includes(lowerQ) ||
            m.duration.toLowerCase().includes(lowerQ)
          );
          if (matches.length > 0) {
            allResults.push(...matches);
          } else {
            // Create a dynamic result card for user's query so they can still fetch streams/downloads
            allResults.push({
              id: `custom_${Date.now()}`,
              title: query.replace(/\b\w/g, l => l.toUpperCase()),
              year: '2024',
              rating: '8.0',
              poster: 'https://images.unsplash.com/photo-1485099667858-394460167664?w=800',
              duration: 'Movie',
              platform: 'FideSave Media Search'
            });
          }
        }
      }

      // 4. Enrich with internal database status
      const admin = getSupabaseAdmin();
      if (admin && allResults.length > 0) {
        try {
          const titles = allResults.map(r => r.title);
          const { data: matches } = await admin
            .from('portfolio_items')
            .select('title, video_url, youtube_id')
            .in('title', titles);
          
          if (matches) {
            allResults.forEach(r => {
              const matched = matches.find(m => m.title.toLowerCase() === r.title.toLowerCase());
              if (matched) {
                r.internal_available = true;
                r.platform = 'FideCloud HD - Available';
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
    } catch (err: any) {
      console.error("[Search Global Error]", err);
      res.status(500).json({ error: "Search failed. Please try again later." });
    }
  });

  // NEW: FideTV Downloader Router for the Universal Downloader Component
  apiRouter.post("/downloader/search", async (req, res) => {
    console.log("[Downloader-Search] Endpoint hit!");
    try {
      const { query, platform, limit = 12 } = req.body;
      if (!query) return res.status(400).json({ status: "error", error: "Query is required" });

      console.log(`[Downloader-Search] Query: "${query}" | Platform: ${platform}`);
      const searchResults: any[] = [];

      // 1. YouTube Search via ruhend-scraper
      try {
        const ruhendMod = await import("ruhend-scraper");
        const ruhend = (ruhendMod as any).default || ruhendMod;
        const ytSearch = ruhend.ytsearch || (ruhend.search && ruhend.search.youtube);
        
        if (ytSearch) {
          console.log("[Downloader-Search] Calling ytSearch...");
          const ytResults = await ytSearch(query);
          
          if (ytResults && Array.isArray(ytResults)) {
            ytResults.slice(0, limit).forEach((v: any) => {
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
    } catch (err: any) {
      console.error("[Downloader-Search] Global error:", err);
      res.status(500).json({ status: "error", error: "Internal search error" });
    }
  });

  apiRouter.post("/downloader/get-link", validateLinkAccess, async (req, res) => {
    try {
      const { videoId, quality, format = "mp4" } = req.body;
      if (!videoId) return res.status(400).json({ status: "error", error: "Video ID is required" });

      console.log(`[Downloader-Link] Fetching for: ${videoId} | Quality: ${quality}`);

      // Handle YouTube IDs
      if (videoId.startsWith('yt_')) {
        const vid = videoId.replace('yt_', '');
        const ytUrl = `https://www.youtube.com/watch?v=${vid}`;
        
        try {
          const ruhendMod = await import("ruhend-scraper");
          const ruhend = (ruhendMod as any).default || ruhendMod;
          
          if (ruhend.ytmp4) {
             const data = await ruhend.ytmp4(ytUrl);
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
          
          // Fallback to ytdl-core
          const ytdlModule = await import('@distube/ytdl-core');
          const ytdl = ytdlModule.default || ytdlModule;
          const info = await ytdl.getInfo(ytUrl);
          const f = ytdl.chooseFormat(info.formats, { quality: 'highest' });
          
          return res.json({
            status: "success",
            downloadUrl: f.url,
            fileName: (info.videoDetails.title || "video") + ".mp4",
            fileSize: "Variable",
            expiresIn: 3600
          });
        } catch (e) {
          console.error("[Downloader-Link] YouTube processing failed:", e);
        }
      }

      // Default Generic Link (or for TMDb/others, we just give a search link or mock)
      return res.json({
        status: "success",
        downloadUrl: `https://videodownloader.site/download?url=${encodeURIComponent(videoId)}`,
        fileName: "media_download.mp4",
        fileSize: "Variable",
        expiresIn: 3600
      });
    } catch (err: any) {
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

    // Normalize URL
    let workingUrl = url.trim();
    if (workingUrl.includes('web.facebook.com')) workingUrl = workingUrl.replace('web.facebook.com', 'www.facebook.com');
    if (workingUrl.includes('facebook.com/share/r/')) {
        // These are Reels share links, try to normalize if possible, though scrapers might handle them
        console.log(`[FideSave] Detected Facebook Reel Share: ${workingUrl}`);
    }
    if (workingUrl.includes('fb.watch')) workingUrl = workingUrl.replace('fb.watch/', 'facebook.com/watch/?v=');

    console.log(`[FideSave] Universal Downloader requested: ${workingUrl}`);

    // Initial metadata extraction (Universal Meta)
    let universalMeta = {
      title: 'Media Ready for Download',
      thumbnail: 'https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?w=800',
      platform: 'Media Link',
      duration: 'N/A'
    };

    try {
      const pageRes = await axios.get(workingUrl, { 
        headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
        }, 
        timeout: 4000,
        validateStatus: (status) => status < 500 // Don't throw on 4xx for metadata
      });
      
      if (pageRes.status === 200) {
          const $ = await import("cheerio").then(m => m.load(pageRes.data));
          universalMeta.title = $('meta[property="og:title"]').attr('content') || $('title').text() || universalMeta.title;
          universalMeta.thumbnail = $('meta[property="og:image"]').attr('content') || universalMeta.thumbnail;
          
          const domainMatch = workingUrl.match(/https?:\/\/(?:www\.)?([^\/.]+)/);
          if (domainMatch) universalMeta.platform = domainMatch[1].charAt(0).toUpperCase() + domainMatch[1].slice(1);
      }
    } catch (e) {
      console.log(`[FideSave] Universal meta fetch failed (safe skip): ${workingUrl}`);
    }

    try {
      // 1. YouTube Handler
      if (workingUrl.includes('youtube.com') || workingUrl.includes('youtu.be')) {
        try {
          const ytdlModule = await import('@distube/ytdl-core');
          const ytdl = ytdlModule.default || ytdlModule;
          if (!ytdl.validateURL(workingUrl)) return res.status(400).json({ error: "Invalid YouTube URL" });
          
          console.log(`[FideSave] Processing YouTube: ${workingUrl}`);
          const info = await ytdl.getInfo(workingUrl);
          
          let format = ytdl.chooseFormat(info.formats, { quality: 'highestvideo', filter: 'videoandaudio' });
          if (!format) format = ytdl.chooseFormat(info.formats, { quality: 'highest' });
          
          return res.json({
            ...universalMeta,
            title: info.videoDetails.title || universalMeta.title,
            videoUrl: format.url,
            videoId: info.videoDetails.videoId,
            audioUrl: format.url,
            thumbnail: info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1]?.url || universalMeta.thumbnail,
            platform: 'YouTube',
            duration: `${Math.floor(Number(info.videoDetails.lengthSeconds) / 60)}m`,
            type: 'youtube'
          });
        } catch (ytErr: any) {
          console.warn(`[FideSave] YouTube Initial Attempt Failed: ${ytErr.message}`);
          
          // Primary Fallback: Ruhend Scraper
          try {
            console.log("[FideSave] YouTube Fallback 1: Ruhend Scraper...");
            const ruhendMod = await import("ruhend-scraper");
            const ruhend = (ruhendMod as any).default || ruhendMod;
            
            if (ruhend.ytmp4) {
               const data = await ruhend.ytmp4(workingUrl);
               if (data && (data.url || data.video || data.link)) {
                  let vid = '';
                  const match = workingUrl.match(/(?:v=|embed\/|youtu\.be\/|\/v\/|watch\?v=|^)([a-zA-Z0-9_-]{11})(?:[?&]|$)/);
                  if (match) vid = match[1];

                  return res.json({
                    ...universalMeta,
                    title: data.title || universalMeta.title,
                    videoUrl: data.url || data.video || data.link,
                    videoId: vid,
                    audioUrl: data.audio || data.mp3 || '',
                    thumbnail: data.thumbnail || universalMeta.thumbnail,
                    platform: 'YouTube (Mirror 1)',
                    type: 'youtube'
                  });
               }
            }
          } catch (ruhendErr: any) {
            console.warn("[FideSave] YouTube Ruhend fallback failed:", ruhendErr.message);
          }

          // Secondary Fallback: Btch Downloader
          try {
            console.log("[FideSave] YouTube Fallback 2: Btch Downloader...");
            const btchMod = await import("btch-downloader");
            const btch = (btchMod as any).default || btchMod;
            
            if (btch.youtube) {
              const data = await btch.youtube(workingUrl);
              if (data && (data.url || data.video || data.link)) {
                return res.json({
                  ...universalMeta,
                  title: data.title || universalMeta.title,
                  videoUrl: data.url || data.video || data.link,
                  audioUrl: data.mp3 || data.audio || '',
                  platform: 'YouTube (Mirror 2)',
                  type: 'youtube'
                });
              }
            }
          } catch (btchErr: any) {
            console.warn("[FideSave] YouTube Btch fallback failed:", btchErr.message);
          }

          // Final response if all fallbacks fail
          return res.status(403).json({ 
            error: "YouTube has restricted access from our current server region. " + 
                   "To protect against bots, YouTube often requires a direct sign-in. " +
                   "Please try again or use another source." 
          });
        }
      }

      // 1.5. M3U Playlist Handler
      if (workingUrl.endsWith('.m3u') || workingUrl.endsWith('.m3u8') || workingUrl.includes('.m3u8?')) {
        return res.json({
            ...universalMeta,
            videoUrl: workingUrl,
            type: 'playlist'
        });
      }

    // 2. Specialized Scrapers Fallback (TikTok, IG, FB, X, Threads, Capcut, Snapchat)
      if (workingUrl.includes('tiktok.com') || workingUrl.includes('instagram.com') || workingUrl.includes('facebook.com') || workingUrl.includes('twitter.com') || workingUrl.includes('x.com') || workingUrl.includes('fb.watch') || workingUrl.includes('threads.net') || workingUrl.includes('capcut.com') || workingUrl.includes('snapchat.com')) {
        try {
          const ruhendMod = await import("ruhend-scraper");
          const ruhend = (ruhendMod as any).default || ruhendMod;
          
          const btchMod = await import("btch-downloader");
          const btch = (btchMod as any).default || btchMod;
          
          let data: any = null;
          if (workingUrl.includes('tiktok.com')) data = await (ruhend.ttdl || ruhend.tiktok)(workingUrl);
          else if (workingUrl.includes('instagram.com')) data = await (ruhend.igdl || ruhend.instagram)(workingUrl);
          else if (workingUrl.includes('facebook.com') || workingUrl.includes('fb.watch')) data = await (ruhend.fbdl || ruhend.facebook)(workingUrl);
          else if (workingUrl.includes('twitter.com') || workingUrl.includes('x.com')) data = await (ruhend.twitter || (btch && btch.twitter))(workingUrl);
          else if (workingUrl.includes('threads.net')) data = await (ruhend.threads)(workingUrl);
          else if (workingUrl.includes('capcut.com')) data = await (ruhend.capcut)(workingUrl);
          else if (workingUrl.includes('snapchat.com')) data = await (ruhend.snapchat)(workingUrl);

          // If ruhend failed, try btch as fallback for specific ones
          if (!data && btch) {
             if (workingUrl.includes('tiktok.com') && btch.tiktok) data = await btch.tiktok(workingUrl);
             else if (workingUrl.includes('instagram.com') && btch.igdl) data = await btch.igdl(workingUrl);
             else if (workingUrl.includes('facebook.com') && btch.facebook) data = await btch.facebook(workingUrl);
          }

          if (data && (data.url || data.video || data.link || data.result)) {
            const finalUrl = data.url || data.video || data.link || (data.result && Array.isArray(data.result) ? (data.result[0]?.url || data.result[0]) : data.result);
            if (finalUrl && typeof finalUrl === 'string' && finalUrl.startsWith('http')) {
                return res.json({
                  ...universalMeta,
                  title: data.title || universalMeta.title,
                  videoUrl: finalUrl,
                  audioUrl: data.audio || data.mp3 || '',
                  thumbnail: data.thumbnail || data.cover || universalMeta.thumbnail,
                  platform: universalMeta.platform.toUpperCase()
                });
            }
          }
        } catch (e: any) {
          console.error("[Universal-Downloader] Scraper Error:", e.message);
        }
      }

      // 3. Final Universal Fallback - Advanced Metadata and Source Discovery
      try {
        console.log(`[Universal-Downloader] Deep scraping: ${workingUrl}`);
        const pageRes = await axios.get(workingUrl, { 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36' }, 
            timeout: 6000,
            validateStatus: (status) => status < 500
        });
        
        if (pageRes.status === 200) {
            const $ = await import("cheerio").then(m => m.load(pageRes.data));
            
            // Comprehensive selector list for video sources
            const videoSrc = 
                $('meta[property="og:video:secure_url"]').attr('content') ||
                $('meta[property="og:video"]').attr('content') ||
                $('meta[name="twitter:player:stream"]').attr('content') ||
                $('video source').attr('src') || 
                $('video').attr('src') ||
                $('source[type="video/mp4"]').attr('src');
    
            if (videoSrc) {
               const absoluteUrl = videoSrc.startsWith('http') ? videoSrc : new URL(videoSrc, workingUrl).href;
               return res.json({
                 ...universalMeta,
                 videoUrl: absoluteUrl,
                 type: 'direct',
                 note: 'Discovered via universal deep-scrape'
               });
            }
        }
      } catch (e: any) {
          console.error("[Universal-Downloader] Deep scrape failure:", e.message);
      }

      // Return what we have for metadata but flag it as missing direct stream if we couldn't find one
      return res.json({
        ...universalMeta,
        videoUrl: null, // Don't return original URL as videoUrl to prevent invalid proxying
        originalUrl: workingUrl,
        error: "Direct download links not found. Content may be private or restricted by provider."
      });
    } catch (error: any) {
      console.error("[FideSave] Downloader error:", error.message);
      res.status(500).json({ error: error.message || "Failed to parse link." });
    }
  });

  // Movie Download Options Endpoint - Internal Inventory & TMDB Verified Streams
  apiRouter.get("/movie-download-options", validateLinkAccess, async (req, res) => {
    try {
      const { title, id } = req.query;
      if (!title) return res.status(400).json({ error: "Movie title is required" });

      const admin = getSupabaseAdmin();
      const movieTitleStr = String(title || '');
      const links: any[] = [
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

      // 1. Check Internal Database (Portfolio Items)
      if (admin) {
        try {
          const { data: item } = await admin
            .from('portfolio_items')
            .select('*')
            .ilike('title', `${title}`)
            .maybeSingle();

          if (item) {
            console.log(`[Inventory] Match found in library: ${item.id}`);
            
            if (item.video_url && item.video_url.includes('.supabase.co/storage')) {
              const urlParts = item.video_url.split('/storage/v1/object/public/')[1];
              if (urlParts) {
                const [bucket, ...pathArr] = urlParts.split('/');
                const path = pathArr.join('/');
                
                const { data: signed } = await admin.storage
                  .from(bucket)
                  .createSignedUrl(path, 3600); 
                
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

      // 2. Fetch TMDB Videos & Streaming Mirrors if TMDb ID exists
      const rawId = id ? String(id).replace('tmdb_', '').trim() : '';
      if (rawId && /^\d+$/.test(rawId)) {
        try {
          const tmdbVideos = await fetchTMDB(`/movie/${rawId}/videos`, { language: 'en-US' });
          if (tmdbVideos?.results && Array.isArray(tmdbVideos.results)) {
            const ytVideos = tmdbVideos.results.filter((v: any) => v.site === 'YouTube');
            const trailer = ytVideos.find((v: any) => v.type === 'Trailer') || ytVideos[0];
            const teaser = ytVideos.find((v: any) => v.type === 'Teaser' && v.key !== trailer?.key);

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
        } catch (tmdbErr: any) {
          console.warn("[Movie-Inventory] TMDB video fetch failed:", tmdbErr.message);
        }

        // 3. Multi-Source Streaming Mirrors for the movie
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

        // 4. TMDb Watch Providers (Netflix, Prime, Disney+, Apple, etc.)
        try {
          const providers = await fetchTMDB(`/movie/${rawId}/watch/providers`);
          const watchLink = providers?.results?.US?.link || (providers?.results ? Object.values(providers.results)[0] as any : null)?.link;
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
          // Skip providers on error
        }
      }

      // 5. Fallback if still empty: search YouTube for official trailer
      if (links.length === 0) {
        links.push({
          quality: "Search Stream in FideSave",
          type: "fidesave",
          size: "Variable",
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(String(title) + ' full movie')}`,
          source: "FideSave Search",
          note: "Search media streams directly"
        });
      }
      
      return res.json({ title: title as string, links });
    } catch (err: any) {
      console.error("[Search Inventory Hub Error]", err);
      res.status(500).json({ error: "Download service error" });
    }
  });

  // Video download proxy with improved Range support and Error handling
  apiRouter.get("/video-download-proxy", async (req, res) => {
    const { url, filename } = req.query;
    if (!url || typeof url !== 'string') return res.status(400).send("URL required");

    try {
      console.log(`[Download Proxy] Initiating download for: ${url}`);
      
      const targetUrl = new URL(url);
      const referer = targetUrl.origin;

      const axiosHeaders: any = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Referer': referer,
        'Accept': '*/*',
        'Connection': 'keep-alive'
      };

      if (req.headers.range) {
        axiosHeaders['Range'] = req.headers.range;
      }

      const response = await axios({
        method: 'get',
        url: url,
        responseType: 'stream',
        timeout: 300000, // 5 minutes for very large video streams
        headers: axiosHeaders,
        maxRedirects: 10,
        validateStatus: (status) => status < 500 
      });

      if (response.status >= 400) {
        console.error(`[Download Proxy Error] Source returned ${response.status}: ${url}`);
        return res.status(response.status).send(`The source file could not be accessed (Error ${response.status}). The link might be expired.`);
      }

      const contentType = (response.headers as any)['content-type'] || 'application/octet-stream';
      if (contentType.includes('text/html')) {
        console.error(`[Download Proxy Error] Refused to stream HTML: ${url}`);
        return res.status(415).send("The link points to a webpage, not a direct media file.");
      }

      const cleanFilename = (filename as string || `fidesave-${Date.now()}.mp4`).replace(/[^a-zA-Z0-9.\-_]/g, '_');
      
      // Mirror source status (useful for 206 Partial Content)
      res.status(response.status);

      // Pass through critical headers
      const passHeaders = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag'];
      passHeaders.forEach(h => {
        if (response.headers[h]) {
          res.setHeader(h, response.headers[h] as string);
        }
      });

      res.setHeader('Content-Disposition', `attachment; filename="${cleanFilename}"`);
      res.setHeader('Cache-Control', 'no-cache');

      response.data.on('error', (e: any) => {
        console.error('[Download Proxy Stream Error]', e.message);
        if (!res.headersSent) res.status(502).end();
        else res.end();
      });

      response.data.pipe(res);
    } catch (err: any) {
      console.error(`[Download Proxy Error] ${err.message}`);
      if (!res.headersSent) {
        res.status(502).send("Proxy failed: " + err.message);
      }
    }
  });

  // Safe Media Downloader Diagnostic Health Endpoint
  const mediaHealthHandler = async (_req: any, res: any) => {
    try {
      const hasTmdb = !!process.env.TMDB_API_KEY && process.env.TMDB_API_KEY.trim() !== '';
      const hasOmdb = !!process.env.OMDB_API_KEY && process.env.OMDB_API_KEY.trim() !== '';
      const hasSupabase = !!(process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

      return res.json({
        status: "ok",
        service: "media-analysis",
        timestamp: new Date().toISOString(),
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
    } catch (err: any) {
      return res.status(500).json({
        status: "error",
        service: "media-analysis",
        error: "Diagnostic check failed"
      });
    }
  };

  apiRouter.get("/health/media", mediaHealthHandler);
  apiRouter.get("/media/health", mediaHealthHandler);

  // Safe Media Downloader Endpoints
  apiRouter.post("/media/analyze", mediaLimiter, async (req, res) => {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch (e) {}
      }

      const url = body?.url;
      console.log(`[DIAGNOSTICS] Request received. Endpoint: /media/analyze. Method: ${req.method}.`);
      console.log(`[DIAGNOSTICS] Env vars check - TMDB: ${!!process.env.TMDB_API_KEY}, OMDB: ${!!process.env.OMDB_API_KEY}, Supabase: ${!!process.env.VITE_SUPABASE_URL}`);
      
      if (!url || typeof url !== 'string') {
        console.log(`[DIAGNOSTICS] URL validation result: Invalid or missing URL.`);
        return res.status(400).json({ success: false, error: "Please enter a valid media URL." });
      }

      console.log(`[DIAGNOSTICS] URL validation result: Valid URL structure provided: ${url}`);
      console.log(`[DIAGNOSTICS] External service request started via analyzeMedia...`);
      const result = await analyzeMedia(url);
      console.log(`[DIAGNOSTICS] External service status: ${result.success ? 'Success' : 'Failed'}`);
      
      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (err: any) {
      console.error("[Media Analyze Error]", err);
      // On Vercel, we want to see the error details even in production for debugging
      res.status(500).json({ 
        success: false, 
        error: "Server Error: Media analysis failed.",
        details: err.message,
        stack: isVercel ? err.stack : undefined
      });
    }
  });

  apiRouter.post("/media/download", mediaLimiter, handleMediaDownload);
  apiRouter.get("/media/download", mediaLimiter, handleMediaDownload);

  // New endpoint: Upload from URL directly to Supabase Storage (Server-to-Server)
  apiRouter.post("/storage/upload-from-url", validateLinkAccess, async (req, res) => {
    const { url, filename, bucket = "media" } = req.body;
    if (!url) return res.status(400).json({ error: "Source URL is required" });

    try {
      const adminClient = getSupabaseAdmin();
      if (!adminClient) throw new Error("Supabase Admin not configured");

      console.log(`[Storage] Remote Save requested for: ${url}`);
      
      // 1. Fetch the remote file
      const response = await axios({
        method: 'get',
        url: url,
        responseType: 'arraybuffer',
        timeout: 300000, // 5 minutes
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        }
      });

      const contentType = response.headers['content-type'] || 'application/octet-stream';
      const buffer = Buffer.from(response.data);
      
      // 2. Prepare destination path
      const ext = filename?.split('.').pop() || 'mp4';
      const remoteName = `remote-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const filePath = `saved/${remoteName}`;

      // 3. Upload to Supabase
      const { data, error: uploadError } = await adminClient.storage
        .from(bucket)
        .upload(filePath, buffer, {
          contentType,
          upsert: true
        });

      if (uploadError) {
        // If bucket missing, create and retry once
        if (uploadError.message.includes('not found')) {
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
    } catch (err: any) {
      console.error(`[Storage Remote Save Error] ${err.message}`);
      res.status(500).json({ error: "Failed to save media to cloud storage: " + err.message });
    }
  });

  // 1. Password Reset Route
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

    } catch (error: any) {
      console.error("[Admin API] Critical failure:", error);
      return res.status(500).json({ 
        error: "Internal Server Error: " + (error.message || "Unknown exception")
      });
    }
  });

  // Catch-all for other methods on reset route (helps debug 405)
  apiRouter.all("/admin-reset-pw", (req, res) => {
    console.warn(`[Admin API] Invalid method ${req.method} called on /admin-reset-pw`);
    res.status(405).json({ error: `Method ${req.method} not allowed on this endpoint.` });
  });

  // 2. Voice Assistant
  apiRouter.post("/voice-assistant", async (req, res) => {
    const { text, participants = [] } = req.body;
    if (!text) return res.status(400).json({ error: "No text provided" });

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!isValidGeminiKey(apiKey)) {
        return res.json({ text: getSimulatedResponse(text, participants) });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `User said: "${text}". You are a helpful AI assistant in a FideTV VoIP voice room. Current participants: ${participants.join(", ")}. Provide a short, plain text, vocal-friendly response (max 2 sentences).`;
      
      const result = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          maxOutputTokens: 250,
          temperature: 0.7,
        }
      });
      
      const responseText = result.text;

      res.json({ text: responseText || "I am connected and ready to assist." });
    } catch (error: any) {
      console.error("[Voice Assistant Error]", error.message);
      if (error.message?.includes("429") || error.message?.toLowerCase().includes("rate")) {
        return res.json({ text: "I'm receiving too many requests right now. Please wait a moment before asking again!" });
      }
      res.json({ text: getSimulatedResponse(text, participants) });
    }
  });

  // AI Content Generation Proxy
  apiRouter.post("/ai/generate", async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "No prompt provided" });

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!isValidGeminiKey(apiKey)) {
        return res.json({ text: `Generated description for: ${String(prompt).substring(0, 50)}... (Simulated mode: Add valid Gemini API key in secrets to enable AI generation)` });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const result = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          maxOutputTokens: 300,
          temperature: 0.7,
        }
      });
      
      res.json({ text: result.text || "" });
    } catch (error: any) {
      console.error("[AI Generate Error]", error?.message || error);
      if (error?.message?.includes("429") || error?.message?.toLowerCase().includes("rate") || error?.message?.toLowerCase().includes("quota")) {
        return res.status(429).json({ error: "API rate limit or quota exceeded. Please try again later.", text: `Professional description for: ${String(prompt).substring(0, 40)}... (Quota fallback)` });
      }
      res.json({ text: `Professional content for: ${String(prompt).substring(0, 40)}... (Fallback response due to temporary AI service limit)` });
    }
  });

  // 3. Storage Upload Proxy (Auto-creates buckets if needed)
  apiRouter.post("/storage/upload", uploadLimiter, (req, res, next) => {
    upload.single('file')(req, res, (err) => {
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
      // Accept bucket from query or body
      const bucket = req.body.bucket || req.query.bucket || "thumbnails";
      
      if (!file) {
        console.warn("[Storage] No file in request. Body keys:", Object.keys(req.body));
        return res.status(400).json({ error: "No file provided for upload" });
      }

      console.log(`[Storage] Processing upload. File: ${file.originalname}, Size: ${file.size}, Bucket: ${bucket}, Mime: ${file.mimetype}`);

      // Generate a cleaner filename with extension from mimetype if originalname is generic
      let ext = file.originalname.split('.').pop() || '';
      if (ext.length > 5 || ext === 'blob' || !ext) {
         if (file.mimetype === 'image/jpeg') ext = 'jpg';
         else if (file.mimetype === 'image/png') ext = 'png';
         else if (file.mimetype === 'image/gif') ext = 'gif';
         else if (file.mimetype === 'image/webp') ext = 'webp';
         else if (file.mimetype === 'image/svg+xml') ext = 'svg';
      }
      
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}${ext ? '.' + ext : ''}`;
      const filePath = `uploads/${fileName}`;

      console.log(`[Storage] Uploading to bucket ${bucket} as ${filePath}`);

      // 1. Try uploading
      let { error: uploadError } = await adminClient.storage
        .from(bucket as string)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: true
        });

      // 2. If bucket not found or policy error, try creating it and retry
      if (uploadError && (uploadError.message?.toLowerCase().includes('bucket not found') || uploadError.message?.toLowerCase().includes('not found'))) {
        console.log(`[Storage] Bucket "${bucket}" not found, attempting to auto-create...`);
        const { error: createError } = await adminClient.storage.createBucket(bucket as string, {
          public: true,
          fileSizeLimit: 10 * 1024 * 1024, // 10MB
        });
        
        if (createError) {
          console.error(`[Storage] Failed to create bucket "${bucket}":`, createError);
          return res.status(500).json({ error: `Bucket missing and auto-creation failed: ${createError.message}` });
        }

        // Retry upload after bucket creation
        console.log(`[Storage] Retrying upload to newly created bucket "${bucket}"...`);
        const retryResult = await adminClient.storage
          .from(bucket as string)
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: true
          });
        uploadError = retryResult.error;
      }

      if (uploadError) {
        console.error("[Storage] Supabase error:", uploadError);
        return res.status(500).json({ error: uploadError.message });
      }

      // Fetch the public URL
      const { data: { publicUrl } } = adminClient.storage
        .from(bucket as string)
        .getPublicUrl(filePath);

      console.log(`[Storage] Upload success. Public URL: ${publicUrl}`);
      res.json({ publicUrl });
    } catch (err: any) {
      console.error("[Storage API Critical Error]", err);
      res.status(500).json({ error: "Storage service encountered an internal error: " + err.message });
    }
  });

  // 4. YouTube Proxy
  apiRouter.get("/youtube/metadata", async (req, res) => {
    try {
      const { url } = req.query;
      if (!url) return res.status(400).json({ error: "URL is required" });
      
      const videoId = YouTubeIngestionService.extractVideoId(url as string);
      if (!videoId) return res.status(400).json({ error: "Invalid YouTube URL" });
      
      const youtubeKey = process.env.YOUTUBE_API_KEY || process.env.GEMINI_API_KEY;
      const adminClient = getSupabaseAdmin();
      
      if (!youtubeKey || !adminClient) {
        return res.status(503).json({ error: "YouTube integration not configured" });
      }
      
      const tempService = new YouTubeIngestionService(adminClient, youtubeKey);
      const metadata = await tempService.getVideoMetadata(videoId);
      
      // Global brand replacement
      if (metadata.title) metadata.title = metadata.title.replace(/SportyTV/gi, 'FideTv');
      if (metadata.description) metadata.description = metadata.description.replace(/SportyTV/gi, 'FideTv');
      
      res.json(metadata);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.get("/youtube/content", async (req, res) => {
    try {
      const adminClient = getSupabaseAdmin();
      let channelId = 'UCnYRsis2rkO8401trlHM7aA'; // FIDE TV channel ID
      
      if (adminClient) {
        try {
          const { data: chSetting } = await adminClient
            .from('site_settings')
            .select('value')
            .eq('key', 'youtube_channel_id')
            .maybeSingle();
          if (chSetting && chSetting.value) {
            channelId = chSetting.value.trim();
          }
        } catch (e) {}
      }

      const apiKey = process.env.YOUTUBE_API_KEY || process.env.GEMINI_API_KEY || '';
      const service = new YouTubeIngestionService(adminClient as any, apiKey);
      
      // 1. Fetch latest videos from RSS or API (this automatically syncs to portfolio_items in Supabase)
      let videos: any[] = [];
      try {
        videos = await service.getFormattedVideosForChannel(channelId);
      } catch (e) {
        console.warn("[YouTube Content] Sync error:", e);
      }

      // 2. Fetch database portfolio items to include any extra/custom items not in the channel feed
      if (adminClient) {
        const { data: dbItems } = await adminClient
          .from('portfolio_items')
          .select('*')
          .order('created_at', { ascending: false });

        if (dbItems && dbItems.length > 0) {
          const existingIds = new Set(videos.map(v => v.youtube_id || v.id));
          dbItems.forEach(item => {
            const ytId = item.youtube_id;
            if (ytId && !existingIds.has(ytId)) {
              videos.push({
                id: item.id,
                title: item.title,
                category: item.category || 'General Content',
                image: item.image_url,
                image_url: item.image_url,
                type: 'video',
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
    } catch (err: any) {
      console.error("[YouTube Content API Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post("/youtube/sync", async (req, res) => {
    try {
      const adminClient = getSupabaseAdmin();
      let channelId = req.body?.channelId || 'UCnYRsis2rkO8401trlHM7aA';
      const apiKey = process.env.YOUTUBE_API_KEY || process.env.GEMINI_API_KEY || '';
      
      const service = new YouTubeIngestionService(adminClient as any, apiKey);
      const videos = await service.getFormattedVideosForChannel(channelId);
      
      res.json({ success: true, count: videos.length, videos });
    } catch (err: any) {
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
      
      const queryParams = new URLSearchParams(req.query as any);
      queryParams.set('key', apiKey);

      const targetUrl = `https://www.googleapis.com/youtube/v3/${endpoint}?${queryParams.toString()}`;
      console.log(`[YouTube Proxy] Fetching: ${targetUrl.split('key=')[0]}key=HIDDEN`);
      
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
      
      // Global brand replacement in proxy responses
      const sanitizeData = (obj: any): any => {
        if (typeof obj === 'string') return obj.replace(/SportyTV/gi, 'FideTv');
        if (Array.isArray(obj)) return obj.map(sanitizeData);
        if (obj !== null && typeof obj === 'object') {
          const newObj: any = {};
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
    } catch (error: any) {
      console.error(`[YouTube Proxy Critical Failure] endpoint: ${endpoint}`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // 4b. Stream Health Check (Advanced)
  apiRouter.get("/stream-health", async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ valid: false, errorMessage: "No URL" });
    
    const result = await ChannelIngestionService.validateStream(url as string);
    res.json({
        ...result,
        lastChecked: new Date().toISOString()
    });
  });

  // 4c. Automation Report
  apiRouter.get("/automation-report", (req, res) => {
    res.json(lastAutomationReport);
  });

  // 4d. Manual Automation Trigger
  apiRouter.post("/trigger-automation", async (req, res) => {
    if (ingestService) {
      console.log("[Background] Triggering manual automation cycle...");
      lastAutomationReport = await ingestService.runFullAutomation();
      res.json({ message: "Automation cycle completed", report: lastAutomationReport });
    } else {
      res.status(500).json({ error: "Service not initialized" });
    }
  });

  // 4. HLS/M3U8 Stream Proxy with Manifest Rewriting
  apiRouter.all("/proxy-stream", async (req, res) => {
    // Enable CORS with dynamic origin for withCredentials support
    // We MUST use the actual origin if provided, otherwise fallback to '*'
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Range, Referer, User-Agent');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    res.setHeader('Vary', 'Origin');

    if (origin !== '*' && origin !== 'null') {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    const { url, referer } = req.query;
    if (!url) {
      console.warn("[Proxy] Missing URL parameter in request");
      return res.status(400).send("Proxy error: URL parameter is required");
    }
    
    const streamUrl = url as string;
    
    try {
      const urlObj = new URL(streamUrl);
      const targetOrigin = urlObj.origin;
      let effectiveReferer = referer as string;
      
      if (!effectiveReferer) {
        if (streamUrl.includes('redbull')) effectiveReferer = 'https://www.redbull.com/';
        else if (streamUrl.includes('limex')) effectiveReferer = 'https://limex.tv/';
        else if (streamUrl.includes('linear')) effectiveReferer = 'https://limex.tv/';
        else if (streamUrl.includes('pluto.tv')) effectiveReferer = 'https://pluto.tv/';
        else effectiveReferer = targetOrigin + '/';
      }

      console.log(`[Proxy] → ${streamUrl}`);
      
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': effectiveReferer,
        'Origin': streamUrl.includes('pluto.tv') ? 'https://pluto.tv' : ((streamUrl.includes('limex') || streamUrl.includes('linear')) ? 'https://limex.tv' : targetOrigin),
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site',
        'Accept-Encoding': 'identity'
      };

      if (req.headers.range) {
        headers['Range'] = String(req.headers.range);
      }

      const response = await axios.get(streamUrl, {
        headers,
        timeout: 45000, // Increased for stability
        responseType: 'stream',
        validateStatus: (status) => status < 500, 
        maxRedirects: 15
      });
      
      const finalUrl = response.request?.res?.responseUrl || streamUrl;
      const finalBaseUrl = finalUrl.substring(0, finalUrl.lastIndexOf('/') + 1);
      const contentType = String(response.headers['content-type'] || '').toLowerCase();
      const isManifest = contentType.includes('mpegurl') || 
                        contentType.includes('mpeg-url') ||
                        contentType.includes('apple-mpegurl') ||
                        contentType.includes('video/mp2t') || // Sometimes mistakenly used for manifests
                        finalUrl.split('?')[0].toLowerCase().endsWith('.m3u8') ||
                        finalUrl.split('?')[0].toLowerCase().endsWith('.m3u');

      res.setHeader('X-Proxy-Source', 'AI-Studio-Stream-Bridge');
      res.setHeader('Content-Type', contentType);

      // We should check the actual content for M3U structure if it's a text-like format
      const isTextLike = contentType.includes('text/') || contentType.includes('json') || contentType.includes('application/octet-stream') || isManifest;

      if (isTextLike) {
        const chunks: Buffer[] = [];
        let totalSize = 0;
        const MAX_MANIFEST_SIZE = 4 * 1024 * 1024; // 4MB limit for manifest buffering
        
        const timeout = setTimeout(() => {
          if (!res.headersSent) {
             console.error(`[Proxy] Critical timeout buffering manifest for ${streamUrl}`);
             res.setHeader('Retry-After', '5');
             res.status(504).send("Signal provider timeout");
             response.data.destroy();
          }
        }, 28000);

        response.data.on('data', (chunk: any) => {
          totalSize += chunk.length;
          if (totalSize > MAX_MANIFEST_SIZE) {
            console.warn(`[Proxy] Manifest too large, switching to pass-through: ${streamUrl}`);
            // If it's too big, it's likely a stream segment, not a manifest
            if (!res.headersSent) {
               res.status(response.status);
               // Send the buffered chunks first
               res.write(Buffer.concat(chunks));
               response.data.pipe(res);
            }
            return;
          }
          chunks.push(Buffer.from(chunk));
        });
        
        response.data.on('error', (err: any) => {
          clearTimeout(timeout);
          console.error(`[Proxy Stream Error] ${err.message} for ${streamUrl}`);
          if (!res.headersSent) res.status(502).send(`Switchboard error: ${err.message}`);
        });

        response.data.on('end', () => {
          clearTimeout(timeout);
          if (res.headersSent) return;

          const buffer = Buffer.concat(chunks);
          const content = buffer.toString('utf8');
          
          if (!content.trim().startsWith('#EXTM3U')) {
            // Not a manifest, just send as-is
            res.setHeader('Content-Type', contentType || 'application/octet-stream');
            return res.send(buffer);
          }

          console.log(`[Proxy] Rewriting Manifest: ${finalUrl}`);
          const appHostUrl = `${req.protocol}://${req.get('host')}`;
          const lines = content.split('\n');
          const rewrittenLines = lines.map(line => {
            const trimmed = line.trim();
            if (!trimmed) return line;
            
            // Rewrite Master Playlist or Alternative Media URIs (ATTR=uri)
            if (trimmed.startsWith('#')) {
              // EXT-X-KEY:METHOD=AES-128,URI="...",IV=...
              // EXT-X-MAP:URI="..."
              // EXT-X-MEDIA:TYPE=AUDIO,URI="..."
              if (trimmed.includes('URI=')) {
                return line.replace(/URI="?([^",\s]*)"?/g, (match, p1) => {
                  try {
                    const abs = p1.startsWith('http') ? p1 : new URL(p1, finalBaseUrl).href;
                    const proxiedUrl = `${appHostUrl}/api/proxy-stream?url=${encodeURIComponent(abs)}&referer=${encodeURIComponent(effectiveReferer)}`;
                    // Keep quotes if original had them or if URL has special chars
                    return match.startsWith('URI="') ? `URI="${proxiedUrl}"` : `URI=${proxiedUrl}`;
                  } catch (e) { return match; }
                });
              }
              return line;
            }
            
            // Rewrite segment/variant playlist URLs (Lines that are just URLs)
            try {
              // Skip external/absolute URLs that are already proxied or shouldn't be
              if (trimmed.includes('/api/proxy-stream')) return line;
              
              const absoluteUrl = trimmed.startsWith('http') ? trimmed : new URL(trimmed, finalBaseUrl).href;
              return `${appHostUrl}/api/proxy-stream?url=${encodeURIComponent(absoluteUrl)}&referer=${encodeURIComponent(effectiveReferer)}`;
            } catch (e) { return line; }
          });
          
          res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
          res.send(rewrittenLines.join('\n'));
        });
      } else {
        // Handle binary stream segment error
        response.data.on('error', (err: any) => {
          console.error(`[Proxy Segment Error] ${err.message} for ${streamUrl}`);
          if (!res.headersSent) res.status(502).end();
        });

        // Forward relevant headers for binary stream/segments
        if (response.headers['content-length']) res.setHeader('Content-Length', String(response.headers['content-length']));
        if (response.headers['content-range']) res.setHeader('Content-Range', String(response.headers['content-range']));
        if (response.headers['accept-ranges']) res.setHeader('Accept-Ranges', String(response.headers['accept-ranges']));
        
        res.status(response.status);
        response.data.pipe(res);
      }
    } catch (error: any) {
      const isDnsError = error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN';
      const isTimeout = error.code === 'ECONNABORTED' || error.message.includes('timeout');
      
      console.error(`[Proxy Error] ${error.code || 'UNKNOWN'}: ${error.message} for ${streamUrl}`);
      
      if (!res.headersSent) {
        const statusCode = isDnsError ? 404 : 502;
        const message = isDnsError ? "Broadcast domain not found (DNS Failure)" : (isTimeout ? "Connect Timeout" : error.message);
        res.status(statusCode).send(`Switchboard Error: ${message}`);
      }
    }
  });


  // 5. Signal Bridge Maintenance Task
  const runSignalBridgeMaintenance = async () => {
    console.log('[Bridge] Running signal bridge validation and repair...');
    const admin = getSupabaseAdmin();
    if (!admin) return;

    try {
      const { data: channels } = await admin.from('tv_channels').select('*');
      if (!channels) return;

      let repairCount = 0;
      for (const ch of channels) {
        let type = 'unknown';
        const url = (ch.url || '').toLowerCase();
        
        if (url.includes('youtube.com') || url.includes('youtu.be')) type = 'youtube';
        else if (url.includes('facebook.com') || url.includes('fb.watch')) type = 'facebook';
        else if (url.includes('vimeo.com')) type = 'vimeo';
        else if (url.includes('.m3u8') || url.includes('m3u8')) type = 'hls';
        else if (url.includes('.mp4')) type = 'mp4';

        if (ch.stream_type !== type) {
          await admin.from('tv_channels').update({ stream_type: type }).eq('id', ch.id);
          repairCount++;
        }
      }
      console.log(`[Bridge] Maintenance complete. Repaired ${repairCount} records.`);
    } catch (e) {
      console.error('[Bridge] Maintenance failure:', e);
    }
  };

  // Run maintenance on start
  runSignalBridgeMaintenance();

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

  // Weekly maintenance or triggered checks
  // Consolidated into the primary automation scheduler above
  /*
  setInterval(() => {
    const service = getIngestionService();
    if (service) service.runHealthChecks().catch(console.error);
  }, 1000 * 60 * 60 * 24); // Once a day primary health check

  // YouTube Ingestion - Every 60 minutes
  setInterval(() => {
    const service = getYouTubeService();
    if (service) service.runDiscoveryCycle(2).catch(console.error);
  }, 1000 * 60 * 60);
  */

  // Background stats update every 24 hours (throttled)
  setInterval(() => {
    const admin = getSupabaseAdmin();
    const key = process.env.YOUTUBE_API_KEY || process.env.GEMINI_API_KEY;
    if (admin && key && !isAutomationRunning) {
       const service = new YouTubeIngestionService(admin, key);
       service.updateAllChannelStats().catch(err => console.error("Periodic stats update failed:", err));
    }
  }, 24 * 60 * 60 * 1000);

  // Manual trigger endpoints
  apiRouter.post("/youtube/trigger-discovery", async (req, res) => {
    try {
      const isDeep = req.body.deep === true;
      console.log(`[YouTube Ingestion] Manual trigger. Deep Scan: ${isDeep}`);
      
      const service = getYouTubeService();
      if (!service) return res.status(503).json({ error: "YouTube service not configured" });

      const pages = isDeep ? 8 : 2;
      const report = await service.runDiscoveryCycle(pages);
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post("/channels/sync-thumbnails", async (req, res) => {
    try {
      const adminClient = getSupabaseAdmin();
      const apiKey = process.env.YOUTUBE_API_KEY || process.env.GEMINI_API_KEY;
      if (!adminClient || !apiKey) throw new Error("Server not configured correctly");

      const service = new YouTubeIngestionService(adminClient, apiKey);
      const { data: channels, error: fetchError } = await adminClient
        .from('tv_channels')
        .select('id, url, thumbnail, name');

      if (fetchError) throw fetchError;

      let updatedCount = 0;
      let errors = [];

      for (const channel of channels) {
        const videoId = YouTubeIngestionService.extractVideoId(channel.url);
        if (videoId) {
          try {
            const metadata = await service.getVideoMetadata(videoId);
            if (metadata && metadata.thumbnail) {
               const { error: updateError } = await adminClient
                .from('tv_channels')
                .update({ thumbnail: metadata.thumbnail })
                .eq('id', channel.id);
               
               if (updateError) throw updateError;
               updatedCount++;
            }
          } catch (e: any) {
            console.error(`[Sync] Error updating ${channel.name}:`, e.message);
            errors.push({ id: channel.id, name: channel.name, error: e.message });
          }
        }
      }

      res.json({ success: true, updatedCount, totalChannels: channels.length, errors });
    } catch (err: any) {
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
      const results = await service.ingestVideosFromChannel(channelId, category || 'General Content');
      res.json({ success: true, count: results.length, videos: results });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });


  apiRouter.get("/youtube/discovery-report", async (req, res) => {
    try {
      const adminClient = getSupabaseAdmin();
      if (!adminClient) throw new Error("Supabase Admin not configured");
      const { data, error } = await adminClient
        .from('youtube_ingestion_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      res.json(data || { message: "No reports found yet" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post("/channels/ingest", async (req, res) => {
    let { name, url, category, auto_publish = true } = req.body;
    if (!name || !url) return res.status(400).json({ error: "Name and URL are required" });

    try {
      const adminClient = getSupabaseAdmin()!;
      const apiKey = process.env.YOUTUBE_API_KEY || process.env.GEMINI_API_KEY;
      
      // Auto-enrich if YouTube
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

      // If auto_publish is set, go straight to tv_channels
      if (auto_publish) {
        const { data, error } = await adminClient
          .from('tv_channels')
          .upsert([{ 
             name, 
             url, 
             category, 
             thumbnail, 
             description,
             is_active: true,
             youtube_video_id: videoId || undefined
          }], { onConflict: 'url' })
          .select();

        if (error) throw error;
        return res.status(201).json(data[0]);
      }

      const { data, error } = await adminClient
        .from('discovered_channels')
        .insert([{ name, url, category, status: 'pending', description, thumbnail }])
        .select();

      if (error) {
        if (error.code === '23505') return res.status(409).json({ error: "Channel already exists" });
        throw error;
      }

      res.status(201).json(data[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.get("/channels/discovered", async (req, res) => {
    try {
      const adminClient = getSupabaseAdmin();
      if (!adminClient) throw new Error("Supabase Admin not configured");
      const { data, error } = await adminClient.from('discovered_channels').select('*').order('created_at', { ascending: false });
      if (error) {
        // Handle common Supabase table-not-found error
        if (error.code === 'PGRST116' || error.message?.includes('not found') || error.code === 'PGRST205') {
          return res.status(200).json([]); // Return empty array if table doesn't exist yet
        }
        throw error;
      }
      res.json(data || []);
    } catch (err: any) {
      console.error('[API discovered channels error]', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post("/channels/massive-expansion", async (req, res) => {
    try {
      const service = getIngestionService();
      if (!service) return res.status(503).json({ error: "Ingestion service not available" });
      
      const expansionSources = [
        { name: 'Global Index', url: 'https://iptv-org.github.io/iptv/index.m3u' },
        { name: 'English Entertainment', url: 'https://iptv-org.github.io/iptv/languages/eng.m3u' },
        { name: 'Nigeria', url: 'https://iptv-org.github.io/iptv/countries/ng.m3u' },
        { name: 'India', url: 'https://iptv-org.github.io/iptv/countries/in.m3u' },
        { name: 'Philippines', url: 'https://iptv-org.github.io/iptv/countries/ph.m3u' },
        { name: 'USA', url: 'https://iptv-org.github.io/iptv/countries/us.m3u' },
        { name: 'UK', url: 'https://iptv-org.github.io/iptv/countries/uk.m3u' },
        { name: 'Movies', url: 'https://iptv-org.github.io/iptv/categories/movies.m3u' },
        { name: 'News', url: 'https://iptv-org.github.io/iptv/categories/news.m3u' },
        { name: 'Sports', url: 'https://iptv-org.github.io/iptv/categories/sports.m3u' },
        { name: 'Kids', url: 'https://iptv-org.github.io/iptv/categories/kids.m3u' },
        { name: 'Documentary', url: 'https://iptv-org.github.io/iptv/categories/documentary.m3u' },
        { name: 'Music', url: 'https://iptv-org.github.io/iptv/categories/music.m3u' },
        { name: 'Religious', url: 'https://iptv-org.github.io/iptv/categories/religious.m3u' }
      ];

      // run in background to avoid timeout
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
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post("/channels/trigger-check", async (req, res) => {
    try {
      const service = getIngestionService();
      if (!service) return res.status(503).json({ error: "Ingestion service not available" });
      
      await service.runHealthChecks();
      res.json({ message: "Health check cycle completed on live channels" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. M3U Node.js Service Endpoint (Local JSON DB)
  apiRouter.get("/channels/local", async (req, res) => {
    try {
      const { category, country, sourceUrl } = req.query;
      const dataPath = path.join(process.cwd(), 'src', 'data', 'channels.json');
      
      // Ensure directory exists
      await fs.mkdir(path.dirname(dataPath), { recursive: true });

      let channels: any[] = [];
      
      // Try to read existing data first
      try {
        const fileContent = await fs.readFile(dataPath, 'utf-8');
        channels = JSON.parse(fileContent);
      } catch (e) {
        console.log("[M3U API] No existing JSON database found. Initializing...");
      }

      // If sourceUrl provided or database is empty, fetch fresh data
      if (sourceUrl || channels.length === 0) {
        const urlToFetch = (sourceUrl as string) || 'https://iptv-org.github.io/iptv/index.m3u';
        try {
          channels = await M3UService.fetchAndParse(urlToFetch);
          await fs.writeFile(dataPath, JSON.stringify(channels, null, 2));
        } catch (fetchErr: any) {
          console.error("[M3U API] Default fetch failed:", fetchErr.message);
          // If we have no channels and fetch failed, return empty instead of 500
          if (channels.length === 0) return res.json({ total_channels: 0, channels: [] });
        }
      }

      // Apply Filtering
      const filtered = M3UService.filterChannels(channels, {
        category: category as string,
        country: country as string
      });

      res.json({
        total_channels: filtered.length,
        channels: filtered.slice(0, 500) // Return top 500 for performance
      });
    } catch (err: any) {
      console.error("[M3U API Error]", err);
      res.status(500).json({ error: "Failed to process channel request" });
    }
  });

  apiRouter.post("/channels/refresh", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ error: "Playlist source URL required" });
      
      const channels = await M3UService.fetchAndParse(url);
      const dataPath = path.join(process.cwd(), 'src', 'data', 'channels.json');
      
      await fs.mkdir(path.dirname(dataPath), { recursive: true });
      await fs.writeFile(dataPath, JSON.stringify(channels, null, 2));
      
      res.json({ 
        success: true, 
        count: channels.length,
        message: "Channel database synchronized successfully"
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post("/channels/import-to-db", async (req, res) => {
    try {
      const dataPath = path.join(process.cwd(), 'src', 'data', 'channels.json');
      const fileContent = await fs.readFile(dataPath, 'utf-8');
      const channels = JSON.parse(fileContent);

      const supabaseAdmin = getSupabaseAdmin();
      if (!supabaseAdmin) throw new Error("Supabase Admin not configured");

      const { data, error } = await supabaseAdmin.from('tv_channels').insert(channels.map((c: any) => ({
        name: c.name,
        category: c.category,
        url: c.url,
        thumbnail: c.logo,
        description: '',
        is_active: true
      })));

      if (error) throw error;

      res.json({ success: true, count: channels.length });
    } catch (err: any) {
      console.error("[M3U Import Error]", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Start health check loop every 4 hours (Consolidated)
  /*
  setInterval(() => {
    const service = getIngestionService();
    if (service) service.runHealthChecks(150).catch(err => console.error('[Ingestion LOOP ERROR]', err));
  }, 15 * 60 * 1000);
  */

  // Fast mount for serverless environments
  app.use("/api", apiRouter);

  // Fallback Channel API for when RLS blocks the public frontend
  apiRouter.get("/news", async (req, res) => {
    try {
      if (!process.env.NEWS_API_KEY) {
         return res.json([]);
      }
      const response = await fetch(`https://newsapi.org/v2/top-headlines?country=ng&apiKey=${process.env.NEWS_API_KEY}`);
      const data = await response.json();
      res.json(data.articles || []);
    } catch (error) {
      console.error('Error fetching news:', error);
      res.status(500).json({ error: 'Failed to fetch news' });
    }
  });

  apiRouter.get("/channels", async (req, res) => {
    try {
      const admin = getSupabaseAdmin();
      if (!admin) {
        throw new Error("Supabase Admin Bridge not configured");
      }
      
      const { data, error } = await admin.from('tv_channels')
        .select('*')
        .eq('is_active', true)
        .order('order_index')
        .limit(1000);
      
      if (error) throw error;
      res.json({ channels: data || [] });
    } catch (err: any) {
      console.error('[API Channels] Failure:', err.message);
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  });

  // Catch-all 404 handler for API router - always return JSON, never HTML
  apiRouter.use((req, res) => {
    res.status(404).json({ success: false, error: `API route ${req.method} ${req.originalUrl} not found` });
  });

  // Helper utilities for real-time Voice Assistant fallback and key validation
  function isValidGeminiKey(key: string | undefined): boolean {
    if (!key) return false;
    const cleaned = key.trim().replace(/^['"]|['"]$/g, '');
    if (
      cleaned === "" ||
      cleaned.toLowerCase().includes("placeholder") ||
      cleaned.toLowerCase().includes("your_") ||
      cleaned.toLowerCase().includes("insert_") ||
      cleaned.toLowerCase().includes("api_key")
    ) {
      return false;
    }
    return cleaned.startsWith("AIzaSy");
  }

  function getSimulatedResponse(text: string, participants: string[]): string {
    const raw = text.toLowerCase().trim();
    const activeList = participants && participants.length > 0 
      ? participants.filter(id => id !== 'assistant').join(", ") 
      : "Sophia, Mary, and Jacob";

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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production" && !isVercel) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false
      },
      appType: "spa",
    });
    
    app.use(vite.middlewares);
  } else if (!isVercel) {
    // In production, files are in 'dist' directory relative to the project root
    const distPath = path.join(process.cwd(), 'dist');
    console.log(`[Production] Serving static files from: ${distPath}`);
    app.use(express.static(distPath));
    
    // Catch-all for SPA in production (Express 5 wildcard syntax)
    app.get('{*path}', (req, res) => {
      // If API route not found, return 404 json
      if (req.path.startsWith('/api')) {
        console.warn(`[API 404] ${req.method} ${req.path}`);
        return res.status(404).json({ success: false, error: "API route not found" });
      }
      
      console.log(`[SPA Fallback] Serving index.html for: ${req.path}`);
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global Error Handler for Express
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('[Express Global Error]', err);
    res.status(500).json({ 
      success: false, 
      error: 'Internal Server Error', 
      details: process.env.NODE_ENV === 'development' || isVercel ? err.message : undefined 
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

// Global initialization
if (!isVercel) {
  initApp(true).catch(err => {
    console.error("Critical failure during app initialization:", err);
  });
}

export default app;
