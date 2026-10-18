import React, { useState, useEffect } from 'react';
import type { Game, GameEntry, Player, Venue, Season } from '../types/holdem';
import { AppwriteService } from '../services/appwriteService';
import { PlayerSeatingModal } from './PlayerSeatingModal';
import { EventScheduleModal } from './EventScheduleModal';
import { VenueManagerModal } from './VenueManagerModal';
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
  UserMinus,
  UserPlus,
  Sparkles,
  Award,
  Calendar,
  Building2,
  Edit3,
  ExternalLink,
  Trophy
} from 'lucide-react';

interface DirectorDeskProps {
  activeGame: Game;
  gameEntries: GameEntry[];
  players: Player[];
  venues: Venue[];
  seasons: Season[];
  allGames: Game[];
  onUpdateGame: (updatedGame: Game) => void;
  onEliminatePlayer: (entryId: string, koByPlayerId?: string) => void;
  onSelectGame: (game: Game) => void;
  onVenuesChange: (venues: Venue[]) => void;
  onGamesChange: (games: Game[]) => void;
  onEntriesChange: (entries: GameEntry[]) => void;
}

export const DirectorDesk: React.FC<DirectorDeskProps> = ({
  activeGame,
  gameEntries,
  players,
  venues,
  seasons,
  allGames,
  onUpdateGame,
  onEliminatePlayer,
  onSelectGame,
  onVenuesChange,
  onGamesChange,
  onEntriesChange,
}) => {
  const [activeTab, setActiveTab] = useState<'live' | 'schedules' | 'venues'>('live');

  // Clock state
  const [isRunning, setIsRunning] = useState<boolean>(activeGame.status === 'running');
  const [currentLevelIndex, setCurrentLevelIndex] = useState<number>(activeGame.currentLevelIndex);
  const [secondsLeft, setSecondsLeft] = useState<number>(activeGame.secondsRemainingInLevel);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Modals state
  const [selectedEntryToEliminate, setSelectedEntryToEliminate] = useState<GameEntry | null>(null);
  const [koWinnerPlayerId, setKoWinnerPlayerId] = useState<string>('');
  const [isSeatingModalOpen, setIsSeatingModalOpen] = useState<boolean>(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState<boolean>(false);
  const [gameToEdit, setGameToEdit] = useState<Game | null>(null);
  const [isVenueModalOpen, setIsVenueModalOpen] = useState<boolean>(false);
  const [isFinalizing, setIsFinalizing] = useState<boolean>(false);
  const [finalSuccessMsg, setFinalSuccessMsg] = useState<string>('');

  const currentLevel = activeGame.blindSchedule[currentLevelIndex] || activeGame.blindSchedule[0];
  const nextLevel = activeGame.blindSchedule[currentLevelIndex + 1];

  // Sync clock if activeGame changes
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
    const finishPos = activeCount; // finishes in current place

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
    const activeEntries = gameEntries.filter((e) => !e.isEliminated);
    const eliminatedEntries = gameEntries.filter((e) => e.isEliminated).sort((a, b) => (a.finishPosition || 99) - (b.finishPosition || 99));

    // Award winner to remaining active player
    const results: { entryId: string; playerId: string; finishPosition: number; points: number }[] = [];

    activeEntries.forEach((entry, idx) => {
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
    setFinalSuccessMsg('Tournament finalized! Season points & career wins have been saved to Appwrite.');
    setTimeout(() => setFinalSuccessMsg(''), 8000);
  };

  // Financial Calculations
  const activeEntries = gameEntries.filter((ge) => !ge.isEliminated);
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
      
      {/* 1. Director Header & Tab Switcher */}
      <div className="glass-panel rounded-2xl p-5 border border-emerald-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5" /> DIRECTOR CONTROL CENTER
            </span>
            <span className="text-xs text-slate-400">{activeGame.venueName}</span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1">{activeGame.title}</h1>
        </div>

        {/* Manager Mode Tabs */}
        <div className="flex items-center bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('live')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'live'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Play className="w-3.5 h-3.5" /> Live Tournament
          </button>

          <button
            onClick={() => setActiveTab('schedules')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'schedules'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" /> Event Schedules
          </button>

          <button
            onClick={() => setActiveTab('venues')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'venues'
                ? 'bg-indigo-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" /> Venues
          </button>
        </div>
      </div>

      {finalSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>{finalSuccessMsg}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 1: LIVE TOURNAMENT CONTROL DESK                      */}
      {/* ======================================================== */}
      {activeTab === 'live' && (
        <div className="space-y-6">
          
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
                  <span className="text-xs text-slate-400 block uppercase">Small / Big Blind</span>
                  <span className="text-2xl font-black text-amber-400">
                    {currentLevel.smallBlind} / {currentLevel.bigBlind}
                  </span>
                </div>

                {currentLevel.ante > 0 && (
                  <div>
                    <span className="text-xs text-slate-400 block uppercase">Big Blind Ante</span>
                    <span className="text-2xl font-black text-indigo-300">
                      {currentLevel.ante}
                    </span>
                  </div>
                )}

                {nextLevel && (
                  <div className="border-l border-slate-700 pl-6">
                    <span className="text-xs text-slate-400 block uppercase">Next Level ({nextLevel.level})</span>
                    <span className="text-sm font-bold text-slate-300">
                      {nextLevel.smallBlind} / {nextLevel.bigBlind}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Timer Controls */}
            <div className="flex flex-wrap items-center justify-center gap-3">
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
                onClick={handleAddMinute}
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all"
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
            </div>
          </div>

          {/* Seating Matrix & Player Management */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-400" /> Active Tables & Seating ({activeEntries.length} remaining of {gameEntries.length})
                </h2>
                <p className="text-xs text-slate-400">Track chip re-buys, add-ons, and record knockout bounties in real time</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSeatingModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
                >
                  <UserPlus className="w-4 h-4" /> Seat Player
                </button>
                <button
                  onClick={handleFinalizeTournament}
                  disabled={isFinalizing || activeGame.status === 'completed'}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <Trophy className="w-4 h-4" /> {activeGame.status === 'completed' ? 'Tournament Finalized' : 'Finalize Event'}
                </button>
              </div>
            </div>

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
                    <div>
                      <h4 className={`font-bold text-sm ${entry.isEliminated ? 'line-through text-slate-500' : 'text-white'}`}>
                        {entry.playerName}
                      </h4>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2">
                        <span>KOs: <strong className="text-amber-400">{entry.kosCount}</strong></span>
                        <span>•</span>
                        <span>Rebuys: <strong className="text-emerald-400">{entry.rebuysCount}</strong></span>
                        <span>•</span>
                        <span>Addons: <strong className="text-indigo-400">{entry.addonsCount}</strong></span>
                      </div>
                    </div>
                  </div>

                  {!entry.isEliminated ? (
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {/* Rebuy Stepper */}
                      <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800 p-0.5">
                        <button
                          onClick={() => handleAdjustRebuys(entry.$id, -1)}
                          className="p-1 text-slate-400 hover:text-white"
                          title="Subtract Rebuy"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-[10px] font-bold text-emerald-400 px-1.5">RB</span>
                        <button
                          onClick={() => handleAdjustRebuys(entry.$id, 1)}
                          className="p-1 text-slate-400 hover:text-white"
                          title="Add Rebuy ($20)"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Addon Stepper */}
                      <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800 p-0.5">
                        <button
                          onClick={() => handleAdjustAddons(entry.$id, -1)}
                          className="p-1 text-slate-400 hover:text-white"
                          title="Subtract Addon"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-[10px] font-bold text-indigo-400 px-1.5">AO</span>
                        <button
                          onClick={() => handleAdjustAddons(entry.$id, 1)}
                          className="p-1 text-slate-400 hover:text-white"
                          title="Add Add-on ($10)"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Bust Out Button */}
                      <button
                        onClick={() => setSelectedEntryToEliminate(entry)}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center gap-1 transition-all"
                      >
                        <UserMinus className="w-3.5 h-3.5" /> Bust
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-rose-400 font-bold self-end sm:self-center">
                      Bust #{entry.finishPosition}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Financial Summary Breakdown */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" /> Payout Structure Breakdown
              </h2>
              <span className="text-sm font-black text-emerald-400">Total Prize Pool: ${totalPrizePool}</span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl">
                <div className="text-xs text-amber-400 font-bold uppercase">1st Place (50%)</div>
                <div className="text-2xl font-black text-amber-300 mt-1">${firstPlacePayout}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <div className="text-xs text-slate-400 font-bold uppercase">2nd Place (30%)</div>
                <div className="text-xl font-black text-white mt-1">${secondPlacePayout}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <div className="text-xs text-slate-400 font-bold uppercase">3rd Place (20%)</div>
                <div className="text-xl font-black text-slate-300 mt-1">${thirdPlacePayout}</div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: TOURNAMENT EVENT SCHEDULES                        */}
      {/* ======================================================== */}
      {activeTab === 'schedules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-white">Event Schedules & Calendar</h2>
              <p className="text-xs text-slate-400">Manage poker tournaments across the league season</p>
            </div>

            <button
              onClick={() => {
                setGameToEdit(null);
                setIsScheduleModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
            >
              <Plus className="w-4 h-4" /> Schedule Tournament
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allGames.map((game) => (
              <div
                key={game.$id}
                className={`p-5 rounded-2xl border transition-all ${
                  game.$id === activeGame.$id
                    ? 'glass-panel border-emerald-500/50 shadow-lg'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full border ${
                          game.status === 'running'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse'
                            : game.status === 'completed'
                            ? 'bg-slate-800 text-slate-400 border-slate-700'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {game.status}
                      </span>
                      <span className="text-xs text-slate-400">{game.venueName}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white mt-1">{game.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{game.scheduledAt}</p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Buy-in</span>
                    <span className="text-lg font-black text-emerald-400">${game.buyinAmount}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <div>
                    {game.totalPlayersCount} Players • {game.startingChips.toLocaleString()} Chips
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setGameToEdit(game);
                        setIsScheduleModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1 border border-slate-700"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-400" /> Edit
                    </button>

                    <button
                      onClick={() => {
                        onSelectGame(game);
                        setActiveTab('live');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                        game.$id === activeGame.$id
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {game.$id === activeGame.$id ? 'Active Desk' : 'Open in Desk'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: VENUES MANAGEMENT                                 */}
      {/* ======================================================== */}
      {activeTab === 'venues' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-white">League Host Venues</h2>
              <p className="text-xs text-slate-400">Manage partner host bars, cardrooms, and venues</p>
            </div>

            <button
              onClick={() => setIsVenueModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
            >
              <Plus className="w-4 h-4" /> Add / Manage Venues
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {venues.map((venue) => (
              <div
                key={venue.$id}
                className="glass-card rounded-2xl p-5 border border-slate-800 flex flex-col justify-between space-y-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
                    {venue.imageUrl ? (
                      <img src={venue.imageUrl} alt={venue.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500">
                        <Building2 className="w-8 h-8" />
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white">{venue.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">{venue.address}</p>
                    {venue.phone && <p className="text-xs text-slate-500 mt-0.5">{venue.phone}</p>}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  {venue.website ? (
                    <a
                      href={venue.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      Visit Website <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-xs text-slate-500">No website</span>
                  )}

                  <button
                    onClick={() => setIsVenueModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1 border border-slate-700"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-400" /> Edit Venue
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALS                                                   */}
      {/* ======================================================== */}

      {/* 1. Walk-in Player Seating Modal */}
      <PlayerSeatingModal
        isOpen={isSeatingModalOpen}
        onClose={() => setIsSeatingModalOpen(false)}
        availablePlayers={players}
        currentEntries={gameEntries}
        onConfirmSeat={handleSeatPlayer}
      />

      {/* 2. Event Schedule Modal */}
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
            onGamesChange(allGames.map((g) => (g.$id === savedGame.$id ? savedGame : g)));
            if (activeGame.$id === savedGame.$id) {
              onUpdateGame(savedGame);
            }
          } else {
            onGamesChange([savedGame, ...allGames]);
          }
        }}
        onGameDeleted={(deletedId) => {
          onGamesChange(allGames.filter((g) => g.$id !== deletedId));
          if (activeGame.$id === deletedId && allGames.length > 1) {
            const fallback = allGames.find((g) => g.$id !== deletedId);
            if (fallback) onSelectGame(fallback);
          }
        }}
      />

      {/* 3. Venue Manager Modal */}
      <VenueManagerModal
        isOpen={isVenueModalOpen}
        onClose={() => setIsVenueModalOpen(false)}
        venues={venues}
        onVenuesChange={onVenuesChange}
      />

      {/* 4. Elimination Modal */}
      {selectedEntryToEliminate && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-white">Record Bust-out for {selectedEntryToEliminate.playerName}</h3>
            <p className="text-xs text-slate-400">Select the player who delivered the knockout (KO bounty):</p>

            <select
              value={koWinnerPlayerId}
              onChange={(e) => setKoWinnerPlayerId(e.target.value)}
              className="w-full bg-slate-900 text-white text-sm p-3 rounded-xl border border-slate-800"
            >
              <option value="">No KO Bounty Awarded</option>
              {gameEntries
                .filter((ge) => !ge.isEliminated && ge.$id !== selectedEntryToEliminate.$id)
                .map((ge) => (
                  <option key={ge.playerId} value={ge.playerId}>
                    KO by: {ge.playerName}
                  </option>
                ))}
            </select>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedEntryToEliminate(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmElimination}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold"
              >
                Confirm Bust Out
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
