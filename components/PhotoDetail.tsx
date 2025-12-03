import React, { useState, useEffect } from 'react';
import { Photo } from '../types';
import { processImageNatural } from '../services/geminiService';
import { ArrowLeft, Loader2, PenLine } from 'lucide-react';

interface PhotoDetailProps {
  photo: Photo;
  onBack: () => void;
  onUpdatePhoto: (photo: Photo) => void;
  onDelete: (id: string) => void;
}

export const PhotoDetail: React.FC<PhotoDetailProps> = ({ photo, onBack, onUpdatePhoto, onDelete }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [captionText, setCaptionText] = useState(photo.caption || '');

  useEffect(() => {
    // If opening a new photo that already has a caption, sync it
    if (photo.caption) setCaptionText(photo.caption);
  }, [photo.id]);

  const handleProcess = async () => {
    if (photo.processedUrl) return;
    setIsProcessing(true);
    
    // Save caption to photo object first
    onUpdatePhoto({ ...photo, caption: captionText });

    // Use requestAnimationFrame to ensure the UI updates to show the loader
    // before the heavy synchronous canvas operations block the main thread.
    requestAnimationFrame(() => {
        setTimeout(async () => {
            try {
                // Pass caption to the processor to bake it in
                const naturalUrl = await processImageNatural(photo.originalUrl, captionText);
                onUpdatePhoto({
                  ...photo,
                  caption: captionText,
                  processedUrl: naturalUrl,
                  status: 'completed'
                });
              } catch (e) {
                console.error(e);
                alert("Development failed. Image might be too large.");
              } finally {
                setIsProcessing(false);
              }
        }, 100);
    });
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = showOriginal ? photo.originalUrl : (photo.processedUrl || photo.originalUrl);
    link.download = `NC_${photo.timestamp}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeImage = showOriginal ? photo.originalUrl : (photo.processedUrl || photo.originalUrl);
  const dateStr = new Date(photo.timestamp).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '.');
  const timeStr = new Date(photo.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <div className="h-full w-full bg-[#050505] flex flex-col text-white">
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
        <div className="w-full max-w-2xl flex flex-col items-center py-8 px-4">
            
            {/* The Image */}
            <div className="relative w-full shadow-2xl">
                {isProcessing ? (
                    <div className="aspect-[3/4] w-full bg-[#0a0a0a] flex flex-col items-center justify-center gap-4 animate-pulse border border-neutral-800">
                        <Loader2 className="animate-spin text-white" size={32} />
                        <span className="text-xs uppercase tracking-[0.2em] text-neutral-400">Developing Negative...</span>
                    </div>
                ) : (
                    <>
                        <img 
                        src={activeImage} 
                        alt="Capture" 
                        className="w-full h-auto object-contain block bg-[#0a0a0a]"
                        />
                        
                        {/* Compare Tooltip - Only show if processed and NOT holding */}
                        {photo.processedUrl && !showOriginal && (
                        <button 
                            className="absolute bottom-4 right-4 text-[9px] uppercase tracking-[0.2em] bg-black/80 backdrop-blur border border-white/10 px-3 py-2 hover:bg-white hover:text-black transition-colors z-20"
                            onMouseDown={() => setShowOriginal(true)}
                            onMouseUp={() => setShowOriginal(false)}
                            onTouchStart={() => setShowOriginal(true)}
                            onTouchEnd={() => setShowOriginal(false)}
                        >
                            View Negative
                        </button>
                        )}
                    </>
                )}
            </div>

            {/* Editorial Input Area (Only visible when undeveloped) */}
            {!photo.processedUrl && !isProcessing && (
                <div className="w-full mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-2 mb-4 text-neutral-500">
                        <PenLine size={12} />
                        <span className="text-[9px] uppercase tracking-[0.2em]">Editor's Note</span>
                    </div>
                    <textarea 
                        value={captionText}
                        onChange={(e) => setCaptionText(e.target.value)}
                        placeholder="Write something about this moment..."
                        className="w-full bg-transparent text-xl font-light text-white placeholder-neutral-700 border-none outline-none focus:ring-0 resize-none min-h-[100px] leading-relaxed font-sans"
                        style={{ fontFamily: 'Inter, sans-serif' }}
                        maxLength={280}
                    />
                    <div className="text-right text-[9px] text-neutral-700 tracking-widest mt-2">
                        {captionText.length}/280
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Information Strip */}
      <div className="px-6 py-4 flex items-center justify-between border-t border-neutral-900 bg-[#050505]">
        <div>
            <div className="text-[9px] uppercase tracking-[0.2em] text-neutral-500 mb-1">Process</div>
            <div className={`text-xs uppercase tracking-widest font-bold ${photo.processedUrl ? 'text-white' : 'text-neutral-400'}`}>
                {photo.processedUrl ? 'C-41 + Typeset' : 'Drafting'}
            </div>
        </div>
        <div>
            <div className="text-[9px] uppercase tracking-[0.2em] text-neutral-500 mb-1">Stock</div>
            <div className="text-xs uppercase tracking-widest font-bold text-white">
                {photo.processedUrl ? 'NC 400' : 'RAW'}
            </div>
        </div>
      </div>

      {/* Action Bar (Swiss Style Buttons) */}
      <div className="grid grid-cols-2 border-t border-neutral-800 bg-[#050505]">
        {/* Primary Action */}
        {!photo.processedUrl ? (
          <button
            onClick={handleProcess}
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

        {/* Secondary Action */}
        <button 
            onClick={() => onDelete(photo.id)} 
            className="h-20 flex flex-col items-center justify-center gap-1 hover:bg-red-600 transition-colors"
        >
          <span className="text-sm font-bold uppercase tracking-widest">Discard</span>
          <span className="text-[9px] tracking-wider opacity-60">BURN NEGATIVE</span>
        </button>
      </div>
    </div>
  );
};