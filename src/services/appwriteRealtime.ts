import { realtime, isAppwriteConfigured, DATABASE_ID, APPWRITE_TABLES } from '../lib/appwrite';
import type { LiveScoreNotification } from '../lib/liveScoreEvents';
import {
  GAME_CLOCK_ANNOUNCEMENT_TYPE,
  calibrateServerClock,
  parseClockAnnouncementPayload,
  type GameClockSnapshot,
} from '../lib/gameClock';

export type RealtimeCallback = (response: {
  event: string;
  payload: Record<string, unknown>;
  timestamp?: string;
}) => void;

const BROADCAST_CHANNEL_NAME = 'holdem_live_score_events_v1';

interface BroadcastPacket {
  type: 'score_notification' | 'entry_updated' | 'game_updated' | 'clock_state';
  notification?: LiveScoreNotification;
  clock?: GameClockSnapshot;
  gameId?: string;
  payload?: Record<string, unknown>;
}

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    return null;
  }
  try {
    return new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  } catch {
    return null;
  }
}

export function extractPayloadGameId(payload: Record<string, unknown>): string {
  const rawGame = payload.game;
  if (typeof rawGame === 'object' && rawGame !== null && '$id' in rawGame) {
    return String((rawGame as { $id: unknown }).$id || '');
  }
  if (typeof rawGame === 'string' && rawGame) {
    return rawGame;
  }
  if (typeof payload.gameId === 'string' && payload.gameId) {
    return payload.gameId;
  }
  return '';
}

function subscribeChannels(
  channels: string[],
  onEvent: (event: string, payload: Record<string, unknown>, timestamp?: string) => void
): () => void {
  if (!isAppwriteConfigured) return () => {};

  let isDisposed = false;
  let subscription: { unsubscribe: () => Promise<void> } | null = null;

  void realtime
    .subscribe(channels, (response) => {
      if (isDisposed) return;
      if (response.timestamp) {
        calibrateServerClock(response.timestamp);
      }
      onEvent(
        response.events[0] || '',
        (response.payload || {}) as Record<string, unknown>,
        response.timestamp
      );
    })
    .then((sub) => {
      if (isDisposed) {
        void sub.unsubscribe().catch(() => {});
      } else {
        subscription = sub;
      }
    })
    .catch(() => {
      // Gracefully ignore realtime connection errors when offline
    });

  return () => {
    isDisposed = true;
    if (subscription) {
      const activeSub = subscription;
      subscription = null;
      void activeSub.unsubscribe().catch(() => {});
    }
  };
}

export class AppwriteRealtime {
  private static unsubscribeMap: Map<string, () => void> = new Map();

  /**
   * Subscribe to real-time updates for a specific game (Clock ticks, status changes)
   */
  static subscribeToGameUpdates(gameId: string, callback: RealtimeCallback): () => void {
    const channels = [
      `tablesdb.${DATABASE_ID}.tables.${APPWRITE_TABLES.GAMES}.rows.${gameId}`,
      `databases.${DATABASE_ID}.collections.${APPWRITE_TABLES.GAMES}.documents.${gameId}`,
    ];

    const key = `game_${gameId}`;
    if (this.unsubscribeMap.has(key)) {
      this.unsubscribeMap.get(key)!();
    }

    const unsubscribe = subscribeChannels(channels, (event, payload, timestamp) => {
      callback({ event, payload, timestamp });
    });

    this.unsubscribeMap.set(key, unsubscribe);
    return () => {
      unsubscribe();
      this.unsubscribeMap.delete(key);
    };
  }

  /**
   * Subscribe to real-time updates across all games (status transitions, clock updates, rules)
   */
  static subscribeToAllGames(callback: RealtimeCallback): () => void {
    const channels = [
      `tablesdb.${DATABASE_ID}.tables.${APPWRITE_TABLES.GAMES}.rows`,
      `databases.${DATABASE_ID}.collections.${APPWRITE_TABLES.GAMES}.documents`,
    ];
    return subscribeChannels(channels, (event, payload, timestamp) => {
      callback({ event, payload, timestamp });
    });
  }

  /**
   * Subscribe to live game entry changes scoped to a specific gameId
   */
  static subscribeToGameEntries(gameId: string, callback: RealtimeCallback): () => void {
    return this.subscribeToAllGameEntries(({ event, payload }) => {
      if (extractPayloadGameId(payload) === gameId) {
        callback({ event, payload });
      }
    });
  }

  /**
   * Subscribe to all live game entry changes (point awards, knockouts, bust-outs, seating)
   */
  static subscribeToAllGameEntries(callback: RealtimeCallback): () => void {
    const channels = [
      `tablesdb.${DATABASE_ID}.tables.${APPWRITE_TABLES.GAME_ENTRIES}.rows`,
      `databases.${DATABASE_ID}.collections.${APPWRITE_TABLES.GAME_ENTRIES}.documents`,
    ];
    return subscribeChannels(channels, (event, payload) => {
      callback({ event, payload });
    });
  }

