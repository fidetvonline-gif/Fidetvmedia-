import React, { useEffect, useRef } from 'react';

interface Props {
  mainStream: MediaStream | null;
  name: string;
}

export const DynamicStage: React.FC<Props> = ({ mainStream, name }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && mainStream) {
      videoRef.current.srcObject = mainStream;
    }
  }, [mainStream]);

  if (!mainStream) {
    return (
      <div className="flex-1 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-center relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950/50 pointer-events-none" />
        <p className="text-slate-500">Waiting for video...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 rounded-2xl bg-black border border-white/10 relative overflow-hidden shadow-2xl transition-all duration-500 ease-in-out group min-h-[300px]">
      <video 
        ref={videoRef}
        autoPlay 
        playsInline
        muted={name === 'You' || name === ''} // Mute local if it's local
        className="w-full h-full object-contain absolute inset-0"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="absolute bottom-4 left-4 flex items-center gap-3">
        <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-white text-sm font-medium tracking-wide">
            {name}
          </span>
        </div>
      </div>
    </div>
  );
};
