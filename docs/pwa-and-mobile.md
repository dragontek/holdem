# Mobile-First UX & Progressive Web App (PWA) Guide

**Jack Ten Poker** is built **mobile-first, desktop-enabled** so players, dealers, and scribes can run entire poker nights smoothly from phones while scaling cleanly to tablets, laptops, and venue TV displays.

---

## Mobile-First Design Standards

1. **Dynamic Viewport Sizing**:
   - Uses `100dvh` (`min-h-[100dvh]`, `max-h-[92dvh]`) instead of `100vh`/`90vh` so mobile browser address bars and on-screen keyboards never clip dialog footers or actions.
2. **Touch-Friendly Targets**:
   - Interactive controls, buttons, and inputs maintain at least `44px` touch height on mobile (`min-h-[44px]` / `h-11`).
   - Form inputs stay ≥ `16px` on phones to prevent iOS Safari automatic zoom-on-focus.
3. **Safe-Area Insets & Mobile Navigation Clearance**:
   - Respects notched devices and standalone PWA mode using `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`.
   - Bottom-anchored overlays and live score toasts stay clear of the fixed mobile bottom navigation bar (`< lg`).
4. **Accessible Modals & Controls**:
   - All dialogs (`QRCheckinModal`, `PlayerScoreDialog`, `EliminationDialog`, `FinalizeTournamentDialog`, etc.) use Radix UI `<Dialog>` primitives with keyboard focus traps, Escape key dismissal, and ARIA labeling.

---

## PWA Architecture

| File | Role |
| :--- | :--- |
| `public/manifest.webmanifest` | App name, standalone display mode, theme/background colors, shortcuts, and PNG/maskable icons |
| `public/icons/` | `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`, `favicon-32.png` |
| `public/sw.js` | Service worker providing app-shell caching, offline navigation fallback, and versioned cache cleanup |
| `src/hooks/usePwaInstall.ts` | Handles `beforeinstallprompt`, iOS Safari detection, online/offline connectivity, and service worker update activation |
| `src/components/PwaStatusBar.tsx` | Compact status bar for offline indicator, one-tap app update reload, install banner, and iOS "Add to Home Screen" modal |

---

## Service Worker Caching Policy (`public/sw.js`)

- **Appwrite & Realtime Endpoints**: Requests to Appwrite APIs (`/v1/`), WebSockets, and non-GET requests are **always bypassed** (network-only) so authentication, live scoring, and clock ticks are never served stale from cache.
- **Navigation Requests**: Network-first with cached `index.html` fallback when offline.
- **Static Assets**: Stale-while-revalidate for JS, CSS, fonts, and icons under the active base path.
- **Base-Path Awareness**: Both manifest links and service worker registration resolve cleanly whether hosted at root `/` (Appwrite Sites PROD) or under a subpath like `/holdem/` (GitHub Pages DEV).

---

## Installing on Devices

- **Android (Chrome / Edge) & Desktop (Chrome / Edge)**: Click the **Install App** button in the top navigation bar or install banner to install as a standalone app.
- **iOS / iPadOS (Safari)**: Tap **Install App** to open the guided iOS instructions (`Share` → `Add to Home Screen`).
- **Updates**: When a new version is deployed, `PwaStatusBar` prompts users with a one-tap **Update Now** button that activates the waiting service worker and reloads cleanly.
