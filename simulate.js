#!/usr/bin/env node
/*
 * Mesure le RTP et la volatilité de Stormbound avec le vrai moteur.
 *   node simulate.js [mises=1000000] [graine=1]
 *   node simulate.js --buy eye|super|mystery|expand [achats=100000] [graine=1]
 */
'use strict';
const E = require('./engine.js');

if (process.argv[2] === '--buy') {
  // node simulate.js --buy eye|super|mystery|expand [achats] [graine]
  const kind = process.argv[3];
  const N = +(process.argv[4] || 100000);
  const r = E.mulberry32(+(process.argv[5] || 1));
  const cost = E.BONUS_BUYS[kind].cost;
  let tot = 0, sq = 0, mx = 0;
  for (let i = 0; i < N; i++) { const w = E.buyBonus(kind, 1, r).win; tot += w; sq += w * w; if (w > mx) mx = w; }
  const m = tot / N, sd = Math.sqrt(sq / N - m * m);
  console.log(`Achat ${E.BONUS_BUYS[kind].name} (prix ×${cost}) sur ${N.toLocaleString('fr-CH')} achats`);
  console.log(`Gain moyen ×${m.toFixed(2)} (± ${(sd / Math.sqrt(N)).toFixed(2)})   RTP ${(100 * m / cost).toFixed(2)} %   gain max ×${mx.toFixed(0)}`);
  process.exit(0);
}

const spins = +(process.argv[2] || 1e6);
const seed = +(process.argv[3] || 1);
const rng = E.mulberry32(seed);

let total = 0, sumSq = 0, hits = 0, maxX = 0, capped = 0;
let bonuses = 0, bonusWin = 0, events = 0, summons = 0, retriggers = 0;
const edges = [0.000001, 1, 5, 20, 100, 1000];
const buckets = new Array(edges.length + 1).fill(0);

for (let i = 0; i < spins; i++) {
  const { steps, win, bonus } = E.spin(1, rng);
  total += win;
  sumSq += win * win;
  if (win > 0) hits++;
  if (win > maxX) maxX = win;
  if (win >= E.CONFIG.maxWinX) capped++;
  if (bonus) bonuses++;
  for (const s of steps) {
    if (s.type === 'bonusEnd') bonusWin += s.win;
    else if (s.type === 'event') events++;
    else if (s.type === 'summon') summons++;
    else if (s.type === 'retrigger') retriggers++;
  }
  let b = 0;
  while (b < edges.length && win >= edges[b]) b++;
  buckets[b]++;
}

const rtp = total / spins;
const sd = Math.sqrt(sumSq / spins - rtp * rtp);
const pct = (n) => (100 * n / spins).toFixed(3).padStart(8) + ' %';
const every = (n) => (n ? '1 / ' + Math.round(spins / n).toLocaleString('fr-CH') : '—');

console.log(`Mises simulées       ${spins.toLocaleString('fr-CH')}  (graine ${seed})`);
console.log(`RTP total            ${(rtp * 100).toFixed(2)} %`);
console.log(`  dont jeu de base   ${((total - bonusWin) / spins * 100).toFixed(2)} %`);
console.log(`  dont bonus         ${(bonusWin / spins * 100).toFixed(2)} %`);
console.log(`Fréquence de gain    ${pct(hits)}  (${every(hits)})`);
console.log(`Écart-type (×mise)   ${sd.toFixed(2)}`);
console.log(`Gain max observé     ×${maxX.toFixed(2)}   (plafond ×${E.CONFIG.maxWinX} atteint ${capped} fois)`);
console.log(`Eye of the Storm     ${every(bonuses)}   gain moyen ×${bonuses ? (bonusWin / bonuses).toFixed(1) : 0}   relances ${retriggers}`);
console.log(`Événements ⚡         ${every(events)}`);
console.log(`Gardien invoqué      ${every(summons)}`);
console.log('Répartition des gains (×mise) :');
const labels = ['0', '0 – 1', '1 – 5', '5 – 20', '20 – 100', '100 – 1000', '1000+'];
buckets.forEach((n, i) => console.log(`  ${labels[i].padEnd(12)} ${pct(n)}`));
