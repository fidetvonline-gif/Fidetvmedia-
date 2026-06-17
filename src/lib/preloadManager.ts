import Hls from 'hls.js';

/**
 * PreloadManager handles predictive preloading of streams
 * to reduce perceived latency when a user selects a channel.
 */
class PreloadManager {
  private static instance: PreloadManager;
  private preloadedUrls: Set<string> = new Set();
  private maxPreloads = 5;
  private hlsInstances: Map<string, Hls> = new Map();

  private constructor() {}

  public static getInstance(): PreloadManager {
    if (!PreloadManager.instance) {
      PreloadManager.instance = new PreloadManager();
    }
    return PreloadManager.instance;
  }

  /**
   * Pre-connect to a domain to speed up TLS handshake
   */
  public preconnect(url: string) {
    try {
      const domain = new URL(url).origin;
      if (typeof document !== 'undefined') {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = domain;
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
      }
    } catch (e) {
      // Ignore invalid URLs
    }
  }

  /**
   * Preload a specific stream manifest
   */
  public preloadStream(url: string) {
    if (this.preloadedUrls.has(url) || !Hls.isSupported()) return;
    
    // Limit active preloads to avoid bandwidth saturation
    if (this.hlsInstances.size >= this.maxPreloads) {
      const firstKey = this.hlsInstances.keys().next().value;
      if (firstKey) {
        this.hlsInstances.get(firstKey)?.destroy();
        this.hlsInstances.delete(firstKey);
      }
    }

    // Initialize a hidden HLS instance just to fetch the manifest and first segments
    const hls = new Hls({
      autoStartLoad: true,
      startLevel: 0,
      capLevelToPlayerSize: true,
      maxBufferLength: 5,
      maxMaxBufferLength: 10,
    });

    hls.loadSource(url);
    this.hlsInstances.set(url, hls);
    this.preloadedUrls.add(url);

    // Keep it for 30 seconds then discard if not used
    setTimeout(() => {
      if (this.hlsInstances.has(url)) {
        this.hlsInstances.get(url)?.destroy();
        this.hlsInstances.delete(url);
      }
    }, 30000);
  }

  /**
   * Clear all preloads
   */
  public clear() {
    this.hlsInstances.forEach(hls => hls.destroy());
    this.hlsInstances.clear();
    this.preloadedUrls.clear();
  }
}

export const preloadManager = PreloadManager.getInstance();
