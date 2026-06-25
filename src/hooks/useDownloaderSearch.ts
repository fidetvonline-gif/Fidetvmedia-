import { useState } from 'react';

export interface SearchResult {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  source: string;
  qualities: string[];
  hasSubtitles: boolean;
  uploadDate: string;
}

export function useDownloaderSearch() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const search = async (query: string, platform: string = 'all') => {
    if (!query) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/downloader/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, platform, limit: 12 }),
      });
      
      if (!response.ok) throw new Error('Search failed');
      
      const data = await response.json();
      setResults(data.results || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { search, results, loading, error };
}
