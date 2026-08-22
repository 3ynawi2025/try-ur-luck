# Three Card Poker — Implementation Specification

> Also marketed as **Tri Card Poker**, **Poker Three**, **3 Card Poker**.
> Invented by Derek Webb (1994); currently owned/licensed by Shuffle Master / Scientific Games / **Light & Wonder**.
>
> **Scope:** play-money social mobile game (Arabic UI). No real-money wagering, no cash-out. All house-edge figures below are retained purely to preserve mathematical fidelity to the casino game and to calibrate the play-money economy.
>
> **Status:** greenfield — this game does not yet exist in the codebase.

---

## Table of contents

1. [Game overview](#1-game-overview)
2. [Betting structure](#2-betting-structure)
3. [Hand rankings](#3-hand-rankings-for-3-card-poker)
4. [Dealing and play sequence](#4-dealing-and-play-sequence)
5. [Dealer qualification and settlement](#5-dealer-qualification-and-settlement)
6. [Full paytables](#6-full-paytables)
7. [House edge and return](#7-house-edge-and-return)
8. [Optimal player strategy — the Q-6-4 rule](#8-optimal-player-strategy--the-q-6-4-rule)
9. [Edge cases](#9-edge-cases-an-implementer-must-handle)
10. [Recommended configuration](#10-recommended-configuration-for-a-social-play-money-app)
11. [Arabic terminology](#11-arabic-terminology-مصطلحات-عربية)
12. [TypeScript interface sketch](#12-typescript-interface-sketch)
13. [Implementation checklist](#13-implementation-checklist)
14. [Sources](#14-sources)

### Verification note

Every probability, combination count, house-edge and element-of-risk figure in this document was **independently recomputed by exhaustive enumeration** (all 22,100 three-card hands × all 18,424 remaining dealer hands = 407,222,600 player/dealer pairs) and matched the published Wizard of Odds values to the last printed digit. Numbers marked **(verified)** are exact, not rounded estimates from a source.

---

## 1. Game overview

| Property | Value |
|---|---|
| Deck | **One standard 52-card deck**, no jokers, reshuffled every round |
| Opponents | **Player vs. dealer only.** Multiple seats may play simultaneously, but each player's hand is compared *only* to the dealer's hand. Players never compete against each other. |
| Cards per hand | **3** to the player, **3** to the dealer |
| Decision points | **Exactly one** — after seeing their three cards, the player either makes the Play wager or folds |
| Drawing / discarding | **None.** No replacement cards, no community cards |
| Dealer hand | Dealt **face down**, revealed only after all players have acted |
| Dealer decision-making | **None.** The dealer never chooses anything; qualification is a fixed rule |
| Round length | One deal, one decision, one showdown |

Three Card Poker is best understood as **two independent games played from the same three cards**:

- **Game A — the "base game":** Ante + Play, a head-to-head comparison against the dealer, with an automatic Ante Bonus for premium hands.
- **Game B — the "side bets":** Pair Plus and 6 Card Bonus, which pay from a fixed paytable and (for Pair Plus) ignore the dealer entirely.

A player may play Game A alone, Game B alone, or both. In the most common casino rule set the player may place a Pair Plus wager with no Ante at all ([Massachusetts Gaming Commission §6(a)(2)](https://massgaming.com/wp-content/uploads/Three-Card-Poker-7-26-18.pdf)) — though some houses require an Ante as a precondition (§6(f)).

---

## 2. Betting structure

### 2.1 The four wagers

| Wager | Mandatory? | Placed when | Amount | Compared against | Resolves if player folds? |
|---|---|---|---|---|---|
| **Ante** | Required to play the dealer | Before the deal | Table min ≤ A ≤ table max | Dealer's hand | Yes — **lost** |
| **Play** (a.k.a. Raise / Bet) | Optional; the fold alternative | After seeing own cards | **Must exactly equal the Ante** | Dealer's hand | N/A — never placed |
| **Ante Bonus** | Automatic, not a separate wager | — | Paid as a multiple of the **Ante** | Paytable only (player's own hand) | **No** — requires the Play wager |
| **Pair Plus** | Optional standalone side bet | Before the deal | Table min ≤ P ≤ table max | Paytable only (player's own hand) | **Yes** — resolves normally |
| **6 Card Bonus** | Optional side bet | Before the deal | Table min ≤ B ≤ table max | Paytable, using player's 3 + dealer's 3 | **Yes** — resolves normally |

### 2.2 How they interact

```
                    ┌──────────── player's 3 cards ────────────┐
                    │                                          │
  ANTE ──► compare vs dealer ──► win / lose / push             │
    │                                                          │
    ├──► PLAY (= Ante) ──► compare vs dealer, OR push if dealer doesn't qualify
    │                                                          │
    └──► ANTE BONUS ──► paytable, paid on the Ante, dealer irrelevant
                                                               │
  PAIR PLUS ──────────────────────────────────────► paytable ◄─┘
                                                               │
  6 CARD BONUS ──► best 5-card hand from player's 3 + dealer's 3 ◄─┐
                                                                   │
                    └──────────── dealer's 3 cards ────────────────┘
```

Key interaction rules:

1. **Play must equal Ante exactly.** Not "at least", not "up to 3×" — *exactly* one times the Ante. Source: [MA §1 "Play wager" definition](https://massgaming.com/wp-content/uploads/Three-Card-Poker-7-26-18.pdf) — *"an additional wager, equal in value to his or her ante wager."*
2. **Pair Plus is fully independent of the Ante/Play outcome.** A player can lose the Ante and Play to the dealer and still be paid 40:1 on Pair Plus in the same round — the Pair Plus bet *"depends only on the three cards dealt to the player—the dealer's cards are irrelevant"* ([Pagat](https://www.pagat.com/banking/3cardpoker.html)).
3. **Ante Bonus is paid on the Ante wager**, is *not* a separate stake, and is paid **even when the dealer does not qualify** and **even when the dealer beats the player**. It is *not* reduced or forfeited by losing the showdown.
4. **The Ante Bonus does require the Play wager to have been made.** Per MA §11(a)(3): *"A player placing an ante wager **and a play wager** shall be paid a bonus…"* This is mathematically moot — no correct strategy ever folds a straight or better — but the implementation must still define it. See [§9](#9-edge-cases-an-implementer-must-handle).
5. **6 Card Bonus needs the dealer's cards**, so it must be settled *after* the dealer's hand is exposed, even for players who folded. MA §6(g)(2): *"Player is eligible to win the wager even if they fold their Ante wager."* MA §6(g)(3) additionally requires the player to have made the standard (Ante) wager in order to place the 6 Card Bonus.

---

## 3. Hand rankings for 3-Card Poker

### 3.1 The ranking order

**Highest to lowest:**

```
Straight Flush  >  Three of a Kind  >  Straight  >  Flush  >  Pair  >  High Card
```

This is **not** the 5-card poker order. Two inversions relative to 5-card poker:

- A **straight beats a flush** (opposite of 5-card poker).
- **Three of a kind beats a straight** and is beaten only by a straight flush (in 5-card poker, trips sit below both straights and flushes).

There is **no** two pair, full house, or four of a kind — they are impossible with three cards.

### 3.2 Exact combinations and probabilities

Total three-card hands: **C(52,3) = 22,100**.

| Rank | Hand | Derivation | Combinations | Probability | Odds |
|---:|---|---|---:|---:|---|
| 1 | **Straight flush** | 12 sequences × 4 suits | **48** | 0.217195% | 1 in 460.42 |
| 2 | **Three of a kind** | 13 ranks × C(4,3) | **52** | 0.235294% | 1 in 425.00 |
| 3 | **Straight** | 12 seq × 4³ − 48 = 768 − 48 | **720** | 3.257919% | 1 in 30.69 |
| 4 | **Flush** | 4 suits × C(13,3) − 48 = 1,144 − 48 | **1,096** | 4.959276% | 1 in 20.16 |
| 5 | **Pair** | 13 × C(4,2) × 48 | **3,744** | 16.941176% | 1 in 5.90 |
| 6 | **High card** (ace-high or less) | (C(13,3) − 12) × (4³ − 4) = 274 × 60 | **16,440** | 74.389140% | 1 in 1.34 |
| | **Total** | | **22,100** | 100.000000% | |

*(verified by exhaustive enumeration)*

Sub-category, used by some paytables:

| Sub-hand | Combinations | Probability | Odds |
|---|---:|---:|---|
| **Mini Royal** (suited A-K-Q) — a subset of straight flush | **4** | 0.018100% | 1 in 5,525 |
| Straight flush *excluding* Mini Royal | 44 | 0.199095% | 1 in 502.27 |

Two derived counts every implementation needs:

| Quantity | Value | Probability |
|---|---:|---:|
| Hands that **qualify the dealer** (Queen-high or better) | **15,380** | 69.5928% |
| Hands that **win Pair Plus** (pair or better) | **5,660** | 25.6109% |

### 3.3 Why a straight beats a flush here — the actual reason

**Hand rankings in poker are always ordered by rarity: the rarer hand ranks higher.** With three cards, the relative rarity of straights and flushes flips.

| | Straights | Flushes | Which is rarer? |
|---|---:|---:|---|
| **3-card game** (C(52,3) = 22,100) | **720** (3.258%) | **1,096** (4.959%) | **Straight** → straight ranks higher |
| **5-card game** (C(52,5) = 2,598,960) | 10,200 (0.392%) | 5,108 (0.197%) | Flush → flush ranks higher |

The mechanism:

- A **flush** with 3 cards needs only three cards of one suit — there are C(13,3) = 286 rank-combinations per suit, so 4 × 286 = **1,144** suited hands. Suits are 13 cards deep, so three-of-one-suit is comparatively easy.
- A **straight** with 3 cards needs three *specific consecutive ranks*. There are only **12** valid sequences (A-2-3 through Q-K-A), and each can be made in 4³ = 64 suit arrangements → **768** hands.
- 768 < 1,144, therefore straights are rarer, therefore straights outrank flushes.

Adding two more cards reverses this: extending a *suit run* to five cards is much harder (you need 5 of 13) than extending a *rank run* to five (10 sequences × 4⁵ arrangements), so in the 5-card game the flush becomes the rarer hand.

The same rarity principle explains **three of a kind (52) beating a straight (720)** and being beaten only by **straight flush (48)** — the entire 3-card ranking ladder is exactly the ascending order of combination counts: 48 < 52 < 720 < 1,096 < 3,744 < 16,440.

### 3.4 Card rank and the ace

| Rule | Statement | Source |
|---|---|---|
| Rank order | A > K > Q > J > 10 > 9 > 8 > 7 > 6 > 5 > 4 > 3 > 2 | MA §3(a) |
| Suits | **All four suits are equal in rank.** Suits never break a tie. | MA §3(a) |
| Ace high | Ace is the highest card for high-card and pair comparisons | MA §3(a) |
| **Ace low** | *"an ace may be used to complete a 'straight flush' or a 'straight' with a two and three."* → **A-2-3 IS a valid straight** (the lowest one) | MA §3(a) |
| Highest straight | **A-K-Q** (not K-Q-J) | MA §3(b)(1), §3(b)(3) |
| Lowest straight | **3-2-A** | MA §3(b)(1), §3(b)(3) |
| Not a straight | **Q-K-A wraparound already counted; K-A-2 is NOT a straight.** *"2-A-K is not a straight."* | [Pagat](https://www.pagat.com/banking/3cardpoker.html) |

> **Answer to the question posed:** the ace is **both high and low** — high for ranking, and low *only* to complete A-2-3. It is **not** a wheel-style dual usage beyond that. Cited: [MA Gaming Commission Three Card Poker rules §3(a)](https://massgaming.com/wp-content/uploads/Three-Card-Poker-7-26-18.pdf) and [Pagat](https://www.pagat.com/banking/3cardpoker.html).

An A-2-3 straight ranks **below** 2-3-4; a suited A-2-3 straight flush ranks **below** a suited 2-3-4 straight flush. For scoring purposes, treat the A in A-2-3 as rank value 3-high (i.e. the straight's high card is the 3).

### 3.5 Tie-breaking within a rank category

| Category | Comparison procedure |
|---|---|
| **Straight flush** | Compare the straight's high card. A-K-Q high > … > 3-2-A low. Suits never break a tie → equal high card = **draw**. |
| **Three of a kind** | Compare the triplet rank. Cannot tie in a single 52-card deck (only 4 of each rank exist, so two players cannot both hold trips of the same rank). |
| **Straight** | Compare the straight's high card. Equal high card = **draw**. |
| **Flush** | Compare highest card; if equal, second card; if equal, third card. Equal on all three = **draw**. |
| **Pair** | **First compare the rank of the pair; only if the pairs are equal, compare the odd card ("kicker").** Equal pair + equal kicker = **draw**. |
| **High card** | Compare highest card; if equal, second; if equal, third. Equal on all three = **draw**. |

Sources: [Pagat](https://www.pagat.com/banking/3cardpoker.html) — *"When comparing two hands with a pair, the rank of the pair decides; if both hands have equal pairs, the hand with the better odd card ('kicker') wins."* and *"the highest cards are compared first; if they are equal the middle cards are compared and finally the lowest cards."* MA §3(c) gives an equivalent, more terse "highest card not contained in the other hand" formulation.

> ⚠️ **Implementer warning — the pair case is the classic bug.** A naive "sort descending, compare element-wise" comparator produces the **wrong** answer for pairs. Counter-example: `K♠ K♦ 2♣` (pair of kings) vs `A♥ Q♠ Q♦` (pair of queens). Sorted descending: `K,K,2` vs `A,Q,Q`. Element-wise comparison sees A > K and wrongly awards the hand to the queens. The pair of **kings** wins. The comparator **must** put the pair rank first, then the kicker. See the `handKey()` function in [§12](#12-typescript-interface-sketch).

---

## 4. Dealing and play sequence

### 4.1 Canonical round sequence

| # | Step | Actor | Notes |
|---:|---|---|---|
| 1 | Shuffle a full 52-card deck | System | Fisher–Yates with a CSPRNG. Fresh full deck **every round** — cards are never carried over. |
| 2 | **Betting window opens.** Player places **Ante** and/or **Pair Plus**, and optionally **6 Card Bonus** | Player | All of these must be locked in *before any card is dealt*. |
| 3 | **"No more bets."** Betting window closes | System | MA §6(d): *"No wager shall be made, increased, or withdrawn after the dealer has announced 'No more bets.'"* |
| 4 | Deal **one card at a time**, in rotation, to each active player and then the dealer, until each has **3 cards** — **all face down** | Dealer | MA §7(c) |
| 5 | Player turns their three cards face up **to themselves only** | Player | Dealer's three cards remain face down. |
| 6 | **Decision:** place a **Play** wager equal to the Ante, **or fold** | Player | Exactly one decision. No raise sizing, no check. |
| 7 | Forfeited (folded) Antes and their cards are collected | Dealer | MA §10(b) |
| 8 | **Dealer reveals** all three cards | Dealer | Only now. Never before every player has acted. |
| 9 | Evaluate dealer qualification (Queen-high or better) | System | |
| 10 | Settle **Ante + Play** per the matrix in §5 | System | |
| 11 | Pay **Ante Bonus** on the Ante for straight-or-better | System | Independent of steps 9–10. |
| 12 | Settle **Pair Plus** from the paytable | System | Including for folded players. |
| 13 | Settle **6 Card Bonus** using player's 3 + dealer's 3 | System | Including for folded players. |
| 14 | Collect all cards; round ends | System | |

### 4.2 Settlement ordering (important for UI and for animation)

Settle and animate in this order so the player can follow the logic:

```
1. Pair Plus        (player's hand only — can resolve before dealer reveal for drama)
2. Dealer reveal
3. Qualification banner  ("الموزع لم يتأهل" / "الموزع تأهل")
4. Ante + Play showdown
5. Ante Bonus
6. 6 Card Bonus
```

Pair Plus is the only wager that *can* legitimately be resolved and shown before the dealer's cards are exposed. Consider using this: reveal Pair Plus wins immediately for a hit of dopamine, then build tension on the showdown.

---

## 5. Dealer qualification and settlement

### 5.1 The qualification rule

> **The dealer qualifies with Queen-high or better.**

Formally, the dealer qualifies if their hand is **greater than or equal to Q-3-2 offsuit** — i.e.:

```
qualifies = (category >= PAIR) OR (highest card rank >= QUEEN)
```

Any pair, flush, straight, trips or straight flush automatically qualifies (every such hand outranks Q-high regardless of its cards). For a high-card hand, only the top card matters: Q-3-2 qualifies; J-10-9 does **not**.

- Dealer-qualifying hands: **15,380 / 22,100 = 69.5928%** (verified, unconditional).
- Under the Q-6-4 player strategy, the dealer fails to qualify on **20.9970%** of *all* rounds and on **31.14%** of rounds the player actually plays.

Source: [MA §11(a)(1)](https://massgaming.com/wp-content/uploads/Three-Card-Poker-7-26-18.pdf) — *"if the dealer does not hold a hand with a 'queen high or better' rank, the ante wager shall automatically be paid 1 to 1 and the play wager shall be returned to the player."*

### 5.2 Complete Ante + Play settlement matrix

Let `A` = Ante amount, `P` = Play amount (`P == A`).

| # | Situation | Ante | Play | Net (excluding Ante Bonus) |
|---:|---|---|---|---|
| 1 | **Player folded** | **Lost** (−A) | not placed | **−A** |
| 2 | **Dealer does NOT qualify** | **Wins 1:1** (+A) | **Push** — returned in full | **+A** |
| 3 | **Dealer qualifies, player's hand is higher** | **Wins 1:1** (+A) | **Wins 1:1** (+P) | **+2A** |
| 4 | **Dealer qualifies, dealer's hand is higher** | **Lost** (−A) | **Lost** (−P) | **−2A** |
| 5 | **Dealer qualifies, hands are exactly equal (draw)** | **Push** — returned | **Push** — returned | **0** |

Notes on each row:

- **Row 2 is the counter-intuitive one.** When the dealer fails to qualify, the *player's hand does not matter at all*. The player wins even money on the Ante and gets the Play bet back untouched — even if the player would have lost the showdown, and even if the player would have won it. This is the single largest source of confusion for new players and **must** be explained clearly in the UI. It also means a strong hand is partially "wasted" when the dealer doesn't qualify: the player collects only +1 unit instead of +2.
- **Row 5:** *"When hands are equal, the player's ante and play bets are returned"* ([Pagat](https://www.pagat.com/banking/3cardpoker.html)); MA §3(c): *"the hands shall be considered a draw."* Exact draws are extremely rare — **0.0657%** of rounds (verified). Do not skip implementing this; it is reachable and will be hit in production.
- **Rows 3/4/5 apply only when the dealer qualifies.** Never compare hands before checking qualification.

### 5.3 Ante Bonus settlement (orthogonal to the matrix above)

The Ante Bonus is paid on top of whatever row 1–5 produced, using the player's own hand:

| Condition | Ante Bonus |
|---|---|
| Player folded | **Not paid** (see §9) |
| Player made the Play wager AND holds **straight or better** | **Paid**, at the paytable rate × Ante — *regardless of whether the dealer qualified, and regardless of whether the player won or lost the showdown* |
| Player made the Play wager AND holds flush or worse | Not paid |

> *"Even if a player has a losing hand compared to the dealer, s/he will still receive his/her Ante bonus, if applicable."* — [Upswing Poker](https://upswingpoker.com/three-card-poker-rules-strategy/)
> *"An additional bonus is also paid on the ante bet irrespective of dealer's hand or outcome of the hand."* — [Pagat](https://www.pagat.com/banking/3cardpoker.html)

**Worked example of the interaction.** Player antes 10, plays 10, holds `9♥ 10♥ J♥` (straight flush). Dealer holds `A♠ A♦ 4♣` (pair of aces) — dealer qualifies and… loses, because a straight flush outranks a pair. Player collects: Ante +10, Play +10, Ante Bonus +50 (5:1) = **+70**.

Now the same player hand, but the dealer holds trips: `K♠ K♦ K♣`. Trips beat a straight flush? **No** — straight flush is the top hand. Change the dealer to `2♠ 2♦ 2♣` — trips still lose to a straight flush. To make the player lose with a straight flush, the dealer needs a *higher* straight flush, e.g. `Q♠ K♠ A♠`. Then: Ante −10, Play −10, **Ante Bonus still +50** = **+30 net**. The player *loses the showdown and still profits*, purely from the Ante Bonus.

---

## 6. Full paytables

All payouts are stated as **"to 1"** (net odds — the original stake is returned in addition), which is the casino convention for this game. If your engine works in "for 1" (total return), add 1 to every number below.

### 6.1 Ante Bonus paytables

Paid on straight-or-better only. House edge and element of risk here are for the **combined Ante + Play base game including this bonus**, under optimal (Q-6-4) play.

| Hand | **T1** *(standard)* | T2 | T3 | T4 | T5 | T6 |
|---|---:|---:|---:|---:|---:|---:|
| Straight flush | **5:1** | 4:1 | 3:1 | 5:1 | 9:1 | 12.5:1 |
| Three of a kind | **4:1** | 3:1 | 2:1 | 3:1 | 8:1 | 10:1 |
| Straight | **1:1** | 1:1 | 1:1 | 1:1 | 1:1 | 1:1 |
| **House edge (per Ante)** | **3.3730%** | 3.8255% | 4.2780% | 3.6083% | 1.5630% | 0.3323% |
| **Element of risk** | **2.0147%** | 2.2849% | 2.5552% | 2.1552% | 0.9336% | 0.1985% |
| **Ante Bonus EV alone** | +5.2851% | +4.8326% | +4.3801% | +5.0498% | +7.0950% | +8.3258% |

> Every column shares the identical base-game EV of **−8.6580%** (Ante + Play with no bonus); the Ante Bonus column above is the only difference, and `−8.6580% + bonus = house edge`. This is a useful invariant when adding a new paytable.

*(all verified by exhaustive enumeration; matches [Wizard of Odds](https://wizardofodds.com/games/three-card-poker/))*

- **T1 (5/4/1) is by far the most common** and is the *de facto* standard worldwide. T2 (4/3/1) and T3 (3/2/1) are downgrades found in lower-limit / cruise-ship / some Midwest markets.
- **T5 and T6 are online-only** (Gamesys). T6 charges a **10% commission on net wins**, which is what makes such a generous bonus viable.
- The **raise frequency is identical (67.4208%) for every one of these tables** — the Ante Bonus never changes correct strategy, because every hand that earns a bonus (straight or better) is a hand you would always play anyway. This is a useful invariant for testing.

**Mini Royal variants of the Ante Bonus** (from [MA §11(a)(3)(i)](https://massgaming.com/wp-content/uploads/Three-Card-Poker-7-26-18.pdf), offered with the "Section 6(f)" version of the game):

| Hand | Table A | Table B | Table C |
|---|---:|---:|---:|
| Mini royal flush **of spades** (A-K-Q♠) | 50:1 | — | 50:1 |
| Mini royal flush (A-K-Q, any suit) | 5:1 | 50:1 | 10:1 |
| Straight flush | 4:1 | 8:1 | 4:1 |
| Three of a kind | 3:1 | 6:1 | 3:1 |
| Straight | 1:1 | 1:1 | 1:1 |

### 6.2 Pair Plus paytables

Pair Plus pays on the player's own three cards only. It wins on **5,660 / 22,100 = 25.6109%** of hands.

**Without Mini Royal** — the ten paytables documented in the wild:

| Hand | **1** *(original)* | 2 | 3 | 4 | 5 | 6 | **7** *(modern norm)* | 8 | 9 | 10 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Straight flush | **40:1** | 35:1 | 40:1 | 35:1 | 50:1 | 40:1 | **40:1** | 40:1 | 40:1 | 42:1 |
| Three of a kind | **30:1** | 33:1 | 25:1 | 25:1 | 30:1 | 30:1 | **25:1** | 30:1 | 32:1 | 38:1 |
| Straight | **6:1** | 6:1 | 6:1 | 6:1 | 6:1 | 5:1 | **5:1** | 6:1 | 6:1 | 6:1 |
| Flush | **4:1** | 4:1 | 4:1 | 4:1 | 3:1 | 4:1 | **4:1** | 3:1 | 4:1 | 4:1 |
| Pair | **1:1** | 1:1 | 1:1 | 1:1 | 1:1 | 1:1 | **1:1** | 1:1 | 1:1 | 1:1 |
| **House edge** | **2.3167%** | 2.6968% | 3.4932% | 4.5792% | 5.1041% | 5.5747% | **6.7511%** | 7.2760% | 1.8462% | **0.0000%** |
| **RTP** | 97.68% | 97.30% | 96.51% | 95.42% | 94.90% | 94.43% | 93.25% | 92.72% | 98.15% | 100.00% |

*(all verified; matches [Wizard of Odds](https://wizardofodds.com/games/three-card-poker/))*

- **Table 1 (40/30/6/4/1) is the ORIGINAL paytable** as designed by Derek Webb and the best commonly-offered version at 2.32%.
- **Table 7 (40/25/5/4/1) is today's most common land-based paytable** at 6.75%. Table 8 (40/30/6/3/1) at 7.28% is the worst mainstream version — note that dropping the flush from 4:1 to 3:1 alone costs the player 4.96 percentage points, because flushes are frequent (4.96% of hands).
- **Table 10 pays 0.00% house edge** because that operator takes a **10% commission on net wins** separately.
- Sensitivity, for tuning: each **+1 on the flush payout** is worth ≈ **4.96%** of the bet; **+1 on the straight** ≈ **3.26%**; **+1 on three of a kind** ≈ **0.235%**; **+1 on straight flush** ≈ **0.217%**. The low-paying, high-frequency lines dominate the math — a change to the flush or straight line matters ~20× more than a change to the straight-flush line.

**With Mini Royal** (suited A-K-Q broken out as its own line; the remaining 44 straight flushes pay the SF rate):

| Hand | 1 | 2 | 3 | **4 / 7** | 5 | **6** |
|---|---:|---:|---:|---:|---:|---:|
| Mini royal (A-K-Q suited) | 80:1 | 50:1 | 50:1 | **200:1** | 100:1 | 50:1 |
| Straight flush | 40:1 | 40:1 | 40:1 | **40:1** | 50:1 | 40:1 |
| Three of a kind | 25:1 | 30:1 | 30:1 | **30:1** | 30:1 | 30:1 |
| Straight | 6:1 | 6:1 | 5:1 | **6:1** | 6:1 | 6:1 |
| Flush | 3:1 | 3:1 | 4:1 | **3:1** | 3:1 | 4:1 |
| Pair | 1:1 | 1:1 | 1:1 | **1:1** | 1:1 | 1:1 |
| **House edge** | 7.7285% | 7.0950% | 5.3937% | **4.3801%** | 4.1991% | **2.1357%** |
| **RTP** | 92.27% | 92.90% | 94.61% | 95.62% | 95.80% | 97.86% |

*(verified. Wizard tables 4 and 7 are identical paytables and produce the identical 4.38% edge.)*

Mini-Royal table 4 (200:1) is the version used in many California card rooms — e.g. [Stones Gambling Hall](https://www.stonesgamblinghall.com/portfolio-item/three-card-poker-6-card-bonus/) posts exactly MR 200 / SF 40 / 3K 30 / St 6 / Fl 3 / Pr 1.

The **regulatory minimum** Pair Plus paytable permitted in Massachusetts (§11(a)(2), "at no less than the following odds") is MR 35 / SF 35 / 3K 25 / St 5 / Fl 3 / Pr 1 → **12.7986% house edge**. Do not use this; it is a floor, not a recommendation.

### 6.3 6 Card Bonus

The player's three cards and the dealer's three cards are pooled; the **best five-card poker hand out of those six** is scored against a fixed paytable. Standard 5-card rankings apply here (flush beats straight), because it is a five-card hand.

Total 6-card hands: **C(52,6) = 20,358,520**.

| Best 5-card hand | Combinations | Probability | 1 in |
|---|---:|---:|---:|
| Royal flush | 188 | 0.00000923 | 108,290 |
| Straight flush (non-royal) | 1,656 | 0.00008134 | 12,294 |
| Four of a kind | 14,664 | 0.00072029 | 1,388 |
| Full house | 165,984 | 0.00815305 | 122.7 |
| Flush | 205,792 | 0.01010840 | 98.9 |
| Straight | 361,620 | 0.01776259 | 56.3 |
| Three of a kind | 732,160 | 0.03596332 | 27.8 |
| **Loser** (two pair or less) | 18,876,456 | 0.92720178 | — |
| **Total** | **20,358,520** | 1.00000000 | |

> Note the deliberate quirk: **two pair is a loser** on this side bet even though it beats three of a kind in real poker. This is intentional (two pair occurs on ~14.6% of 6-card hands and would blow up the paytable). Implementers must special-case it: a 6-card hand whose best 5 is two pair **loses**.

**Paytables** (T1–T4 are the Wizard of Odds catalogue; the `TCP-6B*` codes are the Massachusetts-approved paytables; T5 is the widely-used California card-room table):

| Hand | **T1** = TCP-6B3 | T2 | T3 = TCP-6B1 | T4 = TCP-6B4 | **T5** = TCP-6B2 |
|---|---:|---:|---:|---:|---:|
| Royal flush | 1000:1 | 2000:1 | 1000:1 | 1000:1 | 1000:1 |
| Straight flush | 200:1 | 200:1 | 200:1 | 200:1 | 200:1 |
| Four of a kind | 100:1 | 50:1 | 50:1 | 50:1 | 100:1 |
| Full house | 20:1 | 25:1 | 25:1 | 25:1 | 20:1 |
| Flush | 15:1 | 15:1 | 15:1 | 20:1 | 15:1 |
| Straight | 10:1 | 10:1 | 10:1 | 10:1 | 9:1 |
| Three of a kind | 7:1 | 5:1 | 5:1 | 5:1 | 8:1 |
| **House edge** | **8.5614%** | 14.3555% | 15.2790% | 10.2248% | **6.7413%** |
| **RTP** | 91.44% | 85.64% | 84.72% | 89.78% | 93.26% |

*(all verified from the combination counts above. T1–T4 match [Wizard of Odds](https://wizardofodds.com/games/three-card-poker/); the TCP-6B codes and their payouts are from [MA §7](https://massgaming.com/wp-content/uploads/Three-Card-Poker-7-26-18.pdf); T5 matches the posted [Stones Gambling Hall](https://www.stonesgamblinghall.com/portfolio-item/three-card-poker-6-card-bonus/) paytable.)*

The 6 Card Bonus is the highest-edge wager in the game in most configurations. It exists for jackpot excitement, not value.

---

## 7. House edge and return

### 7.1 The two ways to express the base-game edge — and why they differ

Both figures below describe the **same** game (Ante Bonus paytable T1, optimal play). They differ only in the denominator.

| Metric | Value | Denominator | Meaning |
|---|---:|---|---|
| **House edge (per initial wager / "per Ante")** | **3.3730%** | The **Ante only** (1 unit) | Expected loss per unit of the *forced, committed-up-front* bet. This is the standard published figure and the correct one for comparing against other games' "house edge". |
| **Element of risk (per total amount wagered)** | **2.0147%** | Average **total** wagered = **1.674208** units | Expected loss per unit of money that actually goes at risk, counting the Play bet that gets made 67.42% of the time. This is the right figure for computing expected loss per hour from average action. |

```
Element of risk  =  House edge / (1 + raise frequency)
                 =  0.033730 / (1 + 0.674208)
                 =  0.033730 / 1.674208
                 =  0.020147   →  2.0147%
```

Both are correct. Use **house edge (3.37%)** when comparing Three Card Poker to blackjack or roulette; use **element of risk (2.01%)** when modelling how fast a play-money balance depletes.

### 7.2 EV decomposition (Ante Bonus T1, Q-6-4 strategy) — verified

| Component | EV per Ante unit |
|---|---:|
| Ante wager (wins, losses, forfeits on fold) | **−10.1201%** |
| Play wager (wins, losses, pushes on non-qualification) | **+1.4621%** |
| **Base game subtotal (Ante + Play, no bonus)** | **−8.6580%** |
| Ante Bonus | **+5.2851%** |
| **Total** | **−3.3730%** |

Two things worth surfacing in the UI or a "how it works" screen:

1. **The Play bet is a positive-EV bet for the player.** Its return is **+2.1687% of the amount staked on it** (1.4621 / 67.4208). You only ever raise when you have the best of it; that is exactly what the Q-6-4 rule computes. All the house's profit comes from the *forced* Ante, which is why the Ante Bonus is needed to make the game feel fair.
2. **The Ante Bonus supplies +5.29%**, converting an otherwise brutal −8.66% game into a competitive −3.37% one.

This decomposition matches the Wizard of Odds statement that the player *"stands to lose 8.66% of the Ante but win 5.29%"* from the bonus.

### 7.3 Round outcome distribution (Ante Bonus T1, Q-6-4 strategy) — verified

| Outcome | Probability | Hands (of 22,100) |
|---|---:|---:|
| Player folds | **32.5792%** | 7,200 |
| Player plays, dealer does **not** qualify | **20.9970%** | — |
| Player plays, player **wins** showdown | **23.9101%** | — |
| Player plays, exact **draw** | **0.0657%** | — |
| Player plays, player **loses** showdown | **22.4480%** | — |
| **Total** | **100.0000%** | |

Exactly **14,900 of the 22,100** possible starting hands are played and **7,200** are folded. These two integers are excellent unit-test fixtures.

### 7.4 Alternative strategies, for reference and for the "auto-play" / hint feature

| Strategy | House edge (T1) | Cost vs. optimal |
|---|---:|---:|
| **Optimal = Q-6-4 rule** | **3.3730%** | — |
| "Mimic the dealer" — play any Q-high or better | 3.4491% | +0.076 pp |
| "Never fold" — always play | 7.6538% | +4.281 pp |
| "Play only pairs or better" | worse than mimic | — |

*(verified; matches Wizard of Odds' 3.45% and 7.65%.)*

Note how small the penalty for "mimic the dealer" is (0.076 percentage points). This makes it an excellent, easily-explained beginner default for a social app — and it means new players who use the simple heuristic are barely punished.

### 7.5 Rule variant: "ties go to the player"

Some houses pay both the Ante and the Play on an exact draw instead of pushing. With Ante Bonus T1 this lowers the house edge from 3.3730% to **3.2415%** (element of risk 1.9361%) — a gain of 0.13 percentage points. *(verified)* It also very slightly shifts the optimal folding boundary. **Not recommended** — it deviates from the standard game and the gain is negligible.

### 7.6 Combined wagering

If a player bets 1 unit on Ante and 1 unit on Pair Plus:

| Configuration | Combined EV | Per unit of the 2 initial units |
|---|---:|---:|
| Ante T1 + Pair Plus table 1 (recommended) | −0.056897 | **−2.845%** |
| Ante T1 + Pair Plus table 7 | −0.101241 | −5.0621% |
| Ante T1 + Pair Plus table 8 | **−0.106490** | **−5.3245%** — this reproduces the Wizard of Odds "5.32% combined" figure exactly |

---

## 8. Optimal player strategy — the Q-6-4 rule

### 8.1 Statement

> **Make the Play wager with Q-6-4 or better. Fold everything worse.**

This is the complete, exact, optimal strategy for the Ante/Play decision. There is no second rule, no exception, and no dependence on the Ante Bonus paytable or on the Pair Plus wager.

**We proved this by exhaustive enumeration:** for every one of the 22,100 possible player hands we computed the exact EV of raising (against all 18,424 remaining dealer hands) and compared it to the −1 EV of folding. The Q-6-4 rule agreed with the EV-maximising choice on **all 22,100 hands — zero disagreements**. Its cost versus perfect play is exactly **0.0000000000**.

### 8.2 The boundary, demonstrated

Folding is worth exactly **−1.000000** (you lose the Ante). Raising is worth:

| Hand | EV of raising | Decision |
|---|---:|---|
| K-2-3 offsuit | −0.552974 | Play |
| Q-7-2 offsuit | −0.977095 | Play |
| Q-6-5 offsuit | −0.987733 | Play |
| **Q-6-4 offsuit** | **−0.994627** | **Play** (the marginal hand) |
| **Q-6-3 offsuit** | **−1.003962** | **Fold** (the first fold) |
| Q-5-4 offsuit | −1.022036 | Fold |

The indifference point falls **between Q-6-4 and Q-6-3**, which is precisely why the rule is "Q-6-4 **or better**". *(verified)*

### 8.3 Precise algorithm for "Q-6-4 or better"

"Q-6-4 or better" is evaluated with **the game's own hand-comparison function**, against the reference hand `Q♠ 6♥ 4♦` (a Queen-high, no-pair, no-flush, no-straight hand).

```
function shouldPlay(hand):
    h = evaluate(hand)                      # {category, tiebreakers[]}
    ref = evaluate(Q♠, 6♥, 4♦)              # category = HIGH_CARD, keys = [Q, 6, 4]
    return compare(h, ref) >= 0
```

Expanded to an explicit, branch-by-branch form (this is what you should actually ship, because it is auditable and unit-testable):

```
function shouldPlay(hand):
    (cat, k0, k1, k2) = evaluate(hand)      # ranks encoded 2..14, A = 14

    # 1. Any made hand — pair, flush, straight, trips, straight flush — always plays.
    if cat > HIGH_CARD:  return PLAY

    # 2. High-card hands: compare the three ranks in descending order to (Q, 6, 4) = (12, 6, 4)
    if k0 >  12: return PLAY                # Ace-high or King-high: ALWAYS play
    if k0 <  12: return FOLD                # Jack-high or lower:   ALWAYS fold
    # k0 == 12 (Queen high)
    if k1 >  6:  return PLAY                # Q-7-x and up
    if k1 <  6:  return FOLD                # Q-5-x and down
    # k1 == 6 (Q-6-x)
    return (k2 >= 4) ? PLAY : FOLD          # Q-6-4 plays; Q-6-3 and Q-6-2 fold
```

**Human-readable equivalent, for the in-game hint / tutorial:**

| Highest card | Rule |
|---|---|
| **Ace or King** | Always play (any A-high or K-high hand raises) |
| **Queen** | Play if the second card is **7 or higher**. If the second card is exactly a **6**, play only if the third card is **4 or higher**. Otherwise fold. |
| **Jack or lower** | Always fold |
| Any pair or better | Always play |

**Common near-miss formulations to reject in code review:**

- ❌ "Play Q-high or better" — that is the *mimic-the-dealer* strategy, costs 0.076 pp.
- ❌ "Play Q-6 or better" — plays Q-6-3 and Q-6-2, which are −EV.
- ❌ "Q-6-4 exactly" as a rank-set test rather than a lexicographic comparison — Q-J-2 is "better than Q-6-4" and must play.
- ❌ Applying the rule to *suit* — suits are irrelevant to the decision (a suited Q-6-3 is still a fold; if it were suited it would be a *flush* and would play under rule 1 anyway).

### 8.4 Strategy for the side bets

- **Pair Plus:** there is no strategy. It is placed before the cards are dealt and resolves automatically. The only decision is *whether* to bet it (and how much), which depends purely on the paytable's house edge.
- **6 Card Bonus:** likewise no strategy; place-or-don't-place only.
- **Bet sizing:** with a Pair Plus paytable better than the Ante's edge (e.g. table 1 at 2.32% vs. Ante's 3.37%), a pure EV-maximiser would weight toward Pair Plus. With table 7 (6.75%) the Ante is the better bet. This is worth surfacing in an "advanced" info screen.

---

## 9. Edge cases an implementer must handle

| # | Edge case | Required behaviour | Source / rationale |
|---:|---|---|---|
| 1 | **Player folds with a Pair Plus bet outstanding** | Ante is forfeited immediately. **Pair Plus still resolves normally** against the paytable. The player's cards must still be evaluated (even if not shown to the table). | MA §10(b): *"If a player has placed an ante wager and a pair plus wager but does not make a play wager, the player shall forfeit his ante wager. The pairs plus wager will need to be checked to determine if it is a winning wager."* |
| 2 | **Player folds with a 6 Card Bonus bet outstanding** | The 6 Card Bonus **still resolves**, which means the **dealer's cards must be revealed and evaluated even if every player folded**. Never short-circuit the dealer reveal. | MA §6(g)(2): *"Player is eligible to win the wager even if they fold their Ante wager."* |
| 3 | **Player folds holding a straight or better** | Ante Bonus is **NOT** paid (the Play wager is a precondition). Pair Plus **IS** paid. | MA §11(a)(3). Unreachable under Q-6-4 (all straights play), but reachable if you offer manual play — **the UI should warn** ("You are folding a hand that qualifies for the Ante Bonus"). |
| 4 | **Ante Bonus when the dealer does not qualify** | **Paid in full.** The bonus does not depend on qualification. | §5.3 above |
| 5 | **Ante Bonus when the player LOSES the showdown** | **Paid in full.** Net result can still be a profit — see the worked example in §5.3. | §5.3 above |
| 6 | **Insufficient balance for the Play wager** | **Prevent it at the Ante stage.** When the player places an Ante of `A`, immediately **reserve** a further `A` from the balance for the potential Play bet. Enforce `maxAnte = floor((balance − pairPlus − sixCard) / 2)`. Never let a player reach the Play/Fold decision unable to afford Play — that would coerce a fold and silently destroy EV. Do **not** implement "all-in for less"; the Play wager must equal the Ante exactly. | MA §1 "Play wager" definition |
| 7 | **Exact tie (draw)** | Ante **and** Play both push (returned). Occurs on **0.0657%** of rounds. The Ante Bonus is still paid if applicable. | MA §3(c), [Pagat](https://www.pagat.com/banking/3cardpoker.html) |
| 8 | **Ace usage** | Ace is **high** for ranking; ace is **low only** to complete **A-2-3** (the lowest straight / straight flush). **K-A-2 is not a straight.** A-K-Q is the highest straight. | MA §3(a), §3(b)(1), §3(b)(3); [Pagat](https://www.pagat.com/banking/3cardpoker.html) |
| 9 | **Pair vs. pair comparison** | Compare **pair rank first**, then the kicker. A naive descending-sort comparator gets this wrong (K-K-2 vs A-Q-Q). | §3.5 warning |
| 10 | **Trips vs. trips** | Impossible in a single deck — assert on it in dev builds. | Only four cards of each rank exist |
| 11 | **Two pair in the 6 Card Bonus** | A 6-card hand whose best five cards form **two pair LOSES** the 6 Card Bonus. Explicitly exclude it. | §6.3 |
| 12 | **Suits in tie-breaking** | Suits are **never** used to break a tie in any comparison, anywhere in this game. | MA §3(a): *"All suits shall be considered equal in rank."* |
| 13 | **Pair Plus with no Ante** | Standard rules permit a Pair Plus wager with no Ante at all (the player then never gets a Play/Fold decision). Some houses require an Ante ≥ Pair Plus, or ≥ ½ Pair Plus. **Pick one and configure it.** | MA §6(a)(2), §6(f) |
| 14 | **6 Card Bonus without an Ante** | The 6 Card Bonus **requires** the standard (Ante) wager. | MA §6(g)(3) |
| 15 | **Deck state between rounds** | Full fresh 52-card deck, reshuffled every round. **No card counting is possible** and the game must not be implementable as a continuous shoe. | MA §5(a) |
| 16 | **Dealer reveal timing** | The dealer's cards must be revealed **only after every player has acted**. Do not pre-compute and leak the dealer's hand into client state before the decision. | MA §10(b), §14(d) |
| 17 | **Multiple side bets hitting at once** | All wagers resolve **independently and simultaneously**. A single hand can pay Ante + Play + Ante Bonus + Pair Plus + 6 Card Bonus. | §2.2 |
| 18 | **Rounding of payouts** | The 12.5:1 Ante Bonus (T6) and any commission-based table produce fractional chips. If you use the recommended integer paytables, **all payouts are integers** — keep the entire economy in integer minor units and avoid floats entirely. | — |
| 19 | **Zero-amount side bets** | Treat `pairPlus = 0` and `sixCard = 0` as "not placed", not as a bet that loses 0. This matters for statistics and for the "you would have won X" teaser. | — |
| 20 | **Straight-flush A-2-3 scored as high card 3** | For ordering, the A-2-3 straight's high card is the **3**, so A-2-3 < 2-3-4 < … < A-K-Q. Do not score it as ace-high. | MA §3(b)(1) |

---

## 10. Recommended configuration for a social play-money app

### 10.1 The recommendation

| Setting | Recommended value | House edge |
|---|---|---:|
| **Deck** | Single 52-card, reshuffled every round, Fisher–Yates + CSPRNG | — |
| **Ante Bonus** | **Table 1 — Straight 1:1, Three of a Kind 4:1, Straight Flush 5:1** | **3.3730%** |
| **Pair Plus** | **Table 1 (original) — SF 40:1, 3oaK 30:1, Straight 6:1, Flush 4:1, Pair 1:1** | **2.3167%** |
| **6 Card Bonus** | **Table 1 / TCP-6B3 — 1000 / 200 / 100 / 20 / 15 / 10 / 7** | **8.5614%** |
| **Ties** | **Push** (standard), *not* "ties to player" | — |
| **Pair Plus without an Ante** | **Allowed** | — |
| **6 Card Bonus** | Requires an Ante; **off by default**, opt-in toggle | — |
| **Blended RTP at the recommended default bet** (Ante + Pair Plus, equal amounts) | | **97.16%** |

### 10.2 Justification

**Ante Bonus Table 1 (5/4/1).** This is the canonical, globally-dominant paytable. Any player who has played the game in a real casino will recognise it; any player who Googles "three card poker odds" will find 3.37% and see that our game matches. **Authenticity is the product**, and the numbers are the most checkable part of it. The more generous T5/T6 exist only alongside a 10% win commission, which would be bizarre and confusing in a play-money app.

**Pair Plus Table 1 (40/30/6/4/1), not the modern Table 7.** This is a deliberate choice to favour the *original* paytable over the *most common* one:

1. It is authentic — it is the paytable Derek Webb designed, still offered in the UK and in better Vegas houses.
2. At 2.32% it is player-friendly, which matters enormously in a play-money game where the only real currency is **session length**. A 6.75% Pair Plus drains a play-money balance roughly 3× faster, producing more forced top-up prompts, more churn, and no offsetting revenue.
3. The gameplay *feel* is identical — same hit frequency (25.6%), same hand hierarchy, same animations. Only the flush (4:1 vs 4:1) and straight (6:1 vs 5:1) and trips (30:1 vs 25:1) lines differ. Players experience it as "generous", not as "different".
4. Because Pair Plus is the bet players place most often and most emotionally, it is the right place to spend the generosity budget.

**6 Card Bonus Table 1 (8.56%), off by default.** The 6 Card Bonus is a *jackpot* feature: 1000:1 royal flush moments are what get screenshotted and shared. But at 8.56% it is the highest-edge wager in our configuration, and at 15.28% (the common casino table) it would be punishing. Table 1 is the most generous of the standard tables and still delivers the 1000:1 top prize. Defaulting it **off** keeps the first-run experience simple; surface it after the player has completed ~10 rounds.

**Ties push, not "ties to player".** The variant is worth only 0.13 percentage points, is non-standard, and breaks the mental model ("a tie is a tie"). Not worth the fidelity cost.

**Allow Pair Plus with no Ante.** It supports a genuinely different, lower-cognitive-load play style ("just deal me cards and see if I hit"), which is valuable for casual and lapsed players.

### 10.3 Economy tuning notes (play-money specific)

| Parameter | Suggested value | Rationale |
|---|---|---|
| Starting balance | 10,000 chips | ≈ 200 rounds at the default bet — enough for a real session without a top-up prompt |
| Default Ante | 25 chips | Must be ≤ balance/2 so the Play wager is always affordable |
| Bet chips | 10 / 25 / 100 / 500 / 2,500 | Powers that keep all payouts integral |
| Table min / max | 10 / 2,500 | |
| Auto-reserve for Play | **Always** | See edge case #6 |
| Expected loss per round at default | 25 × 3.373% ≈ **0.84 chips** (Ante) | With Pair Plus 25 → +0.58 → ≈1.42 chips/round total |
| Rounds to exhaust starting balance | ≈ **7,000** rounds of pure grinding | Variance will end most sessions far sooner; this is the correct order of magnitude for a social title |
| Hint system | Implement Q-6-4 as an optional "suggest" overlay | Costs nothing (the strategy is public), teaches the game, and builds trust |
| Statistics to track | Hands played, fold rate (target ≈32.6%), Pair Plus hit rate (target ≈25.6%), biggest win | These converge to the theoretical values and prove the RNG is honest |

### 10.4 A note on responsible design

This is a **play-money** title with no cash-out. To keep it clearly on the right side of the line:

- Never offer chip purchases that map to a monetary "win" of any kind.
- Do not display balances in a currency format.
- Do not tune the RNG. Deal from a genuinely uniform shuffle and let the published math be the math — the whole point of matching the casino paytables exactly is that the game is *verifiably* fair. A player who checks our numbers against Wizard of Odds should find them identical.
- Consider showing the RTP in the info screen. It costs nothing and buys credibility.

---

## 11. Arabic terminology (مصطلحات عربية)

### 11.1 Wagers and actions — الرهانات والإجراءات

| English | Arabic | Transliteration | Notes for UI |
|---|---|---|---|
| **Ante** | **الرهان الأساسي** | ar-rihān al-asāsī | The mandatory opening wager |
| **Play / Raise / Bet** | **اللعب** | al-laʿib | Button label: `العب` (imperative) |
| **Fold** | **انسحاب** | insiḥāb | Button label: `انسحب` (imperative) |
| **Pair Plus** | **زوج أو أفضل** | zawj aw afḍal | Literally "a pair or better" |
| **Bonus** | **مكافأة** | mukāfaʾa | |
| **Ante Bonus** | **مكافأة الرهان الأساسي** | mukāfaʾat ar-rihān al-asāsī | |
| **6 Card Bonus** | **مكافأة الست أوراق** | mukāfaʾat as-sitt awrāq | |
| **Qualify (dealer)** | **تأهل الموزع** | taʾahhul al-muwazziʿ | Banner: `تأهل الموزع` / `لم يتأهل الموزع` |
| **Push / Tie** | **تعادل** | taʿādul | Used for both "bet returned" and "hands equal" |
| **Bet / wager** | **رهان** | rihān | |
| **Place a bet** | **ضع رهانك** | ḍaʿ rihānak | |
| **Deal** | **وزّع** | wazziʿ | Button label |
| **Double / rebet** | **كرّر الرهان** | karrir ar-rihān | "Repeat bet" |
| **Clear bets** | **مسح الرهانات** | masḥ ar-rihānāt | |

### 11.2 Game entities — عناصر اللعبة

| English | Arabic | Transliteration |
|---|---|---|
| Dealer | **الموزع** | al-muwazziʿ |
| Player | **اللاعب** | al-lāʿib |
| Hand | **اليد** | al-yad |
| Card | **ورقة** | waraqa |
| Cards | **أوراق** | awrāq |
| Deck | **مجموعة الأوراق** | majmūʿat al-awrāq |
| Shuffle | **خلط** | khalṭ |
| Reveal / show | **كشف** | kashf |
| Round | **جولة** | jawla |
| Balance / bankroll | **الرصيد** | ar-raṣīd |
| Chips | **الرقائق** | ar-raqāʾiq |
| Win | **فوز** | fawz |
| Lose | **خسارة** | khasāra |
| Payout | **العائد** | al-ʿāʾid |
| Paytable | **جدول الأرباح** | jadwal al-arbāḥ |
| House edge | **أفضلية الصالة** | afḍaliyyat aṣ-ṣāla |
| Return to player (RTP) | **نسبة العائد للاعب** | nisbat al-ʿāʾid lil-lāʿib |
| Probability | **الاحتمال** | al-iḥtimāl |

### 11.3 Hand names — أسماء الأيدي

| English | Arabic | Transliteration |
|---|---|---|
| Straight flush | **تسلسل من نفس النوع** | tasalsul min nafs an-nawʿ |
| Mini Royal (A-K-Q suited) | **الرويال الصغير** | ar-rūyāl aṣ-ṣaghīr |
| Three of a kind | **ثلاثة متشابهة** | thalātha mutashābiha |
| Straight | **تسلسل** | tasalsul |
| Flush | **نفس النوع** | nafs an-nawʿ |
| Pair | **زوج** | zawj |
| High card | **أعلى ورقة** | aʿlā waraqa |
| Kicker | **الورقة المرجّحة** | al-waraqa al-murajjaḥa |
| Royal flush (6-card bonus) | **الرويال فلاش** | ar-rūyāl flāsh |
| Four of a kind (6-card bonus) | **أربعة متشابهة** | arbaʿa mutashābiha |
| Full house (6-card bonus) | **فُل هاوس** | full hāws |
| Two pair (6-card bonus, loses) | **زوجان** | zawjān |

### 11.4 Card ranks and suits — القيم والأنواع

| English | Arabic | | English | Arabic |
|---|---|---|---|---|
| Ace | **آص** | | Spades ♠ | **بستوني** |
| King | **ملك** | | Hearts ♥ | **كوبة** |
| Queen | **بنت** | | Diamonds ♦ | **ديناري** |
| Jack | **ولد** | | Clubs ♣ | **سباتي** |
| 10 … 2 | **١٠ … ٢** | | | |

### 11.5 Key UI strings — نصوص الواجهة

| Situation | Arabic string |
|---|---|
| Dealer did not qualify | **الموزع لم يتأهل — الرهان الأساسي يُدفع ١:١ واللعب يُعاد** |
| Dealer qualified, player wins | **فزت! الرهان الأساسي واللعب يُدفعان ١:١** |
| Dealer qualified, dealer wins | **خسرت — الموزع لديه يد أقوى** |
| Tie | **تعادل — تُعاد جميع رهاناتك** |
| Ante Bonus paid | **مكافأة الرهان الأساسي!** |
| Pair Plus won | **زوج أو أفضل — ربحت!** |
| Fold confirmation | **هل تريد الانسحاب؟ ستخسر رهانك الأساسي** |
| Strategy hint | **النصيحة: العب بـ بنت-٦-٤ أو أفضل** |

> **RTL note:** the entire layout must be mirrored (`direction: rtl`). Card *values* and *paytable numbers* should render LTR inside RTL text — wrap payout odds in `<bdi>` / `unicodeBidi: 'isolate'` so `40:1` does not render as `1:40`. Consider Western Arabic numerals (0-9) for payout odds since players match them against paytables; Eastern Arabic numerals (٠-٩) are fine for balances.

---

## 12. TypeScript interface sketch

```ts
// ────────────────────────────────────────────────────────────────
// Cards
// ────────────────────────────────────────────────────────────────

/** 2..14, where 11=J, 12=Q, 13=K, 14=A. Ace is ALWAYS 14 here;
 *  the low-ace A-2-3 straight is handled inside evaluateHand(). */
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;
export type Suit = 'S' | 'H' | 'D' | 'C';   // بستوني / كوبة / ديناري / سباتي

export interface Card { readonly rank: Rank; readonly suit: Suit; }

export type ThreeCards = readonly [Card, Card, Card];
export type SixCards   = readonly [Card, Card, Card, Card, Card, Card];

// ────────────────────────────────────────────────────────────────
// Hand evaluation
// ────────────────────────────────────────────────────────────────

/** Ordered by strength. NOTE: STRAIGHT > FLUSH — this is the 3-card order. */
export enum HandCategory {
  HIGH_CARD      = 0,
  PAIR           = 1,
  FLUSH          = 2,
  STRAIGHT       = 3,
  THREE_OF_A_KIND= 4,
  STRAIGHT_FLUSH = 5,
}

export interface EvaluatedHand {
  readonly category: HandCategory;
  /**
   * Lexicographic tiebreak keys, most significant first. Semantics per category:
   *   STRAIGHT_FLUSH / STRAIGHT : [highCard]            (A-2-3 → highCard === 3)
   *   THREE_OF_A_KIND           : [tripRank]
   *   PAIR                      : [pairRank, kicker]    ← pair rank FIRST (critical)
   *   FLUSH / HIGH_CARD         : [r0, r1, r2] desc
   */
  readonly keys: readonly number[];
  /** True iff this is a suited A-K-Q. Subset of STRAIGHT_FLUSH. */
  readonly isMiniRoyal: boolean;
  /** category >= PAIR, or (HIGH_CARD and keys[0] >= 12). */
  readonly qualifies: boolean;
  /** Packed integer, monotonic in hand strength. For fast compares & persistence. */
  readonly score: number;
}

/** -1 if a < b, 0 if exactly equal (a draw), +1 if a > b. Suits never break ties. */
export type CompareHands = (a: EvaluatedHand, b: EvaluatedHand) => -1 | 0 | 1;

// ────────────────────────────────────────────────────────────────
// Configuration
// ────────────────────────────────────────────────────────────────

export interface AnteBonusPaytable {
  readonly straight: number;        // 1
  readonly threeOfAKind: number;    // 4
  readonly straightFlush: number;   // 5
}

export interface PairPlusPaytable {
  readonly pair: number;            // 1
  readonly flush: number;           // 4
  readonly straight: number;        // 6
  readonly threeOfAKind: number;    // 30
  readonly straightFlush: number;   // 40
  /** Omit to fold Mini Royal into the straightFlush line. */
  readonly miniRoyal?: number;
}

export interface SixCardBonusPaytable {
  readonly threeOfAKind: number;    // 7   (two pair pays NOTHING)
  readonly straight: number;        // 10
  readonly flush: number;           // 15
  readonly fullHouse: number;       // 20
  readonly fourOfAKind: number;     // 100
  readonly straightFlush: number;   // 200
  readonly royalFlush: number;      // 1000
}

export interface TableConfig {
  readonly anteBonus: AnteBonusPaytable;
  readonly pairPlus: PairPlusPaytable;
  readonly sixCardBonus: SixCardBonusPaytable;
  readonly minBet: number;
  readonly maxBet: number;
  /** Standard = false. true pays both bets on an exact draw (HE 3.24%). */
  readonly tiesGoToPlayer: boolean;
  /** Standard = true. If false, an Ante is required to place Pair Plus. */
  readonly allowPairPlusWithoutAnte: boolean;
  /** Standard = true (MA §6(g)(3)). */
  readonly sixCardBonusRequiresAnte: boolean;
  /** Standard = false. Ante Bonus normally requires the Play wager. */
  readonly payAnteBonusOnFold: boolean;
}

export const RECOMMENDED_CONFIG: TableConfig = {
  anteBonus:    { straight: 1, threeOfAKind: 4, straightFlush: 5 },              // HE 3.3730%
  pairPlus:     { pair: 1, flush: 4, straight: 6, threeOfAKind: 30,
                  straightFlush: 40 },                                            // HE 2.3167%
  sixCardBonus: { threeOfAKind: 7, straight: 10, flush: 15, fullHouse: 20,
                  fourOfAKind: 100, straightFlush: 200, royalFlush: 1000 },       // HE 8.5614%
  minBet: 10,
  maxBet: 2500,
  tiesGoToPlayer: false,
  allowPairPlusWithoutAnte: true,
  sixCardBonusRequiresAnte: true,
  payAnteBonusOnFold: false,
};

// ────────────────────────────────────────────────────────────────
// Game state
// ────────────────────────────────────────────────────────────────

export type Phase =
  | 'BETTING'      // وضع الرهان    — ante / pairPlus / sixCard editable
  | 'DEALING'      // التوزيع       — animation only
  | 'DECISION'     // اللعب أو الانسحاب
  | 'REVEALING'    // كشف أوراق الموزع
  | 'SETTLED';     // النتيجة

export interface Wagers {
  readonly ante: number;        // 0 = not placed
  readonly play: number;        // 0 until the player raises; then === ante
  readonly pairPlus: number;    // 0 = not placed
  readonly sixCardBonus: number;// 0 = not placed
}

export interface GameState {
  readonly phase: Phase;
  readonly roundId: string;
  readonly balance: number;              // integer minor units — never a float
  readonly wagers: Wagers;
  /** Reserved from `balance` at ante time so Play is always affordable. */
  readonly reservedForPlay: number;
  readonly playerCards: ThreeCards | null;
  /** Populated at deal time server-side; MUST NOT reach the client before REVEALING. */
  readonly dealerCards: ThreeCards | null;
  readonly playerHand: EvaluatedHand | null;
  readonly dealerHand: EvaluatedHand | null;
  readonly folded: boolean;
  readonly result: RoundResult | null;
  readonly config: TableConfig;
}

// ────────────────────────────────────────────────────────────────
// Resolution
// ────────────────────────────────────────────────────────────────

export type BaseGameOutcome =
  | 'FOLDED'                // انسحاب            → ante lost
  | 'DEALER_NOT_QUALIFIED'  // الموزع لم يتأهل   → ante 1:1, play push
  | 'PLAYER_WINS'           // فوز              → ante 1:1, play 1:1
  | 'DEALER_WINS'           // خسارة            → both lost
  | 'PUSH';                 // تعادل            → both returned

/** Every field is a NET amount: profit/loss, excluding the returned stake. */
export interface RoundResult {
  readonly outcome: BaseGameOutcome;
  readonly dealerQualified: boolean;

  readonly anteNet: number;          // +ante | -ante | 0
  readonly playNet: number;          // +play | -play | 0 (0 also = push)
  readonly anteBonusNet: number;     // >= 0, never negative
  readonly pairPlusNet: number;      // +payout*bet | -bet | 0 if not placed
  readonly sixCardBonusNet: number;  // +payout*bet | -bet | 0 if not placed

  readonly totalNet: number;         // sum of the five above
  /** Stakes returned to the balance (pushed play bet, pushed ante, etc.). */
  readonly returnedStakes: number;
  readonly newBalance: number;

  readonly anteBonusHand: 'STRAIGHT' | 'THREE_OF_A_KIND' | 'STRAIGHT_FLUSH' | null;
  readonly pairPlusHand: HandCategory | 'MINI_ROYAL' | null;
  readonly sixCardHand: SixCardCategory | null;
}

export type SixCardCategory =
  | 'THREE_OF_A_KIND' | 'STRAIGHT' | 'FLUSH' | 'FULL_HOUSE'
  | 'FOUR_OF_A_KIND'  | 'STRAIGHT_FLUSH' | 'ROYAL_FLUSH';
  // NB: two pair and below are LOSERS and have no member here.

// ────────────────────────────────────────────────────────────────
// The single resolution function
// ────────────────────────────────────────────────────────────────

/**
 * Pure. Deterministic. No I/O, no RNG, no clock. This is THE function to
 * property-test: feed it all 22,100 × 18,424 pairs and the aggregate EV must
 * equal -3.3730% of the ante for RECOMMENDED_CONFIG.
 *
 * Resolution order (each step is independent of the others):
 *   1. Base game  : fold → not-qualified → compare → win/lose/push
 *   2. Ante Bonus : player hand only; requires play > 0 (unless config says otherwise)
 *   3. Pair Plus  : player hand only; ALWAYS resolves, even on a fold
 *   4. 6 Card Bonus: best 5 of player's 3 + dealer's 3; ALWAYS resolves, even on a fold
 */
export declare function resolveRound(
  playerCards: ThreeCards,
  dealerCards: ThreeCards,
  wagers: Wagers,
  folded: boolean,
  config: TableConfig,
): RoundResult;

/** Optimal strategy. Returns true iff the hand is Q-6-4 or better. */
export declare function shouldPlay(hand: EvaluatedHand): boolean;

/** Fisher–Yates over a fresh 52-card deck using a CSPRNG. */
export declare function dealRound(rng: () => number): {
  playerCards: ThreeCards;
  dealerCards: ThreeCards;
};
```

### 12.1 Reference implementation of the two functions that are easy to get wrong

```ts
const QUEEN = 12;

export function evaluateHand(cards: ThreeCards): EvaluatedHand {
  const r = cards.map(c => c.rank).sort((a, b) => b - a) as [number, number, number];
  const [a, b, c] = r;
  const isFlush = cards[0].suit === cards[1].suit && cards[1].suit === cards[2].suit;

  // Straight detection, INCLUDING the low-ace A-2-3 (scored as 3-high).
  let isStraight = false;
  let straightHigh = a;
  if (a === 14 && b === 3 && c === 2) { isStraight = true; straightHigh = 3; }
  else if (a - 1 === b && b - 1 === c) { isStraight = true; straightHigh = a; }

  let category: HandCategory;
  let keys: number[];
  if (isStraight && isFlush)      { category = HandCategory.STRAIGHT_FLUSH;  keys = [straightHigh]; }
  else if (a === b && b === c)    { category = HandCategory.THREE_OF_A_KIND; keys = [a]; }
  else if (isStraight)            { category = HandCategory.STRAIGHT;        keys = [straightHigh]; }
  else if (isFlush)               { category = HandCategory.FLUSH;           keys = [a, b, c]; }
  else if (a === b)               { category = HandCategory.PAIR;            keys = [a, c]; } // pair, kicker
  else if (b === c)               { category = HandCategory.PAIR;            keys = [b, a]; } // pair, kicker
  else                            { category = HandCategory.HIGH_CARD;       keys = [a, b, c]; }

  const isMiniRoyal =
    category === HandCategory.STRAIGHT_FLUSH && straightHigh === 14; // A-K-Q suited

  const qualifies = category > HandCategory.HIGH_CARD || keys[0] >= QUEEN;

  // Packed monotonic score: category, then up to three 15-ary tiebreak digits.
  const k = [keys[0] ?? 0, keys[1] ?? 0, keys[2] ?? 0];
  const score = category * 3375 + k[0] * 225 + k[1] * 15 + k[2];

  return { category, keys, isMiniRoyal, qualifies, score };
}

/** Optimal strategy: Q-6-4 or better. Verified EV-optimal on all 22,100 hands. */
export function shouldPlay(h: EvaluatedHand): boolean {
  if (h.category > HandCategory.HIGH_CARD) return true;   // any made hand plays
  const [k0, k1, k2] = h.keys;
  if (k0 !== QUEEN) return k0 > QUEEN;                    // A/K high → play; J or less → fold
  if (k1 !== 6) return k1 > 6;                            // Q-7-x+ → play; Q-5-x- → fold
  return k2 >= 4;                                         // Q-6-4 plays, Q-6-3 folds
}
```

---

## 13. Implementation checklist

Every line below is a testable assertion. Numbers marked ✓ were verified by exhaustive enumeration in the preparation of this document and are exact.

### Deck and dealing

- [ ] A single, standard 52-card deck is used; no jokers; the deck is fully reshuffled before **every** round.
- [ ] Exactly 3 cards go to the player and 3 to the dealer; 46 cards remain undealt and are never used.
- [ ] The dealer's three cards are never present in client-visible state before the `REVEALING` phase.
- [ ] The shuffle is Fisher–Yates driven by a CSPRNG; over ≥10⁷ deals, observed hand-category frequencies match §3.2 within statistical tolerance.

### Hand evaluation

- [ ] Ranking order is `STRAIGHT_FLUSH > THREE_OF_A_KIND > STRAIGHT > FLUSH > PAIR > HIGH_CARD`. ✓
- [ ] Enumerating all C(52,3) hands yields exactly **22,100** hands with category counts **48 / 52 / 720 / 1,096 / 3,744 / 16,440**. ✓
- [ ] Exactly **4** hands are Mini Royal (suited A-K-Q). ✓
- [ ] `A♠ 2♥ 3♦` evaluates as **STRAIGHT** with high card **3**. ✓
- [ ] `A♠ 2♠ 3♠` evaluates as **STRAIGHT_FLUSH** with high card **3**, and is the **lowest** straight flush. ✓
- [ ] `A♠ K♠ Q♠` evaluates as **STRAIGHT_FLUSH**, is the **highest** hand in the game, and is flagged `isMiniRoyal`. ✓
- [ ] `K♠ A♥ 2♦` evaluates as **HIGH_CARD**, not a straight. ✓
- [ ] `A♠ K♥ Q♦` (unsuited) evaluates as **STRAIGHT**, the highest straight. ✓
- [ ] `compare(K♠K♦2♣, A♥Q♠Q♦) === +1` — pair of kings beats pair of queens despite the ace. ✓ *(the classic bug)*
- [ ] `compare(A♠A♦2♣, K♥K♠A♣) === +1` — pair of aces beats pair of kings.
- [ ] `compare(A♠A♦K♣, A♥A♣Q♦) === +1` — equal pairs, higher kicker wins.
- [ ] `compare(A♠K♦Q♣, A♥K♣Q♦) === 0` — identical ranks, different suits → **draw**. Suits never break a tie. ✓
- [ ] Two identical three-of-a-kinds are impossible; assert in dev builds.

### Dealer qualification

- [ ] The dealer qualifies iff `category >= PAIR || highestRank >= QUEEN`. ✓
- [ ] Exactly **15,380 of 22,100** hands qualify (**69.5928%**). ✓
- [ ] `Q♠ 3♥ 2♦` qualifies; `J♠ 10♥ 9♦` does **not**; `2♠ 2♥ 3♦` (pair of deuces) **does**. ✓

### Settlement — base game

- [ ] Player folds → Ante lost, Play never placed, no Ante Bonus.
- [ ] Dealer does not qualify → Ante pays **1:1**, Play is **returned in full**, **regardless of the player's hand**. ✓
- [ ] Dealer qualifies + player's hand higher → Ante **1:1** AND Play **1:1**.
- [ ] Dealer qualifies + dealer's hand higher → **both** Ante and Play lost.
- [ ] Dealer qualifies + exact draw → **both** Ante and Play returned (push).
- [ ] The hand comparison is **never** performed when the dealer fails to qualify.
- [ ] The Play wager amount always equals the Ante amount exactly.

### Settlement — Ante Bonus

- [ ] Ante Bonus is paid on **straight or better** only.
- [ ] Ante Bonus is paid **when the dealer does not qualify**. ✓
- [ ] Ante Bonus is paid **when the player loses the showdown**. ✓
- [ ] Ante Bonus is a multiple of the **Ante**, not of Ante + Play.
- [ ] With `payAnteBonusOnFold: false`, folding forfeits the Ante Bonus even with a straight flush.
- [ ] Regression test: Ante 10, player straight flush, dealer higher straight flush → net **+30** (−10 −10 +50).

### Settlement — Pair Plus

- [ ] Pair Plus resolves **identically whether the player folded or played**. ✓
- [ ] Pair Plus **never** looks at the dealer's cards.
- [ ] Pair Plus wins on exactly **5,660 of 22,100** hands (**25.6109%**). ✓
- [ ] With the recommended paytable, simulated Pair Plus RTP converges to **97.68%** (HE 2.3167%). ✓

### Settlement — 6 Card Bonus

- [ ] The 6 Card Bonus uses the best 5-card hand from the player's 3 + the dealer's 3, with **standard 5-card rankings** (flush beats straight).
- [ ] The 6 Card Bonus resolves even when the player folds — therefore the dealer's cards are revealed **even if every player folded**. ✓
- [ ] A best-five hand of **two pair loses**. ✓
- [ ] With the recommended paytable, simulated RTP converges to **91.44%** (HE 8.5614%). ✓

### Strategy and math

- [ ] `shouldPlay()` returns true for exactly **14,900 of 22,100** hands and false for exactly **7,200**. ✓
- [ ] `shouldPlay(Q-6-4 offsuit) === true` and `shouldPlay(Q-6-3 offsuit) === false`. ✓
- [ ] `shouldPlay()` returns true for every hand of category ≥ PAIR (all 5,660). ✓
- [ ] `shouldPlay()` returns false for every high-card hand whose top card is J or lower. ✓
- [ ] Full enumeration of all 22,100 × 18,424 player/dealer pairs under `shouldPlay()` yields an expected value of **−3.3730%** of the Ante with `RECOMMENDED_CONFIG`. ✓
- [ ] The same enumeration yields an element of risk of **2.0147%** (average total wagered **1.674208** units). ✓
- [ ] Round outcome frequencies converge to fold **32.5792%**, no-qualify **20.9970%**, win **23.9101%**, draw **0.0657%**, loss **22.4480%**. ✓

### Economy and UX

- [ ] At Ante placement, a matching amount is **reserved** so the Play wager is always affordable. Max ante ≤ `floor((balance − sideBets) / 2)`.
- [ ] The player can never reach the `DECISION` phase unable to afford the Play wager.
- [ ] All balances and payouts are integers in minor units; no floating-point arithmetic anywhere in the money path.
- [ ] A zero side bet is treated as "not placed", not as a losing bet of 0.
- [ ] The UI explicitly explains the "dealer did not qualify" case, which is the game's most confusing rule.
- [ ] The optional Q-6-4 hint is available and matches `shouldPlay()` exactly.
- [ ] Full RTL layout; payout odds isolated with `unicodeBidi: 'isolate'` so `40:1` does not mirror.

---

## 14. Sources

| # | Source | Used for |
|---:|---|---|
| 1 | **Wizard of Odds — Three Card Poker** — <https://wizardofodds.com/games/three-card-poker/> | Combination counts and probabilities; all 6 Ante Bonus paytables with house edge and element of risk; all 10 Pair Plus paytables and all 7 Mini Royal paytables with house edges; 6 Card Bonus combination counts and 4 paytables; the Q-6-4 rule; mimic-dealer (3.45%) and always-raise (7.65%) figures; ties-to-player variant (3.24%) |
| 2 | **Massachusetts Gaming Commission — Three Card Poker rules (205 CMR, adopted 7-26-18)** — <https://massgaming.com/wp-content/uploads/Three-Card-Poker-7-26-18.pdf> | The authoritative regulatory text. §1 wager definitions (Play must equal Ante); §2 single 52-card deck; §3(a) card rank, suits equal, ace completes A-2-3; §3(b) hand ranking order with highest/lowest of each; §3(c) tie-breaking and draws; §5 shuffle every round; §6(a) wager combinations; §6(f) Ante-precondition variants; §6(g) 6 Card Bonus rules incl. eligibility after folding; §7–9 dealing procedure; §10(b) fold procedure and Pair Plus still being checked; §11(a)(1) dealer qualification and settlement; §11(a)(2) minimum Pair Plus odds; §11(a)(3) Ante Bonus and the Play-wager precondition, plus Mini Royal Tables A/B/C; §7 the four approved 6 Card Bonus paytables TCP-6B1…6B4; §14 irregularities |
| 3 | **Pagat — Three Card Poker** — <https://www.pagat.com/banking/3cardpoker.html> | Ace high/low ("A-K-Q is the highest type of straight and 3-2-A is the lowest. 2-A-K is not a straight"); pair tie-breaking by pair rank then kicker; high-card comparison procedure; ties → ante and play returned; Ante Bonus paid "irrespective of dealer's hand or outcome"; Pair Plus paid even if the player folds and depends only on the player's cards |
| 4 | **Upswing Poker — Three-Card Poker rules & strategy** — <https://upswingpoker.com/three-card-poker-rules-strategy/> | "Even if a player has a losing hand compared to the dealer, s/he will still receive his/her Ante bonus"; dealer qualification wording; Q-6-4 rule |
| 5 | **Stones Gambling Hall — Three Card Poker 6 Card Bonus** — <https://www.stonesgamblinghall.com/portfolio-item/three-card-poker-6-card-bonus/> | A live posted 6 Card Bonus paytable (1000/200/100/20/15/9/8 = TCP-6B2, HE 6.7413%) and a live Mini Royal Pair Plus paytable (MR 200 / 40 / 30 / 6 / 3 / 1, HE 4.3801%) |
| 6 | **California Bureau of Gambling Control — Three Card Poker rules** — <https://oag.ca.gov/sites/all/files/agweb/pdfs/gambling/BGC_three_card_poker.pdf> | Cross-check of the card-room variant rule set |
| 7 | **New Hampshire Lottery Commission — 3-Card Poker with Pairs Plus and 6-Card Bonus** — <https://www.compliance.lottery.nh.gov/sites/g/files/ehbemt686/files/inline-documents/agp-3-card-poker-v-2.pdf> | Cross-check of the 6 Card Bonus rules |
| 8 | **Bally's Atlantic City — Three Card Poker gaming guide** — <https://casinos.ballys.com/atlantic-city/files/7644/BLYS_AC-ThreeCardPoker-GamingGuide-4x9-v3.pdf> | Player-facing New Jersey rule sheet, cross-check |
| 9 | **Caesars — How to play 3 Card Poker** — <https://www.caesars.com/las-vegas/explore/casino/how-to-play-3-card-poker> | Nevada operator player-facing rules, cross-check |

**Independent verification.** All combination counts, probabilities, house edges, elements of risk, raise frequencies, outcome distributions and the optimality of the Q-6-4 rule stated in this document were recomputed from first principles by exhaustive enumeration (407,222,600 player/dealer hand pairs) during its preparation, and agree with source #1 to every published digit.
