
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Photo, User, FilterType } from '../types';
import { processImageNatural, createPoster, createMotionPoster } from '../services/geminiService';
import { ArrowLeft, Loader2, Download, Share2, Trash2, Play, Grid, Film } from 'lucide-react';

interface PhotoDetailProps {
  photo: Photo;
  onBack: () => void;
  onUpdatePhoto: (photo: Photo) => void;
  onDelete: (id: string) => void;
  currentUser?: User;
}

export const PhotoDetail: React.FC<PhotoDetailProps> = ({ photo, onBack, onUpdatePhoto, onDelete, currentUser }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingMotion, setIsGeneratingMotion] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // GIF Playback State
  const [isGifMode, setIsGifMode] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const animationIntervalRef = useRef<number | null>(null);

  // Auto-Develop on mount if status is pending
  useEffect(() => {
    if (photo.status === 'pending' && !photo.processedUrl) {
        developPhoto();
    }
  }, [photo.id]);

  // Handle GIF Animation
  useEffect(() => {
    if (isGifMode && photo.processedFrames && photo.processedFrames.length > 0) {
        animationIntervalRef.current = window.setInterval(() => {
            setCurrentFrameIndex(prev => (prev + 1) % (photo.processedFrames?.length || 4));
        }, 150); // Speed of GIF
    } else {
        if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);
        setCurrentFrameIndex(0);
    }
    return () => {
        if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);
    };
  }, [isGifMode, photo.processedFrames]);

  const getFilterDisplayName = (f?: FilterType) => {
      switch(f) {
          case 'HIPPO_400': return 'HIPPO 400';
          case 'HIPPO_800': return 'HIPPO 800';
          case 'WILLIAM_400': return 'WILLIAM 400';
          case 'WILLIAM_H': return 'WILLIAM H';
          default: return 'STANDARD';
      }
  };

  const developPhoto = async () => {
    setIsProcessing(true);
    try {
        // 1. Process Image (Filters + Quadrants)
        await new Promise(r => setTimeout(r, 800)); 
        const result = await processImageNatural(photo.originalUrl, photo.filter);
        
        // 2. Create Poster
        const dateStr = new Date(photo.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        
        const posterUrl = await createPoster(
            result.combinedUrl, 
            photo.locationName || 'UNKNOWN', 
            dateStr, 
            getFilterDisplayName(photo.filter),
            photo.coordinates || ''
        );

        const updatedPhoto: Photo = {
            ...photo,
            processedUrl: result.combinedUrl, // This is the filtered grid
            posterUrl: posterUrl,
            processedFrames: result.frames, // Filtered individual frames
            status: 'completed'
        };
        onUpdatePhoto(updatedPhoto);
    } catch (e) {
        console.error(e);
        setError("Development Failed");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDownload = async (url: string, prefix: string) => {
    try {
        const link = document.createElement('a');
        link.href = url;
        link.download = `${prefix}_${photo.id}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (e) {
        alert("Failed to save.");
    }
  };

  const handleDownloadMotion = async () => {
      if (!photo.posterUrl || !photo.processedFrames) return;
      setIsGeneratingMotion(true);
      try {
          const blob = await createMotionPoster(photo.posterUrl, photo.processedFrames);
          const url = URL.createObjectURL(blob);
          
          const link = document.createElement('a');
          link.href = url;
          link.download = `MOTION_${photo.id}.webm`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (e) {
          console.error(e);
          alert("Failed to create motion poster");
      } finally {
          setIsGeneratingMotion(false);
      }
  };

  const toggleViewMode = () => {
      if (photo.status === 'completed') {
        setIsGifMode(!isGifMode);
      }
  };

  return (
    <div className="h-full w-full bg-[#050505] flex flex-col text-white font-mono relative">
      
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-neutral-900 bg-[#050505] z-10">
        <button onClick={onBack} className="text-xs uppercase tracking-widest flex items-center gap-2 hover:text-neutral-400">
          <ArrowLeft size={14} /> Library
        </button>
        <span className="text-[10px] tracking-widest text-neutral-600">
           {photo.status === 'completed' ? 'DEVELOPED' : 'PROCESSING'}
        </span>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto bg-[#0a0a0a] flex items-center justify-center p-6">
         {photo.status === 'completed' && photo.posterUrl ? (
             <div 
                onClick={toggleViewMode}
                className="relative w-full max-w-md shadow-2xl cursor-pointer group transition-transform active:scale-[0.99]"
             >
                 {/* 
                     LIVE POSTER IMPLEMENTATION: 
                     Width: 2400. Height: 3600.
                     Margin: 140. Image Y: 960. Image Size: 2120.
                     
                     Left% = 140 / 2400 = 5.833%
                     Top% = 960 / 3600 = 26.666%
                     Width% = 2120 / 2400 = 88.333%
                 */}
                 <div className="relative">
                    {/* Base Poster (Background) */}
                    <img src={photo.posterUrl} className="w-full h-auto" alt="Developed Poster" />
                    
                    {/* Overlay for Animation */}
                    {isGifMode && photo.processedFrames && (
                        <div 
                            className="absolute z-10 overflow-hidden"
                            style={{
                                left: '5.833%',
                                top: '26.666%',
                                width: '88.333%',
                                aspectRatio: '1/1',
                            }}
                        >
                             <img 
                                src={photo.processedFrames[currentFrameIndex]} 
                                className="w-full h-full object-cover" 
                                alt="Live Frame"
                             />
                        </div>
                    )}

                    {/* Status Badge */}
                    <div className="absolute top-4 right-4 z-20">
                         {isGifMode ? (
                             <div className="bg-red-600 text-white text-[9px] px-2 py-1 font-bold tracking-widest uppercase rounded-sm animate-pulse shadow-lg">
                                 Live
                             </div>
                         ) : (
                             <div className="bg-black/50 backdrop-blur text-white text-[9px] px-2 py-1 font-bold tracking-widest uppercase rounded-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                 Play
                             </div>
                         )}
                    </div>
                 </div>
             </div>
         ) : (
             // PROCESSING STATE
             <div className="w-full max-w-sm aspect-[3/4] bg-black relative overflow-hidden border border-neutral-800 shadow-2xl flex flex-col items-center justify-center">
                 <div className="absolute inset-0 opacity-30">
                     <img src={photo.originalUrl} className="w-full h-full object-cover grayscale blur-sm" />
                 </div>
                 <div className="z-10 flex flex-col items-center gap-4">
                    {isProcessing ? (
                        <>
                            <Loader2 className="animate-spin text-white" size={32} />
                            <span className="text-xs uppercase tracking-widest animate-pulse">Developing...</span>
                        </>
                    ) : (
                        <span className="text-xs uppercase tracking-widest text-red-500">Error</span>
                    )}
                 </div>
             </div>
         )}
      </div>

      {/* Actions Toolbar */}
      <div className="p-6 border-t border-neutral-900 bg-[#050505] flex flex-col gap-4">
          {photo.status === 'completed' ? (
              <div className="flex flex-col gap-3">
                  
                  {/* Primary Actions Grid */}
                  <div className="flex gap-3">
                    <button 
                        onClick={() => photo.posterUrl && handleDownload(photo.posterUrl, 'POSTER')}
                        className="flex-[2] h-12 bg-white text-black font-bold uppercase tracking-widest text-xs hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2"
                    >
                        <Download size={14} /> Poster
                    </button>
                    <button 
                        onClick={handleDownloadMotion}
                        disabled={isGeneratingMotion}
                        className="flex-[2] h-12 bg-neutral-900 text-white font-bold uppercase tracking-widest text-xs hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 border border-neutral-800"
                    >
                        {isGeneratingMotion ? <Loader2 size={14} className="animate-spin"/> : <Film size={14} />} 
                        Motion
                    </button>
                  </div>

                  {/* Secondary Options */}
                  <div className="flex gap-3">
                      <button 
                        onClick={() => photo.processedUrl && handleDownload(photo.processedUrl, 'GRID')}
                        className="flex-1 h-12 bg-neutral-900 text-neutral-400 font-bold uppercase tracking-widest text-xs hover:text-white hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 border border-neutral-800"
                      >
                          <Grid size={14} /> Grid
                      </button>
                      
                      <button 
                        onClick={() => { if(window.confirm('Delete this photo?')) onDelete(photo.id); }}
                        className="w-12 h-12 bg-neutral-900 text-red-900 hover:text-red-500 border border-neutral-800 flex items-center justify-center transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                  </div>
                  
                  <p className="text-[9px] text-neutral-600 text-center uppercase tracking-widest mt-2">
                      Tap image to {isGifMode ? 'pause' : 'preview'}
                  </p>
              </div>
          ) : (
              <div className="h-12 flex items-center justify-center text-neutral-600 text-xs uppercase tracking-widest">
                  Processing...
              </div>
          )}
      </div>
    </div>
  );
};
