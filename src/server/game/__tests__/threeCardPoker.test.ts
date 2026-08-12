// ============================================================
// Three Card Poker tests (per spec checklist §13)
// ============================================================

import {
  evaluateThreeCards,
  compareThreeCards,
  shouldPlayThree,
  evaluateSixCardBonus,
  resolveThreeCardRound,
  ThreeCardPokerEngine,
  ThreeCardCategory,
  RECOMMENDED_THREE_CARD_CONFIG,
} from '../threeCardPoker';
import { Card, createDeck, seededRng } from '../deck';

const C = (rank: Card['rank'], suit: Card['suit']): Card => ({ rank, suit });

// Enumerate all C(52,3) hands
function allThreeCardHands(): Card[][] {
  const deck = createDeck();
  const out: Card[][] = [];
  for (let a = 0; a < deck.length - 2; a++)
    for (let b = a + 1; b < deck.length - 1; b++)
      for (let c = b + 1; c < deck.length; c++) out.push([deck[a], deck[b], deck[c]]);
  return out;
}

describe('three-card hand evaluation', () => {
  it('ranking order is SF > 3K > STRAIGHT > FLUSH > PAIR > HIGH_CARD', () => {
    const sf = evaluateThreeCards([C('A', 'spades'), C('K', 'spades'), C('Q', 'spades')]);
    const trips = evaluateThreeCards([C('2', 'spades'), C('2', 'hearts'), C('2', 'diamonds')]);
    const straight = evaluateThreeCards([C('A', 'spades'), C('K', 'hearts'), C('Q', 'diamonds')]);
    const flush = evaluateThreeCards([C('A', 'spades'), C('9', 'spades'), C('4', 'spades')]);
    const pair = evaluateThreeCards([C('K', 'spades'), C('K', 'hearts'), C('2', 'diamonds')]);
    const high = evaluateThreeCards([C('K', 'spades'), C('9', 'hearts'), C('4', 'diamonds')]);
    expect(sf.category).toBe(ThreeCardCategory.STRAIGHT_FLUSH);
    expect(trips.category).toBe(ThreeCardCategory.THREE_OF_A_KIND);
    expect(straight.category).toBe(ThreeCardCategory.STRAIGHT);
    expect(flush.category).toBe(ThreeCardCategory.FLUSH);
    expect(pair.category).toBe(ThreeCardCategory.PAIR);
    expect(high.category).toBe(ThreeCardCategory.HIGH_CARD);
    expect(compareThreeCards(sf, trips)).toBe(1);
    expect(compareThreeCards(trips, straight)).toBe(1);
    expect(compareThreeCards(straight, flush)).toBe(1);
    expect(compareThreeCards(flush, pair)).toBe(1);
    expect(compareThreeCards(pair, high)).toBe(1);
  });

  it('exhaustive enumeration: 22,100 hands with counts 48 / 52 / 720 / 1096 / 3744 / 16440', () => {
    const hands = allThreeCardHands();
    expect(hands).toHaveLength(22100);
    const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const h of hands) counts[evaluateThreeCards(h).category]++;
    expect(counts[5]).toBe(48); // straight flush
    expect(counts[4]).toBe(52); // trips
    expect(counts[3]).toBe(720); // straight
    expect(counts[2]).toBe(1096); // flush
    expect(counts[1]).toBe(3744); // pair
    expect(counts[0]).toBe(16440); // high card
  });

  it('exactly 4 hands are Mini Royal', () => {
    const hands = allThreeCardHands();
    const mini = hands.filter((h) => evaluateThreeCards(h).isMiniRoyal);
    expect(mini).toHaveLength(4);
  });

  it('A♠2♥3♦ is a STRAIGHT with high card 3', () => {
    const h = evaluateThreeCards([C('A', 'spades'), C('2', 'hearts'), C('3', 'diamonds')]);
    expect(h.category).toBe(ThreeCardCategory.STRAIGHT);
    expect(h.keys[0]).toBe(3);
  });

  it('A♠2♠3♠ is the LOWEST straight flush (high card 3)', () => {
    const h = evaluateThreeCards([C('A', 'spades'), C('2', 'spades'), C('3', 'spades')]);
    expect(h.category).toBe(ThreeCardCategory.STRAIGHT_FLUSH);
    expect(h.keys[0]).toBe(3);
    expect(h.isMiniRoyal).toBe(false);
    const mid = evaluateThreeCards([C('2', 'spades'), C('3', 'spades'), C('4', 'spades')]);
    expect(compareThreeCards(h, mid)).toBe(-1); // A-2-3 < 2-3-4
  });

  it('A♠K♠Q♠ is the highest hand and is Mini Royal', () => {
    const h = evaluateThreeCards([C('A', 'spades'), C('K', 'spades'), C('Q', 'spades')]);
    expect(h.category).toBe(ThreeCardCategory.STRAIGHT_FLUSH);
    expect(h.keys[0]).toBe(14);
    expect(h.isMiniRoyal).toBe(true);
  });

  it('K♠A♥2♦ is HIGH_CARD, not a straight', () => {
    const h = evaluateThreeCards([C('K', 'spades'), C('A', 'hearts'), C('2', 'diamonds')]);
    expect(h.category).toBe(ThreeCardCategory.HIGH_CARD);
  });

  it('A♠K♥Q♦ (unsuited) is the highest straight', () => {
    const h = evaluateThreeCards([C('A', 'spades'), C('K', 'hearts'), C('Q', 'diamonds')]);
    expect(h.category).toBe(ThreeCardCategory.STRAIGHT);
    expect(h.keys[0]).toBe(14);
  });

  it('THE classic bug: K♠K♦2♣ beats A♥Q♠Q♦ (pair rank first)', () => {
    const kk = evaluateThreeCards([C('K', 'spades'), C('K', 'diamonds'), C('2', 'clubs')]);
    const qq = evaluateThreeCards([C('A', 'hearts'), C('Q', 'spades'), C('Q', 'diamonds')]);
    expect(compareThreeCards(kk, qq)).toBe(1);
  });

  it('A♠A♦2♣ beats K♥K♠A♣; A♠A♦K♣ beats A♥A♣Q♦', () => {
    expect(compareThreeCards(
      evaluateThreeCards([C('A', 'spades'), C('A', 'diamonds'), C('2', 'clubs')]),
      evaluateThreeCards([C('K', 'hearts'), C('K', 'spades'), C('A', 'clubs')])
    )).toBe(1);
    expect(compareThreeCards(
      evaluateThreeCards([C('A', 'spades'), C('A', 'diamonds'), C('K', 'clubs')]),
      evaluateThreeCards([C('A', 'hearts'), C('A', 'clubs'), C('Q', 'diamonds')])
    )).toBe(1);
  });

  it('identical ranks in different suits are a DRAW (suits never break ties)', () => {
    expect(compareThreeCards(
      evaluateThreeCards([C('A', 'spades'), C('K', 'diamonds'), C('Q', 'clubs')]),
      evaluateThreeCards([C('A', 'hearts'), C('K', 'clubs'), C('Q', 'diamonds')])
    )).toBe(0);
  });
});

