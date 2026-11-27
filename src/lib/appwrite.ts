import { Client, Databases, TablesDB, Account, Storage, Realtime, ID, OAuthProvider, Query } from 'appwrite';

export { ID, OAuthProvider, Query };

export function normalizeAppwriteEndpoint(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    if (!parsed.pathname || parsed.pathname === '/') {
      return `${trimmed}/v1`;
    }
  } catch {
    if (!/\/v\d+$/i.test(trimmed)) {
      return `${trimmed}/v1`;
    }
  }
  return trimmed;
}

const rawEndpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || '';
export const APPWRITE_ENDPOINT = normalizeAppwriteEndpoint(rawEndpoint);
export const APPWRITE_PROJECT_ID = (import.meta.env.VITE_APPWRITE_PROJECT_ID || '').trim();
const projectId = APPWRITE_PROJECT_ID;
export const DATABASE_ID = (import.meta.env.VITE_APPWRITE_DATABASE_ID || 'holdem_db').trim();
export const VENUE_IMAGES_BUCKET_ID =
  (import.meta.env.VITE_APPWRITE_VENUE_BUCKET_ID || 'venue_images').trim();

export const isAppwriteConfigured = Boolean(APPWRITE_ENDPOINT && projectId);

export const AUTH_PROVIDERS = {
  google: import.meta.env.VITE_ENABLE_GOOGLE_AUTH === 'true',
  apple: import.meta.env.VITE_ENABLE_APPLE_AUTH === 'true',
} as const;

export const client = new Client();

if (isAppwriteConfigured) {
  client.setEndpoint(APPWRITE_ENDPOINT).setProject(projectId);
}

export const databases = new Databases(client);
export const tablesDb = new TablesDB(client);
export const account = new Account(client);
export const storage = new Storage(client);
export const realtime = new Realtime(client);

export const APPWRITE_TABLES = {
  LEAGUES: 'leagues',
  SEASONS: 'seasons',
  VENUES: 'venues',
  USERS: 'users',
  PLAYERS: 'users', // Player table moved to native appwrite Users
  EVENTS: 'events',
  GAMES: 'games',
  GAME_ENTRIES: 'game_entries',
  HOT_HANDS: 'hot_hands',
  ANNOUNCEMENTS: 'announcements',
};

const PLATFORM_ADMIN_HANDLES = new Set(['dragon71']);

export function isPlatformAdminIdentity(identity: {
  name?: string;
  nickname?: string;
  email?: string;
}): boolean {
  const candidates = [
    identity.name,
    identity.nickname,
    identity.email ? identity.email.split('@')[0] : undefined,
  ];
  return candidates.some(
    (val) => typeof val === 'string' && PLATFORM_ADMIN_HANDLES.has(val.trim().toLowerCase())
  );
}

// Aliased for backwards compatibility
export const APPWRITE_COLLECTIONS = APPWRITE_TABLES;

