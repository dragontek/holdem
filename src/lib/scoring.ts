import type {
  BlindLevel,
  Game,
  GameEntry,
  GameEntryStatus,
  HandBonusCode,
  KnockoutCode,
  PointMultiplier,
} from '@/types/holdem';

// ==========================================
// Jack Ten Poker — Official Blind Schedule (In Thousands)
// ==========================================

export const OFFICIAL_BLIND_SCHEDULE: BlindLevel[] = [
  // First Hour (20 min blinds): 1/2, 2/4, 4/8 + 10 min break
  { level: 1, smallBlind: 1000, bigBlind: 2000, ante: 0, durationMinutes: 20, isBreak: false },
  { level: 2, smallBlind: 2000, bigBlind: 4000, ante: 0, durationMinutes: 20, isBreak: false },
  { level: 3, smallBlind: 4000, bigBlind: 8000, ante: 0, durationMinutes: 20, isBreak: false },
  {
    level: 4,
    smallBlind: 0,
    bigBlind: 0,
    ante: 0,
    durationMinutes: 10,
    isBreak: true,
    breakTitle: '10-Min Break (End of Hour 1 / Rebuy Cutoff)',
  },
  // Second Hour (15 min blinds): 5/10, 10/20, 20/40, 40/80 + 10 min break
  { level: 5, smallBlind: 5000, bigBlind: 10000, ante: 0, durationMinutes: 15, isBreak: false },
  { level: 6, smallBlind: 10000, bigBlind: 20000, ante: 0, durationMinutes: 15, isBreak: false },
  { level: 7, smallBlind: 20000, bigBlind: 40000, ante: 0, durationMinutes: 15, isBreak: false },
  { level: 8, smallBlind: 40000, bigBlind: 80000, ante: 0, durationMinutes: 15, isBreak: false },
  {
    level: 9,
    smallBlind: 0,
    bigBlind: 0,
    ante: 0,
    durationMinutes: 10,
    isBreak: true,
    breakTitle: '10-Min Break (End of Hour 2 / Color Up)',
  },
  // Third Hour (10 min blinds): 50/100, 100/200, 200/400, 400/800
  { level: 10, smallBlind: 50000, bigBlind: 100000, ante: 0, durationMinutes: 10, isBreak: false },
  { level: 11, smallBlind: 100000, bigBlind: 200000, ante: 0, durationMinutes: 10, isBreak: false },
  { level: 12, smallBlind: 200000, bigBlind: 400000, ante: 0, durationMinutes: 10, isBreak: false },
  { level: 13, smallBlind: 400000, bigBlind: 800000, ante: 0, durationMinutes: 10, isBreak: false },
];

export function formatBlindInThousands(amount: number): string {
  if (amount <= 0) return '—';
  if (amount >= 1000 && amount % 1000 === 0) {
    return `${amount / 1000}k`;
  }
  return amount.toLocaleString();
}

export function getNextAvailableSeat(
  entries: GameEntry[],
  seatsPerTable: number = 9
): { tableNumber: number; seatNumber: number } {
  const occupied = new Set(entries.map((e) => `${e.tableNumber}-${e.seatNumber}`));
  for (let table = 1; table <= 20; table++) {
    for (let seat = 1; seat <= seatsPerTable; seat++) {
      if (!occupied.has(`${table}-${seat}`)) {
        return { tableNumber: table, seatNumber: seat };
      }
    }
  }
  return { tableNumber: 1, seatNumber: entries.length + 1 };
}

// ==========================================
// Jack Ten Poker — Official Base Point Table
// ==========================================

export const SHOW_UP_POINTS = 600;
export const NO_GAME_SHOW_UP_POINTS = 5000;
export const SURVIVOR_POINTS = 500;

export const PLACEMENT_POINTS: Readonly<Record<number, number>> = {
  1: 12000,
  2: 5000,
  3: 3000,
  4: 1500,
  5: 1000,
};

export interface ScoringCodeMeta<T extends string> {
  code: T;
  symbol: string;
  label: string;
  shortLabel: string;
  points: number;
  description: string;
}

