import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { Video, Play, Camera, Mic, Radio, Zap, ArrowRight, CheckCircle2, X, Monitor, Smartphone, Layout, Cpu, BarChart3, Globe } from 'lucide-react';
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
  Monitor,
  Smartphone,
  Layout,
  Cpu,
  BarChart3,
  Globe
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
        title: 'Digital Engineering',
        icon: 'Monitor',
        description: 'Elite web architectures and specialized website creation engineered for high-performance digital ecosystems.',
        features: ['Premium Web Design', 'Custom API Architecture', 'Cloud Infrastructure', 'Sophisticated UX/UI'],
        price: 'Starting at ₦1,800,000',
        order_index: 0
      },
      {
        title: 'Hub Ecosystems',
        icon: 'Smartphone',
        description: 'Native and cross-platform mobile applications that deliver seamless, high-density user experiences.',
        features: ['iOS & Android Systems', 'Real-time Synchronization', 'Premium UI Components', 'Store Optimization'],
        price: 'Starting at ₦2,500,000',
        order_index: 1
      },
      {
        title: 'Premium Advertising',
        icon: 'BarChart3',
        description: 'Strategic brand placement and targeted media campaigns designed for maximum market penetration.',
        features: ['Ad Placement Strategy', 'Targeted Campaigns', 'Performance Analytics', 'Media Buying'],
        price: 'Starting at ₦1,000,000',
        order_index: 2
      },
      {
        title: 'Cinematic Production',
        icon: 'Video',
        description: 'High-end visual storytelling and brand cinematography that captures attention and elevates identity.',
        features: ['8K Narrative Production', 'Elite Color Grading', 'Motion Directing', 'Sound Engineering'],
        price: 'Starting at ₦3,000,000',
        order_index: 3
      },
      {
        title: 'Global Streaming',
        icon: 'Radio',
        description: 'Standard-setting live broadcasting with worldwide reach and ultra-low latency infrastructure.',
        features: ['Multi-Region CDNs', 'Interactive Live Tools', 'Broadcast Engineering', 'Full Event Mastery'],
        price: 'Starting at ₦2,200,000',
        order_index: 4
      },
      {
        title: 'Brand Architecture',
        icon: 'Layout',
        description: 'Strategic digital identity and ecosystem design that positions brands for market dominance.',
        features: ['Design Systems', 'Strategy Research', 'Asset Architecture', 'Market Positioning'],
        price: 'Starting at ₦1,500,000',
        order_index: 5
      },
      {
        title: 'Signature Shows',
        icon: 'Mic',
        description: 'Premium content frameworks and podcast architectures designed for maximum engagement and retention.',
        features: ['Multi-Camera Setup', 'Audio Engineering', 'Guest Strategy', 'Post-Production'],
        price: 'Starting at ₦1,200,000',
        order_index: 6
      },
      {
        title: 'Media Strategy',
        icon: 'Globe',
        description: 'Futuristic consulting and long-term content roadmaps for the evolving media landscape.',
        features: ['Future Readiness', 'Content Roadmaps', 'Innovation Labs', 'Trend Analysis'],
        price: 'Starting at ₦2,000,000',
        order_index: 7
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

  const fallbackServices = [
    {
      id: 'd1',
      title: 'Digital Engineering',
      icon: 'Monitor',
      description: 'Elite web architectures and specialized website creation engineered for high-performance digital ecosystems.',
      features: ['Premium Web Design', 'Custom API Architecture', 'Cloud Infrastructure', 'Sophisticated UX/UI'],
      price: 'Starting at ₦1,800,000',
    },
    {
      id: 'd2',
      title: 'Hub Ecosystems',
      icon: 'Smartphone',
      description: 'Native and cross-platform mobile applications that deliver seamless, high-density user experiences.',
      features: ['iOS & Android Systems', 'Real-time Synchronization', 'Premium UI Components', 'Store Optimization'],
      price: 'Starting at ₦2,500,000',
    },
    {
      id: 'd3',
      title: 'Premium Advertising',
      icon: 'BarChart3',
      description: 'Strategic brand placement and targeted media campaigns designed for maximum market penetration.',
      features: ['Ad Placement Strategy', 'Targeted Campaigns', 'Performance Analytics', 'Media Buying'],
      price: 'Starting at ₦1,000,000',
    },
    {
      id: 'd4',
      title: 'Cinematic Production',
      icon: 'Video',
      description: 'High-end visual storytelling and brand cinematography that captures attention and elevates identity.',
      features: ['8K Narrative Production', 'Elite Color Grading', 'Motion Directing', 'Sound Engineering'],
      price: 'Starting at ₦3,000,000',
    },
    {
      id: 'd5',
      title: 'Global Streaming',
      icon: 'Radio',
      description: 'Standard-setting live broadcasting with worldwide reach and ultra-low latency infrastructure.',
      features: ['Multi-Region CDNs', 'Interactive Live Tools', 'Broadcast Engineering', 'Full Event Mastery'],
      price: 'Starting at ₦2,200,000',
    },
    {
      id: 'd6',
      title: 'Brand Architecture',
      icon: 'Layout',
      description: 'Strategic digital identity and ecosystem design that positions brands for market dominance.',
      features: ['Design Systems', 'Strategy Research', 'Asset Architecture', 'Market Positioning'],
      price: 'Starting at ₦1,500,000',
    },
    {
      id: 'd7',
      title: 'Signature Shows',
      icon: 'Mic',
      description: 'Premium content frameworks and podcast architectures designed for maximum engagement and retention.',
      features: ['Multi-Camera Setup', 'Audio Engineering', 'Guest Strategy', 'Post-Production'],
      price: 'Starting at ₦1,200,000',
    },
    {
      id: 'd8',
      title: 'Media Strategy',
      icon: 'Globe',
      description: 'Futuristic consulting and long-term content roadmaps for the evolving media landscape.',
      features: ['Future Readiness', 'Content Roadmaps', 'Innovation Labs', 'Trend Analysis'],
      price: 'Starting at ₦2,000,000',
    }
  ];

  const displayServices = services.length > 0 ? services : (loading ? [] : fallbackServices);

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
            <span className="text-primary font-display font-black uppercase tracking-[0.5em] text-[10px] sm:text-xs">Excellence in Digital</span>
            <div className="h-px w-8 bg-primary/30" />
          </div>
          <h1 className="text-5xl sm:text-7xl md:text-9xl font-display font-bold text-foreground tracking-tighter leading-[0.8] italic">
            Elite Digital<br />Solutions.
          </h1>
        </motion.div>
        <p className="text-lg sm:text-2xl text-text-muted max-w-3xl mx-auto font-serif font-light leading-relaxed px-4 italic opacity-80">
          We combine cutting-edge technology with creative mastery to deliver experiences that transcend the ordinary. From cinematic production to software architecture.
        </p>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16">
          {loading ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-surface rounded-[3rem] p-12 h-[500px] animate-pulse border border-border-custom" />
            ))
          ) : displayServices.length > 0 ? (
            displayServices.map((service, i) => {
              const Icon = ICON_MAP[service.icon || 'Video'] || Video;
              return (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  className="bg-surface rounded-[3rem] sm:rounded-[5rem] p-10 sm:p-20 flex flex-col justify-between hover:border-primary/20 transition-all duration-700 border border-border-custom group shadow-2xl hover:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] shadow-black/5 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[120px] -mr-40 -mt-40 transition-transform duration-700 group-hover:scale-125" />
                  
                  <div className="space-y-16 relative z-10">
                    <div className="flex justify-between items-start">
                      <div className="w-24 h-24 sm:w-32 sm:h-32 bg-background border border-border-custom rounded-[2.5rem] flex items-center justify-center group-hover:scale-105 group-hover:bg-primary group-hover:border-primary transition-all duration-700 shadow-xl">
                        <Icon className="w-12 h-12 sm:w-16 sm:h-16 text-primary group-hover:text-white transition-all duration-700" />
                      </div>
                      <span className="text-xs font-mono text-foreground/5 uppercase font-black tracking-widest leading-none bg-foreground/5 px-6 py-3 rounded-full">INDEX_0{i+1}</span>
                    </div>
                    
                    <div className="space-y-8">
                      <h3 className="text-4xl sm:text-6xl font-display font-medium text-foreground tracking-tighter italic leading-none">{service.title}</h3>
                      <p className="text-text-muted leading-relaxed font-serif font-light text-lg sm:text-2xl italic opacity-70 group-hover:opacity-100 transition-opacity">{service.description}</p>
                    </div>

                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-8 border-t border-border-custom/50">
                      {service.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center space-x-4 text-xs sm:text-sm text-text-muted font-bold tracking-[0.1em] uppercase">
                          <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20 shrink-0">
                            <CheckCircle2 className="w-3 h-3 text-primary" />
                          </div>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-16 sm:mt-24 pt-16 border-t border-border-custom flex flex-col sm:flex-row justify-between items-center gap-12 relative z-10">
                    <div className="text-center sm:text-left space-y-2">
                      <p className="text-[10px] uppercase tracking-[0.4em] text-text-muted font-black">Project Threshold</p>
                      <p className="text-3xl sm:text-4xl font-display font-black text-foreground tracking-tighter">{service.price}</p>
                    </div>
                    <Link
                      to="/booking"
                      className="w-full sm:w-auto px-14 py-7 bg-primary text-white font-black uppercase tracking-[0.3em] text-xs rounded-3xl hover:bg-primary/90 transition-all shadow-2xl shadow-primary/30 text-center scale-100 hover:scale-105 active:scale-95"
                    >
                      Initialize Project
                    </Link>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="col-span-full py-40 text-center bg-surface border border-dashed border-border-custom rounded-[5rem] flex flex-col items-center justify-center space-y-12 shadow-sm">
              <Zap className="w-24 h-24 text-foreground/5 animate-pulse" />
              <div className="space-y-6">
                <h3 className="text-4xl font-display font-bold text-foreground tracking-tighter italic">Studio Refresh in Progress</h3>
                <p className="text-text-muted max-w-sm mx-auto font-serif italic font-light text-lg leading-relaxed opacity-60">Our elite service architecture is currently undergoing a systemic transition. Direct inquiries remain active.</p>
              </div>
              {isAdmin && (
                <button
                  onClick={seedServices}
                  className="px-14 py-7 bg-primary text-white font-black uppercase tracking-[0.3em] text-xs rounded-3xl shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
                >
                  Deploy Service Framework
                </button>
              )}
            </div>
          )}
        </div>
      </section>


      {/* Future of Media Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 border-t border-border-custom relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        
        <div className="flex flex-col lg:flex-row gap-20 items-center">
          <div className="lg:w-1/2 space-y-12">
            <div className="space-y-6">
              <h2 className="text-4xl sm:text-6xl font-display font-bold text-foreground tracking-tighter italic">
                The Future<br />of Media.
              </h2>
              <p className="text-xl text-text-muted font-serif font-light leading-relaxed italic opacity-80">
                We are not just observers of the digital revolution; we are its architects. Our innovation lab is dedicated to the next frontier of human connection and strategic advertising.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {[
                { title: 'AI-Driven Content', desc: 'Generative architectures for personalized storytelling.' },
                { title: 'Immersive Realities', desc: 'VR/AR ecosystems that transcend physical boundaries.' },
                { title: 'Meta-Communities', desc: 'Hyper-engaged hubs with zero-friction interaction.' },
                { title: 'Predictive Advertising', desc: 'Data-informed creative that anticipates audience desire.' }
              ].map((item, i) => (
                <div key={i} className="space-y-4 p-8 bg-surface rounded-[2rem] border border-border-custom hover:border-primary/20 transition-all group">
                   <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                      <Zap className="w-5 h-5" />
                   </div>
                   <h4 className="text-lg font-display font-medium text-foreground">{item.title}</h4>
                   <p className="text-sm text-text-muted leading-relaxed italic">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
          
          <div className="lg:w-1/2 relative">
             <div className="relative aspect-square rounded-[5rem] overflow-hidden border border-border-custom shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200" 
                  className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000 scale-110 hover:scale-100" 
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
             </div>
             <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-primary/20 rounded-full blur-[80px] animate-pulse" />
             <div className="absolute -top-10 -left-10 w-48 h-48 bg-primary/10 rounded-full blur-[60px]" />
          </div>
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
