import React from 'react';
import type { Game, League, Season, UserProfile, Venue } from '@/types/holdem';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  Building2,
  Calendar,
  Crown,
  Edit3,
  PlayCircle,
  Plus,
  ShieldCheck,
  Trophy,
  Users,
} from 'lucide-react';

export type DashboardSectionKey =
  | 'overview'
  | 'leagues'
  | 'seasons'
  | 'venues'
  | 'schedules'
  | 'users'
  | 'rbac';

export interface AdminDashboardOverviewProps {
  leagues: League[];
  seasons: Season[];
  venues: Venue[];
  games: Game[];
  users: UserProfile[];
  onOpenSection: (section: DashboardSectionKey) => void;
  onCreateGame: () => void;
  onCreateSeason: () => void;
  onCreateVenue: () => void;
  onInviteUser: () => void;
  onCreateLeague: () => void;
  onEditGame: (game: Game) => void;
  onSelectGame?: (game: Game) => void;
}

export const AdminDashboardOverview: React.FC<AdminDashboardOverviewProps> = ({
  leagues,
  seasons,
  venues,
  games,
  users,
  onOpenSection,
  onCreateGame,
  onCreateSeason,
  onCreateVenue,
  onInviteUser,
  onCreateLeague,
  onEditGame,
  onSelectGame,
}) => {
  const activeSeason = seasons.find((s) => s.isActive) || seasons[0];
  const liveGames = games.filter((g) => g.status === 'running');
  const upcomingGames = games.filter((g) => g.status === 'scheduled');
  const staffCount = users.filter((u) => u.role !== 'player').length;

  const dataModules: {
    key: DashboardSectionKey;
    title: string;
    metric: string;
    detail: string;
    icon: React.ReactNode;
    accentClass: string;
    addLabel?: string;
    onAdd?: () => void;
  }[] = [
    {
      key: 'leagues',
      title: 'Leagues',
      metric: `${leagues.length} Leagues`,
      detail: leagues[0]?.name || 'League settings & assigned managers',
      icon: <Crown className="w-5 h-5 text-rose-400" />,
      accentClass: 'bg-rose-500/15 border-rose-500/30',
      addLabel: 'New League',
      onAdd: onCreateLeague,
    },
    {
      key: 'seasons',
      title: 'Seasons',
      metric: activeSeason?.name || `${seasons.length} Seasons`,
      detail: `${seasons.length} total • Active points race`,
      icon: <Trophy className="w-5 h-5 text-amber-400" />,
      accentClass: 'bg-amber-500/15 border-amber-500/30',
      addLabel: 'New Season',
      onAdd: onCreateSeason,
    },
    {
      key: 'venues',
      title: 'Venues',
      metric: `${venues.length} Venues`,
      detail: venues.slice(0, 2).map((v) => v.name).join(', ') || 'No venues configured',
      icon: <Building2 className="w-5 h-5 text-emerald-400" />,
      accentClass: 'bg-emerald-500/15 border-emerald-500/30',
      addLabel: 'Add Venue',
      onAdd: onCreateVenue,
    },
    {
      key: 'schedules',
      title: 'Games',
      metric: `${games.length} Games`,
      detail: `${liveGames.length} live • ${upcomingGames.length} upcoming`,
      icon: <Calendar className="w-5 h-5 text-amber-400" />,
      accentClass: 'bg-amber-500/15 border-amber-500/30',
      addLabel: 'New Game',
      onAdd: onCreateGame,
    },
    {
      key: 'users',
      title: 'Players',
      metric: `${users.length} Accounts`,
      detail: `${users.length - staffCount} players • ${staffCount} staff`,
      icon: <Users className="w-5 h-5 text-indigo-400" />,
      accentClass: 'bg-indigo-500/15 border-indigo-500/30',
      addLabel: 'Add Player',
      onAdd: onInviteUser,
    },
    {
      key: 'rbac',
      title: 'Permissions',
      metric: '5 Roles',
      detail: 'Admin, Manager, Dealer, Scribe, Player matrix',
      icon: <ShieldCheck className="w-5 h-5 text-slate-300" />,
      accentClass: 'bg-slate-800 border-slate-700',
    },
  ];

  const spotlightGames = [...liveGames, ...upcomingGames].slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Data Type Management Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {dataModules.map((mod) => (
            <Card
              key={mod.key}
              className="p-5 border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-colors flex flex-col justify-between gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {mod.title}
                  </div>
                  <div className="text-xl font-black text-white truncate">{mod.metric}</div>
                  <p className="text-xs text-slate-400 truncate">{mod.detail}</p>
                </div>
                <div
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${mod.accentClass}`}
                >
                  {mod.icon}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                {mod.onAdd && mod.addLabel ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={mod.onAdd}
                    className="h-9 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" /> {mod.addLabel}
                  </Button>
                ) : (
                  <span className="text-[11px] text-slate-500">Access Matrix</span>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenSection(mod.key)}
                  className="h-9 text-xs font-bold text-amber-400 hover:text-amber-300"
                >
                  Manage <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))}
      </div>

      {/* Quick Access: Live & Upcoming Games */}
      {spotlightGames.length > 0 && (
        <Card className="p-5 border-slate-800 bg-slate-900/60 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Active &amp; Upcoming Games
              </h2>
              <p className="text-xs text-slate-400">
                Jump straight into a live Director Desk or edit schedule details
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenSection('schedules')}
              className="text-xs text-amber-400"
            >
              All Games <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="divide-y divide-slate-800/70">
            {spotlightGames.map((game) => (
              <div
                key={game.$id}
                className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={game.status === 'running' ? 'success' : 'default'}>
                      {game.status === 'running' ? 'Live' : 'Upcoming'}
                    </Badge>
                    <span className="text-sm font-bold text-white truncate">{game.title}</span>
                  </div>
                  <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2">
                    <span>{game.venueName}</span>
                    <span>•</span>
                    <span>{game.scheduledAt}</span>
                    <span>•</span>
                    <span>{game.pointMultiplier ?? 1}x Points</span>
                    <span>•</span>
                    <span>{game.rsvpPlayerIds?.length ?? 0} RSVPs</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onEditGame(game)}
                    className="h-9 text-xs"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-400" /> Edit
                  </Button>
                  {onSelectGame && (
                    <Button
                      type="button"
                      variant="success"
                      size="sm"
                      onClick={() => onSelectGame(game)}
                      className="h-9 text-xs"
                    >
                      <PlayCircle className="w-3.5 h-3.5" /> Open Desk
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
