import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getClientContentImage } from './imageValidator';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function extractYouTubeThumbnail(url?: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i);
  if (embedMatch && embedMatch[1]) return `https://img.youtube.com/vi/${embedMatch[1]}/hqdefault.jpg`;
  const watchMatch = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/i);
  if (watchMatch && watchMatch[1]) return `https://img.youtube.com/vi/${watchMatch[1]}/hqdefault.jpg`;
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/i);
  if (shortMatch && shortMatch[1]) return `https://img.youtube.com/vi/${shortMatch[1]}/hqdefault.jpg`;
  return null;
}

export function getHighQualityImage(url?: string, category?: string, title?: string): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return getClientContentImage(title || '', category || '');
  }

  const trimmed = url.trim();

  // 1. YouTube video or embed URLs -> convert to crisp high-res video thumbnail
  const ytThumb = extractYouTubeThumbnail(trimmed);
  if (ytThumb) {
    return ytThumb;
  }

  // 2. Reject known non-images, low-res placeholders, logos or avatar generators
  if (
    trimmed.includes('dicebear.com') ||
    trimmed.includes('placeholder') ||
    trimmed.includes('1x1') ||
    trimmed.endsWith('.svg') ||
    trimmed.toLowerCase().includes('punch-logo') ||
    trimmed.toLowerCase().includes('500x179') ||
    trimmed.toLowerCase().includes('default-avatar') ||
    (!trimmed.startsWith('http://') && !trimmed.startsWith('https://'))
  ) {
    return getClientContentImage(title || '', category || '');
  }

  // 3. Upgrade BBC News CDN images to crisp 976px / 1200px HD
  if (trimmed.includes('ichef.bbci.co.uk')) {
    return trimmed
      .replace(/\/ace\/standard\/\d+\//, '/ace/standard/976/')
      .replace(/\/cpsprodpb\/[a-z0-9]+\/live\//, '/cpsprodpb/1200/live/')
      .replace(/\/branded_news\/\d+\//, '/branded_news/1200/');
  }

  // 4. Upgrade Unsplash images to high-res 1600px with q=85
  if (trimmed.includes('unsplash.com')) {
    let clean = trimmed;
    if (!clean.includes('w=')) clean += '&w=1600';
    else clean = clean.replace(/w=\d+/, 'w=1600');
    if (!clean.includes('q=')) clean += '&q=85';
    else clean = clean.replace(/q=\d+/, 'q=85');
    if (!clean.includes('auto=format')) clean += '&auto=format';
    if (!clean.includes('fit=crop')) clean += '&fit=crop';
    return clean;
  }

  return trimmed;
}
