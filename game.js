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
  $('#auto').classList.toggle('on', state.auto);
}

function updateGauge() {
  $('#gauge .fill').style.width = state.charge + '%';
  $('#chargeVal').textContent = Math.round(state.charge / CONFIG.chargePerBolt);
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
  ds.classList.toggle('active', state.dragon);
  ds.textContent = state.dragon ? '🐉 Le Gardien veille et frappe à chaque éclair' : 'Gardien endormi (🐉 pour l\'invoquer)';
  $('#dragon').classList.toggle('active', state.dragon);
}

function setFreeSpins(text) {
  const el = $('#fsBar');
  el.hidden = !text;
  el.textContent = text || '';
  document.body.classList.toggle('bonus', !!text);
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

function showLevel(level, intensity, announce) {
  const prev = state.level;
  state.intensity = intensity;
  state.level = level;
  document.body.dataset.level = level;
  if (level !== prev) audio.setLevel(level);
  if (announce && level > prev) {
    const L = LEVELS[level];
    banner(`${L.icon} ${L.name.toUpperCase()} ×${L.mult}`);
    if (level >= 2) { fx.flash = 0.6; audio.thunder(0.8); }
  }
  updateWeatherUI();
}

/* ------------------------- replay of engine steps ------------------------- */

const EVENT_NAMES = {
  lightning: '⚡ ÉCLAIR',
  gust: '💨 RAFALE',
  downpour: '🌧️ PLUIE TORRENTIELLE',
  eye: '👁️ ŒIL DU CYCLONE',
};

async function play(step) {
  switch (step.type) {
    case 'start':
      state.charge = 0;
      state.thresholdIdx = 0;
      state.dragon = false;
      state.zoneHits = [0, 0, 0];
      state.stormZones = [false, false, false];
      showLevel(0, 0, false);
      updateGauge();
      updateZonesUI();
      break;

    case 'fill': {
      grid = step.grid;
      const landed = new Set(step.landed.map(([c, r]) => c + ',' + r));
      for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
        if (landed.has(c + ',' + r)) paintCell(c, r, 'drop', c * 55 + (ROWS - r) * 25);
        else paintCell(c, r);
      }
      audio.whoosh();
      await sleep(700);
      break;
    }

    case 'refill':
      grid = step.grid;
      paintAll();
      for (const [c, r] of step.moved) paintCell(c, r, 'fall', c * 20);
      for (const [c, r] of step.landed) paintCell(c, r, 'drop', c * 40 + (ROWS - r) * 30);
      await sleep(520);
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
      banner('🐉 LE GARDIEN SE RÉVEILLE');
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
      if (step.becameStorm) await banner(`🌩️ ZONE ${zn} : ZONE DE TEMPÊTE`);
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
      await sleep(760);
      break;
    }

    case 'intensity':
      showLevel(step.level, step.intensity, true);
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
      } else if (step.name === 'eye') {
        audio.silence(0.35);
        board.classList.add('slow');
        for (const [c, r] of step.cells) {
          cellEl(c, r).querySelector('.sym').textContent = SYMBOLS.mystery.e;
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

    case 'convert':
      grid = step.grid;
      for (const [c, r] of step.cells) paintCell(c, r, 'reveal');
      say(`La rafale pousse les rangées et rassemble les ${SYMBOLS[step.sym].e}`);
      await sleep(500);
      break;

    case 'bonusStart':
      await eyeOfTheStorm(step);
      break;

    case 'freeSpin':
      setFreeSpins(`🌀 EYE OF THE STORM · tour gratuit ${step.n} · encore ${step.left}`);
      await sleep(350);
      break;

    case 'retrigger': {
      await banner(`🌀 +${step.added} TOURS GRATUITS`);
      fx.flash = 1;
      audio.boom();
      grid = step.grid;
      for (const [c, r] of step.cells) paintCell(c, r, 'wildborn');
      setFreeSpins(`🌀 EYE OF THE STORM · encore ${step.spinsLeft}`);
      await sleep(600);
      break;
    }

    case 'bonusEnd':
      state.inBonus = false;
      await banner(`🌀 BONUS : +${fmt(step.win)}`, 2000);
      setFreeSpins('');
      break;

    case 'end':
      break;
  }
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
  await banner('🌀 EYE OF THE STORM', 1600);
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
  setFreeSpins(`🌀 EYE OF THE STORM · ${step.spins} tours gratuits`);
  say(`${step.cells.length} Storm Wilds 🌀 restent en place, le Gardien veille pendant ${step.spins} tours gratuits !`);
  await sleep(700);
}

