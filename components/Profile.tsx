import React, { useEffect, useState } from 'react';
import { User, Post } from '../types';
import { getMyProfile, CURRENT_USER } from '../services/socialService';

interface ProfileProps {
    onOpenLocalGallery: () => void;
    currentUser?: User;
    onLogout?: () => void;
}

export const Profile: React.FC<ProfileProps> = ({ onOpenLocalGallery, currentUser, onLogout }) => {
  const [user, setUser] = useState<User>(currentUser || CURRENT_USER);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<'grid' | 'journal'>('grid');

  useEffect(() => {
    if (currentUser) {
        setUser(currentUser);
        getMyProfile(currentUser.id).then(data => setPosts(data.posts));
    } else {
        getMyProfile().then(data => {
            setUser(data.user);
            setPosts(data.posts);
        });
    }
  }, [currentUser]);

  return (
    <div className="h-full w-full bg-[#050505] flex flex-col font-sans text-white">
       
       <div className="flex-1 overflow-y-auto scrollbar-hide">
           {/* Header Area */}
           <div className="px-6 pt-12 pb-8 flex flex-col gap-6">
                
                {/* Top Actions */}
                <div className="flex justify-between items-start">
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-neutral-900 grayscale">
                        <img src={user.avatarUrl} className="w-full h-full object-cover" />
                    </div>
                    {onLogout && (
                        <button 
                            onClick={onLogout} 
                            className="text-[9px] uppercase tracking-widest text-neutral-600 hover:text-white transition-colors border border-neutral-800 px-3 py-1.5 rounded-sm"
                        >
                            Log Out
                        </button>
                    )}
                </div>

                {/* Identity */}
                <div className="flex flex-col gap-2">
                    <h1 className="font-serif text-4xl italic text-white tracking-tight leading-none">
                        {user.displayName}
                    </h1>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                        @{user.username}
                    </span>
                </div>

                {/* Bio */}
                <div className="max-w-sm">
                     <p className="font-sans text-sm leading-relaxed text-neutral-400">
                        {user.bio || "No bio yet."}
                    </p>
                </div>

                {/* Micro Stats */}
                <div className="flex items-center gap-6 text-[10px] uppercase tracking-[0.2em] text-neutral-600 font-bold mt-2">
                    <span><span className="text-white mr-1">{posts.length}</span> Shots</span>
                    <span><span className="text-white mr-1">{user.followers}</span> Followers</span>
                </div>
           </div>

           {/* Camera Roll Link */}
           <div className="w-full border-t border-b border-neutral-900 bg-[#050505]">
                <button 
                    onClick={onOpenLocalGallery}
                    className="w-full py-4 px-6 flex items-center justify-between group hover:bg-white/5 transition-colors"
                >
                    <span className="text-[10px] uppercase tracking-[0.2em] text-white font-bold">
                        Camera Archive
                    </span>
                    <span className="text-neutral-600 group-hover:text-white transition-colors text-xs">→</span>
                </button>
           </div>

           {/* Tabs */}
           <div className="sticky top-0 bg-[#050505]/95 backdrop-blur z-20 flex border-b border-neutral-900">
                <button 
                    onClick={() => setActiveTab('grid')}
                    className={`flex-1 py-4 text-[10px] uppercase tracking-[0.2em] transition-colors ${activeTab === 'grid' ? 'text-white opacity-100' : 'text-neutral-600 hover:text-neutral-400'}`}
                >
                    Index
                </button>
                <button 
                    onClick={() => setActiveTab('journal')}
                    className={`flex-1 py-4 text-[10px] uppercase tracking-[0.2em] transition-colors ${activeTab === 'journal' ? 'text-white opacity-100' : 'text-neutral-600 hover:text-neutral-400'}`}
                >
                    Journal
                </button>
           </div>

           {/* Content */}
           <div className="min-h-[50vh] pb-32 bg-[#050505]">
               {activeTab === 'grid' ? (
                   <div className="grid grid-cols-3 gap-0">
                       {posts.length > 0 ? (
                           posts.map(post => (
                            <div key={post.id} className="aspect-square bg-[#0a0a0a] relative group overflow-hidden border-r border-b border-black/50">
                                <img 
                                    src={post.mainImageUrl} 
                                    className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-500" 
                                />
                            </div>
                           ))
                       ) : (
                           <div className="col-span-3 py-20 flex flex-col items-center justify-center text-neutral-800 gap-2">
                               <span className="text-4xl font-serif italic opacity-20">Empty</span>
                           </div>
                       )}
                   </div>
               ) : (
                   <div className="flex flex-col px-6">
                       {posts.map(post => (
                           <div key={post.id} className="py-8 border-b border-neutral-900 flex flex-col gap-3 group">
                               <div className="flex items-center justify-between">
                                   <span className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">
                                       {new Date(post.timestamp).toLocaleDateString()}
                                   </span>
                                   <span className="text-[9px] uppercase tracking-widest text-white/50">
                                       LOG {post.logIndex}
                                   </span>
                               </div>
                               <h3 className="text-xl font-bold uppercase tracking-tight text-white leading-none">
                                   {post.locationName}
                               </h3>
                               {post.caption && (
                                   <p className="font-serif text-lg italic text-neutral-400 leading-relaxed group-hover:text-neutral-200 transition-colors">
                                       {post.caption}
                                   </p>
                               )}
                           </div>
                       ))}
                       {posts.length === 0 && (
                            <div className="py-20 flex flex-col items-center justify-center text-neutral-800 gap-2">
                               <span className="text-4xl font-serif italic opacity-20">No entries</span>
                           </div>
                       )}
                   </div>
               )}
           </div>
       </div>
    </div>
  );
};