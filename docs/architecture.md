# Architecture & Realtime Sync

This document covers the application structure, hybrid data layer, backend-authoritative tournament clock, and real-time synchronization model used in **Jack Ten Poker**.

---

## Directory Layout

```text
src/
├── components/
│   ├── ui/                  # Canonical shadcn/ui + Radix primitives (Button, Card, Dialog, Badge, Tabs, etc.)
│   ├── admin/               # Modular Admin views (Overview, Leagues, Seasons, Venues, Schedules, Users, RBAC)
│   ├── director/            # Live tournament desk modules (ScorecardTable, PaperScorecardView, PlayerScoreDialog, QuickScoreStrip, etc.)
│   ├── tv/                  # Venue TV broadcast banners & live standings panel
│   └── ...                  # Top-level views (GamesView, DirectorDesk, LeaderboardView, PlayerStatsView, VenueTVDisplay, etc.)
├── hooks/
│   ├── useGameClock.ts               # Deterministic live clock derived from server-stamped anchors
│   ├── useLiveScoreNotifications.ts  # Real-time score events, toasts, highlights, and entry reconciliation
│   └── usePwaInstall.ts              # PWA install prompt, iOS guide, offline status, and SW updates
├── lib/
│   ├── appwrite.ts          # Appwrite Web SDK client, TablesDB, Auth, Realtime, Storage initialization
│   ├── entryScoringMeta.ts  # Durable scoring metadata sidecar & schema-safe Realtime entry merger
│   ├── gameClock.ts         # Pure server-anchor clock computation & RTT offset calibration
│   ├── liveScoreEvents.ts   # Score event diffing, canonical notification builders, and chime audio
│   ├── permissions.ts       # Canonical RBAC permission map & fail-closed assertPermission() guard
│   ├── router.ts            # Hierarchical URL routing (with Vite BASE_URL / GitHub Pages subpath support)
│   ├── scoring.ts           # Pure Jack Ten Poker point calculation & finalization engine
│   └── utils.ts             # Tailwind class merger (cn)
├── services/
│   ├── appwriteService.ts   # CRUD + schema-resilient persistence with offline mock fallback
│   ├── appwriteRealtime.ts  # Appwrite WebSocket subscriptions + same-device BroadcastChannel relay
│   ├── authService.ts       # Appwrite Auth session lifecycle, refresh re-linking, and RBAC helpers
│   └── mockData.ts          # Offline/demo seed fixtures
└── types/
    └── holdem.ts            # Strict TypeScript domain interfaces & discriminated unions
```

---

## Hybrid Backend & Schema-Resilient Persistence

`AppwriteService` is designed so the app works reliably in both live Appwrite environments and offline/demo environments:

1. **Offline/Demo Fallback**: When `VITE_APPWRITE_ENDPOINT` or `VITE_APPWRITE_PROJECT_ID` is not set, all reads/writes gracefully use in-memory fixtures (`src/services/mockData.ts`) paired with `localStorage` overrides.
2. **Dynamic Column Discovery**: When connected to Appwrite, `resilientListRows()` inspects returned rows and caches known table columns. `filterPayloadForTable()` strips unprovisioned attributes before writes (and caches any `400 Unknown attribute` responses), preventing schema drift from breaking live games.
3. **Appwrite Tables Provisioning**: Run `npm run setup:appwrite` (backed by `scripts/setupAppwrite.ts`) to provision or update tables, scalar columns, relationships, and table permissions non-destructively.

---

## Backend-Authoritative Tournament Clock

To keep every connected device (Director, Scribe, Players, and Venue TV) synchronized without drift:

- **Source of Truth**: Clock mutations (`play`, `pause`, `skip level`, `±1m`, `override`, `reset`, `complete`) persist a dedicated clock anchor row (`clk_<gameId>`, `type: 'game_clock_state'`) in the `announcements` table (filtered out of user-facing banner queries) alongside updating the `games` row.
- **Server-Stamped Anchors**: Appwrite stamps `$updatedAt` on the clock row, isolating clock timing from unrelated game edits (e.g., RSVPs or player count updates).
- **RTT Clock Offset Calibration**: `calibrateServerClockFromResponse()` estimates server-to-client clock skew using response timestamps (`src/lib/gameClock.ts`), eliminating local device clock drift.
- **Deterministic Derivation**: `useGameClock` computes the current blind level and remaining seconds deterministically from `(clockAnchorAt, currentLevelIndex, secondsRemainingInLevel, levelDurationOverrides)` on every render/tick.

---

## Real-Time Scoring & Durable Entry Metadata Sync

Live scoring updates flow across devices through three coordinated channels:

1. **Canonical Live Score Broadcasts (`live_score_event`)**:
   - When a Scribe or Director records a hand bonus, knockout, elimination, Show-Up cutoff, or placement, `useLiveScoreNotifications` emits an exact `LiveScoreNotification` locally, relays it over `BroadcastChannel` (same-device tabs), and publishes an ephemeral `live_score_event` row in `announcements` over Appwrite Realtime.
   - Notifications (toasts, chimes, TV banners, card highlights) are strictly scoped to the user's currently viewed game and auto-dismiss after 60 seconds.
2. **Entry Updates (`game_entries`) & Safe Realtime Merging**:
   - `AppwriteService.updateGameEntryScoring()` persists updated entry fields to `game_entries`.
   - When Appwrite Realtime echoes back a `game_entries` row, `mergeRealtimeGameEntry()` (`src/lib/entryScoringMeta.ts`) checks which attributes are actually present on the incoming payload so partial or legacy-schema payloads never wipe `handBonuses`, `knockouts`, `status`, `showUpAwarded`, or `hasDgCarryover`.
3. **Durable Scoring Metadata Sidecar (`entry_scoring_meta`)**:
   - If a live `game_entries` table has not yet had the extended scoring columns provisioned, `AppwriteService` automatically upserts a compact sidecar row (`esc_<entryId>`, `type: 'entry_scoring_meta'`) in `announcements` and subscribes via `AppwriteRealtime.subscribeToEntryScoringMeta()`.
   - On page reload, `getAllGameEntries()` merges `game_entries` with any `entry_scoring_meta` rows so full point breakdowns persist across reloads and synchronize across all devices.
   - Untouched legacy rows with persisted `pointsAwarded` display their recorded points accurately and snapshot `legacyPointsOffset` on first edit so adding or removing bonuses always adjusts cleanly.
