'use strict';

/* =========================================================
   STORMBOUND — La Tempête des Anciens (interface)
   Les résultats viennent uniquement de engine.js :
   cette page rejoue les étapes calculées par le moteur.
   ========================================================= */

const { COLS, ROWS, SYMBOLS, LEVELS, CONFIG, zoneOf } = StormEngine;
const BETS = [0.2, 0.5, 1, 2, 5, 10, 20, 50];

// Aléa de l'interface : crypto du navigateur. En production, le résultat vient du serveur du casino.
const rng = () => {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] / 4294967296;
};

const state = {
  balance: 1000,
  betIdx: 2,
  busy: false,
  auto: false,
  spinWin: 0,
  // affichage du tour en cours (mis à jour par les étapes du moteur)
  level: 0,
  intensity: 0,
  charge: 0,
  thresholdIdx: 0,
  dragon: false,
  zoneHits: [0, 0, 0],
  stormZones: [false, false, false],
  inBonus: false,
};

const $ = (s) => document.querySelector(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (n) => Math.floor(Math.random() * n);
const fmt = (n) => (Math.round(n * 100) / 100).toLocaleString('fr-CH', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
const bet = () => BETS[state.betIdx];
const isSticky = (cell) => cell.s === 'wild' && cell.life > 0;
const ZONE_NAMES = ['I', 'II', 'III'];

/* ------------------------- grid ------------------------- */

let grid = StormEngine.randomGrid(rng);

const board = $('#board');
const cellEls = [];
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const el = document.createElement('div');
    el.className = 'cell';
    el.innerHTML = '<span class="sym"></span><span class="sym old"></span>';
    // Once a symbol has landed, drop the landing classes so other effects (win, burst, strike…) can play.
    el.addEventListener('animationend', (e) => {
      if (e.animationName === 'colIn') el.classList.remove('land', 'leaving');
      if (e.animationName === 'reelStop') el.classList.remove('reelstop');
    });
    board.appendChild(el);
    cellEls.push(el);
  }
}
const cellEl = (c, r) => cellEls[r * COLS + c];

function paintCell(c, r, anim, delay = 0) {
  const el = cellEl(c, r);
  const cell = grid[c][r];
  el.querySelector('.sym').innerHTML = symbolSVG(cell.s);
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

function paintAll() {
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) paintCell(c, r);
}

function flashCells(list, cls) {
  for (const [c, r] of list) {
    const el = cellEl(c, r);
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }
}

/* ------------------------- UI ------------------------- */

function updateUI() {
  $('#balance').textContent = fmt(state.balance);
  $('#bet').textContent = fmt(bet());
  $('#win').textContent = fmt(state.spinWin);
  $('#spin').disabled = state.busy;
  document.querySelectorAll('.buy-btn').forEach((b) => { b.disabled = state.busy; });
  for (const [kind, o] of Object.entries(StormEngine.BONUS_BUYS)) {
    const el = document.querySelector(`.buy-price[data-price="${kind}"]`);
    if (el) el.textContent = `Acheter · ${fmt(o.cost * bet())}`;
  }
  $('#auto').classList.toggle('on', state.auto);
}

let shownBolts = 0;
function updateGauge() {
  const bolts = Math.round(state.charge / CONFIG.chargePerBolt);
  $('#chargeVal').textContent = bolts;
  document.querySelectorAll('.slot').forEach((el, i) => {
    const on = i < bolts;
    if (on && i >= shownBolts) { el.classList.remove('charged'); void el.offsetWidth; el.classList.add('charged'); }
    el.classList.toggle('on', on);
  });
  shownBolts = bolts;
  $('.charge-goal').classList.toggle('ready', bolts >= 4);
}

function updateWeatherUI() {
  document.querySelectorAll('.step').forEach((el) => {
    const l = +el.dataset.l;
    el.classList.toggle('on', l === state.level);
    el.classList.toggle('done', l < state.level);
  });
  const cur = LEVELS[state.level];
  const next = LEVELS[state.level + 1];
  const frac = next ? Math.max(0, Math.min(1, (state.intensity - cur.need) / (next.need - cur.need))) : 0;
  // the groove runs from the first to the last medallion: 4 segments
  $('.groove .energy').style.width = ((state.level + frac) / (LEVELS.length - 1)) * 100 + '%';
  $('#mult').textContent = '×' + String(cur.mult).replace('.', ',');
}

function updateZonesUI() {
  document.querySelectorAll('.zinfo').forEach((el) => {
    const z = +el.dataset.z;
    el.classList.toggle('storm', state.stormZones[z]);
    el.querySelectorAll('i').forEach((p, i) => p.classList.toggle('on', i < state.zoneHits[z]));
  });
  document.querySelectorAll('.zone').forEach((el) => el.classList.toggle('storm', state.stormZones[+el.dataset.z]));
  const ds = $('#dragonStatus');
  ds.classList.toggle('active', state.dragon);
  ds.querySelector('.txt').textContent = state.dragon ? 'Le Gardien veille et frappe à chaque éclair' : 'Gardien endormi : un symbole dragon le réveille';
  $('#dragon').classList.toggle('active', state.dragon);
}

function setFreeSpins(text) {
  const el = $('#fsBar');
  el.hidden = !text;
  el.textContent = text || '';
  document.body.classList.toggle('bonus', !!text);
}

let bannerTimer = 0;
async function banner(text, ms = 1300, cls = '') {
  const b = $('#banner');
  b.textContent = text;
  b.className = cls;
  void b.offsetWidth;
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

function showLevel(level, intensity, announce) {
  const prev = state.level;
  state.intensity = intensity;
  state.level = level;
  document.body.dataset.level = level;
  if (level !== prev) audio.setLevel(level);
  updateWeatherUI();
  return announce && level > prev;
}

/* ------------------------- level transitions ------------------------- */

function bodyFx(cls, ms) {
  if (REDUCED) return;
  document.body.classList.remove(cls);
  void document.body.offsetWidth;
  document.body.classList.add(cls);
  setTimeout(() => document.body.classList.remove(cls), ms);
}

// Each weather level gets its own entrance.
async function levelTransition(level) {
  const L = LEVELS[level];
  const title = `${L.name.toUpperCase()} ×${String(L.mult).replace('.', ',')}`;
  const ov = $('#transition');
  const hud = document.querySelector(`.step[data-l="${level}"]`);
  hud.classList.remove('levelup');
  void hud.offsetWidth;
  hud.classList.add('levelup');
  scene.rush = 1;
  const c = centerOf(board);

  if (level === 1) {
    // Wind: a gust sweeps across the screen and tears leaves away.
    audio.gust();
    fx.gust();
    for (let i = 0; i < 40; i++) leaves.push({ x: rnd(-300, -10), y: rnd(0, H), s: rnd(2, 5), a: rnd(0, 6), va: rnd(-0.3, 0.3), vy: rnd(-1, 1), p: rnd(0, 6), c: rand(3), boost: rnd(8, 16) });
    bodyFx('sway', 900);
    banner(title, 1400, 'lvl-1');
    await sleep(950);
  } else if (level === 2) {
    // Thunderstorm: the sky darkens, three bolts hit the horizon, the grid gets charged.
    ov.className = 'dark';
    await sleep(220);
    board.classList.add('charged');
    for (let i = 0; i < 3; i++) {
      const x = W * (0.18 + 0.32 * i) + rnd(-50, 50);
      scene.bolts.push(makeBolt(x + rnd(-60, 60), H * 0.1, x, GROUND - rnd(30, 140), 1.3));
      scene.flash = 1;
      fx.flash = 0.8;
      audio.thunder(0.9);
      await sleep(160);
    }
    ov.className = '';
    banner(title, 1400, 'lvl-2');
    setTimeout(() => board.classList.remove('charged'), 800);
    await sleep(750);
  } else if (level === 3) {
    // Supercell: green light, a vortex bursts out of the grid, the ground rumbles.
    ov.className = 'green';
    audio.rumble();
    fx.vortex(c.x, c.y);
    fx.ring(c.x, c.y, '170,255,210');
    bodyFx('rumble', 1000);
    banner(title, 1500, 'lvl-3');
    await sleep(1050);
    ov.className = '';
  } else if (level === 4) {
    // STORMBOUND: blackout and silence, then a red strike and a shockwave.
    ov.className = 'black';
    audio.silence(0.03);
    await sleep(420);
    ov.className = 'red';
    fx.bolt(c.x, -40, c.x, c.y, 2.4);
    fx.bolt(c.x + 80, -40, c.x + 10, c.y, 1.2);
    fx.flash = 1.4;
    audio.restore();
    audio.boom();
    fx.ring(c.x, c.y, '255,90,130');
    setTimeout(() => fx.ring(c.x, c.y, '255,210,220'), 160);
    for (let i = 0; i < 70; i++) embers.push({ x: c.x + rnd(-80, 80), y: c.y + rnd(-50, 50), v: rnd(1.5, 4.5), s: rnd(1, 3), p: rnd(0, 6) });
    bodyFx('shake', 700);
    banner(title, 1800, 'lvl-4');
    await sleep(1150);
    ov.className = '';
  }
}

/* ------------------------- column-by-column drop ------------------------- */

const FALL_MS = 190;         // chute d'une colonne au tour de base (ms)
const CASCADE_FALL_MS = 150; // chute d'une colonne pendant les cascades
const LAND_SHARE = 0.5;      // part de l'animation consacrée à la chute, le reste est le rebond
const ROW_LAG = 20;          // dans une colonne, chaque rangée se pose un peu après celle du dessous (ms)

// Distance en pixels entre deux rangées de la grille.
function rowPitch() {
  return cellEl(0, 1).getBoundingClientRect().top - cellEl(0, 0).getBoundingClientRect().top;
}

// Anime une colonne : les anciens symboles sortent par le bas, les nouveaux tombent et rebondissent.
function animateColumn(c, items, fallMs, lag = ROW_LAG) {
  const P = rowPitch();
  const total = Math.round(fallMs / LAND_SHARE);
  for (const it of items) {
    paintCell(it.c, it.r);
    const el = cellEl(it.c, it.r);
    el.style.setProperty('--from', it.from * P + 'px');
    el.style.setProperty('--bounce', -Math.max(5, P * 0.14) + 'px');
    el.style.setProperty('--bounce2', -Math.max(2, P * 0.04) + 'px');
    el.style.setProperty('--d', (ROWS - 1 - it.r) * lag + 'ms');
    el.style.setProperty('--dur', total + 'ms');
    el.style.setProperty('--fall', fallMs + 'ms');
    if (it.old) {
      el.querySelector('.sym.old').innerHTML = symbolSVG(it.old);
      el.style.setProperty('--to', it.to * P + 'px');
    }
    void el.offsetWidth;
    el.classList.add('land');
    if (it.old) el.classList.add('leaving');
  }
  for (const it of items) setTimeout(() => audio.clack(it.r), (ROWS - 1 - it.r) * lag + fallMs);
  setTimeout(() => audio.thud(0.6 * items.length / ROWS), fallMs);
}

const CLEAR_MS = 220;         // les symboles du tour précédent tombent hors de la grille
const CLEAR_STAGGER = 30;    // petite vague de gauche à droite pendant le vidage

// Vide la grille : tous les anciens symboles (sauf les Storm Wilds collants) tombent et sortent par le bas.
async function clearBoard(cells) {
  const P = rowPitch();
  for (const [c, r] of cells) {
    const el = cellEl(c, r);
    el.classList.remove('land', 'leaving');
    el.querySelector('.sym').innerHTML = '';
    el.querySelector('.sym.old').innerHTML = symbolSVG(grid[c][r].s);
    el.style.setProperty('--to', (ROWS - r) * P + 'px');
    el.style.setProperty('--fall', CLEAR_MS + 'ms');
    el.style.setProperty('--out-delay', c * CLEAR_STAGGER + 'ms');
    void el.offsetWidth;
    el.classList.add('leaving');
  }
  audio.sweep();
  await sleep(CLEAR_MS + (COLS - 1) * CLEAR_STAGGER + 60);
}

// Tour de base : la grille se vide, puis les colonnes tombent l'une après l'autre.
const REEL_SPIN_MS = 520;     // every reel spins at least this long
const REEL_STOP_GAP = 170;   // then they stop one after another, left to right
const REEL_POOL = ['leaf', 'drop', 'rock', 'ice', 'wolf', 'eagle', 'trident', 'crown', 'charge'];

// Classic reels: every column spins (the grid is never empty), then stops in turn with a bounce.
async function dropColumns(step) {
  const next = step.grid;
  const landed = new Set(step.landed.map(([c, r]) => c + ',' + r));
  const boardRect = board.getBoundingClientRect();
  const reels = [];
  audio.whoosh();
  for (let c = 0; c < COLS; c++) {
    const top = cellEl(c, 0).getBoundingClientRect(), bot = cellEl(c, ROWS - 1).getBoundingClientRect();
    const pitch = rowPitch();
    const reel = document.createElement('div');
    reel.className = 'reel';
    reel.style.left = top.left - boardRect.left + 'px';
    reel.style.top = top.top - boardRect.top + 'px';
    reel.style.width = top.width + 'px';
    reel.style.height = bot.bottom - top.top + 'px';
    const track = document.createElement('div');
    track.className = 'reel-track';
    const n = 10;
    const syms = Array.from({ length: n }, () => REEL_POOL[rand(REEL_POOL.length)]);
    track.innerHTML = [...syms, ...syms].map((k) => `<div class="reel-sym" style="height:${pitch}px">${symbolSVG(k)}</div>`).join('');
    track.style.setProperty('--loop', -n * pitch + 'px');
    track.style.animationDuration = 60 * n + 'ms';
    track.style.animationDelay = -rand(600) + 'ms';
    reel.appendChild(track);
    board.appendChild(reel);
    reels.push(reel);
    // hide the old symbols behind the spinning reel, except sticky wilds that stay put
    for (let r = 0; r < ROWS; r++) if (landed.has(c + ',' + r)) cellEl(c, r).classList.add('spinning');
  }
  await sleep(REEL_SPIN_MS);
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      grid[c][r] = next[c][r];
      if (!landed.has(c + ',' + r)) continue;
      paintCell(c, r, 'reelstop', 0);
    }
    const reel = reels[c];
    reel.classList.add('stopping');
    setTimeout(() => reel.remove(), 140);
    audio.thud(0.8);
    audio.clack(2);
    await sleep(REEL_STOP_GAP);
  }
  grid = next;
  await sleep(260);
}

// Cascade : les symboles restants glissent vers le bas, les nouveaux tombent du haut, colonne par colonne.
async function refillColumns(step) {
  const next = step.grid;
  const byCol = new Map();
  const add = (c, it) => { if (!byCol.has(c)) byCol.set(c, []); byCol.get(c).push(it); };
  for (const [c, r, from] of step.moved) add(c, { c, r, from: from - r });
  const newCount = {};
  for (const [c] of step.landed) newCount[c] = (newCount[c] || 0) + 1;
  for (const [c, r] of step.landed) add(c, { c, r, from: -newCount[c] });
  grid = next;
  for (let c = 0; c < COLS; c++) if (!byCol.has(c)) for (let r = 0; r < ROWS; r++) paintCell(c, r);
  const cols = [...byCol.keys()].sort((a, b) => a - b);
  for (const c of cols) {
    for (let r = 0; r < ROWS; r++) if (!byCol.get(c).some((it) => it.r === r)) paintCell(c, r);
    animateColumn(c, byCol.get(c), CASCADE_FALL_MS, 14);
    await sleep(CASCADE_FALL_MS);
  }
  await sleep(Math.round(CASCADE_FALL_MS / LAND_SHARE) - CASCADE_FALL_MS + (ROWS - 1) * 14);
}

/* ------------------------- replay of engine steps ------------------------- */

const EVENT_NAMES = {
  lightning: 'ÉCLAIR',
  gust: 'RAFALE',
  downpour: 'PLUIE TORRENTIELLE',
  eye: 'ŒIL DU CYCLONE',
  mystery: 'GAIN MYSTÈRE',
};

