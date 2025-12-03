
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
      <div className="pt-8 pb-6 px-4 flex items-baseline justify-between sticky top-0 bg-[#050505]/95 backdrop-blur z-20 border-b border-neutral-900/50">
        <h1 className="text-xl font-bold tracking-tight text-white font-sans">Sightings</h1>
        <span className="text-[10px] uppercase tracking-widest text-neutral-500">Live</span>
      </div>

      <div className="flex flex-col gap-8 p-4">
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
    <div className="w-full bg-[#111] p-4 pb-6 relative overflow-hidden shadow-2xl">
      {/* Subtle Noise Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />

      {/* 1. Header: Location Headline + Top Right Badge */}
      <div className="mb-5 flex items-start justify-between">
         <div className="flex flex-col items-start border-l-2 border-white pl-3 max-w-[70%]">
            <h2 className="text-3xl font-black uppercase leading-[0.85] tracking-tight text-white font-sans break-words w-full">
               {post.locationName || "SOMEWHERE"}
            </h2>
         </div>
         
         {/* Top Right Badge */}
         <div className="flex flex-col items-end">
            <div className="border border-white/20 bg-white/5 px-2 py-1.5 flex items-center gap-2 backdrop-blur-sm">
               <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
               <span className="text-[9px] font-bold tracking-widest uppercase text-neutral-300">
                   LOG NO. {post.logIndex || 1}
               </span>
            </div>
         </div>
      </div>

      {/* 2. The Frame */}
      <div 
        className="w-full aspect-square bg-black relative cursor-pointer overflow-hidden mb-5 shadow-lg ring-1 ring-white/10 group"
        onClick={() => setIsPlaying(!isPlaying)}
      >
        <img 
            src={activeImage} 
            alt="Entry" 
            className={`w-full h-full object-cover transition-transform duration-700 ease-out ${isPlaying ? 'scale-[1.02]' : 'scale-100 group-hover:scale-[1.01]'}`} 
        />
        {post.frameUrls.length > 0 && !isPlaying && (
            <div className="absolute bottom-3 right-3 w-1.5 h-1.5 bg-white/80 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
        )}
      </div>

      {/* 3. Footer Data */}
      <div className="flex flex-col gap-5 relative z-10">
         
         {/* Simple Data Row */}
         <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex flex-col gap-0.5">
                <span className="text-[9px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Vibe Check</span>
                <span className="text-[10px] font-mono text-neutral-300">{post.coordinates || "OFF GRID"}</span>
            </div>
            <div className="flex flex-col gap-0.5 items-end">
                <span className="text-[9px] uppercase tracking-[0.2em] text-neutral-500 font-bold">When</span>
                <span className="text-[10px] font-mono text-neutral-300">{dateStr}</span>
            </div>
         </div>

         {/* Caption Body (No Quotes) */}
         {post.caption && (
             <div className="py-1">
                <p className="text-lg text-white font-serif italic leading-relaxed opacity-90">
                   {post.caption}
                </p>
             </div>
         )}

         {/* Author & Attribution */}
         <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-1">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-neutral-800 overflow-hidden ring-1 ring-white/20">
                    <img src={post.user.avatarUrl} className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col justify-center">
                    <span className="text-[8px] font-bold uppercase tracking-widest text-neutral-500 mb-0.5">Shot By</span>
                    <span className="text-xs font-medium text-white tracking-wide">
                        {post.user.displayName}
                    </span>
                </div>
            </div>
            
            <div className="flex items-center gap-2">
                {isMe && (
                    <button 
                        onClick={downloadPoster}
                        disabled={downloading}
                        className="flex items-center gap-2 text-neutral-500 hover:text-white transition-colors group px-3 py-1.5 rounded-full hover:bg-white/5"
                        title="Download Poster"
                    >
                        {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} strokeWidth={1.5} />}
                    </button>
                )}
                <button className="flex items-center gap-2 text-neutral-500 hover:text-white transition-colors group px-3 py-1.5 rounded-full hover:bg-white/5">
                    <Heart size={16} strokeWidth={1.5} className={`transition-colors ${post.likedByMe ? 'fill-white text-white' : 'group-hover:text-red-400'}`} />
                    <span className="text-[10px] font-mono font-bold">{post.likes > 0 ? post.likes : ''}</span>
                </button>
            </div>
         </div>
      </div>
    </div>
  );
};
