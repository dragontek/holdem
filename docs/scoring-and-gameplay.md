# Scoring Rules & Tournament Gameplay

**Jack Ten Poker** is a points-only Texas Hold'em tournament league. No monetary/cash prize values are displayed in the UI; all tournament results and standings are tracked strictly in league points.

All score math is implemented as pure, deterministic functions in `src/lib/scoring.ts`.

---

## Base Point Table

### Attendance & Survivor
| Category | Code | Base Points | Rule |
| :--- | :---: | ---: | :--- |
| **Show Up** | — | `+600` | Automatically awarded at the **1:15 mark** (Level index `5`, 10k/20k blinds, or on completion). Players seated after the cutoff have `showUpAwarded = false`. |
| **No-Game Show Up** | — | `+5,000` | Flat award when `noGamePlayed` is enabled (no session multipliers or DG consumption). |
| **Survivor (All-In)** | `☆` (`SURV`) | `+500` | Awarded each time a player goes all-in and survives without busting. |

### Top 5 Placement Finishes
| Finish | Base Points |
| :---: | ---: |
| **1st Place** | `+12,000` |
| **2nd Place** | `+5,000` |
| **3rd Place** | `+3,000` |
| **4th Place** | `+1,500` |
| **5th Place** | `+1,000` |

### Knockouts (KO)
| Category | Code | Base Points | Description |
| :--- | :---: | ---: | :--- |
| **Standard Knockout** | `K` | `+1,000` | Awarded per player eliminated |
| **Rebuy Knockout** | `R` | `+5,000` | Awarded for knocking out a player under rebuy bounty rules |

### Hand Bonuses (HD)
| Category | Code | Base Points | Counts as High Hand Badge |
| :--- | :---: | ---: | :---: |
| **HOD (Off Suit)** | `O` | `+500` | No |
| **HOD (Suited)** | `S` | `+1,000` | No |
| **Four of a Kind (Quads)** | `4` | `+2,500` | Yes |
| **Straight Flush** | `F` | `+5,000` | Yes |
| **Royal Flush** | `#` | `+10,000` | Yes |

---

## Multipliers & Overrides

```text
BasePoints      = ShowUp + Survivor + Placement + sum(KO) + sum(HandBonuses)
TotalMultiplier = SessionMultiplier (1x | 2x | 3x) × (HasDGCarryover ? 2 : 1)
FinalPoints     = Status === 'MUCK' ? 0 : BasePoints × TotalMultiplier
```

- **Session Multipliers**: Single (`1x`), Double (`2x`), or Triple (`3x`) configured per game in the Session Rules bar.
- **Day Game (`DG 2x`) Carryover**:
  - Playing a non-mucked Day Game (`isDayGame = true`) earns a `DG 2x` carryover flag for the player's next tournament.
  - When consumed in the next game, `hasDgCarryover = true` doubles that player's total multiplier (e.g., a `2x` Double session becomes `4x` for that player).
- **MUCK Override**: Marking a player `MUCK` zeroes their session score (`0 pts`), disqualifies them from earning `DG` carryover, and preserves their elimination record for audit accuracy.

---

## Director Desk & Scribe Workflows

1. **RSVP Check-in & Seating**: Players can RSVP ahead of time; Scribes, Dealers, Managers, and Admins seat players directly from the RSVP queue or as walk-ins with automatic table/seat assignment.
2. **Quick Record Strip**: One-tap hand bonus buttons (`☆ Surv`, `O HOD`, `S Suited`, `4 Quads`, `F StrFlush`, `# Royal`) and `Bust / KO` right on each active player card.
3. **Player Actions & Points Dialog**: Consolidated modal for adjusting KOs, hand bonuses, rebuys, add-ons, Show-Up eligibility, `DG 2x` carryover, `MUCK`, or restoring an active player.
4. **Knockout Cross-Check Audit**: `auditKnockouts()` cross-checks every elimination record (`knockedOutByPlayerId` / `eliminatedBySeat`) against credited `K`/`R` badges and flags mismatches with one-tap fix buttons.
5. **Printable Paper Scorecard View**: Switch the Scorecard tab to **Paper Sheet** mode to view/print a 2-page physical Jack Ten Poker sheet (`Front 1–16`, `Back 17–32`, or `Both Pages`).
6. **Official Finalization**: Managers and Admins review final placements, points, and `DG` carryovers in `FinalizeTournamentDialog` before locking the game and committing career totals to player profiles.

---

## Live Points on Player Stats & Leaderboard

- During an active (unfinalized) tournament, `PlayerStatsView` and `LeaderboardView` immediately include live session points (clearly marked with `LIVE` / `+X live` badges) so players see their updated totals right away.
- Once the tournament is finalized (`status = 'completed'`), points are persisted to the player's career `totalPoints` and live deltas drop to `0` automatically — preventing double-counting.

---

## Venue TV Broadcast Mode

Open **TV Mode** from any live game to launch a full-screen venue display (`VenueTVDisplay`) featuring:
- Backend-synchronized blind clock and current/next blind levels
- Remaining players, average chip stack, and total chips in play (including bar-spend "Purple" bonus chips)
- Hot Hand target callout and announcements
- Live Table Leaderboard (`TVLiveStandingsPanel`) and animated big-screen celebration banners (`TVBroadcastBanner`) with confetti on major hands and knockouts