describe('dealer qualification', () => {
  it('Q♠3♥2♦ qualifies; J♠10♥8♦ does not; 2♠2♥3♦ (pair) does', () => {
    expect(evaluateThreeCards([C('Q', 'spades'), C('3', 'hearts'), C('2', 'diamonds')]).qualifies).toBe(true);
    expect(evaluateThreeCards([C('J', 'spades'), C('10', 'hearts'), C('8', 'diamonds')]).qualifies).toBe(false);
    expect(evaluateThreeCards([C('2', 'spades'), C('2', 'hearts'), C('3', 'diamonds')]).qualifies).toBe(true);
  });

  it('exactly 15,380 of 22,100 hands qualify (69.5928%)', () => {
    const hands = allThreeCardHands();
    const qualifying = hands.filter((h) => evaluateThreeCards(h).qualifies);
    expect(qualifying).toHaveLength(15380);
  });
});

describe('Q-6-4 strategy', () => {
  it('shouldPlay returns true for exactly 14,900 hands and false for 7,200', () => {
    const hands = allThreeCardHands();
    const play = hands.filter((h) => shouldPlayThree(evaluateThreeCards(h)));
    expect(play).toHaveLength(14900);
    expect(hands.length - play.length).toBe(7200);
  });

  it('Q-6-4 plays; Q-6-3 folds', () => {
    expect(shouldPlayThree(evaluateThreeCards([C('Q', 'spades'), C('6', 'hearts'), C('4', 'diamonds')]))).toBe(true);
    expect(shouldPlayThree(evaluateThreeCards([C('Q', 'spades'), C('6', 'hearts'), C('3', 'diamonds')]))).toBe(false);
  });

  it('every made hand (pair or better) plays; every J-high or lower folds', () => {
    const hands = allThreeCardHands();
    for (const h of hands) {
      const ev = evaluateThreeCards(h);
      if (ev.category >= ThreeCardCategory.PAIR) expect(shouldPlayThree(ev)).toBe(true);
      if (ev.category === ThreeCardCategory.HIGH_CARD && ev.keys[0] <= 11) expect(shouldPlayThree(ev)).toBe(false);
    }
  });

  it('K-2-3 plays, Q-7-2 plays, Q-5-4 folds (boundary table §8.2)', () => {
    expect(shouldPlayThree(evaluateThreeCards([C('K', 'spades'), C('2', 'hearts'), C('3', 'diamonds')]))).toBe(true);
    expect(shouldPlayThree(evaluateThreeCards([C('Q', 'spades'), C('7', 'hearts'), C('2', 'diamonds')]))).toBe(true);
    expect(shouldPlayThree(evaluateThreeCards([C('Q', 'spades'), C('5', 'hearts'), C('4', 'diamonds')]))).toBe(false);
  });
});

