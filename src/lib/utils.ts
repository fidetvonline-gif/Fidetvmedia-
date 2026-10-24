import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getClientContentImage } from './imageValidator';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getHighQualityImage(url?: string, category?: string, title?: string): string {
  // If url is missing, broken, or known placeholder/broken BBC ichef url
  if (
    !url ||
    typeof url !== 'string' ||
    !url.trim() ||
    url.includes('ichef.bbci.co.uk') ||
    url.includes('bbci.co.uk') ||
    url.includes('dicebear.com') ||
    url.includes('placeholder')
  ) {
    return getClientContentImage(title || '', category || '');
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
