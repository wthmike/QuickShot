
import React, { useEffect, useState } from 'react';
import { User, Post } from '../types';
import { getMyProfile, CURRENT_USER } from '../services/socialService';
import { LogOut, Grid, Map, Camera } from 'lucide-react';

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
        getMyProfile().then(data => setPosts(data.posts));
    } else {
        getMyProfile().then(data => {
            setUser(data.user);
            setPosts(data.posts);
        });
    }
  }, [currentUser]);

  return (
    <div className="h-full overflow-y-auto bg-[#0f0f11] pb-24 text-white">
       
       {/* Top Bar */}
       <div className="px-6 pt-6 pb-2 flex items-center justify-end">
            {onLogout && (
                <button 
                    onClick={onLogout} 
                    className="text-xs font-medium text-neutral-500 hover:text-white transition-colors flex items-center gap-2"
                >
                    Log Out <LogOut size={12} />
                </button>
            )}
       </div>

       {/* Profile Header */}
       <div className="px-6 mb-8">
            <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full p-1 border border-neutral-800 mb-4 bg-neutral-900">
                    <img 
                        src={user.avatarUrl} 
                        className="w-full h-full rounded-full object-cover" 
                        alt="Profile"
                    />
                </div>
                <h1 className="text-xl font-bold mb-1">{user.displayName}</h1>
                <p className="text-sm text-neutral-500 font-medium mb-3">@{user.username}</p>
                <div className="max-w-xs">
                     <p className="text-sm text-neutral-400 font-serif italic leading-relaxed">
                        {user.bio || "Just exploring nature."}
                    </p>
                </div>
            </div>
       </div>

       {/* Stats Strip */}
       <div className="w-full border-y border-neutral-800 flex divide-x divide-neutral-800 mb-8 bg-[#18181b]/50">
            <div className="flex-1 py-3 flex flex-col items-center justify-center">
                <span className="text-lg font-bold">{posts.length}</span>
                <span className="text-[10px] text-neutral-500 font-medium uppercase tracking-wide">Snaps</span>
            </div>
            <div className="flex-1 py-3 flex flex-col items-center justify-center">
                <span className="text-lg font-bold">{user.followers}</span>
                <span className="text-[10px] text-neutral-500 font-medium uppercase tracking-wide">Friends</span>
            </div>
            <div className="flex-1 py-3 flex flex-col items-center justify-center">
                <span className="text-lg font-bold">{user.following}</span>
                <span className="text-[10px] text-neutral-500 font-medium uppercase tracking-wide">Following</span>
            </div>
       </div>

       {/* Archive Access */}
       <div className="px-6 mb-8">
            <button 
                onClick={onOpenLocalGallery}
                className="w-full h-12 bg-neutral-800 rounded-lg text-white flex items-center justify-center gap-2 hover:bg-neutral-700 transition-colors"
            >
                <Camera size={16} />
                <span className="text-sm font-medium">My Camera Roll</span>
            </button>
       </div>

       {/* Content Tabs */}
       <div className="border-b border-neutral-800 mb-1 flex">
            <button 
                onClick={() => setActiveTab('grid')}
                className={`flex-1 py-3 flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'grid' ? 'border-white text-white' : 'border-transparent text-neutral-600'}`}
            >
                <Grid size={16} />
                <span className="text-xs font-bold">Grid</span>
            </button>
            <button 
                 onClick={() => setActiveTab('journal')}
                 className={`flex-1 py-3 flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'journal' ? 'border-white text-white' : 'border-transparent text-neutral-600'}`}
            >
                <Map size={16} />
                <span className="text-xs font-bold">Timeline</span>
            </button>
       </div>

       {/* Content Grid */}
       {activeTab === 'grid' ? (
           <div className="grid grid-cols-3 gap-0.5">
              {posts.map(post => (
                  <div key={post.id} className="aspect-square bg-neutral-900 relative group overflow-hidden cursor-pointer">
                      <img 
                        src={post.mainImageUrl} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                      />
                  </div>
              ))}
              {/* Empty state */}
              {posts.length === 0 && (
                   <div className="col-span-3 py-12 flex flex-col items-center text-neutral-600">
                        <Camera size={32} className="mb-2 opacity-50" />
                        <span className="text-xs">No entries yet.</span>
                   </div>
              )}
           </div>
       ) : (
           <div className="flex flex-col gap-0">
                {posts.map(post => (
                    <div key={post.id} className="flex gap-4 p-4 border-b border-neutral-900">
                        <div className="w-16 h-16 bg-neutral-900 rounded-md overflow-hidden flex-shrink-0">
                             <img src={post.mainImageUrl} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col justify-center">
                            <span className="text-xs text-neutral-500 mb-1">{new Date(post.timestamp).toLocaleDateString()}</span>
                            <p className="text-sm text-neutral-300 font-serif italic line-clamp-2">"{post.caption}"</p>
                            {post.locationName && (
                                <span className="text-[10px] text-green-500 font-medium mt-1 flex items-center gap-1">
                                    <Map size={10} /> {post.locationName}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
           </div>
       )}
    </div>
  );
};
