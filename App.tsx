
import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabase';
import { CameraView } from './components/Camera';
import { Gallery } from './components/Gallery';
import { PhotoDetail } from './components/PhotoDetail';
import { Feed } from './components/Feed';
import { Profile } from './components/Profile';
import { Navigation } from './components/Navigation';
import { Auth } from './components/Auth';
import { Onboarding } from './components/Onboarding';
import { Photo, AppView, User } from './types';
import { initDB, getAllPhotos, savePhoto, deletePhoto } from './services/storageService';
import { Loader2 } from 'lucide-react';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { CURRENT_USER } from './services/socialService';

const STORAGE_KEY = 'naturecam_photos';

// --- CONFIGURATION ---
// Set to TRUE to use LocalStorage instead of Supabase for Authentication.
const MOCK_AUTH_MODE = true; 

const App: React.FC = () => {
  const [session, setSession] = useState<Session | any | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [view, setView] = useState<AppView>(AppView.FEED);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [checkingProfile, setCheckingProfile] = useState(false);

  // State to track which profile we are viewing (null = my own, but we handle that logic in logic)
  // Actually, let's explicit: if string set, we are viewing that user.
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);

  // 1. Check Auth Session (Real or Mock)
  useEffect(() => {
    // DEV MODE: Start clean to allow manual login flow testing
    if (MOCK_AUTH_MODE) {
        // DIRECT BYPASS FOR PREVIEW
        setSession({ user: { id: CURRENT_USER.id, email: 'preview@hippocam.app' } });
        setUserProfile(CURRENT_USER);
        setView(AppView.FEED);
        setIsInitializing(false);
        return;
    }

    // REAL AUTH FLOW
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) setIsInitializing(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Fetch Profile when Session exists (Only for Real Auth now)
  useEffect(() => {
    if (MOCK_AUTH_MODE) return; // Handled in init

    const fetchProfile = async () => {
      if (!session?.user) return;
      
      setCheckingProfile(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (data) {
          const mappedUser: User = {
             id: data.id,
             username: data.username,
             displayName: data.display_name,
             avatarUrl: data.avatar_url,
             bio: data.bio || '',
             followers: 0, 
             following: 0
          };
          setUserProfile(mappedUser);
          if (view === AppView.ONBOARDING) {
              setView(AppView.FEED);
          }
        } else {
          setView(AppView.ONBOARDING);
        }
      } catch (e) {
        console.error("Profile fetch error", e);
      } finally {
        setCheckingProfile(false);
        setIsInitializing(false);
      }
    };

    if (session && !userProfile) {
      fetchProfile();
    }
  }, [session, view, userProfile]);

  // 3. Initialize DB and Load Local Photos
  useEffect(() => {
    const initializeDB = async () => {
      try {
        await initDB();
        
        // --- MIGRATION: Check for legacy localStorage data ---
        const legacyData = localStorage.getItem(STORAGE_KEY);
        if (legacyData) {
            try {
                const parsed = JSON.parse(legacyData);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    console.log(`Migrating ${parsed.length} photos to IndexedDB...`);
                    for (const p of parsed) {
                        await savePhoto(p);
                    }
                }
                localStorage.removeItem(STORAGE_KEY);
            } catch (e) {
                console.error("Migration failed", e);
            }
        }
        // -----------------------------------------------------

        const dbPhotos = await getAllPhotos();
        dbPhotos.sort((a, b) => b.timestamp - a.timestamp);
        setPhotos(dbPhotos);
      } catch (e) {
        console.error("Failed to initialize database", e);
      }
    };
    
    initializeDB();
  }, []);

  const handleCapture = async (photo: Photo) => {
    setPhotos(prev => [photo, ...prev]);
    try {
        await savePhoto(photo);
    } catch (e) {
        console.error("Failed to save capture", e);
    }
    setSelectedPhotoId(photo.id);
    setView(AppView.PHOTO_DETAIL);
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

  const handlePostComplete = () => {
    setView(AppView.FEED);
    setSelectedPhotoId(null);
  };

  const handleOnboardingComplete = (user: User) => {
      setUserProfile(user);
      setView(AppView.FEED);
  };

  const handleMockAuthSuccess = (email: string) => {
     setSession({ user: { id: 'dev-user-id', email } });
     setUserProfile(CURRENT_USER);
     setView(AppView.FEED);
  };

  const handleLogout = async () => {
      if (MOCK_AUTH_MODE) {
          window.location.reload();
      } else {
          await supabase.auth.signOut();
          setSession(null);
          setUserProfile(null);
      }
  };

  // Nav Handlers
  const handleChangeView = (newView: AppView) => {
      if (newView === AppView.PROFILE) {
          // If clicking Profile tab, view MY profile
          if (userProfile) {
              setViewingProfileId(userProfile.id);
          }
      }
      setView(newView);
  };

  const handleVisitProfile = (userId: string) => {
      setViewingProfileId(userId);
      setView(AppView.PROFILE);
  };

  const selectedPhoto = photos.find(p => p.id === selectedPhotoId);

  // Loading State
  if (isInitializing || checkingProfile) {
      return (
        <div className="h-[100dvh] w-full bg-[#050505] flex items-center justify-center">
            <Loader2 className="animate-spin text-neutral-800" />
        </div>
      );
  }

  // Auth Guard
  if (!session) {
      return (
        <Auth 
            isMockMode={MOCK_AUTH_MODE} 
            onMockLogin={handleMockAuthSuccess} 
        />
      );
  }

  // Onboarding Guard
  if (view === AppView.ONBOARDING) {
      return (
        <Onboarding 
            userId={session.user.id} 
            email={session.user.email} 
            onComplete={handleOnboardingComplete}
            isMockMode={MOCK_AUTH_MODE}
        />
      );
  }

  // Main App
  return (
    <div className="h-[100dvh] w-full bg-black text-white font-sans overflow-hidden flex flex-col">
      
      <div className="flex-1 overflow-hidden relative">
        
        {view === AppView.FEED && (
            <Feed onNavigateProfile={handleVisitProfile} />
        )}

        {view === AppView.PROFILE && userProfile && (
            <Profile 
                onOpenLocalGallery={() => setView(AppView.LOCAL_GALLERY)} 
                viewingUserId={viewingProfileId || userProfile.id}
                currentUserId={userProfile.id}
                onLogout={handleLogout}
                localPhotoCount={photos.length}
                onBack={() => setView(AppView.FEED)}
            />
        )}

        {view === AppView.CAMERA && (
          <CameraView 
            onCapture={handleCapture}
            onOpenGallery={() => setView(AppView.LOCAL_GALLERY)}
            onBack={() => setView(AppView.FEED)}
            lastPhotoThumbnail={photos[0]?.processedUrl || photos[0]?.originalUrl}
          />
        )}

        {view === AppView.LOCAL_GALLERY && (
          <Gallery 
            photos={photos}
            onSelect={handleSelectPhoto}
            onBack={() => {
                setViewingProfileId(userProfile!.id);
                setView(AppView.PROFILE);
            }}
            onDelete={handleDeletePhoto}
          />
        )}

        {view === AppView.PHOTO_DETAIL && selectedPhoto && (
          <PhotoDetail
            photo={selectedPhoto}
            onBack={() => setView(AppView.LOCAL_GALLERY)}
            onUpdatePhoto={handleUpdatePhoto}
            onDelete={handleDeletePhoto}
            onPostComplete={handlePostComplete}
            currentUser={userProfile || undefined}
          />
        )}
      </div>

      {(view === AppView.FEED || view === AppView.PROFILE || view === AppView.CAMERA) && (
          <Navigation currentView={view} onChangeView={handleChangeView} />
      )}
    </div>
  );
};

export default App;
