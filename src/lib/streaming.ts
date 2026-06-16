
import { extractYoutubeUrl } from './channelUtils';

export type StreamType = 'youtube' | 'facebook' | 'vimeo' | 'hls' | 'mp4' | 'mpeg-ts' | 'unknown';

export interface NormalizedStream {
  id: string;
  name: string;
  url: string;
  type: StreamType;
  provider: string;
  isLive: boolean;
  needsProxy: boolean;
}

export const detectStreamType = (url: string): StreamType => {
  if (!url) {
      console.log('[Streaming] No URL provided');
      return 'unknown';
  }
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
      console.log(`[Streaming] Type Detected: YouTube for ${url}`);
      return 'youtube';
  }
  if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.watch')) {
      console.log(`[Streaming] Type Detected: Facebook for ${url}`);
      return 'facebook';
  }
  if (lowerUrl.includes('vimeo.com')) {
      console.log(`[Streaming] Type Detected: Vimeo for ${url}`);
      return 'vimeo';
  }
  if (lowerUrl.includes('.m3u8') || lowerUrl.includes('m3u8') || lowerUrl.includes('playlist.m3u')) {
      console.log(`[Streaming] Type Detected: HLS for ${url}`);
      return 'hls';
  }
  if (lowerUrl.includes('.mp4')) {
      console.log(`[Streaming] Type Detected: MP4 for ${url}`);
      return 'mp4';
  }
  if (lowerUrl.includes('.ts')) {
      console.log(`[Streaming] Type Detected: MPEG-TS for ${url}`);
      return 'mpeg-ts';
  }

  return 'unknown';
};

export class UniversalStreamService {
  static normalize(channel: any): NormalizedStream {
    const type = detectStreamType(channel.url);
    const url = type === 'youtube' ? extractYoutubeUrl(channel.url) : channel.url;
    const provider = this.getProviderName(channel.url, type);
    
    return {
      id: channel.id || 'temp-' + Math.random(),
      name: channel.name || 'Unknown Channel',
      url: url,
      type,
      provider,
      isLive: channel.is_live ?? true,
      needsProxy: type === 'hls' || type === 'mpeg-ts'
    };
  }

  private static getProviderName(url: string, type: StreamType): string {
    if (type === 'youtube') return 'YouTube';
    if (type === 'facebook') return 'Facebook';
    if (type === 'vimeo') return 'Vimeo';
    if (url.includes('limex')) return 'Limex';
    if (url.includes('amagi')) return 'Amagi';
    if (url.includes('wurl')) return 'Wurl';
    return 'Direct';
  }

  static async checkHealth(url: string): Promise<{ ok: boolean; status?: number; error?: string }> {
    try {
      const type = detectStreamType(url);
      if (type === 'youtube' || type === 'facebook' || type === 'vimeo') {
         // Embed URLs are hard to check head-on without API keys, assume OK for now
         return { ok: true };
      }

      // For direct streams, we check the bridge
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`/api/proxy-stream?url=${encodeURIComponent(url)}`, { 
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return { ok: response.ok, status: response.status };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }
}
