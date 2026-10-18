import React, { useState, useEffect } from 'react';
import type { Game, GameEntry, Player } from '../types/holdem';
import { AppwriteService } from '../services/appwriteService';
import { 
  Play, 
  Pause, 
  SkipForward, 
  Plus, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Users, 
  SlidersHorizontal, 
  DollarSign, 
  CheckCircle2,
  XCircle,
  UserMinus,
  Sparkles,
  AlertTriangle,
  Award
} from 'lucide-react';

interface DirectorDeskProps {
  activeGame: Game;
  gameEntries: GameEntry[];
  players: Player[];
  onUpdateGame: (updatedGame: Game) => void;
  onEliminatePlayer: (entryId: string, koByPlayerId?: string) => void;
}

export const DirectorDesk: React.FC<DirectorDeskProps> = ({
  activeGame,
  gameEntries,
  players,
  onUpdateGame,
  onEliminatePlayer,
}) => {
  const [isRunning, setIsRunning] = useState<boolean>(activeGame.status === 'running');
  const [currentLevelIndex, setCurrentLevelIndex] = useState<number>(activeGame.currentLevelIndex);
  const [secondsLeft, setSecondsLeft] = useState<number>(activeGame.secondsRemainingInLevel);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [selectedEntryToEliminate, setSelectedEntryToEliminate] = useState<GameEntry | null>(null);
  const [koWinnerPlayerId, setKoWinnerPlayerId] = useState<string>('');

  const currentLevel = activeGame.blindSchedule[currentLevelIndex] || activeGame.blindSchedule[0];
  const nextLevel = activeGame.blindSchedule[currentLevelIndex + 1];

  // Sync local clock state if activeGame prop changes from Appwrite / WebSockets
  useEffect(() => {
    if (activeGame) {
      setCurrentLevelIndex(activeGame.currentLevelIndex || 0);
      setSecondsLeft(activeGame.secondsRemainingInLevel || 900);
      setIsRunning(activeGame.status === 'running');
    }
  }, [activeGame.$id]);

  // Timer Tick Engine with App.tsx & Appwrite Sync
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => {
          const nextSec = prev > 0 ? prev - 1 : 0;
          // Notify parent state every tick
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
      // Auto advance to next level
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

  // Periodically persist running clock to Appwrite every 5 seconds
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

  // Financial Calculations
  const activeEntries = gameEntries.filter(ge => !ge.isEliminated);
  const totalBuyins = gameEntries.reduce((sum, ge) => sum + ge.buyinsCount, 0);
  const totalRebuys = gameEntries.reduce((sum, ge) => sum + ge.rebuysCount, 0);
  const totalAddons = gameEntries.reduce((sum, ge) => sum + ge.addonsCount, 0);

  const totalPrizePool = (totalBuyins * activeGame.buyinAmount) + 
                         (totalRebuys * activeGame.rebuyAmount) + 
                         (totalAddons * activeGame.addonAmount);

  const firstPlacePayout = (totalPrizePool * 0.5).toFixed(0);
  const secondPlacePayout = (totalPrizePool * 0.3).toFixed(0);
  const thirdPlacePayout = (totalPrizePool * 0.2).toFixed(0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 pb-24 md:pb-12">
      
      {/* 1. Director Header */}
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

        {/* Quick Financial Summary Pill */}
        <div className="flex items-center gap-3 bg-slate-900/90 px-4 py-2 rounded-xl border border-slate-800">
          <DollarSign className="w-6 h-6 text-emerald-400" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold">Total Prize Pool</div>
            <div className="text-xl font-black text-emerald-400">${totalPrizePool}</div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Blind Clock Console */}
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

        {/* Big Digital Clock Display */}
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

        {/* Timer Control Buttons */}
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
        </div>
      </div>

      {/* 3. Seating Matrix & Player Bust-out Desk */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" /> Seating Chart & Active Players ({activeEntries.length} Remaining)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {gameEntries.map((entry) => (
            <div
              key={entry.$id}
              className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                entry.isEliminated
                  ? 'bg-slate-950/60 border-slate-900 opacity-50'
                  : 'bg-slate-900/90 border-slate-800 hover:border-amber-500/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-amber-400">
                  T{entry.tableNumber}S{entry.seatNumber}
                </div>
                <div>
                  <h4 className={`font-bold text-sm ${entry.isEliminated ? 'line-through text-slate-500' : 'text-white'}`}>
                    {entry.playerName}
                  </h4>
                  <div className="text-[10px] text-slate-400">
                    KOs: {entry.kosCount} • Rebuys: {entry.rebuysCount}
                  </div>
                </div>
              </div>

              {!entry.isEliminated ? (
                <button
                  onClick={() => setSelectedEntryToEliminate(entry)}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center gap-1 transition-all"
                >
                  <UserMinus className="w-3.5 h-3.5" /> Bust Out
                </button>
              ) : (
                <span className="text-xs text-rose-400 font-bold">
                  Bust #{entry.finishPosition}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 4. Automated Payout Calculator */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" /> Payout Structure Breakdown
        </h2>

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

      {/* Elimination Modal */}
      {selectedEntryToEliminate && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-white">Record Bust-out for {selectedEntryToEliminate.playerName}</h3>
            <p className="text-xs text-slate-400">Select the player who delivered the knockout (KO bounty):</p>

            <select
              value={koWinnerPlayerId}
              onChange={(e) => setKoWinnerPlayerId(e.target.value)}
              className="w-full bg-slate-900 text-white text-sm p-3 rounded-xl border border-slate-800"
            >
              <option value="">No KO Bounty Awarded</option>
              {gameEntries.filter(ge => !ge.isEliminated && ge.$id !== selectedEntryToEliminate.$id).map(ge => (
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
                onClick={() => {
                  onEliminatePlayer(selectedEntryToEliminate.$id, koWinnerPlayerId);
                  setSelectedEntryToEliminate(null);
                }}
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
