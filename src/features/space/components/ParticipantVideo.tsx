import React, { useEffect, useRef } from "react";

interface Props {
  stream: MediaStream;
  name: string;
}

export const ParticipantVideo: React.FC<Props> = ({ stream, name }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative w-64 h-64 bg-black rounded-lg overflow-hidden">
      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
      <div className="absolute bottom-2 left-2 text-white bg-black/50 px-2 py-1 rounded">
        {name}
      </div>
    </div>
  );
};
