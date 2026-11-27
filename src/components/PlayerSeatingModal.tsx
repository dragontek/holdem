import React, { useState } from 'react';
import type { Player, GameEntry } from '../types/holdem';
import { getNextAvailableSeat } from '@/lib/scoring';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Search, Check, UserCheck, Sun } from 'lucide-react';

export interface PlayerSeatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  availablePlayers: Player[];
  currentEntries: GameEntry[];
  rsvpPlayerIds?: string[];
  initialPlayerId?: string | null;
  onConfirmSeat: (player: Player, tableNumber: number, seatNumber: number) => Promise<void>;
}

type SeatingMode = 'rsvps' | 'members' | 'walkin';

export const PlayerSeatingModal: React.FC<PlayerSeatingModalProps> = ({
  isOpen,
  onClose,
  availablePlayers,
  currentEntries,
  rsvpPlayerIds = [],
  initialPlayerId = null,
  onConfirmSeat,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [modeOverride, setModeOverride] = useState<SeatingMode | null>(null);
  const [selectedPlayerOverride, setSelectedPlayerOverride] = useState<string | null>(null);
  const [newPlayerName, setNewPlayerName] = useState<string>('');
  const [newPlayerNickname, setNewPlayerNickname] = useState<string>('');
  const [tableOverride, setTableOverride] = useState<number | null>(null);
  const [seatOverride, setSeatOverride] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const seatedPlayerIds = new Set(currentEntries.map((e) => e.playerId));
  const rsvpSet = new Set(rsvpPlayerIds);

  const unseatedPlayers = availablePlayers.filter((p) => !seatedPlayerIds.has(p.$id));
  const unseatedRsvps = unseatedPlayers.filter((p) => rsvpSet.has(p.$id));

  // Default to RSVPs list first whenever unseated RSVPs exist
  const activeMode: SeatingMode =
    modeOverride ?? (unseatedRsvps.length > 0 ? 'rsvps' : 'members');

  // Sort All Members so RSVP'd players always appear first
  const sortedMembers = [...unseatedPlayers].sort((a, b) => {
    const aRsvp = rsvpSet.has(a.$id) ? 0 : 1;
    const bRsvp = rsvpSet.has(b.$id) ? 0 : 1;
    if (aRsvp !== bRsvp) return aRsvp - bRsvp;
    return a.name.localeCompare(b.name);
  });

  const listSource = activeMode === 'rsvps' ? unseatedRsvps : sortedMembers;
  const filteredPlayers = listSource.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.nickname && p.nickname.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const activeSelectedId = selectedPlayerOverride ?? initialPlayerId;
  const selectedPlayer =
    unseatedPlayers.find((p) => p.$id === activeSelectedId) ?? null;

  const suggestedSeat = getNextAvailableSeat(currentEntries);
  const tableNumber = tableOverride ?? suggestedSeat.tableNumber;
  const seatNumber = seatOverride ?? suggestedSeat.seatNumber;

  const resetLocalState = () => {
    setSearchTerm('');
    setModeOverride(null);
    setSelectedPlayerOverride(null);
    setNewPlayerName('');
    setNewPlayerNickname('');
    setTableOverride(null);
    setSeatOverride(null);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetLocalState();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let playerToSeat: Player;

      if (activeMode === 'walkin') {
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
          gamesPlayed: 0,
        };
      } else {
        if (!selectedPlayer) return;
        playerToSeat = selectedPlayer;
      }

      await onConfirmSeat(playerToSeat, tableNumber, seatNumber);
      handleClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg max-h-[92dvh] flex flex-col p-0 gap-0 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-800 space-y-3">
          <DialogHeader className="text-left pr-8">
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-amber-400" />
              Seat Player at Table
            </DialogTitle>
            <DialogDescription>
              Check in RSVP&apos;d players as they arrive, or seat a league member / walk-in guest.
            </DialogDescription>
          </DialogHeader>

          {/* 3-way Mode Switcher starting with RSVPs */}
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800">
            <button
              type="button"
              onClick={() => setModeOverride('rsvps')}
              className={`min-h-[40px] py-2 px-2 rounded-lg text-xs font-bold transition-colors ${activeMode === 'rsvps'
                ? 'bg-emerald-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              RSVPs ({unseatedRsvps.length})
            </button>
            <button
              type="button"
              onClick={() => setModeOverride('members')}
              className={`min-h-[40px] py-2 px-2 rounded-lg text-xs font-bold transition-colors ${activeMode === 'members'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              All Members
            </button>
            <button
              type="button"
              onClick={() => setModeOverride('walkin')}
              className={`min-h-[40px] py-2 px-2 rounded-lg text-xs font-bold transition-colors ${activeMode === 'walkin'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              Walk-in
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {activeMode !== 'walkin' ? (
            <div className="space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <Input
                  type="text"
                  placeholder={
                    activeMode === 'rsvps'
                      ? 'Filter RSVP list by name...'
                      : 'Search league members by name or nickname...'
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>

              {/* Player Selection List */}
              <div className="max-h-56 overflow-y-auto space-y-2 rounded-xl border border-slate-800 p-2 bg-slate-950/60">
                {filteredPlayers.length === 0 ? (
                  <div className="text-center py-6 px-3 text-xs text-slate-400 space-y-2">
                    <p>
                      {activeMode === 'rsvps'
                        ? 'No unseated RSVP players remaining.'
                        : 'No matching unseated members found.'}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setModeOverride(activeMode === 'rsvps' ? 'members' : 'walkin')
                      }
                    >
                      {activeMode === 'rsvps' ? 'Browse All Members' : 'Add Walk-in Guest'}
                    </Button>
                  </div>
                ) : (
                  filteredPlayers.map((player) => {
                    const isSelected = selectedPlayer?.$id === player.$id;
                    const isRsvp = rsvpSet.has(player.$id);
                    return (
                      <button
                        key={player.$id}
                        type="button"
                        onClick={() => setSelectedPlayerOverride(player.$id)}
                        className={`w-full min-h-[52px] p-3 rounded-xl border text-left flex items-center justify-between gap-2 transition-colors ${isSelected
                          ? 'bg-amber-500/20 border-amber-500 text-white'
                          : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 text-slate-300'
                          }`}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-bold text-white truncate">
                              {player.name}
                            </span>
                            {isRsvp && (
                              <Badge variant="success" className="text-[10px] px-1.5 py-0">
                                <UserCheck className="w-2.5 h-2.5" /> RSVP
                              </Badge>
                            )}
                            {player.hasDgCarryover && (
                              <Badge variant="indigo" className="text-[10px] px-1.5 py-0">
                                <Sun className="w-2.5 h-2.5" /> DG 2x
                              </Badge>
                            )}
                          </div>
                          {player.nickname && (
                            <div className="text-[11px] text-amber-400/80 truncate">
                              &quot;{player.nickname}&quot;
                            </div>
                          )}
                        </div>

                        <div className="text-[11px] font-mono text-slate-400 shrink-0">
                          {player.totalPoints.toLocaleString()} pts
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
              <div className="space-y-1.5">
                <Label htmlFor="walkin-name">Guest Player Name *</Label>
                <Input
                  id="walkin-name"
                  type="text"
                  required
                  placeholder="e.g. Johnny Chan"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  className="h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="walkin-nickname">Nickname (Optional)</Label>
                <Input
                  id="walkin-nickname"
                  type="text"
                  placeholder="e.g. The Magician"
                  value={newPlayerNickname}
                  onChange={(e) => setNewPlayerNickname(e.target.value)}
                  className="h-11"
                />
              </div>
            </div>
          )}

          {/* Table & Seat Configuration */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="space-y-1.5">
              <Label htmlFor="seat-table-num" className="text-amber-400 uppercase text-[11px]">
                Table #
              </Label>
              <Input
                id="seat-table-num"
                type="number"
                min={1}
                max={20}
                value={tableNumber}
                onChange={(e) => setTableOverride(Number(e.target.value))}
                className="h-11 font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="seat-num" className="text-amber-400 uppercase text-[11px]">
                Seat #
              </Label>
              <Input
                id="seat-num"
                type="number"
                min={1}
                max={10}
                value={seatNumber}
                onChange={(e) => setSeatOverride(Number(e.target.value))}
                className="h-11 font-mono font-bold"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} className="h-11">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              disabled={
                isSubmitting ||
                (activeMode !== 'walkin' && !selectedPlayer) ||
                (activeMode === 'walkin' && !newPlayerName.trim())
              }
              className="h-11 px-5"
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? 'Seating...' : `Seat at T${tableNumber}S${seatNumber}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