export const KO_DEFINITIONS: Readonly<Record<KnockoutCode, ScoringCodeMeta<KnockoutCode>>> = {
  K: {
    code: 'K',
    symbol: 'K',
    label: 'Standard Knockout',
    shortLabel: 'KO',
    points: 1000,
    description: 'Awarded per player eliminated.',
  },
  R: {
    code: 'R',
    symbol: 'R',
    label: 'Rebuy Knockout',
    shortLabel: 'Rebuy KO',
    points: 5000,
    description: 'Awarded for knocking out a player under rebuy bounty rules.',
  },
};

export const HAND_BONUS_DEFINITIONS: Readonly<Record<HandBonusCode, ScoringCodeMeta<HandBonusCode>>> = {
  SURV: {
    code: 'SURV',
    symbol: '☆',
    label: 'Survivor (All-In)',
    shortLabel: 'Survivor',
    points: SURVIVOR_POINTS,
    description: 'Awarded each time a player goes all-in and survives without busting.',
  },
  O: {
    code: 'O',
    symbol: 'O',
    label: 'HOD (Off Suit)',
    shortLabel: 'HOD Off',
    points: 500,
    description: 'Winning a hand with the off-suit Hand of the Day.',
  },
  S: {
    code: 'S',
    symbol: 'S',
    label: 'HOD (Suited)',
    shortLabel: 'HOD Suit',
    points: 1000,
    description: 'Winning a hand with the suited Hand of the Day.',
  },
  '4': {
    code: '4',
    symbol: '4',
    label: 'Four of a Kind',
    shortLabel: 'Quads',
    points: 2500,
    description: 'Quads achieved during the session.',
  },
  F: {
    code: 'F',
    symbol: 'F',
    label: 'Straight Flush',
    shortLabel: 'Str Flush',
    points: 5000,
    description: 'Non-royal straight flush achieved during the session.',
  },
  '#': {
    code: '#',
    symbol: '#',
    label: 'Royal Flush',
    shortLabel: 'Royal',
    points: 10000,
    description: 'Royal flush achieved during the session.',
  },
};

export const KO_CODE_LIST: readonly KnockoutCode[] = ['K', 'R'];
export const HAND_BONUS_CODE_LIST: readonly HandBonusCode[] = ['SURV', 'O', 'S', '4', 'F', '#'];

export const MULTIPLIER_LABELS: Readonly<Record<PointMultiplier, string>> = {
  1: 'Single Points (1x)',
  2: 'Double Points (2x)',
  3: 'Triple Points (3x)',
};

export interface ScoreLineItem {
  category: 'attendance' | 'survivor' | 'placement' | 'ko' | 'hand';
  label: string;
  code?: string;
  basePoints: number;
  finalPoints: number;
}

export interface EntryScoreBreakdown {
  status: GameEntryStatus;
  isMucked: boolean;
  noGamePlayed: boolean;
  showUpPoints: number;
  survivorPoints: number;
  placementPoints: number;
  koPoints: number;
  handBonusPoints: number;
  basePoints: number;
  sessionMultiplier: PointMultiplier;
  dgMultiplier: 1 | 2;
  totalMultiplier: number;
  finalPoints: number;
  lineItems: ScoreLineItem[];
}

export interface FinalizedEntryResult {
  entryId: string;
  playerId: string;
  playerName: string;
  finishPosition: number;
  status: GameEntryStatus;
  basePoints: number;
  finalPoints: number;
  totalMultiplier: number;
  knockouts: KnockoutCode[];
  handBonuses: HandBonusCode[];
  highHandCount: number;
  consumedDgCarryover: boolean;
  earnedDgForNextGame: boolean;
  nextHasDgCarryover: boolean;
  breakdown: EntryScoreBreakdown;
}

export interface KnockoutAuditIssue {
  entryId: string;
  playerId: string;
  playerName: string;
  seatNumber: number;
  eliminationsCredited: number;
  koBadgesRecorded: number;
  message: string;
}

export interface KnockoutAuditSummary {
  totalEliminationsWithKiller: number;
  totalKoBadgesRecorded: number;
  isBalanced: boolean;
  issues: KnockoutAuditIssue[];
}

