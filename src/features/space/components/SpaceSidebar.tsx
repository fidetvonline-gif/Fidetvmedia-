import React from 'react';
import { Users, Bot, MessageSquare, ChevronRight, Activity, User } from 'lucide-react';
import { motion } from 'framer-motion';

interface Participant {
  id: string;
  name: string;
}

interface Props {
  activeTab: 'chat' | 'participants' | 'ai';
  setActiveTab: (tab: 'chat' | 'participants' | 'ai') => void;
  onClose: () => void;
  participants: Participant[];
}

export const SpaceSidebar: React.FC<Props> = ({ activeTab, setActiveTab, onClose, participants }) => {
  return (
    <motion.aside 
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className="w-80 bg-slate-900 border-l border-white/5 flex flex-col h-full z-20"
    >
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <div className="flex space-x-2">
          <button 
            onClick={() => setActiveTab('chat')}
            className={`p-2 rounded-lg transition-colors ${activeTab === 'chat' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <MessageSquare className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveTab('participants')}
            className={`p-2 rounded-lg transition-colors ${activeTab === 'participants' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <Users className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveTab('ai')}
            className={`p-2 rounded-lg transition-colors ${activeTab === 'ai' ? 'bg-purple-500/20 text-purple-400' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <Bot className="w-5 h-5" />
          </button>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'chat' && (
          <div className="h-full flex flex-col">
            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
              Live chat will appear here.
            </div>
            <div className="mt-4 relative">
              <input 
                type="text" 
                placeholder="Send a message..." 
                className="w-full bg-slate-950 border border-slate-800 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {activeTab === 'participants' && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">In Room ({participants.length})</h3>
            <div className="space-y-2">
              {participants.map((p, i) => (
                <div key={p.id + i} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors cursor-pointer">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <span className="text-sm text-slate-300 font-medium">{p.name} {p.id === 'local' && '(You)'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="flex flex-col h-full space-y-4">
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 text-purple-400 mb-2">
                <Activity className="w-4 h-4" />
                <span className="font-medium text-sm">Live Transcript</span>
              </div>
              <p className="text-slate-300 text-sm italic opacity-50">
                Listening for speech... (AI Placeholder)
              </p>
            </div>
            
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mt-auto">
              <h4 className="text-blue-400 font-medium text-sm mb-2">Action Items</h4>
              <ul className="text-sm text-slate-300 space-y-2 opacity-50">
                <li>• Waiting for context...</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </motion.aside>
  );
};
