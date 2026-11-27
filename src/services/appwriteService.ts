import { databases, tablesDb, isAppwriteConfigured, DATABASE_ID, APPWRITE_TABLES, APPWRITE_COLLECTIONS, ID } from '../lib/appwrite';
import { 
  mockLeague, 
  mockLeagues,
  mockSeasons, 
  mockVenues, 
  mockPlayers, 
  mockEvents,
  mockGames, 
  mockGameEntries, 
  mockAnnouncements, 
  mockHotHandJackpot 
} from './mockData';
import type {
  League,
  Season,
  Venue,
  Player,
  Game,
  GameEntry,
  Announcement,
  HotHandJackpot,
  TournamentEvent,
  KnockoutCode,
  HandBonusCode,
  PointMultiplier,
  GameEntryStatus,
} from '../types/holdem';
import { calculateEntryScore, type FinalizedEntryResult } from '../lib/scoring';

const LOCAL_STORAGE_LEAGUES_KEY = 'holdem_leagues';
const LOCAL_STORAGE_LEAGUE_OVERRIDES_KEY = 'holdem_league_overrides';
const LOCAL_STORAGE_PLAYER_OVERRIDES_KEY = 'holdem_player_overrides';
const LOCAL_STORAGE_GAME_OVERRIDES_KEY = 'holdem_game_overrides';
const LOCAL_STORAGE_ENTRY_OVERRIDES_KEY = 'holdem_entry_overrides';
const SESSION_UNSUPPORTED_COLS_KEY = 'holdem_appwrite_unsupported_cols';
const SESSION_MISSING_TABLES_KEY = 'holdem_appwrite_missing_tables';
const SESSION_PLAYERS_TABLE_KEY = 'holdem_appwrite_players_table';

/**
 * Live schema column cache discovered from Appwrite listRows/getRow responses.
 * Prevents sending unprovisioned attributes (avoiding 400 Invalid document structure logs)
 * and prevents repeating 404 requests against unprovisioned tables.
 */
const knownTableColumns = new Map<string, Set<string>>();
const knownUnsupportedColumns = new Map<string, Set<string>>();
let missingTablesCache: Set<string> | null = null;
let resolvedPlayersTableCache: string | null | undefined = undefined;

function getMissingTables(): Set<string> {
  if (missingTablesCache) return missingTablesCache;
  missingTablesCache = new Set<string>();
  try {
    const raw = sessionStorage.getItem(SESSION_MISSING_TABLES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((t) => typeof t === 'string' && missingTablesCache!.add(t));
      }
    }
  } catch {
    // Ignore storage errors
  }
  return missingTablesCache;
}

function markTableMissing(tableId: string): void {
  const set = getMissingTables();
  set.add(tableId);
  try {
    sessionStorage.setItem(SESSION_MISSING_TABLES_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // Ignore storage errors
  }
}

function isTableNotFoundError(err: unknown): boolean {
  const code = getAppwriteErrorCode(err);
  if (code !== 404) return false;
  const type =
    typeof err === 'object' && err !== null && 'type' in err
      ? String((err as { type?: unknown }).type ?? '')
      : '';
  const msg =
    typeof err === 'object' && err !== null && 'message' in err
      ? String((err as { message?: unknown }).message ?? '')
      : '';
  return (
    type === 'collection_not_found' ||
    type === 'table_not_found' ||
    /collection with the requested id/i.test(msg) ||
    /table with the requested id/i.test(msg)
  );
}

function getResolvedPlayersTable(): string | null {
  if (resolvedPlayersTableCache !== undefined) return resolvedPlayersTableCache;
  try {
    const stored = sessionStorage.getItem(SESSION_PLAYERS_TABLE_KEY);
    if (stored === 'none') {
      resolvedPlayersTableCache = null;
      return null;
    }
    if (stored) {
      resolvedPlayersTableCache = stored;
      return stored;
    }
  } catch {
    // Ignore storage errors
  }
  return APPWRITE_TABLES.USERS;
}

function setResolvedPlayersTable(tableId: string | null): void {
  resolvedPlayersTableCache = tableId;
  try {
    sessionStorage.setItem(SESSION_PLAYERS_TABLE_KEY, tableId ?? 'none');
  } catch {
    // Ignore storage errors
  }
}

async function resilientListRows(tableId: string): Promise<any[] | null> {
  if (!isAppwriteConfigured || getMissingTables().has(tableId)) return null;
  try {
    const response = await tablesDb.listRows(DATABASE_ID, tableId);
    const items = (response as any).rows || (response as any).documents || [];
    recordTableColumns(tableId, items);
    return items;
  } catch (tablesErr: unknown) {
    if (isTableNotFoundError(tablesErr)) {
      markTableMissing(tableId);
      return null;
    }
    const code = getAppwriteErrorCode(tablesErr);
    if (code === 401 || code === 403 || code === 404) {
      return null;
    }
    try {
      const response = await databases.listDocuments(DATABASE_ID, tableId);
      const items = response.documents || [];
      recordTableColumns(tableId, items);
      return items;
    } catch (docErr: unknown) {
      if (isTableNotFoundError(docErr)) {
        markTableMissing(tableId);
      }
      return null;
    }
  }
}

function loadUnsupportedColumns(): void {
  if (knownUnsupportedColumns.size > 0) return;
  try {
    const raw = sessionStorage.getItem(SESSION_UNSUPPORTED_COLS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, string[]>;
    for (const [tableId, cols] of Object.entries(parsed)) {
      if (Array.isArray(cols)) {
        knownUnsupportedColumns.set(tableId, new Set(cols));
      }
    }
  } catch {
    // Ignore storage errors
  }
}

function recordUnsupportedColumn(tableId: string, col: string): void {
  loadUnsupportedColumns();
  let set = knownUnsupportedColumns.get(tableId);
  if (!set) {
    set = new Set<string>();
    knownUnsupportedColumns.set(tableId, set);
  }
  set.add(col);
  try {
    const obj: Record<string, string[]> = {};
    for (const [k, v] of knownUnsupportedColumns.entries()) {
      obj[k] = Array.from(v);
    }
    sessionStorage.setItem(SESSION_UNSUPPORTED_COLS_KEY, JSON.stringify(obj));
  } catch {
    // Ignore storage errors
  }
}

const KNOWN_RELATIONSHIP_KEYS: Record<string, string[]> = {
  [APPWRITE_TABLES.GAMES]: ['event'],
  [APPWRITE_TABLES.GAME_ENTRIES]: ['game', 'player'],
  [APPWRITE_TABLES.EVENTS]: ['season', 'venue'],
  [APPWRITE_TABLES.SEASONS]: ['league'],
  [APPWRITE_TABLES.VENUES]: ['league'],
  [APPWRITE_TABLES.USERS]: ['league'],
  [APPWRITE_TABLES.HOT_HANDS]: ['league'],
};

function recordTableColumns(tableId: string, rows: unknown[]): void {
  if (!Array.isArray(rows) || rows.length === 0) return;
  const sample = rows[0];
  if (!sample || typeof sample !== 'object') return;
  const cols = new Set<string>(KNOWN_RELATIONSHIP_KEYS[tableId] || []);
  for (const key of Object.keys(sample as Record<string, unknown>)) {
    if (!key.startsWith('$')) {
      cols.add(key);
    }
  }
  if (cols.size > 0) {
    knownTableColumns.set(tableId, cols);
  }
}

function filterPayloadForTable(
  tableId: string,
  rawPayload: Record<string, unknown>
): Record<string, unknown> {
  loadUnsupportedColumns();
  const knownCols = knownTableColumns.get(tableId);
  const unsupportedCols = knownUnsupportedColumns.get(tableId);
  const filtered: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(rawPayload)) {
    if (unsupportedCols?.has(key)) continue;
    if (knownCols && !knownCols.has(key)) continue;
    filtered[key] = value;
  }
  return filtered;
}

function getAppwriteErrorCode(err: unknown): number | null {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = Number((err as { code?: unknown }).code);
    return Number.isFinite(code) ? code : null;
  }
  return null;
}

