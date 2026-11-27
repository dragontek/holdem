import type { BlindLevel, Game, GameStatus } from '@/types/holdem';

export const GAME_CLOCK_ANNOUNCEMENT_TYPE = 'game_clock_state';

export interface GameClockSnapshot {
  gameId: string;
  status: GameStatus;
  currentLevelIndex: number;
  secondsRemainingInLevel: number;
  /**
   * Authoritative UTC ISO-8601 timestamp stamped by the backend when
   * `(currentLevelIndex, secondsRemainingInLevel)` was recorded.
   */
  clockAnchorAt: string;
  /**
   * Optional per-level duration overrides in minutes (from Director manual override).
   */
  levelDurationOverrides?: Record<number, number>;
}

export interface ComputedLiveClock {
  currentLevelIndex: number;
  secondsRemainingInLevel: number;
  isRunning: boolean;
  isFinished: boolean;
}

// --- Backend Server Clock Offset Calibration ---
// serverClockOffsetMs = backendServerTimeMs - clientDateNowMs
let serverClockOffsetMs = 0;
let bestSampleRttMs = Number.POSITIVE_INFINITY;
let hasCalibratedClock = false;
const clockOffsetListeners = new Set<() => void>();

export function parseTimestampMs(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    // Support seconds vs milliseconds Unix timestamps
    return raw < 1e12 ? Math.round(raw * 1000) : Math.round(raw);
  }
  if (typeof raw === 'string' && raw.trim()) {
    const trimmed = raw.trim();
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      const numeric = Number(trimmed);
      if (Number.isFinite(numeric)) {
        return numeric < 1e12 ? Math.round(numeric * 1000) : Math.round(numeric);
      }
    }
    const parsed = Date.parse(trimmed);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/**
 * Calibrate local device clock against an authoritative backend server timestamp.
 * Uses lowest-RTT preference and smooth exponential averaging so minor network jitter
 * never causes visible 1-second jumps while eliminating multi-second OS clock skew.
 */
export function calibrateServerClock(
  serverTime: string | number | null | undefined,
  rttMs: number = 150
): boolean {
  const serverMs = parseTimestampMs(serverTime);
  if (serverMs === null) return false;

  const clampedRtt = Math.max(0, Math.min(rttMs, 10_000));
  const estimatedClientNow = Date.now() - clampedRtt / 2;
  const sampleOffset = serverMs - estimatedClientNow;

  // Reject clearly corrupted timestamps (e.g. > 24h skew indicates bad payload, not clock drift)
  if (Math.abs(sampleOffset) > 24 * 60 * 60 * 1000) return false;

  const prevOffset = serverClockOffsetMs;
  if (!hasCalibratedClock || clampedRtt <= bestSampleRttMs + 50) {
    if (!hasCalibratedClock) {
      serverClockOffsetMs = sampleOffset;
    } else {
      // Smooth blend when close, snap immediately if OS clock skew changed significantly
      const diff = Math.abs(sampleOffset - serverClockOffsetMs);
      serverClockOffsetMs =
        diff > 1500 ? sampleOffset : Math.round(serverClockOffsetMs * 0.4 + sampleOffset * 0.6);
    }
    bestSampleRttMs = Math.min(bestSampleRttMs, clampedRtt);
    hasCalibratedClock = true;
  } else {
    // Higher RTT sample: gently nudge only if we've drifted > 1s
    const diff = Math.abs(sampleOffset - serverClockOffsetMs);
    if (diff > 1000) {
      serverClockOffsetMs = Math.round(serverClockOffsetMs * 0.7 + sampleOffset * 0.3);
    }
  }

  if (Math.abs(serverClockOffsetMs - prevOffset) >= 150) {
    for (const listener of clockOffsetListeners) {
      listener();
    }
  }
  return true;
}

/**
 * Calibrate using an HTTP round-trip response whose payload contains a freshly stamped
 * server `$updatedAt` / `$createdAt`.
 */
export function calibrateServerClockFromResponse(
  serverTime: string | number | null | undefined,
  requestStartedAtMs: number,
  requestEndedAtMs: number = Date.now()
): boolean {
  const serverMs = parseTimestampMs(serverTime);
  if (serverMs === null) return false;
  const rtt = Math.max(0, requestEndedAtMs - requestStartedAtMs);
  const midpoint = requestStartedAtMs + rtt / 2;
  const sampleOffset = serverMs - midpoint;
  if (Math.abs(sampleOffset) > 24 * 60 * 60 * 1000) return false;

  const prevOffset = serverClockOffsetMs;
  if (!hasCalibratedClock || rtt <= bestSampleRttMs + 100) {
    serverClockOffsetMs = hasCalibratedClock
      ? Math.round(serverClockOffsetMs * 0.35 + sampleOffset * 0.65)
      : sampleOffset;
    bestSampleRttMs = Math.min(bestSampleRttMs, rtt);
    hasCalibratedClock = true;
  }
  if (Math.abs(serverClockOffsetMs - prevOffset) >= 150) {
    for (const listener of clockOffsetListeners) {
      listener();
    }
  }
  return true;
}

