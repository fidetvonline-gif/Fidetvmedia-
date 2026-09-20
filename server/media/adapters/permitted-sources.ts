import * as cheerioStatic from 'cheerio';
import axios from 'axios';
import btchStatic from 'btch-downloader';
import ruhendStatic from 'ruhend-scraper';
import igDirectStatic from 'instagram-url-direct';
import getTwitterMediaStatic from 'get-twitter-media';
import { MediaMetadata } from '../types.js';
import { validateUrlSecurity, sanitizeFilename } from '../validator.js';

const cheerio = (cheerioStatic as any).default || cheerioStatic;
const btch = (btchStatic as any).default || btchStatic;
const ruhend = (ruhendStatic as any).default || ruhendStatic;
const igDirect = (igDirectStatic as any).default || igDirectStatic;
const getTwitterMedia = (getTwitterMediaStatic as any).default || getTwitterMediaStatic;

const fastTimeout = <T>(promise: Promise<T>, ms = 2500): Promise<T | null> => {
  return Promise.race([
    promise.catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))
  ]);
};

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,video/*,audio/*,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none'
};

/**
 * Universal Media Adapter
 * Analyzes any link from any social media platform, video hub, music/podcast site, or arbitrary webpage.
 * Extracts direct downloadable media (Video MP4, Audio MP3, Streams) along with rich metadata.
 */
