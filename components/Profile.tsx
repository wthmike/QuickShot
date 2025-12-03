
import React, { useEffect, useState } from 'react';
import { User, Post } from '../types';
import { getMyProfile, CURRENT_USER } from '../services/socialService';
import { Archive, Grid3X3, Settings } from 'lucide-react';

interface ProfileProps {
    onOpenLocalGallery: () => void;
    currentUser?: User;
}

export const Profile: React.FC<ProfileProps> = ({ onOpenLocalGallery, currentUser }) => {
  const [user, setUser] = useState<User>(currentUser || CURRENT_USER);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<'grid' | 'tagged'>('grid');

  useEffect(() => {
    // If we have a real user passed from App.tsx, use it.
    // Otherwise fallback to mock service fetch
    if (currentUser) {
        setUser(currentUser);
        // Still fetch posts (mocked for now, but conceptually linked)
        getMyProfile().then(data => setPosts(data.posts));
    } else {
        getMyProfile().then(data => {
            setUser(data.user);
            setPosts(data.posts);
        });
    }
  }, [currentUser]);

  return (
    <div className="h-full overflow-y-auto bg-[#050505] pb-24">
       {/* Header */}
       <div className="h-14 flex items-center justify-between px-6 border-b border-neutral-900 sticky top-0 bg-[#050505]/90 backdrop-blur z-20">
         <span className="font-bold text-sm tracking-widest">{user.username}</span>
         <button>
            <Settings size={18} className="text-white" />
         </button>
       </div>

       {/* Profile Info */}
       <div className="px-6 py-8 flex flex-col gap-6">
          <div className="flex items-center justify-between">
              <img src={user.avatarUrl} className="w-20 h-20 rounded-full border-2 border-neutral-800 object-cover" />
              <div className="flex gap-8 text-center">
                  <div>
                      <div className="text-lg font-bold">{posts.length}</div>
                      <div className="text-[9px] uppercase tracking-widest text-neutral-500">Posts</div>
                  </div>
                  <div>
                      <div className="text-lg font-bold">{user.followers}</div>
                      <div className="text-[9px] uppercase tracking-widest text-neutral-500">Followers</div>
                  </div>
                  <div>
                      <div className="text-lg font-bold">{user.following}</div>
                      <div className="text-[9px] uppercase tracking-widest text-neutral-500">Following</div>
                  </div>
              </div>
          </div>
          
          <div>
              <div className="font-bold text-white">{user.displayName}</div>
              <div className="text-sm text-neutral-400">{user.bio}</div>
          </div>

          {/* Access Local Archive */}
          <button 
            onClick={onOpenLocalGallery}
            className="w-full py-3 bg-neutral-900 border border-neutral-800 flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors"
          >
             <Archive size={16} />
             <span className="text-xs uppercase tracking-widest font-bold">Open Camera Archive</span>
          </button>
       </div>

       {/* Tabs */}
       <div className="flex items-center border-t border-b border-neutral-900 h-12 sticky top-14 bg-[#050505] z-10">
          <button 
            className={`flex-1 h-full flex items-center justify-center ${activeTab === 'grid' ? 'text-white' : 'text-neutral-600'}`}
            onClick={() => setActiveTab('grid')}
          >
              <Grid3X3 size={20} />
          </button>
       </div>

       {/* Grid */}
       <div className="grid grid-cols-3 gap-[1px]">
          {posts.map(post => (
              <div key={post.id} className="aspect-square bg-neutral-900 relative">
                  <img src={post.mainImageUrl} className="w-full h-full object-cover" />
              </div>
          ))}
          {/* Fill empty space visual */}
          {[...Array(Math.max(0, 9 - posts.length))].map((_, i) => (
             <div key={i} className="aspect-square bg-neutral-900/20" />
          ))}
       </div>
    </div>
  );
};
