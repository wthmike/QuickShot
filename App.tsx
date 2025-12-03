import React, { useState, useEffect } from 'react';
import { CameraView } from './components/Camera';
import { Gallery } from './components/Gallery';
import { PhotoDetail } from './components/PhotoDetail';
import { Photo, AppView } from './types';
import { initDB, getAllPhotos, savePhoto, deletePhoto } from './services/storageService';

const STORAGE_KEY = 'naturecam_photos'; // Kept for migration purposes only

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.CAMERA);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize DB and Load photos on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        await initDB();
        
        // --- MIGRATION: Check for legacy localStorage data ---
        const legacyData = localStorage.getItem(STORAGE_KEY);
        if (legacyData) {
            try {
                const parsed = JSON.parse(legacyData);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    console.log(`Migrating ${parsed.length} photos to IndexedDB...`);
                    // Save all legacy photos to DB
                    for (const p of parsed) {
                        await savePhoto(p);
                    }
                }
                // Clear legacy storage to free up quota and prevent re-migration
                localStorage.removeItem(STORAGE_KEY);
            } catch (e) {
                console.error("Migration failed", e);
            }
        }
        // -----------------------------------------------------

        const dbPhotos = await getAllPhotos();
        // Sort by newest first
        dbPhotos.sort((a, b) => b.timestamp - a.timestamp);
        setPhotos(dbPhotos);
      } catch (e) {
        console.error("Failed to initialize database", e);
      } finally {
        setIsInitializing(false);
      }
    };
    
    initialize();
  }, []);

  const handleCapture = async (photo: Photo) => {
    // Optimistic update
    setPhotos(prev => [photo, ...prev]);
    try {
        await savePhoto(photo);
    } catch (e) {
        console.error("Failed to save capture", e);
    }
  };

  const handleUpdatePhoto = async (updatedPhoto: Photo) => {
    // Optimistic update
    setPhotos(prev => prev.map(p => p.id === updatedPhoto.id ? updatedPhoto : p));
    try {
        await savePhoto(updatedPhoto);
    } catch (e) {
        console.error("Failed to update photo", e);
    }
  };

  const handleDeletePhoto = async (id: string) => {
    // Optimistic update
    setPhotos(prev => prev.filter(p => p.id !== id));
    if (selectedPhotoId === id) {
      setSelectedPhotoId(null);
      setView(AppView.GALLERY);
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
      return <div className="h-[100dvh] w-full bg-[#050505]" />; // Silent load
  }

  return (
    <div className="h-[100dvh] w-full bg-black text-white font-sans overflow-hidden">
      {view === AppView.CAMERA && (
        <CameraView 
          onCapture={handleCapture}
          onOpenGallery={() => setView(AppView.GALLERY)}
          lastPhotoThumbnail={photos[0]?.processedUrl || photos[0]?.originalUrl}
        />
      )}

      {view === AppView.GALLERY && (
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
          onBack={() => setView(AppView.GALLERY)}
          onUpdatePhoto={handleUpdatePhoto}
          onDelete={handleDeletePhoto}
        />
      )}
    </div>
  );
};

export default App;