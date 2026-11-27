import type { UserRole } from '@/types/holdem';

export type ActorRole = UserRole | 'guest';

export type PermissionAction =
  | 'platform:reseed'
  | 'platform:assign_admin'
  | 'league:create'
  | 'league:manage'
  | 'league:assign_manager'
  | 'admin:access'
  | 'season:manage'
  | 'venue:manage'
  | 'game:schedule'
  | 'game:delete'
  | 'game:finalize'
  | 'announcement:manage'
  | 'user:manage'
  | 'clock:manage'
  | 'director:operate'
  | 'game:seat_players'
  | 'game:score'
  | 'game:rsvp';

export interface ActiveActor {
  $id: string;
  role: UserRole;
}

const ROLE_PERMISSIONS: Record<ActorRole, ReadonlySet<PermissionAction>> = {
  guest: new Set<PermissionAction>([]),
  player: new Set<PermissionAction>(['game:rsvp']),
  scribe: new Set<PermissionAction>([
    'game:rsvp',
    'director:operate',
    'game:seat_players',
    'game:score',
  ]),
  dealer: new Set<PermissionAction>([
    'game:rsvp',
    'director:operate',
    'clock:manage',
    'game:seat_players',
    'game:score',
  ]),
  manager: new Set<PermissionAction>([
    'game:rsvp',
    'director:operate',
    'clock:manage',
    'game:seat_players',
    'game:score',
    'admin:access',
    'season:manage',
    'venue:manage',
    'game:schedule',
    'game:delete',
    'game:finalize',
    'announcement:manage',
    'user:manage',
  ]),
  admin: new Set<PermissionAction>([
    'platform:reseed',
    'platform:assign_admin',
    'league:create',
    'league:manage',
    'league:assign_manager',
    'admin:access',
    'season:manage',
    'venue:manage',
    'game:schedule',
    'game:delete',
    'game:finalize',
    'announcement:manage',
    'user:manage',
    'clock:manage',
    'director:operate',
    'game:seat_players',
    'game:score',
    'game:rsvp',
  ]),
};

let activeActor: ActiveActor | null = null;

export class PermissionError extends Error {
  readonly action: PermissionAction;
  readonly actorRole: ActorRole;

  constructor(action: PermissionAction, actorRole: ActorRole, message?: string) {
    super(
      message ||
        `Permission denied: role "${actorRole}" is not authorized to perform "${action}".`
    );
    this.name = 'PermissionError';
    this.action = action;
    this.actorRole = actorRole;
  }
}

export function normalizeActorRole(role?: UserRole | null): ActorRole {
  if (
    role === 'admin' ||
    role === 'manager' ||
    role === 'dealer' ||
    role === 'scribe' ||
    role === 'player'
  ) {
    return role;
  }
  return 'guest';
}

export function setActiveActor(actor: ActiveActor | null): void {
  activeActor = actor ? { $id: actor.$id, role: actor.role } : null;
}

export function getActiveActor(): ActiveActor | null {
  return activeActor;
}

export function getActiveActorRole(): ActorRole {
  return normalizeActorRole(activeActor?.role);
}

export function hasPermission(
  role: UserRole | null | undefined,
  action: PermissionAction
): boolean {
  const actorRole = normalizeActorRole(role);
  return ROLE_PERMISSIONS[actorRole].has(action);
}

/**
 * Check whether an actor is allowed to assign `targetRole` to a user.
 * - Platform Admin can assign any role (including `admin`).
 * - Manager can assign `manager`, `dealer`, `scribe`, or `player` (never `admin`).
 * - All other roles cannot assign roles.
 */
export function canAssignRole(
  actorRole: UserRole | null | undefined,
  targetRole: UserRole
): boolean {
  const normalized = normalizeActorRole(actorRole);
  if (normalized === 'admin') return true;
  if (normalized === 'manager') return targetRole !== 'admin';
  return false;
}

/**
 * Check whether an actor can edit/demote/delete a user whose current role is `targetCurrentRole`.
 * - Platform Admin can modify any user.
 * - Manager can modify non-admin accounts only (cannot demote or delete a Platform Admin).
 */
export function canModifyUser(
  actorRole: UserRole | null | undefined,
  targetCurrentRole: UserRole
): boolean {
  const normalized = normalizeActorRole(actorRole);
  if (normalized === 'admin') return true;
  if (normalized === 'manager') return targetCurrentRole !== 'admin';
  return false;
}

/**
 * Fail-closed runtime permission guard used by backend services (`AppwriteService`, `AuthService`).
 */
export function assertPermission(
  action: PermissionAction,
  actorRoleOverride?: UserRole | null,
  customMessage?: string
): void {
  const effectiveRole: ActorRole =
    actorRoleOverride !== undefined
      ? normalizeActorRole(actorRoleOverride)
      : getActiveActorRole();
  if (!ROLE_PERMISSIONS[effectiveRole].has(action)) {
    throw new PermissionError(action, effectiveRole, customMessage);
  }
}
