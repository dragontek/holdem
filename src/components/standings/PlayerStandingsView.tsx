import React, { useState } from 'react';
import type { Player, Season, Venue } from '@/types/holdem';
import { Badge } from '@/components/ui/badge';
import { Search, ChevronRight, Sparkles } from 'lucide-react';
import { StandingsPodium } from './StandingsPodium';

interface PlayerStandingsViewProps {
  players: Player[];
  seasons: Season[];
  venues: Venue[];
  onSelectPlayer: (player: Player) => void;
}

export type StandingsSubTab = 'points' | 'ranking' | 'wins' | 'kos';

export const PlayerStandingsView: React.FC<PlayerStandingsViewProps> = ({
  players,
  seasons,
  venues,
  onSelectPlayer,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<StandingsSubTab>('points');
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>(
    seasons.find((s) => s.isActive)?.$id || seasons[0]?.$id || ''
  );
  const [selectedVenueId, setSelectedVenueId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const sortedPlayers = [...players]
    .filter((player) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = player.name.toLowerCase().includes(q);
        const matchNick = player.nickname?.toLowerCase().includes(q);
        if (!matchName && !matchNick) return false;
      }
      return true;
    })
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
      case 'hearts': return { char: '♥️', color: 'text-red-400 bg-red-500/10 border-red-500/30' };
      case 'diamonds': return { char: '♦️', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
      case 'spades': return { char: '♠️', color: 'text-slate-200 bg-slate-800 border-slate-700' };
      case 'clubs': return { char: '♣️', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
      default: return { char: '♠️', color: 'text-slate-200 bg-slate-800 border-slate-700' };
    }
  };

  const top3 = sortedPlayers.slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 pb-24 md:pb-12 animate-fadeIn">
      {/* 1. Header & Controls */}
      <div className="bg-slate-900/60 rounded-2xl p-5 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>CHAMPIONSHIP STANDINGS</span>
              </Badge>
              <span className="text-xs text-slate-400">Tournament of Champions Race</span>
            </div>
            <h1 className="text-xl font-bold text-white mt-1">Season Points &amp; Rankings</h1>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {seasons.length > 0 && (
              <select
                value={selectedSeasonId}
                onChange={(e) => setSelectedSeasonId(e.target.value)}
                className="bg-slate-950 text-white text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-800 focus:outline-none focus:border-amber-500 flex-1 sm:flex-none cursor-pointer"
              >
                {seasons.map((s) => (
                  <option key={s.$id} value={s.$id}>
                    Season: {s.name}
                  </option>
                ))}
              </select>
            )}

            <select
              value={selectedVenueId}
              onChange={(e) => setSelectedVenueId(e.target.value)}
              className="bg-slate-950 text-white text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-800 focus:outline-none focus:border-amber-500 flex-1 sm:flex-none cursor-pointer"
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

        {/* Search & Sub-tabs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search player or nickname..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 text-xs text-white pl-8 pr-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-slate-500"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
            {[
              { id: 'points' as const, label: 'Points' },
              { id: 'ranking' as const, label: 'TOC Seeds' },
              { id: 'wins' as const, label: 'Wins' },
              { id: 'kos' as const, label: 'KOs' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`py-1 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeSubTab === tab.id
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Top 3 Championship Podium Showcase */}
      {!searchQuery && (
        <StandingsPodium
          top3={top3}
          activeSubTab={activeSubTab}
          onSelectPlayer={onSelectPlayer}
        />
      )}

      {/* 3. Full Standings List with TOC Cutoff */}
      <div className="space-y-2">
        {sortedPlayers.map((player, index) => {
          const rank = index + 1;
          const suit = getSuitSymbol(player.suitIcon);
          const isTOCQualified = rank <= 10;
          const isBubble = rank === 10;

          return (
            <React.Fragment key={player.$id}>
              <div
                onClick={() => onSelectPlayer(player)}
                className={`rounded-xl p-3 border transition-all cursor-pointer hover:border-slate-600 hover:bg-slate-900/80 flex items-center justify-between gap-3 ${
                  rank === 1
                    ? 'border-amber-500/40 bg-amber-500/5'
                    : isTOCQualified
                    ? 'border-slate-800 bg-slate-900/40'
                    : 'border-slate-800/60 bg-slate-950/40 opacity-90'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-6 text-center font-bold text-xs ${
                    rank === 1 ? 'text-amber-400 font-black' : rank <= 3 ? 'text-slate-200' : 'text-slate-500'
                  }`}>
                    #{rank}
                  </span>

                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm border font-bold ${suit.color}`}>
                    {suit.char}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white text-xs sm:text-sm">{player.name}</span>
                      {player.isMember && (
                        <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[9px] font-black flex items-center justify-center">
                          M
                        </span>
                      )}
                    </div>
                    {player.nickname && (
                      <span className="text-[11px] text-slate-400 block">{player.nickname}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    {activeSubTab === 'ranking' ? (
                      <>
                        <div className="text-xs sm:text-sm font-bold text-white">
                          Seed #{rank}
                        </div>
                        <div className={`text-[10px] font-semibold ${isTOCQualified ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {isTOCQualified ? '✓ Qualified for TOC' : 'In the Hunt'}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-xs sm:text-sm font-bold text-amber-400">
                          {activeSubTab === 'wins'
                            ? `${player.careerWins} Wins`
                            : activeSubTab === 'kos'
                            ? `${player.careerKOs} KOs`
                            : `${player.totalPoints.toLocaleString()} pts`}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {player.gamesPlayed} games played
                        </div>
                      </>
                    )}
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </div>
              </div>

              {isBubble && sortedPlayers.length > 10 && (
                <div className="py-2 flex items-center gap-2">
                  <span className="h-px flex-1 bg-amber-500/30" />
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider">
                    Tournament of Champions Cutoff (Top 10 Qualify)
                  </span>
                  <span className="h-px flex-1 bg-amber-500/30" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
