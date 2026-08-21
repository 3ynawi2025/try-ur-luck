// ============================================================
// Blackjack engine tests (per blackjack-code-audit.md + checklist)
// ============================================================

import { BlackjackEngine, BlackjackConfig, DEFAULT_BLACKJACK_CONFIG } from '../blackjack';
import { Card } from '../deck';

type BlackjackSnapshot = ReturnType<BlackjackEngine['snapshot']>;

const C = (rank: Card['rank'], suit: Card['suit']): Card => ({ rank, suit });

function setup(shoe: Card[], config: Partial<BlackjackConfig> = {}): BlackjackEngine {
  return new BlackjackEngine({ ...config, shoeOverride: shoe });
}

function setupWithPlayer(
  shoe: Card[],
  playerBalance = 1000,
  bet = 100,
  config: Partial<BlackjackConfig> = {},
  playerCount = 1
): { engine: BlackjackEngine; start: () => BlackjackSnapshot | { error: string; code: string } } {
  const engine = setup(shoe, config);
  for (let i = 0; i < playerCount; i++) engine.addPlayer(`p${i}`, `لاعب${i}`, playerBalance);
  const start = () => {
    for (let i = 0; i < playerCount; i++) {
      const e = engine.placeBet(`p${i}`, bet);
      if (e) throw new Error(e);
    }
    return engine.startRound();
  };
  return { engine, start };
}

type Res = BlackjackSnapshot | { error: string; code: string };
function ok(res: Res): BlackjackSnapshot {
  if ('error' in res) throw new Error(`expected ok: ${res.error}`);
  return res;
}

// ============================================================
// Scoring
// ============================================================

describe('blackjack scoring', () => {
  it('evaluate([]) = 0; [A] soft 11; [A,A] soft 12; [A,A,A] soft 13', () => {
    const e = setup([]);
    expect(e.calculateScore([])).toEqual({ total: 0, isSoft: false });
    expect(e.calculateScore([C('A', 'spades')])).toEqual({ total: 11, isSoft: true });
    expect(e.calculateScore([C('A', 'spades'), C('A', 'hearts')])).toEqual({ total: 12, isSoft: true });
    expect(e.calculateScore([C('A', 'spades'), C('A', 'hearts'), C('A', 'diamonds')])).toEqual({ total: 13, isSoft: true });
  });

  it('[A,6] soft 17; [A,6,10] hard 17; [A,6,10,5] = 22 bust; [K,Q] = 20', () => {
    const e = setup([]);
    expect(e.calculateScore([C('A', 'spades'), C('6', 'clubs')])).toEqual({ total: 17, isSoft: true });
    expect(e.calculateScore([C('A', 'spades'), C('6', 'clubs'), C('10', 'hearts')])).toEqual({ total: 17, isSoft: false });
    expect(e.calculateScore([C('A', 'spades'), C('6', 'clubs'), C('10', 'hearts'), C('5', 'diamonds')]).total).toBe(22);
    expect(e.calculateScore([C('K', 'spades'), C('Q', 'clubs')]).total).toBe(20);
  });
});

// ============================================================
// Audit cases
// ============================================================

