
import React, { useState, useRef } from 'react';
import { supabase } from '../services/supabase';
import { User } from '../types';
import { Loader2, Camera, Upload, Check, ArrowRight, User as UserIcon } from 'lucide-react';

interface OnboardingProps {
  userId: string;
  email: string;
  onComplete: (user: User) => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ userId, email, onComplete }) => {
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    username: '',
    displayName: '',
    bio: '',
    avatarUrl: '' // We will store base64 here if needed
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Read and resize
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 200;
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
            
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            setFormData(prev => ({ ...prev, avatarUrl: dataUrl }));
        };
        img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleNext = () => {
      if (step === 1) {
          if (!formData.username.trim()) {
              setError("Username is required");
              return;
          }
          if (formData.username.length < 3) {
              setError("Username too short");
              return;
          }
          setError(null);
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
        // Final fallback for avatar
        const finalAvatar = formData.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${formData.username}`;
        const finalDisplayName = formData.displayName || formData.username;

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

        // Construct User object
        const newUser: User = {
            id: userId,
            username: formData.username,
            displayName: finalDisplayName,
            avatarUrl: finalAvatar,
            bio: formData.bio,
            followers: 0,
            following: 0
        };

        onComplete(newUser);

    } catch (err: any) {
        console.error(err);
        setError(err.message || "Setup failed. Try a different username.");
        // If error is duplicate key, it means username taken
        if (err.code === '23505') {
            setError("Username already taken.");
            setStep(1);
        }
    } finally {
        setLoading(false);
    }
  };

  // Generate a random avatar style if none uploaded
  const generateRandomAvatar = () => {
     setFormData(prev => ({ ...prev, avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${Date.now()}` }));
  };

  return (
    <div className="h-[100dvh] w-full bg-[#050505] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
        
        {/* Progress */}
        <div className="absolute top-8 w-full px-12 flex gap-2">
            {[1, 2, 3].map(i => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-white' : 'bg-neutral-800'}`} />
            ))}
        </div>

        <div className="w-full max-w-sm flex flex-col gap-8 z-10 animate-in fade-in zoom-in-95 duration-500">
            
            <div className="text-center mb-4">
                <h2 className="text-xs uppercase tracking-[0.3em] text-neutral-500 mb-2">Identity Setup</h2>
                <h1 className="text-3xl font-black uppercase tracking-wider">
                    {step === 1 && "Call Sign"}
                    {step === 2 && "Visual ID"}
                    {step === 3 && "Field Notes"}
                </h1>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-900 text-red-500 text-xs p-3 text-center uppercase tracking-wide">
                    {error}
                </div>
            )}

            {step === 1 && (
                <div className="flex flex-col gap-6">
                    <div className="group">
                        <label className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1 block">Username</label>
                        <input 
                            type="text" 
                            value={formData.username}
                            onChange={(e) => setFormData({...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')})}
                            className="w-full bg-transparent border-b border-neutral-800 py-4 text-2xl font-mono focus:border-white outline-none transition-colors placeholder-neutral-800"
                            placeholder="username"
                            autoFocus
                        />
                        <p className="text-[10px] text-neutral-600 mt-2">Unique identifier. Lowercase only.</p>
                    </div>

                    <button onClick={handleNext} className="h-14 bg-white text-black font-bold uppercase tracking-widest text-sm hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 mt-4">
                        Next <ArrowRight size={16} />
                    </button>
                </div>
            )}

            {step === 2 && (
                <div className="flex flex-col gap-6 items-center">
                    
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <div className="w-32 h-32 rounded-full border-2 border-neutral-800 overflow-hidden bg-neutral-900 flex items-center justify-center group-hover:border-white transition-colors">
                            {formData.avatarUrl ? (
                                <img src={formData.avatarUrl} className="w-full h-full object-cover" />
                            ) : (
                                <UserIcon size={48} className="text-neutral-700 group-hover:text-white transition-colors" />
                            )}
                        </div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full flex items-center justify-center text-black shadow-lg">
                            <Upload size={14} />
                        </div>
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                    
                    <button onClick={generateRandomAvatar} className="text-[10px] uppercase tracking-widest text-neutral-500 hover:text-white">
                        Generate Random Avatar
                    </button>

                    <div className="w-full mt-4">
                        <label className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1 block">Display Name</label>
                        <input 
                            type="text" 
                            value={formData.displayName}
                            onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                            className="w-full bg-transparent border-b border-neutral-800 py-2 text-xl focus:border-white outline-none transition-colors placeholder-neutral-800 text-center"
                            placeholder={formData.username || "Display Name"}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4 w-full mt-4">
                        <button onClick={() => setStep(1)} className="h-12 border border-neutral-800 text-neutral-500 hover:text-white font-bold uppercase tracking-widest text-xs transition-colors">
                            Back
                        </button>
                        <button onClick={handleNext} className="h-12 bg-white text-black font-bold uppercase tracking-widest text-xs hover:bg-neutral-200 transition-colors">
                            Next
                        </button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="flex flex-col gap-6">
                    <div className="group">
                        <label className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1 block">Bio</label>
                        <textarea 
                            value={formData.bio}
                            onChange={(e) => setFormData({...formData, bio: e.target.value})}
                            maxLength={100}
                            className="w-full bg-neutral-900/30 border border-neutral-800 p-4 text-lg focus:border-white outline-none transition-colors placeholder-neutral-700 resize-none h-32"
                            placeholder="Tell us about your photography..."
                            autoFocus
                        />
                        <div className="flex justify-end mt-2">
                             <span className="text-[10px] text-neutral-600">{formData.bio.length}/100</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 w-full mt-4">
                        <button onClick={() => setStep(2)} className="h-14 border border-neutral-800 text-neutral-500 hover:text-white font-bold uppercase tracking-widest text-xs transition-colors">
                            Back
                        </button>
                        <button 
                            onClick={handleSubmit} 
                            disabled={loading}
                            className="h-14 bg-white text-black font-bold uppercase tracking-widest text-xs hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : "Complete Setup"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
