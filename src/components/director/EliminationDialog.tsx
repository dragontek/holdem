import React, { useState } from 'react';
import type { GameEntry, KnockoutCode } from '@/types/holdem';
import { KO_DEFINITIONS } from '@/lib/scoring';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Ban, Skull } from 'lucide-react';

export interface EliminationConfirmPayload {
  eliminatedEntryId: string;
  koWinnerPlayerId?: string;
  koType: KnockoutCode | null;
  isMuck: boolean;
}

export interface EliminationDialogProps {
  entry: GameEntry | null;
  eligibleEliminators: GameEntry[];
  finishPositionPreview: number;
  onClose: () => void;
  onConfirm: (payload: EliminationConfirmPayload) => Promise<void> | void;
}

export const EliminationDialog: React.FC<EliminationDialogProps> = ({
  entry,
  eligibleEliminators,
  finishPositionPreview,
  onClose,
  onConfirm,
}) => {
  const [koWinnerPlayerId, setKoWinnerPlayerId] = useState<string>('');
  const [koType, setKoType] = useState<KnockoutCode | null>('K');
  const [isMuck, setIsMuck] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const resetState = () => {
    setKoWinnerPlayerId('');
    setKoType('K');
    setIsMuck(false);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleConfirm = async () => {
    if (!entry) return;
    setIsSubmitting(true);
    try {
      await onConfirm({
        eliminatedEntryId: entry.$id,
        koWinnerPlayerId: koWinnerPlayerId || undefined,
        koType: koWinnerPlayerId ? koType : null,
        isMuck,
      });
      handleClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={Boolean(entry)} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Skull className="w-5 h-5 text-rose-400" />
            Record Elimination — {entry?.playerName}
          </DialogTitle>
          <DialogDescription>
            Finishing position #{finishPositionPreview}. Credit the eliminating seat to keep the KO
            audit trail in sync.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Eliminator Selector */}
          <div className="space-y-1.5">
            <Label htmlFor="eliminator-select">Knocked Out By (Seat #)</Label>
            <select
              id="eliminator-select"
              value={koWinnerPlayerId}
              onChange={(e) => setKoWinnerPlayerId(e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">No KO Credited / Unassisted</option>
              {eligibleEliminators.map((ge) => (
                <option key={ge.$id} value={ge.playerId}>
                  Seat {ge.seatNumber} (T{ge.tableNumber}) — {ge.playerName}
                </option>
              ))}
            </select>
          </div>

          {/* KO Bonus Type */}
          {koWinnerPlayerId && (
            <div className="space-y-1.5">
              <Label>Knockout Credit for Eliminator</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['K', 'R'] as const).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setKoType(code)}
                    className={`p-2.5 rounded-xl border text-left transition-colors ${
                      koType === code
                        ? 'bg-amber-500/15 border-amber-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-mono font-bold text-amber-400">{code}</div>
                    <div className="text-[11px] font-semibold mt-0.5">
                      {KO_DEFINITIONS[code].shortLabel}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      +{KO_DEFINITIONS[code].points.toLocaleString()}
                    </div>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setKoType(null)}
                  className={`p-2.5 rounded-xl border text-left transition-colors ${
                    koType === null
                      ? 'bg-slate-800 border-slate-600 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-mono font-bold">—</div>
                  <div className="text-[11px] font-semibold mt-0.5">None</div>
                  <div className="text-[10px] text-slate-400">Audit only</div>
                </button>
              </div>
            </div>
          )}

          {/* Muck Override Toggle */}
          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-950/20 border border-rose-900/50 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isMuck}
              onChange={(e) => setIsMuck(e.target.checked)}
              className="mt-0.5 rounded border-slate-700 bg-slate-950 text-rose-500 focus:ring-rose-500"
            />
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                <Ban className="w-3.5 h-3.5" /> Mark as Muck (M — Forfeit Points)
              </div>
              <p className="text-[11px] text-slate-400">
                Zeroes out {entry?.playerName}&apos;s score while preserving the eliminator&apos;s KO credit.
              </p>
            </div>
          </label>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Recording...' : isMuck ? 'Confirm Muck' : 'Confirm Bust Out'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