async function play(step) {
  switch (step.type) {
    case 'start':
      state.boughtKind = null;
      state.charge = 0;
      state.thresholdIdx = 0;
      state.dragon = false;
      state.zoneHits = [0, 0, 0];
      state.stormZones = [false, false, false];
      showLevel(0, 0, false);
      updateGauge();
      updateZonesUI();
      break;

    case 'fill':
      await dropColumns(step);
      break;

    case 'refill':
      await refillColumns(step);
      break;

    case 'absorb':
      flashCells(step.cells, 'absorb');
      audio.zap(step.cells.length);
      await sleep(460);
      break;

    case 'charge':
      state.charge = step.charge;
      state.thresholdIdx = step.thresholdIdx;
      updateGauge();
      break;

    case 'summon':
      grid = step.grid;
      state.dragon = true;
      updateZonesUI();
      for (const [c, r] of step.cells) paintCell(c, r, 'struck');
      audio.roar();
      banner('LE GARDIEN SE RÉVEILLE');
      say('Le Gardien de la Tempête apparaît derrière la grille…');
      await sleep(900);
      break;

    case 'strike': {
      const dragon = $('#dragon');
      dragon.classList.add('roar');
      const zoneEl = document.querySelector(`.zone[data-z="${step.zone}"]`);
      zoneEl.classList.remove('hitfx');
      void zoneEl.offsetWidth;
      zoneEl.classList.add('hitfx');
      strike(zoneEl, 1.6);
      audio.thunder(1.1);
      await sleep(250);
      dragon.classList.remove('roar');
      state.zoneHits = step.zoneHits;
      state.stormZones = step.stormZones;
      grid = step.grid;
      paintAll();
      for (const [c, r] of step.cells) paintCell(c, r, 'struck');
      updateZonesUI();
      const zn = ZONE_NAMES[step.zone];
      if (step.becameStorm) await banner(`ZONE ${zn} : ZONE DE TEMPÊTE`);
      say(`Le Gardien frappe la zone ${zn} (${step.stormZones[step.zone] ? 'zone de tempête' : step.zoneHits[step.zone] + '/3'})`);
      await sleep(400);
      break;
    }

    case 'win': {
      state.spinWin = step.total;
      state.balance += step.amount;
      flashCells(step.highlight, 'win');
      audio.chime(step.cascade);
      floatText('+' + fmt(step.amount));
      say(step.wins.map((w) => `${w.total}× ${SYMBOLS[w.s].e}`).join('  ·  ') +
        `  →  +${fmt(step.amount)}` + (step.mult > 1 ? ` (météo ×${step.mult})` : '') +
        (step.cascade > 1 ? `  · cascade ${step.cascade}` : ''));
      updateUI();
      await sleep(430);
      // All winning symbols burst at the same instant and stay gone until the refill.
      const vanish = step.highlight.filter(([c, r]) => !isSticky(grid[c][r]) || grid[c][r].life === 1);
      for (const [c, r] of vanish) {
        const el = cellEl(c, r);
        el.classList.add('burst');
        const p = centerOf(el);
        fx.burst(p.x, p.y, grid[c][r].s === 'wild' ? '#9fe0ff' : '#ffd46b');
      }
      audio.pop(vanish.length);
      await sleep(280);
      break;
    }

    case 'intensity':
      if (showLevel(step.level, step.intensity, true)) await levelTransition(step.level);
      break;

    case 'event':
      await banner(EVENT_NAMES[step.name]);
      if (step.name === 'lightning') {
        audio.thunder(1);
        grid = step.grid;
        for (const [c, r] of step.cells) {
          strike(cellEl(c, r), 0.8);
          paintCell(c, r, 'struck');
          await sleep(110);
        }
        say(`L'éclair transforme ${step.cells.length} cases en ${SYMBOLS[step.sym].e}`);
        await sleep(450);
      } else if (step.name === 'gust') {
        audio.gust();
        grid = step.grid;
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
          cellEl(c, r).style.setProperty('--sx', r % 2 === 0 ? '-100%' : '100%');
          paintCell(c, r, 'slide');
        }
        await sleep(450);
      } else if (step.name === 'downpour') {
        audio.downpour();
        fx.downpour = 3.5;
        say(`Des rangées chargées de ${SYMBOLS[step.sym].e} s'abattent sur la grille`);
      } else if (step.name === 'eye' || step.name === 'mystery') {
        audio.silence(0.35);
        board.classList.add('slow');
        for (const [c, r] of step.cells) {
          cellEl(c, r).querySelector('.sym').innerHTML = symbolSVG('mystery');
          flashCells([[c, r]], 'hidden');
        }
        await sleep(1400);
        grid = step.grid;
        for (const [c, r] of step.cells) paintCell(c, r, 'reveal');
        audio.chime(3);
        board.classList.remove('slow');
        audio.restore();
        say(`L'œil révèle ${step.cells.length} symboles cachés : ${SYMBOLS[step.sym].e}`);
        await sleep(500);
      }
      break;

    case 'expand': {
      await banner('SYMBOLES EXPANSIFS', 1000);
      grid = step.grid;
      for (const c of step.cols) {
        const colCells = step.cells.filter(([cc]) => cc === c);
        colCells.forEach(([cc, r], k) => setTimeout(() => paintCell(cc, r, 'reveal'), k * 60));
        const zoneEl = cellEl(c, 2);
        strike(zoneEl, 1.2);
        audio.zap(3);
      }
      say(`Une colonne entière se remplit de ${SYMBOLS[step.sym].name.toLowerCase()}s`);
      await sleep(700);
      break;
    }

    case 'convert':
      grid = step.grid;
      for (const [c, r] of step.cells) paintCell(c, r, 'reveal');
      say(`La rafale pousse les rangées et rassemble les ${SYMBOLS[step.sym].e}`);
      await sleep(500);
      break;

    case 'buy': {
      state.boughtKind = step.kind;
      const all = [];
      for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) all.push([c, r]);
      await dropColumns({ grid: step.grid, landed: all });
      await banner(step.kind === 'super' ? 'SUPER BONUS ACHETÉ' : 'BONUS ACHETÉ', 1200);
      break;
    }

    case 'bonusStart':
      await eyeOfTheStorm(step);
      break;

    case 'freeSpin':
      setFreeSpins(`EYE OF THE STORM · tour gratuit ${step.n} · encore ${step.left}`);
      await sleep(350);
      break;

    case 'retrigger': {
      await banner(`+${step.added} TOURS GRATUITS`);
      fx.flash = 1;
      audio.boom();
      grid = step.grid;
      for (const [c, r] of step.cells) paintCell(c, r, 'wildborn');
      setFreeSpins(`EYE OF THE STORM · encore ${step.spinsLeft}`);
      await sleep(600);
      break;
    }

    case 'bonusEnd':
      state.inBonus = false;
      setFreeSpins('');
      audio.stopMusic();
      await bonusCelebration(step.win, step.spins);
      break;

    case 'end':
      break;
  }
}

/* ------------------------- bonus win celebration ------------------------- */

const WIN_TIERS = [
  { x: 0, name: 'GAIN', cls: 't0' },
  { x: 10, name: 'BEAU GAIN', cls: 't1' },
  { x: 25, name: 'GROS GAIN', cls: 't2' },
  { x: 50, name: 'ÉNORME GAIN', cls: 't3' },
  { x: 100, name: 'GAIN ÉPIQUE', cls: 't4' },
  { x: 500, name: 'LÉGENDAIRE', cls: 't5' },
];
const tierFor = (x) => WIN_TIERS.reduce((t, cur) => (x >= cur.x ? cur : t), WIN_TIERS[0]);

// Full-screen count-up of the bonus total, with tiers, rays and a coin shower.
function bonusCelebration(win, spins) {
  return new Promise((resolve) => {
    const ov = $('#bonusWin');
    const amountEl = ov.querySelector('.bw-amount');
    const tierEl = ov.querySelector('.bw-tier');
    const xEl = ov.querySelector('.bw-x');
    const b = bet();
    const finalX = win / b;
    ov.querySelector('.bw-sub').textContent = `${spins} tour${spins > 1 ? 's' : ''} gratuit${spins > 1 ? 's' : ''} joué${spins > 1 ? 's' : ''}`;
    ov.querySelector('.bw-emblem').src = `img/${state.boughtKind === 'super' ? 'super' : 'bonus'}.webp`;
    ov.className = '';
    ov.hidden = false;
    void ov.offsetWidth;
    ov.classList.add('show');

    if (win <= 0) {
      tierEl.textContent = 'LA TEMPÊTE SE CALME';
      amountEl.textContent = '0';
      xEl.textContent = 'Pas de gain cette fois';
    }
    // bigger wins count longer
    const duration = win <= 0 ? 0 : Math.min(6000, 1400 + Math.sqrt(finalX) * 420);
    let start = null, last = -1, tier = null, done = false, closeTimer = 0;

    const setTier = (t) => {
      if (tier === t) return;
      tier = t;
      tierEl.textContent = t.name;
      ov.className = 'show ' + t.cls;
      tierEl.classList.remove('pop');
      void tierEl.offsetWidth;
      tierEl.classList.add('pop');
      if (t.x > 0) { fx.flash = Math.max(fx.flash, 0.5); audio.thunder(0.5); fx.coinShower(12 + WIN_TIERS.indexOf(t) * 10); }
    };

    const finish = () => {
      if (done) return;
      done = true;
      amountEl.textContent = fmt(win);
      xEl.textContent = win > 0 ? `×${fmt(finalX)} la mise` : xEl.textContent;
      if (win > 0) {
        setTier(tierFor(finalX));
        amountEl.classList.remove('slam');
        void amountEl.offsetWidth;
        amountEl.classList.add('slam');
        audio.fanfare();
        if (finalX >= 25) audio.boom();
        fx.coinShower(Math.min(160, 30 + finalX * 0.8));
        fx.flash = 1;
      }
      ov.querySelector('.bw-skip').textContent = 'Clique pour continuer';
      closeTimer = setTimeout(close, 3200);
    };

    const close = () => {
      clearTimeout(closeTimer);
      ov.removeEventListener('click', onClick);
      ov.classList.remove('show');
      setTimeout(() => { ov.hidden = true; resolve(); }, 350);
    };

    const onClick = () => (done ? close() : finish());
    ov.addEventListener('click', onClick);
    ov.querySelector('.bw-skip').textContent = 'Clique pour passer';

    if (win <= 0) { finish(); return; }
    setTier(WIN_TIERS[0]);
    const stepFrame = (now) => {
      if (done) return;
      if (start === null) start = now;
      const k = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      const v = win * eased;
      amountEl.textContent = fmt(v);
      xEl.textContent = `×${fmt(v / b)} la mise`;
      setTier(tierFor(v / b));
      const tickStep = Math.floor(k * 40);
      if (tickStep !== last) { last = tickStep; audio.tick(1 + k * 0.8); }
      if (k < 1) requestAnimationFrame(stepFrame); else finish();
    };
    requestAnimationFrame(stepFrame);
  });
}

/* ------------------------- Eye of the Storm (bonus) ------------------------- */

async function eyeOfTheStorm(step) {
  state.inBonus = true;
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
  audio.startMusic();
  await banner('EYE OF THE STORM', 1600);
  await sleep(700);

  board.classList.remove('vanish');
  state.dragon = true;
  state.zoneHits = [0, 0, 0];
  state.stormZones = [false, false, false];
  updateZonesUI();
  await sleep(300);
  grid = step.grid;
  paintAll();
  for (const [c, r] of step.cells) {
    const p = centerOf(cellEl(c, r));
    fx.bolt(center.x, center.y, p.x, p.y, 0.6);
    paintCell(c, r, 'wildborn');
    audio.zap(1);
    await sleep(170);
  }
  $('#eye').classList.remove('show');
  setFreeSpins(`EYE OF THE STORM · ${step.spins} tours gratuits`);
  say(`${step.cells.length} Storm Wilds 🌀 restent en place, le Gardien veille pendant ${step.spins} tours gratuits !`);
  await sleep(700);
}

/* ------------------------- spin ------------------------- */

async function runResult(result) {
  for (const step of result.steps) await play(step);
}

// Pays `cost`, then replays the engine result.
async function playPaid(cost, makeResult) {
  audio.init();
  state.busy = true;
  state.balance -= cost;
  state.spinWin = 0;
  updateUI();

  const result = makeResult();
  await runResult(result);

  if (result.win === 0) {
    say('Pas de combinaison… la tempête se calme.');
  } else if (!result.bonus) {
    const x = result.win / bet();
    if (x >= 50) banner(`ÉNORME GAIN ×${fmt(x)}`, 2200);
    else if (x >= 15) banner(`GROS GAIN ×${fmt(x)}`, 1700);
  }
  state.busy = false;
  updateUI();
  if (state.auto) setTimeout(() => spin(), 700);
}

async function spin(forced) {
  if (state.busy) return;
  if (state.balance < bet() - 1e-9) {
    say('Solde insuffisant : baisse la mise.');
    state.auto = false;
    updateUI();
    return;
  }
  await playPaid(bet(), () => forced || StormEngine.spin(bet(), rng));
}

/* ------------------------- bonus buy ------------------------- */

const BUY_INFO = {
  eye: { icon: 'bonus', lines: ['6 tours gratuits', '1 Storm Wild collant', 'Départ sous la Pluie', 'La tempête monte à chaque cascade'] },
  super: { icon: 'super', lines: ['6 tours gratuits', '1 à 2 Storm Wilds collants', 'Le Gardien frappe à chaque tour', 'Départ sous la Pluie'] },
  mystery: { icon: 'mystery', lines: ['6 tours gratuits', '1 à 2 Storm Wilds collants', 'À chaque tour : 3 à 5 cases cachées', 'Révélées en un même symbole de valeur'] },
  expand: { icon: 'expand', lines: ['6 tours gratuits', '1 à 2 Storm Wilds collants', 'À chaque tour : une colonne entière', "d'un même symbole de valeur, et le Gardien"] },
};

function renderOffers(only) {
  $('#buyBet').textContent = fmt(bet());
  $('#offers').innerHTML = Object.entries(StormEngine.BONUS_BUYS).filter(([kind]) => !only || kind === only).map(([kind, o]) => {
    const price = o.cost * bet();
    const info = BUY_INFO[kind];
    const short = state.balance < price - 1e-9;
    return `<div class="offer offer-${kind}">
      <div class="offer-art"><img class="art" src="img/${info.icon}.webp" alt=""></div>
      <h3>${o.name}</h3>
      <ul>${info.lines.map((l) => `<li>${l}</li>`).join('')}</ul>
      <button class="offer-buy" data-kind="${kind}" ${short ? 'disabled' : ''}>
        Acheter · ${fmt(price)}<small>${o.cost}× la mise${short ? ' · solde insuffisant' : ''}</small>
      </button>
    </div>`;
  }).join('');
}

function openBuy(kind) {
  if (state.busy) return;
  state.auto = false;
  updateUI();
  renderOffers(kind);
  $('#buyTitle').textContent = kind ? StormEngine.BONUS_BUYS[kind].name : 'Acheter un bonus';
  $('#offers').classList.toggle('single', !!kind);
  $('#buyModal').hidden = false;
  $('#buyClose').focus();
}

function closeBuy() {
  $('#buyModal').hidden = true;
  showOffers();
}

let pendingKind = null;

// Second step: "are you sure?" with Yes / No.
function askConfirm(kind) {
  const o = StormEngine.BONUS_BUYS[kind];
  pendingKind = kind;
  $('#confirmArt').src = `img/${BUY_INFO[kind].icon}.webp`;
  $('#confirmText').innerHTML = `Confirmer l'achat de <b>${o.name}</b> pour <b>${fmt(o.cost * bet())}</b> ?`;
  $('#offers').hidden = true;
  $('#buyClose').hidden = true;
  $('.buy-sub').hidden = true;
  $('#buyConfirm').hidden = false;
  $('#confirmNo').focus();
}

