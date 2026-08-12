// Bisect the conservation violation: log every action's chip deltas.
import { TexasHoldemEngine } from '../src/server/game/texasHoldem';
import { seededRng } from '../src/server/game/deck';

const engine = new TexasHoldemEngine({
  maxPlayers: 4,
  smallBlind: 10,
  bigBlind: 20,
  minBuyIn: 1,
  rng: seededRng(7),
});
for (let i = 0; i < 4; i++) engine.addPlayer(`p${i}`, `L${i}`, 1000);
const total = 4000;
const botRng = seededRng(999);

const sumOf = (s: ReturnType<typeof engine.snapshot>) => {
  // snapshot players only show balance; committed chips are inside the engine.
  // Use pot + balances: pot = total committed.
  return s.players.reduce((a, p) => a + p.balance, 0) + s.pot;
};

for (let hand = 1; hand <= 100000; hand++) {
  const res = engine.startHand();
  if ('error' in res) { console.log('startHand error', res.code); break; }
  let guard = 0;
  while (engine.snapshot().phase !== 'showdown' && guard++ < 400) {
    const s = engine.snapshot();
    const before = sumOf(s);
    if (before !== total) {
      console.log(`HAND ${hand} BEFORE action: sum=${before}`);
      console.log(JSON.stringify(s.players.map((p) => ({ id: p.id, bal: p.balance, st: p.status, cb: p.currentBet, tb: p.totalRoundBet, seat: p.seatIndex }))));
      console.log('pot', s.pot, 'currentBet', s.currentBet, 'phase', s.phase, 'button', s.dealerIndex);
      console.log('history', JSON.stringify(engine.getHandHistory().slice(-30)));
      process.exit(1);
    }
    const actor = s.players.find((p) => p.isCurrentTurn);
    if (!actor) break;
    const la = s.legalActions!;
    const r = botRng();
    let actRes;
    if (r < 0.1) actRes = engine.performAction(actor.id, 'fold');
    else if (la.check) actRes = engine.performAction(actor.id, 'check');
    else if (r < 0.8 || !la.raise) actRes = engine.performAction(actor.id, 'call');
    else actRes = engine.performAction(actor.id, 'raise', Math.min(la.maxRaiseTo, la.minRaiseTo));
    if ('error' in actRes) {
      console.log(`HAND ${hand} action error:`, actRes.code, 'actor', actor.id, 'toCall', la.toCall, 'minRaise', la.minRaiseTo, 'maxRaise', la.maxRaiseTo, 'cb', actor.currentBet, 'tb', actor.totalRoundBet, 'bal', actor.balance);
      console.log('history', JSON.stringify(engine.getHandHistory().slice(-20)));
      process.exit(1);
    }
  }
  const snap = engine.snapshot();
  const sum = snap.players.reduce((a, p) => a + p.balance, 0);
  if (sum !== total) {
    console.log(`HAND ${hand} conservation broke at showdown: sum=${sum}`);
    console.log(JSON.stringify(snap.players.map((p) => ({ id: p.id, bal: p.balance, st: p.status }))));
    console.log('pots', JSON.stringify(snap.sidePots));
    console.log('winners', JSON.stringify(snap.winners));
    console.log('history', JSON.stringify(engine.getHandHistory().slice(-40)));
    process.exit(1);
  }
}
console.log("100000 hands OK");
