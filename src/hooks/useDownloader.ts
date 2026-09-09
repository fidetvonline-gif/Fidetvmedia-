import { useState } from 'react';
import { parseResponseJson } from '@/lib/api';

export interface DownloadLinkResponse {
  status: string;
  downloadUrl: string;
  fileName: string;
  fileSize: string;
  expiresIn: number;
}

export function useDownloader() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getDownloadLink = async (videoId: string, quality: string = '720p', format: string = 'mp4') => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/downloader/get-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, quality, format }),
      });
      
      if (!response.ok) throw new Error('Failed to get download link');
      
      const data = await parseResponseJson(response);
      return data as DownloadLinkResponse;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { getDownloadLink, loading, error };
}
