import React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { UserProfile, UserRole, League } from '../types/holdem';
import { AuthService } from '../services/authService';
import { isAppwriteConfigured } from '../lib/appwrite';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Images,
  ChevronDown,
  Check,
  Menu,
  UserCog,
} from 'lucide-react';

export type ViewMode =
  | 'games'
  | 'leaderboard'
  | 'stats'
  | 'director'
  | 'tv'
  | 'admin'
  | 'info'
  | 'gallery';

export interface NavigationProps {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  onGoHome?: () => void;
  onOpenQR: () => void;
  onOpenAppwriteSetup: () => void;
  onOpenAuth: () => void;
  currentUser: UserProfile | null;
  seasonName: string;
  leagues: League[];
  activeLeagueId: string;
  onSelectLeague: (leagueId: string) => void;
}

function getRoleIcon(role: UserRole) {
  switch (role) {
    case 'admin':
      return <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />;
    case 'manager':
      return <Crown className="w-4 h-4 text-amber-400 shrink-0" />;
    case 'dealer':
      return <Briefcase className="w-4 h-4 text-emerald-400 shrink-0" />;
    case 'scribe':
      return <PenTool className="w-4 h-4 text-indigo-400 shrink-0" />;
    case 'player':
    default:
      return <Gamepad2 className="w-4 h-4 text-slate-400 shrink-0" />;
  }
}

