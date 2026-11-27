import React, { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import type { ViewMode } from './components/Navigation';
import { GamesView } from './components/GamesView';
import { LeaderboardView } from './components/LeaderboardView';
import { PlayerStatsView } from './components/PlayerStatsView';
import { DirectorDesk } from './components/DirectorDesk';
import { AdminView } from './components/AdminView';
import { VenueTVDisplay } from './components/VenueTVDisplay';
import { QRCheckinModal } from './components/QRCheckinModal';
import { AppwriteSetupModal } from './components/AppwriteSetupModal';
import { AuthModal } from './components/AuthModal';
import { VenueManagerModal } from './components/VenueManagerModal';
import { EventScheduleModal } from './components/EventScheduleModal';
import { InfoView } from './components/InfoView';
import { GalleryView } from './components/GalleryView';
import { AppwriteService } from './services/appwriteService';
import { AuthService } from './services/authService';
import type { 
  Game, 
  Venue, 
  Player, 
  Season, 
  Announcement, 
  HotHandJackpot, 
  GameEntry,
  UserProfile,
  UserRole,
  TournamentEvent,
  League,
  KnockoutCode
} from './types/holdem';
import { getEntryKnockouts, syncEntryCalculatedFields, type FinalizedEntryResult } from './lib/scoring';

interface ParsedHashRoute {
  view: ViewMode;
  gameId?: string;
  playerId?: string;
}

const VALID_VIEWS: readonly ViewMode[] = [
  'games',
  'leaderboard',
  'stats',
  'director',
  'admin',
  'tv',
  'info',
  'gallery',
];

function parseHashRoute(hash: string): ParsedHashRoute {
  const cleaned = hash.replace(/^#\/?/, '').trim();
  if (!cleaned) return { view: 'games' };

  const [segment, rawParam] = cleaned.split('/');
  const param = rawParam ? decodeURIComponent(rawParam) : undefined;

  if ((segment === 'games' || segment === 'director') && param) {
    return { view: 'director', gameId: param };
  }
  if (segment === 'tv') {
    return { view: 'tv', gameId: param };
  }
  if (segment === 'stats') {
    return { view: 'stats', playerId: param };
  }
  if (VALID_VIEWS.includes(segment as ViewMode)) {
    return { view: segment as ViewMode };
  }
  return { view: 'games' };
}

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>('games');
  const [viewHistory, setViewHistory] = useState<ViewMode[]>([]);
  
  const [games, setGames] = useState<Game[]>([]);
  const [events, setEvents] = useState<TournamentEvent[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [activeLeagueId, setActiveLeagueId] = useState<string>('league_1');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [hotHand, setHotHand] = useState<HotHandJackpot | null>(null);
  
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [gameEntries, setGameEntries] = useState<GameEntry[]>([]);

  // Modals & Auth State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isQROpen, setIsQROpen] = useState<boolean>(false);
  const [isAppwriteOpen, setIsAppwriteOpen] = useState<boolean>(false);
  const [isVenueModalOpen, setIsVenueModalOpen] = useState<boolean>(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState<boolean>(false);
  const [gameToEdit, setGameToEdit] = useState<Game | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Load initial data & active session
  useEffect(() => {
    async function loadData() {
      try {
        const [gList, vList, pList, sList, aList, hJackpot, user, eList, lList] = await Promise.all([
          AppwriteService.getGames(),
          AppwriteService.getVenues(),
          AppwriteService.getPlayers(),
          AppwriteService.getSeasons(),
          AppwriteService.getAnnouncements(),
          AppwriteService.getHotHandJackpot(),
          AuthService.getCurrentUser(),
          AppwriteService.getEvents(),
          AppwriteService.getLeagues(),
        ]);

        setGames(gList);
        setEvents(eList);
        setVenues(vList);
        setPlayers(pList);
        setSeasons(sList);
        setLeagues(lList);
        if (lList.length > 0) {
          setActiveLeagueId(lList[0].$id);
        }
        setAnnouncements(aList);
        setHotHand(hJackpot);
        setCurrentUser(user);

        const initialRoute = parseHashRoute(window.location.hash);
        const routeGame = initialRoute.gameId
          ? gList.find((g) => g.$id === initialRoute.gameId)
          : undefined;
        const activeG = routeGame || gList.find((g) => g.status === 'running') || gList[0];
        setSelectedGame(activeG);

        if (initialRoute.playerId) {
          const routePlayer = pList.find((p) => p.$id === initialRoute.playerId);
          if (routePlayer) setSelectedPlayer(routePlayer);
        }

        if (activeG) {
          const entries = await AppwriteService.getGameEntries(activeG.$id);
          setGameEntries(entries);
        }

        // Apply initial hash route (falling back to 'games' if route game wasn't found)
        if (initialRoute.view === 'director' && !routeGame && initialRoute.gameId) {
          setCurrentView('games');
          window.history.replaceState({ view: 'games' }, '', '#games');
        } else {
          setCurrentView(initialRoute.view);
          const canonicalHash =
            initialRoute.view === 'director' && activeG
              ? `#games/${encodeURIComponent(activeG.$id)}`
              : initialRoute.view === 'tv' && activeG
              ? `#tv/${encodeURIComponent(activeG.$id)}`
              : initialRoute.view === 'stats' && initialRoute.playerId
              ? `#stats/${encodeURIComponent(initialRoute.playerId)}`
              : `#${initialRoute.view}`;
          window.history.replaceState(
            {
              view: initialRoute.view,
              gameId: activeG?.$id,
              playerId: initialRoute.playerId,
            },
            '',
            canonicalHash
          );
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Sync with browser Back / Forward and direct hash changes
  useEffect(() => {
    const syncFromLocation = async (event?: PopStateEvent) => {
      const parsed = parseHashRoute(window.location.hash);
      const state = event?.state as { view?: ViewMode; gameId?: string; playerId?: string } | null;

      const targetGameId = parsed.gameId || (parsed.view === 'director' || parsed.view === 'tv' ? state?.gameId : undefined);
      const targetPlayerId = parsed.playerId || (parsed.view === 'stats' ? state?.playerId : undefined);

      if (targetGameId) {
        const foundGame = games.find((g) => g.$id === targetGameId);
        if (foundGame) {
          setSelectedGame(foundGame);
          const entries = await AppwriteService.getGameEntries(foundGame.$id);
          setGameEntries(entries);
        }
      }

      if (targetPlayerId) {
        const foundPlayer = players.find((p) => p.$id === targetPlayerId);
        if (foundPlayer) setSelectedPlayer(foundPlayer);
      }

      setCurrentView(parsed.view);
    };

    const handlePopState = (event: PopStateEvent) => {
      void syncFromLocation(event);
    };
    const handleHashChange = () => {
      void syncFromLocation();
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [players, games]);

  // Internal App Navigation Stack
  const handleNavigate = (view: ViewMode) => {
    if (view === currentView) return;

    // RBAC route protection
    if (view === 'admin' && !AuthService.canAccessAdmin(currentUser?.role)) {
      setIsAuthOpen(true);
      return;
    }
    if (view === 'director' && !AuthService.canAccessDirector(currentUser?.role)) {
      setIsAuthOpen(true);
      return;
    }

    setViewHistory((prev) => [...prev, currentView]);
    setCurrentView(view);
    const nextHash =
      view === 'director' && selectedGame
        ? `#games/${encodeURIComponent(selectedGame.$id)}`
        : view === 'tv' && selectedGame
        ? `#tv/${encodeURIComponent(selectedGame.$id)}`
        : `#${view}`;
    window.history.pushState({ view, gameId: selectedGame?.$id }, '', nextHash);
  };

  const handleGoBack = () => {
    if (window.history.state && window.history.length > 1) {
      window.history.back();
    } else if (viewHistory.length > 0) {
      const prev = viewHistory[viewHistory.length - 1];
      setViewHistory((h) => h.slice(0, -1));
      setCurrentView(prev);
      window.history.replaceState({ view: prev }, '', `#${prev}`);
    } else {
      setCurrentView('games');
      window.history.replaceState({ view: 'games' }, '', '#games');
    }
  };

  const handleSelectGame = async (game: Game) => {
    setSelectedGame(game);
    setGameEntries([]);
    setViewHistory((prev) => [...prev, currentView]);
    setCurrentView('director');
    window.history.pushState(
      { view: 'director', gameId: game.$id },
      '',
      `#games/${encodeURIComponent(game.$id)}`
    );
    const entries = await AppwriteService.getGameEntries(game.$id);
    setGameEntries(entries);
  };

  const handleUpdateGame = (updatedGame: Game) => {
    setSelectedGame(updatedGame);
    setGames((prev) => prev.map((g) => (g.$id === updatedGame.$id ? updatedGame : g)));
  };

  const handleSelectPlayer = (player: Player) => {
    setSelectedPlayer(player);
    setViewHistory((prev) => [...prev, currentView]);
    setCurrentView('stats');
    window.history.pushState(
      { view: 'stats', playerId: player.$id },
      '',
      `#stats/${encodeURIComponent(player.$id)}`
    );
  };

  const handleEliminatePlayer = (
    entryId: string,
    koByPlayerId?: string,
    koType: KnockoutCode | null = 'K',
    isMuck: boolean = false
  ) => {
    setGameEntries((prev) => {
      const remainingCount = prev.filter((e) => !e.isEliminated).length;
      const killerEntry = koByPlayerId ? prev.find((e) => e.playerId === koByPlayerId) : undefined;
      const gameContext = selectedGame || { pointMultiplier: 1 as const, isDayGame: false, noGamePlayed: false };

      return prev.map((entry) => {
        if (entry.$id === entryId) {
          return syncEntryCalculatedFields(
            {
              ...entry,
              status: isMuck ? 'MUCK' : 'ELIMINATED',
              isEliminated: true,
              finishPosition: remainingCount,
              eliminatedAt: new Date().toISOString(),
              eliminatedBySeat: killerEntry?.seatNumber,
              knockedOutByPlayerId: killerEntry?.playerId,
              knockedOutByPlayerName: killerEntry?.playerName,
            },
            gameContext
          );
        }
        if (koByPlayerId && koType && entry.playerId === koByPlayerId) {
          const nextKOs: KnockoutCode[] = [...getEntryKnockouts(entry), koType];
          return syncEntryCalculatedFields(
            {
              ...entry,
              knockouts: nextKOs,
              kosCount: nextKOs.length,
            },
            gameContext
          );
        }
        return entry;
      });
    });
  };

  const handleTournamentFinalized = (results: FinalizedEntryResult[]) => {
    const resultByEntryId = new Map(results.map((r) => [r.entryId, r]));
    const resultByPlayerId = new Map(results.map((r) => [r.playerId, r]));

    setGameEntries((prev) =>
      prev.map((entry) => {
        const res = resultByEntryId.get(entry.$id);
        if (!res) return entry;
        return {
          ...entry,
          finishPosition: res.finishPosition,
          status: res.status,
          isEliminated: res.finishPosition > 1 || res.status === 'MUCK',
          earnedDgForNextGame: res.earnedDgForNextGame,
          calculatedBasePoints: res.basePoints,
          calculatedFinalPoints: res.finalPoints,
          pointsAwarded: res.finalPoints,
          knockouts: res.knockouts,
          kosCount: res.knockouts.length,
          handBonuses: res.handBonuses,
        };
      })
    );

    setPlayers((prev) =>
      prev.map((player) => {
        const res = resultByPlayerId.get(player.$id);
        if (!res) return player;
        return {
          ...player,
          totalPoints: player.totalPoints + res.finalPoints,
          gamesPlayed: player.gamesPlayed + 1,
          careerWins: player.careerWins + (res.finishPosition === 1 && res.status !== 'MUCK' ? 1 : 0),
          careerKOs: player.careerKOs + res.knockouts.length,
          highHandBadges: (player.highHandBadges || 0) + res.highHandCount,
          hasDgCarryover: res.nextHasDgCarryover,
        };
      })
    );
  };

  const handleToggleRSVP = async (gameId: string) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    try {
      const updatedGame = await AppwriteService.toggleRSVP(gameId, currentUser.$id);
      setGames((prev) => prev.map((g) => (g.$id === gameId ? updatedGame : g)));
      if (selectedGame?.$id === gameId) {
        setSelectedGame(updatedGame);
      }
    } catch (e) {
      console.error('Failed to toggle RSVP', e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-16 h-16 rounded-2xl felt-gradient border-2 border-emerald-500/40 flex items-center justify-center text-3xl font-black text-amber-400 animate-bounce felt-glow">
          ♠
        </div>
        <div className="text-xl font-bold tracking-tight">Loading Hold&apos;em League Pro...</div>
        <div className="text-xs text-slate-400">Fetching live games, venues, and leaderboard standings</div>
      </div>
    );
  }

  const leagueSeasons = seasons.filter((s) => !s.leagueId || s.leagueId === activeLeagueId);
  const leagueVenues = venues.filter((v) => !v.leagueId || v.leagueId === activeLeagueId);
  const activeSeasonName = (leagueSeasons.find((s) => s.isActive) || leagueSeasons[0] || seasons[0])?.name || '2026 Crawl 3';
  const leagueGames = games.filter((g) => {
    const venue = venues.find((v) => v.$id === g.venueId);
    if (venue?.leagueId && venue.leagueId !== activeLeagueId) return false;
    return true;
  });

  const activeGameToDisplay = selectedGame || games[0];
  const previousView = viewHistory[viewHistory.length - 1];
  const backLabel = previousView === 'director' ? 'Back to Director Desk' : previousView === 'games' ? 'Back to Games' : 'Back to Standings';

  // TV View Mode Renders Fullscreen Broadcast Component
  if (currentView === 'tv' && activeGameToDisplay && hotHand) {
    return (
      <div className="relative">
        <button
          onClick={handleGoBack}
          className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl bg-slate-900/90 text-amber-400 text-xs font-bold border border-amber-500/40 hover:bg-slate-800 transition-all shadow-xl"
        >
          Exit TV Mode
        </button>
        <VenueTVDisplay
          key={activeGameToDisplay.$id}
          game={activeGameToDisplay}
          hotHand={hotHand}
          announcements={announcements}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Navigation Header */}
      <Navigation
        currentView={currentView}
        onSelectView={handleNavigate}
        onOpenQR={() => setIsQROpen(true)}
        onOpenAppwriteSetup={() => setIsAppwriteOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        currentUser={currentUser}
        seasonName={activeSeasonName}
        leagues={leagues}
        activeLeagueId={activeLeagueId}
        onSelectLeague={(id) => setActiveLeagueId(id)}
      />

      {/* Main View Container */}
      <main className="flex-1">
        {currentView === 'games' && (
          <GamesView
            games={leagueGames}
            venues={leagueVenues.length > 0 ? leagueVenues : venues}
            seasonName={activeSeasonName}
            announcements={announcements}
            hotHand={hotHand || { $id: '1', leagueId: '1', date: 'Aug 22', handTitle: '2/10 Boat', currentPool: 0, isClaimed: false }}
            onSelectGame={handleSelectGame}
            isDirector={AuthService.canAccessDirector(currentUser?.role)}
            onOpenScheduleModal={() => {
              setGameToEdit(null);
              setIsScheduleModalOpen(true);
            }}
            onOpenVenueModal={() => setIsVenueModalOpen(true)}
            currentUser={currentUser}
            onToggleRSVP={handleToggleRSVP}
            onNavigateInfo={() => handleNavigate('info')}
          />
        )}

        {currentView === 'leaderboard' && (
          <LeaderboardView
            players={players}
            seasons={leagueSeasons.length > 0 ? leagueSeasons : seasons}
            venues={leagueVenues.length > 0 ? leagueVenues : venues}
            onSelectPlayer={handleSelectPlayer}
          />
        )}

        {currentView === 'stats' && (
          <PlayerStatsView
            player={
              (selectedPlayer && players.find((p) => p.$id === selectedPlayer.$id)) ||
              selectedPlayer ||
              players[0]
            }
            allPlayers={players}
            recentEntries={gameEntries}
            games={games}
            onBack={handleGoBack}
            backLabel={backLabel}
          />
        )}

        {currentView === 'director' && activeGameToDisplay && (
          <DirectorDesk
            key={activeGameToDisplay.$id}
            activeGame={activeGameToDisplay}
            gameEntries={gameEntries}
            players={players}
            venues={venues}
            seasons={seasons}
            allGames={games}
            userRole={currentUser?.role || 'player'}
            onUpdateGame={handleUpdateGame}
            onEliminatePlayer={handleEliminatePlayer}
            onTournamentFinalized={handleTournamentFinalized}
            onSelectGame={handleSelectGame}
            onGamesChange={setGames}
            onEntriesChange={setGameEntries}
            onBack={handleGoBack}
            backLabel={previousView === 'admin' ? 'Back to Admin Console' : 'Back to Games'}
            onSelectPlayer={handleSelectPlayer}
          />
        )}

        {currentView === 'admin' && (
          <AdminView
            games={games}
            venues={venues}
            seasons={seasons}
            events={events}
            leagues={leagues}
            currentUser={currentUser}
            onGamesChange={setGames}
            onVenuesChange={setVenues}
            onSeasonsChange={setSeasons}
            onEventsChange={setEvents}
            onLeaguesChange={setLeagues}
            onRoleChange={(newRole: UserRole) => {
              AuthService.updateRole(newRole);
              setCurrentUser((prev) => (prev ? { ...prev, role: newRole } : null));
            }}
            onSelectGame={handleSelectGame}
            onBack={handleGoBack}
            backLabel={previousView === 'director' ? 'Back to Director Desk' : 'Back to Games'}
          />
        )}

        {currentView === 'info' && (
          <InfoView
            venues={leagueVenues.length > 0 ? leagueVenues : venues}
            seasonName={activeSeasonName}
          />
        )}

        {currentView === 'gallery' && (
          <GalleryView />
        )}
      </main>

      {/* Quick QR Check-in Modal */}
      <QRCheckinModal
        isOpen={isQROpen}
        onClose={() => setIsQROpen(false)}
      />

      {/* Appwrite Environment Setup Modal */}
      <AppwriteSetupModal
        isOpen={isAppwriteOpen}
        onClose={() => setIsAppwriteOpen(false)}
      />

      {/* Unified Authentication & Role Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={currentUser}
        onUserChange={(user) => {
          setCurrentUser(user);
          if (user) {
            setPlayers((prev) => {
              const exists = prev.some((p) => p.$id === user.$id);
              if (exists) {
                return prev.map((p) => (p.$id === user.$id ? { ...p, ...user } : p));
              }
              return [
                ...prev,
                {
                  $id: user.$id,
                  name: user.name,
                  nickname: user.nickname || user.name,
                  email: user.email,
                  role: user.role,
                  suitIcon: user.suitIcon || 'spades',
                  isMember: user.isMember ?? true,
                  totalPoints: user.totalPoints ?? 0,
                  careerWins: user.careerWins ?? 0,
                  careerKOs: user.careerKOs ?? 0,
                  gamesPlayed: user.gamesPlayed ?? 0,
                  highHandBadges: 0,
                  hasDgCarryover: false,
                },
              ];
            });
          } else if (currentView === 'admin' || currentView === 'director') {
            setCurrentView('games');
            window.history.replaceState({ view: 'games' }, '', '#games');
          }
        }}
      />

      {/* Venues Manager Modal */}
      <VenueManagerModal
        isOpen={isVenueModalOpen}
        onClose={() => setIsVenueModalOpen(false)}
        venues={venues}
        onVenuesChange={setVenues}
      />

      {/* Event Schedule Modal */}
      <EventScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => {
          setIsScheduleModalOpen(false);
          setGameToEdit(null);
        }}
        gameToEdit={gameToEdit}
        venues={venues}
        seasons={seasons}
        onGameSaved={(savedGame) => {
          if (gameToEdit) {
            setGames((prev) => prev.map((g) => (g.$id === savedGame.$id ? savedGame : g)));
            if (selectedGame?.$id === savedGame.$id) {
              setSelectedGame(savedGame);
            }
          } else {
            setGames((prev) => [savedGame, ...prev]);
            setSelectedGame(savedGame);
          }
        }}
        onGamesSaved={(newGames) => {
          setGames((prev) => [...newGames, ...prev]);
          if (newGames.length > 0) {
            setSelectedGame(newGames[0]);
          }
        }}
        onGameDeleted={(deletedId) => {
          setGames((prev) => prev.filter((g) => g.$id !== deletedId));
          if (selectedGame?.$id === deletedId && games.length > 1) {
            const fallback = games.find((g) => g.$id !== deletedId);
            if (fallback) setSelectedGame(fallback);
          }
        }}
      />
    </div>
  );
};

export default App;
