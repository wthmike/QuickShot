import React, { useState, useEffect } from 'react';
import { CameraView } from './components/Camera';
import { Gallery } from './components/Gallery';
import { PhotoDetail } from './components/PhotoDetail';
import { Photo, AppView } from './types';

// Helper to save to local storage (optional persistence)
const STORAGE_KEY = 'naturecam_photos';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.CAMERA);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);

  // Load photos on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setPhotos(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load photos", e);
      }
    }
  }, []);

  // Save photos on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
  }, [photos]);

  const handleCapture = (photo: Photo) => {
    setPhotos(prev => [photo, ...prev]);
  };

  const handleUpdatePhoto = (updatedPhoto: Photo) => {
    setPhotos(prev => prev.map(p => p.id === updatedPhoto.id ? updatedPhoto : p));
  };

  const handleDeletePhoto = (id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
    if (selectedPhotoId === id) {
      setSelectedPhotoId(null);
      setView(AppView.GALLERY);
    }
  };

  const handleSelectPhoto = (photo: Photo) => {
    setSelectedPhotoId(photo.id);
    setView(AppView.PHOTO_DETAIL);
  };

  const selectedPhoto = photos.find(p => p.id === selectedPhotoId);

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