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
    <div className="h-full w-full bg-[#0f0f11] flex flex-col font-sans text-white">
       
       {/* Top Actions */}
       <div className="pt-8 px-6 flex justify-end">
            {onLogout && (
                <button 
                    onClick={onLogout} 
                    className="text-[10px] uppercase tracking-widest text-neutral-600 hover:text-white transition-colors flex items-center gap-2"
                >
                    Log Out
                </button>
            )}
       </div>

       <div className="flex-1 overflow-y-auto scrollbar-hide">
           {/* Editorial Header */}
           <div className="px-6 pt-6 pb-10 flex flex-col items-center text-center">
                {/* Avatar - Minimal, no borders, just image */}
                <div className="w-24 h-24 rounded-full overflow-hidden mb-6 grayscale hover:grayscale-0 transition-all duration-700 bg-neutral-900">
                    <img src={user.avatarUrl} className="w-full h-full object-cover" />
                </div>
                
                {/* Name - Big Serif */}
                <h1 className="font-serif text-4xl italic text-white mb-2 tracking-tight">
                    {user.displayName}
                </h1>
                
                {/* Handle */}
                <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-6">
                    @{user.username}
                </span>

                {/* Bio */}
                <div className="max-w-xs mx-auto mb-8">
                     <p className="font-serif text-lg leading-relaxed text-neutral-400 italic">
                        {user.bio || "No bio yet."}
                    </p>
                </div>

                {/* Micro Stats */}
                <div className="flex items-center gap-4 text-[9px] uppercase tracking-[0.15em] text-neutral-500 font-medium">
                    <span><span className="text-white mr-1">{posts.length}</span> Shots</span>
                    <span className="w-0.5 h-0.5 bg-neutral-700 rounded-full" />
                    <span><span className="text-white mr-1">{user.followers}</span> Followers</span>
                </div>
           </div>

           {/* Camera Roll Link */}
           <div className="w-full border-t border-neutral-900">
                <button 
                    onClick={onOpenLocalGallery}
                    className="w-full py-5 px-6 flex items-center justify-between group hover:bg-white/5 transition-colors"
                >
                    <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 group-hover:text-white transition-colors">
                        Camera Archive
                    </span>
                    <span className="text-neutral-600 group-hover:text-white transition-colors text-xs">→</span>
                </button>
           </div>

           {/* Tabs */}
           <div className="sticky top-0 bg-[#0f0f11]/95 backdrop-blur z-20 border-y border-neutral-900 flex">
                <button 
                    onClick={() => setActiveTab('grid')}
                    className={`flex-1 py-4 text-[10px] uppercase tracking-[0.2em] transition-colors ${activeTab === 'grid' ? 'text-white bg-white/5' : 'text-neutral-600 hover:text-neutral-400'}`}
                >
                    Index
                </button>
                <div className="w-[1px] bg-neutral-900" />
                <button 
                    onClick={() => setActiveTab('journal')}
                    className={`flex-1 py-4 text-[10px] uppercase tracking-[0.2em] transition-colors ${activeTab === 'journal' ? 'text-white bg-white/5' : 'text-neutral-600 hover:text-neutral-400'}`}
                >
                    Journal
                </button>
           </div>

           {/* Content */}
           <div className="min-h-[50vh] pb-24">
               {activeTab === 'grid' ? (
                   <div className="grid grid-cols-3 gap-[1px] bg-neutral-900">
                       {posts.length > 0 ? (
                           posts.map(post => (
                            <div key={post.id} className="aspect-[3/4] bg-[#0f0f11] relative group overflow-hidden">
                                <img 
                                    src={post.mainImageUrl} 
                                    className="w-full h-full object-cover transition-all duration-700 grayscale-[0.5] group-hover:grayscale-0 group-hover:scale-105" 
                                />
                            </div>
                           ))
                       ) : (
                           <div className="col-span-3 py-20 flex flex-col items-center justify-center text-neutral-700 gap-2">
                               <span className="text-2xl font-serif italic opacity-20">Empty</span>
                           </div>
                       )}
                   </div>
               ) : (
                   <div className="flex flex-col">
                       {posts.map(post => (
                           <div key={post.id} className="p-8 border-b border-neutral-900/50 flex flex-col gap-4 group hover:bg-white/5 transition-colors">
                               <div className="flex items-center justify-between">
                                   <span className="text-[9px] uppercase tracking-widest text-neutral-500">
                                       {new Date(post.timestamp).toLocaleDateString()}
                                   </span>
                                   <span className="text-[9px] uppercase tracking-widest text-neutral-500">
                                       {post.locationName}
                                   </span>
                               </div>
                               <p className="font-serif text-xl italic text-neutral-300 leading-relaxed group-hover:text-white transition-colors">
                                   {post.caption}
                               </p>
                           </div>
                       ))}
                       {posts.length === 0 && (
                            <div className="py-20 flex flex-col items-center justify-center text-neutral-700 gap-2">
                               <span className="text-2xl font-serif italic opacity-20">No entries</span>
                           </div>
                       )}
                   </div>
               )}
           </div>
       </div>
    </div>
  );
};