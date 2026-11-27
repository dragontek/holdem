import type {
  GameEntry,
  GameEntryStatus,
  HandBonusCode,
  KnockoutCode,
} from '@/types/holdem';

export const ENTRY_SCORING_META_ANNOUNCEMENT_TYPE = 'entry_scoring_meta';

export interface EntryScoringMeta {
  entryId: string;
  gameId: string;
  status?: GameEntryStatus;
  showUpAwarded?: boolean;
  hasDgCarryover?: boolean;
  earnedDgForNextGame?: boolean;
  survivedRebuy?: boolean;
  rebuyOnly?: boolean;
  finishPosition?: number;
  kosCount?: number;
  knockouts?: KnockoutCode[];
  handBonuses?: HandBonusCode[];
  eliminatedBySeat?: number;
  knockedOutByPlayerId?: string;
  knockedOutByPlayerName?: string;
  calculatedBasePoints?: number;
  calculatedFinalPoints?: number;
  pointsAwarded?: number;
  legacyPointsOffset?: number;
  updatedAt: string;
}

/**
 * Deterministic Appwrite row ID (<= 36 chars) for an entry's scoring metadata sidecar
 * in the `announcements` table. Keeps full Jack Ten Poker scoring details durable and
 * real-time synchronized even when `game_entries` uses a legacy schema lacking newer columns.
 */
export function getEntryScoringMetaRowId(entryId: string): string {
  const sanitized = entryId.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 32);
  return `esc_${sanitized}`;
}

export function buildEntryScoringMeta(
  entryId: string,
  gameId: string,
  entry: Partial<GameEntry>,
  updatedAt: string = new Date().toISOString()
): EntryScoringMeta {
  const meta: EntryScoringMeta = {
    entryId,
    gameId,
    updatedAt,
  };
  if (entry.status !== undefined) meta.status = entry.status;
  if (entry.showUpAwarded !== undefined) meta.showUpAwarded = entry.showUpAwarded;
  if (entry.hasDgCarryover !== undefined) meta.hasDgCarryover = entry.hasDgCarryover;
  if (entry.earnedDgForNextGame !== undefined) meta.earnedDgForNextGame = entry.earnedDgForNextGame;
  if (entry.survivedRebuy !== undefined) meta.survivedRebuy = entry.survivedRebuy;
  if (entry.rebuyOnly !== undefined) meta.rebuyOnly = entry.rebuyOnly;
  if (entry.finishPosition !== undefined) meta.finishPosition = entry.finishPosition;
  if (entry.kosCount !== undefined) meta.kosCount = entry.kosCount;
  if (Array.isArray(entry.knockouts)) meta.knockouts = entry.knockouts;
  if (Array.isArray(entry.handBonuses)) meta.handBonuses = entry.handBonuses;
  if (entry.eliminatedBySeat !== undefined) meta.eliminatedBySeat = entry.eliminatedBySeat;
  if (entry.knockedOutByPlayerId !== undefined) {
    meta.knockedOutByPlayerId = entry.knockedOutByPlayerId;
  }
  if (entry.knockedOutByPlayerName !== undefined) {
    meta.knockedOutByPlayerName = entry.knockedOutByPlayerName;
  }
  if (entry.calculatedBasePoints !== undefined) {
    meta.calculatedBasePoints = entry.calculatedBasePoints;
  }
  if (entry.calculatedFinalPoints !== undefined) {
    meta.calculatedFinalPoints = entry.calculatedFinalPoints;
  }
  if (entry.pointsAwarded !== undefined) meta.pointsAwarded = entry.pointsAwarded;
  if (entry.legacyPointsOffset !== undefined && entry.legacyPointsOffset > 0) {
    meta.legacyPointsOffset = entry.legacyPointsOffset;
  }
  return meta;
}

