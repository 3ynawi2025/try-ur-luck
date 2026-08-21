// ============================================================
// Russian Poker tests (per spec checklist §13)
// ============================================================

import {
  evaluateRussian5,
  bestRussian5,
  compareRussianHands,
  russianQualifies,
  findBestCombinationPair,
  RussianPokerEngine,
  RussianCategory,
  RUSSIAN_PAYTABLE,
  RECOMMENDED_RUSSIAN_CONFIG,
} from '../russianPoker';
import { Card, seededRng } from '../deck';

const C = (rank: Card['rank'], suit: Card['suit']): Card => ({ rank, suit });

describe('russian hand evaluation', () => {
  it('A-2-3-4-5 is the lowest straight; A-K-Q-J-10 the highest; Q-K-A-2-3 is NOT a straight (but IS AK-high)', () => {
    const wheel = evaluateRussian5([C('A', 'spades'), C('2', 'hearts'), C('3', 'diamonds'), C('4', 'clubs'), C('5', 'spades')]);
    const broadway = evaluateRussian5([C('A', 'spades'), C('K', 'hearts'), C('Q', 'diamonds'), C('J', 'clubs'), C('10', 'spades')]);
    const wrap = evaluateRussian5([C('Q', 'spades'), C('K', 'hearts'), C('A', 'diamonds'), C('2', 'clubs'), C('3', 'spades')]);
    expect(wheel.category).toBe(RussianCategory.STRAIGHT);
    expect(wheel.tiebreak[0]).toBe(5);
    expect(broadway.category).toBe(RussianCategory.STRAIGHT);
    expect(broadway.tiebreak[0]).toBe(14);
    expect(wrap.category).not.toBe(RussianCategory.STRAIGHT);
    expect(wrap.category).toBe(RussianCategory.ACE_KING); // top two are A,K → paying hand
  });

  it('A-2-3-4-5 suited is a straight flush, NOT a royal flush', () => {
    const h = evaluateRussian5([C('A', 'spades'), C('2', 'spades'), C('3', 'spades'), C('4', 'spades'), C('5', 'spades')]);
    expect(h.category).toBe(RussianCategory.STRAIGHT_FLUSH);
  });

  it('Ace-King high ranks above every no-pair hand and below One Pair', () => {
    const ak = evaluateRussian5([C('A', 'spades'), C('K', 'hearts'), C('9', 'diamonds'), C('5', 'clubs'), C('2', 'spades')]);
    const qHigh = evaluateRussian5([C('Q', 'spades'), C('J', 'hearts'), C('9', 'diamonds'), C('5', 'clubs'), C('2', 'spades')]);
    const pair = evaluateRussian5([C('2', 'spades'), C('2', 'hearts'), C('9', 'diamonds'), C('5', 'clubs'), C('3', 'spades')]);
    expect(ak.category).toBe(RussianCategory.ACE_KING);
    expect(qHigh.category).toBe(RussianCategory.HIGH_CARD);
    expect(compareRussianHands(ak, qHigh)).toBe(1);
    expect(compareRussianHands(pair, ak)).toBe(1);
    expect(RUSSIAN_PAYTABLE[RussianCategory.ACE_KING]).toBe(1);
  });

  it('dealer qualification = Ace-King or better', () => {
    expect(russianQualifies(evaluateRussian5([C('A', 'spades'), C('K', 'hearts'), C('9', 'diamonds'), C('5', 'clubs'), C('2', 'spades')]))).toBe(true);
    expect(russianQualifies(evaluateRussian5([C('A', 'spades'), C('Q', 'hearts'), C('9', 'diamonds'), C('5', 'clubs'), C('2', 'spades')]))).toBe(false);
    expect(russianQualifies(evaluateRussian5([C('2', 'spades'), C('2', 'hearts'), C('9', 'diamonds'), C('5', 'clubs'), C('3', 'spades')]))).toBe(true);
  });

  it('paytable is exactly 100/50/20/7/5/4/3/2/1/1', () => {
    expect(RUSSIAN_PAYTABLE).toEqual({
      [RussianCategory.HIGH_CARD]: 0,
      [RussianCategory.ACE_KING]: 1,
      [RussianCategory.ONE_PAIR]: 1,
      [RussianCategory.TWO_PAIR]: 2,
      [RussianCategory.THREE_OF_A_KIND]: 3,
      [RussianCategory.STRAIGHT]: 4,
      [RussianCategory.FLUSH]: 5,
      [RussianCategory.FULL_HOUSE]: 7,
      [RussianCategory.FOUR_OF_A_KIND]: 20,
      [RussianCategory.STRAIGHT_FLUSH]: 50,
      [RussianCategory.ROYAL_FLUSH]: 100,
    });
  });

  it('best 5 of 6 picks the strongest subset', () => {
    const cards = [C('9', 'spades'), C('4', 'hearts'), C('A', 'spades'), C('K', 'spades'), C('Q', 'spades'), C('J', 'spades')];
    const best = bestRussian5(cards);
    // Best 5 = A-K-Q-J-9 all spades → FLUSH
    expect(best.category).toBe(RussianCategory.FLUSH);
    const six = [C('2', 'clubs'), C('3', 'clubs'), C('4', 'clubs'), C('5', 'clubs'), C('6', 'clubs'), C('7', 'clubs')];
    const best6 = bestRussian5(six);
    expect(best6.category).toBe(RussianCategory.STRAIGHT_FLUSH);
    expect(best6.tiebreak[0]).toBe(7); // 3-4-5-6-7 beats 2-3-4-5-6
  });
});

