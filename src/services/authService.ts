import { account, isAppwriteConfigured, ID } from '../lib/appwrite';
import type { UserProfile, UserRole } from '../types/holdem';
import { mockUsers } from './mockData';

const LOCAL_STORAGE_USER_KEY = 'holdem_auth_user';
const LOCAL_STORAGE_ALL_USERS_KEY = 'holdem_all_users';

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


export class AuthService {
  /**
   * Get Current Authenticated User & Role
   */
  static async getCurrentUser(): Promise<UserProfile | null> {
    if (isAppwriteConfigured) {
      try {
        const user = await account.get();
        const role = (user.prefs?.role as UserRole) || this.detectRoleFromEmail(user.email);
        const profile: UserProfile = {
          $id: user.$id,
          name: user.name || user.email.split('@')[0],
          email: user.email,
          role,
          suitIcon: (user.prefs?.suitIcon as any) || 'spades',
          isMember: true,
          totalPoints: Number(user.prefs?.totalPoints || 0),
          careerWins: Number(user.prefs?.careerWins || 0),
          careerKOs: Number(user.prefs?.careerKOs || 0),
          gamesPlayed: Number(user.prefs?.gamesPlayed || 0),
          leagueId: 'league_1',
        };
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
        return profile;

      } catch {
        // Appwrite session expired or not logged in
      }
    }

    // Fallback: Check local storage
    const cached = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
    if (cached) {
      try {
        return JSON.parse(cached) as UserProfile;
      } catch {}
    }

    // Default to manager for initial demo experience
    return DEMO_USERS.manager;
  }

