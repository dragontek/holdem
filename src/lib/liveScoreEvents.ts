import type { Game, GameEntry, HandBonusCode, KnockoutCode } from '@/types/holdem';
import {
  getEntryHandBonuses,
  getEntryKnockouts,
  HAND_BONUS_CODE_LIST,
  HAND_BONUS_DEFINITIONS,
  KO_DEFINITIONS,
} from '@/lib/scoring';

export type ScoreEventVariant =
  | 'knockout'
  | 'rebuy_ko'
  | 'bust'
  | 'hod_offsuit'
  | 'hod_suited'
  | 'quads'
  | 'straight_flush'
  | 'royal_flush'
  | 'survivor'
  | 'show_up';

export interface LiveScoreNotification {
  id: string;
  fingerprint: string;
  gameId: string;
  gameTitle: string;
  venueName: string;
  variant: ScoreEventVariant;
  headline: string;
  subtext: string;
  basePoints: number;
  pointsAwarded: number;
  primaryPlayerId: string;
  primaryPlayerName: string;
  secondaryPlayerId?: string;
  secondaryPlayerName?: string;
  isMajorCelebration: boolean;
  createdAt: number;
}

function getEffectivePlayerMultiplier(entry: Pick<GameEntry, 'hasDgCarryover'>, game: Game): number {
  if (game.noGamePlayed) return 1;
  const sessionMult = game.pointMultiplier ?? 1;
  const dgMult = entry.hasDgCarryover ? 2 : 1;
  return sessionMult * dgMult;
}

function buildContextSubtext(game: Game, extraDetail?: string): string {
  const parts: string[] = [];
  if (game.venueName) parts.push(game.venueName);
  if ((game.pointMultiplier ?? 1) > 1) parts.push(`${game.pointMultiplier}x Session`);
  if (extraDetail) parts.push(extraDetail);
  return parts.join(' • ');
}

function mapHandBonusMeta(
  code: HandBonusCode,
  playerName: string,
  game: Game
): { variant: ScoreEventVariant; headline: string; extra?: string; major: boolean } {
  switch (code) {
    case 'O':
      return {
        variant: 'hod_offsuit',
        headline: `${playerName} just got the Hand of the Day (off-suit)!`,
        extra: game.hodRule ? `HOD: ${game.hodRule}` : undefined,
        major: false,
      };
    case 'S':
      return {
        variant: 'hod_suited',
        headline: `${playerName} just got the Hand of the Day (suited)!`,
        extra: game.hodRule ? `HOD: ${game.hodRule}` : undefined,
        major: true,
      };
    case '4':
      return {
        variant: 'quads',
        headline: `${playerName} just got a Four of a Kind!`,
        major: true,
      };
    case 'F':
      return {
        variant: 'straight_flush',
        headline: `${playerName} just hit a Straight Flush!`,
        major: true,
      };
    case '#':
      return {
        variant: 'royal_flush',
        headline: `${playerName} just hit a ROYAL FLUSH!`,
        major: true,
      };
    case 'SURV':
    default:
      return {
        variant: 'survivor',
        headline: `${playerName} went all-in and survived!`,
        major: false,
      };
  }
}

export function createEliminationNotification(params: {
  game: Game;
  victim: GameEntry;
  killer?: GameEntry;
  koType: KnockoutCode | null;
  finishPosition: number;
  isMuck: boolean;
}): LiveScoreNotification {
  const { game, victim, killer, koType, finishPosition, isMuck } = params;
  const now = Date.now();

  if (killer && koType) {
    const basePts = KO_DEFINITIONS[koType].points;
    const mult = getEffectivePlayerMultiplier(killer, game);
    const finalPts = basePts * mult;
    const isRebuyKo = koType === 'R';
    const headline = isRebuyKo
      ? `${killer.playerName} just knocked ${victim.playerName} out for a Rebuy KO!`
      : `${killer.playerName} just knocked ${victim.playerName} out!`;
    const extra = isMuck
      ? `${victim.playerName} mucked (#${finishPosition})`
      : `${victim.playerName} finished #${finishPosition}`;

    return {
      id: `ev_${now}_${Math.random().toString(36).slice(2, 7)}`,
      fingerprint: `elim:${game.$id}:${victim.$id}:${killer.playerId}`,
      gameId: game.$id,
      gameTitle: game.title,
      venueName: game.venueName,
      variant: isRebuyKo ? 'rebuy_ko' : 'knockout',
      headline,
      subtext: buildContextSubtext(game, extra),
      basePoints: basePts,
      pointsAwarded: finalPts,
      primaryPlayerId: killer.playerId,
      primaryPlayerName: killer.playerName,
      secondaryPlayerId: victim.playerId,
      secondaryPlayerName: victim.playerName,
      isMajorCelebration: true,
      createdAt: now,
    };
  }

  const headline = isMuck
    ? `${victim.playerName} mucked out of the session.`
    : `${victim.playerName} was eliminated in #${finishPosition} place!`;

  return {
    id: `ev_${now}_${Math.random().toString(36).slice(2, 7)}`,
    fingerprint: `elim:${game.$id}:${victim.$id}:none`,
    gameId: game.$id,
    gameTitle: game.title,
    venueName: game.venueName,
    variant: 'bust',
    headline,
    subtext: buildContextSubtext(game, `Seat ${victim.seatNumber} (Table ${victim.tableNumber})`),
    basePoints: 0,
    pointsAwarded: 0,
    primaryPlayerId: victim.playerId,
    primaryPlayerName: victim.playerName,
    isMajorCelebration: false,
    createdAt: now,
  };
}