describe('settlement — base game', () => {
  const cfg = RECOMMENDED_THREE_CARD_CONFIG;
  const ante10 = { ante: 10, play: 10, pairPlus: 0, sixCardBonus: 0 };

  it('fold → Ante lost, no Ante Bonus', () => {
    const r = resolveThreeCardRound(
      [C('A', 'spades'), C('K', 'spades'), C('Q', 'spades')],
      [C('2', 'hearts'), C('3', 'hearts'), C('4', 'hearts')],
      { ante: 10, play: 0, pairPlus: 0, sixCardBonus: 0 },
      true,
      cfg
    );
    expect(r.outcome).toBe('FOLDED');
    expect(r.anteNet).toBe(0); // stake was deducted at placement; nothing returns
    expect(r.anteBonusNet).toBe(0);
    expect(r.totalNet).toBe(0);
  });

  it('dealer does not qualify → Ante 1:1, Play returned, regardless of hand', () => {
    // Player has a terrible hand (J-10-8) but the dealer doesn't qualify.
    const r = resolveThreeCardRound(
      [C('J', 'spades'), C('10', 'hearts'), C('8', 'diamonds')],
      [C('J', 'clubs'), C('5', 'hearts'), C('2', 'diamonds')],
      ante10,
      false,
      cfg
    );
    expect(r.outcome).toBe('DEALER_NOT_QUALIFIED');
    expect(r.anteNet).toBe(10); // 1:1 winnings
    expect(r.playNet).toBe(0);
    expect(r.returnedStakes).toBe(20); // ante + play stakes back
    expect(r.totalNet).toBe(10);
  });

  it('dealer qualifies + player higher → Ante 1:1 and Play 1:1 (+2A)', () => {
    const r = resolveThreeCardRound(
      [C('K', 'spades'), C('K', 'hearts'), C('2', 'diamonds')],
      [C('Q', 'clubs'), C('J', 'hearts'), C('4', 'diamonds')],
      ante10,
      false,
      cfg
    );
    expect(r.outcome).toBe('PLAYER_WINS');
    expect(r.totalNet).toBe(20); // winnings
    expect(r.returnedStakes).toBe(20); // both stakes back
  });

  it('dealer qualifies + dealer higher → both lost (−2A)', () => {
    const r = resolveThreeCardRound(
      [C('Q', 'spades'), C('J', 'hearts'), C('4', 'diamonds')],
      [C('K', 'clubs'), C('K', 'hearts'), C('2', 'diamonds')],
      ante10,
      false,
      cfg
    );
    expect(r.outcome).toBe('DEALER_WINS');
    expect(r.totalNet).toBe(0);
    expect(r.returnedStakes).toBe(0);
  });

  it('exact draw → both push', () => {
    const r = resolveThreeCardRound(
      [C('A', 'spades'), C('K', 'diamonds'), C('9', 'clubs')],
      [C('A', 'hearts'), C('K', 'clubs'), C('9', 'diamonds')],
      ante10,
      false,
      cfg
    );
    expect(r.outcome).toBe('PUSH');
    expect(r.anteNet).toBe(0);
    expect(r.playNet).toBe(0);
    expect(r.returnedStakes).toBe(20);
  });
});

