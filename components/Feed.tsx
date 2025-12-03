
import React, { useEffect, useState, useRef } from 'react';
import { Post } from '../types';
import { getFeed } from '../services/socialService';
import { Heart, MessageCircle, Share2, MoreHorizontal, Loader2 } from 'lucide-react';

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
        <Loader2 className="animate-spin text-neutral-600" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#050505] pb-24">
      {/* Feed Header */}
      <div className="h-14 flex items-center justify-center border-b border-neutral-900 sticky top-0 bg-[#050505]/90 backdrop-blur z-20">
        <h1 className="text-sm font-bold tracking-widest uppercase">HippoCam</h1>
      </div>

      <div className="flex flex-col gap-8 py-4">
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

  // CSS for positioning the playback overlay over the 2x2 grid on the poster
  // Based on geminiService layout logic: Ratio 2.24
  const overlayStyle: React.CSSProperties = {
      position: 'absolute',
      left: '0',
      top: '0',
      marginLeft: '4.46%',    // 0.1 / 2.24
      marginTop: '13.39%',    // 0.3 / 2.24 (Margin top % is relative to width)
      width: '91.07%',        // 2.04 / 2.24
      aspectRatio: '1/1',
      pointerEvents: 'none'
  };

  const playbackImage = post.frameUrls[currentFrameIndex];

  return (
    <div className="flex flex-col">
      {/* Post Header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={post.user.avatarUrl} alt="avatar" className="w-8 h-8 rounded-full bg-neutral-800 object-cover" />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white">{post.user.username}</span>
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider">{post.locationName}</span>
          </div>
        </div>
        <button className="text-neutral-500">
          <MoreHorizontal size={16} />
        </button>
      </div>

      {/* Image Stage */}
      <div 
        className="w-full relative cursor-pointer"
        onClick={() => setIsPlaying(!isPlaying)}
      >
        <img src={post.mainImageUrl} alt="Post" className="w-full h-auto bg-[#111]" />
        
        {/* Playback Overlay */}
        {isPlaying && playbackImage && (
            <div style={overlayStyle} className="z-10 bg-black">
                <img 
                    src={playbackImage} 
                    alt="Playback Frame"
                    className="w-full h-full object-cover"
                />
            </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button className={`flex items-center gap-1 ${post.likedByMe ? 'text-red-500' : 'text-white'}`}>
            <Heart size={20} fill={post.likedByMe ? 'currentColor' : 'none'} />
          </button>
          <button className="text-white">
            <MessageCircle size={20} />
          </button>
          <button className="text-white">
            <Share2 size={20} />
          </button>
        </div>
        {post.frameUrls.length > 0 && (
            <div className={`text-[9px] uppercase tracking-widest px-2 py-1 border ${isPlaying ? 'border-red-500 text-red-500' : 'border-neutral-700 text-neutral-500'}`}>
                {isPlaying ? 'Playing' : 'GIF'}
            </div>
        )}
      </div>

      {/* Caption */}
      <div className="px-4 pb-4">
         <div className="text-sm text-neutral-400 leading-snug">
            <span className="text-white font-bold mr-2">{post.user.username}</span>
            {post.caption}
         </div>
         <div className="text-[10px] text-neutral-600 mt-2 uppercase tracking-widest">
            {new Date(post.timestamp).toLocaleDateString()}
         </div>
      </div>
    </div>
  );
};