function showOffers() {
  pendingKind = null;
  $('#buyConfirm').hidden = true;
  $('#offers').hidden = false;
  $('#buyClose').hidden = false;
  $('.buy-sub').hidden = false;
}

async function buyBonus(kind) {
  const offer = StormEngine.BONUS_BUYS[kind];
  const price = offer.cost * bet();
  if (state.busy || state.balance < price - 1e-9) return;
  closeBuy();
  await playPaid(price, () => StormEngine.buyBonus(kind, bet(), rng));
}

/* ------------------------- weather renderer ------------------------- */

// Sky colours per level: [zenith, middle, horizon].
// 'city': Los Angeles at dusk under the rain. 'mountains': the original valley with lake and ruins.
const SCENERY = 'city';
const CITY = SCENERY === 'city';
const SKY = CITY ? [
  [[22, 16, 52], [86, 36, 98], [214, 104, 72]],
  [[16, 14, 42], [62, 30, 80], [160, 76, 66]],
  [[10, 10, 28], [38, 24, 58], [98, 54, 66]],
  [[6, 14, 18], [22, 42, 44], [74, 96, 76]],
  [[14, 2, 10], [64, 8, 36], [160, 32, 52]],
] : [
  [[20, 30, 46], [42, 56, 76], [86, 98, 116]],
  [[15, 22, 34], [34, 45, 62], [66, 76, 92]],
  [[8, 11, 21], [22, 28, 46], [48, 52, 74]],
  [[5, 13, 13], [20, 40, 37], [76, 104, 84]],
  [[12, 2, 8], [50, 8, 30], [128, 30, 52]],
];
const WIND = [0.08, 0.4, 0.65, 0.9, 1.3];
const RAIN = [70, 160, 280, 420, 620];
const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function makeBolt(x1, y1, x2, y2, power = 1) {
  const pts = [[x1, y1]];
  const segs = 14;
  const spread = 60 * power;
  for (let i = 1; i < segs; i++) {
    const k = i / segs;
    pts.push([x1 + (x2 - x1) * k + (Math.random() - 0.5) * spread, y1 + (y2 - y1) * k + (Math.random() - 0.5) * 12]);
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
  return { pts, branches, life: 1, power };
}

function drawBolt(ctx, b, lvl) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, b.life);
  ctx.strokeStyle = '#eaf6ff';
  ctx.shadowColor = lvl === 4 ? '#ff7aa8' : '#7fd3ff';
  ctx.shadowBlur = 24;
  ctx.lineWidth = 2.5 * b.power;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  b.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.lineWidth = Math.max(0.8, 1.2 * b.power * 0.6);
  for (const br of b.branches) {
    ctx.beginPath();
    br.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  }
  ctx.restore();
  b.life -= 0.06;
}

// Foreground bolts (cell strikes, bonus) — drawn above the UI.
const fx = {
  flash: 0,
  bolts: [],
  hush: false,
  downpour: 0,
  sparks: [],
  coins: [],
  coinShower(n) {
    for (let i = 0; i < n; i++) {
      this.coins.push({ x: rnd(0, W), y: rnd(-H * 0.6, -20), vx: rnd(-0.6, 0.6), vy: rnd(2, 5), r: rnd(7, 14), a: rnd(0, 6), va: rnd(0.08, 0.2) });
    }
  },
  streaks: [],
  rings: [],
  swirl: [],
  gust() {
    for (let i = 0; i < 46; i++) {
      this.streaks.push({ x: rnd(-W * 0.8, -20), y: rnd(0.04, 0.96) * H, len: rnd(90, 280), v: rnd(24, 42), life: 1, amp: rnd(4, 14), ph: rnd(0, 6) });
    }
  },
  ring(x, y, rgbStr) { this.rings.push({ x, y, r: 12, v: 16, life: 1, c: rgbStr }); },
  vortex(x, y) {
    for (let i = 0; i < 90; i++) this.swirl.push({ cx: x, cy: y, a: rnd(0, Math.PI * 2), r: rnd(10, 60), vr: rnd(2.5, 6), va: rnd(0.08, 0.16), life: 1, s: rnd(1.5, 4) });
  },
  bolt(x1, y1, x2, y2, power = 1) { this.bolts.push(makeBolt(x1, y1, x2, y2, power)); },
  burst(x, y, color) {
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 4;
      this.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, life: 1, color, s: 1.5 + Math.random() * 2 });
    }
  },
};

// Scenery state — drawn behind the UI.
const scene = {
  moon: CITY ? 0 : 0.9,
  flash: 0,        // landscape illumination from distant lightning
  bolts: [],
  tornado: 0,
  dragonA: 0,
  dragonX: -400,
  rush: 0,         // speeds up sky changes during a level transition
  glows: [],       // lightning lighting the clouds from inside
  px: 0, py: 0,    // parallax offset (pointer)
  tpx: 0, tpy: 0,
};

const bg = $('#bg');
const fxc = $('#fx');
const bctx = bg.getContext('2d');
const fctx = fxc.getContext('2d');
const cloudLayer = document.createElement('canvas');
const cctx = cloudLayer.getContext('2d');
let W = 0, H = 0, DPR = 1, GROUND = 0;
const sky = SKY[0].map((c) => c.slice());
let wind = WIND[0];
let t = 0;
const drops = [];
const debris = [];
let ranges = [], ruins = null, treesMid = [], treesFront = [];
let grass = [], puddles = [], ripples = [], splashes = [], leaves = [], embers = [], birds = [], stars = [], fog = [];

const lerp = (a, b, k) => a + (b - a) * k;
const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mix = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const rnd = (a, b) => a + Math.random() * (b - a);

/* --- procedural noise: clouds and rock texture --- */
const PERM = (() => {
  const a = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  const p = new Uint8Array(512);
  for (let i = 0; i < 512; i++) p[i] = a[i & 255];
  return p;
})();
const GRAD = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];

// Gradient noise in [-1, 1]; `period` makes it tile horizontally.
function perlin(x, y, period) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const px = period || 4096;
  const X0 = ((xi % px) + px) % px, X1 = (X0 + 1) % px, Y0 = yi & 255, Y1 = (yi + 1) & 255;
  const g = (X, Y, dx, dy) => { const h = GRAD[PERM[PERM[X & 255] + Y] & 7]; return h[0] * dx + h[1] * dy; };
  const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
  const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
  const a = g(X0, Y0, xf, yf) + u * (g(X1, Y0, xf - 1, yf) - g(X0, Y0, xf, yf));
  const b = g(X0, Y1, xf, yf - 1) + u * (g(X1, Y1, xf - 1, yf - 1) - g(X0, Y1, xf, yf - 1));
  return a + v * (b - a);
}

function fbm(x, y, oct, period) {
  let sum = 0, amp = 0.5, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) {
    sum += amp * perlin(x * f, y * f, period ? period * f : 0);
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return sum / norm;
}

const smooth = (a, b, x) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

// A horizontally tiling sheet of volumetric cloud, lit from above. Built at low resolution, drawn scaled up.
function makeCloudSheet(w, h, o) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  const img = g.createImageData(w, h);
  const px = img.data;
  const unit = o.cells / w;
  const dens = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const vy = y / h;
    const env = smooth(0, o.top, vy) * (1 - smooth(o.bottom, 1, vy));
    for (let x = 0; x < w; x++) {
      const n = fbm(x * unit, y * unit * o.squash + o.seed, 5, o.cells) * 1.5 + 0.5;
      dens[y * w + x] = Math.max(0, Math.min(1, (n - o.cover) / 0.32)) * env;
    }
  }
  const off = Math.max(2, Math.round(h * 0.025));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const d = dens[i];
      if (d <= 0.001) { px[i * 4 + 3] = 0; continue; }
      // light comes from the moon, up and to the right: sample the density towards it
      const lx = (x + off) % w, ly = y - off;
      const toward = ly >= 0 ? dens[ly * w + lx] : 0;
      const toward2 = ly - off >= 0 ? dens[(ly - off) * w + (lx + off) % w] : 0;
      const occl = toward * 0.6 + toward2 * 0.4;
      let shade = 0.98 - occl * 0.8 + (d - toward) * 0.3;
      if (d < 0.35 && occl < 0.15) shade += (0.35 - d) * 1.6;          // silver lining on thin edges
      shade = Math.max(0, Math.min(1.25, shade));
      const lum = Math.min(255, 30 + 205 * shade * (0.7 + 0.3 * (1 - y / h)));
      px[i * 4] = lum * 0.92;
      px[i * 4 + 1] = lum * 0.95;
      px[i * 4 + 2] = Math.min(255, lum * 1.04);
      px[i * 4 + 3] = Math.min(255, Math.pow(d, 0.8) * 255 * o.alpha);
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

// Ridged noise gives sharp, natural mountain crests.
function ridged(u, seed, oct = 5) {
  let sum = 0, amp = 0.55, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) {
    const r = 1 - Math.abs(perlin(u * f, seed + i * 7.3));
    sum += amp * r * r;
    norm += amp;
    amp *= 0.5;
    f *= 2.1;
  }
  return sum / norm;
}

// A pine drawn branch by branch, as a black silhouette.
function makePineSprite(h) {
  const w = Math.round(h * 0.5);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.strokeStyle = g.fillStyle = '#000';
  g.lineCap = 'round';
  g.fillRect(w / 2 - h * 0.012, h * 0.35, h * 0.024, h * 0.65);
  const tiers = Math.round(h / 4.2);
  for (let i = 0; i < tiers; i++) {
    const k = i / tiers;
    const y = h * 0.97 - k * h * 0.9;
    const bw = Math.pow(1 - k, 0.85) * w * 0.47 * rnd(0.7, 1.1);
    for (const side of [-1, 1]) {
      g.lineWidth = Math.max(0.8, (1 - k) * h * 0.018);
      g.beginPath();
      g.moveTo(w / 2, y - 2);
      g.quadraticCurveTo(w / 2 + side * bw * 0.5, y - bw * 0.08, w / 2 + side * bw, y + bw * 0.28);
      g.stroke();
      g.lineWidth = Math.max(0.6, g.lineWidth * 0.55);
      for (let n = 0; n < 5; n++) {
        const u = rnd(0.25, 1);
        const bx = w / 2 + side * bw * u, by = y - 1 + bw * 0.28 * u * u;
        g.beginPath();
        g.moveTo(bx, by);
        g.lineTo(bx + side * rnd(0.5, 2.5), by + rnd(1.5, 4.5));
        g.stroke();
      }
    }
  }
  g.beginPath();
  g.moveTo(w / 2 - 1.2, h * 0.08);
  g.lineTo(w / 2, 0);
  g.lineTo(w / 2 + 1.2, h * 0.08);
  g.fill();
  return c;
}

// A bare, storm-bent tree for variety.
function makeDeadTreeSprite(h) {
  const w = Math.round(h * 0.8);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.strokeStyle = '#000';
  g.lineCap = 'round';
  const branch = (x, y, len, ang, width, depth) => {
    const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
    g.lineWidth = width;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo((x + x2) / 2 + rnd(-3, 3), (y + y2) / 2 + rnd(-3, 3), x2, y2);
    g.stroke();
    if (depth <= 0 || len < 4) return;
    const n = depth > 3 ? 2 : 2 + rand(2);
    for (let i = 0; i < n; i++) branch(x2, y2, len * rnd(0.55, 0.78), ang + rnd(-0.75, 0.75), width * 0.66, depth - 1);
  };
  branch(w / 2, h, h * 0.32, -Math.PI / 2 + rnd(-0.1, 0.1), h * 0.045, 6);
  return c;
}

function makeFogSprite() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d');
  const rg = g.createRadialGradient(128, 64, 0, 128, 64, 128);
  rg.addColorStop(0, 'rgba(215,222,234,0.9)');
  rg.addColorStop(0.5, 'rgba(215,222,234,0.35)');
  rg.addColorStop(1, 'rgba(215,222,234,0)');
  g.fillStyle = rg;
  g.fillRect(0, 0, 256, 128);
  return c;
}

// A mountain range from ridged noise, plus a pre-rendered rock texture (slope light, strata) and snow.
function makeRange(y0, amp, cells, seed, snow) {
  const pts = [];
  for (let x = -80; x <= W + 80; x += 4) {
    const u = (x + 80) / (W + 160) * cells;
    // big peaks from low-frequency noise, sharp crests from ridged noise on top
    const big = Math.pow(Math.max(0, Math.min(1, fbm(u, seed, 4) * 1.1 + 0.5)), 1.5);
    const crest = ridged(u * 2.6, seed + 3, 4);
    pts.push([x, y0 - amp * (big * 0.82 + crest * 0.28)]);
  }
  const p = new Path2D();
  p.moveTo(-80, H + 10);
  for (const [x, y] of pts) p.lineTo(x, y);
  p.lineTo(W + 80, H + 10);
  p.closePath();
  const ridge = new Path2D();
  pts.forEach(([x, y], i) => (i ? ridge.lineTo(x, y) : ridge.moveTo(x, y)));

  // texture at 40% resolution
  const S = 0.4;
  const tw = Math.ceil((W + 160) * S), th = Math.ceil(H * S);
  const tex = document.createElement('canvas');
  tex.width = tw;
  tex.height = th;
  const g = tex.getContext('2d');
  const img = g.createImageData(tw, th);
  const d = img.data;
  const snowC = snow ? document.createElement('canvas') : null;
  let sImg = null;
  if (snowC) { snowC.width = tw; snowC.height = th; sImg = snowC.getContext('2d').createImageData(tw, th); }
  const top = Math.min(...pts.map((q) => q[1]));
  for (let X = 0; X < tw; X++) {
    const wx = X / S - 80;
    const idx = Math.max(1, Math.min(pts.length - 2, Math.round((wx + 80) / 4)));
    const ry = pts[idx][1];
    const a0 = Math.max(0, idx - 4), a1 = Math.min(pts.length - 1, idx + 4);
    const slope = (pts[a0][1] - pts[a1][1]) / ((a1 - a0) * 4);        // smoothed; > 0: face turned to the light (left)
    const peak = (y0 - ry) / amp;
    for (let Y = Math.floor(top * S); Y < th; Y++) {
      const wy = Y / S;
      if (wy < ry) continue;
      const depth = wy - ry;
      const fade = Math.exp(-depth / (amp * 0.35));
      const rock = fbm(wx * 0.006, wy * 0.028 + seed, 3);              // stretched: horizontal strata
      const grain = perlin(wx * 0.08, wy * 0.08);
      const lum = Math.max(0, Math.min(1, 0.5 + Math.max(-0.35, Math.min(0.35, slope * 0.45)) * fade + rock * 0.28 + grain * 0.06 - depth / (amp * 5)));
      const i = (Y * tw + X) * 4;
      d[i] = d[i + 1] = d[i + 2] = lum * 255;
      d[i + 3] = 255;
      if (sImg && peak > 0.5) {
        const line = amp * (0.06 + 0.12 * (peak - 0.5)) * (0.7 + 0.6 * (fbm(wx * 0.03, seed + 5, 2) * 0.5 + 0.5));
        if (depth < line) {
          const a = (1 - depth / line) * Math.max(0, Math.min(1, 0.6 + slope * 0.8 + rock * 0.4));
          sImg.data[i] = 225; sImg.data[i + 1] = 232; sImg.data[i + 2] = 245; sImg.data[i + 3] = a * 255;
        }
      }
    }
  }
  g.putImageData(img, 0, 0);
  if (snowC) snowC.getContext('2d').putImageData(sImg, 0, 0);
  return { p, ridge, pts, tex, snow: snowC };
}

function ridgeY(range, x) {
  const i = Math.max(0, Math.min(range.pts.length - 1, Math.round((x + 80) / 5)));
  return range.pts[i][1];
}

