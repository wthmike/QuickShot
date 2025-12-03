
import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Loader2, ArrowRight, Mail, AlertCircle } from 'lucide-react';

interface AuthProps {
    isMockMode?: boolean;
    onMockLogin?: (email: string) => void;
}

export const Auth: React.FC<AuthProps> = ({ isMockMode = false, onMockLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isMockMode) {
          // --- LOCAL SIMULATION ---
          await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network
          
          if (password.length < 6) {
              throw new Error("Password should be at least 6 characters");
          }

          // Simulate success
          if (onMockLogin) {
              onMockLogin(email);
          }
          return;
      }

      // --- REAL BACKEND ---
      if (isSignUp) {
        // 1. Sign Up
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (authError) throw authError;

        // If email confirmation is enabled in Supabase, session will be null, but user will exist.
        if (data.user && !data.session) {
            setVerificationSent(true);
        }
        // If email confirmation is disabled, session exists, and App.tsx will auto-redirect.
        
      } else {
        // Sign In
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // View: Verification Email Sent
  if (verificationSent) {
      return (
        <div className="h-[100dvh] w-full bg-[#050505] flex flex-col items-center justify-center p-6 text-white text-center">
             <div className="w-20 h-20 rounded-full bg-neutral-900 flex items-center justify-center mb-6 text-green-500 animate-in zoom-in duration-300">
                <Mail size={32} />
             </div>
             <h2 className="text-xl font-bold uppercase tracking-widest mb-2">Check your inbox</h2>
             <p className="text-neutral-500 max-w-xs mb-8">
                We've sent a confirmation link to <span className="text-white">{email}</span>. Please click it to verify your account.
             </p>
             <button 
                onClick={() => { setVerificationSent(false); setIsSignUp(false); }}
                className="text-xs uppercase tracking-widest border-b border-transparent hover:border-white pb-1 transition-all"
             >
                Back to Login
             </button>
        </div>
      );
  }

  // View: Login / Sign Up Form
  return (
    <div className="h-[100dvh] w-full bg-[#050505] flex flex-col items-center justify-center p-6 text-white relative overflow-hidden">
        
        {/* Ambient Background */}
        <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neutral-900/40 via-[#050505] to-[#050505] pointer-events-none" />

        <div className="z-10 w-full max-w-sm flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center">
                <h1 className="text-3xl font-black tracking-[0.2em] uppercase mb-2">HippoCam</h1>
                <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-500">
                    {isMockMode ? "Local Simulation Mode" : "Analog Social Network"}
                </p>
            </div>

            <form onSubmit={handleAuth} className="flex flex-col gap-6">
                {error && (
                    <div className="bg-red-900/20 border border-red-900/50 text-red-400 text-xs p-4 text-center uppercase tracking-wide flex items-center justify-center gap-2">
                        <AlertCircle size={14} />
                        {error}
                    </div>
                )}

                <div className="space-y-5">
                    <div className="group relative">
                        <input 
                            type="email" 
                            required 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="peer w-full bg-transparent border-b border-neutral-800 py-3 text-lg focus:border-white outline-none transition-colors placeholder-transparent"
                            placeholder="Email"
                            id="email"
                        />
                        <label 
                            htmlFor="email"
                            className="absolute left-0 top-3 text-neutral-500 text-lg transition-all peer-focus:-top-4 peer-focus:text-xs peer-focus:text-neutral-400 peer-focus:tracking-widest peer-[&:not(:placeholder-shown)]:-top-4 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-neutral-400 peer-[&:not(:placeholder-shown)]:tracking-widest pointer-events-none uppercase"
                        >
                            Email
                        </label>
                    </div>

                    <div className="group relative">
                        <input 
                            type="password" 
                            required 
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="peer w-full bg-transparent border-b border-neutral-800 py-3 text-lg focus:border-white outline-none transition-colors placeholder-transparent"
                            placeholder="Password"
                            id="password"
                        />
                         <label 
                            htmlFor="password"
                            className="absolute left-0 top-3 text-neutral-500 text-lg transition-all peer-focus:-top-4 peer-focus:text-xs peer-focus:text-neutral-400 peer-focus:tracking-widest peer-[&:not(:placeholder-shown)]:-top-4 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-neutral-400 peer-[&:not(:placeholder-shown)]:tracking-widest pointer-events-none uppercase"
                        >
                            Password
                        </label>
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className="mt-6 h-14 bg-white text-black font-bold uppercase tracking-widest text-sm hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin" /> : (
                        <>
                            {isSignUp ? 'Join Network' : 'Enter'} <ArrowRight size={16} />
                        </>
                    )}
                </button>
            </form>

            <div className="text-center pt-4">
                <button 
                    onClick={() => { setIsSignUp(!isSignUp); setError(null); setVerificationSent(false); }}
                    className="text-[10px] uppercase tracking-[0.2em] text-neutral-600 hover:text-white transition-colors"
                >
                    {isSignUp ? "Already have an account? Sign In" : "New User? Request Access"}
                </button>
            </div>
        </div>
    </div>
  );
};
