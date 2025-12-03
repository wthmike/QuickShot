import React, { useEffect, useState, useRef } from 'react';
import { Post } from '../types';
import { getFeed, CURRENT_USER } from '../services/socialService';
import { Loader2, Heart, Download } from 'lucide-react';

export const Feed: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFeed().then(data => {
      setPosts(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#050505]">
        <div className="flex flex-col items-center gap-4">
             <Loader2 className="animate-spin text-neutral-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#050505] pb-24 scrollbar-hide">
      {/* Header */}
      <div className="pt-8 pb-4 px-5 flex items-baseline justify-between sticky top-0 bg-[#050505]/95 backdrop-blur z-20 border-b border-neutral-900/50">
        <h1 className="text-xl font-bold tracking-tight text-white font-sans">Sightings</h1>
        <span className="text-[10px] uppercase tracking-widest text-neutral-500">Live</span>
      </div>

      <div className="flex flex-col w-full">
        {posts.map(post => (
          <FeedPoster key={post.id} post={post} isMe={post.userId === CURRENT_USER.id} />
        ))}
      </div>
    </div>
  );
};

const FeedPoster: React.FC<{ post: Post, isMe: boolean }> = ({ post, isMe }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const intervalRef = useRef<number | null>(null);

  // Playback Logic
  useEffect(() => {
    if (isPlaying && post.frameUrls.length > 0) {
        intervalRef.current = window.setInterval(() => {
            setCurrentFrameIndex(prev => (prev + 1) % post.frameUrls.length);
        }, 150); 
    } else {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setCurrentFrameIndex(0);
    }
    return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, post.frameUrls]);

  const activeImage = isPlaying && post.frameUrls.length > 0 
    ? post.frameUrls[currentFrameIndex] 
    : post.mainImageUrl;

  const dateStr = new Date(post.timestamp).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
  
  const downloadPoster = async () => {
    setDownloading(true);
    try {
        const canvas = document.createElement('canvas');
        const W = 1080; // Standard Portrait width
        const H = 1920; // 9:16 aspect ratio
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 1. Background - Dark Theme
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, W, H);

        // 2. Load Image
        const img = new Image();
        img.crossOrigin = "Anonymous";
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = post.mainImageUrl;
        });

        // Layout Config
        const margin = 60;
        
        // --- HEADER STAMPS ---
        ctx.fillStyle = '#525252'; // Neutral 600
        ctx.font = 'bold 24px "DM Sans", sans-serif';
        ctx.fillText(`LOG NO. ${post.logIndex || 1}`, margin, 100);
        
        const archiveText = "SIGHTINGS ARCHIVE";
        const archiveWidth = ctx.measureText(archiveText).width;
        ctx.fillText(archiveText, W - margin - archiveWidth, 100);

        // --- IMAGE ---
        const imgWidth = W - (margin * 2);
        const imgHeight = imgWidth; // Square
        const imgY = 160;
        
        ctx.drawImage(img, margin, imgY, imgWidth, imgHeight);
        
        // Image Border
        ctx.strokeStyle = '#262626'; // Neutral 800
        ctx.lineWidth = 2;
        ctx.strokeRect(margin, imgY, imgWidth, imgHeight);

        // --- TYPOGRAPHY ---
        let yPos = imgY + imgHeight + 100;
        
        // Location Headline - MASSIVE & WHITE
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 110px "DM Sans", sans-serif';
        const locationName = (post.locationName || "SOMEWHERE").toUpperCase();
        
        // Text Wrap Logic for Location
        const words = locationName.split(' ');
        let line = '';
        const lineHeight = 110;

        // Draw location title
        for(let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > (W - margin*2) && n > 0) {
                ctx.fillText(line, margin, yPos);
                line = words[n] + ' ';
                yPos += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, margin, yPos);

        yPos += 50;

        // Divider Line
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(margin, yPos, W - (margin*2), 2);
        
        yPos += 60;

        // Coordinates & Date Row
        ctx.fillStyle = '#a1a1aa'; // Neutral 400
        ctx.font = '500 32px "DM Sans", sans-serif';
        ctx.fillText(post.coordinates || "00.00°N, 00.00°E", margin, yPos);
        
        const dateWidth = ctx.measureText(dateStr).width;
        ctx.fillText(dateStr, W - margin - dateWidth, yPos);

        // --- CAPTION ---
        if (post.caption) {
            yPos += 100;
            ctx.fillStyle = '#e5e5e5';
            ctx.font = 'italic 400 48px "Libre Baskerville", serif';
            
            // Wrap caption
            const captionWords = post.caption.split(' ');
            let captionLine = '';
            for(let n = 0; n < captionWords.length; n++) {
                const testLine = captionLine + captionWords[n] + ' ';
                const metrics = ctx.measureText(testLine);
                if (metrics.width > (W - margin*2) && n > 0) {
                    ctx.fillText(captionLine, margin, yPos);
                    captionLine = captionWords[n] + ' ';
                    yPos += 70; 
                } else {
                    captionLine = testLine;
                }
            }
            ctx.fillText(captionLine, margin, yPos);
        }

        // Trigger Download
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        const link = document.createElement('a');
        link.download = `SIGHTING_${post.logIndex}_${post.locationName.replace(/\s+/g, '_')}.jpg`;
        link.href = dataUrl;
        link.click();

    } catch (e) {
        console.error("Poster gen failed", e);
        alert("Could not generate poster.");
    } finally {
        setDownloading(false);
    }
  };

  return (
    <div className="w-full bg-[#050505] pb-16 relative group">
      {/* 1. Full Flush Image */}
      <div 
        className="w-full aspect-square bg-[#0a0a0a] relative cursor-pointer overflow-hidden"
        onClick={() => setIsPlaying(!isPlaying)}
      >
        <img 
            src={activeImage} 
            alt="Entry" 
            className={`w-full h-full object-cover transition-all duration-700 ease-out ${isPlaying ? 'scale-[1.02] filter-none' : 'scale-100 grayscale-[0.1]'}`} 
        />
        {post.frameUrls.length > 0 && !isPlaying && (
            <div className="absolute top-4 right-4 w-2 h-2 bg-white/80 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
        )}
      </div>

      {/* 2. Content Container (Flush with background, no card) */}
      <div className="px-5 pt-5 flex flex-col gap-4">
         
         {/* Location & Log Index */}
         <div className="flex items-start justify-between">
            <h2 className="text-2xl font-black uppercase leading-[0.9] tracking-tight text-white font-sans w-2/3">
               {post.locationName || "SOMEWHERE"}
            </h2>
            <div className="text-[9px] font-bold tracking-widest uppercase text-neutral-500 border border-neutral-800 px-2 py-1 rounded-sm">
                LOG {post.logIndex || 1}
            </div>
         </div>

         {/* Caption */}
         {post.caption && (
             <div>
                <p className="text-lg text-neutral-300 font-serif italic leading-relaxed">
                   {post.caption}
                </p>
             </div>
         )}

         {/* Meta Footer */}
         <div className="flex items-center justify-between pt-2">
            <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-medium text-white tracking-wide">
                    {post.user.displayName}
                </span>
                <span className="text-[9px] uppercase tracking-widest text-neutral-600 font-bold">
                    {dateStr}
                </span>
            </div>
            
            <div className="flex items-center gap-3">
                {isMe && (
                    <button 
                        onClick={downloadPoster}
                        disabled={downloading}
                        className="text-neutral-600 hover:text-white transition-colors"
                        title="Download Poster"
                    >
                        {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} strokeWidth={1.5} />}
                    </button>
                )}
                <button className="flex items-center gap-1.5 text-neutral-600 hover:text-red-500 transition-colors group">
                    <Heart size={16} strokeWidth={1.5} className={`transition-colors ${post.likedByMe ? 'fill-red-500 text-red-500' : ''}`} />
                    <span className="text-[10px] font-mono font-bold group-hover:text-red-500">{post.likes > 0 ? post.likes : ''}</span>
                </button>
            </div>
         </div>
      </div>
    </div>
  );
};