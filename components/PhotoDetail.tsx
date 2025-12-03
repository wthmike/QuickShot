
import React, { useState, useEffect, useMemo } from 'react';
import { Photo, User } from '../types';
import { processImageNatural } from '../services/geminiService';
import { uploadPost } from '../services/socialService';
import { ArrowLeft, Loader2, X, Share, Trash2, CheckCircle2, ArrowRight } from 'lucide-react';

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
        // Yield to UI thread to render loading state
        await new Promise(r => setTimeout(r, 100));
        
        const result = await processImageNatural(photo.originalUrl);
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

  const isDeveloped = !!photo.processedUrl;
  const displayImage = isDeveloped ? photo.processedUrl : photo.originalUrl;

  return (
    <div className="h-full w-full bg-[#050505] flex flex-col text-white font-mono relative">
      
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-neutral-900 bg-[#050505] z-10">
        <button onClick={onBack} className="text-xs uppercase tracking-widest flex items-center gap-2 hover:text-neutral-400">
          <ArrowLeft size={14} /> Back
        </button>
        <span className="text-[10px] tracking-widest text-neutral-600">
           #{photo.id.slice(0, 4).toUpperCase()}
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
                {/* The Image */}
                <img 
                    src={displayImage} 
                    alt="View" 
                    className={`w-full h-full object-contain transition-all duration-1000 ${isProcessing ? 'blur-md scale-105 opacity-50' : 'blur-0 scale-100 opacity-100'}`}
                />

                {/* Processing Overlay */}
                {isProcessing && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-20">
                        <Loader2 className="animate-spin text-white" size={32} />
                        <span className="text-[10px] uppercase tracking-[0.2em] animate-pulse text-white font-bold">
                            Developing...
                        </span>
                    </div>
                )}
            </div>
        </div>

        {/* Compose Section */}
        <div className="px-6 py-8 flex flex-col gap-6">
            
            {/* Metadata (Coordinates/Date) */}
            <div className="flex justify-between items-start border-b border-neutral-900 pb-4">
                <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase tracking-widest text-neutral-600 font-bold">When</span>
                    <span className="text-xs text-white">{new Date(photo.timestamp).toLocaleDateString().toUpperCase()}</span>
                </div>
                <div className="flex flex-col gap-1 items-end">
                     <span className="text-[9px] uppercase tracking-widest text-neutral-600 font-bold">Location</span>
                     <span className="text-xs text-white text-right font-mono text-[10px]">{photo.coordinates || "---"}</span>
                </div>
            </div>

            {/* Caption Input */}
            <div className="flex flex-col gap-2">
                <label className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Caption</label>
                <textarea 
                    value={captionText}
                    onChange={(e) => setCaptionText(e.target.value)}
                    placeholder="What's the vibe?"
                    className="w-full bg-transparent border-none p-0 text-lg text-white placeholder-neutral-700 focus:ring-0 outline-none resize-none font-serif italic leading-relaxed"
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
                    <Loader2 className="animate-spin" size={16} /> Posting...
                </>
            ) : (
                <>
                    Post It <ArrowRight size={16} />
                </>
            )}
            </button>
            
            <div className="mt-4 flex justify-center">
                 <button 
                    onClick={() => { if(window.confirm('Delete this capture?')) onDelete(photo.id); }}
                    className="text-[10px] uppercase tracking-widest text-red-900 hover:text-red-500 transition-colors"
                 >
                    Delete
                 </button>
            </div>
      </div>
    </div>
  );
};
