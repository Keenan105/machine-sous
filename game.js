'use strict';

/* =========================================================
   STORMBOUND — La Tempête des Anciens
   Grille 6×5, gains partout (8+), cascades, météo évolutive,
   Storm Charge, Eye of the Storm, Gardien de la Tempête.
   ========================================================= */

const COLS = 6;
const ROWS = 5;
const MIN_WIN = 8;

const SYMBOLS = {
  leaf:    { e: '🍃', name: 'Feuille',  w: 14, pay: [0.25, 0.75, 2] },
  drop:    { e: '💧', name: 'Goutte',   w: 14, pay: [0.25, 0.75, 2] },
  rock:    { e: '🪨', name: 'Roche',    w: 13, pay: [0.3, 0.9, 2.5] },
  ice:     { e: '❄️', name: 'Givre',    w: 13, pay: [0.3, 0.9, 2.5] },
  wolf:    { e: '🐺', name: 'Loup',     w: 9,  pay: [0.5, 1.5, 5] },
  eagle:   { e: '🦅', name: 'Aigle',    w: 7,  pay: [0.8, 2, 8] },
  trident: { e: '🔱', name: 'Trident',  w: 5,  pay: [1, 4, 12] },
  crown:   { e: '👑', name: 'Couronne', w: 3,  pay: [2, 6, 25] },
  charge:  { e: '⚡', name: 'Charge',   w: 5 },
  dragon:  { e: '🐉', name: 'Gardien',  w: 1.1 },
  wild:    { e: '🌀', name: 'Storm Wild', w: 0 },
  mystery: { e: '❔', name: 'Caché',    w: 0 },
};
const PAYING = ['leaf', 'drop', 'rock', 'ice', 'wolf', 'eagle', 'trident', 'crown'];
const PREMIUM = ['wolf', 'eagle', 'trident', 'crown'];
const SPAWNABLE = [...PAYING, 'charge', 'dragon'];

const LEVELS = [
  { name: 'Pluie',        icon: '🌧️', need: 0,  mult: 1 },
  { name: 'Vent',         icon: '💨', need: 4,  mult: 1.25 },
  { name: 'Orage',        icon: '⚡', need: 10, mult: 1.5 },
  { name: 'Supercellule', icon: '🌪️', need: 18, mult: 2 },
  { name: 'STORMBOUND',   icon: '🌩️', need: 28, mult: 3 },
];
const MAX_INTENSITY = 36;
const THRESHOLDS = [25, 50, 75];
const BETS = [1, 2, 5, 10, 20, 50];
const WILD_LIFE = 3;
const DRAGON_SPINS = 5;

const state = {
  balance: 1000,
  betIdx: 0,
  charge: 0,
  thresholdIdx: 0,
  intensity: 0,
  level: 0,
  dragonSpins: 0,
  zoneHits: [0, 0, 0],
  stormZones: [false, false, false],
  lastZone: -1,
  busy: false,
  auto: false,
  spinWin: 0,
  cascade: 0,
};

const $ = (s) => document.querySelector(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (n) => Math.floor(Math.random() * n);
const key = (c, r) => c + ',' + r;
const zoneOf = (c) => Math.floor(c / 2);
const fmt = (n) => (Math.round(n * 100) / 100).toLocaleString('fr-CH', { maximumFractionDigits: 2 });
const bet = () => BETS[state.betIdx];
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function pickWeighted(entries) {
  let total = 0;
  for (const [, w] of entries) total += w;
  let x = Math.random() * total;
  for (const [k, w] of entries) { x -= w; if (x <= 0) return k; }
  return entries[entries.length - 1][0];
}

/* ------------------------- grid ------------------------- */

let uid = 0;
const newCell = (s, life = 0) => ({ s, life, id: ++uid });
const isSticky = (cell) => cell.s === 'wild' && cell.life > 0;

function genSymbol(c) {
  const storm = state.stormZones[zoneOf(c)];
  const entries = SPAWNABLE.map((k) => {
    let w = SYMBOLS[k].w;
    if (k === 'dragon' && state.dragonSpins > 0) w = 0.3;
    if (storm && k === 'charge') w *= 2;
    if (storm && PREMIUM.includes(k)) w *= 1.6;
    return [k, w];
  });
  if (storm) entries.push(['wild', 2.5]);
  return pickWeighted(entries);
}

const grid = [];
for (let c = 0; c < COLS; c++) {
  grid.push([]);
  for (let r = 0; r < ROWS; r++) grid[c].push(newCell(pickWeighted(PAYING.map((k) => [k, SYMBOLS[k].w]))));
}

const board = $('#board');
const cellEls = [];
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const el = document.createElement('div');
    el.className = 'cell';
    el.innerHTML = '<span class="sym"></span>';
    board.appendChild(el);
    cellEls.push(el);
  }
}
const cellEl = (c, r) => cellEls[r * COLS + c];

