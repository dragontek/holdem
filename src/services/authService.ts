import { account, isAppwriteConfigured, ID } from '../lib/appwrite';
import type { UserProfile, UserRole } from '../types/holdem';

const LOCAL_STORAGE_USER_KEY = 'holdem_auth_user';

export const DEMO_USERS: Record<UserRole, UserProfile> = {
  manager: {
    $id: 'user_demo_manager',
    name: 'Sarah Connor',
    email: 'manager@holdempro.com',
    role: 'manager',
  },
  dealer: {
    $id: 'user_demo_dealer',
    name: 'Johnny Chan (Dealer)',
    email: 'dealer@holdempro.com',
    role: 'dealer',
  },
  scribe: {
    $id: 'user_demo_scribe',
    name: 'Morgan Stanley (Scribe)',
    email: 'scribe@holdempro.com',
    role: 'scribe',
  },
  player: {
    $id: 'user_demo_player',
    name: 'Ced 2452 (Player)',
    email: 'player@holdempro.com',
    role: 'player',
  },
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
        };
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
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
    };
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
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
        };
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
        return { user: profile };
      } catch (e: any) {
        return { user: null, error: e.message || 'Invalid email or password' };
      }
    }

    // Offline / Demo fallback
    const role = this.detectRoleFromEmail(email);
    const profile: UserProfile = {
      $id: `user_demo_${Date.now()}`,
      name: email.split('@')[0],
      email,
      role,
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
   * Update User Role
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
    if (lower.includes('manager') || lower.includes('director') || lower.includes('admin')) return 'manager';
    if (lower.includes('dealer')) return 'dealer';
    if (lower.includes('scribe')) return 'scribe';
    return 'player';
  }

  // ==========================================
  // --- ROLE-BASED ACCESS CONTROL HELPERS ---
  // ==========================================

  static canAccessAdmin(role?: UserRole): boolean {
    return role === 'manager';
  }

  static canAccessDirector(role?: UserRole): boolean {
    return role === 'manager' || role === 'dealer' || role === 'scribe';
  }

  static canManageClock(role?: UserRole): boolean {
    return role === 'manager' || role === 'dealer';
  }

  static canManageVenues(role?: UserRole): boolean {
    return role === 'manager';
  }

  static canScheduleGames(role?: UserRole): boolean {
    return role === 'manager';
  }

  static canRecordBusts(role?: UserRole): boolean {
    return role === 'manager' || role === 'dealer' || role === 'scribe';
  }
}