function makeRuins(hx, hy, s) {
  // A broken temple of the Ancients: platform, columns (some snapped), a cracked pediment, standing stones.
  const body = new Path2D();
  body.rect(hx - 70 * s, hy - 10 * s, 140 * s, 10 * s);
  body.rect(hx - 60 * s, hy - 16 * s, 120 * s, 6 * s);
  const heights = [66, 66, 40, 66, 52, 66];
  const cols = [];
  heights.forEach((h, i) => {
    const x = hx - 52 * s + i * 20.8 * s;
    body.rect(x - 4 * s, hy - 16 * s - h * s, 8 * s, h * s);
    body.rect(x - 6 * s, hy - 16 * s - h * s - 4 * s, 12 * s, 4 * s);
    cols.push({ x, top: hy - 16 * s - h * s });
  });
  // architrave only over the intact part, with a jagged break
  body.moveTo(hx - 60 * s, hy - 86 * s);
  body.lineTo(hx + 8 * s, hy - 86 * s);
  body.lineTo(hx + 14 * s, hy - 80 * s);
  body.lineTo(hx - 60 * s, hy - 78 * s);
  body.closePath();
  body.moveTo(hx - 62 * s, hy - 86 * s);
  body.lineTo(hx - 20 * s, hy - 112 * s);
  body.lineTo(hx + 2 * s, hy - 100 * s);
  body.lineTo(hx - 4 * s, hy - 94 * s);
  body.lineTo(hx + 10 * s, hy - 86 * s);
  body.closePath();
  // standing stones
  const stones = [[-120, 34, 10], [-100, 46, 12], [105, 40, 11], [128, 28, 9]];
  for (const [dx, h, w] of stones) {
    body.moveTo(hx + dx * s - w * s / 2, hy + 4 * s);
    body.lineTo(hx + dx * s - w * s / 2 + 2 * s, hy - h * s);
    body.lineTo(hx + dx * s + w * s / 2 - 1 * s, hy - h * s - 3 * s);
    body.lineTo(hx + dx * s + w * s / 2, hy + 4 * s);
    body.closePath();
  }
  const runes = [];
  for (const [dx, h] of stones) for (let k = 0; k < 2; k++) runes.push({ x: hx + dx * s, y: hy - h * s * (0.35 + k * 0.3), ph: rnd(0, 6) });
  cols.forEach((c) => runes.push({ x: c.x, y: c.top + 14 * s, ph: rnd(0, 6) }));
  return { body, runes, hx, hy, s };
}

function makeTree(x, h, kind) {
  return { x, h, kind, p: rnd(0, 6), w: rnd(0.8, 1.2), sp: kind === 'dead' ? rand(deadSprites.length) : rand(pineSprites.length) };
}

let cloudSheets = [], pineSprites = [], deadSprites = [], fogSprite = null, vignettes = [];
let BG_DPR = 1;
let moonSprites = [], grainPattern = null, frontSprites = [];
let city = null;

// A full moon with maria, craters and limb darkening, pre-rendered once.
function makeMoonSprite(r, red) {
  const s = Math.ceil(r * 2 + 4);
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  const img = g.createImageData(s, s);
  const d = img.data;
  const cx = s / 2, cy = s / 2;
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const dx = (x - cx) / r, dy = (y - cy) / r, rr = dx * dx + dy * dy;
      if (rr > 1) continue;
      const limb = Math.pow(1 - rr, 0.28);                           // darker towards the edge
      const maria = fbm(dx * 1.6 + 3, dy * 1.6 + 7, 4);               // the dark "seas"
      const crater = Math.abs(perlin(dx * 7 + 11, dy * 7 + 5));       // small crater rims
      let v = 0.92 - Math.max(0, maria) * 0.55 - (crater < 0.06 ? 0.08 : 0) + perlin(dx * 22, dy * 22) * 0.04;
      v = Math.max(0.3, Math.min(1, v)) * limb;
      const i = (y * s + x) * 4;
      const edge = Math.min(1, (1 - Math.sqrt(rr)) * r * 0.8);        // anti-aliased rim
      if (red) { d[i] = 250 * v; d[i + 1] = 95 * v; d[i + 2] = 85 * v; }
      else { d[i] = 236 * v; d[i + 1] = 240 * v; d[i + 2] = 250 * v; }
      d[i + 3] = 255 * edge;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

// Fine film grain, tiled over the scenery.
function makeGrain() {
  const c = document.createElement('canvas');
  c.width = c.height = 160;
  const g = c.getContext('2d');
  const img = g.createImageData(160, 160);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * 90;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

// Blurred copy of a sprite: foreground trees sit out of focus.
function blurredCopy(src, px) {
  const c = document.createElement('canvas');
  c.width = src.width + px * 4;
  c.height = src.height + px * 4;
  const g = c.getContext('2d');
  g.filter = `blur(${px}px)`;
  g.drawImage(src, px * 2, px * 2);
  return c;
}

function resize() {
  DPR = Math.min(1.75, window.devicePixelRatio || 1);
  BG_DPR = Math.min(1.25, window.devicePixelRatio || 1);          // the scenery is soft: fewer pixels, smoother frames
  W = window.innerWidth;
  H = window.innerHeight;
  GROUND = H - Math.max(46, H * 0.07);
  bg.width = W * BG_DPR; bg.height = H * BG_DPR;
  fxc.width = W * DPR; fxc.height = H * DPR;
  bctx.setTransform(BG_DPR, 0, 0, BG_DPR, 0, 0);
  fctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  cloudLayer.width = Math.ceil(W * 0.75);
  cloudLayer.height = Math.ceil(H * 0.75);

  const cw = Math.ceil(Math.max(W, 900) * 0.62);
  cloudSheets = [
    { c: makeCloudSheet(cw, Math.ceil(H * 0.26), { cells: 7, seed: 3.1, cover: 0.44, alpha: 0.95, top: 0.05, bottom: 0.55, squash: 1.9 }), y: -0.02, hk: 0.52, v: 0.18, par: 4 },
    { c: makeCloudSheet(cw, Math.ceil(H * 0.24), { cells: 5, seed: 9.7, cover: 0.5, alpha: 1, top: 0.12, bottom: 0.5, squash: 1.6 }), y: 0.04, hk: 0.48, v: 0.4, par: 9 },
    { c: makeCloudSheet(cw, Math.ceil(H * 0.14), { cells: 4, seed: 21.3, cover: 0.6, alpha: 0.75, top: 0.4, bottom: 0.6, squash: 1.4 }), y: 0.33, hk: 0.28, v: 0.9, par: 14 },
  ];
  cloudSheets.forEach((sh) => (sh.x = rnd(0, 1000)));

  if (!fogSprite) fogSprite = makeFogSprite();
  if (CITY) { buildCity(); } else {
  ranges = [
    makeRange(H * 0.62, H * 0.26, 2.2, 1.7, true),
    makeRange(H * 0.74, H * 0.16, 3.4, 5.3, false),
    makeRange(H * 0.86, H * 0.09, 5, 8.9, false),
  ];
  const hx = W * 0.2;
  ruins = makeRuins(hx, ridgeY(ranges[1], hx) + 6, Math.max(0.45, Math.min(1.1, W / 1300)));

  if (!pineSprites.length) {
    pineSprites = [0, 1, 2, 3, 4, 5].map(() => makePineSprite(Math.round(rnd(150, 200))));
    frontSprites = pineSprites.map((sp) => blurredCopy(sp, 1.6));
    deadSprites = [0, 1].map(() => makeDeadTreeSprite(180));
    fogSprite = makeFogSprite();
  }
  treesMid = [];
  for (let x = -20; x < W + 20; x += rnd(9, 22)) {
    if (Math.abs(x - hx) < 150 * ruins.s) continue;
    treesMid.push(makeTree(x, rnd(24, 52), 'pine'));
  }
  treesFront = [];
  const nf = Math.max(8, Math.round(W / 70));
  for (let i = 0; i < nf; i++) treesFront.push(makeTree((i + rnd(0, 0.8)) * (W / nf), rnd(90, 190), Math.random() < 0.12 ? 'dead' : 'pine'));
  treesFront.sort((a, b) => a.h - b.h);
  treesFront.forEach((tr) => (tr.front = true));
  }

  grass = [];
  for (let x = 0; x < W; x += REDUCED ? 7 : 3.5) grass.push({ x: x + rnd(-1, 1), h: rnd(8, 22), p: rnd(0, 6) });
  puddles = [];
  for (let i = 0; i < Math.max(3, W / 300); i++) puddles.push({ x: rnd(0.05, 0.95) * W, y: GROUND + rnd(10, H - GROUND - 12), rx: rnd(30, 70), ry: rnd(3, 6) });
  stars = [];
  for (let i = 0; i < 90; i++) stars.push({ x: rnd(0, W), y: rnd(0, H * 0.45), r: rnd(0.4, 1.3), p: rnd(0, 6) });
  birds = [0, 1, 2].map((i) => makeFlock(rnd(-0.2, 1) * W, i));
  fog = [];
  for (let i = 0; i < 8; i++) fog.push({ x: rnd(0, W), y: rnd(H * 0.58, GROUND), r: rnd(W * 0.18, W * 0.4), v: rnd(0.1, 0.35), a: rnd(0.5, 1) });
  vignettes = [0, 1, 2, 3, 4].map((l) => {
    const g = bctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.3, W / 2, H * 0.5, Math.max(W, H) * 0.8);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, l === 4 ? 'rgba(40,0,10,0.65)' : `rgba(0,0,0,${0.35 + l * 0.07})`);
    return g;
  });
  scene.glows = [];
  const mr = Math.max(22, Math.min(W, H) * 0.045);
  moonSprites = [makeMoonSprite(mr, false), makeMoonSprite(mr, true)];
  if (!grainPattern) grainPattern = bctx.createPattern(makeGrain(), 'repeat');
}

let resizeTimer = 0;
window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 200); });
window.addEventListener('pointermove', (e) => {
  scene.tpx = (e.clientX / W - 0.5) * 2;
  scene.tpy = (e.clientY / H - 0.5) * 2;
});
resize();

/* --- scenery pieces --- */

function drawSky(lvl) {
  const g = bctx.createLinearGradient(0, 0, 0, GROUND);
  const lit = scene.flash * 0.35;
  g.addColorStop(0, rgb(mix(sky[0], [150, 170, 210], lit)));
  g.addColorStop(0.55, rgb(mix(sky[1], [170, 190, 225], lit)));
  g.addColorStop(1, rgb(mix(sky[2], [200, 215, 240], lit)));
  bctx.fillStyle = g;
  bctx.fillRect(0, 0, W, H);

  // stars through the clouds when calm
  const starA = CITY ? 0 : Math.max(0, scene.moon - 0.4);
  if (starA > 0.01) {
    for (const s of stars) {
      bctx.fillStyle = `rgba(220,230,255,${starA * (0.4 + 0.6 * Math.abs(Math.sin(t * 1.3 + s.p)))})`;
      bctx.fillRect(s.x, s.y, s.r, s.r);
    }
  }

  // moon — fades as the storm swallows it, turns blood red at STORMBOUND
  scene.moon = lerp(scene.moon, (CITY ? [0, 0, 0, 0, 0.5] : [0.9, 0.6, 0.25, 0.08, 0.55])[lvl], 0.01);
  if (scene.moon > 0.02) {
    const mx = W * 0.8 - scene.px * 6, my = H * 0.17 - scene.py * 4, mr = Math.max(22, Math.min(W, H) * 0.045);
    const red = lvl === 4;
    const halo = bctx.createRadialGradient(mx, my, mr * 0.8, mx, my, mr * 5);
    halo.addColorStop(0, red ? `rgba(255,80,90,${0.35 * scene.moon})` : `rgba(200,220,255,${0.25 * scene.moon})`);
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    bctx.fillStyle = halo;
    bctx.fillRect(mx - mr * 5, my - mr * 5, mr * 10, mr * 10);
    const spr = moonSprites[red ? 1 : 0];
    if (spr) {
      bctx.globalAlpha = scene.moon;
      bctx.drawImage(spr, mx - spr.width / 2, my - spr.height / 2);
      bctx.globalAlpha = 1;
    }
    scene.moonPos = { x: mx, y: my, r: mr };
  }
}

// Draws one tiling cloud sheet, tinted to the sky; lightning lights it from inside.
function drawClouds(i, lvl) {
  const sh = cloudSheets[i];
  if (!sh) return;
  const K = 0.75;                                         // cloud layer canvas scale
  const cw = cloudLayer.width, chh = cloudLayer.height;
  cctx.setTransform(1, 0, 0, 1, 0, 0);
  cctx.globalCompositeOperation = 'source-over';
  cctx.globalAlpha = 1;
  cctx.clearRect(0, 0, cw, chh);
  const dw = sh.c.width * 2 * K, dh = H * sh.hk * K;
  sh.x = (sh.x + (0.12 + wind * 1.1) * sh.v) % (dw / K);
  const off = ((sh.x + scene.px * sh.par) * K) % dw;
  const y = (sh.y * H - scene.py * sh.par * 0.5) * K;
  const cover = [0.62, 0.78, 0.9, 0.97, 1][lvl];
  cctx.globalAlpha = i === 2 ? cover * [0.35, 0.6, 0.85, 1, 1][lvl] : cover;
  for (let x = -off; x < cw; x += dw) cctx.drawImage(sh.c, x, y, dw, dh);
  // tint to the sky; storms darken the clouds
  cctx.globalAlpha = 1;
  cctx.globalCompositeOperation = 'source-atop';
  const tint = mix(i === 0 ? sky[1] : sky[0], [0, 0, 0], [0.1, 0.25, 0.45][i]);
  cctx.fillStyle = rgb(tint, [0.45, 0.58, 0.7, 0.78, 0.8][lvl]);
  cctx.fillRect(0, 0, cw, chh);
  // lightning inside the clouds
  if (scene.flash > 0.02 || scene.glows.length) {
    cctx.globalCompositeOperation = 'source-atop';      // light only where there is cloud
    for (const gl of scene.glows) {
      const gx = gl.x * K, gy = gl.y * K, r = gl.r * K;
      const rg = cctx.createRadialGradient(gx, gy, 0, gx, gy, r);
      rg.addColorStop(0, lvl === 4 ? `rgba(255,140,180,${gl.life * 0.55})` : `rgba(190,215,255,${gl.life * 0.55})`);
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      cctx.fillStyle = rg;
      cctx.fillRect(gx - r, gy - r, r * 2, r * 2);
    }
    if (scene.flash > 0.02) {
      cctx.globalCompositeOperation = 'lighter';
      cctx.globalAlpha = scene.flash * 0.35;
      for (let x = -off; x < cw; x += dw) cctx.drawImage(sh.c, x, y, dw, dh);
    }
  }
  cctx.globalCompositeOperation = 'source-over';
  cctx.globalAlpha = 1;
  bctx.drawImage(cloudLayer, 0, 0, W, H);
}

function drawSkyDragon(lvl) {
  const want = state.dragon || lvl === 4 ? 1 : 0;
  scene.dragonA = lerp(scene.dragonA, want, 0.01);
  if (scene.dragonA < 0.02) return;
  scene.dragonX += 1.1 + wind;
  if (scene.dragonX > W + 500) scene.dragonX = -500;
  const s = Math.max(0.6, Math.min(1.4, W / 1000));
  const x = scene.dragonX, y = H * 0.2 + Math.sin(t * 0.5) * 30;
  const flap = Math.sin(t * 2.4);
  bctx.save();
  bctx.translate(x, y);
  bctx.scale(s, s);
  bctx.fillStyle = `rgba(4,6,12,${0.55 * scene.dragonA})`;
  // body + tail
  bctx.beginPath();
  bctx.moveTo(80, 0);
  bctx.quadraticCurveTo(40, -10, 0, 0);
  bctx.quadraticCurveTo(-60, 14, -120, 4 + Math.sin(t * 2) * 8);
  bctx.quadraticCurveTo(-170, -6 + Math.sin(t * 2 + 1) * 10, -210, 8);
  bctx.quadraticCurveTo(-160, 10, -110, 14);
  bctx.quadraticCurveTo(-50, 22, 0, 10);
  bctx.quadraticCurveTo(50, 10, 80, 6);
  // head
  bctx.lineTo(110, 2);
  bctx.lineTo(96, -6);
  bctx.closePath();
  bctx.fill();
  // wings
  for (const side of [-1, 1]) {
    const tip = -70 - flap * 60 * side * (side > 0 ? 1 : 0.8);
    bctx.beginPath();
    bctx.moveTo(30, 2);
    bctx.quadraticCurveTo(-10, tip * 0.6, -40, tip);
    bctx.lineTo(-50, tip * 0.55);
    bctx.lineTo(-70, tip * 0.7);
    bctx.lineTo(-75, tip * 0.35);
    bctx.lineTo(-95, tip * 0.4);
    bctx.quadraticCurveTo(-40, 0, -20, 6);
    bctx.closePath();
    bctx.fill();
  }
  // glowing eye
  bctx.fillStyle = lvl === 4 ? `rgba(255,70,90,${scene.dragonA})` : `rgba(140,220,255,${scene.dragonA})`;
  bctx.beginPath();
  bctx.arc(98, -1, 2.2, 0, Math.PI * 2);
  bctx.fill();
  bctx.restore();
}

