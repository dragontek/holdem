import React from 'react';
import type { Game, GameEntry, HandBonusCode, KnockoutCode } from '@/types/holdem';
import {
  calculateEntryScore,
  getEntryHandBonuses,
  getEntryKnockouts,
  getEntryStatus,
  HAND_BONUS_CODE_LIST,
  HAND_BONUS_DEFINITIONS,
  hasReachedShowUpCutoff,
  isShowUpAwarded,
  KO_CODE_LIST,
  KO_DEFINITIONS,
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
import {
  Award,
  Ban,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  Minus,
  Plus,
  RotateCcw,
  Sun,
  UserMinus,
} from 'lucide-react';

export interface PlayerScoreDialogProps {
  isOpen: boolean;
  game: Game;
  entries: GameEntry[];
  selectedEntryId: string | null;
  onSelectEntryId: (entryId: string) => void;
  onClose: () => void;
  onUpdateEntry: (entryId: string, updates: Partial<GameEntry>) => void;
  onAdjustRebuys: (entryId: string, delta: number) => void;
  onAdjustAddons: (entryId: string, delta: number) => void;
  onRequestEliminate: (entry: GameEntry) => void;
}

export const PlayerScoreDialog: React.FC<PlayerScoreDialogProps> = ({
  isOpen,
  game,
  entries,
  selectedEntryId,
  onSelectEntryId,
  onClose,
  onUpdateEntry,
  onAdjustRebuys,
  onAdjustAddons,
  onRequestEliminate,
}) => {
  const sortedEntries = [...entries].sort((a, b) => {
    if (a.tableNumber !== b.tableNumber) return a.tableNumber - b.tableNumber;
    return a.seatNumber - b.seatNumber;
  });

  const activeIndex = Math.max(
    0,
    sortedEntries.findIndex((e) => e.$id === selectedEntryId)
  );
  const entry = sortedEntries[activeIndex] ?? null;

  if (!entry) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-md bg-slate-950">
          <DialogHeader>
            <DialogTitle>Score Player</DialogTitle>
            <DialogDescription>Seat players first to record session points.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" onClick={onClose} className="w-full h-11">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const breakdown = calculateEntryScore(entry, game);
  const knockouts = getEntryKnockouts(entry);
  const handBonuses = getEntryHandBonuses(entry);
  const status = breakdown.status;
  const isNoGame = Boolean(game.noGamePlayed);

  const countKO = (code: KnockoutCode) => knockouts.filter((c) => c === code).length;
  const countHD = (code: HandBonusCode) => handBonuses.filter((c) => c === code).length;

  const adjustKO = (code: KnockoutCode, delta: 1 | -1) => {
    if (delta === 1) {
      const next = [...knockouts, code];
      onUpdateEntry(entry.$id, { knockouts: next, kosCount: next.length });
    } else {
      const idx = knockouts.lastIndexOf(code);
      if (idx === -1) return;
      const next = knockouts.filter((_, i) => i !== idx);
      onUpdateEntry(entry.$id, { knockouts: next, kosCount: next.length });
    }
  };

  const adjustHD = (code: HandBonusCode, delta: 1 | -1) => {
    if (delta === 1) {
      onUpdateEntry(entry.$id, { handBonuses: [...handBonuses, code] });
    } else {
      const idx = handBonuses.lastIndexOf(code);
      if (idx === -1) return;
      onUpdateEntry(entry.$id, { handBonuses: handBonuses.filter((_, i) => i !== idx) });
    }
  };

  const handleToggleMuck = () => {
    if (status === 'MUCK') {
      const restored = entry.finishPosition || entry.knockedOutByPlayerId ? 'ELIMINATED' : 'ACTIVE';
      onUpdateEntry(entry.$id, { status: restored, isEliminated: restored !== 'ACTIVE' });
    } else {
      onUpdateEntry(entry.$id, { status: 'MUCK', isEliminated: true });
    }
  };

  const handleRestoreActive = () => {
    onUpdateEntry(entry.$id, {
      status: 'ACTIVE',
      isEliminated: false,
      finishPosition: undefined,
      eliminatedBySeat: undefined,
      knockedOutByPlayerId: undefined,
      knockedOutByPlayerName: undefined,
    });
  };

  const handleCyclePlayer = (dir: -1 | 1) => {
    if (sortedEntries.length <= 1) return;
    const nextIdx = (activeIndex + dir + sortedEntries.length) % sortedEntries.length;
    onSelectEntryId(sortedEntries[nextIdx].$id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[92dvh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-950 border-slate-700">
        {/* Sticky Header + Full-Width Player Switcher */}
        <div className="p-4 sm:p-5 border-b border-slate-800 space-y-3 bg-slate-950 shrink-0">
          <DialogHeader className="text-left pr-8">
            <DialogTitle className="flex items-center gap-2 text-lg text-white">
              <Award className="w-5 h-5 text-amber-400 shrink-0" />
              Player Actions &amp; Points
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-300">
              Adjust knockouts, hand bonuses, rebuys, and status. Changes save immediately.
            </DialogDescription>
          </DialogHeader>

          {/* Player Switcher Row */}
          <div className="flex items-center gap-2 w-full">
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={sortedEntries.length <= 1}
              onClick={() => handleCyclePlayer(-1)}
              aria-label="Previous player"
              className="h-11 w-11 shrink-0 bg-slate-900 border-slate-700"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>

            <select
              value={entry.$id}
              onChange={(e) => onSelectEntryId(e.target.value)}
              aria-label="Select player to score"
              className="flex-1 min-w-0 h-11 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {sortedEntries.map((item) => {
                const st = getEntryStatus(item);
                const pts = calculateEntryScore(item, game).finalPoints;
                return (
                  <option key={item.$id} value={item.$id}>
                    T{item.tableNumber}S{item.seatNumber} — {item.playerName} ({pts.toLocaleString()} pts
                    {st === 'MUCK' ? ' • MUCK' : st === 'ELIMINATED' ? ` • #${item.finishPosition}` : ''})
                  </option>
                );
              })}
            </select>

            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={sortedEntries.length <= 1}
              onClick={() => handleCyclePlayer(1)}
              aria-label="Next player"
              className="h-11 w-11 shrink-0 bg-slate-900 border-slate-700"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Live Total Score Bar */}
          <div className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-slate-900 border border-slate-700">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={status === 'MUCK' ? 'destructive' : status === 'ELIMINATED' ? 'secondary' : 'success'}>
                {status === 'MUCK' ? 'MUCK' : status === 'ELIMINATED' ? `Bust #${entry.finishPosition}` : 'Active'}
              </Badge>
              <span className="text-xs font-mono text-slate-300">
                {breakdown.basePoints.toLocaleString()} base × {breakdown.totalMultiplier}x
              </span>
            </div>
            <div
              className={`text-xl font-mono font-black shrink-0 ${
                breakdown.isMucked ? 'text-rose-400' : 'text-amber-400'
              }`}
            >
              {breakdown.finalPoints.toLocaleString()} pts
            </div>
          </div>
        </div>

        {/* Scrollable Full-Width Sections Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6 bg-slate-950">
          {isNoGame ? (
            <div className="w-full p-4 rounded-xl bg-amber-500/15 border border-amber-500/40 text-sm text-amber-200">
              <strong>No-Game Show Up Active:</strong> All non-mucked players receive a flat{' '}
              <strong>5,000 pts</strong>. Toggle Muck below if this player forfeited.
            </div>
          ) : (
            <>
              {/* 1. Knockouts (KO) — Full-Width Rows */}
              <section className="w-full space-y-2.5">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                    <Flame className="w-4 h-4" /> Knockouts (KO)
                  </h3>
                  <span className="text-xs font-mono font-bold text-slate-300">
                    +{breakdown.koPoints.toLocaleString()} base
                  </span>
                </div>

                <div className="space-y-2">
                  {KO_CODE_LIST.map((code) => {
                    const def = KO_DEFINITIONS[code];
                    const count = countKO(code);
                    return (
                      <div
                        key={code}
                        className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-colors ${
                          count > 0
                            ? code === 'R'
                              ? 'bg-purple-950/60 border-purple-500/50'
                              : 'bg-rose-950/50 border-rose-500/50'
                            : 'bg-slate-900 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-9 h-9 rounded-lg bg-slate-950 border border-slate-700 font-mono text-sm font-black text-amber-400 flex items-center justify-center shrink-0">
                            {def.symbol}
                          </span>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-white leading-tight">
                              {def.label}
                            </div>
                            <div className="text-xs font-mono text-slate-300 mt-0.5">
                              +{def.points.toLocaleString()} base pts each
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            disabled={count === 0}
                            onClick={() => adjustKO(code, -1)}
                            aria-label={`Remove ${def.label}`}
                            className="h-11 w-11 rounded-xl bg-slate-950 border-slate-700"
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="w-8 text-center font-mono text-lg font-black text-white">
                            {count}
                          </span>
                          <Button
                            type="button"
                            variant="default"
                            size="icon"
                            onClick={() => adjustKO(code, 1)}
                            aria-label={`Add ${def.label}`}
                            className="h-11 w-11 rounded-xl"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* 2. Survivor & Hand Bonuses (HD) — Full-Width Rows */}
              <section className="w-full space-y-2.5">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Award className="w-4 h-4" /> Survivor &amp; Hand Bonuses (HD)
                  </h3>
                  <span className="text-xs font-mono font-bold text-slate-300">
                    +{(breakdown.survivorPoints + breakdown.handBonusPoints).toLocaleString()} base
                  </span>
                </div>

                <div className="space-y-2">
                  {HAND_BONUS_CODE_LIST.map((code) => {
                    const def = HAND_BONUS_DEFINITIONS[code];
                    const count = countHD(code);
                    const isSurvivor = code === 'SURV';
                    return (
                      <div
                        key={code}
                        className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-colors ${
                          count > 0
                            ? isSurvivor
                              ? 'bg-amber-950/50 border-amber-500/50'
                              : 'bg-emerald-950/50 border-emerald-500/50'
                            : 'bg-slate-900 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`w-9 h-9 rounded-lg bg-slate-950 border border-slate-700 font-mono text-sm font-black flex items-center justify-center shrink-0 ${
                              isSurvivor ? 'text-amber-400' : 'text-emerald-400'
                            }`}
                          >
                            {def.symbol}
                          </span>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-white leading-tight">
                              {def.label}
                            </div>
                            <div className="text-xs text-slate-300 mt-0.5">
                              <span className="font-mono">+{def.points.toLocaleString()} base</span>
                              {isSurvivor ? ' • All-in & survives without busting' : ''}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            disabled={count === 0}
                            onClick={() => adjustHD(code, -1)}
                            aria-label={`Remove ${def.label}`}
                            className="h-11 w-11 rounded-xl bg-slate-950 border-slate-700"
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="w-8 text-center font-mono text-lg font-black text-white">
                            {count}
                          </span>
                          <Button
                            type="button"
                            variant="success"
                            size="icon"
                            onClick={() => adjustHD(code, 1)}
                            aria-label={`Add ${def.label}`}
                            className="h-11 w-11 rounded-xl"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* 3. Rebuys & Add-ons — Full-Width Rows */}
              <section className="w-full space-y-2.5">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-indigo-300">
                    Rebuys &amp; Add-ons
                  </h3>
                </div>

                <div className="space-y-2">
                  <div className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border bg-slate-900 border-slate-800">
                    <div>
                      <div className="text-sm font-bold text-white">Rebuys (RB)</div>
                      <div className="text-xs text-slate-300">Chip re-entries during rebuy window</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={entry.rebuysCount === 0}
                        onClick={() => onAdjustRebuys(entry.$id, -1)}
                        aria-label="Subtract Rebuy"
                        className="h-11 w-11 rounded-xl bg-slate-950 border-slate-700"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-8 text-center font-mono text-lg font-black text-emerald-400">
                        {entry.rebuysCount}
                      </span>
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        onClick={() => onAdjustRebuys(entry.$id, 1)}
                        aria-label="Add Rebuy"
                        className="h-11 w-11 rounded-xl"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border bg-slate-900 border-slate-800">
                    <div>
                      <div className="text-sm font-bold text-white">Add-ons (AO)</div>
                      <div className="text-xs text-slate-300">Break chip add-ons</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={entry.addonsCount === 0}
                        onClick={() => onAdjustAddons(entry.$id, -1)}
                        aria-label="Subtract Add-on"
                        className="h-11 w-11 rounded-xl bg-slate-950 border-slate-700"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-8 text-center font-mono text-lg font-black text-indigo-300">
                        {entry.addonsCount}
                      </span>
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        onClick={() => onAdjustAddons(entry.$id, 1)}
                        aria-label="Add Add-on"
                        className="h-11 w-11 rounded-xl"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

          {/* 4. Multipliers & Status — Full-Width Rows */}
          <section className="w-full space-y-2.5">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                Multipliers &amp; Status
              </h3>
            </div>

            <div className="space-y-2">
              {!isNoGame && (
                <>
                  {(() => {
                    const showUpOn = isShowUpAwarded(entry, game);
                    const pastCutoff = hasReachedShowUpCutoff(game);
                    return (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateEntry(entry.$id, { showUpAwarded: !showUpOn })
                        }
                        className={`w-full min-h-[56px] px-4 py-3 rounded-xl border text-left transition-colors flex items-center justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                          showUpOn
                            ? 'bg-emerald-500/15 border-emerald-500/50 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Award
                            className={`w-5 h-5 shrink-0 ${
                              showUpOn ? 'text-emerald-400' : 'text-slate-500'
                            }`}
                          />
                          <div>
                            <div className="text-sm font-bold text-white">Show Up Points (+600)</div>
                            <div className="text-xs text-slate-300">
                              {showUpOn
                                ? 'Awarded — Seated by the 1:15 mark (after Break 1 & Hour 2 Level 1)'
                                : pastCutoff
                                ? 'Seated after 1:15 cutoff — Tap to grant manually'
                                : 'Auto-awarded at the 1:15 mark — Tap to grant early'}
                            </div>
                          </div>
                        </div>
                        <Badge variant={showUpOn ? 'success' : 'secondary'}>
                          {showUpOn ? (
                            <>
                              <Check className="w-3 h-3" /> +600
                            </>
                          ) : pastCutoff ? (
                            'OFF'
                          ) : (
                            '1:15'
                          )}
                        </Badge>
                      </button>
                    );
                  })()}

                  <button
                    type="button"
                    onClick={() =>
                      onUpdateEntry(entry.$id, { hasDgCarryover: !entry.hasDgCarryover })
                    }
                    className={`w-full min-h-[56px] px-4 py-3 rounded-xl border text-left transition-colors flex items-center justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                      entry.hasDgCarryover
                        ? 'bg-indigo-500/20 border-indigo-500/60 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Sun
                        className={`w-5 h-5 shrink-0 ${
                          entry.hasDgCarryover ? 'text-indigo-300' : 'text-slate-500'
                        }`}
                      />
                      <div>
                        <div className="text-sm font-bold text-white">Day Game (DG) 2x Carryover</div>
                        <div className="text-xs text-slate-300">
                          Doubles this player&apos;s session multiplier (up to 6x)
                        </div>
                      </div>
                    </div>
                    <Badge variant={entry.hasDgCarryover ? 'indigo' : 'secondary'}>
                      {entry.hasDgCarryover ? (
                        <>
                          <Check className="w-3 h-3" /> 2x ON
                        </>
                      ) : (
                        'OFF'
                      )}
                    </Badge>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => onUpdateEntry(entry.$id, { rebuyOnly: !entry.rebuyOnly })}
                className={`w-full min-h-[56px] px-4 py-3 rounded-xl border text-left transition-colors flex items-center justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                  entry.rebuyOnly
                    ? 'bg-slate-800 border-slate-500 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="text-sm font-bold text-white">Rebuy Only / Declined (NO)</div>
                  <div className="text-xs text-slate-300">Marks NO in the Rebuy Only scorecard column</div>
                </div>
                <Badge variant={entry.rebuyOnly ? 'default' : 'secondary'}>
                  {entry.rebuyOnly ? 'NO' : 'OFF'}
                </Badge>
              </button>

              <button
                type="button"
                onClick={handleToggleMuck}
                className={`w-full min-h-[56px] px-4 py-3 rounded-xl border text-left transition-colors flex items-center justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                  status === 'MUCK'
                    ? 'bg-rose-950/70 border-rose-500 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Ban
                    className={`w-5 h-5 shrink-0 ${
                      status === 'MUCK' ? 'text-rose-400' : 'text-slate-500'
                    }`}
                  />
                  <div>
                    <div className="text-sm font-bold text-white">Muck (M — Forfeit All Points)</div>
                    <div className="text-xs text-slate-300">
                      Zeroes player score (0 pts) while preserving eliminator KO credit
                    </div>
                  </div>
                </div>
                <Badge variant={status === 'MUCK' ? 'destructive' : 'secondary'}>
                  {status === 'MUCK' ? 'MUCKED' : 'OFF'}
                </Badge>
              </button>
            </div>
          </section>

          {/* 5. Elimination / Restore — Full-Width Action */}
          <section className="w-full pt-1">
            {status === 'ACTIVE' ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onClose();
                  onRequestEliminate(entry);
                }}
                className="w-full h-12 text-sm font-bold border-rose-500/50 text-rose-400 hover:bg-rose-500/15"
              >
                <UserMinus className="w-4 h-4" /> Record Bust Out / Elimination for {entry.playerName}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={handleRestoreActive}
                className="w-full h-12 text-sm font-bold text-white border-slate-700"
              >
                <RotateCcw className="w-4 h-4" /> Restore {entry.playerName} to Active
              </Button>
            )}
          </section>
        </div>

        {/* Sticky Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-slate-400">Changes save automatically</span>
          <Button type="button" onClick={onClose} className="h-11 px-8 text-sm font-bold">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
