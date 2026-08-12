# Blackjack Engine — Code Audit

Audit of `src/server/game/blackjack.ts` (308 lines) against real casino blackjack rules.
Companion to `blackjack.md` (the rules specification).

**Verdict: the engine is not currently safe to play with.** Four of the findings below cause
incorrect balance changes — players are paid when they should lose, and lose when they should push.

---

## Critical — wrong money movement

### C1. A doubled hand that busts is paid as a winner

`performAction` → `case 'double'` sets `hand.status = 'doubled'` unconditionally, without
checking whether the drawn card busted the hand:

```ts
hand.cards.push(...cards);
hand.status = 'doubled';   // even if score is now 24
```

`resolveAll` only treats `status === 'bust'` as a loss. A doubled bust falls through to the
score comparison, where `playerScore (24) > dealerScore (19)` evaluates **true**, and the hand
is paid `currentBet * 2` — on a doubled bet.

**Impact:** doubling on a stiff hand becomes strictly profitable. This is the single worst bug.

**Fix:** after drawing the double card, evaluate the score; if `> 21` set `status = 'bust'`.
Bust must be checked before any score comparison in `resolveAll`.

---

### C2. Player blackjack is paid 3:2 even when the dealer also has blackjack

```ts
if (hand.status === 'blackjack') {
  result = 'blackjack';
  payout = Math.floor(player.currentBet * 2.5);   // unconditional
}
```

There is no check for a dealer natural. Real rule: **player blackjack vs dealer blackjack is a
push** — the stake is returned, nothing is won.

**Fix:** detect dealer natural at deal time; resolve blackjack-vs-blackjack as `push`.

---

### C3. Dealer blackjack is never checked, so the round does not end early

The engine never inspects the dealer's two cards for a natural. Real rule: if the dealer shows
an Ace or ten and has a natural, the hand ends immediately — all non-blackjack players lose
their original bet, and no one gets to hit, double, or split.

Currently every player plays out their hand first. Beyond being wrong procedurally, it lets a
player **double or split into a hand that was already lost**, losing more than they should.

**Fix:** peek for dealer blackjack after the deal (American/hole-card rules) and resolve
immediately. If implementing European no-hole-card rules instead, the compensating rule is that
only the original bet is lost on a dealer natural — doubled/split money is returned.

---

### C4. Payouts use `player.currentBet` for every hand, ignoring per-hand stakes

`resolveAll` loops `for (let h = 0; h < player.hands.length; h++)` but computes every payout
from the single `player.currentBet`. Compounding this, `double` mutates the shared field:

```ts
player.currentBet *= 2;   // now every other hand of this player pays double too
```

**Impact:** once splitting is implemented this silently corrupts all multi-hand payouts. Even
today, doubling inflates the stake recorded against the round.

**Fix:** move `bet` onto the hand object (`hands[].bet`), not the player.

---

## Major — missing or incorrect rules

### M1. Split is declared but not implemented

`BlackjackAction` includes `'split'`, `BlackjackPlayer.hands` is an array, and
`activeHandIndex` exists — but `performAction`'s `switch` has **no `case 'split'`**. Sending
`'split'` silently falls through and passes the turn.

Also missing, all of which the spec requires: max split count, split-aces-get-one-card-only,
resplit rules, and whether double-after-split is allowed (DAS).

### M2. Hitting passes the turn to the next player

```ts
case 'hit': { ...draw card... }
...
this.advanceTurn();   // called unconditionally after every action
```

`advanceTurn` starts scanning from `currentPlayerIndex + 1`, so after a hit that neither busts
nor makes 21, the turn moves on. **A player cannot hit twice.**

**Fix:** only advance when the current hand reaches a terminal state (`stood` / `bust` /
`doubled`), or when moving to the player's next split hand.

### M3. Dealer soft-17 behaviour contradicts its own comment

```ts
// Dealer hits on soft 17
while (true) {
  const score = this.calculateScore(this.dealerCards);
  if (score >= 17) break;      // this STANDS on soft 17
```

The code implements **S17**; the comment claims **H17**. `calculateScore` also returns only a
number, so softness is not detectable at the call site.

**Fix:** return `{ total, isSoft }` and make the rule an explicit engine config flag. The two
rules differ by ~0.22% house edge, so this must be deliberate, not accidental.

### M4. No insurance, no even money, no surrender

None of these exist. Insurance in particular is expected by any player who knows the game — it
is offered whenever the dealer's upcard is an Ace.

### M5. Deck is rebuilt and reshuffled every single round

```ts
startRound() { this.deck = shuffleDeck(createDeck()); ... }
```

Single deck, reshuffled each hand, no shoe and no cut card. Real tables use a 6–8 deck shoe with
~75% penetration. This does not change fairness, but it does not match the "99% real" target and
makes any future card-counting-flavoured feature impossible.

---

## Minor

### N1. `snapshot()` produces `[undefined]` before the deal

```ts
dealerCards: this.dealerRevealed ? this.dealerCards : [this.dealerCards[0]]
```

When `dealerCards` is empty this yields a one-element array containing `undefined`, which will
crash any consumer that reads `.rank`. Guard with a length check.

### N2. Cards are dealt two-at-a-time per player, not round-robin

`dealCards(this.deck, 2)` gives each player both cards before moving on. Real dealing is one
card to each player and the dealer, then a second pass. Functionally irrelevant to fairness,
visually noticeable in a dealing animation.

### N3. `blackjack` status is assigned without checking hand length

`calculateScore(cards) === 21` happens to be safe here because it only runs on the freshly dealt
two-card hand, but the invariant is implicit. Assert `cards.length === 2`.

### N4. No configuration surface

Number of decks, S17/H17, 3:2 vs 6:5, DAS, resplit limits, surrender availability, and side bets
are all hard-coded or absent. These belong in a `BlackjackConfig` passed to the constructor —
the same shape `TexasHoldemEngine` already uses via `TableConfig`.

---

## Suggested fix order

1. **C1** — doubled bust paid as a win (one-line severity, highest impact)
2. **C2 + C3** — dealer natural detection and blackjack-vs-blackjack push
3. **M2** — turn does not stay with the hitting player
4. **C4** — move the bet onto the hand
5. **M1** — implement split properly on top of the per-hand bet
6. **M3 + N4** — extract a config object, make S17/H17 explicit
7. **M4** — insurance, then surrender
8. **M5, N1–N3** — shoe, dealing order, guards

Items 1–4 are prerequisites for any real play. Item 5 depends on item 4.

## Test cases these fixes must satisfy

- Double on 12 → draw 10 → hand is `bust`, stake lost, dealer's score irrelevant
- Player natural + dealer natural → `push`, stake returned, no 3:2
- Dealer natural + player 20 → player loses original bet only, never got to act
- Hit to 15, hit again to 19, stand → all three actions accepted by the same player
- Split 8s, double one hand, bust it → only that hand's doubled stake is lost
- Split aces → each receives exactly one card, no further action offered
- Dealer soft 17 (A-6) → stands under S17 config, draws under H17 config
- Insurance taken, dealer has natural → insurance pays 2:1, main bet lost, net zero
