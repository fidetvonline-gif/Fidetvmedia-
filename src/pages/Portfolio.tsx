import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, ZoomIn, ExternalLink, Filter, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import ReactPlayer from 'react-player';

const Player = ReactPlayer as any;

export default function Portfolio() {
  const [filter, setFilter] = useState('all');
  const [dbProjects, setDbProjects] = useState<any[]>([]);
  const [playingVideo, setPlayingVideo] = useState<any | null>(null);

  useEffect(() => {
    fetchPastEvents();
  }, []);

  const fetchPastEvents = async () => {
    let ytItems: any[] = [];
    try {
      const res = await fetch('/api/youtube/content', { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data)) {
        ytItems = data.map(yt => ({
          id: yt.youtube_id || yt.id,
          title: yt.title,
          category: yt.category || 'General Content',
          image: yt.image || yt.image_url,
          type: 'video',
          youtube_id: yt.youtube_id,
          stream_url: yt.stream_url || yt.video_url
        }));
      }
    } catch (e) {}

    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'offline')
      .order('created_at', { ascending: false });

    const eventItems = (data || []).map((ev) => ({
      id: ev.id,
      title: ev.title,
      category: 'Live Events',
      image: ev.thumbnail_url || (ev.youtube_id ? `https://img.youtube.com/vi/${ev.youtube_id}/maxresdefault.jpg` : 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&q=80&w=2070'),
      type: 'video',
      youtube_id: ev.youtube_id,
      stream_url: ev.stream_url
    }));

    const map = new Map();
    ytItems.forEach(item => map.set(item.youtube_id || item.id, item));
    eventItems.forEach(item => {
      const id = item.youtube_id || item.id;
      if (!map.has(id)) map.set(id, item);
    });

    setDbProjects(Array.from(map.values()));
  };

  const staticProjects = [
    { id: 'web-1', title: 'Fintech Dashboard Design', category: 'Web Development', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2070', type: 'image' },
    { id: 'app-1', title: 'E-commerce Mobile Platform', category: 'App Development', image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&q=80&w=2070', type: 'image' },
    { id: 1, title: 'Summer Jazz Festival', category: 'Live Events', image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&q=80&w=2070', type: 'video' },
    { id: 2, title: 'Brand Launch: NEXA', category: 'Commercial', image: 'https://images.unsplash.com/photo-1551818255-e6e10975bc17?auto=format&fit=crop&q=80&w=2070', type: 'video' },
    { id: 3, title: 'Corporate Summit 2026', category: 'Corporate', image: 'https://images.unsplash.com/photo-1475721027785-f74dea327912?auto=format&fit=crop&q=80&w=2070', type: 'image' },
    { id: 4, title: 'Artist Spotlight', category: 'Interviews', image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&q=80&w=2070', type: 'video' },
  ];

  const projects = [...dbProjects, ...staticProjects];

  const categories = ['all', 'Web Development', 'App Development', 'Live Events', 'Commercial', 'Corporate', 'Interviews'];

  const filteredProjects = filter === 'all' ? projects : projects.filter(p => p.category === filter);


  return (
    <div className="py-24 space-y-32 mb-32 bg-background">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
             <div className="h-px w-8 bg-primary/30" />
             <span className="text-primary font-display font-medium uppercase tracking-[0.5em] text-[10px]">The Archive</span>
          </div>
          <h1 className="text-5xl sm:text-7xl md:text-9xl font-display font-bold text-foreground tracking-tighter leading-[0.85] italic">
            Engineered<br /><span className="text-primary mix-blend-difference">Excellence.</span>
          </h1>
          <p className="text-xl sm:text-2xl text-foreground font-serif font-light leading-relaxed italic opacity-70 max-w-2xl">
            A selection of high-performance digital solutions and cinematic productions crafted by our studio.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-8">
          <div className="w-10 h-10 rounded-full bg-surface-bright border border-border-custom flex items-center justify-center mr-4">
             <Filter className="w-4 h-4 text-primary" />
          </div>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={cn(
                "px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all border",
                filter === cat ? "bg-primary text-white border-primary shadow-xl shadow-primary/20" : "bg-surface-bright/50 text-text-muted border-border-custom hover:border-primary/50 hover:text-foreground"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          <AnimatePresence mode="popLayout">
            {filteredProjects.map((project) => (
              <motion.div
                key={project.id}
                layout
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="group relative aspect-[4/5] rounded-[3rem] overflow-hidden bg-surface border border-border-custom shadow-2xl hover:border-primary/30 transition-all duration-700"
              >
                <img 
                  src={project.image} 
                  alt={project.title} 
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-60 group-hover:opacity-40 grayscale group-hover:grayscale-0"
                  referrerPolicy="no-referrer"
                />

                <div className="absolute top-8 left-8 z-10 flex flex-col gap-3">
                   <span className="px-5 py-2 bg-background/80 backdrop-blur-xl border border-border-custom rounded-full text-[9px] font-black uppercase tracking-[0.3em] text-primary shadow-xl">
                     {project.category}
                   </span>
                </div>
                
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-80" />
                
                <div className="absolute inset-0 p-10 flex flex-col justify-end">
                   <div className="space-y-6 translate-y-8 group-hover:translate-y-0 transition-all duration-700 ease-[0.16, 1, 0.3, 1]">
                      <h4 className="text-3xl sm:text-4xl font-display font-medium text-foreground tracking-tighter italic leading-none">{project.title}</h4>
                      
                      <div className="flex space-x-3 opacity-0 group-hover:opacity-100 transition-opacity duration-700 delay-100">
                        <button 
                          onClick={() => setPlayingVideo(project)}
                          className="w-full h-14 bg-primary text-white font-black uppercase tracking-[0.3em] text-[10px] rounded-2xl flex items-center justify-center hover:bg-primary/90 transition-all shadow-2xl shadow-primary/30"
                        >
                          {project.type === 'video' ? (
                            <>
                              <Play className="w-4 h-4 fill-current mr-3" />
                              <span>Experience</span>
                            </>
                          ) : (
                            <>
                              <ExternalLink className="w-4 h-4 mr-3" />
                              <span>View Case</span>
                            </>
                          )}
                        </button>
                      </div>
                   </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>

      {/* Video Reel Accent */}
      <section className="bg-surface py-48 overflow-hidden relative border-y border-border-custom">
        <div className="absolute inset-0 opacity-5 flex space-x-16 -rotate-6 translate-y-32 scale-125">
           {Array.from({ length: 4 }).map((_, i) => (
             <div key={i} className="flex flex-col space-y-16">
                {Array.from({ length: 5 }).map((_, j) => (
                   <div key={j} className="w-[30rem] aspect-video bg-foreground rounded-[3rem]" />
                ))}
             </div>
           ))}
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-16">
           <div className="space-y-6">
              <span className="text-[10px] font-black uppercase tracking-[0.6em] text-primary">Status: Active</span>
              <h3 className="text-5xl sm:text-8xl font-display font-bold text-foreground tracking-tighter italic leading-none">Architecting the<br />Digital Future.</h3>
           </div>
           <Link to="/contact" className="inline-flex items-center space-x-6 bg-primary text-white px-16 py-7 rounded-[2rem] font-black uppercase tracking-[0.4em] text-xs hover:scale-105 transition-all shadow-2xl shadow-primary/30">
              <span>Initialize Partnership</span>
              <ArrowUpRight className="w-6 h-6" />
           </Link>
        </div>
      </section>

      {/* Video Modal */}
      <AnimatePresence>
        {playingVideo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
            onClick={() => setPlayingVideo(null)}
          >
            <div 
              className="relative w-full max-w-6xl aspect-video bg-black rounded-[2rem] overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              {playingVideo.youtube_id || playingVideo.stream_url ? (
                <Player 
                  url={playingVideo.youtube_id ? `https://youtube.com/watch?v=${playingVideo.youtube_id}` : playingVideo.stream_url}
                  width="100%"
                  height="100%"
                  controls
                  playing
                />
              ) : (
                <img src={playingVideo.image} alt={playingVideo.title} className="w-full h-full object-contain" />
              )}
              <button 
                onClick={() => setPlayingVideo(null)}
                className="absolute top-4 right-4 w-12 h-12 bg-black/50 hover:bg-primary text-white rounded-full flex items-center justify-center transition-colors z-10"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
