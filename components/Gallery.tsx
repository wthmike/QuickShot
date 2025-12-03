import React from 'react';
import { Photo } from '../types';
import { ArrowLeft } from 'lucide-react';

interface GalleryProps {
  photos: Photo[];
  onSelect: (photo: Photo) => void;
  onBack: () => void;
}

export const Gallery: React.FC<GalleryProps> = ({ photos, onSelect, onBack }) => {
  return (
    <div className="h-full w-full bg-[#050505] flex flex-col text-white">
      {/* Swiss Header */}
      <div className="pt-12 pb-6 px-6 border-b border-neutral-900 flex flex-col gap-4">
        <button 
            onClick={onBack} 
            className="self-start text-[10px] uppercase tracking-[0.3em] hover:text-neutral-400 transition-colors flex items-center gap-2"
        >
            <ArrowLeft size={12} />
            Back to Camera
        </button>
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
          <div className="grid grid-cols-3 gap-[1px] bg-neutral-900/50">
            {photos.map(photo => (
              <button 
                key={photo.id}
                onClick={() => onSelect(photo)}
                className="relative aspect-[3/4] bg-[#111] overflow-hidden group"
              >
                <img 
                  src={photo.processedUrl || photo.originalUrl} 
                  alt="Thumbnail" 
                  className={`w-full h-full object-cover transition-all duration-500 ${!photo.processedUrl ? 'grayscale opacity-70 group-hover:opacity-100 group-hover:grayscale-0' : ''}`}
                />
                
                {/* Status Indicator overlay */}
                {!photo.processedUrl && (
                    <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-neutral-500 rounded-full" />
                )}
                {photo.processedUrl && (
                    <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};