import type { Player, UserRole } from '@/types/holdem';

export const PLAYER_ROLE_META_ANNOUNCEMENT_TYPE = 'player_role_meta';

const VALID_ROLES: readonly UserRole[] = ['admin', 'manager', 'dealer', 'scribe', 'player'];

export interface PlayerRoleMeta {
  playerId: string;
  role: UserRole;
  email?: string;
  highHandBadges?: number;
  hasDgCarryover?: boolean;
  updatedAt: string;
}

/**
 * Deterministic Appwrite row ID (<= 36 chars) for a player's role & extended profile
 * metadata sidecar in the `announcements` table. Ensures role assignments, emails,
 * high-hand badges, and DG carryovers persist durably even when the live `players`
 * table has not yet been migrated to include those columns.
 */
export function getPlayerRoleMetaRowId(playerId: string): string {
  const sanitized = playerId.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 32);
  return `prm_${sanitized}`;
}

export function buildPlayerRoleMeta(
  playerId: string,
  data: {
    role: UserRole;
    email?: string;
    highHandBadges?: number;
    hasDgCarryover?: boolean;
  },
  updatedAt: string = new Date().toISOString()
): PlayerRoleMeta {
  const meta: PlayerRoleMeta = {
    playerId,
    role: VALID_ROLES.includes(data.role) ? data.role : 'player',
    updatedAt,
  };
  if (typeof data.email === 'string' && data.email.trim()) {
    meta.email = data.email.trim();
  }
  if (typeof data.highHandBadges === 'number' && Number.isFinite(data.highHandBadges)) {
    meta.highHandBadges = Math.max(0, Math.floor(data.highHandBadges));
  }
  if (typeof data.hasDgCarryover === 'boolean') {
    meta.hasDgCarryover = data.hasDgCarryover;
  }
  return meta;
}

export function parsePlayerRoleMetaPayload(
  raw: Record<string, unknown>
): PlayerRoleMeta | null {
  if (raw.type !== PLAYER_ROLE_META_ANNOUNCEMENT_TYPE) return null;
  if (typeof raw.content !== 'string' || !raw.content.trim()) return null;
  try {
    const parsed = JSON.parse(raw.content) as Partial<PlayerRoleMeta>;
    if (!parsed || typeof parsed.playerId !== 'string' || !parsed.playerId) return null;
    const role: UserRole =
      parsed.role && VALID_ROLES.includes(parsed.role) ? parsed.role : 'player';
    return {
      playerId: parsed.playerId,
      role,
      email: typeof parsed.email === 'string' ? parsed.email : undefined,
      highHandBadges:
        typeof parsed.highHandBadges === 'number' ? parsed.highHandBadges : undefined,
      hasDgCarryover:
        typeof parsed.hasDgCarryover === 'boolean' ? parsed.hasDgCarryover : undefined,
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
 * Merges persisted sidecar role/profile metadata onto a raw Appwrite player row
 * when the underlying table omits `role`, `email`, `highHandBadges`, or `hasDgCarryover`.
 */
export function mergeRawPlayerWithRoleMeta<T extends Partial<Player> & { $id: string }>(
  raw: T,
  meta?: PlayerRoleMeta | null
): T {
  if (!meta) return raw;
  const hasNativeRole =
    typeof raw.role === 'string' && VALID_ROLES.includes(raw.role as UserRole);
  const hasNativeEmail = typeof raw.email === 'string' && raw.email.trim().length > 0;
  const hasNativeHighHands = typeof raw.highHandBadges === 'number';
  const hasNativeDg = typeof raw.hasDgCarryover === 'boolean';

  return {
    ...raw,
    role: hasNativeRole ? raw.role : meta.role,
    email: hasNativeEmail ? raw.email : meta.email ?? raw.email,
    highHandBadges: hasNativeHighHands
      ? raw.highHandBadges
      : meta.highHandBadges ?? raw.highHandBadges,
    hasDgCarryover: hasNativeDg ? raw.hasDgCarryover : meta.hasDgCarryover ?? raw.hasDgCarryover,
  };
}
