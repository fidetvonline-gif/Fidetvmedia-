import React from 'react';
import { ChannelExplorer } from '@/components/ChannelExplorer';
import { Radio, Zap, Shield, Globe } from 'lucide-react';

const BroadcastHub: React.FC = () => {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary/30">
      {/* Cinematic Header Block */}
      <header className="relative py-24 overflow-hidden border-b border-zinc-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#ee111120_0%,transparent_50%)]" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">System Status: Active</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter leading-none">
            Universal <span className="text-primary">Signal</span> Feed
          </h1>
          
          <p className="max-w-2xl mx-auto text-zinc-500 text-sm md:text-base font-medium leading-relaxed">
            Direct ingestion of global M3U8 broadcast nodes. Zero-latency processing with automated metadata synchronization. Search, filter, and stream instantly.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-8 pt-6">
             <div className="flex items-center gap-3">
                <Radio className="w-5 h-5 text-zinc-700" />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">10k+ Channels</span>
             </div>
             <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-zinc-700" />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Low Latency</span>
             </div>
             <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-zinc-700" />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Cloud Secured</span>
             </div>
          </div>
        </div>
      </header>

      {/* Main Signal Environment */}
      <main className="py-12 pb-32">
        <ChannelExplorer />
      </main>

      {/* Footer Branding */}
      <footer className="py-12 border-t border-zinc-900 bg-zinc-950/50">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary flex items-center justify-center rounded-xl rotate-12">
               <Globe className="w-6 h-6 text-white" />
            </div>
            <div>
               <h3 className="text-sm font-black uppercase tracking-tighter italic">FideTv Pro</h3>
               <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Global Node Network</p>
            </div>
          </div>
          
          <div className="flex gap-8">
             <a href="#" className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">Documentation</a>
             <a href="#" className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">API Status</a>
             <a href="#" className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">Privacy Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default BroadcastHub;
