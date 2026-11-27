import React, { useState, useEffect, useRef } from 'react';
import type {
  Game,
  GameEntry,
  HandBonusCode,
  Player,
  Venue,
  Season,
  UserRole,
  KnockoutCode,
} from '../types/holdem';
import {
  createEliminationNotification,
  createPlacementNotification,
  createShowUpCutoffNotification,
  diffEntryForScoreEvents,
  type LiveScoreNotification,
} from '@/lib/liveScoreEvents';
import { QuickScoreStrip } from './director/QuickScoreStrip';
import { useGameClock } from '@/hooks/useGameClock';
import {
  applyLevelDurationOverrides,
  formatClockTime,
  getServerNowMs,
} from '@/lib/gameClock';
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
  BAR_BONUS_CHIP_VALUE,
  BAR_SPEND_PER_BONUS_CHIP_USD,
  calculateEntryScore,
  formatBlindInThousands,
  getEntryHandBonuses,
  getEntryStatus,
  hasReachedShowUpCutoff,
  PLACEMENT_POINTS,
  SHOW_UP_CUTOFF_LEVEL_INDEX,
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
  Coins,
} from 'lucide-react';

interface DirectorDeskProps {
  activeGame: Game;
  gameEntries: GameEntry[];
  players: Player[];
  venues?: Venue[];
  seasons?: Season[];
  allGames?: Game[];
  userRole?: UserRole | null;
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
  highlightedPlayers?: ReadonlyMap<string, LiveScoreNotification>;
  onEmitScoreEvent?: (notification: LiveScoreNotification) => void;
  onRecordLocalEntriesSnapshot?: (
    gameId: string,
    entries: GameEntry[],
    changedEntry?: GameEntry
  ) => void;
}

