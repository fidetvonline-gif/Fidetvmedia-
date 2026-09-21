import app, { initApp } from '../server.js';

let initialized = false;

function sendJson(res: any, status: number, data: any) {
  if (res.headersSent) return;
  try {
    res.setHeader('Content-Type', 'application/json');
  } catch {}
  res.statusCode = status;
  res.end(JSON.stringify(data));
}

export default async function handler(req: any, res: any) {
  try {
    // Fast-path for health check to ensure zero-latency diagnostic reporting
    const reqUrl = req.url || '';
    const matchedPath = req.headers['x-matched-path'] || req.headers['x-vercel-matched-path'] || req.headers['x-rewrite-url'] || '';
    const isHealthCheck = reqUrl.includes('fidesave-health') || 
                          matchedPath.includes('fidesave-health') ||
                          (req.query && (req.query.path === 'fidesave-health' || (Array.isArray(req.query.path) && req.query.path.includes('fidesave-health'))));
    if (isHealthCheck) {
      sendJson(res, 200, {
        status: "ok",
        service: "fidesave",
        environment: "vercel-serverless",
        timestamp: new Date().toISOString()
      });
      return;
    }

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
    try {
      const urlObj = new URL(req.url || '/', 'http://localhost');
      const xMatched = req.headers['x-matched-path'] || req.headers['x-vercel-matched-path'] || req.headers['x-rewrite-url'];
      if (typeof xMatched === 'string' && xMatched.startsWith('/api/') && !xMatched.startsWith('/api/server')) {
        req.url = xMatched;
      } else if (urlObj.pathname === '/api/server' || urlObj.pathname.startsWith('/api/server')) {
        const pathParam = urlObj.searchParams.get('path') || (req.query && req.query.path);
        if (pathParam) {
          const cleanPath = Array.isArray(pathParam) ? pathParam.join('/') : pathParam;
          urlObj.pathname = `/api/${cleanPath.replace(/^\/+/, '')}`;
          urlObj.searchParams.delete('path');
          req.url = urlObj.pathname + (urlObj.search ? urlObj.search : '');
        }
      }
    } catch (urlErr) {
      console.warn('[Vercel URL Normalization Error]', urlErr);
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
            sendJson(res, 500, { 
              success: false, 
              error: "Internal Server Error", 
              details: err.message || "An unexpected error occurred." 
            });
          }
        } else if (!res.headersSent) {
          console.warn(`[Vercel Unhandled Route] 404 for ${req.method} ${req.url}`);
          sendJson(res, 404, {
            success: false,
            error: "Not Found",
            message: `The endpoint ${req.method} ${req.url} was not found on this server.`
          });
        }
        done();
      });
    });
  } catch (err: any) {
    console.error("[Vercel Function Error]", err);
    sendJson(res, 500, { 
      success: false, 
      error: "Server Error", 
      details: err.message || "An error occurred on the server.",
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
}