function drawRanges(lvl) {
  const base = sky[2];
  const shades = [0.64, 0.8, 0.9];
  const lit = [0.55, 0.38, 0.22];
  ranges.forEach((r, i) => {
    const off = scene.px * (4 + i * 6);
    bctx.save();
    bctx.translate(-off, -scene.py * (2 + i * 2));
    const col = mix(mix(base, [4, 6, 10], shades[i]), [170, 190, 225], scene.flash * lit[i]);
    bctx.fillStyle = rgb(col);
    bctx.fill(r.p);
    // rock texture: light on the faces turned to the sky, strata below
    bctx.globalCompositeOperation = 'overlay';
    bctx.globalAlpha = [0.42, 0.32, 0.22][i] + scene.flash * 0.3;
    bctx.drawImage(r.tex, -80, 0, W + 160, H);
    bctx.globalCompositeOperation = 'source-over';
    bctx.globalAlpha = 1;
    if (r.snow) {
      bctx.globalAlpha = Math.max(0.12, 0.45 - lvl * 0.07) + scene.flash * 0.35;
      bctx.filter = 'blur(1.5px)';                        // soft snow line (ignored where unsupported)
      bctx.drawImage(r.snow, -80, 0, W + 160, H);
      bctx.filter = 'none';
      bctx.globalAlpha = 1;
    }
    if (scene.flash > 0.05) {
      bctx.strokeStyle = `rgba(210,225,255,${scene.flash * 0.45})`;
      bctx.lineWidth = 1.2;
      bctx.stroke(r.ridge);
    }
    // atmospheric perspective: each range sinks into the haze
    const hz = bctx.createLinearGradient(0, H * 0.4, 0, GROUND);
    hz.addColorStop(0, rgb(sky[2], [0.22, 0.12, 0.05][i]));
    hz.addColorStop(1, rgb(sky[2], [0.1, 0.06, 0.02][i]));
    bctx.fillStyle = hz;
    bctx.fill(r.p);
    if (i === 0) { drawTornado(lvl); bctx.restore(); drawClouds(2, lvl); return; }
    if (i === 1) { drawRuins(lvl); drawTrees(treesMid, ranges[1], 0.7, lvl); }
    bctx.restore();
  });
}

function drawRuins(lvl) {
  const R = ruins;
  const col = mix(mix(sky[2], [4, 6, 10], 0.8), [160, 180, 220], scene.flash * 0.3);
  bctx.fillStyle = rgb(col);
  bctx.fill(R.body);
  // glowing runes: stronger as the storm and the Storm Charge grow
  const power = 0.15 + state.level * 0.17 + state.charge / 100 * 0.35;
  const hue = lvl === 4 ? [255, 90, 120] : [120, 210, 255];
  for (const r of R.runes) {
    const a = Math.min(1, power * (0.6 + 0.4 * Math.sin(t * 2 + r.ph)));
    const g = bctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, 10 * R.s);
    g.addColorStop(0, rgb(hue, a));
    g.addColorStop(1, rgb(hue, 0));
    bctx.fillStyle = g;
    bctx.fillRect(r.x - 10 * R.s, r.y - 10 * R.s, 20 * R.s, 20 * R.s);
    bctx.strokeStyle = rgb([230, 245, 255], a);
    bctx.lineWidth = 1;
    bctx.beginPath();
    bctx.moveTo(r.x, r.y - 3 * R.s); bctx.lineTo(r.x, r.y + 3 * R.s);
    bctx.moveTo(r.x - 2 * R.s, r.y - 1 * R.s); bctx.lineTo(r.x + 2 * R.s, r.y + 1 * R.s);
    bctx.stroke();
  }
  // beam of the Ancients towards the sky at high levels
  if (lvl >= 3) {
    const a = (lvl === 4 ? 0.22 : 0.1) * (0.7 + 0.3 * Math.sin(t * 3));
    const bw = 26 * R.s;
    const g = bctx.createLinearGradient(0, 0, 0, R.hy);
    g.addColorStop(0, rgb(hue, 0));
    g.addColorStop(1, rgb(hue, a));
    bctx.fillStyle = g;
    bctx.beginPath();
    bctx.moveTo(R.hx - bw * 0.3, R.hy - 40 * R.s);
    bctx.lineTo(R.hx + bw * 0.3, R.hy - 40 * R.s);
    bctx.lineTo(R.hx + bw, 0);
    bctx.lineTo(R.hx - bw, 0);
    bctx.closePath();
    bctx.fill();
  }
}

function drawTornado(lvl) {
  scene.tornado = lerp(scene.tornado, lvl >= 3 ? 1 : 0, 0.008);
  if (scene.tornado < 0.02) return;
  const bx = W * 0.74, top = H * 0.22, bottom = ridgeY(ranges[1], bx) + 4;
  const n = 26;
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1);
    const y = lerp(top, bottom, k);
    const sway = Math.sin(t * 1.3 + k * 3) * 30 * k + Math.sin(t * 0.4) * 20 * k;
    const w = lerp(90, 8, Math.pow(k, 0.7)) * (0.9 + 0.1 * Math.sin(t * 6 + i));
    bctx.fillStyle = rgb(mix(sky[1], [0, 0, 0], 0.55 - scene.flash * 0.3), 0.35 * scene.tornado);
    bctx.beginPath();
    bctx.ellipse(bx + sway, y, w, 7, 0, 0, Math.PI * 2);
    bctx.fill();
  }
  // dust cloud at the base
  const g = bctx.createRadialGradient(bx + Math.sin(t * 0.4) * 20, bottom, 0, bx, bottom, 70);
  g.addColorStop(0, rgb(sky[1], 0.45 * scene.tornado));
  g.addColorStop(1, rgb(sky[1], 0));
  bctx.fillStyle = g;
  bctx.fillRect(bx - 90, bottom - 70, 180, 90);
}

function drawTree(tr, baseY, scale, alpha) {
  const sway = Math.sin(t * (0.9 + wind * 2.4) * tr.w + tr.p) * (0.01 + wind * 0.045) + wind * 0.05;
  const spr = tr.kind === 'dead' ? deadSprites[tr.sp] : (tr.front ? frontSprites[tr.sp] : pineSprites[tr.sp]);
  const h = tr.h * scale, w = h * spr.width / spr.height;
  bctx.save();
  bctx.translate(tr.x, baseY);
  bctx.rotate(sway);
  bctx.globalAlpha = alpha;
  bctx.drawImage(spr, -w / 2, -h, w, h);
  bctx.restore();
}

function drawTrees(list, range, scale, lvl) {
  for (const tr of list) drawTree(tr, ridgeY(range, tr.x) + 4, scale, 0.82);
  // haze in front of the distant forest
  const hz = bctx.createLinearGradient(0, H * 0.55, 0, H * 0.8);
  hz.addColorStop(0, rgb(sky[2], 0));
  hz.addColorStop(0.6, rgb(sky[2], 0.16 + scene.flash * 0.2));
  hz.addColorStop(1, rgb(sky[2], 0));
  bctx.fillStyle = hz;
  bctx.fillRect(-100, H * 0.55, W + 200, H * 0.25);
}

function makeFlock(x, i = rand(3)) {
  const z = [0.45, 0.7, 1][i % 3] * rnd(0.85, 1.1);
  const n = 3 + rand(6);
  const members = [];
  for (let k = 0; k < n; k++) {
    const rank = Math.ceil(k / 2), side = k % 2 ? -1 : 1;
    members.push({
      dx: -rank * 30 * z, dy: side * rank * 17 * z,          // V formation behind the leader
      jx: rnd(0, 6), jy: rnd(0, 6),                            // personal wobble
      p: rnd(0, Math.PI * 2), fs: rnd(7, 9.5),                 // flap phase and speed
      glide: rand(2) === 0, gt: rnd(0.5, 2.5),                 // gliding or flapping, and for how long
      s: z * rnd(1.15, 1.45),
    });
  }
  return { x, y: rnd(H * 0.1, H * 0.38), z, v: rnd(0.5, 0.9) * (0.6 + z * 0.5), bob: rnd(0, 6), members };
}

function drawBird(x, y, s, flap, bank, color) {
  bctx.save();
  bctx.translate(x, y);
  bctx.rotate(bank);
  bctx.scale(s, s);
  bctx.fillStyle = color;
  // wings: a filled crescent each side; flap in [-1, 1] lifts or lowers the tips
  for (const side of [-1, 1]) {
    const tipY = -flap * 9 - 1;
    bctx.beginPath();
    bctx.moveTo(0, 0);
    bctx.quadraticCurveTo(side * 5, tipY * 0.9 - 3, side * 13, tipY);
    bctx.quadraticCurveTo(side * 6, tipY * 0.35 + 1.5, side * 1, 2);
    bctx.closePath();
    bctx.fill();
  }
  // body, head and tail (flying right)
  bctx.beginPath();
  bctx.ellipse(0.5, 1, 4.2, 1.6, 0, 0, Math.PI * 2);
  bctx.fill();
  bctx.beginPath();
  bctx.arc(4.4, 0.4, 1.3, 0, Math.PI * 2);
  bctx.fill();
  bctx.beginPath();
  bctx.moveTo(-3.5, 0.6);
  bctx.lineTo(-7, -0.6);
  bctx.lineTo(-6.4, 2.6);
  bctx.closePath();
  bctx.fill();
  bctx.restore();
}

function drawBirds(lvl) {
  // Calm skies: gliding flocks. Wind: hurried flapping. From the thunderstorm on, they flee.
  const a = Math.max(0, 1 - lvl * 0.42);
  if (a <= 0.01) return;
  const panic = Math.min(1, lvl * 0.5);
  const dt = 1 / 60;
  for (let f = 0; f < birds.length; f++) {
    const fl = birds[f];
    fl.x += (fl.v + wind * 2.2 * fl.z) * (1 + panic);
    fl.bob += dt * 0.6;
    const vy = Math.cos(fl.bob) * 0.25 - panic * 0.35 * fl.z;
    fl.y += vy;
    if (fl.x - 120 > W || fl.y < -40) { birds[f] = makeFlock(-60 - rnd(0, 400)); continue; }
    const shade = mix(sky[1], [3, 4, 8], 0.72 + fl.z * 0.25);
    const color = rgb(mix(shade, [220, 230, 255], scene.flash * 0.15 * (1 - fl.z)), a * (0.6 + fl.z * 0.4));
    const bank = Math.max(-0.35, Math.min(0.35, vy * 0.35));
    for (const m of fl.members) {
      m.gt -= dt;
      if (m.gt <= 0) { m.glide = panic > 0.4 ? false : !m.glide; m.gt = m.glide ? rnd(1, 3) : rnd(0.8, 2.2); }
      m.p += dt * m.fs * (1 + panic * 0.8);
      // flapping: full strokes; gliding: wings held slightly raised with a small quiver
      const flap = m.glide ? 0.25 + Math.sin(m.p * 0.5) * 0.08 : Math.sin(m.p);
      const x = fl.x + m.dx + Math.sin(t * 0.9 + m.jx) * 3 * fl.z;
      const y = fl.y + m.dy + Math.sin(t * 1.1 + m.jy) * 2.5 * fl.z + (m.glide ? 0 : -Math.sin(m.p) * 0.6);
      drawBird(x, y, m.s * 0.9, flap, bank, color);
    }
  }
}

function drawFog(lvl) {
  for (const f of fog) {
    f.x += f.v + wind * 0.8;
    if (f.x - f.r > W) f.x = -f.r;
    bctx.globalAlpha = (0.1 + lvl * 0.02 + scene.flash * 0.1) * f.a;
    bctx.drawImage(fogSprite, f.x - f.r, f.y - f.r * 0.35, f.r * 2, f.r * 0.7);
  }
  bctx.globalAlpha = 1;
}

function drawGround(lvl) {
  const g = bctx.createLinearGradient(0, GROUND - 10, 0, H);
  g.addColorStop(0, rgb(mix(sky[2], [2, 3, 6], 0.9)));
  g.addColorStop(1, '#010204');
  bctx.fillStyle = g;
  bctx.beginPath();
  bctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 20) bctx.lineTo(x, GROUND + Math.sin(x * 0.01) * 6);
  bctx.lineTo(W, H);
  bctx.closePath();
  bctx.fill();

  // puddles reflect the sky and ripple under the rain
  for (const p of puddles) {
    bctx.fillStyle = rgb(mix(sky[1], [200, 220, 255], scene.flash * 0.6), 0.55);
    bctx.beginPath();
    bctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2);
    bctx.fill();
    if (!fx.hush && Math.random() < 0.08 + lvl * 0.06) ripples.push({ x: p.x + rnd(-p.rx, p.rx) * 0.8, y: p.y + rnd(-p.ry, p.ry) * 0.5, r: 1, life: 1 });
  }
  bctx.lineWidth = 0.8;
  for (const r of ripples) {
    bctx.strokeStyle = `rgba(200,220,245,${0.5 * r.life})`;
    bctx.beginPath();
    bctx.ellipse(r.x, r.y, r.r, r.r * 0.3, 0, 0, Math.PI * 2);
    bctx.stroke();
    r.r += 0.5;
    r.life -= 0.035;
  }
  ripples = ripples.filter((r) => r.life > 0);

  // rain splashes
  const spawn = fx.hush ? 0 : RAIN[lvl] / 90 + (fx.downpour > 0 ? 6 : 0);
  for (let i = 0; i < spawn; i++) {
    const x = rnd(0, W), y = GROUND + rnd(0, H - GROUND);
    for (let k = 0; k < 2; k++) splashes.push({ x, y, vx: rnd(-1, 1) + wind, vy: rnd(-2.2, -1), life: 1 });
  }
  bctx.fillStyle = 'rgba(190,210,240,0.55)';
  for (const s of splashes) {
    s.x += s.vx; s.y += s.vy; s.vy += 0.25; s.life -= 0.08;
    bctx.fillRect(s.x, s.y, 1.2, 1.2);
  }
  splashes = splashes.filter((s) => s.life > 0);
}

function drawForeground(lvl) {
  const off = scene.px * 22;
  bctx.save();
  bctx.translate(-off, 0);
  const col = rgb(mix(sky[2], [1, 2, 4], 0.94));
  for (const tr of treesFront) drawTree(tr, GROUND + 10, 1, 1);
  // grass blades bending in the wind
  bctx.strokeStyle = col;
  bctx.lineWidth = 1.3;
  bctx.beginPath();
  for (const b of grass) {
    const bend = (wind * 0.9 + Math.sin(t * (2 + wind * 4) + b.p + b.x * 0.02) * (0.15 + wind * 0.3)) * b.h;
    const by = H + 2;
    bctx.moveTo(b.x, by);
    bctx.quadraticCurveTo(b.x + bend * 0.3, by - b.h * 0.6, b.x + bend, by - b.h);
  }
  bctx.stroke();
  bctx.restore();
}

