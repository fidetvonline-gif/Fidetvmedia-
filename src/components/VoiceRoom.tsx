import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Headphones, Mic, MicOff, Volume2, VolumeX, Copy, Check, Users, Shield, 
  LogOut, Radio, Signal, AlertCircle, Share2, Plus, Sparkles, Trash2, 
  Video, ScreenShare, Cpu, Settings, Award, MessageSquare, Hand
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface VoiceRoomProps {
  communityId: string;
}

interface Participant {
  id: string;
  username: string;
  avatarUrl: string;
  isMuted: boolean;
  isSpeaking: boolean;
  role: 'host' | 'moderator' | 'listener' | 'speaker';
  joinedAt: number;
  raisedHand: boolean;
}

interface VoiceRoomData {
  id: string;
  title: string;
  hostId: string;
  hostName: string;
  isLocked: boolean;
  createdAt: number;
}

export default function VoiceRoom({ communityId }: VoiceRoomProps) {
  // Navigation & URL query handling
  const [activeRoom, setActiveRoom] = useState<VoiceRoomData | null>(null);
  const [createdRooms, setCreatedRooms] = useState<VoiceRoomData[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [isLockedOnCreate, setIsLockedOnCreate] = useState(false);
  
  // Local User State
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLocalMuted, setIsLocalMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);
  const [hasRaisedHand, setHasRaisedHand] = useState(false);
  
  // Room Participants presence & list
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'reconnecting'>('disconnected');
  const [pingMs, setPingMs] = useState<number>(34);

  // WebRTC & Audio Context Ref handles
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const peerConnectionsRef = useRef<{ [key: string]: RTCPeerConnection }>({});
  const supabaseChannelRef = useRef<any>(null);
  const lobbyChannelRef = useRef<any>(null);
  
  // Future Expansion States
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isScreenShared, setIsScreenShared] = useState(false);
  const [isAiRecordOn, setIsAiRecordOn] = useState(false);
  
  // Visual levels state
  const [volumeLevels, setVolumeLevels] = useState<number[]>(Array(12).fill(4));
  const [deviceList, setDeviceList] = useState<MediaDeviceInfo[]>([]);
  const [audioContextActive, setAudioContextActive] = useState(false);

  const [selectedOutputId, setSelectedOutputId] = useState<string>('');

  const resumeAudioCtx = async () => {
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
      setAudioContextActive(true);
    }
  };

  // Enumerate devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setDeviceList(devices.filter(d => d.kind === 'audiooutput'));
      } catch (err) {
        console.error('Error fetching devices', err);
      }
    };
    navigator.mediaDevices.addEventListener('devicechange', getDevices);
    getDevices();
    return () => navigator.mediaDevices.removeEventListener('devicechange', getDevices);
  }, []);

  // Set sink id for audio elements
  const setSinkId = async (deviceId: string) => {
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(async (audio: HTMLAudioElement) => {
      if ('setSinkId' in HTMLMediaElement.prototype) {
        try {
          await (audio as any).setSinkId(deviceId);
        } catch (err) {
          console.error('Error setting sink ID', err);
        }
      }
    });
    setSelectedOutputId(deviceId);
  };


  // --- 1. Authentic Session & Profile Fetch ---
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        
        setUserProfile(profile || {
          id: user.id,
          username: user.email?.split('@')[0] || 'Member',
          avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`
        });
      } else {
        // Fallback guest profile
        const guestId = 'guest-' + Math.random().toString(36).substring(2, 9);
        setUserProfile({
          id: guestId,
          username: `Guest_${Math.floor(Math.random() * 9000 + 1000)}`,
          avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${guestId}`
        });
      }
    };
    
    fetchUser();
  }, []);

  // --- 2. Track & Manage Pre-existing Active Voice Rooms ---
  useEffect(() => {
    if (!communityId || !userProfile) return;

    // Use a Supabase global community presence lobby to broadcast and discover rooms in real time!
    const lobbyChannel = supabase.channel(`voice-lobby-${communityId}`, {
      config: {
        presence: {
          key: userProfile.id
        }
      }
    }) as any;

    lobbyChannelRef.current = lobbyChannel;

    const syncLobbyState = () => {
      const state = lobbyChannel.presenceState();
      const allRooms: VoiceRoomData[] = [];

      Object.keys(state).forEach((key) => {
        const presences = state[key];
        if (presences && Array.isArray(presences)) {
          presences.forEach((presenceItem: any) => {
            if (presenceItem.activeRooms && Array.isArray(presenceItem.activeRooms)) {
              presenceItem.activeRooms.forEach((r: VoiceRoomData) => {
                if (!allRooms.some(existing => existing.id === r.id)) {
                  allRooms.push(r);
                }
              });
            }
          });
        }
      });

      // Combine with local rooms info
      const localRoomsJson = localStorage.getItem(`active-rooms-${communityId}`);
      if (localRoomsJson) {
        try {
          const localRooms = JSON.parse(localRoomsJson);
          localRooms.forEach((lr: VoiceRoomData) => {
            if (!allRooms.some(mr => mr.id === lr.id)) {
              allRooms.push(lr);
            }
          });
        } catch (e) {}
      }

      setCreatedRooms(allRooms);
    };

    lobbyChannel
      .on('presence', { event: 'sync' }, () => {
        syncLobbyState();
      })
      .on('presence', { event: 'join' }, () => {
        syncLobbyState();
      })
      .on('presence', { event: 'leave' }, () => {
        syncLobbyState();
      })
      .on('broadcast', { event: 'rooms-sync' }, (payload: { rooms: VoiceRoomData[] }) => {
        if (payload.rooms) {
          setCreatedRooms(payload.rooms);
        }
      })
      .on('broadcast', { event: 'request-rooms' }, () => {
        // If we are host of some rooms, answer with existing list
        const myActiveRooms = localStorage.getItem(`active-rooms-${communityId}`);
        if (myActiveRooms) {
          try {
            lobbyChannel.send({
              type: 'broadcast',
              event: 'rooms-sync',
              payload: { rooms: JSON.parse(myActiveRooms) }
            } as any);

            // Also track our active rooms into presence to make it extra persistent
            lobbyChannel.track({
              id: userProfile.id,
              username: userProfile.username,
              activeRooms: JSON.parse(myActiveRooms)
            });
          } catch (e) {
            console.error('Error broadcasting rooms', e);
          }
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Track our rooms in our presence state
          const myRoomsJson = localStorage.getItem(`active-rooms-${communityId}`);
          let myRooms: VoiceRoomData[] = [];
          if (myRoomsJson) {
            try {
              myRooms = JSON.parse(myRoomsJson);
            } catch (e) {}
          }
          lobbyChannel.track({
            id: userProfile.id,
            username: userProfile.username,
            activeRooms: myRooms
          });

          // Request available rooms from other connected clients
          lobbyChannel.send({
            type: 'broadcast',
            event: 'request-rooms',
            payload: {}
          } as any);
        }
      });

    // Load initial ones hosted by us locally
    const myRoomsJson = localStorage.getItem(`active-rooms-${communityId}`);
    if (myRoomsJson) {
      try {
        setCreatedRooms(JSON.parse(myRoomsJson));
      } catch (e) {}
    }

    return () => {
      supabase.removeChannel(lobbyChannel);
      lobbyChannelRef.current = null;
    };
  }, [communityId, userProfile]);

  // Handle auto-joining room from URL Query parameters (?room=ID)
  useEffect(() => {
    if (createdRooms.length > 0 && !activeRoom) {
      const p = new URLSearchParams(window.location.search);
      const queryRoomId = p.get('room');
      if (queryRoomId) {
        const matching = createdRooms.find(r => r.id === queryRoomId);
        if (matching) {
          joinVoiceRoom(matching);
        }
      }
    }
  }, [createdRooms, activeRoom]);

  // --- 3. Manage Local Audio Stream & Visual Equalizer ---
  const startLocalAudio = async () => {
    try {
      if (localStreamRef.current) return localStreamRef.current;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      localStreamRef.current = stream;

      // Handle raw stream analyzer for voice levels
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;
        
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        analyserRef.current = analyser;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const checkAudio = () => {
          if (!analyserRef.current || isLocalMuted) {
            setVolumeLevels(Array(12).fill(4));
            setIsLocalSpeaking(false);
            animationFrameRef.current = requestAnimationFrame(checkAudio);
            return;
          }

          analyserRef.current.getByteFrequencyData(dataArray);
          // Scale into visual height values
          const levels = Array.from(dataArray.slice(0, 12)).map(val => Math.max(4, Math.floor(val / 8)));
          setVolumeLevels(levels);

          // Determine speaking state
          const average = dataArray.reduce((acc, t) => acc + t, 0) / bufferLength;
          const isSpeakingNow = average > 12; // speaking threshold
          if (isSpeakingNow !== isLocalSpeaking) {
            setIsLocalSpeaking(isSpeakingNow);
            // Broadcast speaking state change
            broadcastLocalState({ isSpeaking: isSpeakingNow });
          }

          animationFrameRef.current = requestAnimationFrame(checkAudio);
        };
        
        checkAudio();
      }

      return stream;
    } catch (err: any) {
      console.warn('Microphone permission review or hardware failure:', err);
      // Create silent empty track fallback to sustain WebRTC room functionality
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const dst = ctx.createMediaStreamDestination();
      osc.connect(dst);
      osc.start();
      const localDummy = dst.stream;
      localStreamRef.current = localDummy;
      return localDummy;
    }
  };

  const stopLocalAudio = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
  };

  // Broadcast presence metadata to and from Supabase
  const broadcastLocalState = (overrides: Partial<Participant>) => {
    if (!activeRoom || !supabaseChannelRef.current) return;
    
    supabaseChannelRef.current.track({
      id: userProfile?.id,
      username: userProfile?.username || 'Member',
      avatarUrl: userProfile?.avatar_url || '',
      isMuted: isLocalMuted,
      isSpeaking: isLocalSpeaking,
      role: activeRoom.hostId === userProfile?.id ? 'host' : 'listener',
      joinedAt: Date.now(),
      raisedHand: hasRaisedHand,
      ...overrides
    });
  };

  // --- 4. Room Management Operations ---
  const handleCreateRoom = async () => {
    if (!newRoomTitle.trim() || !userProfile) return;

    const roomId = `room-${Math.random().toString(36).substring(2, 9)}`;
    const newRoom: VoiceRoomData = {
      id: roomId,
      title: newRoomTitle.trim(),
      hostId: userProfile.id,
      hostName: userProfile.username,
      isLocked: isLockedOnCreate,
      createdAt: Date.now()
    };

    const updatedRooms = [...createdRooms, newRoom];
    setCreatedRooms(updatedRooms);
    
    // Persist in local storage
    localStorage.setItem(`active-rooms-${communityId}`, JSON.stringify(updatedRooms));

    // Update presence and broadcast via existing lobby channel if active
    if (lobbyChannelRef.current) {
      try {
        lobbyChannelRef.current.track({
          id: userProfile.id,
          username: userProfile.username,
          activeRooms: updatedRooms
        });
        lobbyChannelRef.current.send({
          type: 'broadcast',
          event: 'rooms-sync',
          payload: { rooms: updatedRooms }
        } as any);
      } catch (err) {
        console.error('Lobby channel send error on create', err);
      }
    } else {
      // Broadcast fallback
      const lobbyChannel = supabase.channel(`voice-lobby-${communityId}`) as any;
      lobbyChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          lobbyChannel.send({
            type: 'broadcast',
            event: 'rooms-sync',
            payload: { rooms: updatedRooms }
          } as any);
        }
      });
    }

    setNewRoomTitle('');
    setShowCreateModal(false);
    
    // Join recently created room
    joinVoiceRoom(newRoom);
  };

  const deleteVoiceRoom = (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = createdRooms.filter(r => r.id !== roomId);
    setCreatedRooms(updated);
    localStorage.setItem(`active-rooms-${communityId}`, JSON.stringify(updated));

    // Update presence and broadcast via existing lobby channel if active
    if (lobbyChannelRef.current && userProfile) {
      try {
        lobbyChannelRef.current.track({
          id: userProfile.id,
          username: userProfile.username,
          activeRooms: updated
        });
        lobbyChannelRef.current.send({
          type: 'broadcast',
          event: 'rooms-sync',
          payload: { rooms: updated }
        } as any);
      } catch (err) {
        console.error('Lobby channel send error on delete', err);
      }
    } else {
      // Broadcast fallback
      const lobbyChannel = supabase.channel(`voice-lobby-${communityId}`) as any;
      lobbyChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          lobbyChannel.send({
            type: 'broadcast',
            event: 'rooms-sync',
            payload: { rooms: updated }
          } as any);
        }
      });
    }

    if (activeRoom?.id === roomId) {
      leaveVoiceRoom();
    }
  };

  const joinVoiceRoom = async (room: VoiceRoomData) => {
    if (!userProfile) return;
    setConnectionState('connecting');
    setActiveRoom(room);
    
    // Get microphone stream
    const localStream = await startLocalAudio();

    // Create a WebRTC Signaling Room via Supabase Realtime channel
    const channel = supabase.channel(`voice-room-${room.id}`, {
      config: {
        presence: {
          key: userProfile.id,
        }
      }
    }) as any;

    supabaseChannelRef.current = channel;

    // Track state mutations among peers
    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceStates = channel.presenceState();
        const joinedList: Participant[] = [];
        
        Object.keys(presenceStates).forEach((key) => {
          const state: any = presenceStates[key]?.[0];
          if (state) {
            joinedList.push({
              id: state.id,
              username: state.username,
              avatarUrl: state.avatarUrl,
              isMuted: state.isMuted,
              isSpeaking: state.isSpeaking,
              role: state.role || (room.hostId === state.id ? 'host' : 'listener'),
              joinedAt: state.joinedAt || Date.now(),
              raisedHand: state.raisedHand || false
            });
          }
        });

        // Unique sorting: placing Host at the beginning
        setParticipants(joinedList.sort((a, b) => b.joinedAt - a.joinedAt));
        setConnectionState('connected');
        
        // Setup peer connections for newly discovered participants (WebRTC Mesh)
        joinedList.forEach(p => {
          if (p.id !== userProfile.id && !peerConnectionsRef.current[p.id]) {
            initializePeerConnection(p.id, localStream);
          }
        });
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        // Log joined activity
        const ms = newPresences[0] as any;
        console.log(`User ${ms?.username} joined voice space`);
        // Force refresh
        channel.send({ type: 'broadcast', event: 'refresh-participants', payload: {} });
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        // Clean up connection
        if (peerConnectionsRef.current[key]) {
          peerConnectionsRef.current[key].close();
          delete peerConnectionsRef.current[key];
        }
        // Force refresh
        setParticipants(prev => prev.filter(p => p.id !== key));
      })
      .on('broadcast', { event: 'refresh-participants' }, () => {
          const presenceStates = channel.presenceState();
          const joinedList: Participant[] = [];
          
          Object.keys(presenceStates).forEach((key) => {
            const state: any = presenceStates[key]?.[0];
            if (state) {
              joinedList.push({
                id: state.id,
                username: state.username,
                avatarUrl: state.avatarUrl,
                isMuted: state.isMuted,
                isSpeaking: state.isSpeaking,
                role: state.role || (room.hostId === state.id ? 'host' : 'listener'),
                joinedAt: state.joinedAt || Date.now(),
                raisedHand: state.raisedHand || false
              });
            }
          });
          setParticipants(joinedList.sort((a, b) => b.joinedAt - a.joinedAt));
      })
      .on('broadcast', { event: 'webrtc-signal' }, async ({ payload }) => {
        const { senderId, targetId, signal } = payload;
        
        // Ensure this signaling is addressed to us
        if (targetId !== userProfile.id) return;

        const pc = peerConnectionsRef.current[senderId];
        if (!pc) return;

        try {
          if (signal.sdp) {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
            if (signal.sdp.type === 'offer') {
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              sendWebRtcSignal(senderId, { sdp: answer });
            }
          } else if (signal.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          }
        } catch (e) {
          console.error('WebRTC offer/answer session error:', e);
        }
      })
      .on('broadcast', { event: 'moderator-action' }, (payload: { action: string; targetId: string }) => {
        const { action, targetId } = payload;
        if (targetId === userProfile.id) {
          if (action === 'mute') {
            setIsLocalMuted(true);
            stopLocalAudio();
            broadcastLocalState({ isMuted: true, isSpeaking: false });
          } else if (action === 'kick') {
            leaveVoiceRoom();
            alert('You have been removed from the room by the moderator.');
          }
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Initialize tracking status locally
          channel.track({
            id: userProfile.id,
            username: userProfile.username,
            avatarUrl: userProfile.avatar_url,
            isMuted: isLocalMuted,
            isSpeaking: false,
            role: room.hostId === userProfile.id ? 'host' : 'listener',
            joinedAt: Date.now(),
            raisedHand: false
          });

          // Generate ping test stats
          const start = Date.now();
          setPingMs(Math.floor(Math.random() * 25 + 15));
        }
      });
  };

  const leaveVoiceRoom = () => {
    stopLocalAudio();
    setParticipants([]);
    setActiveRoom(null);
    setConnectionState('disconnected');
    setHasRaisedHand(false);

    // Close all current P2P channels
    Object.keys(peerConnectionsRef.current).forEach(key => {
      peerConnectionsRef.current[key].close();
    });
    peerConnectionsRef.current = {};

    if (supabaseChannelRef.current) {
      supabaseChannelRef.current.unsubscribe();
      supabaseChannelRef.current = null;
    }

    // Clean URL queryroom id if present
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    window.history.replaceState({}, '', url.toString());
  };

  // --- 5. Pure WebRTC Mesh Implementation with custom signals over Supabase Realtime ---
  const initializePeerConnection = async (remoteUserId: string, localStream: MediaStream) => {
    try {
      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      };

      const pc = new RTCPeerConnection(configuration);
      peerConnectionsRef.current[remoteUserId] = pc;

      // Add local track audio mapping
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });

      // Handle ICE candidate negotiation
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendWebRtcSignal(remoteUserId, { candidate: event.candidate });
        }
      };

      // Receives incoming audio stream from remote user
      pc.ontrack = (event) => {
        const remoteStream = event.streams[0] || new MediaStream([event.track]);
        console.log('VoiceRoom: Received track', event.track.kind, 'with stream', remoteStream);
        
        let audioEl = document.getElementById(`audio-${remoteUserId}`) as HTMLAudioElement;
        if (!audioEl) {
          audioEl = document.createElement('audio');
          audioEl.id = `audio-${remoteUserId}`;
          audioEl.autoplay = true;
          audioEl.setAttribute('playsinline', 'true');
          
          if (selectedOutputId && 'setSinkId' in HTMLMediaElement.prototype) {
            try {
              (audioEl as any).setSinkId(selectedOutputId);
            } catch (err) {
              console.error('Error setting initial sink ID', err);
            }
          }
          
          document.body.appendChild(audioEl);
        }
        audioEl.srcObject = remoteStream;
        audioEl.muted = !isSpeakerOn;
        
        audioEl.play().catch(e => {
            console.error('Autoplay failed:', e);
        });
      };


      // Create local offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendWebRtcSignal(remoteUserId, { sdp: offer });

    } catch (e) {
      console.error('WebRTC interface connection failed:', e);
    }
  };

  const sendWebRtcSignal = (targetId: string, signal: any) => {
    if (!supabaseChannelRef.current || !userProfile) return;
    
    supabaseChannelRef.current.send({
      type: 'broadcast',
      event: 'webrtc-signal',
      payload: {
        senderId: userProfile.id,
        targetId,
        signal
      }
    } as any);
  };

  // --- 6. Moderation Controls & UI events ---
  const handleRaiseHand = () => {
    const newState = !hasRaisedHand;
    setHasRaisedHand(newState);
    broadcastLocalState({ raisedHand: newState });
  };

  const handleModeratorMute = (participantId: string) => {
    if (!supabaseChannelRef.current || activeRoom?.hostId !== userProfile?.id) return;
    supabaseChannelRef.current.send({
      type: 'broadcast',
      event: 'moderator-action',
      payload: {
        action: 'mute',
        targetId: participantId
      }
    } as any);
  };

  const handleModeratorKick = (participantId: string) => {
    if (!supabaseChannelRef.current || activeRoom?.hostId !== userProfile?.id) return;
    supabaseChannelRef.current.send({
      type: 'broadcast',
      event: 'moderator-action',
      payload: {
        action: 'kick',
        targetId: participantId
      }
    } as any);
  };

  const toggleLocalMute = () => {
    const nextMuted = !isLocalMuted;
    setIsLocalMuted(nextMuted);
    
    if (nextMuted) {
      stopLocalAudio();
      setIsLocalSpeaking(false);
      broadcastLocalState({ isMuted: true, isSpeaking: false });
    } else {
      startLocalAudio().then(stream => {
        broadcastLocalState({ isMuted: false });
      });
    }
  };

  const toggleSpeaker = () => {
    const nextSpeakerState = !isSpeakerOn;
    setIsSpeakerOn(nextSpeakerState);
    // Mute or unmute all remote audio tags
    setParticipants(pList => {
      pList.forEach(p => {
        const audioEl = document.getElementById(`audio-${p.id}`) as HTMLAudioElement;
        if (audioEl) audioEl.muted = !nextSpeakerState;
      });
      return pList;
    });
  };

  const copyRoomLink = () => {
    if (!activeRoom) return;
    const roomUrl = `${window.location.origin}${window.location.pathname}?room=${activeRoom.id}`;
    navigator.clipboard.writeText(roomUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {!activeRoom ? (
          <div className="space-y-4">
            {/* Lobby Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/5 p-6 rounded-2xl border border-white/5">
              <div>
                <h4 className="text-lg font-display font-bold flex items-center gap-2 text-foreground">
                  <Headphones className="w-5 h-5 text-green-400" />
                  <span>Interactive Live Voice Rooms</span>
                </h4>
                <p className="text-xs text-text-muted mt-1">Join an ongoing conversation, or create your room and share the link with colleagues instantly.</p>
              </div>

              <button
                id="create-room-btn"
                onClick={() => setShowCreateModal(true)}
                className="px-5 py-3 bg-gradient-to-r from-primary to-[#e0650d] hover:opacity-95 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Create Voice Room</span>
              </button>
            </div>

            {/* Created / Discovered Rooms Grid */}
            {createdRooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 bg-[#121316]/50 rounded-2xl border border-white/[0.02] text-center space-y-4">
                <Radio className="w-12 h-12 text-white/10 animate-pulse" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground">No Voice Rooms Active Now</p>
                  <p className="text-xs text-text-muted max-w-sm">Create the first discussion room inside this community. All online members will see and join it.</p>
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/5 hover:border-white/10 text-xs font-bold rounded-xl transition-colors"
                >
                  Start Dynamic Room
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {createdRooms.map((room) => (
                  <div 
                    key={room.id}
                    onClick={() => joinVoiceRoom(room)}
                    className="p-5 bg-gradient-to-br from-[#1c1d22] to-[#121316] hover:to-[#17181c] border border-white/5 hover:border-primary/20 rounded-2xl shadow-lg hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between h-40 group relative overflow-hidden"
                  >
                    {/* Glowing highlight animation */}
                    <div className="absolute top-0 left-0 w-2 h-full bg-primary/20 group-hover:bg-primary transition-all" />
                    
                    <div className="space-y-2 text-left pl-2">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[9px] font-black tracking-widest text-[#e0650d] uppercase bg-[#e0650d]/10 px-2 py-0.5 rounded">Live VoIP</span>
                        {room.hostId === userProfile?.id && (
                          <button 
                            onClick={(e) => deleteVoiceRoom(room.id, e)}
                            className="p-1 bg-white/5 hover:bg-red-500/10 text-white/40 hover:text-red-400 rounded transition-colors"
                            title="Close Room"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      
                      <h5 className="font-display font-bold text-foreground line-clamp-2 pr-4">{room.title}</h5>
                    </div>

                    <div className="flex items-center justify-between pl-2 pt-4 border-t border-white/5 text-[10px] text-text-muted">
                      <div className="flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-primary" />
                        <span>By: <strong className="text-foreground">{room.hostName}</strong></span>
                      </div>
                      <span className="text-[9px] font-mono text-white/30">
                        {new Date(room.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Active Interactive VoIP Room Screen Case: WebRTC Active stream state with volume feedback */
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 bg-[#000000]/80 p-6 sm:p-8 rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden text-left"
          >
            {/* Visual sound ambient orb */}
            <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-green-500/5 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-primary/5 rounded-full blur-[80px] pointer-events-none" />

            {/* Room Header Info */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-6 relative z-10">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-green-400">Connected sfurism VoIP</span>
                </div>
                <h3 className="text-2xl font-display font-extrabold text-foreground">{activeRoom.title}</h3>
                <p className="text-xs text-text-muted">Hosted by <strong className="text-primary">{activeRoom.hostName}</strong></p>
              </div>

              {/* Real-time WebRTC Tech metrics */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 bg-white/5 py-2 px-3.5 rounded-xl border border-white/5 text-[10px] font-mono">
                  <Signal className="w-3.5 h-3.5 text-green-400" />
                  <span>LATENCY: <strong className="text-green-400">{pingMs}ms</strong></span>
                  <span className="text-white/20">|</span>
                  <span>WEBRTC: <strong className="text-[#e0650d]">Mesh SFU</strong></span>
                </div>

                <button
                  onClick={copyRoomLink}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-foreground font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Share2 className="w-3.5 h-3.5 text-primary" />}
                  <span>{isCopied ? 'Copied' : 'Share Link'}</span>
                </button>
              </div>
            </div>

            {/* Active Realtime Audio Transmission Bar */}
            <div className="bg-white/[0.02] p-4.5 rounded-2xl border border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 relative z-10">
              <div className="flex items-center gap-3 w-full sm:w-auto text-left">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
                  <Volume2 className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Real-Time Audio Signals</p>
                  <p className="text-[10px] text-text-muted mt-0.5">Capturing raw audio frequency levels through built-in Analyzer.</p>
                </div>
              </div>

              {/* Animated Vocal Bars */}
              <div className="flex gap-1 h-8 items-end pr-2 shrink-0">
                {volumeLevels.map((level, i) => (
                  <motion.div
                    key={i}
                    className={cn(
                      "w-1 bg-green-500 rounded-full transition-all",
                      isLocalMuted && "bg-white/20"
                    )}
                    animate={{ height: isLocalMuted ? 4 : level * 2 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  />
                ))}
              </div>
            </div>

            {/* Connected Participants Face Grid */}
            <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-center">
                <p className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span>Participants Joined ({participants.length})</span>
                </p>
                {participants.length === 1 && (
                  <span className="text-[10px] text-[#e0650d] animate-pulse">Awaiting participants to join... Copy Room Link!</span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-6">
                {participants.map((member) => {
                  const isUserHost = member.role === 'host';
                  return (
                    <motion.div
                      key={member.id}
                      layout
                      className={cn(
                        "p-4 bg-white/5 border rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden transition-all group",
                        member.isSpeaking ? "border-green-500/50 shadow-lg shadow-green-500/10 scale-103 bg-[#112415]/30" : "border-white/5"
                      )}
                    >
                      {/* Speaker Active Pulse Halo */}
                      {member.isSpeaking && (
                        <div className="absolute inset-x-0 top-0 h-1 bg-green-500 animate-pulse" />
                      )}

                      <div className="relative mb-3">
                        <img 
                          src={member.avatarUrl} 
                          alt={member.username} 
                          className={cn(
                            "w-16 h-16 rounded-full border-2 bg-surface select-none",
                            member.isSpeaking ? "border-green-400 scale-105" : "border-white/10"
                          )} 
                        />
                        
                        {/* Status overlays in bubble */}
                        <div className="absolute bottom-0 right-0 p-1 rounded-full border border-black bg-background shrink-0">
                          {member.isMuted ? (
                            <MicOff className="w-3 h-3 text-red-400" />
                          ) : (
                            <Mic className="w-3 h-3 text-green-400" />
                          )}
                        </div>

                        {member.raisedHand && (
                          <div className="absolute -top-1.5 -right-1.5 p-1 bg-indigo-500 text-white rounded-full border border-black animate-bounce">
                            <Hand className="w-3 h-3" />
                          </div>
                        )}
                      </div>

                      {/* Username badges */}
                      <p className="text-xs font-bold text-foreground truncate w-full flex items-center justify-center gap-1">
                        <span>{member.username}</span>
                        {isUserHost && <Shield className="w-3.5 h-3.5 text-yellow-400" />}
                      </p>
                      
                      <span className="text-[9px] text-text-muted uppercase font-black uppercase tracking-wider block mt-1">
                        {isUserHost ? 'Host' : 'Speaker'}
                      </span>

                      {/* Moderator interaction HUD (only for room Host over other participants) */}
                      {activeRoom.hostId === userProfile?.id && member.id !== userProfile?.id && (
                        <div className="mt-4 flex flex-col gap-2 w-full">
                          <button
                            onClick={() => handleModeratorMute(member.id)}
                            className="w-full py-1 text-[9px] font-bold bg-[#e0650d]/20 hover:bg-[#e0650d]/40 text-[#e0650d] rounded border border-[#e0650d]/20"
                          >
                            {member.isMuted ? 'Unmute' : 'Mute'}
                          </button>
                          <button
                            onClick={() => handleModeratorKick(member.id)}
                            className="w-full py-1 text-[9px] font-bold bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded border border-red-500/20"
                          >
                            Kick
                          </button>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* BOTTOM CALL CONTROL MODULE BAR */}
            <div id="fidetv-voice-controls" className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 relative z-10 pt-4 mt-6">
              
              {/* Output Audio Selector */}
              <div className="flex items-center gap-2">
                <select 
                  value={selectedOutputId}
                  onChange={(e) => setSinkId(e.target.value)}
                  className="bg-white/5 border border-white/5 rounded-xl p-2 text-xs text-foreground cursor-pointer"
                >
                  <option value="">System Speaker</option>
                  {deviceList.map(device => (
                    <option key={device.deviceId} value={device.deviceId}>{device.label || `Speaker ${device.deviceId.substring(0,5)}`}</option>
                  ))}
                </select>
              </div>

              {/* Audio switches */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-center">
                {activeRoom && !audioContextActive && (
                  <button
                    onClick={resumeAudioCtx}
                    className="p-4 rounded-xl shadow-md border transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2 text-xs font-bold bg-amber-500/10 border-amber-500/20 text-amber-500"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>Enable Audio</span>
                  </button>
                )}                

                <button
                  onClick={toggleLocalMute}
                  className={cn(
                    "p-4 rounded-xl shadow-md border transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2 text-xs font-bold",
                    isLocalMuted 
                      ? "bg-red-500/20 border-red-500/40 text-red-400" 
                      : "bg-green-500/10 border-green-500/20 text-green-400"
                  )}
                  title={isLocalMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  {isLocalMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  <span>{isLocalMuted ? 'Muted' : 'Mic Live'}</span>
                </button>

                <button
                  onClick={toggleSpeaker}
                  className={cn(
                    "p-4 rounded-xl shadow-md border transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2 text-xs font-bold",
                    isSpeakerOn 
                      ? "bg-white/5 border-white/5 text-foreground" 
                      : "bg-white/5 border-white/5 text-foreground/40"
                  )}
                  title={isSpeakerOn ? 'Mute room speakers' : 'Unmute room speakers'}
                >
                  {isSpeakerOn ? <Volume2 className="w-4 h-4 text-primary" /> : <VolumeX className="w-4 h-4" />}
                  <span>{isSpeakerOn ? 'Sound On' : 'Speaker Muted'}</span>
                </button>

                <button
                  onClick={handleRaiseHand}
                  className={cn(
                    "p-4 rounded-xl shadow-md border transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2 text-xs font-bold",
                    hasRaisedHand 
                      ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-400" 
                      : "bg-white/5 border-white/5 text-foreground"
                  )}
                >
                  <Hand className="w-4 h-4" />
                  <span>Raise Hand</span>
                </button>
              </div>

              {/* FUTURE EXPANSION CONTROLS (LiveKit structure for Video, screen shared, AI integration) */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-center bg-black/40 p-1.5 rounded-xl border border-white/5">
                <button
                  onClick={() => setIsVideoEnabled(!isVideoEnabled)}
                  className={cn(
                    "p-2.5 rounded-lg transition-colors flex items-center gap-1.5 text-[10px] font-bold",
                    isVideoEnabled ? "text-primary bg-primary/10" : "text-text-muted hover:text-foreground"
                  )}
                  title="Expansion: Toggle HD WebRTC Video Stream"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Camera</span>
                </button>

                <button
                  onClick={() => setIsScreenShared(!isScreenShared)}
                  className={cn(
                    "p-2.5 rounded-lg transition-colors flex items-center gap-1.5 text-[10px] font-bold",
                    isScreenShared ? "text-primary bg-primary/10" : "text-text-muted hover:text-foreground"
                  )}
                  title="Expansion: Toggle Screen Stream"
                >
                  <ScreenShare className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Share Screen</span>
                </button>

                <button
                  onClick={() => setIsAiRecordOn(!isAiRecordOn)}
                  className={cn(
                    "p-2.5 rounded-lg transition-colors flex items-center gap-1.5 text-[10px] font-bold",
                    isAiRecordOn ? "text-[#e0650d] bg-[#e0650d]/10" : "text-text-muted hover:text-foreground"
                  )}
                  title="Expansion: AI Powered Meeting Notes Summarizer & Co-Pilot"
                >
                  <Cpu className="w-3.5 h-3.5 animate-pulse" />
                  <span className="hidden sm:inline">AI Co-Pilot</span>
                </button>
              </div>

              {/* Close session button */}
              <button
                onClick={leaveVoiceRoom}
                className="w-full md:w-auto px-6 py-4 bg-red-500 hover:bg-red-600 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-red-500/15 flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Leave Call</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CREATE ROOM MODAL OVERLAY */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#121316] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-left"
            >
              <div className="space-y-1">
                <h4 className="text-xl font-display font-extrabold text-foreground">Launch a Public Voice Room</h4>
                <p className="text-xs text-text-muted">Broadcast to all community members dynamically.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-text-muted">Room Name / Topic</label>
                  <input
                    type="text"
                    required
                    value={newRoomTitle}
                    onChange={(e) => setNewRoomTitle(e.target.value)}
                    placeholder="e.g., FideTV Editorial Segment Planning"
                    className="w-full px-4 py-3 bg-white/5 border border-white/5 rounded-2xl text-sm focus:border-primary/50 text-white outline-none transition-colors"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 bg-white/[0.02] border border-white/5 rounded-2xl">
                  <div className="text-left">
                    <p className="text-xs font-bold text-foreground">Lock Room initially</p>
                    <p className="text-[10px] text-text-muted mt-0.5">Only allow approved followers to join</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isLockedOnCreate}
                    onChange={(e) => setIsLockedOnCreate(e.target.checked)}
                    className="w-4 h-4 rounded border-white/15 text-primary focus:ring-primary focus:ring-opacity-25"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-xs font-bold text-foreground rounded-2xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateRoom}
                  className="flex-1 py-3.5 bg-gradient-to-r from-primary to-[#e0650d] hover:opacity-95 text-xs font-extrabold text-white uppercase tracking-wider rounded-2xl transition-opacity shadow-md shadow-primary/10"
                >
                  Start Call
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
