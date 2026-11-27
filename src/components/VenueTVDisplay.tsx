import React, { useState } from 'react';
import type { Game, GameEntry, HotHandJackpot, Announcement } from '../types/holdem';
import type { LiveScoreNotification } from '@/lib/liveScoreEvents';
import { BAR_BONUS_CHIP_VALUE } from '@/lib/scoring';
import { useGameClock } from '@/hooks/useGameClock';
import { formatClockTime } from '@/lib/gameClock';
import { TVBroadcastBanner, TVLiveStandingsPanel } from './tv/TVBroadcastBanner';
import {
  Sparkles,
  Megaphone,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface VenueTVDisplayProps {
  game: Game;
  entries?: GameEntry[];
  hotHand?: HotHandJackpot | null;
  announcements: Announcement[];
  tvBannerAlert?: LiveScoreNotification | null;
  highlightedPlayers?: ReadonlyMap<string, LiveScoreNotification>;
  recentFeed?: LiveScoreNotification[];
}

export const VenueTVDisplay: React.FC<VenueTVDisplayProps> = ({
  game,
  entries = [],
  hotHand = null,
  announcements,
  tvBannerAlert = null,
  highlightedPlayers = new Map(),
  recentFeed = [],
}) => {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Backend-authoritative live clock (identical to Director Desk & all viewers)
  const {
    secondsRemaining: secondsLeft,
    currentLevel,
    nextLevel,
  } = useGameClock(game);

  const totalChipsInPlay =
    game.totalEntriesCount * game.startingChips +
    (game.purpleCount ?? 0) * BAR_BONUS_CHIP_VALUE;
  const avgStack = game.remainingPlayersCount > 0 
    ? Math.round(totalChipsInPlay / game.remainingPlayersCount)
    : 0;

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 select-none relative overflow-hidden">
      {/* Big-Screen Live Point & Knockout Broadcast Banner */}
      <TVBroadcastBanner alert={tvBannerAlert} />
      
      {/* Background Felt Glow Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-emerald-950/40 rounded-full blur-3xl pointer-events-none" />

      {/* 1. Header Bar */}
      <header className="flex items-center justify-between border-b border-slate-800/80 pb-4 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl felt-gradient border-2 border-emerald-500/50 flex items-center justify-center text-2xl font-black text-amber-400 felt-glow">
            ♠
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">{game.venueName}</h1>
            <p className="text-sm font-semibold text-amber-400 flex flex-wrap items-center gap-2">
              <span>{game.title}</span> • <span>Dealer: {game.dealerName || 'House'}</span>
              {(game.pointMultiplier ?? 1) > 1 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black">
                  {game.pointMultiplier}x POINTS
                </span>
              )}
              {game.isDayGame && (
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-black">
                  DAY GAME (DG)
                </span>
              )}
              {game.hodRule && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                  HOD: {game.hodRule}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {(game.hotHandDescription || hotHand?.handTitle) && (
            <div className="glass-card px-5 py-2.5 rounded-2xl border border-amber-500/40 text-right">
              <div className="text-[10px] font-extrabold uppercase text-amber-400 tracking-wider">
                HOT HAND TARGET
              </div>
              <div className="text-xl font-black text-amber-300">
                {game.hotHandDescription || hotHand?.handTitle}
              </div>
            </div>
          )}

          <button
            onClick={toggleFullscreen}
            className="p-3 rounded-2xl glass-card text-slate-300 hover:text-white hover:border-amber-500/40 transition-all"
            title="Toggle Fullscreen TV Broadcast"
          >
            {isFullscreen ? <Minimize2 className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* 2. Main TV Center Display */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-auto py-6 relative z-10">
        {/* Left Stats Column */}
        <div className="glass-panel rounded-3xl p-5 border border-slate-800 flex flex-col justify-around space-y-4 lg:col-span-3">
          <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 text-center">
            <div className="text-xs uppercase font-extrabold text-slate-400 tracking-widest">Players Remaining</div>
            <div className="text-5xl font-black text-amber-400 mt-1">
              {game.remainingPlayersCount} <span className="text-xl text-slate-500">/ {game.totalPlayersCount}</span>
            </div>
          </div>

          <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 text-center">
            <div className="text-xs uppercase font-extrabold text-slate-400 tracking-widest">Average Stack</div>
            <div className="text-3xl font-black text-indigo-300 mt-1">
              {avgStack.toLocaleString()}
            </div>
          </div>

          <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 text-center">
            <div className="text-xs uppercase font-extrabold text-slate-400 tracking-widest">Total Chips in Play</div>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              {totalChipsInPlay.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Center Clock Display */}
        <div className="glass-panel rounded-3xl p-8 border border-emerald-500/40 felt-gradient felt-glow text-center flex flex-col items-center justify-center space-y-4 lg:col-span-5">
          <span className="px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-sm font-black uppercase tracking-widest flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> LEVEL {currentLevel.level} {currentLevel.isBreak && '(BREAK)'}
          </span>

          {/* Huge Timer */}
          <div className="text-7xl xl:text-[120px] font-mono font-black tracking-tight text-white drop-shadow-2xl leading-none">
            {formatClockTime(secondsLeft)}
          </div>

          {game.status !== 'running' && (
            <span className="px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700 text-xs font-extrabold uppercase tracking-widest text-amber-300">
              {game.status === 'paused'
                ? 'CLOCK PAUSED'
                : game.status === 'completed'
                ? 'TOURNAMENT COMPLETED'
                : 'WAITING TO START'}
            </span>
          )}

          {/* Current Blinds Banner */}
          <div className="flex items-center gap-8 bg-slate-950/80 px-6 py-4 rounded-2xl border border-slate-800 shadow-2xl">
            <div>
              <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Blinds</div>
              <div className="text-3xl xl:text-4xl font-black text-amber-400">
                {currentLevel.smallBlind.toLocaleString()} / {currentLevel.bigBlind.toLocaleString()}
              </div>
            </div>

            {currentLevel.ante > 0 && (
              <div className="border-l border-slate-800 pl-8">
                <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Big Blind Ante</div>
                <div className="text-3xl xl:text-4xl font-black text-indigo-300">
                  {currentLevel.ante.toLocaleString()}
                </div>
              </div>
            )}
          </div>

          {/* Next Blinds Preview */}
          {nextLevel && (
            <div className="text-sm font-semibold text-slate-300 pt-2">
              {nextLevel.isBreak ? (
                <>NEXT: <span className="text-amber-300 font-bold">{nextLevel.breakTitle || '10-Min Break'}</span> ({nextLevel.durationMinutes} min)</>
              ) : (
                <>NEXT LEVEL ({nextLevel.durationMinutes} min): <span className="text-amber-300 font-bold">{nextLevel.smallBlind.toLocaleString()} / {nextLevel.bigBlind.toLocaleString()}</span>{nextLevel.ante > 0 ? ` (Ante: ${nextLevel.ante.toLocaleString()})` : ''}</>
              )}
            </div>
          )}
        </div>

        {/* Right Live Standings & Highlighted Player Board */}
        <div className="lg:col-span-4 flex">
          <div className="w-full">
            <TVLiveStandingsPanel
              game={game}
              entries={entries}
              highlightedPlayers={highlightedPlayers}
              recentFeed={recentFeed}
            />
          </div>
        </div>
      </main>

      {/* 3. Bottom Ticker & Chip Legend Bar */}
      <footer className="space-y-3 relative z-10">
        
        {/* Chip Color Value Legend */}
        <div className="flex items-center justify-center gap-4 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-500 font-bold uppercase text-[10px]">Chip Values:</span>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-900/40 border border-emerald-500/40 text-emerald-300 font-bold">
            <span className="w-3 h-3 rounded-full bg-emerald-500" /> Green = 25
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-200 font-bold">
            <span className="w-3 h-3 rounded-full bg-black border border-slate-600" /> Black = 100
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-900/40 border border-purple-500/40 text-purple-300 font-bold">
            <span className="w-3 h-3 rounded-full bg-purple-500" /> Purple = 500
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-900/40 border border-rose-500/40 text-rose-300 font-bold">
            <span className="w-3 h-3 rounded-full bg-rose-500" /> Red = 1,000
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-900/40 border border-amber-500/40 text-amber-300 font-bold">
            <span className="w-3 h-3 rounded-full bg-amber-400" /> Gold = 5,000
          </div>
        </div>

        {/* Live Rolling News Ticker */}
        <div className="glass-card rounded-2xl px-4 py-2.5 border border-slate-800 flex items-center gap-4 overflow-hidden">
          <div className="flex items-center gap-1.5 text-xs font-black uppercase text-amber-400 shrink-0">
            <Megaphone className="w-4 h-4 animate-bounce" /> LEAGUE TICKER:
          </div>
          <div className="text-xs text-slate-300 font-medium truncate">
            {(() => {
              const activeAnn = announcements.find((a) => a.isActive !== false);
              if (!activeAnn) return 'Welcome to Jack Ten Poker League';
              return activeAnn.content ? `${activeAnn.title} • ${activeAnn.content}` : activeAnn.title;
            })()}
          </div>
        </div>

      </footer>

    </div>
  );
};
