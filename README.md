# Jack Ten Poker — Hold'em League Management Platform

**Jack Ten Poker** (`dragontek/holdem`) is a mobile-first, real-time Texas Hold'em tournament league management platform built with React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui, and Appwrite.

It runs live poker nights end-to-end — from RSVP check-ins and table seating to backend-synchronized tournament clocks, digital & printable scorecards, Venue TV broadcast displays, real-time point celebrations, and automated season standings.

---

## Key Features

- **Backend-Authoritative Tournament Clock & Director Desk**
  - Server-stamped clock anchors with RTT clock-offset calibration keep Directors, Dealers, Scribes, Players, and Venue TVs synchronized to the exact same second.
  - Supports blind level progression, breaks, manual time overrides, `+1m / -1m` adjustments, and automatic 1:15 Show-Up cutoff detection.
- **Official Jack Ten Poker Scoring Engine & Scorecards**
  - Points-only league scoring covering Show-Up points, Top 5 placements, Standard & Rebuy Knockouts, Survivor (all-in), Hand of the Day (off-suit/suited), Quads, Straight Flush, Royal Flush, Session Multipliers (`1x`/`2x`/`3x`), Day Game (`DG 2x`) carryovers, `MUCK` overrides, and No-Game flat awards.
  - One-tap Scribe quick-record strips, unified mobile-friendly Player Actions & Points dialog, Knockout cross-check audits, and a printable 2-page Paper Scorecard comparison view.
- **Live Score Notifications & Venue TV Broadcast Mode**
  - Canonical real-time alerts with sound chimes, player card highlights, and 60-second auto-dismissing toasts scoped to the viewed game.
  - Full-screen Venue TV display with live blind clock, chip averages, live table leaderboard, Hot Hand target, and big-screen celebration banners.
- **Live Standings & Player Stats**
  - Season leaderboards (Points, Ranking, Wins, Knockouts) and detailed player career ledgers that immediately reflect in-progress live session points without double-counting finalized tournaments.
- **Multi-League Administration & End-to-End RBAC**
  - Manage Leagues, Seasons, Host Venues, One-Time & Recurring Tournaments, Announcements, and User Roles.
  - Strict role-based access control (`guest`, `player`, `scribe`, `dealer`, `manager`, `admin`) enforced across both UI controls and backend service guards.
- **Mobile-First, Desktop-Enabled & Installable PWA**
  - Designed for 360px–430px phones first (`100dvh`, ≥ 44px touch targets, safe-area insets) and scales cleanly to tablet, desktop, and venue TV screens.
  - Installable Progressive Web App with offline shell caching, update banner, iOS Safari Add-to-Home-Screen guide, and Appwrite API/Realtime bypass in the service worker.
- **Hybrid Backend with Instant Offline Fallback**
  - Powered by Appwrite (TablesDB, Auth, Realtime, Storage) with automatic fallback to local mock fixtures when Appwrite credentials are not configured.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| Frontend | React 19, TypeScript, Vite 8 |
| Styling & UI | Tailwind CSS v4, shadcn/ui (Radix UI primitives), Lucide React, Framer Motion |
| Backend & Realtime | Appwrite (TablesDB, Auth, Realtime WebSockets, Storage) |
| Linting & Quality | Oxlint, TypeScript project build (`tsc -b`), Git commit hooks |
| CI/CD & Releases | GitHub Actions, `semantic-release`, GitHub Pages (DEV), Appwrite Sites (PROD) |

---

## Quick Start

### Prerequisites
- Node.js 20+ (CI runs Node 22)
- npm 10+
- Optional: An Appwrite instance (the app runs out-of-the-box in offline demo mode if `.env` is omitted)

### 1. Clone & Install

```bash
git clone https://github.com/dragontek/holdem.git
cd holdem
npm install
npm run hooks:install
```

> `npm run hooks:install` activates `.githooks/commit-msg` so Conventional Commits are validated locally on every commit.

### 2. Configure Environment Variables (Optional)

Copy `.env.example` to `.env` and fill in your Appwrite details:

```bash
cp .env.example .env
```

