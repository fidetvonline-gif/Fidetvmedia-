import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { Play, Calendar, Users, ArrowRight, Video, Zap, CheckCircle, Flame, Sparkles, Globe, Shield, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import ReactPlayer from 'react-player';

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
  const [certUrl, setCertUrl] = useState('');
  const [smedanUrl, setSmedanUrl] = useState('');
  const [showVideoModal, setShowVideoModal] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { scrollYProgress } = useScroll();
  const yBg = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);

  useEffect(() => {
    fetchCertificates();
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.warn('Video play was interrupted:', error);
        });
      }
    }
  }, []);

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
      {/* Video Modal */}
      <AnimatePresence>
        {showVideoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 sm:p-8"
          >
            <div className="relative w-full max-w-6xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              <button
                onClick={() => setShowVideoModal(false)}
                className="absolute top-4 right-4 z-50 p-2 bg-black/50 hover:bg-white/10 rounded-full text-white backdrop-blur-md transition-all"
              >
                <X className="w-6 h-6" />
              </button>
              <Player
                url="https://youtube.com/watch?v=Fj-Yv0k-U04" // Placeholder ID: replace with actual Fidetvmedia promo
                width="100%"
                height="100%"
                playing
                controls
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Orbs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] mix-blend-screen pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[150px] mix-blend-screen pointer-events-none" />

      {/* Hero Section */}
      <section className="relative min-h-[100vh] flex flex-col justify-center pt-24 px-4 sm:px-6 lg:px-8">
        <motion.div style={{ y: yBg }} className="absolute inset-0 z-0">
          <video 
            ref={videoRef}
            loop 
            muted 
            playsInline
            className="w-full h-full object-cover opacity-30 mix-blend-luminosity scale-105"
          >
            <source src="https://cdn.coverr.co/videos/coverr-camera-recording-a-music-festival-4663/1080p.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent" />
        </motion.div>

        <div className="relative z-10 max-w-7xl mx-auto w-full flex flex-col justify-center h-full gap-8">
          <motion.div
            initial={{ opacity: 0, filter: 'blur(10px)', y: 20 }}
            animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-widest text-white/80">The Next Era of Media</span>
            </div>
            <h1 className="text-6xl sm:text-8xl lg:text-[10rem] leading-[0.85] font-display font-black uppercase text-white tracking-tighter mix-blend-difference mb-8">
              Creative<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">
                Media.
              </span>
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="max-w-xl"
          >
            <p className="text-lg sm:text-xl text-gray-400 font-light mb-10 leading-relaxed">
              FideTV is a premium media hub built for the next generation of digital storytelling. We stream, we produce, we connect the world.
            </p>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setShowVideoModal(true)}
                className="group relative px-8 py-5 bg-white text-black font-bold uppercase tracking-widest text-sm flex items-center space-x-3 overflow-hidden rounded-2xl"
              >
                <div className="absolute inset-0 bg-primary translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-500 ease-out" />
                <Play className="w-5 h-5 fill-current relative z-10 group-hover:text-white transition-colors duration-500" />
                <span className="relative z-10 group-hover:text-white transition-colors duration-500">Watch Promo Video</span>
              </button>
              <Link
                to="/live"
                className="group px-8 py-5 border border-white/20 text-white font-bold uppercase tracking-widest text-sm flex items-center space-x-3 hover:border-white rounded-2xl transition-all"
              >
                <Video className="w-5 h-5 group-hover:text-primary transition-colors" />
                <span>Join Live Stream</span>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Metrics Section */}
      <section className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20">
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
              className="p-6 sm:p-8 bg-surface-bright/40 backdrop-blur-xl border border-white/10 rounded-3xl hover:bg-surface-bright/60 transition-colors"
            >
              <stat.icon className="w-6 h-6 text-primary mb-6" />
              <h3 className="text-3xl sm:text-5xl font-display font-bold text-white mb-2">{stat.value}</h3>
              <p className="text-xs text-gray-500 font-bold tracking-widest uppercase">{stat.label}</p>
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
                   <h4 className="text-white font-bold text-lg sm:text-xl mb-2">Officially Registered & Recognized</h4>
                   <p className="text-gray-400 text-sm max-w-xl">FIDE TV MEDIA is fully registered and certified. We are committed to professional and trusted media services.</p>
                 </div>
              </div>
              
              <div className="flex flex-wrap gap-4 w-full">
                {certUrl && (
                  <a href={certUrl} target="_blank" rel="noopener noreferrer" className="px-8 py-4 bg-white text-black text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-primary hover:text-white transition-all flex items-center space-x-2 flex-grow sm:flex-grow-0 justify-center">
                    <span>View CAC Registration</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </a>
                )}
                {smedanUrl && (
                  <a href={smedanUrl} target="_blank" rel="noopener noreferrer" className="px-8 py-4 bg-white text-black text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-primary hover:text-white transition-all flex items-center space-x-2 flex-grow sm:flex-grow-0 justify-center">
                    <span>View SMEDAN Certificate</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </section>

      {/* Bento Grid Services Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-40">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest">
              <CheckCircle className="w-4 h-4" />
              Our Expertise
            </div>
            <h3 className="text-5xl sm:text-7xl font-display font-bold text-white leading-[0.9] tracking-tight">
              Elevating Every<br />Frame We Capture.
            </h3>
          </div>
          <Link to="/services" className="group flex items-center space-x-3 bg-white/5 hover:bg-white/10 border border-white/10 px-8 py-4 rounded-full text-white font-bold uppercase tracking-widest text-sm transition-all">
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
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent" />
                </div>
              )}
              <div className="relative z-10 w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-12 backdrop-blur-md border border-white/10 text-white group-hover:-rotate-6 group-hover:scale-110 transition-all duration-500">
                <item.icon className="w-8 h-8" />
              </div>
              <div className="relative z-10 mt-auto">
                <h4 className="text-2xl sm:text-3xl font-display font-bold text-white mb-3">{item.title}</h4>
                <p className="text-gray-400 group-hover:text-gray-300 transition-colors leading-relaxed">
                  {item.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Heroic CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-40">
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
            <h2 className="text-5xl sm:text-7xl md:text-8xl font-display font-black text-white mb-8 leading-[0.9] tracking-tighter">
              Ready to broadcast<br />your vision?
            </h2>
            <p className="text-white/90 max-w-2xl mx-auto mb-12 text-lg sm:text-xl font-medium">
              Whether it's a live event, a corporate interview, or a creative project, we have the tools and talent to make it extraordinary.
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center space-x-4 bg-background text-white px-12 py-6 rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-105 hover:shadow-2xl hover:shadow-background/50 transition-all"
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
