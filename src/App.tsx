import React, { useState, useEffect, useCallback } from 'react';
import { Navigation } from './components/Navigation';
import type { ViewMode } from './components/Navigation';
import { RouteBreadcrumbBar } from './components/RouteBreadcrumbBar';
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
import { AnnouncementManagerModal } from './components/AnnouncementManagerModal';
import { InfoView } from './components/InfoView';
import { GalleryView } from './components/GalleryView';
import { Button } from './components/ui/button';
import { AppwriteService } from './services/appwriteService';
import { AuthService } from './services/authService';
import {
  buildAppPath,
  parseAppRoute,
  reconcileEntityRelationships,
  resolveGameRouteIds,
  resolveSeasonLeagueId,
  type AppRoute,
} from './lib/router';
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

const ACTIVE_LEAGUE_STORAGE_KEY = 'holdem_active_league_id';

function readStoredLeagueId(): string {
  try {
    return localStorage.getItem(ACTIVE_LEAGUE_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function writeStoredLeagueId(leagueId: string): void {
  try {
    if (leagueId) {
      localStorage.setItem(ACTIVE_LEAGUE_STORAGE_KEY, leagueId);
    } else {
      localStorage.removeItem(ACTIVE_LEAGUE_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export const App: React.FC = () => {
  const [route, setRoute] = useState<AppRoute>(() =>
    parseAppRoute(window.location.pathname, window.location.hash)
  );
  const [routeHistory, setRouteHistory] = useState<AppRoute[]>([]);
  const [activeLeagueId, setActiveLeagueId] = useState<string>(() => readStoredLeagueId());
  
  const [games, setGames] = useState<Game[]>([]);
  const [events, setEvents] = useState<TournamentEvent[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
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
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState<boolean>(false);
  const [announcementToEdit, setAnnouncementToEdit] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const currentView = route.view;

  // Load entries for a game and reconcile live player counts
  const loadEntriesForGame = useCallback(async (game: Game) => {
    const entries = await AppwriteService.getGameEntries(game.$id);
    setGameEntries(entries);
    const totalPlayersCount = entries.length;
    const remainingPlayersCount = entries.filter(
      (e) => !e.isEliminated && e.status !== 'ELIMINATED' && e.status !== 'MUCK'
    ).length;
    const totalEntriesCount = entries.reduce(
      (sum, e) => sum + (e.buyinsCount || 1) + (e.rebuysCount || 0),
      0
    );
    const syncedGame: Game = {
      ...game,
      totalPlayersCount,
      remainingPlayersCount,
      totalEntriesCount,
    };
    setSelectedGame(syncedGame);
    setGames((prev) => prev.map((g) => (g.$id === game.$id ? syncedGame : g)));
  }, []);

  // Central route navigation helper (always reflects full hierarchical path in browser URL)
  const navigateTo = useCallback(
    (nextRoute: AppRoute, options?: { replace?: boolean }) => {
      if (nextRoute.view === 'admin' && !AuthService.canAccessAdmin(currentUser?.role)) {
        setIsAuthOpen(true);
        return;
      }

      const nextPath = buildAppPath(nextRoute);
      setRoute((prev) => {
        if (!options?.replace) {
          setRouteHistory((hist) => [...hist, prev]);
        }
        return nextRoute;
      });

      if (options?.replace) {
        window.history.replaceState(nextRoute, '', nextPath);
      } else if (window.location.pathname !== nextPath || window.location.hash) {
        window.history.pushState(nextRoute, '', nextPath);
      }
    },
    [currentUser?.role]
  );

  // Load initial data & resolve initial URL route
  useEffect(() => {
    async function loadData() {
      try {
        const [rawGames, rawVenues, pList, rawSeasons, aList, hJackpot, user, rawEvents, rawLeagues] = await Promise.all([
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

        const {
          leagues: lList,
          seasons: sList,
          venues: vList,
          events: eList,
          games: gList,
        } = reconcileEntityRelationships({
          leagues: rawLeagues,
          seasons: rawSeasons,
          venues: rawVenues,
          events: rawEvents,
          games: rawGames,
        });

        setGames(gList);
        setEvents(eList);
        setVenues(vList);
        setPlayers(pList);
        setSeasons(sList);
        setLeagues(lList);
        setAnnouncements(aList);
        setHotHand(hJackpot);
        setCurrentUser(user);

        let initialRoute = parseAppRoute(window.location.pathname, window.location.hash);

        // Enforce admin RBAC on deep link
        if (initialRoute.view === 'admin' && !AuthService.canAccessAdmin(user?.role)) {
          initialRoute = {
            view: 'games',
            seasonId: initialRoute.seasonId,
          };
        }

        // Support legacy 2-segment /games/:gameId bookmarks when segment 1 is a game ID rather than a season ID
        if (
          initialRoute.view === 'games' &&
          initialRoute.seasonId &&
          !sList.some((s) => s.$id === initialRoute.seasonId)
        ) {
          const matchedLegacyGame = gList.find((g) => g.$id === initialRoute.seasonId);
          if (matchedLegacyGame) {
            const resolvedIds = resolveGameRouteIds(matchedLegacyGame, sList, vList, lList);
            initialRoute = {
              view: 'director',
              seasonId: resolvedIds.seasonId,
              gameId: matchedLegacyGame.$id,
            };
          } else if (lList.some((l) => l.$id === initialRoute.seasonId)) {
            // Legacy /games/:leagueId bookmark -> switch session league & land on Home /
            writeStoredLeagueId(initialRoute.seasonId);
            initialRoute = { view: 'games' };
          }
        }

        // Canonicalize game deep links: if game exists, ensure seasonId matches real reconciled season
        const routeGame = initialRoute.gameId
          ? gList.find((g) => g.$id === initialRoute.gameId)
          : undefined;

        let resolvedLeagueId = readStoredLeagueId();
        if (!resolvedLeagueId || !lList.some((l) => l.$id === resolvedLeagueId)) {
          resolvedLeagueId = lList[0]?.$id || '';
        }

        if (routeGame) {
          const resolvedIds = resolveGameRouteIds(routeGame, sList, vList, lList);
          const hasValidSeason =
            initialRoute.seasonId && sList.some((s) => s.$id === initialRoute.seasonId);
          initialRoute = {
            ...initialRoute,
            seasonId: hasValidSeason ? initialRoute.seasonId : resolvedIds.seasonId,
            gameId: routeGame.$id,
          };
          if (resolvedIds.leagueId && lList.some((l) => l.$id === resolvedIds.leagueId)) {
            resolvedLeagueId = resolvedIds.leagueId;
          }
        } else if (initialRoute.seasonId) {
          const matchedSeason = sList.find((s) => s.$id === initialRoute.seasonId);
          const seasonLeagueId = resolveSeasonLeagueId(matchedSeason, lList);
          if (seasonLeagueId && lList.some((l) => l.$id === seasonLeagueId)) {
            resolvedLeagueId = seasonLeagueId;
          }
        }

        if (resolvedLeagueId) {
          setActiveLeagueId(resolvedLeagueId);
          writeStoredLeagueId(resolvedLeagueId);
        }

        const activeG = routeGame || gList.find((g) => g.status === 'running') || gList[0] || null;
        setSelectedGame(activeG);

        if (initialRoute.playerId) {
          const routePlayer = pList.find((p) => p.$id === initialRoute.playerId);
          if (routePlayer) setSelectedPlayer(routePlayer);
        }

        if (activeG) {
          const entries = await AppwriteService.getGameEntries(activeG.$id);
          setGameEntries(entries);
        }

        setRoute(initialRoute);
        const canonicalPath = buildAppPath(initialRoute);
        if (window.location.pathname !== canonicalPath || window.location.hash) {
          window.history.replaceState(initialRoute, '', canonicalPath);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Sync with browser Back / Forward navigation
  useEffect(() => {
    const handlePopState = async () => {
      const parsed = parseAppRoute(window.location.pathname, window.location.hash);

      if (parsed.view === 'admin' && !AuthService.canAccessAdmin(currentUser?.role)) {
        setIsAuthOpen(true);
        const fallback: AppRoute = {
          view: 'games',
          seasonId: parsed.seasonId,
        };
        setRoute(fallback);
        window.history.replaceState(fallback, '', buildAppPath(fallback));
        return;
      }

      setRoute(parsed);

      if (parsed.gameId) {
        const foundGame = games.find((g) => g.$id === parsed.gameId);
        if (foundGame) {
          setSelectedGame(foundGame);
          await loadEntriesForGame(foundGame);
        }
      }

      if (parsed.playerId) {
        const foundPlayer = players.find((p) => p.$id === parsed.playerId);
        if (foundPlayer) setSelectedPlayer(foundPlayer);
      }
    };

    const onPop = () => {
      void handlePopState();
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
    };
  }, [games, players, currentUser?.role, loadEntriesForGame]);

  // Session league & URL route resolution
  const activeLeague =
    leagues.find((l) => l.$id === activeLeagueId) || leagues[0] || null;
  const resolvedActiveLeagueId = activeLeague?.$id || '';

  const leagueSeasons = activeLeague
    ? seasons.filter((s) => !s.leagueId || s.leagueId === activeLeague.$id)
    : seasons;

  const urlSeason = route.seasonId
    ? leagueSeasons.find((s) => s.$id === route.seasonId) ||
      seasons.find((s) => s.$id === route.seasonId) ||
      null
    : null;
  const isUnknownSeason = Boolean(
    !loading && route.seasonId && seasons.length > 0 && !urlSeason
  );

  const leagueVenues = activeLeague
    ? venues.filter((v) => !v.leagueId || v.leagueId === activeLeague.$id)
    : venues;

  const leagueSeasonIds = new Set(leagueSeasons.map((s) => s.$id));
  const leagueVenueIds = new Set(leagueVenues.map((v) => v.$id));

  const scopedGames = games.filter((g) => {
    if (activeLeague) {
      const matchesLeagueBySeason = g.seasonId && leagueSeasonIds.has(g.seasonId);
      const matchesLeagueByVenue = g.venueId && leagueVenueIds.has(g.venueId);
      if (!matchesLeagueBySeason && !matchesLeagueByVenue) return false;
    }
    if (urlSeason) {
      return g.seasonId === urlSeason.$id;
    }
    return true;
  });

  const urlGame = route.gameId ? games.find((g) => g.$id === route.gameId) || null : null;
  const isUnknownGame = Boolean(
    !loading &&
      route.gameId &&
      (route.view === 'director' || route.view === 'tv') &&
      !isUnknownSeason &&
      games.length > 0 &&
      !urlGame
  );

  const activeGameToDisplay = urlGame || selectedGame || scopedGames[0] || games[0] || null;

  // Dynamic browser tab title matching active league & route
  useEffect(() => {
    const leagueTitle = activeLeague?.name || 'Jack Ten Poker';
    if (route.view === 'director' && activeGameToDisplay) {
      document.title = `${activeGameToDisplay.title} • ${leagueTitle}`;
    } else if (route.view === 'tv' && activeGameToDisplay) {
      document.title = `TV: ${activeGameToDisplay.title} • ${leagueTitle}`;
    } else if (urlSeason) {
      document.title = `${urlSeason.name} • ${leagueTitle}`;
    } else if (route.view === 'leaderboard') {
      document.title = `Standings — ${leagueTitle}`;
    } else if (route.view === 'admin') {
      document.title = `Admin — ${leagueTitle}`;
    } else {
      document.title = `${leagueTitle} — Tournament League`;
    }
  }, [route.view, activeLeague, urlSeason, activeGameToDisplay]);

  // Navigation Handlers
  const handleGoHome = () => {
    navigateTo({ view: 'games' });
  };

  const handleSelectLeague = (leagueId: string | null) => {
    const nextLeagueId = leagueId || leagues[0]?.$id || '';
    if (!nextLeagueId) return;
    setActiveLeagueId(nextLeagueId);
    writeStoredLeagueId(nextLeagueId);

    const preserveView =
      route.view === 'leaderboard' ||
      route.view === 'info' ||
      route.view === 'gallery' ||
      route.view === 'admin';
    navigateTo({
      view: preserveView ? route.view : 'games',
    });
  };

  const handleSelectSeason = (seasonId: string | null) => {
    if (seasonId) {
      const targetSeason = seasons.find((s) => s.$id === seasonId);
      const seasonLeagueId = resolveSeasonLeagueId(targetSeason, leagues);
      if (seasonLeagueId && seasonLeagueId !== activeLeagueId) {
        setActiveLeagueId(seasonLeagueId);
        writeStoredLeagueId(seasonLeagueId);
      }
    }
    const preserveView =
      route.view === 'leaderboard' ||
      route.view === 'info' ||
      route.view === 'gallery' ||
      route.view === 'admin';

    navigateTo({
      view: preserveView ? route.view : 'games',
      seasonId: seasonId || undefined,
    });
  };

  const handleNavigate = (view: ViewMode) => {
    if (view === 'admin' && !AuthService.canAccessAdmin(currentUser?.role)) {
      setIsAuthOpen(true);
      return;
    }

    if (view === 'tv') {
      const targetGame = activeGameToDisplay;
      if (targetGame) {
        const ids = resolveGameRouteIds(targetGame, seasons, venues, leagues);
        navigateTo({
          view: 'tv',
          seasonId: route.seasonId || ids.seasonId,
          gameId: targetGame.$id,
        });
        return;
      }
    }

    if (view === 'director') {
      if (!AuthService.canAccessDirector(currentUser?.role)) {
        setIsAuthOpen(true);
        return;
      }
      if (activeGameToDisplay) {
        void handleSelectGame(activeGameToDisplay);
        return;
      }
    }

    navigateTo({
      view,
      seasonId: route.seasonId,
    });
  };

  const handleGoBack = () => {
    if (route.view === 'tv' && route.gameId) {
      navigateTo({
        view: 'director',
        seasonId: route.seasonId,
        gameId: route.gameId,
      });
      return;
    }
    if (routeHistory.length > 0) {
      const prev = routeHistory[routeHistory.length - 1];
      setRouteHistory((h) => h.slice(0, -1));
      navigateTo(prev, { replace: true });
      return;
    }
    if (route.view === 'director' && route.seasonId) {
      navigateTo({ view: 'games', seasonId: route.seasonId });
      return;
    }
    navigateTo({ view: 'games' });
  };

  const handleSelectGame = async (game: Game) => {
    setSelectedGame(game);
    setGameEntries([]);
    const ids = resolveGameRouteIds(game, seasons, venues, leagues);
    if (ids.leagueId && ids.leagueId !== activeLeagueId) {
      setActiveLeagueId(ids.leagueId);
      writeStoredLeagueId(ids.leagueId);
    }
    navigateTo({
      view: 'director',
      seasonId: ids.seasonId || route.seasonId,
      gameId: game.$id,
    });
    await loadEntriesForGame(game);
  };

  const handleUpdateGame = (updatedGame: Game) => {
    setSelectedGame(updatedGame);
    setGames((prev) => prev.map((g) => (g.$id === updatedGame.$id ? updatedGame : g)));
  };

  const handleSelectPlayer = (player: Player) => {
    setSelectedPlayer(player);
    navigateTo({
      view: 'stats',
      playerId: player.$id,
    });
  };

  const handleEliminatePlayer = (
    entryId: string,
    koByPlayerId?: string,
    koType: KnockoutCode | null = 'K',
    isMuck: boolean = false
  ) => {
    const remainingBefore = gameEntries.filter((e) => !e.isEliminated).length;
    const killerEntry = koByPlayerId ? gameEntries.find((e) => e.playerId === koByPlayerId) : undefined;
    const gameContext = selectedGame || { pointMultiplier: 1 as const, isDayGame: false, noGamePlayed: false };

    const nextEntries = gameEntries.map((entry) => {
      if (entry.$id === entryId) {
        return syncEntryCalculatedFields(
          {
            ...entry,
            status: isMuck ? 'MUCK' : 'ELIMINATED',
            isEliminated: true,
            finishPosition: remainingBefore,
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

    setGameEntries(nextEntries);
    if (selectedGame) {
      const nextRemaining = nextEntries.filter(
        (e) => !e.isEliminated && e.status !== 'ELIMINATED' && e.status !== 'MUCK'
      ).length;
      const updatedGame: Game = {
        ...selectedGame,
        totalPlayersCount: nextEntries.length,
        remainingPlayersCount: nextRemaining,
      };
      setSelectedGame(updatedGame);
      setGames((prev) => prev.map((g) => (g.$id === updatedGame.$id ? updatedGame : g)));
    }
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
        <div className="text-xl font-bold tracking-tight">Loading Jack Ten Poker...</div>
        <div className="text-xs text-slate-400">Fetching live games, venues, and leaderboard standings</div>
      </div>
    );
  }

  const activeSeasonName =
    urlSeason?.name ||
    (leagueSeasons.find((s) => s.isActive) || leagueSeasons[0] || seasons[0])?.name ||
    '2026 Crawl 3';
  const previousView = routeHistory[routeHistory.length - 1]?.view;
  const backLabel =
    previousView === 'admin'
      ? 'Back to Admin Console'
      : urlSeason
      ? `Back to ${urlSeason.name}`
      : previousView === 'director'
      ? 'Back to Director Desk'
      : 'Back to Games';

  const resolvedPlayer =
    (route.playerId && players.find((p) => p.$id === route.playerId)) ||
    (selectedPlayer && players.find((p) => p.$id === selectedPlayer.$id)) ||
    selectedPlayer ||
    players[0];

  // TV View Mode Renders Fullscreen Broadcast Component
  if (currentView === 'tv' && activeGameToDisplay && hotHand && !isUnknownGame) {
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
        onGoHome={handleGoHome}
        onOpenQR={() => setIsQROpen(true)}
        onOpenAppwriteSetup={() => setIsAppwriteOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        currentUser={currentUser}
        seasonName={activeSeasonName}
        leagues={leagues}
        activeLeagueId={resolvedActiveLeagueId}
        onSelectLeague={handleSelectLeague}
      />

      {/* Hierarchical URL Breadcrumb & Share Link Bar */}
      <RouteBreadcrumbBar
        view={currentView}
        season={urlSeason}
        game={currentView === 'director' ? activeGameToDisplay : null}
        playerName={resolvedPlayer?.name}
        onGoHome={handleGoHome}
        onGoView={(v) => navigateTo({ view: v })}
        onGoSeason={(sId) => {
          const keepSection =
            currentView === 'admin' ||
            currentView === 'leaderboard' ||
            currentView === 'info' ||
            currentView === 'gallery';
          navigateTo({
            view: keepSection ? currentView : 'games',
            seasonId: sId,
          });
        }}
        onGoGame={(g) => void handleSelectGame(g)}
      />

      {/* Main View Container */}
      <main className="flex-1">
        {(isUnknownSeason || isUnknownGame) ? (
          <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl font-black text-amber-400">
              ♠
            </div>
            <h1 className="text-2xl font-black text-white">
              {isUnknownSeason ? 'Season Not Found' : 'Game Not Found'}
            </h1>
            <p className="text-sm text-slate-400">
              The bookmarked link{' '}
              <code className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-300">
                {window.location.pathname}
              </code>{' '}
              doesn&apos;t match an active record. It may have been removed or re-seeded.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {urlSeason && isUnknownGame && (
                <Button
                  variant="outline"
                  onClick={() =>
                    navigateTo({
                      view: 'games',
                      seasonId: urlSeason.$id,
                    })
                  }
                >
                  Back to {urlSeason.name}
                </Button>
              )}
              <Button variant="default" onClick={handleGoHome}>
                Go to Home
              </Button>
            </div>
          </div>
        ) : (
          <>
            {currentView === 'games' && (
              <GamesView
                games={scopedGames}
                venues={leagueVenues.length > 0 ? leagueVenues : venues}
                leagues={leagues}
                seasons={leagueSeasons}
                activeLeague={activeLeague}
                activeSeason={urlSeason}
                onSelectLeague={handleSelectLeague}
                onSelectSeason={handleSelectSeason}
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
                onEditAnnouncement={(ann) => {
                  setAnnouncementToEdit(ann);
                  setIsAnnouncementModalOpen(true);
                }}
                onCreateAnnouncement={() => {
                  setAnnouncementToEdit(null);
                  setIsAnnouncementModalOpen(true);
                }}
              />
            )}

            {currentView === 'leaderboard' && (
              <LeaderboardView
                players={players}
                seasons={leagueSeasons.length > 0 ? leagueSeasons : seasons}
                venues={leagueVenues.length > 0 ? leagueVenues : venues}
                selectedSeasonId={urlSeason?.$id}
                onSelectSeason={(nextSeasonId) => handleSelectSeason(nextSeasonId)}
                onSelectPlayer={handleSelectPlayer}
              />
            )}

            {currentView === 'stats' && resolvedPlayer && (
              <PlayerStatsView
                player={resolvedPlayer}
                allPlayers={players}
                recentEntries={gameEntries}
                games={scopedGames}
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
                allGames={scopedGames}
                userRole={currentUser?.role || 'player'}
                onUpdateGame={handleUpdateGame}
                onEliminatePlayer={handleEliminatePlayer}
                onTournamentFinalized={handleTournamentFinalized}
                onSelectGame={handleSelectGame}
                onGamesChange={setGames}
                onEntriesChange={setGameEntries}
                onBack={handleGoBack}
                backLabel={backLabel}
                onSelectPlayer={handleSelectPlayer}
              />
            )}

            {currentView === 'admin' && (
              <AdminView
                games={games}
                venues={venues}
                seasons={seasons}
                players={players}
                events={events}
                leagues={leagues}
                announcements={announcements}
                currentUser={currentUser}
                onGamesChange={setGames}
                onVenuesChange={setVenues}
                onSeasonsChange={setSeasons}
                onPlayersChange={setPlayers}
                onEventsChange={setEvents}
                onLeaguesChange={setLeagues}
                onEditAnnouncement={(ann) => {
                  setAnnouncementToEdit(ann);
                  setIsAnnouncementModalOpen(true);
                }}
                onCreateAnnouncement={() => {
                  setAnnouncementToEdit(null);
                  setIsAnnouncementModalOpen(true);
                }}
                onRoleChange={(newRole: UserRole) => {
                  AuthService.updateRole(newRole);
                  setCurrentUser((prev) => (prev ? { ...prev, role: newRole } : null));
                }}
                onSelectGame={handleSelectGame}
                onBack={handleGoBack}
                backLabel={backLabel}
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
          </>
        )}
      </main>

      {/* Quick QR Check-in Modal */}
      <QRCheckinModal
        isOpen={isQROpen}
        onClose={() => setIsQROpen(false)}
      />

      {/* Appwrite Environment Setup & Reseed Modal */}
      <AppwriteSetupModal
        isOpen={isAppwriteOpen}
        onClose={() => setIsAppwriteOpen(false)}
        canManageData={AuthService.canAccessPlatformAdmin(currentUser?.role)}
        currentUserRole={currentUser?.role}
        onDataReseeded={async () => {
          const [rawGames, rawVenues, pList, rawSeasons, aList, hJackpot, rawEvents, rawLeagues] = await Promise.all([
            AppwriteService.getGames(),
            AppwriteService.getVenues(),
            AppwriteService.getPlayers(),
            AppwriteService.getSeasons(),
            AppwriteService.getAnnouncements(),
            AppwriteService.getHotHandJackpot(),
            AppwriteService.getEvents(),
            AppwriteService.getLeagues(),
          ]);
          const {
            leagues: lList,
            seasons: sList,
            venues: vList,
            events: eList,
            games: gList,
          } = reconcileEntityRelationships({
            leagues: rawLeagues,
            seasons: rawSeasons,
            venues: rawVenues,
            events: rawEvents,
            games: rawGames,
          });
          setGames(gList);
          setEvents(eList);
          setVenues(vList);
          setPlayers(pList);
          setSeasons(sList);
          setLeagues(lList);
          if (lList.length > 0) {
            setActiveLeagueId(lList[0].$id);
            writeStoredLeagueId(lList[0].$id);
          }
          setAnnouncements(aList);
          setHotHand(hJackpot);
          const nextActive = gList.find((g) => g.status === 'running') || gList[0] || null;
          setSelectedGame(nextActive);
          if (nextActive) {
            const entries = await AppwriteService.getGameEntries(nextActive.$id);
            setGameEntries(entries);
          } else {
            setGameEntries([]);
          }
          navigateTo({ view: 'games' }, { replace: true });
        }}
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
          } else if (currentView === 'admin') {
            navigateTo(
              {
                view: 'games',
                seasonId: route.seasonId,
              },
              { replace: true }
            );
          }
        }}
      />

      {/* Dynamic Top Banner Announcement Modal */}
      {isAnnouncementModalOpen && (
        <AnnouncementManagerModal
          key={announcementToEdit?.$id ?? 'new-announcement'}
          isOpen={isAnnouncementModalOpen}
          onClose={() => {
            setIsAnnouncementModalOpen(false);
            setAnnouncementToEdit(null);
          }}
          announcementToEdit={announcementToEdit}
          onSaved={(saved, isNew) => {
            setAnnouncements((prev) =>
              isNew ? [saved, ...prev] : prev.map((a) => (a.$id === saved.$id ? saved : a))
            );
          }}
          onDeleted={(deletedId) => {
            setAnnouncements((prev) => prev.filter((a) => a.$id !== deletedId));
          }}
        />
      )}

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
        venues={leagueVenues.length > 0 ? leagueVenues : venues}
        seasons={leagueSeasons.length > 0 ? leagueSeasons : seasons}
        players={players}
        defaultSeasonId={urlSeason?.$id}
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
