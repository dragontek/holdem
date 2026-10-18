import { Client, Databases, TablesDB, Account, Storage, Realtime, ID } from 'appwrite';

export { ID };

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || '';
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID || '';
export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || 'holdem_db';

export const isAppwriteConfigured = Boolean(endpoint && projectId);

export const client = new Client();

if (isAppwriteConfigured) {
  client.setEndpoint(endpoint).setProject(projectId);
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
  PLAYERS: 'players',
  GAMES: 'games',
  GAME_ENTRIES: 'game_entries',
  HOT_HANDS: 'hot_hands',
  ANNOUNCEMENTS: 'announcements',
};

// Aliased for backwards compatibility
export const APPWRITE_COLLECTIONS = APPWRITE_TABLES;
