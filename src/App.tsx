import React, { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import type { ViewMode, PortalMode } from './components/Navigation';
import { PlayerScheduleView } from './components/schedule/PlayerScheduleView';
import { PlayerStandingsView } from './components/standings/PlayerStandingsView';
import { PlayerStatsView } from './components/PlayerStatsView';
import { DirectorDesk } from './components/DirectorDesk';
import { AdminView } from './components/AdminView';
import { VenueTVDisplay } from './components/VenueTVDisplay';
import { QRCheckinModal } from './components/QRCheckinModal';
import { AppwriteSetupModal } from './components/AppwriteSetupModal';
import { AuthModal } from './components/AuthModal';
import { VenueManagerModal } from './components/VenueManagerModal';
import { EventScheduleModal } from './components/EventScheduleModal';
import { LeagueGuideView } from './components/guide/LeagueGuideView';
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
  League
} from './types/holdem';

export const App: React.FC = () => {
  const [portalMode, setPortalMode] = useState<PortalMode>('public');
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

        const activeG = gList.find((g) => g.status === 'running') || gList[0];
        setSelectedGame(activeG);

        if (activeG) {
          const entries = await AppwriteService.getGameEntries(activeG.$id);
          setGameEntries(entries);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Normalize any view key or URL hash to canonical ViewMode
  const normalizeView = (raw: string): ViewMode => {
    const clean = raw.replace('#', '').toLowerCase();
    if (clean === 'schedule' || clean === 'games') return 'games';
    if (clean === 'standings' || clean === 'leaderboard') return 'leaderboard';
    if (clean === 'rules' || clean === 'info' || clean === 'gallery' || clean === 'guide') return 'guide';
    if (clean === 'desk' || clean === 'director') return 'director';
    if (clean === 'ops' || clean === 'admin') return 'admin';
    if (clean === 'tv') return 'tv';
    if (clean === 'stats') return 'stats';
    return 'games';
  };

  // Sync with browser history and popstate
  useEffect(() => {
    const rawHash = window.location.hash;
    const targetView = normalizeView(rawHash || 'games');
    setCurrentView(targetView);
    if (targetView === 'director' || targetView === 'admin' || targetView === 'tv') {
      setPortalMode('ops');
    } else {
      setPortalMode('public');
    }
    window.history.replaceState({ view: targetView }, '', `#${targetView}`);

    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      const hash = window.location.hash;
      const rawTarget = state?.view || hash || 'games';
      const normalizedView = normalizeView(rawTarget);

      if (normalizedView === 'stats' && state?.playerId) {
        const found = players.find((p) => p.$id === state.playerId);
        if (found) setSelectedPlayer(found);
      }
      if (normalizedView === 'director' && state?.gameId) {
        const found = games.find((g) => g.$id === state.gameId);
        if (found) setSelectedGame(found);
      }
      if (normalizedView === 'director' || normalizedView === 'admin' || normalizedView === 'tv') {
        setPortalMode('ops');
      } else {
        setPortalMode('public');
      }
      setCurrentView(normalizedView);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [players, games]);

  // Internal App Navigation Stack
  const handleNavigate = (view: ViewMode | string) => {
    const normalizedView = normalizeView(view);
    if (normalizedView === currentView) return;

    // RBAC route protection
    if (normalizedView === 'admin' && !AuthService.canAccessAdmin(currentUser?.role)) {
      setIsAuthOpen(true);
      return;
    }
    if (normalizedView === 'director' && !AuthService.canAccessDirector(currentUser?.role)) {
      setIsAuthOpen(true);
      return;
    }

    if (normalizedView === 'director' || normalizedView === 'admin' || normalizedView === 'tv') {
      setPortalMode('ops');
    } else {
      setPortalMode('public');
    }

    setViewHistory((prev) => [...prev, currentView]);
    setCurrentView(normalizedView);
    window.history.pushState({ view: normalizedView }, '', `#${normalizedView}`);
  };

  const handleTogglePortalMode = () => {
    if (portalMode === 'public') {
      const isStaff = AuthService.canAccessDirector(currentUser?.role) || AuthService.canAccessAdmin(currentUser?.role);
      if (!isStaff) {
        setIsAuthOpen(true);
        return;
      }
      setPortalMode('ops');
      const targetView: ViewMode = AuthService.canAccessDirector(currentUser?.role) ? 'director' : 'admin';
      handleNavigate(targetView);
    } else {
      setPortalMode('public');
      handleNavigate('games');
    }
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
    const entries = await AppwriteService.getGameEntries(game.$id);
    setGameEntries(entries);
    setViewHistory((prev) => [...prev, currentView]);
    setCurrentView('director');
    window.history.pushState({ view: 'director', gameId: game.$id }, '', '#director');
  };

  const handleUpdateGame = (updatedGame: Game) => {
    setSelectedGame(updatedGame);
    setGames((prev) => prev.map((g) => (g.$id === updatedGame.$id ? updatedGame : g)));
  };

  const handleSelectPlayer = (player: Player) => {
    setSelectedPlayer(player);
    setViewHistory((prev) => [...prev, currentView]);
    setCurrentView('stats');
    window.history.pushState({ view: 'stats', playerId: player.$id }, '', '#stats');
  };

  const handleEliminatePlayer = (entryId: string, koByPlayerId?: string) => {
    setGameEntries((prev) =>
      prev.map((entry) => {
        if (entry.$id === entryId) {
          const remainingCount = prev.filter((e) => !e.isEliminated).length;
          return {
            ...entry,
            isEliminated: true,
            finishPosition: remainingCount,
            eliminatedAt: new Date().toISOString(),
          };
        }
        if (koByPlayerId && entry.playerId === koByPlayerId) {
          return {
            ...entry,
            kosCount: entry.kosCount + 1,
          };
        }
        return entry;
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
        portalMode={portalMode}
        currentView={currentView}
        onSelectView={handleNavigate}
        onTogglePortalMode={handleTogglePortalMode}
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
          <PlayerScheduleView
            games={leagueGames}
            venues={leagueVenues.length > 0 ? leagueVenues : venues}
            seasonName={activeSeasonName}
            hotHand={hotHand || { $id: '1', leagueId: '1', date: 'Aug 22', handTitle: "Quad 6's", currentPool: 140, isClaimed: false }}
            announcements={announcements}
            currentUser={currentUser}
            onSelectGame={handleSelectGame}
            onToggleRSVP={handleToggleRSVP}
            onNavigateGuide={(_tab) => handleNavigate('guide')}
          />
        )}

        {currentView === 'leaderboard' && (
          <PlayerStandingsView
            players={players}
            seasons={leagueSeasons.length > 0 ? leagueSeasons : seasons}
            venues={leagueVenues.length > 0 ? leagueVenues : venues}
            onSelectPlayer={handleSelectPlayer}
          />
        )}

        {currentView === 'stats' && (
          <PlayerStatsView
            player={selectedPlayer || players[0]}
            allPlayers={players}
            onBack={handleGoBack}
            backLabel={backLabel}
          />
        )}

        {currentView === 'director' && activeGameToDisplay && (
          <DirectorDesk
            activeGame={activeGameToDisplay}
            gameEntries={gameEntries}
            players={players}
            venues={venues}
            seasons={seasons}
            allGames={games}
            userRole={currentUser?.role || 'player'}
            onUpdateGame={handleUpdateGame}
            onEliminatePlayer={handleEliminatePlayer}
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

        {(currentView === 'guide' || currentView === 'info' || currentView === 'gallery') && (
          <LeagueGuideView
            venues={leagueVenues.length > 0 ? leagueVenues : venues}
            seasonName={activeSeasonName}
            initialTab={currentView === 'gallery' ? 'gallery' : 'rules'}
          />
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
        onUserChange={setCurrentUser}
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
