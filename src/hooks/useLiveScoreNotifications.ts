import { useCallback, useEffect, useRef, useState } from 'react';
import type { Game, GameEntry } from '@/types/holdem';
import { isAppwriteConfigured } from '@/lib/appwrite';
import { AppwriteService } from '@/services/appwriteService';
import { AppwriteRealtime, extractPayloadGameId } from '@/services/appwriteRealtime';
import {
  diffEntryForScoreEvents,
  playScoreChime,
  type LiveScoreNotification,
} from '@/lib/liveScoreEvents';
import {
  applyLevelDurationOverrides,
  shouldAcceptIncomingClockAnchor,
  type GameClockSnapshot,
} from '@/lib/gameClock';
import {
  mergeEntryWithScoringMeta,
  mergeRealtimeGameEntry,
  type EntryScoringMeta,
} from '@/lib/entryScoringMeta';

const DEDUPE_WINDOW_MS = 8000;
const CANONICAL_SUPPRESS_WINDOW_MS = 3500;
const FALLBACK_DIFF_DELAY_MS = 450;
const HIGHLIGHT_DURATION_MS = 9000;
const TV_BANNER_DURATION_MS = 60_000;
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
  /**
   * The game ID the user is actively viewing right now (in Live Game / Director Desk or TV mode).
   * Notifications (toasts, chimes, TV banners, highlights) are shown ONLY when points are awarded
   * in this viewed game. Pass null/undefined when the user is on non-game views.
   */
  viewedGameId?: string | null;
  onRemoteEntryUpserted?: (gameId: string, entry: GameEntry, gameEntries: GameEntry[]) => void;
  onRemoteGameUpdated?: (gameId: string, patch: Partial<Game>) => void;
}