function drawAirborne(lvl) {
  // leaves torn off by the wind
  const wantLeaves = REDUCED ? 0 : [0, 18, 34, 50, 70][lvl];
  while (leaves.length < wantLeaves) leaves.push({ x: rnd(-200, W), y: rnd(0, H), s: rnd(2, 5), a: rnd(0, 6), va: rnd(-0.2, 0.2), vy: rnd(-0.5, 0.8), p: rnd(0, 6), c: rand(3) });

  const leafCols = ['rgba(60,80,40,0.85)', 'rgba(100,80,40,0.85)', 'rgba(40,60,50,0.85)'];
  for (const l of leaves) {
    l.x += 1 + wind * 7 * (l.s / 4) + (l.boost || 0);
    if (l.boost) l.boost *= 0.985;
    l.y += l.vy + Math.sin(t * 3 + l.p) * 1.2;
    l.a += l.va + wind * 0.05;
    if (l.x > W + 20 || l.y > H + 20 || l.y < -20) {
      if (leaves.length > wantLeaves) { l.dead = true; continue; }
      l.x = rnd(-120, -10); l.y = rnd(0, H * 0.9); l.boost = 0;
    }
    bctx.save();
    bctx.translate(l.x, l.y);
    bctx.rotate(l.a);
    bctx.scale(1, Math.abs(Math.sin(t * 4 + l.p)) * 0.8 + 0.2);
    bctx.fillStyle = leafCols[l.c];
    bctx.beginPath();
    bctx.ellipse(0, 0, l.s, l.s * 0.45, 0, 0, Math.PI * 2);
    bctx.fill();
    bctx.restore();
  }
  if (leaves.some((l) => l.dead)) leaves = leaves.filter((l) => !l.dead);
  // embers rising at STORMBOUND
  const wantEmbers = lvl === 4 && !REDUCED ? 70 : 0;
  while (embers.length < wantEmbers) embers.push({ x: rnd(0, W), y: rnd(H * 0.5, H), v: rnd(0.4, 1.4), s: rnd(1, 2.6), p: rnd(0, 6) });
  if (embers.length > wantEmbers) embers.length = Math.max(wantEmbers, embers.length - 2);
  for (const e of embers) {
    e.y -= e.v;
    e.x += wind * 1.5 + Math.sin(t * 2 + e.p) * 0.6;
    if (e.y < -10 || e.x > W + 10) { e.y = H + 10; e.x = rnd(-50, W); }
    const a = 0.5 + 0.5 * Math.sin(t * 5 + e.p);
    bctx.fillStyle = `rgba(255,${120 + (a * 80) | 0},90,${0.35 + a * 0.5})`;
    bctx.beginPath();
    bctx.arc(e.x, e.y, e.s, 0, Math.PI * 2);
    bctx.fill();
  }
}

function ambientLightning(lvl) {
  if (fx.hush || REDUCED) return;
  // sheet lightning glowing inside the clouds
  const sheet = [0.001, 0.004, 0.012, 0.02, 0.035][lvl];
  if (Math.random() < sheet) {
    scene.glows.push({ x: rnd(0, W), y: rnd(0.06, 0.3) * H, r: rnd(160, 320), life: 1 });
    if (Math.random() < 0.4) scene.glows.push({ x: rnd(0, W), y: rnd(0.06, 0.3) * H, r: rnd(120, 240), life: 0.7 });
    scene.flash = Math.max(scene.flash, 0.22);
    audio.thunder(0.2, 0.6 + Math.random());
  }
  // real strikes hitting the mountains
  const strikeChance = [0, 0, 0.003, 0.006, 0.013][lvl];
  if (Math.random() < strikeChance) {
    let x = rnd(0.05, 0.95) * W;
    let ty = ridgeY(ranges[rand(2)], x);
    if (CITY && city && city.beacons.length > 1 && Math.random() < 0.6) {
      const b = city.beacons[1 + rand(city.beacons.length - 1)];
      x = b.x; ty = b.y;
    }
    scene.bolts.push(makeBolt(x + rnd(-80, 80), H * rnd(0.12, 0.25), x, ty, 0.9));
    scene.flash = Math.max(scene.flash, 0.9);
    scene.glows.push({ x, y: H * 0.15, r: 380, life: 1 });
    audio.thunder(0.5, 0.25 + Math.random() * 0.6);
  }
  for (const gl of scene.glows) gl.life *= 0.88;
  scene.glows = scene.glows.filter((gl) => gl.life > 0.03);
}

const RAIN_LAYERS = [
  { share: 0.5, v: 7, len: 9, w: 0.6, a: 0.16 },
  { share: 0.32, v: 11, len: 15, w: 0.9, a: 0.26 },
  { share: 0.18, v: 16, len: 26, w: 1.4, a: 0.4 },
];
function drawRain(lvl) {
  const target = fx.hush ? 0 : RAIN[lvl] + (fx.downpour > 0 ? 700 : 0);
  if (fx.downpour > 0) fx.downpour -= 1 / 60;
  while (drops.length < target) {
    const r = Math.random();
    const z = r < RAIN_LAYERS[0].share ? 0 : r < RAIN_LAYERS[0].share + RAIN_LAYERS[1].share ? 1 : 2;
    const L = RAIN_LAYERS[z];
    drops.push({ x: Math.random() * W * 1.4 - W * 0.2, y: Math.random() * -H, z, len: L.len * rnd(0.7, 1.3), v: L.v * rnd(0.85, 1.15) });
  }
  if (drops.length > target) drops.length = Math.max(target, drops.length - 12);
  const tint = lvl === 4 ? '255,190,210' : '185,205,235';
  for (let z = 0; z < 3; z++) {
    const L = RAIN_LAYERS[z];
    bctx.strokeStyle = `rgba(${tint},${L.a + scene.flash * 0.3})`;
    bctx.lineWidth = L.w;
    bctx.beginPath();
    for (const d of drops) {
      if (d.z !== z) continue;
      const dx = wind * d.len * 0.9;
      bctx.moveTo(d.x, d.y);
      bctx.lineTo(d.x + dx, d.y + d.len);
      d.y += d.v;
      d.x += wind * d.v * 0.9;
      if (d.y > H || d.x > W + 50) { d.y = -20 - Math.random() * 100; d.x = Math.random() * W * 1.4 - W * 0.4; }
    }
    bctx.stroke();
  }
}

