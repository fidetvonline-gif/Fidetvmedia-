import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { ChannelIngestionService } from "./src/services/channelIngestionService";
import { YouTubeIngestionService } from "./src/services/youtubeIngestionService";
import multer from "multer";

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
      const { bucket = "thumbnails" } = req.body;
      
      if (!file) {
        console.warn("[Storage] No file in request");
        return res.status(400).json({ error: "No file provided for upload" });
      }

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

      console.log(`[Storage] Uploading ${file.originalname} to bucket ${bucket} as ${filePath} (${file.mimetype})`);

      // 1. Try uploading
      let { error: uploadError } = await adminClient.storage
        .from(bucket)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: true
        });

      // 2. If bucket not found, try creating it and retry
      if (uploadError && uploadError.message?.toLowerCase().includes('bucket not found')) {
        console.log(`[Storage] Bucket "${bucket}" not found, attempting to auto-create...`);
        const { error: createError } = await adminClient.storage.createBucket(bucket, {
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
          .from(bucket)
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
        .from(bucket)
        .getPublicUrl(filePath);

      console.log(`[Storage] Upload success. Public URL: ${publicUrl}`);
      res.json({ publicUrl });
    } catch (err: any) {
      console.error("[Storage API Critical Error]", err);
      res.status(500).json({ error: "Storage service encountered an internal error: " + err.message });
    }
  });

  // 4. YouTube Proxy (Specific routes FIRST to avoid shadowing)
  apiRouter.get("/youtube/metadata", async (req, res) => {
    try {
      const { url } = req.query;
      if (!url) return res.status(400).json({ error: "URL is required" });
      
      const videoId = YouTubeIngestionService.extractVideoId(url as string);
      if (!videoId) return res.status(400).json({ error: "Invalid YouTube URL" });
      
      const metadata = await youtubeIngestion.getVideoMetadata(videoId);
      res.json(metadata);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.get("/youtube/:endpoint", async (req, res) => {
    try {
      const apiKey = process.env.YOUTUBE_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "YouTube key missing" });
      
      const { endpoint } = req.params;
      const queryParams = new URLSearchParams(req.query as any);
      queryParams.set('key', apiKey);

      const response = await fetch(`https://www.googleapis.com/youtube/v3/${endpoint}?${queryParams.toString()}`);
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 4. HLS/M3U8 Stream Proxy with Manifest Rewriting
  apiRouter.get("/proxy-stream", async (req, res) => {
    const { url, referer } = req.query;
    if (!url) return res.status(400).send("No URL provided");
    
    try {
      const streamUrl = url as string;
      
      // Basic URL check
      try {
        new URL(streamUrl);
      } catch (e) {
        return res.status(400).send("Invalid stream URL");
      }

      console.log(`[Proxy] Fetching: ${streamUrl}`);
      
      const response = await fetch(streamUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': (referer as string) || 'https://limex.tv/',
          'Origin': 'https://limex.tv'
        },
        // Set a reasonable timeout for proxy requests
        signal: AbortSignal.timeout(15000)
      });
      
      if (!response.ok) {
        console.warn(`[Proxy] Source returned status ${response.status} for ${streamUrl}`);
        return res.status(response.status).send(`Upstream returned ${response.status}`);
      }

      const contentType = response.headers.get('Content-Type') || '';
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', contentType);

      if (contentType.includes('application/vnd.apple.mpegurl') || contentType.includes('audio/mpegurl') || streamUrl.endsWith('.m3u8')) {
        // It's a manifest - we must rewrite relative URLs to keep them in the proxy
        const text = await response.text();
        const baseUrl = streamUrl.substring(0, streamUrl.lastIndexOf('/') + 1);
        
        const rewrittenText = text.split('\n').map(line => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) return line;
          
          // It's a URI
          let absoluteUrl = trimmed;
          try {
            if (!trimmed.startsWith('http')) {
              absoluteUrl = new URL(trimmed, baseUrl).href;
            }
          } catch (e) {
            return line;
          }
          
          return `/api/proxy-stream?url=${encodeURIComponent(absoluteUrl)}&referer=${encodeURIComponent(referer as string || 'https://limex.tv/')}`;
        }).join('\n');
        
        res.send(rewrittenText);
      } else {
        // It's a segment (.ts) or other binary data - pipe directly
        const body = await response.arrayBuffer();
        res.send(Buffer.from(body));
      }
    } catch (error: any) {
      // Handle known error types like ENOTFOUND or timeout
      if (error.name === 'AbortError') {
        console.error(`[Proxy Timeout] URL: ${url}`);
        return res.status(504).send("Stream source timed out");
      }
      
      if (error.code === 'ENOTFOUND' || error.message?.includes('ENOTFOUND')) {
        // Quietly handle known unreachable streams
        return res.status(502).send("Stream source domain not found (Source is currently offline)");
      }

      console.error("[Proxy Unexpected Error]", error.message || error);
      res.status(502).send("Stream proxy failed to reach destination");
    }
  });

  // 5. Channel Ingestion System
  const ingestionService = new ChannelIngestionService(getSupabaseAdmin());
  const youtubeIngestion = new YouTubeIngestionService(getSupabaseAdmin()!, process.env.YOUTUBE_API_KEY || "");

  // Weekly maintenance or triggered checks
  setInterval(() => {
    ingestionService.runHealthChecks().catch(console.error);
  }, 1000 * 60 * 60 * 24); // Once a day primary health check

  // YouTube Ingestion - Every 60 minutes
  setInterval(() => {
    youtubeIngestion.runDiscoveryCycle().catch(console.error);
  }, 1000 * 60 * 60);

  // Manual trigger endpoints
  apiRouter.post("/youtube/trigger-discovery", async (req, res) => {
    try {
      const report = await youtubeIngestion.runDiscoveryCycle();
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post("/channels/sync-thumbnails", async (req, res) => {
    try {
      const adminClient = getSupabaseAdmin();
      if (!adminClient) throw new Error("Supabase Admin not configured");

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
            const metadata = await youtubeIngestion.getVideoMetadata(videoId);
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
    let { name, url, category } = req.body;
    if (!name || !url) return res.status(400).json({ error: "Name and URL are required" });

    try {
      const adminClient = getSupabaseAdmin();
      
      // Auto-enrich if YouTube
      const videoId = YouTubeIngestionService.extractVideoId(url);
      let thumbnail = null;
      if (videoId) {
        try {
          const metadata = await youtubeIngestion.getVideoMetadata(videoId);
          thumbnail = metadata.thumbnail;
          if (!name || name === "New Channel") name = metadata.title;
        } catch (e) {
          console.warn("[YouTube Enrichment Error]", e);
        }
      }

      const { data, error } = await adminClient
        .from('discovered_channels')
        .insert([{ name, url, category, status: 'pending' }])
        .select();

      if (error) {
        if (error.code === '23505') return res.status(409).json({ error: "Channel URL already exists" });
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
    await ingestionService.runHealthChecks();
    res.json({ message: "Health check cycle triggered" });
  });

  // Start health check loop every 5 minutes
  setInterval(() => {
    ingestionService.runHealthChecks().catch(err => console.error('[Ingestion LOOP ERROR]', err));
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
