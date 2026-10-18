import React from 'react';
import type { Season, Game } from '@/types/holdem';
import { Trophy, Plus, Calendar, Check, Sparkles, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export interface AdminSeasonsSectionProps {
  seasons: Season[];
  games: Game[];
  onOpenSeasonModal: () => void;
  onQuickSetActiveSeason: (seasonId: string) => void;
  formatDate: (dateStr: string) => string;
}

export const AdminSeasonsSection: React.FC<AdminSeasonsSectionProps> = ({
  seasons,
  games,
  onOpenSeasonModal,
  onQuickSetActiveSeason,
  formatDate,
}) => {
  return (
    <div className="space-y-4">
      <Card className="p-5 border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="text-[10px]">
              STEP 1: SEASONS
            </Badge>
            <span className="text-xs text-slate-400">Points Race &amp; Timeline</span>
          </div>
          <h2 className="text-lg font-black text-white flex items-center gap-2 mt-1">
            <Trophy className="w-5 h-5 text-amber-400" /> Championship Seasons Directory ({seasons.length})
          </h2>
          <p className="text-xs text-slate-400">
            Define championship seasons, start/end dates, and select the current active season for the league.
          </p>
        </div>

        <Button
          variant="default"
          size="sm"
          onClick={onOpenSeasonModal}
          className="self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Create Season
        </Button>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {seasons.map((season) => (
          <Card
            key={season.$id}
            className={`p-5 flex flex-col justify-between space-y-4 transition-all ${
              season.isActive
                ? 'border-amber-500/50 bg-amber-500/5'
                : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-white text-base leading-tight">{season.name}</h3>
                {season.isActive ? (
                  <Badge variant="success" className="shrink-0">
                    <Check className="w-3 h-3" /> ACTIVE
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="shrink-0">
                    ARCHIVED
                  </Badge>
                )}
              </div>

              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  {formatDate(season.startDate)} — {formatDate(season.endDate)}
                </span>
              </p>

              <div className="text-[11px] text-slate-400 pt-1">
                {games.filter((g) => g.seasonId === season.$id).length} tournaments scheduled in this season
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              {!season.isActive ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onQuickSetActiveSeason(season.$id)}
                  className="h-8 text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 p-0"
                >
                  Make Active Season
                </Button>
              ) : (
                <span className="text-xs font-semibold text-amber-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Current Active
                </span>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={onOpenSeasonModal}
                className="h-8 text-xs"
              >
                <Edit3 className="w-3 h-3 text-amber-400" /> Edit
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
