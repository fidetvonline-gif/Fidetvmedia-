import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import axios from "axios";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { ChannelIngestionService } from "./src/services/channelIngestionService";
import { YouTubeIngestionService } from "./src/services/youtubeIngestionService";
import { M3UService } from "./src/services/m3uService";
import multer from "multer";
import fs from "fs/promises";
import rateLimit from "express-rate-limit";

dotenv.config();

const app = express();
app.use(cors());
app.set("trust proxy", 1);
const PORT = 3000;

// Apply basic rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per `window`
  message: "Too many requests from this IP, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // Limit each IP to 100 uploads per hour
  message: "Too many uploads from this IP, please try again later",
});

app.use("/api/", apiLimiter);

// Global Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Allow the app to be embedded in iframes for the AI Studio preview
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy: Allow YouTube, Google Fonts, and internal assets
  // Added frame-ancestors 'self' https://ai.studio https://*.google.com to allow embedding in preview
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://s.ytimg.com https://js.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://js.stripe.com; connect-src 'self' https://*.supabase.co https://*.googleapis.com wss://*.supabase.co; frame-ancestors 'self' https://*.google.com https://ai.studio;");
  next();
});

const apiRouter = express.Router();

const upload = multer({ 
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  storage: multer.memoryStorage()
});

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

// Check if we are running in a serverless environment (like Vercel)
const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL_URL;