export function getEntryStatus(entry: Pick<GameEntry, 'status' | 'isEliminated'>): GameEntryStatus {
  if (entry.status) return entry.status;
  return entry.isEliminated ? 'ELIMINATED' : 'ACTIVE';
}

export function getEntryKnockouts(entry: Pick<GameEntry, 'knockouts' | 'kosCount'>): KnockoutCode[] {
  if (Array.isArray(entry.knockouts)) return entry.knockouts;
  const count = Math.max(0, entry.kosCount || 0);
  return Array.from({ length: count }, () => 'K' as KnockoutCode);
}

export function getEntryHandBonuses(entry: Pick<GameEntry, 'handBonuses'>): HandBonusCode[] {
  if (!Array.isArray(entry.handBonuses)) return [];
  return entry.handBonuses
    .map((code) => ((code as string) === 'HOT' ? 'SURV' : code))
    .filter((code): code is HandBonusCode => code in HAND_BONUS_DEFINITIONS);
}

export function getPlacementPoints(position?: number): number {
  if (!position || position < 1) return 0;
  return PLACEMENT_POINTS[position] ?? 0;
}

export function formatOrdinal(position: number): string {
  const mod100 = position % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${position}th`;
  switch (position % 10) {
    case 1:
      return `${position}st`;
    case 2:
      return `${position}nd`;
    case 3:
      return `${position}rd`;
    default:
      return `${position}th`;
  }
}

/**
 * Pure Jack Ten Poker score calculation for a single player entry in a session.
 *
 * BasePoints = ShowUp + Survivor + Placement + sum(KO) + sum(HD)
 * TotalMultiplier = SessionMultiplier * (HasDGCarryover ? 2 : 1)
 * FinalScore = MUCK ? 0 : BasePoints * TotalMultiplier
 *
 * When `noGamePlayed` is true, non-mucked attendees receive a flat 5,000 pts
 * without tournament multipliers or DG consumption.
 */
export function calculateEntryScore(
  entry: GameEntry,
  game: Pick<Game, 'pointMultiplier' | 'isDayGame' | 'noGamePlayed'>
): EntryScoreBreakdown {
  const status = getEntryStatus(entry);
  const isMucked = status === 'MUCK';
  const sessionMultiplier: PointMultiplier =
    game.pointMultiplier === 2 || game.pointMultiplier === 3 ? game.pointMultiplier : 1;

  if (game.noGamePlayed) {
    const basePoints = NO_GAME_SHOW_UP_POINTS;
    const finalPoints = isMucked ? 0 : basePoints;
    return {
      status,
      isMucked,
      noGamePlayed: true,
      showUpPoints: NO_GAME_SHOW_UP_POINTS,
      survivorPoints: 0,
      placementPoints: 0,
      koPoints: 0,
      handBonusPoints: 0,
      basePoints,
      sessionMultiplier: 1,
      dgMultiplier: 1,
      totalMultiplier: 1,
      finalPoints,
      lineItems: [
        {
          category: 'attendance',
          label: 'No-Game Show Up',
          basePoints: NO_GAME_SHOW_UP_POINTS,
          finalPoints,
        },
      ],
    };
  }

  const dgMultiplier: 1 | 2 = entry.hasDgCarryover ? 2 : 1;
  const totalMultiplier = sessionMultiplier * dgMultiplier;
  const effectiveMultiplier = isMucked ? 0 : totalMultiplier;

  const showUpPoints = SHOW_UP_POINTS;
  const placementPoints = getPlacementPoints(entry.finishPosition);

  const knockouts = getEntryKnockouts(entry);
  const handBonuses = getEntryHandBonuses(entry);

  const survivorCount = handBonuses.filter((c) => c === 'SURV').length;
  const survivorPoints = survivorCount * SURVIVOR_POINTS;

  const lineItems: ScoreLineItem[] = [
    {
      category: 'attendance',
      label: 'Show Up Points',
      basePoints: showUpPoints,
      finalPoints: showUpPoints * effectiveMultiplier,
    },
  ];

  if (survivorCount > 0) {
    lineItems.push({
      category: 'survivor',
      label: survivorCount > 1 ? `Survivor (All-In) ×${survivorCount}` : 'Survivor (All-In)',
      code: '☆',
      basePoints: survivorPoints,
      finalPoints: survivorPoints * effectiveMultiplier,
    });
  }

  if (placementPoints > 0 && entry.finishPosition) {
    lineItems.push({
      category: 'placement',
      label: `${formatOrdinal(entry.finishPosition)} Place Finish`,
      code: `#${entry.finishPosition}`,
      basePoints: placementPoints,
      finalPoints: placementPoints * effectiveMultiplier,
    });
  }

  let koPoints = 0;
  const koCounts: Partial<Record<KnockoutCode, number>> = {};
  for (const code of knockouts) {
    const def = KO_DEFINITIONS[code];
    if (!def) continue;
    koPoints += def.points;
    koCounts[code] = (koCounts[code] ?? 0) + 1;
  }
  for (const code of KO_CODE_LIST) {
    const count = koCounts[code] ?? 0;
    if (count > 0) {
      const def = KO_DEFINITIONS[code];
      const pts = def.points * count;
      lineItems.push({
        category: 'ko',
        label: count > 1 ? `${def.label} ×${count}` : def.label,
        code: def.symbol,
        basePoints: pts,
        finalPoints: pts * effectiveMultiplier,
      });
    }
  }

  let handBonusPoints = 0;
  const hdCounts: Partial<Record<HandBonusCode, number>> = {};
  for (const code of handBonuses) {
    if (code === 'SURV') continue;
    const def = HAND_BONUS_DEFINITIONS[code];
    if (!def) continue;
    handBonusPoints += def.points;
    hdCounts[code] = (hdCounts[code] ?? 0) + 1;
  }
  for (const code of HAND_BONUS_CODE_LIST) {
    if (code === 'SURV') continue;
    const count = hdCounts[code] ?? 0;
    if (count > 0) {
      const def = HAND_BONUS_DEFINITIONS[code];
      const pts = def.points * count;
      lineItems.push({
        category: 'hand',
        label: count > 1 ? `${def.label} ×${count}` : def.label,
        code: def.symbol,
        basePoints: pts,
        finalPoints: pts * effectiveMultiplier,
      });
    }
  }

  const basePoints = showUpPoints + survivorPoints + placementPoints + koPoints + handBonusPoints;
  const finalPoints = isMucked ? 0 : basePoints * totalMultiplier;

  return {
    status,
    isMucked,
    noGamePlayed: false,
    showUpPoints,
    survivorPoints,
    placementPoints,
    koPoints,
    handBonusPoints,
    basePoints,
    sessionMultiplier,
    dgMultiplier,
    totalMultiplier,
    finalPoints,
    lineItems,
  };
}

