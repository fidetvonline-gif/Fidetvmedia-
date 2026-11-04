import { extractYoutubeUrl } from './channelUtils';

export type StreamType = 'youtube' | 'facebook' | 'vimeo' | 'hls' | 'dash' | 'official_embed' | 'mp4' | 'mpeg-ts' | 'unknown';

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
  
  if (lowerUrl.includes('.mpd')) {
      console.log(`[Streaming] Type Detected: DASH for ${url}`);
      return 'dash';
  }
  if (lowerUrl.includes('.m3u8') || lowerUrl.includes('m3u8') || lowerUrl.includes('playlist.m3u')) {
      console.log(`[Streaming] Type Detected: HLS for ${url}`);
      return 'hls';
  }
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be') || /^[a-zA-Z0-9_-]{11}$/.test(url)) {
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
  if (lowerUrl.includes('.mp4')) {
      console.log(`[Streaming] Type Detected: MP4 for ${url}`);
      return 'mp4';
  }
  if (lowerUrl.includes('.ts')) {
      console.log(`[Streaming] Type Detected: MPEG-TS for ${url}`);
      return 'mpeg-ts';
  }
  if (lowerUrl.includes('nta.ng') || lowerUrl.includes('embed') || lowerUrl.includes('player') || lowerUrl.includes('watch') || lowerUrl.startsWith('http')) {
      console.log(`[Streaming] Type Detected: Official Embed / Web Player for ${url}`);
      return 'official_embed';
  }

  return 'unknown';
};

export class UniversalStreamService {
  static normalize(channel: any): NormalizedStream {
    const type = detectStreamType(channel.url || channel.stream_url);
    const rawUrl = channel.url || channel.stream_url;
    const url = type === 'youtube' ? extractYoutubeUrl(rawUrl) : rawUrl;
    const provider = this.getProviderName(url, type);
    
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const isHttpStream = url && url.startsWith('http://');
    
    const knownCorsDomains = [
      'cloudfront.net',
      'tubi.video',
      'tubi.io',
      'pluto.tv',
      'limex.tv',
      'redbull.com',
      'amagi.tv',
      'wurl.com',
      'plex.tv',
      'samsungcloudtv.com',
      'roku.com',
      'gravitas',
      'nta.ng'
    ];
    
    const lowerUrl = (url || '').toLowerCase();
    const isKnownCorsDomain = knownCorsDomains.some(d => lowerUrl.includes(d));
    let needsProxy = (isHttps && isHttpStream) || isKnownCorsDomain;
    
    return {
      id: channel.id || 'temp-' + Math.random(),
      name: channel.name || 'Unknown Channel',
      url: url || '',
      type,
      provider,
      isLive: channel.is_live ?? true,
      needsProxy
    };
  }

  private static getProviderName(url: string, type: StreamType): string {
    if (type === 'youtube') return 'YouTube';
    if (type === 'facebook') return 'Facebook';
    if (type === 'vimeo') return 'Vimeo';
    if (type === 'dash') return 'DASH Stream';
    if (type === 'hls') return 'HLS Stream';
    if (type === 'official_embed') return 'Official Broadcaster Portal';
    if (!url) return 'Direct';
    if (url.includes('nta.ng')) return 'NTA Official Portal';
    if (url.includes('channelstv')) return 'Channels TV Portal';
    if (url.includes('tvcnews')) return 'TVC News Portal';
    return 'Direct';
  }

  static async checkHealth(url: string): Promise<{ ok: boolean; status?: number; error?: string }> {
    try {
      const type = detectStreamType(url);
      if (type === 'youtube' || type === 'facebook' || type === 'vimeo' || type === 'official_embed') {
          return { ok: true };
      }

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
