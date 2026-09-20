import app, { initApp } from '../server.js';

let initialized = false;

export default async function handler(req: any, res: any) {
  try {
    if (!initialized) {
      await initApp(false);
      initialized = true;
    }

    // Ensure req.socket and remoteAddress exist to prevent crashes in forward proxy libraries
    if (!req.socket) {
      req.socket = {};
    }
    if (!req.socket.remoteAddress) {
      const forwarded = req.headers['x-forwarded-for'];
      req.socket.remoteAddress = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '127.0.0.1';
    }

    // Reconstruct the real URL in Vercel's rewrite environment
    const xMatched = req.headers['x-matched-path'] || req.headers['x-vercel-matched-path'] || req.headers['x-rewrite-url'];
    if (xMatched && typeof xMatched === 'string' && xMatched.startsWith('/api/') && !xMatched.startsWith('/api/server')) {
      req.url = xMatched;
    } else if (req.url && (req.url === '/api/server' || req.url.startsWith('/api/server?'))) {
      if (req.query && req.query.path) {
        const queryPath = Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path;
        req.url = `/api/${queryPath}`;
      }
    }

    // Express app(req, res) does not return a Promise; wrap in a Promise to keep Vercel Lambda alive
    return await new Promise((resolve) => {
      let settled = false;
      const done = () => {
        if (!settled) {
          settled = true;
          resolve(undefined);
        }
      };

      res.once('finish', done);
      res.once('close', done);
      res.once('error', (err: any) => {
        console.error("[Vercel Response Stream Error]", err);
        done();
      });

      app(req, res, (err: any) => {
        if (err) {
          console.error("[Vercel Express Unhandled Error]", err);
          if (!res.headersSent) {
            res.status(500).json({ 
              success: false, 
              error: "Internal Server Error", 
              details: err.message || "An unexpected error occurred." 
            });
          }
        }
        done();
      });
    });
  } catch (err: any) {
    console.error("[Vercel Function Error]", err);
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        error: "Server Error", 
        details: err.message || "An error occurred on the server.",
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }
  }
}

