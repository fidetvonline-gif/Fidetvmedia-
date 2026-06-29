import React from 'react';
import { Plus, Users, Video } from 'lucide-react';
import { motion } from 'framer-motion';

interface Space {
  id: string;
  name: string;
  participantCount: number;
}

interface Props {
  onJoin: (roomName: string) => void;
  onHost: () => void;
}

const mockSpaces: Space[] = [
  { id: 'daily-standup', name: 'Daily Standup', participantCount: 5 },
  { id: 'design-review', name: 'Design Review', participantCount: 3 },
  { id: 'general', name: 'General Lounge', participantCount: 12 },
];

export const SpaceList: React.FC<Props> = ({ onJoin, onHost }) => {
  return (
    <div className="flex flex-col h-full bg-slate-950 p-6 rounded-3xl border border-white/5">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-white tracking-tight">Spaces</h2>
        <div className="flex gap-4">
          <button 
            onClick={onHost}
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-4 rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <Video className="w-5 h-5" />
            Host Meeting
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockSpaces.map((space) => (
          <motion.button
            key={space.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onJoin(space.id)}
            className="bg-slate-900 p-6 rounded-2xl border border-white/10 hover:border-blue-500/50 transition-all text-left group"
          >
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400">{space.name}</h3>
            <div className="flex items-center text-slate-400 text-sm gap-2">
              <Users className="w-4 h-4" />
              {space.participantCount} participants
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
