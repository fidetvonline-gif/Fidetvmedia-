import app, { initApp } from '../server.js';

let initialized = false;

export default async function handler(req: any, res: any) {
  try {
    if (!initialized) {
      console.log("[Vercel] Initializing app...");
      await initApp(false);
      initialized = true;
      console.log("[Vercel] Initialization complete.");
    }

    // Vercel's Node.js builder preserves the original req.url (e.g. /api/video-search).
    // Do NOT overwrite it with x-matched-path, which would be /api/server and break Express routing.
    if (req.url && (req.url === '/api/server' || req.url.startsWith('/api/server?'))) {
      if (req.query && req.query.path) {
        req.url = `/api/${req.query.path}`;
      }
    }

    return app(req, res);
  } catch (err: any) {
    console.error("[Vercel Function Error]", err);
    res.status(500).json({ 
      success: false, 
      error: "Server Error", 
      details: err.message || "An error occurred on the server.",
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
}

