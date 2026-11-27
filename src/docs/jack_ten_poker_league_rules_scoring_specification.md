# Jack Ten Poker — League Scoring & Rules Specification

This document outlines the complete scoring rules, point values, game modifiers, and data structures extracted from the **Jack Ten Poker** physical scorecard for implementation in a league management mobile application.

---

## 1. Session Metadata & Game Types

Each tournament session tracks the following header metadata:

* **Date:** Date of the tournament (e.g., `11/24/26`).
* **Venue / Event Type:**
  * *Sports Fanatic*
  * *O'Leary's Pub*
  * *The Lounge*
  * *After Hours*
  * *Overtime*
  * *Single Barrel*
* **Staff:**
  * **Dealer(s):** Name(s) of the assigned dealer(s).
  * **Scribe(s):** Name(s) of the scorekeeper(s).
* **Session Multipliers (Game-Wide):**
  * **Single Points:** `1x` base points
  * **Double Points:** `2x` base points
  * **Triple Points:** `3x` base points
* **Dynamic Session Conditions & Accounting:**
  * **HOD (Hand of the Day):** Specific hole card requirement announced for the game (e.g., `Connected`).
  * **Hot Hand:** Specific made hand target for the session (e.g., `2/10 Boat`).
  * **Bar Spend Bonus Chips ("Purple" on scorecard):** Venue accounting counter for bonus chips earned by players for bar spend (`1` chip per `$15` spent at the bar, worth `15,000` tournament chips; physical chip color may vary by venue/set). Recorded on the official scorecard for venue accounting and turn-in.

---

## 2. Base Point Structure

All points earned during a game are first summed as **Base Points** before any session or player multipliers are applied.

### A. Attendance & Survival
| Achievement | Symbol / Code | Base Points | Notes |
| :--- | :---: | :---: | :--- |
| **Show Up Points** | *(Automatic at 1:15)* | **600** | Awarded automatically to any non-mucked player who has been seated by the **1:15 mark** (after Break 1 and the first blind of Hour 2). |
| **No-Game Show Up** | *(Session Flag)* | **5,000** | Awarded if a scheduled game does not run due to low turnout. |
| **Survivor Points** | `☆` *(in HD row)* | **500** | Awarded each time a player goes **all-in** and survives without busting (repeatable). |

### B. Final Table Placements (Top 5)
| Placement | Base Points |
| :--- | :---: |
| **1st Place** | **12,000** |
| **2nd Place** | **5,000** |
| **3rd Place** | **3,000** |
| **4th Place** | **1,500** |
| **5th Place** | **1,000** |

### C. Knockouts (`KO` Row)
| Achievement | Symbol / Code | Base Points | Notes |
| :--- | :---: | :---: | :--- |
| **Standard Knockout** | `K` | **1,000** | Awarded per player eliminated. |
| **Rebuy Knockout** | `R` | **5,000** | Awarded for knocking out a player during/under specific rebuy bounty rules. |

### D. Survivor & Hand Bonuses (`HD` Row)
| Achievement | Symbol / Code | Base Points | Notes |
| :--- | :---: | :---: | :--- |
| **Survivor (All-In)** | `☆` | **500** | Awarded each time a player goes all-in and survives without busting. |
| **HOD (Off Suit)** | `O` | **500** | Winning a hand with the off-suit Hand of the Day. |
| **HOD (Suited)** | `S` | **1,000** | Winning a hand with the suited Hand of the Day. |
| **Four of a Kind** | `4` | **2,500** | Quads achieved during the session. |
| **Straight Flush** | `F` | **5,000** | Non-royal straight flush achieved during the session. |
| **Royal Flush** | `#` | **10,000** | Royal flush achieved during the session. |

---

## 3. Player Modifiers & Edge Cases

### Day Game (`DG`) Carryover Multiplier
* **Rule:** Participating in a **Day Game (`DG`)** grants the player an individual **2x point multiplier** for the **next game** they play.
* **Stacking Behavior:** Multipliers stack multiplicatively with the session's game-wide multiplier:
  * Single Points (`1x`) + `DG` (`2x`) = **2x Total**
  * Double Points (`2x`) + `DG` (`2x`) = **4x Total**
  * Triple Points (`3x`) + `DG` (`2x`) = **6x Total**
* **Consumption:** Once applied to a subsequent game, the `DG` carryover flag is consumed and reset unless earned again.