describe('second combination (the signature rule)', () => {
  it('A♠A♥K♦7♣3♦ pays 2:1 (One Pair + Ace-King)', () => {
    const r = findBestCombinationPair([C('A', 'spades'), C('A', 'hearts'), C('K', 'diamonds'), C('7', 'clubs'), C('3', 'diamonds')]);
    expect(r.totalMultiple).toBe(2);
    expect(r.secondaryCategory).toBe(RussianCategory.ACE_KING);
  });

  it('A♠A♥A♦K♣6♦ pays 4:1 (Three of a Kind + Ace-King)', () => {
    const r = findBestCombinationPair([C('A', 'spades'), C('A', 'hearts'), C('A', 'diamonds'), C('K', 'clubs'), C('6', 'diamonds')]);
    expect(r.totalMultiple).toBe(4);
  });

  it('A♠A♥K♦K♣8♠ pays 2:1 — NO second combination (AK core ⊆ two-pair core)', () => {
    const r = findBestCombinationPair([C('A', 'spades'), C('A', 'hearts'), C('K', 'diamonds'), C('K', 'clubs'), C('8', 'spades')]);
    expect(r.totalMultiple).toBe(2);
    expect(r.secondaryCategory).toBeNull();
  });

  it('A♠A♥A♦K♠K♥ pays 7:1 — no second combination', () => {
    const r = findBestCombinationPair([C('A', 'spades'), C('A', 'hearts'), C('A', 'diamonds'), C('K', 'spades'), C('K', 'hearts')]);
    expect(r.totalMultiple).toBe(7);
    expect(r.secondaryCategory).toBeNull();
  });

  it('A♠A♥A♦K♠K♥K♦ (6 cards) pays 14:1 (Full House + Full House)', () => {
    const r = findBestCombinationPair([C('A', 'spades'), C('A', 'hearts'), C('A', 'diamonds'), C('K', 'spades'), C('K', 'hearts'), C('K', 'diamonds')]);
    expect(r.totalMultiple).toBe(14);
  });

  it('A♠A♥A♦A♣K♠K♥ pays 27:1 (Four of a Kind + Full House)', () => {
    const r = findBestCombinationPair([C('A', 'spades'), C('A', 'hearts'), C('A', 'diamonds'), C('A', 'clubs'), C('K', 'spades'), C('K', 'hearts')]);
    expect(r.totalMultiple).toBe(27);
  });

  it('A♠K♠9♠5♠3♠ + A♥ pays 6:1 (Flush + One Pair)', () => {
    const r = findBestCombinationPair([C('A', 'spades'), C('K', 'spades'), C('9', 'spades'), C('5', 'spades'), C('3', 'spades'), C('A', 'hearts')]);
    expect(r.totalMultiple).toBe(6);
  });

  it('9♠10♠J♠Q♠K♠A♠ pays 150:1 (Royal Flush + Straight Flush)', () => {
    const r = findBestCombinationPair([C('9', 'spades'), C('10', 'spades'), C('J', 'spades'), C('Q', 'spades'), C('K', 'spades'), C('A', 'spades')]);
    expect(r.totalMultiple).toBe(150);
  });

  it('A♠A♥K♠K♥Q♠Q♥ pays 4:1 (Two Pair + Two Pair), not 3:1', () => {
    const r = findBestCombinationPair([C('A', 'spades'), C('A', 'hearts'), C('K', 'spades'), C('K', 'hearts'), C('Q', 'spades'), C('Q', 'hearts')]);
    expect(r.totalMultiple).toBe(4);
  });

  it('5♠6♠7♠8♠9♠10♠ pays 100:1 (two straight flushes)', () => {
    const r = findBestCombinationPair([C('5', 'spades'), C('6', 'spades'), C('7', 'spades'), C('8', 'spades'), C('9', 'spades'), C('10', 'spades')]);
    expect(r.totalMultiple).toBe(100);
  });

  it('A♠2♠3♠4♠5♠ + 6♠ contains two straight flushes (A-5 and 2-6) → 100:1', () => {
    const r = findBestCombinationPair([C('A', 'spades'), C('2', 'spades'), C('3', 'spades'), C('4', 'spades'), C('5', 'spades'), C('6', 'spades')]);
    expect(r.totalMultiple).toBe(100);
  });
});

