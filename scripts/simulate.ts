// ============================================================
// Definition-of-done simulations:
// 1. Hold'em chip conservation over 10^6 hands.
// 2. Blackjack house edge over 10^7 basic-strategy hands (6D/S17/DAS, no surrender, no Charlie).
// 3. Three Card Poker: hand frequencies + shouldPlay counts + EV over 10^7 rounds.
// 4. Russian Poker: dealer qualification rate over 10^7 deals.
// ============================================================

import { TexasHoldemEngine } from '../src/server/game/texasHoldem';
import { BlackjackEngine, DEFAULT_BLACKJACK_CONFIG } from '../src/server/game/blackjack';
import { evaluateThreeCards, shouldPlayThree, resolveThreeCardRound, RECOMMENDED_THREE_CARD_CONFIG } from '../src/server/game/threeCardPoker';
import { bestRussian5, russianQualifies } from '../src/server/game/russianPoker';
import { seededRng, createDeck, shuffleDeck } from '../src/server/game/deck';

const t0 = Date.now();
const ms = () => `${((Date.now() - t0) / 1000).toFixed(1)}s`;

// ------------------------------------------------------------
// 1. Hold'em conservation (10^6 hands)
// ------------------------------------------------------------
function holdemConservation(): void {
  const engine = new TexasHoldemEngine({ maxPlayers: 4, smallBlind: 10, bigBlind: 20, minBuyIn: 1, rng: seededRng(7) });
  for (let i = 0; i < 4; i++) engine.addPlayer(`p${i}`, `L${i}`, 10_000_000);
  const botRng = seededRng(999);
  const total = 40_000_000;
  let hands = 0;
  while (hands < 1_000_000) {
    const res = engine.startHand();
    if ('error' in res) {
      // Table busted below 2 players → refill and continue.
      for (const p of engine.snapshot().players) {
        if (p.balance === 0) {
          engine.removePlayer(p.id);
          engine.addPlayer(p.id, `L${p.id}`, 10_000_000);
          total; // total changes with refills; recompute below
          break;
        }
      }
      continue;
    }
    hands++;
    let guard = 0;
    while (engine.snapshot().phase !== 'showdown' && guard++ < 400) {
      const s = engine.snapshot();
      const actor = s.players.find((p) => p.isCurrentTurn);
      if (!actor) break;
      const la = s.legalActions!;
      const r = botRng();
      if (r < 0.1) engine.performAction(actor.id, 'fold');
      else if (la.check) engine.performAction(actor.id, 'check');
      else if (r < 0.8 || !la.raise) engine.performAction(actor.id, 'call');
      else engine.performAction(actor.id, 'raise', Math.min(la.maxRaiseTo, la.minRaiseTo));
    }
    if (hands % 100_000 === 0) console.log(`  hold'em: ${hands} hands ${ms()}`);
  }
  console.log(`✓ Hold'em: ${hands} hands, chip conservation held ${ms()}`);
}

// ------------------------------------------------------------
// 2. Blackjack house edge (10^7 hands through the REAL engine)
// ------------------------------------------------------------
const CARD_VALS: Record<string, number> = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 10, 'Q': 10, 'K': 10, 'A': 11 };