### Disqualification / Forfeiture (`M` / `Muck`)
* **Rule:** Players marked with `M` (in the *Knocked out by #* column) or `Muck` (in the *Total* column) forfeit all points for that session, resulting in a final score of **0**.
* **Rebuy Only (`NO`):** Tracks whether a player entered under a rebuy-only restriction or declined a rebuy.

### Elimination Tracking
* **Knocked out by #:** Records the Seat/Player ID (`1`–`32`) of the player who eliminated them, providing an audit trail to validate `K` and `R` knockout bonuses across the table.

---

## 4. Point Calculation Formula

For any player $p$ in session $s$:

$$\text{BasePoints}_p = P_{\text{showup}} + P_{\text{survivor}} + P_{\text{placement}} + \sum P_{\text{KO}} + \sum P_{\text{HD}}$$

$$\text{TotalMultiplier}_{p,s} = M_{\text{session}} \times (2 \text{ if } \text{HasDGCarryover}_p \text{ else } 1)$$

$$\text{FinalScore}_{p,s} = \begin{cases} 0 & \text{if } \text{Status}_p = \text{MUCK} \\ \text{BasePoints}_p \times \text{TotalMultiplier}_{p,s} & \text{otherwise} \end{cases}$$

---

## 5. Official Blind Schedule (In Thousands)

All blind amounts below are expressed **in thousands** (e.g., `1/2` = `1,000 / 2,000`).

> **Manual Override Rule:** Tournament Directors and Dealers may **manually override blind durations/times** (extending, shortening, or setting custom minutes per level) at any point during a session.

### First Hour — 20-Minute Blinds
| Level | Blinds (in Thousands) | Small / Big Blind | Duration | Notes |
| :--- | :---: | :---: | :---: | :--- |
| **Level 1** | `1 / 2` | `1,000 / 2,000` | **20 min** | Hour 1 • Rebuy period open |
| **Level 2** | `2 / 4` | `2,000 / 4,000` | **20 min** | Hour 1 |
| **Level 3** | `4 / 8` | `4,000 / 8,000` | **20 min** | Hour 1 |
| **Break 1** | — | *Break* | **10 min** | End of Hour 1 • Rebuy cutoff |

### Second Hour — 15-Minute Blinds
| Level | Blinds (in Thousands) | Small / Big Blind | Duration | Notes |
| :--- | :---: | :---: | :---: | :--- |
| **Level 4** | `5 / 10` | `5,000 / 10,000` | **15 min** | Hour 2 • End of this level is the **1:15 mark** (Show Up `+600` awarded automatically to all seated players) |
| **Level 5** | `10 / 20` | `10,000 / 20,000` | **15 min** | Hour 2 |
| **Level 6** | `20 / 40` | `20,000 / 40,000` | **15 min** | Hour 2 |
| **Level 7** | `40 / 80` | `40,000 / 80,000` | **15 min** | Hour 2 |
| **Break 2** | — | *Break* | **10 min** | End of Hour 2 |

### Third Hour — 10-Minute Blinds
| Level | Blinds (in Thousands) | Small / Big Blind | Duration | Notes |
| :--- | :---: | :---: | :---: | :--- |
| **Level 8** | `50 / 100` | `50,000 / 100,000` | **10 min** | Hour 3 |
| **Level 9** | `100 / 200` | `100,000 / 200,000` | **10 min** | Hour 3 |
| **Level 10** | `200 / 400` | `200,000 / 400,000` | **10 min** | Hour 3 |
| **Level 11** | `400 / 800` | `400,000 / 800,000` | **10 min** | Hour 3 |

### Quick Reference — Base Points Summary
* **Attendance:** Show Up `600` • No-Game Show Up `5,000` (flat)
* **Top 5 Placements:** 1st `12,000` • 2nd `5,000` • 3rd `3,000` • 4th `1,500` • 5th `1,000`
* **Knockouts (`KO`):** Standard (`K`) `1,000` • Rebuy KO (`R`) `5,000`
* **Survivor & Hand Bonuses (`HD`):** Survivor All-In (`☆`) `500` • HOD Off-Suit (`O`) `500` • HOD Suited (`S`) `1,000` • Four of a Kind (`4`) `2,500` • Straight Flush (`F`) `5,000` • Royal Flush (`#`) `10,000`
* **Multipliers:** Single (`1x`), Double (`2x`), Triple (`3x`), stacking multiplicatively with Day Game (`DG`, `2x`) up to `6x`; `Muck` (`M`) zeroes final points (`0`).

---

## 6. Recommended Mobile App Data Models

To eliminate manual scribe arithmetic errors and enforce rule consistency, the app should structure sessions and player entries as follows:

```json
{
  "session": {
    "id": "2026-11-24-after-hours",
    "date": "2026-11-24",
    "venue": "After Hours",
    "point_multiplier": 2,
    "is_day_game": false,
    "no_game_played": false,
    "hod_rule": "Connected",
    "hot_hand_rule": "2/10 Boat",
    "purple_count": 3,
    "dealers": ["Tizzie"],
    "scribes": ["Kyle", "Chip"]
  },
  "player_entry": {
    "seat_number": 7,
    "player_id": "1665",
    "player_name": "Renee",
    "status": "ACTIVE",
    "has_dg_carryover": false,
    "earned_dg_for_next_game": false,
    "survived_rebuy": false,
    "placement": 5,
    "eliminated_by_seat": 6,
    "knockouts": ["K"],
    "hand_bonuses": ["S"],
    "calculated_base_points": 3600,
    "calculated_final_points": 7200
  }
}
```

### Key App Validation Rules
1. **Knockout Cross-Check:** When Seat A is marked as eliminated by Seat B, automatically prompt or credit Seat B with a `K` (or `R`) bonus to prevent unrecorded knockouts.
2. **DG Carryover State:** Maintain a boolean `has_dg_carryover` on each player's profile that automatically toggles `true` after playing a Day Game and applies/resets on their next session check-in.
3. **Muck Override:** Toggling a player's status to `Muck` zeroes out their points while preserving their elimination record so the player who knocked them out still retains their `K` bonus.
4. **Manual Blind Time Overrides:** The tournament clock defaults to the official 3-hour blind schedule (20m / 15m / 10m with two 10-minute breaks) while allowing authorized staff to manually override level durations or adjust remaining clock time at any point.