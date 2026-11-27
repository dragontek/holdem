import React, { useState } from 'react';
import type { Game, Season } from '@/types/holdem';
import type { AppViewMode } from '@/lib/router';
import { Button } from '@/components/ui/button';
import { Check, ChevronRight, Home, Share2 } from 'lucide-react';

export interface RouteBreadcrumbBarProps {
  view: AppViewMode;
  season?: Season | null;
  game?: Game | null;
  playerName?: string;
  onGoHome: () => void;
  onGoView?: (view: AppViewMode) => void;
  onGoSeason: (seasonId: string) => void;
  onGoGame?: (game: Game) => void;
}

const VIEW_LABELS: Record<AppViewMode, string> = {
  games: 'Games',
  leaderboard: 'Standings',
  stats: 'Player Stats',
  director: 'Game Desk',
  tv: 'TV Display',
  admin: 'Admin',
  info: 'Rules & Venues',
  gallery: 'Gallery',
};

export const RouteBreadcrumbBar: React.FC<RouteBreadcrumbBarProps> = ({
  view,
  season,
  game,
  playerName,
  onGoHome,
  onGoView,
  onGoSeason,
  onGoGame,
}) => {
  const [copied, setCopied] = useState(false);

  // Don't clutter top-level Home page with an empty breadcrumb bar
  if (view === 'games' && !season && !game) {
    return null;
  }

  const handleCopyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API is unavailable
    }
  };

  const isPrefixSectionView =
    view === 'games' ||
    view === 'director' ||
    view === 'admin' ||
    view === 'leaderboard' ||
    view === 'info' ||
    view === 'gallery';
  const sectionViewKey: AppViewMode = view === 'director' ? 'games' : view;

  return (
    <div className="no-print border-b border-slate-800/80 bg-slate-950/70">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-3">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs text-slate-400 overflow-x-auto scrollbar-none min-w-0"
        >
          <button
            type="button"
            onClick={onGoHome}
            className="inline-flex items-center gap-1 text-slate-400 hover:text-amber-400 transition-colors shrink-0 rounded px-1 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>

          {/* Section crumb: /games, /leaderboard, /admin, /info, /gallery */}
          {isPrefixSectionView && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              {onGoView && (season || game) ? (
                <button
                  type="button"
                  onClick={() => onGoView(sectionViewKey)}
                  className="text-slate-300 hover:text-amber-400 transition-colors shrink-0 rounded px-1 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  {VIEW_LABELS[sectionViewKey]}
                </button>
              ) : (
                <span className="font-bold text-white shrink-0">{VIEW_LABELS[sectionViewKey]}</span>
              )}
            </>
          )}

          {/* Player stats route: /stats/:playerId */}
          {view === 'stats' && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span className="font-bold text-white shrink-0">
                {playerName || VIEW_LABELS.stats}
              </span>
            </>
          )}

          {/* Season crumb */}
          {view !== 'stats' && season && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <button
                type="button"
                onClick={() => onGoSeason(season.$id)}
                className={`truncate max-w-[160px] sm:max-w-[240px] rounded px-1 py-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                  !game
                    ? 'font-bold text-amber-400'
                    : 'text-slate-300 hover:text-amber-400'
                }`}
              >
                {season.name}
              </button>
            </>
          )}

          {/* Game crumb */}
          {game && (view === 'director' || view === 'tv') && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              {onGoGame ? (
                <button
                  type="button"
                  onClick={() => onGoGame(game)}
                  className="truncate max-w-[180px] sm:max-w-[280px] font-bold text-amber-400 rounded px-1 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  {game.title}
                </button>
              ) : (
                <span className="truncate max-w-[180px] sm:max-w-[280px] font-bold text-amber-400">
                  {game.title}
                </span>
              )}
            </>
          )}
        </nav>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCopyShareUrl}
          className="h-7 px-2.5 text-[11px] text-slate-400 hover:text-amber-400 shrink-0"
          title="Copy shareable URL for this page"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-semibold">Copied</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share Link</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