export const Navigation: React.FC<NavigationProps> = ({
  currentView,
  onSelectView,
  onGoHome,
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
  const canAccessAdmin = AuthService.canAccessAdmin(userRole);
  const activeLeague = leagues.find((l) => l.$id === activeLeagueId) || leagues[0] || null;

  const navItems: {
    id: ViewMode;
    label: string;
    mobileLabel: string;
    icon: React.ReactNode;
    isActive: boolean;
    badge?: string;
  }[] = [
    {
      id: 'games',
      label: 'Games',
      mobileLabel: 'Games',
      icon: <Calendar className="w-4 h-4" />,
      isActive: currentView === 'games' || currentView === 'director',
      badge: currentView === 'director' ? 'Desk' : undefined,
    },
    {
      id: 'leaderboard',
      label: 'Standings',
      mobileLabel: 'Ranks',
      icon: <Trophy className="w-4 h-4" />,
      isActive: currentView === 'leaderboard' || currentView === 'stats',
      badge: currentView === 'stats' ? 'Stats' : undefined,
    },
    {
      id: 'info',
      label: 'Rules',
      mobileLabel: 'Rules',
      icon: <BookOpen className="w-4 h-4" />,
      isActive: currentView === 'info',
    },
    {
      id: 'gallery',
      label: 'Gallery',
      mobileLabel: 'Gallery',
      icon: <Images className="w-4 h-4" />,
      isActive: currentView === 'gallery',
    },
  ];

  if (canAccessAdmin) {
    navItems.push({
      id: 'admin',
      label: 'Admin',
      mobileLabel: 'Admin',
      icon: <Settings className="w-4 h-4" />,
      isActive: currentView === 'admin',
    });
  }

  return (
    <>
      {/* Clean Top Header Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto h-14 px-3 sm:px-4 flex items-center justify-between gap-2">
          {/* Left: Brand & Active League Subtitle */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => (onGoHome ? onGoHome() : onSelectView('games'))}
              className="flex items-center gap-2.5 min-w-0 rounded-xl py-1 pr-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <span className="w-8 h-8 rounded-xl felt-gradient flex items-center justify-center border border-emerald-500/40 shrink-0">
                <span className="text-base font-black text-amber-400">♠</span>
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-extrabold tracking-tight text-white leading-tight truncate max-w-[160px] sm:max-w-[220px]">
                  {activeLeague ? activeLeague.name : 'Jack Ten Poker'}
                </span>
                <span className="block text-[11px] text-slate-400 leading-tight truncate max-w-[140px] sm:max-w-[200px]">
                  {activeLeague ? seasonName : 'All Leagues • Home'}
                </span>
              </span>
            </button>

            <Badge variant="secondary" className="hidden xl:inline-flex shrink-0">
              {seasonName}
            </Badge>
          </div>

          {/* Center: Desktop Primary Navigation */}
          <nav
            aria-label="Primary navigation"
            className="hidden lg:flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800"
          >
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectView(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                  item.isActive
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge && (
                  <span className="px-1 py-0.5 rounded text-[9px] font-black uppercase bg-slate-950/20 text-slate-950 leading-none">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Right: Streamlined Actions + Unified Account/Tools Menu */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Desktop TV Shortcut */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onSelectView('tv')}
              className="hidden xl:inline-flex h-9 px-2.5 text-slate-300"
              title="Venue TV Display"
            >
              <Tv className="w-4 h-4 text-indigo-400" />
              <span>TV</span>
            </Button>

            {/* Quick QR Check-in */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onOpenQR}
              aria-label="QR Check-in"
              title="Quick Player QR Check-in"
              className="h-10 w-10 sm:h-9 sm:w-auto sm:px-3 border-slate-800 text-emerald-400 hover:text-emerald-300"
            >
              <QrCode className="w-4 h-4" />
              <span className="hidden sm:inline text-xs font-semibold">Check-in</span>
            </Button>

            {/* Direct Sign In button when guest */}
            {!currentUser && (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={onOpenAuth}
                className="h-10 sm:h-9 px-3 text-xs font-bold"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </Button>
            )}

            {/* Unified Account, League & Tools Menu */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  aria-label="Account, league, and tools menu"
                  className="h-10 sm:h-9 px-2.5 sm:px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  {currentUser ? (
                    <>
                      {getRoleIcon(currentUser.role)}
                      <span className="hidden sm:inline max-w-[100px] truncate">
                        {currentUser.name}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
                      <Menu className="w-4 h-4 text-slate-300 sm:hidden" />
                    </>
                  ) : (
                    <Menu className="w-4 h-4 text-slate-300" />
                  )}
                </button>
              </DropdownMenu.Trigger>

              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={8}
                  className="z-50 w-64 rounded-2xl bg-slate-900 border border-slate-700/80 p-1.5 shadow-2xl text-slate-200 animate-in fade-in-0 zoom-in-95"
                >
                  {/* Account Section */}
                  <div className="px-2.5 py-2 border-b border-slate-800 mb-1">
                    {currentUser ? (
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">
                            {currentUser.name}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {seasonName}
                          </div>
                        </div>
                        <Badge variant="default" className="text-[10px] shrink-0">
                          {currentUser.role}
                        </Badge>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400">Guest Mode • {seasonName}</div>
                    )}
                  </div>

                  <DropdownMenu.Item
                    onSelect={onOpenAuth}
                    className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-xs font-semibold text-white hover:bg-slate-800 focus:bg-slate-800 focus:outline-none cursor-pointer"
                  >
                    <UserCog className="w-4 h-4 text-amber-400" />
                    <span>{currentUser ? 'Account & Switch Role' : 'Sign In / Register'}</span>
                  </DropdownMenu.Item>

                  {/* League Switcher (Session-persisted in localStorage) */}
                  {leagues.length > 0 && (
                    <>
                      <DropdownMenu.Separator className="h-px bg-slate-800 my-1" />
                      <DropdownMenu.Label className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Active League
                      </DropdownMenu.Label>
                      {leagues.map((league) => {
                        const isSelected = league.$id === (activeLeague?.$id || activeLeagueId);
                        return (
                          <DropdownMenu.Item
                            key={league.$id}
                            onSelect={() => onSelectLeague(league.$id)}
                            className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs hover:bg-slate-800 focus:bg-slate-800 focus:outline-none cursor-pointer"
                          >
                            <span
                              className={`truncate ${
                                isSelected ? 'font-bold text-amber-400' : 'text-slate-300'
                              }`}
                            >
                              {league.name}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                          </DropdownMenu.Item>
                        );
                      })}
                    </>
                  )}

                  {/* Tools Section */}
                  <DropdownMenu.Separator className="h-px bg-slate-800 my-1" />
                  <DropdownMenu.Label className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Tools &amp; Display
                  </DropdownMenu.Label>

                  <DropdownMenu.Item
                    onSelect={() => onSelectView('tv')}
                    className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 focus:bg-slate-800 focus:outline-none cursor-pointer"
                  >
                    <Tv className="w-4 h-4 text-indigo-400" />
                    <span>Venue TV Broadcast Mode</span>
                  </DropdownMenu.Item>

                  <DropdownMenu.Item
                    onSelect={onOpenAppwriteSetup}
                    className="flex items-center justify-between gap-2 px-2.5 py-2.5 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 focus:bg-slate-800 focus:outline-none cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <Database className="w-4 h-4 text-slate-400" />
                      <span>Appwrite Backend</span>
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                        isAppwriteConfigured ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isAppwriteConfigured ? 'bg-emerald-400' : 'bg-amber-400'
                        }`}
                      />
                      {isAppwriteConfigured ? 'Live' : 'Demo'}
                    </span>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Clean 4-5 Primary Tabs, 52px+ Touch Targets) */}
      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      >
        <div className="grid grid-flow-col auto-cols-fr gap-1 max-w-md mx-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectView(item.id)}
              className={`min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-xl text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                item.isActive
                  ? 'text-amber-400 bg-amber-500/10 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.icon}
              <span>{item.mobileLabel}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
};