export function getServerNowMs(): number {
  return Date.now() + serverClockOffsetMs;
}

export function getServerClockOffsetMs(): number {
  return serverClockOffsetMs;
}

export function hasServerClockCalibration(): boolean {
  return hasCalibratedClock;
}

export function subscribeServerClockOffset(listener: () => void): () => void {
  clockOffsetListeners.add(listener);
  return () => {
    clockOffsetListeners.delete(listener);
  };
}

/**
 * Reset calibration state (primarily for deterministic unit tests).
 */
export function resetServerClockCalibration(): void {
  serverClockOffsetMs = 0;
  bestSampleRttMs = Number.POSITIVE_INFINITY;
  hasCalibratedClock = false;
}

/**
 * Best-effort HTTP Date header calibration against the Appwrite endpoint on app startup.
 * Gracefully no-ops if offline or if CORS does not expose the Date header.
 */
export async function syncServerClockWithAppwrite(
  endpoint: string,
  projectId: string
): Promise<boolean> {
  if (!endpoint || typeof fetch === 'undefined') return false;
  const startedAt = Date.now();
  try {
    const res = await fetch(`${endpoint.replace(/\/+$/, '')}/locale`, {
      method: 'GET',
      headers: projectId ? { 'X-Appwrite-Project': projectId } : undefined,
    });
    const endedAt = Date.now();
    const dateHeader = res.headers.get('date');
    if (dateHeader) {
      return calibrateServerClockFromResponse(dateHeader, startedAt, endedAt);
    }
  } catch {
    // Offline or blocked — realtime & write responses will still calibrate automatically
  }
  return false;
}

// --- Deterministic Clock Row ID & Payload Parsing ---

/**
 * Deterministic Appwrite row ID for a game's dedicated backend clock anchor record.
 * Appwrite IDs allow up to 36 chars (`a-zA-Z0-9._-`, starting with alphanumeric).
 */
export function getClockRowId(gameId: string): string {
  const safe = gameId.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 32);
  return `clk_${safe || 'game'}`;
}

export function normalizeLevelDurationOverrides(
  raw: unknown
): Record<number, number> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const result: Record<number, number> = {};
  let hasAny = false;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const idx = Number(k);
    const mins = Number(v);
    if (Number.isInteger(idx) && idx >= 0 && Number.isFinite(mins) && mins > 0) {
      result[idx] = mins;
      hasAny = true;
    }
  }
  return hasAny ? result : undefined;
}

export function applyLevelDurationOverrides(
  schedule: BlindLevel[],
  overrides?: Record<number, number>
): BlindLevel[] {
  if (!overrides || Object.keys(overrides).length === 0) return schedule;
  let changed = false;
  const next = schedule.map((lvl, idx) => {
    const overrideMins = overrides[idx];
    if (
      typeof overrideMins === 'number' &&
      Number.isFinite(overrideMins) &&
      overrideMins > 0 &&
      overrideMins !== lvl.durationMinutes
    ) {
      changed = true;
      return { ...lvl, durationMinutes: overrideMins };
    }
    return lvl;
  });
  return changed ? next : schedule;
}

/**
 * Parse a backend `announcements` clock row (`type === 'game_clock_state'`) into
 * a canonical GameClockSnapshot anchored to Appwrite's server-stamped `$updatedAt`.
 */
