import {
  databases,
  tablesDb,
  storage,
  isAppwriteConfigured,
  isPlatformAdminIdentity,
  APPWRITE_ENDPOINT,
  DATABASE_ID,
  VENUE_IMAGES_BUCKET_ID,
  APPWRITE_TABLES,
  APPWRITE_COLLECTIONS,
  ID,
  Query,
} from '../lib/appwrite';
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
  UserRole,
} from '../types/holdem';
import {
  OFFICIAL_BLIND_SCHEDULE,
  calculateEntryScore,
  hasReachedShowUpCutoff,
  type FinalizedEntryResult,
} from '../lib/scoring';
import type { LiveScoreNotification } from '../lib/liveScoreEvents';
import {
  GAME_CLOCK_ANNOUNCEMENT_TYPE,
  applyLevelDurationOverrides,
  calibrateServerClockFromResponse,
  getClockRowId,
  getServerNowMs,
  parseClockAnnouncementPayload,
  shouldAcceptIncomingClockAnchor,
  type GameClockSnapshot,
} from '../lib/gameClock';
import {
  ENTRY_SCORING_META_ANNOUNCEMENT_TYPE,
  buildEntryScoringMeta,
  getEntryScoringMetaRowId,
  mergeEntryWithScoringMeta,
  parseEntryScoringMetaPayload,
  type EntryScoringMeta,
} from '../lib/entryScoringMeta';
import { AppwriteRealtime } from './appwriteRealtime';
import {
  assertPermission,
  canAssignRole,
  getActiveActor,
  hasPermission,
  PermissionError,
} from '../lib/permissions';

export const LIVE_SCORE_EVENT_ANNOUNCEMENT_TYPE = 'live_score_event';
export { GAME_CLOCK_ANNOUNCEMENT_TYPE, ENTRY_SCORING_META_ANNOUNCEMENT_TYPE };