describe('blackjack audit cases', () => {
  it('C1: a doubled hand that busts is a LOSS (12 → 10 = 22)', () => {
    // p: 7+5=12, dealer up K, hole 7 (17). Double draws 10 → 22 bust.
    const { engine, start } = setupWithPlayer([
      C('7', 'spades'), C('K', 'spades'), C('5', 'hearts'), C('7', 'diamonds'), C('10', 'clubs'),
    ]);
    ok(start());
    expect(engine.snapshot().phase).toBe('playing');
    ok(engine.performAction('p0', 'double'));
    const snap = engine.snapshot();
    expect(snap.phase).toBe('complete');
    const hand = snap.players[0].hands[0];
    expect(hand.status).toBe('bust');
    expect(snap.players[0].balance).toBe(800); // 1000 - 100 bet - 100 double = 800, lost
    expect(snap.results![0].result).toBe('lose');
  });

  it('C2: player natural vs dealer natural is a push', () => {
    // p: A K, dealer: A K (upcard A → insurance, peek → natural)
    const { engine, start } = setupWithPlayer([
      C('A', 'hearts'), C('A', 'spades'), C('K', 'diamonds'), C('K', 'clubs'),
    ]);
    const snap0 = ok(start());
    expect(snap0.phase).toBe('insurance');
    ok(engine.finishInsurance());
    const snap = engine.snapshot();
    expect(snap.phase).toBe('complete');
    expect(snap.players[0].balance).toBe(1000); // bet returned (push)
    expect(snap.results![0].result).toBe('push');
  });

  it('C3: dealer natural ends the round immediately; player 20 loses without acting', () => {
    // p: 10+J=20, dealer up A + hole K → natural
    const { engine, start } = setupWithPlayer([
      C('10', 'spades'), C('A', 'spades'), C('J', 'hearts'), C('K', 'clubs'),
    ]);
    const snap0 = ok(start());
    expect(snap0.phase).toBe('insurance');
    ok(engine.finishInsurance());
    const snap = engine.snapshot();
    expect(snap.phase).toBe('complete');
    expect(snap.players[0].balance).toBe(900); // lost original bet only
    expect(snap.players[0].hands[0].cards).toHaveLength(2); // never hit
  });

  it('M2: the same player can hit twice (hit to 15, hit to 17, hit to 20, stand)', () => {
    // p: 8+7=15 → hit 2 → 17 → hit 3 → 20 → stand. Dealer up 10, hole 9 → 19 → player wins.
    const { engine, start } = setupWithPlayer([
      C('8', 'spades'), C('10', 'spades'), C('7', 'hearts'), C('9', 'diamonds'), C('2', 'clubs'), C('3', 'hearts'),
    ]);
    ok(start());
    const s1 = ok(engine.performAction('p0', 'hit'));
    expect(s1.currentPlayerId).toBe('p0'); // turn stays (M2)
    const s2 = ok(engine.performAction('p0', 'hit'));
    expect(s2.currentPlayerId).toBe('p0');
    const s3 = ok(engine.performAction('p0', 'stand'));
    expect(s3.phase).toBe('complete');
    expect(s3.players[0].balance).toBe(1100); // win 1:1
  });

  it('split 8s, double one hand, bust it → only that hand loses its doubled stake', () => {
    // p: 8,8 vs dealer 6. Split: hand1 = 8+10 (18), hand2 = 8+5 (13).
    // hand1 stand. hand2 double → draw 10 → 23 bust (loses doubled).
    // Dealer: 6+10=16 → hit K → bust. hand1 wins 1:1.
    const { engine, start } = setupWithPlayer([
      C('8', 'hearts'), C('6', 'spades'), C('8', 'diamonds'), C('10', 'diamonds'),
      C('10', 'clubs'), C('5', 'hearts'), C('10', 'spades'), C('K', 'clubs'),
    ]);
    ok(start());
    ok(engine.performAction('p0', 'split'));
    // First hand (8+10=18): stand
    ok(engine.performAction('p0', 'stand'));
    // Second hand (8+5=13): double → 10 → bust
    ok(engine.performAction('p0', 'double'));
    const snap = engine.snapshot();
    expect(snap.phase).toBe('complete');
    // 1000 - 100 (bet) - 100 (split) - 100 (double) + 200 (hand1 win) = 900
    expect(snap.players[0].balance).toBe(900);
    expect(snap.players[0].hands[0].status).toBe('stood');
    expect(snap.players[0].hands[1].status).toBe('bust');
    const results = snap.results ?? [];
    const hand1 = results.find((r) => r.handIndex === 0)!;
    const hand2 = results.find((r) => r.handIndex === 1)!;
    expect(hand1.result).toBe('win');
    expect(hand2.result).toBe('lose');
  });

  it('split aces: one card each, no further action, 21 on split pays 1:1', () => {
    // p: A,A vs dealer 6. Split: hand1 = A+10 (21), hand2 = A+9 (20), both closed.
    // Dealer: 6+10=16 → hit K → bust. Both hands win 1:1.
    const { engine, start } = setupWithPlayer([
      C('A', 'hearts'), C('6', 'spades'), C('A', 'diamonds'), C('10', 'diamonds'),
      C('10', 'clubs'), C('9', 'hearts'), C('K', 'clubs'),
    ]);
    ok(start());
    const afterSplit = ok(engine.performAction('p0', 'split'));
    expect(afterSplit.phase).toBe('complete'); // both closed → dealer plays → done
    const snap = engine.snapshot();
    // 1000 - 100 - 100 + 200 + 200 = 1200 (both win 1:1, NOT 3:2)
    expect(snap.players[0].balance).toBe(1200);
  });

  it('RSA: a split ace that draws another ace may resplit (resplitAces = true)', () => {
    // p: A,A → split: hand1 = A+A (resplittable), hand2 = A+9 (closed).
    // hand1 resplits: A+A → A+2 (12, closed) and A+K (21, closed).
    // Dealer 10 + 7 = 17. hand2 (20) wins, hand1a (12) loses, hand1b (21) wins.
    const shoe = [
      C('A', 'hearts'), C('10', 'spades'), C('A', 'diamonds'), C('7', 'clubs'), // deal
      C('A', 'spades'), C('9', 'hearts'), // first split
      C('2', 'clubs'), C('K', 'diamonds'), // resplit
    ];
    const engine = setup(shoe);
    engine.addPlayer('p0', 'أ', 1000);
    expect(engine.placeBet('p0', 100)).toBeNull();
    ok(engine.startRound());
    ok(engine.performAction('p0', 'split')); // hand1 = A+A (playing, RSA), hand2 = A+9 (stood)
    const mid = engine.snapshot();
    expect(mid.phase).toBe('playing'); // resplit possible → turn stays
    ok(engine.performAction('p0', 'split')); // resplit hand1
    // hand1a = A+2 closed (12), hand1b = A+K closed (21) → dealer plays
    const snap = engine.snapshot();
    expect(snap.phase).toBe('complete');
    // 1000 - 300 (3 bets) + 200 (hand1b 21 wins 1:1) + 200 (hand2 20 vs 17 wins) = 1100
    expect(snap.players[0].balance).toBe(1100);
  });

  it('RSA disabled: resplitting aces is rejected', () => {
    const shoe = [
      C('A', 'hearts'), C('10', 'spades'), C('A', 'diamonds'), C('7', 'clubs'),
      C('A', 'spades'), C('9', 'hearts'),
      C('2', 'clubs'),
    ];
    const engine = new BlackjackEngine({ ...DEFAULT_BLACKJACK_CONFIG, shoeOverride: shoe, resplitAces: false });
    engine.addPlayer('p0', 'أ', 1000);
    expect(engine.placeBet('p0', 100)).toBeNull();
    ok(engine.startRound());
    const afterSplit = engine.performAction('p0', 'split');
    // hand1 = A+A → closed (no RSA); hand2 = A+9 closed → dealer plays
    if ('error' in afterSplit) throw new Error(afterSplit.error);
    expect(afterSplit.phase).toBe('complete');
  });

  it('dealer soft 17: stands under S17, draws under H17', () => {
    // Player 20. Dealer A + 6 = soft 17; next card 4.
    const shoe = [
      C('K', 'spades'), C('A', 'hearts'), C('K', 'diamonds'), C('6', 'clubs'), C('4', 'hearts'),
    ];
    // S17 → dealer stands on 17 → player 20 wins.
    const s17 = setupWithPlayer(shoe, 1000, 100, { hitSoft17: false });
    let snap0 = ok(s17.start());
    if (snap0.phase === 'insurance') snap0 = ok(s17.engine.finishInsurance());
    ok(s17.engine.performAction('p0', 'stand'));
    const snapS17 = s17.engine.snapshot();
    expect(snapS17.players[0].balance).toBe(1100); // win 1:1
    expect(snapS17.dealerCards).toHaveLength(2);

    // H17 → dealer hits soft 17 → draws 4 → 21 → player loses.
    const h17 = setupWithPlayer(shoe, 1000, 100, { hitSoft17: true });
    snap0 = ok(h17.start());
    if (snap0.phase === 'insurance') snap0 = ok(h17.engine.finishInsurance());
    ok(h17.engine.performAction('p0', 'stand'));
    const snapH17 = h17.engine.snapshot();
    expect(snapH17.players[0].balance).toBe(900);
    expect(snapH17.dealerCards).toHaveLength(3);
  });

  it('insurance: dealer natural → insurance pays 2:1, main bet lost, net zero', () => {
    // p: 10+9=19, dealer A up + K hole.
    const { engine, start } = setupWithPlayer([
      C('10', 'spades'), C('A', 'spades'), C('9', 'hearts'), C('K', 'clubs'),
    ]);
    const snap0 = ok(start());
    expect(snap0.phase).toBe('insurance');
    expect(engine.takeInsurance('p0', 50)).toBeNull();
    ok(engine.finishInsurance());
    const snap = engine.snapshot();
    // 1000 - 100 (bet) - 50 (insurance) = 850; insurance pays +150 (2:1 + stake) = 1000
    expect(snap.players[0].balance).toBe(1000);
  });

  it('five-card Charlie: 5 cards ≤ 21 wins immediately at 1:1', () => {
    // p: 2+2=4 → hit 2 → 6 → hit 2 → 8 → hit 2 → 10 (5 cards) → charlie.
    // Dealer up 9, hole 8 → 17.
    const { engine, start } = setupWithPlayer([
      C('2', 'spades'), C('9', 'spades'), C('2', 'hearts'), C('8', 'diamonds'),
      C('2', 'diamonds'), C('2', 'clubs'), C('2', 'hearts'),
    ]);
    ok(start());
    ok(engine.performAction('p0', 'hit'));
    ok(engine.performAction('p0', 'hit'));
    const s3 = ok(engine.performAction('p0', 'hit'));
    expect(s3.players[0].hands[0].status).toBe('charlie');
    expect(s3.players[0].hands[0].cards).toHaveLength(5);
    // 1000 - 100 + 200 = 1100
    expect(s3.players[0].balance).toBe(1100);
  });

  it('late surrender returns exactly half the wager', () => {
    // p: 10+6=16, dealer up 10 → peek (hole 7, no natural) → playing. Surrender.
    const { engine, start } = setupWithPlayer([
      C('10', 'spades'), C('10', 'hearts'), C('6', 'clubs'), C('7', 'diamonds'),
    ]);
    ok(start());
    const s = ok(engine.performAction('p0', 'surrender'));
    expect(s.phase).toBe('complete');
    expect(s.players[0].balance).toBe(950); // half refunded
  });

  it('turn order: p1 plays, then p2, then the dealer', () => {
    // p1: 10+10=20, p2: 9+8=17. Dealer 6+10=16 → K → bust. Both win 1:1.
    const engine = setup([
      C('10', 'spades'), C('9', 'spades'), C('6', 'hearts'), C('10', 'hearts'), C('8', 'hearts'),
      C('10', 'diamonds'), C('K', 'clubs'),
    ]);
    engine.addPlayer('p0', 'أ', 1000);
    engine.addPlayer('p1', 'ب', 1000);
    expect(engine.placeBet('p0', 100)).toBeNull();
    expect(engine.placeBet('p1', 100)).toBeNull();
    ok(engine.startRound());
    expect(engine.getCurrentPlayerId()).toBe('p0');
    ok(engine.performAction('p0', 'stand'));
    expect(engine.getCurrentPlayerId()).toBe('p1');
    ok(engine.performAction('p1', 'stand'));
    const snap = engine.snapshot();
    expect(snap.phase).toBe('complete');
    expect(snap.players[0].balance).toBe(1100);
    expect(snap.players[1].balance).toBe(1100);
  });

  it('player blackjack pays 3:2 when the dealer does not have a natural', () => {
    // p: A K, dealer up 9, hole 8 → 17 (no natural).
    const { engine, start } = setupWithPlayer([
      C('A', 'hearts'), C('9', 'spades'), C('K', 'diamonds'), C('8', 'clubs'),
    ]);
    ok(start());
    const snap = engine.snapshot();
    expect(snap.phase).toBe('complete');
    expect(snap.players[0].balance).toBe(1150); // 1000 - 100 + 250 (3:2 + stake)
    expect(snap.results![0].result).toBe('blackjack');
  });

  it('snapshot never exposes the dealer hole card before reveal', () => {
    const { engine, start } = setupWithPlayer([
      C('7', 'spades'), C('K', 'spades'), C('5', 'hearts'), C('7', 'diamonds'),
    ]);
    const s0 = ok(start());
    expect(s0.dealerCards).toHaveLength(1);
    ok(engine.performAction('p0', 'stand'));
    const s1 = engine.snapshot();
    expect(s1.dealerCards.length).toBeGreaterThanOrEqual(2);
  });

  it('split 10s → 21 on a split hand pays 1:1, not 3:2', () => {
    // p: 10,10 → split: hand1 = 10+A (21 → auto-closed), hand2 = 10+5 (15).
    // Dealer 8+10=18. hand1 wins 1:1, hand2 loses. One stand needed (hand1 auto-closed).
    const { engine, start } = setupWithPlayer([
      C('10', 'spades'), C('8', 'spades'), C('10', 'hearts'), C('10', 'diamonds'),
      C('A', 'clubs'), C('5', 'hearts'),
    ]);
    ok(start());
    ok(engine.performAction('p0', 'split'));
    // hand1 = 10+A = 21 → auto-stood; turn moves to hand2 (15) → stand
    ok(engine.performAction('p0', 'stand'));
    const snap = engine.snapshot();
    expect(snap.phase).toBe('complete');
    // 1000 - 100 - 100 + 200 (hand1 1:1) = 1000. If 3:2 had paid it would be 1050.
    expect(snap.players[0].balance).toBe(1000);
    expect(snap.players[0].hands[0].status).toBe('stood');
    expect(snap.players[0].hands[1].status).toBe('stood');
  });
});