/**
 * Compares previous and updated GameEntry snapshots (from local actions or Appwrite Realtime)
 * to emit human-readable live notifications for players and Venue TV displays.
 */
export function diffEntryForScoreEvents(
  prev: GameEntry | undefined,
  next: GameEntry,
  game: Game,
  allEntries: GameEntry[] = []
): LiveScoreNotification[] {
  if (!prev) return [];
  const events: LiveScoreNotification[] = [];
  const now = Date.now();
  const mult = getEffectivePlayerMultiplier(next, game);

  // 1. Newly Eliminated Player
  if (!prev.isEliminated && next.isEliminated) {
    const killerEntry = next.knockedOutByPlayerId
      ? allEntries.find((e) => e.playerId === next.knockedOutByPlayerId)
      : undefined;
    const resolvedKiller: GameEntry | undefined =
      killerEntry ||
      (next.knockedOutByPlayerId && next.knockedOutByPlayerName
        ? ({
            $id: next.knockedOutByPlayerId,
            gameId: game.$id,
            playerId: next.knockedOutByPlayerId,
            playerName: next.knockedOutByPlayerName,
            playerSuitIcon: 'spades',
            tableNumber: 1,
            seatNumber: next.eliminatedBySeat || 1,
            buyinsCount: 1,
            rebuysCount: 0,
            addonsCount: 0,
            kosCount: 1,
            isEliminated: false,
            hasDgCarryover: false,
          } as GameEntry)
        : undefined);

    events.push(
      createEliminationNotification({
        game,
        victim: next,
        killer: resolvedKiller,
        koType: resolvedKiller ? 'K' : null,
        finishPosition: next.finishPosition || Math.max(1, allEntries.filter((e) => !e.isEliminated).length + 1),
        isMuck: next.status === 'MUCK',
      })
    );
  }

  // 2. Newly Awarded Hand Bonuses (SURV, O, S, 4, F, #)
  const prevHD = getEntryHandBonuses(prev);
  const nextHD = getEntryHandBonuses(next);
  for (const code of HAND_BONUS_CODE_LIST) {
    const prevCount = prevHD.filter((c) => c === code).length;
    const nextCount = nextHD.filter((c) => c === code).length;
    if (nextCount > prevCount) {
      const added = nextCount - prevCount;
      const basePts = HAND_BONUS_DEFINITIONS[code].points * added;
      const finalPts = next.status === 'MUCK' ? 0 : basePts * mult;
      const meta = mapHandBonusMeta(code, next.playerName, game);
      events.push({
        id: `ev_${now}_${code}_${Math.random().toString(36).slice(2, 7)}`,
        fingerprint: `hd:${game.$id}:${next.$id}:${code}:${nextCount}`,
        gameId: game.$id,
        gameTitle: game.title,
        venueName: game.venueName,
        variant: meta.variant,
        headline: meta.headline,
        subtext: buildContextSubtext(game, meta.extra),
        basePoints: basePts,
        pointsAwarded: finalPts,
        primaryPlayerId: next.playerId,
        primaryPlayerName: next.playerName,
        isMajorCelebration: meta.major,
        createdAt: now,
      });
    }
  }

  // 3. Direct Knockout Badge Added (K or R)
  const prevKOs = getEntryKnockouts(prev);
  const nextKOs = getEntryKnockouts(next);
  for (const code of ['R', 'K'] as const) {
    const prevCount = prevKOs.filter((c) => c === code).length;
    const nextCount = nextKOs.filter((c) => c === code).length;
    if (nextCount > prevCount) {
      const added = nextCount - prevCount;
      const basePts = KO_DEFINITIONS[code].points * added;
      const finalPts = next.status === 'MUCK' ? 0 : basePts * mult;
      const isRebuy = code === 'R';
      events.push({
        id: `ev_${now}_ko_${code}_${Math.random().toString(36).slice(2, 7)}`,
        fingerprint: `ko:${game.$id}:${next.$id}:${code}:${nextCount}`,
        gameId: game.$id,
        gameTitle: game.title,
        venueName: game.venueName,
        variant: isRebuy ? 'rebuy_ko' : 'knockout',
        headline: isRebuy
          ? `${next.playerName} just scored a Rebuy Knockout!`
          : `${next.playerName} just scored a Knockout!`,
        subtext: buildContextSubtext(game, `Seat ${next.seatNumber} (Table ${next.tableNumber})`),
        basePoints: basePts,
        pointsAwarded: finalPts,
        primaryPlayerId: next.playerId,
        primaryPlayerName: next.playerName,
        isMajorCelebration: true,
        createdAt: now,
      });
    }
  }

  return events;
}

/**
 * Plays a short, crisp synthesized Web Audio chime so TV screens and players with sound enabled
 * receive an audible cue when points or knockouts are recorded.
 */
export function playScoreChime(variant: ScoreEventVariant): void {
  if (typeof window === 'undefined') return;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;

  try {
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const notes =
      variant === 'royal_flush' || variant === 'straight_flush' || variant === 'quads'
        ? [523.25, 659.25, 783.99, 1046.5]
        : variant === 'knockout' || variant === 'rebuy_ko'
        ? [440, 554.37, 659.25]
        : [587.33, 880];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);
      gain.gain.setValueAtTime(0.001, now + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.12, now + idx * 0.09 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.09 + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.25);
    });

    setTimeout(() => {
      void ctx.close().catch(() => {});
    }, 1000);
  } catch {
    // Ignore autoplay restrictions when user has not interacted yet
  }
}