function paintCell(c, r, anim, delay = 0) {
  const el = cellEl(c, r);
  const cell = grid[c][r];
  el.querySelector('.sym').textContent = SYMBOLS[cell.s].e;
  let cls = 'cell s-' + cell.s;
  if (isSticky(cell)) cls += ' sticky';
  if (state.stormZones[zoneOf(c)]) cls += ' stormz';
  el.className = cls;
  if (isSticky(cell)) el.dataset.life = cell.life; else delete el.dataset.life;
  if (anim) {
    el.style.setProperty('--d', delay + 'ms');
    void el.offsetWidth;
    el.classList.add(anim);
  }
}

function paintAll(anim) {
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      const fresh = anim && !isSticky(grid[c][r]);
      paintCell(c, r, fresh ? anim : null, fresh ? c * 55 + (ROWS - r) * 25 : 0);
    }
  }
}

function flashCells(list, cls) {
  for (const [c, r] of list) {
    const el = cellEl(c, r);
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }
}

// Remove cells, let the rest fall around sticky wilds, fill from the top.
async function refill(removed, gen = genSymbol) {
  const newPos = [];
  const moved = [];
  for (let c = 0; c < COLS; c++) {
    const slots = [];
    for (let r = 0; r < ROWS; r++) if (!isSticky(grid[c][r])) slots.push(r);
    const kept = [];
    for (let i = slots.length - 1; i >= 0; i--) {
      const r = slots[i];
      if (!removed.has(key(c, r))) kept.push({ cell: grid[c][r], from: r });
    }
    let k = 0;
    for (let i = slots.length - 1; i >= 0; i--) {
      const r = slots[i];
      if (k < kept.length) {
        const { cell, from } = kept[k++];
        grid[c][r] = cell;
        if (from !== r) moved.push([c, r]);
      } else {
        grid[c][r] = newCell(gen(c));
        newPos.push([c, r]);
      }
    }
  }
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) paintCell(c, r);
  for (const [c, r] of moved) paintCell(c, r, 'fall', c * 20);
  for (const [c, r] of newPos) paintCell(c, r, 'drop', c * 40 + (ROWS - r) * 30);
  await sleep(520);
  return newPos;
}

function randomCells(n, filter) {
  const all = [];
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) if (filter(grid[c][r], c, r)) all.push([c, r]);
  return shuffle(all).slice(0, n);
}

function mostCommonPaying() {
  const counts = {};
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
    const s = grid[c][r].s;
    if (PAYING.includes(s)) counts[s] = (counts[s] || 0) + 1;
  }
  let best = PAYING[rand(PAYING.length)], n = -1;
  for (const s of PAYING) if ((counts[s] || 0) > n) { n = counts[s] || 0; best = s; }
  return best;
}

/* ------------------------- UI ------------------------- */

function updateUI() {
  $('#balance').textContent = fmt(state.balance);
  $('#bet').textContent = bet();
  $('#win').textContent = fmt(state.spinWin);
  $('#spin').disabled = state.busy;
  $('#auto').classList.toggle('on', state.auto);
}

function updateGauge() {
  $('#gauge .fill').style.width = state.charge + '%';
  $('#chargeVal').textContent = Math.floor(state.charge);
  document.querySelectorAll('.track i').forEach((el, i) => el.classList.toggle('hit', i < state.thresholdIdx));
}

function updateWeatherUI() {
  document.querySelectorAll('.step').forEach((el) => {
    const l = +el.dataset.l;
    el.classList.toggle('on', l === state.level);
    el.classList.toggle('done', l < state.level);
  });
  const cur = LEVELS[state.level];
  const next = LEVELS[state.level + 1];
  const pct = next ? (state.intensity - cur.need) / (next.need - cur.need) : 1;
  $('.intensity .bar').style.width = Math.max(0, Math.min(1, pct)) * 100 + '%';
  $('#mult').textContent = '×' + cur.mult;
}

function updateZonesUI() {
  document.querySelectorAll('.zinfo').forEach((el) => {
    const z = +el.dataset.z;
    el.classList.toggle('storm', state.stormZones[z]);
    el.querySelectorAll('i').forEach((p, i) => p.classList.toggle('on', i < state.zoneHits[z]));
  });
  document.querySelectorAll('.zone').forEach((el) => el.classList.toggle('storm', state.stormZones[+el.dataset.z]));
  const ds = $('#dragonStatus');
  ds.classList.toggle('active', state.dragonSpins > 0);
  ds.textContent = state.dragonSpins > 0
    ? `🐉 Le Gardien veille : encore ${state.dragonSpins} tour${state.dragonSpins > 1 ? 's' : ''}`
    : 'Gardien endormi (🐉 pour l\'invoquer)';
  $('#dragon').classList.toggle('active', state.dragonSpins > 0);
}

let bannerTimer = 0;
async function banner(text, ms = 1300) {
  const b = $('#banner');
  b.textContent = text;
  b.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => b.classList.remove('show'), ms);
  await sleep(Math.min(ms, 900));
}

function say(text) { $('#msg').textContent = text; }

function floatText(text) {
  const el = document.createElement('div');
  el.className = 'float';
  el.textContent = text;
  $('#boardWrap').appendChild(el);
  setTimeout(() => el.remove(), 1300);
}

