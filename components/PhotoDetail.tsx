
import React, { useState, useEffect, useMemo } from 'react';
import { Photo, User } from '../types';
import { processImageNatural } from '../services/geminiService';
import { uploadPost } from '../services/socialService';
import { ArrowLeft, Loader2, ArrowRight, Eye } from 'lucide-react';

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
  const [isPublishing, setIsPublishing] = useState(false);
  const [captionText, setCaptionText] = useState(photo.caption || '');
  const [error, setError] = useState<string | null>(null);

  // Auto-Develop on mount if status is pending
  useEffect(() => {
    if (photo.status === 'pending' && !photo.processedUrl) {
        developPhoto();
    }
  }, [photo.id]);

  useEffect(() => {
    if (photo.caption) setCaptionText(photo.caption);
  }, [photo.id]);

  const developPhoto = async () => {
    setIsProcessing(true);
    try {
        // Wait time for "development" feeling
        await new Promise(r => setTimeout(r, 2500));
        
        // Pass the filter selected at capture
        const result = await processImageNatural(photo.originalUrl, photo.filter);
        const updatedPhoto = {
            ...photo,
            processedUrl: result.combinedUrl,
            processedFrames: result.frames,
            status: 'completed' as const
        };
        onUpdatePhoto(updatedPhoto);
    } catch (e) {
        console.error(e);
        setError("Development Failed");
    } finally {
        setIsProcessing(false);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
        const updatedPhoto = { ...photo, caption: captionText };
        onUpdatePhoto(updatedPhoto);
        await uploadPost(updatedPhoto, currentUser);
        onPostComplete();
    } catch (e) {
        setError("Upload Failed");
        setIsPublishing(false);
    }
  };

  // Determine if we should show the full image or the mystery crop.
  // We will use the mystery style for the main view.
  
  const mysteryStyle = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < photo.id.length; i++) {
        hash = ((hash << 5) - hash) + photo.id.charCodeAt(i);
        hash |= 0;
    }
    const seed = Math.abs(hash) % 4;
    const origins = ['25% 30%', '75% 30%', '25% 60%', '75% 60%'];

    return {
        transform: 'scale(4)', // Zoom level
        transformOrigin: origins[seed],
        filter: 'grayscale(100%) contrast(150%) brightness(0.9)',
    };
  }, [photo.id]);

  const getFilterDisplayName = (f?: string) => {
      if (f === 'HIPPO_400') return 'HIPPO 400';
      if (f === 'HIPPO_800') return 'HIPPO 800';
      if (f === 'WILLIAM_400') return 'WILLIAM 400';
      if (f === 'WILLIAM_H') return 'WILLIAM H';
      return 'STANDARD';
  };

  return (
    <div className="h-full w-full bg-[#050505] flex flex-col text-white font-mono relative">
      
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-neutral-900 bg-[#050505] z-10">
        <button onClick={onBack} className="text-xs uppercase tracking-widest flex items-center gap-2 hover:text-neutral-400">
          <ArrowLeft size={14} /> Back
        </button>
        <span className="text-[10px] tracking-widest text-neutral-600">
           FILM ROLL #{photo.id.slice(0, 4).toUpperCase()}
        </span>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        
        {error && (
            <div className="w-full bg-red-900/50 text-red-200 text-xs py-2 text-center border-b border-red-900">
                {error}
            </div>
        )}

        {/* Image Stage */}
        <div className="p-6 pb-0">
            <div className="w-full aspect-square bg-[#0a0a0a] border border-neutral-800 relative overflow-hidden shadow-2xl">
                {/* 
                   MYSTERY VIEW
                   We always show the originalUrl with mysteryStyle here to enforce "Don't see until posted".
                   The developed image (processedUrl) is ready in the background for uploading.
                */}
                <img 
                    src={photo.originalUrl} 
                    alt="Mystery Preview" 
                    className="w-full h-full object-cover transition-all duration-1000"
                    style={mysteryStyle}
                />
                
                {/* Grain Overlay */}
                <div className="absolute inset-0 bg-black/20 pointer-events-none mix-blend-overlay" />

                {/* Status Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-20 pointer-events-none">
                     {isProcessing ? (
                        <div className="bg-black/60 backdrop-blur-md px-5 py-3 rounded-full border border-white/10">
                            <span className="text-[10px] uppercase tracking-[0.2em] animate-pulse text-white font-bold flex items-center gap-3">
                                <Loader2 className="animate-spin" size={12} /> Developing {getFilterDisplayName(photo.filter)}
                            </span>
                        </div>
                     ) : (
                        <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-sm border border-white/10">
                             <span className="text-[10px] uppercase tracking-[0.2em] text-white font-bold">
                                Ready to Print
                             </span>
                        </div>
                     )}
                </div>
            </div>
            
            <div className="mt-3 flex justify-center">
                 <p className="text-[9px] text-neutral-500 uppercase tracking-widest text-center max-w-xs">
                    Full exposure will be revealed after posting.
                 </p>
            </div>
        </div>

        {/* Compose Section */}
        <div className={`px-6 py-8 flex flex-col gap-6 transition-opacity duration-1000 ${isProcessing ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            
            {/* Metadata (Coordinates/Date) */}
            <div className="flex justify-between items-start border-b border-neutral-900 pb-4">
                <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase tracking-widest text-neutral-600 font-bold">Captured</span>
                    <span className="text-xs text-white">{new Date(photo.timestamp).toLocaleDateString().toUpperCase()}</span>
                </div>
                <div className="flex flex-col gap-1 items-end">
                     <span className="text-[9px] uppercase tracking-widest text-neutral-600 font-bold">Coordinates</span>
                     <span className="text-xs text-white text-right font-mono text-[10px]">{photo.coordinates || "---"}</span>
                </div>
            </div>

            {/* Caption Input */}
            <div className="flex flex-col gap-2">
                <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Field Notes</label>
                <textarea 
                    value={captionText}
                    onChange={(e) => setCaptionText(e.target.value)}
                    placeholder="Record your observations..."
                    className="w-full bg-transparent border-none p-0 text-sm text-neutral-300 placeholder-neutral-700 focus:ring-0 outline-none resize-none font-serif leading-relaxed"
                    rows={3}
                    maxLength={280}
                />
            </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-6 border-t border-neutral-900 bg-[#050505]">
          <button
            onClick={handlePublish}
            disabled={isProcessing || isPublishing}
            className="w-full h-14 bg-white text-black font-bold uppercase tracking-[0.2em] text-xs hover:bg-neutral-200 transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
            >
            {isPublishing ? (
                <>
                    <Loader2 className="animate-spin" size={16} /> Publishing...
                </>
            ) : (
                <>
                    Post Exposure <ArrowRight size={16} />
                </>
            )}
            </button>
            
            <div className="mt-4 flex justify-center">
                 <button 
                    onClick={() => { if(window.confirm('Discard this capture?')) onDelete(photo.id); }}
                    className="text-[10px] uppercase tracking-widest text-red-900 hover:text-red-500 transition-colors"
                 >
                    Discard
                 </button>
            </div>
      </div>
    </div>
  );
};
