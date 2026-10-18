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
  UserRole
} from './types/holdem';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>('games');
  const [viewHistory, setViewHistory] = useState<ViewMode[]>([]);
  
  const [games, setGames] = useState<Game[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
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
        const [gList, vList, pList, sList, aList, hJackpot, user] = await Promise.all([
          AppwriteService.getGames(),
          AppwriteService.getVenues(),
          AppwriteService.getPlayers(),
          AppwriteService.getSeasons(),
          AppwriteService.getAnnouncements(),
          AppwriteService.getHotHandJackpot(),
          AuthService.getCurrentUser(),
        ]);

        setGames(gList);
        setVenues(vList);
        setPlayers(pList);
        setSeasons(sList);
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
  };

  const handleGoBack = () => {
    if (viewHistory.length > 0) {
      const prev = viewHistory[viewHistory.length - 1];
      setViewHistory((h) => h.slice(0, -1));
      setCurrentView(prev);
    } else {
      setCurrentView('games');
    }
  };

  const handleSelectGame = async (game: Game) => {
    setSelectedGame(game);
    const entries = await AppwriteService.getGameEntries(game.$id);
    setGameEntries(entries);
    handleNavigate('director');
  };

  const handleUpdateGame = (updatedGame: Game) => {
    setSelectedGame(updatedGame);
    setGames((prev) => prev.map((g) => (g.$id === updatedGame.$id ? updatedGame : g)));
  };

  const handleSelectPlayer = (player: Player) => {
    setSelectedPlayer(player);
    handleNavigate('stats');
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

  const activeSeasonName = seasons.find((s) => s.isActive)?.name || '2026 Crawl 3';
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
        currentView={currentView}
        onSelectView={handleNavigate}
        onOpenQR={() => setIsQROpen(true)}
        onOpenAppwriteSetup={() => setIsAppwriteOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        currentUser={currentUser}
        seasonName={activeSeasonName}
      />

      {/* Main View Container */}
      <main className="flex-1">
        {currentView === 'games' && (
          <GamesView
            games={games}
            venues={venues}
            announcements={announcements}
            hotHand={hotHand || { $id: '1', leagueId: '1', date: 'Aug 22', handTitle: "Quad 6's", currentPool: 140, isClaimed: false }}
            onSelectGame={handleSelectGame}
            isDirector={AuthService.canAccessDirector(currentUser?.role)}
            onOpenScheduleModal={() => {
              setGameToEdit(null);
              setIsScheduleModalOpen(true);
            }}
            onOpenVenueModal={() => setIsVenueModalOpen(true)}
          />
        )}

        {currentView === 'leaderboard' && (
          <LeaderboardView
            players={players}
            seasons={seasons}
            venues={venues}
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
          />
        )}

        {currentView === 'admin' && (
          <AdminView
            venues={venues}
            seasons={seasons}
            currentUser={currentUser}
            onVenuesChange={setVenues}
            onRoleChange={(newRole: UserRole) => {
              AuthService.updateRole(newRole);
              setCurrentUser((prev) => (prev ? { ...prev, role: newRole } : null));
            }}
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
