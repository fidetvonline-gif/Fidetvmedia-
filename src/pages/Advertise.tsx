import React from 'react';
import { motion } from 'motion/react';
import { 
  Megaphone, 
  Target, 
  MessageSquare, 
  Globe, 
  Zap, 
  CheckCircle2, 
  ArrowRight,
  TrendingUp,
  Users,
  ShieldCheck,
  Smartphone,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlanProps {
  name: string;
  price: string;
  duration: string;
  features: string[];
  recommended?: boolean;
  type: 'daily' | 'weekly' | 'monthly';
}

function PlanCard({ name, price, duration, features, recommended, type }: PlanProps) {
  const getWhatsAppLink = () => {
    const message = `Hello FideTV! I'm interested in the ${name} (${duration}) advertising plan. Please provide more details on how to proceed with payment.`;
    return `https://wa.me/2348108889805?text=${encodeURIComponent(message)}`; // Updated number
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={cn(
        "glass p-8 md:p-10 rounded-[3rem] border-white/5 relative overflow-hidden group flex flex-col h-full transition-all hover:border-primary/30",
        recommended && "ring-2 ring-primary/40 shadow-2xl shadow-primary/10"
      )}
    >
      {recommended && (
        <div className="absolute top-0 right-0 px-6 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-bl-2xl">
          Most Popular
        </div>
      )}

      <div className="space-y-6 flex-grow">
        <div className="space-y-2">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center mb-6",
            type === 'daily' ? "bg-blue-500/10 text-blue-500" :
            type === 'weekly' ? "bg-primary/10 text-primary" :
            "bg-purple-500/10 text-purple-500"
          )}>
            {type === 'daily' ? <Zap className="w-6 h-6" /> :
             type === 'weekly' ? <Target className="w-6 h-6" /> :
             <TrendingUp className="w-6 h-6" />}
          </div>
          <h3 className="text-2xl font-display font-black text-white">{name}</h3>
          <p className="text-gray-500 text-sm font-medium">{duration} visibility across platforms</p>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-4xl md:text-5xl font-display font-black text-white">₦{price}</span>
          <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">/ base rate</span>
        </div>

        <ul className="space-y-4 py-8 border-t border-white/5">
          {features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <span className="text-gray-400 text-sm leading-relaxed">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <a
        href={getWhatsAppLink()}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "w-full py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all",
          recommended 
            ? "bg-primary text-white hover:bg-primary-dark shadow-xl shadow-primary/20" 
            : "bg-white/5 text-white hover:bg-white/10 border border-white/10"
        )}
      >
        Select Plan
        <ArrowRight className="w-5 h-5" />
      </a>
    </motion.div>
  );
}

