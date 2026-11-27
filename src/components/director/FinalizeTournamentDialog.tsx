import React, { useState } from 'react';
import type { Game, GameEntry } from '@/types/holdem';
import {
  computeFinalizationResults,
  formatOrdinal,
  getEntryStatus,
  type FinalizedEntryResult,
} from '@/lib/scoring';
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
import { Sun, Trophy, Ban, CheckCircle2 } from 'lucide-react';

export interface FinalizeTournamentDialogProps {
  isOpen: boolean;
  game: Game;
  entries: GameEntry[];
  onClose: () => void;
  onConfirmFinalize: (results: FinalizedEntryResult[]) => Promise<void>;
}

export const FinalizeTournamentDialog: React.FC<FinalizeTournamentDialogProps> = ({
  isOpen,
  game,
  entries,
  onClose,
  onConfirmFinalize,
}) => {
  const [placementOverrides, setPlacementOverrides] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const activeEntries = entries.filter((e) => getEntryStatus(e) === 'ACTIVE');

  const remainingPlacements: Record<string, number> = {};
  activeEntries.forEach((entry, idx) => {
    remainingPlacements[entry.$id] = placementOverrides[entry.$id] ?? idx + 1;
  });

  const previewResults = computeFinalizationResults(entries, game, remainingPlacements).sort(
    (a, b) => a.finishPosition - b.finishPosition
  );

  const hasDuplicateActivePlacements = (() => {
    if (game.noGamePlayed || activeEntries.length <= 1) return false;
    const assigned = activeEntries.map((e) => remainingPlacements[e.$id]);
    return new Set(assigned).size !== assigned.length;
  })();

  const handleClose = () => {
    setPlacementOverrides({});
    setIsSubmitting(false);
    onClose();
  };

  const handleConfirm = async () => {
    if (hasDuplicateActivePlacements) return;
    setIsSubmitting(true);
    try {
      await onConfirmFinalize(previewResults);
      handleClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            Finalize Tournament &amp; Commit Official Scores
          </DialogTitle>
          <DialogDescription>
            Review calculated Jack Ten Poker points and Day Game (DG) carryover transitions before
            saving to season standings.
          </DialogDescription>
        </DialogHeader>

        {/* Session Summary Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={game.pointMultiplier && game.pointMultiplier > 1 ? 'default' : 'secondary'}>
            {game.pointMultiplier ?? 1}x Session Multiplier
          </Badge>
          {game.isDayGame && (
            <Badge variant="indigo">
              <Sun className="w-3 h-3" /> Day Game — Non-mucked players earn DG 2x for next game
            </Badge>
          )}
          {game.noGamePlayed && (
            <Badge variant="destructive">
              <Ban className="w-3 h-3" /> No-Game Show Up — Flat 5,000 pts (DG Preserved)
            </Badge>
          )}
        </div>

        {/* Remaining Active Placement Selector */}
        {!game.noGamePlayed && activeEntries.length > 1 && (
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="text-xs font-bold text-amber-400">
              Assign Final Places for Remaining Active Players ({activeEntries.length})
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {activeEntries.map((entry) => (
                <div
                  key={entry.$id}
                  className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800"
                >
                  <span className="text-xs font-semibold text-white truncate">
                    {entry.playerName}
                  </span>
                  <select
                    value={remainingPlacements[entry.$id] ?? 1}
                    onChange={(e) =>
                      setPlacementOverrides((prev) => ({
                        ...prev,
                        [entry.$id]: Number(e.target.value),
                      }))
                    }
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-amber-400"
                  >
                    {activeEntries.map((_, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        {formatOrdinal(idx + 1)} Place
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            {hasDuplicateActivePlacements && (
              <p className="text-[11px] text-rose-400 font-semibold">
                Each remaining player must have a unique finishing position.
              </p>
            )}
          </div>
        )}

        {/* Score Preview Table */}
        <div className="flex-1 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/70">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-2.5 px-3">Pos</th>
                <th className="py-2.5 px-3">Player</th>
                <th className="py-2.5 px-3 text-right">Base</th>
                <th className="py-2.5 px-3 text-center">Mult</th>
                <th className="py-2.5 px-3 text-right">Final Pts</th>
                <th className="py-2.5 px-3">DG Carryover</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {previewResults.map((res) => (
                <tr key={res.entryId} className="hover:bg-slate-900/50">
                  <td className="py-2 px-3 font-mono font-bold text-slate-300">
                    {game.noGamePlayed ? '—' : `#${res.finishPosition}`}
                  </td>
                  <td className="py-2 px-3">
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <span>{res.playerName}</span>
                      {res.status === 'MUCK' && (
                        <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
                          MUCK
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-400">
                    {res.basePoints.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-center font-mono text-indigo-300 font-bold">
                    {res.status === 'MUCK' ? '0x' : `${res.totalMultiplier}x`}
                  </td>
                  <td
                    className={`py-2 px-3 text-right font-mono font-black ${
                      res.status === 'MUCK' ? 'text-rose-400' : 'text-amber-400'
                    }`}
                  >
                    {res.finalPoints.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-[11px]">
                    {res.earnedDgForNextGame ? (
                      <span className="text-indigo-300 font-semibold">Earns DG 2x</span>
                    ) : res.consumedDgCarryover ? (
                      <span className="text-slate-400">Consumed</span>
                    ) : res.nextHasDgCarryover ? (
                      <span className="text-emerald-400">Preserved</span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="default"
            disabled={isSubmitting || hasDuplicateActivePlacements || entries.length === 0}
            onClick={handleConfirm}
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSubmitting ? 'Saving Standings...' : 'Confirm & Commit Points'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