// ============================================================
// Side bets
// ============================================================

describe('blackjack side bets', () => {
  it('Perfect Pairs table D: perfect pair pays 25:1', () => {
    // p: A♠ A♠ (perfect). dealer 9 up, 8 hole.
    // Use side bet: modify via placeBet sideBets
    const engine2 = setup([C('A', 'spades'), C('9', 'spades'), C('A', 'spades'), C('8', 'clubs')]);
    engine2.addPlayer('p0', 'أ', 1000);
    expect(engine2.placeBet('p0', 100, { perfectPairs: 20 })).toBeNull();
    ok(engine2.startRound());
    // 1000 - 100 - 20 + 500 (25×20) = 1380, plus main resolution (A+... p: A+A = soft 12 → stand? play out)
    const snap = engine2.snapshot();
    expect(snap.players[0].balance).toBe(1380);
  });

  it('Perfect Pairs: mixed pair pays 5:1', () => {
    const engine = setup([C('7', 'spades'), C('9', 'spades'), C('7', 'hearts'), C('8', 'clubs')]);
    engine.addPlayer('p0', 'أ', 1000);
    expect(engine.placeBet('p0', 100, { perfectPairs: 20 })).toBeNull();
    ok(engine.startRound());
    // 1000 - 100 - 20 + 100 (5×20) = 980
    expect(engine.snapshot().players[0].balance).toBe(980);
  });

  it('21+3 variant 7: trips pay 30:1', () => {
    const engine = setup([C('7', 'spades'), C('7', 'diamonds'), C('7', 'hearts'), C('8', 'clubs')]);
    engine.addPlayer('p0', 'أ', 1000);
    expect(engine.placeBet('p0', 100, { twentyOnePlusThree: 20 })).toBeNull();
    ok(engine.startRound());
    // 1000 - 100 - 20 + 600 (30×20) = 1480
    expect(engine.snapshot().players[0].balance).toBe(1480);
  });

  it('sideBet > mainBet is rejected when the cap is enabled', () => {
    const engine = setup([]);
    engine.addPlayer('p0', 'أ', 1000);
    expect(engine.placeBet('p0', 100, { perfectPairs: 150 })).toBe('الرهان الجانبي لا يتجاوز الرهان الأساسي');
  });
});

