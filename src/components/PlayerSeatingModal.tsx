import React, { useState } from 'react';
import type { Player, GameEntry } from '../types/holdem';
import { 
  Users, 
  UserPlus, 
  Search, 
  X, 
  Check, 
  Sparkles,
  CreditCard
} from 'lucide-react';

interface PlayerSeatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  availablePlayers: Player[];
  currentEntries: GameEntry[];
  onConfirmSeat: (player: Player, tableNumber: number, seatNumber: number) => Promise<void>;
}

export const PlayerSeatingModal: React.FC<PlayerSeatingModalProps> = ({
  isOpen,
  onClose,
  availablePlayers,
  currentEntries,
  onConfirmSeat,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [newPlayerName, setNewPlayerName] = useState<string>('');
  const [newPlayerNickname, setNewPlayerNickname] = useState<string>('');
  const [tableNumber, setTableNumber] = useState<number>(1);
  const [seatNumber, setSeatNumber] = useState<number>(() => {
    const highestSeat = currentEntries.reduce((max, e) => Math.max(max, e.seatNumber), 0);
    return highestSeat + 1;
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  // Filter out players already seated in this game
  const seatedPlayerIds = new Set(currentEntries.map((e) => e.playerId));
  const unseatedPlayers = availablePlayers.filter((p) => !seatedPlayerIds.has(p.$id));

  const filteredPlayers = unseatedPlayers.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.nickname && p.nickname.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let playerToSeat: Player;

      if (isCreatingNew) {
        if (!newPlayerName.trim()) return;
        playerToSeat = {
          $id: `player_walkin_${Date.now()}`,
          leagueId: 'league_1',
          name: newPlayerName.trim(),
          email: `${newPlayerName.trim().toLowerCase().replace(/\s+/g, '')}@holdempro.com`,
          role: 'player',
          nickname: newPlayerNickname.trim() || undefined,
          suitIcon: 'spades',
          isMember: false,
          totalPoints: 0,
          careerWins: 0,
          careerKOs: 0,
          gamesPlayed: 1,
        };

      } else {
        if (!selectedPlayer) return;
        playerToSeat = selectedPlayer;
      }

      await onConfirmSeat(playerToSeat, tableNumber, seatNumber);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel rounded-2xl p-6 border border-slate-700/80 max-w-lg w-full max-h-[90vh] flex flex-col space-y-5 shadow-2xl relative">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">Seat Player at Table</h2>
              <p className="text-xs text-slate-400">Add an existing member or walk-in guest to the live game</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toggle between select existing vs new walkin */}
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setIsCreatingNew(false)}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              !isCreatingNew ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Select League Member
          </button>
          <button
            type="button"
            onClick={() => setIsCreatingNew(true)}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              isCreatingNew ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            New Walk-in Guest
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">
          {!isCreatingNew ? (
            <div className="space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search player by name or nickname..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Player Selection List */}
              <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-xl border border-slate-800 p-2 bg-slate-950/50">
                {filteredPlayers.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-500">
                    No unseated players found. You can switch to &quot;New Walk-in Guest&quot;.
                  </div>
                ) : (
                  filteredPlayers.map((player) => (
                    <div
                      key={player.$id}
                      onClick={() => setSelectedPlayer(player)}
                      className={`p-2.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                        selectedPlayer?.$id === player.$id
                          ? 'bg-amber-500/20 border-amber-500 text-white'
                          : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-amber-400">
                          ♠
                        </span>
                        <div>
                          <div className="text-xs font-bold">{player.name}</div>
                          {player.nickname && (
                            <div className="text-[10px] text-amber-400/80">&quot;{player.nickname}&quot;</div>
                          )}
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-400">
                        {player.totalPoints} pts • {player.careerWins} wins
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3 p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Guest Player Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Johnny Chan"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Nickname (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. The Magician"
                  value={newPlayerNickname}
                  onChange={(e) => setNewPlayerNickname(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          )}

          {/* Table & Seat Configuration */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div>
              <label className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                Table #
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={tableNumber}
                onChange={(e) => setTableNumber(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-sm text-white font-bold"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                Seat #
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={seatNumber}
                onChange={(e) => setSeatNumber(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-sm text-white font-bold"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (!isCreatingNew && !selectedPlayer) || (isCreatingNew && !newPlayerName.trim())}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 shadow-md"
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? 'Seating Player...' : 'Confirm Seating'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
