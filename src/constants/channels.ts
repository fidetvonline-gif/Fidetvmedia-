import { MonitorPlay } from 'lucide-react';

export const DEFAULT_CHANNELS = [
  {
    id: 'nta_international',
    name: 'NTA International',
    category: 'News / National Television',
    thumbnail: 'https://images.unsplash.com/photo-1593508512255-86ab42a8e620?auto=format&fit=crop&q=80&w=800',
    url: 'https://www.nta.ng/watch/live/ntaintl',
    icon: MonitorPlay,
    description: 'Official NTA International live broadcast player.',
    isLive: true,
    stream_type: 'official_embed',
    order_index: 1
  },
  {
    id: 'nta_news_24',
    name: 'NTA News 24',
    category: 'News / National Television',
    thumbnail: 'https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?auto=format&fit=crop&q=80&w=800',
    url: 'https://www.nta.ng/tv',
    icon: MonitorPlay,
    description: 'Official 24-hour news channel from Nigerian Television Authority.',
    isLive: true,
    stream_type: 'official_embed',
    order_index: 2
  },
  {
    id: 'ng_news_channels_tv',
    name: 'Channels Television',
    category: 'News / National Television',
    thumbnail: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&q=80&w=800',
    url: 'https://www.channelstv.com/watch-live/',
    icon: MonitorPlay,
    description: 'Official Channels Television live streaming portal.',
    isLive: true,
    stream_type: 'official_embed',
    order_index: 3
  },
  {
    id: 'ng_news_tvc',
    name: 'TVC News Nigeria',
    category: 'News / National Television',
    thumbnail: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=800',
    url: 'https://www.tvcnews.tv/watch-live/',
    icon: MonitorPlay,
    description: 'Official TVC News live streaming portal.',
    isLive: true,
    stream_type: 'official_embed',
    order_index: 4
  }
];
