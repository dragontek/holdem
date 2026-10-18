# AGENTS.md — AI-Assisted Development Guide & Engineering Standards

> **Repository**: Hold'em Pro (`dragontek/holdem`)  
> **Tech Stack**: React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui, Appwrite (Databases, Auth, Realtime), Lucide React  
> **Target Audience**: AI Agents, Pair Programmers, and Core Contributors  

---

## 1. Project Mission & Overview

**Hold'em Pro** is an enterprise-grade Texas Hold'em poker tournament league management platform. It powers real-time tournament operations, championship point races, multi-venue logistics, and role-based league administration:

- **Championship Seasons**: Point races, multi-week seasons, active season tracking.
- **Host Venues**: Multi-location partner bars, clubs, contact details, geo-coordinates.
- **Tournament Scheduling**: One-time events and recurring weekly series (e.g., *Every Saturday at 11:00 AM*).
- **Director Desk**: Live tournament clocks, blinds management, chip counts, player seating, table balancing, and knockout tracking.
- **Role-Based Access Control (RBAC)**: Strict role boundaries for `manager`, `dealer`, `scribe`, and `player`.
- **Hybrid Backend Architecture**: Real-time Appwrite websocket integration paired with instant offline/mock data fallback.

---

## 2. The Anti-"AI Slop" Engineering Manifesto

AI-generated code frequently suffers from stylistic degradation known as **"AI slop"**. This repository strictly enforces standards of **professional software engineering**.

### 🚫 Hallmarks of "AI Slop" (STRICTLY PROHIBITED)

1. **Monolithic God Components**:
   - Writing 500–1,200+ line components that mix state, API calls, inline modals, and multiple nested sub-renderers (`renderStep1()`, `renderStep2()`).
   - *Requirement*: Break complex views into modular, dedicated sub-components (< 250–300 lines each).

2. **Repetitive Inline Utility Soup**:
   - Copy-pasting long chains of arbitrary Tailwind classes across dozens of buttons, badges, modals, and form inputs.
   - *Requirement*: Import and compose standardized UI primitives from `@/components/ui/*`.

3. **Glow & Gradient Overkill**:
   - Saturating screens with competing neon shadows (`.gold-glow`, `.felt-glow`), pulsating borders, and multi-color gradients on every card.
   - *Requirement*: Elevate the interface through **crisp 1px borders** (`border-slate-800`), refined surface contrasts (`bg-slate-900/60`), and clear typographic hierarchy. Reserve subtle glows exclusively for active live games or winner celebrations.

4. **Inaccessible & Ad-Hoc Overlays**:
   - Re-inventing custom modal backdrops (`fixed inset-0 bg-slate-950/85 ...`) in every file without keyboard focus traps, ARIA attributes, or Escape key handling.
   - *Requirement*: Always use accessible Radix-based `<Dialog>` primitives.

5. **Type Laziness (`any` & Magic Strings)**:
   - Using `any`, casting with `as any`, or using raw string literals for roles, statuses, and suits.
   - *Requirement*: Use strict discriminated unions and models defined in `@/types/holdem`.

---

## 3. shadcn/ui Component Architecture & Design System

The application uses **shadcn/ui** primitives built on **Radix UI** and **Tailwind CSS v4** with the `cn()` class merger utility.

### 3.1 Design Tokens & Semantic Color Palette

Color tokens are defined in `src/index.css` via CSS variables:

| Semantic Token | Tailwind Value | Intended Usage |
| :--- | :--- | :--- |
| **`--primary`** | `amber-500` / Gold | Primary call-to-actions, championship trophies, active tab states. |
| **`--secondary`** | `slate-800` | Secondary buttons, subtle backgrounds, filter pills. |
| **`--card`** | `slate-900/60` | Content panels, tournament cards, metrics blocks. |
| **`--border`** | `slate-800` / `slate-700` | Crisp 1px container and card boundaries. |
| **`--muted-foreground`** | `slate-400` | Subtitles, metadata, timestamps, secondary labels. |
| **`--destructive`** | `rose-600` / `rose-400` | Eliminations, deletions, cancellations. |
| **Felt / Live** | `emerald-500` / `emerald-400` | In-progress games, chip counts, positive metrics. |
| **Recurrence / TD** | `indigo-400` / `purple-400` | Recurring series badges, Tournament Director tags. |

### 3.2 Canonical Component Primitives (`src/components/ui/`)

All AI agents must reuse the following primitives rather than handwriting custom elements:

```
src/components/ui/
├── button.tsx       # Standardized Button with CVA variants & sizes
├── badge.tsx        # Status chips (default, success, destructive, indigo, etc.)
├── card.tsx         # Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
├── dialog.tsx       # Accessible modal dialogs (Overlay, Content, Header, Footer)
├── input.tsx        # Styled form inputs with focus states
├── label.tsx        # Accessible Radix form labels
├── tabs.tsx         # Segmented navigation & tab panels
└── separator.tsx    # Semantic horizontal/vertical dividers
```

### 3.3 Component Usage Standards & Code Examples

#### Buttons
```tsx
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';

// Primary Action
<Button variant="default" size="default">
  <Plus /> Schedule Tournament
</Button>

// Secondary / Toolbar Action
<Button variant="outline" size="sm">
  Filter Options
</Button>

// Destructive Action
<Button variant="destructive" size="sm">
  <Trash2 /> Delete
</Button>
```

