import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, ZoomIn, Filter, ArrowLeft, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import ReactPlayer from 'react-player';
import OptimizedImage from '@/components/OptimizedImage';
import UniversalPlayer from '@/components/streaming/UniversalPlayer';

import { YouTubeEmbed } from '@/components/YouTubeEmbed';

const Player = ReactPlayer as any;

export default function Content() {
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dbContent, setDbContent] = useState<any[]>([]);
  const [playingVideo, setPlayingVideo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContent();
  }, []);

  const extractYtId = (url: string) => {
    if (!url) return '';
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : '';
  };

  const formatYtUrl = (val: string) => {
    if (!val) return val;
    // If it's a 11-char ID, make it a URL
    if (/^[a-zA-Z0-9_-]{11}$/.test(val)) return `https://www.youtube.com/watch?v=${val}`;
    return val;
  };

  const fetchContent = async () => {
    setLoading(true);
    try {
      // Fetch from our new YouTube API endpoint
      const ytResponse = await fetch('/api/youtube/content');
      const ytVideos = await ytResponse.json();
      
      const { data: portfolioData } = await supabase
        .from('portfolio_items')
        .select('*')
        .order('created_at', { ascending: false });

      const formattedPortfolio = portfolioData ? portfolioData.map((item) => {
        const ytId = extractYtId(item.youtube_id);
        return {
          id: item.id,
          title: item.title,
          category: item.category || 'General Content',
          image: item.image_url,
          type: 'video',
          youtube_id: ytId || item.youtube_id,
          stream_url: item.video_url,
          description: item.description
        };
      }) : [];

      // Combine and filter out duplicates (by youtube_id)
      const allContentMap = new Map();
      
      ytVideos.forEach((yt: any) => {
        allContentMap.set(yt.youtube_id, yt);
      });
      
      formattedPortfolio.forEach(p => {
        if (!allContentMap.has(p.youtube_id)) {
          allContentMap.set(p.youtube_id, p);
        }
      });

      setDbContent(Array.from(allContentMap.values()));
    } catch (err) {
      console.error("Error fetching content:", err);
      // Fallback to DB only
      const { data: portfolioData } = await supabase
        .from('portfolio_items')
        .select('*')
        .order('created_at', { ascending: false });
        
      setDbContent(portfolioData ? portfolioData.map(item => ({
        id: item.id,
        title: item.title,
        category: item.category || 'General Content',
        image: item.image_url,
        type: 'video',
        youtube_id: extractYtId(item.youtube_id) || item.youtube_id,
        stream_url: item.video_url,
        description: item.description
      })) : []);
    }
    setLoading(false);
  };

  const categories = ['all', 'Campus Matters', 'Love Affairs', 'Live Events', 'Commercial', 'Corporate', 'Interviews', 'General Content'];

  const filteredContent = dbContent.filter(item => {
    const matchesFilter = filter === 'all' || item.category === filter;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background pb-40">
      {/* Search & Filter Header */}
      <section className="pt-24 pb-12 border-b border-border-custom">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4">
              <Link to="/" className="inline-flex items-center space-x-2 text-foreground/40 hover:text-foreground transition-colors mb-4">
                <ArrowLeft className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Back to Studio</span>
              </Link>
              <h1 className="text-6xl sm:text-8xl font-display font-bold text-foreground tracking-tighter leading-none italic">
                Content Hub.
              </h1>
              <p className="text-foreground/60 font-light text-xl max-w-xl">
                Explore our full library of original shows, live event recordings, and creative productions.
              </p>
            </div>
            
            <div className="relative w-full md:w-96">
              <input 
                type="text" 
                placeholder="Search programs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface border border-border-custom rounded-2xl px-12 py-5 text-foreground placeholder-foreground/20 focus:outline-none focus:border-primary transition-all shadow-sm"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/20" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
             {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={cn(
                    "px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    filter === cat 
                      ? "bg-primary text-white shadow-xl shadow-primary/20 scale-105" 
                      : "bg-surface text-foreground/40 hover:text-foreground border border-border-custom hover:bg-surface-bright"
                  )}
                >
                  {cat}
                </button>
             ))}
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="aspect-[4/5] rounded-[3rem] bg-surface-bright/50 animate-pulse" />
            ))}
          </div>
        ) : filteredContent.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 sm:gap-x-12 sm:gap-y-24">
            <AnimatePresence mode="popLayout">
              {filteredContent.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="group"
                >
                  <div className="relative aspect-[4/5] rounded-[3rem] overflow-hidden bg-surface mb-8 border border-border-custom shadow-lg">
                    <OptimizedImage 
                      src={item.image} 
                      alt={item.title} 
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-70 group-hover:opacity-40"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-60 transition-opacity group-hover:opacity-100" />
                    
                    <div className="absolute inset-0 p-6 sm:p-10 flex flex-col justify-end pointer-events-none">
                       <div className="space-y-4 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                          <span className="text-[10px] uppercase tracking-[0.4em] font-black text-primary">{item.category}</span>
                          <h4 className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight leading-tight">{item.title}</h4>
                       </div>
                    </div>
                    
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <button 
                         onClick={() => setPlayingVideo(item)}
                         className="w-16 h-16 sm:w-20 sm:h-20 bg-background/20 hover:bg-primary backdrop-blur-md text-white font-black rounded-full flex items-center justify-center transition-all shadow-2xl pointer-events-auto scale-90 group-hover:scale-100"
                      >
                         <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-current ml-1 sm:ml-2" />
                      </button>
                    </div>

                    <div className="absolute top-6 right-6 w-10 h-10 bg-background/10 backdrop-blur-md rounded-full flex items-center justify-center border border-border-custom text-white opacity-0 group-hover:opacity-100 transition-opacity">
                       <Filter className="w-5 h-5" />
                    </div>
                  </div>
                  
                  <div className="px-6">
                    <p className="text-foreground/40 font-light text-sm leading-relaxed line-clamp-2 italic">
                       {item.description || "No show description available yet. Check back soon for more details about this production."}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-40 bg-surface rounded-[3rem] border border-dashed border-border-custom">
            <Search className="w-16 h-16 text-foreground/20 mx-auto mb-6" />
            <h3 className="text-2xl font-display font-bold text-foreground">No content found</h3>
            <p className="text-foreground/40 mt-2 italic px-4">Try adjusting your search or filters.</p>
          </div>
        )}
      </section>

      {/* Video Modal */}
      <AnimatePresence>
        {playingVideo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-20"
            onClick={() => setPlayingVideo(null)}
          >
            <div 
              className="relative w-full max-w-7xl aspect-video bg-black rounded-[3rem] overflow-hidden shadow-2xl border border-white/5"
              onClick={e => e.stopPropagation()}
            >
              {playingVideo.youtube_id || playingVideo.stream_url ? (
                playingVideo.youtube_id ? (
                  <YouTubeEmbed 
                    videoId={playingVideo.youtube_id}
                    autoPlay={true}
                    className="w-full h-full"
                  />
                ) : (
                  <UniversalPlayer 
                    channel={{ url: playingVideo.stream_url, name: playingVideo.title }}
                    autoPlay={true}
                    muted={false}
                  />
                )
              ) : (
                <img src={playingVideo.image} alt={playingVideo.title} className="w-full h-full object-contain" />
              )}
              
              <div className="absolute top-4 sm:top-8 left-4 right-4 sm:left-8 sm:right-8 flex justify-between items-start pointer-events-none">
                 <div className="p-3 sm:p-4 bg-black/50 backdrop-blur-md rounded-2xl border border-white/10 pointer-events-auto max-w-[60%] sm:max-w-md">
                    <span className="text-[8px] sm:text-[10px] font-black uppercase text-primary tracking-[0.2em] sm:tracking-[0.3em] mb-1 block">{playingVideo.category}</span>
                    <h2 className="text-white font-display font-medium text-sm sm:text-base tracking-tight line-clamp-2">{playingVideo.title}</h2>
                 </div>
                 
                 <button 
                  onClick={() => setPlayingVideo(null)}
                  className="w-14 h-14 bg-white hover:bg-primary text-black hover:text-white rounded-full flex items-center justify-center transition-all shadow-2xl pointer-events-auto scale-110 active:scale-95"
                >
                  <Play className="w-6 h-6 rotate-45" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
