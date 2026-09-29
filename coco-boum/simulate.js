#!/usr/bin/env node
/*
 * Mesure le RTP et la volatilité de Coco Boum! avec le vrai moteur.
 *   node simulate.js [mises=1000000] [graine=1] [--ante]
 *   node simulate.js --buy chicks|sticky|dynamite|grange|super [achats=20000] [graine=1]
 */
'use strict';
const E = require('./engine.js');
const fmt = (n) => n.toLocaleString('fr-CH');

if (process.argv[2] === '--buy') {
  const kind = process.argv[3];
  const N = +(process.argv[4] || 20000);
  const rng = E.mulberry32(+(process.argv[5] || 1));
  const cost = E.BONUS_BUYS[kind].cost;
  let tot = 0, sq = 0, mx = 0;
  for (let i = 0; i < N; i++) { const w = E.buyBonus(kind, 1, rng).win; tot += w; sq += w * w; if (w > mx) mx = w; }
  const m = tot / N, sd = Math.sqrt(sq / N - m * m);
  console.log(`Achat ${E.BONUS_BUYS[kind].name} (prix ×${cost}) sur ${fmt(N)} achats`);
  console.log(`Gain moyen ×${m.toFixed(2)} (± ${(sd / Math.sqrt(N)).toFixed(2)})   RTP ${(100 * m / cost).toFixed(2)} %   gain max ×${mx.toFixed(0)}`);
  process.exit(0);
}

const args = process.argv.slice(2).filter((a) => a !== '--ante');
const ante = process.argv.includes('--ante');
const spins = +(args[0] || 1e6);
const rng = E.mulberry32(+(args[1] || 1));

let paid = 0, total = 0, sumSq = 0, hits = 0, maxX = 0, capped = 0;
const byKind = {};
let bonuses = 0, bonusWin = 0, cocos = 0, eggsHatched = 0, dyn = 0, chicks = 0, mults = 0, retrig = 0;
const edges = [0.000001, 1, 5, 20, 100, 1000];
const buckets = new Array(edges.length + 1).fill(0);

for (let i = 0; i < spins; i++) {
  const res = E.spin(1, rng, { ante });
  const win = res.win;
  paid += res.cost;
  total += win;
  sumSq += win * win;
  if (win > 0) hits++;
  if (win > maxX) maxX = win;
  if (win >= E.CONFIG.maxWinX) capped++;
  if (res.bonus) { bonuses++; byKind[res.bonus] = (byKind[res.bonus] || 0) + 1; }
  for (const s of res.steps) {
    if (s.type === 'fsEnd') bonusWin += s.win;
    else if (s.type === 'coco') cocos++;
    else if (s.type === 'retrigger') retrig++;
    else if (s.type === 'eggs') for (const e of s.events) {
      if (e.t === 'mult') { mults++; eggsHatched++; } else if (e.t === 'chick') { chicks++; eggsHatched++; } else if (e.t === 'dyn') { dyn++; eggsHatched++; }
    }
  }
  let b = 0;
  while (b < edges.length && win >= edges[b]) b++;
  buckets[b]++;
}

const rtp = total / paid;
const mean = total / spins;
const sd = Math.sqrt(sumSq / spins - mean * mean);
const pct = (n) => (100 * n / spins).toFixed(3).padStart(8) + ' %';
const every = (n) => (n ? '1 / ' + fmt(Math.round(spins / n)) : '—');

console.log(`Mises simulées       ${fmt(spins)}${ante ? '  (Double Chance)' : ''}`);
console.log(`RTP total            ${(rtp * 100).toFixed(2)} %`);
console.log(`  dont jeu de base   ${((total - bonusWin) / paid * 100).toFixed(2)} %`);
console.log(`  dont bonus         ${(bonusWin / paid * 100).toFixed(2)} %`);
console.log(`Fréquence de gain    ${pct(hits)}  (${every(hits)})`);
console.log(`Écart-type (×mise)   ${sd.toFixed(2)}`);
console.log(`Gain max observé     ×${maxX.toFixed(2)}   (plafond ×${E.CONFIG.maxWinX} atteint ${capped} fois)`);
console.log(`Bonus naturel        ${every(bonuses)}   gain moyen ×${bonuses ? (bonusWin / bonuses).toFixed(1) : 0}   relances ${retrig}`);
for (const [k, n] of Object.entries(byKind)) console.log(`  ${E.BONUSES[k].name.padEnd(19)}${every(n)}`);
console.log(`Coco pond            ${every(cocos)}`);
console.log(`Œufs éclos           ${every(eggsHatched)}   (mult ${mults}, poussins ${chicks}, dynamites ${dyn})`);
console.log('Répartition des gains (×mise) :');
const labels = ['0', '0 – 1', '1 – 5', '5 – 20', '20 – 100', '100 – 1000', '1000+'];
buckets.forEach((n, i) => console.log(`  ${labels[i].padEnd(12)} ${pct(n)}`));
