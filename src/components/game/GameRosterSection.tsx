import React from 'react';
import type { GameEntry, Player } from '@/types/holdem';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  UserPlus, 
  Trophy, 
  Plus, 
  Minus, 
  UserMinus 
} from 'lucide-react';

export interface GameRosterSectionProps {
  gameEntries: GameEntry[];
  players: Player[];
  canManage: boolean;
  canFinalize: boolean;
  isFinalizing: boolean;
  isCompleted: boolean;
  onOpenSeatingModal: () => void;
  onFinalizeTournament: () => void;
  onAdjustRebuys: (entryId: string, delta: number) => void;
  onAdjustAddons: (entryId: string, delta: number) => void;
  onInitiateElimination: (entry: GameEntry) => void;
  onSelectPlayer?: (player: Player) => void;
}

export const GameRosterSection: React.FC<GameRosterSectionProps> = ({
  gameEntries,
  players,
  canManage,
  canFinalize,
  isFinalizing,
  isCompleted,
  onOpenSeatingModal,
  onFinalizeTournament,
  onAdjustRebuys,
  onAdjustAddons,
  onInitiateElimination,
  onSelectPlayer,
}) => {
  const activeEntries = gameEntries.filter((ge) => !ge.isEliminated);

  return (
    <div className="bg-slate-900/60 rounded-2xl p-5 border border-slate-800 space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" /> Active Tables &amp; Seating ({activeEntries.length} remaining of {gameEntries.length})
          </h2>
          <p className="text-xs text-slate-400">
            Track chip re-buys, add-ons, and record knockout bounties in real time
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canManage && (
            <Button
              variant="success"
              size="sm"
              onClick={onOpenSeatingModal}
              className="gap-1.5 font-bold cursor-pointer shadow-sm"
            >
              <UserPlus className="w-4 h-4" /> Seat Player
            </Button>
          )}

          {canFinalize && (
            <Button
              variant="outline"
              size="sm"
              onClick={onFinalizeTournament}
              disabled={isFinalizing || isCompleted}
              className="gap-1.5 font-bold text-amber-300 border-amber-500/40 hover:bg-amber-500/10 cursor-pointer disabled:opacity-50"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>{isCompleted ? 'Tournament Finalized' : 'Finalize Event'}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Players Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {gameEntries.map((entry) => (
          <div
            key={entry.$id}
            className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
              entry.isEliminated
                ? 'bg-slate-950/60 border-slate-900 opacity-50'
                : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-amber-400 shrink-0">
                T{entry.tableNumber}S{entry.seatNumber}
              </div>

              <div
                onClick={() => {
                  if (onSelectPlayer) {
                    const p: Player = players.find((x) => x.$id === entry.playerId) || {
                      $id: entry.playerId,
                      name: entry.playerName,
                      email: `${entry.playerName.toLowerCase().replace(/\s+/g, '')}@holdempro.com`,
                      role: 'player',
                      totalPoints: 10000,
                      careerWins: 2,
                      careerKOs: entry.kosCount,
                      gamesPlayed: 8,
                      leagueId: 'league_1',
                      suitIcon: 'spades',
                      isMember: true,
                    };
                    onSelectPlayer(p);
                  }
                }}
                className={onSelectPlayer ? 'cursor-pointer group/player' : ''}
              >
                <h4
                  className={`font-bold text-sm ${
                    entry.isEliminated
                      ? 'line-through text-slate-500'
                      : 'text-white group-hover/player:text-amber-400 transition-colors'
                  }`}
                >
                  {entry.playerName}
                </h4>
                <div className="text-[10px] text-slate-400 flex items-center gap-2">
                  <span>KOs: <strong className="text-amber-400">{entry.kosCount}</strong></span>
                  <span>•</span>
                  <span>Rebuys: <strong className="text-emerald-400">{entry.rebuysCount}</strong></span>
                  <span>•</span>
                  <span>Addons: <strong className="text-indigo-400">{entry.addonsCount}</strong></span>
                </div>
              </div>
            </div>

            {!entry.isEliminated ? (
              canManage ? (
                <div className="flex items-center gap-2 self-end sm:self-center">
                  {/* Rebuy Stepper */}
                  <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800 p-0.5">
                    <button
                      onClick={() => onAdjustRebuys(entry.$id, -1)}
                      className="p-1 text-slate-400 hover:text-white cursor-pointer"
                      title="Subtract Rebuy"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-[10px] font-bold text-emerald-400 px-1.5">RB</span>
                    <button
                      onClick={() => onAdjustRebuys(entry.$id, 1)}
                      className="p-1 text-slate-400 hover:text-white cursor-pointer"
                      title="Add Rebuy ($20)"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Addon Stepper */}
                  <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800 p-0.5">
                    <button
                      onClick={() => onAdjustAddons(entry.$id, -1)}
                      className="p-1 text-slate-400 hover:text-white cursor-pointer"
                      title="Subtract Addon"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-[10px] font-bold text-indigo-400 px-1.5">AO</span>
                    <button
                      onClick={() => onAdjustAddons(entry.$id, 1)}
                      className="p-1 text-slate-400 hover:text-white cursor-pointer"
                      title="Add Add-on ($10)"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Bust Out Button */}
                  <button
                    onClick={() => onInitiateElimination(entry)}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <UserMinus className="w-3.5 h-3.5" /> Bust
                  </button>
                </div>
              ) : (
                <span className="text-xs text-emerald-400 font-bold self-end sm:self-center">
                  Active
                </span>
              )
            ) : (
              <span className="text-xs text-rose-400 font-bold self-end sm:self-center">
                Bust #{entry.finishPosition}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
