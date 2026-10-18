import { databases, tablesDb, isAppwriteConfigured, DATABASE_ID, APPWRITE_TABLES, APPWRITE_COLLECTIONS, ID } from '../lib/appwrite';
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

  // ==========================================
  // --- VENUE CRUD METHODS ---
  // ==========================================

  static async createVenue(venueData: Omit<Venue, '$id'>): Promise<Venue> {
    const newId = ID.unique();
    const payload = {
      name: venueData.name,
      address: venueData.address,
      phone: venueData.phone,
      website: venueData.website || '',
      imageUrl: venueData.imageUrl || '',
      league: mockLeague.$id,
    };

    if (isAppwriteConfigured) {
      try {
        const res = await tablesDb.createRow(DATABASE_ID, APPWRITE_TABLES.VENUES, newId, payload);
        return {
          $id: res.$id || newId,
          leagueId: mockLeague.$id,
          ...payload,
        } as Venue;
      } catch (e) {
        console.warn('Appwrite createVenue failed, returning local instance:', e);
      }
    }

    return {
      $id: newId,
      leagueId: mockLeague.$id,
      ...payload,
    } as Venue;
  }

  static async updateVenue(venueId: string, updates: Partial<Venue>): Promise<boolean> {
    if (!isAppwriteConfigured) return true;
    try {
      const payload: Record<string, any> = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.address !== undefined) payload.address = updates.address;
      if (updates.phone !== undefined) payload.phone = updates.phone;
      if (updates.website !== undefined) payload.website = updates.website;
      if (updates.imageUrl !== undefined) payload.imageUrl = updates.imageUrl;

      await tablesDb.updateRow(DATABASE_ID, APPWRITE_TABLES.VENUES, venueId, payload);
      return true;
    } catch (e) {
      console.error('Failed to update venue in Appwrite:', e);
      return false;
    }
  }

  static async deleteVenue(venueId: string): Promise<boolean> {
    if (!isAppwriteConfigured) return true;
    try {
      await tablesDb.deleteRow(DATABASE_ID, APPWRITE_TABLES.VENUES, venueId);
      return true;
    } catch (e) {
      console.error('Failed to delete venue from Appwrite:', e);
      return false;
    }
  }

  // ==========================================
  // --- SEASON CRUD METHODS ------------------
  // ==========================================

  static async createSeason(seasonData: Omit<Season, '$id'>): Promise<Season> {
    const newId = ID.unique();
    const payload = {
      name: seasonData.name,
      startDate: seasonData.startDate,
      endDate: seasonData.endDate,
      isActive: Boolean(seasonData.isActive),
      league: mockLeague.$id,
    };

    if (isAppwriteConfigured) {
      try {
        const res = await tablesDb.createRow(DATABASE_ID, APPWRITE_TABLES.SEASONS, newId, payload);
        return {
          $id: res.$id || newId,
          leagueId: mockLeague.$id,
          name: seasonData.name,
          startDate: seasonData.startDate,
          endDate: seasonData.endDate,
          isActive: Boolean(seasonData.isActive),
        };
      } catch (e) {
        console.warn('Appwrite createSeason failed, returning local instance:', e);
      }
    }

    return {
      $id: newId,
      leagueId: mockLeague.$id,
      name: seasonData.name,
      startDate: seasonData.startDate,
      endDate: seasonData.endDate,
      isActive: Boolean(seasonData.isActive),
    };
  }

  static async updateSeason(seasonId: string, updates: Partial<Season>): Promise<boolean> {
    if (!isAppwriteConfigured) return true;
    try {
      const payload: Record<string, any> = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.startDate !== undefined) payload.startDate = updates.startDate;
      if (updates.endDate !== undefined) payload.endDate = updates.endDate;
      if (updates.isActive !== undefined) payload.isActive = updates.isActive;

      await tablesDb.updateRow(DATABASE_ID, APPWRITE_TABLES.SEASONS, seasonId, payload);
      return true;
    } catch (e) {
      console.error('Failed to update season in Appwrite:', e);
      return false;
    }
  }

  static async deleteSeason(seasonId: string): Promise<boolean> {
    if (!isAppwriteConfigured) return true;
    try {
      await tablesDb.deleteRow(DATABASE_ID, APPWRITE_TABLES.SEASONS, seasonId);
      return true;
    } catch (e) {
      console.error('Failed to delete season from Appwrite:', e);
      return false;
    }
  }

  static async setActiveSeason(seasonId: string, allSeasons: Season[]): Promise<Season[]> {
    const updated = allSeasons.map((s) => ({
      ...s,
      isActive: s.$id === seasonId,
    }));

    if (isAppwriteConfigured) {
      try {
        await Promise.all(
          updated.map((s) =>
            tablesDb
              .updateRow(DATABASE_ID, APPWRITE_TABLES.SEASONS, s.$id, {
                isActive: s.isActive,
              })
              .catch((err) => console.warn(`Failed to update season ${s.$id} active state:`, err))
          )
        );
      } catch (e) {
        console.warn('Failed to bulk-update active seasons in Appwrite:', e);
      }
    }

    return updated;
  }

  // ==========================================
  // --- GAME / EVENT SCHEDULE CRUD METHODS ---
  // ==========================================

  static async createGame(gameData: Omit<Game, '$id'>): Promise<Game> {
    const newId = ID.unique();
    const payload = {
      title: gameData.title,
      scheduledAt: gameData.scheduledAt,
      status: gameData.status || 'scheduled',
      dealerName: gameData.dealerName || '',
      buyinAmount: gameData.buyinAmount || 30,
      rebuyAmount: gameData.rebuyAmount || 20,
      addonAmount: gameData.addonAmount || 10,
      startingChips: gameData.startingChips || 15000,
      hotHandJackpot: gameData.hotHandJackpot || 0,
      totalPlayersCount: gameData.totalPlayersCount || 0,
      remainingPlayersCount: gameData.remainingPlayersCount || 0,
      totalEntriesCount: gameData.totalEntriesCount || 0,
      currentLevelIndex: gameData.currentLevelIndex || 0,
      secondsRemainingInLevel: gameData.secondsRemainingInLevel || 900,
      season: gameData.seasonId || 'season_2026_crawl3',
      venue: gameData.venueId,
    };

    if (isAppwriteConfigured) {
      try {
        const res = await tablesDb.createRow(DATABASE_ID, APPWRITE_TABLES.GAMES, newId, payload);
        return {
          ...gameData,
          $id: res.$id || newId,
          seasonId: payload.season,
          venueId: payload.venue,
          blindSchedule: mockGames[0].blindSchedule,
        };
      } catch (e) {
        console.warn('Appwrite createGame failed, returning local instance:', e);
      }
    }

    return {
      $id: newId,
      ...gameData,
      blindSchedule: mockGames[0].blindSchedule,
    };
  }

  static async updateGame(gameId: string, updates: Partial<Game>): Promise<boolean> {
    if (!isAppwriteConfigured) return true;
    try {
      const payload: Record<string, any> = {};
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.scheduledAt !== undefined) payload.scheduledAt = updates.scheduledAt;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.dealerName !== undefined) payload.dealerName = updates.dealerName;
      if (updates.buyinAmount !== undefined) payload.buyinAmount = updates.buyinAmount;
      if (updates.rebuyAmount !== undefined) payload.rebuyAmount = updates.rebuyAmount;
      if (updates.addonAmount !== undefined) payload.addonAmount = updates.addonAmount;
      if (updates.startingChips !== undefined) payload.startingChips = updates.startingChips;
      if (updates.hotHandJackpot !== undefined) payload.hotHandJackpot = updates.hotHandJackpot;
      if (updates.totalPlayersCount !== undefined) payload.totalPlayersCount = updates.totalPlayersCount;
      if (updates.remainingPlayersCount !== undefined) payload.remainingPlayersCount = updates.remainingPlayersCount;
      if (updates.totalEntriesCount !== undefined) payload.totalEntriesCount = updates.totalEntriesCount;
      if (updates.currentLevelIndex !== undefined) payload.currentLevelIndex = updates.currentLevelIndex;
      if (updates.secondsRemainingInLevel !== undefined) payload.secondsRemainingInLevel = updates.secondsRemainingInLevel;
      if (updates.venueId !== undefined) payload.venue = updates.venueId;
      if (updates.seasonId !== undefined) payload.season = updates.seasonId;

      await tablesDb.updateRow(DATABASE_ID, APPWRITE_TABLES.GAMES, gameId, payload);
      return true;
    } catch (e) {
      console.error('Failed to update game in Appwrite:', e);
      return false;
    }
  }

  static async deleteGame(gameId: string): Promise<boolean> {
    if (!isAppwriteConfigured) return true;
    try {
      await tablesDb.deleteRow(DATABASE_ID, APPWRITE_TABLES.GAMES, gameId);
      return true;
    } catch (e) {
      console.error('Failed to delete game from Appwrite:', e);
      return false;
    }
  }

  // ==========================================
  // --- LIVE TOURNAMENT & GAME ENTRIES ---
  // ==========================================

  static async addGameEntry(
    gameId: string,
    player: Player,
    tableNumber: number,
    seatNumber: number,
    currentGame: Game
  ): Promise<GameEntry> {
    const newId = ID.unique();
    const payload = {
      playerName: player.name,
      playerSuitIcon: player.suitIcon || 'spades',
      tableNumber,
      seatNumber,
      buyinsCount: 1,
      rebuysCount: 0,
      addonsCount: 0,
      finishPosition: 0,
      pointsAwarded: 0,
      kosCount: 0,
      isEliminated: false,
      game: gameId,
      player: player.$id,
    };

    const newEntry: GameEntry = {
      $id: newId,
      gameId,
      playerId: player.$id,
      playerName: player.name,
      playerSuitIcon: player.suitIcon || 'spades',
      tableNumber,
      seatNumber,
      buyinsCount: 1,
      rebuysCount: 0,
      addonsCount: 0,
      finishPosition: 0,
      pointsAwarded: 0,
      kosCount: 0,
      isEliminated: false,
    };

    if (isAppwriteConfigured) {
      try {
        const res = await tablesDb.createRow(DATABASE_ID, APPWRITE_TABLES.GAME_ENTRIES, newId, payload);
        newEntry.$id = res.$id || newId;

        await tablesDb.updateRow(DATABASE_ID, APPWRITE_TABLES.GAMES, gameId, {
          totalPlayersCount: currentGame.totalPlayersCount + 1,
          remainingPlayersCount: currentGame.remainingPlayersCount + 1,
          totalEntriesCount: currentGame.totalEntriesCount + 1,
        });
      } catch (e) {
        console.warn('Appwrite addGameEntry error:', e);
      }
    }

    return newEntry;
  }

  static async updatePlayerRebuys(
    gameId: string,
    entryId: string,
    rebuysCount: number,
    currentGame: Game
  ): Promise<boolean> {
    if (!isAppwriteConfigured) return true;
    try {
      await tablesDb.updateRow(DATABASE_ID, APPWRITE_TABLES.GAME_ENTRIES, entryId, {
        rebuysCount,
      });
      await tablesDb.updateRow(DATABASE_ID, APPWRITE_TABLES.GAMES, gameId, {
        totalEntriesCount: currentGame.totalEntriesCount + 1,
      });
      return true;
    } catch (e) {
      console.error('Failed to update player rebuys:', e);
      return false;
    }
  }

  static async updatePlayerAddons(
    entryId: string,
    addonsCount: number
  ): Promise<boolean> {
    if (!isAppwriteConfigured) return true;
    try {
      await tablesDb.updateRow(DATABASE_ID, APPWRITE_TABLES.GAME_ENTRIES, entryId, {
        addonsCount,
      });
      return true;
    } catch (e) {
      console.error('Failed to update player addons:', e);
      return false;
    }
  }

  static async movePlayerSeat(
    entryId: string,
    tableNumber: number,
    seatNumber: number
  ): Promise<boolean> {
    if (!isAppwriteConfigured) return true;
    try {
      await tablesDb.updateRow(DATABASE_ID, APPWRITE_TABLES.GAME_ENTRIES, entryId, {
        tableNumber,
        seatNumber,
      });
      return true;
    } catch (e) {
      console.error('Failed to move player seat:', e);
      return false;
    }
  }

  static async recordEliminationWithKO(
    gameId: string,
    eliminatedEntryId: string,
    finishPosition: number,
    remainingPlayersCount: number,
    koWinnerEntryId?: string,
    koWinnerPlayerId?: string
  ): Promise<boolean> {
    if (!isAppwriteConfigured) return true;
    try {
      // 1. Mark eliminated player
      await tablesDb.updateRow(DATABASE_ID, APPWRITE_TABLES.GAME_ENTRIES, eliminatedEntryId, {
        isEliminated: true,
        finishPosition,
      });

      // 2. Decrement remaining players on game
      await tablesDb.updateRow(DATABASE_ID, APPWRITE_TABLES.GAMES, gameId, {
        remainingPlayersCount,
      });

      // 3. Award KO to killer if applicable
      if (koWinnerEntryId) {
        try {
          const entry = await tablesDb.getRow(DATABASE_ID, APPWRITE_TABLES.GAME_ENTRIES, koWinnerEntryId);
          const currentKOs = (entry as any).kosCount || 0;
          await tablesDb.updateRow(DATABASE_ID, APPWRITE_TABLES.GAME_ENTRIES, koWinnerEntryId, {
            kosCount: currentKOs + 1,
          });
        } catch {}
      }

      if (koWinnerPlayerId) {
        try {
          const player = await tablesDb.getRow(DATABASE_ID, APPWRITE_TABLES.PLAYERS, koWinnerPlayerId);
          const careerKOs = (player as any).careerKOs || 0;
          await tablesDb.updateRow(DATABASE_ID, APPWRITE_TABLES.PLAYERS, koWinnerPlayerId, {
            careerKOs: careerKOs + 1,
          });
        } catch {}
      }

      return true;
    } catch (e) {
      console.error('Failed to record elimination:', e);
      return false;
    }
  }

  static async finalizeTournament(
    gameId: string,
    results: { entryId: string; playerId: string; finishPosition: number; points: number }[]
  ): Promise<boolean> {
    if (!isAppwriteConfigured) return true;
    try {
      // 1. Update Game to completed
      await tablesDb.updateRow(DATABASE_ID, APPWRITE_TABLES.GAMES, gameId, {
        status: 'completed',
        remainingPlayersCount: 0,
      });

      // 2. Update each game entry with finish position & points awarded
      for (const res of results) {
        try {
          await tablesDb.updateRow(DATABASE_ID, APPWRITE_TABLES.GAME_ENTRIES, res.entryId, {
            finishPosition: res.finishPosition,
            pointsAwarded: res.points,
            isEliminated: res.finishPosition > 1,
          });

          // 3. Update player career points and stats
          if (res.playerId) {
            try {
              const p = await tablesDb.getRow(DATABASE_ID, APPWRITE_TABLES.PLAYERS, res.playerId);
              const totalPoints = ((p as any).totalPoints || 0) + res.points;
              const gamesPlayed = ((p as any).gamesPlayed || 0) + 1;
              const careerWins = ((p as any).careerWins || 0) + (res.finishPosition === 1 ? 1 : 0);

              await tablesDb.updateRow(DATABASE_ID, APPWRITE_TABLES.PLAYERS, res.playerId, {
                totalPoints,
                gamesPlayed,
                careerWins,
              });
            } catch {}
          }
        } catch {}
      }

      return true;
    } catch (e) {
      console.error('Failed to finalize tournament:', e);
      return false;
    }
  }
}
