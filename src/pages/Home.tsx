import { SEO } from '@/components/SEO';
import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Calendar, Users, ArrowRight, Video, Zap, CheckCircle, Flame, Sparkles, Globe, Shield, X, MessageSquare, Newspaper, Monitor, Smartphone, BarChart3, Radio, Heart, Phone, Award, Instagram, Linkedin, ExternalLink, Tv, Headphones } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import ReactPlayer from 'react-player';
import { PortfolioItem, News } from '@/types';
import { format } from 'date-fns';
import OptimizedImage from '@/components/OptimizedImage';
import AdBanner from '@/components/AdBanner';
import { DEFAULT_CHANNELS } from '@/constants/channels';
import HighPerformancePlayer from '@/components/HighPerformancePlayer';

const Player = ReactPlayer as any;

const fadeInUp: any = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const staggerContainer: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
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
  const [displayedChannels, setDisplayedChannels] = useState<any[]>([]);
  const [displayedVideos, setDisplayedVideos] = useState<PortfolioItem[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { scrollYProgress } = useScroll();
  const yBg = useTransform(scrollYProgress, [0, 0.5], ['0%', '20%']);
  const opacityHero = useTransform(scrollYProgress, [0, 0.3], [1, 0]);

  const [heroImageUrl, setHeroImageUrl] = useState<string>('');
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>(DEFAULT_CHANNELS);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Dynamic automatic rotation of channels every 2 minutes (120000ms)
  useEffect(() => {
    if (channels.length > 0) {
      const rotate = () => {
        const shuffled = [...channels].sort(() => 0.5 - Math.random());
        setDisplayedChannels(shuffled.slice(0, 3));
      };
      rotate();
      const interval = setInterval(rotate, 120000);
      return () => clearInterval(interval);
    }
  }, [channels]);

  // Dynamic automatic rotation of portfolio videos every 2 minutes (120000ms)
  useEffect(() => {
    if (featuredPortfolio.length > 0) {
      const rotate = () => {
        const shuffled = [...featuredPortfolio].sort(() => 0.5 - Math.random());
        setDisplayedVideos(shuffled.slice(0, 3));
      };
      rotate();
      const interval = setInterval(rotate, 120000);
      return () => clearInterval(interval);
    }
  }, [featuredPortfolio]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    fetchCertificates();
    fetchFeaturedPortfolio();
    fetchUpcomingEvents();
    fetchLatestNews();
    fetchSiteSettings();
    fetchTvChannels();
    checkAdmin();

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const fetchTvChannels = async () => {
    try {
      const { data, error } = await supabase
        .from('tv_channels')
        .select('*')
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: false });
        
      if (!error && data && data.length > 0) {
        const mappedChannels = data.map((ch: any) => ({
          id: ch.id,
          name: ch.name,
          category: ch.category || 'General',
          thumbnail: ch.thumbnail || 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e',
          url: ch.url,
          icon: Tv,
          description: ch.description || 'Watch live broadcast stream.',
          isLive: ch.is_active ?? true
        }));
        
        // Merge so we always have at least 3 channels, prepending database ones
        const merged = [...mappedChannels];
        DEFAULT_CHANNELS.forEach(defCh => {
          if (!merged.some(m => m.id === defCh.id || m.name.toLowerCase() === defCh.name.toLowerCase())) {
            merged.push(defCh);
          }
        });
        setChannels(merged);
      } else {
        setChannels(DEFAULT_CHANNELS);
      }
    } catch (err) {
      console.error('Error fetching tv channels:', err);
      setChannels(DEFAULT_CHANNELS);
    }
  };

  const checkAdmin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email === 'fidetvonline@gmail.com') {
        setIsAdmin(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSiteSettings = async () => {
    try {
      const { data, error } = await supabase.from('site_settings').select('*');
      if (!error && data) {
        const settings = data.reduce((acc: any, curr: any) => {
          acc[curr.key] = curr.value;
          return acc;
        }, {});
        if (settings.hero_image_url) {
          setHeroImageUrl(settings.hero_image_url);
        }
        if (settings.team_members) {
          try {
            setTeamMembers(JSON.parse(settings.team_members));
          } catch (e) {
            console.error('Error parsing team members:', e);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching site settings', err);
    }
  };

  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);

  const fetchLatestNews = async () => {
    try {
      const { data } = await supabase
        .from('news')
        .select('*, profiles(username)')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(3);
      if (data) setLatestNews(data as any);
    } catch (err) {
      console.error('Error fetching latest news:', err);
    }
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

  const fetchUpcomingEvents = async () => {
    try {
      const { data } = await supabase
        .from('events')
        .select('*')
        .or('status.eq.live,status.eq.upcoming')
        .order('status', { ascending: false })
        .order('start_time', { ascending: true })
        .limit(3);
      if (data) setUpcomingEvents(data);
    } catch (err) {
      console.error('Error fetching upcoming events:', err);
    }
  };

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
      title: 'Beautiful Video & Film Coverage',
      description: 'We shoot crystal-clear, high-definition videos for weddings, funerals, birthdays, church events, and business needs.',
      icon: Video,
      className: 'md:col-span-2 md:row-span-1 bg-gradient-to-br from-surface to-surface-bright border-border-custom hover:border-primary/40',
      delay: 0.1,
      image: 'https://images.unsplash.com/photo-1492694223066-81342ee5ff30?auto=format&fit=crop&q=80&w=1200'
    },
    {
      title: 'Live Stream Broadcasting',
      description: 'Stream your ceremonies, church events, or conferences directly to YouTube, Facebook, or we can host it right here for your friends abroad to watch easily.',
      icon: Radio,
      className: 'md:col-span-1 md:row-span-1 bg-surface border-border-custom hover:border-primary/40',
      delay: 0.2
    },
    {
      title: 'Custom Website Design',
      description: 'Get a fast, clean, and beautiful website. No complicated tech talk—just a simple, gorgeous setup styled to attract more customers or display your organization.',
      icon: Monitor,
      className: 'md:col-span-1 md:row-span-1 bg-surface border-border-custom hover:border-primary/40 text-primary-light',
      delay: 0.3
    },
    {
      title: 'Smart Business & Brand Ads',
      description: 'We help you design beautiful marketing flyers, set up social media advertisements, and guide your strategy to make sure people find and love your business.',
      icon: BarChart3,
      className: 'md:col-span-2 md:row-span-1 bg-surface-bright/70 border-border-custom hover:border-primary/40',
      delay: 0.4
    }
  ];

  // Layman-friendly customer reviews
  const testimonials = [
    {
      name: "Mrs. Sarah Ogunleye",
      role: "Bride (Wedding Live Stream Client)",
      quote: "FideTV streamed our wedding live and our family in Canada and the UK felt like they were in the hall with us! The video was very clear, their staff were polite, and there was no stress at all.",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150"
    },
    {
      name: "Pastor Emmanuel David",
      role: "Grace Life Ministry",
      quote: "We hired FideTV to cover our annual church convention and stream it. They arrived early, had professional equipment, and the sound quality was perfect. Highly recommended for any serious organization.",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150"
    },
    {
      name: "Chinedu Alvan",
      role: "Founder, Bestway Deliveries",
      quote: "I wanted a website but didn't know anything about domain names or hosting. The FideTV team explained everything in simple words and built a beautiful, fast website for my business in a few days. Now I get calls regularly!",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150"
    }
  ];

  return (
    <div className="relative pb-32 overflow-hidden bg-background">
      <SEO title="Home - Professional Video, Live Streaming & Web Design" description="We bring your visions to life. FideTV Media provides high-quality video production, live event streaming, and beautiful, simple website creation." />

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
              className="relative w-full max-w-5xl aspect-video bg-black rounded-[2rem] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)] border border-white/10"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setPlayingVideo(null)}
                className="absolute top-4 right-4 z-50 p-3 bg-black/60 hover:bg-white/15 rounded-full text-white backdrop-blur-md transition-all shadow-md"
              >
                <X className="w-5 h-5" />
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

      {/* Decorative Orbs & Gradients */}
      <div className="absolute top-[-10%] left-[5%] w-[400px] sm:w-[500px] h-[400px] sm:h-[500px] bg-primary/8 rounded-full blur-[100px] sm:blur-[130px] pointer-events-none" />
      <div className="absolute top-[40%] right-[-5%] w-[450px] sm:w-[600px] h-[450px] sm:h-[600px] bg-[#f27d26]/6 rounded-full blur-[110px] sm:blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[10%] left-[-10%] w-[500px] h-[500px] bg-primary/4 rounded-full blur-[150px] pointer-events-none" />

      {/* Hero Section */}
      <section className="relative min-h-[92vh] flex items-center pt-28 pb-20 px-4 sm:px-6 lg:px-8 border-b border-border-custom">
        <motion.div style={{ y: yBg, opacity: opacityHero }} className="absolute inset-0 z-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background z-10" />
          <video 
            ref={videoRef}
            src="https://cdn.coverr.co/videos/coverr-camera-recording-a-music-festival-4663/1080p.mp4"
            autoPlay
            loop 
            muted 
            playsInline
            className="w-full h-full object-cover opacity-15 mix-blend-luminosity scale-105"
          />
        </motion.div>

        <div className="relative z-10 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            <div className="lg:col-span-7 flex flex-col justify-center">
              {/* Soft, beautiful introduction pills / agency keywords */}
              <motion.div
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="flex flex-wrap gap-2.5 mb-8"
              >
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-[11px] font-bold uppercase tracking-wider text-primary shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  Digital Creative Agency
                </span>
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-bright/80 border border-border-custom text-[11px] font-bold uppercase tracking-wider text-foreground backdrop-blur-md shadow-sm">
                  <Globe className="w-3.5 h-3.5 text-primary" />
                  Digital Branding
                </span>
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-bright/80 border border-border-custom text-[11px] font-bold uppercase tracking-wider text-foreground backdrop-blur-md shadow-sm">
                  <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse animate-duration-1000" />
                  Media Affiliate
                </span>
              </motion.div>
              
              {/* Elegant, clear, high-contrast Agency display headline */}
              <motion.h1
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-display font-black leading-none text-foreground tracking-tight mb-8"
              >
                Design. <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-[#e0650d] to-primary">Stream.</span> Grow.
              </motion.h1>

              {/* Simple, natural, and layman-friendly sub-headline */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 1 }}
                className="text-base sm:text-lg md:text-xl text-text-muted font-sans font-normal max-w-3xl leading-relaxed mb-12"
              >
                FideTV is a certified digital creative agency, branding hub, and trusted media affiliate. You can watch any of our active live channels right here on our site, view ongoing broadcasts, or hire our friendly team to design a fast website and shoot stunning videos for your next big project. No confusing technical words—just simple, exceptional quality.
              </motion.p>

              {/* Interactive intuitive action path */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 1 }}
                className="flex flex-wrap gap-4 items-center"
              >
                {!user ? (
                  <Link
                    to="/auth"
                    id="cta-sign-in"
                    className="group px-7 py-4.5 bg-gradient-to-r from-primary to-[#e0650d] text-white font-extrabold text-center rounded-2xl hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20 flex items-center justify-center space-x-3 uppercase tracking-wider text-xs"
                  >
                    <span>Create Account / Sign In</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                ) : (
                  <Link
                    to="/profile"
                    id="cta-view-profile"
                    className="group px-7 py-4.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-extrabold text-center rounded-2xl hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-green-500/20 flex items-center justify-center space-x-3 uppercase tracking-wider text-xs"
                  >
                    <span>Go to My Profile</span>
                    <Users className="w-4 h-4 text-white" />
                  </Link>
                )}

                <Link
                  to="/services"
                  className="px-6 py-4.5 bg-surface border border-border-custom hover:border-primary/30 text-foreground font-bold rounded-2xl transition-all shadow-sm flex items-center justify-center space-x-2"
                >
                  <span>Services We Offer</span>
                </Link>
                <Link
                  to="/spaces"
                  className="group px-6 py-4.5 bg-surface border border-border-custom hover:border-primary/30 text-foreground font-bold rounded-2xl transition-all shadow-sm flex items-center justify-center space-x-2"
                >
                  <Headphones className="w-4 h-4 text-primary" />
                  <span>Join Spaces</span>
                </Link>
                
                <Link 
                  to="/live"
                  className="group px-6 py-4.5 bg-surface border border-border-custom hover:border-[#e0650d]/40 text-foreground text-center font-bold rounded-2xl transition-all shadow-sm flex items-center justify-center space-x-2.5 relative overflow-hidden"
                >
                  <span className="absolute left-0 top-0 w-1 h-full bg-red-500 animate-pulse" />
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span>Watch Live Channels</span>
                  <Play className="w-3.5 h-3.5 fill-current text-primary group-hover:scale-110 transition-transform" />
                </Link>
              </motion.div>
            </div>

            {/* Premium Dynamic Side Image placeholder / Hero Image */}
            <div className="lg:col-span-5 flex justify-center w-full mt-10 lg:mt-0">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, duration: 1 }}
                className="relative w-full max-w-[440px] aspect-[4/5] rounded-[2.5rem] overflow-hidden border border-border-custom bg-surface shadow-2xl group"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent z-10 pointer-events-none opacity-80" />
                <OptimizedImage 
                  src={heroImageUrl}
                  fallbackSrc="https://images.unsplash.com/photo-1540747913346-19e32dc3e97e"
                  alt="FideTV Media Agency Creative Hub" 
                  className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-1000"
                />
                
                {/* Micro overlay indicators */}
                <div className="absolute bottom-6 left-6 right-6 z-20 p-4.5 rounded-2xl bg-background/90 backdrop-blur-md border border-border-custom shadow-lg flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase text-primary tracking-widest block">Global Broadcast</span>
                    <span className="text-xs font-bold text-foreground">Connecting Africa to the World</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges & Verified Credentials Section */}
      <section className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 mb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-surface border border-border-custom shadow-xl rounded-3xl p-6 sm:p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="lg:col-span-4 flex flex-col justify-center space-y-3">
            <div className="inline-flex items-center gap-2 text-green-600 font-bold text-xs uppercase tracking-wider font-mono">
              <Shield className="w-4 h-4 fill-green-500/10" />
              100% Verified Agency
            </div>
            <h3 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Registered and Certified</h3>
            <p className="text-text-muted text-sm leading-relaxed">
              FideTV Media is officially certified by the government to do business and deliver trusted, reliable services across the nation.
            </p>
          </div>

          <div className="lg:col-span-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-start lg:justify-end gap-5 lg:pl-10">
            {/* CAC Certified Box */}
            <div className="flex-1 p-5 rounded-2xl bg-surface-bright border border-border-custom flex flex-col justify-between">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-primary">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">CAC Registered</h4>
                  <p className="text-[11px] text-text-muted">Corporate Affairs Commission</p>
                </div>
              </div>
              <p className="text-xs text-text-muted italic mb-4">Certified for lawful commercial production and software services.</p>
              {certUrl ? (
                <a 
                  href={certUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center justify-center px-4 py-2.5 bg-foreground text-background text-xs font-bold rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm"
                >
                  <span>View Official CAC Document</span>
                </a>
              ) : (
                <span className="text-center py-2 text-[11px] font-bold text-text-muted bg-background border border-dashed border-border-custom rounded-xl cursor-default">
                  ✓ Verified Registration
                </span>
              )}
            </div>

            {/* SMEDAN Certified Box */}
            <div className="flex-1 p-5 rounded-2xl bg-surface-bright border border-border-custom flex flex-col justify-between">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-600">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">SMEDAN Certified</h4>
                  <p className="text-[11px] text-text-muted">Small & Medium Enterprises Agency</p>
                </div>
              </div>
              <p className="text-xs text-text-muted italic mb-4">Recognized enterprise partner for media and technology development.</p>
              {smedanUrl ? (
                <a 
                  href={smedanUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center justify-center px-4 py-2.5 bg-foreground text-background text-xs font-bold rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm"
                >
                  <span>View SMEDAN Certificate</span>
                </a>
              ) : (
                <span className="text-center py-2 text-[11px] font-bold text-text-muted bg-background border border-dashed border-border-custom rounded-xl cursor-default">
                  ✓ Active Member Status
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
        >
          {[
            { label: 'Live Events Streamed', value: '150+', description: 'Broadcasted perfectly', icon: Calendar },
            { label: 'Happy Viewers Reach', value: '100K+', description: 'Tuned in from everywhere', icon: Users },
            { label: 'Completed Deliveries', value: '500+', description: 'Videos and web pages', icon: Video },
            { label: 'Client Countries', value: '12+', description: 'Serving global users', icon: Globe },
          ].map((stat, i) => (
            <motion.div
              variants={fadeInUp}
              key={i}
              className="p-6 sm:p-8 bg-surface-bright/55 border border-border-custom rounded-2xl hover:bg-surface transition-all duration-300 flex flex-col justify-between group shadow-sm"
            >
              <div className="flex justify-between items-start mb-4">
                <stat.icon className="w-5 h-5 text-primary group-hover:scale-110 transition-transform duration-300" />
                <span className="text-[10px] text-text-muted/60 font-bold uppercase font-mono">0{i+1}</span>
              </div>
              <div>
                <h3 className="text-3xl sm:text-5xl font-display font-extrabold text-foreground mb-1 tracking-tight">{stat.value}</h3>
                <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-0.5">{stat.label}</p>
                <p className="text-[11px] text-text-muted italic">{stat.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Interactive Live Channels Hub Section */}
      <section className="py-24 bg-surface-bright/35 border-t border-b border-border-custom relative overflow-hidden">
        {/* Subtle decorative elements */}
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-red-500/3 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                Live Hub Active
              </div>
              <h2 className="text-3xl sm:text-5xl font-display font-black text-foreground tracking-tight leading-none">
                Popular Broadcast <span className="font-light italic text-text-muted/75">Stations.</span>
              </h2>
              <p className="text-text-muted text-sm max-w-xl">
                We are live streaming! Watch live TV channels and official broadcasts directly. Simply click any station below to tune in instantly.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <button 
                onClick={() => {
                  const shuffled = [...channels].sort(() => 0.5 - Math.random());
                  setDisplayedChannels(shuffled.slice(0, 3));
                }}
                className="group flex items-center space-x-2 px-5 py-3 border border-red-500/25 hover:border-red-500/40 rounded-xl bg-red-500/5 hover:bg-red-500/10 transition-all text-xs font-bold tracking-wider text-red-400 font-mono shadow-xs cursor-pointer"
                title="Shuffle active stations randomly"
              >
                <Zap className="w-4 h-4 text-red-500 animate-bounce" />
                <span>Shuffle Stations</span>
              </button>
              
              <Link 
                to="/live" 
                className="group flex items-center space-x-2.5 px-6 py-3.5 border border-border-custom hover:border-foreground/20 rounded-xl hover:bg-surface transition-all text-xs font-bold tracking-wider text-foreground bg-background shadow-xs"
              >
                <span>See Full Live Grid</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>

        {/* Live Stations Responsive Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {(displayedChannels.length > 0 ? displayedChannels : channels.slice(0, 3)).map((ch, i) => (
              <motion.div
                key={ch.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                viewport={{ once: true }}
                className="group flex flex-col bg-surface border border-border-custom rounded-3xl overflow-hidden shadow-md hover:shadow-xl hover:border-primary/20 transition-all duration-300 relative"
              >
                {/* Visual Thumbnail with Overlay */}
                <div className="aspect-video w-full overflow-hidden relative bg-black">
                  <img 
                    src={ch.thumbnail || `https://images.unsplash.com/photo-1540747913346-19e32dc3e97e`} 
                    alt={ch.name} 
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-85 group-hover:scale-105 transition-transform duration-700 pointer-events-none" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                  
                  {/* Category Pill overlay */}
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="bg-red-500 text-white text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md shadow-sm flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      LIVE NOW
                    </span>
                    <span className="bg-background/80 backdrop-blur-md text-foreground text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md shadow-sm border border-border-custom">
                      {ch.category}
                    </span>
                  </div>

                  {/* Play stream indicator overlay */}
                  <Link 
                    to={`/live?channel=${ch.id}`}
                    className="absolute inset-0 flex items-center justify-center pointer-events-auto"
                    aria-label={`Tune to ${ch.name}`}
                  >
                    <div className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center text-white transition-all duration-300 group-hover:scale-110 shadow-lg group-hover:bg-red-500">
                      <Play className="w-6 h-6 fill-current ml-0.5" />
                    </div>
                  </Link>
                </div>

                {/* Information Card Body */}
                <div className="p-6 flex flex-col justify-between flex-grow">
                  <div className="space-y-2 mb-4">
                    <h3 className="text-lg font-bold text-foreground leading-snug font-display line-clamp-1">
                      {ch.name}
                    </h3>
                    <p className="text-text-muted text-xs line-clamp-2 leading-relaxed">
                      {ch.description}
                    </p>
                  </div>
                  
                  <div className="pt-4 border-t border-border-custom flex items-center justify-between">
                    <span className="text-[10px] font-bold font-mono text-text-muted/60 uppercase">Media Network</span>
                    <Link 
                      to={`/live?channel=${ch.id}`}
                      className="text-xs text-primary font-bold inline-flex items-center gap-1 hover:underline"
                    >
                      <span>Tune to Channel</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Spaces / Voice Room Section */}
      <section className="py-24 bg-surface-bright/20 border-b border-border-custom relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-surface rounded-3xl border border-border-custom p-8 md:p-12 shadow-lg flex flex-col md:flex-row items-center gap-8 md:gap-12">
              <div className="flex-1 space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider">
                      <Headphones className="w-3.5 h-3.5" />
                      Live Audio Spaces
                  </div>
                  <h2 className="text-3xl sm:text-5xl font-display font-black text-foreground tracking-tight leading-none">
                    Voice Conversations <span className="font-light italic text-text-muted/75">happening now.</span>
                  </h2>
                  <p className="text-text-muted text-sm max-w-xl">
                    Step into our audio spaces to engage in live discussions, host meetings, or connect with our community through real-time voice chat. Join the conversation effortlessly from anywhere on our platform.
                  </p>
                  <Link
                    to="/spaces"
                    className="inline-flex items-center gap-2 px-6 py-3.5 bg-primary hover:bg-primary/95 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/20"
                  >
                    Explore Audio Spaces
                    <ArrowRight className="w-4 h-4" />
                  </Link>
              </div>
              <div className="flex-shrink-0 hidden md:block">
                  <div className="w-32 h-32 bg-gradient-to-br from-primary to-orange-500 text-white rounded-3xl flex items-center justify-center shadow-xl shadow-primary/20">
                      <Headphones className="w-16 h-16" />
                  </div>
              </div>
          </div>
        </div>
      </section>

      {/* Featured Works / Videos Section */}
      <section className="py-24 bg-background relative overflow-hidden">
        <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-primary/3 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-primary uppercase tracking-[0.4em] block">Our Portfolio & Broadcasts</span>
              <h2 className="text-3xl sm:text-5xl font-display font-black text-foreground tracking-tight leading-none">
                Featured Work <span className="font-light italic text-text-muted/75">& Videos.</span>
              </h2>
              <p className="text-text-muted text-sm max-w-xl">
                Take a quick look at some of our favorite recordings, event coverage, interviews, and community segments.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <button 
                onClick={() => {
                  const shuffled = [...featuredPortfolio].sort(() => 0.5 - Math.random());
                  setDisplayedVideos(shuffled.slice(0, 3));
                }}
                className="group flex items-center space-x-2 px-5 py-3 border border-primary/25 hover:border-primary/40 rounded-xl bg-primary/5 hover:bg-primary/10 transition-all text-xs font-bold tracking-wider text-primary font-mono shadow-xs cursor-pointer"
                title="Shuffle featured videos randomly"
              >
                <Zap className="w-4 h-4 text-primary animate-bounce" />
                <span>Shuffle Videos</span>
              </button>
              
              <Link 
                to="/content" 
                className="group flex items-center space-x-2.5 px-6 py-3.5 border border-border-custom hover:border-foreground/20 rounded-xl hover:bg-surface transition-all text-xs font-bold tracking-wider text-foreground bg-background shadow-xs"
              >
                <span>Explore All Videos</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>

        {/* Videos Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {(displayedVideos.length > 0 ? displayedVideos : featuredPortfolio.slice(0, 3)).map((show, i) => (
              <motion.div
                key={show.id || i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                viewport={{ once: true }}
                className="group flex flex-col bg-surface border border-border-custom rounded-3xl overflow-hidden shadow-md hover:shadow-xl hover:border-primary/20 transition-all duration-300 relative"
              >
                {/* Visual Thumbnail with Overlay */}
                <div className="aspect-video w-full overflow-hidden relative bg-black">
                  <img 
                    src={show.image_url || `https://images.unsplash.com/photo-1523050335392-9beffa5d2205?auto=format&fit=crop&q=80&w=600`} 
                    alt={show.title} 
                    className="w-full h-full object-cover opacity-70 group-hover:opacity-90 group-hover:scale-105 transition-transform duration-700 pointer-events-none" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                  
                  <div className="absolute top-4 left-4">
                    <span className="bg-primary hover:bg-primary/95 text-white text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md shadow-sm">
                      {show.category}
                    </span>
                  </div>

                  {/* Enhanced play button */}
                  {(show.youtube_id || show.video_url) && (
                    <button 
                      onClick={() => setPlayingVideo(show)} 
                      className="absolute inset-0 flex items-center justify-center pointer-events-auto"
                      aria-label="Play video"
                    >
                      <div className="w-14 h-14 bg-white/95 backdrop-blur-md rounded-full flex items-center justify-center text-primary transition-all duration-300 group-hover:scale-110 shadow-lg">
                        <Play className="w-6 h-6 fill-current ml-0.5" />
                      </div>
                    </button>
                  )}
                </div>

                {/* Information Card Body */}
                <div className="p-6 flex flex-col justify-between flex-grow">
                  <div className="space-y-2 mb-4">
                    <h3 className="text-lg font-bold text-foreground leading-snug font-display line-clamp-2">
                      {show.title}
                    </h3>
                    <p className="text-text-muted text-xs line-clamp-3 leading-relaxed italic">
                      "{show.description}"
                    </p>
                  </div>
                  
                  <div className="pt-4 border-t border-border-custom flex items-center justify-between">
                    <span className="text-[10px] font-bold font-mono text-text-muted/60 uppercase">FideTV Originals</span>
                    {(show.youtube_id || show.video_url) ? (
                      <button 
                        onClick={() => setPlayingVideo(show)}
                        className="text-xs text-primary font-bold inline-flex items-center gap-1 hover:underline relative z-30"
                      >
                        <span>Watch Now</span>
                        <Play className="w-3 h-3 fill-current" />
                      </button>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Ad Banner placeholder */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-16">
        <AdBanner placement="Home Portfolio Bottom" />
      </div>

      {/* Simplified Bento Services - Everyday terms */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-primary uppercase tracking-[0.4em] block">What We Do</span>
            <h2 className="text-3xl sm:text-5xl font-display font-black text-foreground tracking-tight leading-none">
              Services Made <span className="font-light italic text-text-muted/75">Simple.</span>
            </h2>
            <p className="text-text-muted text-sm max-w-xl">We provide professional-grade media and web solutions, explaining everything clearly without tech jargon.</p>
          </div>
          <Link 
            to="/services" 
            className="group flex items-center space-x-2 bg-surface hover:bg-surface-bright border border-border-custom px-6 py-3 rounded-xl text-xs font-bold text-foreground shadow-xs transition-colors"
          >
            <span>View All Services</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {bentoItems.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: item.delay, duration: 0.5 }}
              className={cn(
                "group relative overflow-hidden rounded-3xl p-6 sm:p-8 flex flex-col justify-between border transition-all duration-300 shadow-sm hover:shadow-md",
                item.className
              )}
            >
              {item.image && (
                <div className="absolute inset-0 z-0">
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover opacity-10 group-hover:opacity-20 group-hover:scale-102 transition-all duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-transparent" />
                </div>
              )}
              
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 text-primary transition-all duration-300 group-hover:scale-105">
                  <item.icon className="w-6 h-6" />
                </div>
                <h4 className="text-xl sm:text-2xl font-display font-bold text-foreground mb-3">{item.title}</h4>
                <p className="text-text-muted text-xs leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="relative z-10 mt-8 pt-4 border-t border-border-custom/50 flex justify-between items-center">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Fast Delivery</span>
                <Link to="/contact" className="text-xs font-bold text-foreground hover:text-primary transition-colors flex items-center gap-1">
                  <span>Inquire</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Upcoming Events Section */}
      {upcomingEvents.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider whitespace-nowrap bg-primary/5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                Live Broadcast Channel
              </div>
              <h3 className="text-3xl sm:text-5xl font-display font-black text-foreground tracking-tight">
                Upcoming Live Streams
              </h3>
            </div>
            <Link to="/live" className="group flex items-center space-x-2 bg-surface hover:bg-surface-bright border border-border-custom px-6 py-3 rounded-xl text-xs font-bold text-foreground transition-colors">
              <span>See Full Live Grid</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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
                className="group relative h-[380px] rounded-3xl overflow-hidden border border-border-custom bg-surface hover:border-primary/30 transition-all duration-300 shadow-sm"
              >
                <img 
                  src={ev.thumbnail_url || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=2070'} 
                  alt={ev.title} 
                  className="w-full h-full object-cover opacity-60 group-hover:opacity-85 transition-all duration-500" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-black/30 to-transparent" />
                
                <div className="absolute top-6 left-6 flex gap-3">
                  <div className="px-3 py-1.5 bg-background/80 backdrop-blur-md border border-border-custom rounded-full flex items-center gap-1.5">
                    <div className={cn("w-1.5 h-1.5 rounded-full", ev.status === 'live' ? "bg-red-500 animate-pulse" : "bg-primary")} />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-foreground">{ev.status}</span>
                  </div>
                </div>

                <div className="absolute bottom-6 left-6 right-6 p-5 rounded-2xl bg-background/90 backdrop-blur-md border border-border-custom space-y-3">
                  <div className="flex items-center gap-1.5 text-text-muted text-[10px] font-bold uppercase tracking-wider">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>{format(new Date(ev.start_time), 'MMM dd, yyyy • HH:mm')}</span>
                  </div>
                  <h3 className="text-base font-bold text-foreground leading-snug line-clamp-2">{ev.title}</h3>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-[9px] uppercase font-mono text-text-muted">Broadcast Stream</span>
                    <Link to="/live" className="inline-flex items-center justify-center w-8 h-8 bg-primary rounded-lg text-white hover:scale-105 transition-all shadow-md">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Meet Our Team Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-primary uppercase tracking-[0.4em] block">Our Professionals</span>
            <h2 className="text-3xl sm:text-5xl font-display font-black text-foreground tracking-tight leading-none">
              Meet Our <span className="font-light italic text-text-muted/75">Creative Team.</span>
            </h2>
            <p className="text-text-muted text-sm max-w-xl">
              Meet the friendly specialists behind FideTV Media. From digital creative branding to custom website builders, we are here to support your success.
            </p>
          </div>
          {isAdmin && (
            <Link 
              to="/admin" 
              className="px-6 py-3 bg-surface hover:bg-surface-bright border border-border-custom hover:border-primary/20 rounded-2xl transition-all text-xs font-bold text-foreground flex items-center gap-2"
            >
              <span>Manage Team (Admin)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {(teamMembers && teamMembers.length > 0 ? teamMembers : [
            {
              name: 'Fidelis Oruche',
              role: 'Founder & CEO / Director',
              bio: 'Leading digital creative development and broadcasting systems across Nigeria and globally with premium visual excellence.',
              avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400',
              socialX: 'https://twitter.com',
              socialInstagram: 'https://instagram.com/fidetvonline',
              socialLinkedin: 'https://linkedin.com'
            },
            {
              name: 'Kelechi Anozie',
              role: 'Creative Media Coordinator',
              bio: 'Expert in high-end broadcast camera operations, video directing, live streaming setups, and multimedia configurations.',
              avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400',
              socialX: 'https://twitter.com',
              socialInstagram: 'https://instagram.com',
              socialLinkedin: 'https://linkedin.com'
            },
            {
              name: 'Chinedu Okafor',
              role: 'Chief Engineering Architect',
              bio: 'Over 6 years designing high-speed digital web platforms, custom database applications, and fluid search dashboards.',
              avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=400',
              socialX: 'https://twitter.com',
              socialInstagram: 'https://instagram.com',
              socialLinkedin: 'https://linkedin.com'
            }
          ]).map((member, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              className="group flex flex-col bg-surface border border-border-custom rounded-[2.5rem] overflow-hidden shadow-xs hover:shadow-md hover:border-primary/20 transition-all duration-300 relative p-6"
            >
              {/* Profile Image Frame with standard safe reference coding pattern */}
              <div className="h-64 w-full rounded-[2rem] overflow-hidden relative mb-6 bg-black border border-border-custom/50">
                <img 
                  referrerPolicy="no-referrer"
                  src={member.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400"} 
                  alt={member.name} 
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500 pointer-events-none" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 pointer-events-none" />
                
                {/* Social hover buttons overlay inside profile frame */}
                <div className="absolute bottom-4 left-4 right-4 flex gap-2 z-20 justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {member.socialX && (
                    <a href={member.socialX} target="_blank" rel="noreferrer" className="w-9 h-9 bg-background/90 text-foreground hover:bg-primary hover:text-white rounded-full flex items-center justify-center border border-border-custom transition-all shadow-md">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  {member.socialInstagram && (
                    <a href={member.socialInstagram} target="_blank" rel="noreferrer" className="w-9 h-9 bg-background/90 text-foreground hover:bg-primary hover:text-white rounded-full flex items-center justify-center border border-border-custom transition-all shadow-md">
                      <Instagram className="w-4 h-4" />
                    </a>
                  )}
                  {member.socialLinkedin && (
                    <a href={member.socialLinkedin} target="_blank" rel="noreferrer" className="w-9 h-9 bg-background/90 text-foreground hover:bg-primary hover:text-white rounded-full flex items-center justify-center border border-border-custom transition-all shadow-md">
                      <Linkedin className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>

              {/* Identity & Bio */}
              <div className="space-y-3 flex-grow pb-2">
                <div>
                  <h3 className="text-xl font-bold text-foreground font-display leading-tight">{member.name}</h3>
                  <span className="text-[10px] uppercase font-black tracking-widest text-primary block mt-1">{member.role}</span>
                </div>
                <p className="text-text-muted text-xs leading-relaxed italic">
                  "{member.bio}"
                </p>
              </div>

              {/* Connect footer */}
              <div className="pt-4 mt-4 border-t border-border-custom/75 flex items-center justify-between text-[11px] font-bold text-text-muted">
                <span>Media Network</span>
                <div className="flex gap-2">
                  {member.socialInstagram ? (
                    <a href={member.socialInstagram} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">Instagram</a>
                  ) : null}
                  {member.socialLinkedin ? (
                    <a href={member.socialLinkedin} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">LinkedIn</a>
                  ) : null}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Social Proof Elements: Verified Client Reviews */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
        <div className="text-center space-y-3 mb-16 max-w-2xl mx-auto">
          <span className="text-[10px] font-bold text-primary uppercase tracking-[0.4em] block">Reviews</span>
          <h2 className="text-3xl sm:text-5xl font-display font-black text-foreground tracking-tight">
            What Our <span className="font-light italic text-text-muted/75">Clients Say.</span>
          </h2>
          <p className="text-text-muted text-sm leading-relaxed">We focus on building honest relationships and delivering beautiful results. Read directly from the wonderful people who choose FideTV.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {testimonials.map((t, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              className="p-8 bg-surface-bright/40 border border-border-custom rounded-3xl flex flex-col justify-between relative shadow-xs"
            >
              <div className="space-y-4">
                <div className="flex gap-1 text-primary">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className="text-lg">★</span>
                  ))}
                </div>
                <p className="text-foreground/95 text-xs sm:text-sm leading-relaxed italic">
                  "{t.quote}"
                </p>
              </div>

              <div className="flex items-center gap-4 mt-8 pt-6 border-t border-border-custom/50">
                <img 
                  src={t.avatar} 
                  alt={t.name} 
                  className="w-10 h-10 rounded-full object-cover border border-border-custom bg-background" 
                />
                <div>
                  <h4 className="font-bold text-sm text-foreground">{t.name}</h4>
                  <p className="text-[10px] uppercase font-semibold text-text-muted tracking-wider">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Blog & News Segment */}
      {latestNews.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-primary uppercase tracking-[0.4em] block">Our Blog</span>
              <h3 className="text-3xl sm:text-5xl font-display font-black text-foreground tracking-tight">
                Studio News <span className="font-light italic text-text-muted/70">& Updates.</span>
              </h3>
            </div>
            <Link to="/news" className="group flex items-center space-x-2 bg-surface hover:bg-surface-bright border border-border-custom px-6 py-3 rounded-xl text-xs font-bold text-foreground transition-colors">
              <span>Read All Articles</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {latestNews.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group flex flex-col bg-surface border border-border-custom rounded-3xl overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all duration-300 relative"
              >
                <Link to={`/news/${item.slug || item.id}`} className="absolute inset-0 z-20" aria-label={`Read ${item.title}`} />
                <div className="flex flex-col h-full relative z-10">
                  <div className="aspect-[16/10] overflow-hidden relative bg-background">
                    <img 
                      src={item.image_url || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=800'} 
                      alt={item.title} 
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500 opacity-90" 
                    />
                    <div className="absolute top-4 left-4 z-30">
                      <span className="bg-background/90 backdrop-blur-md text-[#e0650d] text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border border-border-custom shadow-sm block">
                        {item.category || 'Editorial'}
                      </span>
                    </div>
                  </div>
                  <div className="p-6 space-y-3 flex flex-col flex-grow">
                    <div className="flex items-center space-x-2 text-[9px] uppercase font-bold tracking-widest text-text-muted">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      <span>{format(new Date(item.created_at), 'MMM dd, yyyy')}</span>
                    </div>
                    <h4 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                      {item.title}
                    </h4>
                    <p className="text-text-muted text-xs line-clamp-2 leading-relaxed flex-grow">
                      {item.excerpt || item.description}
                    </p>
                    <div className="pt-4 flex items-center justify-between border-t border-border-custom/60 text-[10px] uppercase font-bold text-text-muted">
                       <span>By {item.profiles?.username || 'Admin'}</span>
                       <span className="flex items-center text-primary group-hover:translate-x-1 transition-transform">
                         <span>Read</span>
                         <ArrowRight className="w-3.5 h-3.5 ml-1" />
                       </span>
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

      {/* Beautiful layperson CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative rounded-[2.5rem] overflow-hidden bg-primary p-10 sm:p-20 text-center border border-white/10"
        >
          {/* Subtle light layer details */}
          <div className="absolute top-[-50%] right-[-10%] w-[400px] sm:w-[500px] h-[400px] sm:h-[500px] bg-white/10 rounded-full blur-[80px] sm:blur-[100px] pointer-events-none mix-blend-screen" />
          <div className="absolute bottom-[-50%] left-[-10%] w-[400px] sm:w-[500px] h-[400px] sm:h-[500px] bg-black/15 rounded-full blur-[80px] sm:blur-[100px] pointer-events-none mix-blend-screen" />
          
          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-display font-black text-white mb-6 leading-tight tracking-tight">
              Have an upcoming event or website project?
            </h2>
            <p className="text-white/90 max-w-xl mx-auto mb-10 text-sm sm:text-base leading-relaxed font-medium">
              We make the setup simple for you. Speak to us directly to ask questions, share your ideas, or get a quick and friendly price estimate.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="https://wa.me/2348108889805"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2.5 bg-green-500 text-white px-8 py-4.5 rounded-2xl font-bold uppercase tracking-wider text-xs hover:bg-green-600 transition-all shadow-md shadow-black/10"
              >
                <MessageSquare className="w-4 h-4 fill-current" />
                <span>Chat on WhatsApp</span>
              </a>

              <a
                href="tel:08124323608"
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-white text-foreground px-8 py-4.5 rounded-2xl font-bold uppercase tracking-wider text-xs hover:bg-surface-bright transition-all shadow-md shadow-black/10"
              >
                <Phone className="w-4 h-4 text-primary" />
                <span>Call Us Directly</span>
              </a>

              <Link
                to="/contact"
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-1 px-8 py-4.5 bg-black/35 hover:bg-black/50 text-white rounded-2xl font-bold uppercase tracking-wider text-xs border border-white/10 transition-all"
              >
                <span>Write Us a Message</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            
            <p className="text-white/70 text-[10px] mt-8 font-semibold tracking-wider uppercase font-mono">
              ★ NO tech jargon • ★ Friendly professional help • ★ Fast responses
            </p>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
