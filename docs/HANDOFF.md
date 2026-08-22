# Implementation Handoff — Game Engine Rewrite

**Project:** `try-ur-luck` (جرب حظك) — Arabic-first social card game, Expo SDK 57 / React Native 0.86 / expo-router 4 (الجيل الحالي), TypeScript.
**Money is virtual only.** No real gambling, no purchases, no cash-out. Rules must match real casino play ~99%; the *only* intended difference is that chips have no monetary value.

---

## 0. Read these first — do NOT regenerate them

Four complete rule specifications already exist in this repo (4,858 lines total). They were researched from primary sources (TDA 2024, Robert's Rules, Massachusetts Gaming Commission, Pagat, Wizard of Odds, casino rack cards) and their key figures were independently verified by exhaustive enumeration.

**Read them. Do not re-research these games. Do not rewrite these documents.**

| File | Lines | Contains |
|---|---|---|
| `docs/game-rules/blackjack.md` | 1069 | 13 sections; 90 numbered testable assertions + simulation regression targets |
| `docs/game-rules/texas-holdem.md` | 1461 | Side-pot algorithm, incomplete-raise reopening (TDA 47), 37 catalogued gaps (G1–G37) |
| `docs/game-rules/three-card-poker.md` | 1106 | All figures exact by enumeration of 22,100 hands; ~60 assertions; TS sketch |
| `docs/game-rules/russian-poker.md` | 1032 | Second-combination rules, 20 edge cases, 59 assertions, TS sketch |
| `docs/game-rules/blackjack-code-audit.md` | 190 | Line-referenced audit of the current blackjack engine |

Each spec ends in an **Implementation Checklist** of numbered, testable assertions. Those checklists are the acceptance criteria — implement against them.

### Source-quality caveat carried forward
`wizardofodds.com` blocked direct fetching during research. Where its figures are used they are marked for verification. The three-card-poker document does not depend on this at all (everything recomputed). For blackjack, **generate dealer outcome probabilities by simulation rather than hard-coding any table.**

---

## 1. Current state of the codebase

### The UI/design layer is DONE. Do not modify it.

A full design-system rewrite was completed and visually verified on every screen. Leave these alone unless a change is required to surface new game state:

```
src/constants/theme.ts               design tokens
src/components/ui/                   Screen, GlassCard, GoldButton, Avatar, Chip, Input, Bits, TabBar
src/components/game/                 PlayingCard, SuitIcons, FeltTable
src/components/icons/GameIcons.tsx   22 SVG icons
src/app/**                           all 11 screens
```

Two constraints on that layer:
- **Arabic font must remain Cairo.** The original bug was `Orbitron` (zero Arabic glyphs) set as the Arabic font, so all Arabic silently fell back to the system font. `FONTS.ar.*` = Cairo, `FONTS.num.*` = Inter. Do not reintroduce a Latin-only font for Arabic text.
- RTL is handled with explicit `flexDirection: 'row-reverse'`, **not** `I18nManager.forceRTL`. Keep it that way.

### The game engines are broken.

```
src/server/game/texasHoldem.ts   353 lines — cannot complete a single hand
src/server/game/blackjack.ts     308 lines — pays out incorrectly
src/server/game/evaluator.ts     177 lines — misranks the steel wheel
src/server/game/deck.ts           56 lines — usable
```

Three-card poker and Russian poker **do not exist**.

---

## 2. Task 1 (highest priority) — Rewrite the Texas Hold'em engine

`src/server/game/texasHoldem.ts` should be **rewritten, not patched**. The defects are structural: bets are tracked on the player instead of per-hand/per-street, there is no `lastFullRaise`, and there are no side pots. Incremental fixes will not converge.

These three were confirmed by direct code inspection:

**Bug 1 — turn and river are duplicates of flop cards.** `advancePhase`, ~line 298:
```ts
case 'flop': {
  const { cards } = dealCards(this.deck, 3);   // this.deck is NEVER reassigned
  this.communityCards = cards;
  break;
}
```
The `turn` and `river` cases reassign `this.deck` correctly; `flop` does not. The flop cards stay at the head of the deck, so the turn deals flop card #1 and the river deals flop card #2. **Every hand.**

**Bug 2 — deadlock after the flop.** `advancePhase` resets `p.currentBet` and `this.currentBet`, but every betting-path computation reads `p.totalRoundBet`, which is never reset between streets. `isRoundComplete()` compares `p.totalRoundBet === this.currentBet` → `40 === 0` → never true. `toCall = this.currentBet - player.totalRoundBet` goes **negative**. The per-player `currentBet` field is dead: written, never read.

**Bug 3 — steel wheel ranked as a royal flush.** `evaluator.ts:71`:
```ts
if (isFlush && isStraight && values[0] === 14)   // A♠2♠3♠4♠5♠ sorts to [14,5,4,3,2]
    return makeResult(HandRank.ROYAL_FLUSH, ...);
```
The weakest straight flush is reported as the strongest hand in poker. The same `values[0]` bug makes the wheel an ace-high straight that beats king-high.

**Also missing** (see G1–G37 in the spec): side pots, split pots, burn cards, `lastFullRaise` tracking, raise-reopening logic, big-blind option, correct heads-up order (button = SB, acts **first** preflop and **last** postflop — currently inverted on both streets), minimum postflop bet, all-in run-out, dead button, seat-index-based positions, turn clock, showdown reveal.

**Required invariant:** add a chip-conservation assertion — total chips in play must be constant across every hand. Ship it as a test, not a comment.

---

## 3. Task 2 — Fix the Blackjack engine

Full line-referenced detail in `docs/game-rules/blackjack-code-audit.md`. Fix in this order — items 1–4 are prerequisites for real play, and item 5 depends on item 4:

1. **A doubled hand that busts is paid as a winner.** `case 'double'` sets `status = 'doubled'` without re-scoring; `resolveAll` only treats `'bust'` as a loss, so a doubled 24 beats a dealer 19. Doubling on a stiff hand is currently strictly profitable.
2. **Player blackjack pays 3:2 even when the dealer also has blackjack.** Must be a push.
3. **Dealer blackjack is never checked.** The round must end immediately on a dealer natural; players must not be allowed to double or split into an already-lost hand.
4. **Move the bet from the player onto the hand.** `resolveAll` pays every hand from a single `player.currentBet`, and `double` mutates it (`currentBet *= 2`), corrupting sibling hands.
5. **Split is declared but not implemented** — `BlackjackAction` includes `'split'` and `hands` is an array, but there is no `case 'split'`. Needs max-split count, split-aces-one-card-only, resplit-aces, and DAS.
6. **Dealer S17/H17 contradicts its own comment.** Code stands on soft 17; the comment claims it hits. Make it an explicit config flag and return `{ total, isSoft }` from the scorer.
7. Add insurance, then late surrender.
8. Shoe with cut card, round-robin dealing order, guard `snapshot()` against `[undefined]` before the deal.

**Turn bug to fix along the way:** `advanceTurn()` is called after *every* action, so a hit that neither busts nor makes 21 passes the turn to the next player — a player cannot hit twice. Only advance on a terminal hand state.

---

## 4. Task 3 — Build Three Card Poker (new)

Spec: `docs/game-rules/three-card-poker.md`. This is the cleanest of the four; every figure is exact.

- Hand ranking is **Straight Flush > Three of a Kind > Straight > Flush > Pair > High Card**. The straight beats the flush because with three cards straights are rarer (768 vs 1,144 hands). The whole ladder is ascending combination count. Do not use 5-card poker ordering.
- Exact counts to assert in tests: `48 / 52 / 720 / 1096 / 3744 / 16440`, summing to 22,100.
- Dealer qualifies Queen-high or better = **15,380 / 22,100 = 69.5928%**. Assert this exactly.
- Ace is high, and low **only** to complete A-2-3. `K-A-2` is not a straight.
- **Known tie-break trap:** a naive descending rank sort makes `A-Q-Q` beat `K-K-2`. The comparator must key on pair rank first.
- Ante Bonus is paid even when the dealer does not qualify **and** even when the player loses to the dealer.
- Q-6-4 is proven exactly optimal (0 disagreements against EV-max across all 22,100 hands). 14,900 hands play, 7,200 fold.

---

## 5. Task 4 — Build Russian Poker (new)

Spec: `docs/game-rules/russian-poker.md`. Most complex of the four — build it last.

- "الروشان بوكر" = **Russian Poker** (~93% confidence; phonetic transliteration of /ˈrʌʃən/, English adjective→noun order).
- Bet is **exactly 2× Ante**. Never another multiple.
- Exchange (1 Ante flat, any number of cards) and buying a 6th card (1 Ante) are **mutually exclusive** — all twelve sources agree. Fees are never refunded.
- Dealer qualifies on Ace-King or better = **56.319%** (independently verified: 1,463,700 / 2,598,960).
- **Second combination** is the signature mechanic. All 21 published payout rows are the exact arithmetic sum of their components, so no lookup table is needed. Validity test is **mutual non-inclusion of core cards**, not disjointness — this is what makes Full House + Full House from `AAAKKK` legal (14:1) while correctly denying `AAKKx`.
- Bet paytable `100/50/20/7/5/4/3/2/1/1` is universal — zero variation found across 12 sources.
- Ship the **Simple Mode** described in the spec; the full ruleset will confuse casual players.

---

## 6. Decisions already made — implement these defaults

Make each one a config value, not a hard-coded constant.

| Decision | Value | Rationale |
|---|---|---|
| Blackjack rule set | 6 decks, peek, S17, 3:2, DOA + DAS + RSA + late surrender, five-card Charlie ON | Net ≈ **−1.20%**, i.e. a slight *player* edge. Deliberate for play money. |
| Economy drain lever | If chip supply inflates, turn **five-card Charlie off** (→ +0.26%) | Never degrade blackjack to 6:5 — players read it as predatory. |
| Blackjack side bets | Perfect Pairs (table D) + 21+3 (variant 7) only; cap `sideBet ≤ mainBet` | Lowest edge, best recognised. Skip Lucky Ladies (24%). |
| Russian Poker ante | **Pays 1:1** on a player win (~1.8% house edge), not push (4.90%) | Better sourced and more generous. |
| Three Card Pair Plus | **Original** table `40/30/6/4/1` (2.32%) | Longer sessions on play money. |
| Poker rake | **None.** Use tournament buy-in burn as the sink | Rake is inappropriate for play money. |

**Open flag for the product owner:** the blackjack default gives the player a positive expectation, which combined with the existing 10,000/week refill (`WEEKLY_REFILL_AMOUNT` in `src/constants/theme.ts`) means chip supply inflates over time. This is intentional but should be monitored.

---

## 7. Engineering constraints

- **Server-authoritative.** Engines live in `src/server/game/` and must never trust client input. Existing socket layer: `src/hooks/useGameSocket.ts`, `src/server/api/router.ts`.
- **`npx tsc --noEmit -p tsconfig.json` must pass.** It passes clean today — keep it that way.
- Engines must be **pure and testable** — no timers, no I/O, no randomness outside an injectable RNG seed. Jest with `jest-expo` is already configured.
- Shuffle: Fisher–Yates over the full shoe, CSPRNG-seeded, server-side.
- **Do not add dependencies without justification.** Note that several existing packages are already version-mismatched against Expo SDK 52 (`expo-linear-gradient@57` vs expected `~14.0.2`, `react-native-svg@15.15.5` vs `15.8.0`, `expo-asset`, `expo-secure-store`, `@react-native-async-storage/async-storage`). These are pre-existing and currently work; fixing them is a separate task from this one.
- There is **no `babel.config.js`**, so the Reanimated plugin is not guaranteed. The UI deliberately uses React Native's built-in `Animated` API throughout. Do not introduce `react-native-reanimated` worklets without first adding and testing the babel config.
- Existing config precedent: `TexasHoldemEngine` takes a `TableConfig`. Follow that shape for `BlackjackConfig`, `ThreeCardConfig`, `RussianPokerConfig`.

---

## 8. Definition of done

For each game:

1. Every assertion in that spec's Implementation Checklist has a passing test.
2. Chip conservation holds across 10⁶ simulated hands.
3. Simulated house edge converges to the spec's stated figure within tolerance (blackjack: 6D/S17/DAS → 0.41% ± 0.05% over 10⁷ hands, before the Charlie adjustment).
4. `tsc --noEmit` clean.
5. No change to the files listed in §1 as "done" unless new game state genuinely needs surfacing — and if so, reuse the existing components and tokens rather than adding new styling.

**Suggested order:** Task 1 → Task 2 → Task 3 → Task 4. Task 1 first because the primary game currently cannot complete a hand.
