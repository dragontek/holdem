import React from 'react';
import { 
  Trophy, 
  Calendar, 
  BarChart3, 
  Tv, 
  SlidersHorizontal, 
  QrCode, 
  Database,
  Building2,
  ShieldCheck,
  KeyRound
} from 'lucide-react';
import { isAppwriteConfigured } from '../lib/appwrite';

export type ViewMode = 'games' | 'leaderboard' | 'stats' | 'director' | 'tv';

interface NavigationProps {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  onOpenQR: () => void;
  onOpenAppwriteSetup: () => void;
  onOpenDirectorAuth: () => void;
  isDirector: boolean;
  seasonName: string;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentView,
  onSelectView,
  onOpenQR,
  onOpenAppwriteSetup,
  onOpenDirectorAuth,
  isDirector,
  seasonName,
}) => {
  return (
    <>
      {/* Top Streamlined Header Navigation Bar */}
      <header className="sticky top-0 z-40 glass-panel border-b border-slate-800/80 px-4 py-2.5 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* 1. Left: Brand & Season */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl felt-gradient flex items-center justify-center border border-emerald-500/50 shadow-md felt-glow shrink-0">
              <span className="text-lg font-black text-amber-400">♠</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1">
                  Hold'em Pro
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  {seasonName}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Center: Desktop Nav View Switcher */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => onSelectView('games')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentView === 'games'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" /> Games
            </button>

            <button
              onClick={() => onSelectView('leaderboard')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentView === 'leaderboard'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" /> Standings
            </button>

            <button
              onClick={() => onSelectView('stats')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentView === 'stats'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" /> Player Stats
            </button>

            <div className="w-px h-4 bg-slate-800 mx-1" />

            <button
              onClick={() => onSelectView('director')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentView === 'director'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" /> Director Desk
            </button>

            <button
              onClick={() => onSelectView('tv')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentView === 'tv'
                  ? 'bg-indigo-500 text-white shadow-md font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Tv className="w-3.5 h-3.5 text-indigo-300" /> TV Broadcast
            </button>
          </div>

          {/* 3. Right: Streamlined Action Controls */}
          <div className="flex items-center gap-2">
            
            {/* Express QR Check-in */}
            <button
              onClick={onOpenQR}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-emerald-400 text-xs font-semibold border border-emerald-500/30 transition-all"
              title="Quick Player Check-in"
            >
              <QrCode className="w-4 h-4" />
              <span className="hidden sm:inline">QR Check-in</span>
            </button>

            {/* Director Auth Status Button */}
            <button
              onClick={onOpenDirectorAuth}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                isDirector
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-sm'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white'
              }`}
              title={isDirector ? 'Director Session Active' : 'Sign in as Tournament Director'}
            >
              {isDirector ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline">Director Active</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline">Director Login</span>
                </>
              )}
            </button>

            {/* Appwrite Connection Badge */}
            <button
              onClick={onOpenAppwriteSetup}
              className={`p-2 rounded-xl text-xs font-semibold border transition-all ${
                isAppwriteConfigured
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
              }`}
              title={isAppwriteConfigured ? 'Appwrite Self-Hosted Live' : 'Configure Appwrite Backend'}
            >
              <Database className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      {/* Mobile Bottom Floating Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass-panel border-t border-slate-800 px-2 py-2 flex items-center justify-around">
        <button
          onClick={() => onSelectView('games')}
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg text-xs transition-all ${
            currentView === 'games' ? 'text-amber-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span>Games</span>
        </button>

        <button
          onClick={() => onSelectView('leaderboard')}
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg text-xs transition-all ${
            currentView === 'leaderboard' ? 'text-amber-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Trophy className="w-5 h-5" />
          <span>Ranks</span>
        </button>

        <button
          onClick={() => onSelectView('stats')}
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg text-xs transition-all ${
            currentView === 'stats' ? 'text-amber-400 font-bold' : 'text-slate-400'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span>Stats</span>
        </button>

        <button
          onClick={() => onSelectView('director')}
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg text-xs transition-all ${
            currentView === 'director' ? 'text-emerald-400 font-bold' : 'text-slate-400'
          }`}
        >
          <SlidersHorizontal className="w-5 h-5" />
          <span>Director</span>
        </button>

        <button
          onClick={() => onSelectView('tv')}
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg text-xs transition-all ${
            currentView === 'tv' ? 'text-indigo-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Tv className="w-5 h-5" />
          <span>TV View</span>
        </button>
      </nav>
    </>
  );
};
