
import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { User } from '../types';
import { Loader2, Upload, ArrowRight, User as UserIcon, AlertCircle } from 'lucide-react';

interface OnboardingProps {
  userId: string;
  email: string;
  onComplete: (user: User) => void;
  isMockMode?: boolean;
}

export const Onboarding: React.FC<OnboardingProps> = ({ userId, email, onComplete, isMockMode = false }) => {
  const [step, setStep] = useState<number>(0); // 0 = Welcome, 1 = Name, 2 = Photo, 3 = Bio
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    username: '',
    displayName: '',
    bio: '',
    avatarUrl: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Auto focus logic
  useEffect(() => {
    if (step === 1) {
        setTimeout(() => nameInputRef.current?.focus(), 500);
    }
  }, [step]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Read and resize
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 300;
            let width = img.width;
            let height = img.height;
            
            if (width > height) {
                if (width > MAX_SIZE) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                }
            } else {
                if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            setFormData(prev => ({ ...prev, avatarUrl: dataUrl }));
        };
        img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleNext = () => {
      setError(null);
      if (step === 1) {
          if (!formData.username.trim()) return setError("Please enter a username.");
          if (formData.username.length < 3) return setError("Username too short.");
          setStep(2);
      } else if (step === 2) {
          if (!formData.displayName.trim()) {
              setFormData(prev => ({ ...prev, displayName: formData.username }));
          }
          setStep(3);
      }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
        const finalAvatar = formData.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${formData.username}`;
        const finalDisplayName = formData.displayName || formData.username;
        
        const newUser: User = {
            id: userId,
            username: formData.username,
            displayName: finalDisplayName,
            avatarUrl: finalAvatar,
            bio: formData.bio,
            followers: 0,
            following: 0
        };

        if (isMockMode) {
             await new Promise(resolve => setTimeout(resolve, 2000));
             localStorage.setItem('hippocam_mock_profile', JSON.stringify(newUser));
             onComplete(newUser);
             return;
        }

        const { error: insertError } = await supabase
            .from('profiles')
            .upsert([
                {
                    id: userId,
                    username: formData.username.toLowerCase(),
                    display_name: finalDisplayName,
                    avatar_url: finalAvatar,
                    bio: formData.bio
                }
            ]);

        if (insertError) throw insertError;

        onComplete(newUser);

    } catch (err: any) {
        console.error("Onboarding Error:", err);
        const message = err.message || String(err);
        setError(message);
        
        if (err.code === '23505') {
            setError("Username taken. Please choose another.");
            setStep(1);
        }
    } finally {
        setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          if (step === 3) handleSubmit();
          else handleNext();
      }
  };

  return (
    <div className="h-[100dvh] w-full bg-[#050505] text-white flex flex-col items-center justify-center p-8 relative overflow-hidden font-sans selection:bg-white/20">
        
        {/* Ambient Breath Background */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0a0a0a] to-[#000] z-0" />
        <div className="absolute w-[500px] h-[500px] bg-neutral-900/10 rounded-full blur-3xl animate-pulse top-[-100px] left-[-100px] pointer-events-none" />

        {/* Content Container */}
        <div className="w-full max-w-md z-10 flex flex-col items-center min-h-[400px] justify-center transition-all duration-1000 ease-in-out">
            
            {/* WELCOME PHASE */}
            {step === 0 && (
                <div className="flex flex-col items-center animate-in fade-in duration-1000 slide-in-from-bottom-4 text-center">
                    <h1 className="text-4xl font-light tracking-tight mb-6 text-white/90">
                        Begin your Journey.
                    </h1>
                    <p className="text-neutral-500 font-light mb-12 max-w-xs leading-relaxed">
                        Create a travel profile to document your observations.
                    </p>
                    <button 
                        onClick={() => setStep(1)}
                        className="group flex items-center gap-4 text-sm uppercase tracking-[0.2em] text-neutral-400 hover:text-white transition-all"
                    >
                        Start
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </button>
                </div>
            )}

            {/* ERROR TOAST */}
            {error && (
                <div className="absolute top-12 animate-in fade-in slide-in-from-top-2">
                    <span className="text-red-400/80 text-xs tracking-widest font-mono border-b border-red-900/50 pb-1">
                        ERROR: {error}
                    </span>
                </div>
            )}

            {/* STEP 1: IDENTITY */}
            {step === 1 && (
                <div className="w-full animate-in fade-in zoom-in-95 duration-700 flex flex-col items-center">
                    <label className="text-neutral-500 text-xs uppercase tracking-[0.3em] mb-8 font-light">
                        Choose a Username
                    </label>
                    <input 
                        ref={nameInputRef}
                        type="text" 
                        value={formData.username}
                        onChange={(e) => setFormData({...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')})}
                        onKeyDown={handleKeyDown}
                        className="w-full bg-transparent border-b border-neutral-800 py-4 text-3xl font-light text-center focus:border-neutral-500 outline-none transition-all placeholder-neutral-900 text-white"
                        placeholder="username"
                        spellCheck={false}
                        enterKeyHint="next"
                    />
                    <div className="mt-8">
                        <button 
                            onClick={handleNext}
                            className="h-12 px-10 border border-neutral-800 text-white hover:bg-white hover:text-black hover:border-white transition-all uppercase text-xs tracking-[0.2em]"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 2: VISUAL */}
            {step === 2 && (
                <div className="w-full animate-in fade-in zoom-in-95 duration-700 flex flex-col items-center">
                     <label className="text-neutral-500 text-xs uppercase tracking-[0.3em] mb-8 font-light">
                        Profile Picture
                    </label>
                    
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-40 h-40 rounded-full bg-[#0a0a0a] border border-neutral-800 flex items-center justify-center cursor-pointer hover:border-neutral-600 transition-all group relative overflow-hidden"
                    >
                        {formData.avatarUrl ? (
                            <img src={formData.avatarUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                        ) : (
                            <div className="flex flex-col items-center gap-2 text-neutral-700 group-hover:text-neutral-400 transition-colors">
                                <Upload size={20} strokeWidth={1} />
                                <span className="text-[9px] uppercase tracking-widest">Upload</span>
                            </div>
                        )}
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />

                    <div className="mt-8 w-2/3">
                        <input 
                            type="text" 
                            value={formData.displayName}
                            onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                            onKeyDown={handleKeyDown}
                            className="w-full bg-transparent text-center text-sm uppercase tracking-widest text-neutral-400 focus:text-white outline-none placeholder-neutral-800"
                            placeholder="Display Name (Optional)"
                            enterKeyHint="next"
                        />
                    </div>

                    <div className="mt-8 flex gap-4 items-center">
                        <button onClick={() => setStep(1)} className="h-12 px-6 text-neutral-600 hover:text-white text-[10px] uppercase tracking-widest">Back</button>
                        <button 
                            onClick={handleNext} 
                            className="h-12 px-10 border border-neutral-800 text-white hover:bg-white hover:text-black hover:border-white transition-all uppercase text-xs tracking-[0.2em]"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 3: BIO */}
            {step === 3 && (
                <div className="w-full animate-in fade-in zoom-in-95 duration-700 flex flex-col items-center">
                    <label className="text-neutral-500 text-xs uppercase tracking-[0.3em] mb-8 font-light">
                        About You
                    </label>
                    
                    <textarea 
                        value={formData.bio}
                        onChange={(e) => setFormData({...formData, bio: e.target.value})}
                        onKeyDown={handleKeyDown}
                        maxLength={100}
                        className="w-full bg-transparent border-l border-neutral-800 pl-6 py-2 text-xl font-light text-neutral-300 focus:text-white focus:border-neutral-600 outline-none transition-colors placeholder-neutral-800 resize-none h-32 leading-relaxed"
                        placeholder="Where are you traveling?"
                        autoFocus
                        enterKeyHint="done"
                    />
                    
                    <div className="w-full flex justify-end mt-2">
                        <span className="text-[9px] text-neutral-700 tracking-widest">{formData.bio.length} / 100</span>
                    </div>

                    <div className="mt-12">
                        <button 
                            onClick={handleSubmit} 
                            disabled={loading}
                            className="group relative px-8 py-3 border border-neutral-800 hover:bg-white hover:text-black hover:border-white transition-all duration-500 uppercase text-xs tracking-[0.2em]"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={16} />
                            ) : (
                                "Complete Profile"
                            )}
                        </button>
                    </div>
                    
                    <button onClick={() => setStep(2)} className="mt-8 text-neutral-800 hover:text-neutral-600 text-[9px] uppercase tracking-widest transition-colors">
                        Go Back
                    </button>
                </div>
            )}
        </div>
    </div>
  );
};
