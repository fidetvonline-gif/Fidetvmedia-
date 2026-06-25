import React, { useEffect, useState, useRef } from "react";
import { useSocket } from "../hooks/useSocket";
import { useWebRTC } from "../hooks/useWebRTC";
import { ParticipantVideo } from "./ParticipantVideo";

export const Space: React.FC = () => {
  const socket = useSocket("/");
  const { localStream, remoteStreams } = useWebRTC(socket, "lobby");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (!socket) return;

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("join-room", "lobby", socket.id);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
    };
  }, [socket]);

  return (
    <div className="p-6 bg-slate-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4">FideTV Space</h1>
      <p className="mb-4">Status: {isConnected ? "Connected" : "Disconnected"}</p>
      
      <div className="flex flex-wrap gap-4">
        <div className="relative w-64 h-64 bg-black rounded-lg overflow-hidden">
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          <div className="absolute bottom-2 left-2 text-white bg-black/50 px-2 py-1 rounded">You</div>
        </div>
        
        {remoteStreams.map(rs => (
          <ParticipantVideo key={rs.userId} stream={rs.stream} name={rs.userId} />
        ))}
      </div>
    </div>
  );
};
