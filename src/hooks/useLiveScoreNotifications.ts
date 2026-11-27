import { useCallback, useEffect, useRef, useState } from 'react';
import type { Game, GameEntry } from '@/types/holdem';
import { AppwriteService } from '@/services/appwriteService';
import { AppwriteRealtime, extractPayloadGameId } from '@/services/appwriteRealtime';
import {
  diffEntryForScoreEvents,
  playScoreChime,
  type LiveScoreNotification,
} from '@/lib/liveScoreEvents';

const DEDUPE_WINDOW_MS = 8000;
const HIGHLIGHT_DURATION_MS = 9000;
const TV_BANNER_DURATION_MS = 8000;
const MAX_FEED_ITEMS = 15;
const SOUND_PREF_KEY = 'holdem_live_score_sound';

function isAnyModalDialogOpen(): boolean {
  if (typeof document === 'undefined') return false;
  return Boolean(
    document.querySelector('[role="dialog"][data-state="open"], dialog[open]')
  );
}

interface UseLiveScoreNotificationsOptions {
  games: Game[];
  selectedGameId?: string;
  onRemoteEntryUpserted?: (gameId: string, entry: GameEntry, gameEntries: GameEntry[]) => void;
  onRemoteGameUpdated?: (gameId: string, patch: Partial<Game>) => void;
}

