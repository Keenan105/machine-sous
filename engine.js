/* =========================================================
   STORMBOUND — moteur mathématique (sans affichage)

   spin(bet, rng) calcule le résultat complet d'une mise :
   tour de base, cascades, événements et, s'il est déclenché,
   le bonus Eye of the Storm avec tous ses tours gratuits.
   Chaque mise est indépendante (aucun état ne passe d'une
   mise à l'autre). L'interface ne fait que rejouer les étapes.
   simulate.js utilise ce même moteur pour mesurer le RTP.
   ========================================================= */
(function (root) {
  'use strict';

  const COLS = 6;
  const ROWS = 5;

  // Tous les réglages mathématiques sont ici. Mesurer avec : node simulate.js
  const CONFIG = {
    minWin: 8,              // symboles identiques requis (Wilds compris)
    minNatural: 4,          // dont au moins N vrais symboles
    payScale: 1.5,           // multiplicateur global de la table des gains (sert à caler le RTP)
    chargePerBolt: 25,      // Storm Charge par ⚡ : 4 ⚡ = Eye of the Storm
    thresholds: [50, 75],   // événements à 2 et 3 ⚡
    freeSpins: 8,           // tours gratuits de l'Eye of the Storm
    retriggerSpins: 3,      // tours ajoutés quand la jauge se remplit pendant le bonus
    bonusWilds: [2, 3],     // Storm Wilds posés par le BOOM (min, max)
    retriggerWilds: 2,
    wildLife: 3,            // vie d'un Storm Wild : -1 par tour gratuit et par cascade gagnante
    maxWinX: 5000,          // plafond de gain par mise, en multiple de la mise
    maxLandingDepth: 10,
    strikeCells: 2,         // cases frappées par le Gardien
    strikeWild: false,      // true : la frappe crée des Wilds, false : des symboles premium
    stormChargeBoost: 1.5,  // zone de tempête : poids des ⚡ multiplié
    stormPremiumBoost: 1.5, // zone de tempête : poids des premiums multiplié
    stormWildWeight: 0.5,   // zone de tempête : poids des Wilds
    lightningCells: [2, 4], // Éclair : cases transformées (min, max)
    gustCells: 2,           // Rafale : cases rassemblées après la poussée
    downpourBias: 0.3,      // Pluie torrentielle : part du symbole favori
    eyeCells: [3, 5],       // Œil du cyclone : cases cachées (min, max)
  };

  // Poids d'apparition : jeu de base / bonus.
  const SYMBOLS = {
    leaf:    { e: '🍃', name: 'Feuille',    w: 13,  pay: [0.25, 0.75, 2] },
    drop:    { e: '💧', name: 'Goutte',     w: 13,  pay: [0.25, 0.75, 2] },
    rock:    { e: '🪨', name: 'Roche',      w: 12,  pay: [0.4, 0.9, 4] },
    ice:     { e: '❄️', name: 'Givre',      w: 12,  pay: [0.5, 1, 5] },
    wolf:    { e: '🐺', name: 'Loup',       w: 11,  pay: [0.8, 1.5, 8] },
    eagle:   { e: '🦅', name: 'Aigle',      w: 10,  pay: [1, 2, 10] },
    trident: { e: '🔱', name: 'Trident',    w: 10,  pay: [1.5, 5, 15] },
    crown:   { e: '👑', name: 'Couronne',   w: 9,   pay: [2.5, 10, 25] },
    charge:  { e: '⚡', name: 'Charge',     w: 1.1 },
    dragon:  { e: '🐉', name: 'Gardien',    w: 0.08 },
    wild:    { e: '🌀', name: 'Storm Wild', w: 0 },
    mystery: { e: '❔', name: 'Caché',      w: 0 },
  };
  const PAYING = ['leaf', 'drop', 'rock', 'ice', 'wolf', 'eagle', 'trident', 'crown'];
  const PREMIUM = ['wolf', 'eagle', 'trident', 'crown'];
  const SPAWNABLE = [...PAYING, 'charge', 'dragon'];

  // L'intensité monte d'un point par cascade gagnante.
  const LEVELS = [
    { name: 'Pluie',        icon: '🌧️', need: 0, mult: 1 },
    { name: 'Vent',         icon: '💨', need: 2, mult: 1.5 },
    { name: 'Orage',        icon: '⚡', need: 4, mult: 2 },
    { name: 'Supercellule', icon: '🌪️', need: 7, mult: 3 },
    { name: 'STORMBOUND',   icon: '🌩️', need: 11, mult: 5 },
  ];

  // Achats de bonus : prix en multiples de la mise, calés par simulation (simulate.js --buy).
  const BONUS_BUYS = {
    eye:   { name: 'Eye of the Storm',       cost: 88,  wilds: [2, 3], startLevel: 1 },
    super: { name: 'Super Eye of the Storm', cost: 141, wilds: [4, 5], startLevel: 2 },
  };

  /* ---------- helpers ---------- */

  const key = (c, r) => c + ',' + r;
  const zoneOf = (c) => Math.floor(c / 2);
  const isSticky = (cell) => cell.s === 'wild' && cell.life > 0;
  const snap = (grid) => grid.map((col) => col.map((cell) => ({ s: cell.s, life: cell.life })));
  const levelFor = (intensity) => {
    let l = 0;
    for (let i = 0; i < LEVELS.length; i++) if (intensity >= LEVELS[i].need) l = i;
    return l;
  };
  const randInt = (rng, n) => Math.floor(rng() * n);

  function pickWeighted(entries, rng) {
    let total = 0;
    for (const [, w] of entries) total += w;
    let x = rng() * total;
    for (const [k, w] of entries) { x -= w; if (x <= 0) return k; }
    return entries[entries.length - 1][0];
  }

  function shuffle(a, rng) {
    for (let i = a.length - 1; i > 0; i--) { const j = randInt(rng, i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  function randomGrid(rng) {
    const grid = [];
    for (let c = 0; c < COLS; c++) {
      grid.push([]);
      for (let r = 0; r < ROWS; r++) grid[c].push({ s: pickWeighted(PAYING.map((k) => [k, SYMBOLS[k].w]), rng), life: 0 });
    }
    return grid;
  }

  /* ---------- context ---------- */

  function newCtx(bet, rng) {
    const grid = [];
    for (let c = 0; c < COLS; c++) { grid.push([]); for (let r = 0; r < ROWS; r++) grid[c].push({ s: 'leaf', life: 0 }); }
    return {
      rng, bet, grid,
      steps: [],
      win: 0,
      cascade: 0,
      charge: 0,
      thresholdIdx: 0,
      intensity: 0,
      level: 0,
      dragon: false,
      zoneHits: [0, 0, 0],
      stormZones: [false, false, false],
      lastZone: -1,
      inBonus: false,
      bonusTriggered: false,
      spinsLeft: 0,
    };
  }

  function genSymbol(ctx, c) {
    const storm = ctx.stormZones[zoneOf(c)];
    const entries = SPAWNABLE.map((k) => {
      let w = SYMBOLS[k].w;
      if (k === 'dragon' && (ctx.dragon || ctx.inBonus)) w = 0;
      if (storm && k === 'charge') w *= CONFIG.stormChargeBoost;
      if (storm && PREMIUM.includes(k)) w *= CONFIG.stormPremiumBoost;
      return [k, w];
    });
    if (storm) entries.push(['wild', CONFIG.stormWildWeight]);
    return pickWeighted(entries, ctx.rng);
  }

  function randomCells(ctx, n, filter) {
    const all = [];
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) if (filter(ctx.grid[c][r], c, r)) all.push([c, r]);
    return shuffle(all, ctx.rng).slice(0, n);
  }

  function mostCommonPaying(ctx) {
    const counts = {};
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
      const s = ctx.grid[c][r].s;
      if (PAYING.includes(s)) counts[s] = (counts[s] || 0) + 1;
    }
    let best = PAYING[randInt(ctx.rng, PAYING.length)], n = -1;
    for (const s of PAYING) if ((counts[s] || 0) > n) { n = counts[s] || 0; best = s; }
    return best;
  }

  function push(ctx, step) {
    step.grid = snap(ctx.grid);
    ctx.steps.push(step);
  }

  function setIntensity(ctx, v) {
    const prev = ctx.level;
    ctx.intensity = Math.max(0, v);
    ctx.level = levelFor(ctx.intensity);
    ctx.steps.push({ type: 'intensity', intensity: ctx.intensity, level: ctx.level, prev });
  }

  function setCharge(ctx, v) {
    ctx.charge = Math.max(0, Math.min(100, v));
    ctx.steps.push({ type: 'charge', charge: ctx.charge, thresholdIdx: ctx.thresholdIdx });
  }

  const capped = (ctx) => ctx.win >= CONFIG.maxWinX * ctx.bet;

  // Remove cells, let the rest fall around sticky wilds, fill from the top.
  function refill(ctx, removed, gen) {
    const g = ctx.grid;
    const landed = [];
    const moved = [];
    for (let c = 0; c < COLS; c++) {
      const slots = [];
      for (let r = 0; r < ROWS; r++) if (!isSticky(g[c][r]) || removed.has(key(c, r))) slots.push(r);
      const kept = [];
      for (let i = slots.length - 1; i >= 0; i--) {
        const r = slots[i];
        if (!removed.has(key(c, r))) kept.push({ cell: g[c][r], from: r });
      }
      let k = 0;
      for (let i = slots.length - 1; i >= 0; i--) {
        const r = slots[i];
        if (k < kept.length) {
          const { cell, from } = kept[k++];
          g[c][r] = cell;
          if (from !== r) moved.push([c, r, from]);
        } else {
          g[c][r] = { s: gen ? gen(c) : genSymbol(ctx, c), life: 0 };
          landed.push([c, r]);
        }
      }
    }
    push(ctx, { type: 'refill', moved, landed });
    return landed;
  }

  function handleLanding(ctx, pos, depth = 0) {
    const g = ctx.grid;
    const dragons = pos.filter(([c, r]) => g[c][r].s === 'dragon');
    if (dragons.length) {
      ctx.dragon = true;
      for (const [c, r] of dragons) g[c][r] = { s: 'wild', life: 0 };
      push(ctx, { type: 'summon', cells: dragons });
      dragonStrike(ctx);
    }
    const charges = pos.filter(([c, r]) => g[c][r].s === 'charge');
    if (charges.length) {
      ctx.steps.push({ type: 'absorb', cells: charges });
      setCharge(ctx, ctx.charge + charges.length * CONFIG.chargePerBolt);
      const safe = depth >= CONFIG.maxLandingDepth
        ? (c) => { const s = genSymbol(ctx, c); return s === 'charge' || s === 'dragon' ? PAYING[randInt(ctx.rng, 4)] : s; }
        : null;
      const landed = refill(ctx, new Set(charges.map(([c, r]) => key(c, r))), safe);
      handleLanding(ctx, landed, depth + 1);
    }
  }

  /* ---------- evaluation ---------- */

  function evaluate(grid) {
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
      if (list.length >= CONFIG.minNatural && list.length + wilds.length >= CONFIG.minWin) {
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

  function payFor(win, bet) {
    const tier = win.total >= 12 ? 2 : win.total >= 10 ? 1 : 0;
    return SYMBOLS[win.s].pay[tier] * CONFIG.payScale * bet;
  }

  function cascadeLoop(ctx) {
    for (let guard = 0; guard < 100; guard++) {
      if (capped(ctx)) return;
      const { wins, removeSet, highlight } = evaluate(ctx.grid);
      if (wins.length) {
        ctx.cascade++;
        const mult = LEVELS[ctx.level].mult;
        let amount = 0;
        const detail = wins.map((w) => { const a = payFor(w, ctx.bet) * mult; amount += a; return { s: w.s, total: w.total, amount: a }; });
        amount = Math.min(amount, CONFIG.maxWinX * ctx.bet - ctx.win);
        ctx.win += amount;
        ctx.steps.push({ type: 'win', wins: detail, amount, mult, cascade: ctx.cascade, highlight, total: ctx.win });
        setIntensity(ctx, ctx.intensity + 1);
        for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
          const cell = ctx.grid[c][r];
          if (isSticky(cell) && --cell.life === 0) removeSet.add(key(c, r));
        }
        const landed = refill(ctx, removeSet);
        handleLanding(ctx, landed);
        continue;
      }
      if (!processCharge(ctx)) return;
    }
  }

  /* ---------- storm events ---------- */

  function processCharge(ctx) {
    if (ctx.thresholdIdx < CONFIG.thresholds.length && ctx.charge >= CONFIG.thresholds[ctx.thresholdIdx]) {
      ctx.thresholdIdx++;
      setCharge(ctx, ctx.charge);
      const events = [eventLightning, eventGust, eventDownpour, eventEyeOfCyclone];
      events[randInt(ctx.rng, events.length)](ctx);
      return true;
    }
    if (ctx.charge >= 100) {
      if (!ctx.inBonus) { ctx.bonusTriggered = true; return false; }  // la jauge reste pleine jusqu'au BOOM
      ctx.thresholdIdx = 0;
      setCharge(ctx, 0);
      retrigger(ctx);
      return true;
    }
    return false;
  }

  function eventLightning(ctx) {
    const target = ctx.rng() < 0.6 ? mostCommonPaying(ctx) : PREMIUM[randInt(ctx.rng, PREMIUM.length)];
    const cells = randomCells(ctx, CONFIG.lightningCells[0] + randInt(ctx.rng, CONFIG.lightningCells[1] - CONFIG.lightningCells[0] + 1), (cell) => cell.s !== target && cell.s !== 'wild');
    for (const [c, r] of cells) ctx.grid[c][r] = { s: target, life: 0 };
    push(ctx, { type: 'event', name: 'lightning', cells, sym: target });
    if (ctx.dragon) dragonStrike(ctx);
  }

  function eventGust(ctx) {
    const g = ctx.grid;
    for (let r = 0; r < ROWS; r++) {
      const dir = r % 2 === 0 ? 1 : -1;
      const row = [];
      for (let c = 0; c < COLS; c++) row.push(g[c][r]);
      for (let c = 0; c < COLS; c++) g[(c + dir + COLS) % COLS][r] = row[c];
    }
    push(ctx, { type: 'event', name: 'gust' });
    const target = mostCommonPaying(ctx);
    const cells = randomCells(ctx, CONFIG.gustCells, (cell) => cell.s !== target && !isSticky(cell));
    for (const [c, r] of cells) g[c][r] = { s: target, life: 0 };
    push(ctx, { type: 'convert', cells, sym: target });
  }

  function eventDownpour(ctx) {
    const favored = pickWeighted([['wolf', 4], ['eagle', 3], ['trident', 2], ['crown', 1], [PAYING[randInt(ctx.rng, 4)], 3]], ctx.rng);
    ctx.steps.push({ type: 'event', name: 'downpour', sym: favored });
    const removed = new Set();
    for (let c = 0; c < COLS; c++) {
      let n = 0;
      for (let r = ROWS - 1; r >= 0 && n < 2; r--) if (!isSticky(ctx.grid[c][r])) { removed.add(key(c, r)); n++; }
    }
    const landed = refill(ctx, removed, (c) => (ctx.rng() < CONFIG.downpourBias ? favored : genSymbol(ctx, c)));
    handleLanding(ctx, landed);
  }

  function eventEyeOfCyclone(ctx) {
    const cells = randomCells(ctx, CONFIG.eyeCells[0] + randInt(ctx.rng, CONFIG.eyeCells[1] - CONFIG.eyeCells[0] + 1), (cell) => !isSticky(cell));
    const sym = pickWeighted([['wolf', 4], ['eagle', 3], ['trident', 2], ['crown', 1]], ctx.rng);
    for (const [c, r] of cells) ctx.grid[c][r] = { s: sym, life: 0 };
    push(ctx, { type: 'event', name: 'eye', cells, sym });
  }

  function dragonStrike(ctx) {
    let z = randInt(ctx.rng, 3);
    if (z === ctx.lastZone) z = (z + 1 + randInt(ctx.rng, 2)) % 3;
    ctx.lastZone = z;
    let becameStorm = false;
    if (!ctx.stormZones[z]) {
      ctx.zoneHits[z]++;
      if (ctx.zoneHits[z] >= 3) { ctx.stormZones[z] = true; becameStorm = true; }
    }
    // The strike transforms a few cells of the zone.
    const sym = CONFIG.strikeWild ? 'wild' : PREMIUM[randInt(ctx.rng, PREMIUM.length)];
    const cells = randomCells(ctx, CONFIG.strikeCells, (cell, c) => zoneOf(c) === z && !isSticky(cell) && cell.s !== 'charge');
    for (const [c, r] of cells) ctx.grid[c][r] = { s: sym, life: 0 };
    push(ctx, { type: 'strike', zone: z, cells, sym, becameStorm, zoneHits: ctx.zoneHits.slice(), stormZones: ctx.stormZones.slice() });
  }

  function placeStormWilds(ctx, n) {
    const cells = randomCells(ctx, n, (cell) => !isSticky(cell));
    for (const [c, r] of cells) ctx.grid[c][r] = { s: 'wild', life: CONFIG.wildLife };
    return cells;
  }

  function retrigger(ctx) {
    ctx.spinsLeft += CONFIG.retriggerSpins;
    const cells = placeStormWilds(ctx, CONFIG.retriggerWilds);
    push(ctx, { type: 'retrigger', cells, spinsLeft: ctx.spinsLeft, added: CONFIG.retriggerSpins });
    setIntensity(ctx, Math.max(ctx.intensity, LEVELS[Math.min(LEVELS.length - 1, ctx.level + 1)].need));
  }

  /* ---------- rounds ---------- */

  function playRound(ctx) {
    const g = ctx.grid;
    const landed = [];
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
      if (!isSticky(g[c][r])) { g[c][r] = { s: genSymbol(ctx, c), life: 0 }; landed.push([c, r]); }
    }
    push(ctx, { type: 'fill', landed });
    handleLanding(ctx, landed);
    if (ctx.inBonus && ctx.dragon) dragonStrike(ctx);
    cascadeLoop(ctx);
  }

  function runBonus(ctx, opts = {}) {
    ctx.inBonus = true;
    ctx.dragon = true;
    ctx.spinsLeft = CONFIG.freeSpins;
    ctx.charge = 0;
    ctx.thresholdIdx = 0;
    ctx.zoneHits = [0, 0, 0];
    ctx.stormZones = [false, false, false];
    const [lo, hi] = opts.wilds || CONFIG.bonusWilds;
    const cells = placeStormWilds(ctx, lo + randInt(ctx.rng, hi - lo + 1));
    const winBefore = ctx.win;
    push(ctx, { type: 'bonusStart', cells, spins: ctx.spinsLeft });
    setCharge(ctx, 0);
    setIntensity(ctx, Math.max(ctx.intensity, LEVELS[opts.startLevel || 1].need));
    let n = 0;
    while (ctx.spinsLeft > 0 && !capped(ctx)) {
      ctx.spinsLeft--;
      n++;
      for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) if (isSticky(ctx.grid[c][r]) && n > 1) ctx.grid[c][r].life--;
      ctx.steps.push({ type: 'freeSpin', n, left: ctx.spinsLeft });
      playRound(ctx);
    }
    ctx.steps.push({ type: 'bonusEnd', win: ctx.win - winBefore, spins: n });
    ctx.inBonus = false;
  }

  /**
   * Résultat complet d'une mise. Aucun état n'est conservé entre deux mises.
   * @returns {{steps: object[], win: number, bonus: boolean}}
   */
  function spin(bet, rng) {
    const ctx = newCtx(bet, rng);
    ctx.steps.push({ type: 'start' });
    playRound(ctx);
    if (ctx.bonusTriggered && !capped(ctx)) runBonus(ctx);
    ctx.steps.push({ type: 'end', win: ctx.win });
    return { steps: ctx.steps, win: ctx.win, bonus: ctx.bonusTriggered };
  }

  /**
   * Achat direct d'un bonus. Le prix (cost × mise) est payé à la place de la mise ;
   * les gains restent calculés sur la mise et plafonnés à maxWinX × mise.
   */
  function buyBonus(kind, bet, rng) {
    const offer = BONUS_BUYS[kind];
    if (!offer) throw new Error('Bonus inconnu : ' + kind);
    const ctx = newCtx(bet, rng);
    // A calm, non-paying grid for the moment before the BOOM.
    do ctx.grid = randomGrid(rng); while (maxCount(ctx.grid) >= CONFIG.minWin - 2);
    ctx.steps.push({ type: 'start' });
    push(ctx, { type: 'buy', kind, cost: offer.cost * bet });
    ctx.bonusTriggered = true;
    runBonus(ctx, offer);
    ctx.steps.push({ type: 'end', win: ctx.win });
    return { steps: ctx.steps, win: ctx.win, bonus: true, cost: offer.cost * bet };
  }

  function maxCount(grid) {
    const n = {};
    for (const col of grid) for (const cell of col) n[cell.s] = (n[cell.s] || 0) + 1;
    return Math.max(...Object.values(n));
  }

  // Deterministic RNG for simulations and replays.
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const api = { COLS, ROWS, CONFIG, SYMBOLS, PAYING, PREMIUM, LEVELS, BONUS_BUYS, spin, buyBonus, randomGrid, levelFor, mulberry32, zoneOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.StormEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
