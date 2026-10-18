import type { Game, Venue, Season, TournamentEvent } from '@/types/holdem';
import { 
  Calendar, 
  Plus, 
  PlayCircle, 
  Clock, 
  Edit3, 
  Trash2, 
  RotateCcw,
  Layers 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export interface AdminSchedulesSectionProps {
  games: Game[];
  filteredGames: Game[];
  events?: TournamentEvent[];
  venues: Venue[];
  seasons: Season[];
  selectedScheduleSeason: string;
  setSelectedScheduleSeason: (val: string) => void;
  selectedScheduleVenue: string;
  setSelectedScheduleVenue: (val: string) => void;
  selectedRecurrenceFilter: 'all' | 'recurring' | 'single';
  setSelectedRecurrenceFilter: (val: 'all' | 'recurring' | 'single') => void;
  onOpenScheduleModal: (game?: Game | null) => void;
  onDeleteGame: (gameId: string, gameTitle: string) => void;
  onSelectGame?: (game: Game) => void;
}

export const AdminSchedulesSection: React.FC<AdminSchedulesSectionProps> = ({
  games,
  filteredGames,
  events = [],
  venues,
  seasons,
  selectedScheduleSeason,
  setSelectedScheduleSeason,
  selectedScheduleVenue,
  setSelectedScheduleVenue,
  selectedRecurrenceFilter,
  setSelectedRecurrenceFilter,
  onOpenScheduleModal,
  onDeleteGame,
  onSelectGame,
}) => {
  return (
    <div className="space-y-4">
      <Card className="p-5 border-slate-800 bg-slate-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="text-[10px]">
              STEP 3: EVENTS &amp; GAMES
            </Badge>
            <span className="text-xs text-slate-400">Events within Championship Seasons</span>
          </div>
          <h2 className="text-lg font-black text-white flex items-center gap-2 mt-1">
            <Calendar className="w-5 h-5 text-amber-400" /> Tournament Events &amp; Games ({filteredGames.length})
          </h2>
          <p className="text-xs text-slate-400">
            Season events contain one or more tournament games with registered player accounts.
          </p>
        </div>


        {/* Filters & Action */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Season Selector */}
          <select
            value={selectedScheduleSeason}
            onChange={(e) => setSelectedScheduleSeason(e.target.value)}
            className="bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Seasons ({games.length})</option>
            {seasons.map((s) => {
              const count = games.filter((g) => g.seasonId === s.$id).length;
              return (
                <option key={s.$id} value={s.$id}>
                  {s.name} {s.isActive ? '(Active)' : ''} ({count})
                </option>
              );
            })}
          </select>

          {/* Venue Selector */}
          <select
            value={selectedScheduleVenue}
            onChange={(e) => setSelectedScheduleVenue(e.target.value)}
            className="bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Venues</option>
            {venues.map((v) => (
              <option key={v.$id} value={v.$id}>
                {v.name}
              </option>
            ))}
          </select>

          {/* Recurrence Filter */}
          <select
            value={selectedRecurrenceFilter}
            onChange={(e) => setSelectedRecurrenceFilter(e.target.value as 'all' | 'recurring' | 'single')}
            className="bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Event Types ({games.length})</option>
            <option value="recurring">
              🔄 Recurring Series ({games.filter((g) => g.isRecurring).length})
            </option>
            <option value="single">
              Single Events ({games.filter((g) => !g.isRecurring).length})
            </option>
          </select>

          <Button
            variant="default"
            size="sm"
            onClick={() => onOpenScheduleModal(null)}
            className="shrink-0"
          >
            <Plus className="w-4 h-4" /> Schedule Tournament
          </Button>
        </div>
      </Card>

      {filteredGames.length === 0 ? (
        <Card className="p-12 text-center border-slate-800 bg-slate-900/40 space-y-3">
          <Calendar className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No Tournaments Match Selection</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            No events found for this season or venue filter. Click below to schedule a new tournament.
          </p>
          <Button
            variant="default"
            size="sm"
            onClick={() => onOpenScheduleModal(null)}
          >
            <Plus className="w-4 h-4" /> Schedule Event Now
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGames.map((game) => {
            const venue = venues.find((v) => v.$id === game.venueId);
            const season = seasons.find((s) => s.$id === game.seasonId);
            const parentEvent = events.find((e) => e.$id === game.eventId);
            const isLive = game.status === 'running';
            const isCompleted = game.status === 'completed';

            return (
              <Card
                key={game.$id}
                className={`p-5 flex flex-col justify-between space-y-4 transition-all relative overflow-hidden ${
                  isLive ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {isLive ? (
                        <Badge variant="success" className="animate-pulse">
                          <PlayCircle className="w-3 h-3" /> LIVE IN PROGRESS
                        </Badge>
                      ) : isCompleted ? (
                        <Badge variant="secondary">
                          OFFICIAL COMPLETED
                        </Badge>
                      ) : (
                        <Badge variant="default">
                          <Clock className="w-3 h-3" /> SCHEDULED EVENT
                        </Badge>
                      )}

                      {/* Recurrence Rule Badge */}
                      {game.isRecurring && (
                        <Badge variant="indigo">
                          <RotateCcw className="w-2.5 h-2.5" />
                          {game.recurrenceRule || 'Weekly Series'}
                        </Badge>
                      )}

                      {/* Parent Event badge */}
                      {parentEvent && parentEvent.title !== game.title && (
                        <Badge variant="outline" className="border-amber-500/30 text-amber-300">
                          <Layers className="w-2.5 h-2.5 mr-1 text-amber-400" />
                          {parentEvent.title}
                        </Badge>
                      )}

                      {/* Season context badge */}
                      <Badge variant="secondary">
                        {season?.name || 'Active Season'}
                      </Badge>
                    </div>


                    <span className="text-xs text-slate-400 font-medium">
                      {venue?.name || game.venueName}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white leading-tight">{game.title}</h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        {game.scheduledAt}
                      </span>
                      {game.dealerName && (
                        <span>• TD: {game.dealerName}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Metrics Strip */}
                <div className="grid grid-cols-4 gap-2 py-2 border-y border-slate-800/80 text-center text-xs">
                  <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800/60">
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Buy-in</span>
                    <strong className="text-emerald-400">${game.buyinAmount}</strong>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800/60">
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Stack</span>
                    <strong className="text-indigo-300">{(game.startingChips / 1000).toFixed(0)}k</strong>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800/60">
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Rebuys</span>
                    <strong className="text-amber-400">${game.rebuyAmount}</strong>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800/60">
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Players</span>
                    <strong className="text-white">{game.remainingPlayersCount} / {game.totalPlayersCount}</strong>
                  </div>
                </div>

                {/* Actions Strip */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <div className="flex items-center gap-2">
                    {onSelectGame && (
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => onSelectGame(game)}
                      >
                        <PlayCircle className="w-3.5 h-3.5" /> Manage Game
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenScheduleModal(game)}
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-400" /> Edit
                    </Button>

                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => onDeleteGame(game.$id, game.title)}
                      className="hover:border-rose-500/40 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400"
                      title="Delete Event"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