function readOverrides<T>(storageKey: string): Record<string, Partial<T>> {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveOverride<T>(storageKey: string, id: string, updates: Partial<T>): void {
  try {
    const all = readOverrides<T>(storageKey);
    all[id] = { ...(all[id] || {}), ...updates };
    localStorage.setItem(storageKey, JSON.stringify(all));
  } catch {
    // Ignore storage quota errors
  }
}

function extractUnknownAttribute(err: unknown): string | null {
  const msg =
    typeof err === 'object' && err !== null && 'message' in err
      ? String((err as { message?: unknown }).message ?? '')
      : String(err ?? '');
  const match =
    msg.match(/Unknown attribute:\s*"([^"]+)"/i) ||
    msg.match(/attribute\s+"([^"]+)"\s+is\s+not\s+defined/i);
  return match ? match[1] : null;
}

/**
 * Updates an Appwrite row/document while pre-filtering against the live table
 * schema and caching any rejected attributes so 400 Unknown attribute errors
 * are avoided before `setup:appwrite` is re-run.
 */
async function resilientUpdateRow(
  tableId: string,
  rowId: string,
  rawPayload: Record<string, unknown>
): Promise<boolean> {
  if (getMissingTables().has(tableId)) return false;
  const payload = filterPayloadForTable(tableId, rawPayload);
  const maxAttempts = Object.keys(payload).length + 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (Object.keys(payload).length === 0) return true;
    try {
      await tablesDb.updateRow(DATABASE_ID, tableId, rowId, payload as any);
      return true;
    } catch (tablesErr: unknown) {
      if (isTableNotFoundError(tablesErr)) {
        markTableMissing(tableId);
        return false;
      }
      const unknownAttr = extractUnknownAttribute(tablesErr);
      if (unknownAttr && unknownAttr in payload) {
        recordUnsupportedColumn(tableId, unknownAttr);
        delete payload[unknownAttr];
        continue;
      }
      const code = getAppwriteErrorCode(tablesErr);
      // Do not double-request legacy Databases API on 400/401/403/404 responses
      if (code === 400 || code === 401 || code === 403 || code === 404) {
        return false;
      }
      try {
        await databases.updateDocument(DATABASE_ID, tableId, rowId, payload as any);
        return true;
      } catch (docErr: unknown) {
        if (isTableNotFoundError(docErr)) {
          markTableMissing(tableId);
          return false;
        }
        const docUnknownAttr = extractUnknownAttribute(docErr);
        if (docUnknownAttr && docUnknownAttr in payload) {
          recordUnsupportedColumn(tableId, docUnknownAttr);
          delete payload[docUnknownAttr];
          continue;
        }
        return false;
      }
    }
  }
  return false;
}

async function resilientCreateRow(
  tableId: string,
  rowId: string,
  rawPayload: Record<string, unknown>
): Promise<string | null> {
  if (getMissingTables().has(tableId)) return null;
  const payload = filterPayloadForTable(tableId, rawPayload);
  const maxAttempts = Object.keys(payload).length + 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await tablesDb.createRow(DATABASE_ID, tableId, rowId, payload as any);
      return res.$id || rowId;
    } catch (tablesErr: unknown) {
      if (isTableNotFoundError(tablesErr)) {
        markTableMissing(tableId);
        return null;
      }
      const unknownAttr = extractUnknownAttribute(tablesErr);
      if (unknownAttr && unknownAttr in payload) {
        recordUnsupportedColumn(tableId, unknownAttr);
        delete payload[unknownAttr];
        continue;
      }
      const code = getAppwriteErrorCode(tablesErr);
      if (code === 400 || code === 401 || code === 403 || code === 404 || code === 409) {
        return null;
      }
      try {
        const res = await databases.createDocument(DATABASE_ID, tableId, rowId, payload as any);
        return res.$id || rowId;
      } catch (docErr: unknown) {
        if (isTableNotFoundError(docErr)) {
          markTableMissing(tableId);
          return null;
        }
        const docUnknownAttr = extractUnknownAttribute(docErr);
        if (docUnknownAttr && docUnknownAttr in payload) {
          recordUnsupportedColumn(tableId, docUnknownAttr);
          delete payload[docUnknownAttr];
          continue;
        }
        return null;
      }
    }
  }
  return null;
}

function parseJsonArray<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as T[];
    } catch {
      // Fallback for comma-separated strings
      return raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean) as unknown as T[];
    }
  }
  return [];
}

function normalizeMultiplier(val: unknown): PointMultiplier {
  if (val === 2 || val === '2') return 2;
  if (val === 3 || val === '3') return 3;
  return 1;
}

export class AppwriteService {
  // Fetch All Platform Leagues (with local overrides merged for unprovisioned columns)
  static async getLeagues(): Promise<League[]> {
    const leagueOverrides = readOverrides<League>(LOCAL_STORAGE_LEAGUE_OVERRIDES_KEY);
    const applyOverrides = (list: League[]): League[] =>
      list.map((l) => (leagueOverrides[l.$id] ? { ...l, ...leagueOverrides[l.$id] } : l));

    const items = await resilientListRows(APPWRITE_TABLES.LEAGUES);
    if (items && items.length > 0) {
      const mapped: League[] = items.map((doc: any) => ({
        $id: doc.$id,
        name: doc.name || '',
        description: doc.description || '',
        logoUrl: doc.logoUrl || undefined,
        ownerId: doc.ownerId || 'user_admin',
        managerId: doc.managerId || undefined,
        managerName: doc.managerName || undefined,
        managerEmail: doc.managerEmail || undefined,
        createdAt: doc.createdAt || doc.$createdAt || new Date().toISOString(),
      }));
      return applyOverrides(mapped);
    }

    const cached = localStorage.getItem(LOCAL_STORAGE_LEAGUES_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return applyOverrides(parsed);
      } catch {}
    }