describe('ante bonus', () => {
  const cfg = RECOMMENDED_THREE_CARD_CONFIG;

  it('paid even when the dealer does not qualify', () => {
    const r = resolveThreeCardRound(
      [C('9', 'spades'), C('10', 'spades'), C('J', 'spades')], // straight flush
      [C('J', 'hearts'), C('4', 'diamonds'), C('2', 'clubs')], // no qualify
      { ante: 10, play: 10, pairPlus: 0, sixCardBonus: 0 },
      false,
      cfg
    );
    expect(r.outcome).toBe('DEALER_NOT_QUALIFIED');
    expect(r.anteBonusNet).toBe(50); // 5:1
    expect(r.totalNet).toBe(10 + 50);
  });

  it('paid even when the player LOSES the showdown', () => {
    const r = resolveThreeCardRound(
      [C('9', 'spades'), C('10', 'spades'), C('J', 'spades')], // straight flush 9-10-J
      [C('Q', 'spades'), C('K', 'spades'), C('A', 'spades')], // higher straight flush
      { ante: 10, play: 10, pairPlus: 0, sixCardBonus: 0 },
      false,
      cfg
    );
    expect(r.outcome).toBe('DEALER_WINS');
    expect(r.anteBonusNet).toBe(50); // still paid in full
    // Regression: −10 (ante) −10 (play) +50 (bonus) = +30 overall net
    const overallNet = r.totalNet + r.returnedStakes - 20; // 20 = stakes placed
    expect(overallNet).toBe(30);
  });

  it('folding forfeits the Ante Bonus even with a straight flush', () => {
    const r = resolveThreeCardRound(
      [C('9', 'spades'), C('10', 'spades'), C('J', 'spades')],
      [C('J', 'hearts'), C('4', 'diamonds'), C('2', 'clubs')],
      { ante: 10, play: 0, pairPlus: 0, sixCardBonus: 0 },
      true,
      cfg
    );
    expect(r.anteBonusNet).toBe(0);
  });
});

describe('pair plus', () => {
  const cfg = RECOMMENDED_THREE_CARD_CONFIG;

  it('resolves identically whether the player folded or played', () => {
    const player = [C('K', 'spades'), C('K', 'hearts'), C('2', 'diamonds')];
    const dealer = [C('Q', 'clubs'), C('J', 'hearts'), C('4', 'diamonds')];
    const w = { ante: 10, play: 10, pairPlus: 10, sixCardBonus: 0 };
    const played = resolveThreeCardRound(player, dealer, w, false, cfg);
    const folded = resolveThreeCardRound(player, dealer, { ...w, play: 0 }, true, cfg);
    expect(played.pairPlusNet).toBe(10); // pair 1:1
    expect(folded.pairPlusNet).toBe(10);
  });

  it('never looks at the dealer cards', () => {
    const player = [C('A', 'spades'), C('K', 'spades'), C('Q', 'spades')]; // mini royal SF
    const dealer1 = [C('2', 'hearts'), C('5', 'clubs'), C('9', 'diamonds')];
    const dealer2 = [C('A', 'hearts'), C('A', 'clubs'), C('A', 'diamonds')]; // trips
    const w = { ante: 10, play: 10, pairPlus: 10, sixCardBonus: 0 };
    const r1 = resolveThreeCardRound(player, dealer1, w, false, cfg);
    const r2 = resolveThreeCardRound(player, dealer2, w, false, cfg);
    expect(r1.pairPlusNet).toBe(400); // SF 40:1
    expect(r2.pairPlusNet).toBe(400);
  });

  it('pair plus wins on exactly 5,660 of 22,100 hands', () => {
    const hands = allThreeCardHands();
    const winners = hands.filter((h) => evaluateThreeCards(h).category >= ThreeCardCategory.PAIR);
    expect(winners).toHaveLength(5660);
  });
});

