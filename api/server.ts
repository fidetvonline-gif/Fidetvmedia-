import app, { initApp } from '../server';

let initialized = false;

export default async function handler(req: any, res: any) {
  try {
    if (!initialized) {
      console.log("[Vercel] Initializing app...");
      await initApp(false);
      initialized = true;
      console.log("[Vercel] Initialization complete.");
    }
    return app(req, res);
  } catch (err: any) {
    console.error("[Vercel Initialization Error]", err);
    res.status(500).json({ 
      success: false, 
      error: "Initialization Error", 
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
}

