import React, { useState } from 'react';
import { Photo } from '../types';
import { ArrowLeft, EyeOff, Trash2, Check, Settings2 } from 'lucide-react';

interface GalleryProps {
  photos: Photo[];
  onSelect: (photo: Photo) => void;
  onBack: () => void;
  onDelete: (id: string) => void;
}

export const Gallery: React.FC<GalleryProps> = ({ photos, onSelect, onBack, onDelete }) => {
  const [isManaging, setIsManaging] = useState(false);

  const getPreviewStyle = (photo: Photo) => {
    if (photo.processedUrl) return {};
    
    // Same hash logic as PhotoDetail for consistency
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
        transform: 'scale(6)', 
        transformOrigin: origins[seed],
        filter: 'grayscale(100%) contrast(140%) brightness(0.9)',
    };
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (window.confirm('Permanently delete this photoset?')) {
          onDelete(id);
      }
  };

  return (
    <div className="h-full w-full bg-[#050505] flex flex-col text-white">
      {/* Swiss Header */}
      <div className="pt-12 pb-6 px-6 border-b border-neutral-900 flex flex-col gap-4">
        <div className="flex items-center justify-between">
            <button 
                onClick={onBack} 
                className="self-start text-[10px] uppercase tracking-[0.3em] hover:text-neutral-400 transition-colors flex items-center gap-2"
            >
                <ArrowLeft size={12} />
                Camera
            </button>
            <button 
                onClick={() => setIsManaging(!isManaging)} 
                className={`text-[10px] uppercase tracking-[0.3em] transition-colors flex items-center gap-2 ${isManaging ? 'text-red-500 font-bold' : 'text-neutral-500 hover:text-white'}`}
            >
                {isManaging ? (
                    <>
                        <Check size={12} /> Done
                    </>
                ) : (
                    <>
                        <Settings2 size={12} /> Manage
                    </>
                )}
            </button>
        </div>
        <div className="flex items-baseline justify-between">
            <h1 className="text-5xl font-black tracking-tighter uppercase leading-none">
            Archive
            </h1>
            <span className="text-xl font-light text-neutral-600">({photos.length})</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {photos.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-neutral-800 gap-4">
            <span className="text-9xl font-black opacity-10">00</span>
            <p className="text-xs tracking-[0.2em] uppercase">No exposures found</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-[1px] bg-neutral-900/50 pb-20">
            {photos.map(photo => (
              <div 
                key={photo.id}
                className="relative aspect-[3/4] bg-[#111] overflow-hidden group"
              >
                 <button 
                    onClick={() => !isManaging && onSelect(photo)}
                    className={`w-full h-full block relative ${isManaging ? 'cursor-default' : 'cursor-pointer'}`}
                 >
                    <img 
                    src={photo.processedUrl || photo.originalUrl} 
                    alt="Thumbnail" 
                    className={`w-full h-full object-cover transition-all duration-500 ${!photo.processedUrl ? 'opacity-80' : ''} ${isManaging ? 'opacity-50 grayscale' : ''}`}
                    style={getPreviewStyle(photo)}
                    />
                    
                    {/* Status Indicator overlay */}
                    {!photo.processedUrl && !isManaging && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <EyeOff className="text-white/50" size={16} />
                        </div>
                    )}
                    {photo.processedUrl && !isManaging && (
                        <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)] opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                </button>

                {/* Delete Button Overlay */}
                {isManaging && (
                    <button 
                        onClick={(e) => handleDelete(e, photo.id)}
                        className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 hover:bg-red-900/40 transition-colors group"
                    >
                        <div className="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center group-hover:bg-red-600 group-hover:border-red-500 transition-colors">
                             <Trash2 size={18} className="text-neutral-500 group-hover:text-white" />
                        </div>
                    </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};