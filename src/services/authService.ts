import { account, isAppwriteConfigured, isPlatformAdminIdentity, ID, OAuthProvider } from '../lib/appwrite';
import {
  assertPermission,
  canAssignRole as canAssignRolePolicy,
  canModifyUser as canModifyUserPolicy,
  hasPermission,
  setActiveActor,
} from '../lib/permissions';
import type { SuitIcon, UserProfile, UserRole } from '../types/holdem';
import { AppwriteService } from './appwriteService';
import { mockUsers } from './mockData';

const LOCAL_STORAGE_USER_KEY = 'holdem_auth_user';
const LOCAL_STORAGE_ALL_USERS_KEY = 'holdem_all_users';
const LOCAL_STORAGE_APPWRITE_SESSION_KEY = 'holdem_appwrite_session_active';
const LOCAL_STORAGE_SIGNED_OUT_KEY = 'holdem_explicit_logout';
const LOCAL_STORAGE_OFFLINE_PASSWORDS_KEY = 'holdem_offline_passwords';
const SYNTHETIC_EMAIL_DOMAIN = 'players.holdempro.app';

export const INITIAL_LEAGUE_USERS: UserProfile[] = mockUsers;

export const DEMO_USERS: Record<UserRole, UserProfile> = {
  admin: INITIAL_LEAGUE_USERS.find((u) => u.role === 'admin') || {
    $id: 'user_admin',
    name: 'Platform Admin',
    email: 'admin@holdempro.com',
    role: 'admin',
    suitIcon: 'spades',
    isMember: true,
    totalPoints: 1000000,
    careerWins: 10,
    careerKOs: 150,
    gamesPlayed: 50,
    leagueId: 'league_1',
  },
  manager: INITIAL_LEAGUE_USERS.find((u) => u.role === 'manager') || INITIAL_LEAGUE_USERS[10],
  dealer: INITIAL_LEAGUE_USERS.find((u) => u.role === 'dealer') || INITIAL_LEAGUE_USERS[11],
  scribe: INITIAL_LEAGUE_USERS.find((u) => u.role === 'scribe') || INITIAL_LEAGUE_USERS[12],
  player: INITIAL_LEAGUE_USERS.find((u) => u.role === 'player') || INITIAL_LEAGUE_USERS[1],
};

export interface RegisterPlayerInput {
  username: string;
  password: string;
  email?: string;
}

export interface AuthResult {
  user: UserProfile | null;
  error?: string;
}

function normalizeUsername(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '');
}

function synthesizePlayerEmail(username: string): string {
  const slug = normalizeUsername(username);
  return `${slug}@${SYNTHETIC_EMAIL_DOMAIN}`;
}

export function isSyntheticPlayerEmail(email?: string): boolean {
  return Boolean(email && email.toLowerCase().endsWith(`@${SYNTHETIC_EMAIL_DOMAIN}`));
}

function hasActiveAppwriteSession(): boolean {
  try {
    if (localStorage.getItem(LOCAL_STORAGE_APPWRITE_SESSION_KEY) === 'true') {
      return true;
    }
    const fallback = localStorage.getItem('cookieFallback');
    return Boolean(fallback && fallback !== '{}' && fallback !== '[]');
  } catch {
    return false;
  }
}