function centerOf(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function strike(el, power = 1) {
  const p = centerOf(el);
  fx.bolt(p.x + (Math.random() - 0.5) * 200, -20, p.x, p.y, power);
  fx.flash = Math.max(fx.flash, 0.35 * power);
}

/* ------------------------- weather level ------------------------- */

function updateLevel(announce = true) {
  let lvl = 0;
  for (let i = 0; i < LEVELS.length; i++) if (state.intensity >= LEVELS[i].need) lvl = i;
  const prev = state.level;
  if (lvl !== prev) {
    state.level = lvl;
    document.body.dataset.level = lvl;
    audio.setLevel(lvl);
    if (announce && lvl > prev) {
      const L = LEVELS[lvl];
      banner(`${L.icon} ${L.name.toUpperCase()} ×${L.mult}`);
      if (lvl >= 2) { fx.flash = 0.6; audio.thunder(0.8); }
    } else if (announce) {
      say(`La tempête retombe… ${LEVELS[lvl].icon} ${LEVELS[lvl].name}`);
    }
  }
  updateWeatherUI();
}

/* ------------------------- charge & landings ------------------------- */

function addCharge(v) {
  state.charge = Math.min(100, state.charge + v);
  updateGauge();
}

async function handleLanding(pos) {
  const dragons = pos.filter(([c, r]) => grid[c][r].s === 'dragon');
  if (dragons.length) {
    summonDragon();
    for (const [c, r] of dragons) {
      grid[c][r] = newCell('wild');
      paintCell(c, r, 'struck');
    }
    await sleep(700);
  }
  const charges = pos.filter(([c, r]) => grid[c][r].s === 'charge');
  if (charges.length) {
    flashCells(charges, 'absorb');
    audio.zap(charges.length);
    addCharge(charges.length * 7);
    await sleep(460);
    const np = await refill(new Set(charges.map(([c, r]) => key(c, r))));
    await handleLanding(np);
  }
}

async function processCharge() {
  if (state.thresholdIdx < THRESHOLDS.length && state.charge >= THRESHOLDS[state.thresholdIdx]) {
    state.thresholdIdx++;
    updateGauge();
    await randomEvent();
    return true;
  }
  if (state.charge >= 100) {
    await eyeOfTheStorm();
    state.charge = 0;
    state.thresholdIdx = 0;
    updateGauge();
    return true;
  }
  return false;
}

/* ------------------------- evaluation ------------------------- */

function evaluate() {
  const cells = {};
  const wilds = [];
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
    const s = grid[c][r].s;
    if (s === 'wild') wilds.push([c, r]);
    else if (PAYING.includes(s)) (cells[s] = cells[s] || []).push([c, r]);
  }
  const wins = [];
  for (const s of PAYING) {
    const list = cells[s] || [];
    if (list.length >= 3 && list.length + wilds.length >= MIN_WIN) {
      wins.push({ s, cells: list, total: list.length + wilds.length });
    }
  }
  const removeSet = new Set();
  const highlight = [];
  if (wins.length) {
    for (const w of wins) for (const [c, r] of w.cells) { removeSet.add(key(c, r)); highlight.push([c, r]); }
    for (const [c, r] of wilds) {
      highlight.push([c, r]);
      if (!isSticky(grid[c][r])) removeSet.add(key(c, r));
    }
  }
  return { wins, removeSet, highlight };
}

function payFor(win) {
  const tier = win.total >= 12 ? 2 : win.total >= 10 ? 1 : 0;
  return SYMBOLS[win.s].pay[tier] * bet();
}

async function cascadeLoop() {
  for (let guard = 0; guard < 80; guard++) {
    const { wins, removeSet, highlight } = evaluate();
    if (wins.length) {
      state.cascade++;
      const mult = LEVELS[state.level].mult;
      let amount = 0;
      for (const w of wins) amount += payFor(w);
      amount *= mult;
      state.spinWin += amount;
      state.balance += amount;
      flashCells(highlight, 'win');
      audio.chime(state.cascade);
      floatText('+' + fmt(amount));
      say(wins.map((w) => `${w.total}× ${SYMBOLS[w.s].e}`).join('  ·  ') +
        `  →  +${fmt(amount)}` + (mult > 1 ? ` (météo ×${mult})` : '') +
        (state.cascade > 1 ? `  · cascade ${state.cascade}` : ''));
      updateUI();
      await sleep(760);
      state.intensity = Math.min(MAX_INTENSITY, state.intensity + 1);
      updateLevel();
      addCharge(3);
      // Storm Wilds last a limited number of cascades.
      for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
        const cell = grid[c][r];
        if (isSticky(cell) && --cell.life === 0) removeSet.add(key(c, r));
      }
      const np = await refill(removeSet);
      await handleLanding(np);
      continue;
    }
    if (!(await processCharge())) break;
  }
}

/* ------------------------- storm events ------------------------- */

async function randomEvent() {
  const events = [eventLightning, eventGust, eventDownpour, eventEyeOfCyclone];
  await events[rand(events.length)]();
}

