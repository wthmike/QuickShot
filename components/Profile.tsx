
import React, { useEffect, useState } from 'react';
import { User, Post } from '../types';
import { getUserProfile } from '../services/socialService';
import { ArrowLeft, Loader2 } from 'lucide-react';

interface ProfileProps {
    viewingUserId: string; // The ID of the user we want to see
    currentUserId: string; // The ID of the logged-in user
    onOpenLocalGallery: () => void;
    onLogout: () => void;
    onBack?: () => void; // Used when viewing someone else's profile to return
    localPhotoCount?: number;
}

export const Profile: React.FC<ProfileProps> = ({ 
    viewingUserId, 
    currentUserId, 
    onOpenLocalGallery, 
    onLogout, 
    onBack,
    localPhotoCount = 0 
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<'grid' | 'journal'>('grid');
  const [loading, setLoading] = useState(true);

  const isOwner = viewingUserId === currentUserId;

  useEffect(() => {
    setLoading(true);
    getUserProfile(viewingUserId).then(data => {
        setUser(data.user);
        setPosts(data.posts);
        setLoading(false);
    });
  }, [viewingUserId]);

  if (loading || !user) {
      return (
        <div className="h-full w-full bg-[#050505] flex items-center justify-center">
            <Loader2 className="animate-spin text-neutral-600" />
        </div>
      );
  }

  return (
    <div className="h-full w-full bg-[#050505] flex flex-col font-sans text-white">
       
       <div className="flex-1 overflow-y-auto scrollbar-hide">
           
           {/* Top Header / Back Button (Only for non-owners) */}
           <div className="h-14 flex items-center px-4 bg-[#050505] border-b border-neutral-900 sticky top-0 z-40">
                {!isOwner && onBack ? (
                    <button 
                        onClick={onBack}
                        className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-neutral-400 hover:text-white"
                    >
                        <ArrowLeft size={14} />
                        Back to Feed
                    </button>
                ) : (
                    <span className="text-[10px] uppercase tracking-widest text-neutral-600">
                        Personal Log
                    </span>
                )}
           </div>

           {/* BLOCK 1: Name & Status Grid */}
           <div className="border-b border-neutral-800 bg-[#050505]">
                <div className="flex flex-col gap-1 p-5">
                    <div className="flex justify-between items-start">
                         <h1 className="text-4xl font-black uppercase tracking-tighter leading-[0.9] max-w-[80%]">
                             {user.displayName}
                         </h1>
                         <div className={`w-2 h-2 mt-2 shrink-0 ${isOwner ? 'bg-green-500' : 'bg-neutral-500'}`} />
                    </div>
                    <span className="font-mono text-xs text-neutral-500 uppercase tracking-widest">
                        @{user.username}
                    </span>
                </div>
           </div>

           {/* BLOCK 2: Avatar & Bio Grid (Swapped: Avatar Left, Bio Right) */}
           <div className="grid grid-cols-[120px_1fr] h-36 border-b border-neutral-800">
                {/* Left Col: Avatar */}
                <div className="relative h-full w-full grayscale bg-neutral-900 group overflow-hidden border-r border-neutral-800">
                    <img src={user.avatarUrl} className="w-full h-full object-cover" />
                    {/* Inner border effect */}
                    <div className="absolute inset-0 border border-white/10 pointer-events-none" />
                </div>

                {/* Right Col: Bio */}
                <div className="p-5 flex flex-col justify-between bg-[#080808]">
                     <p className="font-serif italic text-sm text-neutral-300 leading-relaxed line-clamp-3">
                         {user.bio || "No bio available."}
                     </p>
                     
                     {isOwner && (
                        <button 
                            onClick={onLogout} 
                            className="text-[9px] uppercase tracking-widest text-neutral-500 hover:text-white transition-colors self-start border-b border-transparent hover:border-white"
                        >
                            Log Out ->
                        </button>
                     )}
                     {!isOwner && (
                        <button className="text-[9px] uppercase tracking-widest text-neutral-500 cursor-default text-left">
                             Reading Only
                        </button>
                     )}
                </div>
           </div>

           {/* BLOCK 3: Data Grid (Stats) */}
           <div className="grid grid-cols-3 border-b border-neutral-800 bg-[#050505]">
               <div className="py-4 flex flex-col items-center justify-center border-r border-neutral-800">
                    <span className="text-xl font-bold font-mono">{posts.length}</span>
                    <span className="text-[8px] uppercase tracking-[0.2em] text-neutral-600 mt-1">Logs</span>
               </div>
               <div className="py-4 flex flex-col items-center justify-center border-r border-neutral-800">
                    <span className="text-xl font-bold font-mono">{user.followers}</span>
                    <span className="text-[8px] uppercase tracking-[0.2em] text-neutral-600 mt-1">Followers</span>
               </div>
               <div className="py-4 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold font-mono">{user.following}</span>
                    <span className="text-[8px] uppercase tracking-[0.2em] text-neutral-600 mt-1">Following</span>
               </div>
           </div>

           {/* BLOCK 4: Archive Action (High Contrast) - OWNER ONLY */}
           {isOwner && (
               <button 
                    onClick={onOpenLocalGallery}
                    className="w-full py-6 bg-white text-black hover:bg-neutral-200 transition-colors flex items-center justify-between px-5 border-b border-neutral-800"
                >
                    <span className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3">
                        <div className="w-2 h-2 bg-black" />
                        Local Archive
                    </span>
                    <span className="text-xs font-mono font-bold bg-black text-white px-2 py-0.5">
                        {localPhotoCount} REELS
                    </span>
               </button>
           )}

           {/* BLOCK 5: Sticky Navigation Tabs */}
           <div className="sticky top-14 bg-[#050505] z-30 flex border-b border-neutral-800">
                <button 
                    onClick={() => setActiveTab('grid')}
                    className={`flex-1 py-4 text-[9px] uppercase tracking-[0.2em] transition-colors border-r border-neutral-800 ${activeTab === 'grid' ? 'bg-[#111] text-white font-bold' : 'text-neutral-500 hover:text-white'}`}
                >
                    Visual Index
                </button>
                <button 
                    onClick={() => setActiveTab('journal')}
                    className={`flex-1 py-4 text-[9px] uppercase tracking-[0.2em] transition-colors ${activeTab === 'journal' ? 'bg-[#111] text-white font-bold' : 'text-neutral-500 hover:text-white'}`}
                >
                    Logbook
                </button>
           </div>

           {/* Content Area */}
           <div className="min-h-[50vh] pb-32 bg-[#050505]">
               {activeTab === 'grid' ? (
                   <div className="grid grid-cols-3 gap-px bg-neutral-900 border-b border-neutral-900">
                       {posts.length > 0 ? (
                           posts.map(post => (
                            <div key={post.id} className="aspect-square bg-[#0a0a0a] relative group overflow-hidden">
                                <img 
                                    src={post.mainImageUrl} 
                                    className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-500" 
                                />
                            </div>
                           ))
                       ) : (
                           <div className="col-span-3 py-20 flex flex-col items-center justify-center text-neutral-800 gap-2 bg-[#050505]">
                               <span className="text-4xl font-black opacity-20">00</span>
                               <span className="text-[9px] uppercase tracking-widest">Empty Index</span>
                           </div>
                       )}
                   </div>
               ) : (
                   <div className="flex flex-col">
                       {posts.map((post, i) => (
                           <div key={post.id} className="p-6 border-b border-neutral-900 flex flex-col gap-4 group">
                               <div className="flex items-center justify-between">
                                   <div className="flex gap-2">
                                      <span className="text-[9px] font-mono text-neutral-500">
                                        FIG. {String(post.logIndex).padStart(3, '0')}
                                      </span>
                                      <span className="text-[9px] font-mono text-white">
                                        {new Date(post.timestamp).toLocaleDateString().toUpperCase()}
                                      </span>
                                   </div>
                               </div>
                               
                               <div className="flex gap-5">
                                   <div className="w-20 h-20 shrink-0 bg-neutral-900 grayscale border border-neutral-800">
                                        <img src={post.mainImageUrl} className="w-full h-full object-cover" />
                                   </div>
                                   <div className="flex flex-col gap-1 py-1">
                                       <h3 className="text-sm font-bold uppercase tracking-widest text-white leading-none mb-1">
                                           {post.locationName}
                                       </h3>
                                       {post.caption && (
                                           <p className="text-sm font-serif italic text-neutral-400 leading-relaxed max-w-prose">
                                               "{post.caption}"
                                           </p>
                                       )}
                                   </div>
                               </div>
                           </div>
                       ))}
                       {posts.length === 0 && (
                            <div className="py-20 flex flex-col items-center justify-center text-neutral-800 gap-2">
                               <span className="text-[9px] uppercase tracking-widest">Logbook Empty</span>
                           </div>
                       )}
                   </div>
               )}
           </div>
       </div>
    </div>
  );
};