export const DirectorDesk: React.FC<DirectorDeskProps> = ({
  activeGame,
  gameEntries,
  players,
  userRole = null,
  onUpdateGame,
  onEliminatePlayer,
  onTournamentFinalized,
  onEntriesChange,
  onBack,
  backLabel,
  onSelectPlayer,
  highlightedPlayers,
  onEmitScoreEvent,
  onRecordLocalEntriesSnapshot,
}) => {
  // Local UI state (clock itself is derived deterministically from the backend anchor via useGameClock)
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

  const canManageClock = AuthService.canManageClock(userRole);
  const canSeatPlayers = AuthService.canSeatPlayers(userRole);
  const canEditScorecard = AuthService.canRecordBusts(userRole);
  const canFinalizeTournament = AuthService.canFinalizeTournament(userRole);

  const activeGameRef = useRef<Game>(activeGame);
  const onUpdateGameRef = useRef(onUpdateGame);
  const gameEntriesRef = useRef<GameEntry[]>(gameEntries);
  const onEntriesChangeRef = useRef(onEntriesChange);
  const onEmitScoreEventRef = useRef(onEmitScoreEvent);
  const onRecordLocalSnapshotRef = useRef(onRecordLocalEntriesSnapshot);
  const localClockSeqRef = useRef<number>(0);
  const showUpAppliedForGameRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    activeGameRef.current = activeGame;
    onUpdateGameRef.current = onUpdateGame;
    gameEntriesRef.current = gameEntries;
    onEntriesChangeRef.current = onEntriesChange;
    onEmitScoreEventRef.current = onEmitScoreEvent;
    onRecordLocalSnapshotRef.current = onRecordLocalEntriesSnapshot;
  });

  const applyShowUpCutoffIfReached = (prevLevelIdx: number, nextGame: Game) => {
    const nextLevelIdx = nextGame.currentLevelIndex;
    if (
      prevLevelIdx < SHOW_UP_CUTOFF_LEVEL_INDEX &&
      nextLevelIdx >= SHOW_UP_CUTOFF_LEVEL_INDEX &&
      !showUpAppliedForGameRef.current.has(nextGame.$id)
    ) {
      showUpAppliedForGameRef.current.add(nextGame.$id);
      const updatedEntries = gameEntriesRef.current.map((entry) => {
        const awarded = entry.showUpAwarded === false ? false : true;
        return syncEntryCalculatedFields({ ...entry, showUpAwarded: awarded }, nextGame);
      });
      const awardedCount = updatedEntries.filter(
        (entry) => entry.showUpAwarded !== false && getEntryStatus(entry) !== 'MUCK'
      ).length;
      gameEntriesRef.current = updatedEntries;
      onRecordLocalSnapshotRef.current?.(nextGame.$id, updatedEntries);
      onEntriesChangeRef.current(updatedEntries);
      if (awardedCount > 0) {
        onEmitScoreEventRef.current?.(createShowUpCutoffNotification(nextGame, awardedCount));
      }
      void Promise.all(
        updatedEntries.map((entry) =>
          AppwriteService.updateGameEntryScoring(entry.$id, {
            showUpAwarded: entry.showUpAwarded,
            calculatedBasePoints: entry.calculatedBasePoints,
            calculatedFinalPoints: entry.calculatedFinalPoints,
            pointsAwarded: entry.pointsAwarded,
          })
        )
      );
    }
  };

  // Backend-authoritative tournament clock (single source of truth across all connected users)
  const {
    currentLevelIndex,
    secondsRemaining: secondsLeft,
    isRunning,
    currentLevel,
    nextLevel,
    effectiveSchedule,
  } = useGameClock(activeGame, {
    onLevelAdvanced: (prevIdx, nextIdx, nextSecs) => {
      if (!canManageClock) return;
      const game = activeGameRef.current;
      const nextGame: Game = {
        ...game,
        currentLevelIndex: nextIdx,
        secondsRemainingInLevel: nextSecs,
      };
      applyShowUpCutoffIfReached(prevIdx, nextGame);
    },
  });

  // Live view of activeGame with backend-computed currentLevelIndex & schedule overrides
  const liveGame: Game = {
    ...activeGame,
    currentLevelIndex,
    secondsRemainingInLevel: secondsLeft,
    blindSchedule: effectiveSchedule,
  };

  const commitClockMutation = (next: {
    status: Game['status'];
    currentLevelIndex: number;
    secondsRemainingInLevel: number;
    levelDurationOverrides?: Record<number, number>;
  }) => {
    const game = activeGameRef.current;
    const seq = ++localClockSeqRef.current;
    const overrides = next.levelDurationOverrides ?? game.levelDurationOverrides;
    const updatedSchedule = applyLevelDurationOverrides(game.blindSchedule, overrides);
    const optimisticAnchor = new Date(getServerNowMs()).toISOString();

    const optimisticGame: Game = {
      ...game,
      status: next.status,
      currentLevelIndex: next.currentLevelIndex,
      secondsRemainingInLevel: next.secondsRemainingInLevel,
      clockAnchorAt: optimisticAnchor,
      levelDurationOverrides: overrides,
      blindSchedule: updatedSchedule,
    };
    onUpdateGameRef.current(optimisticGame);

    void AppwriteService.saveGameClockState(game.$id, {
      status: next.status,
      currentLevelIndex: next.currentLevelIndex,
      secondsRemainingInLevel: next.secondsRemainingInLevel,
      levelDurationOverrides: overrides,
    }).then((snapshot) => {
      // Only apply server-stamped anchor if this is still the latest local clock command
      if (seq !== localClockSeqRef.current) return;
      const latest = activeGameRef.current;
      if (latest.$id !== game.$id) return;
      onUpdateGameRef.current({
        ...latest,
        status: snapshot.status,
        currentLevelIndex: snapshot.currentLevelIndex,
        secondsRemainingInLevel: snapshot.secondsRemainingInLevel,
        clockAnchorAt: snapshot.clockAnchorAt,
        levelDurationOverrides: snapshot.levelDurationOverrides,
        blindSchedule: applyLevelDurationOverrides(
          latest.blindSchedule,
          snapshot.levelDurationOverrides
        ),
      });
    });
  };

  const handleToggleTimer = () => {
    if (!canManageClock) return;
    const nextRunning = !isRunning;
    commitClockMutation({
      status: nextRunning ? 'running' : 'paused',
      currentLevelIndex,
      secondsRemainingInLevel: secondsLeft,
    });
  };

  const handleSkipLevel = () => {
    if (!canManageClock) return;
    if (currentLevelIndex < effectiveSchedule.length - 1) {
      const prevIdx = currentLevelIndex;
      const nextIdx = currentLevelIndex + 1;
      const nextSecs = effectiveSchedule[nextIdx].durationMinutes * 60;
      const nextGame: Game = {
        ...liveGame,
        currentLevelIndex: nextIdx,
        secondsRemainingInLevel: nextSecs,
      };
      applyShowUpCutoffIfReached(prevIdx, nextGame);
      commitClockMutation({
        status: activeGame.status,
        currentLevelIndex: nextIdx,
        secondsRemainingInLevel: nextSecs,
      });
    }
  };

  const handleAdjustSeconds = (deltaSeconds: number) => {
    if (!canManageClock) return;
    const nextSecs = Math.max(0, secondsLeft + deltaSeconds);
    commitClockMutation({
      status: activeGame.status,
      currentLevelIndex,
      secondsRemainingInLevel: nextSecs,
    });
  };

  const handleManualTimeOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageClock) return;
    const mins = Number(overrideMinutesInput);
    if (!Number.isFinite(mins) || mins <= 0) return;
    const nextSecs = Math.round(mins * 60);
    const nextOverrides: Record<number, number> = {
      ...(activeGame.levelDurationOverrides || {}),
      [currentLevelIndex]: mins,
    };
    commitClockMutation({
      status: activeGame.status,
      currentLevelIndex,
      secondsRemainingInLevel: nextSecs,
      levelDurationOverrides: nextOverrides,
    });
    setOverrideMinutesInput('');
  };

  const handleResetLevel = () => {
    if (!canManageClock) return;
    const defaultSecs = currentLevel.durationMinutes * 60;
    commitClockMutation({
      status: activeGame.status,
      currentLevelIndex,
      secondsRemainingInLevel: defaultSecs,
    });
  };

  // Seating & Rebuys Handlers
  const handleSeatPlayer = async (player: Player, tableNumber: number, seatNumber: number) => {
    if (!canSeatPlayers || activeGame.status === 'completed') return;
    const createdEntry = await AppwriteService.addGameEntry(
      activeGame.$id,
      player,
      tableNumber,
      seatNumber,
      activeGame
    );

    const updatedEntries = [...gameEntries, createdEntry];
    onEntriesChange(updatedEntries);

    const totalPlayersCount = updatedEntries.length;
    const remainingPlayersCount = updatedEntries.filter((e) => getEntryStatus(e) === 'ACTIVE').length;
    const totalEntriesCount = updatedEntries.reduce(
      (sum, e) => sum + (e.buyinsCount || 1) + (e.rebuysCount || 0),
      0
    );

    onUpdateGame({
      ...activeGame,
      totalPlayersCount,
      remainingPlayersCount,
      totalEntriesCount,
    });
  };

  const handleAdjustRebuys = async (entryId: string, delta: number) => {
    if (!canEditScorecard || activeGame.status === 'completed') return;
    const entry = gameEntries.find((e) => e.$id === entryId);
    if (!entry) return;
    const nextRebuys = Math.max(0, entry.rebuysCount + delta);
    if (nextRebuys === entry.rebuysCount) return;

    const updatedEntries = gameEntries.map((e) =>
      e.$id === entryId ? { ...e, rebuysCount: nextRebuys } : e
    );
    onEntriesChange(updatedEntries);

    const totalEntriesCount = updatedEntries.reduce(
      (sum, e) => sum + (e.buyinsCount || 1) + (e.rebuysCount || 0),
      0
    );
    onUpdateGame({
      ...activeGame,
      totalEntriesCount,
    });

    await AppwriteService.updatePlayerRebuys(activeGame.$id, entryId, nextRebuys, activeGame);
  };

  const handleAdjustAddons = async (entryId: string, delta: number) => {
    if (!canEditScorecard || activeGame.status === 'completed') return;
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
    if (!canEditScorecard || activeGame.status === 'completed') return;
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
    if (!canEditScorecard || activeGame.status === 'completed') return;
    const target = gameEntries.find((e) => e.$id === entryId);
    if (!target) return;

    const synced = syncEntryCalculatedFields({ ...target, ...updates }, activeGame);
    const updatedEntries = gameEntries.map((e) => (e.$id === entryId ? synced : e));

    const events = diffEntryForScoreEvents(target, synced, activeGame, updatedEntries);
    for (const ev of events) {
      onEmitScoreEvent?.(ev);
    }
    onRecordLocalEntriesSnapshot?.(activeGame.$id, updatedEntries, synced);

    onEntriesChange(updatedEntries);

    const remainingCount = updatedEntries.filter((e) => getEntryStatus(e) === 'ACTIVE').length;
    if (remainingCount !== activeGame.remainingPlayersCount) {
      onUpdateGame({ ...activeGame, remainingPlayersCount: remainingCount });
    }

    await AppwriteService.updateGameEntryScoring(entryId, synced);
  };

  const handleConfirmElimination = async (payload: EliminationConfirmPayload) => {
    if (!canEditScorecard || activeGame.status === 'completed') return;
    const targetEntry = gameEntries.find((e) => e.$id === payload.eliminatedEntryId);
    if (!targetEntry) return;

    const activeCount = gameEntries.filter((e) => getEntryStatus(e) === 'ACTIVE').length;
    const finishPos = activeCount;
    const koWinnerEntry = payload.koWinnerPlayerId
      ? gameEntries.find((e) => e.playerId === payload.koWinnerPlayerId)
      : undefined;

    const elimNotification = createEliminationNotification({
      game: activeGame,
      victim: targetEntry,
      killer: koWinnerEntry,
      koType: payload.koType,
      finishPosition: finishPos,
      isMuck: payload.isMuck,
    });
    const nextEntriesSnapshot = gameEntries.map((entry) => {
      if (entry.$id === targetEntry.$id) {
        return syncEntryCalculatedFields(
          {
            ...entry,
            status: payload.isMuck ? 'MUCK' : 'ELIMINATED',
            isEliminated: true,
            finishPosition: finishPos,
            eliminatedBySeat: koWinnerEntry?.seatNumber,
            knockedOutByPlayerId: koWinnerEntry?.playerId,
            knockedOutByPlayerName: koWinnerEntry?.playerName,
          },
          activeGame
        );
      }
      if (koWinnerEntry && payload.koType && entry.$id === koWinnerEntry.$id) {
        const nextKOs: KnockoutCode[] = [...(entry.knockouts || []), payload.koType];
        return syncEntryCalculatedFields(
          { ...entry, knockouts: nextKOs, kosCount: nextKOs.length },
          activeGame
        );
      }
      return entry;
    });
    onRecordLocalEntriesSnapshot?.(activeGame.$id, nextEntriesSnapshot);
    onEmitScoreEvent?.(elimNotification);

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
    if (!canFinalizeTournament || activeGame.status === 'completed') return;
    const finalizedEntries = gameEntries.map((entry) => {
      const res = results.find((r) => r.entryId === entry.$id);
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
    });
    onRecordLocalEntriesSnapshot?.(activeGame.$id, finalizedEntries);

    const winner = results.find((r) => r.finishPosition === 1 && r.status !== 'MUCK');
    if (winner) {
      const winnerEntry = gameEntries.find((e) => e.$id === winner.entryId);
      onEmitScoreEvent?.(
        createPlacementNotification({
          game: activeGame,
          playerId: winner.playerId,
          playerName: winnerEntry?.playerName || 'Champion',
          finishPosition: 1,
          pointsAwarded: winner.finalPoints,
        })
      );
    }

    await AppwriteService.finalizeTournament(activeGame.$id, results);
    void AppwriteService.saveGameClockState(activeGame.$id, {
      status: 'completed',
      currentLevelIndex,
      secondsRemainingInLevel: 0,
      levelDurationOverrides: activeGame.levelDurationOverrides,
    });
    onTournamentFinalized?.(results);

    onUpdateGame({
      ...liveGame,
      status: 'completed',
      secondsRemainingInLevel: 0,
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
            <Badge variant={canEditScorecard ? 'success' : 'secondary'}>
              <SlidersHorizontal className="w-3 h-3" />{' '}
              {canEditScorecard ? 'DIRECTOR CONTROL CENTER' : 'LIVE TOURNAMENT VIEW'}
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
            {(activeGame.purpleCount ?? 0) > 0 && (
              <Badge
                variant="purple"
                title={`Scorecard turn-in accounting: ${activeGame.purpleCount} bar-spend chip(s) × $${BAR_SPEND_PER_BONUS_CHIP_USD} (+${((activeGame.purpleCount ?? 0) * BAR_BONUS_CHIP_VALUE) / 1000}k bonus chips)`}
              >
                <Coins className="w-3 h-3" /> Bar Chips: {activeGame.purpleCount} ($
                {((activeGame.purpleCount ?? 0) * BAR_SPEND_PER_BONUS_CHIP_USD).toLocaleString()})
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
              game={liveGame}
              entries={gameEntries}
              canEdit={canEditScorecard}
              onSelectEntry={(entryId) => setScoringEntryId(entryId)}
            />
          ) : (
            <>
              <SessionRulesBar
                game={liveGame}
                players={players}
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
                game={liveGame}
                entries={gameEntries}
                canEdit={canEditScorecard}
                highlightedPlayers={highlightedPlayers}
                onUpdateEntry={handleUpdateEntryScoring}
                onRequestScorePlayer={(entryId) => setScoringEntryId(entryId)}
                onRequestEliminate={(entry) => setSelectedEntryToEliminate(entry)}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="cockpit" className="space-y-6 mt-4">
          
          {/* Interactive Blind Clock Console */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1">
                  <Sparkles className="w-4 h-4" /> LEVEL {currentLevel.level} {currentLevel.isBreak && '(BREAK)'}
                </span>
                <Badge
                  variant={hasReachedShowUpCutoff(liveGame) ? 'success' : 'secondary'}
                  className="text-[10px] font-bold tracking-normal normal-case"
                >
                  {hasReachedShowUpCutoff(liveGame)
                    ? 'Show Up (+600) Awarded (1:15 Passed)'
                    : 'Show Up (+600) Unlocks at 1:15 Mark'}
                </Badge>
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
                {formatClockTime(secondsLeft)}
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

            {/* Timer Controls & Manual Blind Time Override (Mobile-First Stack -> Desktop Inline Console) */}
            <div className="flex flex-col md:flex-row md:flex-wrap items-stretch md:items-center justify-center gap-2.5 sm:gap-3">
              {canManageClock ? (
                <>
                  <button
                    type="button"
                    onClick={handleToggleTimer}
                    className={`min-h-[48px] w-full md:w-auto px-6 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                      isRunning
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                    }`}
                  >
                    {isRunning ? <Pause className="w-5 h-5 fill-slate-950" /> : <Play className="w-5 h-5 fill-slate-950" />}
                    <span>{isRunning ? 'PAUSE CLOCK' : 'START CLOCK'}</span>
                  </button>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAdjustSeconds(-60)}
                      className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                    >
                      <Minus className="w-4 h-4" /> -1 Min
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAdjustSeconds(60)}
                      className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                    >
                      <Plus className="w-4 h-4" /> +1 Min
                    </button>

                    <button
                      type="button"
                      onClick={handleSkipLevel}
                      className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                    >
                      <SkipForward className="w-4 h-4" /> Skip Level
                    </button>

                    <button
                      type="button"
                      onClick={handleResetLevel}
                      className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                      title="Reset Level Timer"
                      aria-label="Reset Level Timer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span className="md:hidden">Reset</span>
                    </button>
                  </div>

                  <form
                    onSubmit={handleManualTimeOverride}
                    className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 md:border-l border-slate-800 md:pl-3"
                  >
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="120"
                      step="1"
                      value={overrideMinutesInput}
                      onChange={(e) => setOverrideMinutesInput(e.target.value)}
                      placeholder={`${currentLevel.durationMinutes}m`}
                      aria-label="Override blind duration in minutes"
                      className="flex-1 md:flex-none md:w-20 h-11 rounded-xl bg-slate-950 border border-slate-700 px-3 text-sm md:text-xs font-mono font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <Button type="submit" size="sm" variant="outline" className="h-11 px-4 text-xs shrink-0">
                      Set Mins
                    </Button>
                  </form>
                </>
              ) : (
                <div className="text-xs text-slate-400 font-semibold px-4 py-2.5 bg-slate-900 rounded-xl border border-slate-800 text-center">
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
                {canSeatPlayers && activeGame.status !== 'completed' && (
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
                )}
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
              {gameEntries.map((entry) => {
                const highlight = highlightedPlayers?.get(entry.playerId);
                return (
                <div
                  key={entry.$id}
                  className={`p-3.5 rounded-xl border flex flex-col gap-2.5 transition-all ${
                    highlight
                      ? 'bg-amber-500/10 border-amber-400 player-award-highlight'
                      : entry.isEliminated
                      ? 'bg-slate-950/60 border-slate-900 opacity-50'
                      : 'bg-slate-900/90 border-slate-800 hover:border-amber-500/40'
                  }`}
                >
                  {highlight && (
                    <div className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400/50 text-[11px] font-extrabold text-amber-200 flex items-center justify-between gap-2">
                      <span className="truncate">{highlight.headline}</span>
                      {highlight.pointsAwarded > 0 && (
                        <span className="font-mono text-amber-300 shrink-0">
                          +{highlight.pointsAwarded.toLocaleString()} pts
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
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
                            email: '',
                            role: 'player',
                            totalPoints: 0,
                            careerWins: 0,
                            careerKOs: entry.kosCount,
                            gamesPlayed: 0,
                            suitIcon: entry.playerSuitIcon || 'spades',
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
                        className="h-10 px-3.5 text-xs font-bold flex-1 sm:flex-none"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        {entry.isEliminated ? 'Edit Player' : 'All Actions'}
                      </Button>
                    )}
                  </div>
                  </div>

                  {canEditScorecard &&
                    activeGame.status !== 'completed' &&
                    !entry.isEliminated &&
                    getEntryStatus(entry) === 'ACTIVE' && (
                      <QuickScoreStrip
                        entry={entry}
                        onAwardHandBonus={(target, code: HandBonusCode) => {
                          const next = [...getEntryHandBonuses(target), code];
                          void handleUpdateEntryScoring(target.$id, { handBonuses: next });
                        }}
                        onRequestBustOut={(target) => setSelectedEntryToEliminate(target)}
                      />
                    )}
                </div>
                );
              })}
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

      {/* 1. RSVP & Walk-in Player Seating Modal (Staff Only) */}
      {canSeatPlayers && (
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
      )}

      {/* 2. Mobile-Friendly Unified Player Actions & Points Dialog (Staff Only) */}
      {canEditScorecard && (
        <PlayerScoreDialog
          isOpen={Boolean(scoringEntryId)}
          game={liveGame}
          entries={gameEntries}
          selectedEntryId={scoringEntryId}
          onSelectEntryId={(entryId) => setScoringEntryId(entryId)}
          onClose={() => setScoringEntryId(null)}
          onUpdateEntry={handleUpdateEntryScoring}
          onAdjustRebuys={handleAdjustRebuys}
          onAdjustAddons={handleAdjustAddons}
          onRequestEliminate={(entry) => setSelectedEntryToEliminate(entry)}
        />
      )}

      {/* 3. Accessible Elimination & Knockout Audit Dialog (Staff Only) */}
      {canEditScorecard && (
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
      )}

      {/* 4. Official Finalization & Scoring Preview Dialog (Admin & Manager Only) */}
      {canFinalizeTournament && (
        <FinalizeTournamentDialog
          isOpen={isFinalizeDialogOpen}
          game={liveGame}
          entries={gameEntries}
          onClose={() => setIsFinalizeDialogOpen(false)}
          onConfirmFinalize={handleConfirmFinalization}
        />
      )}

    </div>
  );
};
