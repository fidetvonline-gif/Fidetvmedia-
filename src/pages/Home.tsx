import { SEO } from '@/components/SEO';
import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Calendar, Users, ArrowRight, Video, Zap, CheckCircle, Flame, Sparkles, Globe, Shield, X, MessageSquare, Newspaper, Monitor, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import ReactPlayer from 'react-player';
import { PortfolioItem, News } from '@/types';
import { format } from 'date-fns';
import AdBanner from '@/components/AdBanner';

import HighPerformancePlayer from '@/components/HighPerformancePlayer';

const Player = ReactPlayer as any;

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

export default function Home() {
  const navigate = useNavigate();
  const [certUrl, setCertUrl] = useState('');
  const [smedanUrl, setSmedanUrl] = useState('');
  const [playingVideo, setPlayingVideo] = useState<PortfolioItem | null>(null);
  const [featuredPortfolio, setFeaturedPortfolio] = useState<PortfolioItem[]>([]);
  const [latestNews, setLatestNews] = useState<News[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { scrollYProgress } = useScroll();
  const yBg = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const opacityHero = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  useEffect(() => {
    fetchCertificates();
    fetchFeaturedPortfolio();
    fetchUpcomingEvents();
    fetchLatestNews();
  }, []);

  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);

  const fetchLatestNews = async () => {
    const { data } = await supabase
      .from('news')
      .select('*, profiles(username)')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(3);
    if (data) setLatestNews(data as any);
  };

  const fetchUpcomingEvents = async () => {
    const { data } = await supabase
      .from('events')
      .select('*')
      .or('status.eq.live,status.eq.upcoming')
      .order('status', { ascending: false })
      .order('start_time', { ascending: true })
      .limit(3);
    if (data) setUpcomingEvents(data);
  };

  const fetchFeaturedPortfolio = async () => {
    try {
      const { data, error } = await supabase
        .from('portfolio_items')
        .select('*')
        .eq('is_featured', true)
        .order('created_at', { ascending: false });
        
      if (!error && data && data.length > 0) {
        setFeaturedPortfolio(data);
      } else {
        // Fallback or empty state if table not setup yet
        const defaultShows: unknown = [
          { id: '1', title: 'Emeritus director of information has a message for us all', category: 'Campus Matters', image_url: `https://img.youtube.com/vi/0D-zn6YAqCY/maxresdefault.jpg`, youtube_id: '0D-zn6YAqCY', description: 'Emeritus director of information has a message for us all - Campus matters', is_featured: true, created_at: '' },
          { id: '2', title: 'If Shallipopi & Davido Catch This Girl...', category: 'Interviews', image_url: `https://img.youtube.com/vi/VyxGvAzBQGY/maxresdefault.jpg`, youtube_id: 'VyxGvAzBQGY', description: 'If Shallipopi & Davido Catch This Girl, You Won\'t Believe What Happens..', is_featured: true, created_at: '' },
          { id: '3', title: 'How can a girl who says she loves me be opening her eyes...', category: 'Love Affairs', image_url: `https://img.youtube.com/vi/w24bsyvgMjs/maxresdefault.jpg`, youtube_id: 'w24bsyvgMjs', description: 'How can a girl who says she loves me be opening her eyes every time we are kissing? - Love affair', is_featured: true, created_at: '' }
        ];
        setFeaturedPortfolio(defaultShows as PortfolioItem[]);
      }
    } catch {
      // ignore
    }
  };

  // Video cleanup logic removed to avoid "media resource was aborted by the user agent"
  // React / the browser handles video unmounting naturally without this.

  // Hardcoded shows removed to use DB state

  const fetchCertificates = async () => {
    const cac = supabase.storage.from('event-thumbnails').getPublicUrl('cac_certificate').data.publicUrl;
    const smedan = supabase.storage.from('event-thumbnails').getPublicUrl('smedan_certificate').data.publicUrl;
      
    try {
      const resCac = await fetch(cac, { method: 'HEAD' });
      if (resCac.ok) {
        setCertUrl(cac + '?t=' + Date.now());
      }
    } catch (e) {}

    try {
      const resSmedan = await fetch(smedan, { method: 'HEAD' });
      if (resSmedan.ok) {
        setSmedanUrl(smedan + '?t=' + Date.now());
      }
    } catch (e) {}
  };

  const bentoItems = [
    {
      title: 'Digital Engineering',
      description: 'Sophisticated web and mobile architectures built for scale.',
      icon: Monitor,
      className: 'md:col-span-2 md:row-span-2 bg-gradient-to-br from-surface to-surface-bright border-primary/20 hover:border-primary/50',
      delay: 0.1,
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1200'
    },
    {
      title: 'Cinematic Production',
      description: 'High-end visual storytelling.',
      icon: Video,
      className: 'md:col-span-1 md:row-span-1 bg-surface border-white/5 hover:bg-surface-bright',
      delay: 0.2
    },
    {
      title: 'Global Streaming',
      description: 'Zero-latency broadcasting.',
      icon: Globe,
      className: 'md:col-span-1 md:row-span-1 bg-primary/10 border-primary/20 hover:bg-primary/20 text-primary-light',
      delay: 0.3
    },
    {
      title: 'Hub Ecosystems',
      description: 'Crafting intuitive mobile experiences.',
      icon: Smartphone,
      className: 'md:col-span-2 md:row-span-1 bg-surface border-white/5 hover:border-white/20',
      delay: 0.4
    }
  ];

  return (
    <div className="relative pb-32 overflow-hidden bg-background">
      <SEO title="Home" description="Welcome to FideTV Media - Your partner in innovative media production, web development, and digital strategy." />
      {/* Video Modal */}
      <AnimatePresence>
        {playingVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 sm:p-8"
            onClick={() => setPlayingVideo(null)}
          >
            <div 
              className="relative w-full max-w-6xl aspect-video bg-black rounded-[3rem] overflow-hidden shadow-[0_0_100px_-20px_rgba(0,0,0,0.5)] border border-white/10"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setPlayingVideo(null)}
                className="absolute top-8 right-8 z-50 p-4 bg-black/50 hover:bg-white/10 rounded-full text-white backdrop-blur-md transition-all opacity-100"
              >
                <X className="w-6 h-6" />
              </button>
              {playingVideo?.youtube_id ? (
                  playingVideo.youtube_id.includes('<iframe') ? (
                     <div className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full" dangerouslySetInnerHTML={{ __html: playingVideo.youtube_id }} />
                  ) : (
                    <iframe 
                      src={playingVideo.youtube_id.includes('http') ? playingVideo.youtube_id : `https://www.youtube.com/embed/${playingVideo.youtube_id}?autoplay=1&modestbranding=1&rel=0`}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  )
                ) : playingVideo?.video_url?.toLowerCase().includes('youtube.com') || playingVideo?.video_url?.toLowerCase().includes('youtu.be') ? (
                  <Player 
                    url={playingVideo?.video_url}
                    width="100%"
                    height="100%"
                    controls={true}
                    playing={true}
                    playsinline={true}
                  />
                ) : (
                  <HighPerformancePlayer 
                    url={playingVideo?.video_url}
                    playing={true}
                    muted={false}
                    controls={true}
                  />
                )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Orbs */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] mix-blend-screen pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[700px] h-[700px] bg-orange-500/5 rounded-full blur-[180px] mix-blend-screen pointer-events-none" />

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col justify-center py-20 px-4 sm:px-6 lg:px-8">
        <motion.div style={{ y: yBg, opacity: opacityHero }} className="absolute inset-0 z-0">
          <video 
            ref={videoRef}
            src="https://cdn.coverr.co/videos/coverr-camera-recording-a-music-festival-4663/1080p.mp4"
            autoPlay
            loop 
            muted 
            playsInline
            className="w-full h-full object-cover opacity-30 mix-blend-luminosity scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent" />
        </motion.div>

        <div className="relative z-10 max-w-7xl mx-auto w-full flex flex-col justify-center h-full">
          <motion.div
            initial={{ opacity: 0, filter: 'blur(20px)', y: 40 }}
            animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-4 px-6 py-2.5 rounded-full bg-surface-bright/30 border border-border-custom backdrop-blur-2xl mb-12 shadow-2xl">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.5em] text-foreground opacity-80 font-mono">EST. 2021 • PREMIUM STUDIO</span>
            </div>
            
            <h1 className="text-5xl sm:text-8xl md:text-9xl lg:text-[11rem] xl:text-[14rem] leading-[0.8] font-display font-black uppercase text-foreground tracking-tighter mb-12">
              BEYOND<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-400 to-primary-light italic font-medium">
                DIGITAL.
              </span>
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 1.2 }}
            className="max-w-4xl"
          >
            <p className="text-xl sm:text-3xl text-text-muted font-serif font-light mb-14 leading-tight italic opacity-70">
              FideTV is an elite creative agency architecting digital excellence across media production, software engineering, and global strategy.
            </p>

            <div className="flex flex-col sm:flex-row flex-wrap gap-6 items-start sm:items-center">
              <Link
                to="/services"
                className="group w-full sm:w-auto px-12 sm:px-16 py-6 bg-primary text-white font-black uppercase tracking-[0.3em] text-xs flex items-center justify-center space-x-6 hover:bg-primary/90 rounded-[2rem] transition-all shadow-2xl shadow-primary/20"
              >
                <span>The Ecosystem</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </Link>
              
              <button 
                onClick={() => navigate('/live')}
                className="group w-full sm:w-auto px-12 py-6 bg-surface-bright/50 border border-border-custom backdrop-blur-xl text-foreground font-black uppercase tracking-[0.3em] text-xs flex items-center justify-center space-x-4 hover:bg-surface rounded-[2rem] transition-all shadow-xl"
              >
                <div className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Play className="w-5 h-5 fill-current ml-1" />
                </div>
                <span>Broadcast Live</span>
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Shows Horizontal Scroller */}
      <section className="py-32 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
          <div className="flex flex-col sm:flex-row justify-between items-end gap-16">
            <div className="space-y-8">
              <span className="text-[10px] font-black uppercase text-primary tracking-[0.6em]">Original Frameworks</span>
              <h2 className="text-5xl sm:text-7xl md:text-9xl font-display font-medium text-foreground tracking-tighter leading-none italic">
                Signature<br />
                Masterpieces.
              </h2>
            </div>
            <Link to="/content" className="group flex items-center space-x-6 px-10 py-5 border border-border-custom rounded-3xl hover:border-foreground/20 transition-all text-[10px] font-black uppercase tracking-[0.4em] text-foreground bg-surface-bright/20 backdrop-blur-md">
              <span>Enter Content Hub</span>
              <ArrowRight className="w-6 h-6 group-hover:translate-x-3 transition-transform" />
            </Link>
          </div>
        </div>

        <div className="flex gap-10 px-4 sm:px-20 overflow-x-auto pb-20 no-scrollbar snap-x">
          {featuredPortfolio.map((show, i) => (
            <motion.div
              key={show.id || i}
              initial={{ opacity: 0, x: 100 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1, duration: 0.8 }}
              viewport={{ once: true }}
              className="flex-shrink-0 w-[85vw] sm:w-[600px] snap-center"
            >
              <div className="group relative aspect-[4/5] rounded-[4rem] overflow-hidden border border-border-custom bg-surface mb-10 shadow-2xl">
                <img src={show.image_url || `https://images.unsplash.com/photo-1523050335392-9beffa5d2205?auto=format&fit=crop&q=80&w=600`} alt={show.title} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-50 group-hover:opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                <div className="absolute inset-0 p-12 sm:p-16 flex flex-col justify-end pointer-events-none">
                   <div className="space-y-6">
                      <span className="text-[10px] font-black uppercase text-primary tracking-[0.5em]">{show.category}</span>
                      <h3 className="text-4xl sm:text-6xl font-display font-bold text-foreground tracking-tighter leading-none italic">{show.title}</h3>
                   </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                   {show.youtube_id || show.video_url ? (
                     <button onClick={() => setPlayingVideo(show)} className="w-24 h-24 sm:w-32 sm:h-32 bg-primary/20 hover:bg-primary backdrop-blur-xl border border-white/20 rounded-full flex items-center justify-center text-white scale-90 group-hover:scale-100 transition-all duration-500 shadow-2xl pointer-events-auto">
                       <Play className="w-12 h-12 sm:w-16 sm:h-16 fill-current ml-2 sm:ml-3" />
                     </button>
                   ) : null}
                </div>
              </div>
              <p className="text-text-muted font-serif font-light text-xl sm:text-2xl leading-relaxed px-10 italic opacity-60 group-hover:opacity-100 transition-opacity">
                "{show.description}"
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pb-12">
          <AdBanner placement="Home Portfolio Bottom" />
      </div>

      {/* Metrics Section */}
      <section className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10">
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8"
        >
          {[
            { label: 'Live Events', value: '150+', icon: Calendar },
            { label: 'Viewers', value: '100K+', icon: Users },
            { label: 'Projects', value: '500+', icon: Video },
            { label: 'Countries', value: '12', icon: Globe },
          ].map((stat, i) => (
            <motion.div
              variants={fadeInUp}
              key={i}
              className="p-6 sm:p-8 bg-surface border border-border-custom rounded-3xl hover:bg-surface-bright transition-colors shadow-sm"
            >
              <stat.icon className="w-6 h-6 text-primary mb-6" />
              <h3 className="text-3xl sm:text-5xl font-display font-bold text-foreground mb-2">{stat.value}</h3>
              <p className="text-xs text-text-muted font-bold tracking-widest uppercase">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {(certUrl || smedanUrl) && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-8 p-1 relative overflow-hidden rounded-3xl bg-gradient-to-r from-green-500/20 via-primary/20 to-blue-500/20"
          >
            <div className="bg-surface-bright p-6 sm:p-8 rounded-[22px] flex flex-col items-start justify-center gap-6 backdrop-blur-xl">
              <div className="flex items-center gap-6 mb-2">
                 <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 border border-green-500/20">
                   <Shield className="w-8 h-8 text-green-500" />
                 </div>
                 <div>
                   <h4 className="text-foreground font-bold text-lg sm:text-xl mb-2">Officially Registered & Recognized</h4>
                   <p className="text-text-muted text-sm max-w-xl italic">FIDE TV MEDIA is fully registered and certified. We are committed to professional and trusted media services.</p>
                 </div>
              </div>
              
              <div className="flex flex-wrap gap-4 w-full">
                {certUrl && (
                  <a href={certUrl} target="_blank" rel="noopener noreferrer" className="px-8 py-4 bg-foreground text-background text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-primary hover:text-white transition-all flex items-center space-x-2 flex-grow sm:flex-grow-0 justify-center shadow-lg">
                    <span>View CAC Registration</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </a>
                )}
                {smedanUrl && (
                  <a href={smedanUrl} target="_blank" rel="noopener noreferrer" className="px-8 py-4 bg-foreground text-background text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-primary hover:text-white transition-all flex items-center space-x-2 flex-grow sm:flex-grow-0 justify-center shadow-lg">
                    <span>View SMEDAN Certificate</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </section>

      {/* Upcoming Events Section */}
      {upcomingEvents.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest">
                <Calendar className="w-4 h-4" />
                Live Broadcast
              </div>
              <h3 className="text-5xl sm:text-7xl font-display font-bold text-foreground tracking-tight">
                Upcoming <span className="text-foreground/40 italic">Events.</span>
              </h3>
            </div>
            <Link to="/live" className="group flex items-center space-x-3 bg-surface border border-border-custom px-8 py-4 rounded-full text-text-muted hover:text-foreground font-bold uppercase tracking-widest text-sm transition-all shadow-sm">
              <span>Full Schedule</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {upcomingEvents.map((ev, i) => (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group relative h-[450px] rounded-[3rem] overflow-hidden border border-border-custom bg-surface hover:border-primary/30 transition-all shadow-lg"
              >
                <img 
                  src={ev.thumbnail_url || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=2070'} 
                  alt={ev.title} 
                  className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-all duration-700" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                
                <div className="absolute top-8 left-8 flex gap-3">
                  <div className="px-4 py-2 bg-background/60 backdrop-blur-xl border border-border-custom rounded-full flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", ev.status === 'live' ? "bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]" : "bg-primary")} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-foreground">{ev.status}</span>
                  </div>
                </div>

                <div className="absolute bottom-8 left-8 right-8 space-y-4">
                  <div className="flex items-center gap-2 text-text-muted text-[10px] font-medium uppercase tracking-widest">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span>{format(new Date(ev.start_time), 'MMM dd, yyyy • HH:mm')}</span>
                  </div>
                  <h3 className="text-2xl font-display font-medium text-white line-clamp-2">{ev.title}</h3>
                  <Link to="/live" className="inline-flex items-center justify-center w-12 h-12 bg-primary rounded-2xl transition-all shadow-xl text-white hover:scale-110">
                    <Play className="w-5 h-5 fill-current ml-1" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Bento Grid Services Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest">
              <CheckCircle className="w-4 h-4" />
              Our Expertise
            </div>
            <h3 className="text-5xl sm:text-7xl font-display font-bold text-foreground leading-[0.9] tracking-tight">
              Elevating Every<br />Frame We Capture.
            </h3>
          </div>
          <Link to="/services" className="group flex items-center space-x-3 bg-surface border border-border-custom px-8 py-4 rounded-full text-text-muted hover:text-foreground font-bold uppercase tracking-widest text-sm transition-all shadow-sm">
            <span>All Services</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-4 sm:gap-6 min-h-[600px]">
          {bentoItems.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: item.delay, duration: 0.6 }}
              className={cn(
                "group relative overflow-hidden rounded-[2rem] p-8 sm:p-10 flex flex-col justify-between border transition-all duration-500",
                item.className
              )}
            >
              {item.image && (
                <div className="absolute inset-0 z-0">
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover opacity-20 group-hover:opacity-40 group-hover:scale-105 transition-all duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
                </div>
              )}
              <div className="relative z-10 w-16 h-16 rounded-2xl bg-foreground/10 flex items-center justify-center mb-12 backdrop-blur-md border border-border-custom text-foreground group-hover:-rotate-6 group-hover:scale-110 transition-all duration-500">
                <item.icon className="w-8 h-8" />
              </div>
              <div className="relative z-10 mt-auto">
                <h4 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-3">{item.title}</h4>
                <p className="text-text-muted group-hover:text-foreground transition-colors leading-relaxed italic">
                  {item.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Blog/News Section */}
      {latestNews.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest">
                <Newspaper className="w-4 h-4" />
                Latest Insights
              </div>
              <h3 className="text-5xl sm:text-7xl font-display font-bold text-foreground leading-[0.9] tracking-tight">
                Studio <span className="text-foreground/40 italic">Journal.</span>
              </h3>
            </div>
            <Link to="/news" className="group flex items-center space-x-3 bg-surface border border-border-custom px-8 py-4 rounded-full text-text-muted hover:text-foreground font-bold uppercase tracking-widest text-sm transition-all shadow-sm">
              <span>View All Posts</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {latestNews.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group flex flex-col bg-surface border border-border-custom rounded-[2.5rem] overflow-hidden hover:bg-surface-bright transition-all duration-500 shadow-xl shadow-black/5 relative"
              >
                <Link to={`/news/${item.slug || item.id}`} className="absolute inset-0 z-20" aria-label={`Read ${item.title}`} />
                <div className="flex flex-col h-full relative z-10 pointer-events-none">
                  <div className="aspect-[16/10] overflow-hidden relative">
                    <img 
                      src={item.image_url || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=800'} 
                      alt={item.title} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                    />
                    <div className="absolute top-6 left-6 z-30 pointer-events-auto">
                      <span className="bg-primary/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border border-border-custom shadow-lg">
                        {item.category || 'Editorial'}
                      </span>
                    </div>
                  </div>
                  <div className="p-8 space-y-4 flex flex-col flex-grow">
                    <div className="flex items-center space-x-4 text-[10px] uppercase font-black tracking-widest text-text-muted">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{format(new Date(item.created_at), 'MMMM dd, yyyy')}</span>
                        </div>
                    </div>
                    <h4 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                      {item.title}
                    </h4>
                    <p className="text-text-muted text-sm line-clamp-2 leading-relaxed flex-grow">
                      {item.excerpt || item.description}
                    </p>
                    <div className="pt-6 flex items-center justify-between border-t border-border-custom">
                       <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">{item.profiles?.username || 'Admin'}</span>
                       <ArrowRight className="w-5 h-5 text-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="mt-12 text-center max-w-4xl mx-auto">
             <AdBanner placement="Home News Bottom" />
          </div>
        </section>
      )}

      {/* Heroic CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative rounded-[3rem] overflow-hidden bg-gradient-to-br from-primary to-orange-600 p-12 sm:p-24 text-center border border-white/20"
        >
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/20 rounded-full blur-[100px] -mr-32 -mt-32 mix-blend-overlay pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-black/20 rounded-full blur-[100px] -ml-32 -mb-32 mix-blend-overlay pointer-events-none" />
          
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-5xl md:text-7xl md:text-8xl font-display font-black text-white mb-8 leading-[0.9] tracking-tighter">
              Ready to broadcast<br />your vision?
            </h2>
            <p className="text-white/90 max-w-2xl mx-auto mb-12 text-lg sm:text-xl font-medium">
              Whether it's a live event, a corporate interview, or a creative project, we have the tools and talent to make it extraordinary.
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center space-x-4 bg-background text-foreground px-12 py-6 rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-105 hover:shadow-2xl hover:shadow-background/50 transition-all font-display"
            >
              <span>Start a Project</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