describe('6 card bonus', () => {
  const cfg = RECOMMENDED_THREE_CARD_CONFIG;

  it('uses the best 5 of 6 with standard 5-card rankings', () => {
    // 6 cards: four kings + A-Q → best 5 = four of a kind.
    const cat = evaluateSixCardBonus([
      C('K', 'spades'), C('K', 'hearts'), C('K', 'diamonds'), C('K', 'clubs'),
      C('A', 'spades'), C('Q', 'hearts'),
    ]);
    expect(cat).toBe('FOUR_OF_A_KIND');
  });

  it('a best-five of TWO PAIR loses', () => {
    const cat = evaluateSixCardBonus([
      C('A', 'spades'), C('A', 'hearts'), C('K', 'diamonds'), C('K', 'clubs'),
      C('9', 'spades'), C('2', 'hearts'),
    ]);
    expect(cat).toBeNull();
  });

  it('resolves even when the player folds', () => {
    const player = [C('K', 'spades'), C('K', 'hearts'), C('K', 'diamonds')];
    const dealer = [C('2', 'clubs'), C('7', 'hearts'), C('J', 'diamonds')];
    const r = resolveThreeCardRound(player, dealer, { ante: 10, play: 0, pairPlus: 0, sixCardBonus: 10 }, true, cfg);
    expect(r.sixCardHand).toBe('THREE_OF_A_KIND');
    expect(r.sixCardBonusNet).toBe(70); // 7:1
  });
});

describe('three-card engine', () => {
  it('reserves the Play wager at Ante time; max ante ≤ floor((balance − sideBets) / 2)', () => {
    const engine = new ThreeCardPokerEngine(1000);
    expect(engine.placeWagers({ ante: 600 })).toBe('رصيد غير كاف'); // 600 + reserve 600 > 1000
    expect(engine.placeWagers({ ante: 500 })).toBeNull();
    expect(engine.snapshot().reservedForPlay).toBe(500);
    expect(engine.snapshot().balance).toBe(500);
  });

  it('play and fold flows settle correctly', () => {
    const rigged: Card[] = [
      C('K', 'spades'), C('K', 'hearts'), C('2', 'diamonds'), // player: pair of kings
      C('Q', 'clubs'), C('J', 'hearts'), C('4', 'diamonds'), // dealer: Q-high (qualifies)
    ];
    const engine = new ThreeCardPokerEngine(1000, RECOMMENDED_THREE_CARD_CONFIG, seededRng(1));
    expect(engine.placeWagers({ ante: 100, pairPlus: 50 })).toBeNull();
    engine.deal(rigged);
    expect(engine.snapshot().phase).toBe('DECISION');
    // Dealer cards are hidden before reveal
    expect(engine.snapshot().dealerCards).toBeNull();
    expect(engine.play()).toBeNull();
    const snap = engine.snapshot();
    expect(snap.phase).toBe('SETTLED');
    expect(snap.result!.outcome).toBe('PLAYER_WINS');
    expect(snap.result!.totalNet).toBe(100 + 100 + 50); // ante 1:1, play 1:1, pair plus 1:1
    expect(snap.balance).toBe(1000 + 250);
  });

  it('folding refunds the Play reserve', () => {
    const rigged: Card[] = [
      C('2', 'spades'), C('7', 'hearts'), C('9', 'diamonds'),
      C('Q', 'clubs'), C('J', 'hearts'), C('4', 'diamonds'),
    ];
    const engine = new ThreeCardPokerEngine(1000, RECOMMENDED_THREE_CARD_CONFIG, seededRng(1));
    expect(engine.placeWagers({ ante: 100 })).toBeNull();
    engine.deal(rigged);
    expect(engine.fold()).toBeNull();
    const snap = engine.snapshot();
    // Balance: 1000 - 100 (ante) + 100 (refunded reserve) - 100 (ante lost) = 900
    expect(snap.balance).toBe(900);
    expect(snap.result!.outcome).toBe('FOLDED');
  });
});
