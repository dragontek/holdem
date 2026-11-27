import { useEffect, useMemo, useRef, useState } from 'react';
import type { Game } from '@/types/holdem';
import {
  applyLevelDurationOverrides,
  computeLiveClockState,
  getServerNowMs,
  subscribeServerClockOffset,
  type ComputedLiveClock,
} from '@/lib/gameClock';

interface UseGameClockOptions {
  /**
   * Optional callback fired once whenever the backend-anchored live clock
   * naturally advances to a higher blind level while running.
   */
  onLevelAdvanced?: (prevLevelIndex: number, nextLevelIndex: number, secondsRemaining: number) => void;
}

/**
 * Backend-authoritative tournament clock hook.
 *
 * Derives `(currentLevelIndex, secondsRemainingInLevel, isRunning)` purely from
 * the game's backend anchor (`status`, `currentLevelIndex`, `secondsRemainingInLevel`,
 * `clockAnchorAt`) and the calibrated server time. Polls every 250ms while running
 * so all connected browsers transition seconds within <= 250ms of each other and
 * recover instantaneously from background-tab throttling or sleep.
 */
export function useGameClock(game: Game, options?: UseGameClockOptions) {
  const [serverNowMs, setServerNowMs] = useState<number>(() => getServerNowMs());
  const onLevelAdvancedRef = useRef(options?.onLevelAdvanced);

  useEffect(() => {
    onLevelAdvancedRef.current = options?.onLevelAdvanced;
  });

  // Refresh immediately when server clock offset updates or tab regains focus/visibility
  useEffect(() => {
    const syncNow = () => setServerNowMs(getServerNowMs());
    const unsubOffset = subscribeServerClockOffset(syncNow);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') syncNow();
    };
    window.addEventListener('focus', syncNow);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      unsubOffset();
      window.removeEventListener('focus', syncNow);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Fast 250ms UI tick ONLY while running (pure read, zero writes!)
  useEffect(() => {
    if (game.status !== 'running') return;
    const interval = setInterval(() => {
      setServerNowMs(getServerNowMs());
    }, 250);
    return () => clearInterval(interval);
  }, [game.status, game.$id, game.clockAnchorAt]);

  const effectiveSchedule = useMemo(
    () => applyLevelDurationOverrides(game.blindSchedule, game.levelDurationOverrides),
    [game.blindSchedule, game.levelDurationOverrides]
  );

  const computed: ComputedLiveClock = useMemo(
    () =>
      computeLiveClockState(
        {
          status: game.status,
          currentLevelIndex: game.currentLevelIndex,
          secondsRemainingInLevel: game.secondsRemainingInLevel,
          clockAnchorAt: game.clockAnchorAt,
          blindSchedule: effectiveSchedule,
          levelDurationOverrides: game.levelDurationOverrides,
        },
        serverNowMs
      ),
    [
      game.status,
      game.currentLevelIndex,
      game.secondsRemainingInLevel,
      game.clockAnchorAt,
      game.levelDurationOverrides,
      effectiveSchedule,
      serverNowMs,
    ]
  );

  // Detect natural level advances for Show-Up cutoff or optional chimes
  const prevTrackRef = useRef<{ gameId: string; levelIdx: number }>({
    gameId: game.$id,
    levelIdx: computed.currentLevelIndex,
  });

  useEffect(() => {
    const prev = prevTrackRef.current;
    if (prev.gameId !== game.$id) {
      prevTrackRef.current = { gameId: game.$id, levelIdx: computed.currentLevelIndex };
      return;
    }
    if (game.status === 'running' && computed.currentLevelIndex > prev.levelIdx) {
      const oldIdx = prev.levelIdx;
      prevTrackRef.current = { gameId: game.$id, levelIdx: computed.currentLevelIndex };
      onLevelAdvancedRef.current?.(
        oldIdx,
        computed.currentLevelIndex,
        computed.secondsRemainingInLevel
      );
    } else if (computed.currentLevelIndex !== prev.levelIdx) {
      prevTrackRef.current = { gameId: game.$id, levelIdx: computed.currentLevelIndex };
    }
  }, [game.$id, game.status, computed.currentLevelIndex, computed.secondsRemainingInLevel]);

  const currentLevel = effectiveSchedule[computed.currentLevelIndex] || effectiveSchedule[0];
  const nextLevel = effectiveSchedule[computed.currentLevelIndex + 1];

  return {
    currentLevelIndex: computed.currentLevelIndex,
    secondsRemaining: computed.secondsRemainingInLevel,
    isRunning: computed.isRunning,
    isFinished: computed.isFinished,
    currentLevel,
    nextLevel,
    effectiveSchedule,
  };
}
