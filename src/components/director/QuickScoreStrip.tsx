import React from 'react';
import type { GameEntry, HandBonusCode } from '@/types/holdem';
import { getEntryHandBonuses, HAND_BONUS_DEFINITIONS } from '@/lib/scoring';
import { Button } from '@/components/ui/button';
import { Skull } from 'lucide-react';

export interface QuickScoreStripProps {
  entry: GameEntry;
  disabled?: boolean;
  onAwardHandBonus: (entry: GameEntry, code: HandBonusCode) => void;
  onRequestBustOut: (entry: GameEntry) => void;
}

const QUICK_AWARD_ITEMS: readonly {
  code: HandBonusCode;
  shortLabel: string;
  accent: string;
}[] = [
  { code: 'SURV', shortLabel: '☆ Surv', accent: 'hover:border-amber-500/60 hover:text-amber-300' },
  { code: 'O', shortLabel: 'O HOD', accent: 'hover:border-emerald-500/60 hover:text-emerald-300' },
  { code: 'S', shortLabel: 'S Suited', accent: 'hover:border-emerald-400/70 hover:text-emerald-300' },
  { code: '4', shortLabel: '4 Quads', accent: 'hover:border-amber-400/70 hover:text-amber-300' },
  { code: 'F', shortLabel: 'F StrFlush', accent: 'hover:border-amber-400/70 hover:text-amber-300' },
  { code: '#', shortLabel: '# Royal', accent: 'hover:border-amber-400/70 hover:text-amber-300' },
];

/**
 * One-tap scribe scorekeeper strip for recording hand bonuses & bust-outs during live play.
 * Scribes simply tap the earned point category; every tap broadcasts to players and the TV display.
 */
export const QuickScoreStrip: React.FC<QuickScoreStripProps> = ({
  entry,
  disabled = false,
  onAwardHandBonus,
  onRequestBustOut,
}) => {
  const bonuses = getEntryHandBonuses(entry);

  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/70">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-1">
        Quick Record:
      </span>
      {QUICK_AWARD_ITEMS.map((item) => {
        const def = HAND_BONUS_DEFINITIONS[item.code];
        return (
          <button
            key={item.code}
            type="button"
            disabled={disabled}
            onClick={() => onAwardHandBonus(entry, item.code)}
            aria-label={`Award ${def.label} (+${def.points.toLocaleString()} base) to ${entry.playerName}`}
            className={`min-h-[32px] px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-bold text-slate-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-40 ${item.accent}`}
          >
            + {item.shortLabel}
          </button>
        );
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => onRequestBustOut(entry)}
        aria-label={`Record Bust Out or Knockout against ${entry.playerName}`}
        className="h-8 px-2.5 text-[11px] font-bold border-rose-500/40 text-rose-300 hover:bg-rose-500/15 ml-auto"
      >
        <Skull className="w-3.5 h-3.5" aria-hidden="true" />
        Bust / KO
      </Button>

      {/* Hidden count hook ensures screen readers stay concise */}
      <span className="visually-hidden">{bonuses.length} bonuses recorded</span>
    </div>
  );
};
