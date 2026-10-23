import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getHighQualityImage(url?: string, category?: string): string {
  if (!url || typeof url !== 'string' || !url.trim() || url.includes('ichef.bbci.co.uk') || url.includes('bbci.co.uk')) {
    if (category?.toLowerCase().includes('tech') || category?.toLowerCase().includes('ai')) {
      return 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=85&w=1600&auto=format&fit=crop';
    }
    if (category?.toLowerCase().includes('entertainment') || category?.toLowerCase().includes('media')) {
      return 'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=85&w=1600&auto=format&fit=crop';
    }
    if (category?.toLowerCase().includes('sports')) {
      return 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=85&w=1600&auto=format&fit=crop';
    }
    return 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=85&w=1600&auto=format&fit=crop';
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

