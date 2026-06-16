
const BASE_URL = '/api/youtube';

const BLOCKLIST = [
  'LIVE | Mexico vs South Africa | FIFA World Cup 2026™ | FideTv'
];

export interface YouTubeStats {
  viewers: string;
  likes: string;
  commentCount: string;
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
        likes: '0',
        commentCount: '0',
        isLive: false
      };
    }
    
    const data = await response.json();
    
    if (!data.items || data.items.length === 0) return null;

    const item = data.items[0];
    const liveDetails = item.liveStreamingDetails;
    const stats = item.statistics;
    
    return {
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
      viewers: liveDetails?.concurrentViewers || '0',
      likes: stats?.likeCount || '0',
      commentCount: stats?.commentCount || '0',
      isLive: item.snippet.liveBroadcastContent === 'live'
    };
  } catch (error) {
    console.warn('Error fetching YouTube stats, returning basic info', error);
    return {
      title: 'Video',
      thumbnail: `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
      viewers: '0',
      likes: '0',
      commentCount: '0',
      isLive: false
    };
  }
};
export const fetchRecentUploads = async (channelId: string, signal?: AbortSignal) => {
  try {
    // Activities endpoint is often more reliable than search and uses less quota
    const response = await fetch(
      `${BASE_URL}/activities?part=snippet,contentDetails&channelId=${channelId}&maxResults=8`,
      { signal }
    );
    if (!response.ok) {
      console.warn('YouTube activities proxy returned non-ok status:', response.status);
      return [];
    }
    const data = await response.json();
    const items = data.items || [];
    
    // Transform activities to looks like standard video search items
    const videos = items
      .filter((item: any) => item.contentDetails?.upload)
      .map((item: any) => ({
        id: { videoId: item.contentDetails.upload.videoId },
        snippet: item.snippet
      }));

    // Filter out items in blocklist
    return videos.filter((item: any) => {
      const title = item.snippet?.title || '';
      return !BLOCKLIST.some(block => title.toLowerCase().includes(block.toLowerCase()));
    }).slice(0, 5); // Keep top 5
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
      let errorMessage = `YouTube API error: ${response.status}`;
      errorMessage = data.error?.message || data.error || errorMessage;
      throw new Error(errorMessage);
    }
    
    const items = data.items || [];
    // We allow all items when explicitly importing a playlist
    return items;
  } catch (error: any) {
    console.error('Error fetching playlist items:', error);
    throw error;
  }
};
