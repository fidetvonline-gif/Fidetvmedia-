import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { RemoteStream } from '../hooks/useWebRTC';

interface Props {
  localStream: MediaStream | null;
  localName: string;
  remoteStreams: RemoteStream[];
}

export const FloatingAvatars: React.FC<Props> = ({ localStream, localName, remoteStreams }) => {
  return (
    <div className="h-48 flex gap-4 overflow-x-auto py-2 px-1 snap-x scrollbar-thin scrollbar-thumb-slate-700">
      <VideoCard stream={localStream} name={`${localName} (You)`} isLocal />
      
      {remoteStreams.map((rs, i) => (
        <VideoCard key={rs.userId} stream={rs.stream} name={rs.userId} delay={(i + 1) * 0.1} />
      ))}
    </div>
  );
};

const VideoCard: React.FC<{ stream: MediaStream | null, name: string, isLocal?: boolean, delay?: number }> = ({ stream, name, isLocal, delay = 0 }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!stream) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay }}
      className="snap-start flex-shrink-0 w-64 h-full bg-slate-900 rounded-xl border border-white/10 overflow-hidden relative group"
    >
      <video 
        ref={videoRef}
        autoPlay 
        playsInline 
        muted={isLocal}
        className="w-full h-full object-cover absolute inset-0"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
        <span className="text-white text-xs font-medium truncate drop-shadow-md">
          {name}
        </span>
      </div>
    </motion.div>
  );
};
