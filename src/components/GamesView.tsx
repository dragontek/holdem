import React, { useState } from 'react';
import type { Game, Venue, Announcement, HotHandJackpot, UserProfile } from '../types/holdem';
import { 
  Calendar, 
  MapPin, 
  Phone, 
  ExternalLink, 
  Flame, 
  Clock, 
  Users, 
  UserCheck, 
  ChevronRight, 
  Megaphone,
  Sparkles,
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  RotateCcw
} from 'lucide-react';

interface GamesViewProps {
  games: Game[];
  venues: Venue[];
  announcements: Announcement[];
  hotHand: HotHandJackpot;
  onSelectGame: (game: Game) => void;
  isDirector?: boolean;
  onOpenScheduleModal?: () => void;
  onOpenVenueModal?: () => void;
  seasonName?: string;
  currentUser?: UserProfile | null;
  onToggleRSVP?: (gameId: string) => void;
  onNavigateInfo?: () => void;
}

export const GamesView: React.FC<GamesViewProps> = ({
  games,
  venues,
  announcements,
  hotHand,
  onSelectGame,
  isDirector,
  onOpenScheduleModal,
  onOpenVenueModal,
  seasonName = '2026 Crawl 3',
  currentUser,
  onToggleRSVP,
  onNavigateInfo,
}) => {
  const [selectedVenueId, setSelectedVenueId] = useState<string>('all');

  const filteredGames = games.filter(game => {
    if (selectedVenueId === 'all') return true;
    return game.venueId === selectedVenueId;
  });

  const liveGamesCount = games.filter(g => g.status === 'running').length;
  const scheduledGamesCount = games.filter(g => g.status === 'scheduled').length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 pb-24 md:pb-12 animate-fadeIn">
      
      {/* Executive Page Header Banner */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl felt-gradient border border-emerald-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-lg felt-glow">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider">
                  TOURNAMENT HUB
                </span>
                <span className="text-xs text-slate-400 font-semibold">{seasonName}</span>
              </div>
              <h1 className="text-2xl font-black text-white mt-0.5">Tournament Schedule &amp; Live Games</h1>
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
      </div>

      {/* 1. Announcements Banner */}
      {announcements.map((ann) => (
        <div
          key={ann.$id}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-950 via-rose-900 to-amber-950 p-5 border border-red-500/40 shadow-xl"
        >
          <div className="flex items-start gap-4 relative z-10">
            <div className="p-3 bg-red-500/20 text-red-400 rounded-xl border border-red-500/40 shrink-0">
              <Megaphone className="w-6 h-6 animate-bounce" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] uppercase font-extrabold tracking-wider bg-red-500 text-white rounded">
                  ANNOUNCEMENT
                </span>
                <h3 className="text-lg font-bold text-white tracking-tight">{ann.title}</h3>
              </div>
              <p className="text-sm text-rose-100/90 leading-relaxed max-w-4xl">{ann.content}</p>
              {onNavigateInfo && (
                <div className="pt-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigateInfo();
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-amber-200 underline underline-offset-4 cursor-pointer"
                  >
                    View Official League Rules &amp; Points Structure →
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />
        </div>
      ))}

      {/* 2. Hot Hand Jackpot Side-Promo Banner */}
      <div className="glass-card rounded-2xl p-5 border border-amber-500/30 relative overflow-hidden gold-glow">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/20 rounded-xl border border-amber-500/40 text-amber-400">
              <Flame className="w-7 h-7 text-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-widest text-amber-400 font-extrabold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> DAILY HOT HAND JACKPOT
                </span>
                <span className="text-xs text-slate-400">• {hotHand.date}</span>
              </div>
              <h2 className="text-xl font-black text-white">{hotHand.handTitle}</h2>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-900/90 px-4 py-2.5 rounded-xl border border-amber-500/30">
            <div className="text-right">
              <div className="text-[10px] uppercase text-slate-400 font-semibold">Current Bounty</div>
              <div className="text-2xl font-black text-amber-400">${hotHand.currentPool}</div>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <button className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all">
              Claim Info
            </button>
          </div>
        </div>
      </div>

      {/* 3. Venue Filter Sub-Bar */}
      <div className="flex items-center justify-between gap-4 overflow-x-auto pb-2 scrollbar-none">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedVenueId('all')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
              selectedVenueId === 'all'
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
                selectedVenueId === venue.$id
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
                  </div>

                  <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
                </div>

                {/* Game Title & Venue Name */}
                <div className="space-y-1 mb-4">
                  <h3 className="text-xl font-bold text-white group-hover:text-amber-300 transition-colors">
                    {game.venueName}
                  </h3>
                  <p className="text-sm text-slate-400">{game.title}</p>
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
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Buy-in</div>
                    <div className="text-sm font-bold text-emerald-400">${game.buyinAmount}</div>
                  </div>

                  <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Players Left</div>
                    <div className="text-sm font-bold text-amber-400">
                      {game.remainingPlayersCount} / {game.totalPlayersCount}
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

                  {game.status === 'scheduled' && onToggleRSVP && (
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
      </div>

    </div>
  );
};
