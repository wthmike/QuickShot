import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Photo } from '../types';
import { processImageNatural } from '../services/geminiService';
import { ArrowLeft, Loader2, PenLine, EyeOff, X, RefreshCw } from 'lucide-react';

interface PhotoDetailProps {
  photo: Photo;
  onBack: () => void;
  onUpdatePhoto: (photo: Photo) => void;
  onDelete: (id: string) => void;
}

export const PhotoDetail: React.FC<PhotoDetailProps> = ({ photo, onBack, onUpdatePhoto, onDelete }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [showDevelopModal, setShowDevelopModal] = useState(false);
  const [captionText, setCaptionText] = useState(photo.caption || '');
  const [error, setError] = useState<string | null>(null);

  // Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (photo.caption) setCaptionText(photo.caption);
  }, [photo.id]);

  // Handle Loop Playback
  useEffect(() => {
    // If developed, use processed frames. If raw (shouldn't really play, but fallback), use raw frames.
    const framesToPlay = photo.processedFrames || photo.frames;

    if (isPlaying && framesToPlay && framesToPlay.length > 0) {
        intervalRef.current = window.setInterval(() => {
            setCurrentFrameIndex(prev => (prev + 1) % (framesToPlay.length));
        }, 120); // 120ms per frame ~ 8fps
    } else {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setCurrentFrameIndex(0);
    }
    return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, photo.frames, photo.processedFrames]);

  // Deterministic random position for the preview zoom
  const previewFocusStyle = useMemo(() => {
    if (photo.processedUrl) return {};
    
    // Hash ID to get 0-3
    let hash = 0;
    for (let i = 0; i < photo.id.length; i++) {
        hash = ((hash << 5) - hash) + photo.id.charCodeAt(i);
        hash |= 0;
    }
    const seed = Math.abs(hash) % 4;

    const origins = [
        '25% 30%', 
        '75% 30%', 
        '25% 60%', 
        '75% 60%' 
    ];

    return {
        transform: 'scale(6)', // Increased zoom from 3 to 6
        transformOrigin: origins[seed],
        filter: 'grayscale(100%) contrast(140%) brightness(0.9)',
    };
  }, [photo.id, photo.processedUrl]);

  const initiateDevelop = () => {
    setShowDevelopModal(true);
    setError(null);
  };

  const handleProcess = async () => {
    if (photo.processedUrl) return;
    
    // Close modal
    setShowDevelopModal(false);
    setIsProcessing(true);
    setError(null);
    
    // Save caption
    onUpdatePhoto({ ...photo, caption: captionText });

    // Defer processing to let UI update
    requestAnimationFrame(() => {
        setTimeout(async () => {
            try {
                const result = await processImageNatural(photo.originalUrl, captionText);
                onUpdatePhoto({
                  ...photo,
                  caption: captionText,
                  processedUrl: result.combinedUrl,
                  processedFrames: result.frames, // Save individual processed frames
                  status: 'completed'
                });
              } catch (e) {
                console.error(e);
                setError("Processing failed. Please try again.");
              } finally {
                setIsProcessing(false);
              }
        }, 100);
    });
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = showOriginal ? photo.originalUrl : (photo.processedUrl || photo.originalUrl);
    link.download = `HC_${photo.timestamp}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const togglePlayback = () => {
      // Only allow playback if developed and we have frames
      if (photo.processedUrl && (photo.processedFrames || photo.frames)) {
          setIsPlaying(!isPlaying);
      }
  };

  const activeImage = showOriginal ? photo.originalUrl : (photo.processedUrl || photo.originalUrl);
  
  // Determine which frame to show during playback
  const playbackImage = (photo.processedFrames && photo.processedFrames.length > 0) 
      ? photo.processedFrames[currentFrameIndex] 
      : (photo.frames && photo.frames.length > 0 ? photo.frames[currentFrameIndex] : null);

  const dateStr = new Date(photo.timestamp).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '.');
  const timeStr = new Date(photo.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  // CSS for positioning the playback overlay over the 2x2 grid on the poster
  // Based on geminiService layout logic: Ratio 2.24
  const overlayStyle: React.CSSProperties = {
      position: 'absolute',
      left: '0',
      top: '0',
      marginLeft: '4.46%',    // 0.1 / 2.24
      marginTop: '13.39%',    // 0.3 / 2.24 (Margin top % is relative to width)
      width: '91.07%',        // 2.04 / 2.24
      aspectRatio: '1/1',
      pointerEvents: 'none'
  };

  return (
    <div className="h-full w-full bg-[#050505] flex flex-col text-white relative">
      
      {/* Header Info */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-neutral-900 z-10 bg-[#050505]">
        <button onClick={onBack} className="text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 hover:text-neutral-400">
          <ArrowLeft size={14} /> Back
        </button>
        <span className="text-[10px] tracking-[0.2em] font-mono text-neutral-500">
          {dateStr} — {timeStr}
        </span>
      </div>

      {/* Main Image Stage */}
      <div className="flex-1 relative flex flex-col items-center overflow-y-auto bg-[#111]">
        
        {/* Error Notification */}
        {error && (
            <div className="absolute top-4 z-50 px-4 py-2 bg-red-900/90 border border-red-500 text-red-100 text-[10px] uppercase tracking-widest">
                {error}
            </div>
        )}

        <div className="w-full max-w-2xl flex flex-col items-center py-8 px-4">
            
            {/* The Image Container */}
            <div 
                className={`relative w-full shadow-2xl ${!photo.processedUrl ? 'overflow-hidden aspect-[3/4] bg-neutral-900' : 'cursor-pointer'}`}
                onClick={togglePlayback}
            >
                {isProcessing ? (
                    <div className="aspect-[3/4] w-full bg-[#0a0a0a] flex flex-col items-center justify-center gap-4 animate-pulse border border-neutral-800">
                        <Loader2 className="animate-spin text-white" size={32} />
                        <span className="text-xs uppercase tracking-[0.2em] text-neutral-400">Developing Negative...</span>
                    </div>
                ) : (
                    <>  
                        {/* Base Poster (Always Visible) */}
                        <img 
                            src={activeImage} 
                            alt="Capture" 
                            className={`w-full h-auto block bg-[#0a0a0a] transition-all duration-700 ${!photo.processedUrl ? 'object-cover w-full h-full' : 'object-contain'}`}
                            style={!photo.processedUrl ? previewFocusStyle : {}}
                        />

                        {/* GIF Playback Overlay */}
                        {isPlaying && playbackImage && photo.processedUrl && (
                            <div style={overlayStyle} className="z-10 bg-black">
                                <img 
                                    src={playbackImage} 
                                    alt="Playback Frame"
                                    className="w-full h-full object-cover"
                                />
                                {/* Minimal Active Indicator */}
                                <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_red]" />
                            </div>
                        )}
                        
                        {/* Playback Hint (if available and not playing) */}
                        {!isPlaying && photo.processedUrl && (photo.processedFrames || photo.frames) && (
                            <div className="absolute top-[15%] right-[6%] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                <div className="bg-black/40 backdrop-blur-sm p-2 rounded-full">
                                    <RefreshCw size={12} className="text-white/80" />
                                </div>
                            </div>
                        )}
                        
                        {/* Latent Image Label */}
                        {!photo.processedUrl && (
                             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="bg-black/50 backdrop-blur-sm border border-white/20 px-6 py-4 flex flex-col items-center gap-2">
                                     <EyeOff className="text-white/80" size={20} />
                                     <span className="text-[10px] uppercase tracking-[0.3em] text-white/90">Latent Image</span>
                                     <span className="text-[9px] uppercase tracking-widest text-neutral-400">Develop to reveal</span>
                                </div>
                             </div>
                        )}

                        {/* Compare Tooltip */}
                        {photo.processedUrl && !showOriginal && !isPlaying && (
                        <button 
                            className="absolute bottom-4 right-4 text-[9px] uppercase tracking-[0.2em] bg-black/80 backdrop-blur border border-white/10 px-3 py-2 hover:bg-white hover:text-black transition-colors z-20"
                            onMouseDown={(e) => { e.stopPropagation(); setShowOriginal(true); }}
                            onMouseUp={(e) => { e.stopPropagation(); setShowOriginal(false); }}
                            onTouchStart={(e) => { e.stopPropagation(); setShowOriginal(true); }}
                            onTouchEnd={(e) => { e.stopPropagation(); setShowOriginal(false); }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            View Negative
                        </button>
                        )}
                    </>
                )}
            </div>
        </div>
      </div>

      {/* Information Strip */}
      <div className="px-6 py-4 flex items-center justify-between border-t border-neutral-900 bg-[#050505]">
        <div>
            <div className="text-[9px] uppercase tracking-[0.2em] text-neutral-500 mb-1">Process</div>
            <div className={`text-xs uppercase tracking-widest font-bold ${photo.processedUrl ? 'text-white' : 'text-neutral-400'}`}>
                {photo.processedUrl ? 'C-41 + Typeset' : 'Unexposed'}
            </div>
        </div>
        <div>
            <div className="text-[9px] uppercase tracking-[0.2em] text-neutral-500 mb-1">Stock</div>
            <div className="text-xs uppercase tracking-widest font-bold text-white">
                {photo.processedUrl ? 'HC 400' : 'RAW'}
            </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="grid grid-cols-2 border-t border-neutral-800 bg-[#050505]">
        {!photo.processedUrl ? (
          <button
            onClick={initiateDevelop}
            disabled={isProcessing}
            className="h-20 border-r border-neutral-800 flex flex-col items-center justify-center gap-1 hover:bg-white hover:text-black transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-white"
          >
             <span className="text-sm font-bold uppercase tracking-widest">
                Develop Film
             </span>
             {!isProcessing && <span className="text-[9px] tracking-wider opacity-60">BAKE & PROCESS</span>}
          </button>
        ) : (
            <button
            onClick={handleDownload}
            className="h-20 border-r border-neutral-800 flex flex-col items-center justify-center gap-1 hover:bg-white hover:text-black transition-colors"
          >
             <span className="text-sm font-bold uppercase tracking-widest">Print</span>
             <span className="text-[9px] tracking-wider opacity-60">SAVE TO ROLL</span>
          </button>
        )}

        <button 
            onClick={() => onDelete(photo.id)} 
            className="h-20 flex flex-col items-center justify-center gap-1 hover:bg-red-600 transition-colors"
        >
          <span className="text-sm font-bold uppercase tracking-widest">Discard</span>
          <span className="text-[9px] tracking-wider opacity-60">BURN NEGATIVE</span>
        </button>
      </div>

      {/* In-App Develop Modal Overlay */}
      {showDevelopModal && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-end animate-in fade-in duration-200">
           <div className="w-full bg-[#0a0a0a] border-t border-neutral-800 p-6 shadow-2xl slide-in-from-bottom-full duration-300">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-white">Field Notes</h3>
                    <button onClick={() => setShowDevelopModal(false)} className="text-neutral-500 hover:text-white">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="flex items-center gap-2 mb-2 text-neutral-500">
                    <PenLine size={12} />
                    <span className="text-[9px] uppercase tracking-[0.2em]">Add a caption (Optional)</span>
                </div>
                
                <textarea 
                    value={captionText}
                    onChange={(e) => setCaptionText(e.target.value)}
                    placeholder="Write something about this moment..."
                    className="w-full bg-neutral-900/50 p-4 text-lg font-light text-white placeholder-neutral-600 border border-neutral-800 focus:border-neutral-600 outline-none rounded-none resize-none min-h-[120px] mb-6"
                    maxLength={280}
                    autoFocus
                />

                <button 
                    onClick={handleProcess}
                    className="w-full h-14 bg-white text-black font-bold uppercase tracking-widest text-sm hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2"
                >
                    {captionText.trim() ? 'Imprint & Develop' : 'Develop Without Note'}
                </button>
           </div>
        </div>
      )}
    </div>
  );
};