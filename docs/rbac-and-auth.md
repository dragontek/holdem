# Authentication & Role-Based Access Control (RBAC)

Permissions in **Jack Ten Poker** are defined centrally in `src/lib/permissions.ts` and enforced at three layers: UI controls, backend service guards, and Appwrite table permissions.

---

## Role Hierarchy & Permission Matrix

| Capability (`PermissionAction`) | Guest | Player | Scribe | Dealer | Manager | Admin |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| View Games, Standings, Stats, TV Mode | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| RSVP to Tournaments (`game:rsvp`) | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| Seat & Move Players (`game:seat_players`) | — | — | ✅ | ✅ | ✅ | ✅ |
| Record Points, Bonuses, KOs & Busts (`game:score`) | — | — | ✅ | ✅ | ✅ | ✅ |
| Operate Director Desk (`director:operate`) | — | — | ✅ | ✅ | ✅ | ✅ |
| Control Game Clock (`clock:manage`) | — | — | — | ✅ | ✅ | ✅ |
| Finalize Tournaments (`game:finalize`) | — | — | — | — | ✅ | ✅ |
| Access Admin Console (`admin:access`) | — | — | — | — | ✅ | ✅ |
| Schedule / Delete Games (`game:schedule`, `game:delete`) | — | — | — | — | ✅ | ✅ |
| Manage Seasons & Venues (`season:manage`, `venue:manage`) | — | — | — | — | ✅ | ✅ |
| Manage Announcements (`announcement:manage`) | — | — | — | — | ✅ | ✅ |
| Manage Non-Admin Users & Roles (`user:manage`) | — | — | — | — | ✅ | ✅ |
| Create / Manage Leagues & Assign Managers (`league:*`) | — | — | — | — | — | ✅ |
| Assign Admin Role (`platform:assign_admin`) | — | — | — | — | — | ✅ |
| Clear & Re-seed Platform Data (`platform:reseed`) | — | — | — | — | — | ✅ |

---

## Enforcement Layers

1. **Canonical Permission Module (`src/lib/permissions.ts`)**:
   - `hasPermission(role, action)` drives all UI visibility and route guards.
   - `assertPermission(action)` is a fail-closed runtime guard called inside mutating methods in `AppwriteService` and `AuthService`, throwing `PermissionError` if an unauthorized actor invokes a mutation.
   - `canAssignRole()` and `canModifyUser()` prevent privilege escalation (e.g., Managers cannot promote themselves or others to `admin`, and cannot demote or delete a Platform Admin).
2. **Active Actor Synchronization**:
   - `App.tsx` and `AuthService` keep the runtime `activeActor` synced with the authenticated session on login, registration, logout, page reload, and cross-tab `storage` events.
3. **Appwrite Table Permissions (`scripts/setupAppwrite.ts`)**:
   - Tables are configured with `Permission.read(Role.any())` (so spectators and Venue TV displays work without login) and `Permission.create/update/delete(Role.users())` so unauthenticated guests cannot write directly to Appwrite.

---

## Appwrite Session Lifecycle

`src/services/authService.ts` handles Appwrite Auth sessions cleanly across logins, refreshes, and logouts:

- **Preventing Active Session Collisions**: Before creating a new email/password session, `clearCurrentAppwriteSession()` clears any lingering active session, and `createEmailSessionCleanly()` retries once if Appwrite reports `user_session_already_exists`.
- **Re-Linking on Page Refresh**: On app boot, `getCurrentUser()` verifies the live Appwrite session via `account.get()`, re-links the user's profile and role from the Appwrite users/players table, and clears stale local state if the Appwrite session has expired or been revoked.
- **Cross-Tab Logout Sync**: `App.tsx` listens to `window` `storage` events so signing out in one browser tab clears the active session across all open tabs.
- **Offline Demo Mode**: When Appwrite is not configured, demo accounts are available in the Auth modal for testing every role (`player`, `scribe`, `dealer`, `manager`, `admin`).
