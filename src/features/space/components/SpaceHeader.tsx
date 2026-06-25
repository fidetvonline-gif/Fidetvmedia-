import React from 'react';
import { LayoutPanelLeft, Shield, SignalHigh } from 'lucide-react';

interface Props {
  roomName: string;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export const SpaceHeader: React.FC<Props> = ({ roomName, sidebarOpen, onToggleSidebar }) => {
  return (
    <header className="h-16 px-6 flex items-center justify-between border-b border-white/5 bg-slate-900/50 backdrop-blur-md relative z-10">
      <div className="flex items-center gap-4">
        <div className="bg-blue-600/20 text-blue-400 p-2 rounded-lg">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-white font-medium tracking-wide">{roomName || 'Untitled Space'}</h1>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <SignalHigh className="w-3 h-3 text-green-500" />
              Connected
            </span>
            <span>•</span>
            <span>Enterprise P2P</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <button 
          onClick={onToggleSidebar}
          className={`p-2.5 rounded-xl transition-all ${sidebarOpen ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
        >
          <LayoutPanelLeft className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
