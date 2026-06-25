import React from 'react';
import { useNavigate } from 'react-router-dom';
import { EnterpriseSpace } from '../features/space/components/EnterpriseSpace';
import { ArrowLeft, Mic } from 'lucide-react';

export default function Spaces() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header - Minimalist */}
      <header className="border-b border-white/5 bg-slate-900/50 backdrop-blur-md p-4 flex items-center gap-4">
        <button 
          onClick={() => navigate('/')} 
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
            <Mic className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-bold text-white tracking-wide">Enterprise Space</h1>
        </div>
      </header>
      
      {/* Main Content Area */}
      <main className="flex-grow w-full max-w-7xl mx-auto p-4 sm:p-6 flex flex-col h-[calc(100vh-73px)]">
        <EnterpriseSpace />
      </main>
    </div>
  );
}
