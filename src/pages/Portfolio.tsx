import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, ZoomIn, ExternalLink, Filter } from 'lucide-react';
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
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'offline')
      .order('created_at', { ascending: false });

    if (data) {
      setDbProjects(
        data.map((ev) => ({
          id: ev.id,
          title: ev.title,
          category: 'Live Events',
          image: ev.thumbnail_url || (ev.youtube_id ? `https://img.youtube.com/vi/${ev.youtube_id}/maxresdefault.jpg` : 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&q=80&w=2070'),
          type: 'video',
          youtube_id: ev.youtube_id,
          stream_url: ev.stream_url
        }))
      );
    }
  };

  const staticProjects = [
    { id: 1, title: 'Summer Jazz Festival', category: 'Live Events', image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&q=80&w=2070', type: 'video' },
    { id: 2, title: 'Brand Launch: NEXA', category: 'Commercial', image: 'https://images.unsplash.com/photo-1551818255-e6e10975bc17?auto=format&fit=crop&q=80&w=2070', type: 'video' },
    { id: 3, title: 'Corporate Summit 2024', category: 'Corporate', image: 'https://images.unsplash.com/photo-1475721027785-f74dea327912?auto=format&fit=crop&q=80&w=2070', type: 'image' },
    { id: 4, title: 'Artist Spotlight', category: 'Interviews', image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&q=80&w=2070', type: 'video' },
    { id: 5, title: 'Gala Night Coverage', category: 'Live Events', image: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&q=80&w=2070', type: 'image' },
    { id: 6, title: 'Product Cinematography', category: 'Commercial', image: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&q=80&w=2012', type: 'video' },
  ];

  const projects = [...dbProjects, ...staticProjects];

  const categories = ['all', 'Live Events', 'Commercial', 'Corporate', 'Interviews'];

  const filteredProjects = filter === 'all' ? projects : projects.filter(p => p.category === filter);


  return (
    <div className="py-24 space-y-24 mb-32">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="space-y-4">
          <h4 className="text-primary font-display font-bold uppercase tracking-[0.5em] text-xs">Curated Work</h4>
          <h1 className="text-6xl sm:text-8xl font-display font-bold text-white tracking-tighter leading-[0.9] italic">
            Visual Portfolio.
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-8">
          <Filter className="w-5 h-5 text-gray-600 mr-2" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={cn(
                "px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all",
                filter === cat ? "bg-primary text-white" : "glass text-gray-500 hover:text-white"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredProjects.map((project) => (
              <motion.div
                key={project.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4 }}
                className="group relative aspect-[4/5] rounded-[2.5rem] overflow-hidden bg-surface border border-white/5"
              >
                <img 
                  src={project.image} 
                  alt={project.title} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-70 group-hover:opacity-40"
                  referrerPolicy="no-referrer"
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60 transition-opacity group-hover:opacity-100" />
                
                <div className="absolute inset-0 p-8 flex flex-col justify-end">
                   <div className="space-y-4 translate-y-6 group-hover:translate-y-0 transition-transform duration-500">
                      <p className="text-[10px] uppercase tracking-widest font-black text-primary">{project.category}</p>
                      <h4 className="text-2xl font-display font-bold text-white">{project.title}</h4>
                      
                      <div className="flex space-x-3 opacity-0 group-hover:opacity-100 transition-opacity delay-100">
                        <button 
                          onClick={() => setPlayingVideo(project)}
                          className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
                        >
                          {project.type === 'video' ? <Play className="w-4 h-4 fill-current ml-0.5" /> : <ZoomIn className="w-4 h-4" />}
                        </button>
                        {(project.youtube_id || project.stream_url) && (
                          <a 
                            href={project.youtube_id ? `https://youtube.com/watch?v=${project.youtube_id}` : project.stream_url} 
                            target="_blank" rel="noopener noreferrer"
                            className="w-10 h-10 bg-surface rounded-full flex items-center justify-center text-white hover:bg-primary transition-colors border border-white/10"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                   </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>

      {/* Video Reel Accent */}
      <section className="bg-primary py-32 overflow-hidden relative">
        <div className="absolute inset-0 opacity-10 flex space-x-10 -rotate-12 translate-y-20 scale-150">
           {Array.from({ length: 4 }).map((_, i) => (
             <div key={i} className="flex flex-col space-y-10">
                {Array.from({ length: 5 }).map((_, j) => (
                   <div key={j} className="w-96 aspect-video bg-white rounded-3xl" />
                ))}
             </div>
           ))}
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
           <h2 className="text-6xl sm:text-8xl font-display font-black text-white italic tracking-tighter opacity-20 absolute -top-10 left-0 w-full select-none">PORTFOLIO</h2>
           <h3 className="text-4xl sm:text-5xl font-display font-bold text-white mb-8">Capturing Excellence Across the Globe.</h3>
           <Link to="/contact" className="inline-flex items-center space-x-4 bg-white text-primary px-12 py-5 rounded-full font-black uppercase tracking-widest text-sm hover:scale-105 transition-transform">
              <span>Work With Us</span>
              <ExternalLink className="w-5 h-5" />
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
