
import React, { useEffect, useState } from 'react';
import { User, Post } from '../types';
import { getMyProfile, CURRENT_USER } from '../services/socialService';
import { Archive, LogOut, Aperture, Layers, Grid } from 'lucide-react';

interface ProfileProps {
    onOpenLocalGallery: () => void;
    currentUser?: User;
    onLogout?: () => void;
}

export const Profile: React.FC<ProfileProps> = ({ onOpenLocalGallery, currentUser, onLogout }) => {
  const [user, setUser] = useState<User>(currentUser || CURRENT_USER);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<'contact_sheet' | 'stream'>('contact_sheet');

  useEffect(() => {
    if (currentUser) {
        setUser(currentUser);
        getMyProfile().then(data => setPosts(data.posts));
    } else {
        getMyProfile().then(data => {
            setUser(data.user);
            setPosts(data.posts);
        });
    }
  }, [currentUser]);

  return (
    <div className="h-full overflow-y-auto bg-[#050505] pb-24 text-white font-sans">
       
       {/* Top Bar / Status */}
       <div className="px-6 pt-8 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Online</span>
            </div>
            {onLogout && (
                <button 
                    onClick={onLogout} 
                    className="text-[10px] uppercase tracking-[0.2em] text-neutral-600 hover:text-red-500 transition-colors flex items-center gap-2"
                >
                    Log Out <LogOut size={10} />
                </button>
            )}
       </div>

       {/* ID CARD SECTION */}
       <div className="px-6 mb-8">
            {/* Passport Photo & Main Info */}
            <div className="flex gap-6 items-start">
                <div className="w-24 h-24 bg-neutral-900 border border-neutral-800 p-1 flex-shrink-0">
                    <img 
                        src={user.avatarUrl} 
                        className="w-full h-full object-cover grayscale contrast-125" 
                        alt="ID"
                    />
                </div>
                <div className="flex-1 flex flex-col justify-between h-24 py-1">
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-wider leading-none mb-1">{user.username}</h1>
                        <p className="text-xs text-neutral-400 font-mono">{user.displayName}</p>
                    </div>
                    <div className="border-t border-dashed border-neutral-800 pt-2 mt-auto">
                        <p className="text-[10px] text-neutral-500 uppercase tracking-widest line-clamp-2 leading-relaxed">
                            {user.bio || "No info available."}
                        </p>
                    </div>
                </div>
            </div>
       </div>

       {/* DATA STRIP */}
       <div className="w-full border-y border-neutral-900 flex divide-x divide-neutral-900 mb-8">
            <div className="flex-1 py-4 flex flex-col items-center justify-center">
                <span className="text-xl font-bold font-mono">{posts.length}</span>
                <span className="text-[8px] uppercase tracking-[0.25em] text-neutral-600 mt-1">Photos</span>
            </div>
            <div className="flex-1 py-4 flex flex-col items-center justify-center">
                <span className="text-xl font-bold font-mono">{user.followers}</span>
                <span className="text-[8px] uppercase tracking-[0.25em] text-neutral-600 mt-1">Followers</span>
            </div>
            <div className="flex-1 py-4 flex flex-col items-center justify-center">
                <span className="text-xl font-bold font-mono">{user.following}</span>
                <span className="text-[8px] uppercase tracking-[0.25em] text-neutral-600 mt-1">Following</span>
            </div>
       </div>

       {/* ARCHIVE CONTROLS */}
       <div className="px-6 mb-6">
            <button 
                onClick={onOpenLocalGallery}
                className="w-full h-12 bg-white text-black flex items-center justify-between px-4 hover:bg-neutral-200 transition-colors group"
            >
                <div className="flex items-center gap-3">
                    <Archive size={16} />
                    <span className="text-xs font-bold uppercase tracking-widest">Open Camera Roll</span>
                </div>
                <div className="w-1.5 h-1.5 bg-black rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
       </div>

       {/* FEED HEADER */}
       <div className="px-6 mb-4 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-neutral-500">Journal</span>
            <div className="flex gap-4">
                <button 
                    onClick={() => setActiveTab('contact_sheet')}
                    className={`transition-colors ${activeTab === 'contact_sheet' ? 'text-white' : 'text-neutral-700'}`}
                >
                    <Grid size={14} />
                </button>
                <button 
                     onClick={() => setActiveTab('stream')}
                     className={`transition-colors ${activeTab === 'stream' ? 'text-white' : 'text-neutral-700'}`}
                >
                    <Layers size={14} />
                </button>
            </div>
       </div>

       {/* CONTENT GRID (CONTACT SHEET STYLE) */}
       {activeTab === 'contact_sheet' ? (
           <div className="grid grid-cols-4 gap-0.5 px-0.5">
              {posts.map(post => (
                  <div key={post.id} className="aspect-square bg-neutral-900 relative group overflow-hidden">
                      <img 
                        src={post.mainImageUrl} 
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" 
                      />
                      {/* Film sprocket decoration concept */}
                      <div className="absolute top-0 bottom-0 left-0 w-1 bg-black z-10 opacity-20" />
                      <div className="absolute top-0 bottom-0 right-0 w-1 bg-black z-10 opacity-20" />
                  </div>
              ))}
              {/* Empty state fillers for the grid look */}
              {[...Array(Math.max(0, 16 - posts.length))].map((_, i) => (
                 <div key={i} className="aspect-square bg-neutral-900/30 flex items-center justify-center">
                    <div className="w-1 h-1 bg-neutral-800 rounded-full" />
                 </div>
              ))}
           </div>
       ) : (
           /* ALTERNATE STREAM VIEW */
           <div className="flex flex-col gap-8 px-6">
                {posts.map(post => (
                    <div key={post.id} className="border-l border-neutral-800 pl-4 py-2">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[9px] font-mono text-neutral-500">{new Date(post.timestamp).toLocaleDateString()}</span>
                            <div className="h-[1px] flex-1 bg-neutral-900" />
                        </div>
                        <div className="aspect-[3/4] w-24 bg-neutral-900 mb-2">
                            <img src={post.mainImageUrl} className="w-full h-full object-cover" />
                        </div>
                        <p className="text-xs text-neutral-400 line-clamp-1">{post.caption}</p>
                    </div>
                ))}
           </div>
       )}
    </div>
  );
};
