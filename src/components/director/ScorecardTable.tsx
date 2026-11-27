import React, { useState } from 'react';
import type { Game, GameEntry, HandBonusCode, KnockoutCode } from '@/types/holdem';
import type { LiveScoreNotification } from '@/lib/liveScoreEvents';
import { QuickScoreStrip } from './QuickScoreStrip';
import {
  auditKnockouts,
  calculateEntryScore,
  getEntryHandBonuses,
  getEntryKnockouts,
  getEntryStatus,
  HAND_BONUS_CODE_LIST,
  HAND_BONUS_DEFINITIONS,
  KO_CODE_LIST,
  KO_DEFINITIONS,
} from '@/lib/scoring';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  PlusCircle,
  Sun,
} from 'lucide-react';

export interface ScorecardTableProps {
  game: Game;
  entries: GameEntry[];
  canEdit: boolean;
  highlightedPlayers?: ReadonlyMap<string, LiveScoreNotification>;
  onUpdateEntry: (entryId: string, updates: Partial<GameEntry>) => void;
  onRequestScorePlayer: (entryId: string) => void;
  onRequestEliminate?: (entry: GameEntry) => void;
}

function summarizeCodes<T extends string>(codes: T[], order: readonly T[]): { code: T; count: number }[] {
  const counts = new Map<T, number>();
  for (const c of codes) {
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  return order
    .filter((code) => (counts.get(code) ?? 0) > 0)
    .map((code) => ({ code, count: counts.get(code) ?? 0 }));
}

export const ScorecardTable: React.FC<ScorecardTableProps> = ({
  game,
  entries,
  canEdit,
  highlightedPlayers,
  onUpdateEntry,
  onRequestScorePlayer,
  onRequestEliminate,
}) => {
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const isLocked = !canEdit || game.status === 'completed';

  const audit = auditKnockouts(entries);
  const sortedEntries = [...entries].sort((a, b) => {
    if (a.tableNumber !== b.tableNumber) return a.tableNumber - b.tableNumber;
    return a.seatNumber - b.seatNumber;
  });

  const handleQuickCreditK = (entry: GameEntry) => {
    if (isLocked) return;
    const next: KnockoutCode[] = [...getEntryKnockouts(entry), 'K'];
    onUpdateEntry(entry.$id, { knockouts: next, kosCount: next.length });
  };

  const handleQuickAwardBonus = (entry: GameEntry, code: HandBonusCode) => {
    if (isLocked) return;
    const next: HandBonusCode[] = [...getEntryHandBonuses(entry), code];
    onUpdateEntry(entry.$id, { handBonuses: next });
  };

  const totalSessionPoints = sortedEntries.reduce(
    (sum, entry) => sum + calculateEntryScore(entry, game).finalPoints,
    0
  );
  const activeCount = sortedEntries.filter((e) => getEntryStatus(e) === 'ACTIVE').length;
  const muckedCount = sortedEntries.filter((e) => getEntryStatus(e) === 'MUCK').length;

  return (
    <Card className="border-slate-800 bg-slate-900/60">
      <CardHeader className="pb-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-amber-400" />
              Jack Ten Poker Digital Scorecard
            </CardTitle>
            <CardDescription className="mt-0.5">
              {sortedEntries.length} seated • {activeCount} active • {muckedCount} mucked •{' '}
              <span className="text-amber-400 font-semibold">
                {totalSessionPoints.toLocaleString()} total pts
              </span>
            </CardDescription>
          </div>

          {!isLocked && sortedEntries.length > 0 && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Button
                type="button"
                variant="default"
                onClick={() => onRequestScorePlayer(sortedEntries[0].$id)}
                className="h-11 px-4 text-sm font-bold"
              >
                <PlusCircle className="w-4 h-4" />
                Add Points
              </Button>
            </div>
          )}
        </div>

        {/* Knockout Cross-Check Audit Warning */}
        {!audit.isBalanced && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Knockout Audit Alert — Elimination records exceed recorded KO badges
            </div>
            <div className="space-y-2">
              {audit.issues.map((issue) => {
                const targetEntry = entries.find((e) => e.$id === issue.entryId);
                return (
                  <div
                    key={issue.entryId}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-300"
                  >
                    <span>{issue.message}</span>
                    {!isLocked && targetEntry && (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 px-3 text-xs shrink-0"
                        onClick={() => handleQuickCreditK(targetEntry)}
                      >
                        + Credit K (+1,000)
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {sortedEntries.length === 0 ? (
          <div className="text-center py-10 rounded-xl border border-dashed border-slate-800 text-slate-400 text-sm">
            No players seated yet. Seat players to begin tracking scores.
          </div>
        ) : (
          sortedEntries.map((entry) => {
            const breakdown = calculateEntryScore(entry, game);
            const koSummary = summarizeCodes<KnockoutCode>(getEntryKnockouts(entry), KO_CODE_LIST);
            const hdSummary = summarizeCodes<HandBonusCode>(
              getEntryHandBonuses(entry),
              HAND_BONUS_CODE_LIST
            );
            const isExpanded = expandedEntryId === entry.$id;
            const status = breakdown.status;
            const highlight = highlightedPlayers?.get(entry.playerId);

            return (
              <div
                key={entry.$id}
                className={`rounded-xl border transition-colors ${
                  highlight
                    ? 'bg-amber-500/10 border-amber-400 player-award-highlight'
                    : status === 'MUCK'
                    ? 'bg-rose-950/20 border-rose-900/50'
                    : status === 'ELIMINATED'
                    ? 'bg-slate-950/60 border-slate-800/80'
                    : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="p-4 space-y-3">
                  {highlight && (
                    <div className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-400/50 text-xs font-extrabold text-amber-200 flex items-center justify-between gap-2">
                      <span>{highlight.headline}</span>
                      {highlight.pointsAwarded > 0 && (
                        <span className="font-mono text-amber-300 shrink-0">
                          +{highlight.pointsAwarded.toLocaleString()} pts
                        </span>
                      )}
                    </div>
                  )}

                  {/* Top Row: Identity + Live Score */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs font-bold text-amber-400">
                          T{entry.tableNumber}S{entry.seatNumber}
                        </span>
                        <span
                          className={`font-bold text-base truncate ${
                            status === 'MUCK'
                              ? 'line-through text-rose-400'
                              : status === 'ELIMINATED'
                              ? 'text-slate-400'
                              : 'text-white'
                          }`}
                        >
                          {entry.playerName}
                        </span>
                      </div>

                      {/* Read-only Recorded Points & Modifier Pills */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {status === 'MUCK' && <Badge variant="destructive">MUCK</Badge>}
                        {entry.finishPosition && entry.finishPosition > 0 && (
                          <Badge variant={entry.finishPosition <= 5 ? 'default' : 'secondary'}>
                            #{entry.finishPosition}
                          </Badge>
                        )}
                        {entry.hasDgCarryover && (
                          <Badge variant="indigo">
                            <Sun className="w-3 h-3" /> DG 2x
                          </Badge>
                        )}
                        {entry.rebuyOnly && <Badge variant="secondary">NO</Badge>}
                        {koSummary.map(({ code, count }) => (
                          <Badge
                            key={code}
                            variant={code === 'R' ? 'purple' : 'destructive'}
                            className="font-mono"
                          >
                            {KO_DEFINITIONS[code].symbol}
                            {count > 1 ? `×${count}` : ''}
                          </Badge>
                        ))}
                        {hdSummary.map(({ code, count }) => (
                          <Badge
                            key={code}
                            variant={code === 'SURV' ? 'default' : 'success'}
                            className="font-mono"
                          >
                            {HAND_BONUS_DEFINITIONS[code].symbol}
                            {count > 1 ? `×${count}` : ''}
                          </Badge>
                        ))}
                        {entry.eliminatedBySeat && (
                          <span className="text-xs text-slate-400">
                            KO&apos;d by <strong className="text-slate-200">S{entry.eliminatedBySeat}</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Score Display + Expandable Breakdown Toggle */}
                    <button
                      type="button"
                      onClick={() => setExpandedEntryId(isExpanded ? null : entry.$id)}
                      className="min-h-[44px] px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors flex items-center gap-2 shrink-0 text-right"
                      aria-label={`Toggle score breakdown for ${entry.playerName}`}
                    >
                      <div>
                        <div
                          className={`text-base font-mono font-black leading-tight ${
                            breakdown.isMucked ? 'text-rose-400' : 'text-amber-400'
                          }`}
                        >
                          {breakdown.finalPoints.toLocaleString()}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          {breakdown.basePoints.toLocaleString()} × {breakdown.totalMultiplier}x
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </div>

                  {/* Scribe Quick-Record Strip + Full Actions Trigger */}
                  {!isLocked && (
                    <div className="space-y-2.5">
                      {status === 'ACTIVE' && onRequestEliminate && (
                        <QuickScoreStrip
                          entry={entry}
                          onAwardHandBonus={handleQuickAwardBonus}
                          onRequestBustOut={onRequestEliminate}
                        />
                      )}
                      <div className="pt-1 flex items-center justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => onRequestScorePlayer(entry.$id)}
                          className="w-full sm:w-auto h-10 text-xs font-bold sm:px-4"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          All Actions &amp; Adjustments
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Expandable Point Breakdown */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2.5 border-t border-slate-800/80 bg-slate-950/50 rounded-b-xl space-y-1.5 text-xs">
                    {breakdown.lineItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-slate-300">
                        <span>
                          {item.code ? (
                            <span className="font-mono text-amber-400 mr-1.5">[{item.code}]</span>
                          ) : null}
                          {item.label}
                        </span>
                        <span className="font-mono text-slate-400">
                          +{item.basePoints.toLocaleString()} base
                        </span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between font-bold">
                      <span className="text-slate-400">
                        {breakdown.isMucked
                          ? 'MUCK OVERRIDE (Forfeited)'
                          : `Multiplier: ${breakdown.sessionMultiplier}x Session${
                              breakdown.dgMultiplier === 2 ? ' × 2x DG' : ''
                            } = ${breakdown.totalMultiplier}x`}
                      </span>
                      <span className={breakdown.isMucked ? 'text-rose-400' : 'text-amber-400'}>
                        Final: {breakdown.finalPoints.toLocaleString()} pts
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};
