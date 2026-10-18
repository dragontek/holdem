import { databases, tablesDb, isAppwriteConfigured, DATABASE_ID, APPWRITE_TABLES, APPWRITE_COLLECTIONS } from '../lib/appwrite';
import { 
  mockLeague, 
  mockSeasons, 
  mockVenues, 
  mockPlayers, 
  mockGames, 
  mockGameEntries, 
  mockAnnouncements, 
  mockHotHandJackpot 
} from './mockData';
import type { League, Season, Venue, Player, Game, GameEntry, Announcement, HotHandJackpot } from '../types/holdem';

export class AppwriteService {
  // Fetch League Details
  static async getLeague(): Promise<League> {
    if (!isAppwriteConfigured) return mockLeague;
    try {
      const response = await tablesDb.getRow(DATABASE_ID, APPWRITE_TABLES.LEAGUES, mockLeague.$id);
      return response as unknown as League;
    } catch {
      try {
        const response = await databases.getDocument(DATABASE_ID, APPWRITE_COLLECTIONS.LEAGUES, mockLeague.$id);
        return response as unknown as League;
      } catch {
        return mockLeague;
      }
    }
  }

  // Fetch Active & Historical Seasons
  static async getSeasons(): Promise<Season[]> {
    if (!isAppwriteConfigured) return mockSeasons;
    try {
      const response = await tablesDb.listRows(DATABASE_ID, APPWRITE_TABLES.SEASONS);
      const items = (response as any).rows || (response as any).documents || [];
      return items.length > 0 ? (items as unknown as Season[]) : mockSeasons;
    } catch {
      try {
        const response = await databases.listDocuments(DATABASE_ID, APPWRITE_COLLECTIONS.SEASONS);
        return response.documents.length > 0 ? (response.documents as unknown as Season[]) : mockSeasons;
      } catch {
        return mockSeasons;
      }
    }
  }

  // Fetch Venues
  static async getVenues(): Promise<Venue[]> {
    if (!isAppwriteConfigured) return mockVenues;
    try {
      const response = await tablesDb.listRows(DATABASE_ID, APPWRITE_TABLES.VENUES);
      const items = (response as any).rows || (response as any).documents || [];
      return items.length > 0 ? (items as unknown as Venue[]) : mockVenues;
    } catch {
      try {
        const response = await databases.listDocuments(DATABASE_ID, APPWRITE_COLLECTIONS.VENUES);
        return response.documents.length > 0 ? (response.documents as unknown as Venue[]) : mockVenues;
      } catch {
        return mockVenues;
      }
    }
  }

  // Fetch Players & Standings
  static async getPlayers(): Promise<Player[]> {
    if (!isAppwriteConfigured) return mockPlayers;
    try {
      const response = await tablesDb.listRows(DATABASE_ID, APPWRITE_TABLES.PLAYERS);
      const items = (response as any).rows || (response as any).documents || [];
      return items.length > 0 ? (items as unknown as Player[]) : mockPlayers;
    } catch {
      try {
        const response = await databases.listDocuments(DATABASE_ID, APPWRITE_COLLECTIONS.PLAYERS);
        return response.documents.length > 0 ? (response.documents as unknown as Player[]) : mockPlayers;
      } catch {
        return mockPlayers;
      }
    }
  }

  // Fetch Games with relational venue & season fallback parsing
  static async getGames(): Promise<Game[]> {
    if (!isAppwriteConfigured) return mockGames;
    try {
      let items: any[] = [];
      try {
        const response = await tablesDb.listRows(DATABASE_ID, APPWRITE_TABLES.GAMES);
        items = (response as any).rows || (response as any).documents || [];
      } catch {
        const response = await databases.listDocuments(DATABASE_ID, APPWRITE_COLLECTIONS.GAMES);
        items = response.documents || [];
      }

      if (items.length === 0) return mockGames;

      return items.map((doc: any) => ({
        $id: doc.$id,
        seasonId: typeof doc.season === 'object' && doc.season ? doc.season.$id : doc.season || doc.seasonId || 'season_2026_crawl3',
        venueId: typeof doc.venue === 'object' && doc.venue ? doc.venue.$id : doc.venue || doc.venueId || 'venue_single_barrel',
        venueName: (typeof doc.venue === 'object' && doc.venue?.name) ? doc.venue.name : doc.venueName || 'Single Barrel',
        title: doc.title,
        scheduledAt: doc.scheduledAt,
        status: doc.status,
        dealerName: doc.dealerName,
        buyinAmount: doc.buyinAmount,
        rebuyAmount: doc.rebuyAmount,
        addonAmount: doc.addonAmount,
        startingChips: doc.startingChips,
        hotHandJackpot: doc.hotHandJackpot,
        totalPlayersCount: doc.totalPlayersCount,
        remainingPlayersCount: doc.remainingPlayersCount,
        totalEntriesCount: doc.totalEntriesCount,
        currentLevelIndex: doc.currentLevelIndex || 0,
        secondsRemainingInLevel: doc.secondsRemainingInLevel || 900,
        blindSchedule: mockGames[0].blindSchedule,
      }));
    } catch {
      return mockGames;
    }
  }

