import React, { useState } from 'react';
import { SpaceRoom } from './SpaceRoom';
import { PreJoinScreen } from './PreJoinScreen';
import { SpaceList } from './SpaceList';
import { useSocket } from '../hooks/useSocket';
import { useWebRTC } from '../hooks/useWebRTC';

export const EnterpriseSpace: React.FC = () => {
  const [view, setView] = useState<'list' | 'join' | 'host' | 'room'>('list');
  const [roomName, setRoomName] = useState('');
  const [userName, setUserName] = useState('');
  
  const socket = useSocket('/');
  const { localStream, remoteStreams } = useWebRTC(view === 'room' ? socket : null, roomName);

  const handleJoin = (name: string, room: string) => {
    setUserName(name);
    setRoomName(room);
    setView('room');
    if (socket) {
      socket.emit('join-room', room, socket.id);
    }
  };

  const handleHost = (room: string) => {
    setUserName('Host');
    setRoomName(room);
    setView('room');
    if (socket) {
      socket.emit('join-room', room, socket.id);
    }
  };

  const handleLeave = () => {
    setView('list');
    if (socket) {
      socket.emit('leave-room', roomName, socket.id);
    }
  };

  if (view === 'list') {
    return <SpaceList onJoin={(r) => { setRoomName(r); setView('join'); }} onHost={() => setView('host')} />;
  }

  if (view === 'join') {
    return <PreJoinScreen onJoin={handleJoin} initialRoom={roomName} />;
  }

  if (view === 'host') {
    return <PreJoinScreen onJoin={handleHost} mode="host" />;
  }

  return (
    <div className="h-[calc(100vh-80px)] w-full flex flex-col bg-slate-950 text-white rounded-2xl overflow-hidden shadow-2xl border border-white/10">
      <SpaceRoom 
        roomName={roomName}
        userName={userName}
        localStream={localStream}
        remoteStreams={remoteStreams}
        onLeave={handleLeave}
      />
    </div>
  );
};
