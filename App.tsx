
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

const STORAGE_KEY = 'naturecam_photos';

// --- CONFIGURATION ---
// Set to TRUE to use LocalStorage instead of Supabase for Authentication.
// This allows you to "Sign Up" and "Login" using a local mock flow.
const MOCK_AUTH_MODE = true; 

const App: React.FC = () => {
  const [session, setSession] = useState<Session | any | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [view, setView] = useState<AppView>(AppView.FEED);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [checkingProfile, setCheckingProfile] = useState(false);

  // 1. Check Auth Session (Real or Mock)
  useEffect(() => {
    if (MOCK_AUTH_MODE) {
        // Check local storage for a "persisted" mock profile
        // If we find one, we treat the user as "Logged In"
        const storedProfile = localStorage.getItem('hippocam_mock_profile');
        if (storedProfile) {
            try {
                const user = JSON.parse(storedProfile);
                setSession({ user: { id: user.id, email: 'local@hippocam.app' } });
                setUserProfile(user);
            } catch (e) {
                console.error("Failed to parse mock profile", e);
            }
        }
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

  // 2. Fetch Profile when Session exists
  useEffect(() => {
    // If in Mock Mode, we already set the profile in Step 1.
    // However, if we just logged in via mock auth (handleMockAuthSuccess), we need to check.
    if (MOCK_AUTH_MODE) {
        if (session && !userProfile) {
            // Check storage again, maybe just signed up/logged in?
             const storedProfile = localStorage.getItem('hippocam_mock_profile');
             if (storedProfile) {
                setUserProfile(JSON.parse(storedProfile));
                if (view === AppView.ONBOARDING) setView(AppView.FEED);
             } else {
                 // Session exists (Auth passed) but no profile -> Onboarding
                 setView(AppView.ONBOARDING);
             }
        }
        return;
    }

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
          // Map Supabase profile to User type
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
          // If we were in onboarding/auth, go to feed
          if (view === AppView.ONBOARDING) {
              setView(AppView.FEED);
          }
        } else {
          // No profile found -> Onboarding
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

  // Mock handlers
  const handleMockAuthSuccess = (email: string) => {
      // Create a fake session. Effect will kick in to check if profile exists for this session.
      // For mock purposes, we generate a stable ID so persistence works if we used localstorage logic correctly.
      // But for simplicity, we just use a generic mock ID.
      setSession({ user: { id: 'mock_local_user', email } });
  };

  const handleLogout = async () => {
      if (MOCK_AUTH_MODE) {
          localStorage.removeItem('hippocam_mock_profile');
          setSession(null);
          setUserProfile(null);
          setView(AppView.FEED); // Will trigger Auth render
      } else {
          await supabase.auth.signOut();
          setSession(null);
          setUserProfile(null);
      }
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
            <Feed />
        )}

        {view === AppView.PROFILE && (
            <Profile 
                onOpenLocalGallery={() => setView(AppView.LOCAL_GALLERY)} 
                currentUser={userProfile || undefined}
                onLogout={handleLogout}
            />
        )}

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
            onBack={() => setView(AppView.PROFILE)}
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
          <Navigation currentView={view} onChangeView={setView} />
      )}
    </div>
  );
};

export default App;
