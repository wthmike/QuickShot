
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Photo } from '../types';
import { processImageNatural } from '../services/geminiService';
import { uploadPost } from '../services/socialService';
import { ArrowLeft, Loader2, PenLine, EyeOff, X, UploadCloud } from 'lucide-react';

interface PhotoDetailProps {
  photo: Photo;
  onBack: () => void;
  onUpdatePhoto: (photo: Photo) => void;
  onDelete: (id: string) => void;
  onPostComplete: () => void;
}

export const PhotoDetail: React.FC<PhotoDetailProps> = ({ photo, onBack, onUpdatePhoto, onDelete, onPostComplete }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDevelopModal, setShowDevelopModal] = useState(false);
  const [captionText, setCaptionText] = useState(photo.caption || '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (photo.caption) setCaptionText(photo.caption);
  }, [photo.id]);

  // Deterministic random position for the preview zoom (Latent Image style)
  // We NOW apply this ALWAYS to hide the real image until posting
  const previewFocusStyle = useMemo(() => {
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
        transform: 'scale(6)', // High zoom to abstract the image
        transformOrigin: origins[seed],
        filter: 'grayscale(100%) contrast(140%) brightness(0.9)',
    };
  }, [photo.id]);

  const initiateDevelop = () => {
    setShowDevelopModal(true);
    setError(null);
  };

  const handleDevelopAndPost = async () => {
    // Close modal
    setShowDevelopModal(false);
    setIsProcessing(true);
    setError(null);
    
    // Defer processing to let UI update to loading state
    requestAnimationFrame(() => {
        setTimeout(async () => {
            try {
                // 1. Process the image (Heavy GPU work)
                const result = await processImageNatural(photo.originalUrl, captionText);
                
                // 2. Update local state
                const updatedPhoto = {
                  ...photo,
                  caption: captionText,
                  processedUrl: result.combinedUrl,
                  processedFrames: result.frames,
                  status: 'completed' as const
                };
                onUpdatePhoto(updatedPhoto);

                // 3. Upload to Feed (Social)
                await uploadPost(updatedPhoto);
                
                // 4. Redirect to Feed to see the result
                onPostComplete();

              } catch (e) {
                console.error(e);
                setError("Development failed. Please try again.");
                setIsProcessing(false);
              }
        }, 100);
    });
  };

  const activeImage = photo.originalUrl;
  const dateStr = new Date(photo.timestamp).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '.');
  const timeStr = new Date(photo.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

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
      <div className="flex-1 relative flex flex-col items-center justify-center overflow-hidden bg-[#111]">
        
        {/* Error Notification */}
        {error && (
            <div className="absolute top-4 z-50 px-4 py-2 bg-red-900/90 border border-red-500 text-red-100 text-[10px] uppercase tracking-widest">
                {error}
            </div>
        )}

        <div className="w-full max-w-2xl flex flex-col items-center py-8 px-4">
            
            {/* The Image Container */}
            <div className="relative w-full shadow-2xl overflow-hidden aspect-[3/4] bg-neutral-900 border border-neutral-800">
                {isProcessing ? (
                    <div className="absolute inset-0 z-20 bg-[#0a0a0a] flex flex-col items-center justify-center gap-4 animate-pulse">
                        <Loader2 className="animate-spin text-white" size={32} />
                        <span className="text-xs uppercase tracking-[0.2em] text-neutral-400">Developing & Posting...</span>
                    </div>
                ) : (
                    <>  
                        {/* Abstract Latent Image (Always Visible) */}
                        <img 
                            src={activeImage} 
                            alt="Latent Capture" 
                            className="w-full h-full object-cover transition-all duration-700 opacity-60"
                            style={previewFocusStyle}
                        />
                        
                        {/* Overlay Information */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-black/50 backdrop-blur-sm border border-white/20 px-8 py-6 flex flex-col items-center gap-3">
                                <EyeOff className="text-white/80" size={24} />
                                <span className="text-[10px] uppercase tracking-[0.3em] text-white/90">Latent Image</span>
                                <span className="text-[9px] uppercase tracking-widest text-neutral-400">Develop to Reveal</span>
                        </div>
                        </div>
                    </>
                )}
            </div>
        </div>
      </div>

      {/* Information Strip */}
      <div className="px-6 py-4 flex items-center justify-between border-t border-neutral-900 bg-[#050505]">
        <div>
            <div className="text-[9px] uppercase tracking-[0.2em] text-neutral-500 mb-1">Status</div>
            <div className="text-xs uppercase tracking-widest font-bold text-neutral-400">
                Undeveloped Negative
            </div>
        </div>
        <div>
            <div className="text-[9px] uppercase tracking-[0.2em] text-neutral-500 mb-1">Stock</div>
            <div className="text-xs uppercase tracking-widest font-bold text-white">
                RAW
            </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="grid grid-cols-2 border-t border-neutral-800 bg-[#050505]">
          <button
            onClick={initiateDevelop}
            disabled={isProcessing}
            className="h-20 border-r border-neutral-800 flex flex-col items-center justify-center gap-1 hover:bg-white hover:text-black transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-white"
          >
             {isProcessing ? <Loader2 className="animate-spin" /> : <UploadCloud size={20} />}
             <span className="text-sm font-bold uppercase tracking-widest">
                Develop & Post
             </span>
             {!isProcessing && <span className="text-[9px] tracking-wider opacity-60">COMMIT TO FEED</span>}
          </button>

        <button 
            onClick={() => onDelete(photo.id)} 
            disabled={isProcessing}
            className="h-20 flex flex-col items-center justify-center gap-1 hover:bg-red-600 transition-colors disabled:opacity-50"
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
                    <span className="text-[9px] uppercase tracking-[0.2em]">Add a caption</span>
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
                    onClick={handleDevelopAndPost}
                    className="w-full h-14 bg-white text-black font-bold uppercase tracking-widest text-sm hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2"
                >
                    Confirm & Post
                </button>
           </div>
        </div>
      )}
    </div>
  );
};
