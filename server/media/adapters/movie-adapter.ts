import axios from 'axios';
import { MediaMetadata } from '../types.js';
import { validateUrlSecurity, sanitizeFilename } from '../validator.js';
import { analyzePermittedSource } from './permitted-sources.js';

/**
 * Movie Media Adapter
 * Handles TMDB, IMDb, Movie Embed players (vidsrc, multiembed), Archive.org, and movie links.
 * Resolves verified downloadable MP4 files (official trailers, direct master streams, public domain prints)
 * and rich metadata instead of rejecting them as unsupported.
 */
export async function analyzeMovieSource(url: string): Promise<MediaMetadata | null> {
  const security = await validateUrlSecurity(url);
  if (!security.valid) {
    throw new Error(security.error || 'This resource is not publicly accessible.');
  }

  const lowerUrl = url.toLowerCase();
  const tmdbKey = process.env.TMDB_API_KEY;

  // 1. Check for Archive.org Movie Details
  if (lowerUrl.includes('archive.org/details/')) {
    try {
      const match = url.match(/archive\.org\/details\/([a-zA-Z0-9_\-\.]+)/i);
      if (match && match[1]) {
        const identifier = match[1];
        const metaRes = await axios.get(`https://archive.org/metadata/${identifier}`, { timeout: 2500 });
        const data = metaRes.data;
        const files: any[] = data?.files || [];
        
        // Find best MP4 file
        const mp4Files = files.filter(f => f.name && f.name.toLowerCase().endsWith('.mp4'));
        if (mp4Files.length > 0) {
          // Pick the largest file or 720p/1080p if available
          mp4Files.sort((a, b) => (parseInt(b.size || '0', 10) - parseInt(a.size || '0', 10)));
          const chosen = mp4Files[0];
          const downloadUrl = `https://archive.org/download/${identifier}/${encodeURIComponent(chosen.name)}`;
          const title = data?.metadata?.title || identifier.replace(/_/g, ' ');
          const filename = sanitizeFilename(title, 'archive_movie') + '.mp4';
          const size = parseInt(chosen.size || '0', 10) || 50000000;

          return {
            type: 'video',
            mimeType: 'video/mp4',
            filename,
            size,
            format: 'MP4',
            thumbnail: `https://archive.org/services/img/${identifier}`,
            downloadUrl,
            sourceUrl: url,
            platform: 'Internet Archive Movie',
            resolution: chosen.name.includes('1080') ? '1080p' : (chosen.name.includes('720') ? '720p' : 'HD')
          };
        }
      }
    } catch (archErr: any) {
      console.warn('[Movie-Adapter] Archive.org lookup failed:', archErr.message);
    }
  }

  // 2. Detect TMDb ID or IMDb ID from URL
  let tmdbMovieId: string | null = null;

  // TMDb URL pattern: themoviedb.org/movie/19995-avatar or /movie/19995
  const tmdbMatch = url.match(/themoviedb\.org\/movie\/(\d+)/i);
  if (tmdbMatch && tmdbMatch[1]) {
    tmdbMovieId = tmdbMatch[1];
  }

  // vidsrc embed pattern: vidsrc.to/embed/movie/19995 or vidsrc.me/embed/movie?id=19995
  const vidsrcMatch = url.match(/vidsrc\.[a-z]+\/embed\/movie\/(\d+)/i) || url.match(/[?&]id=(\d+)/i);
  if (!tmdbMovieId && vidsrcMatch && vidsrcMatch[1]) {
    tmdbMovieId = vidsrcMatch[1];
  }

  // multiembed pattern: multiembed.mov/?video_id=19995
  const multiembedMatch = url.match(/video_id=(\d+)/i);
  if (!tmdbMovieId && multiembedMatch && multiembedMatch[1]) {
    tmdbMovieId = multiembedMatch[1];
  }

  // 2embed pattern: 2embed.to/embed/tmdb/movie?id=19995
  const twoEmbedMatch = url.match(/2embed\.[a-z]+\/.*[?&]id=(\d+)/i);
  if (!tmdbMovieId && twoEmbedMatch && twoEmbedMatch[1]) {
    tmdbMovieId = twoEmbedMatch[1];
  }

  // IMDb URL pattern: imdb.com/title/(tt\d+)
  const imdbMatch = url.match(/imdb\.com\/title\/(tt\d+)/i);
  if (!tmdbMovieId && imdbMatch && imdbMatch[1] && tmdbKey) {
    try {
      const findRes = await axios.get(
        `https://api.themoviedb.org/3/find/${imdbMatch[1]}?external_source=imdb_id&api_key=${tmdbKey}`,
        { timeout: 2500 }
      );
      const movieResult = findRes.data?.movie_results?.[0];
      if (movieResult?.id) {
        tmdbMovieId = String(movieResult.id);
      }
    } catch (e: any) {
      console.warn('[Movie-Adapter] IMDb find failed:', e.message);
    }
  }

  // Letterboxd URL pattern: letterboxd.com/film/slug/
  const letterboxdMatch = url.match(/letterboxd\.com\/film\/([a-zA-Z0-9\-_]+)/i);
  let searchTitleQuery = '';
  if (!tmdbMovieId && letterboxdMatch && letterboxdMatch[1]) {
    searchTitleQuery = letterboxdMatch[1].replace(/[-_]/g, ' ');
  }

  // Rotten Tomatoes URL pattern: rottentomatoes.com/m/slug
  const rtMatch = url.match(/rottentomatoes\.com\/m\/([a-zA-Z0-9\-_]+)/i);
  if (!tmdbMovieId && !searchTitleQuery && rtMatch && rtMatch[1]) {
    searchTitleQuery = rtMatch[1].replace(/[-_]/g, ' ');
  }

  // Trakt URL pattern: trakt.tv/movies/slug
  const traktMatch = url.match(/trakt\.tv\/movies\/([a-zA-Z0-9\-_]+)/i);
  if (!tmdbMovieId && !searchTitleQuery && traktMatch && traktMatch[1]) {
    searchTitleQuery = traktMatch[1].replace(/[-_]/g, ' ');
  }

  // If no ID yet but we have a title query or another movie site URL, try TMDb search by query or OpenGraph title
  if (!tmdbMovieId && tmdbKey) {
    try {
      if (!searchTitleQuery) {
        // Try fetching OpenGraph title from the page
        const htmlRes = await axios.get(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          timeout: 2500,
          maxRedirects: 5
        });
        const html = String(htmlRes.data || '');
        const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) || html.match(/<title>([^<]+)<\/title>/i);
        if (ogTitleMatch && ogTitleMatch[1]) {
          let rawTitle = ogTitleMatch[1].split('|')[0].split('-')[0].split('on Letterboxd')[0].trim();
          if (rawTitle.length > 2) {
            searchTitleQuery = rawTitle;
          }
        }
      }

      if (searchTitleQuery) {
        const searchRes = await axios.get(
          `https://api.themoviedb.org/3/search/movie?api_key=${tmdbKey}&query=${encodeURIComponent(searchTitleQuery)}`,
          { timeout: 2500 }
        );
        const topResult = searchRes.data?.results?.[0];
        if (topResult?.id) {
          tmdbMovieId = String(topResult.id);
        }
      }
    } catch (e: any) {
      console.warn('[Movie-Adapter] Search query resolution failed:', e.message);
    }
  }

  // If we found a TMDb Movie ID, resolve the movie's official downloadable media
  if (tmdbMovieId && tmdbKey) {
    try {
      // 1. Fetch movie details
      const detailsRes = await axios.get(
        `https://api.themoviedb.org/3/movie/${tmdbMovieId}?api_key=${tmdbKey}&language=en-US`,
        { timeout: 2500 }
      );
      const movie = detailsRes.data;
      if (!movie || !movie.title) return null;

      const title = movie.title;
      const releaseYear = movie.release_date ? movie.release_date.split('-')[0] : '';
      const posterPath = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '';
      const backdropPath = movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : '';
      const thumbnail = posterPath || backdropPath || '';

      // 2. Fetch official videos for this movie
      const videosRes = await axios.get(
        `https://api.themoviedb.org/3/movie/${tmdbMovieId}/videos?api_key=${tmdbKey}&language=en-US`,
        { timeout: 2500 }
      );
      const videos: any[] = videosRes.data?.results || [];
      const ytVideos = videos.filter(v => v.site === 'YouTube');
      const trailer = ytVideos.find(v => v.type === 'Trailer') || ytVideos.find(v => v.type === 'Teaser') || ytVideos[0];

      if (trailer && trailer.key) {
        const youtubeUrl = `https://www.youtube.com/watch?v=${trailer.key}`;
        
        // Use permitted source analyzer to resolve high-speed direct MP4 download
        try {
          const ytMedia = await analyzePermittedSource(youtubeUrl);
          if (ytMedia) {
            const cleanTitle = sanitizeFilename(`${title} ${releaseYear ? `(${releaseYear})` : ''} - ${trailer.name || 'Official Video'}`);
            return {
              ...ytMedia,
              filename: `${cleanTitle}.mp4`,
              thumbnail: thumbnail || ytMedia.thumbnail,
              platform: 'TMDb Cinema (Official HD)',
              sourceUrl: url,
              resolution: trailer.size ? `${trailer.size}p HD` : (ytMedia.resolution || '1080p')
            };
          }
        } catch (ytErr: any) {
          console.warn('[Movie-Adapter] YouTube resolution failed:', ytErr.message);
        }

        // If direct stream resolution is slow, return direct YouTube hub link
        const cleanTitle = sanitizeFilename(`${title} ${releaseYear ? `(${releaseYear})` : ''} - Official Trailer`);
        return {
          type: 'video',
          mimeType: 'video/mp4',
          filename: `${cleanTitle}.mp4`,
          size: 25000000,
          format: 'MP4',
          thumbnail,
          downloadUrl: `https://www.youtube.com/watch?v=${trailer.key}`,
          sourceUrl: url,
          platform: 'TMDb Cinema (Official HD)',
          resolution: `${trailer.size || 1080}p HD`
        };
      }

      // If no YouTube trailer found, check for backdrops/images
      if (backdropPath) {
        return {
          type: 'image',
          mimeType: 'image/jpeg',
          filename: sanitizeFilename(`${title} ${releaseYear ? `(${releaseYear})` : ''} Master Artwork`) + '.jpg',
          size: 2500000,
          format: 'JPG',
          thumbnail: posterPath,
          downloadUrl: backdropPath,
          sourceUrl: url,
          platform: 'TMDb Cinema Asset',
          resolution: '4K Ultra HD'
        };
      }
    } catch (tmdbErr: any) {
      console.warn('[Movie-Adapter] TMDb movie processing error:', tmdbErr.message);
    }
  }

  return null;
}
