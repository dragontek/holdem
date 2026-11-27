import React from 'react';
import type { Game, GameEntry } from '@/types/holdem';
import {
  calculateEntryScore,
  getEntryHandBonuses,
  getEntryKnockouts,
  getEntryStatus,
  HAND_BONUS_DEFINITIONS,
} from '@/lib/scoring';

export interface PaperScorecardGridProps {
  game: Game;
  sortedEntries: GameEntry[];
  startRow: number;
  endRow: number;
  totalRebuys: number;
  canEdit: boolean;
  onSelectEntry?: (entryId: string) => void;
}

const BONUS_SLOTS = Array.from({ length: 10 }, (_, i) => i);
const TALLY_NUMBERS = Array.from({ length: 26 }, (_, i) => i + 1);

export const PaperScorecardGrid: React.FC<PaperScorecardGridProps> = ({
  game,
  sortedEntries,
  startRow,
  endRow,
  totalRebuys,
  canEdit,
  onSelectEntry,
}) => {
  // Map playerId -> 1-based line number on the paper sheet for "Knocked out by #"
  const rowNumberByPlayerId = new Map<string, number>();
  sortedEntries.forEach((entry, idx) => {
    rowNumberByPlayerId.set(entry.playerId, idx + 1);
  });

  const rows = Array.from({ length: endRow - startRow + 1 }, (_, i) => startRow + i);

  return (
    <div className="space-y-1.5">
      <table className="w-full border-collapse text-slate-950 table-fixed">
        <thead>
          <tr className="text-[9px] leading-tight font-bold text-slate-800">
            <th className="w-[46px] pb-1 text-center font-semibold">
              Knocked
              <br />
              out by #
            </th>
            <th className="w-[38px] pb-1 text-center font-semibold">
              Rebuy
              <br />
              only
            </th>
            <th className="w-[175px] pb-1 text-center text-[11px] font-semibold">Player Name</th>
            <th className="w-[30px] pb-1 text-center text-[10px] font-semibold">DG</th>
            <th className="w-[36px] pb-1 text-center text-[9px] font-semibold">Rebuy</th>
            <th className="w-[26px] pb-1" aria-label="Row type" />
            <th colSpan={10} className="pb-1 text-center text-[11px] tracking-wide font-semibold">
              BONUSES
            </th>
            <th className="w-[74px] pb-1 text-center text-[11px] tracking-wide font-semibold">
              TOTAL
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map((rowNum) => {
            const entry = sortedEntries[rowNum - 1] ?? null;
            const breakdown = entry ? calculateEntryScore(entry, game) : null;
            const status = entry ? getEntryStatus(entry) : null;
            const knockouts = entry ? getEntryKnockouts(entry) : [];
            const handBonuses = entry ? getEntryHandBonuses(entry) : [];

            const knockedOutByDisplay = (() => {
              if (!entry) return '';
              if (status === 'MUCK') return 'M';
              if (entry.knockedOutByPlayerId) {
                const killerRow = rowNumberByPlayerId.get(entry.knockedOutByPlayerId);
                if (killerRow) return String(killerRow);
              }
              if (entry.eliminatedBySeat) return String(entry.eliminatedBySeat);
              return '';
            })();

            const isClickable = Boolean(entry && canEdit && onSelectEntry);

            return (
              <React.Fragment key={rowNum}>
                {/* Upper half: KO row + spanned columns */}
                <tr
                  onClick={() => isClickable && entry && onSelectEntry?.(entry.$id)}
                  className={
                    isClickable
                      ? 'cursor-pointer hover:bg-amber-50/90 transition-colors'
                      : undefined
                  }
                  title={
                    isClickable && entry
                      ? `Click to edit points & actions for ${entry.playerName}`
                      : undefined
                  }
                >
                  {/* Knocked out by # */}
                  <td
                    rowSpan={2}
                    className="border border-slate-900 text-center align-middle font-mono text-sm font-bold"
                  >
                    {knockedOutByDisplay}
                  </td>

                  {/* Rebuy only (NO) */}
                  <td
                    rowSpan={2}
                    className="border border-slate-900 text-center align-middle font-mono text-xs font-bold"
                  >
                    {entry?.rebuyOnly ? 'NO' : ''}
                  </td>

                  {/* Player Name + Line Number */}
                  <td
                    rowSpan={2}
                    className="border border-slate-900 px-1.5 py-0.5 align-middle relative"
                  >
                    <span className="absolute top-0.5 left-1 text-[9px] font-mono text-slate-600 select-none">
                      {rowNum}
                    </span>
                    {entry && (
                      <div className="flex items-center justify-between gap-1 pl-4 pt-1">
                        <span
                          className={`text-xs font-semibold truncate ${
                            status === 'MUCK' ? 'line-through text-rose-700' : 'text-slate-950'
                          }`}
                        >
                          {entry.playerName}
                        </span>
                      </div>
                    )}
                  </td>

                  {/* DG Carryover */}
                  <td
                    rowSpan={2}
                    className="border border-slate-900 text-center align-middle font-mono text-xs font-bold"
                  >
                    {entry?.hasDgCarryover ? '✓' : ''}
                  </td>

                  {/* Rebuy Count */}
                  <td
                    rowSpan={2}
                    className="border border-slate-900 text-center align-middle font-mono text-xs font-bold"
                  >
                    {entry && entry.rebuysCount > 0 ? entry.rebuysCount : ''}
                  </td>

                  {/* KO Sub-row Label */}
                  <td className="border border-slate-900 text-center text-[9px] font-bold h-[18px] bg-slate-100/80">
                    KO
                  </td>

                  {/* KO 10 Bonus Boxes */}
                  {BONUS_SLOTS.map((slot) => (
                    <td
                      key={`ko-${rowNum}-${slot}`}
                      className="border border-slate-900 text-center font-mono text-[11px] font-black h-[18px]"
                    >
                      {knockouts[slot] ?? ''}
                    </td>
                  ))}

                  {/* TOTAL */}
                  <td
                    rowSpan={2}
                    className="border border-slate-900 px-1 text-right align-middle font-mono text-xs font-black"
                  >
                    {entry && breakdown ? (
                      status === 'MUCK' ? (
                        <span className="text-rose-700 uppercase text-[11px]">Muck</span>
                      ) : (
                        breakdown.finalPoints.toLocaleString()
                      )
                    ) : (
                      ''
                    )}
                  </td>
                </tr>

                {/* Lower half: HD row */}
                <tr
                  onClick={() => isClickable && entry && onSelectEntry?.(entry.$id)}
                  className={
                    isClickable
                      ? 'cursor-pointer hover:bg-amber-50/90 transition-colors'
                      : undefined
                  }
                >
                  <td className="border border-slate-900 text-center text-[9px] font-bold h-[18px] bg-slate-100/80">
                    HD
                  </td>
                  {BONUS_SLOTS.map((slot) => {
                    const code = handBonuses[slot];
                    return (
                      <td
                        key={`hd-${rowNum}-${slot}`}
                        className="border border-slate-900 text-center font-mono text-[11px] font-black h-[18px]"
                      >
                        {code ? HAND_BONUS_DEFINITIONS[code].symbol : ''}
                      </td>
                    );
                  })}
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      {/* Bottom 1–26 Tally Strip */}
      <div className="flex items-center justify-between px-2 pt-1 text-[11px] font-serif text-slate-900 select-none">
        {TALLY_NUMBERS.map((num) => {
          const isTallied = num <= totalRebuys;
          return (
            <span
              key={num}
              className={
                isTallied
                  ? 'font-bold line-through decoration-2 decoration-slate-900'
                  : 'text-slate-700'
              }
            >
              {num}
            </span>
          );
        })}
      </div>
    </div>
  );
};