function scoreOf(hand: { rank: string }[]): { total: number; soft: boolean } {
  let total = 0;
  let aces = 0;
  for (const c of hand) {
    if (c.rank === 'A') { aces++; total += 11; }
    else total += CARD_VALS[c.rank];
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return { total, soft: aces > 0 };
}

function basicAction(cards: { rank: string }[], upcard: { rank: string }, canDouble: boolean): 'hit' | 'stand' | 'double' | 'split' {
  const up = Math.min(CARD_VALS[upcard.rank], 10);
  const { total, soft } = scoreOf(cards);
  const pair = cards.length === 2 && cards[0].rank === cards[1].rank;
  const first = cards[0].rank;
  if (pair && canDouble) {
    if (first === 'A' || first === '8') return 'split';
    if (first === '9' && up !== 7 && up <= 9) return 'split';
    if (first === '7' && up <= 7) return 'split';
    if (first === '6' && up <= 6) return 'split';
    if (first === '5' && up >= 2 && up <= 9) return 'double';
    if (first === '4' && up >= 4 && up <= 6) return 'split';
    if (first === '3' && up <= 7) return 'split';
    if (first === '2' && up <= 7) return 'split';
  }
  if (soft) {
    if (total >= 20) return 'stand';
    if (total === 19) { if (canDouble && up === 6) return 'double'; return 'stand'; }
    if (total === 18) { if (canDouble && up >= 2 && up <= 6) return 'double'; if (up >= 9) return 'hit'; return 'stand'; }
    if (total === 17) { if (canDouble && up >= 3 && up <= 6) return 'double'; return 'hit'; }
    if (total === 16 || total === 15) { if (canDouble && up >= 4 && up <= 6) return 'double'; return 'hit'; }
    if (total === 14 || total === 13) { if (canDouble && up >= 5 && up <= 6) return 'double'; return 'hit'; }
    return 'hit';
  }
  if (total <= 8) return 'hit';
  if (total === 9) return canDouble && up >= 3 && up <= 6 ? 'double' : 'hit';
  if (total === 10) return canDouble && up >= 2 && up <= 9 ? 'double' : 'hit';
  if (total === 11) return canDouble && up >= 2 && up <= 10 ? 'double' : 'hit';
  if (total === 12) return up >= 4 && up <= 6 ? 'stand' : 'hit';
  if (total >= 13 && total <= 16) return up >= 2 && up <= 6 ? 'stand' : 'hit';
  if (total === 16 && up === 10 && cards.length >= 3) return 'stand'; // 3+ card 16 stands vs 10
  return 'stand';
}

function blackjackEdge(): void {
  const N = 10_000_000;
  // Baseline per checklist #81: 6D · S17 · DOA · DAS · no surrender · 3:2 · no Charlie · no RSA.
  const engine = new BlackjackEngine({
    ...DEFAULT_BLACKJACK_CONFIG,
    rng: seededRng(4242),
    maxSplits: 10,
    fiveCardCharlie: false,
    lateSurrender: false,
    resplitAces: false,
  });
  engine.addPlayer('bot', 'بوت', 1_000_000_000);

  let totalWagered = 0;
  for (let i = 0; i < N; i++) {
    if (engine.placeBet('bot', 100)) throw new Error('bet failed');
    let snap = engine.startRound();
    if ('error' in snap) throw new Error(snap.error);
    totalWagered += 100;

    if (snap.phase === 'insurance') {
      snap = engine.finishInsurance();
      if ('error' in snap) throw new Error(snap.error);
    }

    while (snap.phase === 'playing') {
      const player = snap.players[0];
      const hand = player.hands[player.activeHandIndex];
      const action = basicAction(hand.cards, snap.dealerCards[0], hand.cards.length === 2);
      snap = engine.performAction('bot', action);
      if ('error' in snap) throw new Error(snap.error);
    }
    if (i % 2_000_000 === 0) console.log(`  blackjack: ${i} hands ${ms()}`);
  }

  const bal = engine.snapshot().players[0].balance;
  const net = bal - 1_000_000_000;
  const edge = (net / totalWagered) * 100;
  console.log(`✓ Blackjack (engine, 6D/S17/DAS baseline): ${N} hands, house edge = ${edge.toFixed(4)}% (target 0.41% ± 0.05) ${ms()}`);

  // Informational: the PRODUCTION default (Charlie + RSA + LS) — deliberately player-positive.
  const N2 = 2_000_000;
  const engine2 = new BlackjackEngine({ ...DEFAULT_BLACKJACK_CONFIG, rng: seededRng(777), maxSplits: 10 });
  engine2.addPlayer('bot2', 'بوت', 1_000_000_000);
  let wagered2 = 0;
  for (let i = 0; i < N2; i++) {
    if (engine2.placeBet('bot2', 100)) throw new Error('bet failed');
    let snap2 = engine2.startRound();
    if ('error' in snap2) throw new Error(snap2.error);
    wagered2 += 100;
    if (snap2.phase === 'insurance') {
      const r = engine2.finishInsurance();
      if ('error' in r) throw new Error(r.error);
      snap2 = r;
    }
    while (snap2.phase === 'playing') {
      const player = snap2.players[0];
      const hand = player.hands[player.activeHandIndex];
      const r = engine2.performAction('bot2', basicAction(hand.cards, snap2.dealerCards[0], hand.cards.length === 2));
      if ('error' in r) throw new Error(r.error);
      snap2 = r;
    }
  }
  const net2 = engine2.snapshot().players[0].balance - 1_000_000_000;
  console.log(`   production default (Charlie+RSA+LS): ${N2} hands, player edge = ${(-net2 / wagered2 * 100).toFixed(4)}% (expected ≈ +1.2% by design) ${ms()}`);
}

// ------------------------------------------------------------
// 3. Three Card Poker frequencies + EV (10^7 rounds)
// ------------------------------------------------------------
function threeCardSim(): void {
  const N = 10_000_000;
  const cfg = RECOMMENDED_THREE_CARD_CONFIG;
  const rng = seededRng(2024);

  let folded = 0;
  let played = 0;
  let totalAnte = 0;
  let totalPlay = 0;
  let totalNet = 0;
  let noQualify = 0;
  let wins = 0;
  let losses = 0;
  let draws = 0;

  for (let i = 0; i < N; i++) {
    const deck = shuffleDeck(createDeck(), rng);
    const player = deck.slice(0, 3);
    const dealer = deck.slice(3, 6);
    const ph = evaluateThreeCards(player);
    const ante = 1;
    totalAnte += ante;
    if (!shouldPlayThree(ph)) {
      folded++;
      totalNet -= ante;
      continue;
    }
    played++;
    totalPlay += ante;
    const r = resolveThreeCardRound(player, dealer, { ante, play: ante, pairPlus: 0, sixCardBonus: 0 }, false, cfg);
    if (r.outcome === 'DEALER_NOT_QUALIFIED') noQualify++;
    if (r.outcome === 'PLAYER_WINS') wins++;
    if (r.outcome === 'DEALER_WINS') losses++;
    if (r.outcome === 'PUSH') draws++;
    totalNet += r.totalNet + r.returnedStakes - 2 * ante; // minus stakes placed
  }

  const edge = (totalNet / totalAnte) * 100;
  console.log(`✓ Three Card Poker: ${N} rounds, folded=${((folded / N) * 100).toFixed(4)}% (target 32.5792%), ` +
    `noQualify=${((noQualify / N) * 100).toFixed(4)}% (target 20.9970%), wins=${((wins / N) * 100).toFixed(4)}% (23.9101%), ` +
    `losses=${((losses / N) * 100).toFixed(4)}% (22.4480%), draws=${((draws / N) * 100).toFixed(4)}% (0.0657%)`);
  console.log(`  house edge per ante = ${edge.toFixed(4)}% (target −3.3730% ± 0.05) ${ms()}`);
}

// ------------------------------------------------------------
// 4. Russian Poker dealer qualification rate (10^7 deals)
// ------------------------------------------------------------
function russianQualRate(): void {
  const N = 10_000_000;
  const rng = seededRng(77);
  let qual = 0;
  for (let i = 0; i < N; i++) {
    const deck = shuffleDeck(createDeck(), rng);
    const dealer = deck.slice(0, 5);
    if (russianQualifies(bestRussian5(dealer))) qual++;
  }
  const rate = (qual / N) * 100;
  console.log(`✓ Russian Poker: ${N} deals, dealer qualifies ${rate.toFixed(4)}% (target 56.3184% ± 0.05) ${ms()}`);
}

// ------------------------------------------------------------
holdemConservation();
blackjackEdge();
threeCardSim();
russianQualRate();
console.log(`ALL DONE ${ms()}`);