/**
 * Computes complete finalization payloads for all entries in a tournament,
 * including Day Game (DG) carryover consumption and next-game earning.
 */
export function computeFinalizationResults(
  entries: GameEntry[],
  game: Pick<Game, 'pointMultiplier' | 'isDayGame' | 'noGamePlayed'>,
  remainingPlacements?: Record<string, number>
): FinalizedEntryResult[] {
  const activeEntries = entries.filter((e) => getEntryStatus(e) === 'ACTIVE');

  return entries.map((entry) => {
    const status = getEntryStatus(entry);
    let finishPosition = entry.finishPosition || 0;

    if (status === 'ACTIVE') {
      if (remainingPlacements && remainingPlacements[entry.$id]) {
        finishPosition = remainingPlacements[entry.$id];
      } else {
        const activeIdx = activeEntries.findIndex((a) => a.$id === entry.$id);
        finishPosition = activeIdx >= 0 ? activeIdx + 1 : 1;
      }
    } else if (finishPosition === 0) {
      finishPosition = entries.length;
    }

    const entryWithFinish: GameEntry = {
      ...entry,
      finishPosition,
    };

    const breakdown = calculateEntryScore(entryWithFinish, game);
    const knockouts = getEntryKnockouts(entry);
    const handBonuses = getEntryHandBonuses(entry);

    // High-hand badge count increments for Quads, Straight Flush, Royal Flush
    const highHandCount = handBonuses.filter(
      (b) => b === '4' || b === 'F' || b === '#'
    ).length;

    let consumedDgCarryover = false;
    let earnedDgForNextGame = false;
    let nextHasDgCarryover = Boolean(entry.hasDgCarryover);

    if (!game.noGamePlayed) {
      consumedDgCarryover = Boolean(entry.hasDgCarryover);
      earnedDgForNextGame = Boolean(game.isDayGame && !breakdown.isMucked);
      nextHasDgCarryover = earnedDgForNextGame;
    }

    return {
      entryId: entry.$id,
      playerId: entry.playerId,
      playerName: entry.playerName,
      finishPosition,
      status,
      basePoints: breakdown.basePoints,
      finalPoints: breakdown.finalPoints,
      totalMultiplier: breakdown.totalMultiplier,
      knockouts,
      handBonuses,
      highHandCount,
      consumedDgCarryover,
      earnedDgForNextGame,
      nextHasDgCarryover,
      breakdown,
    };
  });
}

