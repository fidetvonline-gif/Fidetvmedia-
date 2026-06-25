export interface Participant {
  id: string;
  name: string;
  isMuted: boolean;
  isVideoEnabled: boolean;
}

export interface MeetingRoomState {
  participants: Participant[];
  isRecording: boolean;
}
