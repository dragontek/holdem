import React, { useState } from 'react';
import type { Game, GameEntry } from '@/types/holdem';
import { calculateEntryScore, getEntryStatus } from '@/lib/scoring';
import { PaperScorecardGrid } from './PaperScorecardGrid';
import { Button } from '@/components/ui/button';
import { Printer, FileText } from 'lucide-react';

export interface PaperScorecardViewProps {
  game: Game;
  entries: GameEntry[];
  canEdit: boolean;
  onSelectEntry?: (entryId: string) => void;
}

type SheetPageMode = 'page1' | 'page2' | 'both';

const OFFICIAL_VENUES: readonly string[] = [
  'After Hours',
  'Sports Fanatic',
  "O'Leary's Pub",
  'Overtime',
  'Single Barrel',
  'The Lounge',
];

function formatShortDate(raw: string): string {
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    const mm = parsed.getMonth() + 1;
    const dd = parsed.getDate();
    const yy = String(parsed.getFullYear()).slice(-2);
    return `${mm}/${dd}/${yy}`;
  }
  return raw;
}

const SheetCheckbox: React.FC<{ checked: boolean; label: string }> = ({ checked, label }) => (
  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-900">
    <span className="w-4 h-4 border border-slate-900 inline-flex items-center justify-center text-xs font-black leading-none bg-white shrink-0">
      {checked ? '✕' : ''}
    </span>
    <span>{label}</span>
  </span>
);

