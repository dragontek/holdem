import React from 'react';
import type { UserProfile, UserRole, League } from '@/types/holdem';
import { AuthService } from '@/services/authService';
import { 
  Trophy, 
  Calendar, 
  Tv, 
  QrCode, 
  Database,
  ShieldCheck, 
  LogIn, 
  Crown, 
  Briefcase, 
  PenTool, 
  Gamepad2, 
  Settings, 
  BookOpen, 
  ChevronDown,
  ArrowLeft,
  Clock,
  Layers,
  Users
} from 'lucide-react';
import { isAppwriteConfigured } from '@/lib/appwrite';

export type PortalMode = 'public' | 'ops';
export type ViewMode = 'games' | 'leaderboard' | 'stats' | 'guide' | 'director' | 'tv' | 'admin' | 'info' | 'gallery';

interface NavigationProps {
  portalMode: PortalMode;
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  onTogglePortalMode: () => void;
  onOpenQR: () => void;
  onOpenAppwriteSetup: () => void;
  onOpenAuth: () => void;
  currentUser: UserProfile | null;
  seasonName: string;
  leagues: League[];
  activeLeagueId: string;
  onSelectLeague: (leagueId: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  portalMode,
  currentView,
  onSelectView,
  onTogglePortalMode,
  onOpenQR,
  onOpenAppwriteSetup,
  onOpenAuth,
  currentUser,
  seasonName,
  leagues,
  activeLeagueId,
  onSelectLeague,
}) => {
  const userRole = currentUser?.role || 'player';
  const isStaff = AuthService.canAccessDirector(userRole) || AuthService.canAccessAdmin(userRole);

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />;
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
      {/* Top Streamlined Header */}
      <header className={`sticky top-0 z-40 border-b px-4 py-2.5 shadow-xl transition-colors ${
        portalMode === 'ops' 
          ? 'bg-slate-950/95 border-amber-500/20 backdrop-blur-md' 
          : 'bg-slate-950/90 border-slate-800/80 backdrop-blur-md'
      }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          
          {/* 1. Left Brand / Portal Context */}
          <div className="flex items-center gap-3">
            {portalMode === 'ops' ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={onTogglePortalMode}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
                  title="Return to Public Player Portal"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Player Portal</span>
                </button>
                <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-800">
                  <span className="text-xs font-bold text-white tracking-wide uppercase">League Ops</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-black">
                    DIRECTOR HUB
                  </span>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => onSelectView('games')}
                className="flex items-center gap-2.5 cursor-pointer select-none"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/40 shadow-sm shrink-0">
                  <span className="text-base font-black text-amber-400">♠</span>
                </div>
                <div>
                  <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1 leading-none">
                    Hold&apos;em Pro
                  </h1>
                  <span className="text-[10px] text-slate-400 font-medium">Player League</span>
                </div>
              </div>
            )}

            {/* League Selector Pill */}
            {leagues.length > 0 && (
              <div className="relative flex items-center">
                <select
                  value={activeLeagueId}
                  onChange={(e) => onSelectLeague(e.target.value)}
                  className="bg-slate-900 text-xs font-semibold text-amber-300 border border-slate-700 hover:border-amber-500/50 rounded-lg pl-2 pr-6 py-1.5 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all shadow-sm max-w-[130px] sm:max-w-[170px] truncate"
                  title="Switch Active Poker League"
                >
                  {leagues.map((l) => (
                    <option key={l.$id} value={l.$id} className="bg-slate-900 text-white">
                      {l.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-1.5 pointer-events-none" />
              </div>
            )}
          </div>

          {/* 2. Center: Portal-Specific Navigation Tabs */}
          <div className="hidden md:flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            {portalMode === 'public' ? (
              <>
                <button
                  onClick={() => onSelectView('games')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    currentView === 'games'
                      ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" /> 
                  <span>Schedule</span>
                </button>

                <button
                  onClick={() => onSelectView('leaderboard')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    currentView === 'leaderboard' || currentView === 'stats'
                      ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5" /> 
                  <span>Standings</span>
                </button>

                <button
                  onClick={() => onSelectView('guide')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    currentView === 'guide' || currentView === 'info' || currentView === 'gallery'
                      ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" /> 
                  <span>League Guide</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onSelectView('director')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    currentView === 'director'
                      ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                      : 'text-emerald-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" /> 
                  <span>Live Clock Desk</span>
                </button>

                <button
                  onClick={() => onSelectView('admin')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    currentView === 'admin'
                      ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                      : 'text-amber-400/90 hover:text-amber-300 hover:bg-slate-800/60'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" /> 
                  <span>League Console</span>
                </button>

                <div className="w-px h-4 bg-slate-800 mx-0.5" />

                <button
                  onClick={() => onSelectView('tv')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    currentView === 'tv'
                      ? 'bg-indigo-500 text-white shadow-md font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Tv className="w-3.5 h-3.5 text-indigo-300" /> 
                  <span>TV Output</span>
                </button>
              </>
            )}
          </div>

          {/* 3. Right: Quick Actions & Profile */}
          <div className="flex items-center gap-2">
            {portalMode === 'public' && isStaff && (
              <button
                onClick={onTogglePortalMode}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer"
                title="Switch to League Operations Hub"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">League Ops</span>
              </button>
            )}

            {/* Express QR Check-in */}
            <button
              onClick={onOpenQR}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 text-xs font-semibold border border-emerald-500/30 transition-all cursor-pointer"
              title="Quick Player Check-in"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">QR Check-in</span>
            </button>

            {/* User Profile / Auth Button */}
            <button
              onClick={onOpenAuth}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                currentUser
                  ? 'bg-slate-900 text-white border-slate-700 hover:border-amber-400 shadow-sm'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md'
              }`}
              title={currentUser ? `Signed in as ${currentUser.name}` : 'Sign in'}
            >
              {currentUser ? (
                <>
                  <div className="flex items-center gap-1">
                    {getRoleIcon(currentUser.role)}
                    <span className="max-w-[85px] truncate hidden sm:inline">{currentUser.name}</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[9px] uppercase font-black bg-slate-800 text-amber-400 border border-slate-700">
                    {currentUser.role}
                  </span>
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </>
              )}
            </button>

            {/* Appwrite Status Icon */}
            <button
              onClick={onOpenAppwriteSetup}
              className={`p-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                isAppwriteConfigured
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
              }`}
              title={isAppwriteConfigured ? 'Appwrite v2.0 Live' : 'Configure Backend'}
            >
              <Database className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </header>

      {/* Mobile Bottom Floating Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-slate-800 px-1 py-1.5 flex items-center justify-around backdrop-blur-md">
        {portalMode === 'public' ? (
          <>
            <button
              onClick={() => onSelectView('games')}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] transition-all cursor-pointer ${
                currentView === 'games' ? 'text-amber-400 font-bold' : 'text-slate-400'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Schedule</span>
            </button>

            <button
              onClick={() => onSelectView('leaderboard')}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] transition-all cursor-pointer ${
                currentView === 'leaderboard' || currentView === 'stats' ? 'text-amber-400 font-bold' : 'text-slate-400'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Standings</span>
            </button>

            <button
              onClick={() => onSelectView('guide')}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] transition-all cursor-pointer ${
                currentView === 'guide' || currentView === 'info' || currentView === 'gallery' ? 'text-amber-400 font-bold' : 'text-slate-400'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Guide</span>
            </button>

            {isStaff && (
              <button
                onClick={onTogglePortalMode}
                className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] text-amber-300 font-semibold cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Ops Hub</span>
              </button>
            )}
          </>
        ) : (
          <>
            <button
              onClick={() => onSelectView('director')}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] transition-all cursor-pointer ${
                currentView === 'director' ? 'text-emerald-400 font-bold' : 'text-slate-400'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Desk</span>
            </button>

            <button
              onClick={() => onSelectView('admin')}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] transition-all cursor-pointer ${
                currentView === 'admin' ? 'text-amber-400 font-bold' : 'text-slate-400'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Admin</span>
            </button>

            <button
              onClick={() => onSelectView('tv')}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] transition-all cursor-pointer ${
                currentView === 'tv' ? 'text-indigo-400 font-bold' : 'text-slate-400'
              }`}
            >
              <Tv className="w-4 h-4" />
              <span>TV</span>
            </button>

            <button
              onClick={onTogglePortalMode}
              className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] text-slate-400 hover:text-white cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-amber-400" />
              <span>Exit Ops</span>
            </button>
          </>
        )}
      </nav>
    </>
  );
};
