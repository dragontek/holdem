import React, { useState } from 'react';
import type { Player, Season, Venue } from '../types/holdem';
import { 
  Trophy, 
  Search, 
  Filter, 
  Crown, 
  Flame, 
  Award, 
  CheckCircle2, 
  ChevronRight, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';

interface LeaderboardViewProps {
  players: Player[];
  seasons: Season[];
  venues: Venue[];
  onSelectPlayer: (player: Player) => void;
}

export type SubTabMode = 'points' | 'ranking' | 'wins' | 'kos';

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  players,
  seasons,
  venues,
  onSelectPlayer,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTabMode>('points');
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>(seasons[0]?.$id || 'season_2026_crawl3');
  const [selectedVenueId, setSelectedVenueId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sort Players based on selected sub-tab
  const sortedPlayers = [...players]
    .filter((player) => 
      player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (player.nickname && player.nickname.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      if (activeSubTab === 'points' || activeSubTab === 'ranking') {
        return b.totalPoints - a.totalPoints;
      }
      if (activeSubTab === 'wins') {
        return b.careerWins - a.careerWins;
      }
      if (activeSubTab === 'kos') {
        return b.careerKOs - a.careerKOs;
      }
      return 0;
    });

  const getSuitSymbol = (suit: string) => {
    switch (suit) {
      case 'hearts': return { char: '♥️', color: 'text-red-500 bg-red-500/10 border-red-500/30' };
      case 'diamonds': return { char: '♦️', color: 'text-amber-500 bg-amber-500/10 border-amber-500/30' };
      case 'spades': return { char: '♠️', color: 'text-slate-200 bg-slate-800 border-slate-700' };
      case 'clubs': return { char: '♣️', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30' };
      default: return { char: '♠️', color: 'text-slate-200 bg-slate-800 border-slate-700' };
    }
  };

  const maxPoints = sortedPlayers[0]?.totalPoints || 1;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 pb-24 md:pb-12">
      
      {/* 1. Header & Controls */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> OFFICIAL STANDINGS
              </span>
              <span className="text-xs text-slate-400">Jun 6 2026 — Oct 2 2026</span>
            </div>
            <h1 className="text-2xl font-black text-white mt-1">League Leaderboard</h1>
          </div>

          {/* Season & Venue Selectors */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedSeasonId}
              onChange={(e) => setSelectedSeasonId(e.target.value)}
              className="bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500 flex-1 sm:flex-none"
            >
              {seasons.map((s) => (
                <option key={s.$id} value={s.$id}>
                  Season: {s.name}
                </option>
              ))}
            </select>

            <select
              value={selectedVenueId}
              onChange={(e) => setSelectedVenueId(e.target.value)}
              className="bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500 flex-1 sm:flex-none"
            >
              <option value="all">All Venues</option>
              {venues.map((v) => (
                <option key={v.$id} value={v.$id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search player by name or nickname..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/80 text-sm text-white placeholder-slate-500 pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Sub-Tabs: Points, Ranking, Wins, KOs */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveSubTab('points')}
            className={`py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'points'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Points
          </button>
          <button
            onClick={() => setActiveSubTab('ranking')}
            className={`py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'ranking'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Ranking
          </button>
          <button
            onClick={() => setActiveSubTab('wins')}
            className={`py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'wins'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Wins
          </button>
          <button
            onClick={() => setActiveSubTab('kos')}
            className={`py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'kos'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Knockouts (KOs)
          </button>
        </div>
      </div>

      {/* 2. Top 3 Podium Highlights */}
      {sortedPlayers.length >= 3 && !searchQuery && (
        <div className="grid grid-cols-3 gap-3">
          {/* 2nd Place */}
          <div 
            onClick={() => onSelectPlayer(sortedPlayers[1])}
            className="glass-card rounded-2xl p-4 border border-slate-700/80 text-center relative cursor-pointer hover:border-slate-400 transition-all flex flex-col justify-between"
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-300 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
              2nd Place
            </div>
            <div className="pt-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 border-2 border-slate-300 flex items-center justify-center text-xl font-bold mb-2">
                🥈
              </div>
              <h3 className="font-bold text-white text-sm truncate">{sortedPlayers[1].name}</h3>
              <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                {activeSubTab === 'wins'
                  ? `${sortedPlayers[1].careerWins} Wins`
                  : activeSubTab === 'kos'
                  ? `${sortedPlayers[1].careerKOs} KOs`
                  : `${sortedPlayers[1].totalPoints.toLocaleString()} pts`}
              </p>
            </div>
          </div>

          {/* 1st Place Gold Champion */}
          <div 
            onClick={() => onSelectPlayer(sortedPlayers[0])}
            className="glass-card rounded-2xl p-4 border border-amber-500/80 gold-glow text-center relative cursor-pointer hover:border-amber-400 transition-all transform -translate-y-2 flex flex-col justify-between"
          >
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 text-xs font-black px-3 py-0.5 rounded-full uppercase tracking-wider shadow-lg flex items-center gap-1">
              <Crown className="w-3 h-3 fill-slate-950" /> LEAGUE LEADER
            </div>
            <div className="pt-2">
              <div className="w-14 h-14 mx-auto rounded-full felt-gradient border-2 border-amber-400 flex items-center justify-center text-2xl font-bold mb-2 felt-glow">
                👑
              </div>
              <h3 className="font-extrabold text-amber-300 text-base truncate">{sortedPlayers[0].name}</h3>
              <p className="text-xs text-amber-400 font-black mt-0.5">
                {activeSubTab === 'wins'
                  ? `${sortedPlayers[0].careerWins} Wins`
                  : activeSubTab === 'kos'
                  ? `${sortedPlayers[0].careerKOs} KOs`
                  : `${sortedPlayers[0].totalPoints.toLocaleString()} pts`}
              </p>
            </div>
          </div>

          {/* 3rd Place */}
          <div 
            onClick={() => onSelectPlayer(sortedPlayers[2])}
            className="glass-card rounded-2xl p-4 border border-amber-900/60 text-center relative cursor-pointer hover:border-amber-700 transition-all flex flex-col justify-between"
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-800 text-amber-200 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
              3rd Place
            </div>
            <div className="pt-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-900 border-2 border-amber-700 flex items-center justify-center text-xl font-bold mb-2">
                🥉
              </div>
              <h3 className="font-bold text-white text-sm truncate">{sortedPlayers[2].name}</h3>
              <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                {activeSubTab === 'wins'
                  ? `${sortedPlayers[2].careerWins} Wins`
                  : activeSubTab === 'kos'
                  ? `${sortedPlayers[2].careerKOs} KOs`
                  : `${sortedPlayers[2].totalPoints.toLocaleString()} pts`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Full Standings Table */}
      <div className="space-y-2">
        {sortedPlayers.map((player, index) => {
          const rank = index + 1;
          const suit = getSuitSymbol(player.suitIcon);
          const percentOfMax = (player.totalPoints / maxPoints) * 100;

          return (
            <div
              key={player.$id}
              onClick={() => onSelectPlayer(player)}
              className={`glass-card rounded-xl p-3.5 border transition-all cursor-pointer hover:border-amber-500/50 hover:bg-slate-900/80 flex items-center justify-between gap-3 group relative overflow-hidden ${
                rank === 1
                  ? 'border-amber-500/40 bg-amber-500/5'
                  : rank <= 3
                  ? 'border-slate-700'
                  : 'border-slate-800/80'
              }`}
            >
              {/* Progress background fill */}
              <div 
                className="absolute left-0 top-0 bottom-0 bg-amber-500/5 pointer-events-none transition-all duration-500"
                style={{ width: `${percentOfMax}%` }}
              />

              {/* Rank & Suit Badges */}
              <div className="flex items-center gap-3 relative z-10">
                <span className={`w-8 text-center font-black text-sm ${
                  rank === 1 ? 'text-amber-400 text-base' : rank <= 3 ? 'text-slate-200' : 'text-slate-500'
                }`}>
                  #{rank}
                </span>

                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-base border font-bold ${suit.color}`}>
                  {suit.char}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-sm group-hover:text-amber-300 transition-colors">
                      {player.name}
                    </h3>
                    {player.isMember && (
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-black flex items-center justify-center" title="Verified League Member">
                        M
                      </span>
                    )}
                  </div>
                  {player.nickname && (
                    <p className="text-xs text-slate-400">{player.nickname}</p>
                  )}
                </div>
              </div>

              {/* Score / Metric Display */}
              <div className="flex items-center gap-4 relative z-10">
                <div className="text-right">
                  <div className="text-base font-black text-amber-400">
                    {activeSubTab === 'wins'
                      ? `${player.careerWins} Wins`
                      : activeSubTab === 'kos'
                      ? `${player.careerKOs} KOs`
                      : `${player.totalPoints.toLocaleString()} pts`}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    {player.gamesPlayed} games played
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
