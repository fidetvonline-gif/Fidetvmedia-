import { Tv, Globe, MonitorPlay, Film } from 'lucide-react';

export const DEFAULT_CHANNELS = [
  {
    id: 'news_channels_tv',
    name: 'Channels TV',
    category: 'Nigeria',
    thumbnail: 'https://images.unsplash.com/photo-1585829365234-781fcd04c838?auto=format&fit=crop&q=80&w=800',
    url: 'https://www.youtube.com/watch?v=0_u6uOnE6I4', // More stable YouTube live link
    icon: Tv,
    description: 'Premier 24-hour news channel in Nigeria.',
    isLive: true
  },
  {
    id: 'news_tvc',
    name: 'TVC News',
    category: 'Nigeria',
    thumbnail: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&q=80&w=800',
    url: 'https://www.youtube.com/watch?v=gT8_kK2w-D4',
    icon: Globe,
    description: 'Leading news and current affairs from Nigeria and Africa.',
    isLive: true
  },
  {
    id: 'news_ait',
    name: 'AIT Nigeria',
    category: 'Nigeria',
    thumbnail: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&q=80&w=800',
    url: 'https://www.youtube.com/watch?v=hGv-S6ZpIKE',
    icon: Tv,
    description: 'Africa Independent Television - news and entertainment.',
    isLive: true
  },
  {
    id: 'sports_bein_xtra',
    name: 'beIN Sports XTRA',
    category: 'Sports',
    thumbnail: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800',
    url: 'https://beinsportsxtra-rakuten.amagi.tv/playlist.m3u8',
    icon: MonitorPlay,
    description: '24/7 sports coverage including soccer, tennis, and more.',
    isLive: true
  },
  {
    id: 'sports_fifa_plus',
    name: 'FIFA+',
    category: 'Sports',
    thumbnail: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&q=80&w=800',
    url: 'https://fifa-fifaplus-5-us.ottera.tv/playlist.m3u8',
    icon: MonitorPlay,
    description: 'Official FIFA live and archive match content.',
    isLive: true
  },
  {
    id: 'news_nta_int',
    name: 'NTA News 24',
    category: 'Nigeria',
    thumbnail: 'https://images.unsplash.com/photo-1493612276216-ee3925520721?auto=format&fit=crop&q=80&w=800',
    url: 'https://www.youtube.com/watch?v=2SgEqv8S5dY',
    icon: Tv,
    description: 'Nigeria Television Authority 24-hour news.',
    isLive: true
  },
  {
    id: 'sports_redbull',
    name: 'Red Bull TV',
    category: 'Sports',
    thumbnail: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&q=80&w=800',
    url: 'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8',
    icon: MonitorPlay,
    description: '24/7 Live Action Sports and Lifestyle.',
    isLive: true
  },
  {
    id: 'news_aljazeera',
    name: 'Al Jazeera English',
    category: 'News',
    thumbnail: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=800',
    url: 'https://live-hls-web-aje.getaj.net/AJE/index.m3u8', 
    icon: Globe,
    description: 'Breaking news and world events happening right now.',
    isLive: true
  },
  {
    id: 'news_france24',
    name: 'France 24',
    category: 'News',
    thumbnail: 'https://images.unsplash.com/photo-1493612276216-ee3925520721?auto=format&fit=crop&q=80&w=800',
    url: 'https://static.france24.com/live/F24_EN_HI_HLS/live_web.m3u8',
    icon: Globe,
    description: 'International news broadcasting from Paris, France.',
    isLive: true
  },
  {
    id: 'test_mp4',
    name: 'Nature Showcase (MP4)',
    category: 'Documentary',
    thumbnail: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=800',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    icon: Film,
    description: 'A stable MP4 stream for testing playback compatibility.',
    isLive: true
  }
];