```env
VITE_APPWRITE_ENDPOINT=https://your-appwrite-host/v1
VITE_APPWRITE_PROJECT_ID=your_project_id
VITE_APPWRITE_DATABASE_ID=holdem_db

# Server/CI scripts only (never expose to client bundles)
APPWRITE_API_KEY=your_appwrite_api_key
APPWRITE_SITE_ID=your_appwrite_site_id
```

### 3. Run Locally

```bash
npm run dev
```

---

## Available Scripts

| Script | Description |
| :--- | :--- |
| `npm run dev` | Start Vite development server with HMR |
| `npm run build` | Type-check (`tsc -b`) and build production bundle to `dist/` |
| `npm run build:pages` | Build with `VITE_BASE_PATH=/holdem/` for GitHub Pages preview |
| `npm run lint` | Run Oxlint across the repository |
| `npm run preview` | Preview the production build locally |
| `npm run bundle:site` | Build and package `holdem-site.tar.gz` for Appwrite Sites |
| `npm run deploy:appwrite` | Upload and activate `holdem-site.tar.gz` on Appwrite Sites |
| `npm run setup:appwrite` | Provision/sync Appwrite database tables, columns, and permissions |
| `npm run reseed:appwrite` | Clear and re-seed Appwrite tables with league seed fixtures |
| `npm run reset:appwrite` | Drop and recreate Appwrite tables from scratch (destructive) |
| `npm run hooks:install` | Enable local `.githooks/commit-msg` validation |
| `npm run commit:validate` | Manually validate commit message formatting |

---

## Development Process Overview

We follow strict engineering and release standards documented in [AGENTS.md](./AGENTS.md) and [docs/development-and-releases.md](./docs/development-and-releases.md):

1. **Primary Development Branch (`develop`)**: All feature branches (`feat/*`, `fix/*`, `chore/*`, `docs/*`) branch from and merge into `develop`.
2. **Atomic Commits**: Break work into small, single-concern commits (separate core logic, UI features, bug fixes, refactors, and docs) so every commit is buildable and release notes stay crisp.
3. **Conventional Commits**: Every commit and PR title must follow `<type>(<optional-scope>)[!]: <description>` (enforced by `.githooks/commit-msg` and `.github/workflows/ci.yml`).
4. **Automated Environments & Semantic Versioning (`v1.x.x`)**:
   - **DEV (`develop` → GitHub Pages)**: Pushing to `develop` runs `.github/workflows/deploy-dev.yml` and automatically deploys to GitHub Pages.
   - **PROD (`main` → Appwrite Sites)**: Merging `develop` into `main` triggers `.github/workflows/release.yml`, which computes the next semantic version (`vMAJOR.MINOR.PATCH`), updates `package.json` & `CHANGELOG.md`, publishes GitHub Release Notes with `holdem-site.tar.gz`, syncs metadata back to `develop`, and automatically deploys to Appwrite Sites.
5. **Pre-PR Verification**: Run `npm run build`, `npm run lint`, and `npm run bundle:site` before opening a PR or pushing.

---

## Documentation

Detailed guides live in the [`docs/`](./docs/) directory:

- **[Architecture & Realtime Sync](./docs/architecture.md)** — Directory structure, hybrid Appwrite/offline layer, backend-authoritative clock, live notifications, and durable entry scoring metadata sync.
- **[Scoring Rules & Tournament Gameplay](./docs/scoring-and-gameplay.md)** — Official Jack Ten Poker points system, multipliers, Show-Up cutoff, KO audits, digital/paper scorecards, and Venue TV mode.
- **[Authentication & RBAC](./docs/rbac-and-auth.md)** — Role permission matrix (`guest` through `admin`), frontend/backend guards, Appwrite session lifecycle, and table permissions.
- **[Development Workflow, Branching & Releases](./docs/development-and-releases.md)** — Atomic commit workflow, Conventional Commits, Semantic Versioning, CI/CD pipelines, and GitHub/Appwrite deployment setup.
- **[Mobile-First UX & PWA Guide](./docs/pwa-and-mobile.md)** — Mobile-first design rules, service worker caching strategy, install flows (iOS/Android/Desktop), and offline behavior.
- **[AI Engineering Standards (`AGENTS.md`)](./AGENTS.md)** — Component standards, shadcn/ui usage guidelines, and contributor quality checklist.
