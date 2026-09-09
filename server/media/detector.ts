import { MediaType } from './types.js';

export interface DimensionInfo {
  width?: number;
  height?: number;
}

/**
 * Extracts dimensions from image buffer without external libraries.
 */
export function extractImageDimensions(buffer: Buffer): DimensionInfo {
  if (!buffer || buffer.length < 16) return {};

  try {
    // 1. PNG check: 89 50 4E 47 0D 0A 1A 0A
    if (buffer.length >= 24 &&
        buffer[0] === 0x89 && buffer[1] === 0x50 &&
        buffer[2] === 0x4E && buffer[3] === 0x47) {
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height };
    }

    // 2. GIF check: GIF87a or GIF89a
    if (buffer.length >= 10 &&
        buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
      const width = buffer.readUInt16LE(6);
      const height = buffer.readUInt16LE(8);
      return { width, height };
    }

    // 3. JPEG check: FF D8 FF
    if (buffer.length >= 4 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      let offset = 2;
      while (offset < buffer.length - 8) {
        if (buffer[offset] !== 0xFF) {
          offset++;
          continue;
        }
        const marker = buffer[offset + 1];
        // SOF0 (0xC0), SOF1 (0xC1), SOF2 (0xC2)
        if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          return { width, height };
        }
        // Move to next marker
        const length = buffer.readUInt16BE(offset + 2);
        offset += 2 + length;
      }
    }

    // 4. WebP check: RIFF....WEBPVP8
    if (buffer.length >= 30 &&
        buffer.toString('ascii', 0, 4) === 'RIFF' &&
        buffer.toString('ascii', 8, 12) === 'WEBP') {
      const vp8Type = buffer.toString('ascii', 12, 16);
      if (vp8Type === 'VP8 ' && buffer.length >= 26) {
        const width = buffer.readUInt16LE(26) & 0x3FFF;
        const height = buffer.readUInt16LE(28) & 0x3FFF;
        return { width, height };
      } else if (vp8Type === 'VP8L' && buffer.length >= 25) {
        const b0 = buffer[21];
        const b1 = buffer[22];
        const b2 = buffer[23];
        const b3 = buffer[24];
        const width = 1 + (((b1 & 0x3F) << 8) | b0);
        const height = 1 + (((b3 & 0xF) << 10) | (b2 << 2) | ((b1 & 0xC0) >> 6));
        return { width, height };
      }
    }
  } catch (err) {
    // Ignore dimension extraction errors
  }

  return {};
}

/**
 * Classifies a Content-Type or file extension into a MediaType and clean format.
 */
export function detectMediaType(mimeType: string, filename: string): { type: MediaType; format: string } {
  const mime = (mimeType || '').toLowerCase();
  const ext = (filename.includes('.') ? filename.split('.').pop() || '' : '').toLowerCase();

  // 1. Video
  if (mime.startsWith('video/') || ['mp4', 'mkv', 'webm', 'mov', 'avi', 'm4v', '3gp', 'flv', 'ts', 'm3u8'].includes(ext)) {
    let format = 'MP4';
    if (mime.includes('webm') || ext === 'webm') format = 'WEBM';
    else if (mime.includes('quicktime') || ext === 'mov') format = 'MOV';
    else if (mime.includes('x-matroska') || ext === 'mkv') format = 'MKV';
    else if (ext === 'm3u8' || ext === 'm3u') format = 'HLS';
    return { type: 'video', format };
  }

  // 2. Audio
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'opus', 'wma'].includes(ext)) {
    let format = 'MP3';
    if (mime.includes('wav') || ext === 'wav') format = 'WAV';
    else if (mime.includes('ogg') || ext === 'ogg') format = 'OGG';
    else if (mime.includes('flac') || ext === 'flac') format = 'FLAC';
    else if (mime.includes('m4a') || ext === 'm4a' || mime.includes('aac') || ext === 'aac') format = 'AAC';
    return { type: 'audio', format };
  }

  // 3. Image
  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif', 'bmp', 'ico'].includes(ext)) {
    let format = 'IMAGE';
    if (mime.includes('jpeg') || ext === 'jpg' || ext === 'jpeg') format = 'JPEG';
    else if (mime.includes('png') || ext === 'png') format = 'PNG';
    else if (mime.includes('gif') || ext === 'gif') format = 'GIF';
    else if (mime.includes('webp') || ext === 'webp') format = 'WEBP';
    else if (mime.includes('svg') || ext === 'svg') format = 'SVG';
    return { type: 'image', format };
  }

  // 4. Other safe downloadable files
  let format = ext ? ext.toUpperCase() : 'FILE';
  if (mime.includes('pdf') || ext === 'pdf') format = 'PDF';
  else if (mime.includes('zip') || ext === 'zip') format = 'ZIP';
  else if (mime.includes('text/plain') || ext === 'txt') format = 'TXT';
  else if (mime.includes('epub') || ext === 'epub') format = 'EPUB';

  return { type: 'file', format };
}

/**
 * Extracts a filename from a URL or Content-Disposition header.
 */
export function extractFilename(urlStr: string, contentDisposition?: string, fallback = 'downloaded_media'): string {
  // 1. Try Content-Disposition
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
    if (filenameMatch && filenameMatch[1]) {
      return decodeURIComponent(filenameMatch[1].trim());
    }
  }

  // 2. Try URL pathname
  try {
    const url = new URL(urlStr);
    const pathname = url.pathname;
    const base = pathname.split('/').filter(Boolean).pop();
    if (base && base.includes('.')) {
      return decodeURIComponent(base);
    }
  } catch {
    // Ignore URL parse error
  }

  return fallback;
}
