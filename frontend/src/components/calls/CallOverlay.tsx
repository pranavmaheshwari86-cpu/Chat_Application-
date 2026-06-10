'use client';

import { useEffect, useRef } from 'react';
import { useCallStore } from '@/store/useCallStore';
import { socketManager } from '@/lib/socket-manager';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export default function CallOverlay() {
  const {
    status,
    type,
    isMuted,
    isVideoOff,
    localStream,
    remoteStream,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    handleIncomingCall,
    handleCallAccepted,
    handleCallRejected,
    handleCallEnded,
    handleSignalReceived,
  } = useCallStore();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const socket = socketManager.getSocket();
    if (!socket) return;

    socket.on('call:incoming', handleIncomingCall);
    socket.on('call:accepted', handleCallAccepted);
    socket.on('call:rejected', handleCallRejected);
    socket.on('call:ended', handleCallEnded);
    socket.on('call:signal_received', handleSignalReceived);

    return () => {
      socket.off('call:incoming', handleIncomingCall);
      socket.off('call:accepted', handleCallAccepted);
      socket.off('call:rejected', handleCallRejected);
      socket.off('call:ended', handleCallEnded);
      socket.off('call:signal_received', handleSignalReceived);
    };
  }, [
    handleIncomingCall,
    handleCallAccepted,
    handleCallRejected,
    handleCallEnded,
    handleSignalReceived,
  ]);

  // Attach streams to video elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, status]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, status]);

  if (status === 'idle') return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md"
      >
        <div className="flex flex-col items-center justify-center w-full max-w-4xl p-6 h-full relative">
          
          {/* Header */}
          <div className="absolute top-8 text-center">
            <h2 className="text-2xl font-semibold capitalize">
              {status === 'incoming' ? `Incoming ${type} Call` : status === 'ringing' ? 'Ringing...' : `${type} Call`}
            </h2>
            {status === 'active' && <p className="text-green-500 mt-1 font-medium tracking-wider">Connected</p>}
          </div>

          {/* Video / Audio Area */}
          <div className="relative w-full aspect-video max-w-3xl bg-black rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center border border-border">
            
            {/* Remote Stream */}
            {status === 'active' && type === 'video' && remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : status === 'active' && type === 'voice' && remoteStream ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                  <Phone className="w-12 h-12 text-primary" />
                </div>
                <audio ref={remoteVideoRef as unknown as React.RefObject<HTMLAudioElement>} autoPlay playsInline />
              </div>
            ) : status === 'incoming' || status === 'ringing' ? (
               <div className="flex flex-col items-center gap-4">
                <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center animate-bounce">
                  <Phone className="w-12 h-12 text-primary" />
                </div>
              </div>
            ) : null}

            {/* Local Stream (PiP) */}
            {type === 'video' && localStream && status === 'active' && (
              <div className="absolute bottom-6 right-6 w-48 aspect-video bg-zinc-900 rounded-xl overflow-hidden shadow-lg border border-white/10">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform scale-x-[-1]"
                />
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="absolute bottom-12 flex items-center gap-6">
            {status === 'incoming' ? (
              <>
                <Button size="icon" variant="destructive" className="h-16 w-16 rounded-full" onClick={rejectCall}>
                  <PhoneOff className="h-8 w-8" />
                </Button>
                <Button size="icon" className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600" onClick={acceptCall}>
                  <Phone className="h-8 w-8" />
                </Button>
              </>
            ) : (
              <>
                <Button size="icon" variant={isMuted ? 'destructive' : 'secondary'} className="h-14 w-14 rounded-full" onClick={toggleMute}>
                  {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                </Button>
                {type === 'video' && (
                  <Button size="icon" variant={isVideoOff ? 'destructive' : 'secondary'} className="h-14 w-14 rounded-full" onClick={toggleVideo}>
                    {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
                  </Button>
                )}
                <Button size="icon" variant="destructive" className="h-16 w-16 rounded-full" onClick={endCall}>
                  <PhoneOff className="h-8 w-8" />
                </Button>
              </>
            )}
          </div>
          
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