#### Badges & Status Indicators
```tsx
import { Badge } from '@/components/ui/badge';
import { PlayCircle, RotateCcw } from 'lucide-react';

// Live game status
<Badge variant="success">
  <PlayCircle className="w-3 h-3 animate-pulse" /> LIVE IN PROGRESS
</Badge>

// Recurring weekly rule
<Badge variant="indigo">
  <RotateCcw className="w-2.5 h-2.5" /> Every Saturday at 11:00 AM
</Badge>

// General metadata
<Badge variant="secondary">2026 Season</Badge>
```

#### Cards & Panels
```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

<Card className="hover:border-slate-700 transition-all">
  <CardHeader>
    <CardTitle>{game.title}</CardTitle>
    <CardDescription>{game.venueName} • {game.scheduledAt}</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Key Metrics */}
  </CardContent>
  <CardFooter className="justify-between">
    <Button variant="outline" size="sm">Edit</Button>
    <Button variant="default" size="sm">Launch Director Desk</Button>
  </CardFooter>
</Card>
```

#### Modal Dialogs
```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
  <DialogContent className="max-w-xl">
    <DialogHeader>
      <DialogTitle>Edit Tournament Schedule</DialogTitle>
      <DialogDescription>Configure tournament buy-ins, blind levels, and venue.</DialogDescription>
    </DialogHeader>

    {/* Form Fields */}

    <DialogFooter>
      <Button variant="outline" onClick={onClose}>Cancel</Button>
      <Button variant="default" onClick={handleSave}>Save Changes</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### Form Controls
```tsx
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

<div className="space-y-1.5">
  <Label htmlFor="buyin">Buy-in Amount ($)</Label>
  <Input
    id="buyin"
    type="number"
    value={buyin}
    onChange={(e) => setBuyin(Number(e.target.value))}
    placeholder="30"
  />
</div>
```

---

## 4. Architectural Rules & Separation of Concerns

### 4.1 Directory Structure
```
src/
├── components/          # Domain feature components
│   ├── ui/              # shadcn/ui primitives (Button, Card, Dialog, etc.)
│   ├── admin/           # Modular Admin sub-views (SeasonsTab, VenuesTab, etc.)
│   ├── director/        # Director Desk modules (Clock, Tables, Blinds)
│   └── ...              # Existing top-level views during progressive migration
├── hooks/               # Custom React hooks (useGameTimer, useAuthSession)
├── lib/                 # Core low-level libraries
│   ├── appwrite.ts      # Appwrite Client SDK initialization
│   └── utils.ts         # cn() utility
├── services/            # Pure data access & API layer
│   ├── appwriteService.ts   # CRUD operations with mock fallback
│   ├── appwriteRealtime.ts  # WebSocket subscriptions
│   ├── authService.ts       # RBAC, login, registration, roles
│   └── mockData.ts          # Seed fixtures for offline/demo operation
└── types/               # TypeScript domain interfaces
    └── holdem.ts        # League, Game, Player, Venue, Season models
```

### 4.2 Data Fetching & Resilience Standard
1. **Always Preserve Offline Fallback**: All API calls in `appwriteService.ts` and `authService.ts` must catch connection errors and gracefully fallback to local storage or `mockData.ts`. The application must run without crashing even when Appwrite credentials are not configured.
2. **Realtime Updates**: Subscribe via `appwriteRealtime.ts` for live game timer ticks, player eliminations, and check-ins. Always clean up subscriptions in `useEffect` return handlers.
3. **Optimistic Updates**: Update local React state immediately for interactive tournament actions (e.g., adding rebuys or knockout credits), then persist to Appwrite asynchronously.

---

## 5. Coding Standards & Conventions

### 5.1 TypeScript Rigor
- **Strict Typing**: No `any`. If an Appwrite error payload is caught, type it as `unknown` or create a typed interface.
- **Discriminated Unions**: Use existing unions for statuses (`GameStatus`), roles (`UserRole`), suits (`SuitIcon`), and tabs (`AdminTab`).
- **Props Interfaces**: Explicitly export and name component props (e.g., `export interface EventScheduleModalProps`).

### 5.2 Component Size Limits (< 300 lines)
- If a component exceeds 300 lines, extract logical sub-views into separate files.
- Example: Refactoring `AdminView.tsx` into:
  - `src/components/admin/AdminSeasonsSection.tsx`
  - `src/components/admin/AdminVenuesSection.tsx`
  - `src/components/admin/AdminSchedulesSection.tsx`
  - `src/components/admin/AdminUsersSection.tsx`

### 5.3 UX & Accessibility Standards
- **Keyboard Navigation**: All interactive elements must have visible focus rings (`focus-visible:ring-2 focus-visible:ring-amber-500`).
- **Semantic HTML**: Use native `<button>` (via shadcn `Button`), `<form>`, `<header>`, and `<section>`. Never attach click handlers to unadorned `<div>` or `<span>` elements.
- **Empty States**: Every list (tournaments, venues, players) must provide a clean empty state with an icon, explanation, and an action button.
- **Destructive Actions**: Always confirm destructive operations (canceling tournaments, deleting venues, demoting managers) with clear messaging.

---

## 6. Agent Quality Checklist Before Completing Tasks

Before reporting any task complete, AI agents must execute the following validation steps:

```bash
# 1. Typecheck & Build Verification (Must exit code 0)
npm run build

# 2. Linter Check
npm run lint

# 3. Packaging Validation (Ensures Appwrite tarball is buildable)
npm run bundle:site
```

### Verification Questions for the Agent:
1. Did I introduce any inline ad-hoc buttons or modals instead of using `@/components/ui/*`?
2. Did I keep file lengths manageable (< 300 lines) rather than ballooning existing files?
3. Did I maintain graceful Appwrite offline/mock fallbacks?
4. Does the UI look like a crisp, professional sports/poker application rather than saturated "AI slop"?
