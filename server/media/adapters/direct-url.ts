import axios from 'axios';
import { MediaMetadata } from '../types.js';
import { validateUrlSecurity, MAX_FILE_SIZE, sanitizeFilename } from '../validator.js';
import { detectMediaType, extractFilename, extractImageDimensions } from '../detector.js';

export async function analyzeDirectUrl(url: string): Promise<MediaMetadata | null> {
  const security = await validateUrlSecurity(url);
  if (!security.valid) {
    throw new Error(security.error || 'This resource is not publicly accessible.');
  }

  const parsedUrl = new URL(url);
  const commonHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': parsedUrl.origin + '/',
    'Accept': '*/*',
    'Accept-Encoding': 'identity' // Avoid gzip for range chunks
  };

  let contentType = '';
  let contentLength = 0;
  let contentDisposition = '';
  let headerBuffer: Buffer | null = null;

  // 1. Try HEAD request first
  try {
    const headRes = await axios.head(url, {
      headers: commonHeaders,
      timeout: 6000,
      maxRedirects: 5,
      validateStatus: (status) => status < 400
    });

    contentType = String(headRes.headers['content-type'] || '');
    contentLength = parseInt(String(headRes.headers['content-length'] || '0'), 10);
    contentDisposition = String(headRes.headers['content-disposition'] || '');
  } catch (headErr) {
    // Some servers reject HEAD with 405/403, proceed to ranged GET
  }

  // 2. If HEAD didn't yield enough or failed, do a small ranged GET (64KB)
  if (!contentType || !contentLength || contentType.includes('text/html') || contentType.startsWith('image/')) {
    try {
      const getRes = await axios.get(url, {
        headers: {
          ...commonHeaders,
          'Range': 'bytes=0-65535'
        },
        responseType: 'arraybuffer',
        timeout: 8000,
        maxRedirects: 5,
        validateStatus: (status) => status < 400
      });

      if (!contentType) {
        contentType = String(getRes.headers['content-type'] || '');
      }
      if (!contentDisposition) {
        contentDisposition = String(getRes.headers['content-disposition'] || '');
      }

      // Check Content-Range for total length if available
      const contentRange = String(getRes.headers['content-range'] || '');
      if (contentRange) {
        const match = contentRange.match(/\/(\d+)$/);
        if (match && match[1]) {
          contentLength = parseInt(match[1], 10);
        }
      }

      if (!contentLength && getRes.headers['content-length']) {
        contentLength = parseInt(String(getRes.headers['content-length']), 10);
      }

      headerBuffer = Buffer.from(getRes.data);
    } catch (getErr: any) {
      if (!contentType && !contentLength) {
        throw new Error('The source took too long to respond or could not be reached.');
      }
    }
  }

  // Check file size limit
  if (contentLength > MAX_FILE_SIZE) {
    throw new Error('This file exceeds the maximum supported size (250 MB).');
  }

  // Determine filename
  let filename = extractFilename(url, contentDisposition);
  filename = sanitizeFilename(filename);

  // If HTML is returned, this is a webpage, not a direct media stream
  if (contentType.includes('text/html')) {
    return null; // Let other adapters try
  }

  // Detect media type and format
  const { type, format } = detectMediaType(contentType, filename);

  // Dimensions for images
  let dimensions: { width?: number; height?: number } = {};
  if (type === 'image' && headerBuffer) {
    dimensions = extractImageDimensions(headerBuffer);
  }

  // Thumbnail for images is the image itself
  const thumbnail = type === 'image' ? url : undefined;

  return {
    type,
    mimeType: contentType || 'application/octet-stream',
    filename,
    size: contentLength || (headerBuffer ? headerBuffer.length : 0),
    format,
    thumbnail,
    width: dimensions.width,
    height: dimensions.height,
    downloadUrl: url,
    sourceUrl: url,
    platform: 'Direct Media'
  };
}
