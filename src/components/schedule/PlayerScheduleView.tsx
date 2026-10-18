import React, { useState } from 'react';
import type { Game, Venue, Announcement, HotHandJackpot, UserProfile } from '@/types/holdem';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  MapPin, 
  UserCheck, 
  RotateCcw, 
  ChevronRight,
  Search
} from 'lucide-react';
import { ScheduleSpotlightHero } from './ScheduleSpotlightHero';

interface PlayerScheduleViewProps {
  games: Game[];
  venues: Venue[];
  seasonName: string;
  hotHand?: HotHandJackpot | null;
  announcements?: Announcement[];
  currentUser: UserProfile | null;
  onSelectGame: (game: Game) => void;
  onToggleRSVP: (gameId: string) => void;
  onNavigateGuide?: (tab?: 'rules' | 'scoring' | 'blinds' | 'venues' | 'gallery') => void;
}

export const PlayerScheduleView: React.FC<PlayerScheduleViewProps> = ({
  games,
  venues,
  seasonName,
  hotHand,
  announcements,
  currentUser,
  onSelectGame,
  onToggleRSVP,
  onNavigateGuide,
}) => {
  const [selectedVenueId, setSelectedVenueId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const formatDateLabel = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatTimeLabel = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const filteredGames = games.filter((game) => {
    if (selectedVenueId !== 'all' && game.venueId !== selectedVenueId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = game.title.toLowerCase().includes(q);
      const matchVenue = game.venueName.toLowerCase().includes(q);
      if (!matchTitle && !matchVenue) return false;
    }
    return true;
  });

  const spotlightGame = filteredGames.find((g) => g.status === 'running') || filteredGames.find((g) => g.status === 'scheduled') || filteredGames[0];
  const spotlightVenue = spotlightGame ? venues.find((v) => v.$id === spotlightGame.venueId) : null;

  const groupedGames = filteredGames.reduce<Record<string, Game[]>>((acc, game) => {
    const key = formatDateLabel(game.scheduledAt);
    if (!acc[key]) acc[key] = [];
    acc[key].push(game);
    return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 pb-24 md:pb-12 animate-fadeIn">
      {/* 1. Spotlight Feature Banner */}
      {spotlightGame && (
        <ScheduleSpotlightHero
          game={spotlightGame}
          venue={spotlightVenue}
          seasonName={seasonName}
          hotHand={hotHand}
          announcements={announcements}
          currentUser={currentUser}
          onSelectGame={onSelectGame}
          onToggleRSVP={onToggleRSVP}
          onNavigateGuide={onNavigateGuide}
          formatDateLabel={formatDateLabel}
          formatTimeLabel={formatTimeLabel}
        />
      )}

      {/* 2. Compact Search & Venue Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedVenueId('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              selectedVenueId === 'all'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            All Venues ({games.length})
          </button>
          {venues.map((venue) => (
            <button
              key={venue.$id}
              onClick={() => setSelectedVenueId(venue.$id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                selectedVenueId === venue.$id
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <MapPin className="w-3 h-3" />
              <span>{venue.name}</span>
            </button>
          ))}
        </div>

        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search tournament or venue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 text-xs text-white pl-8 pr-3 py-1.5 rounded-lg border border-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* 3. Chronological Day-by-Day Tournament Schedule */}
      <div className="space-y-6">
        {Object.keys(groupedGames).length === 0 ? (
          <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-slate-800/80 text-slate-400 space-y-2">
            <Calendar className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-sm font-semibold">No tournaments found matching current venue or search filter.</p>
          </div>
        ) : (
          Object.entries(groupedGames).map(([dateLabel, dayGames]) => (
            <div key={dateLabel} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">{dateLabel}</span>
                <span className="h-px flex-1 bg-slate-800/80" />
                <span className="text-[11px] text-slate-500 font-medium">{dayGames.length} event{dayGames.length > 1 ? 's' : ''}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {dayGames.map((game) => {
                  const isLive = game.status === 'running';
                  const isCompleted = game.status === 'completed';
                  const isUserRsvped = currentUser && game.rsvpPlayerIds?.includes(currentUser.$id);

                  return (
                    <Card
                      key={game.$id}
                      onClick={() => onSelectGame(game)}
                      className={`group hover:border-slate-700 transition-all cursor-pointer relative overflow-hidden ${
                        isLive ? 'border-emerald-500/40 bg-emerald-950/10' : ''
                      }`}
                    >
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-950 text-slate-200 border border-slate-800">
                              {formatTimeLabel(game.scheduledAt)}
                            </span>
                            {isLive ? (
                              <Badge variant="success" className="text-[10px]">LIVE NOW</Badge>
                            ) : isCompleted ? (
                              <Badge variant="secondary" className="text-[10px]">COMPLETED</Badge>
                            ) : null}
                            {game.isRecurring && (
                              <Badge variant="indigo" className="text-[10px]">
                                <RotateCcw className="w-2.5 h-2.5" />
                                <span>{game.recurrenceRule || 'Weekly'}</span>
                              </Badge>
                            )}
                          </div>

                          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                        </div>

                        <div>
                          <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                            {game.venueName}
                          </h3>
                          <p className="text-xs text-slate-400">{game.title}</p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                          <div className="flex items-center gap-3 text-slate-300">
                            <span className="font-bold text-emerald-400">${game.buyinAmount}</span>
                            <span className="text-slate-600">•</span>
                            <span className="text-slate-400">{(game.startingChips / 1000).toFixed(0)}k Stack</span>
                            <span className="text-slate-600">•</span>
                            <span className="text-slate-400">{game.rsvpPlayerIds?.length || 0} RSVPs</span>
                          </div>

                          {game.status === 'scheduled' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleRSVP(game.$id);
                              }}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                isUserRsvped
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                              }`}
                            >
                              <UserCheck className="w-3 h-3 text-emerald-400" />
                              <span>{isUserRsvped ? '✓ Going' : 'RSVP'}</span>
                            </button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
