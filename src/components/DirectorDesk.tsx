import React, { useState, useEffect, useRef } from 'react';
import type { Game, GameEntry, Player, Venue, Season, UserRole, KnockoutCode } from '../types/holdem';
import { AppwriteService } from '../services/appwriteService';
import { AuthService } from '../services/authService';
import { PlayerSeatingModal } from './PlayerSeatingModal';
import { SessionRulesBar } from './director/SessionRulesBar';
import { ScorecardTable } from './director/ScorecardTable';
import { PaperScorecardView } from './director/PaperScorecardView';
import { RsvpCheckinPanel } from './director/RsvpCheckinPanel';
import { PlayerScoreDialog } from './director/PlayerScoreDialog';
import { EliminationDialog, type EliminationConfirmPayload } from './director/EliminationDialog';
import { FinalizeTournamentDialog } from './director/FinalizeTournamentDialog';
import {
  calculateEntryScore,
  formatBlindInThousands,
  getEntryStatus,
  PLACEMENT_POINTS,
  syncEntryCalculatedFields,
  type FinalizedEntryResult,
} from '@/lib/scoring';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Play, 
  Pause, 
  SkipForward, 
  Plus, 
  Minus,
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Users, 
  SlidersHorizontal, 
  CheckCircle2,
  UserPlus,
  Sparkles,
  Award,
  Trophy,
  ArrowLeft,
  ClipboardList,
  Clock,
  Sun,
  Flame,
  Ban,
  FileText,
} from 'lucide-react';

interface DirectorDeskProps {
  activeGame: Game;
  gameEntries: GameEntry[];
  players: Player[];
  venues?: Venue[];
  seasons?: Season[];
  allGames?: Game[];
  userRole?: UserRole;
  onUpdateGame: (updatedGame: Game) => void;
  onEliminatePlayer: (
    entryId: string,
    koByPlayerId?: string,
    koType?: KnockoutCode | null,
    isMuck?: boolean
  ) => void;
  onTournamentFinalized?: (results: FinalizedEntryResult[]) => void;
  onSelectGame?: (game: Game) => void;
  onGamesChange?: (games: Game[]) => void;
  onEntriesChange: (entries: GameEntry[]) => void;
  onBack?: () => void;
  backLabel?: string;
  onSelectPlayer?: (player: Player) => void;
}