async function eventLightning() {
  await banner('⚡ ÉCLAIR');
  const target = Math.random() < 0.6 ? mostCommonPaying() : PREMIUM[rand(PREMIUM.length)];
  const picks = randomCells(4 + rand(4), (cell) => cell.s !== target && cell.s !== 'wild');
  audio.thunder(1);
  for (const [c, r] of picks) {
    strike(cellEl(c, r), 0.8);
    grid[c][r] = newCell(target);
    paintCell(c, r, 'struck');
    await sleep(110);
  }
  say(`L'éclair transforme ${picks.length} cases en ${SYMBOLS[target].e}`);
  await sleep(450);
  if (state.dragonSpins > 0) await dragonStrike();
}

async function eventGust() {
  await banner('💨 RAFALE');
  audio.gust();
  for (let r = 0; r < ROWS; r++) {
    const dir = r % 2 === 0 ? 1 : -1;
    const row = [];
    for (let c = 0; c < COLS; c++) row.push(grid[c][r]);
    for (let c = 0; c < COLS; c++) grid[(c + dir + COLS) % COLS][r] = row[c];
    for (let c = 0; c < COLS; c++) {
      cellEl(c, r).style.setProperty('--sx', dir > 0 ? '-100%' : '100%');
      paintCell(c, r, 'slide');
    }
  }
  await sleep(450);
  const target = mostCommonPaying();
  const picks = randomCells(3, (cell) => cell.s !== target && !isSticky(cell));
  for (const [c, r] of picks) { grid[c][r] = newCell(target); paintCell(c, r, 'reveal'); }
  say(`La rafale pousse les rangées et rassemble les ${SYMBOLS[target].e}`);
  await sleep(500);
}

async function eventDownpour() {
  await banner('🌧️ PLUIE TORRENTIELLE');
  audio.downpour();
  fx.downpour = 3.5;
  const favored = pickWeighted([['wolf', 4], ['eagle', 3], ['trident', 2], ['crown', 1], [PAYING[rand(4)], 3]]);
  const removed = new Set();
  for (let c = 0; c < COLS; c++) {
    let n = 0;
    for (let r = ROWS - 1; r >= 0 && n < 2; r--) {
      if (!isSticky(grid[c][r])) { removed.add(key(c, r)); n++; }
    }
  }
  const np = await refill(removed, (c) => (Math.random() < 0.45 ? favored : genSymbol(c)));
  say(`Deux rangées de ${SYMBOLS[favored].e} s'abattent sur la grille`);
  await handleLanding(np);
}

async function eventEyeOfCyclone() {
  await banner('👁️ ŒIL DU CYCLONE');
  audio.silence(0.35);
  board.classList.add('slow');
  const picks = randomCells(5 + rand(4), (cell) => !isSticky(cell));
  for (const [c, r] of picks) {
    grid[c][r] = newCell('mystery');
    paintCell(c, r, 'hidden');
  }
  await sleep(1400);
  const sym = pickWeighted([['wolf', 4], ['eagle', 3], ['trident', 2], ['crown', 1]]);
  for (const [c, r] of picks) {
    grid[c][r] = newCell(sym);
    paintCell(c, r, 'reveal');
  }
  audio.chime(3);
  board.classList.remove('slow');
  audio.restore();
  say(`L'œil révèle ${picks.length} symboles cachés : ${SYMBOLS[sym].e}`);
  await sleep(500);
}

/* ------------------------- Eye of the Storm (bonus) ------------------------- */

async function eyeOfTheStorm() {
  say('…');
  audio.silence(0);
  document.body.classList.add('hush');
  fx.hush = true;
  await sleep(1100);

  // BOOOOM
  document.body.classList.remove('hush');
  fx.hush = false;
  const center = centerOf(board);
  fx.bolt(center.x, -40, center.x, center.y, 2.2);
  fx.bolt(center.x - 60, -40, center.x, center.y, 1.4);
  fx.flash = 1.4;
  audio.boom();
  document.body.classList.remove('shake');
  void document.body.offsetWidth;
  document.body.classList.add('shake');
  setTimeout(() => document.body.classList.remove('shake'), 700);
  board.classList.add('vanish');
  await sleep(500);
  $('#eye').classList.add('show');
  audio.restore();
  await banner('🌀 EYE OF THE STORM', 1600);
  await sleep(700);

  board.classList.remove('vanish');
  await sleep(300);
  const n = Math.min(7, 3 + Math.ceil(state.level / 2) + rand(2));
  const picks = randomCells(n, (cell) => !isSticky(cell));
  for (const [c, r] of picks) {
    grid[c][r] = newCell('wild', WILD_LIFE);
    const el = cellEl(c, r);
    const p = centerOf(el);
    fx.bolt(center.x, center.y, p.x, p.y, 0.6);
    paintCell(c, r, 'wildborn');
    audio.zap(1);
    await sleep(170);
  }
  $('#eye').classList.remove('show');
  say(`${picks.length} Storm Wilds 🌀 restent en place pendant ${WILD_LIFE} cascades !`);
  const up = LEVELS[Math.min(LEVELS.length - 1, state.level + 1)].need;
  state.intensity = Math.max(state.intensity, up);
  updateLevel();
  await sleep(600);
}

/* ------------------------- Storm Guardian ------------------------- */

