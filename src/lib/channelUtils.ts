import { Tv } from 'lucide-react';

export const extractYoutubeUrl = (url: string) => {
    if (url.trim().startsWith('<iframe')) {
        const match = url.match(/src="([^"]+)"/);
        return match ? match[1] : url;
    }
    return url;
};

export const normalizeChannelIdentifier = (channel: any) => {
    // Extract ID from iframe if present
    const url = extractYoutubeUrl(channel.url);
    // Get video ID if it's a youtube URL
    const videoIdMatch = url.match(/(?:v=|embed\/|youtu\.be\/)([^&?#]+)/);
    const identifier = videoIdMatch ? videoIdMatch[1] : channel.name.toLowerCase().trim();
    return identifier;
};

export const mergeChannels = (defaultChannels: any[], dbChannels: any[]) => {
    const channelMap = new Map<string, any>();

    // Add default channels
    defaultChannels.forEach(c => {
        channelMap.set(normalizeChannelIdentifier(c), c);
    });
    
    // Add or merge db channels
    dbChannels.forEach(dbCh => {
        const id = normalizeChannelIdentifier(dbCh);
        const mapped = {
            id: dbCh.id,
            name: dbCh.name,
            category: dbCh.category || 'General',
            thumbnail: dbCh.thumbnail || 'https://images.unsplash.com/photo-1540655037529-dec987208707',
            url: dbCh.url,
            icon: Tv,
            description: dbCh.description || 'Channel stream.',
            isLive: true
        };

        if (channelMap.has(id)) {
            channelMap.set(id, { ...channelMap.get(id), ...mapped });
        } else {
            channelMap.set(id, mapped);
        }
    });

    return Array.from(channelMap.values());
};
