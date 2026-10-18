export type GameStatus = 'scheduled' | 'running' | 'paused' | 'completed' | 'canceled';
export type SuitIcon = 'hearts' | 'diamonds' | 'spades' | 'clubs';

export interface League {
  $id: string;
  name: string;
  description: string;
  logoUrl?: string;
  ownerId: string;
  createdAt: string;
}

export interface Season {
  $id: string;
  leagueId: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

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

export interface Player {
  $id: string;
  leagueId: string;
  name: string;
  nickname?: string;
  avatarUrl?: string;
  suitIcon: SuitIcon;
  email?: string;
  isMember: boolean;
  totalPoints: number;
  careerWins: number;
  careerKOs: number;
  gamesPlayed: number;
  highHandBadges?: number;
}

export interface BlindLevel {
  level: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  durationMinutes: number;
  isBreak: boolean;
  breakTitle?: string;
}

export interface Game {
  $id: string;
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

export interface GameEntry {
  $id: string;
  gameId: string;
  playerId: string;
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

export type UserRole = 'manager' | 'dealer' | 'scribe' | 'player';

export interface UserProfile {
  $id: string;
  name: string;
  email: string;
  role: UserRole;
}