export function useLiveScoreNotifications({
  games,
  viewedGameId,
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
  const viewedGameIdRef = useRef<string | null | undefined>(viewedGameId);
  const soundEnabledRef = useRef<boolean>(soundEnabled);
  const onRemoteEntryRef = useRef(onRemoteEntryUpserted);
  const onRemoteGameRef = useRef(onRemoteGameUpdated);

  const entriesByGameRef = useRef<Map<string, Map<string, GameEntry>>>(new Map());
  const entryIdToGameIdRef = useRef<Map<string, string>>(new Map());
  const seenFingerprintsRef = useRef<Map<string, number>>(new Map());
  const recentCanonicalAtRef = useRef<Map<string, number>>(new Map());
  const recentKillerKoAtRef = useRef<Map<string, number>>(new Map());
  const lastServerClockAnchorRef = useRef<Map<string, string>>(new Map());
  const lastScoringMetaAtRef = useRef<Map<string, number>>(new Map());
  const pendingFallbackTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const deferredToastsRef = useRef<LiveScoreNotification[]>([]);
  const highlightTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const tvBannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    gamesRef.current = games;
    viewedGameIdRef.current = viewedGameId;
    soundEnabledRef.current = soundEnabled;
    onRemoteEntryRef.current = onRemoteEntryUpserted;
    onRemoteGameRef.current = onRemoteGameUpdated;
  });

  // Clear active pop-ups / TV alerts when navigating away from a game or switching games
  useEffect(() => {
    deferredToastsRef.current = deferredToastsRef.current.filter(
      (t) => Boolean(viewedGameId) && t.gameId === viewedGameId
    );
    const frame = requestAnimationFrame(() => {
      setToasts((prev) =>
        viewedGameId ? prev.filter((t) => t.gameId === viewedGameId) : []
      );
      setTvBannerAlert((curr) =>
        curr && viewedGameId && curr.gameId === viewedGameId ? curr : null
      );
      setHighlightedPlayers((prev) => {
        if (prev.size === 0) return prev;
        if (!viewedGameId) return new Map();
        const next = new Map<string, LiveScoreNotification>();
        for (const [pid, notif] of prev.entries()) {
          if (notif.gameId === viewedGameId) next.set(pid, notif);
        }
        return next;
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [viewedGameId]);

  // Prime baseline entry snapshots across all games so remote diffs work on every view
  useEffect(() => {
    let active = true;
    AppwriteService.getAllGameEntries()
      .then((entries) => {
        if (!active) return;
        for (const entry of entries) {
          if (!entry.gameId) continue;
          entryIdToGameIdRef.current.set(entry.$id, entry.gameId);
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
    (
      notification: LiveScoreNotification,
      options?: { broadcast?: boolean; publishToAppwrite?: boolean; isCanonical?: boolean }
    ) => {
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

      // Track canonical notifications so entry-diff fallbacks never emit a mismatched duplicate
      if (options?.isCanonical || options?.broadcast || options?.publishToAppwrite) {
        recentCanonicalAtRef.current.set(`${notification.gameId}:__any__`, now);
        if (notification.primaryPlayerId) {
          recentCanonicalAtRef.current.set(
            `${notification.gameId}:${notification.primaryPlayerId}`,
            now
          );
        }
        if (notification.primaryPlayerName) {
          recentCanonicalAtRef.current.set(
            `${notification.gameId}:name:${notification.primaryPlayerName.trim().toLowerCase()}`,
            now
          );
        }
        if (notification.secondaryPlayerId) {
          recentCanonicalAtRef.current.set(
            `${notification.gameId}:${notification.secondaryPlayerId}`,
            now
          );
        }
        if (notification.secondaryPlayerName) {
          recentCanonicalAtRef.current.set(
            `${notification.gameId}:name:${notification.secondaryPlayerName.trim().toLowerCase()}`,
            now
          );
        }
        if (notification.fingerprint.startsWith('showup_cutoff:')) {
          recentCanonicalAtRef.current.set(`${notification.gameId}:__all__`, now);
        }
      }

      setRecentFeed((prev) => [notification, ...prev].slice(0, MAX_FEED_ITEMS));

      // Relay exact canonical notification to peer browser tabs AND remote Appwrite devices
      if (options?.broadcast) {
        AppwriteRealtime.broadcastScoreNotification(notification);
      }
      if (options?.publishToAppwrite) {
        void AppwriteService.publishLiveScoreNotification(notification);
      }

      // Only surface live alerts (toasts, TV banner, sound chime, row highlights) to users
      // currently viewing the specific game where these points were awarded.
      const isViewingAwardedGame = Boolean(
        viewedGameIdRef.current && notification.gameId === viewedGameIdRef.current
      );
      if (!isViewingAwardedGame) {
        return;
      }

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
    },
    [triggerHighlight]
  );

  // Flush queued toasts as soon as an open modal dialog closes
  useEffect(() => {
    if (typeof MutationObserver === 'undefined') return;
    const observer = new MutationObserver(() => {
      if (deferredToastsRef.current.length > 0 && !isAnyModalDialogOpen()) {
        const activeViewedId = viewedGameIdRef.current;
        const pending = deferredToastsRef.current.filter(
          (t) => Boolean(activeViewedId) && t.gameId === activeViewedId
        );
        deferredToastsRef.current = [];
        if (pending.length > 0) {
          setToasts((prev) => [...prev, ...pending].slice(-4));
        }
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
        entryIdToGameIdRef.current.set(e.$id, gameId);
      }
      entriesByGameRef.current.set(gameId, bucket);
      if (broadcastChangedEntry) {
        lastScoringMetaAtRef.current.set(broadcastChangedEntry.$id, Date.now());
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
      ingestNotification(notification, {
        broadcast: true,
        publishToAppwrite: true,
        isCanonical: true,
      });
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
      const gameId =
        explicitGameId ||
        mapped.gameId ||
        extractPayloadGameId(rawPayload) ||
        entryIdToGameIdRef.current.get(mapped.$id) ||
        '';
      if (!gameId || !mapped.$id) return;

      entryIdToGameIdRef.current.set(mapped.$id, gameId);
      let bucket = entriesByGameRef.current.get(gameId);
      if (!bucket) {
        bucket = new Map();
        entriesByGameRef.current.set(gameId, bucket);
      }
      const prevEntry = bucket.get(mapped.$id);
      // Merge incoming Realtime payload with prior snapshot so legacy schemas lacking
      // extended columns (`handBonuses`, `knockouts`, `status`, `showUpAwarded`, etc.)
      // never overwrite locally-recorded or sidecar-synced scoring fields.
      const normalizedEntry = mergeRealtimeGameEntry(rawPayload, mapped, prevEntry, gameId);
      bucket.set(normalizedEntry.$id, normalizedEntry);

      const allForGame = Array.from(bucket.values());
      const game = gamesRef.current.find((g) => g.$id === gameId);
      if (game && prevEntry) {
        const diffed = diffEntryForScoreEvents(prevEntry, normalizedEntry, game, allForGame);
        if (diffed.length > 0) {
          const emitFallback = () => {
            const now = Date.now();
            const gameWideTs = Math.max(
              recentCanonicalAtRef.current.get(`${gameId}:__all__`) || 0,
              recentCanonicalAtRef.current.get(`${gameId}:__any__`) || 0
            );
            if (gameWideTs && now - gameWideTs < CANONICAL_SUPPRESS_WINDOW_MS) {
              return;
            }
            for (const ev of diffed) {
              const primaryKey = ev.primaryPlayerId ? `${gameId}:${ev.primaryPlayerId}` : '';
              const primaryNameKey = ev.primaryPlayerName
                ? `${gameId}:name:${ev.primaryPlayerName.trim().toLowerCase()}`
                : '';
              const secondaryKey = ev.secondaryPlayerId ? `${gameId}:${ev.secondaryPlayerId}` : '';
              const secondaryNameKey = ev.secondaryPlayerName
                ? `${gameId}:name:${ev.secondaryPlayerName.trim().toLowerCase()}`
                : '';
              const lastCanonical = Math.max(
                primaryKey ? recentCanonicalAtRef.current.get(primaryKey) || 0 : 0,
                primaryNameKey ? recentCanonicalAtRef.current.get(primaryNameKey) || 0 : 0,
                secondaryKey ? recentCanonicalAtRef.current.get(secondaryKey) || 0 : 0,
                secondaryNameKey ? recentCanonicalAtRef.current.get(secondaryNameKey) || 0 : 0
              );
              if (lastCanonical && now - lastCanonical < CANONICAL_SUPPRESS_WINDOW_MS) {
                continue;
              }
              ingestNotification(ev, { broadcast: false });
            }
          };

          // Give the canonical live_score_event broadcast a brief head start so remote users
          // always receive the exact same hand/headline/points as the Scribe.
          if (isAppwriteConfigured) {
            const timer = setTimeout(() => {
              pendingFallbackTimersRef.current.delete(timer);
              emitFallback();
            }, FALLBACK_DIFF_DELAY_MS);
            pendingFallbackTimersRef.current.add(timer);
          } else {
            emitFallback();
          }
        }
      }

      onRemoteEntryRef.current?.(gameId, normalizedEntry, allForGame);
    };

    const applyClockSnapshot = (clock: GameClockSnapshot) => {
      const prevServerAnchor = lastServerClockAnchorRef.current.get(clock.gameId);
      if (!shouldAcceptIncomingClockAnchor(prevServerAnchor, clock.clockAnchorAt)) {
        return;
      }
      lastServerClockAnchorRef.current.set(clock.gameId, clock.clockAnchorAt);
      const existingGame = gamesRef.current.find((g) => g.$id === clock.gameId);
      const patch: Partial<Game> = {
        status: clock.status,
        currentLevelIndex: clock.currentLevelIndex,
        secondsRemainingInLevel: clock.secondsRemainingInLevel,
        clockAnchorAt: clock.clockAnchorAt,
        levelDurationOverrides: clock.levelDurationOverrides,
      };
      if (existingGame) {
        patch.blindSchedule = applyLevelDurationOverrides(
          existingGame.blindSchedule,
          clock.levelDurationOverrides
        );
      }
      onRemoteGameRef.current?.(clock.gameId, patch);
    };

    const handleIncomingScoringMeta = (meta: EntryScoringMeta) => {
      const gameId = meta.gameId || entryIdToGameIdRef.current.get(meta.entryId) || '';
      if (!gameId || !meta.entryId) return;
      const incomingTs = Date.parse(meta.updatedAt);
      const lastTs = lastScoringMetaAtRef.current.get(meta.entryId) ?? 0;
      if (Number.isFinite(incomingTs) && lastTs > 0 && incomingTs < lastTs - 250) {
        return;
      }
      if (Number.isFinite(incomingTs)) {
        lastScoringMetaAtRef.current.set(meta.entryId, Math.max(lastTs, incomingTs));
      }
      const bucket = entriesByGameRef.current.get(gameId);
      if (!bucket) return;
      const prevEntry = bucket.get(meta.entryId);
      if (!prevEntry) return;

      const merged = mergeEntryWithScoringMeta(prevEntry, meta);
      bucket.set(merged.$id, merged);
      const allForGame = Array.from(bucket.values());
      onRemoteEntryRef.current?.(gameId, merged, allForGame);
    };

    const unsubClockState = AppwriteRealtime.subscribeToClockState((clock) => {
      applyClockSnapshot(clock);
    });

    const unsubScoringMeta = AppwriteRealtime.subscribeToEntryScoringMeta((meta) => {
      handleIncomingScoringMeta(meta);
    });

    const unsubScoreEvents = AppwriteRealtime.subscribeToScoreEvents((notification) => {
      ingestNotification(notification, { broadcast: false, isCanonical: true });
    });

    const unsubEntries = AppwriteRealtime.subscribeToAllGameEntries(({ event, payload }) => {
      if (event.endsWith('.delete')) return;
      handleIncomingEntryPayload(payload);
    });

    const unsubGames = AppwriteRealtime.subscribeToAllGames(({ event, payload }) => {
      if (event.endsWith('.delete') || typeof payload.$id !== 'string') return;
      const existingGame = gamesRef.current.find((g) => g.$id === payload.$id);
      const hasAuthoritativeClock = Boolean(
        lastServerClockAnchorRef.current.has(payload.$id) || existingGame?.clockAnchorAt
      );
      const payloadAnchor =
        typeof payload.clockAnchorAt === 'string' && payload.clockAnchorAt
          ? payload.clockAnchorAt
          : undefined;
      const acceptClockFields = Boolean(
        payloadAnchor
          ? shouldAcceptIncomingClockAnchor(
              lastServerClockAnchorRef.current.get(payload.$id),
              payloadAnchor
            )
          : !hasAuthoritativeClock
      );

      const patch: Partial<Game> = {};
      if (typeof payload.status === 'string') {
        const nextStatus = payload.status as Game['status'];
        // Always accept terminal status transitions; let clock stream drive running/paused when anchored
        if (acceptClockFields || nextStatus === 'completed' || nextStatus === 'canceled') {
          patch.status = nextStatus;
        }
      }
      if (acceptClockFields) {
        if (typeof payload.currentLevelIndex === 'number') {
          patch.currentLevelIndex = payload.currentLevelIndex;
        }
        if (typeof payload.secondsRemainingInLevel === 'number') {
          patch.secondsRemainingInLevel = payload.secondsRemainingInLevel;
        }
        if (payloadAnchor) {
          patch.clockAnchorAt = payloadAnchor;
          lastServerClockAnchorRef.current.set(payload.$id, payloadAnchor);
        } else if (patch.status === 'running' && typeof payload.$updatedAt === 'string') {
          patch.clockAnchorAt = payload.$updatedAt;
        }
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
      if (Object.keys(patch).length > 0) {
        onRemoteGameRef.current?.(payload.$id, patch);
      }
    });

    const unsubLocal = AppwriteRealtime.subscribeToLocalBroadcasts({
      onNotification: (notification) =>
        ingestNotification(notification, { broadcast: false, isCanonical: true }),
      onEntryUpdated: (gameId, payload) => handleIncomingEntryPayload(payload, gameId),
      onClockUpdated: (clock) => applyClockSnapshot(clock),
    });

    const fallbackTimers = pendingFallbackTimersRef.current;
    return () => {
      unsubClockState();
      unsubScoringMeta();
      unsubScoreEvents();
      unsubEntries();
      unsubGames();
      unsubLocal();
      for (const t of fallbackTimers) {
        clearTimeout(t);
      }
      fallbackTimers.clear();
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
