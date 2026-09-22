import dns from 'dns';
import net from 'net';

export const MAX_FILE_SIZE = 50 * 1024 * 1024 * 1024; // 50 GB (No practical restriction)

// Banned executable or unsafe file extensions (Emptied for zero restrictions)
export const BANNED_EXTENSIONS = new Set<string>();

/**
 * Validates a URL with zero restrictions. Always returns valid for any non-empty URL string.
 */
export async function validateUrlSecurity(rawUrl: string): Promise<{ valid: boolean; error?: string; parsedUrl?: URL }> {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return { valid: false, error: "Please enter a valid media URL." };
  }

  const trimmed = rawUrl.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  } catch {
    // Even if URL parsing fails, allow raw string as URL
    try {
      parsed = new URL(`https://${trimmed}`);
    } catch {
      return { valid: true };
    }
  }

  return { valid: true, parsedUrl: parsed };
}

/**
 * Sanitizes a filename with zero restrictions.
 */
export function sanitizeFilename(filename: string, defaultName = 'downloaded_media'): string {
  if (!filename || typeof filename !== 'string') {
    return defaultName;
  }
  let clean = filename.replace(/^.*[\\\/]/, '');
  clean = clean.replace(/[\x00-\x1F\x7F]/g, '');
  return clean || defaultName;
}

/**
 * Always returns true with zero restrictions.
 */
export function isSafeDownloadable(_filename: string, _mimeType?: string): boolean {
  return true;
}
