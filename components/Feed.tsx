
import React, { useEffect, useState, useRef } from 'react';
import { Post, FilterType } from '../types';
import { getFeed, CURRENT_USER, toggleLike } from '../services/socialService';
import { Loader2, Heart, Share2, MapPin, ArrowDown, ArrowUp, CornerDownLeft, Film } from 'lucide-react';

interface FeedProps {
    onNavigateProfile?: (userId: string) => void;
}

export const Feed: React.FC<FeedProps> = ({ onNavigateProfile }) => {
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
      {/* Editorial Header */}
      <div className="pt-14 pb-6 px-5 sticky top-0 bg-[#050505]/95 backdrop-blur-xl z-30 border-b border-neutral-900 transition-all duration-500">
        <div className="flex flex-col w-full">
            {/* Top Meta Line - Swiss Grid Style */}
            <div className="flex justify-between items-center mb-2 border-b border-neutral-800 pb-3">
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-white"></div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-500">
                        Global Feed
                    </span>
                 </div>
                 <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-500">
                     Est. {new Date().getFullYear()}
                 </span>
            </div>

            {/* Title */}
            <div className="mt-1">
                <h1 className="text-6xl font-black tracking-tighter uppercase leading-[0.8] text-white">
                    Chronicle
                </h1>
            </div>
        </div>
      </div>

      <div className="flex flex-col w-full">
        {posts.map((post, index) => (
          <FeedPoster 
            key={post.id} 
            post={post} 
            index={index} 
            onProfileClick={onNavigateProfile}
          />
        ))}
      </div>
    </div>
  );
};

interface FeedPosterProps { 
    post: Post; 
    index: number;
    onProfileClick?: (userId: string) => void;
}

