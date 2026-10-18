import React from 'react';
import type { Game, Venue, HotHandJackpot, Announcement, UserProfile } from '@/types/holdem';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  PlayCircle, 
  Clock, 
  RotateCcw, 
  MapPin, 
  Flame, 
  UserCheck, 
  ChevronRight, 
  Sparkles 
} from 'lucide-react';

interface ScheduleSpotlightHeroProps {
  game: Game;
  venue?: Venue | null;
  seasonName: string;
  hotHand?: HotHandJackpot | null;
  announcements?: Announcement[];
  currentUser: UserProfile | null;
  onSelectGame: (game: Game) => void;
  onToggleRSVP: (gameId: string) => void;
  onNavigateGuide?: (tab?: 'rules' | 'scoring' | 'blinds' | 'venues' | 'gallery') => void;
  formatDateLabel: (d: string) => string;
  formatTimeLabel: (d: string) => string;
}

export const ScheduleSpotlightHero: React.FC<ScheduleSpotlightHeroProps> = ({
  game,
  venue,
  seasonName,
  hotHand,
  announcements,
  currentUser,
  onSelectGame,
  onToggleRSVP,
  onNavigateGuide,
  formatDateLabel,
  formatTimeLabel,
}) => {
  const isUserRsvped = currentUser && game.rsvpPlayerIds?.includes(currentUser.$id);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 p-5 md:p-6 shadow-xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
        {/* Left: Tournament Details */}
        <div className="space-y-2.5 max-w-2xl">
          <div className="flex items-center gap-2 flex-wrap">
            {game.status === 'running' ? (
              <Badge variant="success" className="animate-pulse">
                <PlayCircle className="w-3.5 h-3.5" /> LIVE IN PLAY
              </Badge>
            ) : (
              <Badge variant="indigo">
                <Clock className="w-3.5 h-3.5" /> UPCOMING TOURNAMENT
              </Badge>
            )}
            {game.isRecurring && (
              <Badge variant="secondary">
                <RotateCcw className="w-3 h-3 text-amber-400" />
                <span>{game.recurrenceRule || 'Weekly Series'}</span>
              </Badge>
            )}
            <span className="text-xs text-slate-400 font-semibold">{seasonName}</span>
          </div>

          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">{game.title}</h2>
            <div className="flex items-center gap-2 text-sm text-slate-300 mt-1">
              <span className="font-bold text-amber-400">{game.venueName}</span>
              {venue && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400 flex items-center gap-1 text-xs">
                    <MapPin className="w-3 h-3 text-amber-500" /> {venue.address}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Tournament Key Metrics Strip */}
          <div className="flex items-center gap-3 pt-1 flex-wrap text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-300">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold">{formatDateLabel(game.scheduledAt)} at {formatTimeLabel(game.scheduledAt)}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-emerald-400 font-bold">
              <span>${game.buyinAmount} Buy-in</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-amber-400 font-bold">
              <span>{(game.startingChips / 1000).toFixed(0)}k Stack</span>
            </div>
            {hotHand && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Hot Hand: ${hotHand.currentPool} ({hotHand.handTitle})</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant={isUserRsvped ? 'secondary' : 'default'}
              size="default"
              onClick={() => onToggleRSVP(game.$id)}
              className="font-bold cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>{isUserRsvped ? '✓ Attending' : 'RSVP Now'}</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-950/30 text-[10px]">
                {game.rsvpPlayerIds?.length || 0}
              </span>
            </Button>

            <Button
              variant="outline"
              size="default"
              onClick={() => onSelectGame(game)}
              className="font-semibold cursor-pointer"
            >
              <span>Tournament Desk</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {announcements && announcements.length > 0 && onNavigateGuide && (
            <button
              onClick={() => onNavigateGuide('rules')}
              className="text-xs text-amber-400/90 hover:text-amber-300 hover:underline flex items-center gap-1 pt-1 cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>{announcements[0].title} — League Rules &rarr;</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
