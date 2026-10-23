import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getHighQualityImage(url?: string): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=85&w=1600&auto=format&fit=crop';
  }
  
  // Upgrade BBC thumbnail URLs to crystal-clear 1200px / 1280px HD
  if (url.includes('ichef.bbci.co.uk')) {
    return url
      .replace(/\/standard\/\d+\//, '/standard/1280/')
      .replace(/\/cpsprodpb\/[a-z0-9]+\/live\//, '/cpsprodpb/1200/live/')
      .replace(/\/branded_news\/\d+\//, '/branded_news/1200/');
  }

  // Upgrade Unsplash images to high-res 1600px with q=85
  if (url.includes('unsplash.com')) {
    let clean = url;
    if (!clean.includes('w=')) clean += '&w=1600';
    else clean = clean.replace(/w=\d+/, 'w=1600');
    if (!clean.includes('q=')) clean += '&q=85';
    else clean = clean.replace(/q=\d+/, 'q=85');
    if (!clean.includes('auto=format')) clean += '&auto=format';
    if (!clean.includes('fit=crop')) clean += '&fit=crop';
    return clean;
  }

  return url;
}
