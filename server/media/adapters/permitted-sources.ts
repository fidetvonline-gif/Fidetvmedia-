import { load } from 'cheerio';
import axios from 'axios';
import btchStatic from 'btch-downloader';
import { MediaMetadata } from '../types.js';
import { validateUrlSecurity, sanitizeFilename } from '../validator.js';

const btch = (btchStatic as any).default || btchStatic;

export async function analyzePermittedSource(url: string): Promise<MediaMetadata | null> {
  const security = await validateUrlSecurity(url);
  if (!security.valid) {
    throw new Error(security.error || 'This resource is not publicly accessible.');
  }

  const lowerUrl = url.toLowerCase();

  // 1. YouTube Handler - Attempt direct MP4 resolution
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    // Primary: btch-downloader for direct MP4 stream
    try {
      if (btch && btch.youtube) {
        const data = await Promise.race([
          btch.youtube(url),
          new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000))
        ]);

        if (data && (data.mp4 || data.video || data.link)) {
          const directMp4 = data.mp4 || data.video || data.link;
          const cleanTitle = sanitizeFilename(data.title || 'YouTube_Video', 'youtube_video') + '.mp4';
          return {
            type: 'video',
            mimeType: 'video/mp4',
            filename: cleanTitle,
            size: 25000000,
            format: 'MP4',
            thumbnail: data.thumbnail || `https://i.ytimg.com/vi/${url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1] || ''}/hqdefault.jpg`,
            downloadUrl: directMp4,
            sourceUrl: url,
            platform: 'YouTube'
          };
        }
      }
    } catch (btchErr: any) {
      console.warn('[Permitted-Source] btch YouTube failed:', btchErr?.message);
    }

    // Secondary fallback: oEmbed metadata with direct watch/stream link
    try {
      const oembedRes = await axios.get(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, { timeout: 3000 });
      const data = oembedRes.data;
      if (data && data.title) {
        const cleanTitle = sanitizeFilename(data.title, 'youtube_video') + '.mp4';
        return {
          type: 'video',
          mimeType: 'video/mp4',
          filename: cleanTitle,
          size: 25000000,
          format: 'MP4',
          thumbnail: data.thumbnail_url || '',
          downloadUrl: url,
          sourceUrl: url,
          platform: 'YouTube'
        };
      }
    } catch (oembedErr) {
    }
  }

  // 2. Fallback: OpenGraph & HTML deep scraping for direct audio/video/image tags
  try {
    const pageRes = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 2500,
      maxRedirects: 5,
      maxContentLength: 5 * 1024 * 1024,
      validateStatus: (status) => status < 400
    });
    if (pageRes.status === 200 && typeof pageRes.data === 'string') {
      const $ = load(pageRes.data);
      const title = $('meta[property="og:title"]').attr('content') || $('title').text() || 'Web Media';
      const videoSrc = 
        $('meta[property="og:video:secure_url"]').attr('content') ||
        $('meta[property="og:video"]').attr('content') ||
        $('video source').attr('src') ||
        $('video').attr('src') ||
        $('source[type="video/mp4"]').attr('src');
      const audioSrc =
        $('meta[property="og:audio"]').attr('content') ||
        $('audio source').attr('src') ||
        $('audio').attr('src');
      const ogImage = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content');

      const isEmbedOrPage = (mediaUrl: string) => {
        const u = mediaUrl.toLowerCase();
        return u.includes('/embed/') ||
               u.includes('youtube.com') ||
               u.includes('youtu.be') ||
               u.includes('player.vimeo.com') ||
               u.includes('vimeo.com/api') ||
               u.endsWith('.html') ||
               u.endsWith('.htm') ||
               u.endsWith('.php');
      };

      if (videoSrc && (videoSrc.startsWith('http://') || videoSrc.startsWith('https://')) && !isEmbedOrPage(videoSrc)) {
        return {
          type: 'video',
          mimeType: 'video/mp4',
          filename: sanitizeFilename(title, 'video') + '.mp4',
          size: 20000000,
          format: 'MP4',
          thumbnail: ogImage || '',
          downloadUrl: videoSrc,
          sourceUrl: url,
          platform: 'Web Video'
        };
      }

      if (audioSrc && (audioSrc.startsWith('http://') || audioSrc.startsWith('https://')) && !isEmbedOrPage(audioSrc)) {
        return {
          type: 'audio',
          mimeType: 'audio/mpeg',
          filename: sanitizeFilename(title, 'audio') + '.mp3',
          size: 8000000,
          format: 'MP3',
          downloadUrl: audioSrc,
          sourceUrl: url,
          platform: 'Web Audio'
        };
      }
    }
  } catch (ogErr) {}

  return null;
}