// ============================================================
// Betting and round lifecycle
// ============================================================

describe('blackjack lifecycle', () => {
  it('a bet below the table minimum is rejected', () => {
    const engine = setup([]);
    engine.addPlayer('p0', 'أ', 1000);
    expect(engine.placeBet('p0', 5)).toBe('الحد الأدنى 10');
  });

  it('bets are locked once cards are dealt', () => {
    const { engine, start } = setupWithPlayer([
      C('7', 'spades'), C('K', 'spades'), C('5', 'hearts'), C('7', 'diamonds'),
    ]);
    ok(start());
    expect(engine.placeBet('p0', 200)).toBe('انتهى وقت المراهنة');
  });

  it('a new betting round begins after completion', () => {
    const { engine, start } = setupWithPlayer([
      C('10', 'spades'), C('9', 'spades'), C('10', 'hearts'), C('8', 'clubs'),
    ]);
    ok(start());
    ok(engine.performAction('p0', 'stand'));
    expect(engine.snapshot().phase).toBe('complete');
    expect(engine.placeBet('p0', 100)).toBeNull();
    expect(engine.snapshot().phase).toBe('betting');
  });
});

// ============================================================
// Input validation & even-money/insurance exclusivity (hardening)
// ============================================================

describe('blackjack input validation', () => {
  it('rejects NaN / fractional / negative bets without corrupting balance', () => {
    const { engine } = setupWithPlayer([]);
    expect(engine.placeBet('p0', NaN)).toBe('مبلغ غير صالح');
    expect(engine.placeBet('p0', 10.5)).toBe('مبلغ غير صالح');
    expect(engine.placeBet('p0', -50)).toBe('مبلغ غير صالح');
    expect(engine.snapshot().players[0].balance).toBe(1000);
  });
});

