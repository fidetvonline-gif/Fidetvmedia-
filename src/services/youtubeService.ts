
const BASE_URL = '/api/youtube';

export interface YouTubeStats {
  viewers: string;
  title: string;
  thumbnail: string;
  isLive: boolean;
}

export const fetchYouTubeStats = async (youtubeId: string): Promise<YouTubeStats | null> => {
  try {
    const response = await fetch(
      `${BASE_URL}/videos?part=snippet,liveStreamingDetails,statistics&id=${youtubeId}`
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
export const fetchRecentUploads = async (channelId: string, signal?: AbortSignal) => {
  try {
    const response = await fetch(
      `${BASE_URL}/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=5`,
      { signal }
    );
    if (!response.ok) return [];
    const data = await response.json();
    return data.items || [];
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('Fetch recent uploads aborted');
    } else {
      console.error('Error fetching recent uploads', error);
    }
    return [];
  }
};

export const fetchPlaylistItems = async (playlistId: string) => {
  try {
    const response = await fetch(
      `${BASE_URL}/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50`
    );
    
    const data = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      throw new Error(data.error?.message || `YouTube API error: ${response.status}`);
    }
    
    return data.items || [];
  } catch (error: any) {
    console.error('Error fetching playlist items:', error);
    throw error;
  }
};
