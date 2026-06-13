import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Award, Target, Eye, Users, Zap, Heart, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function About() {
  const [certUrl, setCertUrl] = useState('');
  const [smedanUrl, setSmedanUrl] = useState('');

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      return;
    }

    // Fetch CAC
    const { data: { publicUrl: cacUrl } } = supabase.storage
      .from('event-thumbnails')
      .getPublicUrl('cac_certificate');
      
    // Fetch SMEDAN
    const { data: { publicUrl: sUrl } } = supabase.storage
      .from('event-thumbnails')
      .getPublicUrl('smedan_certificate');
      
    // Check CAC
    try {
      const res = await fetch(cacUrl, { method: 'HEAD', credentials: 'include' });
      if (res.ok) setCertUrl(cacUrl + '?t=' + Date.now());
    } catch (e) {}

    // Check SMEDAN
    try {
      const res = await fetch(sUrl, { method: 'HEAD', credentials: 'include' });
      if (res.ok) setSmedanUrl(sUrl + '?t=' + Date.now());
    } catch (e) {}
  };

  return (
    <div className="py-24 space-y-32 mb-32 bg-background">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-20 items-center">
          <div className="lg:w-1/2 space-y-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                 <div className="h-px w-8 bg-primary/30" />
                 <span className="text-primary font-display font-medium uppercase tracking-[0.5em] text-[10px]">The Genesis</span>
              </div>
              <h1 className="text-5xl sm:text-7xl md:text-9xl font-display font-bold text-foreground tracking-tighter leading-[0.85] italic">
                Beyond the<br /><span className="text-primary mix-blend-difference">Aesthetic.</span>
              </h1>
            </motion.div>
            <p className="text-xl sm:text-2xl text-foreground font-serif font-light leading-relaxed italic opacity-80">
              Founded at the intersection of media and digital engineering, FideTV architected a new paradigm: where cinematic excellence meets high-performance software.
            </p>
            <div className="space-y-8">
              <p className="text-text-muted leading-relaxed font-light italic max-w-xl">
                Today, we operate as a full-spectrum digital agency and premium content network. We don't just capture data or frames; we engineer experiences that dominate the digital landscape.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {certUrl && (
                  <div className="p-8 bg-surface-bright/50 backdrop-blur-xl rounded-[2rem] border border-border-custom flex flex-col items-start space-y-6 transition-all hover:bg-surface group">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                      <h4 className="text-foreground font-black text-[10px] uppercase tracking-widest leading-none">CAC Registered</h4>
                    </div>
                    <p className="text-text-muted text-[11px] leading-relaxed italic">Registered with the Corporate Affairs Commission (BN - 3647744).</p>
                    <a href={certUrl} target="_blank" rel="noopener noreferrer" className="text-primary group-hover:text-foreground text-[10px] font-black uppercase tracking-[0.3em] transition-all">
                      Verification Certificate &rarr;
                    </a>
                  </div>
                )}

                {smedanUrl && (
                  <div className="p-8 bg-surface-bright/50 backdrop-blur-xl rounded-[2rem] border border-border-custom flex flex-col items-start space-y-6 transition-all hover:bg-surface group">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                      <h4 className="text-foreground font-black text-[10px] uppercase tracking-widest leading-none">SMEDAN Verified</h4>
                    </div>
                    <p className="text-text-muted text-[11px] leading-relaxed italic">Verified with the Small and Medium Enterprises Development Agency. (SUIN28515358)</p>
                    <a href={smedanUrl} target="_blank" rel="noopener noreferrer" className="text-primary group-hover:text-foreground text-[10px] font-black uppercase tracking-[0.3em] transition-all">
                      Verification Certificate &rarr;
                    </a>
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6 sm:gap-12 pt-12 border-t border-border-custom">
              <div>
                <h3 className="text-4xl sm:text-6xl font-display font-medium text-foreground tracking-tighter italic">12</h3>
                <p className="text-[10px] uppercase tracking-[0.4em] text-text-muted font-black mt-2">Years of Mastery</p>
              </div>
              <div>
                <h3 className="text-4xl sm:text-6xl font-display font-medium text-foreground tracking-tighter italic">450+</h3>
                <p className="text-[10px] uppercase tracking-[0.4em] text-text-muted font-black mt-2">Global Projects</p>
              </div>
            </div>
          </div>

          <div className="lg:w-1/2 relative">
             <div className="relative aspect-[4/5] rounded-[4rem] overflow-hidden shadow-2xl border border-border-custom bg-surface">
                <img 
                  src="https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&q=80&w=2071" 
                  alt="Our Team" 
                  className="w-full h-full object-cover grayscale opacity-30 group-hover:scale-105 transition-all duration-1000"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-60" />
             </div>
             {/* Floating Accent */}
             <div className="absolute -bottom-10 -right-10 w-56 h-56 bg-surface border border-border-custom rounded-[3rem] p-10 hidden sm:flex flex-col justify-center space-y-6 shadow-2xl backdrop-blur-xl">
                <Zap className="w-10 h-10 text-primary" />
                <p className="text-[10px] font-black text-foreground uppercase tracking-[0.4em] leading-tight italic">Driven by<br />Innovation</p>
             </div>
          </div>
        </div>
      </section>

       {/* Values */}
      <section className="bg-surface-bright/30 backdrop-blur-md py-32 sm:py-48 mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="flex flex-col sm:flex-row justify-between items-end mb-24 gap-8">
              <div className="space-y-6">
                 <h2 className="text-[10px] font-black uppercase tracking-[0.6em] text-primary">Core Philosophy</h2>
                 <h3 className="text-5xl sm:text-8xl font-display font-medium text-foreground tracking-tighter italic leading-none">Built on<br />Principles.</h3>
              </div>
              <p className="text-text-muted font-serif italic text-lg sm:text-2xl max-w-md opacity-60 leading-relaxed">
                We believe in systemic excellence and creative integrity as the foundation for every project.
              </p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-16 sm:gap-24">
              {[
                { title: 'Excellence', description: 'We never settle for "good enough". Every pixel and frame must resonate with perfection.', icon: Award },
                { title: 'Community', description: 'FideTV is a hub for connection. We prioritize collective growth over individual gain.', icon: Heart },
                { title: 'Innovation', description: 'Constantly pushing the boundaries of what streaming and digital expression can achieve.', icon: Target },
              ].map((val, i) => (
                <div key={i} className="space-y-10 group">
                  <div className="w-20 h-20 bg-background rounded-3xl flex items-center justify-center border border-border-custom transition-all group-hover:scale-110 group-hover:bg-primary group-hover:text-white shadow-xl">
                    <val.icon className="w-10 h-10 transition-colors" />
                  </div>
                  <div className="space-y-6">
                    <h4 className="text-3xl sm:text-4xl font-display font-medium text-foreground tracking-tighter italic">{val.title}</h4>
                    <p className="text-text-muted font-serif font-light leading-relaxed italic text-lg sm:text-xl opacity-70 group-hover:opacity-100 transition-opacity">{val.description}</p>
                  </div>
                </div>
              ))}
           </div>
        </div>
      </section>
    </div>
  );
}
