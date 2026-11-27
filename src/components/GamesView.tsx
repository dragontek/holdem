import React, { useState } from 'react';
import type {
  Game,
  Venue,
  League,
  Season,
  Announcement,
  HotHandJackpot,
  UserProfile,
} from '../types/holdem';
import type { LiveScoreNotification } from '@/lib/liveScoreEvents';
import { AuthService } from '@/services/authService';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  MapPin,
  Phone,
  ExternalLink,
  Flame,
  Clock,
  UserCheck,
  ChevronRight,
  Sparkles,
  PlayCircle,
  CheckCircle2,
  RotateCcw,
  Crown,
  Trophy,
} from 'lucide-react';

interface GamesViewProps {
  games: Game[];
  venues: Venue[];
  leagues?: League[];
  seasons?: Season[];
  activeLeague?: League | null;
  activeSeason?: Season | null;
  onSelectLeague?: (leagueId: string | null) => void;
  onSelectSeason?: (seasonId: string | null) => void;
  announcements: Announcement[];
  hotHand?: HotHandJackpot | null;
  onSelectGame: (game: Game) => void;
  isDirector?: boolean;
  onOpenScheduleModal?: () => void;
  onOpenVenueModal?: () => void;
  seasonName?: string;
  currentUser?: UserProfile | null;
  onToggleRSVP?: (gameId: string) => void;
  onNavigateInfo?: () => void;
  onEditAnnouncement?: (announcement: Announcement) => void;
  onCreateAnnouncement?: () => void;
  recentFeed?: LiveScoreNotification[];
}

