import React from 'react';
import type { Player } from '@/types/holdem';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { StandingsSubTab } from './PlayerStandingsView';

interface StandingsPodiumProps {
  top3: Player[];
  activeSubTab: StandingsSubTab;
  onSelectPlayer: (player: Player) => void;
}

export const StandingsPodium: React.FC<StandingsPodiumProps> = ({
  top3,
  activeSubTab,
  onSelectPlayer,
}) => {
  if (top3.length < 3) return null;

  const renderMetric = (player: Player) => {
    if (activeSubTab === 'wins') return `${player.careerWins} Wins`;
    if (activeSubTab === 'kos') return `${player.careerKOs} KOs`;
    return `${player.totalPoints.toLocaleString()} pts`;
  };

  return (
    <div className="grid grid-cols-3 gap-3 pt-2">
      {/* 2nd Place Silver */}
      <Card 
        onClick={() => onSelectPlayer(top3[1])}
        className="text-center cursor-pointer hover:border-slate-500 transition-all p-4 relative"
      >
        <div className="w-10 h-10 mx-auto rounded-full bg-slate-800 border border-slate-400 flex items-center justify-center text-lg mb-2 shadow-sm">
          🥈
        </div>
        <Badge variant="secondary" className="mb-1 text-[10px]">#2 Seed</Badge>
        <h3 className="font-bold text-white text-xs sm:text-sm truncate">{top3[1].name}</h3>
        <p className="text-xs text-slate-400 font-semibold mt-0.5">{renderMetric(top3[1])}</p>
      </Card>

      {/* 1st Place Gold Champion */}
      <Card 
        onClick={() => onSelectPlayer(top3[0])}
        className="text-center cursor-pointer hover:border-amber-400 transition-all p-4 relative border-amber-500/50 bg-amber-500/5 -translate-y-1.5 shadow-md"
      >
        <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center text-xl mb-2 shadow-sm">
          👑
        </div>
        <Badge variant="default" className="mb-1 text-[10px] font-black">LEAGUE LEADER</Badge>
        <h3 className="font-bold text-amber-300 text-xs sm:text-sm truncate">{top3[0].name}</h3>
        <p className="text-xs text-amber-400 font-black mt-0.5">{renderMetric(top3[0])}</p>
      </Card>

      {/* 3rd Place Bronze */}
      <Card 
        onClick={() => onSelectPlayer(top3[2])}
        className="text-center cursor-pointer hover:border-amber-700 transition-all p-4 relative"
      >
        <div className="w-10 h-10 mx-auto rounded-full bg-slate-900 border border-amber-800 flex items-center justify-center text-lg mb-2 shadow-sm">
          🥉
        </div>
        <Badge variant="secondary" className="mb-1 text-[10px]">#3 Seed</Badge>
        <h3 className="font-bold text-white text-xs sm:text-sm truncate">{top3[2].name}</h3>
        <p className="text-xs text-slate-400 font-semibold mt-0.5">{renderMetric(top3[2])}</p>
      </Card>
    </div>
  );
};
