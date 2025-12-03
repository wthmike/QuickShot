
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
    <div className="h-[100dvh] w-full bg-[#0f0f11] text-white flex flex-col items-center justify-center p-8 relative overflow-hidden font-sans selection:bg-white/20">
        
        {/* Ambient Breath Background */}
        <div className="absolute inset-0 bg-[#0f0f11] z-0" />
        {/* Soft natural gradient spot */}
        <div className="absolute w-[600px] h-[600px] bg-green-900/10 rounded-full blur-3xl top-[-200px] right-[-200px] pointer-events-none" />

        {/* Content Container */}
        <div className="w-full max-w-md z-10 flex flex-col items-center min-h-[400px] justify-center transition-all duration-1000 ease-in-out">
            
            {/* WELCOME PHASE */}
            {step === 0 && (
                <div className="flex flex-col items-center animate-in fade-in duration-1000 slide-in-from-bottom-4 text-center">
                    <h1 className="text-4xl font-serif italic mb-6 text-white/90">
                        Start your log.
                    </h1>
                    <p className="text-neutral-500 font-medium mb-12 max-w-xs leading-relaxed text-sm">
                        A quiet place to document your hikes, travels, and observations.
                    </p>
                    <button 
                        onClick={() => setStep(1)}
                        className="group flex items-center gap-4 text-sm font-bold text-white bg-neutral-800 hover:bg-neutral-700 px-8 py-3 rounded-full transition-all"
                    >
                        Begin Setup
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </button>
                </div>
            )}

            {/* ERROR TOAST */}
            {error && (
                <div className="absolute top-12 animate-in fade-in slide-in-from-top-2">
                    <span className="text-red-400 text-sm font-medium bg-red-900/20 px-4 py-2 rounded-full">
                        {error}
                    </span>
                </div>
            )}

            {/* STEP 1: IDENTITY */}
            {step === 1 && (
                <div className="w-full animate-in fade-in zoom-in-95 duration-700 flex flex-col items-center">
                    <label className="text-neutral-500 text-sm font-medium mb-8">
                        What should we call you?
                    </label>
                    <input 
                        ref={nameInputRef}
                        type="text" 
                        value={formData.username}
                        onChange={(e) => setFormData({...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')})}
                        onKeyDown={handleKeyDown}
                        className="w-full bg-transparent border-b border-neutral-800 py-4 text-3xl font-bold text-center focus:border-white outline-none transition-all placeholder-neutral-800 text-white"
                        placeholder="username"
                        spellCheck={false}
                        enterKeyHint="next"
                    />
                    <div className="mt-8">
                        <button 
                            onClick={handleNext}
                            className="h-12 px-10 bg-white text-black rounded-full font-bold text-sm hover:bg-neutral-200 transition-all"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 2: VISUAL */}
            {step === 2 && (
                <div className="w-full animate-in fade-in zoom-in-95 duration-700 flex flex-col items-center">
                     <label className="text-neutral-500 text-sm font-medium mb-8">
                        Add a photo
                    </label>
                    
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-32 h-32 rounded-full bg-[#18181b] border border-neutral-800 flex items-center justify-center cursor-pointer hover:border-neutral-600 transition-all group relative overflow-hidden"
                    >
                        {formData.avatarUrl ? (
                            <img src={formData.avatarUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                        ) : (
                            <div className="flex flex-col items-center gap-2 text-neutral-600 group-hover:text-neutral-400 transition-colors">
                                <Upload size={20} strokeWidth={2} />
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
                            className="w-full bg-transparent text-center text-lg font-medium text-white focus:text-white outline-none placeholder-neutral-700"
                            placeholder="Display Name (Optional)"
                            enterKeyHint="next"
                        />
                    </div>

                    <div className="mt-8 flex gap-4 items-center">
                        <button onClick={() => setStep(1)} className="text-neutral-500 hover:text-white text-sm font-medium px-4">Back</button>
                        <button 
                            onClick={handleNext} 
                            className="h-12 px-10 bg-white text-black rounded-full font-bold text-sm hover:bg-neutral-200 transition-all"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 3: BIO */}
            {step === 3 && (
                <div className="w-full animate-in fade-in zoom-in-95 duration-700 flex flex-col items-center">
                    <label className="text-neutral-500 text-sm font-medium mb-8">
                        Your short bio
                    </label>
                    
                    <textarea 
                        value={formData.bio}
                        onChange={(e) => setFormData({...formData, bio: e.target.value})}
                        onKeyDown={handleKeyDown}
                        maxLength={100}
                        className="w-full bg-transparent border border-neutral-800 rounded-xl p-4 text-lg font-serif italic text-white focus:border-neutral-600 outline-none transition-colors placeholder-neutral-800 resize-none h-32 leading-relaxed text-center"
                        placeholder="Hiker. Dreamer. Etc."
                        autoFocus
                        enterKeyHint="done"
                    />
                    
                    <div className="w-full flex justify-end mt-2">
                        <span className="text-xs text-neutral-700 font-medium">{formData.bio.length} / 100</span>
                    </div>

                    <div className="mt-8">
                        <button 
                            onClick={handleSubmit} 
                            disabled={loading}
                            className="group relative px-8 py-3 bg-white text-black rounded-full font-bold text-sm hover:bg-neutral-200 transition-all"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={16} />
                            ) : (
                                "Complete Setup"
                            )}
                        </button>
                    </div>
                    
                    <button onClick={() => setStep(2)} className="mt-6 text-neutral-600 hover:text-white text-xs font-medium">
                        Go Back
                    </button>
                </div>
            )}
        </div>
    </div>
  );
};