function summonDragon() {
  const was = state.dragonSpins > 0;
  state.dragonSpins = was ? state.dragonSpins + 3 : DRAGON_SPINS;
  updateZonesUI();
  audio.roar();
  banner(was ? '🐉 LE GARDIEN S\'ÉNERVE' : '🐉 LE GARDIEN SE RÉVEILLE');
  say('Le Gardien de la Tempête apparaît derrière la grille…');
}

async function dragonStrike() {
  let z = rand(3);
  if (z === state.lastZone) z = (z + 1 + rand(2)) % 3;
  state.lastZone = z;
  const dragon = $('#dragon');
  dragon.classList.add('roar');
  const zoneEl = document.querySelector(`.zone[data-z="${z}"]`);
  zoneEl.classList.remove('hitfx');
  void zoneEl.offsetWidth;
  zoneEl.classList.add('hitfx');
  strike(zoneEl, 1.6);
  audio.thunder(1.1);
  await sleep(250);
  dragon.classList.remove('roar');

  if (!state.stormZones[z]) {
    state.zoneHits[z]++;
    if (state.zoneHits[z] >= 3) {
      state.stormZones[z] = true;
      updateZonesUI();
      for (let c = z * 2; c < z * 2 + 2; c++) for (let r = 0; r < ROWS; r++) paintCell(c, r);
      await banner(`🌩️ ZONE ${['I', 'II', 'III'][z]} : ZONE DE TEMPÊTE`);
    }
  }
  updateZonesUI();

  const picks = randomCells(2, (cell, c) => zoneOf(c) === z && !isSticky(cell));
  for (const [c, r] of picks) { grid[c][r] = newCell('charge'); paintCell(c, r, 'struck'); }
  say(`Le Gardien frappe la zone ${['I', 'II', 'III'][z]} (${state.stormZones[z] ? 'zone de tempête' : state.zoneHits[z] + '/3'})`);
  await sleep(350);
  await handleLanding(picks);
}

/* ------------------------- spin ------------------------- */

async function spin() {
  if (state.busy) return;
  if (state.balance < bet()) {
    say('Solde insuffisant : baisse la mise.');
    state.auto = false;
    updateUI();
    return;
  }
  audio.init();
  state.busy = true;
  state.balance -= bet();
  state.spinWin = 0;
  state.cascade = 0;
  updateUI();

  // Sticky wilds fade a little each spin, dragon tires.
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
    const cell = grid[c][r];
    if (isSticky(cell)) cell.life--;
  }
  if (state.dragonSpins > 0) state.dragonSpins--;
  updateZonesUI();

  const landed = [];
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
    if (!isSticky(grid[c][r])) { grid[c][r] = newCell(genSymbol(c)); landed.push([c, r]); }
  }
  paintAll('drop');
  audio.whoosh();
  await sleep(700);

  await handleLanding(landed);
  if (state.dragonSpins > 0) await dragonStrike();
  await cascadeLoop();

  if (state.spinWin === 0) {
    state.intensity = Math.max(0, state.intensity - 1);
    updateLevel();
    if (!$('#msg').textContent.startsWith('La tempête')) say('Pas de combinaison… le vent faiblit.');
  } else {
    const x = state.spinWin / bet();
    if (x >= 50) banner(`💥 ÉNORME GAIN ×${fmt(x)}`, 2000);
    else if (x >= 15) banner(`✨ GROS GAIN ×${fmt(x)}`, 1600);
  }

  state.busy = false;
  updateUI();
  if (state.auto) setTimeout(spin, 650);
}

/* ------------------------- weather renderer ------------------------- */

const SKY = [
  [[28, 39, 51], [59, 75, 92]],
  [[20, 28, 40], [45, 58, 72]],
  [[11, 15, 26], [31, 38, 56]],
  [[8, 16, 15], [38, 58, 50]],
  [[14, 2, 10], [70, 12, 40]],
];
const WIND = [0.05, 0.4, 0.65, 0.9, 1.3];
const RAIN = [70, 160, 280, 420, 620];

const fx = {
  flash: 0,
  bolts: [],
  hush: false,
  downpour: 0,
  bolt(x1, y1, x2, y2, power = 1) {
    const pts = [[x1, y1]];
    const segs = 14;
    const spread = 60 * power;
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      pts.push([x1 + (x2 - x1) * t + (Math.random() - 0.5) * spread, y1 + (y2 - y1) * t + (Math.random() - 0.5) * 12]);
    }
    pts.push([x2, y2]);
    const branches = [];
    for (let b = 0; b < Math.round(2 * power); b++) {
      const start = pts[2 + rand(segs - 4)];
      const br = [start];
      let [x, y] = start;
      for (let i = 0; i < 5; i++) { x += (Math.random() - 0.5) * 70; y += 20 + Math.random() * 30; br.push([x, y]); }
      branches.push(br);
    }
    this.bolts.push({ pts, branches, life: 1, power });
  },
};

const bg = $('#bg');
const fxc = $('#fx');
const bctx = bg.getContext('2d');
const fctx = fxc.getContext('2d');
let W = 0, H = 0, DPR = 1;
const sky = [SKY[0][0].slice(), SKY[0][1].slice()];
let wind = WIND[0];
let t = 0;
const drops = [];
const clouds = [];
const trees = [];
const debris = [];

