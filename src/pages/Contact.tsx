import React from 'react';
import { motion } from 'motion/react';
import { Phone, Mail, MapPin, MessageCircle, Send, ArrowUpRight, Facebook, Twitter, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import SupportWidget from '@/components/SupportWidget';

export default function Contact() {
  const contactInfo = [
    { label: 'Email', value: 'fidetvonline@gmail.com', icon: Mail, action: 'mailto:fidetvonline@gmail.com' },
    { label: 'Support Email', value: 'fidetvmedia@gmail.com', icon: Mail, action: 'mailto:fidetvmedia@gmail.com' },
    { label: 'WhatsApp', value: '08108889805', icon: MessageCircle, action: 'https://wa.me/2348108889805' },
    { label: 'Call Us', value: '08124323608', icon: Phone, action: 'tel:08124323608' },
  ];

  const communities = [
    { name: 'Official YouTube Channel', platform: 'YouTube', url: 'https://youtube.com/@fidetvmedia?si=JkdixDjpkGPah9ay' },
    { name: 'Official Community', platform: 'Facebook', url: 'https://facebook.com/groups/958459511868313/' },
    { name: 'Buy and Sell', platform: 'Facebook', url: 'https://facebook.com/groups/2465411650373677/' },
    { name: 'Earn with FIDE TV', platform: 'Facebook', url: 'https://facebook.com/groups/245037673094842/' },
    { name: 'WhatsApp Channel', platform: 'WhatsApp', url: 'https://whatsapp.com/channel/0029Vae55YE1XquWMXqb1u1a' },
    { name: 'WhatsApp Community', platform: 'WhatsApp', url: 'https://chat.whatsapp.com/F9R8jKYTJD7LOX2rB0sAgT' },
  ];

  return (
    <div className="py-24 space-y-32 mb-32 bg-background">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-24">
          
          <div className="lg:w-1/2 space-y-16">
            <div className="space-y-8">
              <div className="flex items-center gap-3">
                 <div className="h-px w-8 bg-primary/30" />
                 <span className="text-primary font-display font-medium uppercase tracking-[0.5em] text-[10px]">Liaison Office</span>
              </div>
              <h1 className="text-6xl sm:text-8xl md:text-9xl font-display font-medium text-foreground tracking-tighter leading-[0.85] italic">
                Let's Start<br /><span className="text-primary mix-blend-difference">Architecting.</span>
              </h1>
              <p className="text-xl sm:text-2xl text-foreground font-serif font-light leading-relaxed italic opacity-70 max-w-lg">
                Have a vision in mind or ready to scale your digital infrastructure? Our engineering team is ready to materialize your objectives.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {contactInfo.map((info, i) => (
                <a
                  key={i}
                  href={info.action}
                  className="group p-10 bg-surface-bright/50 border border-border-custom rounded-[3rem] hover:bg-foreground transition-all duration-700 block relative overflow-hidden shadow-sm backdrop-blur-xl"
                >
                  <div className="relative z-10 space-y-6">
                    <div className="w-12 h-12 rounded-2xl bg-background flex items-center justify-center group-hover:bg-primary transition-all duration-700 group-hover:scale-110 shadow-lg border border-border-custom">
                       <info.icon className="w-6 h-6 text-primary group-hover:text-background transition-colors" />
                    </div>
                    <div>
                      <h4 className="text-[10px] uppercase font-black tracking-[0.4em] text-text-muted mb-1 group-hover:text-background/50 transition-colors uppercase italic">{info.label}</h4>
                      <p className="text-xl font-display font-bold text-foreground group-hover:text-background transition-colors tracking-tighter italic">{info.value}</p>
                    </div>
                  </div>
                  <ArrowUpRight className="absolute top-10 right-10 w-8 h-8 text-foreground group-hover:text-background opacity-5 group-hover:opacity-100 transition-all group-hover:translate-x-1 group-hover:-translate-y-1" />
                </a>
              ))}
            </div>
          </div>

          <div className="lg:w-1/2">
            <div className="bg-surface rounded-[4rem] p-12 sm:p-20 border border-border-custom shadow-[0_40px_100px_-20px_rgba(0,0,0,0.15)] relative overflow-hidden shadow-black/10">
               <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[150px] -mr-48 -mt-48 transition-transform duration-1000 group-hover:scale-125" />
               
                <form className="space-y-10 relative z-10">
                  <div className="space-y-4">
                    <label className="text-[10px] uppercase font-black tracking-[0.5em] text-text-muted ml-6 opacity-60">Authentication Name</label>
                    <input type="text" placeholder="Identity" className="w-full bg-background border border-border-custom rounded-3xl p-7 text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary/50 transition-all font-display shadow-2xl shadow-black/5" />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] uppercase font-black tracking-[0.5em] text-text-muted ml-6 opacity-60">Digital Signature (Email)</label>
                    <input type="email" placeholder="Verification required" className="w-full bg-background border border-border-custom rounded-3xl p-7 text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary/50 transition-all font-display shadow-2xl shadow-black/5" />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] uppercase font-black tracking-[0.5em] text-text-muted ml-6 opacity-60">Mission Objective</label>
                    <select className="w-full bg-background border border-border-custom rounded-3xl p-7 text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary/50 transition-all appearance-none font-display shadow-2xl shadow-black/5">
                      <option>Strategic Partnership</option>
                      <option>Digital Architecture (Web/App)</option>
                      <option>Cinematic Production</option>
                      <option>Global Broadcasting</option>
                      <option>Advertising Expansion</option>
                    </select>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] uppercase font-black tracking-[0.5em] text-text-muted ml-6 opacity-60">Brief / Protocol</label>
                    <textarea placeholder="Outline your vision..." className="w-full bg-background border border-border-custom rounded-3xl p-7 text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary/50 transition-all min-h-[200px] resize-none font-display shadow-2xl shadow-black/5"></textarea>
                  </div>

                  <button className="w-full bg-primary text-white font-black uppercase tracking-[0.4em] py-8 rounded-3xl hover:bg-primary/90 transition-all flex items-center justify-center space-x-6 shadow-2xl shadow-primary/30 group font-display text-xs">
                    <span>Initialize Communication</span>
                    <Send className="w-6 h-6 group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform" />
                  </button>
               </form>
            </div>
          </div>

        </div>
      </section>

      {/* Communities Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-48">
        <div className="space-y-20">
          <div className="flex flex-col sm:flex-row justify-between items-end gap-8">
             <div className="space-y-6">
                <h2 className="text-[10px] font-black uppercase tracking-[0.6em] text-primary">Global Presence</h2>
                <h3 className="text-5xl sm:text-8xl font-display font-medium text-foreground tracking-tighter italic leading-none">Join the<br />Ecosystem.</h3>
             </div>
             <p className="text-text-muted font-serif italic text-lg sm:text-2xl max-w-md opacity-60 leading-relaxed">
               Sync with our creative hub across various platforms and broadcast channels.
             </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {communities.map((community, i) => (
              <a
                key={i}
                href={community.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group p-10 bg-surface rounded-[3rem] hover:border-primary/30 hover:bg-surface-bright transition-all duration-500 flex items-center justify-between border-border-custom shadow-xl shadow-black/5"
              >
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-[10px] uppercase font-black tracking-[0.5em] text-primary">{community.platform}</span>
                    <div className="w-1.5 h-1.5 bg-primary/20 rounded-full" />
                  </div>
                  <h3 className="text-2xl font-display font-bold text-foreground group-hover:text-primary transition-colors italic tracking-tight">{community.name}</h3>
                </div>
                <div className="w-16 h-16 rounded-full bg-background flex items-center justify-center group-hover:bg-primary group-hover:text-white text-foreground/40 transition-all shadow-lg border border-border-custom group-hover:scale-110">
                  <ArrowUpRight className="w-8 h-8" />
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Map Placeholder */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <div className="h-[500px] bg-surface rounded-[4rem] overflow-hidden relative border border-border-custom shadow-2xl">
           <img 
            src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&q=80&w=2068" 
            alt="Map" 
            className="w-full h-full object-cover opacity-10 contrast-125 grayscale"
            referrerPolicy="no-referrer"
           />
           <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-40" />
           <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-10">
                 <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_#f27d2666] animate-bounce-slow border-4 border-white/20">
                    <MapPin className="w-10 h-10 text-white" />
                 </div>
                 <div className="space-y-4">
                    <h4 className="font-display font-black text-white text-3xl sm:text-5xl uppercase italic tracking-tighter">Command Center</h4>
                    <p className="text-white/40 font-mono text-[10px] uppercase tracking-[0.5em]">Lagos Gateway • Nigeria Headquarters</p>
                 </div>
              </div>
           </div>
        </div>
      </section>
      <SupportWidget />
    </div>
  );
}