export const PaperScorecardView: React.FC<PaperScorecardViewProps> = ({
  game,
  entries,
  canEdit,
  onSelectEntry,
}) => {
  const [pageMode, setPageMode] = useState<SheetPageMode>(entries.length > 16 ? 'both' : 'page1');

  const sortedEntries = [...entries].sort((a, b) => {
    if (a.tableNumber !== b.tableNumber) return a.tableNumber - b.tableNumber;
    return a.seatNumber - b.seatNumber;
  });

  const placementName = (pos: number) =>
    sortedEntries.find((e) => e.finishPosition === pos)?.playerName ?? '';

  const multiplier = game.pointMultiplier ?? 1;
  const dealersLine =
    game.dealers && game.dealers.length > 0 ? game.dealers.join(', ') : game.dealerName || '';
  const scribesLine = (game.scribes || []).join(', ');
  const totalRebuys = sortedEntries.reduce((sum, e) => sum + (e.rebuysCount || 0), 0);
  const totalSessionPoints = sortedEntries.reduce(
    (sum, e) => sum + calculateEntryScore(e, game).finalPoints,
    0
  );
  const muckedCount = sortedEntries.filter((e) => getEntryStatus(e) === 'MUCK').length;

  const normalizedVenue = game.venueName.toLowerCase();
  const isOfficialVenueMatch = (label: string) =>
    normalizedVenue.includes(label.toLowerCase());
  const isCustomVenue = !OFFICIAL_VENUES.some(isOfficialVenueMatch);

  const showPage1 = pageMode === 'page1' || pageMode === 'both';
  const showPage2 = pageMode === 'page2' || pageMode === 'both';

  return (
    <div className="space-y-4">
      {/* Toolbar (hidden when printing) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <FileText className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs font-bold text-white">Paper Scorecard Comparison Sheet</span>
          {canEdit && game.status !== 'completed' && (
            <span className="text-[11px] text-slate-400">
              • Tap any player row to edit points
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 rounded-xl bg-slate-950 border border-slate-800">
            {(
              [
                { id: 'page1', label: 'Front (1–16)' },
                { id: 'page2', label: 'Back (17–32)' },
                { id: 'both', label: 'Both Pages' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPageMode(opt.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  pageMode === opt.id
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="h-9"
          >
            <Printer className="w-4 h-4" />
            Print / PDF
          </Button>
        </div>
      </div>

      {/* Scrollable wrapper on mobile so the authentic sheet never squishes */}
      <div className="overflow-x-auto pb-2 print:overflow-visible">
        <div className="space-y-6 min-w-[780px] max-w-[920px] mx-auto">
          {/* ========================================== */}
          {/* PAGE 1 — FRONT SHEET (PLAYERS 1–16)       */}
          {/* ========================================== */}
          {showPage1 && (
            <section className="paper-scorecard-page bg-white text-slate-950 rounded-xl p-5 sm:p-7 shadow-2xl border border-slate-300 space-y-3 print:shadow-none print:border-0 print:rounded-none print:p-2">
              {/* Top Title */}
              <h2 className="text-center font-serif font-black text-3xl tracking-wider text-slate-950">
                JACK TEN POKER
              </h2>

              {/* Metadata Block */}
              <div className="grid grid-cols-12 gap-x-3 gap-y-1.5 items-start pt-1">
                {/* Col 1: Multiplier Checkboxes */}
                <div className="col-span-3 flex flex-col gap-1">
                  <SheetCheckbox checked={multiplier === 1} label="Single Points" />
                  <SheetCheckbox checked={multiplier === 2} label="Double Points" />
                  <SheetCheckbox checked={multiplier === 3} label="Triple Points" />
                </div>

                {/* Col 2: Venue Checkboxes */}
                <div className="col-span-6 space-y-1.5">
                  <div className="grid grid-cols-3 gap-x-2 gap-y-1.5">
                    {OFFICIAL_VENUES.map((venueLabel) => (
                      <SheetCheckbox
                        key={venueLabel}
                        checked={isOfficialVenueMatch(venueLabel)}
                        label={venueLabel}
                      />
                    ))}
                  </div>
                  {isCustomVenue && (
                    <div className="text-[11px] font-semibold text-slate-800">
                      Venue:{' '}
                      <span className="border-b border-slate-900 px-1 font-bold">
                        {game.venueName}
                      </span>
                    </div>
                  )}
                </div>

                {/* Col 3: Hot Hand & Purple */}
                <div className="col-span-3 space-y-1.5 text-[11px]">
                  <div className="flex items-baseline gap-1">
                    <span className="font-bold whitespace-nowrap">HOT HAND:</span>
                    <span className="flex-1 border-b border-slate-900 px-1 font-semibold truncate">
                      {game.hotHandDescription || '\u00A0'}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-bold whitespace-nowrap">Purple:</span>
                    <span className="flex-1 border-b border-slate-900 px-1 font-mono font-bold">
                      {game.purpleCount !== undefined ? game.purpleCount : '\u00A0'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Date, Dealers, Scribes */}
              <div className="space-y-1.5 text-[11px] pt-0.5">
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-4 flex items-baseline gap-1.5">
                    <span className="font-bold">DATE:</span>
                    <span className="flex-1 border-b border-slate-900 px-1 font-mono font-semibold">
                      {formatShortDate(game.scheduledAt)}
                    </span>
                  </div>
                  <div className="col-span-8 flex items-baseline gap-1.5">
                    <span className="font-bold">DEALER/S:</span>
                    <span className="flex-1 border-b border-slate-900 px-1 font-semibold">
                      {dealersLine || '\u00A0'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-7 flex items-baseline gap-1.5">
                    <span className="font-bold">SCRIBES:</span>
                    <span className="flex-1 border-b border-slate-900 px-1 font-semibold">
                      {scribesLine || '\u00A0'}
                    </span>
                  </div>
                  <div className="col-span-5 flex items-baseline gap-1.5">
                    <span className="font-bold">FLAGS:</span>
                    <span className="flex-1 border-b border-slate-900 px-1 font-semibold">
                      {[
                        game.isDayGame ? 'Day Game (DG)' : null,
                        game.noGamePlayed ? 'No-Game (5,000 Flat)' : null,
                      ]
                        .filter(Boolean)
                        .join(' • ') || 'Standard'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Top 5 Placement Boxes + HOD */}
              <div className="space-y-1.5 pt-1">
                <div className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-2" />
                  <div className="col-span-5 border border-slate-900 flex items-center h-8 px-2 gap-3">
                    <div className="text-[10px] leading-tight font-bold shrink-0">
                      <div>1st</div>
                      <div>12,000</div>
                    </div>
                    <div className="text-sm font-bold truncate">{placementName(1)}</div>
                  </div>
                  <div className="col-span-5 flex items-baseline gap-1.5 text-xs">
                    <span className="font-bold">HOD:</span>
                    <span className="flex-1 border-b border-slate-900 px-1 font-semibold">
                      {game.hodRule || '\u00A0'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-slate-900 flex items-center h-8 px-2 gap-3">
                    <div className="text-[10px] leading-tight font-bold shrink-0">
                      <div>2nd</div>
                      <div>5,000</div>
                    </div>
                    <div className="text-sm font-bold truncate">{placementName(2)}</div>
                  </div>

                  <div className="border border-slate-900 flex items-center h-8 px-2 gap-3">
                    <div className="text-[10px] leading-tight font-bold shrink-0">
                      <div>3rd</div>
                      <div>3,000</div>
                    </div>
                    <div className="text-sm font-bold truncate">{placementName(3)}</div>
                  </div>

                  <div className="border border-slate-900 flex items-center h-8 px-2 gap-3">
                    <div className="text-[10px] leading-tight font-bold shrink-0">
                      <div>4th</div>
                      <div>1,500</div>
                    </div>
                    <div className="text-sm font-bold truncate">{placementName(4)}</div>
                  </div>

                  <div className="border border-slate-900 flex items-center h-8 px-2 gap-3">
                    <div className="text-[10px] leading-tight font-bold shrink-0">
                      <div>5th</div>
                      <div>1,000</div>
                    </div>
                    <div className="text-sm font-bold truncate">{placementName(5)}</div>
                  </div>
                </div>
              </div>

              {/* Players 1–16 Grid */}
              <PaperScorecardGrid
                game={game}
                sortedEntries={sortedEntries}
                startRow={1}
                endRow={16}
                totalRebuys={totalRebuys}
                canEdit={canEdit && game.status !== 'completed'}
                onSelectEntry={onSelectEntry}
              />
            </section>
          )}

          {/* ========================================== */}
          {/* PAGE 2 — BACK SHEET (PLAYERS 17–32 + KEY) */}
          {/* ========================================== */}
          {showPage2 && (
            <section className="paper-scorecard-page bg-white text-slate-950 rounded-xl p-5 sm:p-7 shadow-2xl border border-slate-300 space-y-4 print:shadow-none print:border-0 print:rounded-none print:p-2 print:break-before-page">
              <PaperScorecardGrid
                game={game}
                sortedEntries={sortedEntries}
                startRow={17}
                endRow={32}
                totalRebuys={totalRebuys}
                canEdit={canEdit && game.status !== 'completed'}
                onSelectEntry={onSelectEntry}
              />

              {/* Point Structure Legend + Audit Totals (Bottom of Back Sheet) */}
              <div className="grid grid-cols-12 gap-4 pt-3 border-t border-slate-300 items-start">
                <div className="col-span-7 space-y-0.5 text-[11px] font-serif leading-snug text-slate-900">
                  <div className="font-sans font-bold text-xs tracking-wide uppercase mb-1">
                    POINT STRUCTURE
                  </div>
                  <div>SHOW UP POINTS: 600 (if there is no game): 5,000</div>
                  <div>SURVIVOR POINTS (☆): 500</div>
                  <div>ROYAL FLUSH (#): 10,000</div>
                  <div>STRAIGHT FLUSH (F): 5,000</div>
                  <div>FOUR OF A KIND (4): 2,500</div>
                  <div>KNOCKOUT (K): 1,000</div>
                  <div>REBUY KNOCKOUT (R): 5,000</div>
                  <div>HOD OFF SUIT (O): 500</div>
                  <div>HOD SUITED (S): 1,000</div>
                  <div>1st PLACE: 12,000</div>
                  <div>2nd PLACE: 5,000</div>
                  <div>3rd PLACE: 3,000</div>
                  <div>4th PLACE: 1,500</div>
                  <div>5th PLACE: 1,000</div>
                </div>

                {/* Audit Comparison Box */}
                <div className="col-span-5 border border-slate-900 p-3 space-y-1.5 text-xs">
                  <div className="font-bold uppercase tracking-wider text-[11px] border-b border-slate-900 pb-1">
                    Digital Audit Summary
                  </div>
                  <div className="flex justify-between">
                    <span>Total Seated Players:</span>
                    <strong className="font-mono">{sortedEntries.length}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Session Multiplier:</span>
                    <strong className="font-mono">{multiplier}x</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Rebuys:</span>
                    <strong className="font-mono">{totalRebuys}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Mucked Entries:</span>
                    <strong className="font-mono">{muckedCount}</strong>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-slate-400 text-sm">
                    <span className="font-bold">Grand Total Points:</span>
                    <strong className="font-mono font-black">
                      {totalSessionPoints.toLocaleString()}
                    </strong>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
