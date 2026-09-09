import type { Response, Request } from 'express';
import axios from 'axios';
import { validateUrlSecurity, MAX_FILE_SIZE, sanitizeFilename, isSafeDownloadable } from './validator.js';
import { extractFilename } from './detector.js';

export async function handleMediaDownload(req: Request, res: Response): Promise<void> {
  // Support both POST (body) and GET (query) for flexibility
  const url = (req.body?.url || req.query?.url) as string;
  const requestedFilename = (req.body?.filename || req.query?.filename) as string | undefined;

  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: "Please enter a valid media URL." });
    return;
  }

  // 1. SSRF & URL Validation
  const security = await validateUrlSecurity(url);
  if (!security.valid) {
    res.status(400).json({ error: security.error || "This resource is not publicly accessible." });
    return;
  }

  try {
    const targetUrl = new URL(url);
    const referer = targetUrl.origin;

    const axiosHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer': referer,
      'Accept': '*/*',
      'Connection': 'keep-alive'
    };

    if (req.headers.range) {
      axiosHeaders['Range'] = req.headers.range;
    }

    // 2. Fetch remote media as stream
    let response;
    try {
      response = await axios({
        method: 'get',
        url: url,
        responseType: 'stream',
        timeout: 300000, // 5 min timeout for streaming
        headers: axiosHeaders,
        maxRedirects: 10,
        validateStatus: (status) => status < 400
      });
    } catch (firstErr: any) {
      if (firstErr.response?.status === 403 || firstErr.response?.status === 401) {
        // Retry without referer (many media CDNs block custom referers)
        delete axiosHeaders['Referer'];
        response = await axios({
          method: 'get',
          url: url,
          responseType: 'stream',
          timeout: 300000,
          headers: axiosHeaders,
          maxRedirects: 10,
          validateStatus: (status) => status < 400
        });
      } else {
        throw firstErr;
      }
    }

    const contentType = String(response.headers['content-type'] || 'application/octet-stream');

    // Disallow HTML pages
    if (contentType.includes('text/html')) {
      res.status(415).json({ error: "This media type is not supported. The link points to a webpage." });
      return;
    }

    // Check Content-Length before streaming
    const contentLengthHeader = response.headers['content-length'];
    const declaredLength = contentLengthHeader ? parseInt(String(contentLengthHeader), 10) : 0;
    if (declaredLength > MAX_FILE_SIZE) {
      res.status(413).json({ error: "This file exceeds the maximum supported size (250 MB)." });
      return;
    }

    // Determine and sanitize filename
    const fallbackName = extractFilename(url, response.headers['content-disposition'] ? String(response.headers['content-disposition']) : undefined);
    const rawName = requestedFilename || fallbackName;
    const cleanFilename = sanitizeFilename(rawName, 'downloaded_media');

    // Security check on filename and MIME type
    if (!isSafeDownloadable(cleanFilename, contentType)) {
      res.status(403).json({ error: "Downloading this file type is restricted for safety reasons." });
      return;
    }

    // Pass through relevant headers
    res.status(response.status || 200);
    res.setHeader('Content-Type', contentType);
    if (declaredLength > 0) {
      res.setHeader('Content-Length', declaredLength.toString());
    }
    if (response.headers['content-range']) {
      res.setHeader('Content-Range', String(response.headers['content-range']));
    }
    if (response.headers['accept-ranges']) {
      res.setHeader('Accept-Ranges', String(response.headers['accept-ranges']));
    }

    // Crucial: attachment disposition for direct download in browser
    res.setHeader('Content-Disposition', `attachment; filename="${cleanFilename}"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    let totalBytesStreamed = 0;
    let aborted = false;

    response.data.on('data', (chunk: Buffer) => {
      totalBytesStreamed += chunk.length;
      if (totalBytesStreamed > MAX_FILE_SIZE) {
        if (!aborted) {
          aborted = true;
          console.warn(`[Media Download] Exceeded 250MB limit during streaming (${totalBytesStreamed} bytes). Aborting.`);
          response.data.destroy();
          if (!res.headersSent) {
            res.status(413).json({ error: "This file exceeds the maximum supported size (250 MB)." });
          } else {
            res.end();
          }
        }
      }
    });

    response.data.on('error', (err: any) => {
      console.error('[Media Stream Error]', err.message);
      if (!res.headersSent) {
        res.status(502).json({ error: "We couldn't save this media. Please try again." });
      } else {
        res.end();
      }
    });

    req.on('close', () => {
      // Client aborted download
      if (!response.data.destroyed) {
        response.data.destroy();
      }
    });

    // Pipe remote stream directly into response
    response.data.pipe(res);
  } catch (err: any) {
    console.error(`[Media Download Handler Error]`, err.message);
    if (!res.headersSent) {
      const status = err.response?.status || 500;
      if (status === 451 || status === 403 || status === 401) {
        // Fallback to client-side direct redirect if server IP is blocked (451/403)
        res.redirect(302, url);
        return;
      } else if (status === 404) {
        res.status(404).json({ error: "This resource was not found at the source." });
      } else if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        res.status(504).json({ error: "The source took too long to respond. Please try again." });
      } else {
        res.status(502).json({ error: "We couldn't save this media. Please try again." });
      }
    }
  }
}