// ============================================================
// Engine flows (rigged decks)
// ============================================================

function makeEngine(shoe: Card[], balance = 1000) {
  // CLASSIC mode exposes insurance + buy-the-dealer-a-card + buy-6th (Simple mode hides them).
  const config = { ...RECOMMENDED_RUSSIAN_CONFIG, mode: 'CLASSIC' as const };
  const engine = new RussianPokerEngine(balance, config, seededRng(1));
  return { engine, deal: () => engine.deal(shoe) };
}

describe('russian engine', () => {
  it('max ante = floor(balance / 4)', () => {
    const { engine } = makeEngine([]);
    expect(engine.placeAnte(260)).toBe('الحد الأقصى للرهان 250');
    expect(engine.placeAnte(250)).toBeNull();
  });

  it('Bet is exactly 2 × ante', () => {
    // Player AAKQ3 → pair; dealer AKKQJ → pair (higher kicker wins? A-K-K vs A-A-K: dealer pair K vs player pair A → player wins)
    const { engine, deal } = makeEngine([
      C('A', 'spades'), C('A', 'hearts'), C('K', 'diamonds'), C('Q', 'clubs'), C('3', 'diamonds'), // player AA
      C('K', 'spades'), C('K', 'clubs'), C('9', 'diamonds'), C('5', 'hearts'), C('2', 'spades'), // dealer KK
    ]);
    expect(engine.placeAnte(100)).toBeNull();
    deal();
    const snap = engine.snapshot();
    expect(snap.wagers.ante).toBe(100);
    // Dealer upcard is the FIRST dealer card = K♠ (face up) — check it is exposed and rest hidden
    expect(snap.dealerUpCard?.rank).toBe('K');
    expect(snap.dealerCards).toBeNull(); // hidden before reveal
    expect(engine.bet2x()).toBeNull();
    expect(engine.snapshot().wagers.bet).toBe(200); // exactly 2× ante
    const final = engine.snapshot();
    expect(final.outcome).toBe('PLAYER_WINS');
    expect(final.settlement!.anteReturn).toBe(200); // 1:1 + stake
    // Second combination: Pair(AA) + Ace-King → 2:1 total on the Bet
    expect(final.settlement!.totalMultiple).toBe(2);
    expect(final.settlement!.betReturn).toBe(200 * 2 + 200);
  });

  it('dealer does not qualify → Ante 1:1, Bet pushed, second combination NOT paid', () => {
    const { engine, deal } = makeEngine([
      C('A', 'spades'), C('A', 'hearts'), C('A', 'diamonds'), C('K', 'clubs'), C('6', 'diamonds'), // trips + AK → 4:1
      C('A', 'clubs'), C('Q', 'spades'), C('9', 'hearts'), C('5', 'diamonds'), C('2', 'clubs'), // A-Q high → NO qualify
    ]);
    expect(engine.placeAnte(100)).toBeNull();
    deal();
    expect(engine.bet2x()).toBeNull();
    // Trips trigger the insurance offer → decline, then decline buying the dealer a card.
    if (engine.snapshot().phase === 'INSURANCE') expect(engine.declineInsurance()).toBeNull();
    expect(engine.takeAnte()).toBeNull();
    const snap = engine.snapshot();
    expect(snap.outcome).toBe('DEALER_NO_QUALIFY');
    expect(snap.settlement!.anteReturn).toBe(200); // 1:1
    expect(snap.settlement!.betReturn).toBe(200); // pushed (stake only)
    expect(snap.settlement!.totalMultiple).toBe(0); // no second combination payout
  });

  it('fold loses the ante (and any exchange fee)', () => {
    const { engine, deal } = makeEngine([
      C('2', 'spades'), C('7', 'hearts'), C('9', 'diamonds'), C('J', 'clubs'), C('4', 'spades'),
      C('K', 'spades'), C('K', 'clubs'), C('9', 'hearts'), C('5', 'diamonds'), C('2', 'clubs'),
    ]);
    expect(engine.placeAnte(100)).toBeNull();
    deal();
    expect(engine.fold()).toBeNull();
    const snap = engine.snapshot();
    expect(snap.outcome).toBe('FOLDED');
    expect(snap.balance).toBe(900);
  });

  it('exchange costs 1 ante flat for any number of cards; then must BET or FOLD', () => {
    // Player 2-7-9-J-4 → exchange all 5 → new cards from the shoe.
    const { engine, deal } = makeEngine([
      C('2', 'spades'), C('7', 'hearts'), C('9', 'diamonds'), C('J', 'clubs'), C('4', 'spades'),
      C('K', 'spades'), C('K', 'clubs'), C('9', 'hearts'), C('5', 'diamonds'), C('2', 'clubs'),
      // exchange replacements:
      C('A', 'spades'), C('A', 'hearts'), C('A', 'diamonds'), C('K', 'diamonds'), C('6', 'diamonds'),
    ]);
    expect(engine.placeAnte(100)).toBeNull();
    deal();
    const ids = engine.snapshot().playerCards.map((c) => `${c.rank}-${c.suit}`);
    expect(engine.exchange(ids)).toBeNull(); // exchange all 5, cost 100
    expect(engine.snapshot().wagers.feesPaid).toBe(100);
    expect(engine.snapshot().phase).toBe('POST_ACTION');
    expect(engine.fold()).toBeNull(); // folding after exchange loses ante + fee
    expect(engine.snapshot().balance).toBe(800);
  });

  it('exchange and buy-6th are mutually exclusive', () => {
    const { engine, deal } = makeEngine([
      C('2', 'spades'), C('7', 'hearts'), C('9', 'diamonds'), C('J', 'clubs'), C('4', 'spades'),
      C('K', 'spades'), C('K', 'clubs'), C('9', 'hearts'), C('5', 'diamonds'), C('2', 'clubs'),
      C('A', 'spades'),
    ]);
    expect(engine.placeAnte(100)).toBeNull();
    deal();
    expect(engine.buySixthCard()).toBeNull();
    expect(engine.exchange([`2-spades`])).toBe('لا يمكن الجمع بين التبديل والورقة السادسة');
  });

  it('buy 6th card: hand compared to the dealer is the best 5 of 6', () => {
    const { engine, deal } = makeEngine([
      C('2', 'clubs'), C('3', 'clubs'), C('4', 'clubs'), C('5', 'clubs'), C('K', 'hearts'), // player: flush draw
      C('K', 'spades'), C('K', 'clubs'), C('9', 'hearts'), C('5', 'diamonds'), C('2', 'spades'), // dealer pair K
      C('6', 'clubs'), // bought card → completes 2-3-4-5-6 straight flush!
    ]);
    expect(engine.placeAnte(100)).toBeNull();
    deal();
    expect(engine.buySixthCard()).toBeNull();
    expect(engine.snapshot().playerCards).toHaveLength(6);
    expect(engine.bet2x()).toBeNull();
    // Straight flush triggers the insurance offer in CLASSIC mode → decline.
    if (engine.snapshot().phase === 'INSURANCE') expect(engine.declineInsurance()).toBeNull();
    const snap = engine.snapshot();
    expect(snap.outcome).toBe('PLAYER_WINS');
    // Straight flush (2-3-4-5-6) pays 50:1
    expect(snap.settlement!.totalMultiple).toBe(50);
    expect(snap.settlement!.betReturn).toBe(200 * 50 + 200);
  });

  it('insurance: offered on trips+, pays 1:1 on no-qualify in ADDITION to the ante', () => {
    const { engine, deal } = makeEngine([
      C('A', 'spades'), C('A', 'hearts'), C('A', 'diamonds'), C('K', 'clubs'), C('6', 'diamonds'), // trips
      C('A', 'clubs'), C('Q', 'spades'), C('9', 'hearts'), C('5', 'diamonds'), C('2', 'clubs'), // A-Q → no qualify
    ]);
    expect(engine.placeAnte(100)).toBeNull();
    deal();
    expect(engine.bet2x()).toBeNull();
    const snap1 = engine.snapshot();
    expect(snap1.phase).toBe('INSURANCE');
    // Potential bet payout = 200 × 3 = 600 → max insurance = 300
    expect(engine.takeInsurance(150)).toBeNull();
    const snap = engine.snapshot();
    expect(snap.outcome).toBe('DEALER_NO_QUALIFY');
    expect(snap.settlement!.anteReturn).toBe(200); // ante 1:1
    expect(snap.settlement!.insuranceReturn).toBe(300); // insurance 1:1 + stake
  });

  it('insurance is lost when the dealer qualifies (default config)', () => {
    const { engine, deal } = makeEngine([
      C('A', 'spades'), C('A', 'hearts'), C('A', 'diamonds'), C('K', 'clubs'), C('6', 'diamonds'), // trips
      C('K', 'spades'), C('K', 'clubs'), C('9', 'hearts'), C('5', 'diamonds'), C('2', 'spades'), // pair K → qualifies
    ]);
    expect(engine.placeAnte(100)).toBeNull();
    deal();
    expect(engine.bet2x()).toBeNull();
    expect(engine.snapshot().phase).toBe('INSURANCE');
    expect(engine.takeInsurance(100)).toBeNull();
    const snap = engine.snapshot();
    expect(snap.outcome).toBe('PLAYER_WINS');
    expect(snap.settlement!.insuranceReturn).toBe(0); // lost
  });

  it('buy the dealer a card: only on no-qualify and uninsured; dealer discards the LOWEST card', () => {
    const { engine, deal } = makeEngine([
      C('K', 'spades'), C('K', 'hearts'), C('Q', 'diamonds'), C('J', 'clubs'), C('3', 'diamonds'), // pair K
      C('A', 'clubs'), C('Q', 'spades'), C('9', 'hearts'), C('5', 'diamonds'), C('2', 'clubs'), // A-Q → no qualify
      C('K', 'diamonds'), // replacement → dealer gets pair K → qualifies → player pair K vs dealer pair K...
    ]);
    expect(engine.placeAnte(100)).toBeNull();
    deal();
    expect(engine.bet2x()).toBeNull();
    const snap1 = engine.snapshot();
    expect(snap1.phase).toBe('DEALER_NO_QUALIFY');
    // Dealer A-Q-9-5-2 → lowest is 2 → discard, draw K → A-K-Q-9-5 = AK high → qualifies
    expect(engine.buyDealerCard()).toBeNull();
    const snap = engine.snapshot();
    expect(snap.dealerQualified).toBe(true);
    expect(snap.outcome).toBe('PLAYER_WINS'); // pair K beats AK-high
    expect(snap.wagers.feesPaid).toBe(100);
  });

  it('takeAnte: decline buying the dealer a card → ante 1:1, bet pushed', () => {
    const { engine, deal } = makeEngine([
      C('K', 'spades'), C('K', 'hearts'), C('Q', 'diamonds'), C('J', 'clubs'), C('3', 'diamonds'),
      C('A', 'clubs'), C('Q', 'spades'), C('9', 'hearts'), C('5', 'diamonds'), C('2', 'clubs'),
    ]);
    expect(engine.placeAnte(100)).toBeNull();
    deal();
    expect(engine.bet2x()).toBeNull();
    expect(engine.takeAnte()).toBeNull();
    const snap = engine.snapshot();
    expect(snap.outcome).toBe('DEALER_NO_QUALIFY');
    expect(snap.settlement!.anteReturn).toBe(200);
    expect(snap.settlement!.betReturn).toBe(200);
  });

  it('tie → ante and bet returned, fees kept', () => {
    const { engine, deal } = makeEngine([
      C('A', 'spades'), C('K', 'hearts'), C('9', 'diamonds'), C('5', 'clubs'), C('2', 'spades'),
      C('A', 'clubs'), C('K', 'diamonds'), C('9', 'hearts'), C('5', 'spades'), C('2', 'diamonds'),
    ]);
    expect(engine.placeAnte(100)).toBeNull();
    deal();
    expect(engine.bet2x()).toBeNull();
    const snap = engine.snapshot();
    expect(snap.outcome).toBe('TIE');
    expect(snap.settlement!.anteReturn).toBe(100);
    expect(snap.settlement!.betReturn).toBe(200);
  });

  it('dealer wins → ante and bet both lost', () => {
    const { engine, deal } = makeEngine([
      C('Q', 'spades'), C('J', 'hearts'), C('9', 'diamonds'), C('5', 'clubs'), C('2', 'spades'), // Q-high → no...
      C('K', 'clubs'), C('K', 'diamonds'), C('9', 'hearts'), C('5', 'spades'), C('2', 'diamonds'), // pair K
    ]);
    expect(engine.placeAnte(100)).toBeNull();
    deal();
    expect(engine.bet2x()).toBeNull();
    const snap = engine.snapshot();
    expect(snap.outcome).toBe('DEALER_WINS');
    expect(snap.settlement!.anteReturn).toBe(0);
    expect(snap.settlement!.betReturn).toBe(0);
    expect(snap.balance).toBe(700); // 1000 - 100 - 200
  });
});

