import React, { useState, useEffect } from 'react';
import type { Game, GameEntry, Player, Venue, Season, UserRole } from '@/types/holdem';
import { AppwriteService } from '@/services/appwriteService';
import { AuthService } from '@/services/authService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlayerSeatingModal } from '@/components/PlayerSeatingModal';
import { GameClockConsole } from './GameClockConsole';
import { GameRosterSection } from './GameRosterSection';
import { GamePayoutCard } from './GamePayoutCard';
import { GameEliminationDialog } from './GameEliminationDialog';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Gamepad2,
  PlayCircle
} from 'lucide-react';

export interface GameManagerViewProps {
  activeGame: Game;
  gameEntries: GameEntry[];
  players: Player[];
  venues?: Venue[];
  seasons?: Season[];
  allGames?: Game[];
  userRole?: UserRole;
  onUpdateGame: (updatedGame: Game) => void;
  onEliminatePlayer: (entryId: string, koByPlayerId?: string) => void;
  onSelectGame?: (game: Game) => void;
  onGamesChange?: (games: Game[]) => void;
  onEntriesChange: (entries: GameEntry[]) => void;
  onBack?: () => void;
  backLabel?: string;
  onSelectPlayer?: (player: Player) => void;
}

export const GameManagerView: React.FC<GameManagerViewProps> = ({
  activeGame,
  gameEntries,
  players,
  userRole = 'manager',
  onUpdateGame,
  onEliminatePlayer,
  onEntriesChange,
  onBack,
  backLabel,
  onSelectPlayer,
}) => {
  // Clock state
  const [isRunning, setIsRunning] = useState<boolean>(activeGame.status === 'running');
  const [currentLevelIndex, setCurrentLevelIndex] = useState<number>(activeGame.currentLevelIndex || 0);
  const [secondsLeft, setSecondsLeft] = useState<number>(activeGame.secondsRemainingInLevel || 900);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Modals state
  const [selectedEntryToEliminate, setSelectedEntryToEliminate] = useState<GameEntry | null>(null);
  const [koWinnerPlayerId, setKoWinnerPlayerId] = useState<string>('');
  const [isSeatingModalOpen, setIsSeatingModalOpen] = useState<boolean>(false);
  const [isFinalizing, setIsFinalizing] = useState<boolean>(false);
  const [finalSuccessMsg, setFinalSuccessMsg] = useState<string>('');

  const currentLevel = activeGame.blindSchedule[currentLevelIndex] || activeGame.blindSchedule[0];
  const nextLevel = activeGame.blindSchedule[currentLevelIndex + 1];

  const canManage = AuthService.canManageGame(userRole);
  const canManageClock = AuthService.canManageClock(userRole);
  const canFinalizeTournament = AuthService.canAccessAdmin(userRole);

  // Sync clock state if activeGame changes
  useEffect(() => {
    if (activeGame) {
      setCurrentLevelIndex(activeGame.currentLevelIndex || 0);
      setSecondsLeft(activeGame.secondsRemainingInLevel || 900);
      setIsRunning(activeGame.status === 'running');
    }
  }, [activeGame.$id]);

  // Timer Tick Engine
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => {
          const nextSec = prev > 0 ? prev - 1 : 0;
          onUpdateGame({
            ...activeGame,
            currentLevelIndex,
            secondsRemainingInLevel: nextSec,
            status: 'running',
          });
          return nextSec;
        });
      }, 1000);
    } else if (secondsLeft === 0 && isRunning) {
      if (currentLevelIndex < activeGame.blindSchedule.length - 1) {
        const nextIdx = currentLevelIndex + 1;
        const nextSecs = activeGame.blindSchedule[nextIdx].durationMinutes * 60;
        setCurrentLevelIndex(nextIdx);
        setSecondsLeft(nextSecs);
        onUpdateGame({
          ...activeGame,
          currentLevelIndex: nextIdx,
          secondsRemainingInLevel: nextSecs,
          status: 'running',
        });
        AppwriteService.updateGameClock(activeGame.$id, nextIdx, nextSecs);
      } else {
        setIsRunning(false);
      }
    }
    return () => clearInterval(interval);
  }, [isRunning, secondsLeft, currentLevelIndex, activeGame]);

  // Periodic writeback every 5s while running
  useEffect(() => {
    if (!isRunning) return;
    const syncInterval = setInterval(() => {
      AppwriteService.updateGameClock(activeGame.$id, currentLevelIndex, secondsLeft);
    }, 5000);
    return () => clearInterval(syncInterval);
  }, [isRunning, activeGame.$id, currentLevelIndex, secondsLeft]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleTimer = () => {
    if (!canManageClock) return;
    const nextRunning = !isRunning;
    setIsRunning(nextRunning);
    onUpdateGame({
      ...activeGame,
      currentLevelIndex,
      secondsRemainingInLevel: secondsLeft,
      status: nextRunning ? 'running' : 'paused',
    });
    AppwriteService.updateGameClock(activeGame.$id, currentLevelIndex, secondsLeft);
    AppwriteService.updateGameStatus(activeGame.$id, nextRunning ? 'running' : 'paused');
  };

  const handleSkipLevel = () => {
    if (!canManageClock) return;
    if (currentLevelIndex < activeGame.blindSchedule.length - 1) {
      const nextIdx = currentLevelIndex + 1;
      const nextSecs = activeGame.blindSchedule[nextIdx].durationMinutes * 60;
      setCurrentLevelIndex(nextIdx);
      setSecondsLeft(nextSecs);
      onUpdateGame({
        ...activeGame,
        currentLevelIndex: nextIdx,
        secondsRemainingInLevel: nextSecs,
      });
      AppwriteService.updateGameClock(activeGame.$id, nextIdx, nextSecs);
    }
  };

  const handleAddMinute = () => {
    if (!canManageClock) return;
    const nextSecs = secondsLeft + 60;
    setSecondsLeft(nextSecs);
    onUpdateGame({
      ...activeGame,
      currentLevelIndex,
      secondsRemainingInLevel: nextSecs,
    });
    AppwriteService.updateGameClock(activeGame.$id, currentLevelIndex, nextSecs);
  };

  const handleResetLevel = () => {
    if (!canManageClock) return;
    const defaultSecs = currentLevel.durationMinutes * 60;
    setSecondsLeft(defaultSecs);
    onUpdateGame({
      ...activeGame,
      currentLevelIndex,
      secondsRemainingInLevel: defaultSecs,
    });
    AppwriteService.updateGameClock(activeGame.$id, currentLevelIndex, defaultSecs);
  };

  // Seating & Rebuys Handlers
  const handleSeatPlayer = async (player: Player, tableNumber: number, seatNumber: number) => {
    const createdEntry = await AppwriteService.addGameEntry(
      activeGame.$id,
      player,
      tableNumber,
      seatNumber,
      activeGame
    );

    const updatedEntries = [...gameEntries, createdEntry];
    onEntriesChange(updatedEntries);

    onUpdateGame({
      ...activeGame,
      totalPlayersCount: activeGame.totalPlayersCount + 1,
      remainingPlayersCount: activeGame.remainingPlayersCount + 1,
      totalEntriesCount: activeGame.totalEntriesCount + 1,
    });
  };

  const handleAdjustRebuys = async (entryId: string, delta: number) => {
    const entry = gameEntries.find((e) => e.$id === entryId);
    if (!entry) return;
    const nextRebuys = Math.max(0, entry.rebuysCount + delta);
    if (nextRebuys === entry.rebuysCount) return;

    onEntriesChange(
      gameEntries.map((e) => (e.$id === entryId ? { ...e, rebuysCount: nextRebuys } : e))
    );

    if (delta > 0) {
      onUpdateGame({
        ...activeGame,
        totalEntriesCount: activeGame.totalEntriesCount + 1,
      });
    }

    await AppwriteService.updatePlayerRebuys(activeGame.$id, entryId, nextRebuys, activeGame);
  };

  const handleAdjustAddons = async (entryId: string, delta: number) => {
    const entry = gameEntries.find((e) => e.$id === entryId);
    if (!entry) return;
    const nextAddons = Math.max(0, entry.addonsCount + delta);
    if (nextAddons === entry.addonsCount) return;

    onEntriesChange(
      gameEntries.map((e) => (e.$id === entryId ? { ...e, addonsCount: nextAddons } : e))
    );

    await AppwriteService.updatePlayerAddons(entryId, nextAddons);
  };

  const handleConfirmElimination = async () => {
    if (!selectedEntryToEliminate) return;
    const activeCount = gameEntries.filter((e) => !e.isEliminated).length;
    const finishPos = activeCount;

    onEliminatePlayer(selectedEntryToEliminate.$id, koWinnerPlayerId);

    const koWinnerEntry = gameEntries.find((e) => e.playerId === koWinnerPlayerId);

    await AppwriteService.recordEliminationWithKO(
      activeGame.$id,
      selectedEntryToEliminate.$id,
      finishPos,
      activeCount - 1,
      koWinnerEntry?.$id,
      koWinnerPlayerId
    );

    onUpdateGame({
      ...activeGame,
      remainingPlayersCount: activeCount - 1,
    });

    setSelectedEntryToEliminate(null);
    setKoWinnerPlayerId('');
  };

  // Tournament Finalization
  const handleFinalizeTournament = async () => {
    if (!window.confirm('Are you sure you want to end and finalize this tournament? This will record final points and update player season standings.')) {
      return;
    }

    setIsFinalizing(true);
    const activeRemain = gameEntries.filter((e) => !e.isEliminated);
    const eliminatedEntries = gameEntries
      .filter((e) => e.isEliminated)
      .sort((a, b) => (a.finishPosition || 99) - (b.finishPosition || 99));

    const results: { entryId: string; playerId: string; finishPosition: number; points: number }[] = [];

    activeRemain.forEach((entry, idx) => {
      const pos = idx + 1;
      const pts = pos === 1 ? 50 : pos === 2 ? 35 : 25;
      results.push({
        entryId: entry.$id,
        playerId: entry.playerId,
        finishPosition: pos,
        points: pts,
      });
    });

    eliminatedEntries.forEach((entry) => {
      const pos = entry.finishPosition || 10;
      const pts = pos <= 3 ? 20 : pos <= 6 ? 10 : 5;
      results.push({
        entryId: entry.$id,
        playerId: entry.playerId,
        finishPosition: pos,
        points: pts,
      });
    });

    await AppwriteService.finalizeTournament(activeGame.$id, results);

    onUpdateGame({
      ...activeGame,
      status: 'completed',
      remainingPlayersCount: 0,
    });

    setIsFinalizing(false);
    setFinalSuccessMsg('Tournament finalized! Season points & career wins have been saved.');
    setTimeout(() => setFinalSuccessMsg(''), 8000);
  };

  // Financial Calculations
  const totalBuyins = gameEntries.reduce((sum, ge) => sum + ge.buyinsCount, 0);
  const totalRebuys = gameEntries.reduce((sum, ge) => sum + ge.rebuysCount, 0);
  const totalAddons = gameEntries.reduce((sum, ge) => sum + ge.addonsCount, 0);

  const totalPrizePool =
    totalBuyins * activeGame.buyinAmount +
    totalRebuys * activeGame.rebuyAmount +
    totalAddons * activeGame.addonAmount;

  const firstPlacePayout = (totalPrizePool * 0.5).toFixed(0);
  const secondPlacePayout = (totalPrizePool * 0.3).toFixed(0);
  const thirdPlacePayout = (totalPrizePool * 0.2).toFixed(0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 pb-24 md:pb-12">
      {/* Back Button Navigation */}
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> {backLabel || 'Back to Games'}
        </button>
      )}

      {/* Game Manager Header */}
      <div className="bg-slate-900/60 rounded-2xl p-5 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="indigo" className="gap-1 font-bold">
              <Gamepad2 className="w-3.5 h-3.5" /> GAME MANAGER
            </Badge>
            <span className="text-xs text-slate-400">{activeGame.venueName}</span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1.5">{activeGame.title}</h1>
        </div>

        {/* Live Status Badge */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">Status:</span>
          {activeGame.status === 'running' ? (
            <Badge variant="success" className="animate-pulse">
              <PlayCircle className="w-3.5 h-3.5" /> In Progress
            </Badge>
          ) : activeGame.status === 'completed' ? (
            <Badge variant="secondary">Completed</Badge>
          ) : (
            <Badge variant="default">Scheduled</Badge>
          )}
        </div>
      </div>

      {finalSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>{finalSuccessMsg}</span>
        </div>
      )}

      {/* Main Tournament Cockpit */}
      <div className="space-y-6">
        <GameClockConsole
          currentLevel={currentLevel}
          nextLevel={nextLevel}
          secondsLeft={secondsLeft}
          isRunning={isRunning}
          soundEnabled={soundEnabled}
          canManageClock={canManageClock}
          onToggleTimer={handleToggleTimer}
          onSkipLevel={handleSkipLevel}
          onAddMinute={handleAddMinute}
          onResetLevel={handleResetLevel}
          onToggleSound={() => setSoundEnabled(!soundEnabled)}
          formatTime={formatTime}
        />

        <GameRosterSection
          gameEntries={gameEntries}
          players={players}
          canManage={canManage}
          canFinalize={canFinalizeTournament}
          isFinalizing={isFinalizing}
          isCompleted={activeGame.status === 'completed'}
          onOpenSeatingModal={() => setIsSeatingModalOpen(true)}
          onFinalizeTournament={handleFinalizeTournament}
          onAdjustRebuys={handleAdjustRebuys}
          onAdjustAddons={handleAdjustAddons}
          onInitiateElimination={(entry) => setSelectedEntryToEliminate(entry)}
          onSelectPlayer={onSelectPlayer}
        />

        <GamePayoutCard
          totalPrizePool={totalPrizePool}
          firstPlacePayout={firstPlacePayout}
          secondPlacePayout={secondPlacePayout}
          thirdPlacePayout={thirdPlacePayout}
        />
      </div>

      {/* Modals */}
      <PlayerSeatingModal
        isOpen={isSeatingModalOpen}
        onClose={() => setIsSeatingModalOpen(false)}
        availablePlayers={players}
        currentEntries={gameEntries}
        onConfirmSeat={handleSeatPlayer}
      />

      <GameEliminationDialog
        entryToEliminate={selectedEntryToEliminate}
        activeEntries={gameEntries.filter((ge) => !ge.isEliminated)}
        koWinnerPlayerId={koWinnerPlayerId}
        onKoWinnerChange={setKoWinnerPlayerId}
        onConfirm={handleConfirmElimination}
        onClose={() => {
          setSelectedEntryToEliminate(null);
          setKoWinnerPlayerId('');
        }}
      />
    </div>
  );
};
