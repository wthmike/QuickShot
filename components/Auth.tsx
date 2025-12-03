
import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Loader2, ArrowRight } from 'lucide-react';

export const Auth: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        // 1. Sign Up
        const { error: authError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (authError) throw authError;

        // Success - UI will update via App.tsx session listener
        // The App component will detect missing profile and show Onboarding
      } else {
        // Sign In
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-[#050505] flex flex-col items-center justify-center p-6 text-white relative overflow-hidden">
        
        {/* Background Visuals */}
        <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neutral-900/40 via-[#050505] to-[#050505] pointer-events-none" />

        <div className="z-10 w-full max-w-sm flex flex-col gap-8">
            <div className="text-center">
                <h1 className="text-2xl font-black tracking-widest uppercase mb-2">HippoCam</h1>
                <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-500">Analog Social Network</p>
            </div>

            <form onSubmit={handleAuth} className="flex flex-col gap-5">
                {error && (
                    <div className="bg-red-500/10 border border-red-900 text-red-500 text-xs p-3 text-center uppercase tracking-wide">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <div className="group">
                        <label className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1 block group-focus-within:text-white transition-colors">Email</label>
                        <input 
                            type="email" 
                            required 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-transparent border-b border-neutral-800 py-2 text-lg focus:border-white outline-none transition-colors placeholder-neutral-800"
                            placeholder="hello@example.com"
                        />
                    </div>

                    <div className="group">
                        <label className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1 block group-focus-within:text-white transition-colors">Password</label>
                        <input 
                            type="password" 
                            required 
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-transparent border-b border-neutral-800 py-2 text-lg focus:border-white outline-none transition-colors placeholder-neutral-800"
                            placeholder="••••••"
                        />
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className="mt-4 h-14 bg-white text-black font-bold uppercase tracking-widest text-sm hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin" /> : (
                        <>
                            {isSignUp ? 'Create Account' : 'Enter'} <ArrowRight size={16} />
                        </>
                    )}
                </button>
            </form>

            <div className="text-center">
                <button 
                    onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
                    className="text-[10px] uppercase tracking-[0.2em] text-neutral-600 hover:text-white transition-colors"
                >
                    {isSignUp ? "Already have an account?" : "Request Access (Sign Up)"}
                </button>
            </div>
        </div>
    </div>
  );
};