export default function Advertise() {
  return (
    <div className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-32 mb-32">
      {/* Hero Section */}
      <section className="text-center max-w-4xl mx-auto space-y-8">
        <motion.div
           initial={{ scale: 0.8, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           className="w-20 h-20 bg-primary/20 rounded-3xl mx-auto flex items-center justify-center border border-primary/50 shadow-[0_0_50px_rgba(var(--primary-rgb),0.3)] mb-8"
        >
           <Megaphone className="w-10 h-10 text-primary" />
        </motion.div>
        
        <h1 className="text-5xl md:text-8xl font-display font-black text-white tracking-tighter leading-none">
          Amplify Your <span className="text-primary">Presence</span>
        </h1>
        
        <p className="text-gray-400 text-lg md:text-xl font-light leading-relaxed max-w-2xl mx-auto">
          Reach thousands of active viewers across our digital ecosystem. 
          From WhatsApp status to high-traffic website real estate.
        </p>

        <div className="flex flex-wrap justify-center gap-6 pt-4">
          <div className="flex items-center gap-3 px-6 py-3 glass rounded-2xl border-white/5">
            <Users className="w-5 h-5 text-primary" />
            <div className="text-left">
              <div className="text-white font-black leading-tight">8,000+</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Active Contacts</div>
            </div>
          </div>
          <div className="flex items-center gap-3 px-6 py-3 glass rounded-2xl border-white/5">
            <Globe className="w-5 h-5 text-green-500" />
            <div className="text-left">
              <div className="text-white font-black leading-tight">24/7</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Global Reach</div>
            </div>
          </div>
          <div className="flex items-center gap-3 px-6 py-3 glass rounded-2xl border-white/5">
            <ShieldCheck className="w-5 h-5 text-blue-500" />
            <div className="text-left">
              <div className="text-white font-black leading-tight">Verified</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Ad Impressions</div>
            </div>
          </div>
        </div>
      </section>

      {/* Plans Section */}
      <section className="space-y-16">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/5 pb-10">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest">
              Pricing Models
            </div>
            <h2 className="text-3xl md:text-5xl font-display font-black text-white tracking-tighter">
              Choose Your Ad Strategy
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <PlanCard
            name="Flash Exposure"
            price="5,000"
            duration="Daily"
            type="daily"
            features={[
              "1 WhatsApp Status Post",
              "Rotation on Website Sidebars",
              "Standard Support",
              "Detailed Insight Report"
            ]}
          />
          <PlanCard
            name="Momentum Growth"
            price="25,000"
            duration="Weekly"
            type="weekly"
            recommended
            features={[
              "Daily WhatsApp Status Posts",
              "Top-tier Website Banner Ad",
              "1 Promotional Website Post",
              "Priority Ad Placement",
              "Graphic Design Support"
            ]}
          />
          <PlanCard
            name="Dominance Suite"
            price="75,000"
            duration="Monthly"
            type="monthly"
            features={[
              "Unrestricted WhatsApp Visibility",
              "Premium Website Real Estate",
              "4 Promotional Website Posts",
              "Dedicated Account Manager",
              "Video Ad Production Support",
              "SEO Optimized Brand Posts"
            ]}
          />
        </div>
      </section>

      {/* Special Services Section */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 text-gray-400 text-xs font-bold uppercase tracking-widest">
             Secondary Channels
          </div>
          <h2 className="text-4xl md:text-6xl font-display font-black text-white tracking-tighter leading-none">
            High Impact <span className="text-primary">Extras</span>
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed">
            Beyond standard banners, we offer deep integration with our platform to ensure your brand message sticks.
          </p>

          <div className="space-y-4">
            <div className="glass p-6 rounded-3xl border-white/5 flex items-start gap-6 group hover:border-primary/20 transition-all">
               <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Smartphone className="w-6 h-6 text-primary" />
               </div>
               <div className="space-y-2">
                  <h4 className="text-white font-bold text-xl">WhatsApp Broadcast</h4>
                  <p className="text-gray-400 text-sm">Direct access to 8,000+ active contacts. 90% open rates guaranteed through personal status engagement.</p>
               </div>
            </div>

            <div className="glass p-6 rounded-3xl border-white/5 flex items-start gap-6 group hover:border-primary/20 transition-all">
               <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Globe className="w-6 h-6 text-primary" />
               </div>
               <div className="space-y-2">
                  <h4 className="text-white font-bold text-xl">Website Brand Posts</h4>
                  <p className="text-gray-400 text-sm">We'll write and feature a promotional article about you on our homepage for a small one-time fee. Permanent visibility.</p>
               </div>
            </div>
          </div>
        </div>

        <div className="relative">
           <div className="absolute inset-0 bg-primary/20 blur-[120px] rounded-full animate-pulse" />
           <div className="relative glass p-10 rounded-[3rem] border-white/10 space-y-8">
              <div className="space-y-2">
                 <h3 className="text-2xl font-display font-black text-white">How it Works</h3>
                 <p className="text-gray-500 text-sm">Simple 3-step process to get your ad live.</p>
              </div>

              <div className="space-y-6">
                 {[
                   { step: 1, title: 'Choose Your Plan', desc: 'Select the duration and reach that fits your budget.' },
                   { step: 2, title: 'Submit Creative', desc: 'Securely send your ad assets via WhatsApp or Email.' },
                   { step: 3, title: 'Go Live', desc: 'Your ad starts appearing across nominated channels within 2 hours.' }
                 ].map((item, idx) => (
                   <div key={idx} className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-black shrink-0">{item.step}</div>
                      <div className="space-y-1">
                         <div className="text-white font-bold">{item.title}</div>
                         <div className="text-gray-400 text-sm leading-relaxed">{item.desc}</div>
                      </div>
                   </div>
                 ))}
              </div>

              <div className="pt-8 border-t border-white/5">
                 <div className="flex items-center justify-between p-6 bg-background rounded-[2rem] border border-white/5">
                    <div className="space-y-1">
                       <div className="text-white font-bold">Ready to Start?</div>
                       <div className="text-xs text-gray-500 uppercase tracking-widest font-black">Average Launch: 2 Hours</div>
                    </div>
                    <a 
                      href="https://wa.me/2348108889805" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-4 bg-green-500 text-white rounded-2xl hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20"
                    >
                       <MessageSquare className="w-6 h-6" />
                    </a>
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="glass rounded-[3rem] p-12 border-white/5 text-center space-y-8 relative overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-primary/20 rounded-full animate-[spin_60s_linear_infinite]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-primary/10 rounded-full animate-[spin_40s_linear_infinite_reverse]" />
         </div>

         <div className="relative space-y-6 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-display font-black text-white tracking-tighter">
               Don't See What You Need?
            </h2>
            <p className="text-gray-400 leading-relaxed">
               We offer custom enterprise solutions for long-term partners. Reach out to discuss multi-channel campaigns and exclusive sponsorship opportunities.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
               <a 
                 href="https://wa.me/2348108889805" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="px-8 py-4 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-3"
               >
                  Contact Support
                  <MessageSquare className="w-5 h-5" />
               </a>
               <a 
                 href="https://wa.me/2348108889805?text=Hello%20FideTV!%20I%20would%20like%20to%20request%20the%20Media%20Kit%20to%20review%20your%20detailed%20advertising%20statistics%20and%20demographics." 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="px-8 py-4 border border-white/10 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-white/5 transition-colors flex items-center justify-center"
               >
                  View Media Kit
               </a>
            </div>
         </div>
      </section>
    </div>
  );
}