const FeedPoster: React.FC<FeedPosterProps> = ({ post, index, onProfileClick }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const intervalRef = useRef<number | null>(null);

  // Like State
  const [isLiked, setIsLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [isLiking, setIsLiking] = useState(false);

  // Comment State
  const [comments, setComments] = useState<{user: string, text: string}[]>(
      index % 2 === 0 ? [{ user: "Curator", text: "Exceptional light in this frame." }] : []
  );
  const [newComment, setNewComment] = useState("");
  const [expanded, setExpanded] = useState(false);

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

  const getFilterDisplayName = (f?: FilterType) => {
      switch(f) {
          case 'HIPPO_400': return 'HIPPO 400';
          case 'HIPPO_800': return 'HIPPO 800';
          case 'WILLIAM_400': return 'WILLIAM 400';
          case 'WILLIAM_H': return 'WILLIAM H';
          default: return 'HIPPO 400';
      }
  };

  const filmStockName = getFilterDisplayName(post.filter);

  // Comment Logic
  const handleCommentSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newComment.trim()) return;
      setComments([...comments, { user: CURRENT_USER.displayName, text: newComment }]);
      setNewComment("");
  };

  // Like Logic
  const handleLike = async () => {
      if (isLiking) return;
      
      // Optimistic Update
      const newStatus = !isLiked;
      setIsLiked(newStatus);
      setLikeCount(prev => newStatus ? prev + 1 : prev - 1);
      setIsLiking(true);

      try {
          await toggleLike(post.id);
      } catch (e) {
          // Revert on failure
          setIsLiked(!newStatus);
          setLikeCount(prev => !newStatus ? prev + 1 : prev - 1);
      } finally {
          setIsLiking(false);
      }
  };

  // Prepare display items (Caption + Comments)
  const allContent = [
      ...(post.caption ? [{ user: post.user.displayName, text: post.caption, isCaption: true }] : []),
      ...comments.map(c => ({ user: c.user, text: c.text, isCaption: false }))
  ];

  // Logic: Show max 2 lines initially.
  const visibleContent = expanded ? allContent : allContent.slice(0, 2);
  const hasMore = allContent.length > 2;

  return (
    <div className="w-full flex flex-col items-center bg-[#050505] border-b border-neutral-900 last:border-0">
      
      {/* Post Container */}
      <div className="w-full max-w-xl py-10">
          
          {/* Header Bar */}
          <div className="flex justify-between items-end px-5 mb-5">
              <button 
                onClick={() => onProfileClick && onProfileClick(post.userId)}
                className="flex items-center gap-3 group"
              >
                <div className="w-9 h-9 bg-neutral-800 overflow-hidden grayscale border border-neutral-800 rounded-none group-hover:border-white transition-colors">
                    <img src={post.user.avatarUrl} className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col justify-center text-left">
                    <span className="text-sm font-black uppercase tracking-widest text-white leading-none group-hover:text-neutral-300 transition-colors">
                        {post.user.displayName}
                    </span>
                    <span className="text-[9px] text-neutral-500 uppercase tracking-widest mt-1">
                        {post.user.username}
                    </span>
                </div>
              </button>

              <div className="flex flex-col items-end gap-1">
                  <span className="text-[9px] font-mono text-neutral-600 uppercase tracking-widest">
                      FIG. {String(post.logIndex || index + 1).padStart(3, '0')}
                  </span>
                  <span className="text-[9px] font-mono text-neutral-600 uppercase tracking-widest">
                      {new Date(post.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()}
                  </span>
              </div>
          </div>

          {/* Image Stage - SQUARE 1:1 Aspect Ratio */}
          <div 
            className="w-full aspect-square relative cursor-pointer overflow-hidden bg-[#111]"
            onClick={() => setIsPlaying(!isPlaying)}
            onDoubleClick={handleLike}
          >
            <img 
                src={activeImage} 
                alt="Entry" 
                className={`w-full h-full object-cover transition-all duration-700 ease-out ${isPlaying ? 'scale-[1.02] filter-none' : 'scale-100 grayscale-[10%]'}`} 
                loading="lazy"
            />
            
            {/* Texture Overlay */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay bg-noise" />

            {/* Heart Animation Overlay (Optional implementation could go here) */}

            {post.frameUrls.length > 0 && !isPlaying && (
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur text-black px-2 py-1">
                    <span className="text-[8px] uppercase tracking-widest font-bold block">Motion</span>
                </div>
            )}
          </div>

          {/* Info Block */}
          <div className="px-5 mt-4 flex flex-col gap-5">
             
             {/* Data Line: Location & Film Stock */}
             <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                 <div className="flex items-center gap-1 text-white shrink-0">
                    <MapPin size={10} className="text-white" />
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] truncate max-w-[150px]">
                        {post.locationName}
                    </h2>
                 </div>
                 
                 <div className="flex items-center gap-4">
                     <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-neutral-400">
                         {filmStockName}
                     </span>
                     
                     {/* Icons Actions Row */}
                     <div className="flex items-center gap-4 pl-2 border-l border-neutral-800">
                        <button className="text-neutral-500 hover:text-white transition-colors group">
                            <Share2 size={14} strokeWidth={1.5} className="group-hover:scale-110 transition-transform" />
                        </button>
                        <button 
                            onClick={handleLike}
                            className="flex items-center gap-2 text-neutral-500 hover:text-red-500 transition-colors group"
                        >
                            <Heart 
                                size={14} 
                                strokeWidth={isLiked ? 0 : 1.5} 
                                className={`transition-all duration-300 group-hover:scale-110 ${isLiked ? 'fill-red-500 scale-110' : ''}`} 
                            />
                            {likeCount > 0 && (
                                <span className={`text-[9px] font-bold font-mono ${isLiked ? 'text-red-500' : 'text-neutral-600'}`}>
                                    {likeCount}
                                </span>
                            )}
                        </button>
                     </div>
                 </div>
             </div>

             {/* Content Body */}
             <div className="flex flex-col gap-2">
                 {/* Render Visible Items (Caption + Comments) */}
                 {visibleContent.map((item, i) => (
                    <div key={i} className={`flex items-start gap-3 text-sm leading-relaxed ${!item.isCaption ? 'opacity-80' : ''}`}>
                        <span className="font-bold uppercase tracking-wide text-[10px] text-white shrink-0 mt-0.5">
                            {item.user}
                        </span>
                        <span className="font-serif text-neutral-300">
                            {item.text}
                        </span>
                    </div>
                 ))}

                 {/* Expander Arrow */}
                 {hasMore && (
                     <button 
                        onClick={() => setExpanded(!expanded)}
                        className="flex items-center gap-2 text-[9px] uppercase tracking-widest text-neutral-500 hover:text-white transition-colors mt-1 self-start py-1"
                     >
                        {expanded ? (
                          <>
                             <ArrowUp size={12} />
                             Show Less
                          </>
                        ) : (
                          <>
                             <ArrowDown size={12} />
                             View Notes
                          </>
                        )}
                     </button>
                 )}
                 
                 {/* Simple Input */}
                 <form onSubmit={handleCommentSubmit} className="mt-1 flex items-center gap-2 py-2 transition-colors">
                    <input 
                        type="text" 
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add observation..."
                        className="bg-transparent w-full text-sm font-serif text-neutral-500 focus:text-white outline-none placeholder-neutral-800"
                    />
                    {newComment.length > 0 && (
                        <button type="submit" className="text-white hover:text-neutral-300">
                            <CornerDownLeft size={14} />
                        </button>
                    )}
                 </form>
             </div>
          </div>
      </div>
    </div>
  );
};
