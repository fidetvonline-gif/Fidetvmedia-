import React, { useState } from 'react';
import { Mic, Video, Users } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  onJoin: (name: string, room: string) => void;
  initialRoom?: string;
  mode?: 'host' | 'join';
}

export const PreJoinScreen: React.FC<Props> = ({ onJoin, initialRoom = '', mode = 'join' }) => {
  const [name, setName] = useState(mode === 'host' ? 'Host' : '');
  const [room, setRoom] = useState(initialRoom);

  return (
    <div className="flex items-center justify-center h-full bg-slate-950 p-4 rounded-3xl border border-white/5 min-h-[60vh]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-slate-900 p-8 rounded-2xl shadow-2xl border border-white/10"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
            {mode === 'host' ? 'Host Space' : 'Join Space'}
          </h2>
          <p className="text-slate-400">Experience next-generation meetings.</p>
        </div>

        <div className="space-y-4">
          {mode === 'join' && (
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="e.g. Jane Doe"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Space ID</label>
            <input
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="e.g. daily-standup"
            />
          </div>
          
          <div className="pt-4">
            <button
              onClick={() => onJoin(name || 'Guest', room)}
              disabled={mode === 'join' && !name.trim()}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-all flex justify-center items-center gap-2 shadow-lg shadow-blue-500/20"
            >
              <Users className="w-5 h-5" />
              {mode === 'host' ? 'Start Meeting' : 'Join Meeting'}
            </button>
          </div>
        </div>
        
        <div className="mt-8 flex justify-center gap-6 text-slate-500">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4" /> <span className="text-xs">HD Audio</span>
          </div>
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4" /> <span className="text-xs">P2P Video</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
