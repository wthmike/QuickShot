import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Photo } from '../types';
import { stitchBurst } from '../services/geminiService';

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
  const [burstCount, setBurstCount] = useState(0); // 0 = idle, 1-4 = capturing
  const [error, setError] = useState<string | null>(null);
  
  // State for location
  const [coordsText, setCoordsText] = useState<string>("00.00°N, 00.00°W");
  const [locationName, setLocationName] = useState<string>("UNKNOWN LOCATION");

  const startCamera = useCallback(async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          // OPTIMIZATION: Request 1080p instead of 4K to save memory on mobile
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
      setError("CAMERA ACCESS DENIED");
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    
    // Fetch location and reverse geocode
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                const latDir = latitude >= 0 ? 'N' : 'S';
                const lonDir = longitude >= 0 ? 'E' : 'W';
                // Format: 34.05°N, 118.24°W
                const formattedCoords = `${Math.abs(latitude).toFixed(2)}°${latDir}, ${Math.abs(longitude).toFixed(2)}°${lonDir}`;
                setCoordsText(formattedCoords);

                // Attempt Reverse Geocoding
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`, {
                        headers: {
                            'User-Agent': 'HippoCam/1.0'
                        }
                    });
                    if (response.ok) {
                        const data = await response.json();
                        const addr = data.address;
                        // Construct "City, State" or similar
                        const city = addr.city || addr.town || addr.village || addr.hamlet || addr.suburb;
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
                    console.warn("Reverse geocode failed", e);
                    // Fallback to coords if name fails, or just keep UNKNOWN
                    // But usually we just keep "UNKNOWN LOCATION" or set it to coords
                    // Let's stick with a technical fallback
                    setLocationName("LOCATION SIGNAL LOCK");
                }
            },
            (err) => {
                console.warn("Geolocation denied or error", err);
                setCoordsText("NO SIGNAL");
                setLocationName("OFF GRID");
            },
            { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
        );
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  // Instant capture of a single frame
  const captureFrame = async (): Promise<string | null> => {
    if (!videoRef.current || !canvasRef.current) return null;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Calculate crop for Square Aspect Ratio (1:1)
    const minDim = Math.min(video.videoWidth, video.videoHeight);
    const startX = (video.videoWidth - minDim) / 2;
    const startY = (video.videoHeight - minDim) / 2;

    // OPTIMIZATION: Limit capture size to 1080px.
    // This dramatically reduces memory usage (RAM) and prevents OOM crashes on iOS/Android
    // when storing 4 consecutive burst shots + processing them.
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

    // Draw and downscale in one step
    ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, finalDim, finalDim);

    // Trigger visual flash
    const flashEl = document.getElementById('camera-flash');
    if (flashEl) {
      flashEl.style.opacity = '1';
      setTimeout(() => flashEl.style.opacity = '0', 50);
    }

    // Use slightly lower quality (0.85) to reduce base64 string size for better performance
    return canvas.toDataURL('image/jpeg', 0.85);
  };

  const takeBurst = async () => {
    if (isTakingPhoto) return;
    setIsTakingPhoto(true);

    const shots: string[] = [];
    const BURST_SIZE = 4;
    // Fast burst (approx 12fps equivalent delay) to capture movement naturally without sluggishness
    const DELAY_MS = 80; 

    try {
      for (let i = 1; i <= BURST_SIZE; i++) {
        setBurstCount(i);
        const frame = await captureFrame();
        if (frame) shots.push(frame);
        
        // Small delay between shots, but don't delay after the last one
        if (i < BURST_SIZE) {
            await new Promise(r => setTimeout(r, DELAY_MS));
        }
      }

      // Stitch
      if (shots.length === BURST_SIZE) {
         // Pass current location data to stitcher
         const stitchedUrl = await stitchBurst(shots, coordsText, locationName);
         
         const newPhoto: Photo = {
            id: crypto.randomUUID(),
            originalUrl: stitchedUrl,
            frames: shots, // Store raw frames for playback
            timestamp: Date.now(),
            status: 'pending'
          };
          onCapture(newPhoto);
      }

    } catch (e) {
        console.error("Burst failed", e);
        setError("MEM ERROR - RETRY");
    } finally {
        setIsTakingPhoto(false);
        setBurstCount(0);
    }
  };

  const currentDate = new Date().toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '.');

  return (
    <div className="relative h-full w-full bg-[#050505] flex flex-col text-white">
      {/* Header Info */}
      <div className="h-16 flex items-end justify-between px-6 pb-2 z-10">
        <div className="flex flex-col">
          <span className="text-[10px] tracking-[0.25em] font-medium text-neutral-500 uppercase">Mode</span>
          <span className="text-xs tracking-widest font-bold uppercase text-white">6x6 Format</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] tracking-[0.25em] font-medium text-neutral-500 uppercase">Date</span>
          <span className="text-xs tracking-widest font-bold uppercase text-white">{currentDate}</span>
        </div>
      </div>

      {/* Main Viewport Stage */}
      <div className="flex-1 flex flex-col items-center justify-center bg-[#080808] relative">
        
        {/* The Square Viewfinder */}
        <div className="relative w-full max-w-md aspect-square bg-black overflow-hidden shadow-2xl border-t border-b border-neutral-900">
            <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />
            
            {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
                <span className="text-xs font-mono text-red-500 tracking-widest uppercase border border-red-500 px-4 py-2">
                {error}
                </span>
            </div>
            )}

            {/* Flash Overlay */}
            <div id="camera-flash" className="absolute inset-0 bg-white opacity-0 transition-opacity duration-75 pointer-events-none mix-blend-overlay z-20" />
            
            {/* Burst Counter Overlay */}
            {burstCount > 0 && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="text-8xl font-black text-white/80 tracking-tighter mix-blend-difference">
                        {burstCount}
                    </div>
                </div>
            )}

            {/* Square Grid Lines (Rule of Thirds) */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
                <div className="absolute top-1/3 left-0 w-full h-[1px] bg-white"></div>
                <div className="absolute top-2/3 left-0 w-full h-[1px] bg-white"></div>
                <div className="absolute left-1/3 top-0 h-full w-[1px] bg-white"></div>
                <div className="absolute left-2/3 top-0 h-full w-[1px] bg-white"></div>
            </div>
            
             {/* Center Crosshair */}
             <div className="absolute top-1/2 left-1/2 w-4 h-[1px] bg-red-500/50 -translate-x-1/2 -translate-y-1/2"></div>
             <div className="absolute top-1/2 left-1/2 h-4 w-[1px] bg-red-500/50 -translate-x-1/2 -translate-y-1/2"></div>
        </div>

      </div>

      {/* Controls */}
      <div className="h-32 px-8 flex items-center justify-between bg-[#050505]">
        {/* Gallery */}
        <button 
          onClick={onOpenGallery}
          className="w-16 flex flex-col items-center justify-center gap-2 group"
        >
           {lastPhotoThumbnail ? (
            <div className="w-10 h-10 border border-neutral-700 p-[1px] overflow-hidden">
              <img src={lastPhotoThumbnail} alt="Archive" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300" />
            </div>
           ) : (
            <div className="w-10 h-10 border border-neutral-700 bg-neutral-900" />
           )}
           <span className="text-[9px] uppercase tracking-[0.2em] text-neutral-500 group-hover:text-white transition-colors">Index</span>
        </button>

        {/* Shutter */}
        <button
          onClick={takeBurst}
          disabled={isTakingPhoto}
          className="relative group active:scale-95 transition-transform duration-100 disabled:opacity-50 disabled:active:scale-100"
        >
          {/* Outer Ring */}
          <div className="w-20 h-20 rounded-full border border-neutral-600 flex items-center justify-center bg-neutral-900">
             {/* Inner Circle */}
             <div className="w-16 h-16 rounded-full bg-[#e5e5e5] transition-colors group-active:bg-white flex items-center justify-center shadow-inner">
                {isTakingPhoto && <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
             </div>
          </div>
        </button>

        {/* Flip */}
        <button
          onClick={toggleCamera}
          className="w-16 flex flex-col items-center justify-center gap-2 group"
        >
          <div className="w-10 h-10 border border-neutral-700 flex items-center justify-center text-neutral-300">
             <span className="text-xs font-bold">2X</span>
          </div>
          <span className="text-[9px] uppercase tracking-[0.2em] text-neutral-500 group-hover:text-white transition-colors">Flip</span>
        </button>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};