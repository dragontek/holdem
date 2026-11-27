import React, { useState } from 'react';
import type { GameEntry, Player } from '@/types/holdem';
import { getNextAvailableSeat } from '@/lib/scoring';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, SlidersHorizontal, Sun, UserCheck } from 'lucide-react';

export interface RsvpCheckinPanelProps {
  rsvpPlayerIds: string[];
  players: Player[];
  currentEntries: GameEntry[];
  canSeat: boolean;
  onQuickSeat: (player: Player, tableNumber: number, seatNumber: number) => Promise<void>;
  onOpenCustomSeat: (playerId: string) => void;
}

export const RsvpCheckinPanel: React.FC<RsvpCheckinPanelProps> = ({
  rsvpPlayerIds,
  players,
  currentEntries,
  canSeat,
  onQuickSeat,
  onOpenCustomSeat,
}) => {
  const [seatingPlayerId, setSeatingPlayerId] = useState<string | null>(null);

  const seatedIds = new Set(currentEntries.map((e) => e.playerId));
  const rsvpPlayers = rsvpPlayerIds
    .map((id) => players.find((p) => p.$id === id))
    .filter((p): p is Player => Boolean(p));

  const waitingRsvps = rsvpPlayers.filter((p) => !seatedIds.has(p.$id));
  const checkedInCount = rsvpPlayers.length - waitingRsvps.length;

  if (rsvpPlayers.length === 0) {
    return null;
  }

  const nextSeat = getNextAvailableSeat(currentEntries);

  const handleQuickSeat = async (player: Player) => {
    if (!canSeat || seatingPlayerId) return;
    setSeatingPlayerId(player.$id);
    try {
      await onQuickSeat(player, nextSeat.tableNumber, nextSeat.seatNumber);
    } finally {
      setSeatingPlayerId(null);
    }
  };

  if (waitingRsvps.length === 0) {
    return (
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
        <span className="flex items-center gap-2 font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          All {checkedInCount} RSVP&apos;d players are checked in and seated.
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-slate-950/70 border border-emerald-500/30 p-3.5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <h3 className="text-xs sm:text-sm font-bold text-white">
            RSVP&apos;d Players — Waiting to Check In
          </h3>
          <Badge variant="success">{waitingRsvps.length} Waiting</Badge>
          {checkedInCount > 0 && (
            <Badge variant="secondary">{checkedInCount} Seated</Badge>
          )}
        </div>
        <span className="text-[11px] text-slate-400 font-mono">
          Next open: T{nextSeat.tableNumber}S{nextSeat.seatNumber}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {waitingRsvps.map((player) => {
          const isBusy = seatingPlayerId === player.$id;
          return (
            <div
              key={player.$id}
              className="flex items-center justify-between gap-2.5 p-3 rounded-xl bg-slate-900/90 border border-slate-800"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-bold text-white truncate">{player.name}</span>
                  {player.hasDgCarryover && (
                    <Badge variant="indigo" className="text-[10px] px-1.5 py-0">
                      <Sun className="w-2.5 h-2.5" /> DG 2x
                    </Badge>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {player.nickname ? `"${player.nickname}" • ` : ''}
                  {player.totalPoints.toLocaleString()} pts
                </div>
              </div>

              {canSeat && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={Boolean(seatingPlayerId)}
                    onClick={() => onOpenCustomSeat(player.$id)}
                    title="Choose specific table & seat"
                    aria-label={`Choose table and seat for ${player.name}`}
                    className="h-10 w-10"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="success"
                    disabled={Boolean(seatingPlayerId)}
                    onClick={() => handleQuickSeat(player)}
                    className="h-10 px-3.5 text-xs font-bold"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    {isBusy ? 'Seating...' : `Seat T${nextSeat.tableNumber}S${nextSeat.seatNumber}`}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
