import { MediaMetadata, AnalyzeResult } from './types.js';
import { validateUrlSecurity } from './validator.js';
import { analyzeDirectUrl } from './adapters/direct-url.js';
import { analyzePermittedSource } from './adapters/permitted-sources.js';
import { analyzeMovieSource } from './adapters/movie-adapter.js';

export * from './types.js';
export * from './validator.js';
export * from './detector.js';
export * from './downloader.js';

export async function analyzeMedia(rawUrl: string): Promise<AnalyzeResult> {
  const security = await validateUrlSecurity(rawUrl);
  if (!security.valid) {
    return {
      success: false,
      error: security.error || 'Please enter a valid media URL.'
    };
  }

  const url = rawUrl.trim();

  // Try 1: Direct URL Analysis (raw MP4, MP3, images, etc.)
  try {
    const directResult = await analyzeDirectUrl(url);
    if (directResult) {
      return {
        success: true,
        media: directResult
      };
    }
  } catch (err: any) {
    // If it was a size limit error, fail fast
    if (err.message && err.message.includes('250 MB')) {
      return { success: false, error: err.message };
    }
    // Otherwise continue to next adapters
  }

  // Try 2: Permitted Sources (YouTube, TikTok, Socials, OpenGraph)
  try {
    const sourceResult = await analyzePermittedSource(url);
    if (sourceResult) {
      return {
        success: true,
        media: sourceResult
      };
    }
  } catch (err: any) {
    console.warn('[Media Analyzer] Permitted source adapter error:', err.message);
  }

  // Try 3: Movie Catalog & Cinema Adapters (TMDB, IMDb, Embeds, Archive.org)
  try {
    const movieResult = await analyzeMovieSource(url);
    if (movieResult) {
      return {
        success: true,
        media: movieResult
      };
    }
  } catch (err: any) {
    console.warn('[Media Analyzer] Movie source adapter error:', err.message);
  }

  return {
    success: false,
    error: 'This media type is not supported or the source is not publicly accessible.'
  };
}
