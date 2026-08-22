# Russian Poker (بوكر روسي / "الروشان بوكر") — Implementation Specification

> **Status:** Greenfield research spec. This game does **not** exist in the `try-ur-luck` codebase yet.
> **Scope:** Play-money social game. No real-money wagering, no cash-out. All "bets" are virtual chips.
> **Language of product:** Arabic. Language of this document: English (per request).

---

## 0. DISAMBIGUATION — What is "الروشان بوكر"?

### Conclusion

**"الروشان بوكر" = RUSSIAN POKER** (a.k.a. *Русский покер*, Royal Poker, Lunar Poker; a house-banked
5-card stud/draw casino game derived from Caribbean Stud Poker).

**Confidence: ~93% (high).**

### Reasoning

| Evidence | Weight |
|---|---|
| **Phonetics.** English *Russian* is /ˈrʌʃən/. Rendered into Arabic script phonetically this is **الروشَن / الروشان** ("ar-rūshan"), because Arabic ش = /ʃ/. The native Arabic adjective would be *روسي* (rūsī) — but casino/game brand names in the Gulf are routinely borrowed as English phonetic transliterations, not translated. | Very strong |
| **Word order.** "الروشان بوكر" follows **English** adjective→noun order (*Russian Poker*), not Arabic noun→adjective order (*بوكر روسي*). This is the signature of a transliterated English brand name. | Strong |
| **Feature match.** The requester's own description — 5-card stud vs dealer, card exchange, buying a 6th card, insurance, multiple combination payouts — is an exact, unmistakable description of Russian Poker and of no other game. | Decisive |
| **Regional prevalence.** Russian Poker is the dominant house-banked poker variant in Eastern European, Caucasus, Central Asian, and Levant/Gulf-adjacent casinos, and is offered by live-dealer suppliers serving Arabic-speaking markets (Ezugi, BetConstruct). Arabic-language guides exist under the name *بوكر روسي*. ([kuwaitpoker.com](https://kuwaitpoker.com/en/poker-games/russian-poker/)) | Strong |
| **Negative search.** Web searches for "الروشان" + بوكر / كازينو / لعبة ورق return **no card game** of that name. There is no competing game called *Roshan/Rawshan*. | Supporting |

### Alternatives considered and rejected

| Candidate | Why rejected |
|---|---|
| **روشان / رَوْشَن (rawshan)** — the carved projecting wooden lattice window of Hijazi (Jeddah) architecture, from Persian *rōzan* "window". ([Bayut](https://www.bayut.sa/blog/en/explore-saudi/al-rawashin-saudi-arabia/), [MDPI Buildings 10(9):151](https://doi.org/10.3390/buildings10090151)) | Architectural term. No card game, no casino sense. Homograph only. |
| **"Rush Poker"** (fast-fold poker, ex-Full Tilt) | Would transliterate as *راش بوكر* without the -an. Also a *player-vs-player online lobby format*, with no exchange/6th-card/insurance mechanics. Contradicts the described feature set. |
| **Russian Roulette / روليت روسية** | The requester explicitly says poker. |
| **A local/regional home game** | No evidence found in any Arabic source. |

**Recommendation:** Build **Russian Poker**. In the Arabic UI, label the game **بوكر روسي** as the primary
name and accept **الروشان بوكر / روشان بوكر** as a search alias, since that is what the user says out loud.

---

## 1. GAME OVERVIEW

| Property | Value |
|---|---|
| Family | House-banked casino poker; Caribbean Stud derivative |
| Deck | **One** standard 52-card deck, shuffled every hand. No jokers. |
| Opponent | Dealer (house). Players never play each other. |
| Seats ("boxes") | Up to 6 in the physical game; a player may play multiple boxes (3rd+ played *blind*) |
| Cards to player | 5, **dealt face up to the player** (in live play they are the player's to see) |
| Cards to dealer | 5, **exactly one face up** |
| Goal | Beat the dealer's 5-card hand, and/or make a high-paying combination |
| Distinguishing features | Card **exchange**, **buy a 6th card**, **insurance**, **two combinations paid on one hand**, **buy the dealer a card** |
| Origin | Russia, early 1990s, post-Soviet casino boom ([pagat.com](https://www.pagat.com/banking/russian_poker.html), [coololdgames](https://www.coololdgames.com/card-games/poker/casino/russian/)) |

Well-sourced. All of the above appears consistently across pagat.com, gambiter, Olympic Casino (LV/LT),
Casino Sochi, Ezugi, and OneTouch.

---

## 2. BETTING AND PLAY SEQUENCE — EXACT ORDER

```
 1. ANTE placed (mandatory)                       [+ optional BONUS side bet, + optional JACKPOT bet]
 2. SHUFFLE / DEAL: 5 cards to each active box, 5 to dealer (1 dealer card exposed)
 3. BONUS / JACKPOT side bets resolve NOW, on the player's ORIGINAL 5 cards, before any exchange/buy
 4. Player declares SECOND COMBINATION intent (house rule: must be declared before touching cards)
 5. Player chooses exactly ONE of:
       a) FOLD                       -> Ante lost, hand over
       b) BET (play)                 -> stake 2 x Ante
       c) EXCHANGE cards             -> pay 1 x Ante, then must BET (2 x Ante) or FOLD
       d) BUY 6th CARD               -> pay 1 x Ante, then must BET (2 x Ante) or FOLD
 6. INSURANCE offered if the player's final hand is Three-of-a-Kind or better
       -> stake between 1 x Ante and 1/2 of the potential Bet payout
 7. DEALER REVEALS all 5 cards
 8. If dealer DOES NOT QUALIFY (< Ace-King high):
       - insured boxes: insurance pays 1:1
       - uninsured boxes: player may pay 1 x Ante to FORCE THE DEALER TO EXCHANGE one card
       - otherwise: Ante pays 1:1 (see 4.1 for the major variant), Bet pushes
 9. If dealer QUALIFIES: compare hands, pay per section 4
10. SECOND COMBINATION paid if (and only if) the player's best hand beat the dealer's
```

**Costs summary (all expressed in units of the box's Ante):**

| Item | Cost | Refundable? |
|---|---|---|
| Ante | 1 (mandatory) | Returned on tie; paid 1:1 on win / no-qualify (variant A) |
| Bet (play) | 2, fixed — never more, never less | Returned on tie |
| Exchange (any number of cards) | 1 | **Never** — house keeps it in every outcome |
| Buy 6th card | 1 | **Never** |
| Buy dealer a card | 1 | **Never** |
| Insurance | 1 … ½ × potential Bet payout | Paid 1:1 on dealer no-qualify; otherwise lost (see 3.4 variant) |
| Bonus side bet | house-set fixed amount or free size | Independent of the main game |

Sources: [pagat.com](https://www.pagat.com/banking/russian_poker.html),
[gambiter.com](https://gambiter.com/cards/banking/russian_poker.html),
[Olympic Casino LV](https://olympic-casino.lv/en/game/russian-poker-1),
[Olympic Casino LT](https://olympic-casino.lt/en/game/russian-poker-2),
[Ezugi via LiveCasinoComparer](https://www.livecasinocomparer.com/live-casino-software/ezugi-live-casino-software/ezugi-russian-poker/).

---

## 3. PLAYER OPTIONS — COST AND LEGALITY

### 3.1 EXCHANGE (تبديل الأوراق)

| Question | Answer | Source confidence |
|---|---|---|
| Cost | **1 × Ante, flat, regardless of how many cards** | Well-sourced (pagat, gambiter, Olympic, gamerules, casinoz) |
| How many cards | **Varies.** pagat/gamerules: "up to **four**". Olympic Casino: "1, 2, 3, 4, **or all 5**". | **Varies by casino — flag** |
| Can you exchange all 5? | Some houses yes, some cap at 4. Some allow 5 only for "one ante + the bet". | Varies |
| Repeatable? | Some houses allow: if you exchange exactly **one** card, you may pay another Ante and exchange one more, repeatedly. | Varies (documented as a variant in pagat) |
| After exchanging | You **must** either place the Bet (2 × Ante) or fold. Folding still forfeits Ante + exchange fee. | Well-sourced |
| Exchange fee on win | **Lost.** "the original ante is returned and he loses the amount paid to buy or exchange" (pagat) | Well-sourced — **note this: in variant A the Ante is *returned* rather than paid 1:1 when the player exchanged.** See §4.3. |

> **Contrast with Oasis Poker** (a sibling game often confused with Russian Poker): Oasis charges
> **per card** (1 card = 1 Ante, 2 cards = 2 Ante, 3 = 3 Ante, …), and has *no* 6th card, *no* insurance,
> *no* second combination. ([Wizard of Odds — Oasis Poker](https://wizardofodds.com/games/oasis-poker/))
> Russian Poker's flat one-ante-for-any-number exchange is a defining difference.

### 3.2 BUY A 6th CARD (شراء الورقة السادسة)

| Question | Answer |
|---|---|
| Cost | **1 × Ante** |
| When legal | Instead of exchanging, before the Bet decision |
| Effect | You hold **6 cards**; your playing hand is the **best 5 of those 6** |
| Main purpose | (a) complete a 4-card straight/flush draw; (b) **unlock a second combination** (§3.5) |
| After buying | Must Bet (2 × Ante) or fold |

**Best-5-of-6 selection:** evaluate all C(6,5) = 6 five-card subsets, take the maximum by standard poker
ranking. This is the hand used for the dealer comparison and for the primary paytable payout.

### 3.3 CAN YOU DO **BOTH** EXCHANGE **AND** BUY?

**No.** Every published rule set presents these as **mutually exclusive alternatives** at a single decision
point: *"Fold, Bet, buy a sixth card, **or** exchange."*
(pagat, gambiter, Olympic LV/LT, gamerules, officialgamerules).

Two nuances that are *not* exceptions:
- Some houses let you repeat a **single-card** exchange (each repeat costs another Ante) — still exchange-only.
- Some online implementations (OneTouch) present "Fold / Bet / Buy 6th / Draw" as four buttons; still one choice.

**Implementation rule: `exchange` and `buySixth` are exclusive. Enforce it.**

### 3.4 INSURANCE (التأمين)

| Question | Answer | Confidence |
|---|---|---|
| What it insures | The **dealer failing to qualify** (i.e. it protects a strong hand from being wasted on a push) | Well-sourced |
| When offered | Only when the player's final hand is **Three-of-a-Kind or better** | Well-sourced |
| Minimum stake | **1 × Ante** (Olympic, casinoz) | Well-sourced |
| Maximum stake | **½ of the potential Bet payout** per the paytable | Well-sourced |
| Payout if dealer does **not** qualify | **1:1** | Well-sourced |
| If dealer **does** qualify | **Insurance lost** (pagat, gambiter, coololdgames) | Majority rule |
| Variant | Olympic Casino states insurance is **returned** if the dealer's combination ties or beats the player's | **Varies — flag** |
| Interaction | A box that took insurance **cannot** also buy the dealer a card. Insurance and "buy dealer a card" are alternative responses to non-qualification. | Well-sourced (pagat) |

Worked example: player has Four-of-a-Kind, Ante = 10. Potential Bet payout = 20 × Bet = 20 × 20 = 400.
Max insurance = 200. If dealer shows no game, insurance pays 200 (plus the 200 stake back).

### 3.5 TWO COMBINATIONS / SECOND COMBINATION (التركيبة الثانية) — the signature rule

> *"If a player can make two different hands from his five or six cards, both are paid… Different means
> that there must be at least one card in each 2-card, 3-card, 4-card or 5-card combination which is not
> used in the other combination."* — [pagat.com](https://www.pagat.com/banking/russian_poker.html)

Three rules govern it:

1. **Maximum of two combinations** per box, ever.
2. **Mutual-exclusion test on the CORE cards** (not the full 5-card hand with kickers). A combination's
   core is: pair = 2 cards, trips = 3, two pair = 4, quads = 4, straight/flush/full house/straight
   flush/royal = 5, Ace-King = 2 (the ace and the king). Combination *B* is valid alongside *A* iff
   `core(B) ⊄ core(A)` **and** `core(A) ⊄ core(B)` — i.e. each contains at least one card the other lacks.
3. **The second combination is paid only if the player's BEST hand beat the dealer's hand.** The second
   combination itself does **not** need to beat the dealer.

**The payout is the arithmetic SUM of the two component payouts.** I verified this against every row of
pagat's published table — all 21 published rows equal the sum of their parts. This is a hugely valuable
simplification: you do not need a lookup table, only the sum.

| Two combinations | Published total | = sum? |
|---|---|---|
| Royal Flush + Straight Flush | 150:1 | 100+50 ✔ |
| Royal Flush + Flush | 105:1 | 100+5 ✔ |
| Royal Flush + Straight | 104:1 | 100+4 ✔ |
| Straight Flush + Straight Flush | 100:1 | 50+50 ✔ |
| Straight Flush + Flush | 55:1 | 50+5 ✔ |
| Straight Flush + Straight | 54:1 | 50+4 ✔ |
| Straight Flush + Ace-King | 51:1 | 50+1 ✔ |
| Four of a Kind + Full House | 27:1 | 20+7 ✔ |
| Four of a Kind + Ace-King | 21:1 | 20+1 ✔ |
| Full House + Full House | 14:1 | 7+7 ✔ |
| Full House + Ace-King | 8:1 | 7+1 ✔ |
| Flush + Flush | 10:1 | 5+5 ✔ |
| Flush + Straight | 9:1 | 5+4 ✔ |
| Flush + One Pair | 6:1 | 5+1 ✔ |
| Flush + Ace-King | 6:1 | 5+1 ✔ |
| Straight + Straight | 8:1 | 4+4 ✔ |
| Straight + Ace-King | 5:1 | 4+1 ✔ |
| Three of a Kind + Ace-King | 4:1 | 3+1 ✔ |
| Two Pair + Two Pair | 4:1 | 2+2 ✔ |
| Two Pair + Ace-King | 3:1 | 2+1 ✔ |
| One Pair + Ace-King | 2:1 | 1+1 ✔ |

**Worked cases that must pass your unit tests:**

| Cards | Best hand | Second | Total |
|---|---|---|---|
| A♠ A♥ K♦ 7♣ 3♦ (5 cards) | One Pair (A♠A♥) | Ace-King (A♠ + K♦ — K♦ ∉ pair core, and the pair core has A♥ ∉ AK core) | **2:1** |
| A♠ A♥ A♦ K♣ 6♦ (5 cards) | Three of a Kind | Ace-King | **4:1** |
| A♠ A♥ K♦ K♣ 8♠ (5 cards) | Two Pair | **none** — AK core {A♠,K♦} ⊂ two-pair core {A♠A♥K♦K♣} | **2:1** |
| A♠ A♥ A♦ K♠ K♥ (5 cards) | Full House | **none** — AK core ⊂ FH core | **7:1** |
| A♠A♥A♦ K♠K♥K♦ (6 cards) | Full House (AAAKK) | Full House (KKKAA) — A♦ ∉ second, K♦ ∉ first | **14:1** |
| A♠A♥A♦A♣ K♠ K♥ (6 cards) | Four of a Kind | Full House (AAAKK) | **27:1** |
| A♠K♠9♠5♠3♠ + A♥ (6 cards) | Flush | One Pair (A♠A♥) | **6:1** |
| 9♠10♠J♠Q♠K♠A♠ (6 cards) | Royal Flush | Straight Flush (9-K) | **150:1** |
| A♠A♥ K♠K♥ Q♠Q♥ (6 cards) | Two Pair (AAKK) | Two Pair (KKQQ) | **4:1** |

Note that "A pair of aces with a king kicker pays 2:1 instead of 1:1" is a real, correct, and
counter-intuitive consequence of this rule. Test it explicitly.

**House-rule requirement (Olympic Casino, Casino Sochi):** the player must **declare/warn the dealer of a
bonus (second) combination before exchanging or buying**. In an app, simply auto-detect — but if you want
fidelity, a "Declare 2nd combination" affordance is authentic. Recommendation: **auto-detect**; the manual
declaration is a live-table procedural safeguard with no strategic content.

### 3.6 BUYING THE DEALER A CARD (شراء ورقة للموزع)

Available **only** when the dealer fails to qualify and the box did **not** take insurance.

| Question | Answer | Confidence |
|---|---|---|
| Cost | 1 × Ante | Well-sourced |
| Effect | The dealer discards one card and draws a replacement, hoping to reach Ace-King+ so the player's Bet gets paid at odds | Well-sourced |
| Which card does the dealer discard? | **Conflicting.** pagat: the **highest** card. Casino Sochi & Olympic: the **oldest / first** card. Wizard of Odds: "*the lowest card seems to be the most common*". gamerules.com: the **lowest**. | **Varies — flag prominently** |
| Repeat draws | Casino Sochi: if the drawn card duplicates the discarded rank, redraw at no extra charge | Varies |
| If dealer still doesn't qualify | Player gets the non-qualify payout (Ante 1:1, Bet returned); the purchase fee is lost | Well-sourced |
| If dealer now qualifies | Normal qualified resolution applies — the player's Bet is now live and can be **lost** | Well-sourced |
| Group decision | At a live table each box decides independently, but there is only **one** dealer hand — the first purchase changes it for everyone. Not an issue in a single-player app. | — |

### 3.7 "DOUBLING" / "ANTE DOUBLING"

**Not attested as a distinct Russian Poker rule.** I found no casino, supplier, or rules source describing
an "ante doubling" option. What exists and is likely being referred to:

- The **Bet is fixed at exactly 2 × Ante** — the "doubling" of the ante is the Play bet itself, and it is
  mandatory to continue (you cannot bet 1×, 3×, or any other multiple).
- **Blind boxes:** a player working more than two boxes must post Ante **and** Bet on the 3rd+ boxes before
  the deal, with no exchange/buy/fold rights. (pagat, Olympic LT)

Treat any "doubling" request as the 2× Bet requirement unless the user supplies a specific house rule.

---

## 4. DEALER QUALIFICATION AND RESOLUTION

**The dealer qualifies with Ace-King high or better.** Universal across every source.

**Exact probability (computed, single 52-card deck, 5 cards):**

```
Ace-King-high (no pair, no straight, no flush)  =  164 rank-sets x 1020 suit-patterns = 167,280
Any pair or better                              =  2,598,960 - 1,302,540              = 1,296,420
Qualifying hands                                =  1,463,700 / 2,598,960              = 56.3184%
```

So the dealer **fails to qualify ~43.68% of the time** — the single most important number in the game.
(This is the same 56.32% figure as Caribbean Stud, which shares the AK qualifier.)

### 4.1 Resolution matrix

| # | Situation | Ante | Bet (2×) | Exchange/Buy fee | Insurance | Second combo |
|---|---|---|---|---|---|---|
| 1 | Player folds | **Lost** | not placed | Lost | n/a | n/a |
| 2 | Dealer does **not** qualify, box **not** insured | **Pays 1:1** | **Push (returned)** | Lost | n/a | **Not paid** |
| 3 | Dealer does **not** qualify, box **insured** | Pays 1:1 | Push | Lost | **Pays 1:1** | Not paid |
| 4 | Dealer does not qualify → player buys dealer a card → dealer still fails | Pays 1:1 | Push | Lost | n/a | Not paid |
| 5 | Dealer does not qualify → buys card → dealer qualifies → player wins | Pays 1:1 | **Pays per PAYTABLE** | Lost | Lost | **Paid** |
| 6 | Dealer qualifies, **player wins** | **Pays 1:1** | **Pays per PAYTABLE** | Lost | Lost | **Paid** |
| 7 | Dealer qualifies, **tie** | Push | Push | Lost | Lost | Not paid |
| 8 | Dealer qualifies, **dealer wins** | **Lost** | **Lost** | Lost | Lost | Not paid |

### 4.2 ⚠ THE MAJOR VARIANT: does the Ante pay when the player wins?

This is the **single biggest rules divergence in Russian Poker**, and it moves the house edge by several
percent. Both versions are genuine.

| Variant | Dealer qualifies + player wins | Where documented |
|---|---|---|
| **A — "Ante pays" (recommended)** | Ante pays **1:1** *and* Bet pays per paytable | [pagat.com](https://www.pagat.com/banking/russian_poker.html), [gambiter](https://gambiter.com/cards/banking/russian_poker.html), [Ezugi](https://www.livecasinocomparer.com/live-casino-software/ezugi-live-casino-software/ezugi-russian-poker/), [officialgamerules](https://officialgamerules.org/game-rules/russian-poker/), [gamerules.com](https://gamerules.com/rules/russian-poker-card-game/) |
| **B — "Ante pushes"** | Ante is **returned only**; Bet pays per paytable | [Casino Sochi](https://casinosochi.com/games/russian-poker-cs) ("*the dealer pays only the BET… the ANTE bet is not paid*"), [Wizard of Odds / Lunar Poker](https://wizardofodds.com/games/lunar-poker/) ("*If the player beats the dealer, then he only pushes the Ante, as opposed to it paying even money like in Caribbean Stud*"), [Wizard of Vegas forum](https://wizardofvegas.com/forum/gambling/tables/30243-russian-poker-oasis-poker-small-pairs-strategy-question/) |

**Recommendation for the app: implement Variant A** (Ante pays 1:1). It is the majority published rule, it
is what Ezugi's live Middle-East-facing table does, and it is far more intuitive for casual players ("I won,
so both my bets won").

Sub-variant, also real: pagat notes that when the player **exchanged or bought**, some houses **return** the
Ante rather than paying it 1:1 on a win. Make this a config flag (`anteOnWinAfterPurchase: 'pay' | 'push'`);
default to `'pay'` for a social game.

### 4.3 Ties

Compare the two 5-card hands by standard poker ranking, then by ranks with kickers.
**Suits are never used to break ties.** If fully equal → push (Ante and Bet returned, all fees kept).

---

## 5. FULL PAYTABLE FOR THE BET / PLAY WAGER

### 5.1 Standard paytable (unanimous across all sources found)

| Hand | Bet pays | Combinations (of 2,598,960) | Probability of being dealt it in 5 cards | Paytable EV contribution* |
|---|---:|---:|---:|---:|
| Royal Flush | **100 : 1** | 4 | 0.000154% | 0.000154 |
| Straight Flush | **50 : 1** | 36 | 0.001385% | 0.000693 |
| Four of a Kind | **20 : 1** | 624 | 0.024010% | 0.004802 |
| Full House | **7 : 1** | 3,744 | 0.144058% | 0.010084 |
| Flush | **5 : 1** | 5,108 | 0.196540% | 0.009827 |
| Straight | **4 : 1** | 10,200 | 0.392465% | 0.015699 |
| Three of a Kind | **3 : 1** | 54,912 | 2.112845% | 0.063385 |
| Two Pair | **2 : 1** | 123,552 | 4.753902% | 0.095078 |
| One Pair | **1 : 1** | 1,098,240 | 42.256903% | 0.422569 |
| Ace-King high | **1 : 1** | 167,280 | 6.436416% | 0.064364 |
| Nothing (loses) | — | 1,135,260 | 43.681322% | 0 |
| **Total** | | **2,598,960** | 100% | **0.68666** |

\* *"Paytable EV contribution" = probability × payout, i.e. the average paytable multiple you would collect
**if the Bet were always paid at odds**. It is **NOT** the house edge — the Bet is only paid at odds when
the dealer qualifies AND you win, and the distribution shifts once exchange/buy is used. Do not present
this column as house edge.*

The probabilities above are computed from first principles (standard 5-card poker counts; Ace-King-high =
C(11,3) rank-sets minus the AKQJT straight = 164, × (4⁵ − 4) = 1020 suit patterns = 167,280). They are
exact for the **initial deal only**.

### 5.2 Known variant paytables

I found **no** variation in the main Bet paytable across any of: pagat.com, gambiter.com, Olympic Casino
Latvia, Olympic Casino Lithuania, Casino Sochi, Ezugi, officialgamerules.org, gamerules.com, casinoz.club,
coololdgames.com, betvoyager.com. **The 100/50/20/7/5/4/3/2/1/1 ladder appears to be universal for Russian
Poker.** This is unusually stable for a casino game and is a strong signal the paytable is part of the
game's identity.

What *does* vary between houses:
1. Ante pays 1:1 vs pushes on a win (§4.2) — biggest effect.
2. Max cards exchangeable (4 vs 5).
3. Which card the dealer discards when bought a card (highest / lowest / oldest).
4. Insurance forfeited vs returned when the dealer qualifies.
5. Which Bonus side-bet paytable is offered (§6).

### 5.3 Two-combination paytable

See §3.5. **Payout = sum of the two component payouts, capped at two combinations.**

---

## 6. BONUS / SIDE BET SYSTEMS

### 6.1 The "BONUS" side bet (رهان البونص)

- Placed **with the Ante**, before the deal.
- Resolved on the player's **original 5 cards only** — exchange and the 6th card are irrelevant to it.
- Independent of dealer qualification and of whether the player folds.

**Version 1 — "Three of a Kind or better"** (pagat, gambiter):

| Hand | Pays | Probability | Contribution |
|---|---:|---:|---:|
| Royal Flush | 1000 : 1 | 0.000154% | 0.001539 |
| Straight Flush | 500 : 1 | 0.001385% | 0.006926 |
| Four of a Kind | 200 : 1 | 0.024010% | 0.048020 |
| Full House | 70 : 1 | 0.144058% | 0.100841 |
| Flush | 50 : 1 | 0.196540% | 0.098270 |
| Straight | 40 : 1 | 0.392465% | 0.156986 |
| Three of a Kind | 25 : 1 | 2.112845% | 0.528211 |
| Anything less | lose | 97.128543% | 0 |
| **Total return** | | | **0.94079** |
| **House edge** | | | **≈ 5.92%** |

**Version 2 — "Straight or better"** (pagat, gambiter, **confirmed live at [Olympic Casino Lithuania](https://olympic-casino.lt/en/game/russian-poker-2)**):

| Hand | Pays | Probability | Contribution |
|---|---:|---:|---:|
| Royal Flush | 3000 : 1 | 0.000154% | 0.004617 |
| Straight Flush | 800 : 1 | 0.001385% | 0.011082 |
| Four of a Kind | 250 : 1 | 0.024010% | 0.060025 |
| Full House | 150 : 1 | 0.144058% | 0.216087 |
| Flush | 100 : 1 | 0.196540% | 0.196540 |
| Straight | 50 : 1 | 0.392465% | 0.196233 |
| Anything less | lose | 99.241388% | 0 |
| **Total return** | | | **0.68458** |
| **House edge** | | | **≈ 31.54%** |

> ⚠ Version 2 is a brutal side bet. For reference, OneTouch's digital Russian Poker reports a side-bet
> house edge of **18.34%** — implying their table sits between these two. Side bets in this game are
> mathematically terrible; that is exactly why they are perfect for a **play-money** app (high variance,
> big celebratory wins) and exactly why you must never let players buy chips to chase them.
> (House edges above are my own computation from the published paytables; the 18.34% figure is from
> [LCB / OneTouch](https://lcb.org/games/russian-poker).)

### 6.2 Progressive Jackpot side bet (الجاكبوت التراكمي)

Real, documented structure from a regulated European operator —
[Olympic Casino Latvia, Progressive Poker Jackpot](https://olympic-casino.lv/en/jackpot/progressive-poker-jackpot):

| Property | Value |
|---|---|
| Stake | **Fixed €2** per hand |
| Evaluated on | The player's **first 5 cards** |
| Seed | €4,000 |
| Royal Flush | **100% of the jackpot** |
| Straight Flush | **100% of the jackpot** |
| Four of a Kind | €600 (fixed) |
| Full House | €100 (fixed) |
| Flush | €80 (fixed) |
| Straight | €60 (fixed) |
| Three of a Kind | €20 (fixed) |
| **Envy bonus** | €200 to every *other* player at the table who also placed the jackpot bet on a jackpot-winning hand |

Note this differs from the Caribbean Stud convention (10% for straight flush, 100% for royal). Here **both**
royal and straight flush take the full jackpot. Fixed-amount lower tiers (not odds) are also notable — a
fixed stake makes fixed prizes possible.

### 6.3 "Ante bonus"

**Not attested in Russian Poker.** An "Ante Bonus" (paying a bonus on the Ante for a strong hand regardless
of the dealer) is a **Three Card Poker / Ultimate Texas Hold'em** feature. Russian Poker's functional
equivalent is the **second combination** payout. Do not implement an ante bonus if you are targeting fidelity.

---

## 7. HOUSE EDGE AND STRATEGY

### 7.1 Published house-edge / RTP figures

| Source | Figure | Applies to |
|---|---|---|
| [OneTouch (supplier, official)](https://www.onetouch.io/games/russian-poker/) | **RTP 99.54%** with optimal strategy → house edge **0.46%** | OneTouch digital Russian Poker |
| [Casinolandia / LCB (OneTouch)](https://casinolandia.com/slots/russian-poker-onetouch/) | RTP 99.53% | same game |
| [LiveCasinoComparer (Ezugi)](https://www.livecasinocomparer.com/live-casino-software/ezugi-live-casino-software/ezugi-russian-poker/) | **RTP 98.23%** → house edge **1.77%** | Ezugi Live Russian Poker |
| [Wizard of Odds — Lunar Poker](https://wizardofodds.com/games/lunar-poker/) | House edge **4.90%** of the two mandated initial wagers; **Element of Risk 2.38%** | Lunar/Royal Poker (**Ante-pushes** variant) |
| [coololdgames.com](https://www.coololdgames.com/card-games/poker/casino/russian/) | 4.90% (repeating the WoO figure) | — |
| [LCB / OneTouch](https://lcb.org/games/russian-poker) | Side bet house edge **18.34%** | Bonus side bet only |

**How to read this spread.** The range 0.46% → 4.90% is *not* measurement noise; it is the rules variants:

- The **4.90%** figure is for the **Ante-pushes** variant (§4.2 B), where you forfeit ~half your win. Note
  WoO expresses it against the *mandated* 3 units (Ante + 2× Bet), and separately gives **Element of Risk
  2.38%** (loss ÷ total amount actually wagered) — the number to quote if you compare to other table games.
- The **0.46%–1.77%** figures are for the **Ante-pays** variant (§4.2 A) **under optimal play**.
- Russian Poker's optimal strategy is genuinely intractable by hand. Wizard of Odds notes there are
  **627,392,769,491,403,000,000** possible outcomes; published "optimal" strategies are simulation-derived
  approximations, not solved.

**Naive vs optimal.** Real-world naive play (over-buying the 6th card, exchanging into weak hands, taking
insurance on every trips, never folding) is widely reported to cost several extra percent. A defensible
planning assumption for a social app: **naive play ≈ 4–7% house edge; optimal ≈ 0.5–2%.** Flag this as an
estimate — I found no source that measures the gap rigorously.

### 7.2 Strategy heuristics (well-agreed but NOT rigorously solved)

These are the consensus heuristics across
[cardmates](https://cardmates.co.uk/russian_poker_strategy),
[coololdgames](https://www.coololdgames.com/card-games/poker/casino/russian/),
[gambiter](https://gambiter.com/cards/banking/russian_poker.html) and
[LiveCasinoComparer](https://www.livecasinocomparer.com/live-casino-software/ezugi-live-casino-software/ezugi-russian-poker/).
**Treat them as a "recommended play" hint system, not as a solver.**

**Fold / play line**

| Hand | Action |
|---|---|
| One Pair or better | Always play (Bet) |
| Ace-King high | Play; consider exchanging the other 3 cards |
| Ace-high or King-high with a 4-card draw | Buy the 6th card, then play |
| Nothing, highest card below 8 | **Fold** |
| Nothing, high card ≥ 8 or higher than the dealer's up-card | Exchange 4, keep the high card, then play |

**Exchange heuristics**

| Holding | Exchange |
|---|---|
| 4 to a straight or flush (open-ended) | 1 card — but prefer **buying the 6th card** for a gutshot/inside draw |
| Three of a Kind | 2 cards (drawing to quads/full house), **unless** the dealer's up-card matches your trip rank |
| Pair | 3 cards, **or** buy the 6th card |
| 3 to a royal / straight flush | 2 cards |
| Ace-King | 3 cards |
| Junk, dealer showing 5 or lower | 4 cards, keep a Queen or higher |

**Buy the 6th card**

- Buy with: a completed flush/straight flush/royal (chasing a second combination), trips, a pair, or any
  4-card draw.
- The maximalist advice "*always buy the 6th card unless folding*" (coololdgames, LiveCasinoComparer) is
  **contradicted** by cardmates ("*don't ever buy the 6th card if your starting combination is quite weak*")
  and is almost certainly **-EV** for junk hands, since it costs a full Ante for a 1-card draw. Do not
  encode "always buy" as your recommendation.

**Insurance**

- Take it on **very strong hands** (four of a kind, straight flush, royal) — the pain of a royal flush being
  pushed by a non-qualifying dealer is the entire reason the rule exists.
- Marginal on plain three-of-a-kind. Never available below trips.
- Since the dealer fails ~43.68% of the time, a 1:1 insurance bet has a raw EV of
  `0.4368×1 − 0.5632×1 = −12.6%` **in isolation** — it is a bad standalone bet, and is only justified as a
  hedge that converts a large pushed payout into a certain smaller one (variance reduction, not EV gain).
  Be honest about this in any in-game tip text.

**Buy the dealer a card**

- Only worthwhile with a hand strong enough that the paytable payout on the Bet materially exceeds the
  1-Ante cost plus the risk of the dealer now beating you. With a pair, you are usually better off taking
  the 1:1 Ante and moving on. With trips or better (and no insurance), buying is usually correct.

---

## 8. HAND RANKINGS

**Standard 5-card poker rankings, with ONE addition.**

| # | Hand | Arabic | Notes |
|---:|---|---|---|
| 1 | Royal Flush | فلاش ملكي | A-K-Q-J-10 same suit |
| 2 | Straight Flush | ستريت فلاش | 5 consecutive, same suit. **A-2-3-4-5 same suit is a valid straight flush** (pagat shows 5♠4♠3♠2♠A♠ as an example). |
| 3 | Four of a Kind | أربعة متشابهة / بوكر | |
| 4 | Full House | فُل هاوس | |
| 5 | Flush | فلاش | |
| 6 | Straight | ستريت | **A-2-3-4-5 is the lowest straight (the "wheel"); the ace plays low.** A-K-Q-J-10 is the highest. **Wrap-around (Q-K-A-2-3) is NOT a straight.** |
| 7 | Three of a Kind | ثلاثة متشابهة | |
| 8 | Two Pair | زوجان | |
| 9 | One Pair | زوج | |
| **10** | **Ace-King high** | **آس-ملك** | **← the Russian Poker addition.** A no-pair hand whose two highest cards are A and K. Ranks **above** every other no-pair hand and **below** one pair. It is a *paying* hand (1:1) and it is the **dealer qualification threshold**. |
| 11 | Any other high card | ورقة عالية | Does not pay; dealer holding this does not qualify |

**No rankings are modified.** Suits are never ranked and never break ties.

**Ace-King comparison detail:** when both dealer and player hold Ace-King high, compare the third, fourth,
and fifth cards in descending order. Only if all five ranks match is it a tie.

---

## 9. EDGE CASES AN IMPLEMENTER MUST HANDLE

| # | Edge case | Required behaviour |
|---:|---|---|
| 1 | **Insufficient bankroll for the mandatory Bet** | Never let a player Ante more than `balance / 3`. The Bet (2× Ante) is mandatory to continue, so the *effective* minimum commitment is 3× Ante. Compute the max Ante as `floor(balance / 3)` — or `floor(balance / 4)` if you want to guarantee the exchange/buy option stays affordable. **Do this at Ante time, not at decision time.** |
| 2 | **Insufficient bankroll for exchange / buy** | Grey out the button with a clear reason. Do **not** allow partial payment or credit. |
| 3 | **Insufficient bankroll for insurance** | Insurance min = 1 Ante. If `balance < ante`, hide insurance. Cap the slider at `min(balance, potentialBetPayout / 2)`. |
| 4 | **Exchange and still lose** | Normal. Ante + Bet + exchange fee all lost. Make sure the UI shows the fee as a *separate, already-spent* line item so it never looks like a bug. |
| 5 | **Insurance + dealer non-qualification** | Insurance pays 1:1 **and** the Ante still pays 1:1 **and** the Bet still pushes. These are additive, not exclusive. A common implementation bug is paying insurance *instead of* the ante. |
| 6 | **Insurance + "buy dealer a card"** | **Mutually exclusive.** If insured, the buy-dealer-a-card option must not be offered. |
| 7 | **Insurance when the dealer qualifies and beats you** | Insurance lost (Variant A). If you implement Olympic's variant, it is returned. Config flag. |
| 8 | **Second-combination detection** | Use the core-card mutual-exclusion algorithm in §3.5, then **maximize the total payout** over all valid pairs (including the single-combination case). Never assume the best 5-card hand is part of the optimal pair — e.g. with three pairs, 2P+2P (4:1) beats 2P+Pair (3:1). |
| 9 | **Second combination when the player LOSES the showdown** | **Not paid.** Only paid if the best hand beat the dealer. |
| 10 | **Second combination when the dealer does not qualify** | **Not paid** — the Bet pushes, so there is no odds payment at all. |
| 11 | **6-card best-5 selection** | Evaluate all 6 subsets. Keep the *set of cards used* so the UI can highlight the played hand and the second combination separately. |
| 12 | **6 cards containing two straight flushes** | e.g. 5♠6♠7♠8♠9♠10♠. Highest is the 6-10 SF; second is 5-9 SF → 100:1. Verify your maximizer finds this. |
| 13 | **Ace-low straight in a 6-card hand** | A♠2♠3♠4♠5♠ + 6♠ contains **two** straight flushes (A-5 and 2-6). Test it. |
| 14 | **Deck exhaustion** | 6 players × 6 cards + dealer 6 = 42; plus exchanges you can exceed 52. Physical casinos limit exchanges per box or reshuffle discards. **In a single-player app this cannot occur** (max 6 + 5 + 5 exchanged + 1 dealer draw = 17). Assert `deck.length > 0` before every draw anyway. |
| 15 | **Player buys the dealer a card and the dealer *improves past the player*** | Legal and must be possible. The player's Bet is now live and can lose. Do not "protect" the player. |
| 16 | **Bonus / jackpot bet when the player folds** | Side bets are already resolved (step 3). Folding does not refund or void them. |
| 17 | **Ties on Ace-King** | Compare all 5 ranks. Suits never break ties. |
| 18 | **Player has 6 cards; which 5 face the dealer?** | The best 5 only. The second combination is a *payout* concept, never a *comparison* concept. |
| 19 | **Rounding** | Use integer chips everywhere. Insurance max = `floor(potentialPayout / 2)`. Never use floats for balances. |
| 20 | **RNG** | Fisher–Yates with a CSPRNG-seeded source. Shuffle the full 52 **once** per hand; draw from the top for exchanges, the 6th card, and the dealer's replacement. Never re-shuffle mid-hand. |

---

## 10. RECOMMENDED CONFIGURATION FOR A SOCIAL PLAY-MONEY APP

### 10.1 Recommended ruleset ("Classic mode")

| Rule | Setting | Justification |
|---|---|---|
| Deck | 1 × 52, reshuffled every hand | Universal |
| Ante | Player-chosen from chip denominations; enforce `ante ≤ floor(balance/4)` | Guarantees the mandatory Bet plus one optional purchase is always affordable — removes the worst UX failure mode |
| Bet | Fixed 2 × Ante | Universal |
| Ante on win | **Pays 1:1** (Variant A) | Majority rule; far more intuitive; matches Ezugi's Middle-East-facing live table |
| Ante on win after exchange/buy | **Pays 1:1** (not merely returned) | Simplification. The "returned instead of paid" sub-variant is a confusing hidden penalty. |
| Exchange | 1 × Ante for **any number of cards, 1–5** | The Olympic Casino rule. Cleaner than "up to 4" and easier to explain. |
| Repeat single-card exchange | **Off** | Rare variant; adds a decision loop that confuses casual players |
| Buy 6th card | 1 × Ante, exclusive with exchange | Universal |
| Insurance | Trips+; min 1 Ante, max ½ of potential Bet payout; pays 1:1; **lost** if dealer qualifies | Majority rule |
| Buy dealer a card | 1 × Ante; dealer discards the **lowest** card | WoO reports lowest is most common, and it is the version that actually helps the dealer qualify (an AK-high hand keeps its ace/king and swaps junk). pagat's "highest" is real but strategically perverse and will read as a bug to players. **Document the choice in-app.** |
| Second combination | **Auto-detected**, no declaration required, max 2, payout = sum | Removes a pure procedural trap. Live tables require declaration only to stop disputes. |
| Bonus side bet | Version 1 (Three-of-a-Kind or better, 25→1000) | 5.92% edge vs 31.54% for Version 2. Even in play money, a 31% edge makes the bet feel broken. |
| Progressive jackpot | Optional, Olympic-style: fixed stake, RF/SF = 100% of pot, fixed lower tiers | Great retention/celebration mechanic. Seed it and grow it from a fixed rake of the play-money jackpot bets. |
| Blind boxes / multi-box | **Omit** | Pure live-table logistics. Zero value in a mobile app. |
| Dealer up-card | Show it | Universal, and it is real strategic information |

### 10.2 Which rules will confuse casual players — and what to do

| Rule | Confusion risk | Mitigation |
|---|---|---|
| **Second combination** | 🔴 Very high. "Why did my pair pay 2:1?" | Animate it: highlight the two combinations in different colours, show "زوج ١:١ + آس-ملك ١:١ = ٢:١". This is the game's signature — make it the *hero moment*, not a footnote. |
| **Dealer qualification** | 🔴 Very high. Winning a big hand and getting a push feels like a bug. | Persistent dealer badge: **"يحتاج الموزع آس-ملك أو أعلى"**. On a non-qualify, show a clear explainer card the first 3 times. |
| **Bet is exactly 2× Ante** | 🟡 Medium | Pre-calculate and show the number on the button: "راهن ٢٠٠". Never make the player do arithmetic. |
| **Fees are never refunded** | 🟡 Medium | Show a running "المدفوع" ledger next to the pot. |
| **Insurance** | 🔴 High. It is a hedge, not a win. | Offer only on trips+, with one sentence: "يدفع ١:١ إذا لم يتأهل الموزع". Do not push it. |
| **Buying the dealer a card** | 🟠 High — it can *hurt* you | Show the explicit warning: "قد يتأهل الموزع ويفوز عليك". Default the button to un-emphasised. |
| **AK-high being a paying hand** | 🟠 Medium — non-obvious to poker players | Include it in the paytable UI as a real row, with its own icon. |
| **Exchange vs Buy exclusivity** | 🟢 Low | Radio-button affordance, not two independent buttons. |

### 10.3 Proposed "SIMPLE MODE" (الوضع المبسط)

Ship this as the **default** for first-time players; unlock Classic mode after ~20 hands or via settings.

| Feature | Simple mode | Classic mode |
|---|---|---|
| Ante | ✅ | ✅ |
| Bet 2× | ✅ (auto-computed, one tap) | ✅ |
| Fold | ✅ | ✅ |
| Exchange | ✅ (1 Ante, any number) | ✅ |
| Buy 6th card | ❌ hidden | ✅ |
| Insurance | ❌ hidden | ✅ |
| Buy dealer a card | ❌ — auto-resolves as "take the Ante" | ✅ |
| Second combination | ✅ **kept, auto-detected** — it is the soul of the game and requires zero player skill | ✅ |
| Dealer qualification | ✅ kept, with a permanent on-screen reminder | ✅ |
| Bonus side bet | ✅ optional, one tap | ✅ |
| Progressive jackpot | ✅ | ✅ |
| Strategy hints | ✅ on by default ("نصيحة: بدّل ٣ أوراق") | opt-in |

**Rationale:** the decisions that get *cut* (6th card, insurance, buying the dealer a card) are exactly the
ones that (a) cost money, (b) require the deepest math, and (c) can make a player feel punished for trying
something. The decisions that stay (fold/exchange/bet) are the ones with obvious intuition. The second
combination stays because it is **pure upside with no decision attached** — it only ever delights.

### 10.4 Play-money safety notes

- Never sell chips whose only use is chasing the jackpot or the Bonus bet.
- Do not display RTP/house-edge figures as though they are odds the player can "beat".
- Free daily chip refill so a broke player is never stuck (also removes edge case #1's worst outcome).
- No leaderboards denominated in currency-looking units.

---

## 11. ARABIC TERMINOLOGY TABLE

Terms marked **[attested]** appear in Arabic-language sources
([kuwaitpoker.com](https://kuwaitpoker.com/en/poker-games/russian-poker/)); the rest are **[proposed]** —
standard Gulf casino/poker Arabic. Have a native Gulf Arabic speaker review before launch.

### Wagers and money

| English | Arabic | Transliteration | Status |
|---|---|---|---|
| Russian Poker | بوكر روسي | būkar rūsī | attested |
| Russian Poker (spoken alias) | الروشان بوكر | ar-rūshān būkar | user's usage |
| Ante | الرهان الأساسي / الأنتي | ar-rihān al-asāsī | attested |
| Bet / Play (2× ante) | رهان المتابعة / الرهان | rihān al-mutāba'a | attested |
| Insurance | التأمين | at-ta'mīn | proposed |
| Bonus side bet | الرهان الإضافي / البونص | ar-rihān al-iḍāfī | proposed |
| Progressive jackpot | الجائزة التراكمية / الجاكبوت | al-jā'iza at-tarākumiyya | proposed |
| Envy bonus | مكافأة المشاركة | mukāfa'at al-mushāraka | proposed |
| Chips / balance | الرقائق / الرصيد | ar-raqā'iq / ar-raṣīd | proposed |
| Payout | العائد / الدفع | al-'ā'id | proposed |
| Push / tie | تعادل | ta'ādul | proposed |

### Actions

| English | Arabic | Status |
|---|---|---|
| Deal | التوزيع | proposed |
| Fold | الانسحاب / طيّ الأوراق | attested (الانسحاب) |
| Bet / Play | راهن | attested |
| Exchange cards | تبديل الأوراق | attested |
| Exchange N cards | تبديل ٣ أوراق | proposed |
| Buy the 6th card | شراء الورقة السادسة | proposed |
| Buy insurance | شراء التأمين | proposed |
| Buy the dealer a card | شراء ورقة للموزع | proposed |
| Reveal / showdown | كشف الأوراق | proposed |
| Second combination | التركيبة الثانية | proposed |
| Declare second combination | إعلان التركيبة الثانية | proposed |

### Game entities and states

| English | Arabic | Status |
|---|---|---|
| Dealer | الموزع | attested |
| Dealer qualifies | تأهّل الموزع | attested (تأهيل الموزع) |
| Dealer does not qualify / "no game" | الموزع غير مؤهّل / لا يوجد لعب للموزع | proposed |
| Qualification threshold "Ace-King or better" | آس-ملك أو أعلى | proposed |
| Dealer's up-card | ورقة الموزع المكشوفة | proposed |
| Box / seat | الصندوق / المركز | proposed |
| Hand / combination | اليد / التركيبة | proposed |
| Best 5 of 6 | أفضل خمس أوراق من ست | proposed |

### Hand rankings

| English | Arabic | Status |
|---|---|---|
| Royal Flush | فلاش ملكي | proposed |
| Straight Flush | ستريت فلاش / تسلسل متطابق | proposed |
| Four of a Kind | أربعة متشابهة | proposed |
| Full House | فُل هاوس / البيت الكامل | proposed |
| Flush | فلاش / لون واحد | proposed |
| Straight | ستريت / تسلسل | proposed |
| Three of a Kind | ثلاثة متشابهة | proposed |
| Two Pair | زوجان | proposed |
| One Pair | زوج | proposed |
| Ace-King high | آس-ملك | proposed |
| High card (nothing) | ورقة عالية / لا شيء | proposed |

### Suits and ranks

| English | Arabic |
|---|---|
| Spades ♠ | البستوني |
| Hearts ♥ | الكبة / القلوب |
| Diamonds ♦ | الديناري |
| Clubs ♣ | السباتي |
| Ace | آس |
| King | ملك / شايب |
| Queen | بنت / ملكة |
| Jack | ولد / شب |

---

## 12. TYPESCRIPT INTERFACE SKETCH

```ts
// ─────────────────────────────────────────────────────────────
// Cards
// ─────────────────────────────────────────────────────────────
export type Suit = 'S' | 'H' | 'D' | 'C';
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14; // 11=J 12=Q 13=K 14=A
export interface Card { rank: Rank; suit: Suit; id: string; } // id is stable for animation

// ─────────────────────────────────────────────────────────────
// Hand evaluation
// ─────────────────────────────────────────────────────────────
export type HandCategory =
  | 'ROYAL_FLUSH' | 'STRAIGHT_FLUSH' | 'FOUR_OF_A_KIND' | 'FULL_HOUSE'
  | 'FLUSH' | 'STRAIGHT' | 'THREE_OF_A_KIND' | 'TWO_PAIR' | 'ONE_PAIR'
  | 'ACE_KING'          // Russian Poker addition — paying hand + dealer qualifier
  | 'HIGH_CARD';        // non-paying, non-qualifying

/** Bet payout multiple for each category. Universal across all sourced casinos. */
export const PAYTABLE: Record<HandCategory, number> = {
  ROYAL_FLUSH: 100, STRAIGHT_FLUSH: 50, FOUR_OF_A_KIND: 20, FULL_HOUSE: 7,
  FLUSH: 5, STRAIGHT: 4, THREE_OF_A_KIND: 3, TWO_PAIR: 2, ONE_PAIR: 1,
  ACE_KING: 1, HIGH_CARD: 0,
};

export interface EvaluatedHand {
  category: HandCategory;
  /** Descending comparison vector; compare lexicographically after category. */
  tiebreak: Rank[];
  /** The 5 cards actually played. */
  cards: Card[];
  /** The *defining* cards of the combination (2 for a pair, 4 for two pair, 5 for a straight, …).
   *  This is the set used by the second-combination mutual-exclusion test. */
  coreCards: Card[];
}

/** Ordered strongest → weakest; used for both showdown and qualification. */
export declare function evaluate5(cards: [Card, Card, Card, Card, Card]): EvaluatedHand;
export declare function bestOf(cards: Card[]): EvaluatedHand;            // best 5 of 5 or 6
export declare function compareHands(a: EvaluatedHand, b: EvaluatedHand): -1 | 0 | 1;
export declare function qualifies(h: EvaluatedHand): boolean;            // category <= ACE_KING in strength

// ─────────────────────────────────────────────────────────────
// Second combination
// ─────────────────────────────────────────────────────────────
export interface CombinationPair {
  primary: EvaluatedHand;          // must be the hand compared against the dealer
  secondary: EvaluatedHand | null;
  /** PAYTABLE[primary] + PAYTABLE[secondary ?? 0] — verified to match every published row. */
  totalMultiple: number;
}

/**
 * Valid iff each core contains at least one card the other's core lacks:
 *   !isSubset(a.coreCards, b.coreCards) && !isSubset(b.coreCards, a.coreCards)
 * Maximises totalMultiple over every candidate pair, including secondary = null.
 */
export declare function findBestCombinationPair(cards: Card[]): CombinationPair;

// ─────────────────────────────────────────────────────────────
// Configuration (every documented variant is a flag)
// ─────────────────────────────────────────────────────────────
export interface RussianPokerConfig {
  mode: 'SIMPLE' | 'CLASSIC';
  betMultiple: 2;                                     // fixed by the rules
  exchangeCostAntes: 1;
  buySixthCostAntes: 1;
  buyDealerCardCostAntes: 1;
  maxExchangeCards: 4 | 5;                            // varies by house; default 5
  allowRepeatSingleExchange: boolean;                 // default false
  /** §4.2 — the biggest variant. 'PAY' = Ante pays 1:1 on a win (recommended). */
  anteOnWin: 'PAY' | 'PUSH';
  /** pagat sub-variant: Ante merely returned on a win if the player exchanged/bought. */
  anteOnWinAfterPurchase: 'PAY' | 'PUSH';
  insurance: {
    enabled: boolean;
    minCategory: 'THREE_OF_A_KIND';
    /** stake ∈ [ante, floor(potentialBetPayout / 2)] */
    maxIsHalfOfPotentialPayout: true;
    onDealerQualifies: 'LOSE' | 'RETURN_IF_DEALER_WINS_OR_TIES';   // default 'LOSE'
  };
  buyDealerCard: { enabled: boolean; discard: 'LOWEST' | 'HIGHEST' | 'FIRST_DEALT' }; // default 'LOWEST'
  bonusBet: { enabled: boolean; table: 'V1_TRIPS_PLUS' | 'V2_STRAIGHT_PLUS' };        // default V1
  jackpot: { enabled: boolean; stake: number; seed: number; envyBonus: number };
  autoDetectSecondCombination: boolean;               // default true
}

// ─────────────────────────────────────────────────────────────
// Game state machine
// ─────────────────────────────────────────────────────────────
export type Phase =
  | 'BETTING'            // place Ante (+ optional Bonus / Jackpot)
  | 'DEALT'              // side bets resolved; awaiting fold / bet / exchange / buy6
  | 'EXCHANGE_SELECT'    // player is picking which cards to swap
  | 'POST_ACTION'        // after exchange/buy: must Bet or Fold
  | 'INSURANCE'          // offered only if final hand >= trips
  | 'DEALER_REVEAL'
  | 'DEALER_NO_QUALIFY'  // offer: take ante, or buy dealer a card (if uninsured)
  | 'SETTLE'
  | 'COMPLETE';

export type PlayerAction =
  | { type: 'PLACE_ANTE'; amount: number }
  | { type: 'PLACE_BONUS'; amount: number }
  | { type: 'PLACE_JACKPOT' }
  | { type: 'FOLD' }
  | { type: 'BET' }                                   // always 2 x ante
  | { type: 'EXCHANGE'; cardIds: string[] }           // 1..maxExchangeCards
  | { type: 'BUY_SIXTH' }
  | { type: 'BUY_INSURANCE'; amount: number }
  | { type: 'DECLINE_INSURANCE' }
  | { type: 'BUY_DEALER_CARD' }
  | { type: 'TAKE_ANTE' };                            // decline to buy dealer a card

export interface RussianPokerState {
  config: RussianPokerConfig;
  phase: Phase;
  handId: string;
  rngSeed: string;                                    // persist for replay / dispute

  deck: Card[];                                       // remaining, top of stack at index 0
  playerCards: Card[];                                // 5, or 6 after BUY_SIXTH
  dealerCards: Card[];
  dealerUpCardIndex: number;

  wagers: {
    ante: number;
    bet: number;                                      // 0 until BET
    bonus: number;
    jackpot: number;
    insurance: number;
    feesPaid: number;                                 // exchange + buy6 + buyDealerCard, never refunded
  };

  flags: {
    hasExchanged: boolean;
    hasBoughtSixth: boolean;
    hasInsured: boolean;
    hasBoughtDealerCard: boolean;
    folded: boolean;
  };

  evaluation: {
    player: CombinationPair | null;
    dealer: EvaluatedHand | null;
    dealerQualified: boolean | null;
    outcome: Outcome | null;
  };

  balanceBefore: number;
  balanceAfter: number | null;
}

export type Outcome =
  | 'FOLDED'
  | 'DEALER_NO_QUALIFY'          // ante 1:1, bet push
  | 'PLAYER_WINS'                // ante per config, bet at odds (+ second combination)
  | 'DEALER_WINS'
  | 'TIE';

export interface Settlement {
  outcome: Outcome;
  anteReturn: number;            // stake + winnings, 0 if lost
  betReturn: number;
  insuranceReturn: number;
  bonusReturn: number;
  jackpotReturn: number;
  /** Human-readable, Arabic-localisable breakdown lines for the result panel. */
  lines: Array<{ labelKey: string; amount: number; multiple?: number }>;
  netChange: number;
}

export declare function reduce(
  state: RussianPokerState,
  action: PlayerAction,
): RussianPokerState;

export declare function settle(state: RussianPokerState): Settlement;
```

---

## 13. IMPLEMENTATION CHECKLIST (testable rule statements)

Each line is a single assertion. Write one test per line.

**Setup and deal**
1. A hand uses exactly one 52-card deck, shuffled by Fisher–Yates before every hand.
2. The player receives exactly 5 cards; the dealer receives exactly 5; exactly 1 dealer card is exposed.
3. No card appears twice in a hand across player, dealer, and any drawn replacements.

**Wagers**
4. The Ante is mandatory; no cards are dealt without it.
5. The maximum selectable Ante is `floor(balance / 4)`.
6. The Bet is always **exactly** 2 × Ante; no other amount is accepted.
7. The Bonus and Jackpot side bets are resolved on the **original 5 cards**, before any exchange or purchase.
8. Folding does not refund the Bonus or Jackpot bets.
9. Exchange, buy-6th, buy-dealer-card and insurance fees are never refunded in any outcome.

**Player options**
10. Exchange and buy-6th-card are mutually exclusive within one hand.
11. Exchange costs exactly 1 × Ante regardless of how many cards are swapped (1 to `maxExchangeCards`).
12. Buying the 6th card costs exactly 1 × Ante and yields a 6-card hand.
13. After exchanging or buying, the only legal actions are BET or FOLD.
14. Folding after paying a fee loses the Ante *and* the fee.
15. With 6 cards, the hand compared to the dealer is the best of the 6 possible 5-card subsets.

**Dealer qualification**
16. The dealer qualifies iff the dealer's hand is Ace-King high or better.
17. Over ≥10⁷ simulated deals, the dealer qualification rate is 56.32% ± 0.05%.
18. When the dealer does not qualify: Ante pays 1:1 and the Bet is returned.
19. When the dealer does not qualify, the second combination is **not** paid.
20. When the dealer qualifies and the player wins: Ante pays 1:1 (config `anteOnWin: 'PAY'`) and the Bet pays `PAYTABLE[category] : 1`.
21. When the dealer qualifies and the dealer wins: Ante and Bet are both lost.
22. On a tie, Ante and Bet are returned and all fees are kept.
23. Suits never break a tie.

**Insurance**
24. Insurance is offered iff the player's final hand is Three-of-a-Kind or better.
25. Insurance stake ∈ `[ante, floor(potentialBetPayout / 2)]`.
26. Insurance pays 1:1 iff the dealer fails to qualify.
27. Insurance payment is **in addition to** the Ante's 1:1 non-qualify payment, not instead of it.
28. An insured box cannot buy the dealer a card.
29. Insurance is lost when the dealer qualifies (default config).

**Buying the dealer a card**
30. Offered only when the dealer has not qualified and the box is uninsured.
31. Costs 1 × Ante; the dealer discards their lowest card and draws one replacement.
32. If the dealer qualifies after the draw, the player's Bet is live and may lose.
33. If the dealer still does not qualify, the Ante pays 1:1 and the Bet is returned.

**Second combination**
34. At most two combinations are ever paid on one box.
35. Two combinations are valid iff each core card set contains at least one card absent from the other.
36. The total payout is the arithmetic sum of the two component paytable multiples.
37. The second combination is paid only when the player's best hand beat the dealer's.
38. `A♠ A♥ K♦ 7♣ 3♦` pays **2:1** (One Pair + Ace-King).
39. `A♠ A♥ A♦ K♣ 6♦` pays **4:1** (Three of a Kind + Ace-King).
40. `A♠ A♥ K♦ K♣ 8♠` pays **2:1** — no second combination (AK core ⊆ two-pair core).
41. `A♠ A♥ A♦ K♠ K♥` pays **7:1** — no second combination.
42. `A♠A♥A♦ K♠K♥K♦` pays **14:1** (Full House + Full House).
43. `A♠A♥A♦A♣ K♠K♥` pays **27:1** (Four of a Kind + Full House).
44. `A♠K♠9♠5♠3♠ + A♥` pays **6:1** (Flush + One Pair).
45. `9♠10♠J♠Q♠K♠A♠` pays **150:1** (Royal Flush + Straight Flush).
46. `A♠A♥ K♠K♥ Q♠Q♥` pays **4:1** (Two Pair + Two Pair), not 3:1.
47. `5♠6♠7♠8♠9♠10♠` pays **100:1** (two straight flushes).

**Hand ranking**
48. `A-2-3-4-5` is a straight (the lowest); `A-K-Q-J-10` is the highest.
49. `A-2-3-4-5` suited is a straight flush, not a royal flush.
50. `Q-K-A-2-3` is **not** a straight.
51. Ace-King high ranks above every other no-pair hand and below One Pair.
52. Ace-King high pays 1:1 on the Bet.

**Paytable**
53. The Bet paytable is exactly 100/50/20/7/5/4/3/2/1/1 for RF/SF/4K/FH/Fl/St/3K/2P/1P/AK.
54. Bonus bet V1 pays 1000/500/200/70/50/40/25 for RF/SF/4K/FH/Fl/St/3K; over ≥10⁷ deals its return is 94.08% ± 0.1%.
55. Bonus bet V2 pays 3000/800/250/150/100/50 for RF/SF/4K/FH/Fl/St; over ≥10⁷ deals its return is 68.46% ± 0.1%.

**Bankroll and integrity**
56. All balances and payouts are integers; no floating-point arithmetic touches a balance.
57. Any option the player cannot afford is disabled with a stated reason, never silently allowed.
58. The balance can never go negative in any code path.
59. Every hand persists its RNG seed and full action log for replay.

---

## 14. SOURCE LIST AND RELIABILITY GRADING

| Source | Grade | Notes |
|---|---|---|
| [pagat.com — Russian Poker](https://www.pagat.com/banking/russian_poker.html) | **A — primary reference** | John McLeod's card-game archive; the most complete and careful English rules text. Full two-combination table. |
| [gambiter.com](https://gambiter.com/cards/banking/russian_poker.html) | B+ | Closely tracks pagat; useful corroboration |
| [Olympic Casino Latvia — Russian Poker](https://olympic-casino.lv/en/game/russian-poker-1) | **A — regulated operator** | Real published house rules (Baltic) |
| [Olympic Casino Lithuania — Russian Poker](https://olympic-casino.lt/en/game/russian-poker-2) | **A — regulated operator** | Confirms the V2 bonus paytable exactly |
| [Olympic Casino — Progressive Poker Jackpot](https://olympic-casino.lv/en/jackpot/progressive-poker-jackpot) | **A** | Real jackpot structure, seed, envy bonus |
| [Casino Sochi — Russian Poker](https://casinosochi.com/games/russian-poker-cs) | **A — operator** | Documents the Ante-pushes variant |
| [OneTouch — Russian Poker (supplier)](https://www.onetouch.io/games/russian-poker/) | **A — supplier** | Official RTP 99.54% |
| [Wizard of Odds — Lunar Poker](https://wizardofodds.com/games/lunar-poker/) | **A — analyst** | House edge 4.90% / EoR 2.38%, outcome-space size, dealer-draw variant. *Direct fetch was blocked (repeated ECONNRESET); figures taken from the search index summary of this page — verify before publishing them in-app.* |
| [Wizard of Odds — Oasis Poker](https://wizardofodds.com/games/oasis-poker/) | A | For the Oasis contrast |
| [LiveCasinoComparer — Ezugi Russian Poker](https://www.livecasinocomparer.com/live-casino-software/ezugi-live-casino-software/ezugi-russian-poker/) | B+ | Ezugi RTP 98.23%; live-dealer version widely served to Arabic-speaking markets |
| [LCB — Russian Poker (OneTouch)](https://lcb.org/games/russian-poker) | B | Side-bet house edge 18.34% |
| [casinoz.club](https://www.casinoz.club/rule/russian-poker-rules.html) | B | Insurance min/max detail |
| [gamerules.com](https://gamerules.com/rules/russian-poker-card-game/) | B | Corroboration |
| [coololdgames.com](https://www.coololdgames.com/card-games/poker/casino/russian/) | B− | Good structure; its "always buy the 6th card" advice is dubious and its "non-qualify = everything pushes" claim contradicts every operator source |
| [cardmates.co.uk — strategy](https://cardmates.co.uk/russian_poker_strategy) | C+ | Heuristics only, unsourced math |
| [kuwaitpoker.com — بوكر روسي](https://kuwaitpoker.com/en/poker-games/russian-poker/) | C+ | Arabic terminology attestation |
| [officialgamerules.org](https://officialgamerules.org/game-rules/russian-poker/) | B | Returned HTTP 403 on direct fetch; content reached via search index |

### Claims that are well-sourced vs. claims that vary

**Well-sourced (safe to implement as stated):** single 52-card deck; 5+5 deal with one dealer card up;
Ante mandatory; Bet = exactly 2 × Ante; dealer qualifies on Ace-King or better; exchange costs 1 Ante flat;
6th card costs 1 Ante; exchange and buy are exclusive; insurance requires trips+ and pays 1:1 on
non-qualification with max = ½ the potential payout; second combination capped at 2 and paid only if the
best hand wins; the 100/50/20/7/5/4/3/2/1/1 paytable; two-combination payout = sum of parts; standard hand
rankings with ace-low straights; buying the dealer a card costs 1 Ante.

**Varies by casino (make it a config flag, and state your choice in-app):** whether the Ante pays 1:1 or
pushes when the player wins (§4.2); whether the Ante is merely returned after an exchange/buy; whether 4 or
5 cards may be exchanged; whether a single-card exchange may be repeated; which card the dealer discards
when bought a card; whether insurance is lost or returned when the dealer qualifies; which Bonus paytable
is used; whether a progressive jackpot exists and its structure.

**Computed by me (not from a source; recheck if it matters commercially):** the exact hand-count and
probability column in §5.1; the 56.3184% dealer qualification rate; the 94.08% / 68.46% Bonus bet returns
and their house edges; the −12.6% standalone EV of insurance; the verification that every published
two-combination row equals the sum of its parts.

**Not attested anywhere (do not implement for "fidelity"):** an "ante doubling" option; an "ante bonus"
in the Three Card Poker sense.