export function parseEntryScoringMetaPayload(
  raw: Record<string, unknown>
): EntryScoringMeta | null {
  if (raw.type !== ENTRY_SCORING_META_ANNOUNCEMENT_TYPE) return null;
  if (typeof raw.content !== 'string' || !raw.content.trim()) return null;
  try {
    const parsed = JSON.parse(raw.content) as Partial<EntryScoringMeta>;
    if (!parsed || typeof parsed.entryId !== 'string' || !parsed.entryId) return null;
    const gameId =
      typeof parsed.gameId === 'string' && parsed.gameId
        ? parsed.gameId
        : typeof raw.title === 'string'
        ? raw.title
        : '';
    return {
      ...parsed,
      entryId: parsed.entryId,
      gameId,
      updatedAt:
        typeof parsed.updatedAt === 'string' && parsed.updatedAt
          ? parsed.updatedAt
          : typeof raw.$updatedAt === 'string'
          ? raw.$updatedAt
          : typeof raw.createdAt === 'string'
          ? raw.createdAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Merges a sidecar EntryScoringMeta record onto a GameEntry.
 * Once authoritative sidecar metadata is present, legacySeedPoints is cleared because
 * itemized handBonuses/knockouts (plus any explicit legacyPointsOffset) are authoritative.
 */
export function mergeEntryWithScoringMeta(
  entry: GameEntry,
  meta?: EntryScoringMeta | null
): GameEntry {
  if (!meta) return entry;
  const knockouts = Array.isArray(meta.knockouts) ? meta.knockouts : entry.knockouts;
  const kosCount =
    typeof meta.kosCount === 'number'
      ? meta.kosCount
      : Array.isArray(knockouts)
      ? knockouts.length
      : entry.kosCount;
  const status = meta.status ?? entry.status;
  const isEliminated =
    status !== undefined ? status !== 'ACTIVE' : entry.isEliminated;

  return {
    ...entry,
    gameId: entry.gameId || meta.gameId,
    status,
    isEliminated,
    showUpAwarded: meta.showUpAwarded !== undefined ? meta.showUpAwarded : entry.showUpAwarded,
    hasDgCarryover:
      meta.hasDgCarryover !== undefined ? meta.hasDgCarryover : entry.hasDgCarryover,
    earnedDgForNextGame:
      meta.earnedDgForNextGame !== undefined
        ? meta.earnedDgForNextGame
        : entry.earnedDgForNextGame,
    survivedRebuy:
      meta.survivedRebuy !== undefined ? meta.survivedRebuy : entry.survivedRebuy,
    rebuyOnly: meta.rebuyOnly !== undefined ? meta.rebuyOnly : entry.rebuyOnly,
    finishPosition:
      meta.finishPosition !== undefined ? meta.finishPosition || undefined : entry.finishPosition,
    kosCount,
    knockouts,
    handBonuses: Array.isArray(meta.handBonuses) ? meta.handBonuses : entry.handBonuses,
    eliminatedBySeat:
      meta.eliminatedBySeat !== undefined
        ? meta.eliminatedBySeat || undefined
        : entry.eliminatedBySeat,
    knockedOutByPlayerId:
      meta.knockedOutByPlayerId !== undefined
        ? meta.knockedOutByPlayerId || undefined
        : entry.knockedOutByPlayerId,
    knockedOutByPlayerName:
      meta.knockedOutByPlayerName !== undefined
        ? meta.knockedOutByPlayerName || undefined
        : entry.knockedOutByPlayerName,
    calculatedBasePoints:
      meta.calculatedBasePoints !== undefined
        ? meta.calculatedBasePoints
        : entry.calculatedBasePoints,
    calculatedFinalPoints:
      meta.calculatedFinalPoints !== undefined
        ? meta.calculatedFinalPoints
        : entry.calculatedFinalPoints,
    pointsAwarded:
      meta.pointsAwarded !== undefined ? meta.pointsAwarded : entry.pointsAwarded,
    legacyPointsOffset:
      meta.legacyPointsOffset !== undefined ? meta.legacyPointsOffset : entry.legacyPointsOffset,
    legacySeedPoints: undefined,
  };
}

function hasRawField(raw: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(raw, key) && raw[key] !== undefined;
}

/**
 * Reconciles an incoming Appwrite Realtime `game_entries` payload with the previous
 * local GameEntry snapshot so legacy Appwrite schemas (which omit `handBonuses`,
 * `knockouts`, `status`, `showUpAwarded`, etc.) NEVER overwrite locally-recorded or
 * sidecar-synced scoring fields back to empty arrays.
 */
export function mergeRealtimeGameEntry(
  rawPayload: Record<string, unknown>,
  mapped: GameEntry,
  prevEntry?: GameEntry,
  resolvedGameId?: string
): GameEntry {
  const gameId = resolvedGameId || mapped.gameId || prevEntry?.gameId || '';
  const hasNativeHandBonuses = hasRawField(rawPayload, 'handBonuses');
  const hasNativeKnockouts = hasRawField(rawPayload, 'knockouts');
  const hasNativeStatus = hasRawField(rawPayload, 'status');
  const hasNativeShowUp = hasRawField(rawPayload, 'showUpAwarded');
  const hasNativeDg = hasRawField(rawPayload, 'hasDgCarryover');
  const hasNativeEarnedDg = hasRawField(rawPayload, 'earnedDgForNextGame');
  const hasNativeSurvived = hasRawField(rawPayload, 'survivedRebuy');
  const hasNativeRebuyOnly = hasRawField(rawPayload, 'rebuyOnly');
  const hasNativeElimSeat = hasRawField(rawPayload, 'eliminatedBySeat');
  const hasNativeKillerId = hasRawField(rawPayload, 'knockedOutByPlayerId');
  const hasNativeKillerName = hasRawField(rawPayload, 'knockedOutByPlayerName');
  const hasNativeCalcBase = hasRawField(rawPayload, 'calculatedBasePoints');
  const hasNativeCalcFinal = hasRawField(rawPayload, 'calculatedFinalPoints');
  const hasNativeLegacyOffset = hasRawField(rawPayload, 'legacyPointsOffset');

  // Reconcile knockouts array when the incoming payload omits `knockouts`
  let resolvedKnockouts = mapped.knockouts;
  if (!hasNativeKnockouts && prevEntry && Array.isArray(prevEntry.knockouts)) {
    const incomingCount = Math.max(0, mapped.kosCount ?? prevEntry.kosCount ?? 0);
    if (incomingCount === prevEntry.knockouts.length) {
      resolvedKnockouts = prevEntry.knockouts;
    } else if (incomingCount > prevEntry.knockouts.length) {
      resolvedKnockouts = [
        ...prevEntry.knockouts,
        ...Array.from({ length: incomingCount - prevEntry.knockouts.length }, () => 'K' as KnockoutCode),
      ];
    } else {
      resolvedKnockouts = prevEntry.knockouts.slice(0, incomingCount);
    }
  }

  // Preserve MUCK status if legacy payload only sends `isEliminated: true` without `status`
  let resolvedStatus = mapped.status;
  if (!hasNativeStatus && prevEntry?.status) {
    if (mapped.isEliminated && prevEntry.status === 'MUCK') {
      resolvedStatus = 'MUCK';
    } else if (!mapped.isEliminated) {
      resolvedStatus = 'ACTIVE';
    }
  }

  const resolvedHandBonuses = hasNativeHandBonuses
    ? mapped.handBonuses
    : prevEntry?.handBonuses ?? mapped.handBonuses;

  const resolvedLegacyOffset = hasNativeLegacyOffset
    ? mapped.legacyPointsOffset
    : prevEntry?.legacyPointsOffset;

  // Only treat incoming `pointsAwarded` as a legacy seed floor when there is no itemized
  // scoring metadata (neither native columns nor prior itemized bonuses/offset)
  const hasDetailedScoring =
    hasNativeHandBonuses ||
    hasNativeCalcFinal ||
    Boolean(prevEntry && ((prevEntry.handBonuses?.length ?? 0) > 0 || prevEntry.legacyPointsOffset !== undefined || prevEntry.calculatedFinalPoints !== undefined));

  const resolvedLegacySeedPoints = hasDetailedScoring
    ? undefined
    : typeof mapped.pointsAwarded === 'number' && mapped.pointsAwarded > 0
    ? mapped.pointsAwarded
    : prevEntry?.legacySeedPoints;

  return {
    ...mapped,
    gameId,
    playerId: mapped.playerId || prevEntry?.playerId || '',
    playerName: mapped.playerName || prevEntry?.playerName || '',
    playerSuitIcon: mapped.playerSuitIcon || prevEntry?.playerSuitIcon || 'spades',
    status: resolvedStatus,
    isEliminated: resolvedStatus !== undefined ? resolvedStatus !== 'ACTIVE' : mapped.isEliminated,
    showUpAwarded: hasNativeShowUp ? mapped.showUpAwarded : prevEntry?.showUpAwarded,
    hasDgCarryover: hasNativeDg ? mapped.hasDgCarryover : prevEntry?.hasDgCarryover ?? mapped.hasDgCarryover,
    earnedDgForNextGame: hasNativeEarnedDg
      ? mapped.earnedDgForNextGame
      : prevEntry?.earnedDgForNextGame ?? mapped.earnedDgForNextGame,
    survivedRebuy: hasNativeSurvived
      ? mapped.survivedRebuy
      : prevEntry?.survivedRebuy ?? mapped.survivedRebuy,
    rebuyOnly: hasNativeRebuyOnly ? mapped.rebuyOnly : prevEntry?.rebuyOnly ?? mapped.rebuyOnly,
    knockouts: resolvedKnockouts,
    kosCount: Array.isArray(resolvedKnockouts) ? resolvedKnockouts.length : mapped.kosCount,
    handBonuses: resolvedHandBonuses,
    eliminatedBySeat: hasNativeElimSeat ? mapped.eliminatedBySeat : prevEntry?.eliminatedBySeat,
    knockedOutByPlayerId: hasNativeKillerId
      ? mapped.knockedOutByPlayerId
      : prevEntry?.knockedOutByPlayerId,
    knockedOutByPlayerName: hasNativeKillerName
      ? mapped.knockedOutByPlayerName
      : prevEntry?.knockedOutByPlayerName,
    calculatedBasePoints: hasNativeCalcBase
      ? mapped.calculatedBasePoints
      : prevEntry?.calculatedBasePoints,
    calculatedFinalPoints: hasNativeCalcFinal
      ? mapped.calculatedFinalPoints
      : prevEntry?.calculatedFinalPoints,
    legacyPointsOffset: resolvedLegacyOffset,
    legacySeedPoints: resolvedLegacySeedPoints,
  };
}
