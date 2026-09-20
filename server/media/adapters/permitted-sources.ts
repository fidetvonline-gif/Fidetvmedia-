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
    try {
      if (btch && btch.youtube) {
        const data = await Promise.race([
          btch.youtube(rawUrl),
          new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000))
        ]);

        if (data && (data.mp4 || data.video || data.link)) {
          const directMp4 = data.mp4 || data.video || data.link;
          const cleanTitle = sanitizeFilename(data.title || 'YouTube_Video', 'youtube_video') + '.mp4';
          const audioUrl = data.audio || data.mp3 || undefined;
          return {
            type: 'video',
            mimeType: 'video/mp4',
            filename: cleanTitle,
            title: data.title || 'YouTube Video',
            size: 25000000,
            format: 'MP4',
            thumbnail: data.thumbnail || `https://i.ytimg.com/vi/${rawUrl.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1] || ''}/hqdefault.jpg`,
            downloadUrl: directMp4,
            audioUrl: audioUrl,
            sourceUrl: rawUrl,
            platform: 'YouTube'
          };
        }
      }
    } catch (btchErr: any) {
      console.warn('[YouTube Resolver] btch fallback triggered:', btchErr?.message);
    }

    // Secondary YouTube fallback: oEmbed
    try {
      const oembedRes = await axios.get(`https://www.youtube.com/oembed?url=${encodeURIComponent(rawUrl)}&format=json`, { timeout: 3500 });
      const data = oembedRes.data;
      if (data && data.title) {
        const cleanTitle = sanitizeFilename(data.title, 'youtube_video') + '.mp4';
        return {
          type: 'video',
          mimeType: 'video/mp4',
          filename: cleanTitle,
          title: data.title,
          size: 25000000,
          format: 'MP4',
          thumbnail: data.thumbnail_url || '',
          downloadUrl: rawUrl,
          sourceUrl: rawUrl,
          platform: 'YouTube'
        };
      }
    } catch (oembedErr) {}
  }

  // ----------------------------------------------------
  // 2. TikTok (Videos, Clips, Audio)
  // ----------------------------------------------------
  if (lowerUrl.includes('tiktok.com')) {
    // Try ruhend ttdl
    try {
      if (ruhend && (ruhend.ttdl || ruhend.tiktok)) {
        const fn = ruhend.ttdl || ruhend.tiktok;
        const res = await Promise.race([
          fn(rawUrl),
          new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 7000))
        ]);
        if (res && (res.video || res.video2 || res.nowm || res.url)) {
          const videoUrl = res.video2 || res.video || res.nowm || res.url;
          const cleanTitle = sanitizeFilename(res.title || 'TikTok_Video', 'tiktok_video') + '.mp4';
          return {
            type: 'video',
            mimeType: 'video/mp4',
            filename: cleanTitle,
            title: res.title || 'TikTok Video',
            author: res.author || undefined,
            size: 15000000,
            format: 'MP4',
            thumbnail: res.cover || res.thumbnail || '',
            downloadUrl: videoUrl,
            audioUrl: res.audio || res.mp3 || undefined,
            sourceUrl: rawUrl,
            platform: 'TikTok'
          };
        }
      }
    } catch (e: any) {
      console.warn('[TikTok Resolver] ruhend failed:', e?.message);
    }

    // Try btch ttdl
    try {
      if (btch && (btch.ttdl || btch.tiktok)) {
        const fn = btch.ttdl || btch.tiktok;
        const res = await Promise.race([
          fn(rawUrl),
          new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 7000))
        ]);
        if (res && (res.video || res.video2 || res.url || res.link)) {
          const videoUrl = res.video || res.video2 || res.url || res.link;
          const cleanTitle = sanitizeFilename(res.title || 'TikTok_Video', 'tiktok_video') + '.mp4';
          return {
            type: 'video',
            mimeType: 'video/mp4',
            filename: cleanTitle,
            title: res.title || 'TikTok Video',
            size: 15000000,
            format: 'MP4',
            thumbnail: res.thumbnail || res.cover || '',
            downloadUrl: videoUrl,
            audioUrl: res.audio || res.mp3 || undefined,
            sourceUrl: rawUrl,
            platform: 'TikTok'
          };
        }
      }
    } catch (e: any) {
      console.warn('[TikTok Resolver] btch failed:', e?.message);
    }
  }

  // ----------------------------------------------------
  // 3. Instagram (Reels, Posts, Videos)
  // ----------------------------------------------------
  if (lowerUrl.includes('instagram.com')) {
    // Try ruhend igdl
    try {
      if (ruhend && (ruhend.igdl || ruhend.instagram)) {
        const fn = ruhend.igdl || ruhend.instagram;
        const res = await Promise.race([
          fn(rawUrl),
          new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 7000))
        ]);
        const items = Array.isArray(res) ? res : (res?.result || [res]);
        const validItem = items.find((it: any) => it && (it.url || it.video || it.link));
        if (validItem) {
          const directUrl = validItem.url || validItem.video || validItem.link;
          return {
            type: 'video',
            mimeType: 'video/mp4',
            filename: 'Instagram_Reel_' + Date.now() + '.mp4',
            title: 'Instagram Video',
            size: 18000000,
            format: 'MP4',
            thumbnail: validItem.thumbnail || '',
            downloadUrl: directUrl,
            sourceUrl: rawUrl,
            platform: 'Instagram'
          };
        }
      }
    } catch (e: any) {
      console.warn('[Instagram Resolver] ruhend failed:', e?.message);
    }

    // Try instagram-url-direct
    try {
      if (igDirect && igDirect.instagramGetUrl) {
        const res = await Promise.race([
          igDirect.instagramGetUrl(rawUrl),
          new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 7000))
        ]);
        if (res && res.url_list && res.url_list.length > 0) {
          const directUrl = res.url_list[0];
          return {
            type: 'video',
            mimeType: 'video/mp4',
            filename: 'Instagram_Media_' + Date.now() + '.mp4',
            title: 'Instagram Media',
            size: 18000000,
            format: 'MP4',
            downloadUrl: directUrl,
            sourceUrl: rawUrl,
            platform: 'Instagram'
          };
        }
      }
    } catch (e: any) {
      console.warn('[Instagram Resolver] igDirect failed:', e?.message);
    }

    // Try btch igdl
    try {
      if (btch && (btch.igdl || btch.instagram)) {
        const fn = btch.igdl || btch.instagram;
        const res = await Promise.race([
          fn(rawUrl),
          new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 7000))
        ]);
        const finalUrl = res?.url || res?.link || (Array.isArray(res?.result) ? res.result[0]?.url : res?.result);
        if (finalUrl && typeof finalUrl === 'string') {
          return {
            type: 'video',
            mimeType: 'video/mp4',
            filename: 'Instagram_Media_' + Date.now() + '.mp4',
            title: 'Instagram Media',
            size: 18000000,
            format: 'MP4',
            downloadUrl: finalUrl,
            sourceUrl: rawUrl,
            platform: 'Instagram'
          };
        }
      }
    } catch (e: any) {
      console.warn('[Instagram Resolver] btch failed:', e?.message);
    }
  }

  // ----------------------------------------------------
  // 4. Facebook & FB Watch
  // ----------------------------------------------------
  if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.watch') || lowerUrl.includes('fb.com')) {
    try {
      if (ruhend && (ruhend.fbdl || ruhend.facebook)) {
        const fn = ruhend.fbdl || ruhend.facebook;
        const res = await Promise.race([
          fn(rawUrl),
          new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 7000))
        ]);
        if (res && (res.video || res.HD || res.Normal_video || res.url)) {
          const directUrl = res.HD || res.video || res.Normal_video || res.url;
          return {
            type: 'video',
            mimeType: 'video/mp4',
            filename: sanitizeFilename(res.title || 'Facebook_Video', 'facebook_video') + '.mp4',
            title: res.title || 'Facebook Video',
            size: 25000000,
            format: 'MP4',
            downloadUrl: directUrl,
            audioUrl: res.audio || undefined,
            sourceUrl: rawUrl,
            platform: 'Facebook'
          };
        }
      }
    } catch (e: any) {
      console.warn('[Facebook Resolver] ruhend failed:', e?.message);
    }

    try {
      if (btch && (btch.fbdown || btch.facebook)) {
        const fn = btch.fbdown || btch.facebook;
        const res = await Promise.race([
          fn(rawUrl),
          new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 7000))
        ]);
        if (res && (res.HD || res.Normal_video || res.video || res.url)) {
          const directUrl = res.HD || res.Normal_video || res.video || res.url;
          return {
            type: 'video',
            mimeType: 'video/mp4',
            filename: sanitizeFilename(res.title || 'Facebook_Video', 'facebook_video') + '.mp4',
            title: res.title || 'Facebook Video',
            size: 25000000,
            format: 'MP4',
            downloadUrl: directUrl,
            audioUrl: res.audio || undefined,
            sourceUrl: rawUrl,
            platform: 'Facebook'
          };
        }
      }
    } catch (e: any) {
      console.warn('[Facebook Resolver] btch failed:', e?.message);
    }
  }

  // ----------------------------------------------------
  // 5. Twitter / X
  // ----------------------------------------------------
  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
    try {
      if (getTwitterMedia) {
        const res = await Promise.race([
          getTwitterMedia(rawUrl),
          new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 7000))
        ]);
        if (res && res.media && Array.isArray(res.media) && res.media.length > 0) {
          const sorted = [...res.media].sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
          const best = sorted[0];
          if (best && best.url) {
            return {
              type: 'video',
              mimeType: 'video/mp4',
              filename: 'Twitter_Video_' + Date.now() + '.mp4',
              title: res.text ? res.text.substring(0, 50) : 'Twitter Video',
              size: 15000000,
              format: 'MP4',
              downloadUrl: best.url,
              sourceUrl: rawUrl,
              platform: 'Twitter / X'
            };
          }
        }
      }
    } catch (e: any) {
      console.warn('[Twitter Resolver] getTwitterMedia failed:', e?.message);
    }

    try {
      if (btch && btch.twitter) {
        const res = await Promise.race([
          btch.twitter(rawUrl),
          new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 7000))
        ]);
        if (res && (res.hd || res.sd || res.url || res.video)) {
          const directUrl = res.hd || res.video || res.sd || res.url;
          return {
            type: 'video',
            mimeType: 'video/mp4',
            filename: sanitizeFilename(res.title || 'Twitter_Video', 'twitter_video') + '.mp4',
            title: res.title || 'Twitter Video',
            size: 15000000,
            format: 'MP4',
            downloadUrl: directUrl,
            sourceUrl: rawUrl,
            platform: 'Twitter / X'
          };
        }
      }
    } catch (e: any) {
      console.warn('[Twitter Resolver] btch failed:', e?.message);
    }
  }

  // ----------------------------------------------------
  // 6. Spotify (Tracks & Audio)
  // ----------------------------------------------------
  if (lowerUrl.includes('spotify.com')) {
    try {
      if (btch && btch.spotify) {
        const res = await Promise.race([
          btch.spotify(rawUrl),
          new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000))
        ]);
        if (res && (res.download || res.url || res.link)) {
          const directUrl = res.download || res.url || res.link;
          const cleanTitle = sanitizeFilename(`${res.artist || 'Artist'} - ${res.title || 'Track'}`, 'spotify_track') + '.mp3';
          return {
            type: 'audio',
            mimeType: 'audio/mpeg',
            filename: cleanTitle,
            title: res.title ? `${res.title} - ${res.artist || ''}` : 'Spotify Track',
            size: 9000000,
            format: 'MP3',
            thumbnail: res.thumbnail || res.cover || '',
            downloadUrl: directUrl,
            sourceUrl: rawUrl,
            platform: 'Spotify'
          };
        }
      }
    } catch (e: any) {
      console.warn('[Spotify Resolver] btch failed:', e?.message);
    }
  }

  // ----------------------------------------------------
  // 7. SoundCloud (Music & Audio Tracks)
  // ----------------------------------------------------
  if (lowerUrl.includes('soundcloud.com')) {
    try {
      if (btch && btch.soundcloud) {
        const res = await Promise.race([
          btch.soundcloud(rawUrl),
          new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000))
        ]);
        if (res && (res.download || res.url || res.link)) {
          const directUrl = res.download || res.url || res.link;
          const cleanTitle = sanitizeFilename(res.title || 'SoundCloud_Track', 'soundcloud_audio') + '.mp3';
          return {
            type: 'audio',
            mimeType: 'audio/mpeg',
            filename: cleanTitle,
            title: res.title || 'SoundCloud Audio',
            size: 8500000,
            format: 'MP3',
            thumbnail: res.thumbnail || '',
            downloadUrl: directUrl,
            sourceUrl: rawUrl,
            platform: 'SoundCloud'
          };
        }
      }
    } catch (e: any) {
      console.warn('[SoundCloud Resolver] btch failed:', e?.message);
    }
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
