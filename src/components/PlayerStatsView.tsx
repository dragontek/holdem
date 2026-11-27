import React from 'react';
import type { Game, GameEntry, Player } from '../types/holdem';
import { calculateEntryScore } from '@/lib/scoring';
import { 
  ArrowLeft, 
  Calendar,
  Sparkles,
  Sun,
} from 'lucide-react';

interface PlayerStatsViewProps {
  player: Player;
  allPlayers: Player[];
  recentEntries?: GameEntry[];
  games?: Game[];
  onBack?: () => void;
  backLabel?: string;
}

export const PlayerStatsView: React.FC<PlayerStatsViewProps> = ({
  player,
  recentEntries = [],
  games = [],
  onBack,
  backLabel = 'Back',
}) => {
  const winRate = ((player.careerWins / (player.gamesPlayed || 1)) * 100).toFixed(1);
  const avgKOs = (player.careerKOs / (player.gamesPlayed || 1)).toFixed(1);

  // Live / current session entries for this player
  const livePlayerEntries = recentEntries
    .filter((entry) => entry.playerId === player.$id)
    .map((entry) => {
      const game = games.find((g) => g.$id === entry.gameId) || {
        title: 'Current Session',
        venueName: 'League Venue',
        scheduledAt: 'Current Session',
        pointMultiplier: 1 as const,
        isDayGame: false,
        noGamePlayed: false,
      };
      const breakdown = calculateEntryScore(entry, game);
      return {
        date: `${game.title} (${game.scheduledAt})`,
        venue: game.venueName,
        multiplierLabel: breakdown.isMucked
          ? 'MUCK (0x)'
          : `${breakdown.totalMultiplier}x (${breakdown.sessionMultiplier}x${
              breakdown.dgMultiplier === 2 ? ' × 2x DG' : ''
            })`,
        awards: breakdown.lineItems.map((item) => ({
          label: item.code ? `[${item.code}] ${item.label}` : item.label,
          basePoints: item.basePoints,
          points: item.finalPoints,
        })),
        totalPoints: breakdown.finalPoints,
      };
    });

  // Historical sample game breakdown aligned with Jack Ten Poker scoring formula
  const mockHistoryBreakdown = [
    {
      date: 'Saturday, August 22nd 2026, 2:30 pm',
      venue: 'Single Barrel',
      multiplierLabel: '3x (Triple)',
      awards: [
        { label: '[O] HOD (Off Suit)', basePoints: 500, points: 1500 },
        { label: 'Show Up Points', basePoints: 600, points: 1800 },
      ],
      totalPoints: 3300,
    },
    {
      date: 'Friday, August 21st 2026, 7:30 pm',
      venue: 'Murray Street Darts',
      multiplierLabel: '4x (2x Double × 2x DG)',
      awards: [
        { label: '[#5] 5th Place Finish', basePoints: 1000, points: 4000 },
        { label: '[S] HOD (Suited)', basePoints: 1000, points: 4000 },
        { label: 'Show Up Points', basePoints: 600, points: 2400 },
      ],
      totalPoints: 10400,
    },
    {
      date: 'Wednesday, August 19th 2026, 6:00 pm',
      venue: 'Single Barrel',
      multiplierLabel: '1x (Single)',
      awards: [
        { label: '[#1] 1st Place Finish', basePoints: 12000, points: 12000 },
        { label: '[K] Standard Knockout ×4', basePoints: 4000, points: 4000 },
        { label: '[☆] Survivor Points', basePoints: 500, points: 500 },
        { label: 'Show Up Points', basePoints: 600, points: 600 },
      ],
      totalPoints: 17100,
    },
  ];

  const historyBreakdown = [...livePlayerEntries, ...mockHistoryBreakdown];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 pb-24 md:pb-12">
      
      {/* Back Button Header */}
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-amber-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {backLabel}
        </button>
      )}

      {/* Player Header Banner */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 relative overflow-hidden gold-glow">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="w-16 h-16 rounded-2xl felt-gradient border-2 border-amber-400 flex items-center justify-center text-3xl font-bold shadow-xl felt-glow">
              {player.suitIcon === 'hearts' && '♥️'}
              {player.suitIcon === 'spades' && '♠️'}
              {player.suitIcon === 'diamonds' && '♦️'}
              {player.suitIcon === 'clubs' && '♣️'}
            </div>

            <div>
              <div className="flex items-center justify-center md:justify-start gap-2">
                <h1 className="text-2xl font-black text-white">{player.name}</h1>
                {player.isMember && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-black">
                    MEMBER
                  </span>
                )}
                {player.hasDgCarryover && (
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-bold flex items-center gap-1">
                    <Sun className="w-3 h-3" /> DG 2x READY
                  </span>
                )}
              </div>
              {player.nickname && (
                <p className="text-sm text-amber-400 font-semibold">{player.nickname}</p>
              )}
              <p className="text-xs text-slate-400 mt-1">Colorado Springs Hold'em League Competitor</p>
            </div>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex items-center gap-3">
            {player.highHandBadges && player.highHandBadges > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 px-3.5 py-2 rounded-xl text-center">
                <div className="text-xs text-amber-400 font-bold flex items-center gap-1 justify-center">
                  <Sparkles className="w-3.5 h-3.5" /> {player.highHandBadges}
                </div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">High Hands</div>
              </div>
            )}

            <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-center">
              <div className="text-lg font-black text-white">{winRate}%</div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Win Rate</div>
            </div>
          </div>

        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-card rounded-xl p-4 border border-slate-800 text-center">
          <div className="text-[10px] uppercase font-semibold text-slate-400">Total Points</div>
          <div className="text-2xl font-black text-amber-400 mt-1">
            {player.totalPoints.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Season Standings</div>
        </div>

        <div className="glass-card rounded-xl p-4 border border-slate-800 text-center">
          <div className="text-[10px] uppercase font-semibold text-slate-400">Games Played</div>
          <div className="text-2xl font-black text-white mt-1">
            {player.gamesPlayed}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Tournaments</div>
        </div>

        <div className="glass-card rounded-xl p-4 border border-slate-800 text-center">
          <div className="text-[10px] uppercase font-semibold text-slate-400">Career Wins</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {player.careerWins}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">1st Place Finishes</div>
        </div>

        <div className="glass-card rounded-xl p-4 border border-slate-800 text-center">
          <div className="text-[10px] uppercase font-semibold text-slate-400">Total Knockouts</div>
          <div className="text-2xl font-black text-rose-400 mt-1">
            {player.careerKOs}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">~{avgKOs} KOs / game</div>
        </div>
      </div>

      {/* Game Points History Ledger (Lynkoid Breakdown) */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-amber-400" /> Recent Game Points History
        </h2>

        <div className="space-y-3">
          {historyBreakdown.map((item, idx) => (
            <div key={idx} className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-b border-slate-800 pb-2">
                <span className="text-slate-400 font-medium">{item.date}</span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-mono text-[11px] font-bold">
                    {item.multiplierLabel}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-semibold">{item.venue}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                {item.awards.map((award, aIdx) => (
                  <div key={aIdx} className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">{award.label}</span>
                    <span className="font-mono font-semibold text-slate-400">
                      <span className="text-[10px] text-slate-500 mr-2">
                        ({award.basePoints.toLocaleString()} base)
                      </span>
                      +{award.points.toLocaleString()} pts
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold">
                <span className="text-amber-400 uppercase tracking-wider text-[10px]">Game Total</span>
                <span className="text-sm font-black text-amber-400">+{item.totalPoints.toLocaleString()} pts</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