function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth;
  H = window.innerHeight;
  for (const cv of [bg, fxc]) {
    cv.width = W * DPR;
    cv.height = H * DPR;
  }
  bctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  fctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  clouds.length = 0;
  for (let i = 0; i < 9; i++) clouds.push({ x: Math.random() * W, y: 20 + Math.random() * H * 0.35, s: 0.6 + Math.random() * 1.2 });
  trees.length = 0;
  const n = Math.max(8, Math.round(W / 70));
  for (let i = 0; i < n; i++) trees.push({ x: (i + Math.random() * 0.6) * (W / n), h: 60 + Math.random() * 90, p: Math.random() * 6 });
}
window.addEventListener('resize', resize);
resize();

const lerp = (a, b, k) => a + (b - a) * k;
const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

function drawBackground() {
  const lvl = state.level;
  for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) sky[i][j] = lerp(sky[i][j], SKY[lvl][i][j], 0.02);
  wind = lerp(wind, WIND[lvl], 0.01);

  const g = bctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, rgb(sky[0]));
  g.addColorStop(1, rgb(sky[1]));
  bctx.fillStyle = g;
  bctx.fillRect(0, 0, W, H);

  // clouds
  const cloudAlpha = 0.35 + lvl * 0.1;
  for (const cl of clouds) {
    cl.x += (0.08 + wind * 1.6) * cl.s;
    if (cl.x - 200 * cl.s > W) cl.x = -200 * cl.s;
    bctx.fillStyle = lvl === 4 ? `rgba(40,8,24,${cloudAlpha})` : `rgba(12,16,24,${cloudAlpha})`;
    for (let k = 0; k < 5; k++) {
      bctx.beginPath();
      bctx.ellipse(cl.x + (k - 2) * 38 * cl.s, cl.y + Math.sin(k * 1.7) * 10 * cl.s, 60 * cl.s, 30 * cl.s, 0, 0, Math.PI * 2);
      bctx.fill();
    }
  }

  // ground + swaying trees
  const ground = H - 40;
  bctx.fillStyle = '#04060a';
  bctx.fillRect(0, ground, W, 40);
  for (const tr of trees) {
    const sway = Math.sin(t * (1.2 + wind * 3) + tr.p) * (0.02 + wind * 0.09) + wind * 0.14;
    bctx.save();
    bctx.translate(tr.x, ground);
    bctx.rotate(sway);
    bctx.fillStyle = '#05070b';
    bctx.fillRect(-3, -tr.h * 0.35, 6, tr.h * 0.35);
    for (let k = 0; k < 3; k++) {
      const y0 = -tr.h * (0.25 + k * 0.25);
      const w0 = tr.h * (0.32 - k * 0.07);
      bctx.save();
      bctx.rotate(sway * (k + 1) * 0.5);
      bctx.beginPath();
      bctx.moveTo(-w0, y0);
      bctx.lineTo(w0, y0);
      bctx.lineTo(0, y0 - tr.h * 0.4);
      bctx.closePath();
      bctx.fill();
      bctx.restore();
    }
    bctx.restore();
  }

  // eerie glow behind the board at high levels
  if (lvl >= 3) {
    const c = centerOf(board);
    const rg = bctx.createRadialGradient(c.x, c.y, 10, c.x, c.y, Math.max(W, H) * 0.6);
    rg.addColorStop(0, lvl === 4 ? 'rgba(255,50,110,0.18)' : 'rgba(120,220,180,0.10)');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    bctx.fillStyle = rg;
    bctx.fillRect(0, 0, W, H);
  }
}

