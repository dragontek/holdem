import React from 'react';
import type { Game, PointMultiplier } from '@/types/holdem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Flame,
  Minus,
  Plus,
  Sparkles,
  Sun,
  Ban,
  Users,
  SlidersHorizontal,
} from 'lucide-react';

export interface SessionRulesBarProps {
  game: Game;
  canEdit: boolean;
  onUpdateSessionRules: (updates: Partial<Game>) => void;
}

const MULTIPLIERS: readonly { value: PointMultiplier; label: string }[] = [
  { value: 1, label: '1x Single' },
  { value: 2, label: '2x Double' },
  { value: 3, label: '3x Triple' },
];

function parseNamesList(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export const SessionRulesBar: React.FC<SessionRulesBarProps> = ({
  game,
  canEdit,
  onUpdateSessionRules,
}) => {
  const isLocked = !canEdit || game.status === 'completed';
  const currentMultiplier: PointMultiplier = game.pointMultiplier ?? 1;
  const dealersText = (game.dealers && game.dealers.length > 0
    ? game.dealers
    : game.dealerName
    ? [game.dealerName]
    : []
  ).join(', ');
  const scribesText = (game.scribes ?? []).join(', ');
  const purpleCount = game.purpleCount ?? 0;

  return (
    <Card className="border-slate-800 bg-slate-900/60">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-white">
            <SlidersHorizontal className="w-4 h-4 text-amber-400" />
            Session Scoring Rules &amp; Scorecard Metadata
          </CardTitle>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={currentMultiplier > 1 ? 'default' : 'secondary'}>
              {currentMultiplier}x Points
            </Badge>
            {game.isDayGame && (
              <Badge variant="indigo">
                <Sun className="w-3 h-3" /> Day Game (DG)
              </Badge>
            )}
            {game.noGamePlayed && (
              <Badge variant="destructive">
                <Ban className="w-3 h-3" /> No-Game (5,000 Flat)
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Row 1: Multiplier + Session Modifiers + Purple Counter */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Multiplier Selector */}
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-wider text-slate-400">
              Session Multiplier
            </Label>
            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800">
              {MULTIPLIERS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  disabled={isLocked || Boolean(game.noGamePlayed)}
                  onClick={() => onUpdateSessionRules({ pointMultiplier: m.value })}
                  className={`min-h-[40px] py-2 px-2 rounded-lg text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-50 ${
                    currentMultiplier === m.value
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Day Game & No-Game Toggles */}
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-wider text-slate-400">
              Session Flags
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={game.isDayGame ? 'default' : 'outline'}
                disabled={isLocked}
                onClick={() => onUpdateSessionRules({ isDayGame: !game.isDayGame })}
                className="h-11 text-xs"
                title="Participating grants players a 2x carryover multiplier for their next game"
              >
                <Sun className="w-4 h-4" />
                Day Game (DG)
              </Button>
              <Button
                type="button"
                variant={game.noGamePlayed ? 'destructive' : 'outline'}
                disabled={isLocked}
                onClick={() => onUpdateSessionRules({ noGamePlayed: !game.noGamePlayed })}
                className="h-11 text-xs"
                title="Award flat 5,000 No-Game Show Up points if event did not run"
              >
                <Ban className="w-4 h-4" />
                No-Game
              </Button>
            </div>
          </div>

          {/* Purple Counter */}
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-wider text-slate-400">
              Purple (Chip / Color-Up)
            </Label>
            <div className="flex items-center justify-between h-11 px-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs font-semibold text-purple-300">Purple Count</span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={isLocked || purpleCount <= 0}
                  onClick={() =>
                    onUpdateSessionRules({ purpleCount: Math.max(0, purpleCount - 1) })
                  }
                  aria-label="Decrease Purple count"
                  className="h-9 w-9"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-sm font-mono font-bold text-white min-w-[1.75rem] text-center">
                  {purpleCount}
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={isLocked}
                  onClick={() => onUpdateSessionRules({ purpleCount: purpleCount + 1 })}
                  aria-label="Increase Purple count"
                  className="h-9 w-9"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: HOD, Hot Hand, Dealers, Scribes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="session-hod" className="text-[11px] text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" /> Hand of the Day (HOD)
            </Label>
            <Input
              id="session-hod"
              disabled={isLocked}
              defaultValue={game.hodRule ?? ''}
              key={`hod-${game.$id}-${game.hodRule ?? ''}`}
              placeholder="e.g. Connected, J-10"
              onBlur={(e) => {
                const next = e.target.value.trim();
                if (next !== (game.hodRule ?? '')) {
                  onUpdateSessionRules({ hodRule: next });
                }
              }}
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="session-hot-hand" className="text-[11px] text-slate-400 flex items-center gap-1">
              <Flame className="w-3 h-3 text-rose-400" /> Hot Hand Target
            </Label>
            <Input
              id="session-hot-hand"
              disabled={isLocked}
              defaultValue={game.hotHandDescription ?? ''}
              key={`hot-${game.$id}-${game.hotHandDescription ?? ''}`}
              placeholder="e.g. 2/10 Boat"
              onBlur={(e) => {
                const next = e.target.value.trim();
                if (next !== (game.hotHandDescription ?? '')) {
                  onUpdateSessionRules({ hotHandDescription: next });
                }
              }}
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="session-dealers" className="text-[11px] text-slate-400 flex items-center gap-1">
              <Users className="w-3 h-3 text-emerald-400" /> Dealer(s)
            </Label>
            <Input
              id="session-dealers"
              disabled={isLocked}
              defaultValue={dealersText}
              key={`dealers-${game.$id}-${dealersText}`}
              placeholder="e.g. Tizzie, Mustache"
              onBlur={(e) => {
                const parsed = parseNamesList(e.target.value);
                if (parsed.join(', ') !== dealersText) {
                  onUpdateSessionRules({
                    dealers: parsed,
                    dealerName: parsed[0] || '',
                  });
                }
              }}
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="session-scribes" className="text-[11px] text-slate-400 flex items-center gap-1">
              <Users className="w-3 h-3 text-indigo-400" /> Scribe(s)
            </Label>
            <Input
              id="session-scribes"
              disabled={isLocked}
              defaultValue={scribesText}
              key={`scribes-${game.$id}-${scribesText}`}
              placeholder="e.g. Kyle, Chip"
              onBlur={(e) => {
                const parsed = parseNamesList(e.target.value);
                if (parsed.join(', ') !== scribesText) {
                  onUpdateSessionRules({ scribes: parsed });
                }
              }}
              className="h-9 text-xs"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
