import { useState, useEffect } from 'react';
import { newsSyncService } from '@/services/newsSyncService';
import { News as NewsType } from '@/types';

export function useNewsSync(initialData?: NewsType[]) {
  const [news, setNews] = useState<NewsType[]>(() => {
    const existing = newsSyncService.getNews();
    return existing.length > 0 ? existing : (initialData || []);
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(newsSyncService.getLastSyncTime());

  useEffect(() => {
    newsSyncService.init();

    const unsubscribe = newsSyncService.subscribe((updatedNews) => {
      setNews(updatedNews);
      setLastSyncTime(newsSyncService.getLastSyncTime());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const triggerSync = async () => {
    setIsSyncing(true);
    try {
      const result = await newsSyncService.triggerFullSync();
      return result;
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    news,
    isSyncing,
    lastSyncTime,
    triggerSync,
    refreshNews: () => newsSyncService.refreshNews()
  };
}