function drawFx() {
  fctx.clearRect(0, 0, W, H);
  const lvl = state.level;

  // rain
  const target = fx.hush ? 0 : RAIN[lvl] + (fx.downpour > 0 ? 700 : 0);
  if (fx.downpour > 0) fx.downpour -= 1 / 60;
  while (drops.length < target) drops.push({ x: Math.random() * W * 1.4 - W * 0.2, y: Math.random() * -H, len: 10 + Math.random() * 18, v: 9 + Math.random() * 9 });
  if (drops.length > target) drops.length = Math.max(target, drops.length - 12);
  fctx.strokeStyle = lvl === 4 ? 'rgba(255,190,210,0.35)' : 'rgba(175,200,235,0.35)';
  fctx.lineWidth = 1;
  fctx.beginPath();
  for (const d of drops) {
    const dx = wind * d.len * 0.9;
    fctx.moveTo(d.x, d.y);
    fctx.lineTo(d.x + dx, d.y + d.len);
    d.y += d.v;
    d.x += wind * d.v * 0.9;
    if (d.y > H || d.x > W + 50) { d.y = -20 - Math.random() * 100; d.x = Math.random() * W * 1.4 - W * 0.4; }
  }
  fctx.stroke();

  // cyclone around the reels
  if (lvl >= 3 && !fx.hush) {
    const c = centerOf(board);
    const rect = board.getBoundingClientRect();
    const want = lvl === 4 ? 110 : 60;
    while (debris.length < want) debris.push({ a: Math.random() * Math.PI * 2, k: 0.85 + Math.random() * 0.35, sp: 0.01 + Math.random() * 0.02, s: 1 + Math.random() * 3, y: Math.random() });
    if (debris.length > want) debris.length = want;
    const rx = rect.width * 0.62, ry = rect.height * 0.62;
    for (const d of debris) {
      d.a += d.sp * (lvl === 4 ? 2 : 1.2);
      const x = c.x + Math.cos(d.a) * rx * d.k;
      const y = c.y + Math.sin(d.a) * ry * d.k * 0.9 + (d.y - 0.5) * 30;
      const front = Math.sin(d.a) > 0;
      fctx.fillStyle = lvl === 4 ? `rgba(255,140,170,${front ? 0.5 : 0.18})` : `rgba(190,230,210,${front ? 0.45 : 0.15})`;
      fctx.fillRect(x, y, d.s * 2, d.s);
    }
    fctx.strokeStyle = lvl === 4 ? 'rgba(255,120,160,0.10)' : 'rgba(170,230,210,0.08)';
    fctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      fctx.beginPath();
      fctx.ellipse(c.x, c.y, rx * (0.95 + i * 0.1), ry * (0.95 + i * 0.1) * 0.9, t * 0.6 + i, 0, Math.PI * 1.3);
      fctx.stroke();
    }
  }

  // ambient lightning (visual only)
  const chance = [0, 0, 0.003, 0.006, 0.014][lvl];
  if (!fx.hush && Math.random() < chance) {
    const x = Math.random() * W;
    fx.bolt(x, -10, x + (Math.random() - 0.5) * 200, H * (0.3 + Math.random() * 0.4), 0.8);
    fx.flash = Math.max(fx.flash, 0.45);
    audio.thunder(0.45, 0.25 + Math.random() * 0.6);
  }

  // bolts
  for (const b of fx.bolts) {
    fctx.save();
    fctx.globalAlpha = Math.max(0, b.life);
    fctx.strokeStyle = '#eaf6ff';
    fctx.shadowColor = lvl === 4 ? '#ff7aa8' : '#7fd3ff';
    fctx.shadowBlur = 24;
    fctx.lineWidth = 2.5 * b.power;
    fctx.lineJoin = 'round';
    fctx.beginPath();
    b.pts.forEach(([x, y], i) => (i ? fctx.lineTo(x, y) : fctx.moveTo(x, y)));
    fctx.stroke();
    fctx.lineWidth = 1.2;
    for (const br of b.branches) {
      fctx.beginPath();
      br.forEach(([x, y], i) => (i ? fctx.lineTo(x, y) : fctx.moveTo(x, y)));
      fctx.stroke();
    }
    fctx.restore();
    b.life -= 0.06;
  }
  fx.bolts = fx.bolts.filter((b) => b.life > 0);

  // flash
  if (fx.flash > 0) {
    fctx.fillStyle = lvl === 4 ? `rgba(255,220,235,${Math.min(0.85, fx.flash * 0.55)})` : `rgba(215,235,255,${Math.min(0.85, fx.flash * 0.55)})`;
    fctx.fillRect(0, 0, W, H);
    fx.flash *= 0.86;
    if (fx.flash < 0.02) fx.flash = 0;
  }
  if (fx.hush) {
    fctx.fillStyle = 'rgba(0,0,0,0.35)';
    fctx.fillRect(0, 0, W, H);
  }
}

function frame() {
  t += 1 / 60;
  drawBackground();
  drawFx();
  requestAnimationFrame(frame);
}

/* ------------------------- audio ------------------------- */