  // Fetch Game Entries for a Game
  static async getGameEntries(gameId: string): Promise<GameEntry[]> {
    if (!isAppwriteConfigured) return mockGameEntries.filter(ge => ge.gameId === gameId || gameId === 'game_today_single_barrel');
    try {
      let items: any[] = [];
      try {
        const response = await tablesDb.listRows(DATABASE_ID, APPWRITE_TABLES.GAME_ENTRIES);
        items = (response as any).rows || (response as any).documents || [];
      } catch {
        const response = await databases.listDocuments(DATABASE_ID, APPWRITE_COLLECTIONS.GAME_ENTRIES);
        items = response.documents || [];
      }

      if (items.length === 0) {
        return mockGameEntries.filter(ge => ge.gameId === gameId || gameId === 'game_today_single_barrel');
      }

      return items.map((doc: any) => ({
        $id: doc.$id,
        gameId: typeof doc.game === 'object' && doc.game ? doc.game.$id : doc.game || doc.gameId || gameId,
        playerId: typeof doc.player === 'object' && doc.player ? doc.player.$id : doc.player || doc.playerId || '',
        playerName: (typeof doc.player === 'object' && doc.player?.name) ? doc.player.name : doc.playerName || '',
        playerSuitIcon: (typeof doc.player === 'object' && doc.player?.suitIcon) ? doc.player.suitIcon : doc.playerSuitIcon || 'spades',
        tableNumber: doc.tableNumber,
        seatNumber: doc.seatNumber,
        buyinsCount: doc.buyinsCount,
        rebuysCount: doc.rebuysCount,
        addonsCount: doc.addonsCount,
        finishPosition: doc.finishPosition,
        pointsAwarded: doc.pointsAwarded,
        kosCount: doc.kosCount,
        isEliminated: doc.isEliminated,
      }));
    } catch {
      return mockGameEntries;
    }
  }

  // Fetch Announcements
  static async getAnnouncements(): Promise<Announcement[]> {
    if (!isAppwriteConfigured) return mockAnnouncements;
    try {
      const response = await tablesDb.listRows(DATABASE_ID, APPWRITE_TABLES.ANNOUNCEMENTS);
      const items = (response as any).rows || (response as any).documents || [];
      return items.length > 0 ? (items as unknown as Announcement[]) : mockAnnouncements;
    } catch {
      try {
        const response = await databases.listDocuments(DATABASE_ID, APPWRITE_COLLECTIONS.ANNOUNCEMENTS);
        return response.documents.length > 0 ? (response.documents as unknown as Announcement[]) : mockAnnouncements;
      } catch {
        return mockAnnouncements;
      }
    }
  }

  // Fetch Current Hot Hand Jackpot
  static async getHotHandJackpot(): Promise<HotHandJackpot> {
    if (!isAppwriteConfigured) return mockHotHandJackpot;
    try {
      const response = await tablesDb.getRow(DATABASE_ID, APPWRITE_TABLES.HOT_HANDS, mockHotHandJackpot.$id);
      return response as unknown as HotHandJackpot;
    } catch {
      try {
        const response = await databases.getDocument(DATABASE_ID, APPWRITE_COLLECTIONS.HOT_HANDS, mockHotHandJackpot.$id);
        return response as unknown as HotHandJackpot;
      } catch {
        return mockHotHandJackpot;
      }
    }
  }

  // --- MUTATION METHODS ---

  /**
   * Update live game blind level and countdown
   */
  static async updateGameClock(gameId: string, currentLevelIndex: number, secondsRemainingInLevel: number): Promise<boolean> {
    if (!isAppwriteConfigured) return true;
    try {
      await tablesDb.updateRow(DATABASE_ID, APPWRITE_TABLES.GAMES, gameId, {
        currentLevelIndex,
        secondsRemainingInLevel,
      });
      return true;
    } catch {
      try {
        await databases.updateDocument(DATABASE_ID, APPWRITE_COLLECTIONS.GAMES, gameId, {
          currentLevelIndex,
          secondsRemainingInLevel,
        });
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Update Game Status (e.g., 'running' -> 'paused' -> 'completed')
   */
  static async updateGameStatus(gameId: string, status: 'scheduled' | 'running' | 'paused' | 'completed' | 'canceled'): Promise<boolean> {
    if (!isAppwriteConfigured) return true;
    try {
      await tablesDb.updateRow(DATABASE_ID, APPWRITE_TABLES.GAMES, gameId, {
        status,
      });
      return true;
    } catch {
      try {
        await databases.updateDocument(DATABASE_ID, APPWRITE_COLLECTIONS.GAMES, gameId, {
          status,
        });
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Eliminate a player from a live tournament
   */
  static async eliminatePlayer(gameId: string, entryId: string, finishPosition: number, remainingPlayersCount: number): Promise<boolean> {
    if (!isAppwriteConfigured) return true;
    try {
      await tablesDb.updateRow(DATABASE_ID, APPWRITE_TABLES.GAME_ENTRIES, entryId, {
        isEliminated: true,
        finishPosition,
      });
      await tablesDb.updateRow(DATABASE_ID, APPWRITE_TABLES.GAMES, gameId, {
        remainingPlayersCount,
      });
      return true;
    } catch {
      try {
        await databases.updateDocument(DATABASE_ID, APPWRITE_COLLECTIONS.GAME_ENTRIES, entryId, {
          isEliminated: true,
          finishPosition,
        });
        await databases.updateDocument(DATABASE_ID, APPWRITE_COLLECTIONS.GAMES, gameId, {
          remainingPlayersCount,
        });
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Update Hot Hand Jackpot Amount
   */
  static async updateJackpotPool(jackpotId: string, currentPool: number): Promise<boolean> {
    if (!isAppwriteConfigured) return true;
    try {
      await tablesDb.updateRow(DATABASE_ID, APPWRITE_TABLES.HOT_HANDS, jackpotId, {
        currentPool,
      });
      return true;
    } catch {
      try {
        await databases.updateDocument(DATABASE_ID, APPWRITE_COLLECTIONS.HOT_HANDS, jackpotId, {
          currentPool,
        });
        return true;
      } catch {
        return false;
      }
    }
  }
}