export const GamesView: React.FC<GamesViewProps> = ({
  games,
  venues,
  leagues = [],
  seasons = [],
  activeLeague = null,
  activeSeason = null,
  onSelectLeague,
  onSelectSeason,
  announcements,
  hotHand = null,
  onSelectGame,
  isDirector,
  onOpenScheduleModal,
  onOpenVenueModal,
  seasonName = 'Active Season',
  currentUser,
  onToggleRSVP,
  onNavigateInfo,
  onEditAnnouncement,
  onCreateAnnouncement,
  recentFeed = [],
}) => {
  const [selectedVenueId, setSelectedVenueId] = useState<string>('all');

  const effectiveVenueId =
    selectedVenueId === 'all' || venues.some((v) => v.$id === selectedVenueId)
      ? selectedVenueId
      : 'all';

  const filteredGames = games.filter((game) => {
    if (effectiveVenueId === 'all') return true;
    return game.venueId === effectiveVenueId;
  });

  const liveGamesCount = games.filter((g) => g.status === 'running').length;
  const scheduledGamesCount = games.filter((g) => g.status === 'scheduled').length;

  const hubBadgeLabel = activeSeason
    ? 'SEASON HUB'
    : activeLeague
    ? 'LEAGUE HUB'
    : 'TOURNAMENT HUB';
  const hubHeading = activeSeason
    ? activeSeason.name
    : activeLeague
    ? activeLeague.name
    : 'Tournament Schedule & Live Games';
  const hubSubtext = activeSeason
    ? `${activeLeague?.name || 'Jack Ten Poker'}${
        activeSeason.startDate && activeSeason.endDate
          ? ` • ${activeSeason.startDate} to ${activeSeason.endDate}`
          : ''
      }`
    : activeLeague
    ? activeLeague.description
    : seasonName;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 pb-24 md:pb-12 animate-fadeIn">
      
      {/* Executive Page Header Banner */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl felt-gradient border border-emerald-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-lg">
              {activeSeason ? (
                <Trophy className="w-6 h-6" />
              ) : activeLeague ? (
                <Crown className="w-6 h-6" />
              ) : (
                <Calendar className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider">
                  {hubBadgeLabel}
                </span>
                {activeSeason?.isActive && <Badge variant="default">Active Season</Badge>}
                {!activeLeague && (
                  <span className="text-xs text-slate-400 font-semibold">{seasonName}</span>
                )}
              </div>
              <h1 className="text-2xl font-black text-white mt-0.5">{hubHeading}</h1>
              {hubSubtext && activeLeague && (
                <p className="text-xs text-slate-400 mt-0.5">{hubSubtext}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 font-bold">{liveGamesCount} Live</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300">{scheduledGamesCount} Upcoming Events</span>
            </div>
          </div>
        </div>

        {/* League Switcher Strip (only shown when multiple leagues exist) */}
        {leagues.length > 1 && onSelectLeague && (
          <div className="pt-3 border-t border-slate-800/80 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              Switch League
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {leagues.map((league) => {
                const isSelected = activeLeague?.$id === league.$id;
                return (
                  <button
                    key={league.$id}
                    type="button"
                    onClick={() => onSelectLeague(league.$id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    {league.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Season Selector (jumps straight to /games/:seasonId) */}
        {seasons.length > 0 && onSelectSeason && (
          <div className="pt-3 border-t border-slate-800/80 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              {activeLeague ? `Seasons in ${activeLeague.name}` : 'Seasons'}
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => onSelectSeason(null)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                  !activeSeason
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700 hover:text-white'
                }`}
              >
                All Seasons
              </button>
              {seasons.map((season) => {
                const isSelected = activeSeason?.$id === season.$id;
                return (
                  <button
                    key={season.$id}
                    type="button"
                    onClick={() => onSelectSeason(season.$id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap inline-flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <span>{season.name}</span>
                    {season.isActive && (
                      <span
                        className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded ${
                          isSelected
                            ? 'bg-slate-950/20 text-slate-950'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        Active
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 1. Dynamic Announcements Banner */}
      <AnnouncementBanner
        announcements={announcements}
        canEdit={AuthService.canAccessAdmin(currentUser?.role)}
        onEditAnnouncement={onEditAnnouncement}
        onCreateAnnouncement={onCreateAnnouncement}
        onNavigateInfo={onNavigateInfo}
      />

      {/* Live Table Action Feed (Persistent History of Recent Score Awards) */}
      {recentFeed.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-slate-900/70 p-4 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" /> Live Table Score Feed
            </span>
            <span className="text-[11px] text-slate-400">Real-time scribe updates</span>
          </div>
          <div className="space-y-1.5">
            {recentFeed.slice(0, 4).map((ev) => (
              <div
                key={ev.id}
                className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <span className="font-bold text-white">{ev.headline}</span>
                  {ev.venueName && (
                    <span className="text-slate-400 ml-2">• {ev.venueName}</span>
                  )}
                </div>
                {ev.pointsAwarded > 0 && (
                  <Badge variant="default" className="font-mono shrink-0">
                    +{ev.pointsAwarded.toLocaleString()} pts
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Daily Hot Hand Bonus Target Banner */}
      {hotHand && (
        <div className="glass-card rounded-2xl p-5 border border-amber-500/30 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/20 rounded-xl border border-amber-500/40 text-amber-400">
                <Flame className="w-7 h-7 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-widest text-amber-400 font-extrabold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> DAILY HOT HAND TARGET
                  </span>
                  {hotHand.date && <span className="text-xs text-slate-400">• {hotHand.date}</span>}
                </div>
                <h2 className="text-xl font-black text-white">{hotHand.handTitle}</h2>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-slate-900/90 px-4 py-2.5 rounded-xl border border-amber-500/30">
              <div className="text-right">
                <div className="text-[10px] uppercase text-slate-400 font-semibold">Hot Hand Bonus</div>
                <div className="text-xl font-mono font-black text-amber-400">Session Target</div>
              </div>
              {onNavigateInfo && (
                <>
                  <div className="w-px h-8 bg-slate-800" />
                  <button
                    type="button"
                    onClick={onNavigateInfo}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all"
                  >
                    Scoring Rules
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Venue Filter Sub-Bar */}
      <div className="flex items-center justify-between gap-4 overflow-x-auto pb-2 scrollbar-none">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedVenueId('all')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
              effectiveVenueId === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'glass-card text-slate-300 hover:bg-slate-800'
            }`}
          >
            All Venues ({games.length})
          </button>
          {venues.map((venue) => (
            <button
              key={venue.$id}
              onClick={() => setSelectedVenueId(venue.$id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                effectiveVenueId === venue.$id
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'glass-card text-slate-300 hover:bg-slate-800'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              {venue.name}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Games Catalog */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-400" /> Scheduled & Active Games
            </h2>
            <span className="text-xs text-slate-400">Tap any game for full blind timer & seating</span>
          </div>

          {isDirector && (
            <div className="flex items-center gap-2">
              {onOpenVenueModal && (
                <button
                  onClick={onOpenVenueModal}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all shadow-sm"
                >
                  Venues Hub
                </button>
              )}
              {onOpenScheduleModal && (
                <button
                  onClick={onOpenScheduleModal}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md"
                >
                  + Schedule Event
                </button>
              )}
            </div>
          )}
        </div>

        {filteredGames.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-10 text-center space-y-3">
            <Calendar className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-white">No Games Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {effectiveVenueId !== 'all'
                ? 'No games scheduled for the selected venue in this view.'
                : activeSeason
                ? `No games have been scheduled yet for ${activeSeason.name}.`
                : 'No games have been scheduled yet for this league.'}
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              {effectiveVenueId !== 'all' && (
                <Button variant="outline" size="sm" onClick={() => setSelectedVenueId('all')}>
                  Show All Venues
                </Button>
              )}
              {activeSeason && onSelectSeason && (
                <Button variant="outline" size="sm" onClick={() => onSelectSeason(null)}>
                  View All Seasons
                </Button>
              )}
              {isDirector && onOpenScheduleModal && (
                <Button variant="default" size="sm" onClick={onOpenScheduleModal}>
                  + Schedule Event
                </Button>
              )}
            </div>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGames.map((game) => {
            const venue = venues.find(v => v.$id === game.venueId);
            const isLive = game.status === 'running';
            const isCompleted = game.status === 'completed';

            return (
              <div
                key={game.$id}
                onClick={() => onSelectGame(game)}
                className={`glass-card rounded-2xl p-5 border transition-all cursor-pointer hover:scale-[1.01] hover:border-amber-500/50 group relative overflow-hidden ${
                  isLive ? 'border-emerald-500/50 felt-glow' : 'border-slate-800'
                }`}
              >
                {/* Status Badge */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    {isLive ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 animate-pulse">
                        <PlayCircle className="w-3.5 h-3.5" /> LIVE IN PROGRESS
                      </span>
                    ) : isCompleted ? (
                      <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-xs font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> OFFICIAL RESULTS
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> UPCOMING TODAY
                      </span>
                    )}

                    {game.isRecurring && (
                      <span className="px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                        <RotateCcw className="w-3 h-3 text-purple-400" />
                        {game.recurrenceRule || 'Weekly Series'}
                      </span>
                    )}

                    {game.dealerName && (
                      <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 text-xs font-medium">
                        Dealer: {game.dealerName}
                      </span>
                    )}

                    {(game.pointMultiplier ?? 1) > 1 && (
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold">
                        {game.pointMultiplier}x Points
                      </span>
                    )}

                    {game.isDayGame && (
                      <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-bold">
                        DG
                      </span>
                    )}

                    {game.noGamePlayed && (
                      <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold">
                        No-Game
                      </span>
                    )}
                  </div>

                  <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
                </div>

                {/* Game Title & Venue Name */}
                <div className="space-y-1 mb-4">
                  <h3 className="text-xl font-bold text-white group-hover:text-amber-300 transition-colors">
                    {game.venueName}
                  </h3>
                  <p className="text-sm text-slate-400">{game.title}</p>
                  {(game.hodRule || game.hotHandDescription) && (
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-400">
                      {game.hodRule && (
                        <span>
                          HOD: <strong className="text-amber-300">{game.hodRule}</strong>
                        </span>
                      )}
                      {game.hodRule && game.hotHandDescription && <span>•</span>}
                      {game.hotHandDescription && (
                        <span>
                          Hot Hand: <strong className="text-rose-300">{game.hotHandDescription}</strong>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Venue Address & Contact Quick Strip */}
                {venue && (
                  <div className="bg-slate-950/60 rounded-xl p-3 mb-4 border border-slate-800/80 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">{venue.address}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-xs text-slate-400 border-t border-slate-900">
                      <a 
                        href={`tel:${venue.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 hover:text-amber-400 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5 text-slate-500" /> {venue.phone}
                      </a>

                      {venue.website && (
                        <a 
                          href={venue.website}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 hover:text-amber-400 transition-colors"
                        >
                          Website <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Game Metrics Grid */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/60 text-center">
                  <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Points Scale</div>
                    <div className="text-sm font-bold text-emerald-400">
                      {game.pointMultiplier ?? 1}x {game.isDayGame ? '• DG' : ''}
                    </div>
                  </div>

                  <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">
                      {game.status === 'scheduled'
                        ? 'Seated'
                        : game.status === 'completed'
                        ? 'Total Players'
                        : 'Players Left'}
                    </div>
                    <div className="text-sm font-bold text-amber-400">
                      {game.status === 'scheduled' || game.status === 'completed'
                        ? game.totalPlayersCount
                        : `${game.remainingPlayersCount} / ${game.totalPlayersCount}`}
                    </div>
                  </div>

                  <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Starting Stack</div>
                    <div className="text-sm font-bold text-indigo-300">
                      {(game.startingChips / 1000).toFixed(0)}k
                    </div>
                  </div>
                </div>

                {/* RSVP / Attending Action Bar */}
                <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{game.rsvpPlayerIds?.length || 0} RSVPs confirmed</span>
                  </div>

                  {(game.status === 'scheduled' || game.status === 'running') && onToggleRSVP && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleRSVP(game.$id);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        currentUser && game.rsvpPlayerIds?.includes(currentUser.$id)
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm'
                      }`}
                      title={currentUser ? 'Toggle tournament RSVP' : 'Sign in to RSVP'}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>
                        {currentUser && game.rsvpPlayerIds?.includes(currentUser.$id)
                          ? '✓ Attending'
                          : 'RSVP Now'}
                      </span>
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
        )}
      </div>

    </div>
  );
};