export function parseClockAnnouncementPayload(
  payload: Record<string, unknown>,
  fallbackTimestamp?: string
): GameClockSnapshot | null {
  if (payload.type !== GAME_CLOCK_ANNOUNCEMENT_TYPE) return null;
  if (typeof payload.content !== 'string' || !payload.content.trim()) return null;

  try {
    const parsed = JSON.parse(payload.content) as Record<string, unknown>;
    const gameId =
      (typeof parsed.gameId === 'string' && parsed.gameId.trim()) ||
      (typeof payload.title === 'string' && payload.title.trim()) ||
      '';
    if (!gameId) return null;

    const status = parsed.status as GameStatus;
    if (
      status !== 'scheduled' &&
      status !== 'running' &&
      status !== 'paused' &&
      status !== 'completed' &&
      status !== 'canceled'
    ) {
      return null;
    }

    const currentLevelIndex = Math.max(0, Math.floor(Number(parsed.currentLevelIndex ?? 0)));
    const secondsRemainingInLevel = Math.max(
      0,
      Math.floor(Number(parsed.secondsRemainingInLevel ?? 0))
    );

    // Prefer Appwrite's server-stamped `$updatedAt` over any client-written timestamp!
    const serverAnchor =
      (typeof payload.$updatedAt === 'string' && payload.$updatedAt) ||
      (typeof payload.$createdAt === 'string' && payload.$createdAt) ||
      (typeof parsed.clockAnchorAt === 'string' && parsed.clockAnchorAt) ||
      fallbackTimestamp ||
      new Date(getServerNowMs()).toISOString();

    const levelDurationOverrides = normalizeLevelDurationOverrides(parsed.levelDurationOverrides);

    return {
      gameId,
      status,
      currentLevelIndex,
      secondsRemainingInLevel,
      clockAnchorAt: serverAnchor,
      ...(levelDurationOverrides ? { levelDurationOverrides } : {}),
    };
  } catch {
    return null;
  }
}

/**
 * Monotonic guard preventing stale/out-of-order backend responses from reverting
 * a newer clock state.
 */
export function shouldAcceptIncomingClockAnchor(
  currentAnchorAt: string | undefined,
  incomingAnchorAt: string | undefined
): boolean {
  const incomingMs = parseTimestampMs(incomingAnchorAt);
  if (incomingMs === null) return !currentAnchorAt;
  const currentMs = parseTimestampMs(currentAnchorAt);
  if (currentMs === null) return true;
  // Allow equal timestamps (e.g. Realtime echo of our own write) and any strictly newer anchor
  return incomingMs >= currentMs - 50;
}

/**
 * Pure deterministic calculation of the live tournament clock from a backend anchor.
 *
 * Every connected device computes the exact same `(currentLevelIndex, secondsRemainingInLevel)`
 * from the single backend `(status, currentLevelIndex, secondsRemainingInLevel, clockAnchorAt)`
 * plus calibrated `serverNowMs` — completely eliminating multi-client drift, periodic writeback
 * races, and background-tab throttling.
 */
export function computeLiveClockState(
  game: Pick<
    Game,
    | 'status'
    | 'currentLevelIndex'
    | 'secondsRemainingInLevel'
    | 'clockAnchorAt'
    | 'blindSchedule'
    | 'levelDurationOverrides'
  >,
  serverNowMs: number = getServerNowMs()
): ComputedLiveClock {
  const schedule = applyLevelDurationOverrides(game.blindSchedule || [], game.levelDurationOverrides);
  const maxLevelIdx = Math.max(0, schedule.length - 1);
  const baseLevelIdx = Math.max(0, Math.min(Math.floor(game.currentLevelIndex || 0), maxLevelIdx));
  const baseSeconds = Math.max(0, Math.floor(game.secondsRemainingInLevel ?? 0));

  if (game.status !== 'running') {
    return {
      currentLevelIndex: baseLevelIdx,
      secondsRemainingInLevel: baseSeconds,
      isRunning: false,
      isFinished: false,
    };
  }

  const anchorMs = parseTimestampMs(game.clockAnchorAt);
  if (anchorMs === null) {
    return {
      currentLevelIndex: baseLevelIdx,
      secondsRemainingInLevel: baseSeconds,
      isRunning: baseSeconds > 0 || baseLevelIdx < maxLevelIdx,
      isFinished: baseSeconds === 0 && baseLevelIdx >= maxLevelIdx,
    };
  }

  let leftToConsume = Math.floor(Math.max(0, serverNowMs - anchorMs) / 1000);
  let levelIdx = baseLevelIdx;
  let remaining = baseSeconds;

  while (leftToConsume > 0) {
    if (leftToConsume < remaining) {
      remaining -= leftToConsume;
      leftToConsume = 0;
      break;
    }
    leftToConsume -= remaining;
    if (levelIdx < maxLevelIdx) {
      levelIdx += 1;
      const nextDuration = schedule[levelIdx]?.durationMinutes ?? 15;
      remaining = Math.max(1, Math.round(nextDuration * 60));
    } else {
      remaining = 0;
      leftToConsume = 0;
      break;
    }
  }

  const isFinished = remaining === 0 && levelIdx >= maxLevelIdx;
  return {
    currentLevelIndex: levelIdx,
    secondsRemainingInLevel: remaining,
    isRunning: !isFinished,
    isFinished,
  };
}

export function formatClockTime(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
