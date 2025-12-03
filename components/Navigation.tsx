
import React from 'react';
import { LayoutGrid, UserCircle2 } from 'lucide-react';
import { AppView } from '../types';

interface NavigationProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentView, onChangeView }) => {
  
  // Hide nav on Camera view
  if (currentView === AppView.CAMERA) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 h-16 bg-[#111111]/90 backdrop-blur-md rounded-full border border-neutral-800 flex items-center px-2 gap-2 shadow-2xl shadow-black/50 z-50">
      
      {/* FEED TAB */}
      <button 
        onClick={() => onChangeView(AppView.FEED)} 
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${currentView === AppView.FEED ? 'text-white bg-white/5' : 'text-neutral-500 hover:text-neutral-300'}`}
      >
        <LayoutGrid size={22} strokeWidth={1.5} />
      </button>

      {/* SHUTTER BUTTON (CAMERA) */}
      <div className="px-2">
          <button 
            onClick={() => onChangeView(AppView.CAMERA)}
            className="w-16 h-16 rounded-full border border-neutral-700 bg-neutral-900 flex items-center justify-center active:scale-95 transition-transform group"
          >
            {/* Inner "Physical" Button */}
            <div className="w-12 h-12 rounded-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.1)] group-hover:bg-neutral-200 transition-colors" />
          </button>
      </div>

      {/* PROFILE TAB */}
      <button 
        onClick={() => onChangeView(AppView.PROFILE)} 
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${currentView === AppView.PROFILE ? 'text-white bg-white/5' : 'text-neutral-500 hover:text-neutral-300'}`}
      >
        <UserCircle2 size={24} strokeWidth={1.5} />
      </button>

    </div>
  );
};
