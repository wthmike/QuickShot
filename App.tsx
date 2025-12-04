
import React, { useState, useEffect } from 'react';
import { CameraView } from './components/Camera';
import { Gallery } from './components/Gallery';
import { PhotoDetail } from './components/PhotoDetail';
import { Photo, AppView, User } from './types';
import { initDB, getAllPhotos, savePhoto, deletePhoto } from './services/storageService';
import { Loader2 } from 'lucide-react';

const STORAGE_KEY_USER = 'hippocam_user_profile';

const DEFAULT_USER: User = {
    id: 'local_guest',
    username: 'photographer',
    displayName: 'Chronicle',
    avatarUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=chronicle',
    bio: 'Local User'
};

const App: React.FC = () => {
  const [userProfile, setUserProfile] = useState<User>(DEFAULT_USER);
  const [view, setView] = useState<AppView>(AppView.CAMERA); 
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // 1. Initialize App (Load DB)
  useEffect(() => {
    const init = async () => {
      try {
        // Load User (Optional, if we want to allow editing later)
        const savedUser = localStorage.getItem(STORAGE_KEY_USER);
        if (savedUser) {
            setUserProfile(JSON.parse(savedUser));
        } else {
            // Ensure default is saved
            localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(DEFAULT_USER));
        }

        // Initialize DB
        await initDB();
        const dbPhotos = await getAllPhotos();
        dbPhotos.sort((a, b) => b.timestamp - a.timestamp);
        setPhotos(dbPhotos);

      } catch (e) {
        console.error("Init failed", e);
      } finally {
        setIsInitializing(false);
      }
    };
    init();
  }, []);

  const handleCapture = async (photo: Photo) => {
    // Optimistic update
    setPhotos(prev => [photo, ...prev]);
    
    // Save to DB
    try {
        await savePhoto(photo);
    } catch (e) {
        console.error("Failed to save capture", e);
    }

    // WORKFLOW UPDATE: Stay on Camera view.
    // We do NOT navigate to PHOTO_DETAIL anymore.
    // The Camera component will handle visual feedback via the updated gallery thumbnail.
  };

  const handleUpdatePhoto = async (updatedPhoto: Photo) => {
    setPhotos(prev => prev.map(p => p.id === updatedPhoto.id ? updatedPhoto : p));
    try {
        await savePhoto(updatedPhoto);
    } catch (e) {
        console.error("Failed to update photo", e);
    }
  };

  const handleDeletePhoto = async (id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
    if (selectedPhotoId === id) {
      setSelectedPhotoId(null);
      setView(AppView.LOCAL_GALLERY);
    }
    try {
        await deletePhoto(id);
    } catch (e) {
        console.error("Failed to delete photo", e);
    }
  };

  const handleSelectPhoto = (photo: Photo) => {
    setSelectedPhotoId(photo.id);
    setView(AppView.PHOTO_DETAIL);
  };

  const selectedPhoto = photos.find(p => p.id === selectedPhotoId);

  if (isInitializing) {
      return (
        <div className="h-[100dvh] w-full bg-[#050505] flex items-center justify-center">
            <Loader2 className="animate-spin text-neutral-800" />
        </div>
      );
  }

  // APP ROUTER
  return (
    <div className="h-[100dvh] w-full bg-black text-white font-sans overflow-hidden flex flex-col">
        
        {view === AppView.CAMERA && (
          <CameraView 
            onCapture={handleCapture}
            onOpenGallery={() => setView(AppView.LOCAL_GALLERY)}
            lastPhotoThumbnail={photos[0]?.processedUrl || photos[0]?.originalUrl}
          />
        )}

        {view === AppView.LOCAL_GALLERY && (
          <Gallery 
            photos={photos}
            onSelect={handleSelectPhoto}
            onBack={() => setView(AppView.CAMERA)}
            onDelete={handleDeletePhoto}
          />
        )}

        {view === AppView.PHOTO_DETAIL && selectedPhoto && (
          <PhotoDetail
            photo={selectedPhoto}
            onBack={() => setView(AppView.LOCAL_GALLERY)}
            onUpdatePhoto={handleUpdatePhoto}
            onDelete={handleDeletePhoto}
            currentUser={userProfile}
          />
        )}
    </div>
  );
};

export default App;
