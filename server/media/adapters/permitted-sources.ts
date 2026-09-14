import { load } from 'cheerio';
import btch from 'btch-downloader';
import ruhend from 'ruhend-scraper';
import axios from 'axios';
import { MediaMetadata } from '../types.js';
import { validateUrlSecurity, sanitizeFilename } from '../validator.js';

export async function analyzePermittedSource(url: string): Promise<MediaMetadata | null> {
  const security = await validateUrlSecurity(url);
  if (!security.valid) {
    throw new Error(security.error || 'This resource is not publicly accessible.');
  }

  const lowerUrl = url.toLowerCase();

  const withTimeout = <T>(promise: Promise<T>, ms = 3500): Promise<T> => {
    let timeoutId: NodeJS.Timeout;
    promise.catch(() => {});
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('Scraper timed out'));
      }, ms);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
  };

  // 1. YouTube Handler
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    // 1. Try btch-downloader FIRST
    try {
      if (btch?.youtube) {
        const data = (await withTimeout(btch.youtube(url), 4000)) as any;
        if (data && (data.mp4 || data.video || data.url || data.link)) {
          const directUrl = data.mp4 || data.video || data.url || data.link;
          const title = sanitizeFilename(data.title || 'youtube_video', 'youtube_video') + '.mp4';
          return {
            type: 'video',
            mimeType: 'video/mp4',
            filename: title,
            size: 25000000,
            format: 'MP4',
            thumbnail: data.thumbnail || '',
            downloadUrl: directUrl,
            sourceUrl: url,
            platform: 'YouTube',
            resolution: 'HD'
          };
        }
      }
    } catch (btchErr: any) {
      console.warn('[Permitted-Source] btch YouTube failed. Trying ruhend/oEmbed...');
    }

    // 2. Try ruhend ytmp4
    try {
      if (ruhend?.ytmp4) {
        const data = (await withTimeout(ruhend.ytmp4(url), 4000)) as any;
        if (data && (data.url || data.video || data.link)) {
          const directUrl = data.url || data.video || data.link;
          const title = sanitizeFilename(data.title || 'youtube_video', 'youtube_video') + '.mp4';
          return {
            type: 'video',
            mimeType: 'video/mp4',
            filename: title,
            size: 25000000,
            format: 'MP4',
            thumbnail: data.thumbnail || '',
            downloadUrl: directUrl,
            sourceUrl: url,
            platform: 'YouTube',
            resolution: 'HD'
          };
        }
      }
    } catch (ruhendErr) {}

    // 3. Fallback to oEmbed metadata
    try {
      const oembedRes = await axios.get(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, { timeout: 2500 });
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
          platform: 'YouTube (Stream / Watch)'
        };
      }
    } catch (oembedErr) {
      // Ignore oembed error
    }

    return null;
  }

  // 2. Specialized Scrapers (TikTok, Instagram, Twitter/X, Facebook, Threads, Capcut, Snapchat, Pinterest, Mediafire, SoundCloud)
  const isSocialPlatform =
    lowerUrl.includes('tiktok.com') ||
    lowerUrl.includes('instagram.com') ||
    lowerUrl.includes('twitter.com') ||
    lowerUrl.includes('x.com') ||
    lowerUrl.includes('facebook.com') ||
    lowerUrl.includes('fb.watch') ||
    lowerUrl.includes('threads.net') ||
    lowerUrl.includes('capcut.com') ||
    lowerUrl.includes('snapchat.com') ||
    lowerUrl.includes('pinterest.com') ||
    lowerUrl.includes('mediafire.com') ||
    lowerUrl.includes('soundcloud.com');

  if (isSocialPlatform) {
    try {
      let data: any = null;
      let platformName = 'Media';

      if (lowerUrl.includes('tiktok.com')) {
        platformName = 'TikTok';
        if (ruhend?.ttdl) {
          try { data = await withTimeout(ruhend.ttdl(url)); } catch (e) {}
        }
        if (!data && btch?.ttdl) {
          try { data = await withTimeout(btch.ttdl(url)); } catch (e) {}
        }
      } else if (lowerUrl.includes('instagram.com')) {
        platformName = 'Instagram';
        if (ruhend?.igdl) {
          try { data = await withTimeout(ruhend.igdl(url)); } catch (e) {}
        }
        if (!data && btch?.igdl) {
          try { data = await withTimeout(btch.igdl(url)); } catch (e) {}
        }
      } else if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.watch')) {
        platformName = 'Facebook';
        if (ruhend?.fbdl) {
          try { data = await withTimeout(ruhend.fbdl(url)); } catch (e) {}
        }
        if (!data && btch?.fbdown) {
          try { data = await withTimeout(btch.fbdown(url)); } catch (e) {}
        }
      } else if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
        platformName = 'X (Twitter)';
        if (ruhend?.twitter) {
          try { data = await withTimeout(ruhend.twitter(url)); } catch (e) {}
        }
        if (!data && btch?.twitter) {
          try { data = await withTimeout(btch.twitter(url)); } catch (e) {}
        }
      } else if (lowerUrl.includes('threads.net')) {
        platformName = 'Threads';
        if (ruhend?.threads) {
          try { data = await withTimeout(ruhend.threads(url)); } catch (e) {}
        }
        if (!data && btch?.threads) {
          try { data = await withTimeout(btch.threads(url)); } catch (e) {}
        }
      } else if (lowerUrl.includes('capcut.com')) {
        platformName = 'CapCut';
        if (ruhend?.capcut) {
          try { data = await withTimeout(ruhend.capcut(url)); } catch (e) {}
        }
        if (!data && btch?.capcut) {
          try { data = await withTimeout(btch.capcut(url)); } catch (e) {}
        }
      } else if (lowerUrl.includes('snapchat.com')) {
        platformName = 'Snapchat';
        if (ruhend?.snapchat) {
          try { data = await withTimeout(ruhend.snapchat(url)); } catch (e) {}
        }
      } else if (lowerUrl.includes('pinterest.com')) {
        platformName = 'Pinterest';
        if (btch?.pinterest) {
          try { data = await withTimeout(btch.pinterest(url)); } catch (e) {}
        }
      } else if (lowerUrl.includes('mediafire.com')) {
        platformName = 'MediaFire';
        if (btch?.mediafire) {
          try { data = await withTimeout(btch.mediafire(url)); } catch (e) {}
        }
      } else if (lowerUrl.includes('soundcloud.com')) {
        platformName = 'SoundCloud';
        if (btch?.soundcloud) {
          try { data = await withTimeout(btch.soundcloud(url)); } catch (e) {}
        }
      }

      if (!data && btch?.aio) {
        try {
          data = await withTimeout(btch.aio(url), 5000);
        } catch {}
      }

      if (data) {
        const item = Array.isArray(data) ? data[0] : (data.result && Array.isArray(data.result) ? data.result[0] : data);
        const downloadUrl = item.url || item.video || item.link || item.download_link || item.hd || item.sd || item.mp4 || item.mp3;
        if (downloadUrl && typeof downloadUrl === 'string' && downloadUrl.startsWith('http')) {
          const isAudio = lowerUrl.includes('soundcloud') || (item.audio && !item.video);
          const ext = isAudio ? 'mp3' : 'mp4';
          const mimeType = isAudio ? 'audio/mpeg' : 'video/mp4';
          const filename = sanitizeFilename(item.title || `${platformName.toLowerCase()}_media`, `${platformName.toLowerCase()}_media`) + `.${ext}`;
          return {
            type: isAudio ? 'audio' : 'video',
            mimeType,
            filename,
            size: item.size || (isAudio ? 8000000 : 15000000),
            format: ext.toUpperCase(),
            thumbnail: item.thumbnail || item.cover || '',
            downloadUrl,
            sourceUrl: url,
            platform: platformName,
            resolution: item.hd ? '1080p' : 'HD'
          };
        }
      }
    } catch (scraperErr: any) {
      console.warn('[Permitted-Source] Social scraper failed:', scraperErr?.message);
    }
  }

  // 3. Fallback: OpenGraph & HTML deep scraping for direct audio/video/image tags
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