const SESSION_CACHE_SCOPE = `${APPWRITE_ENDPOINT || 'offline'}__${DATABASE_ID}`;
const LOCAL_STORAGE_LEAGUES_KEY = 'holdem_leagues';
const LOCAL_STORAGE_LEAGUE_OVERRIDES_KEY = 'holdem_league_overrides';
const LOCAL_STORAGE_VENUE_OVERRIDES_KEY = 'holdem_venue_overrides';
const LOCAL_STORAGE_VENUE_DELETED_KEY = 'holdem_venue_deleted';
const LOCAL_STORAGE_PLAYER_OVERRIDES_KEY = 'holdem_player_overrides';
const LOCAL_STORAGE_ANNOUNCEMENT_OVERRIDES_KEY = 'holdem_announcement_overrides';
const LOCAL_STORAGE_ANNOUNCEMENT_DELETED_KEY = 'holdem_announcement_deleted';
const LOCAL_STORAGE_GAME_OVERRIDES_KEY = 'holdem_game_overrides';
const LOCAL_STORAGE_GAME_DELETED_KEY = 'holdem_game_deleted';
const LOCAL_STORAGE_ENTRY_OVERRIDES_KEY = 'holdem_entry_overrides';
const SESSION_UNSUPPORTED_COLS_KEY = `holdem_appwrite_unsupported_cols__${SESSION_CACHE_SCOPE}`;
const SESSION_MISSING_TABLES_KEY = `holdem_appwrite_missing_tables__${SESSION_CACHE_SCOPE}`;
const SESSION_PLAYERS_TABLE_KEY = `holdem_appwrite_players_table__${SESSION_CACHE_SCOPE}`;

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
    const response = await tablesDb.listRows(DATABASE_ID, tableId, [Query.limit(500)]);
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
      console.warn(`Appwrite listRows("${tableId}") returned HTTP ${code}:`, tablesErr);
      return null;
    }
    try {
      const response = await databases.listDocuments(DATABASE_ID, tableId, [Query.limit(500)]);
      const items = response.documents || [];
      recordTableColumns(tableId, items);
      return items;
    } catch (docErr: unknown) {
      if (isTableNotFoundError(docErr)) {
        markTableMissing(tableId);
      } else {
        console.warn(`Appwrite listDocuments("${tableId}") failed:`, docErr);
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
  // Never write localStorage overrides when connected to Appwrite; Appwrite is the source of truth.
  if (isAppwriteConfigured) return;
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
  private static async resolveActiveLeagueId(preferredLeagueId?: string): Promise<string> {
    if (!isAppwriteConfigured) {
      return preferredLeagueId || mockLeague.$id;
    }
    if (preferredLeagueId && preferredLeagueId !== mockLeague.$id) {
      return preferredLeagueId;
    }
    const leagues = await this.getLeagues();
    return leagues[0]?.$id || '';
  }

  // Fetch All Platform Leagues (strictly Appwrite rows when Appwrite is configured)
  static async getLeagues(): Promise<League[]> {
    if (isAppwriteConfigured) {
      const items = await resilientListRows(APPWRITE_TABLES.LEAGUES);
      if (!items) return [];
      return items.map((doc: any) => ({
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
    }

    const leagueOverrides = readOverrides<League>(LOCAL_STORAGE_LEAGUE_OVERRIDES_KEY);
    const applyOverrides = (list: League[]): League[] =>
      list.map((l) => (leagueOverrides[l.$id] ? { ...l, ...leagueOverrides[l.$id] } : l));

    const cached = localStorage.getItem(LOCAL_STORAGE_LEAGUES_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return applyOverrides(parsed);
      } catch { }
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
    if (leagues[0]) return leagues[0];
    if (isAppwriteConfigured) {
      return {
        $id: '',
        name: "Hold'em Pro",
        description: '',
        ownerId: '',
        createdAt: new Date().toISOString(),
      };
    }
    return mockLeague;
  }

  // Create New League (Platform Admin only)
  static async createLeague(leagueData: Omit<League, '$id' | 'createdAt'>): Promise<League> {
    assertPermission('league:create');
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

    if (!isAppwriteConfigured) {
      saveOverride<League>(LOCAL_STORAGE_LEAGUE_OVERRIDES_KEY, createdId, newLeague);
      const leagues = await this.getLeagues();
      const updated = [newLeague, ...leagues.filter((l) => l.$id !== createdId)];
      localStorage.setItem(LOCAL_STORAGE_LEAGUES_KEY, JSON.stringify(updated));
    }
    return newLeague;
  }

  // Update League Information & Manager Assignment (Platform Admin only)
  static async updateLeague(leagueId: string, updates: Partial<League>): Promise<boolean> {
    assertPermission('league:manage');
    if (isAppwriteConfigured) {
      const payload: Record<string, unknown> = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.logoUrl !== undefined) payload.logoUrl = updates.logoUrl || '';
      if (updates.ownerId !== undefined) payload.ownerId = updates.ownerId;
      if (updates.managerId !== undefined) payload.managerId = updates.managerId || '';
      if (updates.managerName !== undefined) payload.managerName = updates.managerName || '';
      if (updates.managerEmail !== undefined) payload.managerEmail = updates.managerEmail || '';

      return resilientUpdateRow(APPWRITE_TABLES.LEAGUES, leagueId, payload);
    }

    saveOverride<League>(LOCAL_STORAGE_LEAGUE_OVERRIDES_KEY, leagueId, updates);
    const leagues = await this.getLeagues();
    const updated = leagues.map((l) => (l.$id === leagueId ? { ...l, ...updates } : l));
    localStorage.setItem(LOCAL_STORAGE_LEAGUES_KEY, JSON.stringify(updated));
    return true;
  }

  // Assign or Reassign League Manager (Platform Admin only)
  static async assignLeagueManager(
    leagueId: string,
    manager: { id: string; name: string; email: string }
  ): Promise<boolean> {
    assertPermission('league:assign_manager');
    return this.updateLeague(leagueId, {
      managerId: manager.id,
      managerName: manager.name,
      managerEmail: manager.email,
    });
  }

  // Fetch Active & Historical Seasons
  static async getSeasons(): Promise<Season[]> {
    if (!isAppwriteConfigured) return mockSeasons;

    const items = await resilientListRows(APPWRITE_TABLES.SEASONS);
    if (!items) return [];
    return items.map((doc: any) => ({
      $id: doc.$id,
      leagueId:
        typeof doc.league === 'object' && doc.league
          ? doc.league.$id
          : doc.league || doc.leagueId || '',
      name: doc.name || '',
      startDate: doc.startDate || '',
      endDate: doc.endDate || '',
      isActive: Boolean(doc.isActive),
    }));
  }

  // Fetch Venues (strictly Appwrite rows when Appwrite is configured; demo fallback only when offline)
  static async getVenues(): Promise<Venue[]> {
    if (isAppwriteConfigured) {
      const items = await resilientListRows(APPWRITE_TABLES.VENUES);
      if (!items) return [];
      return items.map((doc: any) => ({
        $id: doc.$id,
        leagueId:
          typeof doc.league === 'object' && doc.league
            ? doc.league.$id
            : doc.league || doc.leagueId || '',
        name: doc.name || '',
        address: doc.address || '',
        phone: doc.phone || '',
        website: doc.website || '',
        imageUrl: doc.imageUrl || '',
      }));
    }

    const overrides = readOverrides<Venue>(LOCAL_STORAGE_VENUE_OVERRIDES_KEY);
    let deletedIds = new Set<string>();
    try {
      const rawDeleted = localStorage.getItem(LOCAL_STORAGE_VENUE_DELETED_KEY);
      if (rawDeleted) {
        const parsed = JSON.parse(rawDeleted);
        if (Array.isArray(parsed)) deletedIds = new Set(parsed);
      }
    } catch {
      // Ignore storage errors
    }

    const byId = new Map<string, Venue>();
    const seenNames = new Set<string>();

    for (const seed of mockVenues) {
      if (deletedIds.has(seed.$id)) continue;
      if (byId.has(seed.$id) || seenNames.has(seed.name.trim().toLowerCase())) continue;
      const merged = overrides[seed.$id] ? { ...seed, ...overrides[seed.$id] } : seed;
      byId.set(merged.$id, merged);
      seenNames.add(merged.name.trim().toLowerCase());
    }

    for (const [id, override] of Object.entries(overrides)) {
      if (deletedIds.has(id) || byId.has(id) || !override.name) continue;
      byId.set(id, {
        $id: id,
        leagueId: override.leagueId || mockLeague.$id,
        name: override.name,
        address: override.address || '',
        phone: override.phone || '',
        website: override.website || '',
        imageUrl: override.imageUrl || '',
      });
    }

    return Array.from(byId.values());
  }

  // Fetch Events within Seasons
  static async getEvents(seasonId?: string): Promise<TournamentEvent[]> {
    if (!isAppwriteConfigured) {
      return seasonId && seasonId !== 'all'
        ? mockEvents.filter((e) => e.seasonId === seasonId)
        : mockEvents;
    }

    const items = await resilientListRows(APPWRITE_TABLES.EVENTS);
    if (!items) return [];

    const mapped: TournamentEvent[] = items.map((doc: any) => ({
      $id: doc.$id,
      seasonId:
        typeof doc.season === 'object' && doc.season ? doc.season.$id : doc.season || doc.seasonId || '',
      venueId:
        typeof doc.venue === 'object' && doc.venue ? doc.venue.$id : doc.venue || doc.venueId || '',
      venueName:
        typeof doc.venue === 'object' && doc.venue?.name ? doc.venue.name : doc.venueName || '',
      title: doc.title || '',
      description: doc.description || '',
      scheduledAt: doc.scheduledAt || '',
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

  // Create Event (Admin & Manager only)
  static async createEvent(eventData: Omit<TournamentEvent, '$id'>): Promise<TournamentEvent> {
    assertPermission('game:schedule');
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

  // Update Event (Admin & Manager only)
  static async updateEvent(eventId: string, updates: Partial<TournamentEvent>): Promise<boolean> {
    assertPermission('game:schedule');
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

  // Delete Event (Admin & Manager only)
  static async deleteEvent(eventId: string): Promise<boolean> {
    assertPermission('game:delete');
    if (!isAppwriteConfigured) return true;
    try {
      await tablesDb.deleteRow(DATABASE_ID, APPWRITE_TABLES.EVENTS, eventId);
      return true;
    } catch (e) {
      console.error('Failed to delete event in Appwrite:', e);
      return false;
    }
  }

  // Normalize raw Appwrite rows (supports both 'users' and legacy 'players' tables with missing optional fields)
  private static normalizePlayer(raw: Partial<Player> & { $id: string; league?: unknown }): Player {
    const validRoles: readonly Player['role'][] = ['admin', 'manager', 'dealer', 'scribe', 'player'];
    const validSuits: readonly Player['suitIcon'][] = ['hearts', 'diamonds', 'spades', 'clubs'];
    const isAdminOwner = isPlatformAdminIdentity({
      name: typeof raw.name === 'string' ? raw.name : undefined,
      nickname: typeof raw.nickname === 'string' ? raw.nickname : undefined,
      email: typeof raw.email === 'string' ? raw.email : undefined,
    });
    const role: Player['role'] = isAdminOwner
      ? 'admin'
      : raw.role && validRoles.includes(raw.role)
        ? raw.role
        : 'player';
    const suitIcon: Player['suitIcon'] =
      raw.suitIcon && validSuits.includes(raw.suitIcon) ? raw.suitIcon : 'spades';
    const rawLeague = raw.league;
    const resolvedLeagueId =
      typeof rawLeague === 'object' && rawLeague !== null && '$id' in rawLeague
        ? String((rawLeague as { $id: unknown }).$id || '')
        : typeof rawLeague === 'string' && rawLeague
          ? rawLeague
          : raw.leagueId || (isAppwriteConfigured ? '' : mockLeague.$id);

    return {
      $id: raw.$id,
      leagueId: resolvedLeagueId,
      name: typeof raw.name === 'string' && raw.name.trim() ? raw.name : raw.nickname || 'Unnamed Player',
      nickname: typeof raw.nickname === 'string' ? raw.nickname : undefined,
      email: typeof raw.email === 'string' ? raw.email : '',
      role,
      avatarUrl: typeof raw.avatarUrl === 'string' ? raw.avatarUrl : undefined,
      suitIcon,
      isMember: raw.isMember ?? true,
      totalPoints: Number(raw.totalPoints || 0),
      careerWins: Number(raw.careerWins || 0),
      careerKOs: Number(raw.careerKOs || 0),
      gamesPlayed: Number(raw.gamesPlayed || 0),
      highHandBadges: Number(raw.highHandBadges || 0),
      hasDgCarryover: Boolean(raw.hasDgCarryover),
    };
  }

  // Fetch Players & Standings (strictly Appwrite rows when Appwrite is configured)
  static async getPlayers(): Promise<Player[]> {
    if (!isAppwriteConfigured) {
      const playerOverrides = readOverrides<Player>(LOCAL_STORAGE_PLAYER_OVERRIDES_KEY);
      const byId = new Map<string, Player>();
      for (const raw of mockPlayers) {
        const normalized = this.normalizePlayer(raw);
        const override = playerOverrides[raw.$id];
        byId.set(
          raw.$id,
          override ? this.normalizePlayer({ ...normalized, ...override, $id: raw.$id }) : normalized
        );
      }
      for (const [id, override] of Object.entries(playerOverrides)) {
        if (!byId.has(id) && override.name) {
          byId.set(id, this.normalizePlayer({ ...override, $id: id }));
        }
      }
      return Array.from(byId.values());
    }

    // Resolve which players table exists in this Appwrite DB ('users' vs legacy 'players')
    const cachedTable = resolvedPlayersTableCache !== undefined ? resolvedPlayersTableCache : (() => {
      try {
        const stored = sessionStorage.getItem(SESSION_PLAYERS_TABLE_KEY);
        if (stored === 'none') return null;
        return stored || undefined;
      } catch {
        return undefined;
      }
    })();

    if (cachedTable === null) return [];

    const candidates = cachedTable ? [cachedTable] : ['users', 'players'];
    for (const tableId of candidates) {
      const items = await resilientListRows(tableId);
      if (items !== null) {
        setResolvedPlayersTable(tableId);
        const rows = (items as (Partial<Player> & { $id: string })[]).filter((raw) =>
          Boolean(raw && raw.$id)
        );
        for (const raw of rows) {
          if (
            raw.role !== 'admin' &&
            isPlatformAdminIdentity({
              name: typeof raw.name === 'string' ? raw.name : undefined,
              nickname: typeof raw.nickname === 'string' ? raw.nickname : undefined,
              email: typeof raw.email === 'string' ? raw.email : undefined,
            })
          ) {
            void resilientUpdateRow(tableId, raw.$id, { role: 'admin' });
          }
        }
        return rows.map((raw) => this.normalizePlayer(raw));
      }
    }

    setResolvedPlayersTable(null);
    return [];
  }

  // Sync a signed-up or signed-in player profile to Appwrite (or local roster when offline)
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
    leagueId?: string;
  }): Promise<Player> {
    const actor = getActiveActor();
    const isSelfSync = Boolean(actor && actor.$id === profile.$id);
    if (!isSelfSync) {
      assertPermission('user:manage');
    }

    const resolvedLeagueId = await this.resolveActiveLeagueId(profile.leagueId);
    const requestedRole: Player['role'] = isPlatformAdminIdentity(profile)
      ? 'admin'
      : profile.role || 'player';

    // Prevent non-admins from assigning admin or self-escalating role
    let resolvedRole: Player['role'] = requestedRole;
    if (!isPlatformAdminIdentity(profile)) {
      if (isSelfSync && actor && !canAssignRole(actor.role, requestedRole)) {
        resolvedRole = actor.role;
      } else if (!isSelfSync && !canAssignRole(actor?.role, requestedRole)) {
        throw new PermissionError(
          'platform:assign_admin',
          actor?.role || 'guest',
          'Only Platform Admins can assign the Admin role.'
        );
      }
    }
    const playerRecord: Player = {
      $id: profile.$id,
      leagueId: resolvedLeagueId || undefined,
      name: profile.name,
      nickname: profile.nickname,
      email: profile.email || '',
      role: resolvedRole,
      suitIcon: profile.suitIcon || 'spades',
      isMember: profile.isMember ?? true,
      totalPoints: profile.totalPoints ?? 0,
      careerWins: profile.careerWins ?? 0,
      careerKOs: profile.careerKOs ?? 0,
      gamesPlayed: profile.gamesPlayed ?? 0,
      highHandBadges: 0,
      hasDgCarryover: false,
    };

    if (!isAppwriteConfigured) {
      saveOverride<Player>(LOCAL_STORAGE_PLAYER_OVERRIDES_KEY, playerRecord.$id, playerRecord);
      const existingIdx = mockPlayers.findIndex((p) => p.$id === playerRecord.$id);
      if (existingIdx >= 0) {
        mockPlayers[existingIdx] = { ...mockPlayers[existingIdx], ...playerRecord };
      } else {
        mockPlayers.push(playerRecord);
      }
      return playerRecord;
    }

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
        ...(resolvedLeagueId ? { league: resolvedLeagueId } : {}),
      };
      const updated = await resilientUpdateRow(playersTable, playerRecord.$id, payload);
      if (!updated) {
        await resilientCreateRow(playersTable, playerRecord.$id, payload);
      }
    }

    return playerRecord;
  }

  static async deletePlayer(playerId: string): Promise<boolean> {
    assertPermission('user:manage');
    if (!isAppwriteConfigured) {
      const idx = mockPlayers.findIndex((p) => p.$id === playerId);
      if (idx !== -1) mockPlayers.splice(idx, 1);
      return true;
    }
    const playersTable = getResolvedPlayersTable();
    if (!playersTable || getMissingTables().has(playersTable)) return false;
    try {
      await tablesDb.deleteRow(DATABASE_ID, playersTable, playerId);
      return true;
    } catch {
      return false;
    }
  }

  private static hasNativeEntryScoringColumns(): boolean {
    const cols = knownTableColumns.get(APPWRITE_TABLES.GAME_ENTRIES);
    if (!cols) return false;
    return cols.has('handBonuses') && cols.has('knockouts') && cols.has('status');
  }

  /**
   * Persists full Jack Ten Poker entry scoring metadata in a compact sidecar row
   * (`esc_<entryId>` in `announcements`) whenever the live `game_entries` table lacks
   * the extended scoring columns, ensuring durability across reloads and real-time sync.
   */
  private static async saveEntryScoringMetaSidecar(
    entryId: string,
    gameId: string,
    entry: Partial<GameEntry>
  ): Promise<boolean> {
    if (
      !isAppwriteConfigured ||
      getMissingTables().has(APPWRITE_TABLES.ANNOUNCEMENTS) ||
      this.hasNativeEntryScoringColumns()
    ) {
      return false;
    }
    const rowId = getEntryScoringMetaRowId(entryId);
    const meta = buildEntryScoringMeta(entryId, gameId, entry);
    const serialized = JSON.stringify(meta);
    if (serialized.length > 1950) return false;

    const payload: Record<string, unknown> = {
      title: gameId.slice(0, 250),
      content: serialized,
      type: ENTRY_SCORING_META_ANNOUNCEMENT_TYPE,
      isActive: false,
      createdAt: meta.updatedAt,
    };

    const updated = await resilientUpdateRow(APPWRITE_TABLES.ANNOUNCEMENTS, rowId, payload);
    if (updated) return true;
    const createdId = await resilientCreateRow(APPWRITE_TABLES.ANNOUNCEMENTS, rowId, payload);
    return Boolean(createdId);
  }

  static mapRealtimeGameEntry(doc: Record<string, unknown>): GameEntry {
    return this.mapRawGameEntry(doc);
  }

  private static mapRawGameEntry(doc: any, scoringMeta?: EntryScoringMeta | null): GameEntry {
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
    const hasNativeScoringCols =
      Object.prototype.hasOwnProperty.call(doc, 'handBonuses') ||
      Object.prototype.hasOwnProperty.call(doc, 'knockouts') ||
      Object.prototype.hasOwnProperty.call(doc, 'calculatedFinalPoints');

    const baseEntry: GameEntry = {
      $id: doc.$id,
      gameId: resolvedGameId,
      playerId: typeof doc.player === 'object' && doc.player ? doc.player.$id : doc.player || doc.playerId || '',
      playerName: (typeof doc.player === 'object' && doc.player?.name) ? doc.player.name : doc.playerName || '',
      playerSuitIcon: (typeof doc.player === 'object' && doc.player?.suitIcon) ? doc.player.suitIcon : doc.playerSuitIcon || 'spades',
      tableNumber: doc.tableNumber,
      seatNumber: doc.seatNumber,
      buyinsCount: doc.buyinsCount ?? 1,
      rebuysCount: doc.rebuysCount ?? 0,
      addonsCount: doc.addonsCount ?? 0,
      status,
      showUpAwarded: typeof doc.showUpAwarded === 'boolean' ? doc.showUpAwarded : undefined,
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
      legacySeedPoints:
        !hasNativeScoringCols &&
        !scoringMeta &&
        typeof doc.pointsAwarded === 'number' &&
        doc.pointsAwarded > 0
          ? doc.pointsAwarded
          : undefined,
    };

    return scoringMeta ? mergeEntryWithScoringMeta(baseEntry, scoringMeta) : baseEntry;
  }

  static async getAllGameEntries(): Promise<GameEntry[]> {
    if (isAppwriteConfigured) {
      const [items, rawAnnouncements] = await Promise.all([
        resilientListRows(APPWRITE_TABLES.GAME_ENTRIES),
        resilientListRows(APPWRITE_TABLES.ANNOUNCEMENTS),
      ]);
      if (!items) return [];

      const metaByEntryId = new Map<string, EntryScoringMeta>();
      if (Array.isArray(rawAnnouncements)) {
        for (const ann of rawAnnouncements) {
          const parsed = parseEntryScoringMetaPayload(ann as Record<string, unknown>);
          if (!parsed) continue;
          const existing = metaByEntryId.get(parsed.entryId);
          if (
            !existing ||
            new Date(parsed.updatedAt).getTime() >= new Date(existing.updatedAt).getTime()
          ) {
            metaByEntryId.set(parsed.entryId, parsed);
          }
        }
      }

      return items.map((doc: any) => this.mapRawGameEntry(doc, metaByEntryId.get(doc.$id)));
    }

    const entryOverrides = readOverrides<GameEntry>(LOCAL_STORAGE_ENTRY_OVERRIDES_KEY);
    const byId = new Map<string, GameEntry>();
    for (const e of mockGameEntries) {
      byId.set(e.$id, entryOverrides[e.$id] ? { ...e, ...entryOverrides[e.$id] } : e);
    }
    for (const [id, override] of Object.entries(entryOverrides)) {
      if (!byId.has(id) && override.gameId && override.playerName) {
        byId.set(id, {
          $id: id,
          gameId: override.gameId,
          playerId: override.playerId || '',
          playerName: override.playerName,
          playerSuitIcon: override.playerSuitIcon || 'spades',
          tableNumber: override.tableNumber ?? 1,
          seatNumber: override.seatNumber ?? 1,
          buyinsCount: override.buyinsCount ?? 1,
          rebuysCount: override.rebuysCount ?? 0,
          addonsCount: override.addonsCount ?? 0,
          status: override.status || (override.isEliminated ? 'ELIMINATED' : 'ACTIVE'),
          showUpAwarded: override.showUpAwarded,
          hasDgCarryover: Boolean(override.hasDgCarryover),
          earnedDgForNextGame: Boolean(override.earnedDgForNextGame),
          survivedRebuy: Boolean(override.survivedRebuy),
          rebuyOnly: Boolean(override.rebuyOnly),
          finishPosition: override.finishPosition,
          pointsAwarded: override.pointsAwarded ?? 0,
          kosCount: override.kosCount ?? 0,
          knockouts: override.knockouts || [],
          handBonuses: override.handBonuses || [],
          eliminatedBySeat: override.eliminatedBySeat,
          knockedOutByPlayerId: override.knockedOutByPlayerId,
          knockedOutByPlayerName: override.knockedOutByPlayerName,
          calculatedBasePoints: override.calculatedBasePoints,
          calculatedFinalPoints: override.calculatedFinalPoints,
          isEliminated: Boolean(override.isEliminated),
        });
      }
    }
    return Array.from(byId.values());
  }

  // Fetch Games with live entry counts derived directly from actual seated game_entries
  static async getGames(eventId?: string): Promise<Game[]> {
    const reconcileCounts = (list: Game[], entriesByGameId: Map<string, GameEntry[]>): Game[] =>
      list.map((g) => {
        const gameEntries = entriesByGameId.get(g.$id) || [];
        const totalPlayersCount = gameEntries.length;
        const remainingPlayersCount = gameEntries.filter(
          (e) => !e.isEliminated && e.status !== 'ELIMINATED' && e.status !== 'MUCK'
        ).length;
        const totalEntriesCount = gameEntries.reduce(
          (sum, e) => sum + (e.buyinsCount || 1) + (e.rebuysCount || 0),
          0
        );
        return {
          ...g,
          totalPlayersCount,
          remainingPlayersCount,
          totalEntriesCount,
        };
      });

    if (isAppwriteConfigured) {
      const [items, allEntries, rawAnnouncements] = await Promise.all([
        resilientListRows(APPWRITE_TABLES.GAMES),
        this.getAllGameEntries(),
        resilientListRows(APPWRITE_TABLES.ANNOUNCEMENTS),
      ]);
      if (!items) return [];

      const entriesByGameId = new Map<string, GameEntry[]>();
      for (const entry of allEntries) {
        if (!entry.gameId) continue;
        const bucket = entriesByGameId.get(entry.gameId);
        if (bucket) bucket.push(entry);
        else entriesByGameId.set(entry.gameId, [entry]);
      }

      const clockByGameId = new Map<string, GameClockSnapshot>();
      if (Array.isArray(rawAnnouncements)) {
        for (const ann of rawAnnouncements) {
          const snapshot = parseClockAnnouncementPayload(ann as Record<string, unknown>);
          if (!snapshot) continue;
          const existing = clockByGameId.get(snapshot.gameId);
          if (!existing || shouldAcceptIncomingClockAnchor(existing.clockAnchorAt, snapshot.clockAnchorAt)) {
            clockByGameId.set(snapshot.gameId, snapshot);
          }
        }
      }

      const mapped: Game[] = reconcileCounts(
        items.map((doc: any) => {
          const clock = clockByGameId.get(doc.$id);
          const docStatus = (doc.status || 'scheduled') as Game['status'];
          const isTerminalDoc = docStatus === 'completed' || docStatus === 'canceled';
          const useClock = Boolean(
            clock && (!isTerminalDoc || shouldAcceptIncomingClockAnchor(doc.$updatedAt, clock.clockAnchorAt))
          );

          const effectiveStatus = useClock && clock ? clock.status : docStatus;
          const effectiveLevelIndex =
            useClock && clock
              ? clock.currentLevelIndex
              : typeof doc.currentLevelIndex === 'number'
              ? doc.currentLevelIndex
              : 0;
          const effectiveSeconds =
            useClock && clock
              ? clock.secondsRemainingInLevel
              : typeof doc.secondsRemainingInLevel === 'number'
              ? doc.secondsRemainingInLevel
              : 1200;
          const effectiveAnchorAt =
            useClock && clock
              ? clock.clockAnchorAt
              : typeof doc.clockAnchorAt === 'string' && doc.clockAnchorAt
              ? doc.clockAnchorAt
              : effectiveStatus === 'running' && typeof doc.$updatedAt === 'string'
              ? doc.$updatedAt
              : undefined;
          const levelDurationOverrides = useClock && clock ? clock.levelDurationOverrides : undefined;

          return {
            $id: doc.$id,
            eventId:
              typeof doc.event === 'object' && doc.event ? doc.event.$id : doc.event || doc.eventId || '',
            seasonId:
              typeof doc.season === 'object' && doc.season ? doc.season.$id : doc.season || doc.seasonId || '',
            venueId:
              typeof doc.venue === 'object' && doc.venue ? doc.venue.$id : doc.venue || doc.venueId || '',
            venueName:
              typeof doc.venue === 'object' && doc.venue?.name ? doc.venue.name : doc.venueName || '',
            title: doc.title || 'Untitled Game',
            scheduledAt: doc.scheduledAt || '',
            status: effectiveStatus,
            dealerName: doc.dealerName || '',
            dealers: parseJsonArray<string>(doc.dealers),
            scribes: parseJsonArray<string>(doc.scribes),
            pointMultiplier: normalizeMultiplier(doc.pointMultiplier),
            isDayGame: Boolean(doc.isDayGame),
            noGamePlayed: Boolean(doc.noGamePlayed),
            hodRule: doc.hodRule || '',
            purpleCount: Number(doc.purpleCount || 0),
            buyinAmount: Number(doc.buyinAmount || 0),
            rebuyAmount: Number(doc.rebuyAmount || 0),
            addonAmount: Number(doc.addonAmount || 0),
            startingChips: Number(doc.startingChips || 15000),
            hotHandJackpot: Number(doc.hotHandJackpot || 0),
            hotHandDescription: doc.hotHandDescription || '',
            totalPlayersCount: doc.totalPlayersCount ?? 0,
            remainingPlayersCount: doc.remainingPlayersCount ?? 0,
            totalEntriesCount: doc.totalEntriesCount ?? 0,
            currentLevelIndex: effectiveLevelIndex,
            secondsRemainingInLevel: effectiveSeconds,
            clockAnchorAt: effectiveAnchorAt,
            levelDurationOverrides,
            blindSchedule: applyLevelDurationOverrides(
              OFFICIAL_BLIND_SCHEDULE,
              levelDurationOverrides
            ),
            isRecurring: Boolean(doc.isRecurring),
            recurrenceRule: doc.recurrenceRule,
            seriesId: doc.seriesId,
            rsvpPlayerIds: parseJsonArray<string>(doc.rsvpPlayerIds),
          };
        }),
        entriesByGameId
      );

      if (eventId) return mapped.filter((g) => g.eventId === eventId);
      return mapped;
    }

    const gameOverrides = readOverrides<Game>(LOCAL_STORAGE_GAME_OVERRIDES_KEY);
    let deletedIds = new Set<string>();
    try {
      const rawDeleted = localStorage.getItem(LOCAL_STORAGE_GAME_DELETED_KEY);
      if (rawDeleted) {
        const parsed = JSON.parse(rawDeleted);
        if (Array.isArray(parsed)) deletedIds = new Set(parsed);
      }
    } catch {
      // Ignore storage errors
    }

    const byId = new Map<string, Game>();
    for (const g of mockGames) {
      if (deletedIds.has(g.$id)) continue;
      const mergedGame = gameOverrides[g.$id] ? { ...g, ...gameOverrides[g.$id] } : g;
      byId.set(g.$id, {
        ...mergedGame,
        clockAnchorAt:
          mergedGame.clockAnchorAt ||
          (mergedGame.status === 'running' ? new Date().toISOString() : undefined),
        blindSchedule: applyLevelDurationOverrides(
          mergedGame.blindSchedule?.length ? mergedGame.blindSchedule : OFFICIAL_BLIND_SCHEDULE,
          mergedGame.levelDurationOverrides
        ),
      });
    }
    for (const [id, override] of Object.entries(gameOverrides)) {
      if (deletedIds.has(id) || byId.has(id) || !override.title) continue;
      byId.set(id, {
        $id: id,
        eventId: override.eventId || '',
        seasonId: override.seasonId || '',
        venueId: override.venueId || '',
        venueName: override.venueName || '',
        title: override.title,
        scheduledAt: override.scheduledAt || '',
        status: override.status || 'scheduled',
        dealerName: override.dealerName || '',
        dealers: override.dealers || [],
        scribes: override.scribes || [],
        pointMultiplier: normalizeMultiplier(override.pointMultiplier),
        isDayGame: Boolean(override.isDayGame),
        noGamePlayed: Boolean(override.noGamePlayed),
        hodRule: override.hodRule || '',
        hotHandDescription: override.hotHandDescription || '',
        purpleCount: Number(override.purpleCount || 0),
        buyinAmount: Number(override.buyinAmount || 0),
        rebuyAmount: Number(override.rebuyAmount || 0),
        addonAmount: Number(override.addonAmount || 0),
        startingChips: Number(override.startingChips || 15000),
        hotHandJackpot: Number(override.hotHandJackpot || 0),
        totalPlayersCount: Number(override.totalPlayersCount || 0),
        remainingPlayersCount: Number(override.remainingPlayersCount || 0),
        totalEntriesCount: Number(override.totalEntriesCount || 0),
        currentLevelIndex: Number(override.currentLevelIndex || 0),
        secondsRemainingInLevel:
          typeof override.secondsRemainingInLevel === 'number'
            ? override.secondsRemainingInLevel
            : 1200,
        clockAnchorAt: override.clockAnchorAt,
        levelDurationOverrides: override.levelDurationOverrides,
        blindSchedule: applyLevelDurationOverrides(
          override.blindSchedule && override.blindSchedule.length > 0
            ? override.blindSchedule
            : OFFICIAL_BLIND_SCHEDULE,
          override.levelDurationOverrides
        ),
        isRecurring: Boolean(override.isRecurring),
        recurrenceRule: override.recurrenceRule,
        seriesId: override.seriesId,
        rsvpPlayerIds: override.rsvpPlayerIds || [],
      });
    }

    const allEntries = await this.getAllGameEntries();
    const entriesByGameId = new Map<string, GameEntry[]>();
    for (const entry of allEntries) {
      if (!entry.gameId) continue;
      const bucket = entriesByGameId.get(entry.gameId);
      if (bucket) bucket.push(entry);
      else entriesByGameId.set(entry.gameId, [entry]);
    }

    const merged = reconcileCounts(Array.from(byId.values()), entriesByGameId);
    if (eventId) return merged.filter((g) => g.eventId === eventId);
    return merged;
  }

  // Toggle Player RSVP for a scheduled tournament (authenticated users only; self unless staff)
  static async toggleRSVP(gameId: string, playerId: string): Promise<Game> {
    assertPermission('game:rsvp');
    const actor = getActiveActor();
    if (actor && actor.$id !== playerId && !hasPermission(actor.role, 'game:seat_players')) {
      throw new PermissionError(
        'game:seat_players',
        actor.role,
        'Players can only manage their own tournament RSVP.'
      );
    }
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
      return updatedGame;
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
    const allEntries = await this.getAllGameEntries();
    return allEntries.filter((entry) => entry.gameId === gameId);
  }

  // Fetch Announcements (strictly Appwrite rows when Appwrite is configured; excludes ephemeral live score events)
  static async getAnnouncements(): Promise<Announcement[]> {
    if (isAppwriteConfigured) {
      const items = await resilientListRows(APPWRITE_TABLES.ANNOUNCEMENTS);
      if (!items) return [];
      return items
        .filter(
          (doc: any) =>
            doc.type !== LIVE_SCORE_EVENT_ANNOUNCEMENT_TYPE &&
            doc.type !== GAME_CLOCK_ANNOUNCEMENT_TYPE &&
            doc.type !== ENTRY_SCORING_META_ANNOUNCEMENT_TYPE
        )
        .map((doc: any) => ({
          $id: doc.$id,
          title: doc.title || '',
          content: doc.content || '',
          type: doc.type || 'info',
          isActive: doc.isActive ?? true,
          createdAt: doc.createdAt || doc.$createdAt || new Date().toISOString(),
        }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const overrides = readOverrides<Announcement>(LOCAL_STORAGE_ANNOUNCEMENT_OVERRIDES_KEY);
    let deletedIds = new Set<string>();
    try {
      const rawDeleted = localStorage.getItem(LOCAL_STORAGE_ANNOUNCEMENT_DELETED_KEY);
      if (rawDeleted) {
        const parsed = JSON.parse(rawDeleted);
        if (Array.isArray(parsed)) deletedIds = new Set(parsed);
      }
    } catch {
      // Ignore storage errors
    }

    const byId = new Map<string, Announcement>();
    for (const ann of mockAnnouncements) {
      if (deletedIds.has(ann.$id)) continue;
      byId.set(ann.$id, overrides[ann.$id] ? { ...ann, ...overrides[ann.$id] } : ann);
    }
    for (const [id, override] of Object.entries(overrides)) {
      if (deletedIds.has(id)) continue;
      if (!byId.has(id) && override.title) {
        byId.set(id, {
          $id: id,
          title: override.title,
          content: override.content || '',
          type: override.type || 'info',
          isActive: override.isActive ?? true,
          createdAt: override.createdAt || new Date().toISOString(),
        });
      }
    }
    return Array.from(byId.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  static async createAnnouncement(
    data: Omit<Announcement, '$id' | 'createdAt'>
  ): Promise<Announcement> {
    assertPermission('announcement:manage');
    const newId = ID.unique();
    const createdAt = new Date().toISOString();
    const payload: Record<string, unknown> = {
      title: data.title,
      content: data.content,
      type: data.type,
      isActive: data.isActive ?? true,
      createdAt,
    };

    let createdId = newId;
    if (isAppwriteConfigured) {
      const remoteId = await resilientCreateRow(APPWRITE_TABLES.ANNOUNCEMENTS, newId, payload);
      if (remoteId) createdId = remoteId;
    }

    const created: Announcement = {
      $id: createdId,
      title: data.title,
      content: data.content,
      type: data.type,
      isActive: data.isActive ?? true,
      createdAt,
    };

    if (!isAppwriteConfigured) {
      mockAnnouncements.unshift(created);
      saveOverride<Announcement>(LOCAL_STORAGE_ANNOUNCEMENT_OVERRIDES_KEY, createdId, created);
    }
    return created;
  }

  static async updateAnnouncement(
    announcementId: string,
    updates: Partial<Announcement>
  ): Promise<boolean> {
    assertPermission('announcement:manage');
    if (!isAppwriteConfigured) {
      const idx = mockAnnouncements.findIndex((a) => a.$id === announcementId);
      if (idx !== -1) {
        mockAnnouncements[idx] = { ...mockAnnouncements[idx], ...updates };
      }
      saveOverride<Announcement>(LOCAL_STORAGE_ANNOUNCEMENT_OVERRIDES_KEY, announcementId, updates);
      return true;
    }

    const payload: Record<string, unknown> = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.content !== undefined) payload.content = updates.content;
    if (updates.type !== undefined) payload.type = updates.type;
    if (updates.isActive !== undefined) payload.isActive = updates.isActive;

    return resilientUpdateRow(APPWRITE_TABLES.ANNOUNCEMENTS, announcementId, payload);
  }

  static async deleteAnnouncement(announcementId: string): Promise<boolean> {
    assertPermission('announcement:manage');
    if (!isAppwriteConfigured) {
      const idx = mockAnnouncements.findIndex((a) => a.$id === announcementId);
      if (idx !== -1) {
        mockAnnouncements.splice(idx, 1);
      }
      try {
        const rawDeleted = localStorage.getItem(LOCAL_STORAGE_ANNOUNCEMENT_DELETED_KEY);
        const parsed: string[] = rawDeleted ? JSON.parse(rawDeleted) : [];
        if (!parsed.includes(announcementId)) {
          parsed.push(announcementId);
          localStorage.setItem(LOCAL_STORAGE_ANNOUNCEMENT_DELETED_KEY, JSON.stringify(parsed));
        }
      } catch {
        // Ignore storage errors
      }
      return true;
    }

    if (!getMissingTables().has(APPWRITE_TABLES.ANNOUNCEMENTS)) {
      try {
        await tablesDb.deleteRow(DATABASE_ID, APPWRITE_TABLES.ANNOUNCEMENTS, announcementId);
      } catch {
        return false;
      }
    }
    return true;
  }

  /**
   * Publishes an exact canonical LiveScoreNotification payload over Appwrite Realtime
   * (using an ephemeral inactive row in `announcements` filtered out of banner queries)
   * so every device viewing the game sees the exact same hand, message, and points.
   */
  static async publishLiveScoreNotification(notification: LiveScoreNotification): Promise<boolean> {
    if (!hasPermission(getActiveActor()?.role, 'game:score')) {
      return false;
    }
    if (!isAppwriteConfigured || getMissingTables().has(APPWRITE_TABLES.ANNOUNCEMENTS)) {
      return false;
    }
    const serialized = JSON.stringify(notification);
    if (serialized.length > 1950) return false;

    const rowId = await resilientCreateRow(APPWRITE_TABLES.ANNOUNCEMENTS, ID.unique(), {
      title: notification.headline.slice(0, 250),
      content: serialized,
      type: LIVE_SCORE_EVENT_ANNOUNCEMENT_TYPE,
      isActive: false,
      createdAt: new Date(notification.createdAt || Date.now()).toISOString(),
    });

    if (rowId) {
      // Ephemeral cleanup so score event broadcasts never accumulate in the database
      setTimeout(() => {
        void tablesDb
          .deleteRow(DATABASE_ID, APPWRITE_TABLES.ANNOUNCEMENTS, rowId)
          .catch(() => {});
      }, 20000);
      return true;
    }
    return false;
  }

  // Fetch Current Hot Hand Target (null if none exists in Appwrite)
  static async getHotHandJackpot(): Promise<HotHandJackpot | null> {
    if (!isAppwriteConfigured) {
      return mockHotHandJackpot;
    }
    const items = await resilientListRows(APPWRITE_TABLES.HOT_HANDS);
    if (items && items.length > 0) {
      return items[0] as unknown as HotHandJackpot;
    }
    return null;
  }

  /**
   * Clears all local browser caches/overrides and schema caches so fresh Appwrite data loads cleanly.
   */
  static clearLocalCaches(): void {
    const localKeys = [
      LOCAL_STORAGE_LEAGUES_KEY,
      LOCAL_STORAGE_LEAGUE_OVERRIDES_KEY,
      LOCAL_STORAGE_VENUE_OVERRIDES_KEY,
      LOCAL_STORAGE_VENUE_DELETED_KEY,
      LOCAL_STORAGE_PLAYER_OVERRIDES_KEY,
      LOCAL_STORAGE_ANNOUNCEMENT_OVERRIDES_KEY,
      LOCAL_STORAGE_ANNOUNCEMENT_DELETED_KEY,
      LOCAL_STORAGE_GAME_OVERRIDES_KEY,
      LOCAL_STORAGE_GAME_DELETED_KEY,
      LOCAL_STORAGE_ENTRY_OVERRIDES_KEY,
      'holdem_active_league_id',
      'holdem_all_users',
    ];
    for (const key of localKeys) {
      try {
        localStorage.removeItem(key);
      } catch {
        // Ignore storage errors
      }
    }
    knownTableColumns.clear();
    knownUnsupportedColumns.clear();
    missingTablesCache = null;
    resolvedPlayersTableCache = undefined;
    try {
      sessionStorage.removeItem(SESSION_UNSUPPORTED_COLS_KEY);
      sessionStorage.removeItem(SESSION_MISSING_TABLES_KEY);
      sessionStorage.removeItem(SESSION_PLAYERS_TABLE_KEY);
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Clears all rows from every Appwrite table (child-first) and re-seeds fresh
   * "Jack Ten Poker" league data letting Appwrite generate every $id via ID.unique().
   */
  static async clearAndReseedAppwrite(
    actorRole?: UserRole,
    onProgress?: (status: string) => void
  ): Promise<{ deletedRows: number; seededRows: number; usedAppwrite: boolean }> {
    assertPermission(
      'platform:reseed',
      actorRole,
      'Unauthorized: Only Platform Admins (role: admin) can clear and re-seed data.'
    );

    this.clearLocalCaches();

    if (!isAppwriteConfigured) {
      onProgress?.('Reset local demo caches to fresh Jack Ten Poker seed data.');
      return { deletedRows: 0, seededRows: 0, usedAppwrite: false };
    }

    let deletedRows = 0;
    const deleteOrder = [
      APPWRITE_TABLES.GAME_ENTRIES,
      APPWRITE_TABLES.GAMES,
      APPWRITE_TABLES.EVENTS,
      APPWRITE_TABLES.ANNOUNCEMENTS,
      APPWRITE_TABLES.HOT_HANDS,
      APPWRITE_TABLES.USERS,
      'players',
      APPWRITE_TABLES.VENUES,
      APPWRITE_TABLES.SEASONS,
      APPWRITE_TABLES.LEAGUES,
    ];

    // 1. Clear all rows across every table
    for (const tableId of deleteOrder) {
      onProgress?.(`Clearing "${tableId}"...`);
      while (true) {
        let rows: any[] = [];
        try {
          const response = await tablesDb.listRows(DATABASE_ID, tableId, [Query.limit(100)]);
          rows = (response as any).rows || (response as any).documents || [];
          recordTableColumns(tableId, rows);
        } catch (err: unknown) {
          if (isTableNotFoundError(err)) {
            markTableMissing(tableId);
          }
          break;
        }
        if (rows.length === 0) break;
        for (const row of rows) {
          try {
            await tablesDb.deleteRow(DATABASE_ID, tableId, row.$id);
            deletedRows += 1;
          } catch {
            // Skip rows that cannot be deleted
          }
        }
        if (rows.length < 100) break;
      }
    }

    // Determine which players table exists ('users' vs legacy 'players')
    const playersTable = !getMissingTables().has(APPWRITE_TABLES.USERS)
      ? APPWRITE_TABLES.USERS
      : !getMissingTables().has('players')
        ? 'players'
        : null;
    if (playersTable) {
      setResolvedPlayersTable(playersTable);
    }

    let seededRows = 0;
    const leagueIdMap = new Map<string, string>();
    const seasonIdMap = new Map<string, string>();
    const venueIdMap = new Map<string, string>();
    const playerIdMap = new Map<string, string>();
    const eventIdMap = new Map<string, string>();
    const gameIdMap = new Map<string, string>();

    // 2. Seed League (Appwrite generates $id)
    onProgress?.('Seeding league "Jack Ten Poker"...');
    let primaryLeagueId = '';
    const createdLeagueId = await resilientCreateRow(APPWRITE_TABLES.LEAGUES, ID.unique(), {
      name: mockLeague.name,
      description: mockLeague.description,
      logoUrl: mockLeague.logoUrl || '',
      ownerId: mockLeague.ownerId,
      managerId: mockLeague.managerId || '',
      managerName: mockLeague.managerName || '',
      managerEmail: mockLeague.managerEmail || '',
      createdAt: mockLeague.createdAt,
    });
    if (createdLeagueId) {
      primaryLeagueId = createdLeagueId;
      leagueIdMap.set(mockLeague.$id, createdLeagueId);
      seededRows += 1;
    }

    // 3. Seed Seasons
    onProgress?.('Seeding seasons...');
    for (const s of mockSeasons) {
      const id = await resilientCreateRow(APPWRITE_TABLES.SEASONS, ID.unique(), {
        name: s.name,
        startDate: s.startDate,
        endDate: s.endDate,
        isActive: s.isActive,
        league: leagueIdMap.get(s.leagueId) || primaryLeagueId,
      });
      if (id) {
        seasonIdMap.set(s.$id, id);
        seededRows += 1;
      }
    }

    // 4. Seed Venues
    onProgress?.('Seeding host venues...');
    for (const venue of mockVenues) {
      const id = await resilientCreateRow(APPWRITE_TABLES.VENUES, ID.unique(), {
        name: venue.name,
        address: venue.address,
        phone: venue.phone,
        website: venue.website || '',
        imageUrl: venue.imageUrl || '',
        league: leagueIdMap.get(venue.leagueId) || primaryLeagueId,
      });
      if (id) {
        venueIdMap.set(venue.$id, id);
        seededRows += 1;
      }
    }

    // 5. Seed Players / Users
    if (playersTable) {
      onProgress?.('Seeding players...');
      for (const user of mockPlayers) {
        const id = await resilientCreateRow(playersTable, ID.unique(), {
          name: user.name,
          email: user.email,
          role: user.role,
          nickname: user.nickname || '',
          suitIcon: user.suitIcon,
          isMember: user.isMember,
          totalPoints: user.totalPoints,
          careerWins: user.careerWins,
          careerKOs: user.careerKOs,
          gamesPlayed: user.gamesPlayed,
          highHandBadges: user.highHandBadges || 0,
          hasDgCarryover: Boolean(user.hasDgCarryover),
          league: primaryLeagueId,
        });
        if (id) {
          playerIdMap.set(user.$id, id);
          seededRows += 1;
        }
      }
    }

    // 6. Seed Events
    onProgress?.('Seeding tournament events...');
    for (const event of mockEvents) {
      const id = await resilientCreateRow(APPWRITE_TABLES.EVENTS, ID.unique(), {
        title: event.title,
        description: event.description || '',
        scheduledAt: event.scheduledAt,
        status: event.status,
        isRecurring: Boolean(event.isRecurring),
        recurrenceRule: event.recurrenceRule || '',
        seriesId: event.seriesId || '',
        season: seasonIdMap.get(event.seasonId) || '',
        venue: venueIdMap.get(event.venueId) || '',
      });
      if (id) {
        eventIdMap.set(event.$id, id);
        seededRows += 1;
      }
    }

    // 7. Seed Games
    onProgress?.('Seeding games & schedules...');
    for (const game of mockGames) {
      const mappedRsvps = (game.rsvpPlayerIds || [])
        .map((pid) => playerIdMap.get(pid))
        .filter((id): id is string => Boolean(id));

      const id = await resilientCreateRow(APPWRITE_TABLES.GAMES, ID.unique(), {
        title: game.title,
        scheduledAt: game.scheduledAt,
        status: game.status,
        dealerName: game.dealerName || '',
        dealers: JSON.stringify(game.dealers || (game.dealerName ? [game.dealerName] : [])),
        scribes: JSON.stringify(game.scribes || []),
        pointMultiplier: game.pointMultiplier || 1,
        isDayGame: Boolean(game.isDayGame),
        noGamePlayed: Boolean(game.noGamePlayed),
        hodRule: game.hodRule || '',
        hotHandDescription: game.hotHandDescription || '',
        purpleCount: game.purpleCount || 0,
        buyinAmount: game.buyinAmount,
        rebuyAmount: game.rebuyAmount,
        addonAmount: game.addonAmount,
        startingChips: game.startingChips,
        hotHandJackpot: game.hotHandJackpot || 0,
        totalPlayersCount: game.totalPlayersCount,
        remainingPlayersCount: game.remainingPlayersCount,
        totalEntriesCount: game.totalEntriesCount,
        currentLevelIndex: game.currentLevelIndex || 0,
        secondsRemainingInLevel: game.secondsRemainingInLevel || 1200,
        rsvpPlayerIds: JSON.stringify(mappedRsvps),
        seasonId: seasonIdMap.get(game.seasonId) || '',
        venueId: venueIdMap.get(game.venueId) || '',
        venueName: game.venueName,
        event: eventIdMap.get(game.eventId) || '',
      });
      if (id) {
        gameIdMap.set(game.$id, id);
        seededRows += 1;
      }
    }

    // 8. Seed Game Entries
    onProgress?.('Seeding game entries...');
    for (const entry of mockGameEntries) {
      const gameRef = gameIdMap.get(entry.gameId);
      const playerRef = playerIdMap.get(entry.playerId);
      if (!gameRef) continue;

      const id = await resilientCreateRow(APPWRITE_TABLES.GAME_ENTRIES, ID.unique(), {
        playerName: entry.playerName,
        playerSuitIcon: entry.playerSuitIcon,
        tableNumber: entry.tableNumber,
        seatNumber: entry.seatNumber,
        buyinsCount: entry.buyinsCount,
        rebuysCount: entry.rebuysCount,
        addonsCount: entry.addonsCount,
        status: entry.status || (entry.isEliminated ? 'ELIMINATED' : 'ACTIVE'),
        ...(typeof entry.showUpAwarded === 'boolean' ? { showUpAwarded: entry.showUpAwarded } : {}),
        hasDgCarryover: Boolean(entry.hasDgCarryover),
        earnedDgForNextGame: Boolean(entry.earnedDgForNextGame),
        survivedRebuy: Boolean(entry.survivedRebuy),
        rebuyOnly: Boolean(entry.rebuyOnly),
        finishPosition: entry.finishPosition || 0,
        pointsAwarded: entry.pointsAwarded || 0,
        kosCount: entry.kosCount,
        knockouts: JSON.stringify(entry.knockouts || []),
        handBonuses: JSON.stringify(entry.handBonuses || []),
        eliminatedBySeat: entry.eliminatedBySeat || 0,
        knockedOutByPlayerId: entry.knockedOutByPlayerId
          ? playerIdMap.get(entry.knockedOutByPlayerId) || ''
          : '',
        knockedOutByPlayerName: entry.knockedOutByPlayerName || '',
        calculatedBasePoints: entry.calculatedBasePoints || 0,
        calculatedFinalPoints: entry.calculatedFinalPoints || 0,
        isEliminated: entry.isEliminated,
        game: gameRef,
        ...(playerRef ? { player: playerRef } : {}),
      });
      if (id) seededRows += 1;
    }

    // 9. Seed Hot Hand Target
    onProgress?.('Seeding daily hot hand target...');
    const hotHandId = await resilientCreateRow(APPWRITE_TABLES.HOT_HANDS, ID.unique(), {
      date: mockHotHandJackpot.date,
      handTitle: mockHotHandJackpot.handTitle,
      currentPool: mockHotHandJackpot.currentPool,
      isClaimed: mockHotHandJackpot.isClaimed,
      league: primaryLeagueId,
    });
    if (hotHandId) seededRows += 1;

    // 10. Seed Announcements
    onProgress?.('Seeding banner announcements...');
    for (const ann of mockAnnouncements) {
      const id = await resilientCreateRow(APPWRITE_TABLES.ANNOUNCEMENTS, ID.unique(), {
        title: ann.title,
        content: ann.content,
        type: ann.type,
        isActive: ann.isActive ?? true,
        createdAt: ann.createdAt,
      });
      if (id) seededRows += 1;
    }

    onProgress?.('Re-seed complete!');
    return { deletedRows, seededRows, usedAppwrite: true };
  }

  // --- MUTATION METHODS ---

  /**
   * Persist the authoritative backend game clock anchor atomically.
   *
   * Writes the dedicated backend clock state row (`clk_<gameId>` in `announcements` with
   * `type: 'game_clock_state'`, `isActive: false`) so Appwrite stamps a pure, uncorrupted
   * server `$updatedAt` immune to non-clock game mutations (e.g. eliminations or RSVPs)
   * AND syncs `status`, `currentLevelIndex`, `secondsRemainingInLevel`, and `clockAnchorAt`
   * on the `games` row in a single update.
   */
  static async saveGameClockState(
    gameId: string,
    state: {
      status: Game['status'];
      currentLevelIndex: number;
      secondsRemainingInLevel: number;
      levelDurationOverrides?: Record<number, number>;
    }
  ): Promise<GameClockSnapshot> {
    assertPermission('clock:manage');
    const cleanLevelIndex = Math.max(0, Math.floor(state.currentLevelIndex));
    const cleanSeconds = Math.max(0, Math.floor(state.secondsRemainingInLevel));
    const overrides =
      state.levelDurationOverrides && Object.keys(state.levelDurationOverrides).length > 0
        ? state.levelDurationOverrides
        : undefined;

    if (!isAppwriteConfigured) {
      const anchorAt = new Date().toISOString();
      const snapshot: GameClockSnapshot = {
        gameId,
        status: state.status,
        currentLevelIndex: cleanLevelIndex,
        secondsRemainingInLevel: cleanSeconds,
        clockAnchorAt: anchorAt,
        ...(overrides ? { levelDurationOverrides: overrides } : {}),
      };
      saveOverride<Game>(LOCAL_STORAGE_GAME_OVERRIDES_KEY, gameId, {
        status: state.status,
        currentLevelIndex: cleanLevelIndex,
        secondsRemainingInLevel: cleanSeconds,
        clockAnchorAt: anchorAt,
        levelDurationOverrides: overrides,
      });
      AppwriteRealtime.broadcastClockState(snapshot);
      return snapshot;
    }

    const clockRowId = getClockRowId(gameId);
    const clockContent = JSON.stringify({
      gameId,
      status: state.status,
      currentLevelIndex: cleanLevelIndex,
      secondsRemainingInLevel: cleanSeconds,
      ...(overrides ? { levelDurationOverrides: overrides } : {}),
    });
    const announcementPayload: Record<string, unknown> = {
      title: gameId,
      content: clockContent,
      type: GAME_CLOCK_ANNOUNCEMENT_TYPE,
      isActive: false,
      createdAt: new Date(getServerNowMs()).toISOString(),
    };

    let serverAnchorAt: string | undefined;

    if (!getMissingTables().has(APPWRITE_TABLES.ANNOUNCEMENTS)) {
      const reqStart = Date.now();
      try {
        const updated = await tablesDb.updateRow(
          DATABASE_ID,
          APPWRITE_TABLES.ANNOUNCEMENTS,
          clockRowId,
          announcementPayload as any
        );
        const stamped = (updated as any)?.$updatedAt || (updated as any)?.$createdAt;
        if (typeof stamped === 'string' && stamped) {
          serverAnchorAt = stamped;
          calibrateServerClockFromResponse(stamped, reqStart, Date.now());
        }
      } catch (updateErr: unknown) {
        const code = getAppwriteErrorCode(updateErr);
        if (code === 404 && !isTableNotFoundError(updateErr)) {
          const createStart = Date.now();
          try {
            const created = await tablesDb.createRow(
              DATABASE_ID,
              APPWRITE_TABLES.ANNOUNCEMENTS,
              clockRowId,
              announcementPayload as any
            );
            const stamped = (created as any)?.$updatedAt || (created as any)?.$createdAt;
            if (typeof stamped === 'string' && stamped) {
              serverAnchorAt = stamped;
              calibrateServerClockFromResponse(stamped, createStart, Date.now());
            }
          } catch {
            // Fallback to databases API below if needed
          }
        } else if (!isTableNotFoundError(updateErr) && code !== 400 && code !== 401 && code !== 403) {
          try {
            const updatedDoc = await databases.updateDocument(
              DATABASE_ID,
              APPWRITE_TABLES.ANNOUNCEMENTS,
              clockRowId,
              announcementPayload as any
            );
            const stamped = updatedDoc.$updatedAt || updatedDoc.$createdAt;
            if (stamped) {
              serverAnchorAt = stamped;
              calibrateServerClockFromResponse(stamped, reqStart, Date.now());
            }
          } catch (docErr: unknown) {
            if (getAppwriteErrorCode(docErr) === 404 && !isTableNotFoundError(docErr)) {
              const createStart = Date.now();
              try {
                const createdDoc = await databases.createDocument(
                  DATABASE_ID,
                  APPWRITE_TABLES.ANNOUNCEMENTS,
                  clockRowId,
                  announcementPayload as any
                );
                const stamped = createdDoc.$updatedAt || createdDoc.$createdAt;
                if (stamped) {
                  serverAnchorAt = stamped;
                  calibrateServerClockFromResponse(stamped, createStart, Date.now());
                }
              } catch {
                // Ignore and fall back to games row update
              }
            }
          }
        }
      }
    }

    const finalAnchorAt = serverAnchorAt || new Date(getServerNowMs()).toISOString();

    await resilientUpdateRow(APPWRITE_TABLES.GAMES, gameId, {
      status: state.status,
      currentLevelIndex: cleanLevelIndex,
      secondsRemainingInLevel: cleanSeconds,
      clockAnchorAt: finalAnchorAt,
    });

    const snapshot: GameClockSnapshot = {
      gameId,
      status: state.status,
      currentLevelIndex: cleanLevelIndex,
      secondsRemainingInLevel: cleanSeconds,
      clockAnchorAt: finalAnchorAt,
      ...(overrides ? { levelDurationOverrides: overrides } : {}),
    };
    AppwriteRealtime.broadcastClockState(snapshot);
    return snapshot;
  }

  /**
   * Update live game blind level and countdown
   */
  static async updateGameClock(gameId: string, currentLevelIndex: number, secondsRemainingInLevel: number): Promise<boolean> {
    assertPermission('clock:manage');
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
    assertPermission('clock:manage');
    saveOverride<Game>(LOCAL_STORAGE_GAME_OVERRIDES_KEY, gameId, { status });
    if (!isAppwriteConfigured) return true;
    await resilientUpdateRow(APPWRITE_TABLES.GAMES, gameId, { status });
    return true;
  }

  /**
   * Eliminate a player from a live tournament
   */
  static async eliminatePlayer(gameId: string, entryId: string, finishPosition: number, remainingPlayersCount: number): Promise<boolean> {
    assertPermission('game:score');
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
    assertPermission('game:score');
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
  // --- VENUE CRUD & IMAGE STORAGE METHODS ---
  // ==========================================

  private static compressImageToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read selected image file.'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Invalid image file.'));
        img.onload = () => {
          const maxDim = 800;
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          const width = Math.max(1, Math.round(img.width * scale));
          const height = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(String(reader.result || ''));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = String(reader.result || '');
      };
      reader.readAsDataURL(file);
    });
  }

  static async uploadVenueImage(
    file: File
  ): Promise<{ url: string; fileId?: string; source: 'appwrite' | 'local'; warning?: string }> {
    assertPermission('venue:manage');
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Please upload a JPG, PNG, WebP, or GIF image.');
    }
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new Error('Image must be 5 MB or smaller.');
    }

    if (isAppwriteConfigured) {
      try {
        const uploaded = await storage.createFile(VENUE_IMAGES_BUCKET_ID, ID.unique(), file);
        const viewUrl = String(storage.getFileView(VENUE_IMAGES_BUCKET_ID, uploaded.$id));
        return { url: viewUrl, fileId: uploaded.$id, source: 'appwrite' };
      } catch (err: unknown) {
        const msg =
          typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message?: unknown }).message ?? '')
            : '';
        const localDataUrl = await this.compressImageToDataUrl(file);
        return {
          url: localDataUrl,
          source: 'local',
          warning: /bucket/i.test(msg)
            ? `Storage bucket "${VENUE_IMAGES_BUCKET_ID}" is not created in Appwrite yet — saved locally for now. Run npm run setup:appwrite to provision it.`
            : 'Appwrite Storage upload unavailable — saved locally for now.',
        };
      }
    }

    const localDataUrl = await this.compressImageToDataUrl(file);
    return { url: localDataUrl, source: 'local' };
  }

  static async deleteVenueImage(imageUrl?: string): Promise<void> {
    assertPermission('venue:manage');
    if (!isAppwriteConfigured || !imageUrl) return;
    const match = imageUrl.match(
      new RegExp(`/buckets/${VENUE_IMAGES_BUCKET_ID}/files/([^/]+)/`)
    );
    if (!match?.[1]) return;
    try {
      await storage.deleteFile(VENUE_IMAGES_BUCKET_ID, match[1]);
    } catch {
      // Ignore already-deleted or permission-restricted files
    }
  }

  static async createVenue(venueData: Omit<Venue, '$id'>): Promise<Venue> {
    assertPermission('venue:manage');
    const newId = ID.unique();
    const resolvedLeagueId = await this.resolveActiveLeagueId(venueData.leagueId);
    const payload: Record<string, unknown> = {
      name: venueData.name,
      address: venueData.address,
      phone: venueData.phone,
      website: venueData.website || '',
      imageUrl: venueData.imageUrl || '',
      ...(resolvedLeagueId ? { league: resolvedLeagueId } : {}),
    };

    let createdId = newId;
    if (isAppwriteConfigured) {
      const remoteId = await resilientCreateRow(APPWRITE_TABLES.VENUES, newId, payload);
      if (remoteId) createdId = remoteId;
    }

    const created: Venue = {
      $id: createdId,
      leagueId: resolvedLeagueId,
      name: venueData.name,
      address: venueData.address,
      phone: venueData.phone,
      website: venueData.website || '',
      imageUrl: venueData.imageUrl || '',
    };
    if (!isAppwriteConfigured) {
      saveOverride<Venue>(LOCAL_STORAGE_VENUE_OVERRIDES_KEY, createdId, created);
    }
    return created;
  }

  static async updateVenue(venueId: string, updates: Partial<Venue>): Promise<boolean> {
    assertPermission('venue:manage');
    if (!isAppwriteConfigured) {
      saveOverride<Venue>(LOCAL_STORAGE_VENUE_OVERRIDES_KEY, venueId, updates);
      const idx = mockVenues.findIndex((v) => v.$id === venueId);
      if (idx !== -1) {
        mockVenues[idx] = { ...mockVenues[idx], ...updates };
      }
      return true;
    }

    const payload: Record<string, unknown> = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.address !== undefined) payload.address = updates.address;
    if (updates.phone !== undefined) payload.phone = updates.phone;
    if (updates.website !== undefined) payload.website = updates.website;
    if (updates.imageUrl !== undefined) payload.imageUrl = updates.imageUrl;

    return resilientUpdateRow(APPWRITE_TABLES.VENUES, venueId, payload);
  }

  static async deleteVenue(venueId: string): Promise<boolean> {
    assertPermission('venue:manage');
    if (!isAppwriteConfigured) {
      try {
        const rawDeleted = localStorage.getItem(LOCAL_STORAGE_VENUE_DELETED_KEY);
        const parsed: string[] = rawDeleted ? JSON.parse(rawDeleted) : [];
        if (!parsed.includes(venueId)) {
          parsed.push(venueId);
          localStorage.setItem(LOCAL_STORAGE_VENUE_DELETED_KEY, JSON.stringify(parsed));
        }
      } catch {
        // Ignore storage errors
      }
      return true;
    }

    if (!getMissingTables().has(APPWRITE_TABLES.VENUES)) {
      try {
        await tablesDb.deleteRow(DATABASE_ID, APPWRITE_TABLES.VENUES, venueId);
      } catch {
        return false;
      }
    }
    return true;
  }

  // ==========================================
  // --- SEASON CRUD METHODS ------------------
  // ==========================================

  static async createSeason(seasonData: Omit<Season, '$id'>): Promise<Season> {
    assertPermission('season:manage');
    const newId = ID.unique();
    const resolvedLeagueId = await this.resolveActiveLeagueId(seasonData.leagueId);
    const payload: Record<string, unknown> = {
      name: seasonData.name,
      startDate: seasonData.startDate,
      endDate: seasonData.endDate,
      isActive: Boolean(seasonData.isActive),
      ...(resolvedLeagueId ? { league: resolvedLeagueId } : {}),
    };

    let createdId = newId;
    if (isAppwriteConfigured) {
      const remoteId = await resilientCreateRow(APPWRITE_TABLES.SEASONS, newId, payload);
      if (remoteId) createdId = remoteId;
    }

    return {
      $id: createdId,
      leagueId: resolvedLeagueId,
      name: seasonData.name,
      startDate: seasonData.startDate,
      endDate: seasonData.endDate,
      isActive: Boolean(seasonData.isActive),
    };
  }

  static async updateSeason(seasonId: string, updates: Partial<Season>): Promise<boolean> {
    assertPermission('season:manage');
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
    assertPermission('season:manage');
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
    assertPermission('season:manage');
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
    assertPermission('game:schedule');
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
      seasonId: gameData.seasonId || '',
      venueId: gameData.venueId,
      venueName: gameData.venueName,
      ...(gameData.eventId ? { event: gameData.eventId } : {}),
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
        : OFFICIAL_BLIND_SCHEDULE,
    };

    if (!isAppwriteConfigured) {
      mockGames.unshift(createdGame);
      saveOverride<Game>(LOCAL_STORAGE_GAME_OVERRIDES_KEY, createdId, createdGame);
    }
    return createdGame;
  }

  static async updateGame(gameId: string, updates: Partial<Game>): Promise<boolean> {
    const hasScheduleMutation =
      updates.title !== undefined ||
      updates.scheduledAt !== undefined ||
      updates.venueId !== undefined ||
      updates.venueName !== undefined ||
      updates.seasonId !== undefined ||
      updates.eventId !== undefined ||
      updates.startingChips !== undefined ||
      updates.buyinAmount !== undefined ||
      updates.rebuyAmount !== undefined ||
      updates.addonAmount !== undefined ||
      updates.isRecurring !== undefined ||
      updates.recurrenceRule !== undefined ||
      updates.seriesId !== undefined;
    const hasClockMutation =
      updates.status !== undefined ||
      updates.currentLevelIndex !== undefined ||
      updates.secondsRemainingInLevel !== undefined ||
      updates.clockAnchorAt !== undefined;

    if (hasScheduleMutation) {
      assertPermission('game:schedule');
    } else if (hasClockMutation) {
      assertPermission('clock:manage');
    } else {
      assertPermission('game:score');
    }

    if (!isAppwriteConfigured) {
      const localIdx = mockGames.findIndex((g) => g.$id === gameId);
      if (localIdx !== -1) {
        mockGames[localIdx] = { ...mockGames[localIdx], ...updates };
      }
      saveOverride<Game>(LOCAL_STORAGE_GAME_OVERRIDES_KEY, gameId, updates);
      return true;
    }

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
    if (updates.clockAnchorAt !== undefined) payload.clockAnchorAt = updates.clockAnchorAt;
    if (updates.rsvpPlayerIds !== undefined) payload.rsvpPlayerIds = JSON.stringify(updates.rsvpPlayerIds);
    if (updates.venueId !== undefined) payload.venueId = updates.venueId;
    if (updates.venueName !== undefined) payload.venueName = updates.venueName;
    if (updates.seasonId !== undefined) payload.seasonId = updates.seasonId;
    if (updates.eventId !== undefined) payload.event = updates.eventId;

    return resilientUpdateRow(APPWRITE_TABLES.GAMES, gameId, payload);
  }

  static async deleteGame(gameId: string): Promise<boolean> {
    assertPermission('game:delete');
    if (!isAppwriteConfigured) {
      try {
        const rawDeleted = localStorage.getItem(LOCAL_STORAGE_GAME_DELETED_KEY);
        const parsed: string[] = rawDeleted ? JSON.parse(rawDeleted) : [];
        if (!parsed.includes(gameId)) {
          parsed.push(gameId);
          localStorage.setItem(LOCAL_STORAGE_GAME_DELETED_KEY, JSON.stringify(parsed));
        }
        const overrides = readOverrides<Game>(LOCAL_STORAGE_GAME_OVERRIDES_KEY);
        if (overrides[gameId]) {
          delete overrides[gameId];
          localStorage.setItem(LOCAL_STORAGE_GAME_OVERRIDES_KEY, JSON.stringify(overrides));
        }
      } catch {
        // Ignore storage errors
      }
      return true;
    }

    try {
      await tablesDb.deleteRow(DATABASE_ID, APPWRITE_TABLES.GAMES, gameId);
      // Best-effort cleanup of dedicated clock state row
      void tablesDb
        .deleteRow(DATABASE_ID, APPWRITE_TABLES.ANNOUNCEMENTS, getClockRowId(gameId))
        .catch(() => {});
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
    assertPermission('game:seat_players');
    const newId = ID.unique();
    // Players seated after the 1:15 mark do not auto-receive Show Up points
    const seatedAfterCutoff = hasReachedShowUpCutoff(currentGame);
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
      showUpAwarded: seatedAfterCutoff ? false : undefined,
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
      ...(seatedAfterCutoff ? { showUpAwarded: false } : {}),
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

      if (seatedAfterCutoff || newEntry.hasDgCarryover) {
        await this.saveEntryScoringMetaSidecar(newEntry.$id, gameId, newEntry);
      }

      await resilientUpdateRow(APPWRITE_TABLES.GAMES, gameId, {
        totalPlayersCount: currentGame.totalPlayersCount + 1,
        remainingPlayersCount: currentGame.remainingPlayersCount + 1,
        totalEntriesCount: currentGame.totalEntriesCount + 1,
      });
      return newEntry;
    }

    mockGameEntries.push(newEntry);
    saveOverride<GameEntry>(LOCAL_STORAGE_ENTRY_OVERRIDES_KEY, newEntry.$id, newEntry);
    return newEntry;
  }

  static async updateGameEntryScoring(
    entryId: string,
    updates: Partial<GameEntry>
  ): Promise<boolean> {
    assertPermission('game:score');
    if (!isAppwriteConfigured) {
      const localIdx = mockGameEntries.findIndex((e) => e.$id === entryId);
      if (localIdx !== -1) {
        mockGameEntries[localIdx] = { ...mockGameEntries[localIdx], ...updates };
      }
      saveOverride<GameEntry>(LOCAL_STORAGE_ENTRY_OVERRIDES_KEY, entryId, updates);
      return true;
    }

    const payload: Record<string, unknown> = {};
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.showUpAwarded !== undefined) payload.showUpAwarded = updates.showUpAwarded;
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

    await Promise.all([
      resilientUpdateRow(APPWRITE_TABLES.GAME_ENTRIES, entryId, payload),
      this.saveEntryScoringMetaSidecar(entryId, updates.gameId || '', updates),
    ]);
    return true;
  }

  static async updatePlayerRebuys(
    gameId: string,
    entryId: string,
    rebuysCount: number,
    currentGame: Game
  ): Promise<boolean> {
    assertPermission('game:score');
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
    assertPermission('game:score');
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
    assertPermission('game:seat_players');
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
      victimEntrySnapshot?: Partial<GameEntry>;
      killerEntrySnapshot?: Partial<GameEntry>;
    }
  ): Promise<boolean> {
    assertPermission('game:score');
    const status: GameEntryStatus = options?.isMuck ? 'MUCK' : 'ELIMINATED';
    const koType = options?.koType === undefined ? 'K' : options.koType;

    if (!isAppwriteConfigured) {
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
      return true;
    }
    try {
      // 1. Mark eliminated player (preserving elimination record even if MUCK)
      const victimPoints = options?.victimEntrySnapshot?.pointsAwarded;
      await Promise.all([
        resilientUpdateRow(APPWRITE_TABLES.GAME_ENTRIES, eliminatedEntryId, {
          status,
          isEliminated: true,
          finishPosition,
          ...(victimPoints !== undefined ? { pointsAwarded: victimPoints } : {}),
          ...(options?.victimEntrySnapshot?.calculatedBasePoints !== undefined
            ? { calculatedBasePoints: options.victimEntrySnapshot.calculatedBasePoints }
            : {}),
          ...(options?.victimEntrySnapshot?.calculatedFinalPoints !== undefined
            ? { calculatedFinalPoints: options.victimEntrySnapshot.calculatedFinalPoints }
            : {}),
          eliminatedBySeat: options?.eliminatedBySeat || 0,
          knockedOutByPlayerId: koWinnerPlayerId || '',
          knockedOutByPlayerName: options?.knockedOutByPlayerName || '',
        }),
        this.saveEntryScoringMetaSidecar(eliminatedEntryId, gameId, {
          ...options?.victimEntrySnapshot,
          gameId,
          status,
          isEliminated: true,
          finishPosition,
          eliminatedBySeat: options?.eliminatedBySeat,
          knockedOutByPlayerId: koWinnerPlayerId || undefined,
          knockedOutByPlayerName: options?.knockedOutByPlayerName,
        }),
      ]);

      // 2. Decrement remaining players on game
      await resilientUpdateRow(APPWRITE_TABLES.GAMES, gameId, {
        remainingPlayersCount,
      });

      // 3. Award KO (K or R) to killer if applicable
      if (koWinnerEntryId && koType) {
        try {
          let updatedKOs: KnockoutCode[];
          if (Array.isArray(options?.killerEntrySnapshot?.knockouts)) {
            updatedKOs = options.killerEntrySnapshot.knockouts;
          } else {
            const entry = await tablesDb.getRow(DATABASE_ID, APPWRITE_TABLES.GAME_ENTRIES, koWinnerEntryId);
            const existingKOs = parseJsonArray<KnockoutCode>((entry as any).knockouts);
            const fallbackKOs: KnockoutCode[] =
              existingKOs.length > 0
                ? existingKOs
                : Array.from({ length: Number((entry as any).kosCount || 0) }, () => 'K' as KnockoutCode);
            updatedKOs = [...fallbackKOs, koType];
          }
          const killerPoints = options?.killerEntrySnapshot?.pointsAwarded;
          await Promise.all([
            resilientUpdateRow(APPWRITE_TABLES.GAME_ENTRIES, koWinnerEntryId, {
              kosCount: updatedKOs.length,
              knockouts: JSON.stringify(updatedKOs),
              ...(killerPoints !== undefined ? { pointsAwarded: killerPoints } : {}),
              ...(options?.killerEntrySnapshot?.calculatedBasePoints !== undefined
                ? { calculatedBasePoints: options.killerEntrySnapshot.calculatedBasePoints }
                : {}),
              ...(options?.killerEntrySnapshot?.calculatedFinalPoints !== undefined
                ? { calculatedFinalPoints: options.killerEntrySnapshot.calculatedFinalPoints }
                : {}),
            }),
            this.saveEntryScoringMetaSidecar(koWinnerEntryId, gameId, {
              ...options?.killerEntrySnapshot,
              gameId,
              knockouts: updatedKOs,
              kosCount: updatedKOs.length,
            }),
          ]);
        } catch { }
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
    assertPermission('game:finalize');
    if (!isAppwriteConfigured) {
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

      saveOverride<Game>(LOCAL_STORAGE_GAME_OVERRIDES_KEY, gameId, {
        status: 'completed',
        remainingPlayersCount: 0,
      });
      return true;
    }
    try {
      // 1. Update Game to completed
      await resilientUpdateRow(APPWRITE_TABLES.GAMES, gameId, {
        status: 'completed',
        remainingPlayersCount: 0,
      });

      // 2. Update each game entry with official Jack Ten Poker scoring & DG carryover
      for (const res of results) {
        try {
          await Promise.all([
            resilientUpdateRow(APPWRITE_TABLES.GAME_ENTRIES, res.entryId, {
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
            }),
            this.saveEntryScoringMetaSidecar(res.entryId, gameId, {
              gameId,
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
            }),
          ]);

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
        } catch { }
      }

      return true;
    } catch (e) {
      console.warn('Appwrite finalizeTournament fell back to local cache:', e);
      return true;
    }
  }
}
