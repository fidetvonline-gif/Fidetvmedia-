import fs from 'fs';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';

let cachedApp: any = null;
let cachedInit: any = null;

function sendJson(res: any, status: number, data: any) {
  if (res.headersSent) return;
  try {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  } catch {}
  res.statusCode = status;
  res.end(JSON.stringify(data));
}

export default async function handler(req: any, res: any) {
  try {
    const rawUrl = req.url || '';
    const urlObj = new URL(rawUrl.startsWith('http') ? rawUrl : `http://localhost${rawUrl}`);
    const pathParam = urlObj.searchParams.get('path') || (req.query && req.query.path) || '';
    const cleanPathParam = Array.isArray(pathParam) ? pathParam.join('/') : pathParam;
    const xMatched = req.headers['x-matched-path'] || req.headers['x-vercel-matched-path'] || req.headers['x-rewrite-url'] || '';
    
    let effectivePath = urlObj.pathname;
    if (cleanPathParam) {
      effectivePath = `/api/${cleanPathParam.replace(/^\/+/, '')}`;
    } else if (typeof xMatched === 'string' && xMatched.startsWith('/api/') && !xMatched.startsWith('/api/server')) {
      effectivePath = xMatched;
    }

    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      res.statusCode = 200;
      res.end();
      return;
    }

    // 0. Sitemap Handler
    if (effectivePath === '/sitemap.xml' || xMatched === '/sitemap.xml') {
      // Always use fidetv.online as the canonical host for sitemap links
      const host = 'fidetv.online';
      const baseUrl = `https://${host}`;
      
      const staticPages = [
        { url: '', changefreq: 'daily', priority: '1.0' },
        { url: '/news', changefreq: 'hourly', priority: '0.9' },
        { url: '/live', changefreq: 'always', priority: '0.9' },
        { url: '/fidesave', changefreq: 'weekly', priority: '0.8' },
        { url: '/spaces', changefreq: 'daily', priority: '0.8' },
        { url: '/about', changefreq: 'monthly', priority: '0.5' },
        { url: '/contact', changefreq: 'monthly', priority: '0.5' }
      ];

      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

      for (const page of staticPages) {
        xml += `  <url>\n`;
        xml += `    <loc>${baseUrl}${page.url}</loc>\n`;
        xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
        xml += `    <priority>${page.priority}</priority>\n`;
        xml += `  </url>\n`;
      }

      const { AutoBlogService } = await import('../src/services/autoBlogService.js');
      const blogService = AutoBlogService.getInstance();
      const blogData = blogService.getAllPosts({ limit: 100 });
      const posts = blogData.posts || [];

      for (const post of posts) {
        const postUrl = `${baseUrl}/news/${post.slug || post.id}`;
        const lastMod = post.updated_at || post.created_at || new Date().toISOString();
        xml += `  <url>\n`;
        xml += `    <loc>${postUrl}</loc>\n`;
        xml += `    <lastmod>${new Date(lastMod).toISOString().split('T')[0]}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.8</priority>\n`;
        xml += `  </url>\n`;
      }

      xml += `</urlset>`;
      res.setHeader('Content-Type', 'application/xml');
      res.statusCode = 200;
      res.end(xml);
      return;
    }

    // 1. Centralized News & Blog Handler (Delegated to AutoBlogService)
    if (effectivePath.startsWith('/api/news') || effectivePath.startsWith('/api/blog/')) {
      // Ensure service is initialized
      const { AutoBlogService } = await import('../src/services/autoBlogService.js');
      // We pass null for supabase here as initApp should have already set it up if possible,
      // but AutoBlogService.getInstance will handle it.
      const blogService = AutoBlogService.getInstance();
      
      if (effectivePath === '/api/news' || effectivePath === '/api/blog/posts') {
        const result = blogService.getAllPosts({
          category: urlObj.searchParams.get('category') || undefined,
          search: urlObj.searchParams.get('search') || undefined,
          page: urlObj.searchParams.get('page') ? parseInt(urlObj.searchParams.get('page')!, 10) : 1,
          limit: urlObj.searchParams.get('limit') ? parseInt(urlObj.searchParams.get('limit')!, 10) : 20
        });
        sendJson(res, 200, effectivePath === '/api/news' ? result.posts : result);
        return;
      }

      if (effectivePath.startsWith('/api/blog/posts/')) {
        const slug = effectivePath.replace('/api/blog/posts/', '').replace(/^\/+/, '');
        const result = blogService.getPostBySlugOrId(decodeURIComponent(slug));
        if (!result.post) return sendJson(res, 404, { error: 'Post not found' });
        sendJson(res, 200, result);
        return;
      }

      if (effectivePath === '/api/blog/auto-generate') {
        const result = await blogService.syncLatestNews();
        sendJson(res, 200, result);
        return;
      }

      if (effectivePath === '/api/blog/status') {
        sendJson(res, 200, blogService.getStatus());
        return;
      }
      
      if (effectivePath === '/api/news/nigeria') {
        const posts = await blogService.getNigeriaNews();
        sendJson(res, 200, posts);
        return;
      }
    }

    // Direct Media Analysis Handler
    if (effectivePath.includes('/media/analyze')) {
      let body: any = {};
      try {
        if (req.body) {
          body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        } else {
          body = await new Promise((resolve) => {
            let data = '';
            req.on('data', (chunk: any) => { data += chunk; });
            req.on('end', () => {
              try { resolve(JSON.parse(data)); } catch { resolve({}); }
            });
          });
        }
      } catch {}

      const targetUrl = body?.url || '';
      let cleanHost = 'Web';
      try {
        const parsed = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
        cleanHost = parsed.hostname.replace(/^www\./, '');
      } catch {}

      const isAudio = /audio|mp3|podcast|music/i.test(targetUrl);
      const ext = isAudio ? 'mp3' : 'mp4';

      sendJson(res, 200, {
        success: true,
        media: {
          type: isAudio ? 'audio' : 'video',
          mimeType: isAudio ? 'audio/mpeg' : 'video/mp4',
          filename: `${cleanHost}_media.${ext}`,
          title: `${cleanHost.charAt(0).toUpperCase() + cleanHost.slice(1)} Media Stream`,
          size: isAudio ? 8000000 : 25000000,
          format: ext.toUpperCase(),
          downloadUrl: targetUrl || 'https://example.com/media.mp4',
          sourceUrl: targetUrl || 'https://example.com/media.mp4',
          platform: cleanHost || 'FideTV'
        }
      });
      return;
    }

    if (effectivePath.includes('health')) {
      sendJson(res, 200, {
        status: "ok",
        service: "fidesave-vercel",
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Dynamically load server app
    if (!cachedApp) {
      try {
        console.log('[Vercel Handler] Importing Express app from server.ts...');
        // We import the TS file directly, Vercel supports this in functions
        const serverModule = await import('../server.ts');
        cachedApp = serverModule.default;
        cachedInit = serverModule.initApp;
        console.log('[Vercel Handler] Express app loaded successfully.');
      } catch (importErr: any) {
        console.error('[Vercel Handler Critical] Failed to import server.ts:', importErr);
        // Fallback to minimal response if we can't load the app
        if (!effectivePath.startsWith('/api/') && effectivePath !== '/sitemap.xml') {
           res.status(500).send('Application failed to load. Please check logs.');
           return;
        }
      }
    }

    if (cachedInit && typeof cachedInit === 'function') {
      try {
        await cachedInit(false);
      } catch (initErr) {
        console.error('[Vercel Handler] Init error:', initErr);
      }
    }

    if (!cachedApp) {
      sendJson(res, 503, {
        success: false,
        service: "fidetv-serverless",
        error: "Server logic unavailable"
      });
      return;
    }

    // Set req.url for the Express app to handle the request correctly
    req.url = effectivePath + (urlObj.search ? urlObj.search : '');
    console.log(`[Vercel Handler] Delegating to Express: ${req.method} ${req.url}`);

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

      // Call the Express app
      cachedApp(req, res, (err: any) => {
        if (err) {
          console.error('[Vercel Handler] Express error:', err);
          if (!res.headersSent) {
            sendJson(res, 500, { success: false, error: err.message || "Internal Server Error" });
          }
        } else if (!res.headersSent) {
          // This happens if Express reaches the end of its middleware chain without sending a response
          // For SPA, the catch-all in server.ts should prevent this.
          console.warn(`[Vercel Handler] Express chain ended without response for ${req.url}`);
          sendJson(res, 404, { success: false, error: "Not Found in Express" });
        }
        done();
      });
    });
  } catch (err: any) {
    console.error('[Vercel Handler] Global Exception:', err);
    sendJson(res, 500, { success: false, error: err.message || "Server Error" });
  }
}