function setAppwriteSessionActive(active: boolean): void {
  try {
    if (active) {
      localStorage.setItem(LOCAL_STORAGE_APPWRITE_SESSION_KEY, 'true');
      localStorage.removeItem(LOCAL_STORAGE_SIGNED_OUT_KEY);
    } else {
      localStorage.removeItem(LOCAL_STORAGE_APPWRITE_SESSION_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

function clearLocalSessionArtifacts(): void {
  setAppwriteSessionActive(false);
  try {
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    localStorage.removeItem('cookieFallback');
  } catch {
    // Ignore storage errors
  }
}

function getAuthErrorCode(err: unknown): number | null {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = Number((err as { code?: unknown }).code);
    return Number.isFinite(code) ? code : null;
  }
  return null;
}

function isSessionActiveConflict(err: unknown): boolean {
  const type =
    typeof err === 'object' && err !== null && 'type' in err
      ? String((err as { type?: unknown }).type ?? '')
      : '';
  const msg =
    typeof err === 'object' && err !== null && 'message' in err
      ? String((err as { message?: unknown }).message ?? '')
      : '';
  return (
    type === 'user_session_already_exists' ||
    /session is active/i.test(msg) ||
    /prohibited when a session/i.test(msg)
  );
}

/**
 * Unconditionally clears any active Appwrite session on the server (including HTTP-only
 * session cookies that aren't reflected in localStorage) and removes stale local flags.
 */
async function clearCurrentAppwriteSession(deleteAllFallback = false): Promise<void> {
  if (!isAppwriteConfigured) return;
  try {
    await account.deleteSession('current');
  } catch (err: unknown) {
    const code = getAuthErrorCode(err);
    // 401 means no session was active on the server; anything else can try deleteSessions when requested
    if (deleteAllFallback && code !== 401) {
      try {
        await account.deleteSessions();
      } catch {
        // Ignore cleanup errors
      }
    }
  }
  clearLocalSessionArtifacts();
}

/**
 * Creates a fresh Appwrite email/password session, automatically cleaning up any lingering
 * active session cookie if Appwrite responds with `user_session_already_exists`.
 */
async function createEmailSessionCleanly(email: string, password: string): Promise<void> {
  if (hasActiveAppwriteSession()) {
    await clearCurrentAppwriteSession();
  }

  try {
    await account.createEmailPasswordSession(email, password);
    setAppwriteSessionActive(true);
    return;
  } catch (err: unknown) {
    if (!isSessionActiveConflict(err)) {
      throw err;
    }
    // An HTTP-only Appwrite session cookie was still active on the server; terminate it and retry once.
    await clearCurrentAppwriteSession(true);
    await account.createEmailPasswordSession(email, password);
    setAppwriteSessionActive(true);
  }
}

function isExplicitlySignedOut(): boolean {
  try {
    return localStorage.getItem(LOCAL_STORAGE_SIGNED_OUT_KEY) === 'true';
  } catch {
    return false;
  }
}

function mapAppwriteAuthError(err: unknown, fallbackMessage: string): string {
  const type =
    typeof err === 'object' && err !== null && 'type' in err
      ? String((err as { type?: unknown }).type ?? '')
      : '';
  const msg =
    typeof err === 'object' && err !== null && 'message' in err
      ? String((err as { message?: unknown }).message ?? '')
      : '';

  if (type === 'user_already_exists' || /already exists/i.test(msg)) {
    return 'An account with that username or email already exists. Try signing in instead.';
  }
  if (type === 'user_invalid_credentials' || /invalid credentials/i.test(msg)) {
    return 'Invalid username/email or password. Please check your credentials and try again.';
  }
  if (isSessionActiveConflict(err)) {
    return 'An existing session was still active. Please try signing in again.';
  }
  if (type === 'general_rate_limit_exceeded') {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (type === 'password_recently_used' || /password/i.test(msg)) {
    return msg || 'Password must be at least 8 characters long.';
  }
  return msg || fallbackMessage;
}

function readOfflinePasswords(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_OFFLINE_PASSWORDS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function saveOfflinePassword(email: string, password: string): void {
  try {
    const map = readOfflinePasswords();
    map[email.toLowerCase()] = password;
    localStorage.setItem(LOCAL_STORAGE_OFFLINE_PASSWORDS_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage errors
  }
}

function toSuitIcon(value: unknown): SuitIcon {
  if (value === 'spades' || value === 'hearts' || value === 'diamonds' || value === 'clubs') {
    return value;
  }
  return 'spades';
}

export class AuthService {
  /**
   * Checks whether current browser session is backed by a live Appwrite Auth session.
   */
  static isLiveAppwriteSession(): boolean {
    return isAppwriteConfigured && hasActiveAppwriteSession();
  }

  /**
   * Resolves either a username handle or an email address into the Appwrite login email.
   */
  private static async resolveIdentifierToEmail(identifier: string): Promise<string> {
    const trimmed = identifier.trim();
    if (trimmed.includes('@')) {
      return trimmed.toLowerCase();
    }

    const normalized = normalizeUsername(trimmed);
    const lowerRaw = trimmed.toLowerCase();

    // 1. Check local user directory
    const allUsers = await this.getAllUsers();
    const matchedUser = allUsers.find(
      (u) =>
        u.name.toLowerCase() === lowerRaw ||
        (u.nickname && u.nickname.toLowerCase() === lowerRaw) ||
        normalizeUsername(u.nickname || u.name) === normalized
    );
    if (matchedUser?.email) {
      return matchedUser.email.toLowerCase();
    }

    // 2. Check league players table (Appwrite or local overrides)
    try {
      const players = await AppwriteService.getPlayers();
      const matchedPlayer = players.find(
        (p) =>
          p.name.toLowerCase() === lowerRaw ||
          (p.nickname && p.nickname.toLowerCase() === lowerRaw) ||
          normalizeUsername(p.nickname || p.name) === normalized
      );
      if (matchedPlayer?.email) {
        return matchedPlayer.email.toLowerCase();
      }
    } catch {
      // Fall through to synthesized player email
    }

    // 3. Default to synthesized player email for username-only accounts
    return synthesizePlayerEmail(trimmed);
  }

  /**
   * Syncs a profile into the league players roster (and local user directory when offline).
   */
  private static async syncProfileDirectory(profile: UserProfile): Promise<void> {
    if (!isAppwriteConfigured) {
      try {
        const allUsers = await this.getAllUsers();
        const filtered = allUsers.filter(
          (u) => u.$id !== profile.$id && u.email.toLowerCase() !== profile.email.toLowerCase()
        );
        localStorage.setItem(LOCAL_STORAGE_ALL_USERS_KEY, JSON.stringify([profile, ...filtered]));
      } catch {
        // Ignore storage errors
      }
    }

    try {
      await AppwriteService.upsertPlayerProfile(profile);
    } catch {
      // Ignore offline sync errors
    }
  }

  private static async enrichFromLeaguePlayer(base: UserProfile): Promise<UserProfile> {
    try {
      const players = await AppwriteService.getPlayers();
      const matched = players.find(
        (p) =>
          p.$id === base.$id ||
          (base.email && p.email && p.email.toLowerCase() === base.email.toLowerCase())
      );
      if (!matched) {
        return isPlatformAdminIdentity(base) ? { ...base, role: 'admin' } : base;
      }
      const enforcedAdmin = isPlatformAdminIdentity(base) || isPlatformAdminIdentity(matched);
      return {
        ...base,
        role: enforcedAdmin ? 'admin' : matched.role || base.role,
        nickname: matched.nickname || base.nickname,
        suitIcon: matched.suitIcon || base.suitIcon,
        isMember: matched.isMember ?? base.isMember,
        totalPoints: matched.totalPoints ?? base.totalPoints,
        careerWins: matched.careerWins ?? base.careerWins,
        careerKOs: matched.careerKOs ?? base.careerKOs,
        gamesPlayed: matched.gamesPlayed ?? base.gamesPlayed,
        leagueId: matched.leagueId || base.leagueId,
      };
    } catch {
      return base;
    }
  }

  /**
   * Get Current Authenticated User & Role.
   * Detects OAuth redirect callbacks (`?auth_callback=oauth`) when returning from Google/Apple.
   */
  static async getCurrentUser(): Promise<UserProfile | null> {
    const params = new URLSearchParams(window.location.search);
    const isOAuthReturn = params.get('auth_callback') === 'oauth';
    if (isOAuthReturn) {
      setAppwriteSessionActive(true);
      params.delete('auth_callback');
      const cleanQuery = params.toString();
      const cleanUrl = `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ''}${window.location.hash}`;
      window.history.replaceState(window.history.state, '', cleanUrl);
    }

    if (isAppwriteConfigured) {
      // Always re-link against Appwrite's server session (HTTP-only cookie or cookieFallback)
      // so refreshes and cross-tab logins restore the active session reliably.
      try {
        const user = await account.get();
        const prefRole = user.prefs?.role as UserRole | undefined;
        const nickname =
          typeof user.prefs?.username === 'string' && user.prefs.username
            ? user.prefs.username
            : user.name || user.email.split('@')[0];

        const rawProfile: UserProfile = {
          $id: user.$id,
          name: user.name || nickname,
          nickname,
          email: user.email,
          role: isPlatformAdminIdentity({ name: user.name, nickname, email: user.email })
            ? 'admin'
            : prefRole || this.detectRoleFromEmail(user.email),
          suitIcon: toSuitIcon(user.prefs?.suitIcon),
          isMember: true,
          totalPoints: Number(user.prefs?.totalPoints || 0),
          careerWins: Number(user.prefs?.careerWins || 0),
          careerKOs: Number(user.prefs?.careerKOs || 0),
          gamesPlayed: Number(user.prefs?.gamesPlayed || 0),
        };
        const profile = await this.enrichFromLeaguePlayer(rawProfile);
        setActiveActor(profile);
        setAppwriteSessionActive(true);
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
        if (profile.role === 'admin' && prefRole !== 'admin') {
          try {
            await account.updatePrefs({ ...user.prefs, role: 'admin' });
          } catch {}
          await this.syncProfileDirectory(profile);
        } else if (isOAuthReturn) {
          await this.syncProfileDirectory(profile);
        }
        return profile;
      } catch (err: unknown) {
        const code = getAuthErrorCode(err);
        if (code === 401 || code === 403) {
          // Confirmed no active session on Appwrite server — clean up local artifacts
          setActiveActor(null);
          clearLocalSessionArtifacts();
          return null;
        }
        // Transient network error on refresh: preserve cached profile if a live session was active
        if (hasActiveAppwriteSession()) {
          try {
            const cached = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
            if (cached) {
              const parsed = JSON.parse(cached) as UserProfile;
              setActiveActor(parsed);
              return parsed;
            }
          } catch {
            // Ignore corrupt cache
          }
        }
        setActiveActor(null);
        return null;
      }
    }

    // Respect explicit sign-out so guests remain signed out across reloads
    if (isExplicitlySignedOut()) {
      setActiveActor(null);
      return null;
    }

    // Offline demo fallback: Check local storage
    const cached = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as UserProfile;
        setActiveActor(parsed);
        return parsed;
      } catch {
        // Ignore corrupt cache
      }
    }

    // Default to manager for initial offline demo experience only
    setActiveActor(DEMO_USERS.manager);
    return DEMO_USERS.manager;
  }

  /**
   * Register a new Player with Username + Password (Email optional).
   * Public self-registration always assigns the `player` role.
   */
  static async register(input: RegisterPlayerInput): Promise<AuthResult> {
    const rawUsername = input.username.trim();
    const slug = normalizeUsername(rawUsername);
    if (slug.length < 3) {
      return {
        user: null,
        error: 'Username must be at least 3 letters or numbers.',
      };
    }
    if (input.password.length < 8) {
      return {
        user: null,
        error: 'Password must be at least 8 characters.',
      };
    }

    const providedEmail = input.email?.trim().toLowerCase();
    const resolvedEmail = providedEmail || synthesizePlayerEmail(rawUsername);
    const role: UserRole = isPlatformAdminIdentity({
      name: rawUsername,
      nickname: rawUsername,
      email: resolvedEmail,
    })
      ? 'admin'
      : 'player';

    if (isAppwriteConfigured) {
      try {
        if (hasActiveAppwriteSession()) {
          await clearCurrentAppwriteSession();
        }

        const newUserId = ID.unique();
        await account.create(newUserId, resolvedEmail, input.password, rawUsername);
        await createEmailSessionCleanly(resolvedEmail, input.password);

        try {
          await account.updatePrefs({
            role,
            username: rawUsername,
            suitIcon: 'spades',
          });
        } catch {
          // Non-fatal if prefs update fails
        }

        const profile: UserProfile = {
          $id: newUserId,
          name: rawUsername,
          nickname: rawUsername,
          email: resolvedEmail,
          role,
          suitIcon: 'spades',
          isMember: true,
          totalPoints: 0,
          careerWins: 0,
          careerKOs: 0,
          gamesPlayed: 0,
          leagueId: 'league_1',
        };
        setActiveActor(profile);
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
        await this.syncProfileDirectory(profile);

        return { user: profile };
      } catch (err: unknown) {
        return {
          user: null,
          error: mapAppwriteAuthError(err, 'Could not create your account. Please try again.'),
        };
      }
    }

    // Offline / Demo fallback
    const allUsers = await this.getAllUsers();
    const duplicate = allUsers.find(
      (u) =>
        u.email.toLowerCase() === resolvedEmail ||
        normalizeUsername(u.nickname || u.name) === slug
    );
    if (duplicate) {
      return {
        user: null,
        error: 'That username or email is already registered. Try signing in instead.',
      };
    }

    const profile: UserProfile = {
      $id: `user_${Date.now()}`,
      name: rawUsername,
      nickname: rawUsername,
      email: resolvedEmail,
      role,
      suitIcon: 'spades',
      isMember: true,
      totalPoints: 0,
      careerWins: 0,
      careerKOs: 0,
      gamesPlayed: 0,
      leagueId: 'league_1',
    };
    saveOfflinePassword(resolvedEmail, input.password);
    setActiveActor(profile);
    localStorage.removeItem(LOCAL_STORAGE_SIGNED_OUT_KEY);
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
    await this.syncProfileDirectory(profile);

    return { user: profile };
  }

  /**
   * Sign in with Username OR Email + Password.
   */
  static async login(identifier: string, password: string): Promise<AuthResult> {
    if (!identifier.trim()) {
      return { user: null, error: 'Please enter your username or email.' };
    }
    if (!password) {
      return { user: null, error: 'Please enter your password.' };
    }

    const resolvedEmail = await this.resolveIdentifierToEmail(identifier);

    if (isAppwriteConfigured) {
      try {
        await createEmailSessionCleanly(resolvedEmail, password);
        const user = await account.get();
        const nickname =
          typeof user.prefs?.username === 'string' && user.prefs.username
            ? user.prefs.username
            : user.name || identifier.trim();
        const isOwnerAdmin = isPlatformAdminIdentity({
          name: user.name,
          nickname,
          email: user.email,
        });
        const role: UserRole = isOwnerAdmin
          ? 'admin'
          : (user.prefs?.role as UserRole) || this.detectRoleFromEmail(user.email);
        if (isOwnerAdmin && user.prefs?.role !== 'admin') {
          try {
            await account.updatePrefs({ ...user.prefs, role: 'admin' });
          } catch {}
        }

        const rawProfile: UserProfile = {
          $id: user.$id,
          name: user.name || nickname,
          nickname,
          email: user.email,
          role,
          suitIcon: toSuitIcon(user.prefs?.suitIcon),
          isMember: true,
          totalPoints: Number(user.prefs?.totalPoints || 0),
          careerWins: Number(user.prefs?.careerWins || 0),
          careerKOs: Number(user.prefs?.careerKOs || 0),
          gamesPlayed: Number(user.prefs?.gamesPlayed || 0),
        };
        const profile = await this.enrichFromLeaguePlayer(rawProfile);
        setActiveActor(profile);
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
        await this.syncProfileDirectory(profile);
        return { user: profile };
      } catch (err: unknown) {
        if (getAuthErrorCode(err) === 401) {
          setAppwriteSessionActive(false);
        }
        return {
          user: null,
          error: mapAppwriteAuthError(err, 'Invalid username/email or password.'),
        };
      }
    }

    // Offline / Demo fallback
    const allUsers = await this.getAllUsers();
    const existing = allUsers.find(
      (u) =>
        u.email.toLowerCase() === resolvedEmail ||
        normalizeUsername(u.nickname || u.name) === normalizeUsername(identifier)
    );

    if (existing) {
      const savedPasswords = readOfflinePasswords();
      const storedPass = savedPasswords[existing.email.toLowerCase()];
      if (storedPass && storedPass !== password) {
        return { user: null, error: 'Invalid username/email or password.' };
      }
      setActiveActor(existing);
      localStorage.removeItem(LOCAL_STORAGE_SIGNED_OUT_KEY);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(existing));
      return { user: existing };
    }

    return {
      user: null,
      error: 'No account found for that username or email. Create an account to get started.',
    };
  }

  /**
   * Starts Appwrite OAuth2 flow for Google or Apple (ready once enabled in Appwrite Console).
   */
  static loginWithOAuth(provider: 'google' | 'apple'): { ok: boolean; error?: string } {
    if (!isAppwriteConfigured) {
      return {
        ok: false,
        error: 'Appwrite backend must be configured before using Google or Apple sign-in.',
      };
    }

    const oauthProvider = provider === 'google' ? OAuthProvider.Google : OAuthProvider.Apple;
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    const successUrl = `${baseUrl}?auth_callback=oauth`;
    const failureUrl = baseUrl;

    try {
      try {
        localStorage.removeItem(LOCAL_STORAGE_SIGNED_OUT_KEY);
      } catch {
        // Ignore storage errors
      }
      account.createOAuth2Session(oauthProvider, successUrl, failureUrl);
      return { ok: true };
    } catch (err: unknown) {
      return {
        ok: false,
        error: mapAppwriteAuthError(err, `Unable to start ${provider} sign-in.`),
      };
    }
  }

  /**
   * Switch to a specific Demo Role immediately for testing (offline demo mode only)
   */
  static switchDemoRole(role: UserRole): UserProfile {
    const profile = DEMO_USERS[role];
    setAppwriteSessionActive(false);
    setActiveActor(profile);
    localStorage.removeItem(LOCAL_STORAGE_SIGNED_OUT_KEY);
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
    return profile;
  }

  /**
   * Get all registered users and staff (strictly from Appwrite DB when configured)
   */
  static async getAllUsers(): Promise<UserProfile[]> {
    const normalizeUser = (user: Partial<UserProfile> & { $id: string }): UserProfile => ({
      $id: user.$id,
      name: typeof user.name === 'string' && user.name.trim() ? user.name : user.nickname || 'Unnamed User',
      nickname: typeof user.nickname === 'string' ? user.nickname : undefined,
      email: typeof user.email === 'string' ? user.email : '',
      role: user.role || 'player',
      suitIcon: toSuitIcon(user.suitIcon),
      isMember: user.isMember ?? true,
      totalPoints: Number(user.totalPoints || 0),
      careerWins: Number(user.careerWins || 0),
      careerKOs: Number(user.careerKOs || 0),
      gamesPlayed: Number(user.gamesPlayed || 0),
      highHandBadges: Number(user.highHandBadges || 0),
      hasDgCarryover: Boolean(user.hasDgCarryover),
      leagueId: user.leagueId || (isAppwriteConfigured ? undefined : 'league_1'),
    });

    if (isAppwriteConfigured) {
      const dbUsers = await AppwriteService.getPlayers();
      return dbUsers.map((u) => normalizeUser(u));
    }

    let dbUsers: UserProfile[] = [];
    try {
      dbUsers = await AppwriteService.getPlayers();
    } catch {
      dbUsers = [];
    }

    let localUsers: UserProfile[] = [];
    const raw = localStorage.getItem(LOCAL_STORAGE_ALL_USERS_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as UserProfile[];
        if (Array.isArray(parsed)) localUsers = parsed;
      } catch {
        // Ignore corrupt storage
      }
    }

    const base = dbUsers.length > 0 ? dbUsers : INITIAL_LEAGUE_USERS;
    const byId = new Map<string, UserProfile>();
    const seenEmails = new Set<string>();

    for (const rawUser of base) {
      if (!rawUser || !rawUser.$id) continue;
      const user = normalizeUser(rawUser);
      byId.set(user.$id, user);
      if (user.email) seenEmails.add(user.email.toLowerCase());
    }

    for (const rawLocal of localUsers) {
      if (!rawLocal || !rawLocal.$id) continue;
      const localUser = normalizeUser(rawLocal);
      const existing = byId.get(localUser.$id);
      if (existing) {
        byId.set(localUser.$id, { ...existing, role: localUser.role || existing.role });
      } else if (!localUser.email || !seenEmails.has(localUser.email.toLowerCase())) {
        byId.set(localUser.$id, localUser);
        if (localUser.email) seenEmails.add(localUser.email.toLowerCase());
      }
    }

    const merged = Array.from(byId.values());
    try {
      localStorage.setItem(LOCAL_STORAGE_ALL_USERS_KEY, JSON.stringify(merged));
    } catch {
      // Ignore storage errors
    }
    return merged;
  }

  /**
   * Update a specific user's role (Manager capability) and persist to DB
   */
  static async updateUserRole(
    userId: string,
    newRole: UserRole,
    currentAuthUser?: UserProfile | null
  ): Promise<UserProfile[]> {
    const actorRole = currentAuthUser?.role;
    assertPermission('user:manage', actorRole);
    if (!canAssignRolePolicy(actorRole, newRole)) {
      throw new Error('Only Platform Admins can assign the Admin role.');
    }

    const users = await this.getAllUsers();
    const existingTarget = users.find((u) => u.$id === userId);
    if (existingTarget && !canModifyUserPolicy(actorRole, existingTarget.role)) {
      throw new Error('Only Platform Admins can modify an Admin account.');
    }

    const updated = users.map((u) => (u.$id === userId ? { ...u, role: newRole } : u));
    if (!isAppwriteConfigured) {
      localStorage.setItem(LOCAL_STORAGE_ALL_USERS_KEY, JSON.stringify(updated));
    }

    const targetUser = updated.find((u) => u.$id === userId);
    if (targetUser) {
      try {
        await AppwriteService.upsertPlayerProfile(targetUser);
      } catch {
        // Offline fallback already saved locally
      }
    }

    // If updating currently logged in user
    if (currentAuthUser && currentAuthUser.$id === userId) {
      if (isAppwriteConfigured && hasActiveAppwriteSession()) {
        try {
          await account.updatePrefs({ role: newRole });
        } catch {
          // Ignore pref sync errors
        }
      }
      const updatedProfile: UserProfile = { ...currentAuthUser, role: newRole };
      setActiveActor(updatedProfile);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(updatedProfile));
    }

    return updated;
  }

  /**
   * Create or invite a new user with a specific role
   */
  static async createUser(
    name: string,
    email: string,
    role: UserRole,
    actorRole?: UserRole
  ): Promise<UserProfile> {
    assertPermission('user:manage', actorRole);
    if (actorRole !== undefined && !canAssignRolePolicy(actorRole, role)) {
      throw new Error('Only Platform Admins can create an Admin account.');
    }
    const newId = isAppwriteConfigured ? ID.unique() : `user_${Date.now()}`;
    const newUser: UserProfile = {
      $id: newId,
      name,
      nickname: name,
      email,
      role,
      suitIcon: 'spades',
      isMember: true,
      totalPoints: 0,
      careerWins: 0,
      careerKOs: 0,
      gamesPlayed: 0,
      leagueId: isAppwriteConfigured ? undefined : 'league_1',
    };
    if (!isAppwriteConfigured) {
      const users = await this.getAllUsers();
      const updated = [newUser, ...users];
      localStorage.setItem(LOCAL_STORAGE_ALL_USERS_KEY, JSON.stringify(updated));
    }
    const persisted = await AppwriteService.upsertPlayerProfile(newUser);
    return persisted;
  }

  /**
   * Delete a user from the directory
   */
  static async deleteUser(userId: string, actorRole?: UserRole): Promise<UserProfile[]> {
    assertPermission('user:manage', actorRole);
    const users = await this.getAllUsers();
    const target = users.find((u) => u.$id === userId);
    if (target && actorRole !== undefined && !canModifyUserPolicy(actorRole, target.role)) {
      throw new Error('Only Platform Admins can delete an Admin account.');
    }
    await AppwriteService.deletePlayer(userId);
    const updated = users.filter((u) => u.$id !== userId);
    if (!isAppwriteConfigured) {
      localStorage.setItem(LOCAL_STORAGE_ALL_USERS_KEY, JSON.stringify(updated));
    }
    return updated;
  }

  /**
   * Update active User Role (offline demo mode only; live Appwrite roles are server-managed)
   */
  static async updateRole(newRole: UserRole): Promise<boolean> {
    if (isAppwriteConfigured) {
      // Never allow client-side self-role elevation/overwrite against live Appwrite accounts
      return false;
    }
    const cached = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as UserProfile;
        parsed.role = newRole;
        setActiveActor(parsed);
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(parsed));
      } catch {
        // Ignore storage error
      }
    }
    return true;
  }

  /**
   * Logout — cleanly ends any active Appwrite server session (even if localStorage flags
   * were cleared or out of sync) and clears all local auth artifacts.
   */
  static async logout(): Promise<boolean> {
    setActiveActor(null);
    if (isAppwriteConfigured) {
      await clearCurrentAppwriteSession(true);
    } else {
      clearLocalSessionArtifacts();
    }
    try {
      localStorage.setItem(LOCAL_STORAGE_SIGNED_OUT_KEY, 'true');
    } catch {
      // Ignore storage error
    }
    return true;
  }

  /**
   * Auto-detect default role from email hints
   */
  private static detectRoleFromEmail(email: string): UserRole {
    const lower = email.toLowerCase();
    if (lower.includes('admin') || lower.includes('architect') || lower.includes('root')) return 'admin';
    if (lower.includes('manager') || lower.includes('director')) return 'manager';
    if (lower.includes('dealer')) return 'dealer';
    if (lower.includes('scribe')) return 'scribe';
    return 'player';
  }

  // ==========================================
  // --- ROLE-BASED ACCESS CONTROL HELPERS ---
  // ==========================================

  static canAccessPlatformAdmin(role?: UserRole | null): boolean {
    return hasPermission(role, 'platform:reseed');
  }

  static canCreateLeague(role?: UserRole | null): boolean {
    return hasPermission(role, 'league:create');
  }

  static canManageLeagues(role?: UserRole | null): boolean {
    return hasPermission(role, 'league:manage');
  }

  static canAssignLeagueManager(role?: UserRole | null): boolean {
    return hasPermission(role, 'league:assign_manager');
  }

  static canAccessAdmin(role?: UserRole | null): boolean {
    return hasPermission(role, 'admin:access');
  }

  static canAccessDirector(role?: UserRole | null): boolean {
    return hasPermission(role, 'director:operate');
  }

  static canManageClock(role?: UserRole | null): boolean {
    return hasPermission(role, 'clock:manage');
  }

  static canManageVenues(role?: UserRole | null): boolean {
    return hasPermission(role, 'venue:manage');
  }

  static canManageSeasons(role?: UserRole | null): boolean {
    return hasPermission(role, 'season:manage');
  }

  static canScheduleGames(role?: UserRole | null): boolean {
    return hasPermission(role, 'game:schedule');
  }

  static canManageAnnouncements(role?: UserRole | null): boolean {
    return hasPermission(role, 'announcement:manage');
  }

  static canFinalizeTournament(role?: UserRole | null): boolean {
    return hasPermission(role, 'game:finalize');
  }

  static canManageUsers(role?: UserRole | null): boolean {
    return hasPermission(role, 'user:manage');
  }

  static canSeatPlayers(role?: UserRole | null): boolean {
    return hasPermission(role, 'game:seat_players');
  }

  static canRecordBusts(role?: UserRole | null): boolean {
    return hasPermission(role, 'game:score');
  }

  static canAssignRole(actorRole: UserRole | null | undefined, targetRole: UserRole): boolean {
    return canAssignRolePolicy(actorRole, targetRole);
  }

  static canModifyUser(
    actorRole: UserRole | null | undefined,
    targetCurrentRole: UserRole
  ): boolean {
    return canModifyUserPolicy(actorRole, targetCurrentRole);
  }
}
