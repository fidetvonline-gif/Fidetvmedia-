
const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const BASE_URL = 'https://www.googleapis.com/youtube/v3';

export interface YouTubeStats {
  viewers: string;
  title: string;
  thumbnail: string;
  isLive: boolean;
}

export const fetchYouTubeStats = async (youtubeId: string): Promise<YouTubeStats | null> => {
  if (!YOUTUBE_API_KEY || !youtubeId || YOUTUBE_API_KEY === 'your-youtube-api-key') {
    // Return mock stats if API key is not configured to avoid console errors
    return {
      title: 'YouTube Video',
      thumbnail: `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
      viewers: '0',
      isLive: false
    };
  }

  try {
    const response = await fetch(
      `${BASE_URL}/videos?part=snippet,liveStreamingDetails,statistics&id=${youtubeId}&key=${YOUTUBE_API_KEY}`
    );
    
    if (!response.ok) {
      console.warn('YouTube API query failed, returning basic info instead of stats.');
      return {
        title: 'Video',
        thumbnail: `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
        viewers: '0',
        isLive: false
      };
    }
    
    const data = await response.json();
    
    if (!data.items || data.items.length === 0) return null;

    const item = data.items[0];
    const liveDetails = item.liveStreamingDetails;
    
    return {
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
      viewers: liveDetails?.concurrentViewers || '0',
      isLive: item.snippet.liveBroadcastContent === 'live'
    };
  } catch (error) {
    console.warn('Error fetching YouTube stats, returning basic info', error);
    return {
      title: 'Video',
      thumbnail: `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
      viewers: '0',
      isLive: false
    };
  }
};