// ============================================================
// Input validation + exchange dedupe (hardening)
// ============================================================

describe('russian input validation & exchange dedupe', () => {
  it('rejects NaN / fractional ante without corrupting balance', () => {
    const { engine } = makeEngine([]);
    expect(engine.placeAnte(NaN)).toBe('مبلغ غير صالح');
    expect(engine.placeAnte(10.5)).toBe('مبلغ غير صالح');
    expect(engine.snapshot().balance).toBe(1000);
  });

  it('exchange dedupes duplicate card ids (no burned card)', () => {
    const { engine, deal } = makeEngine([
      C('2', 'spades'), C('7', 'hearts'), C('9', 'diamonds'), C('J', 'clubs'), C('4', 'spades'), // player
      C('K', 'spades'), C('K', 'clubs'), C('9', 'hearts'), C('5', 'diamonds'), C('2', 'clubs'), // dealer
      C('A', 'spades'), // spare — البطاقة البديلة الوحيدة
    ]);
    expect(engine.placeAnte(100)).toBeNull();
    deal();
    const before = engine.snapshot().playerCards.map((c) => `${c.rank}-${c.suit}`);
    const id = before[0];
    expect(engine.exchange([id, id])).toBeNull(); // قبل الإصلاح: كان يُحرق البطاقة الثانية
    const after = engine.snapshot().playerCards;
    expect(after.length).toBe(5);
    expect(after[0].rank === 'A' && after[0].suit === 'spades').toBe(true);
    expect(after.slice(1).map((c) => `${c.rank}-${c.suit}`)).toEqual(before.slice(1));
    expect(engine.snapshot().hasExchanged).toBe(true);
  });
});
