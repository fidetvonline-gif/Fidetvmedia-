import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

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

  // 3. YouTube Proxy
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
