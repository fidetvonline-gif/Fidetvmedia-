import React, { useEffect, useState } from 'react';
import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';

interface Props {
  roomName: string;
  userName: string;
  onLeave: () => void;
}

export const LiveKitRoomView: React.FC<Props> = ({ roomName, userName, onLeave }) => {
  const [token, setToken] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch('/api/meeting/create-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomName, participantName: userName }),
        });
        const data = await resp.json();
        setToken(data.token);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [roomName, userName]);

  if (token === '') return <div>Loading...</div>;

  return (
    <LiveKitRoom
      video={true}
      audio={true}
      token={token}
      serverUrl={process.env.LIVEKIT_URL || 'wss://your-project-url.livekit.cloud'}
      data-lk-theme="default"
      style={{ height: '100%' }}
      onDisconnected={onLeave}
    >
      <VideoConference />
    </LiveKitRoom>
  );
};
