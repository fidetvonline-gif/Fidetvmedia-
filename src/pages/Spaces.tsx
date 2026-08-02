import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Mic } from 'lucide-react';

export default function Spaces() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-900/60 backdrop-blur-md p-4 flex items-center gap-4">
        <button 
          onClick={() => navigate('/')} 
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
          title="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600/30 text-blue-400 border border-blue-500/40 flex items-center justify-center shadow-lg">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide">
              Spaces
            </h1>
            <p className="text-xs text-slate-400">
              Live audio rooms & voice channels
            </p>
          </div>
        </div>
      </header>
      
      {/* Main Content Area */}
      <main className="flex-grow w-full max-w-7xl mx-auto p-4 sm:p-6 flex flex-col items-center justify-center">
        <div className="max-w-md mx-auto w-full my-8 bg-slate-900/90 border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl text-center backdrop-blur-xl relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-5 shadow-inner">
            <Sparkles className="w-8 h-8" />
          </div>

          <h2 className="text-3xl font-extrabold text-white mb-2 tracking-tight">
            Coming Soon
          </h2>
          
          <p className="text-slate-300 text-base leading-relaxed">
            We're working hard on these updates. Check back soon!
          </p>
        </div>
      </main>
    </div>
  );
}
