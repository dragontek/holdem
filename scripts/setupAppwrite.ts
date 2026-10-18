import { Client, Databases, TablesDB, Permission, Role, RelationshipType, RelationMutate } from 'node-appwrite';
import fs from 'fs';
import path from 'path';
import { 
  mockLeague, 
  mockSeasons, 
  mockVenues, 
  mockPlayers, 
  mockGames, 
  mockGameEntries, 
  mockAnnouncements, 
  mockHotHandJackpot 
} from '../src/services/mockData';

// Parse .env file
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
        value = value.replace(/^"|"$/g, '');
      }
      process.env[key] = value.trim();
    }
  });
}

const endpoint = process.env.VITE_APPWRITE_ENDPOINT || 'https://dragontek.io/v1';
const projectId = process.env.VITE_APPWRITE_PROJECT_ID || '6ad3e9f6000495b2033d';
const databaseId = process.env.VITE_APPWRITE_DATABASE_ID || 'holdem_db';
const apiKey = process.env.APPWRITE_API_KEY || '';

console.log('🚀 Hold\'em League Pro — Appwrite v2.0 TablesDB Provisioning & Seed Tool');
console.log(`📍 Endpoint: ${endpoint}`);
console.log(`🆔 Project ID: ${projectId}`);
console.log(`💾 Database ID: ${databaseId}`);

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId);

if (apiKey) {
  client.setKey(apiKey);
}

const databases = new Databases(client);
const tablesDb = new TablesDB(client);

// Column Helpers
async function createStringCol(tableId: string, key: string, size: number = 255, required: boolean = false) {
  try {
    await tablesDb.createStringColumn(databaseId, tableId, key, size, required);
    console.log(`    + Col: ${tableId}.${key} (string:${size})`);
  } catch (e: any) {
    if (e.code === 409 || e.type === 'column_already_exists' || e.type === 'attribute_already_exists') return;
    console.error(`    ❌ Col error ${tableId}.${key}:`, e.message || e);
  }
}

async function createIntCol(tableId: string, key: string, required: boolean = false) {
  try {
    await tablesDb.createIntegerColumn(databaseId, tableId, key, required);
    console.log(`    + Col: ${tableId}.${key} (int)`);
  } catch (e: any) {
    if (e.code === 409 || e.type === 'column_already_exists' || e.type === 'attribute_already_exists') return;
    console.error(`    ❌ Col error ${tableId}.${key}:`, e.message || e);
  }
}

async function createBoolCol(tableId: string, key: string, required: boolean = false) {
  try {
    await tablesDb.createBooleanColumn(databaseId, tableId, key, required);
    console.log(`    + Col: ${tableId}.${key} (bool)`);
  } catch (e: any) {
    if (e.code === 409 || e.type === 'column_already_exists' || e.type === 'attribute_already_exists') return;
    console.error(`    ❌ Col error ${tableId}.${key}:`, e.message || e);
  }
}

async function createRelCol(
  tableId: string, 
  relatedTableId: string, 
  type: RelationshipType, 
  twoWay: boolean, 
  key: string, 
  twoWayKey: string, 
  onDelete: RelationMutate = RelationMutate.Cascade
) {
  try {
    await tablesDb.createRelationshipColumn(
      databaseId,
      tableId,
      relatedTableId,
      type,
      twoWay,
      key,
      twoWayKey,
      onDelete
    );
    console.log(`    🔗 Relation: ${tableId}.${key} <--> ${relatedTableId}.${twoWayKey} (${type})`);
  } catch (e: any) {
    if (e.code === 409 || e.type === 'column_already_exists' || e.type === 'attribute_already_exists') return;
    console.log(`    - Rel skipped (${key}):`, e.message || e);
  }
}

const shouldReset = process.argv.includes('--reset') || process.argv.includes('--drop') || process.argv.includes('--fresh');

if (shouldReset) {
  console.log('⚡ RESET MODE ENABLED (--reset / --drop flag detected)');
}