async function initApp() {
  // Store the last automation report
  let lastAutomationReport: any = { status: "No cycle run yet" };

  // Database Setup
  const supabase = getSupabaseAdmin();
  const ingestService = supabase ? new ChannelIngestionService(supabase) : null;

  // Background Automation Task (Every 15 minutes)
  if (ingestService) {
    console.log("[Background] Starting 15-minute automation scheduler...");
    
    // Massive Ingestion: Import from high-quality sources based on user priorities
    const expansionSources = [
      // Major International & English
      { name: 'Global Index', url: 'https://iptv-org.github.io/iptv/index.m3u' },
      { name: 'English Entertainment', url: 'https://iptv-org.github.io/iptv/languages/eng.m3u' },
      
      // High Priority Countries
      { name: 'Nigeria', url: 'https://iptv-org.github.io/iptv/countries/ng.m3u' },
      { name: 'India', url: 'https://iptv-org.github.io/iptv/countries/in.m3u' },
      { name: 'Philippines', url: 'https://iptv-org.github.io/iptv/countries/ph.m3u' },
      { name: 'USA', url: 'https://iptv-org.github.io/iptv/countries/us.m3u' },
      { name: 'UK', url: 'https://iptv-org.github.io/iptv/countries/uk.m3u' },
      
      // Category Specific
      { name: 'Movies', url: 'https://iptv-org.github.io/iptv/categories/movies.m3u' },
      { name: 'News', url: 'https://iptv-org.github.io/iptv/categories/news.m3u' },
      { name: 'Sports', url: 'https://iptv-org.github.io/iptv/categories/sports.m3u' },
      { name: 'Kids', url: 'https://iptv-org.github.io/iptv/categories/kids.m3u' },
      { name: 'Documentary', url: 'https://iptv-org.github.io/iptv/categories/documentary.m3u' },
      { name: 'Music', url: 'https://iptv-org.github.io/iptv/categories/music.m3u' },
      { name: 'Religious', url: 'https://iptv-org.github.io/iptv/categories/religious.m3u' }
    ];
    
    setTimeout(async () => {
        console.log("[Background] Starting Massive Database Expansion Cycle...");
        for (const source of expansionSources) {
            try {
                await ingestService.importFromM3U(source.url, { validateAll: true });
            } catch (e) {
                console.error(`[Background] Expansion failed for ${source.name}:`, e);
            }
        }
        
        console.log("[Background] Running initial database optimization & health check...");
        lastAutomationReport = await ingestService.runFullAutomation();
    }, 60000);

    // Schedule periodic runs
    setInterval(async () => {
      console.log("[Background] Running scheduled automation cycle...");
      lastAutomationReport = await ingestService.runFullAutomation();
    }, 15 * 60 * 1000);
  }

  // Logging middleware for all API calls
  apiRouter.use(express.json());
  apiRouter.use((req, res, next) => {
    console.log(`[API Router] ${req.method} ${req.url}`);
    next();
  });

  // Health check endpoint
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

  // Video Downloader search endpoint - Using TMDB for real movie/TV data with enhanced diagnostics
  apiRouter.get("/video-search", validateLinkAccess, async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) return res.status(400).json({ error: 'Search query is required' });

      const query = (q as string).trim();
      const userProfile = (req as any).userProfile || { id: 'guest', role: 'guest' };
      console.log(`[Universal-Search] Query: "${query}" | From: ${userProfile.id} (${userProfile.role})`);
      
      const allResults: any[] = [];
      const diagnostics: any[] = [];
      const axiosConfig = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        },
        timeout: 10000
      };

    try {
      const ruhendModule = await import("ruhend-scraper");
      const ruhend = (ruhendModule as any).default || ruhendModule;
      
      const ytSearchMethod = (ruhend as any).ytsearch || ((ruhend as any).search && (ruhend as any).search.youtube);
      if (ytSearchMethod) {
        console.log(`[Search] Querying YouTube for: ${query}`);
        const ytResults = await ytSearchMethod(query + " movie");
        
        if (ytResults && Array.isArray(ytResults)) {
          console.log(`[Search] YouTube found ${ytResults.length} items`);
          ytResults.slice(0, 12).forEach((v: any) => {
            const vid = typeof v.id === 'object' ? (v.id.videoId || v.id.id) : (v.id || v.videoId);
            if (vid && v.title) {
                allResults.push({
                  id: `yt_${vid}`,
                  title: v.title,
                  year: v.publishedTime || v.ago || 'New',
                  rating: '4.8',
                  poster: v.thumbnail || v.image || (v.thumbnails && v.thumbnails[0]?.url) || 'https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?w=800',
                  duration: v.duration || v.timestamp || 'N/A',
                  platform: 'YouTube',
                  link: v.url || `https://www.youtube.com/watch?v=${vid}`
                });
            }
          });
        }
      }
    } catch (e: any) {
      console.error("[Search] YouTube Scraper Error:", e.message);
    }

      // 2. TMDB Search (Metadata for movies)
      const tmdbKey = process.env.TMDB_API_KEY;
      if (tmdbKey && tmdbKey !== "YOUR_TMDB_API_KEY" && tmdbKey.trim().length > 5) {
        try {
          const tmdbRes = await axios.get(`https://api.themoviedb.org/3/search/movie`, {
            ...axiosConfig,
            params: { api_key: tmdbKey, query }
          });
          if (tmdbRes.data?.results) {
            console.log(`[Search] TMDB found ${tmdbRes.data.results.length} results`);
            tmdbRes.data.results.slice(0, 15).forEach((m: any) => {
              if (!allResults.find(r => r.title.toLowerCase() === (m.title||'').toLowerCase())) {
                allResults.push({
                  id: `tmdb_${m.id}`,
                  title: m.title,
                  year: (m.release_date || '').split('-')[0] || 'TBA',
                  rating: m.vote_average?.toFixed(1) || 'N/A',
                  poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : 'https://images.unsplash.com/photo-1485099667858-394460167664?w=800',
                  duration: 'Movie',
                  platform: 'TMDB Registry',
                  link: `https://www.themoviedb.org/movie/${m.id}`
                });
              }
            });
          }
        } catch (e: any) {
          console.error("[Search] TMDB API Error:", e.message);
          diagnostics.push(`TMDB API: ${e.message}`);
        }
      } else {
        diagnostics.push("TMDB_API_KEY is missing or invalid in environment.");
        console.warn("[Search] TMDB_API_KEY is missing or default.");
      }

      // 3. YTS Fallback
      try {
        const ytsRes = await axios.get(`https://yts.mx/api/v2/list_movies.json`, {
          ...axiosConfig,
          params: { query_term: query, limit: 8 }
        });
        if (ytsRes.data?.data?.movies) {
          console.log(`[Search] YTS found ${ytsRes.data.data.movies.length} results`);
          ytsRes.data.data.movies.forEach((m: any) => {
            if (!allResults.find(r => r.id.includes(m.id.toString()))) {
              allResults.push({
                id: `yts_${m.id}`,
                title: m.title_long || m.title,
                year: m.year?.toString(),
                rating: m.rating?.toString(),
                poster: m.medium_cover_image,
                duration: `${m.runtime || '120'}m`,
                platform: 'FideCloud HD'
              });
            }
          });
        }
      } catch (e: any) {
        console.error("[Search] YTS API Error:", e.message);
      }

      console.log(`[Universal-Search] Total unique results for "${query}": ${allResults.length}`);
      
      if (allResults.length === 0) {
          return res.json({ 
            results: [], 
            diagnostics,
            debug: { has_tmdb: !!process.env.TMDB_API_KEY, query } 
          });
      }

      return res.json(allResults.slice(0, 32));
    } catch (err: any) {
      console.error("[Search] Critical Hub Error:", err.message);
      res.status(500).json({ error: 'Universal Search Hub failed' });
    }
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

  // Movie Download Options Endpoint - Fetches real direct links/magnets
  apiRouter.get("/movie-download-options", validateLinkAccess, async (req, res) => {
    try {
      const { title, year } = req.query;
      console.log(`[Universal-Fetch] links for: ${title} (${year})`);
      if (!title) return res.status(400).json({ error: "Movie title is required" });

      const links: any[] = [];

      // 1. Try YTS (Quality First)
      try {
        const ytsRes = await axios.get("https://yts.mx/api/v2/list_movies.json", {
          params: { query_term: title, limit: 1 },
          timeout: 5000
        });

        if (ytsRes.data?.data?.movies) {
          const m = ytsRes.data.data.movies[0];
          if (m?.torrents) {
            m.torrents.forEach((t: any) => {
              links.push({
                quality: `${t.quality} HD`,
                type: t.type,
                size: t.size,
                url: t.url,
                magnet: `magnet:?xt=urn:btih:${t.hash}&dn=${encodeURIComponent(m.title)}&tr=udp://tracker.opentrackr.org:1337/announce`,
                source: "FideCloud P2P"
              });
            });
          }
        }
      } catch (e) {}

      // 2. Try Universal Scrapers (YouTube/Social)
      try {
        const ruhend: any = await import("ruhend-scraper");
        if (ruhend.search && ruhend.search.youtube) {
          const ytResults = await ruhend.search.youtube(`${title} full movie`);
          if (ytResults && Array.isArray(ytResults)) {
            ytResults.slice(0, 3).forEach((vid: any) => {
              links.push({
                quality: "Direct DL",
                type: "stream",
                size: "Variable",
                url: vid.url,
                source: "Social",
                note: vid.title
              });
            });
          }
        }
      } catch (e) {}

      if (links.length === 0) {
        links.push({ 
           quality: "External Link", 
           type: "web", 
           size: "N/A", 
           url: `https://www.google.com/search?q=${encodeURIComponent(title as string)}+download+free`, 
           source: "Web" 
        });
      }

      return res.json({ title: title as string, links });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
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
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: `User said: "${text}". Assistant in VoIP room. Active: ${participants.join(", ")}. Short plain text vocal response.`,
      });

      res.json({ text: response.text || "I am connected." });
    } catch (error) {
      res.json({ text: getSimulatedResponse(text, participants) });
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
      const apiKey = process.env.YOUTUBE_API_KEY || process.env.GEMINI_API_KEY;
      if (!adminClient || !apiKey) throw new Error("Server not configured correctly");

      const service = new YouTubeIngestionService(adminClient, apiKey);
      // UCnYRsis2rkO8401trlHM7aA is @fidetvmedia
      const videos = await service.getFormattedVideosForChannel('UCnYRsis2rkO8401trlHM7aA');
      res.json(videos);
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
  setInterval(() => {
    const service = getIngestionService();
    if (service) service.runHealthChecks().catch(console.error);
  }, 1000 * 60 * 60 * 24); // Once a day primary health check

  // YouTube Ingestion - Every 60 minutes
  setInterval(() => {
    const service = getYouTubeService();
    if (service) service.runDiscoveryCycle(2).catch(console.error);
  }, 1000 * 60 * 60);

  // Background stats update every 15 minutes
  setInterval(() => {
    const admin = getSupabaseAdmin();
    const key = process.env.YOUTUBE_API_KEY || process.env.GEMINI_API_KEY;
    if (admin && key) {
       const service = new YouTubeIngestionService(admin, key);
       service.updateAllChannelStats().catch(err => console.error("Periodic stats update failed:", err));
    }
  }, 15 * 60 * 1000);

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

  // Start health check loop every 15 minutes (was 5 but let's be more efficient with larger batches)
  setInterval(() => {
    const service = getIngestionService();
    if (service) service.runHealthChecks(150).catch(err => console.error('[Ingestion LOOP ERROR]', err));
  }, 15 * 60 * 1000);

  // Fast mount for serverless environments
  app.use("/api", apiRouter);

  // Fallback Channel API for when RLS blocks the public frontend
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
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false
      },
      appType: "spa",
    });
    
    app.use(vite.middlewares);
  } else {
    // In production, files are in 'dist' directory relative to the project root
    const distPath = path.join(process.cwd(), 'dist');
    console.log(`[Production] Serving static files from: ${distPath}`);
    app.use(express.static(distPath));
    
    // Catch-all for SPA
    app.get(/(.*)/, (req, res) => {
      // If API route not found, return 404 json
      if (req.path.startsWith('/api')) {
        console.warn(`[API 404] ${req.method} ${req.path}`);
        return res.status(404).json({ error: "API route not found" });
      }
      
      console.log(`[SPA Fallback] Serving index.html for: ${req.path}`);
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Global initialization
initApp().catch(err => {
  console.error("Critical failure during app initialization:", err);
});

export default app;
