import React, { useState } from 'react';
import { SpaceSidebar } from './SpaceSidebar';
import { SpaceHeader } from './SpaceHeader';
import { DynamicStage } from './DynamicStage';
import { FloatingAvatars } from './FloatingAvatars';
import { RemoteStream } from '../hooks/useWebRTC';
import { Mic, MicOff, Video, VideoOff, PhoneOff, MonitorUp } from 'lucide-react';

interface Props {
  roomName: string;
  userName: string;
  localStream: MediaStream | null;
  remoteStreams: RemoteStream[];
  onLeave: () => void;
}

export const SpaceRoom: React.FC<Props> = ({ roomName, userName, localStream, remoteStreams, onLeave }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'participants' | 'ai'>('chat');
  
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);

  const toggleAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !audioEnabled;
      });
      setAudioEnabled(!audioEnabled);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !videoEnabled;
      });
      setVideoEnabled(!videoEnabled);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 relative">
      <SpaceHeader 
        roomName={roomName} 
        sidebarOpen={sidebarOpen} 
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
      />
      
      <div className="flex flex-1 overflow-hidden relative">
        <main className="flex-1 flex flex-col relative p-4 gap-4 overflow-hidden">
          {/* Main stage shows first remote stream, or local if none */}
          <DynamicStage 
            mainStream={remoteStreams.length > 0 ? remoteStreams[0].stream : localStream}
            name={remoteStreams.length > 0 ? remoteStreams[0].userId : userName}
          />
          
          <FloatingAvatars 
            localStream={localStream}
            localName={userName}
            remoteStreams={remoteStreams.slice(1)} 
          />
        </main>
        
        {sidebarOpen && (
          <SpaceSidebar 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            onClose={() => setSidebarOpen(false)}
            participants={[{ id: 'local', name: userName }, ...remoteStreams.map(rs => ({ id: rs.userId, name: rs.userId }))]}
          />
        )}
      </div>

      <div className="h-20 bg-slate-900 border-t border-white/5 flex items-center justify-center gap-4 px-4 relative z-10">
        <button 
          onClick={toggleAudio}
          className={`p-4 rounded-full transition-all ${audioEnabled ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20'}`}
        >
          {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>
        <button 
          onClick={toggleVideo}
          className={`p-4 rounded-full transition-all ${videoEnabled ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20'}`}
        >
          {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>
        <button 
          className="p-4 rounded-full transition-all bg-slate-700 hover:bg-slate-600 text-white"
        >
          <MonitorUp className="w-5 h-5" />
        </button>
        <button 
          onClick={onLeave}
          className="p-4 rounded-full transition-all bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20 ml-4"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
