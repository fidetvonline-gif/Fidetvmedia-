import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

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

  // API routes
  app.post("/api/voice-assistant", async (req, res) => {
    const { text, participants = [] } = req.body;
    if (!text) {
      return res.status(400).json({ error: "No query text provided" });
    }

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      
      // If the provided API key is invalid or a placeholder, route to conversational simulation
      if (!isValidGeminiKey(apiKey)) {
        console.log("Fide Voice Assistant: Invalid or missing API key. Serving conversational fallback.");
        const simulatedText = getSimulatedResponse(text, participants);
        return res.json({ text: simulatedText });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const activeList = participants && participants.length > 0 ? participants.join(", ") : "Sophia and Mary";
      const prompt = `You are Fide's voice-activated assistant in a high-fidelity real-time VoIP group voice channel on FideTV. 
The user is speaking to you directly using voice commands in real-time.
Active participants in the voice room right now: ${activeList}.
The user said: "${text}".

Compose a short, direct, vocal response (max 2 sentences, 150 characters) that is perfect to be read aloud via Text-to-Speech to the user in the call. Keep the tone creative, smart, welcoming, and media-focused. Do not include markdown, asterisks, or any special styling. Keep it plain text.`;

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
      });

      res.json({ text: response.text || "I am connected and ready." });
    } catch (error: any) {
      console.warn("Gemini assistant error, serving beautiful conversational fallback:", error);
      const simulatedText = getSimulatedResponse(text, participants);
      res.json({ text: simulatedText });
    }
  });

  app.get("/api/youtube/:endpoint", async (req, res) => {
    try {
      const apiKey = process.env.YOUTUBE_API_KEY;
      if (!apiKey || apiKey.trim() === '') {
        console.error('YouTube API key is missing or empty');
        return res.status(500).json({ 
          error: { message: "YouTube API key not configured in server environment." } 
        });
      }
      const { endpoint } = req.params;
      const queryParams = new URLSearchParams(req.query as Record<string, string>);
      queryParams.set('key', apiKey);

      const url = `https://www.googleapis.com/youtube/v3/${endpoint}?${queryParams.toString()}`;
      console.log(`[YouTube Proxy] Fetching ${endpoint} with params:`, Object.fromEntries(queryParams.entries()));
      
      const response = await fetch(url);
      const data = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        console.error(`[YouTube Proxy] API Error ${response.status}:`, JSON.stringify(data));
        return res.status(response.status).json(data);
      }
      
      console.log(`[YouTube Proxy] Successfully fetched ${endpoint}. Items found: ${data.items?.length || 0}`);
      res.json(data);
    } catch (error: any) {
      console.error('[YouTube Proxy] Unexpected Error:', error);
      res.status(500).json({ 
        error: { message: error.message || 'Internal server error while fetching from YouTube' } 
      });
    }
  });

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
