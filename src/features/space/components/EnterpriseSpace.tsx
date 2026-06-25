import React, { useState } from 'react';
import { SpaceRoom } from './SpaceRoom';
import { PreJoinScreen } from './PreJoinScreen';
import { useSocket } from '../hooks/useSocket';
import { useWebRTC } from '../hooks/useWebRTC';

export const EnterpriseSpace: React.FC = () => {
  const [inRoom, setInRoom] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [userName, setUserName] = useState('');
  
  const socket = useSocket('/');
  const { localStream, remoteStreams } = useWebRTC(inRoom ? socket : null, roomName);

  const handleJoin = (name: string, room: string) => {
    setUserName(name);
    setRoomName(room);
    setInRoom(true);
    if (socket) {
      socket.emit('join-room', room, socket.id);
    }
  };

  const handleLeave = () => {
    setInRoom(false);
    if (socket) {
      socket.emit('leave-room', roomName, socket.id);
    }
  };

  if (!inRoom) {
    return <PreJoinScreen onJoin={handleJoin} />;
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
