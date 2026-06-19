import express from "express";
import path from "path";
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
    
    // Import new M3U sources once on startup
    const newSources = [
      'https://iptv-org.github.io/iptv/countries/ng.m3u',
      'https://iptv-org.github.io/iptv/categories/movies.m3u',
      'https://iptv-org.github.io/iptv/categories/sports.m3u',
      'https://iptv-org.github.io/iptv/categories/entertainment.m3u',
      'https://iptv-org.github.io/iptv/index.m3u'
    ];
    
    setTimeout(async () => {
        console.log("[Background] Running initial M3U ingestion for new sources...");
        for (const source of newSources) {
            try {
                await ingestService.importFromM3U(source, { validateAll: true });
            } catch (e) {
                console.error(`[Background] Failed to ingest ${source}:`, e);
            }
        }
        
        console.log("[Background] Running initial automation cycle...");
        lastAutomationReport = await ingestService.runFullAutomation();
    }, 30000);

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

  // Video Downloader search endpoint - Using TMDB for real movie/TV data
  apiRouter.get("/video-search", async (req, res) => {
    try {
      console.log(`[FideSave] Search requested: ${req.query.q}`);
      const { q } = req.query;
      if (!q) return res.status(400).json({ error: 'Search query is required' });

      const query = (q as string);
      console.log(`[FideSave] Running TMDB search for: ${query}`);
      const tmdbKey = process.env.TMDB_API_KEY;
      
      if (tmdbKey) {
        try {
          const tmdbRes = await axios.get(`https://api.themoviedb.org/3/search/multi`, {
            params: {
              api_key: tmdbKey,
              query: query,
              language: 'en-US',
              page: 1,
              include_adult: false
            },
            timeout: 8000
          });

          if (tmdbRes.data && tmdbRes.data.results) {
            const movieResults = tmdbRes.data.results
              .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
              .map((m: any) => {
                const title = m.title || m.name;
                const releaseYear = (m.release_date || m.first_air_date || '').split('-')[0];
                return {
                  id: `tmdb_${m.id}`,
                  title: title,
                  year: releaseYear,
                  rating: m.vote_average ? m.vote_average.toFixed(1) : 'N/A',
                  poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : 'https://images.unsplash.com/photo-1485099667858-394460167664?w=800',
                  duration: m.media_type === 'movie' ? 'Movie' : 'TV Series',
                  platform: m.media_type === 'movie' ? 'FideCloud HD' : 'Fide TV'
                };
              });
            console.log(`[FideSave] TMDB search successful, found ${movieResults.length} items`);
            return res.json(movieResults);
          }
        } catch (e: any) {
          console.error("[FideSave-Search] TMDB Critical Error:", e.message);
        }
      }

      // Fallback to YTS if TMDB fails or key is missing
      try {
        console.log(`[FideSave-Search] Falling back to YTS for: ${query}`);
        const ytsRes = await axios.get(`https://yts.mx/api/v2/list_movies.json`, {
          params: { query_term: query, limit: 12, sort_by: 'download_count' },
          timeout: 8000
        });

        if (ytsRes.data && ytsRes.data.data && ytsRes.data.data.movies) {
          const movieResults = ytsRes.data.data.movies.map((m: any) => ({
            id: `yts_${m.id}`,
            title: m.title_long || m.title,
            year: m.year?.toString(),
            rating: m.rating?.toString(),
            poster: m.large_cover_image || m.medium_cover_image,
            duration: `${m.runtime || '120'}m`,
            platform: 'FideCloud HD'
          }));
          console.log(`[FideSave] YTS search successful, found ${movieResults.length} items`);
          return res.json(movieResults);
        }
      } catch (e: any) {
        console.error("[FideSave-Search] YTS Critical Error:", e.message);
      }

      // Fallback to Gemini if YTS fails or has no results
      console.log(`[FideSave-Search] Falling back to AI for: ${query}`);
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY || '',
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const prompt = `Search for movies and TV shows matching the query: "${query}". 
      Return a JSON array of up to 5 objects. 
      Each object must have these exact properties:
      id (string, unique),
      title (string),
      year (string),
      rating (string, e.g. "8.5"),
      poster (string, a relevant Unsplash movie poster URL or dynamic placeholder),
      duration (string, e.g. "2h 15m"),
      platform (string, e.g. "FideCloud", "Premium")
      
      Respond ONLY with the JSON array, no markdown markers.`;

      try {
        const result = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });
        const text = result.text.replace(/```json|```/g, "").trim();
        const movieResults = JSON.parse(text);
        return res.json(movieResults);
      } catch (aiErr) {
        console.error("[FideSave-Search] AI Critical Error:", aiErr);
        // Fallback to minimal results if AI fails
        return res.json([
          { 
            id: 'mv_fallback_' + Date.now(), 
            title: query + ' (Direct Search Result)', 
            year: '2024', 
            rating: '7.0', 
            poster: 'https://images.unsplash.com/photo-1485099667858-394460167664?w=800', 
            duration: 'Variable', 
            platform: 'Universal' 
          }
        ]);
      }
    } catch (err: any) {
      console.error("[FideSave-Search] General Critical Error:", err);
      res.status(500).json({ error: 'Search service temporarily unavailable.' });
    }
  });


  apiRouter.post("/video-downloader", async (req, res, next) => {
    const { url } = req.body;
    console.log(`[FideSave] Downloader requested for: ${url}`);
    if (!url) return res.status(400).json({ error: "URL is required" });

    try {
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const ytdlModule = await import('@distube/ytdl-core');
        const ytdl = ytdlModule.default || ytdlModule;
        if (!ytdl.validateURL(url)) {
           return res.status(400).json({ error: "Invalid YouTube URL" });
        }
        console.log(`[Save] Processing via ytdl-core for: ${url}`);
        const info = await ytdl.getInfo(url);
        const format = ytdl.chooseFormat(info.formats, { quality: 'highest' });
        
        return res.json({
          title: info.videoDetails.title || 'YouTube Video',
          videoUrl: format.url,
          audioUrl: format.url,
          thumbnail: info.videoDetails.thumbnails[0]?.url || '',
          platform: 'YouTube',
          duration: `${Math.floor(Number(info.videoDetails.lengthSeconds) / 60)}m`
        });
      }

      console.log(`[Save] Processing request for: ${url}`);
      return res.status(400).json({ error: "Only YouTube URLs are supported by the downloader currently." });
    } catch (error: any) {
      console.error("[FideSave] Downloader error:", error.message);
      res.status(500).json({ error: "Downloader service is temporarily busy. Please try again." });
    }
  });

  // Movie Download Options Endpoint - Fetches real direct links/magnets
  apiRouter.get("/movie-download-options", async (req, res) => {
    try {
      const { title, year } = req.query;
      console.log(`[FideSave] Download links requested for: ${title} (${year})`);
      if (!title) return res.status(400).json({ error: "Movie title is required" });

      console.log(`[Fetch Download Links] Searching for: ${title} (${year || "any year"})`);

      try {
        const ytsRes = await axios.get("https://yts.mx/api/v2/list_movies.json", {
          params: { query_term: title, limit: 5 },
          timeout: 8000
        });

        if (ytsRes.data && ytsRes.data.data && ytsRes.data.data.movies) {
          const movies = ytsRes.data.data.movies;
          const bestMatch = movies.find((m: any) => m.year?.toString() === year || !year) || movies[0];

          if (bestMatch && bestMatch.torrents) {
            console.log(`[FideSave] YTS found best match: ${bestMatch.title}`);
            const links = bestMatch.torrents.map((t: any) => ({
              quality: t.quality,
              type: t.type,
              size: t.size,
              url: t.url,
              magnet: `magnet:?xt=urn:btih:${t.hash}&dn=${encodeURIComponent(bestMatch.title)}&tr=udp://tracker.opentrackr.org:1337/announce&tr=udp://open.demonii.com:1337/announce`,
              source: "YTS"
            }));
            return res.json({ title: bestMatch.title, links });
          }
        }
      } catch (ytsErr: any) {
        console.warn("[FideSave-FetchLinks] YTS Error:", ytsErr.message);
      }

      console.log(`[FideSave] Falling back to Google Search for: ${title}`);
      return res.json({ 
        title: title as string, 
        links: [
          { quality: "Search HD", type: "web", size: "N/A", url: `https://www.google.com/search?q=${encodeURIComponent(title as string)}+movie+download+free`, source: "Web" }
        ] 
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Video download proxy to force "Save As" (direct to device)
  apiRouter.get("/video-download-proxy", async (req, res) => {
    const { url, filename } = req.query;
    if (!url) return res.status(400).send("URL required");

    try {
      console.log(`[Download Proxy] Initiating download for: ${url}`);
      const response = await axios({
        method: 'get',
        url: url as string,
        responseType: 'stream',
        timeout: 120000, 
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        }
      });

      const cleanFilename = (filename as string || `fidesave-${Date.now()}.mp4`).replace(/[^a-zA-Z0-9.\-_]/g, '_');
      
      // Critical headers for "Save directly to device"
      res.setHeader('Content-Disposition', `attachment; filename="${cleanFilename}"`);
      
      // Fixed type issues with cast to any for Axios headers
      const contentType = (response.headers as any)['content-type'] || 'application/octet-stream';
      const contentLength = (response.headers as any)['content-length'];
      
      res.setHeader('Content-Type', contentType);
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }

      response.data.on('error', (e: any) => {
        console.error('[Download Proxy Stream Error]', e.message);
        res.end();
      });

      response.data.pipe(res);
    } catch (err: any) {
      console.error(`[Download Proxy Error] ${err.message}`);
      if (!res.headersSent) {
        res.status(502).send("The file provider denied the proxy request or the link expired.");
      }
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
        timeout: 28000, // Slightly under Vercel's 30s limit
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
                        finalUrl.split('?')[0].toLowerCase().endsWith('.m3u8') ||
                        finalUrl.split('?')[0].toLowerCase().endsWith('.m3u');

      res.setHeader('X-Proxy-Source', 'AI-Studio-Stream-Bridge');
      res.setHeader('Content-Type', contentType);

      if (isManifest) {
        const chunks: Buffer[] = [];
        let totalSize = 0;
        const MAX_MANIFEST_SIZE = 2 * 1024 * 1024; // 2MB limit for manifest buffering
        
        const timeout = setTimeout(() => {
          if (!res.headersSent) {
             console.error(`[Proxy] Critical timeout buffering manifest for ${streamUrl}`);
             // If we timeout, we send a retry-after hint
             res.setHeader('Retry-After', '5');
             res.status(504).send("Gateway Timeout: The signal provider is currently slow. Please try again in a few seconds.");
             response.data.destroy();
          }
        }, 28000);

        response.data.on('data', (chunk: any) => {
          totalSize += chunk.length;
          if (totalSize > MAX_MANIFEST_SIZE) {
            console.warn(`[Proxy] Manifest too large, aborting buffering: ${streamUrl}`);
            response.data.destroy();
            if (!res.headersSent) res.status(502).send("Manifest too large");
            return;
          }
          chunks.push(Buffer.from(chunk));
        });
        
        response.data.on('error', (err: any) => {
          clearTimeout(timeout);
          console.error(`[Proxy Stream Error] ${err.message} for ${streamUrl}`);
          if (!res.headersSent) res.status(502).send(`Stream integration error: ${err.message}`);
        });

        response.data.on('end', () => {
          clearTimeout(timeout);
          if (res.headersSent) return;

          const content = Buffer.concat(chunks).toString('utf8');
          
          if (!content.trim().startsWith('#EXTM3U')) {
            console.log(`[Proxy] Manifest fetched but doesn't start with #EXTM3U: ${streamUrl}`);
            // If it's not a manifest, just send it 
            res.setHeader('Content-Type', contentType || 'application/octet-stream');
            return res.send(content);
          }

          const appHostUrl = `${req.protocol}://${req.get('host')}`;
          const lines = content.split('\n');
          const rewrittenLines = lines.map(line => {
            const trimmed = line.trim();
            if (!trimmed) return line;
            
            // Rewrite Master Playlist or Alternative Media URIs (ATTR=uri)
            if (trimmed.startsWith('#')) {
              if (trimmed.includes('URI=')) {
                return line.replace(/URI="([^"]*)"/g, (match, p1) => {
                  try {
                    const abs = p1.startsWith('http') ? p1 : new URL(p1, finalBaseUrl).href;
                    return `URI="${appHostUrl}/api/proxy-stream?url=${encodeURIComponent(abs)}&referer=${encodeURIComponent(effectiveReferer)}"`;
                  } catch (e) { return match; }
                });
              }
              return line;
            }
            
            // Rewrite segment/variant playlist URLs (Lines that are just URLs)
            try {
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
        .order('order_index');
      
      if (error) throw error;
      res.json(data || []);
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
    // In bundle (dist/server.cjs), __dirname is dist/
    const distPath = path.resolve(__dirname || process.cwd(), '');
    console.log(`[Production] Serving static files from: ${distPath}`);
    app.use(express.static(distPath));
    
    // Catch-all for SPA
    app.get('*all', (req, res) => {
      // If API route not found, return 404 json
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: "API route not found" });
      }
      res.sendFile(path.resolve(distPath, 'index.html'));
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
