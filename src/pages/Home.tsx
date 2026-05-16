import { SEO } from '@/components/SEO';
import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Calendar, Users, ArrowRight, Video, Zap, CheckCircle, Flame, Sparkles, Globe, Shield, X, MessageSquare, Newspaper } from 'lucide-react';
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
      title: 'Cinematic Production',
      description: 'High-end cinematography mapping your brand identity.',
      icon: Video,
      className: 'md:col-span-2 md:row-span-2 bg-gradient-to-br from-surface to-surface-bright border-primary/20 hover:border-primary/50',
      delay: 0.1,
      image: 'https://images.unsplash.com/photo-1601506521937-0121a7fc2a6b?auto=format&fit=crop&q=80&w=1200'
    },
    {
      title: 'Global Streaming',
      description: 'Zero-latency broadcasting.',
      icon: Globe,
      className: 'md:col-span-1 md:row-span-1 bg-surface border-white/5 hover:bg-surface-bright',
      delay: 0.2
    },
    {
      title: 'Creative Strategy',
      description: 'Dominate the digital sphere.',
      icon: Zap,
      className: 'md:col-span-1 md:row-span-1 bg-primary/10 border-primary/20 hover:bg-primary/20 text-primary-light',
      delay: 0.3
    },
    {
      title: 'Live Event Mastery',
      description: 'Unforgettable experiences captured in real-time.',
      icon: Flame,
      className: 'md:col-span-2 md:row-span-1 bg-surface border-white/5 hover:border-white/20',
      delay: 0.4
    }
  ];

  return (
    <div className="relative pb-32 overflow-hidden bg-background">
      <SEO title="Home" description="Welcome to FideTV Media - Your partner in innovative media production, live streaming, and cinematography." />
      {/* Video Modal */}
      <AnimatePresence>
        {playingVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 sm:p-8"
            onClick={() => setPlayingVideo(null)}
          >
            <div 
              className="relative w-full max-w-6xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setPlayingVideo(null)}
                className="absolute top-4 right-4 z-50 p-2 bg-black/50 hover:bg-white/10 rounded-full text-white backdrop-blur-md transition-all opacity-100"
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
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] mix-blend-screen pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[150px] mix-blend-screen pointer-events-none" />

      {/* Hero Section */}
      <section className="relative min-h-[75vh] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
        <motion.div style={{ y: yBg, opacity: opacityHero }} className="absolute inset-0 z-0">
          <video 
            ref={videoRef}
            src="https://cdn.coverr.co/videos/coverr-camera-recording-a-music-festival-4663/1080p.mp4"
            autoPlay
            loop 
            muted 
            playsInline
            className="w-full h-full object-cover opacity-50 mix-blend-luminosity scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />
        </motion.div>

        <div className="relative z-10 max-w-7xl mx-auto w-full flex flex-col justify-center h-full gap-6 lg:gap-10">
          <motion.div
            initial={{ opacity: 0, filter: 'blur(10px)', y: 20 }}
            animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          >
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-surface-bright/20 border border-border-custom backdrop-blur-xl mb-8 shadow-2xl">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.4em] text-foreground">FIDE TV MEDIA</span>
            </div>
            
            <h1 className="text-4xl sm:text-6xl md:text-8xl lg:text-[10rem] xl:text-[12rem] leading-[0.8] font-display font-black uppercase text-foreground tracking-tighter mix-blend-difference mb-8">
              INNOVATIVE<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-400 to-primary-light animate-gradient-x">
                AGENCY.
              </span>
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 1 }}
            className="max-w-3xl"
          >
            <p className="text-lg sm:text-2xl text-text-muted font-light mb-10 sm:mb-12 leading-relaxed tracking-tight border-l-4 border-primary pl-6">
               FideTV is an innovative agency that specializes in various services to help individuals and businesses thrive in the digital landscape.
            </p>

            <AdBanner placement="Home Hero Bottom" className="mb-8" />

            <div className="flex flex-col sm:flex-row flex-wrap gap-5 items-start sm:items-center">
              <Link
                to="/services"
                className="group w-full sm:w-auto px-8 sm:px-10 py-5 bg-primary text-white font-black uppercase tracking-widest text-xs flex items-center justify-center space-x-4 hover:bg-primary/90 rounded-2xl transition-all shadow-xl shadow-primary/20"
              >
                <span>Explore Services</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <button 
                onClick={() => navigate('/live')}
                className="group w-full sm:w-auto px-8 sm:px-10 py-5 bg-surface-bright border border-border-custom backdrop-blur-md text-foreground font-black uppercase tracking-widest text-xs flex items-center justify-center space-x-3 hover:bg-surface rounded-2xl transition-all shadow-lg"
              >
                <div className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </div>
                <span>Watch Live TV</span>
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Shows Horizontal Scroller */}
      <section className="py-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
          <div className="flex flex-col sm:flex-row justify-between items-end gap-10">
            <div className="space-y-6">
              <span className="text-[10px] font-black uppercase text-primary tracking-[0.5em]">Original Programming</span>
              <h2 className="text-4xl sm:text-6xl md:text-8xl font-display font-medium text-foreground tracking-tighter leading-none italic">
                Signature<br />
                Productions.
              </h2>
            </div>
            <Link to="/content" className="group flex items-center space-x-4 px-8 py-4 border border-border-custom rounded-2xl hover:border-foreground/20 transition-all text-[10px] font-black uppercase tracking-widest text-foreground">
              <span>Enter Content Hub</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </Link>
          </div>
        </div>

        <div className="flex gap-8 px-4 sm:px-10 overflow-x-auto pb-12 no-scrollbar snap-x">
          {featuredPortfolio.map((show, i) => (
            <motion.div
              key={show.id || i}
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="flex-shrink-0 w-[300px] sm:w-[500px] snap-start"
            >
              <div className="group relative aspect-[4/5] rounded-[3rem] overflow-hidden border border-border-custom bg-surface mb-8">
                <img src={show.image_url || `https://images.unsplash.com/photo-1523050335392-9beffa5d2205?auto=format&fit=crop&q=80&w=500`} alt={show.title} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 opacity-60 group-hover:opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                <div className="absolute inset-0 p-8 sm:p-10 flex flex-col justify-end pointer-events-none">
                   <div className="space-y-4">
                      <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em]">{show.category}</span>
                      <h3 className="text-3xl sm:text-5xl font-display font-bold text-foreground tracking-tight leading-none">{show.title}</h3>
                   </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                   {show.youtube_id || show.video_url ? (
                     <button onClick={() => setPlayingVideo(show)} className="w-16 h-16 sm:w-20 sm:h-20 bg-foreground/20 hover:bg-primary backdrop-blur-md rounded-full flex items-center justify-center text-white scale-90 group-hover:scale-100 transition-all duration-300 shadow-2xl pointer-events-auto">
                       <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-current ml-1 sm:ml-2" />
                     </button>
                   ) : null}
                </div>
              </div>
              <p className="text-text-muted font-light text-lg leading-relaxed px-6 italic">
                "{show.description}"
              </p>
            </motion.div>
          ))}
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pb-12">
            <AdBanner placement="Home Portfolio Bottom" />
        </div>
      </section>

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
