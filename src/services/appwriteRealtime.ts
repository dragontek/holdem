import { realtime, isAppwriteConfigured, DATABASE_ID, APPWRITE_TABLES } from '../lib/appwrite';

type RealtimeCallback = (response: {
  event: string;
  payload: Record<string, unknown>;
}) => void;

function subscribeChannels(
  channels: string[],
  onEvent: (event: string, payload: Record<string, unknown>) => void
): () => void {
  if (!isAppwriteConfigured) return () => {};

  let isDisposed = false;
  let subscription: { close: () => Promise<void> } | null = null;

  void realtime
    .subscribe(channels, (response) => {
      if (isDisposed) return;
      onEvent(response.events[0] || '', (response.payload || {}) as Record<string, unknown>);
    })
    .then((sub) => {
      if (isDisposed) {
        void sub.close().catch(() => {});
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
      void activeSub.close().catch(() => {});
    }
  };
}

export class AppwriteRealtime {
  private static unsubscribeMap: Map<string, () => void> = new Map();

  /**
   * Subscribe to real-time updates for active games (Clock ticks, status changes)
   */
  static subscribeToGameUpdates(gameId: string, callback: RealtimeCallback): () => void {
    const channels = [
      `databases.${DATABASE_ID}.tables.${APPWRITE_TABLES.GAMES}.rows.${gameId}`,
      `databases.${DATABASE_ID}.collections.${APPWRITE_TABLES.GAMES}.documents.${gameId}`,
    ];

    const key = `game_${gameId}`;
    if (this.unsubscribeMap.has(key)) {
      this.unsubscribeMap.get(key)!();
    }

    const unsubscribe = subscribeChannels(channels, (event, payload) => {
      callback({ event, payload });
    });

    this.unsubscribeMap.set(key, unsubscribe);
    return () => {
      unsubscribe();
      this.unsubscribeMap.delete(key);
    };
  }

  /**
   * Subscribe to live game entry changes (Bust-outs, rebuys, table balancing)
   */
  static subscribeToGameEntries(gameId: string, callback: RealtimeCallback): () => void {
    const channels = [
      `databases.${DATABASE_ID}.tables.${APPWRITE_TABLES.GAME_ENTRIES}.rows`,
      `databases.${DATABASE_ID}.collections.${APPWRITE_TABLES.GAME_ENTRIES}.documents`,
    ];

    return subscribeChannels(channels, (event, payload) => {
      if (payload.game === gameId || payload.gameId === gameId) {
        callback({ event, payload });
      }
    });
  }

  /**
   * Subscribe to Hot Hand Jackpot updates
   */
  static subscribeToJackpot(callback: RealtimeCallback): () => void {
    const channels = [
      `databases.${DATABASE_ID}.tables.${APPWRITE_TABLES.HOT_HANDS}.rows`,
      `databases.${DATABASE_ID}.collections.${APPWRITE_TABLES.HOT_HANDS}.documents`,
    ];

    return subscribeChannels(channels, (event, payload) => {
      callback({ event, payload });
    });
  }
}
