import React from 'react';
import type { BlindLevel } from '@/types/holdem';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  Pause, 
  SkipForward, 
  Plus, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Sparkles 
} from 'lucide-react';

export interface GameClockConsoleProps {
  currentLevel: BlindLevel;
  nextLevel?: BlindLevel;
  secondsLeft: number;
  isRunning: boolean;
  soundEnabled: boolean;
  canManageClock: boolean;
  onToggleTimer: () => void;
  onSkipLevel: () => void;
  onAddMinute: () => void;
  onResetLevel: () => void;
  onToggleSound: () => void;
  formatTime: (totalSeconds: number) => string;
}

export const GameClockConsole: React.FC<GameClockConsoleProps> = ({
  currentLevel,
  nextLevel,
  secondsLeft,
  isRunning,
  soundEnabled,
  canManageClock,
  onToggleTimer,
  onSkipLevel,
  onAddMinute,
  onResetLevel,
  onToggleSound,
  formatTime,
}) => {
  return (
    <div className="bg-slate-900/60 rounded-2xl p-6 border border-slate-800 space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
          <Sparkles className="w-4 h-4" /> LEVEL {currentLevel.level} {currentLevel.isBreak && '(BREAK)'}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={onToggleSound}
          className={`text-xs gap-1.5 cursor-pointer ${
            soundEnabled
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
              : 'text-slate-400'
          }`}
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          <span>{soundEnabled ? 'Sound On' : 'Muted'}</span>
        </Button>
      </div>

      {/* Digital Clock Display */}
      <div className="text-center py-6 felt-gradient rounded-2xl border border-emerald-500/40 shadow-inner">
        <div className="text-6xl md:text-8xl font-mono font-black tracking-tight text-white drop-shadow-lg select-none">
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
            <div className="border-l border-slate-700/80 pl-6 text-left">
              <span className="text-xs text-slate-400 block uppercase">Next Level ({nextLevel.level})</span>
              <span className="text-sm font-bold text-slate-300">
                {nextLevel.smallBlind} / {nextLevel.bigBlind}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Timer Action Controls */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {canManageClock ? (
          <>
            <Button
              variant={isRunning ? 'default' : 'success'}
              size="lg"
              onClick={onToggleTimer}
              className="px-6 font-black cursor-pointer shadow-lg"
            >
              {isRunning ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isRunning ? 'PAUSE CLOCK' : 'START CLOCK'}</span>
            </Button>

            <Button
              variant="outline"
              size="default"
              onClick={onAddMinute}
              className="gap-1.5 cursor-pointer font-bold"
            >
              <Plus className="w-4 h-4" /> +1 Min
            </Button>

            <Button
              variant="outline"
              size="default"
              onClick={onSkipLevel}
              className="gap-1.5 cursor-pointer font-bold"
            >
              <SkipForward className="w-4 h-4" /> Skip Level
            </Button>

            <Button
              variant="outline"
              size="default"
              onClick={onResetLevel}
              className="text-slate-400 hover:text-white cursor-pointer px-3"
              title="Reset Level Timer"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <div className="text-xs text-slate-400 font-semibold px-4 py-2 bg-slate-900 rounded-xl border border-slate-800">
            Clock controls restricted to Game Manager &amp; Dealer
          </div>
        )}
      </div>
    </div>
  );
};
