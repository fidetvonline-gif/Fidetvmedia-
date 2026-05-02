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
      const res = await fetch(cacUrl, { method: 'HEAD' });
      if (res.ok) setCertUrl(cacUrl + '?t=' + Date.now());
    } catch (e) {}

    // Check SMEDAN
    try {
      const res = await fetch(sUrl, { method: 'HEAD' });
      if (res.ok) setSmedanUrl(sUrl + '?t=' + Date.now());
    } catch (e) {}
  };

  return (
    <div className="py-24 space-y-32 mb-32">
       <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-20 items-center">
          <div className="lg:w-1/2 space-y-10">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <h4 className="text-primary font-display font-bold uppercase tracking-[0.5em] text-xs mb-4">Our Story</h4>
              <h1 className="text-5xl sm:text-7xl font-display font-bold text-white tracking-tighter leading-tight italic">
                Beyond the<br /><span className="text-primary">Lens.</span>
              </h1>
            </motion.div>
            <p className="text-xl text-gray-400 font-light leading-relaxed">
              Founded at the intersection of media and community, FideTV started with a simple mission: to make professional-grade broadcasting and media production accessible to everyone.
            </p>
            <div className="space-y-6">
              <p className="text-gray-500 leading-relaxed font-light">
                Today, we are a full-scale media agency and streaming platform serving thousands of creators and hundreds of businesses. Our commitment to quality and community remains unchanged. We don't just capture events; we create experiences that last.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {certUrl && (
                  <div className="p-6 glass rounded-2xl border border-white/10 flex flex-col items-start space-y-4">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
                      <h4 className="text-white font-bold text-sm">CAC Registered</h4>
                    </div>
                    <p className="text-gray-400 text-[10px] leading-relaxed">FIDE TV MEDIA is registered with the Corporate Affairs Commission (BN - 3647744).</p>
                    <a href={certUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors">
                      View Certificate &rarr;
                    </a>
                  </div>
                )}

                {smedanUrl && (
                  <div className="p-6 glass rounded-2xl border border-white/10 flex flex-col items-start space-y-4">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
                      <h4 className="text-white font-bold text-sm">SMEDAN Verified</h4>
                    </div>
                    <p className="text-gray-400 text-[10px] leading-relaxed">FIDE TV MEDIA is a verified entity with the Small and Medium Enterprises Development Agency. (Number - SUIN28515358)</p>
                    <a href={smedanUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors">
                      View Certificate &rarr;
                    </a>
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-8 pt-10 border-t border-white/5">
              <div>
                <h3 className="text-4xl font-display font-bold text-white">12</h3>
                <p className="text-[10px] uppercase tracking-widest text-gray-600 font-bold">Years Experience</p>
              </div>
              <div>
                <h3 className="text-4xl font-display font-bold text-white">450+</h3>
                <p className="text-[10px] uppercase tracking-widest text-gray-600 font-bold">Success Events</p>
              </div>
            </div>
          </div>

          <div className="lg:w-1/2 relative">
             <div className="relative aspect-[4/5] rounded-[3rem] overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&q=80&w=2071" 
                  alt="Our Team" 
                  className="w-full h-full object-cover grayscale opacity-60"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
             </div>
             {/* Floating Accent */}
             <div className="absolute -bottom-10 -right-10 w-48 h-48 glass rounded-[2rem] p-8 hidden sm:flex flex-col justify-center space-y-2 border-primary/20">
                <Zap className="w-8 h-8 text-primary" />
                <p className="text-xs font-bold text-white uppercase tracking-widest">Driven by Innovation</p>
             </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-surface py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="text-center mb-20 space-y-4">
              <h2 className="text-small-caps text-primary">Core Values</h2>
              <h3 className="text-4xl sm:text-5xl font-display font-bold text-white">Built on Principles.</h3>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {[
                { title: 'Excellence', description: 'We never settle for "good enough". Every frame must be perfect.', icon: Award },
                { title: 'Community', description: 'FideTV is a hub for connection. We grow when our community grows.', icon: Heart },
                { title: 'Innovation', description: 'Constantly pushing the boundaries of what streaming and media can be.', icon: Target },
              ].map((val, i) => (
                <div key={i} className="space-y-6">
                  <div className="w-16 h-16 bg-background rounded-2xl flex items-center justify-center border border-white/5">
                    <val.icon className="w-8 h-8 text-primary" />
                  </div>
                  <h4 className="text-2xl font-display font-bold text-white">{val.title}</h4>
                  <p className="text-gray-500 font-light leading-relaxed">{val.description}</p>
                </div>
              ))}
           </div>
        </div>
      </section>
    </div>
  );
}
