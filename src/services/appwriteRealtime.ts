import { client, DATABASE_ID, APPWRITE_TABLES } from '../lib/appwrite';

type RealtimeCallback = (response: {
  event: string;
  payload: any;
}) => void;

export class AppwriteRealtime {
  private static unsubscribeMap: Map<string, () => void> = new Map();

  /**
   * Subscribe to real-time updates for active games (Clock ticks, status changes)
   */
  static subscribeToGameUpdates(gameId: string, callback: RealtimeCallback): () => void {
    if (!client) return () => {};

    // Support both Appwrite v2 tables/rows channels and legacy collections/documents
    const channels = [
      `databases.${DATABASE_ID}.tables.${APPWRITE_TABLES.GAMES}.rows.${gameId}`,
      `databases.${DATABASE_ID}.collections.${APPWRITE_TABLES.GAMES}.documents.${gameId}`,
    ];
    
    const key = `game_${gameId}`;
    if (this.unsubscribeMap.has(key)) {
      this.unsubscribeMap.get(key)!();
    }

    const unsubscribe = client.subscribe(channels, (response) => {
      callback({
        event: response.events[0],
        payload: response.payload,
      });
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
    if (!client) return () => {};

    const channels = [
      `databases.${DATABASE_ID}.tables.${APPWRITE_TABLES.GAME_ENTRIES}.rows`,
      `databases.${DATABASE_ID}.collections.${APPWRITE_TABLES.GAME_ENTRIES}.documents`,
    ];
    
    const unsubscribe = client.subscribe(channels, (response) => {
      const payload = response.payload as any;
      if (payload.game === gameId || payload.gameId === gameId) {
        callback({
          event: response.events[0],
          payload: response.payload,
        });
      }
    });

    return unsubscribe;
  }

  /**
   * Subscribe to Hot Hand Jackpot updates
   */
  static subscribeToJackpot(callback: RealtimeCallback): () => void {
    if (!client) return () => {};

    const channels = [
      `databases.${DATABASE_ID}.tables.${APPWRITE_TABLES.HOT_HANDS}.rows`,
      `databases.${DATABASE_ID}.collections.${APPWRITE_TABLES.HOT_HANDS}.documents`,
    ];
    
    return client.subscribe(channels, (response) => {
      callback({
        event: response.events[0],
        payload: response.payload,
      });
    });
  }
}