export async function analyzePermittedSource(url: string): Promise<MediaMetadata | null> {
  const security = await validateUrlSecurity(url);
  if (!security.valid) {
    throw new Error(security.error || 'This resource is not publicly accessible.');
  }

  const rawUrl = url.trim();
  const lowerUrl = rawUrl.toLowerCase();

  // ----------------------------------------------------
  // 1. YouTube & YouTube Shorts
  // ----------------------------------------------------
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    const videoId = rawUrl.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/)?.[1] || '';
    const fallbackThumb = videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '';

    const [btchData, oembedData] = await Promise.all([
      (btch && btch.youtube) ? fastTimeout(btch.youtube(rawUrl), 2500) : Promise.resolve(null),
      fastTimeout(axios.get(`https://www.youtube.com/oembed?url=${encodeURIComponent(rawUrl)}&format=json`).then(r => r.data), 2000)
    ]);

    const title = btchData?.title || oembedData?.title || 'YouTube Video';
    const cleanFilename = sanitizeFilename(title, 'youtube_video') + '.mp4';
    const directMp4 = btchData?.mp4 || btchData?.video || btchData?.link || rawUrl;
    const audioUrl = btchData?.audio || btchData?.mp3 || undefined;
    const thumbnail = btchData?.thumbnail || oembedData?.thumbnail_url || fallbackThumb;

    return {
      type: 'video',
      mimeType: 'video/mp4',
      filename: cleanFilename,
      title: title,
      author: oembedData?.author_name || undefined,
      size: 25000000,
      format: 'MP4',
      thumbnail: thumbnail,
      downloadUrl: directMp4,
      audioUrl: audioUrl,
      sourceUrl: rawUrl,
      platform: 'YouTube'
    };
  }

  // ----------------------------------------------------
  // 2. TikTok (Videos, Clips, Audio)
  // ----------------------------------------------------
  if (lowerUrl.includes('tiktok.com')) {
    const [ruhendRes, btchRes, tikwmRes, oembedRes] = await Promise.all([
      (ruhend && (ruhend.ttdl || ruhend.tiktok)) ? fastTimeout((ruhend.ttdl || ruhend.tiktok)(rawUrl), 2500) : Promise.resolve(null),
      (btch && (btch.ttdl || btch.tiktok)) ? fastTimeout((btch.ttdl || btch.tiktok)(rawUrl), 2500) : Promise.resolve(null),
      fastTimeout(axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(rawUrl)}`).then(r => r.data?.data), 2500),
      fastTimeout(axios.get(`https://www.tiktok.com/oembed?url=${encodeURIComponent(rawUrl)}`).then(r => r.data), 1800)
    ]);

    const directVideo = tikwmRes?.play || ruhendRes?.video2 || ruhendRes?.video || ruhendRes?.nowm || btchRes?.video || btchRes?.video2 || btchRes?.url || rawUrl;
    const audioUrl = tikwmRes?.music || ruhendRes?.audio || ruhendRes?.mp3 || btchRes?.audio || btchRes?.mp3 || undefined;
    const title = tikwmRes?.title || ruhendRes?.title || btchRes?.title || oembedRes?.title || 'TikTok Video';
    const author = tikwmRes?.author?.nickname || ruhendRes?.author || oembedRes?.author_name || undefined;
    const thumbnail = tikwmRes?.cover || ruhendRes?.cover || ruhendRes?.thumbnail || btchRes?.thumbnail || oembedRes?.thumbnail_url || '';

    return {
      type: 'video',
      mimeType: 'video/mp4',
      filename: sanitizeFilename(title, 'tiktok_video') + '.mp4',
      title: title,
      author: author,
      size: 15000000,
      format: 'MP4',
      thumbnail: thumbnail,
      downloadUrl: directVideo,
      audioUrl: audioUrl,
      sourceUrl: rawUrl,
      platform: 'TikTok'
    };
  }

  // ----------------------------------------------------
  // 3. Instagram (Reels, Posts, Videos)
  // ----------------------------------------------------
  if (lowerUrl.includes('instagram.com')) {
    const [ruhendRes, igDirectRes, btchRes] = await Promise.all([
      (ruhend && (ruhend.igdl || ruhend.instagram)) ? fastTimeout((ruhend.igdl || ruhend.instagram)(rawUrl), 2500) : Promise.resolve(null),
      (igDirect && igDirect.instagramGetUrl) ? fastTimeout(igDirect.instagramGetUrl(rawUrl), 2500) : Promise.resolve(null),
      (btch && (btch.igdl || btch.instagram)) ? fastTimeout((btch.igdl || btch.instagram)(rawUrl), 2500) : Promise.resolve(null)
    ]);

    const ruhendItems = Array.isArray(ruhendRes) ? ruhendRes : (ruhendRes?.result || [ruhendRes]);
    const ruhendItem = ruhendItems.find((it: any) => it && (it.url || it.video || it.link));
    const igDirectUrl = igDirectRes?.url_list?.[0];
    const btchUrl = btchRes?.url || btchRes?.link || (Array.isArray(btchRes?.result) ? btchRes.result[0]?.url : btchRes?.result);

    const directUrl = ruhendItem?.url || ruhendItem?.video || ruhendItem?.link || igDirectUrl || btchUrl || rawUrl;
    const thumbnail = ruhendItem?.thumbnail || '';

    return {
      type: 'video',
      mimeType: 'video/mp4',
      filename: 'Instagram_Media_' + Date.now() + '.mp4',
      title: 'Instagram Media',
      size: 18000000,
      format: 'MP4',
      thumbnail: thumbnail,
      downloadUrl: directUrl,
      sourceUrl: rawUrl,
      platform: 'Instagram'
    };
  }

  // ----------------------------------------------------
  // 4. Facebook & FB Watch
  // ----------------------------------------------------
  if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.watch') || lowerUrl.includes('fb.com')) {
    const [ruhendRes, btchRes] = await Promise.all([
      (ruhend && (ruhend.fbdl || ruhend.facebook)) ? fastTimeout((ruhend.fbdl || ruhend.facebook)(rawUrl), 2500) : Promise.resolve(null),
      (btch && (btch.fbdown || btch.facebook)) ? fastTimeout((btch.fbdown || btch.facebook)(rawUrl), 2500) : Promise.resolve(null)
    ]);

    const directUrl = ruhendRes?.HD || ruhendRes?.video || ruhendRes?.Normal_video || ruhendRes?.url ||
                      btchRes?.HD || btchRes?.Normal_video || btchRes?.video || btchRes?.url || rawUrl;
    const title = ruhendRes?.title || btchRes?.title || 'Facebook Video';
    const audioUrl = ruhendRes?.audio || btchRes?.audio || undefined;

    return {
      type: 'video',
      mimeType: 'video/mp4',
      filename: sanitizeFilename(title, 'facebook_video') + '.mp4',
      title: title,
      size: 25000000,
      format: 'MP4',
      downloadUrl: directUrl,
      audioUrl: audioUrl,
      sourceUrl: rawUrl,
      platform: 'Facebook'
    };
  }

  // ----------------------------------------------------
  // 5. Twitter / X
  // ----------------------------------------------------
  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
    const [twitterMediaRes, btchRes, oembedRes] = await Promise.all([
      getTwitterMedia ? fastTimeout(getTwitterMedia(rawUrl), 2500) : Promise.resolve(null),
      (btch && btch.twitter) ? fastTimeout(btch.twitter(rawUrl), 2500) : Promise.resolve(null),
      fastTimeout(axios.get(`https://publish.twitter.com/oembed?url=${encodeURIComponent(rawUrl)}`).then(r => r.data), 1800)
    ]);

    let bestUrl: string | undefined;
    if (twitterMediaRes?.media && Array.isArray(twitterMediaRes.media)) {
      const sorted = [...twitterMediaRes.media].sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
      bestUrl = sorted[0]?.url;
    }
    const directVideo = bestUrl || btchRes?.hd || btchRes?.video || btchRes?.sd || btchRes?.url || rawUrl;
    const title = twitterMediaRes?.text?.substring(0, 60) || btchRes?.title || (oembedRes?.author_name ? `Post by ${oembedRes.author_name}` : 'Twitter Video');

    return {
      type: 'video',
      mimeType: 'video/mp4',
      filename: sanitizeFilename(title, 'twitter_video') + '.mp4',
      title: title,
      author: oembedRes?.author_name || undefined,
      size: 15000000,
      format: 'MP4',
      downloadUrl: directVideo,
      sourceUrl: rawUrl,
      platform: 'Twitter / X'
    };
  }

  // ----------------------------------------------------
  // 6. Spotify (Tracks & Audio)
  // ----------------------------------------------------
  if (lowerUrl.includes('spotify.com')) {
    const [btchRes, oembedRes] = await Promise.all([
      (btch && btch.spotify) ? fastTimeout(btch.spotify(rawUrl), 2500) : Promise.resolve(null),
      fastTimeout(axios.get(`https://open.spotify.com/oembed?url=${encodeURIComponent(rawUrl)}`).then(r => r.data), 1800)
    ]);

    const directUrl = btchRes?.download || btchRes?.url || btchRes?.link || rawUrl;
    const title = btchRes?.title ? `${btchRes.title} - ${btchRes.artist || ''}` : (oembedRes?.title || 'Spotify Track');
    const thumbnail = btchRes?.thumbnail || btchRes?.cover || oembedRes?.thumbnail_url || '';

    return {
      type: 'audio',
      mimeType: 'audio/mpeg',
      filename: sanitizeFilename(title, 'spotify_track') + '.mp3',
      title: title,
      size: 9000000,
      format: 'MP3',
      thumbnail: thumbnail,
      downloadUrl: directUrl,
      sourceUrl: rawUrl,
      platform: 'Spotify'
    };
  }

  // ----------------------------------------------------
  // 7. SoundCloud (Music & Audio Tracks)
  // ----------------------------------------------------
  if (lowerUrl.includes('soundcloud.com')) {
    const [btchRes, oembedRes] = await Promise.all([
      (btch && btch.soundcloud) ? fastTimeout(btch.soundcloud(rawUrl), 2500) : Promise.resolve(null),
      fastTimeout(axios.get(`https://soundcloud.com/oembed?url=${encodeURIComponent(rawUrl)}&format=json`).then(r => r.data), 1800)
    ]);

    const directUrl = btchRes?.download || btchRes?.url || btchRes?.link || rawUrl;
    const title = btchRes?.title || oembedRes?.title || 'SoundCloud Audio';
    const thumbnail = btchRes?.thumbnail || oembedRes?.thumbnail_url || '';

    return {
      type: 'audio',
      mimeType: 'audio/mpeg',
      filename: sanitizeFilename(title, 'soundcloud_audio') + '.mp3',
      title: title,
      author: oembedRes?.author_name || undefined,
      size: 8500000,
      format: 'MP3',
      thumbnail: thumbnail,
      downloadUrl: directUrl,
      sourceUrl: rawUrl,
      platform: 'SoundCloud'
    };
  }

  // ----------------------------------------------------
  // 8. Pinterest & Threads & CapCut
  // ----------------------------------------------------
  if (lowerUrl.includes('pinterest.com') || lowerUrl.includes('pin.it')) {
    try {
      if (btch && btch.pinterest) {
        const res = await btch.pinterest(rawUrl);
        const directUrl = res?.url || res?.video || res?.link;
        if (directUrl) {
          const isVideo = directUrl.includes('.mp4') || String(res?.type).includes('video');
          return {
            type: isVideo ? 'video' : 'image',
            mimeType: isVideo ? 'video/mp4' : 'image/jpeg',
            filename: (isVideo ? 'Pinterest_Video_' : 'Pinterest_Pin_') + Date.now() + (isVideo ? '.mp4' : '.jpg'),
            title: res?.title || 'Pinterest Media',
            size: isVideo ? 12000000 : 1500000,
            format: isVideo ? 'MP4' : 'JPG',
            downloadUrl: directUrl,
            sourceUrl: rawUrl,
            platform: 'Pinterest'
          };
        }
      }
    } catch (e) {}
  }

  if (lowerUrl.includes('threads.net')) {
    try {
      if (btch && btch.threads) {
        const res = await btch.threads(rawUrl);
        const directUrl = res?.video || res?.image || res?.url;
        if (directUrl) {
          const isVideo = !!res?.video || directUrl.includes('.mp4');
          return {
            type: isVideo ? 'video' : 'image',
            mimeType: isVideo ? 'video/mp4' : 'image/jpeg',
            filename: 'Threads_Media_' + Date.now() + (isVideo ? '.mp4' : '.jpg'),
            size: isVideo ? 15000000 : 1200000,
            format: isVideo ? 'MP4' : 'JPG',
            downloadUrl: directUrl,
            sourceUrl: rawUrl,
            platform: 'Threads'
          };
        }
      }
    } catch (e) {}
  }

  if (lowerUrl.includes('capcut.com')) {
    try {
      if (btch && btch.capcut) {
        const res = await btch.capcut(rawUrl);
        const directUrl = res?.video || res?.url;
        if (directUrl) {
          return {
            type: 'video',
            mimeType: 'video/mp4',
            filename: sanitizeFilename(res?.title || 'CapCut_Video', 'capcut') + '.mp4',
            title: res?.title || 'CapCut Video',
            size: 20000000,
            format: 'MP4',
            downloadUrl: directUrl,
            sourceUrl: rawUrl,
            platform: 'CapCut'
          };
        }
      }
    } catch (e) {}
  }

  // ----------------------------------------------------
  // 9. Reddit (Videos & v.redd.it)
  // ----------------------------------------------------
  if (lowerUrl.includes('reddit.com') || lowerUrl.includes('v.redd.it')) {
    try {
      let jsonUrl = rawUrl;
      if (!jsonUrl.endsWith('.json')) {
        jsonUrl = jsonUrl.split('?')[0].replace(/\/$/, '') + '.json';
      }
      const redditRes = await axios.get(jsonUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) FideSaveMedia/2.0' },
        timeout: 4000
      });
      const postData = redditRes.data?.[0]?.data?.children?.[0]?.data;
      if (postData) {
        const videoData = postData.secure_media?.reddit_video || postData.media?.reddit_video;
        if (videoData && videoData.fallback_url) {
          const directUrl = videoData.fallback_url.split('?')[0];
          return {
            type: 'video',
            mimeType: 'video/mp4',
            filename: sanitizeFilename(postData.title || 'Reddit_Video', 'reddit_video') + '.mp4',
            title: postData.title || 'Reddit Video',
            size: 15000000,
            format: 'MP4',
            thumbnail: postData.thumbnail && postData.thumbnail.startsWith('http') ? postData.thumbnail : '',
            downloadUrl: directUrl,
            sourceUrl: rawUrl,
            platform: 'Reddit'
          };
        }
      }
    } catch (e) {}
  }

  // ----------------------------------------------------
  // 10. Cloud Storage Direct Link Converters (Drive, Mediafire, Dropbox)
  // ----------------------------------------------------
  if (lowerUrl.includes('drive.google.com')) {
    const fileIdMatch = rawUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || rawUrl.match(/id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      const fileId = fileIdMatch[1];
      const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      return {
        type: 'file',
        mimeType: 'application/octet-stream',
        filename: `Google_Drive_File_${fileId}.bin`,
        title: 'Google Drive File',
        size: 25000000,
        format: 'FILE',
        downloadUrl: directUrl,
        sourceUrl: rawUrl,
        platform: 'Google Drive'
      };
    }
  }

  if (lowerUrl.includes('mediafire.com')) {
    try {
      if (btch && btch.mediafire) {
        const res = await btch.mediafire(rawUrl);
        if (res && (res.url || res.link)) {
          const directUrl = res.url || res.link;
          return {
            type: 'file',
            mimeType: res.mime || 'application/octet-stream',
            filename: sanitizeFilename(res.filename || 'Mediafire_Download', 'mediafire'),
            title: res.filename || 'MediaFire File',
            size: parseInt(res.size || '0', 10) || 20000000,
            format: 'FILE',
            downloadUrl: directUrl,
            sourceUrl: rawUrl,
            platform: 'MediaFire'
          };
        }
      }
    } catch (e) {}
  }

  if (lowerUrl.includes('dropbox.com')) {
    const directUrl = rawUrl.includes('?') 
      ? rawUrl.replace(/dl=0/g, 'dl=1') 
      : `${rawUrl}?dl=1`;
    return {
      type: 'file',
      mimeType: 'application/octet-stream',
      filename: sanitizeFilename(rawUrl.split('/').pop()?.split('?')[0] || 'Dropbox_File', 'dropbox_file'),
      title: 'Dropbox File',
      size: 20000000,
      format: 'FILE',
      downloadUrl: directUrl,
      sourceUrl: rawUrl,
      platform: 'Dropbox'
    };
  }

  // ----------------------------------------------------
  // 11. UNIVERSAL DEEP WEB SCRAPER (For ANY Website, Blog, Podcast, Video Player, Embed)
  // ----------------------------------------------------
  try {
    const pageRes = await axios.get(rawUrl, {
      headers: BROWSER_HEADERS,
      timeout: 4500,
      maxRedirects: 5,
      maxContentLength: 8 * 1024 * 1024,
      validateStatus: (status) => status < 400
    });

    if (pageRes.status === 200 && typeof pageRes.data === 'string') {
      const html = pageRes.data;
      const $ = cheerio.load(html);

      const pageTitle = $('meta[property="og:title"]').attr('content') ||
                        $('meta[name="twitter:title"]').attr('content') ||
                        $('title').text().trim() ||
                        'Universal Web Media';

      const ogImage = $('meta[property="og:image"]').attr('content') ||
                      $('meta[name="twitter:image"]').attr('content') ||
                      $('link[rel="image_src"]').attr('href') || '';

      const makeAbsolute = (link: string | undefined): string | null => {
        if (!link || typeof link !== 'string') return null;
        const trimmed = link.trim();
        if (trimmed.startsWith('//')) return 'https:' + trimmed;
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
        try {
          return new URL(trimmed, rawUrl).href;
        } catch {
          return null;
        }
      };

      const isForbiddenOrPlayerPage = (mediaUrl: string) => {
        const u = mediaUrl.toLowerCase();
        return u.includes('/embed/') ||
               u.includes('youtube.com/watch') ||
               u.includes('player.vimeo.com/video') ||
               u.endsWith('.html') ||
               u.endsWith('.htm') ||
               u.endsWith('.php') ||
               u.includes('googleads') ||
               u.includes('doubleclick');
      };

      // A. Check Schema.org JSON-LD structured data
      let jsonLdMediaUrl: string | null = null;
      let jsonLdType: 'video' | 'audio' | null = null;
      let jsonLdTitle: string | null = null;
      let jsonLdThumb: string | null = null;

      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const content = $(el).html();
          if (!content) return;
          const parsed = JSON.parse(content);
          const entries = Array.isArray(parsed) ? parsed : (parsed['@graph'] || [parsed]);

          for (const item of entries) {
            if (!item) continue;
            const itemType = String(item['@type'] || '').toLowerCase();
            if (itemType.includes('videoobject') || itemType.includes('clip')) {
              const stream = makeAbsolute(item.contentUrl || item.embedUrl || item.url);
              if (stream && !isForbiddenOrPlayerPage(stream)) {
                jsonLdMediaUrl = stream;
                jsonLdType = 'video';
                jsonLdTitle = item.name || item.headline || null;
                jsonLdThumb = item.thumbnailUrl || null;
                break;
              }
            } else if (itemType.includes('audioobject') || itemType.includes('musicrecording')) {
              const stream = makeAbsolute(item.contentUrl || item.url);
              if (stream && !isForbiddenOrPlayerPage(stream)) {
                jsonLdMediaUrl = stream;
                jsonLdType = 'audio';
                jsonLdTitle = item.name || null;
                break;
              }
            }
          }
        } catch {}
      });

      if (jsonLdMediaUrl && jsonLdType) {
        const ext = jsonLdType === 'video' ? 'mp4' : 'mp3';
        return {
          type: jsonLdType,
          mimeType: jsonLdType === 'video' ? 'video/mp4' : 'audio/mpeg',
          filename: sanitizeFilename(jsonLdTitle || pageTitle, jsonLdType) + '.' + ext,
          title: jsonLdTitle || pageTitle,
          size: jsonLdType === 'video' ? 22000000 : 7500000,
          format: ext.toUpperCase(),
          thumbnail: jsonLdThumb || ogImage,
          downloadUrl: jsonLdMediaUrl,
          sourceUrl: rawUrl,
          platform: 'Universal Web Media'
        };
      }

      // B. Check OpenGraph / Twitter Video & Audio Meta Tags
      const rawVideo = $('meta[property="og:video:secure_url"]').attr('content') ||
                       $('meta[property="og:video"]').attr('content') ||
                       $('meta[property="og:video:url"]').attr('content') ||
                       $('meta[name="twitter:player:stream"]').attr('content') ||
                       $('meta[property="twitter:player:stream"]').attr('content');

      const rawAudio = $('meta[property="og:audio:secure_url"]').attr('content') ||
                       $('meta[property="og:audio"]').attr('content');

      const validVideoUrl = makeAbsolute(rawVideo);
      if (validVideoUrl && !isForbiddenOrPlayerPage(validVideoUrl)) {
        return {
          type: 'video',
          mimeType: 'video/mp4',
          filename: sanitizeFilename(pageTitle, 'video') + '.mp4',
          title: pageTitle,
          size: 20000000,
          format: 'MP4',
          thumbnail: ogImage,
          downloadUrl: validVideoUrl,
          sourceUrl: rawUrl,
          platform: 'Universal Video'
        };
      }

      const validAudioUrl = makeAbsolute(rawAudio);
      if (validAudioUrl && !isForbiddenOrPlayerPage(validAudioUrl)) {
        return {
          type: 'audio',
          mimeType: 'audio/mpeg',
          filename: sanitizeFilename(pageTitle, 'audio') + '.mp3',
          title: pageTitle,
          size: 8000000,
          format: 'MP3',
          thumbnail: ogImage,
          downloadUrl: validAudioUrl,
          sourceUrl: rawUrl,
          platform: 'Universal Audio'
        };
      }

      // C. Check HTML5 Video and Audio DOM Elements
      const html5VideoSrc = 
        $('video source[src]').attr('src') ||
        $('video[src]').attr('src') ||
        $('source[type^="video/"]').attr('src') ||
        $('video').attr('data-src') ||
        $('video').attr('data-video-url');

      const validHtml5Video = makeAbsolute(html5VideoSrc);
      if (validHtml5Video && !isForbiddenOrPlayerPage(validHtml5Video)) {
        return {
          type: 'video',
          mimeType: 'video/mp4',
          filename: sanitizeFilename(pageTitle, 'video') + '.mp4',
          title: pageTitle,
          size: 20000000,
          format: 'MP4',
          thumbnail: ogImage,
          downloadUrl: validHtml5Video,
          sourceUrl: rawUrl,
          platform: 'HTML5 Video'
        };
      }

      const html5AudioSrc =
        $('audio source[src]').attr('src') ||
        $('audio[src]').attr('src') ||
        $('source[type^="audio/"]').attr('src') ||
        $('audio').attr('data-src');

      const validHtml5Audio = makeAbsolute(html5AudioSrc);
      if (validHtml5Audio && !isForbiddenOrPlayerPage(validHtml5Audio)) {
        return {
          type: 'audio',
          mimeType: 'audio/mpeg',
          filename: sanitizeFilename(pageTitle, 'audio') + '.mp3',
          title: pageTitle,
          size: 8000000,
          format: 'MP3',
          thumbnail: ogImage,
          downloadUrl: validHtml5Audio,
          sourceUrl: rawUrl,
          platform: 'HTML5 Audio'
        };
      }

      // D. Deep JavaScript / Embedded Media Regex Extraction
      // Inspect inline <script> tags for raw media assets (.mp4, .m4v, .webm, .mp3, .m4a, .m3u8)
      const mediaRegex = /(https?:\/\/[^"'\s<>\\]+\.(?:mp4|webm|m4v|mp3|m4a|wav|ogg|m3u8)(?:\?[^"'\s<>\\]*)?)/gi;
      let matchedMediaUrl: string | null = null;
      let matchedIsAudio = false;

      $('script').each((_, scriptEl) => {
        if (matchedMediaUrl) return;
        const scriptText = $(scriptEl).html() || '';
        let m: RegExpExecArray | null;
        while ((m = mediaRegex.exec(scriptText)) !== null) {
          const candidate = m[1];
          if (candidate && !isForbiddenOrPlayerPage(candidate)) {
            matchedMediaUrl = candidate;
            matchedIsAudio = /\.(?:mp3|m4a|wav|ogg)(?:\?|$)/i.test(candidate);
            break;
          }
        }
      });

      if (matchedMediaUrl) {
        const isAudio = matchedIsAudio;
        const ext = isAudio ? 'mp3' : (matchedMediaUrl.includes('.m3u8') ? 'm3u8' : 'mp4');
        return {
          type: isAudio ? 'audio' : 'video',
          mimeType: isAudio ? 'audio/mpeg' : (ext === 'm3u8' ? 'application/vnd.apple.mpegurl' : 'video/mp4'),
          filename: sanitizeFilename(pageTitle, isAudio ? 'audio' : 'video') + '.' + (ext === 'm3u8' ? 'mp4' : ext),
          title: pageTitle,
          size: isAudio ? 7500000 : 25000000,
          format: ext.toUpperCase(),
          thumbnail: ogImage,
          downloadUrl: matchedMediaUrl,
          sourceUrl: rawUrl,
          platform: isAudio ? 'Web Audio Stream' : 'Web Video Stream'
        };
      }

      // E. High-Resolution Image Fallback for image galleries/pages
      const isImgUrl = (u: string) => /\.(?:jpg|jpeg|png|webp|gif)(?:\?|$)/i.test(u);
      if (ogImage && isImgUrl(ogImage) && !ogImage.includes('favicon') && !ogImage.includes('logo')) {
        return {
          type: 'image',
          mimeType: 'image/jpeg',
          filename: sanitizeFilename(pageTitle, 'image') + '.jpg',
          title: pageTitle,
          size: 2000000,
          format: 'JPG',
          thumbnail: ogImage,
          downloadUrl: ogImage,
          sourceUrl: rawUrl,
          platform: 'Web Image'
        };
      }
    }
  } catch (deepScrapeErr: any) {
    console.warn('[Universal Deep Scrape Error]:', deepScrapeErr?.message);
  }

  // ----------------------------------------------------
  // 12. Generic Video Player / Stream Fallback
  // If the URL is an embed or page that is verified public, allow direct stream capture
  // ----------------------------------------------------
  if (lowerUrl.includes('vimeo.com') || lowerUrl.includes('dailymotion.com') || lowerUrl.includes('twitch.tv')) {
    const platformName = lowerUrl.includes('vimeo.com') ? 'Vimeo' : (lowerUrl.includes('dailymotion.com') ? 'Dailymotion' : 'Twitch');
    return {
      type: 'video',
      mimeType: 'video/mp4',
      filename: `${platformName}_Video_${Date.now()}.mp4`,
      title: `${platformName} Video Stream`,
      size: 20000000,
      format: 'MP4',
      downloadUrl: rawUrl,
      sourceUrl: rawUrl,
      platform: platformName
    };
  }

  return null;
}
