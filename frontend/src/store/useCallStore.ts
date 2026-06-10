import { create } from 'zustand';
import { socketManager } from '@/lib/socket-manager';
import api from '@/services/api';

export type CallStatus = 'idle' | 'ringing' | 'incoming' | 'active' | 'ended';

interface CallState {
  status: CallStatus;
  callId: string | null;
  remoteUserId: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  type: 'voice' | 'video';
  isMuted: boolean;
  isVideoOff: boolean;
  peerConnection: RTCPeerConnection | null;

  setCallStatus: (status: CallStatus) => void;
  initiateCall: (participantId: string, type: 'voice' | 'video') => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
  toggleVideo: () => void;

  handleIncomingCall: (payload: { callId: string; initiatorId: string; type: 'voice' | 'video' }) => void;
  handleCallAccepted: (payload: { callId: string }) => void;
  handleCallRejected: (payload: { callId: string }) => void;
  handleCallEnded: (payload: { callId: string }) => void;
  handleSignalReceived: (payload: { callId: string; signalData: { type: string; offer?: RTCSessionDescriptionInit; answer?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit } }) => void;
  cleanup: () => void;
}

const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export const useCallStore = create<CallState>((set, get) => ({
  status: 'idle',
  callId: null,
  remoteUserId: null,
  localStream: null,
  remoteStream: null,
  type: 'voice',
  isMuted: false,
  isVideoOff: false,
  peerConnection: null,

  setCallStatus: (status) => set({ status }),

  initiateCall: async (participantId, type) => {
    try {
      // 1. Get media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video',
      });
      set({ localStream: stream, status: 'ringing', remoteUserId: participantId, type });

      // 2. Call backend to create DB record
      const res = await api.post('/calls', {
        participantIds: [participantId],
        type,
      });
      const call = res.data;
      set({ callId: call._id });

      // The backend emits CALL_INCOMING to the participant via CallGateway
    } catch (err) {
      console.error('Failed to initiate call:', err);
      get().cleanup();
    }
  },

  acceptCall: async () => {
    const { callId, type, remoteUserId } = get();
    if (!callId) return;

    try {
      // 1. Get media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video',
      });
      set({ localStream: stream, status: 'active' });

      // 2. Notify backend
      await api.patch(`/calls/${callId}/accept`);

      // 3. Set up WebRTC
      const pc = new RTCPeerConnection(iceServers);
      set({ peerConnection: pc });

      // Add local tracks
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Handle remote tracks
      pc.ontrack = (event) => {
        set({ remoteStream: event.streams[0] });
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketManager.getSocket()?.emit('call:signal', {
            toUserId: remoteUserId,
            callId,
            signalData: { type: 'candidate', candidate: event.candidate },
          });
        }
      };

      // 4. Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socketManager.getSocket()?.emit('call:signal', {
        toUserId: remoteUserId,
        callId,
        signalData: { type: 'offer', offer },
      });
    } catch (err) {
      console.error('Failed to accept call:', err);
      get().cleanup();
    }
  },

  rejectCall: async () => {
    const { callId } = get();
    if (!callId) return;
    try {
      await api.patch(`/calls/${callId}/reject`);
    } catch (err) {
      console.error('Reject call failed', err);
    } finally {
      get().cleanup();
    }
  },

  endCall: async () => {
    const { callId } = get();
    if (!callId) return;
    try {
      await api.patch(`/calls/${callId}/end`);
    } catch (err) {
      console.error('End call failed', err);
    } finally {
      get().cleanup();
    }
  },

  toggleMute: () => {
    const { localStream, isMuted } = get();
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = isMuted; // if it was muted, enable it
      });
      set({ isMuted: !isMuted });
    }
  },

  toggleVideo: () => {
    const { localStream, isVideoOff } = get();
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = isVideoOff;
      });
      set({ isVideoOff: !isVideoOff });
    }
  },

  handleIncomingCall: (payload) => {
    if (get().status !== 'idle') {
      // Busy
      return;
    }
    set({
      status: 'incoming',
      callId: payload.callId,
      remoteUserId: payload.initiatorId,
      type: payload.type,
    });
  },

  handleCallAccepted: async (payload) => {
    const { callId } = payload;
    if (get().callId !== callId) return;

    set({ status: 'active' });

    // Set up WebRTC as the initiator
    const pc = new RTCPeerConnection(iceServers);
    set({ peerConnection: pc });

    const localStream = get().localStream;
    if (localStream) {
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
    }

    pc.ontrack = (event) => {
      set({ remoteStream: event.streams[0] });
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketManager.getSocket()?.emit('call:signal', {
          toUserId: get().remoteUserId,
          callId,
          signalData: { type: 'candidate', candidate: event.candidate },
        });
      }
    };
  },

  handleCallRejected: (payload) => {
    if (get().callId === payload.callId) {
      get().cleanup();
    }
  },

  handleCallEnded: (payload) => {
    if (get().callId === payload.callId) {
      get().cleanup();
    }
  },

  handleSignalReceived: async (payload) => {
    const { callId, signalData } = payload;
    if (get().callId !== callId) return;

    const pc = get().peerConnection;
    if (!pc && get().status === 'active') {
        // If we don't have a PC yet but we are active (edge case if offer arrives before accept finishes setup)
        // Usually handled correctly by state order.
    }

    if (pc) {
      try {
        if (signalData.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signalData.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socketManager.getSocket()?.emit('call:signal', {
            toUserId: get().remoteUserId,
            callId,
            signalData: { type: 'answer', answer },
          });
        } else if (signalData.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signalData.answer));
        } else if (signalData.type === 'candidate') {
          await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
        }
      } catch (err) {
        console.error('WebRTC Signal error', err);
      }
    }
  },

  cleanup: () => {
    const { localStream, peerConnection } = get();
    localStream?.getTracks().forEach((track) => track.stop());
    peerConnection?.close();
    set({
      status: 'idle',
      callId: null,
      remoteUserId: null,
      localStream: null,
      remoteStream: null,
      isMuted: false,
      isVideoOff: false,
      peerConnection: null,
    });
  },
}));
