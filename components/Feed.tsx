
import React, { useEffect, useState, useRef } from 'react';
import { Post } from '../types';
import { getFeed } from '../services/socialService';
import { Loader2, Heart, MessageSquare } from 'lucide-react';

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
             <Loader2 className="animate-spin text-white" />
             <span className="text-[10px] uppercase tracking-widest text-neutral-500">Loading Journal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#050505] pb-24 font-mono">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-neutral-900 sticky top-0 bg-[#050505]/95 backdrop-blur z-20">
        <h1 className="text-xs font-bold tracking-widest uppercase text-white">Travel Journal</h1>
        <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
      </div>

      <div className="flex flex-col">
        {posts.map(post => (
          <FeedItem key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
};

const FeedItem: React.FC<{ post: Post }> = ({ post }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const intervalRef = useRef<number | null>(null);

  // Playback Logic
  useEffect(() => {
    if (isPlaying && post.frameUrls.length > 0) {
        intervalRef.current = window.setInterval(() => {
            setCurrentFrameIndex(prev => (prev + 1) % post.frameUrls.length);
        }, 120);
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

  return (
    <div className="flex flex-col border-b border-neutral-900 mb-8 pb-8">
      
      {/* 1. Header Block (Technical Data) */}
      <div className="px-4 py-4 flex justify-between items-start">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-neutral-900 border border-neutral-800">
                <img src={post.user.avatarUrl} alt="Avatar" className="w-full h-full object-cover grayscale" />
            </div>
            <div className="flex flex-col">
                <span className="text-xs font-bold uppercase text-white tracking-wider">{post.user.username}</span>
                <span className="text-[9px] text-neutral-500 uppercase tracking-widest">{new Date(post.timestamp).toLocaleTimeString()}</span>
            </div>
        </div>
        <div className="flex flex-col items-end">
            <span className="text-[9px] uppercase tracking-widest text-neutral-400 font-bold">{post.locationName}</span>
            <span className="text-[8px] text-neutral-600 font-mono tracking-widest">{post.coordinates || "NO GPS DATA"}</span>
        </div>
      </div>

      {/* 2. Image Block (Full Bleed / Hard Edges) */}
      <div 
        className="w-full relative cursor-pointer group bg-[#0a0a0a] border-y border-neutral-900"
        onClick={() => setIsPlaying(!isPlaying)}
      >
        <img 
            src={activeImage} 
            alt="Post" 
            className={`w-full h-auto object-contain transition-opacity duration-100 ${isPlaying ? 'opacity-100' : 'opacity-90'}`} 
        />
        
        {/* GIF Indicator */}
        {post.frameUrls.length > 0 && !isPlaying && (
            <div className="absolute top-4 right-4 bg-black/50 backdrop-blur px-2 py-1 border border-white/20">
                <span className="text-[9px] uppercase tracking-widest text-white">Tap for Motion</span>
            </div>
        )}
      </div>

      {/* 3. Data/Caption Block */}
      <div className="px-4 pt-4 flex flex-col gap-4">
         
         {/* Action Bar (Minimal) */}
         <div className="flex items-center gap-6">
            <button className={`flex items-center gap-2 text-[10px] uppercase tracking-widest hover:text-white transition-colors ${post.likedByMe ? 'text-white' : 'text-neutral-500'}`}>
                <Heart size={14} fill={post.likedByMe ? "white" : "none"} />
                {post.likes > 0 ? post.likes : 'Like'}
            </button>
            <button className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-neutral-500 hover:text-white transition-colors">
                <MessageSquare size={14} />
                Comment
            </button>
         </div>

         {/* Caption Typewriter */}
         <div className="border-l-2 border-neutral-800 pl-4 py-1">
             <p className="text-sm text-neutral-300 font-sans leading-relaxed">
                {post.caption}
             </p>
         </div>
      </div>
    </div>
  );
};