    localStorage.setItem(LOCAL_STORAGE_LEAGUES_KEY, JSON.stringify(mockLeagues));
    return applyOverrides(mockLeagues);
  }

  // Fetch League Details (by ID or default)
  static async getLeague(leagueId?: string): Promise<League> {
    const leagues = await this.getLeagues();
    if (leagueId) {
      const found = leagues.find((l) => l.$id === leagueId);
      if (found) return found;
    }
    return leagues[0] || mockLeague;
  }

  // Create New League (persists to Appwrite via resilientCreateRow + local cache)
  static async createLeague(leagueData: Omit<League, '$id' | 'createdAt'>): Promise<League> {
    const newId = ID.unique();
    const createdAt = new Date().toISOString();
    const payload: Record<string, unknown> = {
      name: leagueData.name,
      description: leagueData.description,
      ownerId: leagueData.ownerId || 'user_admin',
      createdAt,
    };
    if (leagueData.logoUrl) payload.logoUrl = leagueData.logoUrl;
    if (leagueData.managerId) payload.managerId = leagueData.managerId;
    if (leagueData.managerName) payload.managerName = leagueData.managerName;
    if (leagueData.managerEmail) payload.managerEmail = leagueData.managerEmail;

    let createdId = newId;
    if (isAppwriteConfigured) {
      const remoteId = await resilientCreateRow(APPWRITE_TABLES.LEAGUES, newId, payload);
      if (remoteId) createdId = remoteId;
    }

    const newLeague: League = {
      ...leagueData,
      $id: createdId,
      createdAt,
    };

    saveOverride<League>(LOCAL_STORAGE_LEAGUE_OVERRIDES_KEY, createdId, newLeague);
    const leagues = await this.getLeagues();
    const updated = [newLeague, ...leagues.filter((l) => l.$id !== createdId)];
    localStorage.setItem(LOCAL_STORAGE_LEAGUES_KEY, JSON.stringify(updated));
    return newLeague;
  }

  // Update League Information & Manager Assignment (persists to Appwrite via resilientUpdateRow)
  static async updateLeague(leagueId: string, updates: Partial<League>): Promise<boolean> {
    saveOverride<League>(LOCAL_STORAGE_LEAGUE_OVERRIDES_KEY, leagueId, updates);

    if (isAppwriteConfigured) {
      const payload: Record<string, unknown> = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.logoUrl !== undefined) payload.logoUrl = updates.logoUrl || '';
      if (updates.ownerId !== undefined) payload.ownerId = updates.ownerId;
      if (updates.managerId !== undefined) payload.managerId = updates.managerId || '';
      if (updates.managerName !== undefined) payload.managerName = updates.managerName || '';
      if (updates.managerEmail !== undefined) payload.managerEmail = updates.managerEmail || '';

      await resilientUpdateRow(APPWRITE_TABLES.LEAGUES, leagueId, payload);
    }

    const leagues = await this.getLeagues();
    const updated = leagues.map((l) => (l.$id === leagueId ? { ...l, ...updates } : l));
    localStorage.setItem(LOCAL_STORAGE_LEAGUES_KEY, JSON.stringify(updated));
    return true;
  }

  // Assign or Reassign League Manager
  static async assignLeagueManager(
    leagueId: string,
    manager: { id: string; name: string; email: string }
  ): Promise<boolean> {
    return this.updateLeague(leagueId, {
      managerId: manager.id,
      managerName: manager.name,
      managerEmail: manager.email,
    });
  }

  // Fetch Active & Historical Seasons
  static async getSeasons(): Promise<Season[]> {
    const items = await resilientListRows(APPWRITE_TABLES.SEASONS);
    return items && items.length > 0 ? (items as unknown as Season[]) : mockSeasons;
  }

  // Fetch Venues
  static async getVenues(): Promise<Venue[]> {
    const items = await resilientListRows(APPWRITE_TABLES.VENUES);
    return items && items.length > 0 ? (items as unknown as Venue[]) : mockVenues;
  }

  // Fetch Events within Seasons
  static async getEvents(seasonId?: string): Promise<TournamentEvent[]> {
    const items = await resilientListRows(APPWRITE_TABLES.EVENTS);
    if (!items || items.length === 0) {
      return seasonId && seasonId !== 'all' ? mockEvents.filter((e) => e.seasonId === seasonId) : mockEvents;
    }

    const mapped: TournamentEvent[] = items.map((doc: any) => ({
      $id: doc.$id,
      seasonId: typeof doc.season === 'object' && doc.season ? doc.season.$id : doc.season || doc.seasonId || 'season_2026_crawl3',
      venueId: typeof doc.venue === 'object' && doc.venue ? doc.venue.$id : doc.venue || doc.venueId || 'venue_single_barrel',
      venueName: typeof doc.venue === 'object' && doc.venue?.name ? doc.venue.name : doc.venueName || 'Single Barrel',
      title: doc.title,
      description: doc.description || '',
      scheduledAt: doc.scheduledAt,
      status: doc.status || 'scheduled',
      isRecurring: Boolean(doc.isRecurring),
      recurrenceRule: doc.recurrenceRule,
      seriesId: doc.seriesId,
      gamesCount: doc.gamesCount || 1,
    }));

    if (seasonId && seasonId !== 'all') {
      return mapped.filter((e) => e.seasonId === seasonId);
    }
    return mapped;
  }

  // Create Event
  static async createEvent(eventData: Omit<TournamentEvent, '$id'>): Promise<TournamentEvent> {
    const newId = ID.unique();
    const payload = {
      title: eventData.title,
      description: eventData.description || '',
      scheduledAt: eventData.scheduledAt,
      status: eventData.status || 'scheduled',
      isRecurring: Boolean(eventData.isRecurring),
      recurrenceRule: eventData.recurrenceRule || '',
      seriesId: eventData.seriesId || '',
      season: eventData.seasonId,
      venue: eventData.venueId,
    };

    if (isAppwriteConfigured) {
      try {
        const res = await tablesDb.createRow(DATABASE_ID, APPWRITE_TABLES.EVENTS, newId, payload);
        return {
          ...eventData,
          $id: res.$id || newId,
        };
      } catch (e) {
        console.warn('Appwrite createEvent failed, using local instance:', e);
      }
    }

    return {
      $id: newId,
      ...eventData,
    };
  }

  // Update Event
  static async updateEvent(eventId: string, updates: Partial<TournamentEvent>): Promise<boolean> {
    if (!isAppwriteConfigured) return true;
    try {
      const payload: Record<string, any> = {};
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.scheduledAt !== undefined) payload.scheduledAt = updates.scheduledAt;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.isRecurring !== undefined) payload.isRecurring = updates.isRecurring;
      if (updates.recurrenceRule !== undefined) payload.recurrenceRule = updates.recurrenceRule;
      if (updates.seasonId !== undefined) payload.season = updates.seasonId;
      if (updates.venueId !== undefined) payload.venue = updates.venueId;

      await tablesDb.updateRow(DATABASE_ID, APPWRITE_TABLES.EVENTS, eventId, payload);
      return true;
    } catch (e) {
      console.error('Failed to update event in Appwrite:', e);
      return false;
    }
  }

  // Delete Event
  static async deleteEvent(eventId: string): Promise<boolean> {
    if (!isAppwriteConfigured) return true;
    try {
      await tablesDb.deleteRow(DATABASE_ID, APPWRITE_TABLES.EVENTS, eventId);
      return true;
    } catch (e) {
      console.error('Failed to delete event in Appwrite:', e);
      return false;
    }
  }

  // Fetch Players & Standings (supports both 'users' and legacy 'players' tables + local player profiles)
  static async getPlayers(): Promise<Player[]> {
    const playerOverrides = readOverrides<Player>(LOCAL_STORAGE_PLAYER_OVERRIDES_KEY);
    const mergePlayers = (base: Player[]): Player[] => {
      const byId = new Map<string, Player>();
      for (const p of base) {
        byId.set(p.$id, playerOverrides[p.$id] ? { ...p, ...playerOverrides[p.$id] } : p);
      }
      for (const [id, override] of Object.entries(playerOverrides)) {
        if (!byId.has(id) && override.name) {
          byId.set(id, {
            $id: id,
            name: override.name,
            nickname: override.nickname,
            email: override.email || '',
            role: override.role || 'player',
            suitIcon: override.suitIcon || 'spades',
            isMember: override.isMember ?? true,
            totalPoints: override.totalPoints ?? 0,
            careerWins: override.careerWins ?? 0,
            careerKOs: override.careerKOs ?? 0,
            gamesPlayed: override.gamesPlayed ?? 0,
            highHandBadges: override.highHandBadges ?? 0,
            hasDgCarryover: override.hasDgCarryover ?? false,
          });
        }
      }
      return Array.from(byId.values());
    };

    if (!isAppwriteConfigured) return mergePlayers(mockPlayers);

    // If we already resolved which players table exists in this Appwrite DB, use it directly
    const cachedTable = resolvedPlayersTableCache !== undefined ? resolvedPlayersTableCache : (() => {
      try {
        const stored = sessionStorage.getItem(SESSION_PLAYERS_TABLE_KEY);
        if (stored === 'none') return null;
        return stored || undefined;
      } catch {
        return undefined;
      }
    })();

    if (cachedTable === null) return mergePlayers(mockPlayers);

    const candidates = cachedTable ? [cachedTable] : ['users', 'players'];
    for (const tableId of candidates) {
      const items = await resilientListRows(tableId);
      if (items !== null) {
        setResolvedPlayersTable(tableId);
        return mergePlayers(items.length > 0 ? (items as unknown as Player[]) : mockPlayers);
      }
    }

    setResolvedPlayersTable(null);
    return mergePlayers(mockPlayers);
  }

  // Sync a signed-up or signed-in player profile to Appwrite & local player roster
  static async upsertPlayerProfile(profile: {
    $id: string;
    name: string;
    nickname?: string;
    email?: string;
    role?: Player['role'];
    suitIcon?: Player['suitIcon'];
    isMember?: boolean;
    totalPoints?: number;
    careerWins?: number;
    careerKOs?: number;
    gamesPlayed?: number;
  }): Promise<Player> {
    const playerRecord: Player = {
      $id: profile.$id,
      name: profile.name,
      nickname: profile.nickname,
      email: profile.email || '',
      role: profile.role || 'player',
      suitIcon: profile.suitIcon || 'spades',
      isMember: profile.isMember ?? true,
      totalPoints: profile.totalPoints ?? 0,
      careerWins: profile.careerWins ?? 0,
      careerKOs: profile.careerKOs ?? 0,
      gamesPlayed: profile.gamesPlayed ?? 0,
      highHandBadges: 0,
      hasDgCarryover: false,
    };

    saveOverride<Player>(LOCAL_STORAGE_PLAYER_OVERRIDES_KEY, playerRecord.$id, playerRecord);
    const existingIdx = mockPlayers.findIndex((p) => p.$id === playerRecord.$id);
    if (existingIdx >= 0) {
      mockPlayers[existingIdx] = { ...mockPlayers[existingIdx], ...playerRecord };
    } else {
      mockPlayers.push(playerRecord);
    }

    if (isAppwriteConfigured) {
      const playersTable = getResolvedPlayersTable();
      if (playersTable && !getMissingTables().has(playersTable)) {
        const payload: Record<string, unknown> = {
          name: playerRecord.name,
          email: playerRecord.email || '',
          role: playerRecord.role || 'player',
          nickname: playerRecord.nickname || playerRecord.name,
          suitIcon: playerRecord.suitIcon,
          isMember: playerRecord.isMember,
          totalPoints: playerRecord.totalPoints,
          careerWins: playerRecord.careerWins,
          careerKOs: playerRecord.careerKOs,
          gamesPlayed: playerRecord.gamesPlayed,
          highHandBadges: playerRecord.highHandBadges || 0,
          hasDgCarryover: false,
          league: mockLeague.$id,
        };
        const updated = await resilientUpdateRow(playersTable, playerRecord.$id, payload);
        if (!updated) {
          await resilientCreateRow(playersTable, playerRecord.$id, payload);
        }
      }
    }

    return playerRecord;
  }

  // Fetch Games with relational event, venue & season fallback parsing + local overrides
  static async getGames(eventId?: string): Promise<Game[]> {
    const gameOverrides = readOverrides<Game>(LOCAL_STORAGE_GAME_OVERRIDES_KEY);
    const applyOverrides = (list: Game[]): Game[] =>
      list.map((g) => (gameOverrides[g.$id] ? { ...g, ...gameOverrides[g.$id] } : g));

    const items = await resilientListRows(APPWRITE_TABLES.GAMES);
    if (!items || items.length === 0) {
      const merged = applyOverrides(mockGames);
      if (eventId) return merged.filter((g) => g.eventId === eventId);
      return merged;
    }

    const mapped: Game[] = applyOverrides(items.map((doc: any) => ({
      $id: doc.$id,
      eventId: typeof doc.event === 'object' && doc.event ? doc.event.$id : doc.event || doc.eventId || 'event_sunday_showdown',
      seasonId: typeof doc.season === 'object' && doc.season ? doc.season.$id : doc.season || doc.seasonId || 'season_2026_crawl3',
      venueId: typeof doc.venue === 'object' && doc.venue ? doc.venue.$id : doc.venue || doc.venueId || 'venue_single_barrel',
      venueName: (typeof doc.venue === 'object' && doc.venue?.name) ? doc.venue.name : doc.venueName || 'Single Barrel',
      title: doc.title,
      scheduledAt: doc.scheduledAt,
      status: doc.status,
      dealerName: doc.dealerName,
      dealers: parseJsonArray<string>(doc.dealers),
      scribes: parseJsonArray<string>(doc.scribes),
      pointMultiplier: normalizeMultiplier(doc.pointMultiplier),
      isDayGame: Boolean(doc.isDayGame),
      noGamePlayed: Boolean(doc.noGamePlayed),
      hodRule: doc.hodRule || '',
      purpleCount: Number(doc.purpleCount || 0),
      buyinAmount: doc.buyinAmount,
      rebuyAmount: doc.rebuyAmount,
      addonAmount: doc.addonAmount,
      startingChips: doc.startingChips,
      hotHandJackpot: doc.hotHandJackpot,
      hotHandDescription: doc.hotHandDescription || '',
      totalPlayersCount: doc.totalPlayersCount,
      remainingPlayersCount: doc.remainingPlayersCount,
      totalEntriesCount: doc.totalEntriesCount,
      currentLevelIndex: doc.currentLevelIndex || 0,
      secondsRemainingInLevel: doc.secondsRemainingInLevel || 1200,
      blindSchedule: mockGames[0].blindSchedule,
      isRecurring: Boolean(doc.isRecurring),
      recurrenceRule: doc.recurrenceRule,
      seriesId: doc.seriesId,
      rsvpPlayerIds: parseJsonArray<string>(doc.rsvpPlayerIds),
    })));

    if (eventId) return mapped.filter((g) => g.eventId === eventId);
    return mapped;
  }

  // Toggle Player RSVP for a scheduled tournament
  static async toggleRSVP(gameId: string, playerId: string): Promise<Game> {
    const games = await this.getGames();
    const game = games.find((g) => g.$id === gameId);
    if (!game) throw new Error('Game not found');

    const currentRsvps = game.rsvpPlayerIds || [];
    const isRsvped = currentRsvps.includes(playerId);
    const updatedRsvps = isRsvped
      ? currentRsvps.filter((id) => id !== playerId)
      : [...currentRsvps, playerId];

    const updatedGame: Game = {
      ...game,
      rsvpPlayerIds: updatedRsvps,
    };

    if (isAppwriteConfigured) {
      await resilientUpdateRow(APPWRITE_TABLES.GAMES, gameId, {
        rsvpPlayerIds: JSON.stringify(updatedRsvps),
      });
    }

    saveOverride<Game>(LOCAL_STORAGE_GAME_OVERRIDES_KEY, gameId, {
      rsvpPlayerIds: updatedRsvps,
    });

    const gIdx = mockGames.findIndex((g) => g.$id === gameId);
    if (gIdx !== -1) {
      mockGames[gIdx] = updatedGame;
    }

    return updatedGame;
  }


  // Fetch Game Entries strictly scoped to a specific Game ID
  static async getGameEntries(gameId: string): Promise<GameEntry[]> {
    const entryOverrides = readOverrides<GameEntry>(LOCAL_STORAGE_ENTRY_OVERRIDES_KEY);
    const applyOverrides = (list: GameEntry[]): GameEntry[] =>
      list.map((e) => (entryOverrides[e.$id] ? { ...e, ...entryOverrides[e.$id] } : e));

    const filterLocalEntries = () =>
      applyOverrides(mockGameEntries.filter((ge) => ge.gameId === gameId));

    const items = await resilientListRows(APPWRITE_TABLES.GAME_ENTRIES);
    if (!items || items.length === 0) {
      return filterLocalEntries();
    }

    const mapped: GameEntry[] = items.map((doc: any) => {
      const knockouts = parseJsonArray<KnockoutCode>(doc.knockouts);
      const handBonuses = parseJsonArray<HandBonusCode>(doc.handBonuses);
      const kosCount = knockouts.length > 0 ? knockouts.length : Number(doc.kosCount || 0);
      const isEliminated = Boolean(doc.isEliminated);
      const status: GameEntryStatus =
        doc.status === 'ACTIVE' || doc.status === 'ELIMINATED' || doc.status === 'MUCK'
          ? doc.status
          : isEliminated
          ? 'ELIMINATED'
          : 'ACTIVE';
      const resolvedGameId =
        typeof doc.game === 'object' && doc.game
          ? doc.game.$id
          : doc.game || doc.gameId || '';

      return {
        $id: doc.$id,
        gameId: resolvedGameId,
        playerId: typeof doc.player === 'object' && doc.player ? doc.player.$id : doc.player || doc.playerId || '',
        playerName: (typeof doc.player === 'object' && doc.player?.name) ? doc.player.name : doc.playerName || '',
        playerSuitIcon: (typeof doc.player === 'object' && doc.player?.suitIcon) ? doc.player.suitIcon : doc.playerSuitIcon || 'spades',
        tableNumber: doc.tableNumber,
        seatNumber: doc.seatNumber,
        buyinsCount: doc.buyinsCount,
        rebuysCount: doc.rebuysCount,
        addonsCount: doc.addonsCount,
        status,
        hasDgCarryover: Boolean(doc.hasDgCarryover),
        earnedDgForNextGame: Boolean(doc.earnedDgForNextGame),
        survivedRebuy: Boolean(doc.survivedRebuy),
        rebuyOnly: Boolean(doc.rebuyOnly),
        finishPosition: doc.finishPosition || undefined,
        pointsAwarded: doc.pointsAwarded,
        kosCount,
        knockouts: knockouts.length > 0 ? knockouts : Array.from({ length: kosCount }, () => 'K' as KnockoutCode),
        handBonuses,
        eliminatedBySeat: doc.eliminatedBySeat || undefined,
        knockedOutByPlayerId: doc.knockedOutByPlayerId || undefined,
        knockedOutByPlayerName: doc.knockedOutByPlayerName || undefined,
        calculatedBasePoints: doc.calculatedBasePoints,
        calculatedFinalPoints: doc.calculatedFinalPoints,
        isEliminated,
      };
    });

    const scoped = applyOverrides(mapped.filter((entry) => entry.gameId === gameId));
    if (scoped.length > 0) return scoped;

    // If this game exists only in local seed/session data or has no remote rows yet
    return filterLocalEntries();
  }

  // Fetch Announcements
  static async getAnnouncements(): Promise<Announcement[]> {
    const items = await resilientListRows(APPWRITE_TABLES.ANNOUNCEMENTS);
    return items && items.length > 0 ? (items as unknown as Announcement[]) : mockAnnouncements;
  }

  // Fetch Current Hot Hand Jackpot
  static async getHotHandJackpot(): Promise<HotHandJackpot> {
    if (!isAppwriteConfigured || getMissingTables().has(APPWRITE_TABLES.HOT_HANDS)) {
      return mockHotHandJackpot;
    }
    try {
      const response = await tablesDb.getRow(DATABASE_ID, APPWRITE_TABLES.HOT_HANDS, mockHotHandJackpot.$id);
      return response as unknown as HotHandJackpot;
    } catch (err: unknown) {
      if (isTableNotFoundError(err)) {
        markTableMissing(APPWRITE_TABLES.HOT_HANDS);
      }
      return mockHotHandJackpot;
    }
  }

  // --- MUTATION METHODS ---

  /**
   * Update live game blind level and countdown
   */
  static async updateGameClock(gameId: string, currentLevelIndex: number, secondsRemainingInLevel: number): Promise<boolean> {
    saveOverride<Game>(LOCAL_STORAGE_GAME_OVERRIDES_KEY, gameId, {
      currentLevelIndex,
      secondsRemainingInLevel,
    });
    if (!isAppwriteConfigured) return true;
    await resilientUpdateRow(APPWRITE_TABLES.GAMES, gameId, {
      currentLevelIndex,
      secondsRemainingInLevel,
    });
    return true;
  }

  /**
   * Update Game Status (e.g., 'running' -> 'paused' -> 'completed')
   */
  static async updateGameStatus(gameId: string, status: 'scheduled' | 'running' | 'paused' | 'completed' | 'canceled'): Promise<boolean> {
    saveOverride<Game>(LOCAL_STORAGE_GAME_OVERRIDES_KEY, gameId, { status });
    if (!isAppwriteConfigured) return true;
    await resilientUpdateRow(APPWRITE_TABLES.GAMES, gameId, { status });
    return true;
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
    const payload: Record<string, unknown> = {
      title: gameData.title,
      scheduledAt: gameData.scheduledAt,
      status: gameData.status || 'scheduled',
      dealerName: gameData.dealerName || '',
      dealers: JSON.stringify(gameData.dealers || (gameData.dealerName ? [gameData.dealerName] : [])),
      scribes: JSON.stringify(gameData.scribes || []),
      pointMultiplier: gameData.pointMultiplier || 1,
      isDayGame: Boolean(gameData.isDayGame),
      noGamePlayed: Boolean(gameData.noGamePlayed),
      hodRule: gameData.hodRule || '',
      hotHandDescription: gameData.hotHandDescription || '',
      purpleCount: gameData.purpleCount || 0,
      buyinAmount: gameData.buyinAmount || 0,
      rebuyAmount: gameData.rebuyAmount || 0,
      addonAmount: gameData.addonAmount || 0,
      startingChips: gameData.startingChips || 15000,
      hotHandJackpot: gameData.hotHandJackpot || 0,
      totalPlayersCount: gameData.totalPlayersCount || 0,
      remainingPlayersCount: gameData.remainingPlayersCount || 0,
      totalEntriesCount: gameData.totalEntriesCount || 0,
      currentLevelIndex: gameData.currentLevelIndex || 0,
      secondsRemainingInLevel: gameData.secondsRemainingInLevel || 1200,
      rsvpPlayerIds: JSON.stringify(gameData.rsvpPlayerIds || []),
      seasonId: gameData.seasonId || 'season_2026_crawl3',
      venueId: gameData.venueId,
      venueName: gameData.venueName,
      event: gameData.eventId,
    };

    let createdId = newId;
    if (isAppwriteConfigured) {
      const remoteId = await resilientCreateRow(APPWRITE_TABLES.GAMES, newId, payload);
      if (remoteId) createdId = remoteId;
    }

    const createdGame: Game = {
      ...gameData,
      $id: createdId,
      blindSchedule: gameData.blindSchedule?.length
        ? gameData.blindSchedule
        : mockGames[0].blindSchedule,
    };

    mockGames.unshift(createdGame);
    saveOverride<Game>(LOCAL_STORAGE_GAME_OVERRIDES_KEY, createdId, createdGame);
    return createdGame;
  }

  static async updateGame(gameId: string, updates: Partial<Game>): Promise<boolean> {
    // Always sync local offline cache & localStorage overrides so edits persist reliably
    const localIdx = mockGames.findIndex((g) => g.$id === gameId);
    if (localIdx !== -1) {
      mockGames[localIdx] = { ...mockGames[localIdx], ...updates };
    }
    saveOverride<Game>(LOCAL_STORAGE_GAME_OVERRIDES_KEY, gameId, updates);

    if (!isAppwriteConfigured) return true;

    const payload: Record<string, unknown> = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.scheduledAt !== undefined) payload.scheduledAt = updates.scheduledAt;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.dealerName !== undefined) payload.dealerName = updates.dealerName;
    if (updates.dealers !== undefined) payload.dealers = JSON.stringify(updates.dealers);
    if (updates.scribes !== undefined) payload.scribes = JSON.stringify(updates.scribes);
    if (updates.pointMultiplier !== undefined) payload.pointMultiplier = updates.pointMultiplier;
    if (updates.isDayGame !== undefined) payload.isDayGame = updates.isDayGame;
    if (updates.noGamePlayed !== undefined) payload.noGamePlayed = updates.noGamePlayed;
    if (updates.hodRule !== undefined) payload.hodRule = updates.hodRule;
    if (updates.hotHandDescription !== undefined) payload.hotHandDescription = updates.hotHandDescription;
    if (updates.purpleCount !== undefined) payload.purpleCount = updates.purpleCount;
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
    if (updates.rsvpPlayerIds !== undefined) payload.rsvpPlayerIds = JSON.stringify(updates.rsvpPlayerIds);
    if (updates.venueId !== undefined) payload.venueId = updates.venueId;
    if (updates.venueName !== undefined) payload.venueName = updates.venueName;
    if (updates.seasonId !== undefined) payload.seasonId = updates.seasonId;
    if (updates.eventId !== undefined) payload.event = updates.eventId;

    await resilientUpdateRow(APPWRITE_TABLES.GAMES, gameId, payload);
    // Always succeed gracefully using local fallback if Appwrite rejects or is offline
    return true;
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
    const baseEntry: GameEntry = {
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
      status: 'ACTIVE',
      hasDgCarryover: Boolean(player.hasDgCarryover),
      earnedDgForNextGame: false,
      survivedRebuy: false,
      rebuyOnly: false,
      finishPosition: undefined,
      pointsAwarded: 0,
      kosCount: 0,
      knockouts: [],
      handBonuses: [],
      isEliminated: false,
    };

    const initialScore = calculateEntryScore(baseEntry, currentGame);
    const newEntry: GameEntry = {
      ...baseEntry,
      calculatedBasePoints: initialScore.basePoints,
      calculatedFinalPoints: initialScore.finalPoints,
      pointsAwarded: initialScore.finalPoints,
    };

    const payload = {
      playerName: newEntry.playerName,
      playerSuitIcon: newEntry.playerSuitIcon,
      tableNumber,
      seatNumber,
      buyinsCount: 1,
      rebuysCount: 0,
      addonsCount: 0,
      status: 'ACTIVE',
      hasDgCarryover: Boolean(newEntry.hasDgCarryover),
      earnedDgForNextGame: false,
      survivedRebuy: false,
      rebuyOnly: false,
      finishPosition: 0,
      pointsAwarded: newEntry.pointsAwarded,
      kosCount: 0,
      knockouts: JSON.stringify([]),
      handBonuses: JSON.stringify([]),
      eliminatedBySeat: 0,
      knockedOutByPlayerId: '',
      knockedOutByPlayerName: '',
      calculatedBasePoints: initialScore.basePoints,
      calculatedFinalPoints: initialScore.finalPoints,
      isEliminated: false,
      game: gameId,
      player: player.$id,
    };

    if (isAppwriteConfigured) {
      const remoteId = await resilientCreateRow(APPWRITE_TABLES.GAME_ENTRIES, newId, payload);
      if (remoteId) newEntry.$id = remoteId;

      await resilientUpdateRow(APPWRITE_TABLES.GAMES, gameId, {
        totalPlayersCount: currentGame.totalPlayersCount + 1,
        remainingPlayersCount: currentGame.remainingPlayersCount + 1,
        totalEntriesCount: currentGame.totalEntriesCount + 1,
      });
    }

    mockGameEntries.push(newEntry);
    saveOverride<GameEntry>(LOCAL_STORAGE_ENTRY_OVERRIDES_KEY, newEntry.$id, newEntry);
    return newEntry;
  }

  static async updateGameEntryScoring(
    entryId: string,
    updates: Partial<GameEntry>
  ): Promise<boolean> {
    const localIdx = mockGameEntries.findIndex((e) => e.$id === entryId);
    if (localIdx !== -1) {
      mockGameEntries[localIdx] = { ...mockGameEntries[localIdx], ...updates };
    }
    saveOverride<GameEntry>(LOCAL_STORAGE_ENTRY_OVERRIDES_KEY, entryId, updates);

    if (!isAppwriteConfigured) return true;
    const payload: Record<string, unknown> = {};
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.isEliminated !== undefined) payload.isEliminated = updates.isEliminated;
    if (updates.hasDgCarryover !== undefined) payload.hasDgCarryover = updates.hasDgCarryover;
    if (updates.earnedDgForNextGame !== undefined) payload.earnedDgForNextGame = updates.earnedDgForNextGame;
    if (updates.survivedRebuy !== undefined) payload.survivedRebuy = updates.survivedRebuy;
    if (updates.rebuyOnly !== undefined) payload.rebuyOnly = updates.rebuyOnly;
    if (updates.finishPosition !== undefined) payload.finishPosition = updates.finishPosition || 0;
    if (updates.kosCount !== undefined) payload.kosCount = updates.kosCount;
    if (updates.knockouts !== undefined) payload.knockouts = JSON.stringify(updates.knockouts);
    if (updates.handBonuses !== undefined) payload.handBonuses = JSON.stringify(updates.handBonuses);
    if (updates.eliminatedBySeat !== undefined) payload.eliminatedBySeat = updates.eliminatedBySeat || 0;
    if (updates.knockedOutByPlayerId !== undefined) payload.knockedOutByPlayerId = updates.knockedOutByPlayerId || '';
    if (updates.knockedOutByPlayerName !== undefined) payload.knockedOutByPlayerName = updates.knockedOutByPlayerName || '';
    if (updates.calculatedBasePoints !== undefined) payload.calculatedBasePoints = updates.calculatedBasePoints;
    if (updates.calculatedFinalPoints !== undefined) payload.calculatedFinalPoints = updates.calculatedFinalPoints;
    if (updates.pointsAwarded !== undefined) payload.pointsAwarded = updates.pointsAwarded;

    await resilientUpdateRow(APPWRITE_TABLES.GAME_ENTRIES, entryId, payload);
    return true;
  }

  static async updatePlayerRebuys(
    gameId: string,
    entryId: string,
    rebuysCount: number,
    currentGame: Game
  ): Promise<boolean> {
    saveOverride<GameEntry>(LOCAL_STORAGE_ENTRY_OVERRIDES_KEY, entryId, { rebuysCount });
    if (!isAppwriteConfigured) return true;
    await resilientUpdateRow(APPWRITE_TABLES.GAME_ENTRIES, entryId, { rebuysCount });
    await resilientUpdateRow(APPWRITE_TABLES.GAMES, gameId, {
      totalEntriesCount: currentGame.totalEntriesCount + 1,
    });
    return true;
  }

  static async updatePlayerAddons(
    entryId: string,
    addonsCount: number
  ): Promise<boolean> {
    saveOverride<GameEntry>(LOCAL_STORAGE_ENTRY_OVERRIDES_KEY, entryId, { addonsCount });
    if (!isAppwriteConfigured) return true;
    await resilientUpdateRow(APPWRITE_TABLES.GAME_ENTRIES, entryId, { addonsCount });
    return true;
  }

  static async movePlayerSeat(
    entryId: string,
    tableNumber: number,
    seatNumber: number
  ): Promise<boolean> {
    saveOverride<GameEntry>(LOCAL_STORAGE_ENTRY_OVERRIDES_KEY, entryId, {
      tableNumber,
      seatNumber,
    });
    if (!isAppwriteConfigured) return true;
    await resilientUpdateRow(APPWRITE_TABLES.GAME_ENTRIES, entryId, {
      tableNumber,
      seatNumber,
    });
    return true;
  }

  static async recordEliminationWithKO(
    gameId: string,
    eliminatedEntryId: string,
    finishPosition: number,
    remainingPlayersCount: number,
    koWinnerEntryId?: string,
    koWinnerPlayerId?: string,
    options?: {
      koType?: KnockoutCode | null;
      eliminatedBySeat?: number;
      knockedOutByPlayerName?: string;
      isMuck?: boolean;
    }
  ): Promise<boolean> {
    const status: GameEntryStatus = options?.isMuck ? 'MUCK' : 'ELIMINATED';
    const koType = options?.koType === undefined ? 'K' : options.koType;

    // Update local offline cache
    const elimIdx = mockGameEntries.findIndex((e) => e.$id === eliminatedEntryId);
    if (elimIdx !== -1) {
      mockGameEntries[elimIdx] = {
        ...mockGameEntries[elimIdx],
        status,
        isEliminated: true,
        finishPosition,
        eliminatedBySeat: options?.eliminatedBySeat,
        knockedOutByPlayerId: koWinnerPlayerId || undefined,
        knockedOutByPlayerName: options?.knockedOutByPlayerName,
      };
    }

    if (koWinnerEntryId && koType) {
      const killerIdx = mockGameEntries.findIndex((e) => e.$id === koWinnerEntryId);
      if (killerIdx !== -1) {
        const nextKOs: KnockoutCode[] = [...(mockGameEntries[killerIdx].knockouts || []), koType];
        mockGameEntries[killerIdx] = {
          ...mockGameEntries[killerIdx],
          knockouts: nextKOs,
          kosCount: nextKOs.length,
        };
      }
    }

    saveOverride<GameEntry>(LOCAL_STORAGE_ENTRY_OVERRIDES_KEY, eliminatedEntryId, {
      status,
      isEliminated: true,
      finishPosition,
      eliminatedBySeat: options?.eliminatedBySeat,
      knockedOutByPlayerId: koWinnerPlayerId || undefined,
      knockedOutByPlayerName: options?.knockedOutByPlayerName,
    });
    saveOverride<Game>(LOCAL_STORAGE_GAME_OVERRIDES_KEY, gameId, { remainingPlayersCount });

    if (!isAppwriteConfigured) return true;
    try {
      // 1. Mark eliminated player (preserving elimination record even if MUCK)
      await resilientUpdateRow(APPWRITE_TABLES.GAME_ENTRIES, eliminatedEntryId, {
        status,
        isEliminated: true,
        finishPosition,
        eliminatedBySeat: options?.eliminatedBySeat || 0,
        knockedOutByPlayerId: koWinnerPlayerId || '',
        knockedOutByPlayerName: options?.knockedOutByPlayerName || '',
      });

      // 2. Decrement remaining players on game
      await resilientUpdateRow(APPWRITE_TABLES.GAMES, gameId, {
        remainingPlayersCount,
      });

      // 3. Award KO (K or R) to killer if applicable
      if (koWinnerEntryId && koType) {
        try {
          const entry = await tablesDb.getRow(DATABASE_ID, APPWRITE_TABLES.GAME_ENTRIES, koWinnerEntryId);
          const existingKOs = parseJsonArray<KnockoutCode>((entry as any).knockouts);
          const fallbackKOs: KnockoutCode[] =
            existingKOs.length > 0
              ? existingKOs
              : Array.from({ length: Number((entry as any).kosCount || 0) }, () => 'K' as KnockoutCode);
          const updatedKOs: KnockoutCode[] = [...fallbackKOs, koType];
          await resilientUpdateRow(APPWRITE_TABLES.GAME_ENTRIES, koWinnerEntryId, {
            kosCount: updatedKOs.length,
            knockouts: JSON.stringify(updatedKOs),
          });
        } catch {}
      }

      if (koWinnerPlayerId && koType) {
        const playersTable = getResolvedPlayersTable();
        if (playersTable && !getMissingTables().has(playersTable)) {
          try {
            const player = await tablesDb.getRow(DATABASE_ID, playersTable, koWinnerPlayerId);
            const careerKOs = (player as any).careerKOs || 0;
            await resilientUpdateRow(playersTable, koWinnerPlayerId, {
              careerKOs: careerKOs + 1,
            });
          } catch (err: unknown) {
            if (isTableNotFoundError(err)) markTableMissing(playersTable);
          }
        }
      }

      return true;
    } catch (e) {
      console.warn('Appwrite recordEliminationWithKO fell back to local cache:', e);
      return true;
    }
  }

  static async finalizeTournament(
    gameId: string,
    results: FinalizedEntryResult[]
  ): Promise<boolean> {
    // Sync local offline mock caches
    const gameIdx = mockGames.findIndex((g) => g.$id === gameId);
    if (gameIdx !== -1) {
      mockGames[gameIdx] = {
        ...mockGames[gameIdx],
        status: 'completed',
        remainingPlayersCount: 0,
      };
    }
    for (const res of results) {
      const entryIdx = mockGameEntries.findIndex((e) => e.$id === res.entryId);
      if (entryIdx !== -1) {
        mockGameEntries[entryIdx] = {
          ...mockGameEntries[entryIdx],
          finishPosition: res.finishPosition,
          status: res.status,
          isEliminated: res.finishPosition > 1 || res.status === 'MUCK',
          earnedDgForNextGame: res.earnedDgForNextGame,
          calculatedBasePoints: res.basePoints,
          calculatedFinalPoints: res.finalPoints,
          pointsAwarded: res.finalPoints,
          knockouts: res.knockouts,
          kosCount: res.knockouts.length,
          handBonuses: res.handBonuses,
        };
      }
      const pIdx = mockPlayers.findIndex((p) => p.$id === res.playerId);
      if (pIdx !== -1) {
        mockPlayers[pIdx] = {
          ...mockPlayers[pIdx],
          totalPoints: mockPlayers[pIdx].totalPoints + res.finalPoints,
          gamesPlayed: mockPlayers[pIdx].gamesPlayed + 1,
          careerWins: mockPlayers[pIdx].careerWins + (res.finishPosition === 1 && res.status !== 'MUCK' ? 1 : 0),
          highHandBadges: (mockPlayers[pIdx].highHandBadges || 0) + res.highHandCount,
          hasDgCarryover: res.nextHasDgCarryover,
        };
      }
    }

    saveOverride<Game>(LOCAL_STORAGE_GAME_OVERRIDES_KEY, gameId, {
      status: 'completed',
      remainingPlayersCount: 0,
    });
    for (const res of results) {
      saveOverride<GameEntry>(LOCAL_STORAGE_ENTRY_OVERRIDES_KEY, res.entryId, {
        finishPosition: res.finishPosition,
        status: res.status,
        isEliminated: res.finishPosition > 1 || res.status === 'MUCK',
        earnedDgForNextGame: res.earnedDgForNextGame,
        calculatedBasePoints: res.basePoints,
        calculatedFinalPoints: res.finalPoints,
        pointsAwarded: res.finalPoints,
        knockouts: res.knockouts,
        kosCount: res.knockouts.length,
        handBonuses: res.handBonuses,
      });
    }

    if (!isAppwriteConfigured) return true;
    try {
      // 1. Update Game to completed
      await resilientUpdateRow(APPWRITE_TABLES.GAMES, gameId, {
        status: 'completed',
        remainingPlayersCount: 0,
      });

      // 2. Update each game entry with official Jack Ten Poker scoring & DG carryover
      for (const res of results) {
        try {
          await resilientUpdateRow(APPWRITE_TABLES.GAME_ENTRIES, res.entryId, {
            finishPosition: res.finishPosition,
            status: res.status,
            isEliminated: res.finishPosition > 1 || res.status === 'MUCK',
            earnedDgForNextGame: res.earnedDgForNextGame,
            calculatedBasePoints: res.basePoints,
            calculatedFinalPoints: res.finalPoints,
            pointsAwarded: res.finalPoints,
            knockouts: JSON.stringify(res.knockouts),
            kosCount: res.knockouts.length,
            handBonuses: JSON.stringify(res.handBonuses),
          });

          // 3. Update player career stats & next-game DG carryover flag
          if (res.playerId) {
            const playersTable = getResolvedPlayersTable();
            if (playersTable && !getMissingTables().has(playersTable)) {
              try {
                const p = await tablesDb.getRow(DATABASE_ID, playersTable, res.playerId);
                const totalPoints = ((p as any).totalPoints || 0) + res.finalPoints;
                const gamesPlayed = ((p as any).gamesPlayed || 0) + 1;
                const careerWins =
                  ((p as any).careerWins || 0) + (res.finishPosition === 1 && res.status !== 'MUCK' ? 1 : 0);
                const highHandBadges = ((p as any).highHandBadges || 0) + res.highHandCount;

                await resilientUpdateRow(playersTable, res.playerId, {
                  totalPoints,
                  gamesPlayed,
                  careerWins,
                  highHandBadges,
                  hasDgCarryover: res.nextHasDgCarryover,
                });
              } catch (err: unknown) {
                if (isTableNotFoundError(err)) markTableMissing(playersTable);
              }
            }
          }
        } catch {}
      }

      return true;
    } catch (e) {
      console.warn('Appwrite finalizeTournament fell back to local cache:', e);
      return true;
    }
  }
}
