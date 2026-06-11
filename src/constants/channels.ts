import { Tv, Globe, MonitorPlay, Film, Filter } from 'lucide-react';

export const DEFAULT_CHANNELS = [
  {
    id: 'news_channels_tv',
    name: 'Channels TV',
    category: 'Nigeria',
    thumbnail: 'https://images.unsplash.com/photo-1598252580418-c4163a329d00?auto=format&fit=crop&q=80&w=800',
    url: 'https://channels-live.sh-cdn.com/hls/live/master.m3u8',
    icon: Tv,
    description: 'Premier 24-hour news channel in Nigeria.',
    isLive: true
  },
  {
    id: 'news_tvc',
    name: 'TVC News',
    category: 'Nigeria',
    thumbnail: 'https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?auto=format&fit=crop&q=80&w=800',
    url: 'https://tvc-live.sh-cdn.com/hls/live/master.m3u8',
    icon: Globe,
    description: 'Leading news and current affairs from Nigeria and Africa.',
    isLive: true
  },
  {
    id: 'news_ait',
    name: 'AIT Nigeria',
    category: 'Nigeria',
    thumbnail: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&q=80&w=800',
    url: 'https://ait-live.sh-cdn.com/hls/live/master.m3u8',
    icon: Tv,
    description: 'Africa Independent Television - news and entertainment.',
    isLive: true
  },
  {
    id: 'news_arise',
    name: 'Arise News',
    category: 'Nigeria',
    thumbnail: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&q=80&w=800',
    url: 'https://arise-live.sh-cdn.com/hls/live/master.m3u8',
    icon: Globe,
    description: 'Arise News is an international news channel.',
    isLive: true
  },
  {
    id: 'news_nta_int',
    name: 'NTA News 24',
    category: 'Nigeria',
    thumbnail: 'https://images.unsplash.com/photo-1493612276216-ee3925520721?auto=format&fit=crop&q=80&w=800',
    url: 'https://nta-live.sh-cdn.com/hls/live/master.m3u8',
    icon: Tv,
    description: 'Nigeria Television Authority 24-hour news.',
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
    id: 'news_africa_news',
    name: 'Africanews English',
    category: 'News',
    thumbnail: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&q=80&w=800',
    url: 'https://africanews-en-rakuten.amagi.tv/playlist.m3u8',
    icon: Globe,
    description: 'International news and information in English from a pan-African perspective.',
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
    url: 'https://live-aje-intl.akamaized.net/hls/live/2033486/aje/index.m3u8', 
    icon: Globe,
    description: 'Breaking news and world events happening right now.',
    isLive: true
  },
  {
    id: 'news_france24_en',
    name: 'France 24 English',
    category: 'News',
    thumbnail: 'https://images.unsplash.com/photo-1493612276216-ee3925520721?auto=format&fit=crop&q=80&w=800',
    url: 'https://france24-abacast-rakuten.amagi.tv/playlist.m3u8',
    icon: Globe,
    description: 'International news broadcasting from Paris, France.',
    isLive: true
  },
  {
    id: 'news_bbc_world',
    name: 'BBC News World',
    category: 'News',
    thumbnail: 'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?auto=format&fit=crop&q=80&w=800',
    url: 'https://bbc-news-eng-samsung.amagi.tv/playlist.m3u8',
    icon: Globe,
    description: 'World News from the British Broadcasting Corporation.',
    isLive: true
  },
  {
    id: 'news_india_today',
    name: 'India Today',
    category: 'International',
    thumbnail: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&q=80&w=800',
    url: 'https://indiatoday-live.sh-cdn.com/hls/live/master.m3u8',
    icon: Globe,
    description: 'India Today provides latest news from India and around the world.',
    isLive: true
  },
  {
    id: 'news_republic_tv',
    name: 'Republic TV',
    category: 'International',
    thumbnail: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&q=80&w=800',
    url: 'https://republic-live.sh-cdn.com/hls/live/master.m3u8',
    icon: Globe,
    description: 'India\'s most-watched English news channel.',
    isLive: true
  },
  {
    id: 'news_cbs_news',
    name: 'CBS News Live',
    category: 'News',
    thumbnail: 'https://images.unsplash.com/photo-1595113316349-9fa4eb24f884?auto=format&fit=crop&q=80&w=800',
    url: 'https://cbsnews-cbsnews-1-us.ottera.tv/playlist.m3u8',
    icon: Globe,
    description: '24/7 breaking news, reporting and analysis from CBS News.',
    isLive: true
  },
  {
    id: 'news_sky',
    name: 'Sky News',
    category: 'News',
    thumbnail: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800',
    url: 'https://skynews-skynews-1-us.ottera.tv/playlist.m3u8',
    icon: Globe,
    description: 'Sky News - First for breaking news & latest updates.',
    isLive: true
  },
  {
    id: 'news_nhk_world',
    name: 'NHK World-Japan',
    category: 'International',
    thumbnail: 'https://images.unsplash.com/photo-1526481280693-3bfa7561603f?auto=format&fit=crop&q=80&w=800',
    url: 'https://nhkwlive-ojp.akamaized.net/hls/live/2003234/nhkwlive-ojp-en/index.m3u8',
    icon: Globe,
    description: 'Japanese international news and lifestyle programs.',
    isLive: true
  },
  {
    id: 'news_wion',
    name: 'WION News',
    category: 'International',
    thumbnail: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&q=80&w=800',
    url: 'https://wion-live.sh-cdn.com/hls/live/master.m3u8',
    icon: Globe,
    description: 'World Is One News - international news from South Asia.',
    isLive: true
  },
  {
    id: 'news_dw_eng',
    name: 'DW English',
    category: 'International',
    thumbnail: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&q=80&w=800',
    url: 'https://dwstream72-lh.akamaihd.net/i/dwtv_eng@665845/index.m3u8',
    icon: Globe,
    description: 'Global news and documentaries from Germany.',
    isLive: true
  },
  {
    id: 'news_trt_world',
    name: 'TRT World',
    category: 'International',
    thumbnail: 'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?auto=format&fit=crop&q=80&w=800',
    url: 'https://tv-trtworld.medya.trt.com.tr/master.m3u8',
    icon: Globe,
    description: 'International news from a Turkish perspective.',
    isLive: true
  },
  {
    id: 'news_abc_us',
    name: 'ABC News Live',
    category: 'News',
    thumbnail: 'https://images.unsplash.com/photo-1476242906366-d8eb64c2f661?auto=format&fit=crop&q=80&w=800',
    url: 'https://abc-abcnews-3-us.ottera.tv/playlist.m3u8',
    icon: Globe,
    description: '24/7 news coverage from ABC News.',
    isLive: true
  },
  {
    id: 'science_nasa',
    name: 'NASA TV',
    category: 'Science',
    thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800',
    url: 'https://ntv-all-public.akamaized.net/hls/live/2026372/NTV-Public/master.m3u8',
    icon: MonitorPlay,
    description: 'The latest space exploration news and live launches.',
    isLive: true
  },
  {
    id: 'lifestyle_fashion_tv',
    name: 'Fashion TV',
    category: 'Lifestyle',
    thumbnail: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=800',
    url: 'https://fash1043.cloudycdn.net/dnR5Z3V5NHp5/index.m3u8',
    icon: Film,
    description: 'The global fashion and lifestyle media hub.',
    isLive: true
  },
  {
    id: 'news_cna',
    name: 'CNA Asia',
    category: 'News',
    thumbnail: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&q=80&w=800',
    url: 'https://cna-hls-intl.akamaized.net/hls/live/2034508/cna-hls-intl/master.m3u8',
    icon: Globe,
    description: 'Asian news and analysis from Singapore.',
    isLive: true
  },
  {
    id: 'news_arirang',
    name: 'Arirang TV',
    category: 'International',
    thumbnail: 'https://images.unsplash.com/photo-1533158307587-828f0a76ef46?auto=format&fit=crop&q=80&w=800',
    url: 'https://arirangworld.ctndigital.com/arirang/arirang.m3u8',
    icon: Globe,
    description: 'Korean culture and news for the world.',
    isLive: true
  },
  {
    id: 'news_bloomberg',
    name: 'Bloomberg TV',
    category: 'Business',
    thumbnail: 'https://images.unsplash.com/photo-1611974714014-a9d20c5d2b78?auto=format&fit=crop&q=80&w=800',
    url: 'https://bloomberg-rakuten.amagi.tv/playlist.m3u8',
    icon: MonitorPlay,
    description: 'The global leader in business and financial data.',
    isLive: true
  },
  {
    id: 'news_scripps',
    name: 'Scripps News',
    category: 'News',
    thumbnail: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&q=80&w=800',
    url: 'https://scripps-scrippsnews-1-us.ottera.tv/playlist.m3u8',
    icon: Globe,
    description: '24/7 news that provides context and clarity.',
    isLive: true
  },
  {
    id: 'music_clubbing_tv',
    name: 'Clubbing TV',
    category: 'Music',
    thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=800',
    url: 'https://clubbingtv-rakuten.amagi.tv/playlist.m3u8',
    icon: MonitorPlay,
    description: 'Electronic music and nightlife lifestyle 24/7.',
    isLive: true
  },
  {
    id: 'cooking_gusto',
    name: 'Gusto TV',
    category: 'Lifestyle',
    thumbnail: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=800',
    url: 'https://gustotv-rakuten.amagi.tv/playlist.m3u8',
    icon: Filter,
    description: 'Food and culinary adventures from around the world.',
    isLive: true
  },
  {
    id: 'documentary_rakuten_stories',
    name: 'Rakuten TV Stories',
    category: 'Documentary',
    thumbnail: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=800',
    url: 'https://rakuten-stories-1-at.samsung.wurl.tv/playlist.m3u8',
    icon: Film,
    description: 'Documentaries and inspiring stories from Rakuten TV.',
    isLive: true
  },
  {
    id: 'news_weather_nation',
    name: 'WeatherNation',
    category: 'News',
    thumbnail: 'https://images.unsplash.com/photo-1504386106331-3e4e71712b38?auto=format&fit=crop&q=80&w=800',
    url: 'https://weathernation-roku.amagi.tv/playlist.m3u8',
    icon: Globe,
    description: '24/7 national and local weather coverage.',
    isLive: true
  },
  {
    id: 'movies_filmrise_action',
    name: 'FilmRise Action',
    category: 'Movies',
    thumbnail: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=800',
    url: 'https://filmrise-action-1-us.ottera.tv/playlist.m3u8',
    icon: Film,
    description: 'Non-stop action movies and series.',
    isLive: true
  },
  {
    id: 'movies_filmrise_free',
    name: 'FilmRise Free Movies',
    category: 'Movies',
    thumbnail: 'https://images.unsplash.com/photo-1485093451681-d5dfd99b160b?auto=format&fit=crop&q=80&w=800',
    url: 'https://filmrise-freemovies-1-us.ottera.tv/playlist.m3u8',
    icon: Film,
    description: 'A wide selection of free movies across all genres.',
    isLive: true
  },
  {
    id: 'kids_pocket_watch',
    name: 'Pocket.watch',
    category: 'Kids',
    thumbnail: 'https://images.unsplash.com/photo-1472162072942-cd5147eb3902?auto=format&fit=crop&q=80&w=800',
    url: 'https://pocketwatch-pocketwatch-1-us.ottera.tv/playlist.m3u8',
    icon: Tv,
    description: 'Top kids content from your favorite YouTube stars.',
    isLive: true
  },
  {
    id: 'kids_ryan_friends',
    name: 'Ryan and Friends',
    category: 'Kids',
    thumbnail: 'https://images.unsplash.com/photo-1533749047135-179ee2c47a61?auto=format&fit=crop&q=80&w=800',
    url: 'https://ryansfriends-pocketwatch-9-us.ottera.tv/playlist.m3u8',
    icon: Tv,
    description: 'Safe and fun videos for kids with Ryan and his friends.',
    isLive: true
  },
  {
    id: 'news_euronews_eng',
    name: 'Euronews English',
    category: 'News',
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800',
    url: 'https://euronews-eng-rakuten.amagi.tv/playlist.m3u8',
    icon: Globe,
    description: 'European news from a global perspective.',
    isLive: true
  },
  {
    id: 'ent_pet_collective',
    name: 'The Pet Collective',
    category: 'Entertainment',
    thumbnail: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=800',
    url: 'https://thepetcollective-thepetcollective-1-us.ottera.tv/playlist.m3u8',
    icon: MonitorPlay,
    description: 'The best pet videos, stories, and more.',
    isLive: true
  },
  {
    id: 'ent_failarmy',
    name: 'FailArmy',
    category: 'Entertainment',
    thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800',
    url: 'https://failarmy-failarmy-1-us.ottera.tv/playlist.m3u8',
    icon: MonitorPlay,
    description: 'The world leader in epic fails and funny videos.',
    isLive: true
  },
  {
    id: 'ent_people_awesome',
    name: 'People Are Awesome',
    category: 'Entertainment',
    thumbnail: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&q=80&w=800',
    url: 'https://peopleareawesome-peopleareawesome-1-us.ottera.tv/playlist.m3u8',
    icon: MonitorPlay,
    description: 'Celebrating ordinary people doing extraordinary things.',
    isLive: true
  },
  {
    id: 'sports_usga',
    name: 'USGA TV',
    category: 'Sports',
    thumbnail: 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?auto=format&fit=crop&q=80&w=800',
    url: 'https://usga-usga-4-us.ottera.tv/playlist.m3u8',
    icon: MonitorPlay,
    description: 'Live coverage and highlights from USGA championships.',
    isLive: true
  },
  {
    id: 'sports_wpt',
    name: 'World Poker Tour',
    category: 'Sports',
    thumbnail: 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?auto=format&fit=crop&q=80&w=800',
    url: 'https://wpt-wpt-1-us.ottera.tv/playlist.m3u8',
    icon: MonitorPlay,
    description: 'Non-stop poker action from the World Poker Tour.',
    isLive: true
  },
  {
    id: 'nature_wildearth',
    name: 'WildEarth',
    category: 'Documentary',
    thumbnail: 'https://images.unsplash.com/photo-1547234935-80c7145ec969?auto=format&fit=crop&q=80&w=800',
    url: 'https://wildearth-wildearth-1-us.ottera.tv/playlist.m3u8',
    icon: Film,
    description: 'Live wildlife safaris from across Africa.',
    isLive: true
  },
  {
    id: 'news_newsmax',
    name: 'Newsmax TV',
    category: 'News',
    thumbnail: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&q=80&w=800',
    url: 'https://newsmax-newsmax-1-us.ottera.tv/playlist.m3u8',
    icon: Globe,
    description: 'Real news for real people from Newsmax.',
    isLive: true
  },
  {
    id: 'news_al_arabiya',
    name: 'Al Arabiya English',
    category: 'News',
    thumbnail: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&q=80&w=800',
    url: 'https://mbc-alarabiyaen-rakuten.amagi.tv/playlist.m3u8',
    icon: Globe,
    description: 'International news and current affairs from Dubai.',
    isLive: true
  },
  {
    id: 'news_press_tv',
    name: 'Press TV',
    category: 'News',
    thumbnail: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&q=80&w=800',
    url: 'https://presstv-eng-samsung.amagi.tv/playlist.m3u8',
    icon: Globe,
    description: '24-hour news and documentary network.',
    isLive: true
  },
  {
    id: 'news_i24',
    name: 'i24 News English',
    category: 'News',
    thumbnail: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800',
    url: 'https://i24news-i24newsenglish-1-us.ottera.tv/playlist.m3u8',
    icon: Globe,
    description: 'International news from the heart of the Middle East.',
    isLive: true
  },
  {
    id: 'news_abc_australia',
    name: 'ABC News Australia',
    category: 'News',
    thumbnail: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&q=80&w=800',
    url: 'https://abc-iview-mediapackagetr-1.akamaized.net/out/v1/68175a1761f0447087612f17109279dc/index.m3u8',
    icon: Globe,
    description: '24/7 news coverage from the Australian Broadcasting Corporation.',
    isLive: true
  },
  {
    id: 'sports_fuel_tv',
    name: 'Fuel TV',
    category: 'Sports',
    thumbnail: 'https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&q=80&w=800',
    url: 'https://fueltv-fueltv-1-us.ottera.tv/playlist.m3u8',
    icon: MonitorPlay,
    description: 'Global home of action sports.',
    isLive: true
  },
  {
    id: 'ent_people_tv',
    name: 'People TV',
    category: 'Entertainment',
    thumbnail: 'https://images.unsplash.com/photo-1511988617509-a57c8a288659?auto=format&fit=crop&q=80&w=800',
    url: 'https://peopletv-peopletv-1-us.ottera.tv/playlist.m3u8',
    icon: MonitorPlay,
    description: 'The best of celebrity news, human interest stories, and entertainment.',
    isLive: true
  },
  {
    id: 'music_trace_urban',
    name: 'Trace Urban',
    category: 'Music',
    thumbnail: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?auto=format&fit=crop&q=80&w=800',
    url: 'https://trace-urban-1-de.samsung.wurl.tv/playlist.m3u8',
    icon: MonitorPlay,
    description: 'The best of urban music and culture.',
    isLive: true
  },
  {
    id: 'music_stingray_karaoke',
    name: 'Stingray Karaoke',
    category: 'Music',
    thumbnail: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&q=80&w=800',
    url: 'https://stungray-karaoke-1-at.samsung.wurl.tv/playlist.m3u8',
    icon: MonitorPlay,
    description: 'Non-stop karaoke hits for everyone.',
    isLive: true
  },
  {
    id: 'sports_afrosport_tv',
    name: 'Afrosport TV',
    category: 'Sports',
    thumbnail: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=800',
    url: 'https://v1.afrosportnow.com/afrosport/playlist.m3u8',
    icon: MonitorPlay,
    description: 'Africa\'s first 24-hour multi-sport channel.',
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
  },
];

