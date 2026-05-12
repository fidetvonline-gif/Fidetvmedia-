import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { Video, Play, Camera, Mic, Radio, Zap, ArrowRight, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactPlayer from 'react-player';
import { supabase } from '@/lib/supabase';
import { Service } from '@/types';

const Player = ReactPlayer as any;

const ICON_MAP: Record<string, any> = {
  Video,
  Radio,
  Camera,
  Mic,
  Zap,
};

export default function Services() {
  const [showShowreel, setShowShowreel] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [showreelUrl, setShowreelUrl] = useState('https://www.youtube.com/watch?v=0D-zn6YAqCY');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchServices();
    fetchShowreel();
    checkAdmin();
  }, []);

  const fetchShowreel = async () => {
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'showreel_url')
      .single();
    
    if (data?.value) {
      setShowreelUrl(data.value);
    }
  };

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email === 'fidetvonline@gmail.com') {
      setIsAdmin(true);
    }
  };

  const seedServices = async () => {
    if (!confirm('Import current default services to database?')) return;
    
    const defaultServices = [
      {
        title: 'Video Production',
        icon: 'Video',
        description: 'From concept to final cut, we create cinematic video content that tells your story with power and precision.',
        features: ['4K Cinematography', 'Professional Editing', 'Motion Graphics', 'Sound Design'],
        price: 'Starting at ₦1,500,000',
        order_index: 0
      },
      {
        title: 'Live Streaming',
        icon: 'Radio',
        description: 'Ultra-low latency, multi-camera broadcasting for concerts, conferences, and virtual events.',
        features: ['Multi-platform Stream', 'Live Tech Support', 'Interaction Tools', 'HD Quality'],
        price: 'Starting at ₦2,000,000',
        order_index: 1
      },
      {
        title: 'Event Coverage',
        icon: 'Camera',
        description: 'Comprehensive media coverage for large-scale events, combining photography and videography.',
        features: ['Full Day Coverage', 'Quick Turnaround', 'High-Res Photos', 'Highlight Reels'],
        price: 'Starting at ₦3,000,000',
        order_index: 2
      },
      {
        title: 'Interviews & Podcasts',
        icon: 'Mic',
        description: 'Professional sets and high-end audio for crisp, engaging talk content and interviews.',
        features: ['Multi-Mic Setup', 'Video Recording', 'Lighting Design', 'Post Production'],
        price: 'Starting at ₦800,000',
        order_index: 3
      }
    ];

    const { error } = await supabase.from('services').insert(defaultServices);
    if (error) {
      alert('Error seeding services: ' + error.message);
    } else {
      alert('Services seeded successfully!');
      fetchServices();
    }
  };

  const fetchServices = async () => {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('order_index');
    
    if (data) setServices(data);
    setLoading(false);
  };

  return (
    <div className="py-24 space-y-32 mb-32 relative bg-background">
      {/* Showreel Modal */}
      <AnimatePresence>
        {showShowreel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-md p-4 sm:p-8"
            onClick={() => setShowShowreel(false)}
          >
            <div 
              className="relative w-full max-w-6xl aspect-video bg-background rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_-20px_rgba(0,0,0,0.5)] border border-border-custom ring-1 ring-white/10"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setShowShowreel(false)}
                className="absolute top-6 right-6 z-50 p-4 bg-background/50 hover:bg-red-500 hover:text-white rounded-full text-foreground backdrop-blur-md transition-all active:scale-90 border border-border-custom shadow-lg"
              >
                <X className="w-6 h-6" />
              </button>
              {showreelUrl.includes('youtube.com') || showreelUrl.includes('youtu.be') ? (
                <iframe 
                  src={showreelUrl.includes('embed') ? showreelUrl : `https://www.youtube.com/embed/${showreelUrl.split('v=')[1] || showreelUrl.split('/').pop()}?autoplay=1&modestbranding=1`}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              ) : (
                <Player
                  url={showreelUrl}
                  width="100%"
                  height="100%"
                  playing
                  controls
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-center gap-3">
            <div className="h-px w-8 bg-primary/30" />
            <h4 className="text-primary font-display font-black uppercase tracking-[0.5em] text-[10px] sm:text-xs">What We Do</h4>
            <div className="h-px w-8 bg-primary/30" />
          </div>
          <h1 className="text-5xl sm:text-7xl md:text-9xl font-display font-bold text-foreground tracking-tighter leading-[0.8] italic">
            Elite Media<br />Services
          </h1>
        </motion.div>
        <p className="text-lg sm:text-2xl text-text-muted max-w-3xl mx-auto font-light leading-relaxed px-4 italic">
          We combine cutting-edge technology with creative artistry to deliver media that captures attention and inspires action.
        </p>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16">
          {loading ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-surface rounded-[3rem] p-12 h-[500px] animate-pulse border border-border-custom" />
            ))
          ) : services.length > 0 ? (
            services.map((service, i) => {
              const Icon = ICON_MAP[service.icon || 'Video'] || Video;
              return (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  className="bg-surface rounded-[2.5rem] sm:rounded-[4rem] p-10 sm:p-16 flex flex-col justify-between hover:border-primary/20 transition-all duration-700 border border-border-custom group shadow-xl hover:shadow-2xl shadow-foreground/5 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -mr-32 -mt-32" />
                  
                  <div className="space-y-12 relative z-10">
                    <div className="flex justify-between items-start">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 bg-background border border-border-custom rounded-3xl sm:rounded-[2rem] flex items-center justify-center group-hover:scale-110 group-hover:bg-primary transition-all duration-700 shadow-inner">
                        <Icon className="w-10 h-10 sm:w-12 sm:h-12 text-primary group-hover:text-white transition-all duration-700" />
                      </div>
                      <span className="text-xs font-mono text-foreground/10 uppercase font-black tracking-widest leading-none bg-foreground/5 px-4 py-2 rounded-full">0{i+1}</span>
                    </div>
                    
                    <div className="space-y-6">
                      <h3 className="text-3xl sm:text-4xl font-display font-bold text-foreground tracking-tighter uppercase">{service.title}</h3>
                      <p className="text-text-muted leading-relaxed font-light text-base sm:text-lg italic">{service.description}</p>
                    </div>

                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {service.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center space-x-4 text-xs sm:text-sm text-text-muted font-medium">
                          <div className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20 shrink-0">
                            <CheckCircle2 className="w-3 h-3 text-primary" />
                          </div>
                          <span className="uppercase tracking-widest leading-tight">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-12 sm:mt-20 pt-10 sm:pt-16 border-t border-border-custom flex flex-col sm:flex-row justify-between items-center gap-10 relative z-10">
                    <div className="text-center sm:text-left space-y-1">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-text-muted font-black italic">Investment Structure</p>
                      <p className="text-2xl font-display font-bold text-foreground tracking-tighter">{service.price}</p>
                    </div>
                    <Link
                      to="/booking"
                      className="w-full sm:w-auto px-12 py-6 bg-primary text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 text-center scale-100 hover:scale-105 active:scale-95"
                    >
                      Secure Booking
                    </Link>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="col-span-full py-40 text-center bg-surface border border-dashed border-border-custom rounded-[4rem] flex flex-col items-center justify-center space-y-10 shadow-sm">
              <Zap className="w-24 h-24 text-foreground/5 animate-pulse" />
              <div className="space-y-4">
                <h3 className="text-3xl font-display font-bold text-foreground tracking-tight">No Services Available</h3>
                <p className="text-text-muted max-w-sm mx-auto italic font-light leading-relaxed">Our elite service packages are currently being updated. Check back soon or contact support for direct inquiries.</p>
              </div>
              {isAdmin && (
                <button
                  onClick={seedServices}
                  className="px-12 py-6 bg-primary text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                >
                  Seed Services Dataset
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Featured Video Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative aspect-video sm:aspect-[21/9] rounded-[2rem] sm:rounded-[4rem] overflow-hidden group border border-border-custom shadow-2xl bg-background">
          <img 
            src="https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&q=80&w=2070" 
            alt="Production set" 
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 opacity-40 group-hover:opacity-60 grayscale group-hover:grayscale-0"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowShowreel(true)}
              className="w-20 h-20 sm:w-32 sm:h-32 bg-primary text-white rounded-full flex items-center justify-center shadow-2xl shadow-primary/40 mb-8 relative z-10"
            >
              <div className="absolute inset-0 bg-primary rounded-full animate-ping opacity-20" />
              <Play className="w-8 h-8 sm:w-12 sm:h-12 fill-current ml-2 relative z-10" />
            </motion.button>
            <h3 className="text-2xl sm:text-5xl font-display font-bold text-foreground mb-4 tracking-tight">Watch our Live Showreel</h3>
            <p className="text-text-muted uppercase tracking-[0.4em] font-black text-[10px] max-w-xs sm:max-w-none">Premium Production Standards • Worldwide Reach</p>
          </div>
        </div>
      </section>
    </div>
  );
}
