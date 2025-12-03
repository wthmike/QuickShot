
import React from 'react';
import { Home, Camera, User } from 'lucide-react';
import { AppView } from '../types';

interface NavigationProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentView, onChangeView }) => {
  const getIconClass = (view: AppView) => 
    `flex flex-col items-center justify-center gap-1 w-16 h-full transition-colors ${currentView === view ? 'text-white' : 'text-neutral-600 hover:text-neutral-400'}`;

  // Hide nav on Camera view to give full immersion, or keep it? 
  // Let's keep it but make it minimal, or hide it. 
  // Standard is to hide standard nav in Camera mode usually.
  if (currentView === AppView.CAMERA) return null;

  return (
    <div className="h-20 bg-[#050505] border-t border-neutral-900 flex items-center justify-around px-6 z-50">
      <button onClick={() => onChangeView(AppView.FEED)} className={getIconClass(AppView.FEED)}>
        <Home size={24} strokeWidth={currentView === AppView.FEED ? 2.5 : 2} />
        {currentView === AppView.FEED && <div className="w-1 h-1 bg-white rounded-full mt-1" />}
      </button>

      {/* Main Camera Action */}
      <button 
        onClick={() => onChangeView(AppView.CAMERA)}
        className="w-14 h-14 rounded-full bg-white flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(255,255,255,0.15)] active:scale-95 transition-transform"
      >
        <Camera size={28} className="text-black" />
      </button>

      <button onClick={() => onChangeView(AppView.PROFILE)} className={getIconClass(AppView.PROFILE)}>
        <User size={24} strokeWidth={currentView === AppView.PROFILE ? 2.5 : 2} />
        {currentView === AppView.PROFILE && <div className="w-1 h-1 bg-white rounded-full mt-1" />}
      </button>
    </div>
  );
};
