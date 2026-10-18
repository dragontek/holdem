import React from 'react';
import type { GameEntry } from '@/types/holdem';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { UserMinus } from 'lucide-react';

export interface GameEliminationDialogProps {
  entryToEliminate: GameEntry | null;
  activeEntries: GameEntry[];
  koWinnerPlayerId: string;
  onKoWinnerChange: (id: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export const GameEliminationDialog: React.FC<GameEliminationDialogProps> = ({
  entryToEliminate,
  activeEntries,
  koWinnerPlayerId,
  onKoWinnerChange,
  onConfirm,
  onClose,
}) => {
  const isOpen = !!entryToEliminate;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-400">
            <UserMinus className="w-5 h-5" /> Record Player Bust-out
          </DialogTitle>
          <DialogDescription>
            Confirm elimination for{' '}
            <span className="font-bold text-white">{entryToEliminate?.playerName}</span>.
            Award knockout bounty credits if applicable.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Label htmlFor="koWinner" className="text-xs text-slate-300">
            Select Knockout (KO) Bounty Winner:
          </Label>
          <select
            id="koWinner"
            value={koWinnerPlayerId}
            onChange={(e) => onKoWinnerChange(e.target.value)}
            className="w-full bg-slate-950 text-white text-sm p-2.5 rounded-lg border border-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
          >
            <option value="">No KO Bounty Awarded (Folded / Timed Out)</option>
            {activeEntries
              .filter((ge) => ge.$id !== entryToEliminate?.$id)
              .map((ge) => (
                <option key={ge.playerId} value={ge.playerId}>
                  KO by: {ge.playerName} (Table {ge.tableNumber})
                </option>
              ))}
          </select>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onConfirm}
            className="font-bold"
          >
            Confirm Elimination
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
