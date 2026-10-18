import React from 'react';
import type { League, UserProfile } from '@/types/holdem';
import { 
  Trophy, 
  Crown, 
  Plus, 
  Settings, 
  Calendar, 
  Building2, 
  UserCheck, 
  ExternalLink,
  ShieldCheck 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export interface AdminLeaguesSectionProps {
  leagues: League[];
  users: UserProfile[];
  onOpenCreateLeague: () => void;
  onEditLeague: (league: League) => void;
  onQuickAssignManager: (leagueId: string, manager: { id: string; name: string; email: string }) => void;
}

export const AdminLeaguesSection: React.FC<AdminLeaguesSectionProps> = ({
  leagues,
  users,
  onOpenCreateLeague,
  onEditLeague,
  onQuickAssignManager,
}) => {
  return (
    <div className="space-y-4">
      {/* Top Banner Card */}
      <Card className="p-5 border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30">
              PLATFORM GOVERNANCE
            </Badge>
            <span className="text-xs text-slate-400">Super Administrator Console</span>
          </div>
          <h2 className="text-lg font-black text-white flex items-center gap-2 mt-1">
            <Trophy className="w-5 h-5 text-amber-400" /> Leagues &amp; Assigned Managers ({leagues.length})
          </h2>
          <p className="text-xs text-slate-400">
            Create leagues and assign designated League Managers to configure seasons, host venues, and event schedules.
          </p>
        </div>

        <Button
          variant="default"
          size="sm"
          onClick={onOpenCreateLeague}
          className="self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Create New League
        </Button>
      </Card>

      {/* Leagues Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {leagues.map((league) => {
          const assignedManager = users.find((u) => u.$id === league.managerId);
          const managerDisplayName = league.managerName || assignedManager?.name || 'Unassigned';
          const managerDisplayEmail = league.managerEmail || assignedManager?.email || 'No manager assigned';

          return (
            <Card
              key={league.$id}
              className="p-5 border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                {/* League Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-lg shrink-0">
                      ♠
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white">{league.name}</h3>
                        <Badge variant="secondary" className="text-[9px]">
                          ID: {league.$id}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">
                        {league.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Assigned League Manager Card */}
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5 text-amber-400" /> Designated League Manager
                    </span>
                    <Badge variant={league.managerId ? 'default' : 'destructive'} className="text-[9px]">
                      {league.managerId ? 'Assigned' : 'Needs Manager'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-white">{managerDisplayName}</div>
                      <div className="text-[11px] text-slate-400">{managerDisplayEmail}</div>
                    </div>

                    <div className="shrink-0">
                      <select
                        value={league.managerId || ''}
                        onChange={(e) => {
                          const targetUser = users.find((u) => u.$id === e.target.value);
                          if (targetUser) {
                            onQuickAssignManager(league.$id, {
                              id: targetUser.$id,
                              name: targetUser.name,
                              email: targetUser.email,
                            });
                          }
                        }}
                        className="bg-slate-900 text-xs font-semibold text-amber-400 border border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-400"
                      >
                        <option value="" disabled>Change Manager...</option>
                        {users.map((u) => (
                          <option key={u.$id} value={u.$id}>
                            {u.name} ({u.role.toUpperCase()})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500">
                  Established: {new Date(league.createdAt).toLocaleDateString()}
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditLeague(league)}
                    className="text-xs h-8"
                  >
                    <Settings className="w-3.5 h-3.5 mr-1" /> Configure League
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