  /**
   * Register with Email & Password in Appwrite
   */
  static async register(name: string, email: string, pass: string, role: UserRole = 'player'): Promise<{ user: UserProfile | null; error?: string }> {
    if (isAppwriteConfigured) {
      try {
        const newUserId = ID.unique();
        await account.create(newUserId, email, pass, name);
        await account.createEmailPasswordSession(email, pass);
        await account.updatePrefs({ role });

        const profile: UserProfile = {
          $id: newUserId,
          name,
          email,
          role,
          suitIcon: 'spades',
          isMember: true,
          totalPoints: 0,
          careerWins: 0,
          careerKOs: 0,
          gamesPlayed: 0,
          leagueId: 'league_1',
        };
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));

        // Sync with all users directory
        try {
          const allUsers = await this.getAllUsers();
          if (!allUsers.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
            localStorage.setItem(LOCAL_STORAGE_ALL_USERS_KEY, JSON.stringify([profile, ...allUsers]));
          }
        } catch {}

        return { user: profile };
      } catch (e: any) {
        return { user: null, error: e.message || 'Registration failed' };
      }
    }

    // Offline / Demo fallback
    const profile: UserProfile = {
      $id: `user_${Date.now()}`,
      name,
      email,
      role,
      suitIcon: 'spades',
      isMember: true,
      totalPoints: 0,
      careerWins: 0,
      careerKOs: 0,
      gamesPlayed: 0,
      leagueId: 'league_1',
    };
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));

    try {
      const allUsers = await this.getAllUsers();
      if (!allUsers.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
        localStorage.setItem(LOCAL_STORAGE_ALL_USERS_KEY, JSON.stringify([profile, ...allUsers]));
      }
    } catch {}

    return { user: profile };
  }

  /**
   * Login with Email & Password in Appwrite
   */
  static async login(email: string, pass: string): Promise<{ user: UserProfile | null; error?: string }> {
    if (isAppwriteConfigured) {
      try {
        // Try clearing any existing session first
        try {
          await account.deleteSession('current');
        } catch {}

        await account.createEmailPasswordSession(email, pass);
        const user = await account.get();
        const role = (user.prefs?.role as UserRole) || this.detectRoleFromEmail(email);

        const profile: UserProfile = {
          $id: user.$id,
          name: user.name || email.split('@')[0],
          email: user.email,
          role,
          suitIcon: 'spades',
          isMember: true,
          totalPoints: 0,
          careerWins: 0,
          careerKOs: 0,
          gamesPlayed: 0,
          leagueId: 'league_1',
        };
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
        return { user: profile };
      } catch (e: any) {
        return { user: null, error: e.message || 'Invalid email or password' };
      }
    }

    // Offline / Demo fallback: Check if user exists in directory
    const allUsers = await this.getAllUsers();
    const existing = allUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(existing));
      return { user: existing };
    }

    const role = this.detectRoleFromEmail(email);
    const profile: UserProfile = {
      $id: `user_demo_${Date.now()}`,
      name: email.split('@')[0],
      email,
      role,
      suitIcon: 'spades',
      isMember: true,
      totalPoints: 0,
      careerWins: 0,
      careerKOs: 0,
      gamesPlayed: 0,
      leagueId: 'league_1',
    };
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
    return { user: profile };
  }

  /**
   * Switch to a specific Demo Role immediately for testing
   */
  static switchDemoRole(role: UserRole): UserProfile {
    const profile = DEMO_USERS[role];
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
    return profile;
  }

  /**
   * Get all registered users and staff
   */
  static async getAllUsers(): Promise<UserProfile[]> {
    const raw = localStorage.getItem(LOCAL_STORAGE_ALL_USERS_KEY);
    if (raw) {
      try {
        const users = JSON.parse(raw) as UserProfile[];
        if (Array.isArray(users) && users.length > 0) return users;
      } catch {}
    }
    localStorage.setItem(LOCAL_STORAGE_ALL_USERS_KEY, JSON.stringify(INITIAL_LEAGUE_USERS));
    return INITIAL_LEAGUE_USERS;
  }

  /**
   * Update a specific user's role (Manager capability)
   */
  static async updateUserRole(
    userId: string,
    newRole: UserRole,
    currentAuthUser?: UserProfile | null
  ): Promise<UserProfile[]> {
    const users = await this.getAllUsers();
    const updated = users.map((u) => (u.$id === userId ? { ...u, role: newRole } : u));
    localStorage.setItem(LOCAL_STORAGE_ALL_USERS_KEY, JSON.stringify(updated));

    // If updating currently logged in user
    if (currentAuthUser && currentAuthUser.$id === userId) {
      if (isAppwriteConfigured) {
        try {
          await account.updatePrefs({ role: newRole });
        } catch {}
      }
      const updatedProfile: UserProfile = { ...currentAuthUser, role: newRole };
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(updatedProfile));
    }

    return updated;
  }

  /**
   * Create or invite a new user with a specific role
   */
  static async createUser(name: string, email: string, role: UserRole): Promise<UserProfile> {
    const users = await this.getAllUsers();
    const newUser: UserProfile = {
      $id: `user_${Date.now()}`,
      name,
      email,
      role,
      suitIcon: 'spades',
      isMember: true,
      totalPoints: 0,
      careerWins: 0,
      careerKOs: 0,
      gamesPlayed: 0,
      leagueId: 'league_1',
    };
    const updated = [newUser, ...users];
    localStorage.setItem(LOCAL_STORAGE_ALL_USERS_KEY, JSON.stringify(updated));
    return newUser;
  }


  /**
   * Delete a user from the directory
   */
  static async deleteUser(userId: string): Promise<UserProfile[]> {
    const users = await this.getAllUsers();
    const updated = users.filter((u) => u.$id !== userId);
    localStorage.setItem(LOCAL_STORAGE_ALL_USERS_KEY, JSON.stringify(updated));
    return updated;
  }

  /**
   * Update active User Role
   */
  static async updateRole(newRole: UserRole): Promise<boolean> {
    if (isAppwriteConfigured) {
      try {
        await account.updatePrefs({ role: newRole });
      } catch {}
    }
    const cached = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        parsed.role = newRole;
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(parsed));
      } catch {}
    }
    return true;
  }

  /**
   * Logout
   */
  static async logout(): Promise<boolean> {
    if (isAppwriteConfigured) {
      try {
        await account.deleteSession('current');
      } catch {}
    }
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
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

  static canAccessPlatformAdmin(role?: UserRole): boolean {
    return role === 'admin';
  }

  static canCreateLeague(role?: UserRole): boolean {
    return role === 'admin';
  }

  static canAssignLeagueManager(role?: UserRole): boolean {
    return role === 'admin';
  }

  static canAccessAdmin(role?: UserRole): boolean {
    return role === 'admin' || role === 'manager';
  }

  static canAccessDirector(role?: UserRole): boolean {
    return role === 'admin' || role === 'manager' || role === 'dealer' || role === 'scribe';
  }

  static canManageClock(role?: UserRole): boolean {
    return role === 'admin' || role === 'manager' || role === 'dealer';
  }

  static canManageVenues(role?: UserRole): boolean {
    return role === 'admin' || role === 'manager';
  }

  static canScheduleGames(role?: UserRole): boolean {
    return role === 'admin' || role === 'manager';
  }

  static canRecordBusts(role?: UserRole): boolean {
    return role === 'admin' || role === 'manager' || role === 'dealer' || role === 'scribe';
  }
}
