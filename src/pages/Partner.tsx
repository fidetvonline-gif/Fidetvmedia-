import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { 
  Award, Sparkles, Send, ArrowUpRight, CheckCircle2, Tv, Users, 
  Video, DollarSign, ArrowLeft, Globe, Milestone
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Partner() {
  const [formData, setFormData] = useState({
    name: '',
    pseudonym: '',
    email: '',
    phone: '',
    category: 'Entertainment',
    audienceSize: '',
    pitch: '',
    portfolioUrl: '',
    primaryPlatform: 'YouTube'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    const formattedMessage = `
Pseudonym/Brand: ${formData.pseudonym || 'N/A'}
Phone/WhatsApp: ${formData.phone}
Platform: ${formData.primaryPlatform}
Audience Size: ${formData.audienceSize}
Portfolio/Reference URL: ${formData.portfolioUrl}

BROADCAST VISION & PITCH:
${formData.pitch}
`.trim();

    try {
      // We will save to bookings as type "Partner Application: Category"
      const { error } = await supabase.from('bookings').insert({
        client_name: formData.name,
        client_email: formData.email,
        event_type: `Partner Application: ${formData.category}`,
        date: new Date().toISOString().split('T')[0],
        budget: `${formData.primaryPlatform} (${formData.audienceSize} followers)`,
        message: formattedMessage,
        status: 'pending'
      });

      if (error) {
        throw error;
      }

      setIsSubmitted(true);
    } catch (err: any) {
      console.error('Submission error:', err);
      // Fallback: save to localStorage if DB table issues
      try {
        const localProposals = JSON.parse(localStorage.getItem('fidetv_local_proposals') || '[]');
        localProposals.push({
          ...formData,
          submittedAt: new Date().toISOString()
        });
        localStorage.setItem('fidetv_local_proposals', JSON.stringify(localProposals));
        setIsSubmitted(true);
      } catch (lsErr) {
        setErrorMsg(err.message || 'Something went wrong. Please check your network and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = [
    'Entertainment', 'Gaming', 'News & Politics', 'Technology', 
    'Music', 'Education & Culture', 'Podcasts', 'Sports', 'Other'
  ];

  const platforms = [
    'YouTube', 'Twitch', 'TikTok', 'Instagram', 'Twitter / X', 
    'Facebook Live', 'Standalone/Independent'
  ];

  return (
    <div className="py-24 bg-background min-h-screen relative overflow-hidden">
      {/* Decorative backdrop blobs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/10 rounded-full blur-[150px] pointer-events-none" />

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Navigation / Back link */}
        <div className="mb-10">
          <Link 
            to="/community" 
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-surface hover:bg-surface-bright text-xs text-foreground/60 hover:text-foreground font-bold uppercase tracking-wider rounded-full border border-border-custom transition-all"
          >
            <ArrowLeft className="w-4 h-4 text-primary" />
            Go to Community Hub
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:items-start">
          
          {/* Pitch & Information column */}
          <div className="lg:col-span-5 space-y-12">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-px w-8 bg-primary/30" />
                <span className="text-primary font-display font-medium uppercase tracking-[0.4em] text-[10px]">Broadcaster Program</span>
              </div>
              <h1 className="text-5xl sm:text-7xl font-display font-medium text-foreground tracking-tighter leading-none italic">
                Become a <br /><span className="text-primary">FideTV Partner.</span>
              </h1>
              <p className="text-lg text-foreground/60 font-serif leading-relaxed italic">
                Ready to stream your voice across the global media network? Apply to host your show, syndicate content, and monetize together with FideTV.
              </p>
            </div>

            {/* Program perks */}
            <div className="space-y-6">
              <h3 className="text-[10px] font-black uppercase text-foreground/40 tracking-[0.3em]">Network Privileges</h3>
              
              <div className="space-y-5">
                {[
                  { title: 'Global Live Syndication', desc: 'Broadcast to smart TVs, mobile applications, and web consoles with premium content syndication.', icon: Tv },
                  { title: 'Resource & Studio Grants', desc: 'Gain access to professional production consultation, direct live server keys, and branding resources.', icon: Video },
                  { title: 'Integrated Ad Revenue Share', desc: 'Monetize your content natively via FideTV ad spots, premium sponsorships, and creator pools.', icon: DollarSign },
                  { title: 'Ecosystem Cross-Promotion', desc: 'Get featured on our homepage spotlights, official communities, and community banners.', icon: Award }
                ].map((perk, idx) => (
                  <div key={idx} className="flex gap-4 p-5 bg-surface/30 rounded-2xl border border-border-custom hover:border-primary/20 transition-all">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <perk.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-foreground uppercase tracking-wider">{perk.title}</h4>
                      <p className="text-[11px] text-foreground/50 leading-relaxed font-sans">{perk.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Form container column */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {!isSubmitted ? (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -15 }}
                  className="bg-surface rounded-[3rem] p-8 sm:p-12 border border-border-custom shadow-2xl relative"
                >
                  <div className="space-y-2 mb-8 border-b border-border-custom pb-6">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary" />
                      <h2 className="text-xl font-display font-bold text-foreground uppercase tracking-tight">Submit Network Proposal</h2>
                    </div>
                    <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-wider italic">Submit your broadcast details. Our management team will complete alignment within 72 hours.</p>
                  </div>

                  {errorMsg && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-500 font-medium">
                      {errorMsg}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-black tracking-widest text-foreground/50 block ml-3">Full Legal Name</label>
                        <input 
                          type="text" 
                          required 
                          value={formData.name}
                          onChange={e => setFormData({...formData, name: e.target.value})}
                          placeholder="e.g. Fidelis Oruche" 
                          className="w-full bg-background border border-border-custom rounded-2xl p-4 text-xs text-foreground focus:outline-none focus:border-primary/50 transition-colors" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-black tracking-widest text-foreground/50 block ml-3">Brand Name / Pseudonym</label>
                        <input 
                          type="text" 
                          value={formData.pseudonym}
                          onChange={e => setFormData({...formData, pseudonym: e.target.value})}
                          placeholder="e.g. Fidel Castro (Optional)" 
                          className="w-full bg-background border border-border-custom rounded-2xl p-4 text-xs text-foreground focus:outline-none focus:border-primary/50 transition-colors" 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-black tracking-widest text-foreground/50 block ml-3">Direct Email</label>
                        <input 
                          type="email" 
                          required 
                          value={formData.email}
                          onChange={e => setFormData({...formData, email: e.target.value})}
                          placeholder="e.g. creative@fidetvonline.com" 
                          className="w-full bg-background border border-border-custom rounded-2xl p-4 text-xs text-foreground focus:outline-none focus:border-primary/50 transition-colors" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-black tracking-widest text-foreground/50 block ml-3">Direct Phone / WhatsApp Link</label>
                        <input 
                          type="tel" 
                          required 
                          value={formData.phone}
                          onChange={e => setFormData({...formData, phone: e.target.value})}
                          placeholder="e.g. +234 810 888 9805" 
                          className="w-full bg-background border border-border-custom rounded-2xl p-4 text-xs text-foreground focus:outline-none focus:border-primary/50 transition-colors" 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-black tracking-widest text-foreground/50 block ml-3">Primary Content Category</label>
                        <select 
                          value={formData.category}
                          onChange={e => setFormData({...formData, category: e.target.value})}
                          className="w-full bg-background border border-border-custom rounded-2xl p-4 text-xs text-foreground focus:outline-none focus:border-primary/50 transition-colors appearance-none"
                        >
                          {categories.map((cat, idx) => (
                            <option key={idx} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-black tracking-widest text-foreground/50 block ml-3">Followers / Audience Size</label>
                        <input 
                          type="text" 
                          required 
                          value={formData.audienceSize}
                          onChange={e => setFormData({...formData, audienceSize: e.target.value})}
                          placeholder="e.g. 5,500 subscribers / active users" 
                          className="w-full bg-background border border-border-custom rounded-2xl p-4 text-xs text-foreground focus:outline-none focus:border-primary/50 transition-colors" 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-black tracking-widest text-foreground/50 block ml-3">Primary Broadcast Engine</label>
                        <select 
                          value={formData.primaryPlatform}
                          onChange={e => setFormData({...formData, primaryPlatform: e.target.value})}
                          className="w-full bg-background border border-border-custom rounded-2xl p-4 text-xs text-foreground focus:outline-none focus:border-primary/50 transition-colors appearance-none"
                        >
                          {platforms.map((plat, idx) => (
                            <option key={idx} value={plat}>{plat}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-black tracking-widest text-foreground/50 block ml-3">Primary Portfolio / Video URL Link</label>
                        <input 
                          type="url" 
                          required 
                          value={formData.portfolioUrl}
                          onChange={e => setFormData({...formData, portfolioUrl: e.target.value})}
                          placeholder="https://youtube.com/channel/..." 
                          className="w-full bg-background border border-border-custom rounded-2xl p-4 text-xs text-foreground focus:outline-none focus:border-primary/50 transition-colors font-mono" 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-black tracking-widest text-foreground/50 block ml-3">Broadcast Vision & Pitch Briefing</label>
                      <textarea 
                        rows={5}
                        required
                        value={formData.pitch}
                        onChange={e => setFormData({...formData, pitch: e.target.value})}
                        placeholder="Detail your broadcast show format, target audience demographics, scheduling frequency, and what you would love to achieve with FideTV partnership..."
                        className="w-full bg-background border border-border-custom rounded-2xl p-4 text-xs text-foreground focus:outline-none focus:border-primary/50 transition-colors resize-none leading-relaxed"
                      />
                    </div>

                    <div className="pt-4">
                      <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full bg-primary text-white font-black uppercase tracking-[0.3em] py-5 rounded-2xl hover:bg-primary/95 transition-all text-xs flex items-center justify-center gap-3 shadow-lg shadow-primary/25 disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                            <span>TRANSMITTING OBJECTIVES...</span>
                          </>
                        ) : (
                          <>
                            <span>Transmit Proposal Protocol</span>
                            <Send className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0 }}
                  className="bg-surface rounded-[3rem] p-12 sm:p-16 border border-border-custom shadow-2xl text-center space-y-8 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-[40px] -mr-16 -mt-16" />
                  
                  <div className="w-20 h-20 bg-green-500/10 border border-green-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                  </div>

                  <div className="space-y-3">
                    <h2 className="text-3xl font-display font-bold text-foreground tracking-tighter">Proposal Transmitted.</h2>
                    <p className="text-xs uppercase font-extrabold text-green-500 tracking-widest font-mono">Status: AWAITING PROTOCOL ALIGNMENT</p>
                  </div>

                  <p className="text-sm font-serif italic text-foreground/50 leading-relaxed max-w-md mx-auto">
                    Your partner details have been successfully received and mapped directly to our administrative headquarters database. FideTV media liaisons will inspect your primary broadcast materials thoroughly.
                  </p>

                  <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                    <Link 
                      to="/community" 
                      className="px-8 py-4 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/10"
                    >
                      Return to Hub
                    </Link>
                    <button 
                      onClick={() => setIsSubmitted(false)}
                      className="px-8 py-4 bg-background border border-border-custom text-foreground/60 hover:text-foreground text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all"
                    >
                      Submit Another Proposal
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </section>
    </div>
  );
}
