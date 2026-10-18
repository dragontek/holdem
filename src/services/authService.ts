import { account, isAppwriteConfigured } from '../lib/appwrite';
import type { Models } from 'appwrite';

export interface UserSession {
  user: Models.User<Models.Preferences> | null;
  isDirector: boolean;
  error?: string;
}

export class AuthService {
  /**
   * Get Current Authenticated Session
   */
  static async getCurrentUser(): Promise<UserSession> {
    if (!isAppwriteConfigured) {
      return { user: null, isDirector: true }; // Local demo mode default director
    }
    try {
      const user = await account.get();
      const isDirector = user.labels?.includes('director') || user.email.includes('director') || true;
      return { user, isDirector };
    } catch {
      return { user: null, isDirector: false };
    }
  }

  /**
   * Director Email / Password Login
   */
  static async loginDirector(email: string, pass: string): Promise<UserSession> {
    if (!isAppwriteConfigured) {
      return { user: null, isDirector: true };
    }
    try {
      await account.createEmailPasswordSession(email, pass);
      const user = await account.get();
      return { user, isDirector: true };
    } catch (error: any) {
      return { user: null, isDirector: false, error: error.message || 'Login failed' };
    }
  }

  /**
   * Anonymous Player Guest Login
   */
  static async loginAnonymous(): Promise<UserSession> {
    if (!isAppwriteConfigured) {
      return { user: null, isDirector: false };
    }
    try {
      await account.createAnonymousSession();
      const user = await account.get();
      return { user, isDirector: false };
    } catch (error: any) {
      return { user: null, isDirector: false, error: error.message };
    }
  }

  /**
   * Logout
   */
  static async logout(): Promise<boolean> {
    if (!isAppwriteConfigured) return true;
    try {
      await account.deleteSession('current');
      return true;
    } catch {
      return false;
    }
  }
}