export function useLiveScoreNotifications({
  games,
  selectedGameId,
  onRemoteEntryUpserted,
  onRemoteGameUpdated,
}: UseLiveScoreNotificationsOptions) {
  const [toasts, setToasts] = useState<LiveScoreNotification[]>([]);
  const [recentFeed, setRecentFeed] = useState<LiveScoreNotification[]>([]);
  const [tvBannerAlert, setTvBannerAlert] = useState<LiveScoreNotification | null>(null);
  const [highlightedPlayers, setHighlightedPlayers] = useState<Map<string, LiveScoreNotification>>(
    () => new Map()
  );
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SOUND_PREF_KEY) !== 'false';
    } catch {
      return true;
    }
  });

  const gamesRef = useRef<Game[]>(games);
  const selectedGameIdRef = useRef<string | undefined>(selectedGameId);
  const soundEnabledRef = useRef<boolean>(soundEnabled);
  const onRemoteEntryRef = useRef(onRemoteEntryUpserted);
  const onRemoteGameRef = useRef(onRemoteGameUpdated);

  const entriesByGameRef = useRef<Map<string, Map<string, GameEntry>>>(new Map());
  const seenFingerprintsRef = useRef<Map<string, number>>(new Map());
  const recentKillerKoAtRef = useRef<Map<string, number>>(new Map());
  const deferredToastsRef = useRef<LiveScoreNotification[]>([]);
  const highlightTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const tvBannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    gamesRef.current = games;
    selectedGameIdRef.current = selectedGameId;
    soundEnabledRef.current = soundEnabled;
    onRemoteEntryRef.current = onRemoteEntryUpserted;
    onRemoteGameRef.current = onRemoteGameUpdated;
  });

  // Prime baseline entry snapshots across all games so remote diffs work on every view
  useEffect(() => {
    let active = true;
    AppwriteService.getAllGameEntries()
      .then((entries) => {
        if (!active) return;
        for (const entry of entries) {
          if (!entry.gameId) continue;
          let bucket = entriesByGameRef.current.get(entry.gameId);
          if (!bucket) {
            bucket = new Map();
            entriesByGameRef.current.set(entry.gameId, bucket);
          }
          if (!bucket.has(entry.$id)) {
            bucket.set(entry.$id, entry);
          }
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const triggerHighlight = useCallback((playerId: string, notification: LiveScoreNotification) => {
    if (!playerId) return;
    setHighlightedPlayers((prev) => {
      const next = new Map(prev);
      next.set(playerId, notification);
      return next;
    });

    const existingTimer = highlightTimersRef.current.get(playerId);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(() => {
      highlightTimersRef.current.delete(playerId);
      setHighlightedPlayers((prev) => {
        if (!prev.has(playerId)) return prev;
        const next = new Map(prev);
        next.delete(playerId);
        return next;
      });
    }, HIGHLIGHT_DURATION_MS);
    highlightTimersRef.current.set(playerId, timer);
  }, []);

  const ingestNotification = useCallback(
    (notification: LiveScoreNotification, options?: { broadcast?: boolean }) => {
      const now = Date.now();

      // Prune expired fingerprints
      for (const [fp, ts] of seenFingerprintsRef.current.entries()) {
        if (now - ts > DEDUPE_WINDOW_MS) {
          seenFingerprintsRef.current.delete(fp);
        }
      }
      if (seenFingerprintsRef.current.has(notification.fingerprint)) {
        return;
      }

      // Suppress generic "scored a Knockout" when a specific "X knocked Y out!" just fired for X
      if (notification.fingerprint.startsWith('ko:') && !notification.secondaryPlayerName) {
        const lastPairedKo = recentKillerKoAtRef.current.get(notification.primaryPlayerId);
        if (lastPairedKo && now - lastPairedKo < 5000) {
          seenFingerprintsRef.current.set(notification.fingerprint, now);
          return;
        }
      }

      if (notification.secondaryPlayerName && notification.primaryPlayerId) {
        recentKillerKoAtRef.current.set(notification.primaryPlayerId, now);
      }
      seenFingerprintsRef.current.set(notification.fingerprint, now);

      setRecentFeed((prev) => [notification, ...prev].slice(0, MAX_FEED_ITEMS));
      triggerHighlight(notification.primaryPlayerId, notification);

      // Update TV Broadcast Banner immediately
      setTvBannerAlert(notification);
      if (tvBannerTimerRef.current) clearTimeout(tvBannerTimerRef.current);
      tvBannerTimerRef.current = setTimeout(() => {
        setTvBannerAlert((curr) => (curr?.id === notification.id ? null : curr));
      }, TV_BANNER_DURATION_MS);

      if (soundEnabledRef.current) {
        playScoreChime(notification.variant);
      }

      // Queue background toasts if a modal dialog is currently open on this screen
      if (isAnyModalDialogOpen()) {
        deferredToastsRef.current = [...deferredToastsRef.current, notification].slice(-4);
      } else {
        setToasts((prev) => [...prev.slice(-3), notification]);
      }

      if (options?.broadcast) {
        AppwriteRealtime.broadcastScoreNotification(notification);
      }
    },
    [triggerHighlight]
  );

  // Flush queued toasts as soon as an open modal dialog closes
  useEffect(() => {
    if (typeof MutationObserver === 'undefined') return;
    const observer = new MutationObserver(() => {
      if (deferredToastsRef.current.length > 0 && !isAnyModalDialogOpen()) {
        const pending = deferredToastsRef.current;
        deferredToastsRef.current = [];
        setToasts((prev) => [...prev, ...pending].slice(-4));
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['open', 'data-state'],
    });
    return () => observer.disconnect();
  }, []);

  /**
   * Synchronizes local Scribe/Director entry updates into the baseline snapshot BEFORE Appwrite
   * echoes back over WebSocket, preventing duplicate notifications while broadcasting to peers.
   */
  const recordLocalEntriesSnapshot = useCallback(
    (gameId: string, entries: GameEntry[], broadcastChangedEntry?: GameEntry) => {
      const bucket = new Map<string, GameEntry>();
      for (const e of entries) {
        bucket.set(e.$id, e);
      }
      entriesByGameRef.current.set(gameId, bucket);
      if (broadcastChangedEntry) {
        AppwriteRealtime.broadcastEntrySnapshot(
          gameId,
          broadcastChangedEntry as unknown as Record<string, unknown>
        );
      }
    },
    []
  );

  const emitScoreEvent = useCallback(
    (notification: LiveScoreNotification) => {
      ingestNotification(notification, { broadcast: true });
    },
    [ingestNotification]
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SOUND_PREF_KEY, String(next));
      } catch {}
      return next;
    });
  }, []);

  // Subscribe to Appwrite Realtime + cross-tab BroadcastChannel
  useEffect(() => {
    const handleIncomingEntryPayload = (rawPayload: Record<string, unknown>, explicitGameId?: string) => {
      const mapped = AppwriteService.mapRealtimeGameEntry(rawPayload);
      const gameId = explicitGameId || mapped.gameId || extractPayloadGameId(rawPayload);
      if (!gameId || !mapped.$id) return;

      const normalizedEntry: GameEntry = { ...mapped, gameId };
      let bucket = entriesByGameRef.current.get(gameId);
      if (!bucket) {
        bucket = new Map();
        entriesByGameRef.current.set(gameId, bucket);
      }
      const prevEntry = bucket.get(normalizedEntry.$id);
      bucket.set(normalizedEntry.$id, normalizedEntry);

      const allForGame = Array.from(bucket.values());
      const game = gamesRef.current.find((g) => g.$id === gameId);
      if (game && prevEntry) {
        const diffed = diffEntryForScoreEvents(prevEntry, normalizedEntry, game, allForGame);
        for (const ev of diffed) {
          ingestNotification(ev, { broadcast: false });
        }
      }

      onRemoteEntryRef.current?.(gameId, normalizedEntry, allForGame);
    };

    const unsubEntries = AppwriteRealtime.subscribeToAllGameEntries(({ event, payload }) => {
      if (event.endsWith('.delete')) return;
      handleIncomingEntryPayload(payload);
    });

    const unsubGames = AppwriteRealtime.subscribeToAllGames(({ event, payload }) => {
      if (event.endsWith('.delete') || typeof payload.$id !== 'string') return;
      const patch: Partial<Game> = {};
      if (typeof payload.status === 'string') patch.status = payload.status as Game['status'];
      if (typeof payload.currentLevelIndex === 'number') patch.currentLevelIndex = payload.currentLevelIndex;
      if (typeof payload.secondsRemainingInLevel === 'number') {
        patch.secondsRemainingInLevel = payload.secondsRemainingInLevel;
      }
      if (typeof payload.pointMultiplier === 'number') {
        patch.pointMultiplier = payload.pointMultiplier as Game['pointMultiplier'];
      }
      if (typeof payload.isDayGame === 'boolean') patch.isDayGame = payload.isDayGame;
      if (typeof payload.noGamePlayed === 'boolean') patch.noGamePlayed = payload.noGamePlayed;
      if (typeof payload.hodRule === 'string') patch.hodRule = payload.hodRule;
      if (typeof payload.hotHandDescription === 'string') {
        patch.hotHandDescription = payload.hotHandDescription;
      }
      if (typeof payload.purpleCount === 'number') patch.purpleCount = payload.purpleCount;
      onRemoteGameRef.current?.(payload.$id, patch);
    });

    const unsubLocal = AppwriteRealtime.subscribeToLocalBroadcasts({
      onNotification: (notification) => ingestNotification(notification, { broadcast: false }),
      onEntryUpdated: (gameId, payload) => handleIncomingEntryPayload(payload, gameId),
    });

    return () => {
      unsubEntries();
      unsubGames();
      unsubLocal();
    };
  }, [ingestNotification]);

  return {
    toasts,
    recentFeed,
    tvBannerAlert,
    highlightedPlayers,
    soundEnabled,
    toggleSound,
    dismissToast,
    emitScoreEvent,
    recordLocalEntriesSnapshot,
  };
}