describe('blackjack even money vs insurance', () => {
  // player A+K natural; dealer A (up) + 10 (hole) → natural
  const naturalShoe = [C('A', 'spades'), C('A', 'hearts'), C('K', 'spades'), C('10', 'clubs')];

  it('even money then insurance is rejected; no spurious lose entry', () => {
    const { engine, start } = setupWithPlayer(naturalShoe);
    ok(start());
    expect(engine.snapshot().phase).toBe('insurance');
    expect(engine.takeEvenMoney('p0')).toBeNull();
    expect(engine.takeInsurance('p0', 50)).toBe('لا يمكن الجمع بين Even Money والتأمين');
    ok(engine.finishInsurance());
    const snap = engine.snapshot();
    expect(snap.results).toHaveLength(1);
    expect(snap.results![0].result).toBe('win');
    expect(snap.players[0].balance).toBe(1100); // 1000 - 100 bet + 200 even money
  });

  it('insurance then even money is rejected; insurance still settles 2:1', () => {
    const { engine, start } = setupWithPlayer(naturalShoe);
    ok(start());
    expect(engine.takeInsurance('p0', 50)).toBeNull();
    expect(engine.takeEvenMoney('p0')).toBe('لا يمكن الجمع بين التأمين وEven Money');
    ok(engine.finishInsurance());
    const snap = engine.snapshot();
    const kinds = snap.results!.map((r) => r.result).sort();
    expect(kinds).toEqual(['push', 'win']);
    expect(snap.players[0].balance).toBe(1100); // 1000 - 100 - 50 + 100 push + 150 insurance
  });
});
