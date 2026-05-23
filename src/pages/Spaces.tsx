import React from 'react';
import { useNavigate } from 'react-router-dom';
import VoiceRoom from '../components/VoiceRoom';
import { ArrowLeft, MessageSquare, Mic } from 'lucide-react';

export default function Spaces() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0f1012] text-foreground flex flex-col">
      {/* Header - Minimalist */}
      <header className="border-b border-white/5 bg-[#17181c] p-4 flex items-center gap-4">
        <button 
          onClick={() => navigate('/')} 
          className="p-2 hover:bg-white/5 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-text-muted" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center">
            <Mic className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-bold text-white">Spaces</h1>
        </div>
      </header>
      
      {/* Main Content Area */}
      <main className="flex-grow max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        {/* Dedicated VoiceRoom Component - Needs full-width or better container */}
        <div className="bg-[#17181c] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
          <VoiceRoom communityId="global-lobby" />
        </div>
      </main>
    </div>
  );
}
