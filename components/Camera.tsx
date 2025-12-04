
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Photo, FilterType } from '../types';
import { stitchBurst } from '../services/geminiService';
import { ArrowLeft } from 'lucide-react';

interface CameraProps {
  onCapture: (photo: Photo) => void;
  onOpenGallery: () => void;
  lastPhotoThumbnail?: string;
}

export const CameraView: React.FC<CameraProps> = ({ onCapture, onOpenGallery, lastPhotoThumbnail }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [burstCount, setBurstCount] = useState(0); 
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('HIPPO_400');
  const [coordsText, setCoordsText] = useState<string>("00.00°N, 00.00°W");
  const [locationName, setLocationName] = useState<string>("LOCATING...");
  const [justCaptured, setJustCaptured] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1920 }, 
          aspectRatio: { ideal: 1 }
        },
        audio: false,
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      setError(null);
    } catch (err) {
      console.error("Camera error:", err);
      setError("NO SIGNAL");
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                const latDir = latitude >= 0 ? 'N' : 'S';
                const lonDir = longitude >= 0 ? 'E' : 'W';
                const formattedCoords = `${Math.abs(latitude).toFixed(4)}°${latDir}, ${Math.abs(longitude).toFixed(4)}°${lonDir}`;
                setCoordsText(formattedCoords);

                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`, {
                        headers: { 'User-Agent': 'HippoCam/1.0' }
                    });
                    if (response.ok) {
                        const data = await response.json();
                        const addr = data.address;
                        const city = addr.city || addr.town || addr.village || addr.suburb;
                        const state = addr.state || addr.country;
                        
                        if (city && state) {
                            setLocationName(`${city}, ${state}`.toUpperCase());
                        } else if (state) {
                            setLocationName(state.toUpperCase());
                        } else {
                            setLocationName("EARTH");
                        }
                    }
                } catch (e) {
                    setLocationName("OFFLINE");
                }
            },
            (err) => {
                setCoordsText("NO GPS");
                setLocationName("OFFLINE");
            },
            { enableHighAccuracy: true }
        );
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  // Flash effect when thumbnail updates (indicating successful save)
  useEffect(() => {
      if (lastPhotoThumbnail) {
          setJustCaptured(true);
          const t = setTimeout(() => setJustCaptured(false), 1000);
          return () => clearTimeout(t);
      }
  }, [lastPhotoThumbnail]);

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const getFilterStyle = (filter: FilterType) => {
      switch (filter) {
          case 'HIPPO_400': return 'contrast(110%) saturate(110%)';
          case 'HIPPO_800': return 'contrast(105%) sepia(20%) saturate(120%)';
          case 'WILLIAM_400': return 'grayscale(100%) contrast(100%)';
          case 'WILLIAM_H': return 'grayscale(100%) contrast(125%) brightness(110%)';
          default: return 'none';
      }
  };

  const getFilterName = (filter: FilterType) => {
      switch (filter) {
          case 'HIPPO_400': return 'HIPPO 400';
          case 'HIPPO_800': return 'HIPPO 800';
          case 'WILLIAM_400': return 'WILLIAM 400';
          case 'WILLIAM_H': return 'WILLIAM H';
          default: return filter;
      }
  };

  const captureFrame = async (): Promise<string | null> => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    const minDim = Math.min(video.videoWidth, video.videoHeight);
    const startX = (video.videoWidth - minDim) / 2;
    const startY = (video.videoHeight - minDim) / 2;
    const MAX_CAPTURE_SIZE = 1080;
    const finalDim = Math.min(minDim, MAX_CAPTURE_SIZE);

    canvas.width = finalDim;
    canvas.height = finalDim;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, finalDim, finalDim);
    return canvas.toDataURL('image/jpeg', 0.85);
  };

  const takeBurst = async () => {
    if (isTakingPhoto) return;
    setIsTakingPhoto(true);

    const shots: string[] = [];
    const BURST_SIZE = 4;
    const DELAY_MS = 100; 
    const captureFilter = activeFilter;

    try {
      for (let i = 1; i <= BURST_SIZE; i++) {
        setBurstCount(i);
        const frame = await captureFrame();
        if (frame) shots.push(frame);
        
        if (i < BURST_SIZE) {
            await new Promise(r => setTimeout(r, DELAY_MS));
        }
      }

      if (shots.length === BURST_SIZE) {
         const stitchedUrl = await stitchBurst(shots);
         const newPhoto: Photo = {
            id: crypto.randomUUID(),
            originalUrl: stitchedUrl,
            frames: shots,
            timestamp: Date.now(),
            status: 'pending',
            locationName: locationName,
            coordinates: coordsText,
            filter: captureFilter 
          };
          onCapture(newPhoto);
      }
    } catch (e) {
        console.error("Burst failed", e);
        setError("ERR");
    } finally {
        setIsTakingPhoto(false);
        setBurstCount(0);
    }
  };

  return (
    <div className="relative h-full w-full bg-[#050505] flex flex-col text-white font-mono">
      
      {/* Top HUD (Minimal) */}
      <div className="h-16 flex items-center justify-center z-10 bg-[#050505] border-b border-neutral-900">
         <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-neutral-500">
             Ready
         </span>
      </div>

      {/* Viewport */}
      <div className="flex-1 flex flex-col items-center justify-center bg-[#111] relative overflow-hidden">
        <div className="relative w-full max-w-md aspect-square bg-black overflow-hidden border-x border-neutral-800">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                style={{ filter: getFilterStyle(activeFilter) }}
            />
            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                    <span className="text-red-500 font-bold border border-red-500 px-4 py-2 text-xs tracking-widest animate-pulse">
                        {error}
                    </span>
                </div>
            )}
            <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
                <div className="flex justify-between">
                    <div className="w-4 h-4 border-l-2 border-t-2 border-white/50" />
                    <div className="w-4 h-4 border-r-2 border-t-2 border-white/50" />
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center opacity-50">
                    <div className="w-full h-[1px] bg-red-500" />
                    <div className="h-full w-[1px] bg-red-500 absolute" />
                </div>
                <div className="flex justify-between items-end">
                    <div className="w-4 h-4 border-l-2 border-b-2 border-white/50" />
                    <div className="text-[9px] text-white/70 tracking-widest">{coordsText}</div>
                    <div className="w-4 h-4 border-r-2 border-b-2 border-white/50" />
                </div>
            </div>
            {burstCount > 0 && (
                <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/20 backdrop-blur-sm">
                    <div className="text-9xl font-black text-white italic tracking-tighter">
                        {burstCount}
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Control Deck */}
      <div className="h-44 bg-[#050505] border-t border-neutral-900 px-6 pb-6 pt-2 flex flex-col gap-4">
         <div className="flex justify-between w-full max-w-sm mx-auto pt-2 gap-1">
             {(['HIPPO_400', 'HIPPO_800', 'WILLIAM_400', 'WILLIAM_H'] as FilterType[]).map(f => (
                 <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    className={`flex-1 text-[9px] uppercase tracking-widest transition-all px-1 py-2 text-center truncate ${activeFilter === f ? 'text-white border-b border-white font-bold' : 'text-neutral-600 hover:text-neutral-400'}`}
                 >
                    {getFilterName(f)}
                 </button>
             ))}
         </div>

         <div className="flex items-center justify-between mt-2">
            <button 
                onClick={onOpenGallery} 
                className={`w-12 h-12 flex items-center justify-center border transition-all duration-300 bg-neutral-900 ${justCaptured ? 'border-white bg-neutral-800 scale-110' : 'border-neutral-800 hover:border-neutral-600'}`}
            >
                {lastPhotoThumbnail ? (
                    <img src={lastPhotoThumbnail} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-2 h-2 bg-neutral-700 rounded-full" />
                )}
            </button>
            <button
                onClick={takeBurst}
                disabled={isTakingPhoto}
                className="w-20 h-20 rounded-full border-2 border-neutral-700 flex items-center justify-center group active:scale-95 transition-transform"
            >
                <div className={`w-16 h-16 rounded-full transition-colors ${isTakingPhoto ? 'bg-red-600' : 'bg-white group-hover:bg-neutral-200'}`} />
            </button>
            <button onClick={toggleCamera} className="w-12 h-12 flex items-center justify-center border border-neutral-800 hover:border-neutral-600 transition-colors text-xs font-bold text-neutral-400 hover:text-white">
                FLIP
            </button>
         </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
