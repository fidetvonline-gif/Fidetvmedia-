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
        <div className="flex flex-col lg:flex-row gap-20">
          
          <div className="lg:w-1/2 space-y-12">
            <div className="space-y-6">
              <h4 className="text-primary font-display font-bold uppercase tracking-[0.5em] text-xs">Get In Touch</h4>
              <h1 className="text-6xl sm:text-8xl font-display font-bold text-foreground tracking-tighter leading-tight italic">
                Let's Start<br /><span className="text-primary">Streaming.</span>
              </h1>
              <p className="text-xl text-foreground/60 font-light leading-relaxed max-w-md italic">
                Have a project in mind or want to inquire about join our community? We're ready to help you elevate your media.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {contactInfo.map((info, i) => (
                <a
                  key={i}
                  href={info.action}
                  className="group p-8 bg-surface border border-border-custom rounded-[2rem] hover:bg-foreground transition-all duration-500 block relative overflow-hidden shadow-sm"
                >
                  <div className="relative z-10 space-y-4">
                    <info.icon className="w-8 h-8 text-primary group-hover:text-background transition-colors" />
                    <div>
                      <h4 className="text-[10px] uppercase font-black tracking-widest text-foreground/40 mb-1 group-hover:text-background/60">{info.label}</h4>
                      <p className="text-lg font-display font-bold text-foreground group-hover:text-background transition-colors">{info.value}</p>
                    </div>
                  </div>
                  <ArrowUpRight className="absolute top-8 right-8 w-6 h-6 text-foreground group-hover:text-background opacity-20 group-hover:opacity-100 transition-all group-hover:scale-125" />
                </a>
              ))}
            </div>
          </div>

          <div className="lg:w-1/2">
            <div className="bg-surface rounded-[3rem] p-10 sm:p-16 border border-border-custom shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] -mr-32 -mt-32" />
               
               <form className="space-y-8 relative z-10">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black tracking-widest text-foreground/40 ml-4">Full Name</label>
                    <input type="text" placeholder="John Doe" className="w-full bg-background border border-border-custom rounded-2xl p-5 text-foreground placeholder-foreground/20 focus:outline-none focus:border-primary/50 transition-all font-display shadow-inner" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black tracking-widest text-foreground/40 ml-4">Email Address</label>
                    <input type="email" placeholder="john@example.com" className="w-full bg-background border border-border-custom rounded-2xl p-5 text-foreground placeholder-foreground/20 focus:outline-none focus:border-primary/50 transition-all font-display shadow-inner" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black tracking-widest text-foreground/40 ml-4">Subject</label>
                    <select className="w-full bg-background border border-border-custom rounded-2xl p-5 text-foreground placeholder-foreground/20 focus:outline-none focus:border-primary/50 transition-all appearance-none font-display shadow-inner">
                      <option>General Inquiry</option>
                      <option>Media Production</option>
                      <option>Live Streaming</option>
                      <option>Advertising / Sponsorship</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black tracking-widest text-foreground/40 ml-4">Message</label>
                    <textarea placeholder="How can we help you?" className="w-full bg-background border border-border-custom rounded-2xl p-5 text-foreground placeholder-foreground/20 focus:outline-none focus:border-primary/50 transition-all min-h-[150px] resize-none font-display shadow-inner"></textarea>
                  </div>

                  <button className="w-full bg-primary text-white font-black uppercase tracking-[0.2em] py-6 rounded-2xl hover:bg-primary/90 transition-all flex items-center justify-center space-x-4 shadow-xl shadow-primary/20 group font-display">
                    <span>Send Message</span>
                    <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </button>
               </form>
            </div>
          </div>

        </div>
      </section>

      {/* Communities Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-display font-bold text-foreground tracking-tight">Join Our Communities</h2>
            <p className="text-foreground/60 max-w-2xl mx-auto italic">
              Be part of the FideTV ecosystem. Connect with creators, traders, and fans across our various platforms.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {communities.map((community, i) => (
              <a
                key={i}
                href={community.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group p-8 glass rounded-[2rem] hover:border-primary/30 hover:bg-surface transition-all duration-300 flex items-center justify-between border-border-custom"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] uppercase font-black tracking-widest text-primary">{community.platform}</span>
                    <div className="w-1 h-1 bg-foreground/10 rounded-full" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-foreground group-hover:text-primary transition-colors">{community.name}</h3>
                </div>
                <div className="w-12 h-12 rounded-full bg-foreground/5 flex items-center justify-center group-hover:bg-primary group-hover:text-white text-foreground/40 transition-all">
                  <ArrowUpRight className="w-6 h-6" />
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Map Placeholder */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-96 glass rounded-[3rem] overflow-hidden relative border-border-custom">
           <img 
            src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&q=80&w=2068" 
            alt="Map" 
            className="w-full h-full object-cover opacity-20 contrast-125 grayscale"
            referrerPolicy="no-referrer"
           />
           <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-4">
                 <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-primary/40 animate-bounce">
                    <MapPin className="w-8 h-8 text-white" />
                 </div>
                 <h4 className="font-display font-bold text-white text-xl">Visit our Creative Hub</h4>
              </div>
           </div>
        </div>
      </section>
      <SupportWidget />
    </div>
  );
}
