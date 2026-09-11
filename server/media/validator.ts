import dns from 'dns';
import net from 'net';

export const MAX_FILE_SIZE = 250 * 1024 * 1024; // 250 MB

// Banned executable or unsafe file extensions
export const BANNED_EXTENSIONS = new Set([
  '.exe', '.msi', '.bat', '.cmd', '.scr', '.dll', '.sh', '.com', '.vbs',
  '.app', '.apk', '.bin', '.jar', '.iso', '.dmg', '.elf', '.so', '.ps1',
  '.pif', '.application', '.gadget', '.hta', '.cpl', '.msc', '.jar', '.vb',
  '.vbe', '.js', '.jse', '.ws', '.wsf', '.wsc', '.wsh'
]);

// Helper to check if an IPv4 address is in a private/reserved range
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed = reject
  }

  const [a, b] = parts;

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;
  // 10.0.0.0/8 (Private-Use)
  if (a === 10) return true;
  // 100.64.0.0/10 (Shared Address Space)
  if (a === 100 && b >= 64 && b <= 127) return true;
  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;
  // 169.254.0.0/16 (Link Local, cloud metadata)
  if (a === 169 && b === 254) return true;
  // 172.16.0.0/12 (Private-Use)
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.0.0.0/24 (IETF Protocol Assignments)
  if (a === 192 && b === 0 && parts[2] === 0) return true;
  // 192.0.2.0/24 (TEST-NET-1)
  if (a === 192 && b === 0 && parts[2] === 2) return true;
  // 192.88.99.0/24 (6to4 Relay Anycast)
  if (a === 192 && b === 88 && parts[2] === 99) return true;
  // 192.168.0.0/16 (Private-Use)
  if (a === 192 && b === 168) return true;
  // 198.18.0.0/15 (Benchmarking)
  if (a === 198 && (b === 18 || b === 19)) return true;
  // 198.51.100.0/24 (TEST-NET-2)
  if (a === 198 && b === 51 && parts[2] === 100) return true;
  // 203.0.113.0/24 (TEST-NET-3)
  if (a === 203 && b === 0 && parts[2] === 113) return true;
  // 224.0.0.0/4 (Multicast)
  if (a >= 224 && a <= 239) return true;
  // 240.0.0.0/4 (Reserved)
  if (a >= 240) return true;

  return false;
}

// Helper to check if an IPv6 address is private/local
function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  // Loopback & Unspecified
  if (normalized === '::1' || normalized === '::') return true;
  // Unique Local (fc00::/7)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  // Link-Local (fe80::/10)
  if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) return true;
  // IPv4-mapped IPv6 (::ffff:192.168.1.1)
  if (normalized.includes('::ffff:')) {
    const ipv4Part = normalized.split('::ffff:')[1];
    if (ipv4Part && net.isIPv4(ipv4Part)) {
      return isPrivateIPv4(ipv4Part);
    }
  }
  return false;
}

/**
 * Validates a URL for SSRF vulnerabilities and protocol correctness.
 * Returns { valid: true } or { valid: false, error: string }.
 */
export async function validateUrlSecurity(rawUrl: string): Promise<{ valid: boolean; error?: string; parsedUrl?: URL }> {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: "Please enter a valid media URL." };
  }

  const trimmed = rawUrl.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: "Please enter a valid media URL." };
  }

  // Only permit http and https
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: "Only HTTP and HTTPS URLs are supported." };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost, cloud metadata, and internal domains
  const blockedHostnames = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    'metadata.google.internal',
    'metadata.internal',
    '169.254.169.254',
    'instance-data'
  ];

  if (blockedHostnames.includes(hostname) ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.lan') ||
      hostname.endsWith('.corp')) {
    return { valid: false, error: "This resource is not publicly accessible." };
  }

  // Direct IP literal check
  if (net.isIPv4(hostname)) {
    if (isPrivateIPv4(hostname)) {
      return { valid: false, error: "This resource is not publicly accessible." };
    }
  } else if (net.isIPv6(hostname)) {
    if (isPrivateIPv6(hostname)) {
      return { valid: false, error: "This resource is not publicly accessible." };
    }
  }

  // DNS resolution check to prevent DNS rebinding & private IP resolution
  try {
    const addresses = await dns.promises.lookup(hostname, { all: true });
    if (addresses && addresses.length > 0) {
      for (const record of addresses) {
        if (record.family === 4 && isPrivateIPv4(record.address)) {
          return { valid: false, error: "This resource is not publicly accessible." };
        }
        if (record.family === 6 && isPrivateIPv6(record.address)) {
          return { valid: false, error: "This resource is not publicly accessible." };
        }
      }
    }
  } catch (dnsErr: any) {
    // In serverless environments (Vercel/Cloud Run), system DNS lookup may fail with EAI_AGAIN or ENOTFOUND.
    // Fall back to hostname validation for public domain names.
    if (!hostname.includes('.')) {
      return { valid: false, error: "Unable to resolve the provided media domain." };
    }
  }

  return { valid: true, parsedUrl: parsed };
}

/**
 * Sanitizes a filename to prevent path traversal and executable execution.
 */
export function sanitizeFilename(filename: string, defaultName = 'downloaded_media'): string {
  if (!filename || typeof filename !== 'string') {
    return defaultName;
  }

  // Remove path traversal and directory separators
  let clean = filename.replace(/^.*[\\\/]/, ''); // basename
  clean = clean.replace(/\.\.+[\\\/]/g, '');

  // Strip control characters and non-printable characters
  clean = clean.replace(/[\x00-\x1F\x7F]/g, '');

  // Replace spaces and special characters with underscores
  clean = clean.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Limit length
  if (clean.length > 120) {
    const extIndex = clean.lastIndexOf('.');
    if (extIndex !== -1 && extIndex > clean.length - 10) {
      const ext = clean.substring(extIndex);
      clean = clean.substring(0, 110) + ext;
    } else {
      clean = clean.substring(0, 120);
    }
  }

  // Check if extension is banned
  const lastDot = clean.lastIndexOf('.');
  if (lastDot !== -1) {
    const ext = clean.substring(lastDot).toLowerCase();
    if (BANNED_EXTENSIONS.has(ext)) {
      clean = clean.substring(0, lastDot) + '.safe';
    }
  }

  return clean || defaultName;
}

/**
 * Verifies if a filename or MIME type is acceptable for download.
 */
export function isSafeDownloadable(filename: string, mimeType?: string): boolean {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot !== -1) {
    const ext = filename.substring(lastDot).toLowerCase();
    if (BANNED_EXTENSIONS.has(ext)) return false;
  }

  if (mimeType) {
    const lowerMime = mimeType.toLowerCase();
    if (lowerMime.includes('application/x-msdownload') ||
        lowerMime.includes('application/x-sh') ||
        lowerMime.includes('application/x-bat') ||
        lowerMime.includes('application/x-executable')) {
      return false;
    }
  }

  return true;
}
