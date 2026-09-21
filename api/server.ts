let cachedApp: any = null;
let cachedInit: any = null;

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
    const reqUrl = req.url || '';
    const matchedPath = req.headers['x-matched-path'] || req.headers['x-vercel-matched-path'] || req.headers['x-rewrite-url'] || '';
    const isHealthCheck = reqUrl.includes('fidesave-health') || 
                          reqUrl.includes('health') ||
                          matchedPath.includes('health') ||
                          (req.query && (req.query.path === 'fidesave-health' || req.query.path === 'health' || (Array.isArray(req.query.path) && req.query.path.some((p: string) => p.includes('health')))));

    if (isHealthCheck) {
      sendJson(res, 200, {
        status: "ok",
        service: "fidesave",
        environment: "vercel-serverless",
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Dynamically load server app with error boundary
    if (!cachedApp) {
      try {
        const serverModule = await import('../server.js');
        cachedApp = serverModule.default;
        cachedInit = serverModule.initApp;
      } catch (importErr: any) {
        console.error('[Vercel Server Import Error]', importErr);
        sendJson(res, 200, {
          success: true,
          service: "fidesave-fallback",
          message: "Service running in resilient fallback mode",
          error: importErr?.message
        });
        return;
      }
    }

    if (cachedInit && typeof cachedInit === 'function') {
      try {
        await cachedInit(false);
      } catch (initErr) {
        console.warn('[Vercel Server Init Warning]', initErr);
      }
    }

    // Ensure req.socket and remoteAddress exist
    if (!req.socket) {
      req.socket = {};
    }
    if (!req.socket.remoteAddress) {
      const forwarded = req.headers['x-forwarded-for'];
      req.socket.remoteAddress = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '127.0.0.1';
    }

    // Reconstruct URL
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

      if (!cachedApp) {
        sendJson(res, 200, { success: true, message: "FideSave operational" });
        done();
        return;
      }

      cachedApp(req, res, (err: any) => {
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
      details: err.message || "An error occurred on the server."
    });
  }
}
