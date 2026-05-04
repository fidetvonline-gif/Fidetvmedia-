import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { Video, Play, Camera, Mic, Radio, Zap, ArrowRight, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactPlayer from 'react-player';

const Player = ReactPlayer as any;

export default function Services() {
  const [showShowreel, setShowShowreel] = useState(false);
  const services = [
    {
      title: 'Video Production',
      icon: Video,
      description: 'From concept to final cut, we create cinematic video content that tells your story with power and precision.',
      features: ['4K Cinematography', 'Professional Editing', 'Motion Graphics', 'Sound Design'],
      price: 'Starting at ₦1,500,000'
    },
    {
      title: 'Live Streaming',
      icon: Radio,
      description: 'Ultra-low latency, multi-camera broadcasting for concerts, conferences, and virtual events.',
      features: ['Multi-platform Stream', 'Live Tech Support', 'Interaction Tools', 'HD Quality'],
      price: 'Starting at ₦2,000,000'
    },
    {
      title: 'Event Coverage',
      icon: Camera,
      description: 'Comprehensive media coverage for large-scale events, combining photography and videography.',
      features: ['Full Day Coverage', 'Quick Turnaround', 'High-Res Photos', 'Highlight Reels'],
      price: 'Starting at ₦3,000,000'
    },
    {
      title: 'Interviews & Podcasts',
      icon: Mic,
      description: 'Professional sets and high-end audio for crisp, engaging talk content and interviews.',
      features: ['Multi-Mic Setup', 'Video Recording', 'Lighting Design', 'Post Production'],
      price: 'Starting at ₦800,000'
    }
  ];

  return (
    <div className="py-24 space-y-32 mb-32 relative">
      {/* Showreel Modal */}
      <AnimatePresence>
        {showShowreel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-8"
          >
            <div className="relative w-full max-w-6xl aspect-video bg-black rounded-[2rem] overflow-hidden shadow-2xl border border-white/10">
              <button
                onClick={() => setShowShowreel(false)}
                className="absolute top-4 right-4 z-50 p-3 bg-black/50 hover:bg-white/10 rounded-full text-white backdrop-blur-md transition-all active:scale-90"
              >
                <X className="w-6 h-6" />
              </button>
              <Player
                url="https://www.youtube.com/watch?v=Fj-Yv0k-U04" // PlaceholderID
                width="100%"
                height="100%"
                playing
                controls
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h4 className="text-primary font-display font-bold uppercase tracking-[0.5em] text-[10px] sm:text-xs mb-4">What We Do</h4>
          <h1 className="text-4xl sm:text-6xl md:text-8xl font-display font-bold text-white tracking-tighter leading-[0.9] italic">
            Elite Media<br />Services
          </h1>
        </motion.div>
        <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto font-light leading-relaxed px-4">
          We combine cutting-edge technology with creative artistry to deliver media that captures attention and inspires action.
        </p>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {services.map((service, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              className="glass rounded-[2rem] sm:rounded-[3rem] p-8 sm:p-12 flex flex-col justify-between hover:bg-white/5 transition-all duration-500 border-white/5 group"
            >
              <div className="space-y-8">
                <div className="flex justify-between items-start">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-surface-bright rounded-2xl sm:rounded-3xl flex items-center justify-center border border-white/10 group-hover:bg-primary transition-all duration-500">
                    <service.icon className="w-8 h-8 sm:w-10 sm:h-10 text-primary group-hover:text-white transition-colors" />
                  </div>
                  <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest leading-none">0{i+1}</span>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">{service.title}</h3>
                  <p className="text-gray-400 leading-relaxed font-light text-sm sm:text-base">{service.description}</p>
                </div>

                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {service.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center space-x-3 text-xs sm:text-sm text-gray-400">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-10 sm:mt-12 pt-10 sm:pt-12 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="text-center sm:text-left">
                  <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-1 font-bold">Investment</p>
                  <p className="text-xl font-display font-bold text-white underline decoration-primary underline-offset-8 decoration-2">{service.price}</p>
                </div>
                <Link
                  to="/booking"
                  className="w-full sm:w-auto px-10 py-5 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-primary hover:text-white transition-all shadow-xl shadow-black/20 text-center"
                >
                  Book Now
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Featured Video Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative aspect-video sm:aspect-[21/9] rounded-[2rem] sm:rounded-[4rem] overflow-hidden group border border-white/5 shadow-2xl">
          <img 
            src="https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&q=80&w=2070" 
            alt="Production set" 
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 opacity-40 group-hover:opacity-60"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowShowreel(true)}
              className="w-20 h-20 sm:w-32 sm:h-32 bg-primary text-white rounded-full flex items-center justify-center shadow-2xl shadow-primary/40 mb-8 relative"
            >
              <div className="absolute inset-0 bg-primary rounded-full animate-ping opacity-20" />
              <Play className="w-8 h-8 sm:w-12 sm:h-12 fill-current ml-2 relative z-10" />
            </motion.button>
            <h3 className="text-2xl sm:text-5xl font-display font-bold text-white mb-4 tracking-tight">Watch our Live Showreel</h3>
            <p className="text-gray-400 uppercase tracking-[0.4em] font-black text-[10px] max-w-xs sm:max-w-none">Premium Production Standards • Worldwide Reach</p>
          </div>
        </div>
      </section>
    </div>
  );
}
