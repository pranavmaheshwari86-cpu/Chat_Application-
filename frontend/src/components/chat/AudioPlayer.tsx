import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AudioPlayerProps {
  src: string;
}

const WAVEFORM_HEIGHTS = [20, 40, 60, 30, 80, 100, 70, 50, 90, 40, 30, 70, 100, 60, 40, 80, 50, 30, 60, 90, 70, 40, 50, 80, 100, 60, 40, 30, 70, 50];

export default function AudioPlayer({ src }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
        setCurrentTime(audio.currentTime);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(console.error);
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    const bounds = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - bounds.left;
    const percentage = x / bounds.width;
    audioRef.current.currentTime = percentage * audioRef.current.duration;
    setProgress(percentage * 100);
    setCurrentTime(audioRef.current.currentTime);
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return '0:00';
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 w-[260px] bg-black/20 rounded-full py-2 px-3 my-1">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button 
        onClick={togglePlayPause} 
        className="w-8 h-8 shrink-0 flex items-center justify-center bg-white/10 rounded-full hover:bg-white/20 transition-colors"
      >
        {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 ml-0.5 fill-current" />}
      </button>
      
      <div className="flex-1 flex flex-col justify-center cursor-pointer h-full" onClick={handleSeek}>
        <div className="flex items-center h-5 gap-[2px] w-full">
          {WAVEFORM_HEIGHTS.map((height, i) => (
            <div 
              key={i} 
              className={cn(
                "flex-1 rounded-full transition-colors",
                (i / WAVEFORM_HEIGHTS.length) * 100 <= progress ? "bg-[#E2B859]" : "bg-white/20"
              )}
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      </div>
      
      <span className="text-[10px] font-mono opacity-70 w-8 text-right shrink-0">
        {formatTime(currentTime)}
      </span>
    </div>
  );
}
