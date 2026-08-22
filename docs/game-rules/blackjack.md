# Casino Blackjack — Implementation Specification

**Status:** Reference spec for `try-ur-luck` (play-money social game, Arabic UI).
**Scope:** 99% fidelity to real casino blackjack. No real-money wagering, no cash-out, no purchase-to-win mechanics.
**Audience:** Engineers implementing the game engine. Written in English; Arabic player-facing terms are in §0.

> **Legal / product note.** This document describes casino rules for the purpose of building a *play-money simulation*. Payout odds below are the real casino odds and are reproduced so the simulation behaves authentically. Nothing here should be exposed to players as gambling advice, and no side bet's "house edge" should be framed as a real-money expectation.

---

## Table of Contents

0. [Terminology (EN / AR)](#0-terminology-en--ar)
1. [Table Setup](#1-table-setup)
2. [Dealing Sequence](#2-dealing-sequence)
3. [Card Values](#3-card-values)
4. [Natural Blackjack](#4-natural-blackjack)
5. [Player Options](#5-player-options)
6. [Dealer Rules](#6-dealer-rules)
7. [Resolution and Payouts](#7-resolution-and-payouts)
8. [Side Bets](#8-side-bets)
9. [House Edge Math](#9-house-edge-math)
10. [Edge Cases](#10-edge-cases-an-implementer-must-handle)
11. [Recommended Rule Set for This App](#11-recommended-rule-set-for-this-app)
12. [Implementation Checklist](#12-implementation-checklist)
13. [Sources](#13-sources)

---

## 0. Terminology (EN / AR)

| English | Arabic | Engine enum (suggested) | Meaning |
|---|---|---|---|
| Hit | سحب | `HIT` | Take one more card |
| Stand | وقوف | `STAND` | Take no more cards; hand is final |
| Double Down | مضاعفة | `DOUBLE` | Double the wager, receive exactly one card, then stand |
| Split | تقسيم | `SPLIT` | Separate a pair into two hands, each with its own equal wager |
| Surrender | استسلام | `SURRENDER` | Forfeit the hand and half the wager |
| Insurance | تأمين | `INSURANCE` | Side wager that the dealer has a natural, paying 2:1 |
| Even Money | مال متساوٍ | `EVEN_MONEY` | Guaranteed 1:1 on a player natural vs dealer ace |
| Push / Tie | تعادل | `PUSH` | Neither side wins; the wager is returned |
| Bust | احتراق | `BUST` | Hand total exceeds 21; wager lost immediately |
| Blackjack / Natural | بلاك جاك / طبيعي | `BLACKJACK` | Ace + ten-value card on the initial two cards |
| Dealer | الموزّع | — | The house hand |
| Shoe | الحذاء (صندوق الأوراق) | — | The multi-deck card dispenser |
| Hole card | الورقة المخفية | — | The dealer's face-down card |
| Upcard | الورقة الظاهرة | — | The dealer's face-up card |
| Soft hand | يد لينة | — | A hand counting an ace as 11 |
| Hard hand | يد صلبة | — | A hand with no ace, or with all aces counted as 1 |
| Wager / Bet | رهان | — | The stake on a hand |
| Shuffle | خلط | — | Randomize the shoe |
| Cut card | ورقة القطع | — | Marker that triggers a reshuffle |
| Charlie | تشارلي | — | Automatic win on N cards without busting (optional rule) |

---

## 1. Table Setup

### 1.1 Number of decks

Blackjack is dealt from 1, 2, 4, 6 or 8 standard 52-card French decks. No jokers. Every deck is a full 52 cards: 4 suits × 13 ranks.

| Configuration | Cards | Common name | Typical delivery |
|---|---|---|---|
| 1 deck | 52 | Single deck / "pitch" | Hand-held, players' cards face **down** |
| 2 decks | 104 | Double deck / "pitch" | Hand-held, players' cards face **down** |
| 4 decks | 208 | Shoe | Shoe, players' cards face **up** |
| 6 decks | 312 | Shoe (industry default) | Shoe, players' cards face **up** |
| 8 decks | 416 | Shoe (common online / Asia) | Shoe, players' cards face **up** |

Fewer decks favour the player. Relative to an 8-deck baseline, the player gains +0.48% at one deck, +0.19% at two, +0.06% at four and +0.02% at six; the total spread between 1 and 8 decks is ~0.563% ([Wizard of Odds — Rule Variations](https://wizardofodds.com/games/blackjack/rule-variations/), [Why the number of decks matters](https://wizardofodds.com/games/blackjack/why-number-of-decks-matter/)).

**Engine requirement:** deck count is a table-level configuration value, not a hard-coded constant. The shoe is a multiset of 52·N cards.

### 1.2 Shoe vs. pitch

| | Pitch game (1–2 decks) | Shoe game (4–8 decks) |
|---|---|---|
| Dealer holds cards | In hand | In a dealing shoe |
| Player cards | Dealt **face down**; player may pick them up with **one hand** | Dealt **face up**; player must **never** touch the cards |
| Signalling | Cards tucked under the bet = stand; scratched on felt = hit | Hand-signal only: tap/wave |
| Discards | Discard tray | Discard tray |

New Jersey regulation explicitly separates the two dealing procedures (hand-dealt vs. shoe-dealt) — see [N.J.A.C. 13:69F-2.6A](https://www.law.cornell.edu/regulations/new-jersey/N-J-A-C-13-69F-2-6A).

**Engine requirement:** the face-up/face-down distinction is a *presentation* concern; internally the engine always knows all player cards. Only the **dealer hole card** must be genuinely hidden from client state (see §10.12).

### 1.3 Cut card and penetration

1. After shuffling, the dealer offers the stacked decks to a player to cut with a plain plastic **cut card**.
2. The dealer re-inserts the cut card a fixed distance from the **back** of the shoe. The fraction of the shoe dealt before the cut card appears is the **penetration**.
3. When the cut card is drawn, the current round is **completed** and the shoe is reshuffled before the next round. The cut card is never dealt as a live card — it is placed in the discard tray.

| Shoe | Typical cut placement | Penetration | Quality |
|---|---|---|---|
| 6 decks | 1.5 decks cut off | 75% (~234 of 312 cards) | Industry standard |
| 6 decks | 1.2 decks cut off | 80% | Good |
| 6 decks | 0.9 decks cut off | 85% | Excellent (rare) |
| 8 decks | 2 decks cut off | 75% | Standard |
| 1–2 decks | — | 50–65% | Typical for pitch games |

Standard 6/8-deck cut placement is ~75% ([Wizard of Vegas penetration discussion](https://wizardofvegas.com/forum/gambling/blackjack/6404-six-deck-75-penetration-or-two-deck-55-penetration/); [Shoe (cards) — Wikipedia](https://en.wikipedia.org/wiki/Shoe_(cards))).

### 1.4 Shuffle rules

- The shoe **must not** be shuffled mid-round. A shuffle may only occur between rounds.
- Legal triggers for a reshuffle: (a) the cut card was reached in the previous round, (b) start of a new session, (c) a Continuous Shuffling Machine (CSM) is in use, in which case discards are returned to the machine after each round and penetration is effectively ~0.
- **Preferential shuffling** (shuffling because the remaining shoe favours players) is prohibited in regulated casinos and must not be implemented — it would make the simulation dishonest.

**Engine requirement:** use a cryptographically-seeded Fisher–Yates shuffle over the full shoe array. Never re-generate cards on demand — deal from a finite, ordered array so that composition-dependent probabilities (and all side bets) are correct.

### 1.5 Seats and betting boxes

- A standard blackjack layout has **7 betting boxes** (some layouts have 5 for "mini" tables, 6, or up to 9–12 for stadium/electronic tables).
- One player normally occupies one box, but a player may play **multiple boxes** ("multi-hand") where the house permits it; a common house cap is 3 boxes per player, and playing 2+ boxes may require betting at least 2× the table minimum on each.
- **Back-betting** (a non-seated player wagering on someone else's box) is permitted in many European casinos; the back-bettor gets no decision rights.

Reference: [PokerNews — betting limits](https://www.pokernews.com/casino/casino-terms/betting-limit.htm), [N.J.A.C. 13:69E-1.10 — Blackjack table physical characteristics](https://www.law.cornell.edu/regulations/new-jersey/N-J-A-C-13-69E-1-10).

### 1.6 Minimum and maximum bet

- Every table posts a **minimum** and **maximum** wager. Typical land-based ranges: $5–$500, $10–$1,000, $25–$2,000; high-limit $100–$25,000+; online tables often $1–$5,000.
- The min/max applies to the **initial** wager on each box. Doubles and splits add wagers that may **exceed** the table maximum (they are derived from a legal initial bet, not new bets).
- Side bets have their **own** min/max, and are usually capped at or below the main bet (commonly: side bet ≤ main bet).
- Ratio between max and min is typically 100:1 to 200:1.

**Engine requirement (play-money):** expose `tableMin`, `tableMax`, `sideBetMin`, `sideBetMax`, `maxBoxesPerPlayer`. Validate that `sideBet <= mainBet` if you adopt that constraint.

---

## 2. Dealing Sequence

### 2.1 Round lifecycle (state machine)

```
BETTING → DEAL → [INSURANCE] → [PEEK] → PLAYER_ACTIONS (per box, left→right)
        → DEALER_PLAY → RESOLUTION → PAYOUT → CLEANUP → (reshuffle?) → BETTING
```

### 2.2 Exact card distribution order (American / hole-card game)

1. **Betting closes.** All main wagers and side-bet wagers are placed and locked. No bet may be added or removed after the first card leaves the shoe.
2. Dealer deals **one card face up** to each occupied box, moving **clockwise from the dealer's left** (i.e. the player to the dealer's far left = "first base"), then **one card face up** to the dealer's own position.
3. Dealer deals a **second card face up** to each occupied box in the same order, then a **second card face down** to themselves — this is the **hole card**.

   Resulting deal order for 3 boxes: `Box1, Box2, Box3, DealerUp, Box1, Box2, Box3, DealerHole`.

   > In a **pitch (1–2 deck)** game the players' two cards are dealt **face down**.

4. **Side bets resolve now** (Perfect Pairs, 21+3, Royal Match, Lucky Ladies) — they depend only on the initial cards, not on how the hand plays out. Buster Blackjack resolves later, with the dealer's hand.
5. **Insurance offer:** if and only if the dealer's upcard is an **Ace**, the dealer announces insurance and each player may place an insurance wager of up to **half** their main wager. (Even Money is offered to players holding a natural — see §5.6.)
6. **Peek:** the dealer checks the hole card for a natural.
   - Peek occurs when the upcard is an **Ace** (always) and, in most US casinos, also when the upcard is a **ten-value card**.
   - If the dealer has a natural: the hand ends immediately. Insurance pays 2:1. All non-natural player hands lose. Player naturals push. No player takes any action.
   - If the dealer does not have a natural: insurance wagers lose immediately, and play proceeds.
7. **Player actions**, box by box, starting from the dealer's left (first base) and moving clockwise. Each box is played to completion (including all split hands) before the next box acts.
8. **Dealer reveals the hole card** and plays out their hand per §6.
9. **Resolution and payout**, box by box.

### 2.3 American (hole card) vs. European (ENHC / No-Hole-Card)

| | **American — hole card** | **European — no hole card (ENHC)** |
|---|---|---|
| When is the dealer's 2nd card dealt? | With the initial deal, face down | **After all players have finished acting** |
| Is there a peek? | Yes (on Ace, usually also on ten) | Impossible — there is no second card yet |
| Player learns of dealer BJ… | Before acting | After acting |
| If dealer draws a natural, player loses… | Only the original wager (they never got to double/split) | **Original + all double and split wagers** (standard ENHC) |
| Cost to the player | — | **≈ +0.11%** house edge |

**Consequences ENHC forces on strategy and on the engine:**
- The player may double or split into a hand that is then wiped out by a dealer natural. Every extra chip placed after the deal is at risk.
- Basic strategy changes: **hit** hard 11 vs. dealer 10, **hit** 8-8 vs. 10 and vs. A, **hit** A-A vs. A (instead of doubling/splitting).
- Sources: [Wizard of Odds — No Hole Card / No Peek](https://wizardofodds.com/ask-the-wizard/blackjack/no-peek/), [PokerNews — No Hole Card](https://www.pokernews.com/casino/casino-terms/no-hole-card.htm), [Blackjack Chart Maker — European strategy](https://blackjackchartmaker.com/european-blackjack/).

**OBO — "Original Bets Only" (a.k.a. BB+1 / "Blackjack Beats All But One"):** a softening of ENHC in which the dealer's natural takes only the **original** wager; doubled and split portions are **returned** to the player. OBO makes the game mathematically equivalent to a US peek game, so US basic strategy applies unchanged. Many UK/Australian tables and most online "European Blackjack" titles use OBO.

**Engine requirement:** implement `holeCardMode: 'PEEK' | 'ENHC' | 'ENHC_OBO'`. In `ENHC`, on dealer natural, collect `bet + doubleAdded + splitBets`. In `ENHC_OBO`, collect only `originalBet` per box and refund the rest.

---

## 3. Card Values

| Rank | Value |
|---|---|
| 2–9 | Pip value (2–9) |
| 10, J, Q, K | 10 |
| A | 1 **or** 11 |

**Suits are irrelevant to hand value.** Suits matter only for side bets (§8).

### 3.1 Soft vs. hard — the exact algorithm

A hand is **soft** if at least one ace in it is currently counted as 11. Otherwise it is **hard**.

```
function evaluate(cards):
    total  = 0
    aces   = 0
    for c in cards:
        total += min(c.rank_value, 10)     # A contributes 1 here
        if c.rank == ACE: aces += 1

    soft = false
    if aces > 0 and total + 10 <= 21:
        total += 10          # promote exactly ONE ace from 1 to 11
        soft = true

    return { total, soft, bust: total > 21 }
```

Key properties, all of which must hold in tests:

- **At most one ace can ever be counted as 11**, because two 11s = 22 > 21.
- The conversion from soft to hard is **automatic and irreversible within a hand**: the moment `total + 10 > 21`, the ace reverts to 1. Example: `A + 6` = soft 17 → draw a 10 → `A + 6 + 10` = hard 17 (not 27, and the player is *not* bust). Draw another 5 → hard 22 → bust.
- `A + A` = soft 12 (11 + 1), not 2 and not 22.
- `A + A + A` = soft 13. `A×11` = hard 21. `A×12` = hard 22 → bust.
- A soft hand can **never bust on one card**. This is why basic strategy hits soft 17 and below unconditionally.
- Display convention: show soft totals as `X/Y` (e.g. `7/17`) or as "Soft 17"; the engine's authoritative total is the highest legal one.

---

## 4. Natural Blackjack

### 4.1 Definition

A **natural** (blackjack) is an **Ace plus any ten-value card (10/J/Q/K) in the player's or dealer's first two cards**. Exactly two cards. Nothing else counts.

Probability of being dealt a natural from a fresh shoe: `2 × (1/13) × (16N / (52N − 1))`

| Decks | P(natural) |
|---|---|
| 1 | 4.8265% |
| 2 | 4.7797% |
| 6 | 4.7489% |
| 8 | 4.7451% |

### 4.2 Precedence — what beats what

| Player | Dealer | Result |
|---|---|---|
| Natural | Anything except natural | Player wins, paid **3:2** (see §7) |
| Natural | Natural | **Push** |
| 21 in 3+ cards | Natural | **Dealer wins** (a natural beats a non-natural 21) |
| 21 in 3+ cards | 21 in 3+ cards | Push |
| Any non-bust | Natural | Dealer wins |
| Natural | Bust | Player wins 3:2 (the dealer can never bust *and* hold a natural — the natural ends the round) |

A natural is settled **immediately** at the peek stage in a hole-card game — the player does not act.

### 4.3 Blackjack after a split — NOT a natural

**Rule (near-universal): a 21 made from a split hand is a regular 21, not a blackjack.**

- Split A-A, draw a K → the hand is **21**, paid **1:1**, and it **pushes** against a dealer natural if ENHC/no-peek allowed the dealer to draw one, and loses to nothing else at 21.
- Split 10-10, draw an A → the hand is **21**, paid **1:1**.
- The optional house rule "blackjack after splitting aces pays 3:2" is worth **+0.19%** to the player ([Wizard of Odds — House Edge and Rule Sets](https://wizardofodds.com/ask-the-wizard/blackjack/house-edge/)). Mark this OPTIONAL; the default is **off**.

**Engine requirement:** the `isBlackjack` predicate must be `cards.length == 2 && total == 21 && !hand.fromSplit`.

---

## 5. Player Options

Legality is evaluated **per hand**, not per box. Each split hand re-evaluates its own options.

### 5.1 Hit — سحب

- **Legal when:** the hand is live (`total < 21`, not stood, not doubled, not surrendered, not a split-ace hand under the one-card rule).
- **Effect:** one card is added. Recompute total.
  - `total > 21` → **bust**; the wager is lost **immediately**, before the dealer plays. This is the source of the house edge.
  - `total == 21` → the hand is auto-stood by most engines (optional; casinos allow but never advise hitting 21).
  - Otherwise the hand remains live and may hit again. There is **no limit** on the number of cards, subject to a Charlie rule if enabled.
- **Signal:** shoe game — tap the felt or beckon with the fingers. Pitch game — scratch the cards toward yourself.

### 5.2 Stand — وقوف

- **Legal when:** the hand is live and has at least 2 cards.
- **Effect:** the hand is final at its current total. Move to the next hand/box.
- **Signal:** wave a flat hand palm-down over the cards (shoe), or tuck the cards under the wager (pitch).

### 5.3 Double Down — مضاعفة

- **Legal when:** the hand has **exactly 2 cards**, and the player has sufficient bankroll.
- **Effect:** the player adds a **second wager equal to the original** (see §5.3.1 for "double for less"), receives **exactly one** card, and the hand is then **forced to stand** — even on a total of 4, even if it busts.
- **Which totals may be doubled** — a per-table rule:

| Variant | Description | Effect vs. DOA baseline |
|---|---|---|
| **DOA / D2** ("double on any two") | Any 2-card hand, hard or soft | 0 (baseline) |
| **D9** | Hard 9, 10, 11 only | **−0.09%** to the player |
| **D10** | Hard 10, 11 only | **−0.18%** to the player |
| **D11** | 11 only | ~−0.23% |
| No doubling | — | **−1.48%** |
| Double on any number of cards (OPTIONAL, player-friendly) | Double at any point in the hand | **+0.23%** |
| Triple down on any two cards (OPTIONAL, rare) | 3× the wager | **+1.64%** |

Source for all deltas: [Wizard of Odds — Rule Variations](https://wizardofodds.com/games/blackjack/rule-variations/).

- **DAS vs. NDAS** — "Double After Split":
  - **DAS** = doubling is permitted on hands created by a split. This is player-friendly.
  - **NDAS** = doubling after a split is forbidden. Costs the player **−0.14%**.
  - Note: **split aces cannot be doubled** even under DAS, because they receive only one card and are then closed.
- **Signal:** place a second stack of chips **beside** (never on top of) the original bet, and point one finger.

#### 5.3.1 Double for less

Some casinos allow doubling for **less than** the original wager (minimum: one chip). It is always mathematically wrong for the player, but it must be supported when the player's bankroll cannot cover a full double. **Doubling for more is never allowed.**

### 5.4 Split — تقسيم

- **Legal when:** the hand has **exactly 2 cards of the same rank** (or, under the common house rule, any two **ten-value** cards regardless of rank: 10-J, Q-K, J-K all qualify), the split limit has not been reached, and the player has bankroll for a second equal wager.
- **Effect:** the two cards are separated into two hands. A **wager equal to the original** is placed on the new hand. Each hand is dealt a second card and then played out **independently**, in order.

**Configuration knobs the engine must expose:**

| Knob | Common values | Notes |
|---|---|---|
| `maxSplits` | **3** (→ up to **4** hands) | Some tables allow 1 split only (2 hands); a few allow unlimited |
| `splitTenValueRule` | `ANY_TEN` (default) / `SAME_RANK_ONLY` | `ANY_TEN` permits 10-J; `SAME_RANK_ONLY` requires J-J |
| `resplitAces` (RSA) | **false** (default) / true | RSA is worth **+0.08%** to the player |
| `splitAcesOneCard` | **true** (default) | Split aces receive exactly one card each, then stand |
| `blackjackAfterSplitPays` | `EVEN` (default) / `3:2` | `3:2` is worth **+0.19%** |
| `das` | true (recommended) / false | NDAS costs **−0.14%** |
| `noSplitAces` | false | Forbidding ace splits costs the player **−0.18%** |

**Ace splitting — the special case:**
1. Split A-A → two hands, each with one ace.
2. Each hand receives **exactly one** card and is then **automatically closed** (no hit, no double, no further split unless RSA is on).
3. `A + 10` on a split hand = **21, paid 1:1** — *not* a blackjack (§4.3).
4. If `resplitAces` is on and the drawn card is another ace, the player may split again (up to `maxSplits`); each resulting hand still receives only one card.

**Ordering:** after splitting, most casinos play the **left-most (first) hand to completion**, then the next. Some deal the second card to both hands first. Play order affects nothing mathematically but must be deterministic and shown clearly in the UI.

- **Signal:** place a second equal stack beside the bet and make a "V" with two fingers.

### 5.5 Surrender — استسلام

Surrender forfeits the hand in exchange for **half** the wager.

| Type | Definition | Value to player |
|---|---|---|
| **Late Surrender (LS)** | Offered **after** the dealer peeks and does **not** have a natural. If the dealer has a natural, surrender is not available and the player loses the full bet. Only on the **first two cards**, before any hit/double/split. | ≈ **+0.07% to +0.08%** (6–8 decks) |
| **Early Surrender (ES)** | Offered **before** the dealer peeks — the player may surrender even when the dealer subsequently turns over a natural, and still keeps half. | ≈ **+0.62% to +0.72%** combined; the component **vs. an Ace alone is +0.39%**, vs. a ten ≈ +0.24% |

Sources: [Wizard of Odds — Rule Variations](https://wizardofodds.com/games/blackjack/rule-variations/), [BetMGM — Early & Late Surrender](https://casino.betmgm.com/en/blog/understanding-early-late-surrender-in-blackjack/).

**Rules that apply to both:**
- Only legal on a **2-card, un-acted hand**. Never after a hit, double, or split. (A handful of tables offer "surrender after split" — mark OPTIONAL, default off.)
- The player receives **50% of the wager** back; the house keeps 50%. There is no rounding up in the player's favour in casinos; for a play-money app, round half **up** to the nearest chip unit to avoid fractional currency (document the choice).
- Insurance already taken is resolved independently.
- Early surrender is essentially extinct in modern casinos because it is so strong for the player.
- **Signal:** draw a horizontal line behind the bet with a finger and say "surrender" (verbal is required — the hand signal alone is ambiguous with a stand).

### 5.6 Insurance — تأمين, and Even Money

**Insurance**
- **Offered when:** and **only** when the dealer's **upcard is an Ace**, immediately after the deal and before any player acts.
- **Amount:** up to **one half** of the original main wager (any amount from the table's insurance minimum up to `mainBet / 2`). It is a **separate wager**, placed on the "INSURANCE PAYS 2 TO 1" stripe.
- **Resolution:** the dealer peeks.
  - Dealer has a natural → insurance pays **2:1**. The main hand loses (or pushes if the player also has a natural). Net result for a player who insured the maximum: **exactly break-even**.
  - Dealer has no natural → insurance **loses immediately**; the main hand plays on normally.
- **Insurance is mathematically a bet that the hole card is a ten**, and is a losing bet at every deck count without card counting:

| Decks | Tens remaining / cards remaining | P(dealer natural) | Player EV | House edge |
|---|---|---|---|---|
| 1 | 16 / 51 | 31.3725% | −0.058824 | **5.88%** |
| 2 | 32 / 103 | 31.0680% | −0.067961 | **6.80%** |
| 4 | 64 / 207 | 30.9179% | −0.072464 | **7.25%** |
| 6 | 96 / 311 | 30.8682% | −0.073955 | **7.40%** |
| 8 | 128 / 415 | 30.8434% | −0.074699 | **7.47%** |

*(EV = 2·p − 1·(1−p) per unit staked. Break-even would require p = 1/3.)* Cross-checked against the commonly published 5.8%–7.5% range ([CasinoBeats](https://casinobeats.com/features/blackjack-insurance-explained/)).

**Even Money**
- **Offered when:** the player holds a **natural** and the dealer's upcard is an **Ace**.
- **Effect:** the player may accept an immediate **1:1** payout and end the hand, instead of risking a push against a dealer natural.
- **It is arithmetically identical to insuring a blackjack for the maximum half-bet:**
  - Dealer natural: main hand pushes (0), insurance wins +1.0 (half-bet at 2:1) → net **+1.0**.
  - No dealer natural: main hand wins +1.5, insurance loses −0.5 → net **+1.0**.
- Therefore Even Money carries the **same house edge as insurance** and should be declined by basic strategy.

**Engine requirement:** implement Even Money as a distinct UI affordance but route it through the same insurance settlement code, or settle it directly as `payout = bet` and close the hand.

### 5.7 Option-legality matrix

| Hand state | Hit | Stand | Double | Split | Surrender | Insurance |
|---|---|---|---|---|---|---|
| Initial 2 cards, no natural | ✔ | ✔ | ✔ (per D-rule) | ✔ if pair & under limit | ✔ (LS/ES if enabled) | ✔ only if dealer upcard = A |
| Initial 2 cards = natural | ✘ | auto | ✘ | ✘ | ✘ | Even Money if dealer upcard = A |
| 3+ cards, total < 21 | ✔ | ✔ | ✘ (unless "double any number of cards") | ✘ | ✘ | ✘ |
| After doubling | ✘ | auto | ✘ | ✘ | ✘ | ✘ |
| Split hand, 2 cards | ✔ | ✔ | ✔ if DAS | ✔ if under `maxSplits` | ✘ (unless surrender-after-split) | ✘ |
| Split **ace** hand | ✘ | auto after 1 card | ✘ | only if RSA | ✘ | ✘ |
| Total ≥ 21 | ✘ | auto | ✘ | ✘ | ✘ | ✘ |

---

## 6. Dealer Rules

The dealer has **no choices**. Dealer play is a fixed, deterministic algorithm — this is critical for fairness and for testability.

### 6.1 The algorithm

```
function playDealer(hand, rules):
    while true:
        { total, soft } = evaluate(hand)
        if total < 17:            draw(); continue
        if total == 17 and soft and rules.hitSoft17: draw(); continue
        break                      # stand on hard 17+, and on soft 17 if S17
```

- **S17 — "Dealer stands on all 17s."** Layout text: *"Dealer must stand on all 17's."*
- **H17 — "Dealer hits soft 17."** Layout text (mandated in New Jersey): *"Dealer must draw to 16 and soft 17 and stand on hard 17's and all 18's."* ([N.J.A.C. 13:69F-2](https://www.law.cornell.edu/regulations/new-jersey/N-J-A-C-13-69F-2-6A))
- **House-edge impact: H17 costs the player 0.22%** ([Wizard of Odds — Rule Variations](https://wizardofodds.com/games/blackjack/rule-variations/)). H17 is now the majority rule on lower-limit Las Vegas tables; S17 survives mainly on high-limit tables.
- The dealer **never** doubles, splits, surrenders, or takes insurance.
- The dealer **never** stops early because a player has a higher total; the algorithm above is absolute.

### 6.2 When the hole card is revealed

| Situation | Reveal? |
|---|---|
| Upcard = Ace (peek game) | Peeked **privately** at deal time; revealed publicly only if it is a ten (dealer natural) |
| Upcard = ten (peek game, US) | Peeked privately; revealed publicly only if it is an ace |
| After all boxes have acted | **Always turned face up**, before the dealer draws |
| ENHC game | There is no hole card; the dealer draws their second card after all boxes act |

The peek must be **information-tight**: nothing about the hole card (timing of the peek, animation length, network payload) may leak to the client. See §10.12.

### 6.3 When the dealer does not draw

The dealer **stops immediately and takes no cards** when:

1. **Every player hand has busted or surrendered.** There is nothing left to beat. The dealer collects and the round ends. (Cosmetically some casinos still turn the hole card over; no cards are drawn.)
   - **Exception:** if a **Buster Blackjack / Bust Bonus** side bet is live, the dealer *must* play out the hand to determine whether they bust. Same for any "dealer bust" side bet.
2. **The dealer has a natural** (revealed at peek). The round ends at once.
3. **Every remaining player hand is a natural** and the dealer does not have a natural → the dealer's hand is irrelevant; some casinos still play it out for side bets.
4. The dealer's first two cards already total **17–21** under the S17/H17 rule in force.

**Engine requirement:** `shouldDealerPlay = anyLivePlayerHand || anyDealerDependentSideBetLive`.

### 6.4 Dealer outcome reference

- With six decks and H17, if the dealer is forced to play out every hand, the probability the dealer busts is **28.58%** ([Wizard of Odds — Blackjack Probability](https://wizardofodds.com/ask-the-wizard/blackjack/probability/)). Under S17 it is roughly one point lower.
- Bust probability rises sharply on small upcards: the dealer busts ~**40%** of the time showing a 4 and ~**42%** showing a 5 or 6, versus ~17% showing an Ace ([Cache Creek — Blackjack odds](https://www.cachecreek.com/blackjack-odds)).
- **Do not hard-code an outcome table.** Derive dealer probabilities from your own shoe by exhaustive recursion or Monte Carlo, and use [Wizard of Odds — Dealer Odds under U.S. Rules](https://wizardofodds.com/games/blackjack/dealer-odds-blackjack-us-rules/) and [under European Rules](https://wizardofodds.com/games/blackjack/dealer-odds-blackjack-european-rules/) as the regression fixtures.

---

## 7. Resolution and Payouts

### 7.1 Settlement order

1. Busted and surrendered hands were already settled during play.
2. If the dealer busts, **every remaining non-busted player hand wins 1:1** (naturals were already paid).
3. Otherwise compare totals hand-by-hand: higher total wins, equal totals push.
4. Settle box by box, **first base → third base** (same direction as the deal). Within a box, settle split hands in play order.

### 7.2 Payout table

Payouts below are stated as **profit : stake**. "Returned" = the stake comes back too.

| Outcome | Payout | Total returned to player per 1 unit staked |
|---|---|---|
| **Natural blackjack, 3:2** | **3 : 2** (1.5×) | 2.5 |
| **Natural blackjack, 6:5** (avoid) | **6 : 5** (1.2×) | 2.2 |
| Natural blackjack, 7:5 (rare) | 7 : 5 (1.4×) | 2.4 |
| Natural blackjack, 1:1 (avoid) | 1 : 1 | 2.0 |
| Natural blackjack, 2:1 (promotional) | 2 : 1 | 3.0 |
| Regular win (incl. dealer bust) | **1 : 1** | 2.0 |
| Doubled hand win | 1 : 1 on the **doubled** stake | 4.0 (on the original unit) |
| Push / tie | — | 1.0 (stake returned) |
| Player bust | Lose | 0 (settled immediately, before the dealer plays) |
| Surrender | Lose half | **0.5** |
| Insurance win | **2 : 1** on the insurance stake | 1.5 × insurance stake |
| Insurance loss | Lose | 0 |
| Even Money | 1 : 1 | 2.0 |

**Rounding:** 3:2 on an odd stake yields a half-unit. Casinos use $0.50 chips or round in the player's favour on the smallest denomination. For play money, use **integer credits** and either (a) force even-numbered bets, or (b) round the 3:2 profit **up**. Document and test the chosen rule.

### 7.3 Blackjack 3:2 vs 6:5 — the single most important payout decision

| | 3:2 | 6:5 |
|---|---|---|
| Profit on a 100-credit blackjack | 150 | 120 |
| Effect on house edge | baseline | **+1.39%** to the house |

**1.39% is enormous.** A 6-deck S17 DAS game has a ~0.41% edge at 3:2; switching only the blackjack payout to 6:5 takes it to ~**1.80%** — more than **4× worse** for the player. In a single-deck game the Wizard measures the total edge at **1.44%** once 6:5 is applied ([Wizard of Odds — Rule Variations](https://wizardofodds.com/games/blackjack/rule-variations/); [House Edge and Rule Sets](https://wizardofodds.com/ask-the-wizard/blackjack/house-edge/)).

**Decision for this app: 3:2, always.** A play-money social game has no reason to punish the player, and 6:5 is widely recognised by players as a "bad table" tell.

### 7.4 Dealer bust

- The dealer busts on a total > 21.
- Every player hand still live (not busted, not surrendered) **wins 1:1**. Doubled hands win on the doubled stake. Split hands each win individually.
- Player hands that busted **earlier in the round still lose** even if the dealer subsequently busts. This asymmetry is the entire structural house edge in blackjack.

### 7.5 OPTIONAL variants (mark clearly in the UI if enabled)

| Optional rule | Definition | Value to player |
|---|---|---|
| **Five-card Charlie** ⭐ | Any player hand of **5 cards** totalling ≤ 21 wins immediately, beating even a dealer 21 (but generally not a dealer natural, which ends the round first) | **+1.46%** |
| Five-card Charlie, half win | 5-card Charlie pays only half, or is optional | +0.77% |
| **Six-card Charlie** | Same, with 6 cards | +0.16% |
| Seven-card Charlie | Same, with 7 cards | ~+0.01% (negligible) |
| **Player 21 is an automatic winner** | Any player 21 wins immediately, dealer does not draw | +0.54% |
| **Player 21 vs. dealer natural is a push** | Softens §4.2 row 3 | +0.35% |
| **Suited blackjacks pay 2:1** | A♠K♠ etc. | +0.57% |
| **Blackjack after split pays 3:2** | See §4.3 | +0.19% |
| **Double on any number of cards** | See §5.3 | +0.23% |
| **Push 22 / Free Bet** | A dealer bust with exactly **22** pushes all live player hands instead of losing | Large negative — see §10.10 |

All figures: [Wizard of Odds — Rule Variations](https://wizardofodds.com/games/blackjack/rule-variations/).

**Charlie implementation detail:** the Charlie check runs *after each hit*, before the player is offered another action. The hand wins immediately and is settled at 1:1 (Charlies do not pay a bonus). Interaction with double: a doubled hand has only 3 cards and can never reach a 5-card Charlie. Interaction with split: each split hand qualifies independently. Interaction with dealer natural: the dealer natural is resolved at peek time, before any Charlie can exist.

---

## 8. Side Bets

Side bets are **independent wagers** with their own stake, settled from the initial cards (or, for Buster, from the dealer's final hand). They are **not** affected by hitting, doubling, splitting or surrendering the main hand. Every side bet has a far higher house edge than the base game — 2.2% to 25% versus ~0.4%.

**Engine requirement:** resolve every 2-card side bet immediately after the deal (before insurance), except dealer-dependent bets (Buster / Bust Bonus), which resolve after §6.

### 8.1 Perfect Pairs — أزواج مثالية

Wins if the **player's first two cards** are a pair. Categories are **mutually exclusive**; only the highest pays.

| Category | Definition | Example |
|---|---|---|
| **Perfect pair** | Same rank **and** same suit | A♠ A♠ (possible only with 2+ decks) |
| **Coloured pair** | Same rank, same colour, different suit | A♠ A♣ |
| **Mixed pair** (red/black) | Same rank, different colour | A♠ A♥ |

**Exact probabilities** (N decks, second card given first): `P(perfect) = (N−1)/(52N−1)`, `P(coloured) = N/(52N−1)`, `P(mixed) = 2N/(52N−1)`.

| Decks | Perfect | Coloured | Mixed | Any pair |
|---|---|---|---|---|
| 2 | 1/103 = 0.97087% | 2/103 = 1.94175% | 4/103 = 3.88350% | 6.7961% |
| 4 | 3/207 = 1.44928% | 4/207 = 1.93237% | 8/207 = 3.86473% | 7.2464% |
| **6** | 5/311 = **1.60772%** | 6/311 = **1.92926%** | 12/311 = **3.85852%** | 7.3955% |
| **8** | 7/415 = **1.68675%** | 8/415 = **1.92771%** | 16/415 = **3.85542%** | 7.4699% |

**Pay tables and house edge** ([Wizard of Odds — Perfect Pairs](https://wizardofodds.com/games/blackjack/side-bets/perfect-pairs/)):

| Pay table | Perfect | Coloured | Mixed | HE 2 decks | HE 4 decks | HE 6 decks | HE 8 decks |
|---|---|---|---|---|---|---|---|
| **A** | 25:1 | 12:1 | 6:1 | 22.33% | 10.14% | 6.11% | 4.10% |
| **B** | 30:1 | 10:1 | 5:1 | 25.24% | 10.63% | 5.79% | 3.37% |
| **C** | 25:1 | 12:1 | 5:1 | 26.21% | 14.01% | 9.97% | 7.95% |
| **D** ⭐ best for player | 25:1 | 15:1 | 5:1 | 20.39% | 8.21% | **4.18%** | **2.17%** |

*Verification of table D, 8 decks:* `25(0.0168675) + 15(0.0192771) + 5(0.0385542) − 0.9253012 = −0.021687` → **2.17%**. ✔

**Version 2** ("Perfect Pairs" that also looks at the dealer's cards) pays 25:1 for one or two perfect pairs; house edge with 8 decks = **13.03%**.

### 8.2 21+3 — واحد وعشرون زائد ثلاثة

Combines the **player's first two cards + the dealer's upcard** into a 3-card poker hand.

**Hand definitions (3-card poker ranking):**
- **Suited three of a kind** (suited trips): same rank *and* same suit, e.g. 7♥ 7♥ 7♥ (needs 3+ decks).
- **Straight flush**: three consecutive ranks, all one suit. **A-2-3 and Q-K-A both count; K-A-2 does not.**
- **Three of a kind**: same rank, mixed suits.
- **Straight**: three consecutive ranks, mixed suits.
- **Flush**: three cards of one suit, not a straight.

Only the **highest** category pays.

**Pay table variants and house edge** ([Wizard of Odds — 21+3](https://wizardofodds.com/games/blackjack/side-bets/21plus3/)):

| Variant | Suited trips | Straight flush | Trips | Straight | Flush | HE 6 decks | HE 8 decks |
|---|---|---|---|---|---|---|---|
| **V1 — original "flat 9:1"** | — | 9:1 | 9:1 | 9:1 | 9:1 (+pair-flush) | 3.24% | 2.74% |
| **V3 — most common tiered** | 100:1 | 35:1 | 33:1 | 10:1 | 5:1 | **4.14%** | **3.18%** |
| **V4 — "21+3 Xtreme"** (avoid) | — | 30:1 | 20:1 | 10:1 | 5:1 | 13.39% | 12.89% |
| **V5 — Evolution live dealer** | 100:1 | 40:1 | 25:1 | 10:1 | 5:1 | 7.14% | 6.29% |
| **V7 — player-friendly tiered** ⭐ | 100:1 | 40:1 | 30:1 | 10:1 | 5:1 | 3.70% | **3.70%** |

**Exact combination counts — six decks** (denominator 5,013,320 = C(312,3)):

*Variant 1 (flat 9:1) breakdown:*

| Hand | Combinations | Probability | Pays | Return |
|---|---|---|---|---|
| Straight flush | 10,368 | 0.002068 | 9:1 | +0.018613 |
| Three of a kind | 26,312 | 0.005248 | 9:1 | +0.047236 |
| Straight | 155,520 | 0.031021 | 9:1 | +0.279192 |
| Flush | 236,736 | 0.047221 | 9:1 | +0.424993 |
| Pair + flush | 56,160 | 0.011202 | 9:1 | +0.100819 |
| Pair (no flush) | 977,184 | 0.194918 | Loss | −0.194918 |
| Nothing | 3,551,040 | 0.708321 | Loss | −0.708321 |
| **Total** | **5,013,320** | 1.000000 | | **−0.032386 → 3.24% HE** |

*Variant 3 (100/35/33/10/5) breakdown, six decks:*

| Hand | Pays | Combinations | Probability | Return |
|---|---|---|---|---|
| Suited three of a kind | 100 | 1,040 | 0.000207 | +0.020745 |
| Straight flush | 35 | 10,368 | 0.002068 | +0.072383 |
| Three of a kind | 33 | 25,272 | 0.005041 | +0.166352 |
| Straight | 10 | 155,520 | 0.031021 | +0.310214 |
| Flush | 5 | 292,896 | 0.058424 | +0.292118 |
| Loss | −1 | 4,528,224 | 0.903239 | −0.903239 |
| **Total** | | **5,013,320** | 1.000000 | **−0.041427 → 4.14% HE** |

*Variant 5/7 breakdown, eight decks* (denominator 11,912,160 = C(416,3)):

| Hand | Combinations | Probability | V5 pays | V7 pays |
|---|---|---|---|---|
| Suited three of a kind | 2,912 | 0.000244 | 100 | 100 |
| Straight flush | 24,576 | 0.002063 | 40 | 40 |
| Three of a kind | 61,568 | 0.005169 | 25 | 30 |
| Straight | 368,640 | 0.030947 | 10 | 10 |
| Flush | 700,928 | 0.058841 | 5 | 5 |
| Loser | 10,753,536 | 0.902736 | −1 | −1 |
| **Total EV** | | | **−0.062882 (6.29%)** | **−0.037039 (3.70%)** |

**Note the deck-count inversion:** unlike the main game, 21+3 gets *better* for the player with **more** decks (a 1-deck 21+3 V1 has a 13.30% edge; 8-deck has 2.74%), because suited trips and flushes become possible/likelier.

### 8.3 Insurance as a side bet

See §5.6 for the full derivation. Summary: **5.88% (1 deck) → 7.47% (8 decks)** house edge. It is the most frequently offered and most frequently mis-sold side bet in the game.

### 8.4 Lucky Ladies — السيدات المحظوظات

Wins if the **player's first two cards total 20**. Only the highest category pays.

| Category | Definition |
|---|---|
| Queen of Hearts pair **+ dealer blackjack** | Q♥ Q♥ **and** the dealer has a natural |
| Queen of Hearts pair | Q♥ Q♥ |
| Matched 20 | Two identical cards (same rank **and** suit) totalling 20 |
| Suited 20 | Any two-card 20 of the same suit |
| Any 20 | Any other two-card total of 20 |

**Representative pay table** (the version on most US racks):

| Hand | Pays |
|---|---|
| Q♥ Q♥ + dealer blackjack | **1000 : 1** |
| Q♥ Q♥ | **200 : 1** |
| Matched 20 | **25 : 1** |
| Suited 20 | **10 : 1** |
| Any 20 | **4 : 1** |

**House edge:** highly pay-table dependent and **very high** — Wizard's pay table A at six decks returns 75.29% (**24.71% house edge**); pay table B at six decks is **17.64%**. Commonly summarised as "~25% — a sucker bet." ([Wizard of Odds — Lucky Ladies](https://wizardofodds.com/games/blackjack/side-bets/lucky-ladies/), [Caesars Lucky Ladies rack card](https://www.caesars.com/content/dam/ccr/Gaming/tableGames/Blackjack_Lucky%20Ladies_Rack_Card.pdf), [Loto-Québec official rules](https://casinos.lotoquebec.com/dam/jcr:61d1d917-fc92-4c93-823b-8fc38fd39584/Regles_Blackjack_mise_add_Lucky-Ladies_e.pdf))

**Recommendation for this app: do not ship Lucky Ladies**, or reduce the paytable's edge substantially — a 25% edge feels punishing even with play money.

### 8.5 Buster Blackjack — بستر بلاك جاك

Wins if the **dealer busts**; the payout scales with **how many cards the dealer used** to bust. This is the only common side bet that resolves *after* the dealer plays, which means **the dealer must play out their hand even when all players have busted** whenever this bet is live.

**Representative pay table** (AGS Buster Blackjack, 6 decks):

| Dealer busts with | Pays |
|---|---|
| 3 cards | 2 : 1 |
| 4 cards | 2 : 1 |
| 5 cards | 4 : 1 |
| 6 cards | 18 : 1 |
| 7 cards | 50 : 1 |
| 8+ cards | 250 : 1 |
| Dealer does not bust | Lose |

**House edge:** **6.21%** for this pay table with six decks and H17; Evolution's Infinite Blackjack version is **6.18%**; a version paying only on 4+ card busts is **9.29%**; a 3+ card version is **13.79%**. The probability the dealer busts with **4 or more cards** is **11.27%** (1 in 8.9 hands). ([Wizard of Odds — Buster Blackjack](https://wizardofodds.com/games/blackjack/side-bets/buster-blackjack/), [AGS](https://playags.com/portfolio/buster-blackjack/), [Pechanga rack card](https://www.pechanga.com/uploads/assets/tg-rules/buster-blackjack-rack-card.pdf))

Some versions add a **Buster Blackjack bonus** paying if the *player* has a natural while the dealer busts.

### 8.6 Royal Match — الزواج الملكي

Wins if the **player's first two cards are the same suit**.

| Hand | Definition | Typical pays (multi-deck) |
|---|---|---|
| **Crown Treasure** (optional) | Player **and** dealer both hold a suited K-Q | 100:1, or a fixed jackpot ($1,000–$10,000) |
| **Royal Match** | Suited **K-Q** | **25 : 1** |
| **Easy Match / suited** | Any other two cards of the same suit | **5 : 2** (2.5:1) |

**House edge by deck count:** 1 deck **10.86%**, 2 decks **8.33%**, 4 decks **7.08%**, 6 decks **5.64%**. A rare single-deck pay table (400:1 non-royal / 1000:1 royal) is 3.77%. ([Wizard of Odds — Royal Match](https://wizardofodds.com/games/blackjack/side-bets/royal-match/), [Borgata](https://www.borgataonline.com/en/blog/how-to-use-the-royal-match-side-bet/))

### 8.7 Side-bet house-edge summary

| Side bet | Best common HE | Worst common HE | Resolves |
|---|---|---|---|
| **Perfect Pairs** (table D, 8 decks) | **2.17%** | 26.21% (table C, 2 decks) | After deal |
| **21+3** (V1, 8 decks) | **2.74%** | 13.39% (Xtreme, 6 decks) | After deal |
| 21+3 (V7, 6/8 decks) | 3.70% | — | After deal |
| **Royal Match** (6 decks) | 5.64% | 10.86% (1 deck) | After deal |
| **Buster Blackjack** | 6.18% | 13.79% | After dealer plays |
| **Insurance** (1 deck) | 5.88% | 7.47% (8 decks) | At peek |
| **Lucky Ladies** | 17.64% | 24.71% | After deal |

---

## 9. House Edge Math

All figures assume **flawless basic strategy**, **flat betting**, no card counting, and are expressed as the house's expected win per unit of the **initial** wager.

### 9.1 Baseline

**Wizard of Odds baseline rule set:** 8 decks · dealer **stands** on soft 17 · double on any first two cards · double after split · split to 4 hands · blackjack pays 3:2 · no surrender · no resplit aces → **house edge ≈ 0.43%** (this is the classic "Atlantic City" set) ([Wizard of Odds — House Edge and Rule Sets](https://wizardofodds.com/ask-the-wizard/blackjack/house-edge/), [Rule Variations](https://wizardofodds.com/games/blackjack/rule-variations/)).

### 9.2 Rule-deviation table

Sign convention: **"+" = better for the player** (reduces house edge by that amount); **"−" = worse for the player** (increases house edge).

| Rule deviation from baseline | Effect on player return |
|---|---|
| Blackjack pays 2:1 (promo) | **+2.27%** |
| Triple down on any two cards | +1.64% |
| **Five-card Charlie** | **+1.46%** |
| Optional half-win five-card Charlie | +0.77% |
| Suited blackjacks pay 2:1 | +0.57% |
| Player 21 is an automatic winner | +0.54% |
| **Single deck** | **+0.48%** |
| Early surrender against an Ace | +0.39% |
| Player 21 vs. dealer blackjack is a push | +0.35% |
| Double deck | +0.19% |
| Blackjack after split pays 3:2 | +0.19% |
| Six-card Charlie | +0.16% |
| Double on any number of cards | +0.23% |
| Player may **resplit aces** (RSA) | +0.08% |
| **Late surrender** against a ten | +0.07% |
| Four decks | +0.06% |
| Five decks | +0.03% |
| Six decks | +0.02% |
| *(Eight decks — baseline)* | *0.00%* |
| Player may double on 9–11 only | −0.09% |
| European no-hole-card (ENHC, doubles/splits lost to dealer BJ) | **−0.11%** |
| **No double after split (NDAS)** | **−0.14%** |
| Player may double on 10–11 only | −0.18% |
| Player may not split aces | −0.18% |
| **Dealer hits soft 17 (H17)** | **−0.22%** |
| **Blackjack pays 6:5** | **−1.39%** |
| Player may not double at all | −1.48% |
| Player may not double nor split | −1.91% |
| Blackjack pays 1:1 | −2.27% |
| Ties lose on 17–20 ("no push") | −8.38% (total HE 8.92%) |

Source: [Wizard of Odds — Blackjack Rule Variations](https://wizardofodds.com/games/blackjack/rule-variations/) and [House Edge and Rule Sets](https://wizardofodds.com/ask-the-wizard/blackjack/house-edge/). ENHC figure: [Wizard of Odds — No Hole Card](https://wizardofodds.com/ask-the-wizard/blackjack/no-peek/).

### 9.3 Composite house edge for common rule sets

Derived by applying §9.2 deltas to the 0.43% baseline. Round to 2 dp; treat as ±0.02%.

| Rule set | Decks | S/H17 | DAS | Surr. | BJ | **House edge** |
|---|---|---|---|---|---|---|
| Atlantic City (baseline) | 8 | S17 | ✔ | ✘ | 3:2 | **0.43%** |
| Atlantic City + LS | 8 | S17 | ✔ | LS | 3:2 | **0.36%** |
| Vegas Strip | 6 | S17 | ✔ | ✘ | 3:2 | **0.41%** |
| Vegas Strip + LS | 6 | S17 | ✔ | LS | 3:2 | **0.34%** |
| Vegas Downtown (typical modern) | 6 | H17 | ✔ | ✘ | 3:2 | **0.63%** |
| 8-deck online standard | 8 | H17 | ✔ | ✘ | 3:2 | **0.65%** |
| 6-deck H17 NDAS | 6 | H17 | ✘ | ✘ | 3:2 | **0.77%** |
| Double deck S17 DAS | 2 | S17 | ✔ | ✘ | 3:2 | **0.24%** |
| Single deck S17 DAS | 1 | S17 | ✔ | ✘ | 3:2 | **≈ 0.00%** |
| **6-deck, 6:5 blackjack** | 6 | H17 | ✔ | ✘ | **6:5** | **2.02%** |
| Single deck, 6:5 blackjack | 1 | H17 | ✘ | ✘ | 6:5 | **1.44%** (measured) |
| European ENHC, D9 only | 6 | S17 | ✔ | ✘ | 3:2 | **≈ 0.61%** |
| Free Bet Blackjack (Push 22) | 6/8 | H17 | free | ✘ | 3:2 | **≈ 1.04–1.11%** |
| Blackjack Switch (Push 22, BJ 1:1) | 6/8 | H17 | ✔ | ✘ | 1:1 | **≈ 0.58%** (with switch strategy) |

Free Bet / Switch figures: [Wizard of Odds — Free Bet Blackjack](https://wizardofodds.com/games/free-bet-blackjack/), [Blackjack Switch](https://wizardofodds.com/games/blackjack/switch/), [LiveCasinoData](https://livecasinodata.com/games/free-bet-blackjack/house-edge).

### 9.4 Where the edge actually comes from

The house edge is **not** created by the dealer's 17-rule or by the payouts. It is created by **one asymmetry**: when both the player and the dealer bust, **the player has already lost**. If the player mimicked the dealer exactly (hit to 17, no double/split, blackjack pays 1:1), the house edge would be about **5.5%**. Basic strategy claws that back to ~0.4% via:

| Player advantage | Approximate value |
|---|---|
| Blackjack paying 3:2 | +2.3% |
| Doubling down correctly | +1.6% |
| Splitting correctly | +0.5% |
| Standing on stiff hands vs. weak dealer upcards | +3.2% |
| **Player busts first (structural)** | **−5.5% to −8%** |

Use these as sanity anchors: a correctly implemented 6-deck S17 DAS engine, driven by a basic-strategy bot over 10⁷ hands, must converge to **−0.41% ± 0.05%**. This is the single best end-to-end regression test for the whole game.

---

## 10. Edge Cases an Implementer Must Handle

### 10.1 Split aces receiving a ten
`A` + `K` on a split hand = **21, not blackjack**. Pays 1:1. Pushes against a dealer's 21. Loses to a dealer natural. Unless `blackjackAfterSplitPays = 3:2` is explicitly enabled.

### 10.2 Double on a split hand
Legal only if `das = true`, only on the split hand's **first two cards**, and **never** on a split-ace hand (one card only closes it). The doubled stake is added to that split hand alone.

### 10.3 Dealer blackjack vs. player 21
A dealer natural beats a player's 3+-card 21. In a peek game the player never gets to make a 3-card 21 in this situation, since the round ends at peek. In **ENHC** it can and does happen — and the player loses their double/split money too (unless OBO).

### 10.4 Insurance when the player also has a natural
- Player holds a natural, dealer shows an Ace, player takes **full insurance** (half the main bet):
  - Dealer natural → main pushes (net 0), insurance pays 2:1 on half a bet (net +1.0) → **+1.0 unit**.
  - No dealer natural → main pays 3:2 (net +1.5), insurance loses half a bet (−0.5) → **+1.0 unit**.
- This is **exactly Even Money**. Declining is better: at 6 decks the natural's EV is `0.691318 × 1.5 + 0.308682 × 0 = +1.0370` units, versus a guaranteed `+1.0000` for Even Money — a cost of **0.037 units (~3.7% of the wager)** every time it is taken. Offer it, warn against it, never auto-take it.
- If the player insures for **less than half**, the two branches no longer net equal — compute each branch explicitly rather than shortcutting.

### 10.5 Insufficient bankroll for a double or split
- **Split:** requires a full second wager. If the bankroll cannot cover it, the split option must be **disabled** (greyed out), not silently failed. Casinos do not allow splitting for less.
- **Double:** if the bankroll cannot cover a full double, offer **"double for less"** down to the minimum chip, if you enable that rule; otherwise disable the option.
- Compute affordability against the **committed** bankroll (all boxes, all splits, all side bets already locked in this round), never the pre-round balance.
- Insurance requires up to half the main bet; if the bankroll is short, allow a partial insurance wager down to the table's insurance minimum.

### 10.6 Multi-hand resolution order
- Deal order, action order and settlement order are all **first base → third base** (dealer's left → dealer's right).
- Within a box, split hands are actioned and settled **in creation order** (leftmost first).
- Resolution must be deterministic and identical every run given the same shoe — the whole round is replayable from `(shoeSeed, actionLog)`.
- If a Charlie or a bust occurs mid-round, that hand's settlement is recorded immediately but the **balance update** should be applied in the same settlement pass to keep the ledger ordered.

### 10.7 Splitting to the maximum
With `maxSplits = 3`, a player can hold **4 hands**. Enforce the limit at the *hand count* level, not the split count, when RSA rules interact. The hand count includes the original. Guard against the pathological case where the shoe runs out mid-split.

### 10.8 Running out of cards mid-round
Never let the shoe empty. Either (a) reshuffle the discard pile back in mid-round (never done in casinos, avoid), or (b) reserve enough cards that a round cannot exhaust the shoe — the cut card at 75% penetration guarantees this in practice. Assert `shoe.length > 0` before every draw and fail loudly in tests.

### 10.9 Surrender interactions
- LS is unavailable when the dealer has a natural (the round already ended).
- Surrender after taking insurance: the insurance wager is settled on its own; surrender returns half the **main** wager only.
- Surrender is not available after any hit, double, or split (unless the optional surrender-after-split rule is enabled).

### 10.10 Push on 22 — **VARIANT, not standard blackjack**
In **Free Bet Blackjack** and **Blackjack Switch**, a dealer bust with a total of **exactly 22** is a **push** against all live player hands, rather than a win.
- Player naturals are still paid (3:2 in Free Bet; 1:1 in Switch) and are **not** affected by Push 22.
- Player hands that already busted still lose.
- In Free Bet, the compensation is **free doubles** (on hard 9/10/11) and **free splits** (on all pairs except tens) — the player places no extra chips, and wins the free portion as if it had been wagered. Net house edge ≈ **1.04–1.11%**.
- In Blackjack Switch, the compensation is the right to swap the second cards between two hands, plus blackjacks pay **1:1**.
- **Do not enable Push 22 in a standard blackjack mode.** If you ship these as separate game modes, label them clearly.
Sources: [Wizard of Odds — Free Bet Blackjack](https://wizardofodds.com/games/free-bet-blackjack/), [Push 22](https://wizardofodds.com/games/blackjack/push-22/), [Blackjack Switch](https://wizardofodds.com/games/blackjack/switch/), [Nevada GCB — Free Bet Blackjack with Push 22 Progressive, Rules of Play (PDF)](https://www.gaming.nv.gov/siteassets/content/divisions/enforcement/rules-of-play/Free_Bet_Blackjack_with_Push_22_Progressive.pdf).

### 10.11 Side-bet edge cases
- Side bets are settled from the **initial deal only** — splitting does not create a second Perfect Pairs win.
- If the dealer has a natural, 2-card side bets are **still paid** (they were already resolved). Do not swallow them.
- 21+3 needs the dealer **upcard**, which exists before the peek — resolve it at deal time.
- Buster Blackjack forces the dealer to play out the hand even when every player has busted (§6.3).
- A side bet may only be placed with a main bet on the same box.

### 10.12 Hole-card secrecy (security)
- The hole card must be dealt server-side and **never sent to the client** until reveal. Sending it "hidden" in the payload is a trivially exploitable leak.
- The peek result must not be inferable from timing, packet size, or animation duration. Peek on **every** ten and ace upcard with identical latency, even when it is a no-op.
- Use a server-authoritative shoe with a committed seed (`hash(seed)` published before the round, `seed` revealed after) if you want provable fairness.

### 10.13 Timing, disconnects and auto-play
- Define a per-decision timer. On timeout, apply a deterministic default: **stand** on any total ≥ 12, **hit** below 12, **decline** insurance, **decline** surrender. Never auto-double or auto-split (they cost the player chips).
- On disconnect, the round must still complete server-side and settle. Never void a round in progress.

### 10.14 Numeric hygiene
- All money is **integer credits**. Never use floating point for balances.
- 3:2 on an odd stake: choose and document rounding (recommend round **up** for the player).
- Surrender returns `floor(bet/2)` or `ceil(bet/2)` — pick one, test it, and keep the ledger balanced.

---

## 11. Recommended Rule Set for This App

**Optimised for: player-friendliness, comprehensibility, and short sessions on a phone.**

| Setting | Value | Justification |
|---|---|---|
| **Decks** | **6**, shoe | Industry default; players recognise it. 6 costs only 0.02% vs. 8 and shuffles/animates faster than 8. |
| **Penetration / cut card** | **75%** (reshuffle after ~4.5 decks) | Authentic, and gives the shoe a visible life-cycle the UI can show. |
| **Shuffle** | Fisher–Yates over the full shoe, CSPRNG-seeded, server-side | Verifiable fairness; supports a provably-fair commit/reveal later. |
| **Hole card** | **American peek** (`PEEK`) | Simplest for players to understand: you never lose a double to a card you couldn't see. Avoids the ENHC −0.11% and the confusing strategy exceptions. |
| **Dealer 17** | **S17** (stands on soft 17) | Saves the player 0.22%, and "dealer stands on all 17s" is a one-line rule. |
| **Blackjack pays** | **3:2** | Non-negotiable. 6:5 costs 1.39% and is read by players as predatory. |
| **Double** | **Any first two cards (DOA)** | Maximum flexibility, no memorised exceptions. |
| **DAS** | **Enabled** | +0.14% and it is what players expect after a split. |
| **Split** | Up to **3 splits / 4 hands**; any two ten-value cards may split | Standard. `ANY_TEN` is the more common and more permissive rule. |
| **Split aces** | One card each; **resplit aces enabled** | RSA is +0.08% and removes a frustrating "why can't I?" moment. |
| **Blackjack after split** | Pays **1:1** (not a natural) | Keeping this authentic preserves the meaning of "blackjack". |
| **Surrender** | **Late surrender enabled** | +0.07%, and it teaches real strategy. Hide it behind a "more options" affordance so it does not confuse new players. |
| **Insurance / Even Money** | **Offered**, with an inline warning ("التأمين رهان خاسر على المدى الطويل") | Authenticity requires it; the warning keeps it ethical. |
| **Charlie** | **Five-card Charlie ON** (OPTIONAL, clearly badged) | +1.46% — the single biggest player-friendly lever. It also produces a satisfying, shareable "moment". Badge it as a house special so players know it isn't universal. |
| **Push 22** | **Off** | It is a different game. |
| **Side bets** | **Perfect Pairs (table D)** and **21+3 (variant 7)** only | The two lowest-edge, best-known side bets. Perfect Pairs D = 4.18% at 6 decks; 21+3 V7 = 3.70%. Skip Lucky Ladies (24%) and Royal Match (5.6%) — bad value and low recognition. |
| **Side-bet cap** | `sideBet ≤ mainBet` | Prevents a play-money bankroll from being wiped by a high-variance side bet. |
| **Seats / boxes** | 5 visible boxes; 1–3 boxes per player | 7 boxes do not fit a phone screen; 5 reads well and still feels like a table. |
| **Bets** | Chip denominations 10 / 50 / 100 / 500 / 1000 credits; `tableMin = 10`, `tableMax = 5000` | Even-numbered minimums keep 3:2 payouts integral. |

**Resulting house edge:** 6 decks · S17 · DOA · DAS · RSA · LS · 3:2 · **five-card Charlie** ≈
`0.43% − 0.02 (6 decks) − 0.08 (RSA) − 0.07 (LS) − 1.46 (5-card Charlie)` ≈ **−1.20%** — i.e. **a small player advantage**.

That is intentional. With play money there is no reason to run a negative-EV economy; a slight positive expectation keeps balances healthy, reduces the pressure to sell chips, and makes sessions feel good. If you need the economy to drain (e.g. to sell cosmetic chip top-ups), turn the five-card Charlie **off** first (back to ≈ +0.26% house edge) rather than degrading blackjack to 6:5 — the Charlie is a *bonus you can remove*, whereas 6:5 is a *penalty players resent*.

**Also recommended for a social play-money app:**
- Ship a **basic-strategy hint** toggle (highlight the correct action). It makes the game teachable and is a strong retention feature.
- Show the **running count of hands played and net credits** rather than any "profit" framing.
- Never gate a rule improvement behind a purchase. Never implement an adaptive shoe that punishes winners.

---

## 12. Implementation Checklist

Each line is a single testable assertion. `⚙` = configurable, `⭐` = optional variant.

### Shoe and setup
1. The shoe contains exactly `52 × deckCount` cards, with each (rank, suit) appearing exactly `deckCount` times. ⚙
2. Shuffling uses Fisher–Yates with a CSPRNG seed and produces a uniformly random permutation.
3. Cards are dealt from the front of the shoe array and are never regenerated.
4. When the cut-card position is reached, the flag `reshufflePending` is set; the **current round completes**, then the shoe is rebuilt and reshuffled. ⚙ penetration
5. The shoe is never shuffled during a round.
6. `tableMin ≤ bet ≤ tableMax` is enforced on every initial wager. ⚙
7. `sideBet ≤ mainBet` (if that constraint is enabled) and `sideBetMin ≤ sideBet ≤ sideBetMax`. ⚙
8. A side bet cannot be placed on a box with no main bet.
9. No bet may be added, removed, or changed once the first card is dealt.

### Dealing
10. Deal order is: one card to each box left→right, one to the dealer (face up), one to each box left→right, one to the dealer (face down).
11. In a shoe game, player cards are face up; in a pitch game they are face down. ⚙
12. The dealer hole card is not present in any client-visible payload before reveal.
13. 2-card side bets (Perfect Pairs, 21+3, Royal Match, Lucky Ladies) resolve immediately after the deal and before insurance.
14. Insurance is offered **if and only if** the dealer upcard is an Ace.
15. In peek mode, the dealer peeks when the upcard is an Ace or a ten-value card, with identical observable timing in both cases. ⚙
16. In ENHC mode, no hole card exists; the dealer's second card is drawn after all boxes act. ⚙
17. In ENHC (non-OBO), a dealer natural collects the original wager **plus** all double and split wagers.
18. In ENHC-OBO, a dealer natural collects only the original wager per box; double and split additions are refunded. ⚙

### Hand evaluation
19. `evaluate([])` = 0. `evaluate([A])` = soft 11. `evaluate([A,A])` = soft 12. `evaluate([A,A,A])` = soft 13.
20. At most one ace is ever valued 11 in any hand.
21. `evaluate([A,6])` = soft 17; `evaluate([A,6,10])` = hard 17 (not bust); `evaluate([A,6,10,5])` = 22 → bust.
22. `evaluate([K,Q])` = hard 20. Suits never affect the total.
23. A soft hand never busts on a single card.
24. `isBlackjack(hand)` is true **only** when `cards.length == 2 && total == 21 && !fromSplit`.

### Naturals
25. A player natural vs. a dealer non-natural pays 3:2 (or the configured rate). ⚙
26. Natural vs. natural is a push.
27. A dealer natural beats a player's 21 made from 3+ cards.
28. A dealer natural beats every split-hand 21.
29. When the dealer has a natural in peek mode, no player takes any action and the round ends immediately.

### Player actions
30. Hit is illegal on a hand with total ≥ 21, on a stood/doubled/surrendered hand, and on a closed split-ace hand.
31. Busting settles the wager as a loss immediately, before the dealer draws.
32. Double is legal only on a 2-card hand and only for the totals permitted by the double rule. ⚙ (`DOA` / `D9` / `D10` / `D11` / none)
33. Double adds a wager equal to the original, deals exactly one card, then forces stand — including when the result busts.
34. Double is illegal on split hands when `das = false`. ⚙
35. Double is always illegal on a split-ace hand.
36. Double-for-less, when enabled, permits any added stake from one chip up to the original wager, and never more. ⚙
37. Split is legal only on a 2-card hand of equal rank, or (under `ANY_TEN`) on any two ten-value cards. ⚙
38. Split creates a second hand with a wager equal to the original and deals one card to each hand.
39. The number of hands per box never exceeds `maxSplits + 1`. ⚙ (default 4)
40. Split aces receive exactly one card each and are then closed to all further action.
41. Resplitting aces is possible only when `resplitAces = true`, and each resulting hand still receives only one card. ⚙
42. A 21 on any split hand is settled at 1:1, unless `blackjackAfterSplitPays = 3:2`. ⚙
43. Split hands are played and settled in creation order, leftmost first.
44. Late surrender is offered only on an un-acted 2-card hand, and only after the peek confirms the dealer has no natural. ⚙
45. Early surrender, when enabled, is offered **before** the peek and still returns half the wager even when the dealer turns over a natural. ⚙
46. Surrender returns exactly half the wager and closes the hand.
47. Surrender is illegal after any hit, double, or split.
48. Insurance may be any amount from the insurance minimum up to `mainBet / 2`.
49. Insurance pays 2:1 when the dealer has a natural and loses otherwise; it is settled independently of the main hand.
50. Even Money is offered only when the player has a natural and the dealer shows an Ace, and settles the hand at exactly 1:1.

### Dealer play
51. The dealer draws while the total is < 17.
52. Under S17, the dealer stands on soft 17; under H17, the dealer draws on soft 17. ⚙
53. The dealer stands on all hard 17+ and all 18+.
54. The dealer never doubles, splits, surrenders, or insures.
55. The dealer does not draw when every player hand has busted or surrendered — **unless** a dealer-dependent side bet (Buster / Bust Bonus) is live.
56. The dealer does not draw when the dealer has a revealed natural.
57. The hole card is turned face up before the dealer's first draw.
58. Dealer play is fully deterministic given the hand and the shoe.

### Resolution and payouts
59. A dealer bust pays 1:1 to every remaining non-busted, non-surrendered player hand.
60. A player who busted earlier still loses when the dealer subsequently busts.
61. Equal totals push and the stake is returned.
62. Doubled hands win/lose/push on the full doubled stake.
63. Settlement order is box order (first base → third base), then split-hand creation order within a box.
64. All balances are integer credits; no floating-point money.
65. 3:2 payouts on odd stakes round according to the documented rule and the ledger always balances.
66. ⭐ Five-card Charlie: a 5-card hand ≤ 21 wins immediately at 1:1, checked after each hit, and cannot occur on a doubled hand. ⚙
67. ⭐ Push 22 (Free Bet / Switch modes only): a dealer bust of exactly 22 pushes all live player hands; player naturals are unaffected; already-busted hands still lose. ⚙

### Side bets
68. Perfect Pairs categories are mutually exclusive and only the highest pays; probabilities match `(N−1)/(52N−1)`, `N/(52N−1)`, `2N/(52N−1)`.
69. 21+3 evaluates exactly `[playerCard1, playerCard2, dealerUpcard]` and only the highest category pays.
70. 21+3 straights treat A-2-3 and Q-K-A as straights and K-A-2 as not a straight.
71. Side bets are unaffected by hit/stand/double/split/surrender on the main hand.
72. Side bets still pay when the dealer has a natural.
73. Buster Blackjack forces the dealer to play out the hand even when all player hands are dead.
74. Every side-bet paytable is data, not code, and its simulated return matches the published house edge within ±0.05% over 10⁷ trials.

### Bankroll and safety
75. Split is disabled (not silently failed) when the bankroll cannot cover the second wager.
76. Double is disabled, or offered as double-for-less, when the bankroll cannot cover a full double. ⚙
77. Affordability is computed against the bankroll already committed this round, across all boxes and splits.
78. A decision timeout applies a deterministic default (stand ≥12, hit <12, decline insurance, decline surrender) and never auto-doubles or auto-splits.
79. A disconnected player's round still completes and settles server-side.
80. The shoe never runs out mid-round; an assertion fires in tests if it would.

### End-to-end validation
81. A basic-strategy bot over 10⁷ hands on 6 decks · S17 · DOA · DAS · no surrender · 3:2 converges to a house edge of **0.41% ± 0.05%**.
82. Flipping only `hitSoft17 = true` moves that result by **+0.22% ± 0.03%**.
83. Flipping only `das = false` moves it by **+0.14% ± 0.03%**.
84. Flipping only `blackjackPays = 6:5` moves it by **+1.39% ± 0.05%**.
85. Enabling only `fiveCardCharlie` moves it by **−1.46% ± 0.05%**.
86. Enabling only `resplitAces` moves it by **−0.08% ± 0.03%**.
87. Insurance simulated over 10⁷ dealer-ace hands returns **−7.40% ± 0.05%** at 6 decks and **−7.47%** at 8 decks.
88. Perfect Pairs table D returns **−4.18% ± 0.05%** at 6 decks and **−2.17%** at 8 decks.
89. 21+3 variant 3 returns **−4.14% ± 0.05%** at 6 decks; variant 1 returns **−3.24%** at 6 decks and **−2.74%** at 8 decks.
90. The full round is replayable and byte-identical from `(shoeSeed, actionLog)`.

---

## 13. Sources

**Primary mathematical authority — Wizard of Odds (Michael Shackleford)**
- Blackjack rules and basics — https://wizardofodds.com/games/blackjack/basics/
- Blackjack Rule Variations (the house-edge delta table) — https://wizardofodds.com/games/blackjack/rule-variations/
- House Edge and Rule Sets — https://wizardofodds.com/ask-the-wizard/blackjack/house-edge/
- House Edge Calculator (6,912 rule combinations) — https://wizardofodds.com/games/blackjack/calculator/
- Why the number of decks matters — https://wizardofodds.com/games/blackjack/why-number-of-decks-matter/
- No Hole Card / No Peek — https://wizardofodds.com/ask-the-wizard/blackjack/no-peek/
- Dealer Odds under U.S. Rules — https://wizardofodds.com/games/blackjack/dealer-odds-blackjack-us-rules/
- Dealer Odds under European Rules — https://wizardofodds.com/games/blackjack/dealer-odds-blackjack-european-rules/
- Blackjack Probability — https://wizardofodds.com/ask-the-wizard/blackjack/probability/
- Blackjack Variants — https://wizardofodds.com/ask-the-wizard/blackjack/variants/
- Special Rules and Promotions — https://wizardofodds.com/ask-the-wizard/blackjack/special-rules/
- European Blackjack basic strategy — https://wizardofodds.com/games/blackjack/strategy/european/

**Side bets — Wizard of Odds**
- 21+3 — https://wizardofodds.com/games/blackjack/side-bets/21plus3/
- Perfect Pairs — https://wizardofodds.com/games/blackjack/side-bets/perfect-pairs/
- Lucky Ladies — https://wizardofodds.com/games/blackjack/side-bets/lucky-ladies/
- Buster Blackjack — https://wizardofodds.com/games/blackjack/side-bets/buster-blackjack/
- Royal Match — https://wizardofodds.com/games/blackjack/side-bets/royal-match/
- Blackjack side bets index — https://wizardofodds.com/games/blackjack/side-bets/
- Blackjack side bets Q&A — https://wizardofodds.com/ask-the-wizard/blackjack/side-bets/

**Variants**
- Free Bet Blackjack — https://wizardofodds.com/games/free-bet-blackjack/
- Push 22 — https://wizardofodds.com/games/blackjack/push-22/
- Blackjack Switch — https://wizardofodds.com/games/blackjack/switch/
- Blackjack Switch (Wikipedia) — https://en.wikipedia.org/wiki/Blackjack_Switch
- Free Bet Blackjack house edge — https://livecasinodata.com/games/free-bet-blackjack/house-edge

**Regulatory / official rule documents**
- Nevada Gaming Control Board — Rules of Play for Approved Games — https://www.gaming.nv.gov/divisions/gaming-lab/approved-games/
- Nevada GCB — Free Bet Blackjack with Push 22 Progressive, Rules of Play (PDF) — https://www.gaming.nv.gov/siteassets/content/divisions/enforcement/rules-of-play/Free_Bet_Blackjack_with_Push_22_Progressive.pdf
- Nevada Gaming Commission — All Regulations (PDF) — https://gaming.nv.gov/uploadedFiles/gamingnvgov/content/regs/AllRegulations.pdf
- Nevada GCB — Minimum Internal Control Standards, Table Games (PDF) — https://gaming.nv.gov/uploadedFiles/gamingnvgov/content/divisions/audit/mics/v9-table-games.pdf
- N.J.A.C. 13:69F-2.6A — Procedure for dealing cards from the dealer's hand — https://www.law.cornell.edu/regulations/new-jersey/N-J-A-C-13-69F-2-6A
- N.J.A.C. 13:69E-1.10 — Blackjack table; card reader device; physical characteristics — https://www.law.cornell.edu/regulations/new-jersey/N-J-A-C-13-69E-1-10
- New Jersey DGE — Free Bet Blackjack temporary regulations (PDF) — https://www.nj.gov/oag/ge/docs/TempRegs/freebetblackjacktext.pdf
- Loto-Québec — Official Lucky Ladies side bet rules (PDF) — https://casinos.lotoquebec.com/dam/jcr:61d1d917-fc92-4c93-823b-8fc38fd39584/Regles_Blackjack_mise_add_Lucky-Ladies_e.pdf

**Casino rule sheets and secondary references**
- Blackjack Apprenticeship — Lucky Ladies analysis (PDF) — https://www.blackjackapprenticeship.com/wp-content/uploads/2019/05/Lucky-Ladies.pdf
- Caesars — Lucky Ladies rack card (PDF) — https://www.caesars.com/content/dam/ccr/Gaming/tableGames/Blackjack_Lucky%20Ladies_Rack_Card.pdf
- Pechanga — Buster Blackjack rack card (PDF) — https://www.pechanga.com/uploads/assets/tg-rules/buster-blackjack-rack-card.pdf
- AGS — Buster Blackjack — https://playags.com/portfolio/buster-blackjack/
- Borgata — Royal Match side bet — https://www.borgataonline.com/en/blog/how-to-use-the-royal-match-side-bet/
- BetMGM — Early & Late Surrender explained — https://casino.betmgm.com/en/blog/understanding-early-late-surrender-in-blackjack/
- CasinoBeats — Blackjack insurance explained — https://casinobeats.com/features/blackjack-insurance-explained/
- Cache Creek — Blackjack odds — https://www.cachecreek.com/blackjack-odds
- PokerNews — No Hole Card — https://www.pokernews.com/casino/casino-terms/no-hole-card.htm
- PokerNews — Betting limits — https://www.pokernews.com/casino/casino-terms/betting-limit.htm
- Blackjack Chart Maker — European (no-hole-card) strategy — https://blackjackchartmaker.com/european-blackjack/
- Wizard of Vegas — 6-deck 75% penetration discussion — https://wizardofvegas.com/forum/gambling/blackjack/6404-six-deck-75-penetration-or-two-deck-55-penetration/
- Wikipedia — Shoe (cards) — https://en.wikipedia.org/wiki/Shoe_(cards)

---

*Compiled August 2026. All house-edge figures assume perfect basic strategy and flat betting. Verify every number against your own simulator before shipping — the checklist in §12 exists for exactly that purpose.*