export const DirectorDesk: React.FC<DirectorDeskProps> = ({
  activeGame,
  gameEntries,
  players,
  userRole = 'manager',
  onUpdateGame,
  onEliminatePlayer,
  onTournamentFinalized,
  onEntriesChange,
  onBack,
  backLabel,
  onSelectPlayer,
}) => {
  // Clock state
  const [isRunning, setIsRunning] = useState<boolean>(activeGame.status === 'running');
  const [currentLevelIndex, setCurrentLevelIndex] = useState<number>(activeGame.currentLevelIndex);
  const [secondsLeft, setSecondsLeft] = useState<number>(activeGame.secondsRemainingInLevel);
  const [overrideMinutesInput, setOverrideMinutesInput] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [deskTab, setDeskTab] = useState<'cockpit' | 'scorecard'>(
    userRole === 'scribe' ? 'scorecard' : 'cockpit'
  );
  const [scorecardMode, setScorecardMode] = useState<'cards' | 'paper'>('cards');

  // Modals state
  const [selectedEntryToEliminate, setSelectedEntryToEliminate] = useState<GameEntry | null>(null);
  const [scoringEntryId, setScoringEntryId] = useState<string | null>(null);
  const [isSeatingModalOpen, setIsSeatingModalOpen] = useState<boolean>(false);
  const [seatingInitialPlayerId, setSeatingInitialPlayerId] = useState<string | null>(null);
  const [isFinalizeDialogOpen, setIsFinalizeDialogOpen] = useState<boolean>(false);
  const [finalSuccessMsg, setFinalSuccessMsg] = useState<string>('');

  const currentLevel = activeGame.blindSchedule[currentLevelIndex] || activeGame.blindSchedule[0];
  const nextLevel = activeGame.blindSchedule[currentLevelIndex + 1];

  const canManageClock = AuthService.canManageClock(userRole);
  const canEditScorecard = AuthService.canRecordBusts(userRole);
  const canFinalizeTournament = AuthService.canAccessAdmin(userRole);

  const activeGameRef = useRef<Game>(activeGame);
  const onUpdateGameRef = useRef(onUpdateGame);
  const levelIndexRef = useRef<number>(currentLevelIndex);
  const secondsLeftRef = useRef<number>(secondsLeft);

  useEffect(() => {
    activeGameRef.current = activeGame;
    onUpdateGameRef.current = onUpdateGame;
  });

  useEffect(() => {
    levelIndexRef.current = currentLevelIndex;
  }, [currentLevelIndex]);

  useEffect(() => {
    secondsLeftRef.current = secondsLeft;
  }, [secondsLeft]);

  // Sync clock if activeGame ID changes
  useEffect(() => {
    const nextLevelIdx = activeGameRef.current.currentLevelIndex || 0;
    const nextSecs = activeGameRef.current.secondsRemainingInLevel || 900;
    const nextRunning = activeGameRef.current.status === 'running';
    levelIndexRef.current = nextLevelIdx;
    secondsLeftRef.current = nextSecs;
    setCurrentLevelIndex(nextLevelIdx);
    setSecondsLeft(nextSecs);
    setIsRunning(nextRunning);
  }, [activeGame.$id]);

  // Timer Tick Engine — updates local & parent state side-by-side inside interval callback
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      const game = activeGameRef.current;
      const lvlIdx = levelIndexRef.current;
      const currentSec = secondsLeftRef.current;

      if (currentSec > 1) {
        const nextSec = currentSec - 1;
        secondsLeftRef.current = nextSec;
        setSecondsLeft(nextSec);
        onUpdateGameRef.current({
          ...game,
          currentLevelIndex: lvlIdx,
          secondsRemainingInLevel: nextSec,
          status: 'running',
        });
      } else if (lvlIdx < game.blindSchedule.length - 1) {
        const nextIdx = lvlIdx + 1;
        const nextSecs = game.blindSchedule[nextIdx].durationMinutes * 60;
        levelIndexRef.current = nextIdx;
        secondsLeftRef.current = nextSecs;
        setCurrentLevelIndex(nextIdx);
        setSecondsLeft(nextSecs);
        onUpdateGameRef.current({
          ...game,
          currentLevelIndex: nextIdx,
          secondsRemainingInLevel: nextSecs,
          status: 'running',
        });
        void AppwriteService.updateGameClock(game.$id, nextIdx, nextSecs);
      } else {
        secondsLeftRef.current = 0;
        setSecondsLeft(0);
        setIsRunning(false);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  // Periodic writeback every 5s while running
  useEffect(() => {
    if (!isRunning) return;
    const syncInterval = setInterval(() => {
      void AppwriteService.updateGameClock(
        activeGameRef.current.$id,
        levelIndexRef.current,
        secondsLeftRef.current
      );
    }, 5000);
    return () => clearInterval(syncInterval);
  }, [isRunning, activeGame.$id]);

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

  const handleAdjustSeconds = (deltaSeconds: number) => {
    if (!canManageClock) return;
    const nextSecs = Math.max(0, secondsLeft + deltaSeconds);
    setSecondsLeft(nextSecs);
    onUpdateGame({
      ...activeGame,
      currentLevelIndex,
      secondsRemainingInLevel: nextSecs,
    });
    AppwriteService.updateGameClock(activeGame.$id, currentLevelIndex, nextSecs);
  };

  const handleManualTimeOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageClock) return;
    const mins = Number(overrideMinutesInput);
    if (!Number.isFinite(mins) || mins <= 0) return;
    const nextSecs = Math.round(mins * 60);
    setSecondsLeft(nextSecs);
    const updatedSchedule = activeGame.blindSchedule.map((lvl, idx) =>
      idx === currentLevelIndex ? { ...lvl, durationMinutes: mins } : lvl
    );
    onUpdateGame({
      ...activeGame,
      blindSchedule: updatedSchedule,
      currentLevelIndex,
      secondsRemainingInLevel: nextSecs,
    });
    AppwriteService.updateGameClock(activeGame.$id, currentLevelIndex, nextSecs);
    setOverrideMinutesInput('');
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

  const handleUpdateSessionRules = async (updates: Partial<Game>) => {
    const updatedGame: Game = { ...activeGame, ...updates };
    onUpdateGame(updatedGame);
    // Recompute live cached base/final points for entries when multiplier or No-Game changes
    if (
      updates.pointMultiplier !== undefined ||
      updates.noGamePlayed !== undefined ||
      updates.isDayGame !== undefined
    ) {
      const recalculated = gameEntries.map((entry) =>
        syncEntryCalculatedFields(entry, updatedGame)
      );
      onEntriesChange(recalculated);
    }
    await AppwriteService.updateGame(activeGame.$id, updates);
  };

  const handleUpdateEntryScoring = async (entryId: string, updates: Partial<GameEntry>) => {
    const target = gameEntries.find((e) => e.$id === entryId);
    if (!target) return;

    const synced = syncEntryCalculatedFields({ ...target, ...updates }, activeGame);
    const updatedEntries = gameEntries.map((e) => (e.$id === entryId ? synced : e));
    onEntriesChange(updatedEntries);

    const remainingCount = updatedEntries.filter((e) => getEntryStatus(e) === 'ACTIVE').length;
    if (remainingCount !== activeGame.remainingPlayersCount) {
      onUpdateGame({ ...activeGame, remainingPlayersCount: remainingCount });
    }

    await AppwriteService.updateGameEntryScoring(entryId, synced);
  };

  const handleConfirmElimination = async (payload: EliminationConfirmPayload) => {
    const targetEntry = gameEntries.find((e) => e.$id === payload.eliminatedEntryId);
    if (!targetEntry) return;

    const activeCount = gameEntries.filter((e) => getEntryStatus(e) === 'ACTIVE').length;
    const finishPos = activeCount;
    const koWinnerEntry = payload.koWinnerPlayerId
      ? gameEntries.find((e) => e.playerId === payload.koWinnerPlayerId)
      : undefined;

    onEliminatePlayer(
      targetEntry.$id,
      payload.koWinnerPlayerId,
      payload.koType,
      payload.isMuck
    );

    await AppwriteService.recordEliminationWithKO(
      activeGame.$id,
      targetEntry.$id,
      finishPos,
      Math.max(0, activeCount - 1),
      koWinnerEntry?.$id,
      payload.koWinnerPlayerId,
      {
        koType: payload.koType,
        eliminatedBySeat: koWinnerEntry?.seatNumber,
        knockedOutByPlayerName: koWinnerEntry?.playerName,
        isMuck: payload.isMuck,
      }
    );

    onUpdateGame({
      ...activeGame,
      remainingPlayersCount: Math.max(0, activeCount - 1),
    });

    setSelectedEntryToEliminate(null);
  };

  // Tournament Finalization using official Jack Ten Poker scoring engine
  const handleConfirmFinalization = async (results: FinalizedEntryResult[]) => {
    await AppwriteService.finalizeTournament(activeGame.$id, results);
    onTournamentFinalized?.(results);

    onUpdateGame({
      ...activeGame,
      status: 'completed',
      remainingPlayersCount: 0,
    });

    setFinalSuccessMsg(
      `Tournament finalized! Official Jack Ten Poker points (${results
        .reduce((sum, r) => sum + r.finalPoints, 0)
        .toLocaleString()} total pts) & DG carryovers have been saved.`
    );
    setTimeout(() => setFinalSuccessMsg(''), 9000);
  };

  // Session Points Summary Calculations
  const activeEntries = gameEntries.filter((ge) => !ge.isEliminated);
  const sessionMultiplier = activeGame.pointMultiplier ?? 1;
  const totalSessionPointsAwarded = gameEntries.reduce(
    (sum, ge) => sum + calculateEntryScore(ge, activeGame).finalPoints,
    0
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 pb-24 md:pb-12">
      
      {/* Back Button Header */}
      {onBack && (
        <button
          onClick={onBack}
          className="no-print flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-amber-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {backLabel || 'Back to Games'}
        </button>
      )}

      {/* 1. Director Header */}
      <div className="no-print glass-panel rounded-2xl p-5 border border-emerald-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success">
              <SlidersHorizontal className="w-3 h-3" /> DIRECTOR CONTROL CENTER
            </Badge>
            <span className="text-xs text-slate-400">{activeGame.venueName}</span>
            <Badge variant={(activeGame.pointMultiplier ?? 1) > 1 ? 'default' : 'secondary'}>
              {activeGame.pointMultiplier ?? 1}x Points
            </Badge>
            {activeGame.isDayGame && (
              <Badge variant="indigo">
                <Sun className="w-3 h-3" /> DG
              </Badge>
            )}
            {activeGame.noGamePlayed && (
              <Badge variant="destructive">
                <Ban className="w-3 h-3" /> No-Game (5,000)
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-black text-white">{activeGame.title}</h1>
          {(activeGame.hodRule || activeGame.hotHandDescription) && (
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              {activeGame.hodRule && (
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  HOD: <strong className="text-slate-200">{activeGame.hodRule}</strong>
                </span>
              )}
              {activeGame.hotHandDescription && (
                <span className="flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-rose-400" />
                  Hot Hand: <strong className="text-slate-200">{activeGame.hotHandDescription}</strong>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Live Status & Finalize Action */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Badge
            variant={
              activeGame.status === 'running'
                ? 'success'
                : activeGame.status === 'completed'
                ? 'secondary'
                : 'default'
            }
          >
            {activeGame.status === 'running' ? '● In Progress' : activeGame.status}
          </Badge>

          {canFinalizeTournament && (
            <Button
              type="button"
              size="sm"
              variant={activeGame.status === 'completed' ? 'secondary' : 'default'}
              disabled={activeGame.status === 'completed' || gameEntries.length === 0}
              onClick={() => setIsFinalizeDialogOpen(true)}
            >
              <Trophy className="w-4 h-4" />
              {activeGame.status === 'completed' ? 'Finalized' : 'Finalize & Score'}
            </Button>
          )}
        </div>
      </div>

      {finalSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>{finalSuccessMsg}</span>
        </div>
      )}

      {/* Mode Switcher: Live Desk vs Digital Scorecard */}
      <Tabs
        value={deskTab}
        onValueChange={(v) => setDeskTab(v as 'cockpit' | 'scorecard')}
        className="space-y-4"
      >
        <TabsList className="no-print grid w-full max-w-md grid-cols-2 h-12">
          <TabsTrigger value="cockpit" className="gap-1.5 h-10 text-xs sm:text-sm">
            <Clock className="w-4 h-4" /> Live Clock &amp; Seating
          </TabsTrigger>
          <TabsTrigger value="scorecard" className="gap-1.5 h-10 text-xs sm:text-sm">
            <ClipboardList className="w-4 h-4" /> Scorecard ({gameEntries.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scorecard" className="space-y-5 mt-4">
          {/* Interactive vs Paper Sheet Comparison Switcher */}
          <div className="no-print flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex p-1 rounded-xl bg-slate-900 border border-slate-800">
              <button
                type="button"
                onClick={() => setScorecardMode('cards')}
                className={`min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors ${
                  scorecardMode === 'cards'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ClipboardList className="w-4 h-4" /> Mobile Cards
              </button>
              <button
                type="button"
                onClick={() => setScorecardMode('paper')}
                className={`min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors ${
                  scorecardMode === 'paper'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4" /> Paper Sheet (Compare / Print)
              </button>
            </div>
          </div>

          {scorecardMode === 'paper' ? (
            <PaperScorecardView
              game={activeGame}
              entries={gameEntries}
              canEdit={canEditScorecard}
              onSelectEntry={(entryId) => setScoringEntryId(entryId)}
            />
          ) : (
            <>
              <SessionRulesBar
                game={activeGame}
                canEdit={canEditScorecard}
                onUpdateSessionRules={handleUpdateSessionRules}
              />
              <RsvpCheckinPanel
                rsvpPlayerIds={activeGame.rsvpPlayerIds || []}
                players={players}
                currentEntries={gameEntries}
                canSeat={canEditScorecard && activeGame.status !== 'completed'}
                onQuickSeat={handleSeatPlayer}
                onOpenCustomSeat={(playerId) => {
                  setSeatingInitialPlayerId(playerId);
                  setIsSeatingModalOpen(true);
                }}
              />
              <ScorecardTable
                game={activeGame}
                entries={gameEntries}
                canEdit={canEditScorecard}
                onUpdateEntry={handleUpdateEntryScoring}
                onRequestScorePlayer={(entryId) => setScoringEntryId(entryId)}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="cockpit" className="space-y-6 mt-4">
          
          {/* Interactive Blind Clock Console */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1">
                <Sparkles className="w-4 h-4" /> LEVEL {currentLevel.level} {currentLevel.isBreak && '(BREAK)'}
              </span>

              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  soundEnabled
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                <span>{soundEnabled ? 'Sound On' : 'Muted'}</span>
              </button>
            </div>

            {/* Digital Clock Display */}
            <div className="text-center py-4 felt-gradient rounded-2xl border border-emerald-500/40 felt-glow">
              <div className="text-6xl md:text-8xl font-mono font-black tracking-tight text-white drop-shadow-lg">
                {formatTime(secondsLeft)}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-200">
                <div>
                  <span className="text-xs text-slate-400 block uppercase">
                    {currentLevel.isBreak ? 'Scheduled Break' : 'Small / Big Blind'}
                  </span>
                  <span className="text-2xl font-black text-amber-400">
                    {currentLevel.isBreak
                      ? currentLevel.breakTitle || '10-Min Break'
                      : `${currentLevel.smallBlind.toLocaleString()} / ${currentLevel.bigBlind.toLocaleString()}`}
                  </span>
                  {!currentLevel.isBreak && (
                    <span className="block text-xs font-mono text-slate-400">
                      ({formatBlindInThousands(currentLevel.smallBlind)} / {formatBlindInThousands(currentLevel.bigBlind)})
                    </span>
                  )}
                </div>

                {currentLevel.ante > 0 && (
                  <div>
                    <span className="text-xs text-slate-400 block uppercase">Big Blind Ante</span>
                    <span className="text-2xl font-black text-indigo-300">
                      {currentLevel.ante.toLocaleString()}
                    </span>
                  </div>
                )}

                {nextLevel && (
                  <div className="border-l border-slate-700 pl-6">
                    <span className="text-xs text-slate-400 block uppercase">
                      Next {nextLevel.isBreak ? 'Break' : `Stage (${nextLevel.durationMinutes}m)`}
                    </span>
                    <span className="text-sm font-bold text-slate-300">
                      {nextLevel.isBreak
                        ? nextLevel.breakTitle || '10-Min Break'
                        : `${formatBlindInThousands(nextLevel.smallBlind)} / ${formatBlindInThousands(nextLevel.bigBlind)}`}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Timer Controls & Manual Blind Time Override */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {canManageClock ? (
                <>
                  <button
                    onClick={handleToggleTimer}
                    className={`px-6 py-3 rounded-xl font-black text-sm flex items-center gap-2 transition-all shadow-lg ${
                      isRunning
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                    }`}
                  >
                    {isRunning ? <Pause className="w-5 h-5 fill-slate-950" /> : <Play className="w-5 h-5 fill-slate-950" />}
                    <span>{isRunning ? 'PAUSE CLOCK' : 'START CLOCK'}</span>
                  </button>

                  <button
                    onClick={() => handleAdjustSeconds(-60)}
                    className="px-3.5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all"
                  >
                    <Minus className="w-4 h-4" /> -1 Min
                  </button>

                  <button
                    onClick={() => handleAdjustSeconds(60)}
                    className="px-3.5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all"
                  >
                    <Plus className="w-4 h-4" /> +1 Min
                  </button>

                  <button
                    onClick={handleSkipLevel}
                    className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all"
                  >
                    <SkipForward className="w-4 h-4" /> Skip Level
                  </button>

                  <button
                    onClick={handleResetLevel}
                    className="px-3.5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all"
                    title="Reset Level Timer"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <form
                    onSubmit={handleManualTimeOverride}
                    className="flex items-center gap-1.5 pl-2 border-l border-slate-800"
                  >
                    <input
                      type="number"
                      min="1"
                      max="120"
                      step="1"
                      value={overrideMinutesInput}
                      onChange={(e) => setOverrideMinutesInput(e.target.value)}
                      placeholder={`${currentLevel.durationMinutes}m`}
                      aria-label="Override blind duration in minutes"
                      className="w-16 h-10 rounded-xl bg-slate-950 border border-slate-700 px-2.5 text-xs font-mono font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <Button type="submit" size="sm" variant="outline" className="h-10 text-xs">
                      Set Mins
                    </Button>
                  </form>
                </>
              ) : (
                <div className="text-xs text-slate-400 font-semibold px-4 py-2 bg-slate-900 rounded-xl border border-slate-800">
                  Clock controls restricted to Dealer &amp; Manager
                </div>
              )}
            </div>
          </div>

          {/* Seating Matrix & Player Management */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-400" /> Active Tables &amp; Seating ({activeEntries.length} remaining of {gameEntries.length})
                </h2>
                <p className="text-xs text-slate-400">Track rebuys, score bonuses, and record knockouts in real time</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {canEditScorecard && activeGame.status !== 'completed' && gameEntries.length > 0 && (
                  <Button
                    type="button"
                    variant="default"
                    onClick={() => setScoringEntryId(gameEntries[0].$id)}
                    className="h-11 px-4 text-xs sm:text-sm font-bold"
                  >
                    <Award className="w-4 h-4" /> Add Points
                  </Button>
                )}
                <Button
                  type="button"
                  variant="success"
                  onClick={() => {
                    setSeatingInitialPlayerId(null);
                    setIsSeatingModalOpen(true);
                  }}
                  className="h-11 px-4 text-xs sm:text-sm"
                >
                  <UserPlus className="w-4 h-4" /> Seat Player
                </Button>
              </div>
            </div>

            {/* RSVP Check-in Queue (Starts with RSVP'd Players) */}
            <RsvpCheckinPanel
              rsvpPlayerIds={activeGame.rsvpPlayerIds || []}
              players={players}
              currentEntries={gameEntries}
              canSeat={canEditScorecard && activeGame.status !== 'completed'}
              onQuickSeat={handleSeatPlayer}
              onOpenCustomSeat={(playerId) => {
                setSeatingInitialPlayerId(playerId);
                setIsSeatingModalOpen(true);
              }}
            />

            {/* Players Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {gameEntries.map((entry) => (
                <div
                  key={entry.$id}
                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
                    entry.isEliminated
                      ? 'bg-slate-950/60 border-slate-900 opacity-50'
                      : 'bg-slate-900/90 border-slate-800 hover:border-amber-500/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-amber-400 shrink-0">
                      T{entry.tableNumber}S{entry.seatNumber}
                    </div>
                    <div 
                      onClick={() => {
                        if (onSelectPlayer) {
                          const p: Player = players.find((x) => x.$id === entry.playerId) || {
                            $id: entry.playerId,
                            name: entry.playerName,
                            email: `${entry.playerName.toLowerCase().replace(/\s+/g, '')}@holdempro.com`,
                            role: 'player',
                            totalPoints: 10000,
                            careerWins: 2,
                            careerKOs: entry.kosCount,
                            gamesPlayed: 8,
                            leagueId: 'league_1',
                            suitIcon: 'spades',
                            isMember: true,
                          };
                          onSelectPlayer(p);

                        }
                      }}
                      className={onSelectPlayer ? 'cursor-pointer group/player' : ''}
                    >
                      <h4 className={`font-bold text-sm ${entry.isEliminated ? 'line-through text-slate-500' : 'text-white group-hover/player:text-amber-400 transition-colors'}`}>
                        {entry.playerName}
                      </h4>
                      <div className="text-[10px] text-slate-400 flex flex-wrap items-center gap-2">
                        <span>
                          Pts:{' '}
                          <strong className="text-amber-400 font-mono">
                            {calculateEntryScore(entry, activeGame).finalPoints.toLocaleString()}
                          </strong>
                        </span>
                        <span>•</span>
                        <span>KOs: <strong className="text-rose-400">{entry.kosCount}</strong></span>
                        <span>•</span>
                        <span>Rebuys: <strong className="text-emerald-400">{entry.rebuysCount}</strong></span>
                        <span>•</span>
                        <span>Addons: <strong className="text-indigo-400">{entry.addonsCount}</strong></span>
                        {entry.hasDgCarryover && (
                          <span className="px-1.5 py-0 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                            DG 2x
                          </span>
                        )}
                        {getEntryStatus(entry) === 'MUCK' && (
                          <span className="px-1.5 py-0 rounded bg-rose-500/20 text-rose-300 font-bold">
                            MUCK
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* All Player Actions Consolidated Under the Pop-up */}
                  <div className="flex items-center gap-2 self-stretch sm:self-center justify-end">
                    {entry.isEliminated && (
                      <span className="text-xs text-rose-400 font-bold">
                        Bust #{entry.finishPosition}
                      </span>
                    )}
                    {canEditScorecard && activeGame.status !== 'completed' && (
                      <Button
                        type="button"
                        variant={entry.isEliminated ? 'outline' : 'default'}
                        onClick={() => setScoringEntryId(entry.$id)}
                        className="h-11 px-4 text-xs font-bold flex-1 sm:flex-none"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        {entry.isEliminated ? 'Edit Player' : 'Actions / Pts'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Official Top 5 Points Scale Breakdown */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" /> Final Table Points Scale ({sessionMultiplier}x Session)
              </h2>
              <span className="text-sm font-mono font-black text-emerald-400">
                Session Total: {totalSessionPointsAwarded.toLocaleString()} pts
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              {[
                { place: '1st Place', base: PLACEMENT_POINTS[1], highlight: true },
                { place: '2nd Place', base: PLACEMENT_POINTS[2], highlight: false },
                { place: '3rd Place', base: PLACEMENT_POINTS[3], highlight: false },
                { place: '4th Place', base: PLACEMENT_POINTS[4], highlight: false },
                { place: '5th Place', base: PLACEMENT_POINTS[5], highlight: false },
              ].map((tier) => (
                <div
                  key={tier.place}
                  className={
                    tier.highlight
                      ? 'bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl'
                      : 'bg-slate-900 border border-slate-800 p-3.5 rounded-xl'
                  }
                >
                  <div
                    className={`text-xs font-bold uppercase ${
                      tier.highlight ? 'text-amber-400' : 'text-slate-400'
                    }`}
                  >
                    {tier.place}
                  </div>
                  <div
                    className={`text-xl font-mono font-black mt-1 ${
                      tier.highlight ? 'text-amber-300' : 'text-white'
                    }`}
                  >
                    +{(tier.base * sessionMultiplier).toLocaleString()}{' '}
                    <span className="text-xs font-semibold text-slate-400">pts</span>
                  </div>
                  {sessionMultiplier > 1 && (
                    <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                      {tier.base.toLocaleString()} base × {sessionMultiplier}x
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ======================================================== */}
      {/* MODALS                                                   */}
      {/* ======================================================== */}

      {/* 1. RSVP & Walk-in Player Seating Modal */}
      <PlayerSeatingModal
        isOpen={isSeatingModalOpen}
        onClose={() => {
          setIsSeatingModalOpen(false);
          setSeatingInitialPlayerId(null);
        }}
        availablePlayers={players}
        currentEntries={gameEntries}
        rsvpPlayerIds={activeGame.rsvpPlayerIds || []}
        initialPlayerId={seatingInitialPlayerId}
        onConfirmSeat={handleSeatPlayer}
      />

      {/* 2. Mobile-Friendly Unified Player Actions & Points Dialog */}
      <PlayerScoreDialog
        isOpen={Boolean(scoringEntryId)}
        game={activeGame}
        entries={gameEntries}
        selectedEntryId={scoringEntryId}
        onSelectEntryId={(entryId) => setScoringEntryId(entryId)}
        onClose={() => setScoringEntryId(null)}
        onUpdateEntry={handleUpdateEntryScoring}
        onAdjustRebuys={handleAdjustRebuys}
        onAdjustAddons={handleAdjustAddons}
        onRequestEliminate={(entry) => setSelectedEntryToEliminate(entry)}
      />

      {/* 3. Accessible Elimination & Knockout Audit Dialog */}
      <EliminationDialog
        entry={selectedEntryToEliminate}
        eligibleEliminators={gameEntries.filter(
          (ge) =>
            getEntryStatus(ge) === 'ACTIVE' &&
            ge.$id !== selectedEntryToEliminate?.$id
        )}
        finishPositionPreview={activeEntries.length}
        onClose={() => setSelectedEntryToEliminate(null)}
        onConfirm={handleConfirmElimination}
      />

      {/* 3. Official Finalization & Scoring Preview Dialog */}
      <FinalizeTournamentDialog
        isOpen={isFinalizeDialogOpen}
        game={activeGame}
        entries={gameEntries}
        onClose={() => setIsFinalizeDialogOpen(false)}
        onConfirmFinalize={handleConfirmFinalization}
      />

    </div>
  );
};
