import React from 'react';
import type { UserProfile, UserRole } from '../types/holdem';
import { AuthService } from '../services/authService';
import { 
  Trophy, 
  Calendar, 
  Tv, 
  QrCode, 
  Database,
  Building2,
  ShieldCheck,
  KeyRound,
  LogIn,
  Crown,
  Briefcase,
  PenTool,
  Gamepad2,
  Settings
} from 'lucide-react';
import { isAppwriteConfigured } from '../lib/appwrite';

export type ViewMode = 'games' | 'leaderboard' | 'stats' | 'director' | 'tv' | 'admin';

interface NavigationProps {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  onOpenQR: () => void;
  onOpenAppwriteSetup: () => void;
  onOpenAuth: () => void;
  currentUser: UserProfile | null;
  seasonName: string;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentView,
  onSelectView,
  onOpenQR,
  onOpenAppwriteSetup,
  onOpenAuth,
  currentUser,
  seasonName,
}) => {
  const userRole = currentUser?.role || 'player';
  const canAccessAdmin = AuthService.canAccessAdmin(userRole);

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'manager':
        return <Crown className="w-3.5 h-3.5 text-amber-400" />;
      case 'dealer':
        return <Briefcase className="w-3.5 h-3.5 text-emerald-400" />;
      case 'scribe':
        return <PenTool className="w-3.5 h-3.5 text-indigo-400" />;
      case 'player':
      default:
        return <Gamepad2 className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <>
      {/* Top Streamlined Header Navigation Bar */}
      <header className="sticky top-0 z-40 glass-panel border-b border-slate-800/80 px-4 py-2.5 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* 1. Left: Brand & Season */}
          <div 
            onClick={() => onSelectView('games')}
            className="flex items-center gap-3 cursor-pointer select-none"
          >
            <div className="w-9 h-9 rounded-xl felt-gradient flex items-center justify-center border border-emerald-500/50 shadow-md felt-glow shrink-0">
              <span className="text-lg font-black text-amber-400">♠</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1">
                  Hold&apos;em Pro
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  {seasonName}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Center: Desktop Nav View Switcher (Player stats removed from main menu) */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => onSelectView('games')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentView === 'games' || currentView === 'director'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" /> 
              <span>Games</span>
              {currentView === 'director' && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-slate-950/20 text-slate-950">
                  Desk
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectView('leaderboard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentView === 'leaderboard' || currentView === 'stats'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" /> 
              <span>Standings</span>
              {currentView === 'stats' && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-slate-950/20 text-slate-950">
                  Profile
                </span>
              )}
            </button>

            {canAccessAdmin && (
              <button
                onClick={() => onSelectView('admin')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentView === 'admin'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                    : 'text-amber-400/90 hover:text-amber-300 hover:bg-slate-800/60'
                }`}
              >
                <Settings className="w-3.5 h-3.5" /> Admin
              </button>
            )}

            <div className="w-px h-4 bg-slate-800 mx-1" />

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

          {/* 3. Right: User Profile & Quick Controls */}
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

            {/* Auth / User Profile Button */}
            <button
              onClick={onOpenAuth}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                currentUser
                  ? 'bg-slate-900/90 text-white border-slate-700 hover:border-amber-400 shadow-sm'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md'
              }`}
              title={currentUser ? `Logged in as ${currentUser.name} (${currentUser.role})` : 'Sign in to Hold\'em Pro'}
            >
              {currentUser ? (
                <>
                  <div className="flex items-center gap-1">
                    {getRoleIcon(currentUser.role)}
                    <span className="max-w-[100px] truncate hidden sm:inline">{currentUser.name}</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[9px] uppercase font-black bg-slate-800 text-amber-400 border border-slate-700">
                    {currentUser.role}
                  </span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>

            {/* Appwrite Connection Indicator */}
            <button
              onClick={onOpenAppwriteSetup}
              className={`p-2 rounded-xl text-xs font-semibold border transition-all ${
                isAppwriteConfigured
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
              }`}
              title={isAppwriteConfigured ? 'Appwrite v2.0 Live' : 'Configure Appwrite Backend'}
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
            currentView === 'games' || currentView === 'director' ? 'text-amber-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span>Games</span>
        </button>

        <button
          onClick={() => onSelectView('leaderboard')}
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg text-xs transition-all ${
            currentView === 'leaderboard' || currentView === 'stats' ? 'text-amber-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Trophy className="w-5 h-5" />
          <span>Ranks</span>
        </button>

        {canAccessAdmin && (
          <button
            onClick={() => onSelectView('admin')}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg text-xs transition-all ${
              currentView === 'admin' ? 'text-amber-400 font-bold' : 'text-slate-400'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span>Admin</span>
          </button>
        )}

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
