export interface HealthStatusResponse {
  status: 'ok' | 'degraded' | 'error' | 'unknown';
  service?: string;
  environment?: string;
  timestamp?: string;
  error?: string;
  stale?: boolean;
}

const CACHE_KEY = 'fidesave_health_cache_v1';
const CACHE_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes stale threshold

export async function fetchHealthWithStaleWhileRevalidate(forceRefresh = false): Promise<{
  data: HealthStatusResponse;
  responseStatus: number;
  responseStatusText: string;
  isStale: boolean;
}> {
  let cachedData: HealthStatusResponse | null = null;
  let cachedTimestamp = 0;

  try {
    const rawCache = localStorage.getItem(CACHE_KEY);
    if (rawCache) {
      const parsed = JSON.parse(rawCache);
      cachedData = parsed.data;
      cachedTimestamp = parsed.timestamp || 0;
    }
  } catch (e) {
    // ignore storage errors
  }

  const now = Date.now();
  const isStale = now - cachedTimestamp > CACHE_MAX_AGE_MS;

  // If we have fresh cache and not forced, return cached data immediately and revalidate in background
  if (cachedData && !isStale && !forceRefresh) {
    // Background revalidation
    revalidateHealth().catch(() => {});
    return {
      data: { ...cachedData, stale: false },
      responseStatus: 200,
      responseStatusText: 'OK (Cached)',
      isStale: false
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const res = await fetch('/api/fidesave-health', {
      signal: controller.signal,
      headers: { 'Cache-Control': 'no-cache' }
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`HTTP status ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    const enhancedData: HealthStatusResponse = {
      ...data,
      status: data.status || 'ok',
      timestamp: data.timestamp || new Date().toISOString()
    };

    // Save to cache
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: enhancedData,
        timestamp: Date.now()
      }));
    } catch (e) {}

    return {
      data: enhancedData,
      responseStatus: res.status,
      responseStatusText: res.statusText,
      isStale: false
    };
  } catch (err: any) {
    console.warn('[HealthCheckWrapper] Network fetch failed, falling back to cache or unknown status:', err.message);

    if (cachedData) {
      return {
        data: {
          ...cachedData,
          status: cachedData.status === 'ok' ? 'degraded' : cachedData.status,
          error: `Using stale cache (${err.message})`,
          stale: true
        },
        responseStatus: 200,
        responseStatusText: 'OK (Stale Cache Fallback)',
        isStale: true
      };
    }

    // Graceful fallback status ('Status Unknown')
    const fallbackData: HealthStatusResponse = {
      status: 'unknown',
      service: 'fidesave',
      error: err.name === 'AbortError' ? 'Health check request timed out' : (err.message || 'Service unreachable'),
      timestamp: new Date().toISOString(),
      stale: true
    };

    return {
      data: fallbackData,
      responseStatus: 503,
      responseStatusText: 'Service Unavailable / Status Unknown',
      isStale: true
    };
  }
}

async function revalidateHealth() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch('/api/fidesave-health', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: { ...data, timestamp: data.timestamp || new Date().toISOString() },
        timestamp: Date.now()
      }));
    }
  } catch (e) {}
}