const audio = {
  ctx: null,
  on: true,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = this.on ? 0.8 : 0;
    this.master.connect(ctx.destination);
    this.ambient = ctx.createGain();
    this.ambient.connect(this.master);

    const len = ctx.sampleRate * 3;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // brown noise for thunder
    this.brown = ctx.createBuffer(1, len, ctx.sampleRate);
    const b = this.brown.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; b[i] = last * 3.5; }

    const loop = (type, freq, q) => {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      if (q) f.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = 0;
      src.connect(f).connect(g).connect(this.ambient);
      src.start();
      return { f, g };
    };
    this.rain = loop('highpass', 1400);
    this.wind = loop('bandpass', 450, 1.4);
    this.rumble = loop('lowpass', 80);
    this.lfo = ctx.createOscillator();
    this.lfo.frequency.value = 0.15;
    const lg = ctx.createGain();
    lg.gain.value = 260;
    this.lfo.connect(lg).connect(this.wind.f.frequency);
    this.lfo.start();
    this.setLevel(state.level);
  },
  setLevel(l) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.rain.g.gain.setTargetAtTime([0.05, 0.08, 0.1, 0.12, 0.15][l], now, 0.8);
    this.wind.g.gain.setTargetAtTime([0, 0.3, 0.45, 0.65, 0.9][l], now, 1.2);
    this.rumble.g.gain.setTargetAtTime([0, 0, 0.3, 0.7, 1.1][l], now, 1.2);
    this.lfo.frequency.setTargetAtTime(0.12 + l * 0.12, now, 1);
  },
  env(node, peak, attack, decay, when = 0) {
    const t0 = this.ctx.currentTime + when;
    node.gain.setValueAtTime(0.0001, t0);
    node.gain.linearRampToValueAtTime(peak, t0 + attack);
    node.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
    return t0;
  },
  burst(buffer, type, freq, peak, attack, decay, when = 0, freqEnd) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    src.connect(f).connect(g).connect(this.master);
    const t0 = this.env(g, peak, attack, decay, when);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t0 + attack + decay);
    src.start(t0);
    src.stop(t0 + attack + decay + 0.1);
  },
  tone(freq, peak, decay, when = 0, type = 'sine', freqEnd) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = ctx.createGain();
    o.connect(g).connect(this.master);
    const t0 = this.env(g, peak, 0.01, decay, when);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t0 + decay);
    o.start(t0);
    o.stop(t0 + decay + 0.1);
  },
  thunder(power = 1, delay = 0) {
    if (!this.ctx) return;
    this.burst(this.noise, 'highpass', 2500, 0.25 * power, 0.005, 0.18, delay);
    this.burst(this.brown, 'lowpass', 600, 0.9 * power, 0.04, 2.2 + power, delay + 0.05, 60);
  },
  boom() {
    if (!this.ctx) return;
    this.tone(95, 1, 2.6, 0, 'sine', 26);
    this.tone(48, 0.8, 3, 0, 'triangle', 22);
    this.thunder(1.6);
  },
  zap(n = 1) {
    if (!this.ctx) return;
    for (let i = 0; i < Math.min(n, 4); i++) this.tone(900 + i * 220, 0.08, 0.18, i * 0.05, 'sawtooth', 1800 + i * 300);
  },
  chime(step = 1) {
    if (!this.ctx) return;
    const scale = [392, 440, 523, 587, 659, 784, 880, 1047];
    const base = Math.min(step - 1, 5);
    [0, 2].forEach((o, i) => this.tone(scale[base + o], 0.12, 0.6, i * 0.07, 'triangle'));
  },
  whoosh() { if (this.ctx) this.burst(this.noise, 'bandpass', 700, 0.15, 0.08, 0.35, 0, 2000); },
  gust() { if (this.ctx) this.burst(this.noise, 'bandpass', 300, 0.6, 0.3, 1.4, 0, 1200); },
  downpour() { if (this.ctx) this.burst(this.noise, 'highpass', 900, 0.45, 0.4, 3); },
  roar() {
    if (!this.ctx) return;
    this.tone(110, 0.35, 1.4, 0, 'sawtooth', 55);
    this.burst(this.brown, 'lowpass', 400, 0.6, 0.1, 1.5);
  },
  silence(level = 0) {
    if (this.ctx) this.ambient.gain.setTargetAtTime(level, this.ctx.currentTime, 0.08);
  },
  restore() {
    if (this.ctx) this.ambient.gain.setTargetAtTime(1, this.ctx.currentTime, 0.4);
  },
  toggle() {
    this.on = !this.on;
    if (this.ctx) this.master.gain.setTargetAtTime(this.on ? 0.8 : 0, this.ctx.currentTime, 0.05);
    return this.on;
  },
};

/* ------------------------- paytable & controls ------------------------- */

function buildPaytable() {
  const rows = PAYING.slice().reverse().map((k) => {
    const s = SYMBOLS[k];
    return `<div class="pay"><span class="e">${s.e}</span><div><b>${s.name}</b><small>8-9 : ×${s.pay[0]} · 10-11 : ×${s.pay[1]}<br>12+ : ×${s.pay[2]}</small></div></div>`;
  });
  rows.push(`<div class="pay"><span class="e">🌀</span><div><b>Storm Wild</b><small>Remplace tout symbole payant</small></div></div>`);
  rows.push(`<div class="pay"><span class="e">⚡</span><div><b>Charge</b><small>+7 Storm Charge</small></div></div>`);
  rows.push(`<div class="pay"><span class="e">🐉</span><div><b>Gardien</b><small>Invoque le dragon, devient Wild</small></div></div>`);
  $('#paytable').innerHTML = rows.join('');
}

$('#spin').addEventListener('click', spin);
$('#betUp').addEventListener('click', () => { if (!state.busy) { state.betIdx = Math.min(BETS.length - 1, state.betIdx + 1); updateUI(); } });
$('#betDown').addEventListener('click', () => { if (!state.busy) { state.betIdx = Math.max(0, state.betIdx - 1); updateUI(); } });
$('#auto').addEventListener('click', () => { state.auto = !state.auto; updateUI(); if (state.auto) spin(); });
$('#sound').addEventListener('click', (e) => { audio.init(); e.currentTarget.textContent = audio.toggle() ? '🔊' : '🔇'; });
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'SUMMARY') { e.preventDefault(); spin(); }
});

buildPaytable();
paintAll();
updateUI();
updateGauge();
updateWeatherUI();
updateZonesUI();
requestAnimationFrame(frame);

// Test hook: window.stormbound exposes state for quick tweaking in the console.
window.stormbound = { state, addCharge, updateLevel, spin };