/* ------------------------- spin ------------------------- */

async function runResult(result) {
  for (const step of result.steps) await play(step);
}

async function spin(forced) {
  if (state.busy) return;
  if (state.balance < bet() - 1e-9) {
    say('Solde insuffisant : baisse la mise.');
    state.auto = false;
    updateUI();
    return;
  }
  audio.init();
  state.busy = true;
  state.balance -= bet();
  state.spinWin = 0;
  updateUI();

  const result = forced || StormEngine.spin(bet(), rng);
  await runResult(result);

  if (result.win === 0) {
    say('Pas de combinaison… la tempête se calme.');
  } else {
    const x = result.win / bet();
    if (x >= 50) banner(`💥 ÉNORME GAIN ×${fmt(x)}`, 2200);
    else if (x >= 15) banner(`✨ GROS GAIN ×${fmt(x)}`, 1700);
  }
  state.busy = false;
  updateUI();
  if (state.auto) setTimeout(() => spin(), 700);
}

/* ------------------------- weather renderer ------------------------- */

// Sky colours per level: [zenith, middle, horizon].
const SKY = [
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
  bolt(x1, y1, x2, y2, power = 1) { this.bolts.push(makeBolt(x1, y1, x2, y2, power)); },
};

// Scenery state — drawn behind the UI.
const scene = {
  flash: 0,        // landscape illumination from distant lightning
  bolts: [],
  tornado: 0,
  moon: 0.9,
  dragonA: 0,
  dragonX: -400,
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
let clouds = [], cloudSprites = [], ranges = [], ruins = null, treesMid = [], treesFront = [];
let grass = [], puddles = [], ripples = [], splashes = [], leaves = [], embers = [], birds = [], stars = [], fog = [];

const lerp = (a, b, k) => a + (b - a) * k;
const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mix = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const rnd = (a, b) => a + Math.random() * (b - a);

function makeCloudSprite(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  const puffs = 46;
  for (let i = 0; i < puffs; i++) {
    const u = Math.random();
    const x = w * (0.12 + u * 0.76);
    const hump = Math.sin(u * Math.PI);                 // taller in the middle
    const r = h * (0.12 + Math.random() * 0.16) * (0.6 + hump * 0.7);
    const y = h * 0.72 - hump * h * 0.3 * Math.random() - r * 0.2;
    const grd = g.createRadialGradient(x - r * 0.2, y - r * 0.45, r * 0.05, x, y, r);
    grd.addColorStop(0, 'rgba(240,244,252,0.95)');
    grd.addColorStop(0.45, 'rgba(170,180,198,0.75)');
    grd.addColorStop(0.85, 'rgba(95,104,124,0.35)');
    grd.addColorStop(1, 'rgba(80,90,110,0)');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  // shadowed flat underside
  const under = g.createLinearGradient(0, h * 0.55, 0, h);
  under.addColorStop(0, 'rgba(40,46,60,0)');
  under.addColorStop(1, 'rgba(40,46,60,0.55)');
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = under;
  g.fillRect(0, 0, w, h);
  return c;
}

function makeRange(y0, amp, freq, jag) {
  const ph = [rnd(0, 9), rnd(0, 9), rnd(0, 9)];
  const pts = [];
  for (let x = -80; x <= W + 80; x += 5) {
    const v = 0.55 * (1 - Math.abs(Math.sin(x * freq + ph[0])))
      + 0.3 * (1 - Math.abs(Math.sin(x * freq * 2.3 + ph[1])))
      + jag * Math.sin(x * freq * 7.1 + ph[2]);
    pts.push([x, y0 - amp * v]);
  }
  const p = new Path2D();
  p.moveTo(-80, H + 10);
  for (const [x, y] of pts) p.lineTo(x, y);
  p.lineTo(W + 80, H + 10);
  p.closePath();
  const ridge = new Path2D();
  pts.forEach(([x, y], i) => (i ? ridge.lineTo(x, y) : ridge.moveTo(x, y)));
  return { p, ridge, pts };
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
  return { x, h, kind, p: rnd(0, 6), w: rnd(0.8, 1.2) };
}

function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth;
  H = window.innerHeight;
  GROUND = H - Math.max(46, H * 0.07);
  for (const cv of [bg, fxc]) { cv.width = W * DPR; cv.height = H * DPR; }
  bctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  fctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  cloudLayer.width = W;
  cloudLayer.height = H;

  const S = Math.min(1.4, Math.max(0.55, W / 1100));
  cloudSprites = [0, 1, 2, 3, 4].map(() => makeCloudSprite(Math.round(460 * S), Math.round(200 * S)));
  clouds = [];
  for (let i = 0; i < 14; i++) {
    const back = i < 8;
    clouds.push({
      back,
      x: rnd(-300, W),
      y: back ? rnd(-40, H * 0.22) : rnd(H * 0.05, H * 0.34),
      s: back ? rnd(0.9, 1.5) : rnd(0.7, 1.2),
      v: back ? rnd(0.5, 0.8) : rnd(1, 1.5),
      sp: rand(cloudSprites.length),
      glow: 0,
    });
  }

  ranges = [
    makeRange(H * 0.62, H * 0.2, 0.0042, 0.05),
    makeRange(H * 0.72, H * 0.17, 0.0065, 0.07),
    makeRange(H * 0.84, H * 0.1, 0.009, 0.05),
  ];
  const hx = W * 0.2;
  ruins = makeRuins(hx, ridgeY(ranges[1], hx) + 6, Math.max(0.45, Math.min(1.1, W / 1300)));

  treesMid = [];
  for (let x = -20; x < W + 20; x += rnd(18, 34)) {
    if (Math.abs(x - hx) < 150 * ruins.s) continue;
    treesMid.push(makeTree(x, rnd(22, 46), Math.random() < 0.75 ? 'pine' : 'oak'));
  }
  treesFront = [];
  const nf = Math.max(7, Math.round(W / 85));
  for (let i = 0; i < nf; i++) treesFront.push(makeTree((i + rnd(0, 0.7)) * (W / nf), rnd(70, 150), Math.random() < 0.7 ? 'pine' : 'oak'));

  grass = [];
  for (let x = 0; x < W; x += REDUCED ? 7 : 3.5) grass.push({ x: x + rnd(-1, 1), h: rnd(8, 22), p: rnd(0, 6) });
  puddles = [];
  for (let i = 0; i < Math.max(3, W / 300); i++) puddles.push({ x: rnd(0.05, 0.95) * W, y: GROUND + rnd(10, H - GROUND - 12), rx: rnd(30, 70), ry: rnd(3, 6) });
  stars = [];
  for (let i = 0; i < 90; i++) stars.push({ x: rnd(0, W), y: rnd(0, H * 0.45), r: rnd(0.4, 1.3), p: rnd(0, 6) });
  birds = [];
  for (let i = 0; i < 7; i++) birds.push({ x: rnd(0, W), y: rnd(H * 0.15, H * 0.4), v: rnd(0.4, 0.9), p: rnd(0, 6), s: rnd(0.7, 1.2) });
  fog = [];
  for (let i = 0; i < 7; i++) fog.push({ x: rnd(0, W), y: rnd(H * 0.6, GROUND), r: rnd(W * 0.15, W * 0.35), v: rnd(0.1, 0.35) });
}
window.addEventListener('resize', resize);
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
  const starA = Math.max(0, scene.moon - 0.4);
  if (starA > 0.01) {
    for (const s of stars) {
      bctx.fillStyle = `rgba(220,230,255,${starA * (0.4 + 0.6 * Math.abs(Math.sin(t * 1.3 + s.p)))})`;
      bctx.fillRect(s.x, s.y, s.r, s.r);
    }
  }

  // moon — fades as the storm swallows it, turns blood red at STORMBOUND
  scene.moon = lerp(scene.moon, [0.9, 0.6, 0.25, 0.08, 0.55][lvl], 0.01);
  if (scene.moon > 0.02) {
    const mx = W * 0.8 - scene.px * 6, my = H * 0.17 - scene.py * 4, mr = Math.max(22, Math.min(W, H) * 0.045);
    const red = lvl === 4;
    const halo = bctx.createRadialGradient(mx, my, mr * 0.8, mx, my, mr * 5);
    halo.addColorStop(0, red ? `rgba(255,80,90,${0.35 * scene.moon})` : `rgba(200,220,255,${0.25 * scene.moon})`);
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    bctx.fillStyle = halo;
    bctx.fillRect(mx - mr * 5, my - mr * 5, mr * 10, mr * 10);
    bctx.fillStyle = red ? `rgba(230,70,70,${scene.moon})` : `rgba(232,238,250,${scene.moon})`;
    bctx.beginPath();
    bctx.arc(mx, my, mr, 0, Math.PI * 2);
    bctx.fill();
    bctx.fillStyle = `rgba(0,0,0,${0.12 * scene.moon})`;
    for (const [dx, dy, r] of [[-0.3, -0.2, 0.22], [0.25, 0.1, 0.16], [-0.05, 0.35, 0.12]]) {
      bctx.beginPath();
      bctx.arc(mx + dx * mr, my + dy * mr, r * mr, 0, Math.PI * 2);
      bctx.fill();
    }
  }
}

