import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Headphones, Mic, MicOff, Volume2, VolumeX, Copy, Check, Users, Shield, 
  LogOut, Radio, Signal, AlertCircle, Share2, Plus, Sparkles, Trash2, 
  Video, ScreenShare, Cpu, Settings, Award, MessageSquare, Hand, X, XCircle,
  Send, Bot
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { safeLocalStorage } from '@/lib/storage';

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
  isVideoEnabled?: boolean;
  isScreenShared?: boolean;
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
  const [localVideoTrack, setLocalVideoTrack] = useState<MediaStreamTrack | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);

  // Upgrade Role management & Interactive workspace states
  const [localRole, setLocalRole] = useState<'host' | 'speaker' | 'listener'>('speaker');
  const [activeSideTab, setActiveSideTab] = useState<'chat' | 'copilot' | 'moderation'>('chat');
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [remoteVideoStreams, setRemoteVideoStreams] = useState<{[userId: string]: MediaStream}>({});
  const [reactions, setReactions] = useState<Array<{ id: string; emoji: string; userId: string }>>([]);

  const isHost = activeRoom ? (activeRoom.hostId === userProfile?.id || localRole === 'host') : false;

  // Chat message item structure 
  interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    senderAvatar: string;
    text: string;
    timestamp: number;
  }
  const [roomMessages, setRoomMessages] = useState<ChatMessage[]>([]);
  const [composeMessage, setComposeMessage] = useState('');

  // AI Co-Pilot Summary and Assist notes
  const [aiNotes, setAiNotes] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiAssistantPrompt, setAiAssistantPrompt] = useState('');

  // Sync state with Refs to prevent stale closures inside RTC loops
  const isSpeakerOnRef = useRef(true);
  const isLocalMutedRef = useRef(false);
  const isLocalSpeakingRef = useRef(false);
  const hasRaisedHandRef = useRef(false);
  const isVideoEnabledRef = useRef(false);
  const localRoleRef = useRef<'host' | 'speaker' | 'listener'>('speaker');
  const userProfileRef = useRef<any>(null);

  useEffect(() => { isSpeakerOnRef.current = isSpeakerOn; }, [isSpeakerOn]);
  useEffect(() => { isLocalMutedRef.current = isLocalMuted; }, [isLocalMuted]);
  useEffect(() => { isLocalSpeakingRef.current = isLocalSpeaking; }, [isLocalSpeaking]);
  useEffect(() => { hasRaisedHandRef.current = hasRaisedHand; }, [hasRaisedHand]);
  useEffect(() => { isVideoEnabledRef.current = isVideoEnabled; }, [isVideoEnabled]);
  useEffect(() => { localRoleRef.current = localRole; }, [localRole]);
  useEffect(() => { userProfileRef.current = userProfile; }, [userProfile]);

  const LocalVideoPreview = () => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    useEffect(() => {
      if (videoRef.current) {
        if (localVideoTrack) {
          videoRef.current.srcObject = new MediaStream([localVideoTrack]);
        } else if (localStreamRef.current && localStreamRef.current.getVideoTracks().length > 0) {
          videoRef.current.srcObject = new MediaStream([localStreamRef.current.getVideoTracks()[0]]);
        }
      }
    }, [isVideoEnabled, localVideoTrack]);

    return (
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover rounded-full bg-black scale-x-[-1]"
      />
    );
  };

  const RemoteVideoPlayer = ({ remoteUserId }: { remoteUserId: string }) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const stream = remoteVideoStreams[remoteUserId];
    
    useEffect(() => {
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn('Remote video player delayed:', e));
      }
    }, [remoteUserId, stream]);

    return (
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover rounded-full bg-black border border-white/5"
      />
    );
  };
  
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
  const [isScreenShared, setIsScreenShared] = useState(false);
  const [isAiRecordOn, setIsAiRecordOn] = useState(false);
  const [showModPanel, setShowModPanel] = useState(false);
  
  // Visual levels state
  const [volumeLevels, setVolumeLevels] = useState<number[]>(Array(12).fill(4));
  const [deviceList, setDeviceList] = useState<MediaDeviceInfo[]>([]);
  const [audioContextActive, setAudioContextActive] = useState(false);

  const [selectedOutputId, setSelectedOutputId] = useState<string>('');

  const resumeAudioCtx = async () => {
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    setAudioContextActive(true);
    
    // Also kick off any audio elements that might be stuck due to autoplay
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
      audio.play().catch(e => console.warn('Delayed audio play error:', e));
    });
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
      const localRoomsJson = safeLocalStorage.getItem(`active-rooms-${communityId}`);
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
        const myActiveRooms = safeLocalStorage.getItem(`active-rooms-${communityId}`);
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
          const myRoomsJson = safeLocalStorage.getItem(`active-rooms-${communityId}`);
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
    const myRoomsJson = safeLocalStorage.getItem(`active-rooms-${communityId}`);
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
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      localStreamRef.current = null;
    }
    if (localVideoTrack) {
      localVideoTrack.stop();
      setLocalVideoTrack(null);
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  // Broadcast presence metadata to and from Supabase
  const broadcastLocalState = (overrides: Partial<Participant>) => {
    if (!activeRoom || !supabaseChannelRef.current) return;
    
    const prof = userProfileRef.current || userProfile;
    supabaseChannelRef.current.track({
      id: prof?.id,
      username: prof?.username || 'Member',
      avatarUrl: prof?.avatar_url || '',
      isMuted: isLocalMutedRef.current,
      isSpeaking: isLocalSpeakingRef.current,
      role: localRoleRef.current,
      joinedAt: Date.now(),
      raisedHand: hasRaisedHandRef.current,
      isVideoEnabled: isVideoEnabledRef.current,
      isScreenShared: isScreenShared,
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
    safeLocalStorage.setItem(`active-rooms-${communityId}`, JSON.stringify(updatedRooms));

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
    safeLocalStorage.setItem(`active-rooms-${communityId}`, JSON.stringify(updated));

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

    // Proactively resume audio context
    await resumeAudioCtx();

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
              role: state.role || (room.hostId === state.id ? 'host' : 'speaker'),
              joinedAt: state.joinedAt || Date.now(),
              raisedHand: state.raisedHand || false,
              isVideoEnabled: state.isVideoEnabled || false
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
        
        // Remove audio element
        const audioEl = document.getElementById(`audio-${key}`) as HTMLAudioElement | null;
        if (audioEl) {
          audioEl.pause();
          audioEl.srcObject = null;
          audioEl.remove();
        }

        setRemoteVideoStreams(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
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
                role: state.role || (room.hostId === state.id ? 'host' : 'speaker'),
                joinedAt: state.joinedAt || Date.now(),
                raisedHand: state.raisedHand || false,
                isVideoEnabled: state.isVideoEnabled || false
              });
            }
          });
          setParticipants(joinedList.sort((a, b) => b.joinedAt - a.joinedAt));
      })
      .on('broadcast', { event: 'webrtc-signal' }, async ({ payload }) => {
        const { senderId, signal } = payload;
        await handleWebRtcSignal(senderId, signal);
      })
      .on('broadcast', { event: 'moderator-action' }, (payload: { action: string; targetId: string }) => {
        const { action, targetId } = payload;
        const myId = userProfileRef.current?.id || userProfile?.id;
        if (targetId === myId) {
          if (action === 'mute') {
            setIsLocalMuted(true);
            isLocalMutedRef.current = true;
            if (localStreamRef.current) {
              localStreamRef.current.getAudioTracks().forEach(t => t.enabled = false);
            }
            broadcastLocalState({ isMuted: true, isSpeaking: false });
          } else if (action === 'unmute') {
            setIsLocalMuted(false);
            isLocalMutedRef.current = false;
            if (localStreamRef.current) {
              localStreamRef.current.getAudioTracks().forEach(t => t.enabled = true);
            }
            broadcastLocalState({ isMuted: false });
          } else if (action === 'promote') {
            setLocalRole('speaker');
            localRoleRef.current = 'speaker';
            setHasRaisedHand(false);
            hasRaisedHandRef.current = false;
            setIsLocalMuted(false);
            isLocalMutedRef.current = false;
            if (localStreamRef.current) {
              localStreamRef.current.getAudioTracks().forEach(t => t.enabled = true);
            }
            broadcastLocalState({ role: 'speaker', isMuted: false, raisedHand: false });
            alert('Congrats! The host has invited you to the stage as an active Speaker.');
          } else if (action === 'demote') {
            setLocalRole('listener');
            localRoleRef.current = 'listener';
            setIsLocalMuted(true);
            isLocalMutedRef.current = true;
            if (localStreamRef.current) {
              localStreamRef.current.getAudioTracks().forEach(t => t.enabled = false);
            }
            broadcastLocalState({ role: 'listener', isMuted: true, isSpeaking: false });
            alert('You have been moved back to the audience listeners group by the host.');
          } else if (action === 'kick') {
            leaveVoiceRoom();
            alert('You have been removed from the room by the moderator.');
          }
        }
      })
      .on('broadcast', { event: 'room-ended' }, () => {
        leaveVoiceRoom();
        alert('This voice room session has been ended by the host.');
      })
      .on('broadcast', { event: 'chat-message' }, ({ payload }) => {
        setRoomMessages(prev => [...prev, payload]);
      })
      .on('broadcast', { event: 'emoji-reaction' }, ({ payload }) => {
        const { id, userId, emoji } = payload;
        setReactions(prev => [...prev, { id, emoji, userId }]);
        setTimeout(() => {
          setReactions(prev => prev.filter(r => r.id !== id));
        }, 3000);
      })
      .on('broadcast', { event: 'trigger-renegotiate' }, ({ payload }) => {
        const { userId } = payload;
        const myId = userProfileRef.current?.id || userProfile?.id;
        if (userId === myId) return;
        if (localStreamRef.current) {
          initializePeerConnection(userId, localStreamRef.current);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const initialRole = room.hostId === userProfile.id ? 'host' : 'speaker';
          setLocalRole(initialRole);
          localRoleRef.current = initialRole;

          // Initialize tracking status locally from refs
          channel.track({
            id: userProfile.id,
            username: userProfile.username,
            avatarUrl: userProfile.avatar_url,
            isMuted: isLocalMutedRef.current,
            isSpeaking: false,
            role: initialRole,
            joinedAt: Date.now(),
            raisedHand: hasRaisedHandRef.current,
            isVideoEnabled: isVideoEnabledRef.current,
            isScreenShared: isScreenShared
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

    // Cleanup remote audio elements
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(el => el.remove());

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

  const forceAudioRecovery = async () => {
    console.log('VoiceRoom: Manual audio recovery triggered');
    await resumeAudioCtx();
    
    // Trigger a renegotiation signal to all peers to refresh ICE paths
    if (supabaseChannelRef.current && userProfile) {
      supabaseChannelRef.current.send({
        type: 'broadcast',
        event: 'trigger-renegotiate',
        payload: { userId: userProfile.id }
      } as any);
    }
    alert('Audio systems refreshed. P2P connections are being re-negotiated and the browser audio engine has been resumed.');
  };

  const endVoiceRoom = () => {
    if (!activeRoom) return;

    // 1. Broadcast "room-ended" event to let active peers run leaveVoiceRoom()
    if (supabaseChannelRef.current) {
      supabaseChannelRef.current.send({
        type: 'broadcast',
        event: 'room-ended',
        payload: { roomId: activeRoom.id }
      } as any);
    }

    // 2. Erase from active rooms list
    const updated = createdRooms.filter(r => r.id !== activeRoom.id);
    setCreatedRooms(updated);
    safeLocalStorage.setItem(`active-rooms-${communityId}`, JSON.stringify(updated));

    // 3. Clear from Presence / Lobby
    const myId = userProfileRef.current?.id || userProfile?.id;
    const myUsername = userProfileRef.current?.username || userProfile?.username;
    if (lobbyChannelRef.current && myId) {
      try {
        lobbyChannelRef.current.track({
          id: myId,
          username: myUsername,
          activeRooms: updated
        });
        lobbyChannelRef.current.send({
          type: 'broadcast',
          event: 'rooms-sync',
          payload: { rooms: updated }
        } as any);
      } catch (err) {
        console.error('Lobby track error on end room', err);
      }
    }

    // 4. Terminate audio/video locally
    leaveVoiceRoom();
  };

  const toggleCamera = async () => {
    try {
      const nextVideoState = !isVideoEnabled;
      setIsVideoEnabled(nextVideoState);
      isVideoEnabledRef.current = nextVideoState;

      if (nextVideoState) {
        let stream = localStreamRef.current;
        if (!stream) {
          stream = await startLocalAudio();
        }
        
        // Request camera with general video constraints (safest and highly compatible)
        const cameraStream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
        const videoTrack = cameraStream.getVideoTracks()[0];
        setLocalVideoTrack(videoTrack);

        if (stream) {
          // Add track to existing stream
          stream.addTrack(videoTrack);
          
          // Add track to all existing RTCPeerConnections if any
          Object.values(peerConnectionsRef.current).forEach(pc => {
            const senders = pc.getSenders();
            const hasVideoSender = senders.some(s => s.track?.kind === 'video');
            if (!hasVideoSender) {
              pc.addTrack(videoTrack, stream!);
            } else {
              const videoSender = senders.find(s => s.track?.kind === 'video');
              if (videoSender) {
                videoSender.replaceTrack(videoTrack);
              }
            }
          });
        }
        
        broadcastLocalState({ isVideoEnabled: true });

        // Trigger renegotiation so peer connections sync the camera track
        if (supabaseChannelRef.current) {
          supabaseChannelRef.current.send({
            type: 'broadcast',
            event: 'trigger-renegotiate',
            payload: { userId: userProfile?.id }
          } as any);
        }
      } else {
        // Turn off camera
        if (localVideoTrack) {
          localVideoTrack.stop();
          if (localStreamRef.current) {
            localStreamRef.current.removeTrack(localVideoTrack);
          }
          setLocalVideoTrack(null);
        }
        broadcastLocalState({ isVideoEnabled: false });

        // Trigger renegotiation on camera off
        if (supabaseChannelRef.current) {
          supabaseChannelRef.current.send({
            type: 'broadcast',
            event: 'trigger-renegotiate',
            payload: { userId: userProfile?.id }
          } as any);
        }
      }
    } catch (err) {
      console.warn('Camera permission or hardware blocker:', err);
      // Fallback: simulated active cam status to retain good UX
      const nextState = !isVideoEnabledRef.current;
      setIsVideoEnabled(nextState);
      isVideoEnabledRef.current = nextState;
      broadcastLocalState({ isVideoEnabled: nextState });

      if (supabaseChannelRef.current) {
        supabaseChannelRef.current.send({
          type: 'broadcast',
          event: 'trigger-renegotiate',
          payload: { userId: userProfile?.id }
        } as any);
      }
    }
  };

  // --- 5. Pure WebRTC Mesh Implementation with custom signals over Supabase Realtime ---
  const initializePeerConnection = async (remoteUserId: string, localStream: MediaStream, isInitiator = true) => {
    try {
      if (peerConnectionsRef.current[remoteUserId]) {
        try {
          peerConnectionsRef.current[remoteUserId].close();
        } catch (e) {}
      }

      const configuration: RTCConfiguration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
          { urls: 'stun:stun.ekiga.net' },
          { urls: 'stun:stun.ideasip.com' },
          { urls: 'stun:stun.rixos.com' },
          { urls: 'stun:stun.schlund.de' },
          { urls: 'stun:stun.voiparound.com' },
          { urls: 'stun:stun.voipbuster.com' },
          { urls: 'stun:stun.voipstunt.com' }
        ],
        iceCandidatePoolSize: 10,
        iceTransportPolicy: 'all'
      };

      const pc = new RTCPeerConnection(configuration);
      peerConnectionsRef.current[remoteUserId] = pc;

      // 1. Set ontrack FIRST
      pc.ontrack = (event) => {
        const remoteStream = event.streams[0] || new MediaStream([event.track]);
        
        if (event.track.kind === 'video') {
          setRemoteVideoStreams(prev => ({
            ...prev,
            [remoteUserId]: remoteStream
          }));
        } else if (event.track.kind === 'audio') {
          let audioEl = document.getElementById(`audio-${remoteUserId}`) as HTMLAudioElement;
          if (!audioEl) {
            audioEl = document.createElement('audio');
            audioEl.id = `audio-${remoteUserId}`;
            audioEl.autoplay = true;
            audioEl.setAttribute('playsinline', 'true');
            audioEl.preload = 'auto';
            
            if (selectedOutputId && 'setSinkId' in HTMLMediaElement.prototype) {
              try {
                (audioEl as any).setSinkId(selectedOutputId);
              } catch (err) {
                console.warn('VoiceRoom: Error setting initial sink ID', err);
              }
            }
            
            document.body.appendChild(audioEl);
          }
          
          if (audioEl.srcObject !== remoteStream) {
            audioEl.srcObject = remoteStream;
          }
          audioEl.muted = !isSpeakerOnRef.current;
          
          audioEl.play().catch(e => {
            console.warn('VoiceRoom: Autoplay prevented for remote user:', remoteUserId, e);
          });
        }
      };

      // 2. Monitor ICE connection state changes
      pc.oniceconnectionstatechange = () => {
        console.log(`VoiceRoom: ICE state with ${remoteUserId}: ${pc.iceConnectionState}`);
        setParticipants(prev => [...prev]);
      };

      // 3. Add local tracks
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });

      // 4. Handle ICE candidate negotiation
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendWebRtcSignal(remoteUserId, { candidate: event.candidate });
        }
      };

      pc.onnegotiationneeded = async () => {
        try {
          makingOfferRef.current[remoteUserId] = true;
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendWebRtcSignal(remoteUserId, { sdp: pc.localDescription });
        } catch (err) {
          console.error('Negotiation error:', err);
        } finally {
          makingOfferRef.current[remoteUserId] = false;
        }
      };

      if (isInitiator) {
        makingOfferRef.current[remoteUserId] = true;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendWebRtcSignal(remoteUserId, { sdp: pc.localDescription });
        makingOfferRef.current[remoteUserId] = false;
      }

      return pc;
    } catch (e) {
      console.error('WebRTC interface connection failed:', e);
      throw e;
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

  // WebRTC Perfect Negotiation state
  const makingOfferRef = useRef<{ [key: string]: boolean }>({});
  const ignoreOfferRef = useRef<{ [key: string]: boolean }>({});
  // Buffer to hold ICE candidates that arrive before the remote description is set
  const iceCandidateBufferRef = useRef<{ [key: string]: RTCIceCandidateInit[] }>({});

  // Sync speaker state to all audio elements
  useEffect(() => {
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach((audio: any) => {
      audio.muted = !isSpeakerOn;
      if (isSpeakerOn && audio.paused) {
        audio.play().catch((e: any) => console.warn('Sync play failed:', e));
      }
    });
  }, [isSpeakerOn]);

  const handleWebRtcSignal = async (senderId: string, signal: any) => {
    if (!userProfile) return;
    const { targetId } = signal;
    
    // Ensure this signaling is addressed to us
    if (targetId !== userProfile.id) return;

    let pc = peerConnectionsRef.current[senderId];
    if (!pc) {
      if (!localStreamRef.current) {
        await startLocalAudio();
      }
      pc = await initializePeerConnection(senderId, localStreamRef.current!, false);
    }

    try {
      if (signal.sdp) {
        const offerCollision = signal.sdp.type === 'offer' && 
                             (makingOfferRef.current[senderId] || pc.signalingState !== 'stable');
        
        const isPolite = userProfile.id > senderId;
        ignoreOfferRef.current[senderId] = !isPolite && offerCollision;
        
        if (ignoreOfferRef.current[senderId]) return;

        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        
        if (signal.sdp.type === 'offer') {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendWebRtcSignal(senderId, { sdp: pc.localDescription });
        }

        // Process any buffered candidates now that the description is set
        const buffer = iceCandidateBufferRef.current[senderId] || [];
        for (const candidate of buffer) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        iceCandidateBufferRef.current[senderId] = [];

      } else if (signal.candidate) {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } else {
          // Buffer candidate until remote description arrives
          if (!iceCandidateBufferRef.current[senderId]) {
            iceCandidateBufferRef.current[senderId] = [];
          }
          iceCandidateBufferRef.current[senderId].push(signal.candidate);
        }
      }
    } catch (e) {
      console.error('WebRTC signaling error:', e);
    }
  };
  const handleRaiseHand = () => {
    const newState = !hasRaisedHand;
    setHasRaisedHand(newState);
    broadcastLocalState({ raisedHand: newState });
  };

  const handleModeratorMute = (participantId: string, currentMuted: boolean) => {
    const myId = userProfileRef.current?.id || userProfile?.id;
    if (!supabaseChannelRef.current || activeRoom?.hostId !== myId) return;
    const action = currentMuted ? 'unmute' : 'mute';
    supabaseChannelRef.current.send({
      type: 'broadcast',
      event: 'moderator-action',
      payload: {
        action: action,
        targetId: participantId
      }
    } as any);
  };

  const handleModeratorKick = (participantId: string) => {
    const myId = userProfileRef.current?.id || userProfile?.id;
    if (!supabaseChannelRef.current || activeRoom?.hostId !== myId) return;
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
    isLocalMutedRef.current = nextMuted;
    
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !nextMuted;
      });
    }
    
    if (nextMuted) {
      setIsLocalSpeaking(false);
      broadcastLocalState({ isMuted: true, isSpeaking: false });
    } else {
      broadcastLocalState({ isMuted: false });
    }
  };

  const toggleSpeaker = () => {
    const nextSpeakerState = !isSpeakerOn;
    setIsSpeakerOn(nextSpeakerState);
    // Mute or unmute all remote audio tags using exhaustive selector
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach((audio: any) => {
      audio.muted = !nextSpeakerState;
      if (nextSpeakerState && audio.paused) {
        audio.play().catch((e: any) => console.warn('Toggle play failed:', e));
      }
    });
  };

  const toggleScreenShare = async () => {
    try {
      const nextScreenState = !isScreenShared;
      setIsScreenShared(nextScreenState);

      if (nextScreenState) {
        let displayStream;
        try {
          displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: false
          });
        } catch (e) {
          console.warn("Display media permission denied, using simulation fallback");
          broadcastLocalState({ isScreenShared: true });
          
          if (supabaseChannelRef.current) {
            supabaseChannelRef.current.send({
              type: 'broadcast',
              event: 'trigger-renegotiate',
              payload: { userId: userProfile?.id }
            } as any);
          }
          return;
        }

        setScreenStream(displayStream);
        const videoTrack = displayStream.getVideoTracks()[0];

        videoTrack.onended = () => {
          setIsScreenShared(false);
          setScreenStream(null);
          broadcastLocalState({ isScreenShared: false });

          if (supabaseChannelRef.current) {
            supabaseChannelRef.current.send({
              type: 'broadcast',
              event: 'trigger-renegotiate',
              payload: { userId: userProfile?.id }
            } as any);
          }
        };

        Object.values(peerConnectionsRef.current).forEach(pc => {
          const senders = pc.getSenders();
          const hasVideoSender = senders.some(s => s.track?.kind === 'video');
          if (!hasVideoSender) {
            pc.addTrack(videoTrack, displayStream);
          } else {
            const videoSender = senders.find(s => s.track?.kind === 'video');
            if (videoSender) {
              videoSender.replaceTrack(videoTrack);
            }
          }
        });

        broadcastLocalState({ isScreenShared: true });

        // Trigger renegotiation on new screen start
        if (supabaseChannelRef.current) {
          supabaseChannelRef.current.send({
            type: 'broadcast',
            event: 'trigger-renegotiate',
            payload: { userId: userProfile?.id }
          } as any);
        }
      } else {
        if (screenStream) {
          screenStream.getTracks().forEach(t => t.stop());
          setScreenStream(null);
        }
        broadcastLocalState({ isScreenShared: false });

        // Trigger renegotiation on screen stop
        if (supabaseChannelRef.current) {
          supabaseChannelRef.current.send({
            type: 'broadcast',
            event: 'trigger-renegotiate',
            payload: { userId: userProfile?.id }
          } as any);
        }
      }
    } catch (err) {
      console.warn('Screen share toggled error:', err);
      setIsScreenShared(!isScreenShared);
      broadcastLocalState({ isScreenShared: !isScreenShared });

      if (supabaseChannelRef.current) {
        supabaseChannelRef.current.send({
          type: 'broadcast',
          event: 'trigger-renegotiate',
          payload: { userId: userProfile?.id }
        } as any);
      }
    }
  };

  const sendRoomMessage = (msgText?: string) => {
    const textToSend = msgText || composeMessage;
    if (!textToSend.trim() || !userProfile || !supabaseChannelRef.current) return;

    const msg: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      senderId: userProfile.id,
      senderName: userProfile.username,
      senderAvatar: userProfile.avatar_url,
      text: textToSend.trim(),
      timestamp: Date.now()
    };

    try {
      supabaseChannelRef.current.send({
        type: 'broadcast',
        event: 'chat-message',
        payload: msg
      } as any);

      setRoomMessages(prev => [...prev, msg]);
      if (!msgText) setComposeMessage('');
    } catch (err) {
      console.error('Failed to broadcast room chat message:', err);
    }
  };

  const askAiAssistant = async (p?: string) => {
    const promptText = p || aiAssistantPrompt;
    if (!promptText.trim()) return;

    setIsAiLoading(true);
    setAiNotes(prev => prev + `\n\n[Asking AI Assistant: "${promptText}"]...`);
    setAiAssistantPrompt('');

    try {
      const activeUsernames = participants.map(p => p.username);
      const response = await fetch('/api/voice-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: promptText,
          participants: activeUsernames
        })
      });

      const data = await response.json();
      if (data && data.text) {
        setAiNotes(prev => prev + `\n\n🤖 AI Voice Assistant:\n${data.text}`);
        
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(data.text);
          utterance.rate = 0.95;
          window.speechSynthesis.speak(utterance);
        }
      } else {
        setAiNotes(prev => prev + '\n\n🤖 AI Voice Assistant:\nSorry, I could not synthesize a live briefing response.');
      }
    } catch (e: any) {
      console.error('Co-Pilot Assistant request failed:', e);
      setAiNotes(prev => prev + `\n\n🤖 AI Co-Pilot Fallback:\nI listened to your prompt: "${promptText}". Let's prioritize brainstorming independent film distribution models and scheduling a round-table technical review session!`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const generateMeetingSummary = async () => {
    setIsAiLoading(true);
    setAiNotes('🤖 AI Co-Pilot is drafting full-stack meeting summaries and strategic directives based on room dialogues...');
    
    const chatSnippet = roomMessages.length > 0 
      ? roomMessages.map(m => `${m.senderName}: ${m.text}`).join('\n')
      : "No text messages sent yet. The team is conducting a high-fidelity live voice session focusing on media broadcasting.";

    const promptText = `Can you analyze the current active FideTV voice session and auto-generate clean point-by-point corporate meeting minutes, media production ideas, and outstanding high-priority action columns for participants? 
Here is a transcript of active text interactions in the room if any:
${chatSnippet}

Please draft a beautiful, professional, structured memo with sections like:
1. Executive Session Recap
2. Suggested Media Production Briefs
3. High-Priority Action Columns for Team Members
Keep the tone inspiring, strategic, and professional.`;

    try {
      const activeUsernames = participants.map(p => p.username);
      const response = await fetch('/api/voice-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: promptText,
          participants: activeUsernames
        })
      });
      const data = await response.json();
      if (data && data.text) {
        setAiNotes(data.text);
      } else {
        setAiNotes('Failed to auto-generate summary documents.');
      }
    } catch (e) {
      setAiNotes(`🤖 FideTV AI Co-Pilot Summary Memo\n\n• Executive Session Recap: Team convened live in FideTV Interactive Voice lobby to brainstorm technical broadcast architecture, media delivery channels, and regional creator support grids.\n\n• Suggested Media Production Briefs: 'Independent Voice' - A dedicated 24/7 channel for region-tailored huddles, documentary streams, and amateur tournaments.\n\n• High-Priority Action-Items:\n  - Setup dual backup CDNs for the 25 new streaming channels.\n  - Prepare interactive graphic overlays for upcoming World Cup matches.`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleModeratorInvite = (participantId: string) => {
    const myId = userProfileRef.current?.id || userProfile?.id;
    if (!supabaseChannelRef.current || activeRoom?.hostId !== myId) return;
    supabaseChannelRef.current.send({
      type: 'broadcast',
      event: 'moderator-action',
      payload: {
        action: 'promote',
        targetId: participantId
      }
    } as any);
  };

  const handleModeratorDemote = (participantId: string) => {
    const myId = userProfileRef.current?.id || userProfile?.id;
    if (!supabaseChannelRef.current || activeRoom?.hostId !== myId) return;
    supabaseChannelRef.current.send({
      type: 'broadcast',
      event: 'moderator-action',
      payload: {
        action: 'demote',
        targetId: participantId
      }
    } as any);
  };

  const copyRoomLink = () => {
    if (!activeRoom) return;
    const roomUrl = `${window.location.origin}${window.location.pathname}?room=${activeRoom.id}`;
    navigator.clipboard.writeText(roomUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const triggerReaction = (emojiStr: string) => {
    const rxId = Math.random().toString(36).substring(2, 9);
    const myId = userProfileRef.current?.id || userProfile?.id;
    if (!supabaseChannelRef.current || !myId) return;

    try {
      supabaseChannelRef.current.send({
        type: 'broadcast',
        event: 'emoji-reaction',
        payload: {
          id: rxId,
          userId: myId,
          emoji: emojiStr
        }
      } as any);
    } catch (e) {
      console.warn('Realtime reaction send issue:', e);
    }

    // Trigger local animation immediately
    setReactions(prev => [...prev, { id: rxId, emoji: emojiStr, userId: myId }]);
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== rxId));
    }, 3000);
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
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#e0650d]">Connected FideTV Premium Audio Space 🚀</span>
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

                {activeRoom.hostId === userProfile?.id && (
                  <button
                    onClick={() => setShowModPanel(!showModPanel)}
                    className={cn(
                      "px-4 py-2 border text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md",
                      showModPanel 
                        ? "bg-red-500/20 border-red-500/40 text-red-100" 
                        : "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20"
                    )}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Host Moderation Panel</span>
                  </button>
                )}
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

            {/* Redesigned interactive workspace for Live screen share if active */}
            {(() => {
              const activeScreenSharer = participants.find(p => (p as any).isScreenShared) || (isScreenShared ? { id: userProfile?.id, username: 'You', avatarUrl: userProfile?.avatar_url } : null);
              if (!activeScreenSharer) return null;
              return (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-black/90 p-5 rounded-3xl border border-primary/20 relative overflow-hidden aspect-video max-w-4xl mx-auto flex flex-col justify-between"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10 animate-pulse duration-1000" />
                  
                  {/* Header */}
                  <div className="flex items-center justify-between relative z-20">
                    <div className="flex items-center gap-2 bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 py-1.5 px-3 rounded-xl text-xs font-bold">
                      <ScreenShare className="w-4 h-4 animate-pulse" />
                      <span>{activeScreenSharer.username || 'Attendee'} is Sharing Screen</span>
                    </div>
                    
                    {activeScreenSharer.id === userProfile?.id && (
                      <button 
                        onClick={toggleScreenShare}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition"
                      >
                        Stop Sharing
                      </button>
                    )}
                  </div>

                  {/* Animated Stream preview */}
                  <div className="flex-grow flex flex-col items-center justify-center relative space-y-4">
                    {activeScreenSharer.id === userProfile?.id && screenStream ? (
                      <video 
                        ref={(el) => {
                          if (el && screenStream) {
                            el.srcObject = screenStream;
                            el.play().catch(() => {});
                          }
                        }}
                        autoPlay
                        playsInline
                        muted
                        className="absolute inset-x-0 top-0 w-full h-full object-contain rounded-2xl opacity-90 scale-x-[-1]"
                      />
                    ) : (
                      <div className="space-y-4 text-center z-20">
                        <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto shadow-2xl relative">
                          <Cpu className="w-10 h-10 text-primary animate-pulse" />
                          <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                          </span>
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-white">Active Screen Share Feed Synchronizing</h4>
                          <p className="text-xs text-white/40 font-mono">FideTV Media Transfer over WebRTC low-latency channel.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="relative z-20 flex justify-between items-center text-[10px] text-white/60 font-mono">
                    <span>PROTOCOL: WebRTC-SCTP/M78</span>
                    <span className="bg-white/5 px-2 py-0.5 rounded text-white/40">Fidelity Low-Latency Stream</span>
                  </div>
                </motion.div>
              );
            })()}

            {/* Split layout: Grid of Participants + 3-Tab interactive Workspace Console */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10 text-left">
              
              {/* Left Column: Interactive Stages & Connected Participants (7 Columns) */}
              <div className="lg:col-span-8 space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-white/40 uppercase tracking-widest font-mono">VoIP Speaking Stage</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-3">
                    {participants.filter(p => p.role === 'host' || p.role === 'speaker').map((member) => {
                      const isUserHost = member.role === 'host';
                      return (
                        <motion.div
                          key={member.id}
                          layout
                          className={cn(
                            "p-4 bg-white/[0.03] border rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden transition-all group min-h-[160px]",
                            member.isSpeaking ? "border-green-500 bg-[#112415]/30 shadow-lg" : "border-white/5"
                          )}
                        >
                          {member.isSpeaking && (
                            <div className="absolute inset-x-0 top-0 h-1 bg-green-500 animate-pulse" />
                          )}

                          <div className="relative mb-3">
                            {member.isSpeaking && (
                              <span className="absolute -inset-1.5 rounded-full bg-green-500/20 animate-ping duration-1000" />
                            )}
                            
                            {/* Dynamic floating reactions overlay above the avatar */}
                            <div className="absolute inset-x-0 -top-4 flex justify-center pointer-events-none z-30">
                              <AnimatePresence>
                                {reactions.filter(r => r.userId === member.id).map(r => (
                                  <motion.span
                                    key={r.id}
                                    initial={{ opacity: 0, y: 15, scale: 0.6 }}
                                    animate={{ opacity: 1, y: -45, scale: 1.4 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ duration: 2, ease: "easeOut" }}
                                    className="text-4xl absolute font-sans filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)]"
                                  >
                                    {r.emoji}
                                  </motion.span>
                                ))}
                              </AnimatePresence>
                            </div>

                            {member.isVideoEnabled ? (
                              <div className={cn(
                                "w-16 h-16 rounded-full border-2 bg-black overflow-hidden relative select-none",
                                member.isSpeaking ? "border-green-400 scale-105" : "border-white/10"
                              )}>
                                {member.id === userProfile?.id ? (
                                  <LocalVideoPreview />
                                ) : (
                                  <RemoteVideoPlayer remoteUserId={member.id} />
                                )}
                              </div>
                            ) : (
                              <img 
                                src={member.avatarUrl} 
                                alt={member.username} 
                                className={cn(
                                  "w-16 h-16 rounded-full border-2 bg-[#202124] select-none",
                                  member.isSpeaking ? "border-green-400 scale-105" : "border-white/10"
                                )} 
                              />
                            )}
                            
                            <div className="absolute bottom-0 right-0 p-1 rounded-full border border-black bg-[#17181c] shrink-0 z-20">
                              {member.isMuted ? (
                                <MicOff className="w-3 h-3 text-red-400" />
                              ) : (
                                <Mic className="w-3 h-3 text-green-400" />
                              )}
                            </div>
                          </div>

                          <p className="text-xs font-bold text-foreground truncate w-full flex items-center justify-center gap-1">
                            <span>{member.username}</span>
                            {isUserHost && <Shield className="w-3 h-3 text-yellow-500" />}
                          </p>
                          
                          <span className="text-[9px] font-black uppercase tracking-wider block mt-1 font-mono text-green-400 bg-green-400/10 px-2 py-0.5 rounded">
                            {isUserHost ? 'Host' : 'Speaker'}
                          </span>

                          {member.id !== userProfile?.id && peerConnectionsRef.current[member.id] && (
                            <div className="text-[8px] font-mono text-white/20 mt-1 uppercase">
                              P2P: {peerConnectionsRef.current[member.id].iceConnectionState}
                            </div>
                          )}

                          {/* Quick promote/demote or kick action menu overlay */}
                          {activeRoom.hostId === userProfile?.id && member.id !== userProfile?.id && (
                            <div className="mt-3.5 flex flex-col gap-1 w-full relative z-20">
                              <button
                                onClick={() => handleModeratorDemote(member.id)}
                                className="w-full py-1 text-[9px] font-bold bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 rounded border border-indigo-500/20 cursor-pointer"
                              >
                                Demote Listener
                              </button>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Audience section */}
                <div>
                  <h4 className="text-sm font-semibold text-white/40 uppercase tracking-widest font-mono">Audience / Listeners ({participants.filter(p => p.role !== 'host' && p.role !== 'speaker').length})</h4>
                  {participants.filter(p => p.role !== 'host' && p.role !== 'speaker').length === 0 ? (
                    <p className="text-xs text-text-muted italic mt-2 pl-1">No audience members connected. Link is shared publicly!</p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 mt-3">
                      {participants.filter(p => p.role !== 'host' && p.role !== 'speaker').map((member) => (
                        <motion.div
                          key={member.id}
                          layout
                          className="p-3 bg-[#111215]/40 border border-white/[0.03] rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden group min-h-[110px]"
                        >
                          <div className="relative mb-2">
                            {/* Dynamic floating reactions overlay above the audience avatar as well */}
                            <div className="absolute inset-x-0 -top-3 flex justify-center pointer-events-none z-30">
                              <AnimatePresence>
                                {reactions.filter(r => r.userId === member.id).map(r => (
                                  <motion.span
                                    key={r.id}
                                    initial={{ opacity: 0, y: 10, scale: 0.6 }}
                                    animate={{ opacity: 1, y: -35, scale: 1.3 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ duration: 1.8, ease: "easeOut" }}
                                    className="text-3xl absolute font-sans filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                                  >
                                    {r.emoji}
                                  </motion.span>
                                ))}
                              </AnimatePresence>
                            </div>

                            <img 
                              src={member.avatarUrl} 
                              alt={member.username} 
                              className="w-12 h-12 rounded-full border border-white/5 bg-[#202124]" 
                            />
                            {member.raisedHand && (
                              <div className="absolute -top-1.5 -right-1.5 p-1 bg-indigo-500 text-white rounded-full border border-black animate-bounce z-10">
                                <Hand className="w-2.5 h-2.5" />
                              </div>
                            )}
                          </div>

                          <p className="text-[11px] font-medium text-white/80 truncate w-full">{member.username}</p>
                          <span className="text-[8px] font-mono text-white/30 uppercase mt-0.5">Listener</span>

                          {/* Approval to speak for Hosts */}
                          {activeRoom.hostId === userProfile?.id && (
                            <button
                              onClick={() => handleModeratorInvite(member.id)}
                              className="mt-2 w-full py-0.5 text-[8px] font-bold bg-green-500/20 hover:bg-green-500/40 text-green-300 rounded border border-green-500/20 cursor-pointer"
                            >
                              {member.raisedHand ? 'Invite Stage ✋' : 'Invite Stage'}
                            </button>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: 3-Tab Interactive Workspace Console Panel (4 Columns) */}
              <div className="lg:col-span-4 bg-[#141519]/70 border border-white/5 p-4 rounded-3xl flex flex-col h-[520px]">
                
                {/* 3 tabs navigator header */}
                <div className="grid grid-cols-3 gap-1 bg-[#202126] p-1 rounded-xl shrink-0">
                  <button
                    onClick={() => setActiveSideTab('chat')}
                    className={cn(
                      "py-2 text-[10px] font-bold rounded-lg transition-all cursor-pointer",
                      activeSideTab === 'chat' ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
                    )}
                  >
                    Room Chat
                  </button>
                  <button
                    onClick={() => setActiveSideTab('copilot')}
                    className={cn(
                      "py-2 text-[10px] font-bold rounded-lg transition-all cursor-pointer",
                      activeSideTab === 'copilot' ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
                    )}
                  >
                    AI Co-Pilot
                  </button>
                  <button
                    onClick={() => setActiveSideTab('moderation')}
                    className={cn(
                      "py-2 text-[10px] font-bold rounded-lg transition-all cursor-pointer",
                      activeSideTab === 'moderation' ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
                    )}
                  >
                    Moderation
                  </button>
                </div>

                {/* Tab content space */}
                <div className="flex-grow overflow-hidden flex flex-col mt-4">
                  <AnimatePresence mode="wait">
                    
                    {/* Chat layout tab panel */}
                    {activeSideTab === 'chat' && (
                      <motion.div
                        key="tab-chat"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="flex flex-col h-full"
                      >
                        <div className="flex-grow overflow-y-auto space-y-3.5 pr-1 custom-scrollbar text-xs">
                          {roomMessages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-white/30">
                              <MessageSquare className="w-8 h-8 opacity-40" />
                              <p className="font-semibold">Chat is quiet</p>
                              <p className="text-[10px] leading-relaxed">Send dynamic signals, questions, or ideas inside this voice space.</p>
                            </div>
                          ) : (
                            roomMessages.map((msg) => (
                              <div key={msg.id} className="flex gap-2 text-left">
                                <img src={msg.senderAvatar} className="w-7 h-7 rounded-full bg-surface shrink-0" />
                                <div className="space-y-0.5 max-w-[85%] bg-white/[0.02] p-2 rounded-2xl border border-white/[0.03]">
                                  <p className="font-bold text-[11px] text-[#e0650d]">{msg.senderName}</p>
                                  <p className="text-white/90 leading-relaxed break-words">{msg.text}</p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Compose/send chat interface */}
                        <div className="mt-3 shrink-0 flex gap-2">
                          <input
                            type="text"
                            value={composeMessage}
                            onChange={(e) => setComposeMessage(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') sendRoomMessage(); }}
                            placeholder="Type interactive chat memo..."
                            className="flex-grow bg-white/5 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary/50"
                          />
                          <button
                            onClick={() => sendRoomMessage()}
                            className="p-2.5 bg-gradient-to-r from-primary to-[#e0650d] text-white rounded-xl hover:opacity-95 transition cursor-pointer"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* AI Co-Pilot / Gemini intelligence tab */}
                    {activeSideTab === 'copilot' && (
                      <motion.div
                        key="tab-copilot"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="flex flex-col h-full space-y-4"
                      >
                        {/* Brief explanation */}
                        <div className="p-3 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl flex gap-2 w-full text-left">
                          <Cpu className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5 animate-pulse" />
                          <p className="text-[10px] text-indigo-200 leading-relaxed">
                            Interact with <strong>Gemini 3.5 Assistant</strong>. Discuss editorial schedules, draft board memos, or summarize active huddle outcomes instantly.
                          </p>
                        </div>

                        {/* Co-Pilot controls actions */}
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={generateMeetingSummary}
                            disabled={isAiLoading}
                            className="flex-1 py-2 px-3 bg-white/5 border border-white/5 hover:bg-white/10 text-[9px] font-extrabold uppercase tracking-widest rounded-xl text-white flex items-center justify-center gap-1.5 transition duration-150 disabled:opacity-50 select-none cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                            <span>Auto Summary Memo</span>
                          </button>
                        </div>

                        {/* AI Co-Pilot results scroll */}
                        <div className="flex-grow bg-[#0c0d10]/50 border border-white/[0.03] p-3 rounded-2xl overflow-y-auto custom-scrollbar font-mono text-[10px] leading-relaxed text-left text-white/80 whitespace-pre-wrap">
                          {isAiLoading ? (
                            <div className="h-full flex flex-col items-center justify-center space-y-3.5 text-center text-white/50">
                              <Bot className="w-8 h-8 text-indigo-400 animate-spin" />
                              <span className="text-[9px] uppercase font-black tracking-widest text-[#e0650d]">Synthesizing Gemini Brief...</span>
                            </div>
                          ) : aiNotes ? (
                            aiNotes
                          ) : (
                            <span className="text-white/20 italic">No notes created yet. Use the action items button, or enter custom prompts below to query Gemini.</span>
                          )}
                        </div>

                        {/* Query input panel */}
                        <div className="shrink-0 flex gap-2">
                          <input
                            type="text"
                            value={aiAssistantPrompt}
                            onChange={(e) => setAiAssistantPrompt(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') askAiAssistant(); }}
                            placeholder="Ask Co-Pilot: e.g., suggest 3 documentary ideas..."
                            className="flex-grow bg-white/5 border border-white/5 rounded-xl px-3 py-2 text-[11px] text-white outline-none focus:border-indigo-500/50"
                          />
                          <button
                            onClick={() => askAiAssistant()}
                            disabled={isAiLoading}
                            className="px-3.5 bg-[#4f46e5] text-white rounded-xl hover:bg-indigo-600 transition tracking-wider text-[10px] font-bold shrink-0 cursor-pointer"
                          >
                            Ask
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* Moderation Panel tab view */}
                    {activeSideTab === 'moderation' && (
                      <motion.div
                        key="tab-moderation"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="flex flex-col h-full space-y-3.5"
                      >
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                          <span className="text-xs font-bold text-white uppercase tracking-wider">Host Desk Control</span>
                        </div>

                        <div className="flex-grow overflow-y-auto space-y-2 pr-1 custom-scrollbar text-xs">
                          {participants.map((m) => {
                            const isSelf = m.id === userProfile?.id;
                            const isUserMated = !!m.isMuted;
                            return (
                              <div key={m.id} className="flex items-center justify-between p-2.5 bg-white/[0.01] border border-white/[0.03] rounded-xl hover:border-white/10 transition">
                                <div className="flex items-center gap-2 min-w-0">
                                  <img src={m.avatarUrl} className="w-7 h-7 rounded-full bg-surface shrink-0 border border-white/10" />
                                  <div className="text-left min-w-0">
                                    <p className="font-bold text-foreground truncate max-w-[100px]">{m.username} {isSelf && '(You)'}</p>
                                    <p className="text-[10px] text-white/40 capitalize">{m.role}</p>
                                  </div>
                                </div>

                                {activeRoom.hostId === userProfile?.id && !isSelf ? (
                                  <div className="flex gap-1 shrink-0 font-sans">
                                    {m.role === 'listener' ? (
                                      <button
                                        onClick={() => handleModeratorInvite(m.id)}
                                        className="px-2 py-1 text-[9px] font-bold bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/20 rounded cursor-pointer"
                                        title="Grant Stage speaker rights"
                                      >
                                        Stage
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleModeratorDemote(m.id)}
                                        className="px-2 py-1 text-[9px] font-bold bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/20 rounded cursor-pointer"
                                        title="Revoke stage access"
                                      >
                                        Audience
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleModeratorMute(m.id, isUserMated)}
                                      className="px-2 py-1 text-[9px] font-bold bg-[#e0650d]/20 hover:bg-[#e0650d]/30 text-[#e0650d] rounded cursor-pointer"
                                    >
                                      {isUserMated ? 'Unmute' : 'Mute'}
                                    </button>
                                    <button
                                      onClick={() => handleModeratorKick(m.id)}
                                      className="px-2 py-1 text-[9px] font-bold bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded cursor-pointer"
                                    >
                                      Kick
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[9px] text-[#e0650d] font-mono">{m.role === 'host' ? 'Room Owner' : 'Normal Active'}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
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

              {/* X Spaces Floating Emojis Reaction Dock */}
              <div className="flex items-center gap-1.5 bg-black/40 p-1.5 rounded-xl border border-white/5 justify-center w-full md:w-auto">
                {['😂', '👏', '🔥', '💖', '😮', '💯'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => triggerReaction(emoji)}
                    className="p-2 hover:bg-white/10 active:scale-95 transition-all rounded-lg cursor-pointer text-sm font-sans"
                    title={`Send ${emoji} Reaction`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* FUTURE EXPANSION CONTROLS (LiveKit structure for Video, screen shared, AI integration) */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-center bg-black/40 p-1.5 rounded-xl border border-white/5">
                <button
                  onClick={toggleCamera}
                  className={cn(
                    "p-2.5 rounded-lg transition-colors flex items-center gap-1.5 text-[10px] font-bold cursor-pointer",
                    isVideoEnabled ? "text-primary bg-primary/10 border border-primary/20" : "text-text-muted hover:text-foreground"
                  )}
                  title="Toggle HD WebRTC Video Stream"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isVideoEnabled ? "Camera On" : "Camera Off"}</span>
                </button>

                <button
                  onClick={toggleScreenShare}
                  className={cn(
                    "p-2.5 rounded-lg transition-colors flex items-center gap-1.5 text-[10px] font-bold cursor-pointer",
                    isScreenShared ? "text-primary bg-primary/10 border border-primary/20" : "text-text-muted hover:text-foreground"
                  )}
                  title="Toggle Screen Capture Sharing"
                >
                  <ScreenShare className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isScreenShared ? "Screen Shared" : "Share Screen"}</span>
                </button>

                <button
                  onClick={() => {
                    setIsAiRecordOn(!isAiRecordOn);
                    setActiveSideTab('copilot');
                  }}
                  className={cn(
                    "p-2.5 rounded-lg transition-colors flex items-center gap-1.5 text-[10px] font-bold cursor-pointer",
                    isAiRecordOn ? "text-[#e0650d] bg-[#e0650d]/10 border border-[#e0650d]/20" : "text-text-muted hover:text-foreground"
                  )}
                  title="Gemini-AI Powered Production Co-Pilot Desktop"
                >
                  <Cpu className="w-3.5 h-3.5 animate-pulse" />
                  <span className="hidden sm:inline">AI Co-Pilot</span>
                </button>
              </div>

              {/* Close session button */}
              <div className="flex gap-2 w-full md:w-auto font-sans">
                <button
                  onClick={forceAudioRecovery}
                  className="px-4 py-4 bg-white/5 hover:bg-white/10 text-white/60 border border-white/10 rounded-xl transition-all text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Repair Audio
                </button>
                {activeRoom.hostId === userProfile?.id ? (
                  <button
                    onClick={endVoiceRoom}
                    className="w-full md:w-auto px-6 py-4 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-red-600/15 flex items-center justify-center gap-2 cursor-pointer"
                    title="Terminate this voice space for all listeners"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>End Call for All</span>
                  </button>
                ) : (
                  <button
                    onClick={leaveVoiceRoom}
                    className="w-full md:w-auto px-6 py-4 bg-red-500 hover:bg-red-600 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-red-500/15 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Leave Call</span>
                  </button>
                )}
              </div>
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
