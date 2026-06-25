import { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";

export interface RemoteStream {
  userId: string;
  stream: MediaStream;
}

export const useWebRTC = (socket: Socket | null, roomId: string) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
  const peers = useRef<Record<string, RTCPeerConnection>>({});

  const createPeerConnection = (userId: string, stream: MediaStream) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.emit("ice-candidate", roomId, event.candidate, userId);
      }
    };

    pc.ontrack = (event) => {
      setRemoteStreams(prev => {
        const existing = prev.find(rs => rs.userId === userId);
        if (existing) return prev;
        return [...prev, { userId, stream: event.streams[0] }];
      });
    };

    peers.current[userId] = pc;
    return pc;
  };

  useEffect(() => {
    if (!socket) return;

    navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      .then(stream => {
        setLocalStream(stream);
      })
      .catch(err => console.error("Error accessing media devices.", err));

    socket.on("user-connected", async (userId) => {
      if (!localStream) return;
      const pc = createPeerConnection(userId, localStream);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("offer", roomId, offer, userId);
    });

    socket.on("offer", async (offer, userId) => {
      if (!localStream) return;
      const pc = createPeerConnection(userId, localStream);
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", roomId, answer, userId);
    });

    socket.on("answer", async (answer, userId) => {
      const pc = peers.current[userId];
      if (pc) await pc.setRemoteDescription(answer);
    });

    socket.on("ice-candidate", async (candidate, userId) => {
      const pc = peers.current[userId];
      if (pc) await pc.addIceCandidate(candidate);
    });

    socket.on("user-disconnected", (userId) => {
      if (peers.current[userId]) {
        peers.current[userId].close();
        delete peers.current[userId];
      }
      setRemoteStreams(prev => prev.filter(stream => stream.userId !== userId));
    });

    return () => {
      Object.values(peers.current).forEach(pc => pc.close());
    };
  }, [socket, roomId, localStream]);

  return { localStream, remoteStreams };
};
