import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Video, Play, Camera, Mic, Radio, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Services() {
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
    <div className="py-24 space-y-32 mb-32">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h4 className="text-primary font-display font-bold uppercase tracking-[0.5em] text-xs mb-4">What We Do</h4>
          <h1 className="text-6xl sm:text-8xl font-display font-bold text-white tracking-tighter leading-tight italic">
            Elite Media<br />Services
          </h1>
        </motion.div>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto font-light leading-relaxed">
          We combine cutting-edge technology with creative artistry to deliver media that captures attention and inspires action.
        </p>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {services.map((service, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="glass rounded-[3rem] p-12 flex flex-col justify-between hover:bg-white/5 transition-all duration-500 border-white/5"
            >
              <div className="space-y-8">
                <div className="flex justify-between items-start">
                  <div className="w-20 h-20 bg-surface-bright rounded-3xl flex items-center justify-center border border-white/10 group-hover:bg-primary transition-all duration-500">
                    <service.icon className="w-10 h-10 text-primary group-hover:text-white" />
                  </div>
                  <span className="text-xs font-mono text-gray-600 uppercase tracking-widest leading-none">0{i+1}</span>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-3xl font-display font-bold text-white tracking-tight">{service.title}</h3>
                  <p className="text-gray-400 leading-relaxed font-light">{service.description}</p>
                </div>

                <ul className="space-y-4">
                  {service.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center space-x-3 text-sm text-gray-400">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-12 pt-12 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="text-center sm:text-left">
                  <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-1 font-bold">Investment</p>
                  <p className="text-xl font-display font-bold text-white underline decoration-primary underline-offset-8 decoration-2">{service.price}</p>
                </div>
                <Link
                  to="/booking"
                  className="px-8 py-4 bg-white text-black font-black uppercase tracking-widest text-xs rounded-full hover:bg-primary hover:text-white transition-all shadow-xl shadow-black/20"
                >
                  Book Now
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Featured Video Placeholder */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative aspect-[21/9] rounded-[3rem] overflow-hidden group">
          <img 
            src="https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&q=80&w=2070" 
            alt="Production set" 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-60"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="w-24 h-24 bg-primary text-white rounded-full flex items-center justify-center shadow-2xl shadow-primary/40 mb-8"
            >
              <Play className="w-10 h-10 fill-current ml-2" />
            </motion.button>
            <h3 className="text-3xl font-display font-bold text-white mb-2">Watch our Showreel</h3>
            <p className="text-gray-400 uppercase tracking-[0.3em] font-bold text-[10px]">Production Quality Standard</p>
          </div>
        </div>
      </section>
    </div>
  );
}