async function provisionDatabase() {
  try {
    console.log('\n1. Checking / Provisioning Database...');
    try {
      await databases.get(databaseId);
      console.log(`✅ Database "${databaseId}" found.`);
    } catch {
      await databases.create(databaseId, 'Hold\'em League Database');
      console.log(`✅ Created Database "${databaseId}".`);
    }

    // Tables List
    const tables = [
      { id: 'leagues', name: 'Leagues' },
      { id: 'seasons', name: 'Seasons' },
      { id: 'venues', name: 'Venues' },
      { id: 'players', name: 'Players' },
      { id: 'games', name: 'Games' },
      { id: 'game_entries', name: 'Game Entries' },
      { id: 'hot_hands', name: 'Hot Hands' },
      { id: 'announcements', name: 'Announcements' },
    ];

    if (shouldReset) {
      console.log('\n🗑️ Dropping existing tables for clean install...');
      for (const t of tables) {
        try {
          await tablesDb.deleteTable(databaseId, t.id);
          console.log(`  - Dropped table "${t.id}".`);
        } catch {}
      }
    }

    console.log('\n2. Creating Tables (v2.0 TablesDB)...');
    for (const t of tables) {
      try {
        await tablesDb.getTable(databaseId, t.id);
        console.log(`  - Table "${t.id}" exists.`);
      } catch (getErr: any) {
        try {
          await tablesDb.createTable(
            databaseId, 
            t.id, 
            t.name, 
            [
              Permission.read(Role.any()),
              Permission.create(Role.any()),
              Permission.update(Role.any()),
              Permission.delete(Role.any()),
            ]
          );
          console.log(`  ✅ Created table "${t.id}".`);
        } catch (createErr: any) {
          console.error(`  ❌ Failed to create table "${t.id}":`, createErr.message || createErr);
        }
      }
    }

    console.log('\n3. Provisioning Scalar Columns...');
    
    // Leagues Columns
    await createStringCol('leagues', 'name', 255);
    await createStringCol('leagues', 'description', 1000);
    await createStringCol('leagues', 'ownerId', 255);
    await createStringCol('leagues', 'createdAt', 255);

    // Seasons Columns
    await createStringCol('seasons', 'name', 255);
    await createStringCol('seasons', 'startDate', 255);
    await createStringCol('seasons', 'endDate', 255);
    await createBoolCol('seasons', 'isActive');

    // Venues Columns
    await createStringCol('venues', 'name', 255);
    await createStringCol('venues', 'address', 500);
    await createStringCol('venues', 'phone', 100);
    await createStringCol('venues', 'website', 500);
    await createStringCol('venues', 'imageUrl', 1000);

    // Players Columns
    await createStringCol('players', 'name', 255);
    await createStringCol('players', 'nickname', 255);
    await createStringCol('players', 'suitIcon', 50);
    await createBoolCol('players', 'isMember');
    await createIntCol('players', 'totalPoints');
    await createIntCol('players', 'careerWins');
    await createIntCol('players', 'careerKOs');
    await createIntCol('players', 'gamesPlayed');

    // Games Columns
    await createStringCol('games', 'title', 255);
    await createStringCol('games', 'scheduledAt', 255);
    await createStringCol('games', 'status', 50);
    await createStringCol('games', 'dealerName', 255);
    await createIntCol('games', 'buyinAmount');
    await createIntCol('games', 'rebuyAmount');
    await createIntCol('games', 'addonAmount');
    await createIntCol('games', 'startingChips');
    await createIntCol('games', 'hotHandJackpot');
    await createIntCol('games', 'totalPlayersCount');
    await createIntCol('games', 'remainingPlayersCount');
    await createIntCol('games', 'totalEntriesCount');
    await createIntCol('games', 'currentLevelIndex');
    await createIntCol('games', 'secondsRemainingInLevel');

    // Game Entries Columns
    await createStringCol('game_entries', 'playerName', 255);
    await createStringCol('game_entries', 'playerSuitIcon', 50);
    await createIntCol('game_entries', 'tableNumber');
    await createIntCol('game_entries', 'seatNumber');
    await createIntCol('game_entries', 'buyinsCount');
    await createIntCol('game_entries', 'rebuysCount');
    await createIntCol('game_entries', 'addonsCount');
    await createIntCol('game_entries', 'finishPosition');
    await createIntCol('game_entries', 'pointsAwarded');
    await createIntCol('game_entries', 'kosCount');
    await createBoolCol('game_entries', 'isEliminated');

    // Hot Hands Columns
    await createStringCol('hot_hands', 'date', 100);
    await createStringCol('hot_hands', 'handTitle', 255);
    await createIntCol('hot_hands', 'currentPool');
    await createBoolCol('hot_hands', 'isClaimed');

    // Announcements Columns
    await createStringCol('announcements', 'title', 255);
    await createStringCol('announcements', 'content', 2000);
    await createStringCol('announcements', 'type', 50);
    await createStringCol('announcements', 'createdAt', 255);

    console.log('\n4. Provisioning Native Appwrite v2.0 Relationships...');
    
    // 1. League (1) <--> Seasons (N)
    await createRelCol('leagues', 'seasons', RelationshipType.OneToMany, true, 'seasons', 'league', RelationMutate.Cascade);
    
    // 2. League (1) <--> Venues (N)
    await createRelCol('leagues', 'venues', RelationshipType.OneToMany, true, 'venues', 'league', RelationMutate.Cascade);
    
    // 3. League (1) <--> Players (N)
    await createRelCol('leagues', 'players', RelationshipType.OneToMany, true, 'players', 'league', RelationMutate.Cascade);
    
    // 4. League (1) <--> HotHands (N)
    await createRelCol('leagues', 'hot_hands', RelationshipType.OneToMany, true, 'hotHands', 'league', RelationMutate.Cascade);

    // 5. Season (1) <--> Games (N)
    await createRelCol('seasons', 'games', RelationshipType.OneToMany, true, 'games', 'season', RelationMutate.Cascade);

    // 6. Venue (1) <--> Games (N)
    await createRelCol('venues', 'games', RelationshipType.OneToMany, true, 'games', 'venue', RelationMutate.Restrict);

    // 7. Game (1) <--> GameEntries (N)
    await createRelCol('games', 'game_entries', RelationshipType.OneToMany, true, 'entries', 'game', RelationMutate.Cascade);

    // 8. Player (1) <--> GameEntries (N)
    await createRelCol('players', 'game_entries', RelationshipType.OneToMany, true, 'gameEntries', 'player', RelationMutate.Cascade);

    console.log('\n⏳ Waiting 4 seconds for Appwrite column index builds...');
    await new Promise((resolve) => setTimeout(resolve, 4000));

    console.log('\n5. Seeding Relational Rows (v2.0 TablesDB)...');
    const defaultPermissions = [
      Permission.read(Role.any()),
      Permission.update(Role.any()),
      Permission.delete(Role.any()),
    ];
    
    // Seed League
    try {
      await tablesDb.createRow(databaseId, 'leagues', mockLeague.$id, {
        name: mockLeague.name,
        description: mockLeague.description,
        ownerId: mockLeague.ownerId,
        createdAt: mockLeague.createdAt,
      }, defaultPermissions);
      console.log('  ✅ Seeded League Row');
    } catch (e: any) {
      if (e.code === 409 || e.type === 'row_already_exists') {
        console.log(`  - League row (${mockLeague.$id}) exists.`);
      } else {
        console.error(`  ❌ Failed to seed League:`, e.message || e);
      }
    }

    // Seed Seasons with league relationship
    for (const s of mockSeasons) {
      try {
        await tablesDb.createRow(databaseId, 'seasons', s.$id, {
          name: s.name,
          startDate: s.startDate,
          endDate: s.endDate,
          isActive: s.isActive,
          league: mockLeague.$id,
        }, defaultPermissions);
        console.log(`  ✅ Seeded Season: ${s.name} -> League(${mockLeague.$id})`);
      } catch (e: any) {
        if (e.code === 409 || e.type === 'row_already_exists') {
          console.log(`  - Season (${s.name}) exists.`);
        } else {
          console.error(`  ❌ Failed to seed Season (${s.name}):`, e.message || e);
        }
      }
    }

    // Seed Venues with league relationship
    for (const venue of mockVenues) {
      try {
        await tablesDb.createRow(databaseId, 'venues', venue.$id, {
          name: venue.name,
          address: venue.address,
          phone: venue.phone,
          website: venue.website || '',
          imageUrl: venue.imageUrl || '',
          league: mockLeague.$id,
        }, defaultPermissions);
        console.log(`  ✅ Seeded Venue: ${venue.name} -> League(${mockLeague.$id})`);
      } catch (e: any) {
        if (e.code === 409 || e.type === 'row_already_exists') {
          console.log(`  - Venue (${venue.name}) exists.`);
        } else {
          console.error(`  ❌ Failed to seed Venue (${venue.name}):`, e.message || e);
        }
      }
    }

    // Seed Players with league relationship
    for (const player of mockPlayers) {
      try {
        await tablesDb.createRow(databaseId, 'players', player.$id, {
          name: player.name,
          nickname: player.nickname || '',
          suitIcon: player.suitIcon,
          isMember: player.isMember,
          totalPoints: player.totalPoints,
          careerWins: player.careerWins,
          careerKOs: player.careerKOs,
          gamesPlayed: player.gamesPlayed,
          league: mockLeague.$id,
        }, defaultPermissions);
        console.log(`  ✅ Seeded Player: ${player.name} -> League(${mockLeague.$id})`);
      } catch (e: any) {
        if (e.code === 409 || e.type === 'row_already_exists') {
          console.log(`  - Player (${player.name}) exists.`);
        } else {
          console.error(`  ❌ Failed to seed Player (${player.name}):`, e.message || e);
        }
      }
    }

    // Seed Games with season and venue relationships
    for (const game of mockGames) {
      try {
        await tablesDb.createRow(databaseId, 'games', game.$id, {
          title: game.title,
          scheduledAt: game.scheduledAt,
          status: game.status,
          dealerName: game.dealerName || '',
          buyinAmount: game.buyinAmount,
          rebuyAmount: game.rebuyAmount,
          addonAmount: game.addonAmount,
          startingChips: game.startingChips,
          hotHandJackpot: game.hotHandJackpot || 0,
          totalPlayersCount: game.totalPlayersCount,
          remainingPlayersCount: game.remainingPlayersCount,
          totalEntriesCount: game.totalEntriesCount,
          currentLevelIndex: game.currentLevelIndex || 0,
          secondsRemainingInLevel: game.secondsRemainingInLevel || 900,
          season: game.seasonId,
          venue: game.venueId,
        }, defaultPermissions);
        console.log(`  ✅ Seeded Game: ${game.title} -> Season(${game.seasonId}) & Venue(${game.venueId})`);
      } catch (e: any) {
        if (e.code === 409 || e.type === 'row_already_exists') {
          console.log(`  - Game (${game.title}) exists.`);
        } else {
          console.error(`  ❌ Failed to seed Game (${game.title}):`, e.message || e);
        }
      }
    }

    // Seed Game Entries with game and player relationships
    for (const entry of mockGameEntries) {
      try {
        await tablesDb.createRow(databaseId, 'game_entries', entry.$id, {
          playerName: entry.playerName,
          playerSuitIcon: entry.playerSuitIcon,
          tableNumber: entry.tableNumber,
          seatNumber: entry.seatNumber,
          buyinsCount: entry.buyinsCount,
          rebuysCount: entry.rebuysCount,
          addonsCount: entry.addonsCount,
          finishPosition: entry.finishPosition || 0,
          pointsAwarded: entry.pointsAwarded || 0,
          kosCount: entry.kosCount,
          isEliminated: entry.isEliminated,
          game: entry.gameId,
          player: entry.playerId,
        }, defaultPermissions);
        console.log(`  ✅ Seeded Entry: ${entry.playerName} -> Game(${entry.gameId}) & Player(${entry.playerId})`);
      } catch (e: any) {
        if (e.code === 409 || e.type === 'row_already_exists') {
          console.log(`  - Entry (${entry.playerName}) exists.`);
        } else {
          console.error(`  ❌ Failed to seed Entry (${entry.playerName}):`, e.message || e);
        }
      }
    }

    // Seed Hot Hands with league relationship
    try {
      await tablesDb.createRow(databaseId, 'hot_hands', mockHotHandJackpot.$id, {
        date: mockHotHandJackpot.date,
        handTitle: mockHotHandJackpot.handTitle,
        currentPool: mockHotHandJackpot.currentPool,
        isClaimed: mockHotHandJackpot.isClaimed,
        league: mockLeague.$id,
      }, defaultPermissions);
      console.log('  ✅ Seeded Hot Hand Jackpot -> League(' + mockLeague.$id + ')');
    } catch (e: any) {
      if (e.code === 409 || e.type === 'row_already_exists') {
        console.log(`  - Hot Hand Jackpot exists.`);
      } else {
        console.error(`  ❌ Failed to seed Hot Hand Jackpot:`, e.message || e);
      }
    }

    // Seed Announcements
    for (const ann of mockAnnouncements) {
      try {
        await tablesDb.createRow(databaseId, 'announcements', ann.$id, {
          title: ann.title,
          content: ann.content,
          type: ann.type,
          createdAt: ann.createdAt,
        }, defaultPermissions);
        console.log(`  ✅ Seeded Announcement: ${ann.title}`);
      } catch (e: any) {
        if (e.code === 409 || e.type === 'row_already_exists') {
          console.log(`  - Announcement (${ann.title}) exists.`);
        } else {
          console.error(`  ❌ Failed to seed Announcement (${ann.title}):`, e.message || e);
        }
      }
    }

    console.log('\n🎉 Appwrite v2.0 TablesDB Provisioning & Seeding Successfully Completed!');
  } catch (error) {
    console.error('❌ Provisioning error:', error);
  }
}

provisionDatabase();
