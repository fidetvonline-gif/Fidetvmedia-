import axios from 'axios';
import { MediaMetadata } from '../types.js';
import { validateUrlSecurity, sanitizeFilename } from '../validator.js';

export async function analyzePermittedSource(url: string): Promise<MediaMetadata | null> {
  const security = await validateUrlSecurity(url);
  if (!security.valid) {
    throw new Error(security.error || 'This resource is not publicly accessible.');
  }

  const lowerUrl = url.toLowerCase();

  // 1. YouTube Handler
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    // 1. Try @distube/ytdl-core FIRST (Lightweight, less prone to OOM on Vercel)
    try {
      const ytdlModule = await import('@distube/ytdl-core');
      const ytdl = (ytdlModule as any).default || ytdlModule;
      if (ytdl.validateURL(url)) {
        const info = await ytdl.getInfo(url);
        let format = ytdl.chooseFormat(info.formats, { quality: 'highestvideo', filter: 'videoandaudio' });
        if (!format) format = ytdl.chooseFormat(info.formats, { quality: 'highest' });

        if (format && format.url) {
          const title = info.videoDetails.title || 'YouTube Video';
          const cleanTitle = sanitizeFilename(title.replace(/[^a-zA-Z0-9\s-_]/g, '').trim(), 'youtube_video') + '.mp4';
          const thumbnail = info.videoDetails.thumbnails?.[info.videoDetails.thumbnails.length - 1]?.url || '';
          const duration = parseInt(info.videoDetails.lengthSeconds || '0', 10);
          const width = format?.width;
          const height = format?.height;
          const size = parseInt(format?.contentLength || '0', 10);

          return {
            type: 'video',
            mimeType: format?.mimeType ? format.mimeType.split(';')[0] : 'video/mp4',
            filename: cleanTitle,
            size: size || 25000000,
            duration: duration || undefined,
            width,
            height,
            resolution: height ? `${height}p` : '720p',
            format: 'MP4',
            thumbnail,
            downloadUrl: format.url,
            sourceUrl: url,
            platform: 'YouTube'
          };
        }
      }
    } catch (ytErr) {
      console.warn('[Permitted-Source] ytdl-core YouTube failed, trying btch-downloader...');
    }

    // 2. Fallback to btch-downloader
    try {
      const btchModule = await import('btch-downloader');
      const btch = (btchModule as any).default || btchModule;
      if (btch.youtube) {
        const data = await btch.youtube(url);
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
      console.warn('[Permitted-Source] btch YouTube failed. Falling back to oEmbed metadata.');
    }

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

    // Explicitly reject YouTube if all direct extractors fail, preventing OpenGraph from returning an embed iframe
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
        const ruhendModule = await import('ruhend-scraper');
        const ruhend = (ruhendModule as any).default || ruhendModule;

        const btchModule = await import('btch-downloader');
        const btch = (btchModule as any).default || btchModule;

        const withTimeout = <T>(promise: Promise<T>, ms = 3500): Promise<T> => {
          let timeoutId: NodeJS.Timeout;
          const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => {
              reject(new Error('Scraper timed out'));
            }, ms);
          });
          return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
        };

        let data: any = null;
        let platformName = 'Media';

        if (lowerUrl.includes('tiktok.com')) {
          platformName = 'TikTok';
          if (ruhend?.ttdl) {
            try { data = await withTimeout(ruhend.ttdl(url)); } catch (e) { console.warn('ttdl failed', e); }
          }
          if (!data && btch?.ttdl) {
            try { data = await withTimeout(btch.ttdl(url)); } catch (e) { console.warn('btch ttdl failed', e); }
          }
        } else if (lowerUrl.includes('instagram.com')) {
          platformName = 'Instagram';
          if (ruhend?.igdl) {
            try { data = await withTimeout(ruhend.igdl(url)); } catch (e) { console.warn('igdl failed', e); }
          }
          if (!data && btch?.igdl) {
            try { data = await withTimeout(btch.igdl(url)); } catch (e) { console.warn('btch igdl failed', e); }
          }
        } else if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.watch')) {
          platformName = 'Facebook';
          if (ruhend?.fbdl) {
            try { data = await withTimeout(ruhend.fbdl(url)); } catch (e) { console.warn('fbdl failed', e); }
          }
          if (!data && btch?.fbdown) {
            try { data = await withTimeout(btch.fbdown(url)); } catch (e) { console.warn('btch fbdown failed', e); }
          }
        } else if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
          platformName = 'X (Twitter)';
          if (ruhend?.twitter) {
            try { data = await withTimeout(ruhend.twitter(url)); } catch (e) { console.warn('twitter failed', e); }
          }
          if (!data && btch?.twitter) {
            try { data = await withTimeout(btch.twitter(url)); } catch (e) { console.warn('btch twitter failed', e); }
          }
        } else if (lowerUrl.includes('threads.net')) {
          platformName = 'Threads';
          if (ruhend?.threads) {
            try { data = await withTimeout(ruhend.threads(url)); } catch (e) { console.warn('threads failed', e); }
          }
          if (!data && btch?.threads) {
            try { data = await withTimeout(btch.threads(url)); } catch (e) { console.warn('btch threads failed', e); }
          }
        } else if (lowerUrl.includes('capcut.com')) {
          platformName = 'CapCut';
          if (ruhend?.capcut) {
            try { data = await withTimeout(ruhend.capcut(url)); } catch (e) { console.warn('capcut failed', e); }
          }
          if (!data && btch?.capcut) {
            try { data = await withTimeout(btch.capcut(url)); } catch (e) { console.warn('btch capcut failed', e); }
          }
        } else if (lowerUrl.includes('snapchat.com')) {
          platformName = 'Snapchat';
          if (ruhend?.snapchat) {
            try { data = await withTimeout(ruhend.snapchat(url)); } catch (e) { console.warn('snapchat failed', e); }
          }
        } else if (lowerUrl.includes('pinterest.com')) {
          platformName = 'Pinterest';
          if (btch?.pinterest) {
            try { data = await withTimeout(btch.pinterest(url)); } catch (e) { console.warn('pinterest failed', e); }
          }
        } else if (lowerUrl.includes('mediafire.com')) {
          platformName = 'MediaFire';
          if (btch?.mediafire) {
            try { data = await withTimeout(btch.mediafire(url)); } catch (e) { console.warn('mediafire failed', e); }
          }
        } else if (lowerUrl.includes('soundcloud.com')) {
          platformName = 'SoundCloud';
          if (btch?.soundcloud) {
            try { data = await withTimeout(btch.soundcloud(url)); } catch (e) { console.warn('soundcloud failed', e); }
          }
        }

      // If specific scrapers didn't return data, try AIO (All-in-One)
      if (!data && btch?.aio) {
        try {
          data = await withTimeout(btch.aio(url), 6000);
        } catch {}
      }

      if (data) {
        // Normalize returned data object
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
      console.warn('[Permitted-Source] Social scraper failed:', scraperErr.message);
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
      validateStatus: (status) => status < 400
    });

    if (pageRes.status === 200 && typeof pageRes.data === 'string') {
      const cheerioModule = await import('cheerio');
      const cheerio = (cheerioModule as any).default || cheerioModule;
      const $ = cheerio.load(pageRes.data);

      const title = $('meta[property="og:title"]').attr('content') || $('title').text() || 'Web Media';
      
      // Look for real media stream tags first
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

      // Helper to check if URL is an HTML embed / webpage rather than direct media
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
  } catch (ogErr) {
    // OpenGraph fallback failed
  }

  return null;
}
