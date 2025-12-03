
import React, { useState, useEffect, useMemo } from 'react';
import { Photo, User } from '../types';
import { processImageNatural } from '../services/geminiService';
import { uploadPost } from '../services/socialService';
import { ArrowLeft, Loader2, X, Share, Trash2 } from 'lucide-react';

interface PhotoDetailProps {
  photo: Photo;
  onBack: () => void;
  onUpdatePhoto: (photo: Photo) => void;
  onDelete: (id: string) => void;
  onPostComplete: () => void;
  currentUser?: User;
}

export const PhotoDetail: React.FC<PhotoDetailProps> = ({ photo, onBack, onUpdatePhoto, onDelete, onPostComplete, currentUser }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDevelopModal, setShowDevelopModal] = useState(false);
  const [captionText, setCaptionText] = useState(photo.caption || '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (photo.caption) setCaptionText(photo.caption);
  }, [photo.id]);

  // Latent Image Preview Logic
  const previewFocusStyle = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < photo.id.length; i++) {
        hash = ((hash << 5) - hash) + photo.id.charCodeAt(i);
        hash |= 0;
    }
    const seed = Math.abs(hash) % 4;
    const origins = ['20% 20%', '80% 20%', '20% 80%', '80% 80%'];
    return {
        transform: 'scale(8)', 
        transformOrigin: origins[seed],
        filter: 'grayscale(100%) contrast(200%) brightness(0.5) blur(2px)',
    };
  }, [photo.id]);

  const initiateDevelop = () => {
    setShowDevelopModal(true);
    setError(null);
  };

  const handleDevelopAndPost = async () => {
    setShowDevelopModal(false);
    setIsProcessing(true);
    
    // Defer to allow UI render
    setTimeout(async () => {
        try {
            // 1. Process Image (GPU intensive)
            const result = await processImageNatural(photo.originalUrl);
            
            // 2. Update Photo Object
            const updatedPhoto = {
              ...photo,
              caption: captionText,
              processedUrl: result.combinedUrl,
              processedFrames: result.frames,
              status: 'completed' as const
            };
            onUpdatePhoto(updatedPhoto);

            // 3. Upload (User specific)
            await uploadPost(updatedPhoto, currentUser);
            
            onPostComplete();
        } catch (e) {
            console.error(e);
            setError("ERR_PROC_FAIL");
            setIsProcessing(false);
        }
    }, 100);
  };

  const activeImage = photo.originalUrl;
  const isDeveloped = !!photo.processedUrl;

  return (
    <div className="h-full w-full bg-[#050505] flex flex-col text-white font-mono relative">
      
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-neutral-900 bg-[#050505] z-10">
        <button onClick={onBack} className="text-xs uppercase tracking-widest flex items-center gap-2 hover:text-neutral-400">
          <ArrowLeft size={14} /> Back
        </button>
        <span className="text-[10px] tracking-widest text-neutral-600">
           {photo.id.slice(0, 8).toUpperCase()}
        </span>
      </div>

      {/* Main Content Scroll */}
      <div className="flex-1 overflow-y-auto">
        
        {/* Error Banner */}
        {error && (
            <div className="w-full bg-red-900/50 text-red-200 text-xs py-2 text-center border-b border-red-900">
                {error}
            </div>
        )}

        {/* Image Container - Brutalist Frame */}
        <div className="p-4">
            <div className="w-full aspect-square bg-[#0a0a0a] border border-neutral-800 relative overflow-hidden group">
                {isProcessing ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black z-20">
                        <Loader2 className="animate-spin text-white" size={32} />
                        <span className="text-[10px] uppercase tracking-widest animate-pulse text-neutral-500">Processing Film...</span>
                    </div>
                ) : (
                    <>
                        <img 
                            src={isDeveloped ? photo.processedUrl : activeImage} 
                            alt="View" 
                            className="w-full h-full object-contain"
                            style={!isDeveloped ? previewFocusStyle : {}}
                        />
                        {!isDeveloped && (
                             <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                                <span className="text-2xl md:text-4xl font-black text-white/20 uppercase -rotate-12 tracking-tighter text-center leading-none">
                                    Undeveloped<br/>Film
                                </span>
                             </div>
                        )}
                    </>
                )}
            </div>
        </div>

        {/* Data Block - Separated from Image */}
        <div className="px-6 py-2 flex flex-col gap-6">
            
            {/* Metadata Row */}
            <div className="flex justify-between items-start border-b border-neutral-900 pb-4">
                <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase tracking-widest text-neutral-600">Date</span>
                    <span className="text-xs text-white">{new Date(photo.timestamp).toLocaleDateString().toUpperCase()}</span>
                </div>
                <div className="flex flex-col gap-1 items-end">
                     <span className="text-[9px] uppercase tracking-widest text-neutral-600">Location</span>
                     <span className="text-xs text-white text-right">{photo.locationName || "UNKNOWN"}</span>
                </div>
            </div>

            {/* Caption Display (If Developed) */}
            {isDeveloped && (
                <div className="flex flex-col gap-2">
                    <span className="text-[9px] uppercase tracking-widest text-neutral-600">Caption</span>
                    <p className="text-sm font-sans leading-relaxed text-neutral-300">
                        {photo.caption || "No caption."}
                    </p>
                </div>
            )}
            
            {/* Status */}
            {!isDeveloped && (
                <div className="p-4 border border-dashed border-neutral-800 bg-neutral-900/30">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest text-center">
                        Waiting to be processed.
                    </p>
                </div>
            )}
        </div>
      </div>

      {/* Action Bar */}
      <div className="p-4 border-t border-neutral-900 bg-[#050505]">
          {!isDeveloped ? (
             <button
                onClick={initiateDevelop}
                disabled={isProcessing}
                className="w-full h-14 bg-white text-black font-bold uppercase tracking-widest text-sm hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2"
             >
                Develop & Publish
             </button>
          ) : (
             <div className="grid grid-cols-2 gap-4">
                <button 
                    disabled 
                    className="h-12 border border-neutral-800 text-neutral-600 uppercase text-xs tracking-widest flex items-center justify-center gap-2 cursor-not-allowed"
                >
                    <Share size={14} /> Published
                </button>
                <button 
                    onClick={() => onDelete(photo.id)}
                    className="h-12 border border-red-900/30 text-red-900 hover:bg-red-900/10 uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-colors"
                >
                    <Trash2 size={14} /> Delete
                </button>
             </div>
          )}
      </div>

      {/* Develop Modal */}
      {showDevelopModal && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col justify-end">
           <div className="bg-[#0a0a0a] border-t border-neutral-800 p-6 animate-in slide-in-from-bottom-10 duration-200">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xs uppercase tracking-widest text-white">Journal Entry</h3>
                    <button onClick={() => setShowDevelopModal(false)} className="text-neutral-500 hover:text-white">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="mb-6">
                    <label className="text-[9px] uppercase tracking-widest text-neutral-500 mb-2 block">Caption</label>
                    <textarea 
                        value={captionText}
                        onChange={(e) => setCaptionText(e.target.value)}
                        placeholder="Write a caption..."
                        className="w-full bg-neutral-900 border border-neutral-800 p-3 text-sm text-white focus:border-white outline-none h-32 resize-none font-sans"
                        maxLength={280}
                    />
                </div>

                <button 
                    onClick={handleDevelopAndPost}
                    className="w-full h-12 bg-white text-black font-bold uppercase tracking-widest text-xs hover:bg-neutral-200 transition-colors"
                >
                    Confirm & Publish
                </button>
           </div>
        </div>
      )}
    </div>
  );
};
