import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import type { Game, GameEntry } from '@/types/holdem';
import type { LiveScoreNotification } from '@/lib/liveScoreEvents';
import { calculateEntryScore, getEntryStatus } from '@/lib/scoring';
import { Award, Crown, Flame, Skull, Sparkles, Trophy } from 'lucide-react';

export interface TVBroadcastBannerProps {
  alert: LiveScoreNotification | null;
}

export const TVBroadcastBanner: React.FC<TVBroadcastBannerProps> = ({ alert }) => {
  useEffect(() => {
    if (!alert || !alert.isMajorCelebration) return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    try {
      void confetti({
        particleCount: alert.variant === 'royal_flush' ? 110 : 65,
        spread: 75,
        origin: { y: 0.25 },
      });
    } catch {
      // Ignore canvas-confetti errors in headless environments
    }
  }, [alert]);

  if (!alert) return null;

  const isKO = alert.variant === 'knockout' || alert.variant === 'rebuy_ko';
  const isBust = alert.variant === 'bust';

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-6 top-24 z-40 pointer-events-none flex justify-center"
    >
      <div
        className={`score-toast-item max-w-4xl w-full rounded-3xl border-2 px-8 py-6 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-6 ${
          isKO
            ? 'bg-rose-950/95 border-rose-400 text-white'
            : isBust
            ? 'bg-slate-900/95 border-slate-600 text-white'
            : 'bg-slate-950/95 border-amber-400 text-white gold-glow'
        }`}
      >
        <div className="flex items-center gap-5">
          <div
            className={`w-16 h-16 rounded-2xl border flex items-center justify-center shrink-0 ${
              isKO
                ? 'bg-rose-500/25 border-rose-400 text-rose-300'
                : isBust
                ? 'bg-slate-800 border-slate-600 text-slate-300'
                : 'bg-amber-500/20 border-amber-400 text-amber-300'
            }`}
          >
            {isKO ? (
              <Flame className="w-9 h-9" aria-hidden="true" />
            ) : isBust ? (
              <Skull className="w-9 h-9" aria-hidden="true" />
            ) : alert.variant === 'placement' ? (
              <Trophy className="w-9 h-9" aria-hidden="true" />
            ) : alert.variant === 'quads' ||
              alert.variant === 'straight_flush' ||
              alert.variant === 'royal_flush' ? (
              <Crown className="w-9 h-9" aria-hidden="true" />
            ) : (
              <Sparkles className="w-9 h-9" aria-hidden="true" />
            )}
          </div>

          <div className="space-y-1 text-center sm:text-left">
            <div className="text-xs font-black uppercase tracking-widest text-amber-300">
              LIVE SCOREKEEPING UPDATE
            </div>
            <div className="text-2xl lg:text-4xl font-black tracking-tight text-white leading-tight">
              {alert.headline}
            </div>
            {alert.subtext && (
              <div className="text-sm font-semibold text-slate-300">{alert.subtext}</div>
            )}
          </div>
        </div>

        {alert.pointsAwarded > 0 && (
          <div className="px-6 py-3 rounded-2xl bg-amber-500 text-slate-950 text-center shrink-0">
            <div className="text-[10px] font-black uppercase tracking-widest">Awarded</div>
            <div className="text-3xl font-mono font-black leading-none mt-0.5">
              +{alert.pointsAwarded.toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export interface TVLiveStandingsPanelProps {
  game: Game;
  entries: GameEntry[];
  highlightedPlayers: ReadonlyMap<string, LiveScoreNotification>;
  recentFeed: LiveScoreNotification[];
}

export const TVLiveStandingsPanel: React.FC<TVLiveStandingsPanelProps> = ({
  game,
  entries,
  highlightedPlayers,
  recentFeed,
}) => {
  const rankedEntries = [...entries]
    .map((entry) => ({
      entry,
      score: calculateEntryScore(entry, game).finalPoints,
      status: getEntryStatus(entry),
    }))
    .sort((a, b) => {
      if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1;
      if (a.status !== 'ACTIVE' && b.status === 'ACTIVE') return 1;
      return b.score - a.score;
    })
    .slice(0, 8);

  const gameFeed = recentFeed.filter((f) => f.gameId === game.$id).slice(0, 3);

  return (
    <div className="glass-panel rounded-3xl p-5 border border-slate-800 flex flex-col justify-between space-y-4">
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
            <Trophy className="w-4 h-4" aria-hidden="true" /> Live Table Leaderboard
          </h2>
          <span className="text-xs font-semibold text-slate-400">
            {entries.filter((e) => !e.isEliminated).length} Active / {entries.length} Seated
          </span>
        </div>

        {rankedEntries.length === 0 ? (
          <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-4 text-center text-xs text-slate-400">
            Waiting for players to take their seats...
          </div>
        ) : (
          <div className="space-y-1.5">
            {rankedEntries.map(({ entry, score, status }) => {
              const highlight = highlightedPlayers.get(entry.playerId);
              return (
                <div
                  key={entry.$id}
                  className={`px-3.5 py-2 rounded-xl border flex items-center justify-between gap-2 transition-colors ${
                    highlight
                      ? 'bg-amber-500/20 border-amber-400 player-award-highlight'
                      : status !== 'ACTIVE'
                      ? 'bg-slate-950/50 border-slate-900 opacity-55'
                      : 'bg-slate-900/90 border-slate-800'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-slate-400">
                        T{entry.tableNumber}S{entry.seatNumber}
                      </span>
                      <span
                        className={`text-sm font-extrabold truncate ${
                          highlight
                            ? 'text-amber-300'
                            : status !== 'ACTIVE'
                            ? 'line-through text-slate-500'
                            : 'text-white'
                        }`}
                      >
                        {entry.playerName}
                      </span>
                    </div>
                    {highlight && (
                      <div className="text-[11px] font-bold text-amber-200 truncate">
                        {highlight.headline}
                      </div>
                    )}
                  </div>

                  <span className="font-mono text-sm font-black text-amber-400 shrink-0">
                    {score.toLocaleString()} pts
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {gameFeed.length > 0 && (
        <div className="pt-3 border-t border-slate-800 space-y-1.5">
          <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1">
            <Award className="w-3.5 h-3.5" aria-hidden="true" /> Recent Plays
          </div>
          {gameFeed.map((ev) => (
            <div
              key={ev.id}
              className="text-xs text-slate-300 flex items-center justify-between gap-2 truncate"
            >
              <span className="truncate">{ev.headline}</span>
              {ev.pointsAwarded > 0 && (
                <span className="font-mono font-bold text-amber-400 shrink-0">
                  +{ev.pointsAwarded.toLocaleString()}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