function drawCloudLayer(back, lvl) {
  cctx.globalCompositeOperation = 'source-over';
  cctx.clearRect(0, 0, W, H);
  const cover = [0.55, 0.72, 0.86, 0.95, 1][lvl];
  for (const cl of clouds) {
    if (cl.back !== back) continue;
    const spr = cloudSprites[cl.sp];
    const w = spr.width * cl.s, h = spr.height * cl.s;
    cl.x += (0.05 + wind * 1.2) * cl.v;
    if (cl.x > W + 40) { cl.x = -w - rnd(0, 200); cl.y = back ? rnd(-40, H * 0.22) : rnd(H * 0.05, H * 0.34); }
    const x = cl.x - scene.px * (back ? 5 : 10);
    const y = cl.y + Math.sin(t * 0.3 + cl.sp) * 4 - scene.py * (back ? 3 : 6);
    cctx.globalAlpha = cover;
    cctx.drawImage(spr, x, y, w, h);
    // lightning glowing inside the cloud
    if (cl.glow > 0.01) {
      cctx.globalCompositeOperation = 'lighter';
      const gx = x + w * 0.5, gy = y + h * 0.55;
      const rg = cctx.createRadialGradient(gx, gy, 0, gx, gy, w * 0.45);
      rg.addColorStop(0, lvl === 4 ? `rgba(255,150,190,${cl.glow * 0.7})` : `rgba(190,220,255,${cl.glow * 0.7})`);
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      cctx.globalAlpha = 1;
      cctx.fillStyle = rg;
      cctx.fillRect(gx - w * 0.5, gy - w * 0.5, w, w);
      cctx.globalCompositeOperation = 'source-over';
      cl.glow *= 0.9;
    }
  }
  // tint the whole layer to the sky colour; a flash lets the clouds' own light through
  cctx.globalAlpha = 1;
  cctx.globalCompositeOperation = 'source-atop';
  const tint = back ? mix(sky[1], [0, 0, 0], 0.25) : mix(sky[0], [0, 0, 0], 0.35);
  cctx.fillStyle = rgb(tint, Math.max(0.15, 0.78 - scene.flash * 0.6 - (lvl === 0 ? 0.15 : 0)));
  cctx.fillRect(0, 0, W, H);
  cctx.globalCompositeOperation = 'source-over';
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
  const shades = [0.45, 0.68, 0.84];
  const lit = [0.55, 0.38, 0.22];
  ranges.forEach((r, i) => {
    const off = scene.px * (4 + i * 6);
    bctx.save();
    bctx.translate(-off, -scene.py * (2 + i * 2));
    const col = mix(mix(base, [4, 6, 10], shades[i]), [170, 190, 225], scene.flash * lit[i]);
    bctx.fillStyle = rgb(col);
    bctx.fill(r.p);
    if (i === 0 || scene.flash > 0.05) {
      // snow / rim light on the ridge
      bctx.strokeStyle = i === 0 ? `rgba(200,215,240,${0.12 + scene.flash * 0.5})` : `rgba(210,225,255,${scene.flash * 0.4})`;
      bctx.lineWidth = 1.2;
      bctx.stroke(r.ridge);
    }
    // haze between ranges
    const hz = bctx.createLinearGradient(0, H * 0.45, 0, GROUND);
    hz.addColorStop(0, 'rgba(0,0,0,0)');
    hz.addColorStop(1, rgb(sky[2], 0.12));
    bctx.fillStyle = hz;
    bctx.fill(r.p);
    if (i === 1) drawRuins(lvl);
    if (i === 1) drawTrees(treesMid, ranges[1], 0.7, lvl);
    if (i === 0) drawTornado(lvl);
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

function drawTree(tr, baseY, scale, color) {
  const sway = Math.sin(t * (1.1 + wind * 3) * tr.w + tr.p) * (0.02 + wind * 0.08) + wind * 0.12;
  const h = tr.h * scale;
  bctx.save();
  bctx.translate(tr.x, baseY);
  bctx.rotate(sway * 0.6);
  bctx.fillStyle = color;
  bctx.fillRect(-h * 0.03, -h * 0.4, h * 0.06, h * 0.42);
  if (tr.kind === 'pine') {
    for (let k = 0; k < 4; k++) {
      const y0 = -h * (0.18 + k * 0.2);
      const w0 = h * (0.3 - k * 0.06);
      bctx.save();
      bctx.rotate(sway * (k + 1) * 0.35);
      bctx.beginPath();
      bctx.moveTo(-w0, y0);
      bctx.quadraticCurveTo(0, y0 - h * 0.05, w0, y0);
      bctx.lineTo(0, y0 - h * 0.34);
      bctx.closePath();
      bctx.fill();
      bctx.restore();
    }
  } else {
    bctx.rotate(sway * 0.8);
    for (const [dx, dy, r] of [[0, -0.62, 0.26], [-0.2, -0.5, 0.2], [0.2, -0.52, 0.21], [0.05, -0.8, 0.18], [-0.12, -0.72, 0.17]]) {
      bctx.beginPath();
      bctx.arc((dx + sway * 0.3) * h, dy * h, r * h, 0, Math.PI * 2);
      bctx.fill();
    }
  }
  bctx.restore();
}

function drawTrees(list, range, scale, lvl) {
  const col = rgb(mix(mix(sky[2], [3, 5, 8], 0.86), [150, 170, 210], scene.flash * 0.2));
  for (const tr of list) drawTree(tr, ridgeY(range, tr.x) + 3, scale, col);
}

function drawBirds(lvl) {
  const a = Math.max(0, 1 - lvl * 0.45);
  if (a <= 0) return;
  bctx.strokeStyle = `rgba(10,14,22,${0.7 * a})`;
  bctx.lineWidth = 1.4;
  for (const b of birds) {
    b.x += b.v + wind * 2;
    b.y += Math.sin(t + b.p) * 0.2 - lvl * 0.15;
    if (b.x > W + 30) { b.x = -30; b.y = rnd(H * 0.15, H * 0.4); }
    const f = Math.sin(t * 8 + b.p) * 4 * b.s;
    bctx.beginPath();
    bctx.moveTo(b.x - 7 * b.s, b.y - f);
    bctx.quadraticCurveTo(b.x - 3 * b.s, b.y - 1, b.x, b.y);
    bctx.quadraticCurveTo(b.x + 3 * b.s, b.y - 1, b.x + 7 * b.s, b.y - f);
    bctx.stroke();
  }
}

function drawFog(lvl) {
  for (const f of fog) {
    f.x += f.v + wind * 0.8;
    if (f.x - f.r > W) f.x = -f.r;
    const g = bctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
    const c = lvl === 4 ? [120, 40, 60] : mix(sky[2], [200, 210, 225], 0.3);
    g.addColorStop(0, rgb(c, 0.1 + lvl * 0.02 + scene.flash * 0.1));
    g.addColorStop(1, rgb(c, 0));
    bctx.fillStyle = g;
    bctx.fillRect(f.x - f.r, f.y - f.r * 0.4, f.r * 2, f.r * 0.8);
  }
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
  for (const tr of treesFront) drawTree(tr, GROUND + 8, 1, col);
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
  if (leaves.length > wantLeaves) leaves.length = wantLeaves;
  const leafCols = ['rgba(60,80,40,0.85)', 'rgba(100,80,40,0.85)', 'rgba(40,60,50,0.85)'];
  for (const l of leaves) {
    l.x += 1 + wind * 7 * (l.s / 4);
    l.y += l.vy + Math.sin(t * 3 + l.p) * 1.2;
    l.a += l.va + wind * 0.05;
    if (l.x > W + 20 || l.y > H + 20 || l.y < -20) { l.x = rnd(-120, -10); l.y = rnd(0, H * 0.9); }
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
  // sheet lightning inside the clouds
  const sheet = [0.001, 0.004, 0.012, 0.02, 0.035][lvl];
  if (Math.random() < sheet) {
    const cl = clouds[rand(clouds.length)];
    cl.glow = 1;
    scene.flash = Math.max(scene.flash, 0.25);
    if (Math.random() < 0.5) {
      const near = clouds.filter((c) => Math.abs(c.x - cl.x) < 400);
      near.forEach((c) => (c.glow = Math.max(c.glow, 0.6)));
    }
    audio.thunder(0.2, 0.6 + Math.random());
  }
  // real strikes hitting the mountains
  const strikeChance = [0, 0, 0.003, 0.006, 0.013][lvl];
  if (Math.random() < strikeChance) {
    const x = rnd(0.05, 0.95) * W;
    const range = ranges[rand(2)];
    const b = makeBolt(x + rnd(-80, 80), H * rnd(0.12, 0.25), x, ridgeY(range, x), 0.9);
    scene.bolts.push(b);
    scene.flash = Math.max(scene.flash, 0.9);
    clouds.forEach((c) => { if (Math.abs(c.x + 200 - x) < 350) c.glow = 1; });
    audio.thunder(0.5, 0.25 + Math.random() * 0.6);
  }
}

function drawVignette(lvl) {
  const g = bctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.3, W / 2, H * 0.5, Math.max(W, H) * 0.8);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, lvl === 4 ? 'rgba(40,0,10,0.65)' : `rgba(0,0,0,${0.35 + lvl * 0.07})`);
  bctx.fillStyle = g;
  bctx.fillRect(0, 0, W, H);
}

function drawBackground() {
  const lvl = state.level;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) sky[i][j] = lerp(sky[i][j], SKY[lvl][i][j], 0.02);
  wind = lerp(wind, WIND[lvl], 0.01);
  const drift = REDUCED ? 0 : 1;
  scene.px = lerp(scene.px, (scene.tpx + Math.sin(t * 0.13) * 0.4) * drift, 0.03);
  scene.py = lerp(scene.py, (scene.tpy * 0.5 + Math.sin(t * 0.09) * 0.2) * drift, 0.03);

  ambientLightning(lvl);
  drawSky(lvl);
  drawCloudLayer(true, lvl);
  drawSkyDragon(lvl);
  drawBirds(lvl);
  for (const b of scene.bolts) drawBolt(bctx, b, lvl);
  scene.bolts = scene.bolts.filter((b) => b.life > 0);
  drawCloudLayer(false, lvl);
  drawRanges(lvl);
  drawFog(lvl);
  drawGround(lvl);
  drawForeground(lvl);
  drawAirborne(lvl);

  // eerie glow behind the board at high levels
  if (lvl >= 3) {
    const c = centerOf(board);
    const rg = bctx.createRadialGradient(c.x, c.y, 10, c.x, c.y, Math.max(W, H) * 0.6);
    rg.addColorStop(0, lvl === 4 ? 'rgba(255,50,110,0.18)' : 'rgba(120,220,180,0.10)');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    bctx.fillStyle = rg;
    bctx.fillRect(0, 0, W, H);
  }
  drawVignette(lvl);
  scene.flash *= 0.9;
  if (scene.flash < 0.01) scene.flash = 0;
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

  // bolts
  for (const b of fx.bolts) drawBolt(fctx, b, lvl);
  fx.bolts = fx.bolts.filter((b) => b.life > 0);
  if (fx.flash > 0.3) scene.flash = Math.max(scene.flash, fx.flash * 0.8);

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
  const x = (v) => fmt(v * CONFIG.payScale);
  const rows = StormEngine.PAYING.slice().reverse().map((k) => {
    const s = SYMBOLS[k];
    return `<div class="pay"><span class="e">${s.e}</span><div><b>${s.name}</b><small>8-9 : ×${x(s.pay[0])} · 10-11 : ×${x(s.pay[1])}<br>12+ : ×${x(s.pay[2])}</small></div></div>`;
  });
  rows.push(`<div class="pay"><span class="e">🌀</span><div><b>Storm Wild</b><small>Remplace tout symbole payant</small></div></div>`);
  rows.push(`<div class="pay"><span class="e">⚡</span><div><b>Charge</b><small>2 ⚡ et 3 ⚡ : événement<br>4 ⚡ : Eye of the Storm</small></div></div>`);
  rows.push(`<div class="pay"><span class="e">🐉</span><div><b>Gardien</b><small>Devient Wild et frappe la grille</small></div></div>`);
  $('#paytable').innerHTML = rows.join('');
  $('#mathInfo').textContent = `RTP théorique ≈ 96 % (simulation) · gain max ×${CONFIG.maxWinX} la mise · valeurs de la table en multiples de la mise.`;
}

$('#spin').addEventListener('click', () => spin());
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

// Test hook (console) : stormbound.bonus() joue un tour qui déclenche l'Eye of the Storm.
window.stormbound = {
  state,
  spin,
  bonus() {
    let r;
    do r = StormEngine.spin(bet(), rng); while (!r.bonus);
    return spin(r);
  },
};