// Shafts of moonlight falling through gaps in the clouds.
function drawMoonRays(lvl) {
  const m = scene.moonPos;
  if (!m || scene.moon < 0.1 || REDUCED) return;
  bctx.save();
  bctx.globalCompositeOperation = 'lighter';
  const red = lvl === 4;
  for (let i = 0; i < 4; i++) {
    const ang = Math.PI * 0.6 + (i - 1.5) * 0.16 + Math.sin(t * 0.05 + i) * 0.03;
    const len = H * 0.85;
    const wv = 0.07 + 0.03 * Math.sin(t * 0.3 + i * 1.7);
    const a = scene.moon * (0.012 + 0.012 * Math.max(0, Math.sin(t * 0.21 + i * 2.1)));
    const g = bctx.createLinearGradient(m.x, m.y, m.x + Math.cos(ang) * len, m.y + Math.sin(ang) * len);
    g.addColorStop(0, red ? `rgba(255,120,130,${a})` : `rgba(200,220,255,${a})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    bctx.fillStyle = g;
    bctx.beginPath();
    bctx.moveTo(m.x, m.y);
    bctx.lineTo(m.x + Math.cos(ang - wv) * len, m.y + Math.sin(ang - wv) * len);
    bctx.lineTo(m.x + Math.cos(ang + wv) * len, m.y + Math.sin(ang + wv) * len);
    bctx.closePath();
    bctx.fill();
  }
  bctx.restore();
}

// A still lake in the valley that mirrors the sky and mountains, rippled by wind and rain.
function drawLake(lvl) {
  const wl = Math.round(H * 0.8), bottom = GROUND + 12, depth = bottom - wl;
  if (depth < 12) return;
  const k = BG_DPR, strip = 2;
  const amp = 0.6 + wind * 2.2;
  for (let y = 0; y < depth; y += strip) {
    const srcY = wl - y * 0.9 - strip;                       // slightly compressed, like a real reflection
    if (srcY < 0) break;
    const f = y / depth;
    const off = (Math.sin(y * 0.45 - t * 2.4) + 0.6 * Math.sin(y * 0.13 + t * 1.3)) * amp * (1 + f * 4);
    bctx.drawImage(bg, 0, srcY * k, W * k, strip * k, off - 6, wl + y, W + 12, strip);
  }
  // water colour: darker and bluer with depth, brighter in a flash
  const g = bctx.createLinearGradient(0, wl, 0, bottom);
  g.addColorStop(0, rgb(mix(sky[2], [10, 16, 28], 0.4), 0.35 - scene.flash * 0.15));
  g.addColorStop(1, rgb(mix(sky[1], [2, 4, 10], 0.75), 0.8));
  bctx.fillStyle = g;
  bctx.fillRect(0, wl, W, depth);
  // moon glade: a shimmering path of light on the water
  const m = scene.moonPos;
  if (m && scene.moon > 0.1) {
    bctx.save();
    bctx.globalCompositeOperation = 'lighter';
    for (let y = 2; y < depth; y += 3) {
      const f = y / depth;
      const w = m.r * (0.6 + f * 2.6) * (0.5 + 0.5 * Math.abs(Math.sin(y * 0.7 + t * 3)));
      const a = scene.moon * 0.22 * (1 - f * 0.5) * (0.4 + 0.6 * Math.abs(Math.sin(y * 1.3 - t * 4)));
      bctx.fillStyle = lvl === 4 ? `rgba(255,120,120,${a})` : `rgba(220,232,255,${a})`;
      bctx.fillRect(m.x - w / 2 + Math.sin(y * 0.5 + t * 2) * 3, wl + y, w, 1.2);
    }
    bctx.restore();
  }
  // shoreline
  bctx.fillStyle = `rgba(200,215,240,${0.1 + scene.flash * 0.3})`;
  bctx.fillRect(0, wl, W, 1);
  // rain rings on the lake
  if (!fx.hush && Math.random() < 0.3 + lvl * 0.25) ripples.push({ x: rnd(0, W), y: rnd(wl + 3, bottom - 2), r: 1, life: 1 });
}

// Colour grade and film grain: softens the procedural look.
function drawGrade(lvl) {
  if (!grainPattern) return;
  bctx.save();
  bctx.globalCompositeOperation = 'overlay';
  bctx.globalAlpha = 0.07;
  bctx.fillStyle = grainPattern;
  const ox = Math.floor(Math.random() * 160), oy = Math.floor(Math.random() * 160);
  bctx.translate(-ox, -oy);
  bctx.fillRect(0, 0, W + 160, H + 160);
  bctx.restore();
  // cool shadows, a touch of teal in the midtones
  bctx.save();
  bctx.globalCompositeOperation = 'soft-light';
  bctx.fillStyle = lvl === 4 ? 'rgba(90,20,45,0.14)' : 'rgba(40,70,110,0.22)';
  bctx.fillRect(0, 0, W, H);
  bctx.restore();
}

function drawVignette(lvl) {
  bctx.fillStyle = vignettes[lvl];
  bctx.fillRect(0, 0, W, H);
}

/* ------------------------- Los Angeles scenery ------------------------- */


function hiCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * BG_DPR);
  c.height = Math.ceil(h * BG_DPR);
  const g = c.getContext('2d');
  g.scale(BG_DPR, BG_DPR);
  return [c, g];
}

// A palm as a black silhouette: slim curved trunk, drooping fronds with leaflets.
function makePalmSprite(h, lean) {
  const w = Math.round(h * 0.9);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = g.strokeStyle = '#000';
  const bx = w / 2, topX = w / 2 + lean * h * 0.12, topY = h * 0.2;
  // trunk: stacked discs along a curve, thinner at the top, with ring marks
  for (let i = 0; i <= 120; i++) {
    const u = i / 120;
    const x = (1 - u) * (1 - u) * bx + 2 * (1 - u) * u * (bx + lean * h * 0.02) + u * u * topX;
    const y = h - u * (h - topY);
    const r = h * (0.02 - u * 0.009);
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  // fronds
  g.lineCap = 'round';
  const n = 13;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + ((i / (n - 1)) - 0.5) * Math.PI * 1.9 + rnd(-0.12, 0.12);
    const len = h * rnd(0.2, 0.28);
    const droop = Math.abs(Math.cos(a)) * 0.9 + 0.2;
    const ex = topX + Math.cos(a) * len, ey = topY + Math.sin(a) * len * 0.45 + len * droop * 0.55;
    const cx = topX + Math.cos(a) * len * 0.5, cy = topY + Math.sin(a) * len * 0.5 - len * 0.15;
    g.lineWidth = Math.max(1.2, h * 0.006);
    g.beginPath();
    g.moveTo(topX, topY);
    g.quadraticCurveTo(cx, cy, ex, ey);
    g.stroke();
    g.lineWidth = Math.max(0.7, h * 0.0025);
    for (let k = 2; k < 22; k++) {
      const u = k / 22;
      const px = (1 - u) * (1 - u) * topX + 2 * (1 - u) * u * cx + u * u * ex;
      const py = (1 - u) * (1 - u) * topY + 2 * (1 - u) * u * cy + u * u * ey;
      const leaf = len * 0.2 * (1 - u * 0.6);
      for (const side of [-1, 1]) {
        g.beginPath();
        g.moveTo(px, py);
        g.lineTo(px + side * leaf * 0.35 + Math.cos(a) * leaf * 0.3, py + leaf * 0.8);
        g.stroke();
      }
    }
  }
  // dead fronds hanging under the crown
  g.lineWidth = Math.max(1, h * 0.004);
  for (let i = 0; i < 6; i++) {
    const x = topX + rnd(-h * 0.03, h * 0.03);
    g.beginPath();
    g.moveTo(x, topY);
    g.quadraticCurveTo(x + rnd(-8, 8), topY + h * 0.05, x + rnd(-6, 6), topY + h * rnd(0.07, 0.11));
    g.stroke();
  }
  return { c, topX, topY };
}

function buildCity() {
  const horizon = H * 0.64;
  city = { horizon, beacons: [], cars: [], palms: [], midPalms: [] };

  // Hollywood Hills: ridge profile (5px steps from -80, the layout ridgeY expects)
  const pts = [];
  for (let x = -80; x <= W + 80; x += 5) {
    const u = x / W;
    const n = ridged(u * 3.1, 4.2) * 0.65 + (fbm(u * 1.2, 9.1, 3) * 0.5 + 0.5) * 0.55;
    const fall = 1 - smooth(0.42, 0.95, u) * 0.75;
    pts.push([x, horizon - H * 0.22 * n * fall]);
  }
  ranges = [{ pts }, { pts }];
  const hillPath = new Path2D();
  hillPath.moveTo(-80, horizon + 30);
  for (const [x, y] of pts) hillPath.lineTo(x, y);
  hillPath.lineTo(W + 80, horizon + 30);
  hillPath.closePath();
  const [hc, hg] = hiCanvas(W, H);
  const hgrad = hg.createLinearGradient(0, horizon - H * 0.22, 0, horizon + 30);
  hgrad.addColorStop(0, '#221630');
  hgrad.addColorStop(1, '#0d0a18');
  hg.fillStyle = hgrad;
  hg.fill(hillPath);
  hg.save();
  hg.clip(hillPath);
  // texture: soft light and shade on the slopes
  for (let i = 0; i < 260; i++) {
    const x = rnd(0, W), y = rnd(horizon - H * 0.2, horizon + 20);
    const r = rnd(20, 70);
    const gr = hg.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, Math.random() < 0.5 ? 'rgba(255,150,120,0.035)' : 'rgba(0,0,0,0.08)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    hg.fillStyle = gr;
    hg.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // houses lit up on the hillsides, denser near the foot
  for (let i = 0; i < W * 1.4; i++) {
    const x = rnd(0, W);
    const top = ridgeY({ pts }, x);
    const k = Math.pow(Math.random(), 0.6);
    const y = top + 6 + k * (horizon + 20 - top);
    const warm = Math.random() < 0.8;
    hg.fillStyle = warm ? `rgba(255,${rand(40) + 180},${rand(60) + 110},${rnd(0.45, 0.95)})` : `rgba(210,225,255,${rnd(0.4, 0.8)})`;
    const sz = rnd(0.7, 1.5);
    hg.fillRect(x, y, sz, sz);
  }
  hg.restore();
  hg.strokeStyle = 'rgba(255,150,120,0.22)';
  hg.lineWidth = 1.1;
  hg.beginPath();
  pts.forEach(([x, y], i) => (i ? hg.lineTo(x, y) : hg.moveTo(x, y)));
  hg.stroke();
  // transmitter mast on the highest point of the left hills
  let tx = W * 0.3, ty = H;
  for (const [x, y] of pts) if (x > W * 0.15 && x < W * 0.45 && y < ty) { ty = y; tx = x; }
  hg.strokeStyle = '#07050c';
  hg.lineWidth = 1.4;
  hg.beginPath();
  hg.moveTo(tx - 4, ty + 2); hg.lineTo(tx, ty - H * 0.07); hg.lineTo(tx + 4, ty + 2);
  hg.moveTo(tx - 2.5, ty - H * 0.03); hg.lineTo(tx + 2.5, ty - H * 0.03);
  hg.stroke();
  city.beacons.push({ x: tx, y: ty - H * 0.07, p: 0 });
  city.hills = hc;

  // basin: a carpet of city lights in perspective, with avenues converging
  const [lc, lg] = hiCanvas(W, H);
  const ground = lg.createLinearGradient(0, horizon - 6, 0, H);
  ground.addColorStop(0, '#1c1226');
  ground.addColorStop(0.25, '#110b1a');
  ground.addColorStop(1, '#06040b');
  lg.fillStyle = ground;
  lg.fillRect(0, horizon - 2, W, H - horizon + 2);
  // haze where the basin meets the sky
  const seam = lg.createLinearGradient(0, horizon - 14, 0, horizon + 26);
  seam.addColorStop(0, 'rgba(255,140,100,0)');
  seam.addColorStop(0.45, 'rgba(255,140,100,0.16)');
  seam.addColorStop(1, 'rgba(255,140,100,0)');
  lg.fillStyle = seam;
  lg.fillRect(0, horizon - 14, W, 40);
  for (let y = horizon - 2, row = 0; y < H * 0.95; row++) {
    const d = (y - horizon) / (H - horizon);
    const count = Math.round(W / (1.4 + d * 7));
    for (let i = 0; i < count; i++) {
      const x = rnd(-10, W + 10);
      const r = Math.random();
      lg.fillStyle = r < 0.72 ? `rgba(255,${rand(50) + 160},${rand(50) + 80},${rnd(0.35, 0.9)})`
        : r < 0.92 ? `rgba(235,240,255,${rnd(0.35, 0.85)})` : `rgba(${rand(2) ? '120,200,255' : '200,120,255'},${rnd(0.3, 0.7)})`;
      const sz = 0.6 + d * 1.8 * Math.random();
      lg.fillRect(x, y + rnd(-1, 1), sz, sz);
    }
    y += 1.2 + d * 9;
  }
  for (const a of [-4, -3, -2, -1, 1, 2, 3, 4]) {
    const vx = W * rnd(0.3, 0.7);
    const bx = vx + a * W * rnd(0.28, 0.4);
    lg.fillStyle = 'rgba(255,200,120,0.32)';
    for (let u = 0; u < 1; u += 0.004) {
      const x = vx + (bx - vx) * u, y = horizon + (H - horizon) * u * u;
      const sz = 0.8 + u * 2.2;
      lg.fillRect(x, y, sz, sz);
    }
  }
  city.lights = lc;
  // a few lights twinkle
  city.twinkle = [];
  for (let i = 0; i < 70; i++) city.twinkle.push({ x: rnd(0, W), y: horizon + Math.pow(Math.random(), 1.6) * (H * 0.9 - horizon), p: rnd(0, 6) });

  // downtown skyline, right of the machine
  const [sc, sg] = hiCanvas(W, H);
  const drawTowers = (cx, span, maxH, count, far) => {
    const base = horizon + 4;
    const list = [];
    for (let i = 0; i < count; i++) {
      const u = (i + rnd(-0.3, 0.3)) / count;
      const x = cx + (u - 0.5) * span;
      const center = 1 - Math.abs(u - 0.5) * 1.7;
      const h = maxH * Math.max(0.12, center * rnd(0.55, 1.05));
      const w = rnd(14, 34) * (far ? 0.75 : 1);
      list.push({ x, w, h });
    }
    list.sort((a, b) => (far ? 0 : a.h - b.h));
    for (const b of list) {
      const x = b.x - b.w / 2, top = base - b.h;
      const gr = sg.createLinearGradient(x, 0, x + b.w, 0);
      gr.addColorStop(0, far ? '#2a1e3c' : '#1b1428');
      gr.addColorStop(0.35, far ? '#1a1428' : '#0e0b18');
      gr.addColorStop(1, far ? '#120e1e' : '#07060d');
      sg.fillStyle = gr;
      const stepped = Math.random() < 0.35;
      sg.beginPath();
      if (stepped) {
        sg.moveTo(x, base); sg.lineTo(x, top + b.h * 0.12); sg.lineTo(x + b.w * 0.18, top + b.h * 0.12);
        sg.lineTo(x + b.w * 0.18, top); sg.lineTo(x + b.w * 0.82, top); sg.lineTo(x + b.w * 0.82, top + b.h * 0.12);
        sg.lineTo(x + b.w, top + b.h * 0.12); sg.lineTo(x + b.w, base);
      } else sg.rect(x, top, b.w, b.h);
      sg.fill();
      // sunset catching the left edge
      sg.fillStyle = 'rgba(255,140,110,0.18)';
      sg.fillRect(x, top, 1, b.h);
      // windows
      const cols = Math.max(2, Math.floor(b.w / 3.6)), rows = Math.floor(b.h / 4.2);
      const pal = ['255,214,150', '255,236,200', '255,190,110', '190,215,255'];
      const lit = rnd(0.18, 0.45) * (far ? 0.7 : 1);
      for (let r = 2; r < rows - 1; r++) {
        for (let k = 0; k < cols; k++) {
          if (Math.random() > lit) continue;
          sg.fillStyle = `rgba(${pal[rand(pal.length)]},${rnd(0.45, 0.95) * (far ? 0.7 : 1)})`;
          sg.fillRect(x + 1.4 + k * (b.w - 2.8) / cols, top + r * 4.2, 1.5, 2.1);
        }
      }
      // crown lights on the tallest towers
      if (!far && b.h > maxH * 0.7) {
        const col = Math.random() < 0.5 ? '170,110,255' : '110,190,255';
        const cg = sg.createLinearGradient(0, top - 6, 0, top + 12);
        cg.addColorStop(0, `rgba(${col},0)`);
        cg.addColorStop(0.5, `rgba(${col},0.85)`);
        cg.addColorStop(1, `rgba(${col},0)`);
        sg.fillStyle = cg;
        sg.fillRect(x - 2, top - 6, b.w + 4, 18);
        if (Math.random() < 0.6) {
          sg.strokeStyle = '#08060e';
          sg.lineWidth = 1.2;
          sg.beginPath();
          sg.moveTo(x + b.w / 2, top);
          sg.lineTo(x + b.w / 2, top - b.h * 0.12);
          sg.stroke();
          city.beacons.push({ x: x + b.w / 2, y: top - b.h * 0.12, p: rnd(0, 6) });
        } else city.beacons.push({ x: x + b.w / 2, y: top, p: rnd(0, 6) });
      }
    }
  };
  drawTowers(W * 0.8, W * 0.3, H * 0.3, 16, true);
  drawTowers(W * 0.8, W * 0.26, H * 0.4, 14, false);
  drawTowers(W * 0.1, W * 0.1, H * 0.12, 6, true);             // a smaller cluster on the far left
  city.skyline = sc;
  city.skyTop = horizon - H * 0.4;

  // freeways: one sweeping in from the left, one from the right, below the machine's sides
  city.roads = [
    { p0: [-60, H * 0.76], p1: [W * 0.2, H * 0.84], p2: [W * 0.42, H * 1.04] },
    { p0: [W * 0.6, H * 1.04], p1: [W * 0.8, H * 0.82], p2: [W + 60, H * 0.79] },
  ];
  for (const road of city.roads) {
    for (let i = 0; i < 46; i++) city.cars.push({ road, u: Math.random(), lane: i % 2, v: rnd(0.0016, 0.0032) });
  }

  // palms: tall ones framing the scene, small ones along the streets
  const palmSprites = [-1, -0.4, 0.3, 1].map((lean) => makePalmSprite(Math.round(H * 0.8), lean));
  city.palmSprites = palmSprites.map((p) => ({ ...p, blur: blurredCopy(p.c, 1.4) }));
  const front = [[0.02, 0.9], [0.1, 0.72], [0.17, 0.6], [0.84, 0.66], [0.91, 0.84], [0.985, 0.74]];
  city.palms = front.map(([u, hk]) => ({ x: u * W, h: H * hk, sp: rand(palmSprites.length), p: rnd(0, 6), w: rnd(0.8, 1.2) }));
  for (let i = 0; i < 12; i++) {
    const x = rnd(0, W);
    city.midPalms.push({ x, y: horizon + rnd(0.06, 0.2) * H, h: H * rnd(0.05, 0.1), sp: rand(palmSprites.length), p: rnd(0, 6), w: rnd(0.8, 1.2) });
  }
  city.midPalms.sort((a, b) => a.y - b.y);
}

function roadPoint(r, u) {
  const [a, b, c] = [r.p0, r.p1, r.p2];
  const x = (1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * b[0] + u * u * c[0];
  const y = (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * b[1] + u * u * c[1];
  const dx = 2 * (1 - u) * (b[0] - a[0]) + 2 * u * (c[0] - b[0]);
  const dy = 2 * (1 - u) * (b[1] - a[1]) + 2 * u * (c[1] - b[1]);
  const l = Math.hypot(dx, dy) || 1;
  return [x, y, -dy / l, dx / l];
}

function drawCity(lvl) {
  if (!city) return;
  const px = scene.px, py = scene.py;
  // warm glow of the city on the low clouds and the horizon
  const hz = bctx.createLinearGradient(0, city.horizon - H * 0.35, 0, city.horizon + 10);
  hz.addColorStop(0, 'rgba(0,0,0,0)');
  hz.addColorStop(1, lvl === 4 ? 'rgba(255,60,90,0.28)' : lvl === 3 ? 'rgba(150,230,190,0.18)' : 'rgba(255,150,90,0.26)');
  bctx.fillStyle = hz;
  bctx.fillRect(0, city.horizon - H * 0.35, W, H * 0.35 + 10);

  bctx.drawImage(city.hills, -px * 5, -py * 3, W, H);
  if (lvl >= 3) { bctx.save(); bctx.translate(-px * 5, -py * 3); drawTornado(lvl); bctx.restore(); }
  bctx.drawImage(city.skyline, -px * 8, -py * 4, W, H);
  // flash lights up the city
  if (scene.flash > 0.05) {
    bctx.save();
    bctx.globalCompositeOperation = 'lighter';
    bctx.globalAlpha = scene.flash * 0.25;
    bctx.drawImage(city.skyline, -px * 8, -py * 4, W, H);
    bctx.restore();
  }
  bctx.drawImage(city.lights, -px * 12, -py * 5, W, H);
  // twinkling lights and red aircraft beacons
  for (const tw of city.twinkle) {
    const a = 0.5 + 0.5 * Math.sin(t * 3 + tw.p);
    bctx.fillStyle = `rgba(255,230,190,${a * 0.9})`;
    bctx.fillRect(tw.x - px * 12, tw.y - py * 5, 1.6, 1.6);
  }
  for (const b of city.beacons) {
    const on = Math.sin(t * 2.6 + b.p) > 0.55;
    if (!on) continue;
    const x = b.x - px * 8, y = b.y - py * 4;
    const g = bctx.createRadialGradient(x, y, 0, x, y, 7);
    g.addColorStop(0, 'rgba(255,60,60,0.95)');
    g.addColorStop(1, 'rgba(255,40,40,0)');
    bctx.fillStyle = g;
    bctx.fillRect(x - 7, y - 7, 14, 14);
  }
  // palms along the streets
  for (const p of city.midPalms) drawPalm(p, p.x - px * 14, p.y - py * 6, false);
}

function drawFreeways(lvl) {
  if (!city) return;
  bctx.save();
  bctx.translate(-scene.px * 18, 0);
  for (const r of city.roads) {
    // wet asphalt with a sheen
    bctx.strokeStyle = '#08070d';
    bctx.lineWidth = 22;
    bctx.beginPath();
    bctx.moveTo(...r.p0);
    bctx.quadraticCurveTo(...r.p1, ...r.p2);
    bctx.stroke();
    bctx.strokeStyle = `rgba(255,170,120,${0.08 + scene.flash * 0.2})`;
    bctx.lineWidth = 1;
    for (const off of [-11, 11]) {
      bctx.beginPath();
      for (let u = 0; u <= 1.001; u += 0.02) {
        const [x, y, nx, ny] = roadPoint(r, u);
        u ? bctx.lineTo(x + nx * off, y + ny * off) : bctx.moveTo(x + nx * off, y + ny * off);
      }
      bctx.stroke();
    }
  }
  // long-exposure light trails: white headlights one way, red tail lights the other
  bctx.globalCompositeOperation = 'lighter';
  bctx.lineCap = 'round';
  for (const car of city.cars) {
    const dir = car.lane ? -1 : 1;
    car.u += car.v * dir;
    if (car.u > 1) car.u -= 1;
    if (car.u < 0) car.u += 1;
    const [x1, y1, nx, ny] = roadPoint(car.road, car.u);
    const [x0, y0] = roadPoint(car.road, Math.max(0, Math.min(1, car.u - car.v * dir * 14)));
    const off = car.lane ? 5 : -5;
    bctx.strokeStyle = car.lane ? 'rgba(255,60,50,0.75)' : 'rgba(255,240,210,0.8)';
    bctx.lineWidth = 2.2;
    bctx.beginPath();
    bctx.moveTo(x0 + nx * off, y0 + ny * off);
    bctx.lineTo(x1 + nx * off, y1 + ny * off);
    bctx.stroke();
    // reflection of the lights on the wet road
    bctx.strokeStyle = car.lane ? 'rgba(255,60,50,0.18)' : 'rgba(255,240,210,0.16)';
    bctx.lineWidth = 1.4;
    bctx.beginPath();
    bctx.moveTo(x1 + nx * off, y1 + ny * off);
    bctx.lineTo(x1 + nx * off, y1 + ny * off + 12);
    bctx.stroke();
  }
  bctx.restore();
}

function drawPalm(p, x, y, front) {
  const spr = city.palmSprites[p.sp];
  const img = front ? spr.blur : spr.c;
  const pad = front ? (img.width - spr.c.width) / 2 : 0;
  const s = p.h / spr.c.height;
  const sway = Math.sin(t * (0.9 + wind * 2.2) * p.w + p.p) * (0.006 + wind * 0.02) + wind * 0.025;
  bctx.save();
  bctx.translate(x, y);
  bctx.rotate(sway);
  bctx.drawImage(img, -img.width / 2 * s, -(spr.c.height + pad) * s, img.width * s, img.height * s);
  bctx.restore();
}

function drawPalms(lvl) {
  if (!city) return;
  for (const p of city.palms) drawPalm(p, p.x - scene.px * 24, H + 8, true);
}

function drawBackground() {
  const lvl = state.level;
  const skyK = 0.02 + scene.rush * 0.1;
  scene.rush *= 0.97;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) sky[i][j] = lerp(sky[i][j], SKY[lvl][i][j], skyK);
  wind = lerp(wind, WIND[lvl], 0.01);
  const drift = REDUCED ? 0 : 1;
  scene.px = lerp(scene.px, (scene.tpx + Math.sin(t * 0.13) * 0.4) * drift, 0.03);
  scene.py = lerp(scene.py, (scene.tpy * 0.5 + Math.sin(t * 0.09) * 0.2) * drift, 0.03);

  ambientLightning(lvl);
  drawSky(lvl);
  drawClouds(0, lvl);
  drawSkyDragon(lvl);
  for (const b of scene.bolts) drawBolt(bctx, b, lvl);
  scene.bolts = scene.bolts.filter((b) => b.life > 0);
  drawClouds(1, lvl);
  drawMoonRays(lvl);
  drawBirds(lvl);
  if (CITY) {
    drawCity(lvl);
    drawFog(lvl);
    drawFreeways(lvl);
    drawGround(lvl);
    drawPalms(lvl);
  } else {
    drawRanges(lvl);
    drawLake(lvl);
    drawFog(lvl);
    drawGround(lvl);
    drawForeground(lvl);
  }
  drawAirborne(lvl);
  drawRain(lvl);

  // eerie glow behind the board at high levels
  if (lvl >= 3) {
    const c = centerOf(board);
    const rg = bctx.createRadialGradient(c.x, c.y, 10, c.x, c.y, Math.max(W, H) * 0.6);
    rg.addColorStop(0, lvl === 4 ? 'rgba(255,50,110,0.18)' : 'rgba(120,220,180,0.10)');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    bctx.fillStyle = rg;
    bctx.fillRect(0, 0, W, H);
  }
  drawGrade(lvl);
  drawVignette(lvl);
  scene.flash *= 0.9;
  if (scene.flash < 0.01) scene.flash = 0;
}

function drawFx() {
  fctx.clearRect(0, 0, W, H);
  const lvl = state.level;

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

  // bolts
  for (const b of fx.bolts) drawBolt(fctx, b, lvl);
  fx.bolts = fx.bolts.filter((b) => b.life > 0);
  if (fx.flash > 0.3) scene.flash = Math.max(scene.flash, fx.flash * 0.8);

  // level transitions: gust streaks, shockwave rings, vortex debris
  fctx.lineCap = 'round';
  for (const st of fx.streaks) {
    st.x += st.v;
    st.life -= 0.016;
    const a = Math.max(0, st.life) * 0.55;
    fctx.strokeStyle = `rgba(225,240,255,${a})`;
    fctx.lineWidth = 1.5;
    fctx.beginPath();
    for (let k = 0; k <= 8; k++) {
      const px = st.x - st.len + (st.len * k) / 8;
      const py = st.y + Math.sin(k * 0.8 + st.ph + t * 6) * st.amp * (k / 8);
      k ? fctx.lineTo(px, py) : fctx.moveTo(px, py);
    }
    fctx.stroke();
  }
  fx.streaks = fx.streaks.filter((st) => st.life > 0 && st.x - st.len < W + 50);
  for (const rg of fx.rings) {
    rg.r += rg.v;
    rg.v *= 0.97;
    rg.life -= 0.022;
    fctx.strokeStyle = `rgba(${rg.c},${Math.max(0, rg.life)})`;
    fctx.lineWidth = 2 + rg.life * 8;
    fctx.beginPath();
    fctx.arc(rg.x, rg.y, rg.r, 0, Math.PI * 2);
    fctx.stroke();
  }
  fx.rings = fx.rings.filter((rg) => rg.life > 0);
  for (const d of fx.swirl) {
    d.a += d.va;
    d.r += d.vr;
    d.life -= 0.012;
    fctx.fillStyle = `rgba(200,255,225,${Math.max(0, d.life) * 0.8})`;
    fctx.fillRect(d.cx + Math.cos(d.a) * d.r, d.cy + Math.sin(d.a) * d.r * 0.75, d.s * 2, d.s);
  }
  fx.swirl = fx.swirl.filter((d) => d.life > 0);

  // gold coins raining during the bonus win celebration
  for (const c of fx.coins) {
    c.x += c.vx; c.y += c.vy; c.vy += 0.12; c.a += c.va;
    const sx = Math.abs(Math.cos(c.a));               // spinning coin: width shrinks and grows
    fctx.save();
    fctx.translate(c.x, c.y);
    fctx.scale(Math.max(0.12, sx), 1);
    const g = fctx.createRadialGradient(-c.r * 0.3, -c.r * 0.3, 1, 0, 0, c.r);
    g.addColorStop(0, '#fff6c8');
    g.addColorStop(0.5, Math.cos(c.a) > 0 ? '#f5c23e' : '#d59a20');
    g.addColorStop(1, '#8a560c');
    fctx.fillStyle = g;
    fctx.beginPath();
    fctx.arc(0, 0, c.r, 0, Math.PI * 2);
    fctx.fill();
    fctx.strokeStyle = 'rgba(255, 236, 170, 0.8)';
    fctx.lineWidth = 1.2;
    fctx.beginPath();
    fctx.arc(0, 0, c.r * 0.68, 0, Math.PI * 2);
    fctx.stroke();
    fctx.restore();
  }
  fx.coins = fx.coins.filter((c) => c.y < H + 30);

  // sparks from bursting symbols
  for (const sp of fx.sparks) {
    sp.x += sp.vx; sp.y += sp.vy; sp.vy += 0.18; sp.vx *= 0.97; sp.life -= 0.035;
    fctx.globalAlpha = Math.max(0, sp.life);
    fctx.fillStyle = sp.color;
    fctx.beginPath();
    fctx.arc(sp.x, sp.y, sp.s * sp.life + 0.4, 0, Math.PI * 2);
    fctx.fill();
  }
  fctx.globalAlpha = 1;
  fx.sparks = fx.sparks.filter((sp) => sp.life > 0);

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

let lastFrame = 0;
function frame(now) {
  requestAnimationFrame(frame);
  if (now - lastFrame < 15.5) return;                    // 120/144 Hz screens: keep the 60 fps pace
  const dt = Math.min(0.05, (now - lastFrame) / 1000 || 1 / 60);
  lastFrame = now;
  t += dt;
  drawBackground();
  drawFx();
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
    this.rumbleBed = loop('lowpass', 80);
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
    this.rain.g.gain.setTargetAtTime([0.02, 0.03, 0.04, 0.05, 0.06][l], now, 0.8);
    this.wind.g.gain.setTargetAtTime([0, 0.3, 0.45, 0.65, 0.9][l], now, 1.2);
    this.rumbleBed.g.gain.setTargetAtTime([0, 0, 0.3, 0.7, 1.1][l], now, 1.2);
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
  rumble() {
    if (!this.ctx) return;
    this.tone(42, 0.6, 2, 0, 'sine', 30);
    this.burst(this.brown, 'lowpass', 220, 1, 0.3, 2.2, 0, 60);
  },
  tick(pitch = 1) {
    if (this.ctx) this.tone(1400 * pitch, 0.05, 0.05, 0, 'triangle');
  },
  fanfare() {
    if (!this.ctx) return;
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 0.9 - i * 0.1, i * 0.11, 'triangle'));
    this.tone(1047, 0.12, 1.6, 0.44, 'sine');
  },
  pop(n = 1) {
    if (!this.ctx) return;
    this.burst(this.noise, 'bandpass', 1800, Math.min(0.35, 0.1 + n * 0.02), 0.004, 0.18, 0, 500);
    this.tone(520, 0.12, 0.2, 0, 'triangle', 1040);
  },
  thud(power = 1) {
    if (!this.ctx) return;
    this.tone(150, 0.22 * power, 0.16, 0, 'sine', 60);
    this.burst(this.noise, 'lowpass', 900, 0.08 * power, 0.003, 0.06);
  },
  whoosh() { if (this.ctx) this.burst(this.noise, 'bandpass', 700, 0.15, 0.08, 0.35, 0, 2000); },
  gust() { if (this.ctx) this.burst(this.noise, 'bandpass', 300, 0.6, 0.3, 1.4, 0, 1200); },
  downpour() { if (this.ctx) this.burst(this.noise, 'highpass', 900, 0.22, 0.4, 3); },
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
  clack(row = 2) {
    if (!this.ctx) return;
    // a small stone-on-stone knock; lower rows sound a touch deeper
    const f = 2400 - row * 180 + Math.random() * 300;
    this.burst(this.noise, 'bandpass', f, 0.07, 0.002, 0.05);
    this.tone(260 - row * 14 + Math.random() * 20, 0.06, 0.07, 0, 'triangle', 150);
  },
  sweep() {
    if (this.ctx) this.burst(this.noise, 'bandpass', 1600, 0.12, 0.02, 0.3, 0, 300);
  },

  // Bonus music: a looping i–VI–III–VII progression in D minor, generated live.
  startMusic() {
    if (!this.ctx || this.music) return;
    const ctx = this.ctx;
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0.0001, ctx.currentTime);
    bus.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 1.5);
    bus.connect(this.master);
    const m = { bus, step: 0, next: ctx.currentTime + 0.1, timer: 0 };
    const STEP = 0.2;                                   // 16th notes at 75 BPM feel, 8 steps per chord
    const chords = [
      { bass: 73.42, notes: [293.66, 349.23, 440.0] },  // Dm
      { bass: 58.27, notes: [233.08, 293.66, 349.23] }, // Bb
      { bass: 87.31, notes: [349.23, 440.0, 523.25] },  // F
      { bass: 65.41, notes: [261.63, 329.63, 392.0] },  // C
    ];
    const arp = [0, 1, 2, 1, 0, 2, 1, 2];
    const note = (freq, when, dur, type, peak, cutoff) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = cutoff;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(peak, when + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      o.connect(f).connect(g).connect(bus);
      o.start(when);
      o.stop(when + dur + 0.05);
    };
    const kick = (when) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.setValueAtTime(130, when);
      o.frequency.exponentialRampToValueAtTime(38, when + 0.18);
      g.gain.setValueAtTime(0.55, when);
      g.gain.exponentialRampToValueAtTime(0.0001, when + 0.3);
      o.connect(g).connect(bus);
      o.start(when);
      o.stop(when + 0.32);
    };
    const hat = (when, peak) => {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      const f = ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 7000;
      const g = ctx.createGain();
      g.gain.setValueAtTime(peak, when);
      g.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
      src.connect(f).connect(g).connect(bus);
      src.start(when, Math.random());
      src.stop(when + 0.06);
    };
    const schedule = () => {
      while (m.next < ctx.currentTime + 0.4) {
        const t = m.next, i = m.step % 32, ch = chords[Math.floor(i / 8)], k = i % 8;
        if (k === 0) {
          ch.notes.forEach((n) => note(n / 2, t, STEP * 8, 'sawtooth', 0.035, 900));   // pad
          note(ch.bass, t, STEP * 3, 'triangle', 0.3, 400);
        }
        if (k === 3 || k === 6) note(ch.bass, t, STEP * 2, 'triangle', 0.22, 400);
        note(ch.notes[arp[k]] * 2, t, STEP * 1.6, 'triangle', 0.07, 3000);           // arpeggio
        if (k === 0 || k === 4) kick(t);
        hat(t, k % 2 ? 0.05 : 0.025);
        m.step++;
        m.next += STEP;
      }
    };
    schedule();
    m.timer = setInterval(schedule, 100);
    this.music = m;
  },
  stopMusic() {
    const m = this.music;
    if (!m) return;
    this.music = null;
    clearInterval(m.timer);
    const now = this.ctx.currentTime;
    m.bus.gain.cancelScheduledValues(now);
    m.bus.gain.setValueAtTime(m.bus.gain.value, now);
    m.bus.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    setTimeout(() => m.bus.disconnect(), 1500);
  },
  toggle() {
    this.on = !this.on;
    if (this.ctx) this.master.gain.setTargetAtTime(this.on ? 0.8 : 0, this.ctx.currentTime, 0.05);
    return this.on;
  },
};

/* ------------------------- paytable & controls ------------------------- */

function buildPaytable() {
  const x = (v) => fmt(v * CONFIG.payScale);
  const rows = StormEngine.PAYING.slice().reverse().map((k) => {
    const s = SYMBOLS[k];
    return `<div class="pay"><span class="e">${symbolSVG(k)}</span><div><b>${s.name}</b><small>8-9 : ×${x(s.pay[0])} · 10-11 : ×${x(s.pay[1])}<br>12+ : ×${x(s.pay[2])}</small></div></div>`;
  });
  rows.push(`<div class="pay"><span class="e">${symbolSVG('wild')}</span><div><b>Storm Wild</b><small>Remplace tout symbole payant</small></div></div>`);
  rows.push(`<div class="pay"><span class="e">${symbolSVG('charge')}</span><div><b>Charge</b><small>2 et 3 éclairs : événement<br>4 éclairs : Eye of the Storm</small></div></div>`);
  rows.push(`<div class="pay"><span class="e">${symbolSVG('dragon')}</span><div><b>Gardien</b><small>Devient Wild et frappe la grille</small></div></div>`);
  $('#paytable').innerHTML = rows.join('');
  $('#mathInfo').textContent = `RTP théorique ≈ 96 % (simulation) · gain max ×${CONFIG.maxWinX} la mise · valeurs de la table en multiples de la mise.`;
}

$('#spin').addEventListener('click', () => spin());
$('#betUp').addEventListener('click', () => { if (!state.busy) { state.betIdx = Math.min(BETS.length - 1, state.betIdx + 1); updateUI(); } });
$('#betDown').addEventListener('click', () => { if (!state.busy) { state.betIdx = Math.max(0, state.betIdx - 1); updateUI(); } });
$('#auto').addEventListener('click', () => { state.auto = !state.auto; updateUI(); if (state.auto) spin(); });
document.querySelectorAll('.buy-btn').forEach((b) => b.addEventListener('click', () => openBuy(b.dataset.kind)));
$('#buyClose').addEventListener('click', closeBuy);
const openRules = () => { $('#rulesModal').hidden = false; $('#rulesClose').focus(); };
const closeRules = () => { $('#rulesModal').hidden = true; };
$('#rulesBtn').addEventListener('click', openRules);
document.querySelectorAll('.rules-nav a').forEach((a) => a.addEventListener('click', (e) => {
  e.preventDefault();
  document.querySelector(a.getAttribute('href')).scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
}));
$('#rulesClose').addEventListener('click', closeRules);
$('#rulesModal').addEventListener('click', (e) => { if (e.target.id === 'rulesModal') closeRules(); });
$('#confirmYes').addEventListener('click', () => { if (pendingKind) buyBonus(pendingKind); });
$('#confirmNo').addEventListener('click', showOffers);
$('#buyModal').addEventListener('click', (e) => {
  if (e.target.id === 'buyModal') closeBuy();
  const btn = e.target.closest('.offer-buy');
  if (btn && !btn.disabled) askConfirm(btn.dataset.kind);
});
$('#sound').addEventListener('click', (e) => {
  audio.init();
  const on = audio.toggle();
  e.currentTarget.querySelector('use').setAttribute('href', on ? '#sym-icosound' : '#sym-icomute');
  e.currentTarget.classList.toggle('muted', !on);
});
document.addEventListener('keydown', (e) => {
  if (!$('#rulesModal').hidden) { if (e.code === 'Escape') closeRules(); return; }
  if (!$('#buyModal').hidden) { if (e.code === 'Escape') { if (pendingKind) showOffers(); else closeBuy(); } return; }
  if (e.code === 'Space' && !e.repeat && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'SUMMARY') { e.preventDefault(); spin(); }
});

buildPaytable();
paintAll();
updateUI();
updateGauge();
updateWeatherUI();
updateZonesUI();
requestAnimationFrame(frame);

// Test hook (console) : stormbound.bonus() joue un tour qui déclenche l'Eye of the Storm.
window.stormbound = {
  state,
  spin,
  // stormbound.transition(4) rejoue l'entrée d'un niveau (1 à 4).
  transition(l) {
    showLevel(l, LEVELS[l].need, false);
    return levelTransition(l);
  },
  bonus() {
    let r;
    do r = StormEngine.spin(bet(), rng); while (!r.bonus);
    return spin(r);
  },
};
