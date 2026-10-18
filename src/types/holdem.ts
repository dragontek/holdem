export type GameStatus = 'scheduled' | 'running' | 'paused' | 'completed' | 'canceled';
export type SuitIcon = 'hearts' | 'diamonds' | 'spades' | 'clubs';
export type UserRole = 'admin' | 'manager' | 'dealer' | 'scribe' | 'player';

/**
 * 1. League
 * Has one or more Seasons and one or more Venues. Configured by an assigned League Manager.
 */
export interface League {
  $id: string;
  name: string;
  description: string;
  logoUrl?: string;
  ownerId: string;
  managerId?: string;
  managerName?: string;
  managerEmail?: string;
  createdAt: string;
}

/**
 * 2. Season
 * Belongs to a League. Has one or more Tournament Events.
 */
export interface Season {
  $id: string;
  leagueId: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

/**
 * 3. Venue
 * Belongs to a League. Hosts one or more Tournament Events.
 */
export interface Venue {
  $id: string;
  leagueId: string;
  name: string;
  address: string;
  phone: string;
  website?: string;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * 4. UserProfile & Player (Native Appwrite Users)
 * Each player has an Appwrite account with roles and league tournament statistics.
 */
export interface UserProfile {
  $id: string; // Native Appwrite user account ID
  name: string;
  email: string;
  role: UserRole;
  nickname?: string;
  avatarUrl?: string;
  suitIcon: SuitIcon;
  isMember: boolean;
  totalPoints: number;
  careerWins: number;
  careerKOs: number;
  gamesPlayed: number;
  highHandBadges?: number;
  leagueId?: string;
}

/**
 * Player is unified with native Appwrite UserProfile.
 */
export type Player = UserProfile;

export interface BlindLevel {
  level: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  durationMinutes: number;
  isBreak: boolean;
  breakTitle?: string;
}

/**
 * 5. TournamentEvent
 * Belongs to a Season and Venue. Contains one or more Games.
 */
export interface TournamentEvent {
  $id: string;
  seasonId: string;
  venueId: string;
  venueName: string;
  title: string;
  description?: string;
  scheduledAt: string;
  status: GameStatus;
  isRecurring?: boolean;
  recurrenceRule?: string;
  seriesId?: string;
  gamesCount?: number;
  games?: Game[];
}

export type LeagueEvent = TournamentEvent;

/**
 * 6. Game
 * Belongs to a TournamentEvent. Contains one or more Players (entries).
 */
export interface Game {
  $id: string;
  eventId: string; // Parent TournamentEvent ID
  seasonId: string;
  venueId: string;
  venueName: string;
  title: string;
  scheduledAt: string;
  status: GameStatus;
  currentLevelIndex: number;
  secondsRemainingInLevel: number;
  dealerName?: string;
  buyinAmount: number;
  rebuyAmount: number;
  addonAmount: number;
  startingChips: number;
  hotHandJackpot?: number;
  hotHandDescription?: string;
  totalPlayersCount: number;
  remainingPlayersCount: number;
  totalEntriesCount: number;
  blindSchedule: BlindLevel[];
  isRecurring?: boolean;
  recurrenceRule?: string;
  seriesId?: string;
}

/**
 * 7. GameEntry
 * Relates a Game to a Player (Native Appwrite User Account).
 */
export interface GameEntry {
  $id: string;
  gameId: string;
  playerId: string; // Native Appwrite User $id
  playerName: string;
  playerAvatar?: string;
  playerSuitIcon: SuitIcon;
  tableNumber: number;
  seatNumber: number;
  buyinsCount: number;
  rebuysCount: number;
  addonsCount: number;
  finishPosition?: number;
  pointsAwarded?: number;
  kosCount: number;
  knockedOutByPlayerId?: string;
  knockedOutByPlayerName?: string;
  isEliminated: boolean;
  eliminatedAt?: string;
}

export interface HotHandJackpot {
  $id: string;
  leagueId: string;
  date: string;
  handTitle: string;
  currentPool: number;
  winnerPlayerName?: string;
  isClaimed: boolean;
}

export interface Announcement {
  $id: string;
  title: string;
  content: string;
  type: 'urgent' | 'info' | 'promo';
  createdAt: string;
}


