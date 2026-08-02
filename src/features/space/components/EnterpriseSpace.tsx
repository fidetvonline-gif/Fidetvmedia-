import React, { useState } from 'react';
import { LiveKitRoomView } from './LiveKitRoomView';
import { Mic, MicOff, Video, VideoOff, ScreenShare, MessageSquare, Users, PhoneOff } from 'lucide-react';

interface Props {
  roomName: string;
  userName: string;
  onLeave: () => void;
}

export const EnterpriseSpace: React.FC<Props> = ({ roomName, userName, onLeave }) => {
  const [sidebar, setSidebar] = useState<'chat' | 'participants' | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);

  return (
    <div className="h-full w-full flex flex-col bg-slate-950 rounded-2xl overflow-hidden border border-white/5">
      {/* Main Content Area */}
      <div className="flex-grow flex relative">
        <div className={`flex-grow ${sidebar ? 'mr-80' : ''} transition-all duration-300`}>
          <LiveKitRoomView 
            roomName={roomName}
            userName={userName}
            onLeave={onLeave}
          />
        </div>

        {/* Sidebar Panel */}
        {sidebar && (
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-slate-900 border-l border-white/5 p-4 z-20 shadow-2xl">
            <h3 className="font-bold mb-4">{sidebar === 'chat' ? 'Chat' : 'Participants'}</h3>
            {/* Sidebar content here */}
          </div>
        )}
      </div>

      {/* Bottom Control Bar */}
      <div className="h-20 bg-slate-900 border-t border-white/5 flex items-center justify-center gap-4">
        <button onClick={() => setMicOn(!micOn)} className={`p-4 rounded-full ${micOn ? 'bg-slate-800' : 'bg-red-500'}`}>
          {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>
        <button onClick={() => setVideoOn(!videoOn)} className={`p-4 rounded-full ${videoOn ? 'bg-slate-800' : 'bg-red-500'}`}>
          {videoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>
        <button className="p-4 rounded-full bg-slate-800"><ScreenShare className="w-5 h-5" /></button>
        <button onClick={() => setSidebar(sidebar === 'chat' ? null : 'chat')} className={`p-4 rounded-full ${sidebar === 'chat' ? 'bg-blue-600' : 'bg-slate-800'}`}><MessageSquare className="w-5 h-5" /></button>
        <button onClick={() => setSidebar(sidebar === 'participants' ? null : 'participants')} className={`p-4 rounded-full ${sidebar === 'participants' ? 'bg-blue-600' : 'bg-slate-800'}`}><Users className="w-5 h-5" /></button>
        <button onClick={onLeave} className="p-4 rounded-full bg-red-600"><PhoneOff className="w-5 h-5" /></button>
      </div>
    </div>
  );
};