/**
 * Cross-checks elimination records ("Knocked out by") against KO badges (K / R)
 * credited across the session to catch unrecorded or mismatched knockouts.
 */
export function auditKnockouts(entries: GameEntry[]): KnockoutAuditSummary {
  const elimCountByPlayerId = new Map<string, number>();
  let totalEliminationsWithKiller = 0;
  let totalKoBadgesRecorded = 0;

  for (const entry of entries) {
    const kos = getEntryKnockouts(entry);
    totalKoBadgesRecorded += kos.length;

    if (entry.knockedOutByPlayerId) {
      totalEliminationsWithKiller += 1;
      elimCountByPlayerId.set(
        entry.knockedOutByPlayerId,
        (elimCountByPlayerId.get(entry.knockedOutByPlayerId) ?? 0) + 1
      );
    } else if (entry.eliminatedBySeat) {
      const killer = entries.find((e) => e.seatNumber === entry.eliminatedBySeat);
      if (killer) {
        totalEliminationsWithKiller += 1;
        elimCountByPlayerId.set(
          killer.playerId,
          (elimCountByPlayerId.get(killer.playerId) ?? 0) + 1
        );
      }
    }
  }

  const issues: KnockoutAuditIssue[] = [];
  for (const entry of entries) {
    const recorded = getEntryKnockouts(entry).length;
    const credited = elimCountByPlayerId.get(entry.playerId) ?? 0;

    // Only flag if there's an explicit elimination record that exceeds recorded KOs,
    // or if recorded KOs don't match when eliminations are tracked.
    if (credited > recorded) {
      issues.push({
        entryId: entry.$id,
        playerId: entry.playerId,
        playerName: entry.playerName,
        seatNumber: entry.seatNumber,
        eliminationsCredited: credited,
        koBadgesRecorded: recorded,
        message: `${entry.playerName} (Seat ${entry.seatNumber}) eliminated ${credited} player${credited === 1 ? '' : 's'} but has only ${recorded} KO badge${recorded === 1 ? '' : 's'} recorded.`,
      });
    }
  }

  return {
    totalEliminationsWithKiller,
    totalKoBadgesRecorded,
    isBalanced: issues.length === 0,
    issues,
  };
}

export function syncEntryCalculatedFields(
  entry: GameEntry,
  game: Pick<Game, 'pointMultiplier' | 'isDayGame' | 'noGamePlayed'>
): GameEntry {
  const knockouts = getEntryKnockouts(entry);
  const breakdown = calculateEntryScore(entry, game);
  return {
    ...entry,
    status: breakdown.status,
    isEliminated: breakdown.status !== 'ACTIVE',
    knockouts,
    kosCount: knockouts.length,
    handBonuses: getEntryHandBonuses(entry),
    calculatedBasePoints: breakdown.basePoints,
    calculatedFinalPoints: breakdown.finalPoints,
    pointsAwarded: breakdown.finalPoints,
  };
}
