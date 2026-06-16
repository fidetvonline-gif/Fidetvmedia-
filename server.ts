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

dotenv.config();

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

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  // API Router cleanup and organization
  const apiRouter = express.Router();

  // Logging middleware for all API calls
  apiRouter.use((req, res, next) => {
    console.log(`[API Router] ${req.method} ${req.url}`);
    next();
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
  apiRouter.post("/storage/upload", (req, res, next) => {
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

  // 4b. Stream Health Check Proxy
  apiRouter.get("/stream-health", async (req, res) => {
    const { url, type } = req.query;
    if (!url) return res.status(400).json({ valid: false, errorMessage: "No URL" });
    
    try {
        const streamUrl = url as string;
        console.log(`[Health] Checking ${streamUrl} (Type: ${type})`);
        
        const response = await axios.head(streamUrl, {
            timeout: 8000,
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': streamUrl
            }
        });
        
        const contentType = (response.headers['content-type'] as string) || '';
        const status = response.status;
        
        let valid = status >= 200 && status < 300;
        let errorMessage = valid ? '' : `HTTP ${status}`;
        
        // Basic type validation
        if (type === 'hls' && !contentType.includes('mpegurl')) valid = false;
        if (type === 'mp4' && !contentType.includes('video')) valid = false;
        
        res.json({
            valid,
            httpStatus: status,
            contentType,
            errorMessage,
            lastChecked: new Date().toISOString()
        });
    } catch (e: any) {
        res.json({
            valid: false,
            httpStatus: e.response?.status || 0,
            errorMessage: e.message,
            lastChecked: new Date().toISOString()
        });
    }
  });

  // 4. HLS/M3U8 Stream Proxy with Manifest Rewriting
  apiRouter.all("/proxy-stream", async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');
      return res.status(204).end();
    }

    const { url, referer } = req.query;
    if (!url) {
      console.error("[Proxy] No URL provided in request");
      return res.status(400).send("No URL provided");
    }
    
    const streamUrl = url as string;
    console.log(`[Proxy] Incoming request for: ${streamUrl}`);
    
    try {
      try {
        new URL(streamUrl);
      } catch (e) {
        console.error(`[Proxy] Invalid URL format: ${streamUrl}`);
        return res.status(400).send("Invalid stream URL");
      }

      const targetOrigin = new URL(streamUrl).origin;
      const effectiveReferer = (referer as string) || (streamUrl.includes('limex') ? 'https://limex.tv/' : targetOrigin);

      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': effectiveReferer,
        'Origin': (streamUrl.includes('limex') || streamUrl.includes('linear')) ? 'https://limex.tv' : targetOrigin,
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Accept-Encoding': 'identity',
        'Pragma': 'no-cache',
      };

      if (req.headers.range) {
        headers['Range'] = String(req.headers.range);
      }

      const response = await axios.get(streamUrl, {
        headers,
        timeout: 20000,
        responseType: 'stream',
        validateStatus: () => true,
        maxRedirects: 5
      });
      
      const finalUrl = response.request?.res?.responseUrl || streamUrl;
      const finalOrigin = new URL(finalUrl).origin;

      if (response.status >= 400) {
        console.warn(`[Proxy] Upstream ERROR ${response.status} for ${streamUrl}`);
        return res.status(response.status).send(`Upstream Error ${response.status}`);
      }

      const contentType = String(response.headers['content-type'] || '').toLowerCase();
      const isManifest = contentType.includes('mpegurl') || 
                        contentType.includes('mpeg-url') ||
                        contentType.includes('apple-mpegurl') ||
                        finalUrl.split('?')[0].toLowerCase().endsWith('.m3u8') ||
                        finalUrl.split('?')[0].toLowerCase().endsWith('.m3u');

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('X-Proxy-Source', 'AI-Studio-Bridge');

      if (isManifest) {
        const chunks: any[] = [];
        response.data.on('data', (chunk: any) => { chunks.push(chunk); });
        
        response.data.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const text = buffer.toString('utf8');
          
          if (!text.trim().startsWith('#EXTM3U')) {
            res.setHeader('Content-Type', contentType);
            return res.status(200).send(buffer);
          }

          const baseUrl = finalUrl.substring(0, finalUrl.lastIndexOf('/') + 1);
          const lines = text.split('\n');
          const rewrittenLines = [];
          
          for (let line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) {
              if (trimmed.includes('URI=')) {
                line = line.replace(/URI="([^"]*)"/g, (match, p1) => {
                  try {
                    const abs = p1.startsWith('http') ? p1 : new URL(p1, baseUrl).href;
                    return `URI="/api/proxy-stream?url=${encodeURIComponent(abs)}&referer=${encodeURIComponent(effectiveReferer)}"`;
                  } catch (e) { return match; }
                });
              }
              rewrittenLines.push(line);
              continue;
            }
            
            try {
              const absoluteUrl = trimmed.startsWith('http') ? trimmed : new URL(trimmed, baseUrl).href;
              rewrittenLines.push(`/api/proxy-stream?url=${encodeURIComponent(absoluteUrl)}&referer=${encodeURIComponent(effectiveReferer)}`);
            } catch (e) { rewrittenLines.push(line); }
          }
          
          res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
          res.status(200).send(rewrittenLines.join('\n'));
        });
      } else {
        res.status(response.status);
        res.setHeader('Content-Type', contentType);
        if (response.headers['content-length']) res.setHeader('Content-Length', String(response.headers['content-length']));
        if (response.headers['content-range']) res.setHeader('Content-Range', String(response.headers['content-range']));
        response.data.pipe(res);
      }
    } catch (error: any) {
      console.error(`[Proxy Failure] ${error.message}`);
      if (!res.headersSent) res.status(502).send(`Bridge Failure: ${error.message}`);
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

  // 6. M3U Node.js Service Endpoint
  apiRouter.get("/channels", async (req, res) => {
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

  // Start health check loop every 5 minutes
  setInterval(() => {
    const service = getIngestionService();
    if (service) service.runHealthChecks().catch(err => console.error('[Ingestion LOOP ERROR]', err));
  }, 5 * 60 * 1000);

  // Mount the API Router
  app.use("/api", apiRouter);

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
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
