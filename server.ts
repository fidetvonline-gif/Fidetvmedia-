import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API routes
  app.get("/api/youtube/:endpoint", async (req, res) => {
    try {
      const apiKey = process.env.YOUTUBE_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "YouTube API key not configured" });
      }
      const { endpoint } = req.params;
      const queryParams = new URLSearchParams(req.query as Record<string, string>);
      queryParams.set('key', apiKey);

      const url = `https://www.googleapis.com/youtube/v3/${endpoint}?${queryParams.toString()}`;
      console.log('Fetching from YouTube API:', url);
      const response = await fetch(url);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Error fetching from YouTube API', error);
      res.status(500).json({ error: 'Failed to fetch' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
