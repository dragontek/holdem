import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Award } from 'lucide-react';

export interface GamePayoutCardProps {
  totalPrizePool: number;
  firstPlacePayout: string | number;
  secondPlacePayout: string | number;
  thirdPlacePayout: string | number;
}

export const GamePayoutCard: React.FC<GamePayoutCardProps> = ({
  totalPrizePool,
  firstPlacePayout,
  secondPlacePayout,
  thirdPlacePayout,
}) => {
  return (
    <Card className="border-slate-800 bg-slate-900/60">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-bold text-white flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" /> Payout Structure Breakdown
        </CardTitle>
        <span className="text-sm font-black text-emerald-400">
          Prize Pool: ${totalPrizePool}
        </span>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl">
            <div className="text-[11px] text-amber-400 font-bold uppercase tracking-wider">
              1st Place (50%)
            </div>
            <div className="text-xl md:text-2xl font-black text-amber-300 mt-1">
              ${firstPlacePayout}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              2nd Place (30%)
            </div>
            <div className="text-lg md:text-xl font-black text-white mt-1">
              ${secondPlacePayout}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              3rd Place (20%)
            </div>
            <div className="text-lg md:text-xl font-black text-slate-300 mt-1">
              ${thirdPlacePayout}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
