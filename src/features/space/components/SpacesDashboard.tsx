import React, { useState, useEffect } from 'react';
import { Search, Plus, Video } from 'lucide-react';
import { Toast } from '@/components/Toast';
import { supabase } from '@/lib/supabase';

interface Space {
  id: string;
  title: string;
  host: string;
  participants: number;
  status: 'live' | 'scheduled' | 'ended';
  date?: string;
  image: string;
}

interface Props {
  onJoinSpace: (room: string) => void;
}

export const SpacesDashboard: React.FC<Props> = ({ onJoinSpace }) => {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newSpaceTitle, setNewSpaceTitle] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Space created successfully!');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const fetchSpaces = async () => {
      const { data, error } = await supabase.from('spaces').select('*');
      if (error) {
        console.error('Error fetching spaces:', error);
        return;
      }
      if (data) {
        setSpaces(data);
      }
    };
    fetchSpaces();
  }, []);

  const handleCreateSpace = async () => {
    if (!newSpaceTitle.trim()) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    
    const newSpace = {
      id: crypto.randomUUID(),
      title: newSpaceTitle,
      host: user?.id,
      participants: 0,
      status: 'live' as const,
      image: 'https://images.unsplash.com/photo-1577412647305-991150c7d163?q=80&w=400',
    };
    
    const { data, error } = await supabase.from('spaces').insert([newSpace]).select();
    
    if (error) {
      console.error('Error creating space:', error);
      setToastMessage('Failed to create space: ' + (error.message || 'Unknown error'));
      setIsError(true);
      setShowToast(true);
      return;
    }
    
    if (data) {
      setSpaces([data[0], ...spaces]);
      setNewSpaceTitle('');
      setIsCreating(false);
      setToastMessage('Space created successfully!');
      setIsError(false);
      setShowToast(true);
      onJoinSpace(data[0].title);
    }
  };

  return (
    <div className="space-y-8">
      <Toast message={toastMessage} isVisible={showToast} onClose={() => setShowToast(false)} />
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-3xl font-bold tracking-tight text-white">Your Spaces</h2>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search spaces..."
              className="bg-slate-900 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors w-64"
            />
          </div>
          <button 
            onClick={() => setIsCreating(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-5 h-5" />
            Create Space
          </button>
        </div>
      </div>

      {/* Create Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Create New Space</h3>
            <input 
              value={newSpaceTitle}
              onChange={(e) => setNewSpaceTitle(e.target.value)}
              placeholder="Space Title"
              className="w-full bg-slate-800 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-slate-500 mb-4 focus:outline-none focus:border-blue-500"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
              <button onClick={handleCreateSpace} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-medium">Create & Join</button>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {spaces.map((space) => (
          <div key={space.id} className="group bg-slate-900 rounded-2xl overflow-hidden border border-white/5 hover:border-white/10 transition-all hover:shadow-xl hover:shadow-black/40">
            <div className="h-40 relative">
              <img src={space.image} alt={space.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent opacity-60" />
              <div className="absolute top-3 left-3 flex gap-2">
                {space.status === 'live' && <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">LIVE</span>}
                {space.status === 'scheduled' && <span className="bg-slate-700/80 backdrop-blur text-white text-xs px-2.5 py-1 rounded-full">SCHEDULED</span>}
              </div>
            </div>
            <div className="p-5">
              <h3 className="font-bold text-lg text-white mb-1">{space.title}</h3>
              <p className="text-slate-400 text-sm mb-4">Host: {space.host}</p>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-xs flex items-center gap-1">
                  <Video className="w-3 h-3" />
                  {space.participants} participants
                </span>
                <button 
                  onClick={() => onJoinSpace(space.title)}
                  className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                >
                  Join
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

};