  /**
   * Subscribe to Hot Hand Jackpot updates
   */
  static subscribeToJackpot(callback: RealtimeCallback): () => void {
    const channels = [
      `tablesdb.${DATABASE_ID}.tables.${APPWRITE_TABLES.HOT_HANDS}.rows`,
      `databases.${DATABASE_ID}.collections.${APPWRITE_TABLES.HOT_HANDS}.documents`,
    ];

    return subscribeChannels(channels, (event, payload) => {
      callback({ event, payload });
    });
  }

  /**
   * Subscribe to canonical live score notification broadcasts published over Appwrite Realtime
   * so all devices viewing a game receive the exact same hand, headline, and points.
   */
  static subscribeToScoreEvents(
    callback: (notification: LiveScoreNotification) => void
  ): () => void {
    const channels = [
      `tablesdb.${DATABASE_ID}.tables.${APPWRITE_TABLES.ANNOUNCEMENTS}.rows`,
      `databases.${DATABASE_ID}.collections.${APPWRITE_TABLES.ANNOUNCEMENTS}.documents`,
    ];

    return subscribeChannels(channels, (event, payload) => {
      if (!event.endsWith('.create')) return;
      if (payload.type !== 'live_score_event') return;
      if (typeof payload.content !== 'string' || !payload.content.trim()) return;
      try {
        const parsed = JSON.parse(payload.content) as Partial<LiveScoreNotification>;
        if (parsed && parsed.gameId && parsed.headline && parsed.fingerprint) {
          callback(parsed as LiveScoreNotification);
        }
      } catch {
        // Ignore malformed score event payloads
      }
    });
  }

  /**
   * Subscribe to authoritative backend game clock anchor updates so all connected
   * devices (Director, Scribe, Players, TV Mode) stay locked to the exact same backend timer.
   */
  static subscribeToClockState(callback: (clock: GameClockSnapshot) => void): () => void {
    const channels = [
      `tablesdb.${DATABASE_ID}.tables.${APPWRITE_TABLES.ANNOUNCEMENTS}.rows`,
      `databases.${DATABASE_ID}.collections.${APPWRITE_TABLES.ANNOUNCEMENTS}.documents`,
    ];

    return subscribeChannels(channels, (event, payload, timestamp) => {
      if (event.endsWith('.delete')) return;
      if (payload.type !== GAME_CLOCK_ANNOUNCEMENT_TYPE) return;
      const snapshot = parseClockAnnouncementPayload(payload, timestamp);
      if (snapshot) {
        callback(snapshot);
      }
    });
  }

  /**
   * Broadcast a rich score notification immediately across open browser tabs (e.g. Scribe Desk -> TV tab)
   */
  static broadcastScoreNotification(notification: LiveScoreNotification): void {
    const ch = getBroadcastChannel();
    if (!ch) return;
    const packet: BroadcastPacket = {
      type: 'score_notification',
      notification,
    };
    ch.postMessage(packet);
    ch.close();
  }

  /**
   * Broadcast an authoritative game clock snapshot across open browser tabs on the same device
   */
  static broadcastClockState(clock: GameClockSnapshot): void {
    const ch = getBroadcastChannel();
    if (!ch) return;
    const packet: BroadcastPacket = {
      type: 'clock_state',
      clock,
    };
    ch.postMessage(packet);
    ch.close();
  }

  static broadcastEntrySnapshot(gameId: string, payload: Record<string, unknown>): void {
    const ch = getBroadcastChannel();
    if (!ch) return;
    const packet: BroadcastPacket = {
      type: 'entry_updated',
      gameId,
      payload,
    };
    ch.postMessage(packet);
    ch.close();
  }

  static subscribeToLocalBroadcasts(handlers: {
    onNotification?: (notification: LiveScoreNotification) => void;
    onEntryUpdated?: (gameId: string, payload: Record<string, unknown>) => void;
    onClockUpdated?: (clock: GameClockSnapshot) => void;
  }): () => void {
    const ch = getBroadcastChannel();
    if (!ch) return () => {};
    ch.onmessage = (ev: MessageEvent<BroadcastPacket>) => {
      const data = ev.data;
      if (!data) return;
      if (data.type === 'score_notification' && data.notification) {
        handlers.onNotification?.(data.notification);
      } else if (data.type === 'entry_updated' && data.gameId && data.payload) {
        handlers.onEntryUpdated?.(data.gameId, data.payload);
      } else if (data.type === 'clock_state' && data.clock) {
        handlers.onClockUpdated?.(data.clock);
      }
    };
    return () => {
      ch.close();
    };
  }
}
