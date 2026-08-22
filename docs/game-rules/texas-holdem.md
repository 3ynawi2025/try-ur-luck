# Texas Hold'em — Implementation-Grade Rules Specification

**Project:** جرب حظك (Try Ur Luck) — Arabic-language mobile poker, **play-money only, no real gambling**.
**Target fidelity:** 99% match with live poker-room procedure (TDA / Robert's Rules).
**Audience:** engine implementers. Every rule here should be expressible as a unit test.

## Primary sources

| Source | URL |
|---|---|
| Poker Tournament Directors Association (TDA) — official rules index | https://www.pokertda.com/poker-tda-rules/ |
| TDA — view rules / procedures / addendum | https://www.pokertda.com/view-poker-tda-rules/ |
| TDA 2024 rules mirror (rule-numbered text) | https://alinenkarl.net/poker-tda-2024 |
| TDA 2024 changes summary | https://www.poker.org/latest-news/whats-new-in-the-2024-tda-poker-tournament-rules-update-ayEOG4F466jL/ |
| Robert's Rules of Poker (cardroom) — full text | https://www.thehendonmob.com/guide/rules_of_poker_cardroom.php |
| Robert's Rules of Poker — mirror | https://sites.google.com/site/brooktownleague/wsop-overviewrules/roberts-rules |
| Robert's Rules of Poker v11 (PDF) | http://cerauctions.net/RobsPkrRules11.pdf |
| PokerNews — tied hands / split pots | https://www.pokernews.com/poker-hands/tied-poker-hands.htm |
| PokerNews — ICM | https://www.pokernews.com/pokerterms/icm.htm |
| PokerNews — bad beat jackpot | https://www.pokernews.com/pokerterms/bad-beat-jackpot.htm |
| WSOP 2026 structure sheet (PDF) | https://assets.wsopcdn.com/wsop/a74347e9-7a68-40bc-9cd6-3e01db3d3234.pdf |
| WSOP structure sheets index | https://www.pokernews.com/tours/wsop/2025-wsop/wsop-structure-sheets.htm |
| Pot-limit raise calculation | https://intercom.help/plo-mastermind/en/articles/12529822-how-to-calculate-raise-sizes-in-pot-limit-omaha-plo |
| Pot-limit rules | https://thelodgepokerclub.com/pot-limit-omaha-poker-rules-beginners-guide/ |
| Rake structures / caps / no-flop-no-drop | https://www.vip-grinders.com/poker-strategy/rake-explained/ |
| Rake comparison 2026 | https://www.grindlab.gg/en/blog/poker-rake-comparison-2026 |
| Bad beat jackpot official rules (Potawatomi, PDF) | https://www.potawatomi.com/application/files/official-rules/official-rules-poker-bad-beat_APR19.pdf |
| Bad beat jackpot rules guide | https://www.pokerology.com/poker/rules/bad-beat-jackpot/ |
| High Hand of the Hour official rules (Golden Nugget, PDF) | https://www.goldennugget.com/contentassets/3d9de35eaa9649b985c5382f12449bc2/high-hand-april-rules.pdf |
| High Hand rules (Live! Casino) | https://www.livech.com/philadelphia/casino-and-gaming/high-hand-rules |
| Ultimate Texas Hold'em progressive (Wizard of Odds) | https://wizardofodds.com/games/ultimate-texas-hold-em/ |
| Straddle rules | https://upswingpoker.com/what-is-a-straddle/ |
| Showdown (Wikipedia) | https://en.wikipedia.org/wiki/Showdown_(poker) |

---

## 1. Table Setup

### 1.1 Seat counts

| Format | Seats | Notes |
|---|---|---|
| Heads-up | 2 | Button = small blind. Special blind/action order (§11.6). |
| Short-handed (6-max) | 3–6 | Most common mobile format. |
| Full ring (9-max) | 3–9 | Live standard. 10-max exists but 9 is the modern default. |

Engine requirement: seats are **fixed physical positions** indexed `0 … maxSeats-1`. Seats may be empty. Never derive position from a dense array of seated players — always from seat index modulo `maxSeats`, skipping empty and sitting-out seats.

### 1.2 Button and blinds

- The **button** (dealer position) marks the nominal dealer. It moves **one seat clockwise** after each hand (subject to dead-button rules, §11.5).
- **Small blind (SB)** = first eligible player clockwise from the button.
- **Big blind (BB)** = next eligible player clockwise from the SB.
- Standard sizing: `SB = BB / 2`. Some structures use `SB = 2/3 × BB` (e.g. 100/150) — make it configurable.
- The BB is the **minimum bet** for the entire hand in no-limit (§3.4).
- Blinds are **live**: the BB has the *option* to raise when action returns preflop (§3.3).

Heads-up (TDA Rule 34): *"The small blind is the button, is dealt the last card, and acts first pre-flop and last on all other betting rounds."* — https://alinenkarl.net/poker-tda-2024

### 1.3 Antes

| Ante type | Who posts | Amount | Notes |
|---|---|---|---|
| Traditional ante | Every player at the table | Typically 10–15% of BB | Slow; being phased out |
| **Big Blind Ante (BBA)** | The big blind only, for the whole table | Typically **1 × BB** | TDA-recommended (RP-11) |
| Button ante | The button only, for the whole table | 1 × BB | Less common |

**TDA 2024 RP-11:** the big blind ante format with **big-blind-first calculation** is recommended, and antes should **not** be reduced as play progresses.
*Big-blind-first* means: when the player in the BB is too short to cover both, their chips fill the **big blind first**, and any remainder goes to the ante. (Source: https://www.poker.org/latest-news/whats-new-in-the-2024-tda-poker-tournament-rules-update-ayEOG4F466jL/ , https://alinenkarl.net/poker-tda-2024)

Antes go into the **main pot** before any betting. They are *not* part of any player's "amount bet this round" and do not affect the call amount.

### 1.4 Straddle (optional, cash games only)

A voluntary blind posted **before cards are dealt**, normally **2 × BB**, which becomes the effective big blind for that hand (it raises `currentBet` and `lastFullRaiseSize` to the straddle amount, and the straddler gets the last option preflop).

| Variant | Position | Rule |
|---|---|---|
| UTG straddle | Seat left of BB | Standard; most widely allowed |
| Double / re-straddle | Next seat left, 2× previous | House option |
| Button / Mississippi straddle | Button (or any seat) | House option; preflop action then starts left of the straddler |

Source: https://upswingpoker.com/what-is-a-straddle/ , https://betandbeat.com/poker/rules/blinds/straddle/

Straddles are **never** used in tournaments. Recommend: config flag `straddle: 'off' | 'utg' | 'utg+double' | 'button'`, default `off`.

### 1.5 Cash game vs tournament

| Dimension | Cash game | Tournament |
|---|---|---|
| Chips | Represent value 1:1 | Represent tournament equity only (§10.5 ICM) |
| Blinds | Fixed | Rise on a timer (levels) |
| Stack | Buy-in range (e.g. 40–100 BB); rebuy anytime | Fixed start stack; rebuys only if the format allows |
| Leaving | Any time, cash out stack | Only by busting or a deal |
| Button when a player leaves | Standard forward move; missed-blind / post rules | **Dead button** (TDA Rule 32) |
| Blind when short | Post what you have, all-in | Same |
| Straddle | Optional | Never |
| Antes | Rare | Standard from mid-levels |
| Economy | Rake (§8) | Buy-in + fee (§8.2) |
| Unlimited re-raising heads-up | Allowed (Robert's Rules) | **Not** allowed — normal caps apply |

---

## 2. Hand Flow (exact sequence)

```
0.  PRE-HAND
    a. Verify >= 2 players with chips and not sitting out.
    b. Move the button one seat clockwise (dead-button logic, §11.5).
    c. Reset per-hand state: pot=0, board=[], each player: holeCards=[],
       committedThisStreet=0, committedThisHand=0, hasActedThisStreet=false,
       status = 'active' (or 'sitting_out').
    d. Shuffle a fresh 52-card deck with a CSPRNG.

1.  POST FORCED BETS   (order matters)
    a. Antes (traditional: every player; BBA: big blind only), into the pot.
    b. Small blind posts min(SB, stack).  If stack <= SB -> status='all_in'.
    c. Big blind posts min(BB, stack).    If stack <= BB -> status='all_in'.
       (BBA with big-blind-first: fill the blind first, remainder to the ante.)
    d. Straddles, in order, if enabled.
    e. currentBet      = largest forced bet posted (BB, or the largest straddle)
       lastFullRaise   = same value
       minOpen         = BB

2.  DEAL HOLE CARDS
    One card at a time, clockwise, starting with the SB (heads-up: the
    non-button player), two full passes. The BUTTON RECEIVES THE LAST CARD.
    (Heads-up: the button/SB is dealt last — TDA Rule 34.)

3.  PREFLOP BETTING ROUND
    First to act = first eligible player left of the BB / last straddler ("UTG").
    Heads-up: first to act = the BUTTON (= SB).
    The BB (or last straddler) has the OPTION to raise if action returns
    with no raise having occurred.

4.  BURN 1 CARD -> DEAL FLOP (3 cards face up)

5.  FLOP BETTING ROUND
    First to act = first eligible player left of the button.
    Heads-up: first to act = the NON-button player (button acts last).
    currentBet resets to 0; lastFullRaise resets to BB.

6.  BURN 1 CARD -> DEAL TURN (4th board card)
7.  TURN BETTING ROUND  (same order as flop)
8.  BURN 1 CARD -> DEAL RIVER (5th board card)
9.  RIVER BETTING ROUND (same order as flop)

10. SHOWDOWN (§6) or early win by fold-out (§7.4)
11. POT AWARD (§4, §7), rake if any (§8), jackpot evaluation (§9)
```

Total cards consumed at a full showdown: `2×players + 3 burns + 5 board`. A 9-handed hand uses 26 cards — a 52-card deck is always sufficient.

**All-in run-out:** if at any point fewer than two players can still act (i.e. at most one player has chips remaining and is not all-in), **all remaining betting rounds are skipped**. Deal the remaining burns and board cards with no betting, then go to showdown. Hands are tabled face-up immediately (TDA Rule 16: *"All hands will be tabled without delay once a player is all-in and all betting action by all other players in the hand is complete."*).

---

## 3. Betting Rules (most critical section)

### 3.1 State the engine must track

Per **street**:

| Variable | Meaning | Init preflop | Init postflop |
|---|---|---|---|
| `currentBet` | Highest total any player has committed *this street* | BB (or largest straddle) | 0 |
| `lastFullRaise` | Size of the last **full** bet-or-raise *increment* this street | BB (or straddle amount) | BB |
| `minOpen` | Minimum opening bet | BB | BB |
| `aggressorSeat` | Last player to bet or raise | BB seat (nominal) | null |

Per **player**:

| Variable | Meaning |
|---|---|
| `committedThisStreet` | Chips put in on this street |
| `committedThisHand` | Total chips put in this hand (drives side pots, §4) |
| `stack` | Remaining chips |
| `status` | `active` \| `folded` \| `all_in` \| `sitting_out` |
| `hasActedThisStreet` | Reset to `false` for **all** players whenever the action is legally reopened |
| `canRaise` | `false` when a short all-in reached them without a full raise (§3.5) |

### 3.2 Action order

**Preflop:** first to act is the first eligible player clockwise from the big blind (or from the last straddler). This is **UTG**. Blinds act **last**. In heads-up, the **button/SB acts first**.

**Postflop (flop, turn, river):** first to act is the first eligible player clockwise from the **button**. In heads-up, the button acts **last** on every postflop street.

"Eligible" = `status === 'active'` (folded, all-in and sitting-out players are skipped).

### 3.3 Closing a betting round

A betting round is complete when **all** of the following hold:

1. Every `active` player has `hasActedThisStreet === true`, **and**
2. Every `active` player has `committedThisStreet === currentBet` (or is `all_in`), **and**
3. **Preflop only:** if `currentBet` is still the un-raised BB/straddle, the big blind (or last straddler) has exercised their **option** (checked or raised). This is the "BB option" and is the single most commonly-omitted rule.

Also complete when fewer than two `active` players remain.

> Implementation note: condition (1) alone is insufficient and condition (2) alone is insufficient. Both are required. At the top of a postflop street `currentBet === 0` and all `committedThisStreet === 0`, so a check on (2) alone would immediately and wrongly declare the round over.

### 3.4 Legal actions

| Action | Available when | Effect |
|---|---|---|
| **Fold** | Always (though folding when you can check is legal but never correct) | `status='folded'`; committed chips stay in the pot |
| **Check** | `committedThisStreet === currentBet` | No chips; `hasActedThisStreet=true` |
| **Bet** | `currentBet === 0` | `amount >= minOpen` (= BB) and `<= stack`; if `amount === stack` an under-min bet is legal as an all-in. Sets `currentBet=amount`, `lastFullRaise=amount`, reopens action |
| **Call** | `currentBet > committedThisStreet` | Pay `min(currentBet - committedThisStreet, stack)`. If `stack` is insufficient it is a **call all-in** and does not change `currentBet` |
| **Raise** | `currentBet > 0` **and** `canRaise === true` **and** `stack > currentBet - committedThisStreet` | See §3.5 |
| **All-in** | Always (if `stack > 0`) | Commit entire stack. Classified as a call, a short raise or a full raise depending on the resulting total |

Note that "raise to X" is always expressed as a **total street commitment**, never as an increment. `chipsRequired = X - committedThisStreet`.

### 3.5 Minimum bet and minimum raise (NO-LIMIT)

> **TDA Rule 43 (Raise Amounts):** the minimum raise must equal *"the largest prior full bet or raise of the current betting round."* — https://alinenkarl.net/poker-tda-2024
> **Robert's Rules:** *"Any wager not all-in must be at least the size of the previous bet or raise in that round."* — https://www.thehendonmob.com/guide/rules_of_poker_cardroom.php

```
minOpenBet   = BB                                  // when currentBet == 0
minRaiseTo   = currentBet + lastFullRaise          // when currentBet  > 0
maxRaiseTo   = committedThisStreet + stack         // no-limit
```

Legal raise amounts: `minRaiseTo <= X <= maxRaiseTo`, **or** `X === maxRaiseTo` exactly (an all-in below `minRaiseTo` is always legal as a short all-in, §3.6).

**Worked examples (blinds 10/20):**

| Situation | `currentBet` | `lastFullRaise` | Legal min raise-to |
|---|---|---|---|
| Preflop, UTG first in | 20 | 20 | **40** |
| Preflop, UTG raised to 60 | 60 | 40 | **100** (not 120) |
| Preflop, UTG 60, MP re-raised to 180 | 180 | 120 | **300** |
| Flop, checked to you | 0 | 20 | min **bet** 20 |
| Flop, opponent bets 50 | 50 | 50 | **100** |
| Flop, bet 50, raise to 130 | 130 | 80 | **210** |

Note the second row: doubling `currentBet` is **wrong**. It only coincidentally matches the first preflop raise.

### 3.6 Incomplete raise / short all-in — when is the action reopened?

This is the rule most implementations get wrong.

> **TDA Rule 47 (Re-Opening the Bet):** *"In no-limit and pot limit, an all-in wager of less than a full raise does not reopen the betting to a player who has already acted and is not facing at least a full raise when the action returns to him."* Cumulative multiple short all-ins **can** reopen betting if together they total a full raise. — https://alinenkarl.net/poker-tda-2024
> **Robert's Rules (limit):** *"In limit play, an all-in wager of less than half a bet does not reopen the betting for any player who has already acted... An all-in wager of a half a bet or more is treated as a full bet, and a player may fold, call, or make a full raise."* — https://sites.google.com/site/brooktownleague/wsop-overviewrules/roberts-rules

#### Algorithm (no-limit / pot-limit)

```
function applyAggression(player, raiseTo):
    increment = raiseTo - currentBet
    isFullRaise = (increment >= lastFullRaise)

    currentBet = raiseTo                       // ALWAYS updated
    aggressorSeat = player.seat

    if isFullRaise:
        lastFullRaise = increment
        for p in players where p.status == 'active' and p != player:
            p.hasActedThisStreet = false       // action fully reopened
            p.canRaise = true
    else:
        // SHORT ALL-IN. currentBet rises (everyone must call the extra),
        // but lastFullRaise does NOT change.
        for p in players where p.status == 'active' and p != player:
            p.hasActedThisStreet = false       // must at least call/fold again
            if p.hadActedBeforeThisShortAllIn:
                p.canRaise = false             // may only CALL or FOLD
            // players who had NOT yet acted keep canRaise = true
    player.hasActedThisStreet = true
```

Two subtleties that must be handled:

1. **`lastFullRaise` is not raised by a short all-in.** A player who *is* still allowed to raise computes `minRaiseTo = currentBet + lastFullRaise` using the *pre-existing* `lastFullRaise`.
2. **Cumulative short all-ins reopen.** Track `pendingShortIncrement` — the total of consecutive short increments since the last full raise. When `pendingShortIncrement >= lastFullRaise`, treat the action as fully reopened (restore `canRaise = true` for everyone) and set `lastFullRaise = pendingShortIncrement`, then reset it to 0.

#### Worked example (no-limit, blinds 10/20)

| Step | Actor | Action | `currentBet` | `lastFullRaise` | Effect |
|---|---|---|---|---|---|
| 1 | UTG | raise to 60 | 60 | 40 | Full raise; action reopened |
| 2 | MP | call 60 | 60 | 40 | `hasActed = true` |
| 3 | CO | all-in for **85** | 85 | 40 (unchanged) | increment 25 < 40 → **short** |
| 4 | UTG | — | | | Already acted → may only **call 25 more** or **fold**. May NOT raise |
| 5 | MP | — | | | Already acted → may only **call 25 more** or **fold** |
| 6 | BTN | — | | | Has **not** acted → may fold, call 85, **or raise to ≥ 125** (= 85 + 40) |

If instead CO had gone all-in for **105** (increment 45 ≥ 40), that is a **full** raise: `lastFullRaise = 45`, everyone's action reopens, and the next legal raise is to ≥ 150.

**Cumulative case:** UTG raises to 60 (`lastFullRaise = 40`). CO all-in for 75 (short, +15). BTN all-in for 95 (short, +20). Cumulative short increment = 35 < 40 → UTG still cannot raise. If a third short all-in pushed the cumulative increment to ≥ 40, UTG's right to raise is restored.

#### Limit games

- All-in of **< half a bet**: does not reopen; earlier actors may call the extra or fold.
- All-in of **≥ half a bet**: treated as a full bet; earlier actors may fold, call, or make a **full** raise.

### 3.7 Betting caps by structure

| Structure | Minimum | Maximum | Raise cap |
|---|---|---|---|
| **No-limit** | BB (open) / `currentBet + lastFullRaise` (raise) | Player's entire stack | None (unlimited raises) |
| **Pot-limit** | Same minimums as no-limit | The pot-size formula below | None |
| **Fixed-limit** | Exactly the small bet (preflop/flop) or big bet (turn/river) | Same | **Cap of 4 bets** per round (bet + 3 raises), typical. Heads-up: *"Unlimited raising is allowed in heads-up play except in tournaments"* — Robert's Rules |

#### Pot-limit maximum raise formula (exact)

Let:
- `P` = total chips in the pot from all previous streets **plus** every chip committed by every player on the current street (including the bet you are facing)
- `toCall = currentBet - committedThisStreet`

```
maxRaiseTo = currentBet + toCall + P
           = 2 × currentBet − committedThisStreet + P
maxAdditionalChips = maxRaiseTo − committedThisStreet
```

Equivalent verbal form: *"three times the last bet or raise, plus everything else already in the pot."*

**Verification:**

| Scenario | `P` | `currentBet` | `toCall` | `maxRaiseTo` |
|---|---|---|---|---|
| Blinds 5/10, UTG opens pot preflop | 15 | 10 | 10 | **35** ✓ |
| Blinds 5/10, UTG raised to 30, next player pots | 45 | 30 | 30 | **105** ✓ (= 3×30 + 10 + 5) |
| Pot 100 from earlier streets, villain bets 50 | 150 | 50 | 50 | **250** ✓ |
| Flop, first to act, pot 80 | 80 | 0 | 0 | **80** ✓ |

Sources: https://intercom.help/plo-mastermind/en/articles/12529822-how-to-calculate-raise-sizes-in-pot-limit-omaha-plo , https://thelodgepokerclub.com/pot-limit-omaha-poker-rules-beginners-guide/

If `maxRaiseTo > committedThisStreet + stack`, clamp to the stack (an all-in is always legal).

### 3.8 String bets, verbal declarations, sizing

These are live-room procedural rules. In a digital client most are structurally impossible (the UI submits one atomic amount), but the equivalences matter for the API contract and for any voice/chat features.

| Rule | Source text | Digital equivalent |
|---|---|---|
| **String bets/raises forbidden** | *"String raises are not allowed. The dealer should enforce obvious infractions to this string-raise law without being asked."* — Robert's Rules | The API accepts exactly one `{action, amount}` per turn. No incremental chip pushes. Reject a second action for the same turn. |
| **Methods of raising (TDA 42)** | A raise requires *"pushing out the full amount in one motion"* or *"verbally declaring the full amount prior to pushing out chips."* Two-motion raises were eliminated in 2019. | Atomic action submission. |
| **Verbal declaration is binding** | *"A verbal statement in turn denotes your action, is binding, and takes precedence over a differing physical action."* — Robert's Rules | Any submitted action is final; no undo. |
| **Undersized raise must be completed (TDA 43)** | If a player raises 50%+ of a full raise but less than the minimum, they must **complete** it to the full minimum raise (unless all-in). | Server rejects `minOpenBet > amount` / `minRaiseTo > amount` unless `amount === maxRaiseTo`. Client should clamp the slider, not the server's job to guess. |
| **Overchip rule (TDA 41)** | A single oversized chip pushed silently is a **call**, not a raise. Multiple chips are a call if all are needed to reach the call amount. | N/A digitally, but: if a client sends `raise` with `amount <= currentBet`, treat it as an error, not a call. |
| **"Raise" sizing semantics** | "Raise to X" is the total street commitment. "Raise X" (increment) is ambiguous and rejected in most rooms. | **API must use raise-TO semantics.** Document it. Mixing the two is a top-3 source of engine bugs. |

---

## 4. All-In and Side Pots

### 4.1 Principle

Every player can only win chips they **covered**. A player who is all-in for 100 can win at most 100 from each opponent who was contesting the pot at that point.

### 4.2 Exact pot-building algorithm

Run this at showdown (or incrementally at the end of each street — the layered version below is the reference; incremental variants must produce the identical result).

```
INPUT:  contrib[p]  = total chips committed this hand by EVERY player
                      (including folded players — their chips are dead
                       money and stay in the pot)
        inHand[p]   = true if p is 'active' or 'all_in' (NOT folded)

ALGORITHM buildPots():
  levels = sorted(unique({ contrib[p] : contrib[p] > 0 }))   // ascending
  prev   = 0
  pots   = []

  for L in levels:
      amount = 0
      for p in allPlayers:
          amount += min(contrib[p], L) − min(contrib[p], prev)
      eligible = { p : inHand[p] AND contrib[p] >= L }
      if amount > 0:
          pots.append({ amount, eligible })
      prev = L

  // Merge adjacent pots with an identical eligible set
  merge consecutive pots where eligible sets are equal

  return pots     // pots[0] = MAIN POT, pots[1..] = SIDE POTS in creation order
```

**Uncalled-bet return.** Before running `buildPots`, return any uncontested excess: if exactly one player's `contrib` exceeds every other in-hand player's `contrib`, refund the difference to them immediately and reduce their `contrib` accordingly. (Live rooms do this at the moment the bet goes uncalled. A pot with exactly one eligible player is a bug indicator.)

**Invariant to assert in tests:** `Σ pots[i].amount === Σ contrib[p]` and `Σ awards === Σ contrib[p]`. Chips are conserved to the unit.

### 4.3 Awarding order

> **Robert's Rules:** *"If there is a side pot, the winner of that pot should be decided before the main pot is awarded. If there are multiple side pots, they are decided and awarded by having the pot with the players starting the deal with the greatest number of chips settled first."*
> **TDA Rule 21:** *"Each side pot will be split separately."*

So: award **last-created side pot first**, working down to the main pot. Each pot is evaluated **independently** — the best hand among that pot's `eligible` set wins it. The same player may win several pots; different players may win different pots.

### 4.4 Worked numerical example — 4 players, 4 stack sizes

Blinds 10/20. Four players, all get their whole stack in by the river.

| Player | Starting stack | Total committed (`contrib`) | Result |
|---|---|---|---|
| Alice | 100 | 100 (all-in) | |
| Bob | 300 | 300 (all-in) | |
| Carol | 500 | 500 (all-in) | |
| Dave | 1000 | 500 (called; 500 behind) | |

`levels = [100, 300, 500]`

| Layer | Slice arithmetic | Pot amount | Eligible |
|---|---|---|---|
| L=100 | 100 + 100 + 100 + 100 | **400** — MAIN POT | Alice, Bob, Carol, Dave |
| L=300 | 0 + 200 + 200 + 200 | **600** — SIDE POT 1 | Bob, Carol, Dave |
| L=500 | 0 + 0 + 200 + 200 | **400** — SIDE POT 2 | Carol, Dave |

Total = 400 + 600 + 400 = **1400** = 100 + 300 + 500 + 500 ✓

Showdown hand strength: **Alice > Bob > Carol > Dave**.

Award in reverse creation order:

1. **Side pot 2 (400)** — eligible {Carol, Dave}. Carol beats Dave → **Carol +400**.
2. **Side pot 1 (600)** — eligible {Bob, Carol, Dave}. Bob is best → **Bob +600**.
3. **Main pot (400)** — eligible {all}. Alice is best → **Alice +400**.

| Player | In | Out | Net | Final stack |
|---|---|---|---|---|
| Alice | 100 | 400 | **+300** | 400 |
| Bob | 300 | 600 | **+300** | 600 |
| Carol | 500 | 400 | **−100** | 400 |
| Dave | 500 | 0 | **−500** | 500 |

Net sum = 0 ✓ — note the counter-intuitive but correct outcome: the *best hand* (Alice) wins the *least*.

### 4.5 Variant with dead money from a folded player

Same table, but add **Eve** who posts the BB of 20, calls a raise to 60 (`contrib = 60`), then folds on the flop.

`levels = [60, 100, 300, 500]`

| Layer | Amount | Eligible (Eve excluded — folded) |
|---|---|---|
| L=60 | 60×5 = **300** | Alice, Bob, Carol, Dave |
| L=100 | 40×4 = **160** | Alice, Bob, Carol, Dave |
| L=300 | 200×3 = **600** | Bob, Carol, Dave |
| L=500 | 200×2 = **400** | Carol, Dave |

After merging the first two layers (identical eligible sets): **main pot 460**, side pot 1 = 600, side pot 2 = 400. Total 1460 = 60+100+300+500+500 ✓. Eve's 60 is dead money in the main pot.

---

## 5. Hand Rankings

The best **five-card** hand is formed from any of the player's 7 cards (2 hole + 5 board): both hole cards + 3 board, one hole card + 4 board, or **zero hole cards + all 5 board** ("playing the board"). Suits are **never** used to rank a hand.

| # | Rank | Definition | Tie-break, in order |
|---|---|---|---|
| 1 | **Royal Flush** | A-K-Q-J-T, all one suit | Cannot be beaten; ties split |
| 2 | **Straight Flush** | 5 sequential cards, one suit | Highest top card. **A-2-3-4-5 ("steel wheel") is 5-high, the LOWEST straight flush** |
| 3 | **Four of a Kind** | 4 cards of one rank | Quad rank, then the single kicker |
| 4 | **Full House** | 3 of a rank + 2 of another | Trips rank, then pair rank |
| 5 | **Flush** | 5 cards of one suit, not sequential | Highest card, then 2nd, 3rd, 4th, 5th |
| 6 | **Straight** | 5 sequential ranks, mixed suits | Highest top card. **A-2-3-4-5 ("wheel") is 5-high, the LOWEST straight** |
| 7 | **Three of a Kind** | 3 cards of one rank | Trips rank, then highest kicker, then 2nd kicker |
| 8 | **Two Pair** | 2 + 2 of different ranks | Higher pair, then lower pair, then the single kicker |
| 9 | **One Pair** | 2 cards of one rank | Pair rank, then 3 kickers in order |
| 10 | **High Card** | None of the above | All 5 cards compared in descending order |

Rank order for card values: `2 < 3 < … < 10 < J < Q < K < A`. The ace is **both** the highest card and the low end of the wheel (A-2-3-4-5). There is **no** "around the corner" straight (Q-K-A-2-3 is not a straight).

### 5.1 Critical evaluator invariants

1. **Wheel detection must set the straight's high card to 5, not to the ace.** A 5-high straight loses to a 6-high straight and to every other straight.
2. **A royal flush is exactly `A-K-Q-J-T` suited** — testing "is a straight flush AND contains an ace" incorrectly promotes the steel wheel to a royal flush. Test the *high card of the straight* == Ace **after** wheel normalisation.
3. **Only kickers inside the best five cards count.** If your hole cards do not improve on the board, they do not act as kickers. Example: board `A♠ K♦ Q♣ J♥ 9♠`; you hold `2♣ 3♦`, opponent holds `4♠ 5♥`. Both play the board — **split pot**, the 3 and the 5 are irrelevant because the hand is A-K-Q-J-9.
4. The evaluator must expose a **total-order comparator** and an **equality** predicate, not merely a `>` check, so ties are detectable.
5. The evaluator should report **which of the 7 cards form the best 5**, flagged as hole vs board. This is required for the "must use both hole cards" conditions of bad-beat and high-hand jackpots (§9).

### 5.2 Playing the board

If a player's best five-card hand is exactly the five community cards, they are "playing the board". They cannot lose that pot outright — worst case they split it with everyone else who also cannot beat the board.

> **Robert's Rules:** *"You must declare that you are playing the board before you throw your cards away. Otherwise, you relinquish all claim to the pot."*

In a digital engine, the server evaluates every non-folded hand automatically, so this declaration requirement is moot — but the case must be handled: a board of `A♠ A♥ A♦ A♣ K♠` means every remaining player has quad aces with a king kicker and the pot is split *n*-ways.

### 5.3 Split pots

The pot is split among **all** players whose best five-card hands are exactly equal in rank and every tie-breaker. Sources: https://www.pokernews.com/poker-hands/tied-poker-hands.htm

```
awardPot(pot):
    best     = max(evaluate(p) for p in pot.eligible)
    winners  = [ p in pot.eligible where evaluate(p) == best ]   // exact equality
    share    = floor(pot.amount / winners.length)
    remainder= pot.amount − share × winners.length               // "odd chips"
    each winner receives `share`
    distribute `remainder` per §6.3
```

---

## 6. Showdown

### 6.1 Who shows first

> **TDA Rule 17 (Non All-In Showdowns & Showdown Order):** the last aggressive player on the final betting round tables first; if there was no bet on the final round, the player who would act first in that round shows first.
> **Robert's Rules:** *"If there is wagering on the final betting round, the last player to take aggressive action by a bet or raise is the first to show the hand."* If everyone checks, *"the first player to the left of the dealer button is the first to show the hand."*

```
if (riverBettingOccurred):
    firstToShow = lastAggressorOnRiver
else:
    firstToShow = first active player clockwise from the button
                  (heads-up: the non-button player)
then proceed clockwise
```

**All-in exception (TDA Rule 16):** once a player is all-in and all other betting action is complete, **all** remaining hands are tabled face-up immediately, before the remaining board cards are dealt. There is no show-order and no mucking.

**Side pot exception (Robert's Rules):** players contesting a side pot show before players who are all-in only for the main pot, because side pots are settled first.

### 6.2 Mucking

- A player who is not required to show first may **muck** (fold face down) rather than reveal a losing hand.
- A player may **never** muck and still claim a pot. Mucked hands are dead.
- Live rooms allow "show one, show both" and enforce that any player may request to see a called hand; in a digital app the standard is a **"Show hand" / "Muck" prompt with a short timer**, defaulting to muck when the hand is beaten and to show when it wins.
- **Recommended app policy:** the server always evaluates every non-folded hand and awards the pot correctly regardless of the show/muck choice; the show/muck choice affects only what the *other players* see. Never let a UI choice change the outcome.
- Winning hands must be revealed in an uncontested-showdown scenario? No — if all opponents fold, the winner is **never** required to show (§7.4).

### 6.3 Odd chip distribution

> **TDA Rule 20 (Awarding Odd Chips):** in board games with two or more high hands, *"the odd chip goes to the first seat left of the button."*
> **Robert's Rules:** in button games, *"the first hand clockwise from the button gets the odd chip."* And: *"All side pots and the main pot will be split as separate pots, not mixed together"*, and *"no player may receive more than one odd chip."*

Algorithm for a pot with `n` tied winners and `r` odd chips (`0 <= r < n`):

```
order winners by seat, starting from the first seat clockwise of the button
give 1 extra chip to each of the first `r` winners in that order
```

Each pot's remainder is distributed independently. Suits are **never** used to break a tie for a pot in hold'em (suit order only appears in stud-family high-card-by-suit rules; Robert's Rules: *"Suits never break a tie for winning a pot."*).

Because the app uses integer play-money chips, always work in whole chips and assert `Σ awards === pot.amount`.

---

## 7. Win / Loss Resolution

### 7.1 Sequence

```
1. buildPots()                      (§4.2)
2. for each pot from LAST side pot down to the MAIN pot:
     determine winner(s) among pot.eligible          (§5.3)
     split with odd-chip rule                        (§6.3)
     credit each winner's stack
3. assert Σ credits == Σ contributions
4. record hand history (board, all revealed hands, every action, pot map)
5. evaluate jackpots / promotions                    (§9)
6. mark busted players (stack == 0) — tournament: eliminate; cash: sit out
```

### 7.2 Split pots
See §5.3 and §6.3. Split each pot separately; never pool pots before splitting.

### 7.3 Odd chips
See §6.3. First seat clockwise from the button among the tied winners.

### 7.4 Hand ends early (everyone folds)

- The last remaining player wins **every** pot immediately.
- **No cards are shown.** This is the rule. The winner has an option to show voluntarily (and in most rooms it is discouraged), but the engine must never reveal the hole cards of a player who won without a showdown.
- The hand ends the moment the second-to-last player folds — no further board cards are dealt (though many apps deal the remaining board face-up as a "run it out" cosmetic; that is a display choice and must not reveal hole cards).
- Any uncalled portion of the winner's own bet is returned to them (it never becomes part of the pot in the first place, §4.2).

### 7.5 Busted players
- **Cash game:** stack 0 → status `sitting_out`, prompt for a rebuy/top-up. Table-stakes rule: a player may only wager the chips on the table at the start of a hand; no reaching into pocket mid-hand.
- **Tournament:** stack 0 → eliminated; record the finishing place; award the payout for that place (§10.3). Simultaneous eliminations in the same hand are ranked by starting stack (larger stack finishes higher); equal starting stacks split the combined prizes for the tied places.

---

## 8. Rake / Economy

### 8.1 Real-money cash game rake

| Concept | Typical value | Notes |
|---|---|---|
| Percentage | **5%** of the pot | Industry standard online |
| Cap | Scales with stake: ~$0.50 at NL10 up to **$5** at NL200+ | The cap dominates at higher stakes; a $200 pot at NL500 pays $5 = 2.5% effective |
| **No flop, no drop** | If the hand ends before the flop, **no rake is taken** | Near-universal; GGPoker is a notable exception, raking preflop 3-bet pots |
| Increment | Usually taken in $0.01–$0.25 steps as the pot grows | |
| Short-handed discount | Reduced cap heads-up / 3-handed | Common |

Sources: https://www.vip-grinders.com/poker-strategy/rake-explained/ , https://www.grindlab.gg/en/blog/poker-rake-comparison-2026

```
rake = min(floor(pot × rakePercent), capForStakeAndPlayerCount)
if (!flopWasDealt) rake = 0
```

Rake is deducted from the pot **before** it is awarded. In a multi-pot situation, rake is taken from the total and normally attributed to the main pot first.

### 8.2 Tournament fee structure

Advertised as **buy-in + fee**, e.g. `$100 + $10`:
- The **buy-in** ($100) goes 100% into the prize pool.
- The **fee** ($10, ~9–10% of the total) is the house's revenue and covers dealers and overhead.
- Rebuys and add-ons usually carry **no fee**, or a reduced one.
- No per-hand rake is taken during tournament play.

### 8.3 Economy model recommendation for a PLAY-MONEY social app

**Do not implement rake.** In a play-money app rake serves no purpose and actively harms the product:
- It has no revenue function (the chips are not redeemable).
- It bleeds every player's balance toward zero, forcing refills that feel punitive rather than aspirational.
- In several jurisdictions, a play-money game that takes a "house cut" and sells chips edges closer to being regulated as gambling. Since this app is explicitly non-gambling, keep the loop clean: **chips in = chips out at every table.**

Instead, control chip inflation with **sinks** and monetise with **non-competitive** goods:

| Mechanism | Type | Recommendation |
|---|---|---|
| **Tournament buy-ins** (chips) | Sink | ✅ Strong primary sink. Chips leave circulation, prize pool returns ~90%, the rest is burned. Feels fair, mirrors real poker |
| **Daily / hourly free chips** | Faucet | ✅ Scale by how far the player is *below* a baseline, not a flat amount — self-balancing |
| **"Go bust" safety net** | Faucet | ✅ Guaranteed small refill so a player is never locked out. This is the ethical core of play-money |
| **Cosmetics** (avatars, card backs, table felts, emotes, chip skins) | Revenue | ✅ Primary monetisation. Zero competitive impact |
| **Chip packs (IAP)** | Revenue | ✅ Acceptable, but never sell an in-game *advantage*; chips must not be cashable or tradeable |
| **VIP subscription** | Revenue | ✅ Larger daily bonus, exclusive cosmetics, extended time bank, hand-history export. Avoid anything that changes hand outcomes |
| **Rewarded video ads** | Revenue | ✅ Optional chip top-up |
| **Table "fee" in chips** | Sink | ⚠️ Only if inflation is provably out of control. Prefer tournament sinks |
| **Rake** | — | ❌ Do not implement |
| **Pay-to-win boosts** (peek at a card, re-deal, undo) | — | ❌ Never. Destroys game integrity |
| **Chip trading / gifting between players** | — | ❌ Creates a grey market and a real-money proxy |

**Inflation control target:** measure the total chips in circulation weekly. Faucets (daily bonuses + bust refills) should be roughly balanced by sinks (tournament rake-equivalent burn + cosmetic-for-chips purchases). A ~5–10% burn on tournament prize pools is a good, invisible sink.

**Loyalty (see §9.4):** award non-monetary XP/points for hands played and hands won; convert to cosmetics and tournament tickets, never to a competitive edge.

---

## 9. Bonus / Jackpot Systems

Documented here for accuracy. **In a play-money app these should be re-skinned as chip/cosmetic rewards, never cash.** They are excellent retention mechanics.

### 9.1 Bad Beat Jackpot (BBJ)

A jackpot paid when a very strong hand *loses*.

**Typical qualifying rules** (sources: https://www.pokerology.com/poker/rules/bad-beat-jackpot/ , https://www.potawatomi.com/application/files/official-rules/official-rules-poker-bad-beat_APR19.pdf , https://www.pokernews.com/pokerterms/bad-beat-jackpot.htm , https://poker.fandom.com/wiki/Bad_beat_jackpot):

| Requirement | Typical rule |
|---|---|
| Minimum losing hand | **Aces full of Jacks or better**, beaten by four of a kind or better. Some rooms use quads-beaten-by-better, or aces-full-of-tens |
| Qualifier ratchet | The threshold does not drop below aces-full-of-jacks and stays there until the jackpot is hit |
| Both hole cards | **Both** the winner and the loser must use **both** of their hole cards to form the qualifying five-card hand |
| Quads with a pocket pair | If the qualifying hand is four of a kind, the player must hold a **pocket pair** matching the quads |
| Showdown required | The hand must go to a real showdown with both hands tabled |
| Minimum players | Usually ≥ 2 dealt in, often ≥ 4 for the table share |
| Minimum pot / rake | The hand must have been raked (i.e. a flop must have been dealt) |
| Board cannot make it | Hands made entirely by the board are excluded (implied by the both-hole-cards rule) |
| Funding | A separate **$1 jackpot drop** per raked pot, on top of the normal rake |

**Typical distribution:**

| Recipient | Share |
|---|---|
| **Loser** of the hand (the bad beat) | **50%** |
| **Winner** of the hand | **25%** |
| **Table share** — split equally among all other players dealt into that hand, *including those who folded* | **25%** |

Variants: 40/30/20 with 10% retained to seed the next jackpot is also common. Where multiple losing hands qualify, the *highest* losing hand takes the loser's share and the others receive only the table share.

**Play-money adaptation:** a "Bad Beat Bonus" pool that accumulates a small number of chips per hand and pays out in chips + a rare cosmetic badge. This is the single highest-retention promotion in poker.

### 9.2 High Hand promotions

The best hand made during a period wins a fixed prize.

Sources: https://www.goldennugget.com/contentassets/3d9de35eaa9649b985c5382f12449bc2/high-hand-april-rules.pdf , https://www.livech.com/philadelphia/casino-and-gaming/high-hand-rules , https://somuchpoker.com/poker-term/poker-high-hand-jackpot-guide

| Rule | Typical value |
|---|---|
| Qualifying period | Hourly — from the top of the hour to the start of the next; the winner is announced at the end of the period |
| Minimum qualifying hand | Usually **quads** or better (sometimes a straight flush at busy rooms) |
| Both hole cards | Commonly required. Some rooms pay a reduced prize (e.g. $100 instead of $200) if only one hole card plays |
| Minimum pot | Often ≥ $10 in the pot |
| Minimum players dealt in | Often ≥ 4 |
| Showdown needed? | **No** — the hand need not win or be shown down; it only needs to be *made*. The player must notify the dealer immediately |
| Tie-break | Earliest occurrence in the period wins, or the prize is split |
| Progressive variant | Prize accumulates from a small drop and resets after being hit |

**Play-money adaptation:** "Hand of the Hour" — free to enter, awards chips + a leaderboard placement. Cheap, drives session length, drives return visits at the top of the hour.

### 9.3 Progressive side bets (casino hold'em variants)

These belong to *house-banked* games (Ultimate Texas Hold'em, Casino Hold'em, Three Card Poker), **not** to player-vs-player hold'em.

Source: https://wizardofodds.com/games/ultimate-texas-hold-em/

| Element | Typical structure |
|---|---|
| Stake | Fixed optional side bet, $1 or $5, placed before any cards are dealt |
| Cards evaluated | The player's 2 hole cards + the **flop** only (5 cards). Turn and river do not count |
| Trigger | Three of a kind or better |
| Paytable | Royal Flush **100% of the progressive meter**; Straight Flush **10% of the meter**; then fixed amounts: Four of a Kind ~500:1, Full House ~50:1, Flush ~40:1, Straight ~30:1, Trips ~9:1 (paytables vary by casino) |
| 6-Card Bonus | Separate side bet using the player's 2 cards + all 5 board cards; the best 5 of 6/7 pays a fixed table |
| House edge | Typically 10–25% — very high; these are pure entertainment bets |

**Recommendation for this app:** do **not** add house-banked side bets to the player-vs-player hold'em table. They change the game's character, they are the mechanic most likely to make a play-money app look like a slot machine, and they are the mechanic most likely to attract app-store gambling classification. If a "bonus" feel is wanted, use §9.1/§9.2 style promotions, which are pooled among players and cost nothing.

### 9.4 Rakeback and loyalty systems

| System | Mechanics |
|---|---|
| **Straight rakeback** | A fixed % of the rake the player generated is returned, typically **20–60%**, paid weekly or monthly |
| **VIP tiers** | Points accrue per raked hand/tournament fee; effective rakeback rises with tier (e.g. 10% → 60%). Tiers usually reset annually |
| **Points store** | Points convert to tournament tickets, merchandise, or cash at a published rate |
| **Missions / challenges** | Complete objectives ("play 200 hands", "win with a flush") for chest rewards. The modern replacement for straight rakeback |
| **Leaderboards** | Points-per-hand races, daily/weekly, prizes to the top N |

**Play-money adaptation (recommended stack):**
1. **XP** for every hand played (small) and every hand won (larger) — drives a level number, purely cosmetic prestige.
2. **Daily missions** (3 per day, refresh at a fixed hour) → chip rewards + a cosmetic currency.
3. **Weekly leaderboard** by chips won → tournament tickets and exclusive card backs.
4. **Login streaks** with escalating daily chip bonuses, resetting on a miss.
5. **No rakeback equivalent** — there is no rake to give back.

---

## 10. Tournament Specifics

### 10.1 Blind level structure and timing

| Format | Level length | Starting stack (in BB) | Character |
|---|---|---|---|
| Hyper-turbo | 3 min | 25–50 BB | Push/fold almost immediately |
| Turbo | 6–10 min | 50–100 BB | Fast |
| Standard online | 12–20 min | 100–150 BB | |
| Live daily | 20–30 min | 100–200 BB | |
| Deep stack / major | 40–60 min | 200–300 BB | |
| **WSOP Main Event** | **120 min** (Days 1–2), 90 min later | 60,000 chips = **300 BB** at 100/200 | Slowest in poker |

WSOP Main Event opening levels (big blind ante format): `100/200 (200 ante)`, `200/300 (300)`, `200/400 (400)`, `300/600 (600)`, `400/800 (800)`.
Sources: https://assets.wsopcdn.com/wsop/a74347e9-7a68-40bc-9cd6-3e01db3d3234.pdf , https://www.pokernews.com/tours/wsop/2025-wsop/wsop-structure-sheets.htm

**Design rule for the blind ladder:** each level should raise the blinds by roughly **25–50%** over the previous level, never doubling. A standard, well-behaved ladder:

| Level | SB / BB | Ante (BBA) |
|---|---|---|
| 1 | 25 / 50 | — |
| 2 | 50 / 100 | — |
| 3 | 75 / 150 | — |
| 4 | 100 / 200 | 200 |
| 5 | 150 / 300 | 300 |
| 6 | 200 / 400 | 400 |
| 7 | 300 / 600 | 600 |
| 8 | 400 / 800 | 800 |
| 9 | 500 / 1,000 | 1,000 |
| 10 | 700 / 1,400 | 1,400 |
| 11 | 1,000 / 2,000 | 2,000 |
| 12 | 1,500 / 3,000 | 3,000 |

**Engine requirements:**
- Levels advance on a **wall clock** timer, not on hands played.
- The blind increase takes effect at the **start of the next hand**, never mid-hand.
- On a break, the clock pauses; hands in progress complete first.
- Antes start at a configurable level (commonly level 3–5) and are **not** reduced later (TDA RP-11).

### 10.2 Ante schedules

With **big blind ante**, the standard is `ante = 1 × BB`. Traditional antes run ~10–15% of the BB per player, so a 9-handed table contributes roughly the same total (~1 BB) either way — BBA just makes it one payment instead of nine.

### 10.3 Payout distribution curves

The standard is to pay approximately the **top 10–15%** of the field, rounded to a table-friendly number.

**Sit & Go / single table:**

| Field | Places paid | Distribution |
|---|---|---|
| 2 (heads-up) | 1 | 100% |
| 6 (6-max SNG) | 2 | 65 / 35 |
| 9–10 (full ring SNG) | 3 | **50 / 30 / 20** |
| 18 (2 tables) | 4 | 40 / 30 / 20 / 10 |
| 27 (3 tables) | 5 | 38 / 24 / 16 / 12 / 10 |
| 45 | 6 | 33 / 23 / 16 / 12 / 9 / 7 |

**MTT, 100 entrants, 15 paid (15%):**

| Place | % of prize pool |
|---|---|
| 1 | 24.0 |
| 2 | 15.0 |
| 3 | 11.0 |
| 4 | 8.5 |
| 5 | 7.0 |
| 6 | 5.5 |
| 7 | 4.5 |
| 8 | 4.0 |
| 9 | 3.4 |
| 10–12 | 3.0 each (9.0) |
| 13–15 | 2.7 each (8.1) |
| **Total** | **100.0** |

**Curve shape rules of thumb:**
- 1st place ≈ 20–28% for a typical MTT; flatter (15–18%) for very large fields, steeper (30%+) for small ones.
- 2nd ≈ 60–65% of 1st; 3rd ≈ 70% of 2nd.
- The **min-cash** should be at least **1.5–2× the buy-in** — a min-cash below 1.5× feels like a loss and hurts retention badly.
- Total must sum to exactly 100%. Compute the last tier as the remainder and distribute rounding remainders to the *lowest* paid places.

### 10.4 Rebuy / add-on

| Concept | Standard rule |
|---|---|
| **Rebuy period** | The first *n* levels (typically 3, ~1 hour) |
| **Rebuy eligibility** | Usually only when your stack is **at or below the starting stack** |
| **Double rebuy** | Some events allow buying two increments at once |
| **Rebuy chips** | Normally equal to the starting stack (sometimes less) |
| **Add-on** | A single optional purchase at the **end** of the rebuy period, available to **everyone regardless of stack**, often for 1.5–2× the normal chip amount |
| **Re-entry** | Distinct from a rebuy: the player must first bust, then re-enters as a new entrant with a fresh starting stack and a fresh seat. Counted separately in the entrant total |
| **Fees** | Rebuys and add-ons usually carry no fee, or a reduced one; all of it goes to the prize pool |
| **Freezeout** | No rebuys, no re-entry. One life |

### 10.5 ICM basics

Tournament chips are **not** money. The Independent Chip Model converts a stack into an expected share of the remaining prize pool.

**Assumption:** all players are of equal skill, so the probability of any finishing order is determined purely by stack sizes.

**Formulation.** Let `s_i` be player *i*'s stack and `S = Σ s_j`.

```
P(i finishes 1st) = s_i / S

P(i finishes 2nd) = Σ_{j ≠ i}  (s_j / S) × ( s_i / (S − s_j) )

P(i finishes 3rd) = Σ_{j ≠ i} Σ_{k ≠ i,j}
                      (s_j / S) × ( s_k / (S − s_j) ) × ( s_i / (S − s_j − s_k) )

... recursively, for as many places as are paid.

Equity_i = Σ_over paid places k   P(i finishes k) × Payout_k
```

Complexity is `O(n!)` if computed exactly; for `n > 8` use the standard recursive-with-memoisation or a Monte-Carlo approximation.

**Worked example.** 3 players left, stacks 5,000 / 3,000 / 2,000 (S = 10,000). Payouts 50 / 30 / 20 of a $1,000 pool.

Player A (5,000):
- P(1st) = 0.500
- P(2nd) = (3000/10000)×(5000/7000) + (2000/10000)×(5000/8000) = 0.2143 + 0.1250 = **0.3393**
- P(3rd) = 1 − 0.500 − 0.3393 = **0.1607**
- Equity = 0.500×500 + 0.3393×300 + 0.1607×200 = 250 + 101.8 + 32.1 = **$383.9**

Note A holds **50%** of the chips but only **38.4%** of the equity. This is the entire point:

**Key consequences to surface in the UI:**
1. A chip lost is worth more than a chip gained — equity is concave in stack size.
2. Doubling your stack does **not** double your equity.
3. On the bubble, ICM pressure is extreme; a marginal call that is +EV in chips can be badly −EV in dollars.
4. ICM is the correct basis for **deal-making** at a final table (an "ICM chop"). Implement this if you support final-table deals.

---

## 11. Edge Cases

### 11.1 Misdeals

> **Robert's Rules:** *"Once action begins, a misdeal cannot be called. The deal will be played, and no money will be returned to any player whose hand is fouled."*
> **TDA Rule 35:** *"Once substantial action occurs... a misdeal cannot be declared."*

**"Action begins"** = two players after the forced bets have acted. **"Substantial action"** (TDA) = either (a) any two actions in turn, at least one of which puts chips in the pot, or (b) any combination of three actions in turn.

| Misdeal cause | Applies |
|---|---|
| First or second card off the deck dealt face up / exposed | Yes |
| Two or more exposed hole cards | Yes |
| Two or more **boxed** cards (face up in the deck) | Yes |
| Cards dealt to an empty seat, or to a player not entitled to a hand | Yes |
| A player entitled to a hand is dealt out | Yes |
| Wrong number of cards dealt to a player (excess/short), discovered before action | Yes |
| The button is in the wrong position | Yes (if caught before action) |
| Two or more extra cards dealt | Yes |
| **One** extra card dealt | No — return it to the deck as the burn card |

On a misdeal: return all chips to their owners, re-shuffle, re-deal with the same button position.

**Digital reality:** a correctly-implemented server engine cannot produce any of these. **Implement the deck as an invariant-checked resource** (no duplicate cards, exact 52-card composition, no card issued twice) and treat a violation as a fatal server error requiring a hand void and a full chip refund, logged for audit. Do not build a user-facing misdeal flow.

### 11.2 Exposed cards

> **Robert's Rules:** *"A card that is flashed by a dealer is treated as an exposed card. A card that is flashed by a player will play."* Exposed cards are replaced by the next card in the deck. *"If a card is exposed due to dealer error, a player does not have an option to take or reject the card."*
> **TDA Rule 68:** *"Exposing cards with action pending... may result in a penalty but not a dead hand."*

Hold'em specifics (Robert's Rules):
- First or second hole card exposed by the dealer → **misdeal**.
- Any other exposed hole card → play continues; the card is replaced and the exposed card becomes a **burn card**.
- If the flop contains too many cards, **the entire flop is redealt** (the board cards are mixed back and reshuffled).
- Burn-card errors before flop betting may be corrected if no board cards were exposed.

**Digital:** a player exposing their own cards is only possible via a "show cards" feature. Rule: allow a player to voluntarily reveal a hole card **only** after they have folded, or at showdown. Never allow reveal-while-action-is-pending — it enables collusion signalling.

### 11.3 Acting out of turn

> **Robert's Rules:** *"Deliberately acting out of turn will not be tolerated. A player who checks out of turn may not bet or raise on the next turn to act. A player who has called out of turn may not change his wager to a raise on the next turn to act."*
> **TDA Rule 53 (Action Out of Turn):** out-of-turn action **backs up** to the correct player; the OOT action is **binding if the action does not change** before it comes back around. *"An OOT fold is binding."*

| OOT action | If action to them is unchanged when their turn arrives | If the action changed |
|---|---|---|
| Fold | Binding | **Still binding** — a fold is always binding |
| Check | Binding | Freed, but they **may not bet or raise** this turn |
| Call | Binding | Freed, but they **may not raise** this turn |
| Bet / Raise | Binding | Freed entirely |

**Digital implementation.** The clean solution is that the server simply **rejects any action from a player whose turn it is not**. Out-of-turn action then becomes impossible.

However, most modern clients offer **pre-action buttons** ("Fold", "Check/Fold", "Call Any", "Check"), which are the digital equivalent and must follow the rules above:

| Pre-action | Behaviour |
|---|---|
| **Fold** | Fires immediately when the turn arrives, unconditionally |
| **Check/Fold** | Checks if `toCall === 0`, otherwise folds |
| **Check** | Fires if `toCall === 0`; **cancels** if a bet arrived |
| **Call `X`** | Fires if `toCall === X`; **cancels** if the amount changed (this is the "action changed" rule) |
| **Call Any** | Fires whatever the amount is |
| **Raise to `X`** | Fires if `currentBet` is unchanged; **cancels** if the action changed |

Every pre-action must be **cancellable** until it fires, and must clear at the end of each street.

### 11.4 Heads-up blind posting (commonly implemented wrong)

> **TDA Rule 34 (Button Placement — Heads-Up):** *"The small blind is the button, is dealt the last card, and acts first pre-flop and last on all other betting rounds."*
> **Robert's Rules:** *"In heads-up play with two blinds, the small blind is on the button. When play becomes heads-up, the player who had the big blind the most recently is given the button, and his opponent is given the big blind."*

| Street | Button / SB | Other player / BB |
|---|---|---|
| Deal | Receives the **last** card | Receives the first card |
| Preflop | **Acts FIRST** | Acts second, has the **option** |
| Flop | Acts **last** | Acts first |
| Turn | Acts **last** | Acts first |
| River | Acts **last** | Acts first |

The most common bug is applying the general formula `firstToAct = button + 3` preflop and `button + 1` postflop. With two players, `button + 3 ≡ button + 1 (mod 2)`, which produces **exactly the inverted** order on both streets.

**Transition to heads-up:** when a table drops to two players, the button goes to whoever most recently posted the big blind. Also: *"Unlimited raising is allowed in heads-up play except in tournaments"* (Robert's Rules) — so a fixed-limit heads-up cash game has no 4-bet cap; a tournament does.

### 11.5 Dead button / dead small blind

> **Robert's Rules:** with the dead-button method, *"the big blind is posted by the player due for it, and the small blind and button are positioned accordingly, even if this means the small blind or the button is placed in front of an empty seat."*
> **TDA Rule 32 (Dead Button):** tournament play uses a dead button.

The governing principle: **every player must post the big blind exactly once per orbit, and no player may skip it or pay it twice.** So the BB position is authoritative and the button follows.

```
advanceButton():
    nextBB = first eligible seat clockwise from the current BB seat
    nextSB = the seat immediately clockwise of the previous BB seat
             (may be an EMPTY seat -> "dead small blind": nobody posts it)
    nextBTN= the seat immediately clockwise of the previous SB seat
             (may be an EMPTY seat -> "dead button": nobody acts from it,
              but positions and action order are computed from it)
```

Two derived cases:

| Case | Effect |
|---|---|
| **Dead button** | The button sits on an empty seat. Nobody is "on the button"; the first player clockwise from it is first to act postflop |
| **Dead small blind** | The SB seat is empty. **No small blind is posted** — the pot is 1 chip-unit smaller that hand. Do **not** move the blind to another player |

**Cash game alternative — "moving button":** the button simply moves to the next occupied seat and players who missed blinds must post them (or wait for the big blind). Both methods are legitimate; **use dead button for tournaments and moving button + missed-blind posting for cash**. Whichever you choose, it must be deterministic and identical for every table.

**Missed blinds (cash):** a player returning after missing blinds must either post the big blind (and, if they missed it, a dead small blind that goes straight to the pot) or wait until the big blind reaches them naturally.

### 11.6 Player disconnect / timeout

There is no cardroom rule for this — it is a purely digital concern. The industry standard (PokerStars, GGPoker, partypoker) is:

| Mechanism | Standard |
|---|---|
| **Action clock** | 10–30 seconds per decision (15s is a good mobile default) |
| **Time bank** | An extra 30–60s pool per player, consumed only after the base clock expires. Replenishes slowly (e.g. +5s per level or per orbit) |
| **Timeout while facing a bet** | **Auto-FOLD** |
| **Timeout while not facing a bet** (`toCall === 0`) | **Auto-CHECK** — never auto-fold a free option |
| **Disconnect mid-hand** | Treated exactly like a timeout. The clock keeps running. Some sites grant a one-time "disconnect protection" extension of a few extra seconds |
| **All-in disconnect protection** | **Deprecated everywhere.** PokerStars and others removed it because it was abused. Do not implement it |
| **Sitting out** | The player is dealt out of subsequent hands. In a cash game they may sit out indefinitely (subject to a table-availability timer); in a tournament they are **still dealt in** and are **blinded off** — their blinds and antes are posted automatically until they bust |
| **Reconnection** | Restore full state; if their turn is still live, resume the remaining clock |
| **Away detection** | After *n* consecutive auto-actions (e.g. 3), automatically set the player to "sitting out" so the table speeds up |
| **Sit-out abuse** | Cash games: limit sit-out to *n* minutes or *n* consecutive hands, then remove the player from the table |

**Auto-fold vs auto-check — the rule to burn in:**

```
onTimeout(player):
    toCall = currentBet − player.committedThisStreet
    if toCall > 0:  fold(player)
    else:           check(player)
```

Auto-folding a player who could check for free destroys equity that was rightfully theirs and is the fastest way to lose trust in a poker app.

### 11.7 Other edge cases to handle

| Case | Required behaviour |
|---|---|
| Player short of the blind | Post `min(blind, stack)`, status `all_in`. `currentBet` is set from the *nominal* BB, not the short amount |
| Both blinds all-in preflop | Deal the full board and go to showdown |
| Only one player has chips left, everyone else all-in | Skip all remaining betting; deal the board out |
| Player leaves mid-hand | The hand plays out with their chips in the pot; their hand is folded at their next turn (or held to showdown if they are all-in) |
| Player joins mid-hand | Dealt in from the **next** hand. In a cash game they must post the big blind or wait for it |
| Stack exactly equals the call | `call` results in `status = 'all_in'` and `stack = 0` |
| Raise to exactly `maxRaiseTo` | Legal all-in; classified as full or short by §3.6 |
| All players check every street | Showdown; first active player left of the button shows first |
| Tie on every pot | Split each pot independently with the odd-chip rule |
| Board is the best hand for all | *n*-way split |
| Rounding in a 3-way split of 100 chips | 33 / 33 / 33, remainder 1 to the first tied winner clockwise from the button |

---

## 12. Arabic Terminology (مصطلحات البوكر)

### 12.1 Actions — الإجراءات

| English | العربية | Transliteration commonly used in-game |
|---|---|---|
| Fold | **انسحاب** (also: طي / رمي الأوراق) | فولد |
| Check | **تمرير** | تشيك |
| Call | **مجاراة** (also: مطابقة) | كول |
| Bet | **رهان** | بيت |
| Raise | **زيادة** / **مضاعفة** | ريز |
| Re-raise | **زيادة مضادة** | ري-ريز |
| All-in | **كل الرصيد** | أول-إن |
| Muck | **رمي الأوراق مقلوبة** | مَك |
| Show cards | **كشف الأوراق** | — |
| Sit out | **الجلوس خارج اللعب** | — |

### 12.2 Table & betting — الطاولة والرهان

| English | العربية |
|---|---|
| Pot | **مجموع الرهان** (also: القِدر) |
| Main pot | **المجموع الرئيسي** |
| Side pot | **المجموع الجانبي** |
| Split pot | **تقسيم المجموع** |
| Blinds | **الرهانات العمياء** |
| Small blind (SB) | **الرهان الأعمى الصغير** |
| Big blind (BB) | **الرهان الأعمى الكبير** |
| Ante | **الرهان الإجباري** / الأنتي |
| Straddle | **الرهان الأعمى الاختياري** |
| Dealer / Button | **الموزّع** / **زر الموزّع** |
| Stack / Balance | **الرصيد** |
| Buy-in | **مبلغ الدخول** |
| Rake | **العمولة** |
| Minimum raise | **الحد الأدنى للزيادة** |
| Current bet | **الرهان الحالي** |
| Time bank | **بنك الوقت** |
| Heads-up | **مواجهة ثنائية** |
| Under the gun (UTG) | **أول المتحدثين** |

### 12.3 Cards & streets — الأوراق والمراحل

| English | العربية |
|---|---|
| Hole cards | **الأوراق السرية** |
| Community cards | **الأوراق المشتركة** |
| Burn card | **الورقة المحروقة** |
| **Flop** (first 3 board cards) | **الفلوب** — الأوراق الثلاث الأولى |
| **Turn** (4th board card) | **التيرن** — الورقة الرابعة |
| **River** (5th board card) | **الريفر** — الورقة الخامسة |
| Preflop | **ما قبل الفلوب** |
| Showdown | **كشف الأوراق** |
| Kicker | **الورقة المرجّحة** |
| Board | **اللوح** |
| Deck | **مجموعة الأوراق** |
| Hearts / Diamonds / Clubs / Spades | **قلوب / ديناري / سباتي / بستوني** |

### 12.4 Hand rankings — ترتيب الأيدي

| # | English | العربية |
|---|---|---|
| 1 | Royal Flush | **الفلاش الملكي** |
| 2 | Straight Flush | **ستريت فلاش** (تسلسل متجانس) |
| 3 | Four of a Kind | **رباعية** (أربع متشابهات) |
| 4 | Full House | **فُل هاوس** (بيت كامل) |
| 5 | Flush | **فلاش** (لون متجانس) |
| 6 | Straight | **ستريت** (تسلسل) |
| 7 | Three of a Kind | **ثلاثية** |
| 8 | Two Pair | **زوجان** |
| 9 | One Pair | **زوج واحد** |
| 10 | High Card | **أعلى ورقة** |

### 12.5 Promotions — العروض

| English | العربية |
|---|---|
| Bad Beat Jackpot | **جائزة الخسارة القاسية** |
| High Hand | **أقوى يد** |
| Jackpot | **الجائزة الكبرى** |
| Daily bonus | **المكافأة اليومية** |
| Leaderboard | **لوحة المتصدرين** |
| Tournament | **بطولة** |
| Rebuy / Add-on | **إعادة شراء** / **إضافة رصيد** |

---

# GAP ANALYSIS

Reviewed: `src/server/game/texasHoldem.ts`, `src/server/game/evaluator.ts`, `src/server/game/deck.ts`.

Verdict: the engine is a rough sketch. Several defects make it **unable to complete a normal hand**, and several more silently award chips incorrectly. Ranked by severity.

## S0 — Game-breaking (the engine cannot play a correct hand)

### G1. The flop does not advance the deck → duplicate board cards every hand
`texasHoldem.ts:298-302`
```ts
case 'flop': {
  const { cards } = dealCards(this.deck, 3);   // `remaining` is DISCARDED
  this.communityCards = cards;
  break;
}
```
`this.deck` is never reassigned, so the turn deals `deck[0]` — which is **flop card #1** — and the river deals `deck[1]` = flop card #2. Every single hand produces a board with two duplicated cards. The turn/river branch at `:303-309` does it correctly; the flop branch does not.

### G2. `totalRoundBet` is never reset between streets → the hand deadlocks after the flop
`advancePhase()` at `:293` resets `p.currentBet = 0`, but `p.currentBet` is a **dead field** — it is never read anywhere. Every comparison in the engine uses `p.totalRoundBet` (`:186`, `:192`, `:281`, `:223`), which is only ever reset in `startHand()` at `:138`.

Consequences after the flop, with `this.currentBet` reset to 0 but `totalRoundBet` still holding the preflop totals:
- `isRoundComplete()` (`:281`) requires `p.totalRoundBet === 0` → **never true** → the round never closes → the turn is never dealt. The hand loops forever passing the turn around the table.
- `call` (`:192`) computes `toCall = 0 - 20 = -20` → returns the error "يمكنك فقط check".
- `raise` (`:223`) sets `this.currentBet = player.totalRoundBet`, i.e. the *hand* total, not the street total.

The engine needs two distinct counters: `committedThisStreet` (reset every street) and `committedThisHand` (reset every hand, drives side pots).

### G3. No side pots at all
There is a single `this.pot: number`. `determineWinner()` at `:352-353` does `winner.player.balance += this.pot`. A player all-in for 50 against two players who then bet 500 each wins the entire 1050. This is the single largest correctness defect after G1/G2. Implement §4.2.

Also `this.pot` is never zeroed after the award (`:353`); it is only reset on the next `startHand()` at `:128`, so any code path that awards twice double-pays.

### G4. No split pots, no ties, no odd chips
`:349-353`
```ts
results.sort((a, b) => b.hand.score - a.hand.score);
const winner = results[0];
winner.player.balance += this.pot;
```
Two identical scores → the entire pot goes to whichever player happened to sort first. Split pots are extremely common (board plays, same two pair, chopped straights) — this will be hit within the first few dozen hands. Needs §5.3 + §6.3.

### G5. Steel wheel is reported as a ROYAL FLUSH
`evaluator.ts:71`
```ts
if (isFlush && isStraight && values[0] === 14) {
  return makeResult(HandRank.ROYAL_FLUSH, sorted, [14]);
}
```
`A♠ 2♠ 3♠ 4♠ 5♠` sorts to `[14,5,4,3,2]`, so `values[0] === 14` and `checkStraight` returns true via the ace-low path. The **weakest** straight flush is scored as the **strongest hand in poker**.

### G6. The wheel is scored as an ace-high straight
`evaluator.ts:77` and `:101` both use `values[0]` as the straight's high card. For `A-2-3-4-5`, `values[0] = 14`, so a 5-high straight scores as an **ace-high** straight and beats `K-Q-J-T-9`. Both G5 and G6 need wheel normalisation: after detecting an ace-low straight, the high card is **5**, and the royal check must be `straightHigh === 14`.

### G7. Heads-up blind and action order are exactly inverted
`:158-168`
```ts
const sbPlayer = this.getPlayerAfter(this.dealerIndex);
const bbPlayer = this.getPlayerAfter((this.dealerIndex + 1) % this.players.length);
...
this.activePlayerIndex = (this.dealerIndex + 3) % this.players.length;
```
With 2 players, `(dealerIndex + 3) % 2 === (dealerIndex + 1) % 2` — the **non-button** player acts first preflop. Postflop, `advancePhase()` at `:316` sets `dealerIndex + 1`, so the **button** acts first. Both are backwards (§11.4). Heads-up: the button **is** the SB, acts **first** preflop and **last** postflop, and is dealt the last card.

## S1 — Betting rules are wrong (chips move incorrectly)

### G8. Minimum raise formula is wrong
`:210`
```ts
const minRaise = this.currentBet * 2;
```
The correct minimum is `currentBet + lastFullRaise` (§3.5). Doubling only coincidentally matches the *first* preflop raise. After a raise to 60 over a BB of 20, the code demands 120; the legal minimum is 100. There is no `lastFullRaise` variable anywhere in the file.

### G9. `raise` mixes raise-TO and raise-BY semantics
`:209-224`
```ts
if (amount < minRaise) return { error: ... };   // treats `amount` as raise-TO
...
player.balance -= amount;                        // treats `amount` as an INCREMENT
player.totalRoundBet += amount;
this.currentBet = player.totalRoundBet;
```
The validation and the application disagree. The big blind "raising to 60" is debited **60 more** and ends with `totalRoundBet = 80`, and `currentBet` becomes 80. Pick raise-TO semantics (§3.8) and compute `chipsRequired = amount - committedThisStreet`.

### G10. No incomplete-raise / reopening rule whatsoever
The `all_in` branch (`:228-235`) and the short-raise branch (`:212-218`) both do `this.currentBet = Math.max(this.currentBet, player.totalRoundBet)` and nothing else. A short all-in therefore reopens raising for everyone. There is no `hasActedThisStreet`, no `canRaise`, no `lastFullRaise`. Implement §3.6 in full — this is the rule the task correctly flags as most commonly implemented wrong, and it is entirely absent.

### G11. No minimum bet postflop
There is no `bet` action — only `raise`. Postflop `this.currentBet === 0`, so `minRaise = 0` and any `amount > 0` passes validation (`:209` only rejects `amount <= 0`). A player can bet **1 chip** into a 500-chip pot. Minimum opening bet must be the big blind.

### G12. No big-blind option preflop
`isRoundComplete()` (`:275-284`) only checks that every active player's `totalRoundBet` equals `currentBet`. In a 3-handed hand where UTG calls 20 and the SB completes to 20, all three now match → the round is declared complete and **the big blind never gets to act**. Needs the `hasActedThisStreet` flag plus the explicit BB-option condition (§3.3).

### G13. `isRoundComplete()` would close every street before anyone acts
At the top of any postflop street, `currentBet === 0` and (in a correct engine) every `committedThisStreet === 0`, so the amount test passes vacuously. Only the G2 bug currently masks this. Fixing G2 without adding a "has acted" flag turns the engine into one that deals flop-turn-river with **zero** betting.

### G14. Partial blind posting does not mark the player all-in
`postBlind()` at `:357-362` does `Math.min(amount, player.balance)` but leaves `status = 'active'` and never checks for `balance === 0`. A player short of the big blind stays `active` with a 0 stack and is asked to act.

### G15. `all_in` action does not guard `balance > 0`
`:228-235` will happily "go all-in" for 0 chips, setting `status = 'all_in'` without moving a chip, which then removes a live player from the action.

### G16. Missing structures and forced bets
No antes, no big blind ante, no straddle, no pot-limit, no fixed-limit, no bet cap. `TableConfig` (`:23-28`) has only `maxPlayers / smallBlind / bigBlind / minBuyIn`.

## S2 — Position, seating and flow

### G17. Positions use array indices, not seat indices
`seatIndex` exists on `TablePlayer` (`:34`) but is **never used** for position math. Everything uses `this.players[i]` with `% this.players.length` (`:124`, `:159`, `:168`, `:263`, `:316`, `:366`). Consequences:
- `removePlayer()` (`:97-99`) splices the array, silently shifting `dealerIndex` and `activePlayerIndex` onto **different people**.
- `addPlayer()` pushes to the end regardless of the seat it assigned, so array order ≠ seat order.
- Empty seats and `sitting_out` players are not skipped: `activePlayerIndex = (dealerIndex + 3) % players.length` (`:168`) does no skipping at all, so with a sitting-out player the wrong seat is given the action.
- `getPlayerAfter()` (`:364-376`) skips only `folded` — not `sitting_out`, not zero-stack.

### G18. No dead button / dead small blind / missed blinds
`:124` — `this.dealerIndex = (this.dealerIndex + 1) % this.players.length`. There is no notion of who is due the big blind, so players joining and leaving will skip or double up on blinds (§11.5).

### G19. Fold-out detection is broken when someone is all-in
`:250-254`
```ts
const activePlayers = this.players.filter(p => p.status === 'active');
if (activePlayers.length === 1 && activeOrAllIn.length <= 1) {
  this.determineWinner();
```
`activeOrAllIn.length <= 1` can only be true if the single remaining player is the *only* non-folded player, which makes `activePlayers.length === 1` redundant. The intended "everyone folded" case works, but the very common "one caller vs one all-in" case falls through to `isRoundComplete()`.

### G20. No all-in run-out
When at most one player can still act, the remaining streets must be dealt with **no betting** and all hands tabled immediately (TDA Rule 16). The engine has no such path — it keeps calling `advanceTurn()` and looking for an `active` player.

### G21. `canStart()` counts sitting-out players
`:112-116` filters `status === 'active' || status === 'sitting_out'` and requires ≥ 2. Two sitting-out players will start a hand. It should also require `balance > 0`.

### G22. `advancePhase()` mishandles the `waiting` phase
`:288` — `phases.indexOf('waiting')` returns `-1`, so `phases[0]` = `'preflop'`. Any accidental call from `waiting` silently starts a preflop with no cards dealt.

## S3 — Dealing, RNG, evaluator hygiene

### G23. No burn cards
The spec (§2) burns one card before the flop, turn and river. The engine burns none. This is invisible to fairness but visible to any experienced player watching the animation, and it changes the deck consumption count.

### G24. Cards are dealt two-at-a-time per player
`:151-155` gives each player both hole cards before moving on. Real dealing is one card at a time in two clockwise passes, starting from the SB, with the **button dealt last**. With a correct shuffle this is statistically identical, but the deal animation will look wrong and heads-up "button is dealt last" (TDA 34) is not satisfied.

### G25. `Math.random()` shuffle
`deck.ts:30` uses `Math.floor(Math.random() * (i + 1))`. V8's `Math.random()` is xorshift128+ — not cryptographically secure and recoverable from a modest number of observed outputs. For a server-authoritative card game (even play-money) use `crypto.randomInt()` / `crypto.getRandomValues()`. Also log a per-hand shuffle seed commitment for auditability and dispute resolution.

### G26. Evaluator exposes no comparator or equality predicate
`evaluateHand` returns `HandResult` and the engine compares with raw `>` on `score`. There is no `compare(a, b): -1|0|1` and no `equals(a, b)`. Split-pot detection (G4) needs exact equality, which callers currently cannot express.

*Note:* the score packing itself (`rank * 1e10 + Σ tb[i] * 100^(4-i)` at `evaluator.ts:162-165`) is arithmetically sound — max value ≈ 9.01e10, well inside `Number.MAX_SAFE_INTEGER`, and the tiebreaker block (max ≈ 1.41e9) cannot overflow into the rank field. This part is correct.

### G27. `bestCards` does not distinguish hole cards from board cards
`evaluator.ts:166` returns `cards.slice(0, 5)` with no provenance. Bad-beat and high-hand jackpots (§9.1, §9.2) require knowing whether **both hole cards play**, and "playing the board" (§5.2) requires knowing that **zero** hole cards play. Neither can be implemented against the current return type.

### G28. Helper functions are only safe for exactly-5-card input
`findGroups()` (`:142-149`) returns the **first** Map entry with `count === size`, not the highest — safe only because a 5-card hand can contain at most one set of trips or quads. `findAllPairs()` (`:151-159`) returns `count >= 2` including trips. These are correct today but are landmines if anyone ever calls them with 7 cards. Document the precondition or make them rank-ordered.

### G29. Brute-force 7-choose-5
`getCombinations` (`:169-177`) allocates 21 arrays per player per evaluation, with recursive array spreading. Fine at 9 players, but at scale (many concurrent tables, or any equity/odds feature) it will dominate CPU. A bitmask + lookup-table evaluator is the standard fix. Not a correctness issue.

## S4 — Missing features and API surface

### G30. `GameSnapshot.winners` and `.lastAction` are declared but never populated
`:53-54` declare them; nothing in the engine ever writes them, and `snapshot()` (`:392-414`) does not include them. Clients have no way to learn who won, how much, or with what hand.

### G31. No showdown reveal
`snapshot()` correctly omits `holeCards` (good — no leak), but there is also no mechanism to reveal hands **at showdown**. Showdown order (§6.1) and muck (§6.2) are entirely absent.

### G32. No turn clock, no timeout, no auto-fold/auto-check, no time bank
`performAction` is purely reactive. Nothing ever fires on a player who does not act. Implement §11.6 — in particular the auto-**check** (not auto-fold) branch when `toCall === 0`.

### G33. No disconnect handling, no reconnection state restore, no sit-out timer
Related to G32. `PlayerStatus` has `sitting_out` but nothing ever sets it except the caller.

### G34. No hand history / audit log
Nothing records the board, the actions, the pot map, or the revealed hands. This is required for dispute resolution, for the bad-beat/high-hand promotions (§9), for replay, and for any anti-collusion work.

### G35. No chip-conservation assertion
There is no invariant check that `Σ stacks + Σ pots` is constant across a hand. Given G3/G4/G9, chips are currently created and destroyed. Add the assertion first — it will catch most of the above automatically.

### G36. No rake / economy / jackpot / tournament hooks
Sections 8, 9 and 10 have no counterpart in the code at all. For a play-money app rake should stay absent (§8.3), but the tournament layer (levels, antes, elimination, payouts) and the promotion layer need somewhere to hook in.

### G37. Minor
- `snapshot()` hardcodes `tableId: 'table'` (`:394`).
- `TablePlayer.currentBet` is dead state — remove it or make it the real per-street counter.
- `startHand()` does not clear `holeCards` for `sitting_out` players (`:133-139` filters them out), so stale cards persist on those objects.
- `addPlayer` rejects `balance < minBuyIn` but there is no maximum buy-in.
- All error strings are Arabic literals inline; they should be error **codes** that the client localises.

---

# Implementation Checklist

Each line is a testable assertion. `✅` = must pass before the engine is considered rules-correct.

## Deck and dealing
- [ ] A freshly created deck contains exactly 52 distinct cards; 13 ranks × 4 suits.
- [ ] The shuffle uses a CSPRNG, not `Math.random()`.
- [ ] After a full 9-handed hand reaching showdown, exactly `2×9 + 3 + 5 = 26` cards have been drawn and no card appears twice across all hole cards, burns and the board.
- [ ] Hole cards are dealt one at a time in two clockwise passes starting from the SB; the button receives the last card.
- [ ] Exactly one card is burned before the flop, before the turn, and before the river.
- [ ] The board after the river contains exactly 5 distinct cards, none of which is any player's hole card.
- [ ] Dealing the flop advances the deck pointer by 3 (regression test for G1).

## Table setup and position
- [ ] Position is computed from fixed seat indices, never from array order.
- [ ] Removing a player mid-orbit does not change which seat holds the button.
- [ ] Empty and `sitting_out` seats are skipped when locating the SB, BB and first-to-act.
- [ ] 3+ handed: SB = first eligible seat left of the button; BB = next; UTG = next.
- [ ] **Heads-up:** the button posts the small blind.
- [ ] **Heads-up:** preflop, the button acts **first**.
- [ ] **Heads-up:** on the flop, turn and river, the button acts **last**.
- [ ] **Heads-up:** the button is dealt the last hole card.
- [ ] When a table reduces to two players, the button goes to whoever most recently posted the big blind.
- [ ] Dead button: if the seat that should hold the button is empty, no player is on the button and the first player clockwise from it acts first postflop.
- [ ] Dead small blind: if the SB seat is empty, no small blind is posted and the pot is correspondingly smaller.
- [ ] A player short of the blind posts their whole stack and is marked `all_in`.
- [ ] Big blind ante: only the BB posts the ante, for the whole table; with big-blind-first calculation a short BB fills the blind before the ante.
- [ ] Antes never decrease as levels rise.

## Betting — legality
- [ ] `check` is rejected when `committedThisStreet < currentBet`.
- [ ] `check` is accepted when `committedThisStreet === currentBet`.
- [ ] `call` for more than the stack results in an all-in for the stack and does **not** change `currentBet`.
- [ ] The minimum **opening bet** postflop equals the big blind; a bet of `BB − 1` is rejected unless it is the player's entire stack.
- [ ] The minimum **raise-to** equals `currentBet + lastFullRaise`, **not** `currentBet × 2`.
- [ ] Blinds 10/20, UTG raises to 60: the next legal raise-to is **100**, and 90 is rejected.
- [ ] Blinds 10/20, UTG 60 then a re-raise to 180: the next legal raise-to is **300**.
- [ ] Flop, bet 50 then raise to 130: the next legal raise-to is **210**.
- [ ] `amount` in a raise action is interpreted as a raise-**TO** total, and the chips debited equal `amount − committedThisStreet`.
- [ ] The big blind raising to 60 is debited 40, not 60.
- [ ] A raise below the minimum is rejected unless it is exactly the player's all-in amount.
- [ ] An all-in for less than the call amount is legal.
- [ ] `all_in` from a zero stack is rejected.
- [ ] The server rejects any action from a player whose turn it is not.
- [ ] Only one action is accepted per turn (no string bets).

## Betting — reopening (the hard part)
- [ ] A **full** raise (increment ≥ `lastFullRaise`) resets `hasActedThisStreet` for every other active player and restores their right to raise.
- [ ] A **short** all-in raises `currentBet` but leaves `lastFullRaise` unchanged.
- [ ] After a short all-in, a player who had already acted may only **call** or **fold** — a raise from them is rejected.
- [ ] After a short all-in, a player who had **not** yet acted may still raise, with `minRaiseTo = currentBet + lastFullRaise` (using the pre-existing `lastFullRaise`).
- [ ] Scenario test: 10/20, UTG to 60, MP calls, CO all-in 85. UTG's raise is rejected; UTG's call of 25 more is accepted; BTN's raise to 125 is accepted; BTN's raise to 120 is rejected.
- [ ] Scenario test: 10/20, UTG to 60, CO all-in 105 (increment 45 ≥ 40) — this **is** a full raise; UTG may re-raise, minimum 150.
- [ ] Cumulative short all-ins totalling ≥ `lastFullRaise` restore the right to raise for players who had already acted.
- [ ] Fixed-limit: an all-in of less than half a bet does not reopen; half a bet or more is treated as a full bet.
- [ ] Fixed-limit: the round is capped at 4 bets (bet + 3 raises), except heads-up in a cash game.

## Betting — pot-limit
- [ ] `maxRaiseTo === currentBet + toCall + P` where `P` includes every chip in the pot and on the table this street.
- [ ] 5/10 PL, UTG pots preflop → 35.
- [ ] 5/10 PL, raise to 30, next player pots → 105.
- [ ] Pot 100, villain bets 50, hero pots → 250.
- [ ] Flop, pot 80, first to act pots → 80.
- [ ] `maxRaiseTo` is clamped to the player's stack.

## Round closure
- [ ] A round closes only when every active player has acted **and** all commitments are equal (or all-in).
- [ ] Preflop, when everyone limps, the big blind gets the **option** to check or raise before the flop is dealt.
- [ ] Preflop, when the BB checks their option, the round closes.
- [ ] Preflop, when the BB raises their option, action reopens for everyone.
- [ ] A postflop street where everyone checks closes after the last player checks, not before the first.
- [ ] `committedThisStreet` is reset to 0 for every player at the start of each street.
- [ ] `committedThisHand` is **not** reset between streets.
- [ ] `currentBet` resets to 0 and `lastFullRaise` resets to the big blind at the start of each postflop street.

## All-in and side pots
- [ ] When at most one player can still act, all remaining streets are dealt with no betting.
- [ ] All hands are tabled face-up as soon as a player is all-in and all other action is complete.
- [ ] `buildPots` produces the exact pot map for the §4.4 example: main 400 {A,B,C,D}, side1 600 {B,C,D}, side2 400 {C,D}.
- [ ] `Σ pot amounts === Σ committedThisHand` for every player, every hand.
- [ ] Folded players' chips remain in the pot but they are never in any `eligible` set.
- [ ] The §4.5 example with a folded player produces main 460, side1 600, side2 400.
- [ ] Side pots are awarded **before** the main pot, last-created first.
- [ ] The §4.4 example awards Carol 400, Bob 600, Alice 400, Dave 0.
- [ ] A player all-in for less than the eventual pot never wins more than they covered.
- [ ] An uncalled bet is returned to the bettor and never enters the pot.
- [ ] No pot ever ends up with exactly one eligible player.

## Hand evaluation
- [ ] The best 5-card hand is chosen from all 7 cards.
- [ ] `A♠K♠Q♠J♠T♠` → Royal Flush.
- [ ] `A♠2♠3♠4♠5♠` → **Straight Flush, 5-high** — NOT a royal flush (regression test for G5).
- [ ] `A♠2♥3♦4♣5♠` → **Straight, 5-high**, and it **loses** to `6-5-4-3-2` (regression test for G6).
- [ ] `A-K-Q-J-T` beats every other straight.
- [ ] `Q-K-A-2-3` is **not** a straight.
- [ ] Quads compare by quad rank first, then the single kicker.
- [ ] Full house compares by trips rank first, then pair rank.
- [ ] Flush compares all five cards in descending order.
- [ ] Two pair compares high pair, low pair, then the kicker.
- [ ] One pair compares the pair, then three kickers in order.
- [ ] Kickers outside the best five cards are ignored: board `A K Q J 9`, `2 3` vs `4 5` → **split**.
- [ ] The evaluator exposes `compare(a, b)` returning `-1 | 0 | 1` and an exact `equals`.
- [ ] The evaluator reports which of the 7 cards form the best 5, flagged hole vs board.
- [ ] "Playing the board" is detected (zero hole cards in the best 5).
- [ ] Board `A♠A♥A♦A♣K♠` → every remaining player splits equally.

## Showdown and awarding
- [ ] If there was a bet or raise on the river, the last aggressor shows first.
- [ ] If the river was checked through, the first active player clockwise from the button shows first.
- [ ] Heads-up with a checked river, the non-button player shows first.
- [ ] A mucked hand can never win a pot.
- [ ] The show/muck choice never changes who wins or how much.
- [ ] Players contesting a side pot show before players all-in only for the main pot.
- [ ] Ties split each pot **separately**; pots are never merged before splitting.
- [ ] Odd chips go to the tied winners in seat order starting from the first seat clockwise of the button.
- [ ] No player receives more than one odd chip from a single pot.
- [ ] 100 chips split 3 ways → 34/33/33, with the extra chip to the first tied seat left of the button.
- [ ] Suits never break a tie for a pot.
- [ ] `Σ chips awarded === Σ chips contributed`, asserted every hand.
- [ ] Total chips at the table are unchanged across a full hand (no rake).

## Early end
- [ ] When all but one player folds, that player wins every pot immediately.
- [ ] When all but one player folds, **no hole cards are revealed** to anyone.
- [ ] No further board cards affect the result once the hand ends by fold-out.

## Edge cases
- [ ] The deck is invariant-checked: a duplicate or missing card raises a fatal error, voids the hand and refunds all chips.
- [ ] A player cannot reveal a hole card while action is pending.
- [ ] Pre-action `Fold` fires unconditionally when the turn arrives.
- [ ] Pre-action `Check` cancels if a bet arrived.
- [ ] Pre-action `Call X` cancels if the amount to call changed.
- [ ] Pre-action `Call Any` fires at any amount.
- [ ] Pre-actions clear at the end of each street.
- [ ] On timeout while facing a bet → **auto-fold**.
- [ ] On timeout while `toCall === 0` → **auto-check** (never auto-fold).
- [ ] Time bank is consumed only after the base clock expires.
- [ ] A disconnect is treated identically to a timeout; the clock keeps running.
- [ ] After N consecutive auto-actions the player is set to `sitting_out`.
- [ ] Sitting-out tournament players are still dealt in and blinded off.
- [ ] A player who leaves mid-hand has their chips stay in the pot; their hand is folded at their next turn, or held to showdown if all-in.
- [ ] A player who joins mid-hand is dealt in from the next hand.
- [ ] `canStart()` requires at least 2 players with `balance > 0` who are not sitting out.
- [ ] Blind levels change only at the start of a hand, never mid-hand.

## Economy and promotions
- [ ] **No rake is taken.** Chips at the table are conserved exactly.
- [ ] Tournament buy-ins burn a configurable percentage as an inflation sink.
- [ ] A player with a zero balance can always obtain a free refill.
- [ ] No purchasable item alters hand outcomes.
- [ ] Chips cannot be transferred between players.
- [ ] Bad-beat evaluation requires both hole cards to play for both the winning and losing hand.
- [ ] Bad-beat distribution is 50% loser / 25% winner / 25% split among all others dealt in, including folders.
- [ ] High-hand evaluation does not require the hand to win or be shown down.
- [ ] Promotion payouts are logged with the full hand history.

## API and observability
- [ ] `snapshot()` never contains another player's hole cards before showdown.
- [ ] `snapshot()` reports the winners, their amounts, their hand names and their revealed cards after showdown.
- [ ] `snapshot()` reports the last action taken.
- [ ] Every hand writes a complete history: seed commitment, board, every action with amounts, the pot map, revealed hands, and awards.
- [ ] Errors are returned as machine-readable codes, not localised strings.
