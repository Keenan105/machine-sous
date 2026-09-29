/* =========================================================
   COCO BOUM! — moteur mathématique (sans affichage)

   spin(mise, rng, { ante }) calcule le résultat complet d'une
   mise : grille 7×6, gains par grappes (5+ symboles voisins),
   dégringolades, œufs à casser et, si 4 Granges tombent, les
   tours gratuits « La Grange en Folie ».
   Chaque mise est indépendante : aucun état ne passe d'une
   mise à l'autre. L'interface ne fait que rejouer les étapes.
   simulate.js utilise ce même moteur pour mesurer le RTP.
   ========================================================= */
(function (root) {
  'use strict';

  const COLS = 7;
  const ROWS = 6;

  // Tous les réglages mathématiques sont ici. Mesurer avec : node simulate.js
  const CONFIG = {
    minCluster: 5,          // symboles voisins (haut/bas/gauche/droite) requis pour gagner
    payScale: 2.52,         // multiplicateur global de la table des gains (sert à caler le RTP)
    fsPayScale: 4.1,        // gains des grappes multipliés pendant les tours gratuits (cale le bonus)
    maxWinX: 10000,         // plafond de gain par mise, en multiple de la mise
    scatterNeed: 4,         // Granges pour déclencher les tours gratuits
    retriggerNeed: 3,       // Granges pour relancer pendant les tours gratuits
    freeSpins: 10,
    retriggerSpins: 5,
    scatterPay: { 4: 3, 5: 5, 6: 100 }, // gains des Granges (× mise), jeu de base
    maxEggs: 6,             // œufs au maximum sur la grille
    cocoChance: 0.12,       // Coco traverse la grille et pond des œufs (jeu de base)
    cocoChanceFs: 0.3,      // idem pendant les tours gratuits
    cocoEggs: [2, 4],       // œufs pondus par Coco (min, max)
    anteCost: 1.25,         // Double Chance : la mise coûte ×1,25…
    anteScatter: 1.135,     // …et les Granges tombent plus souvent (bonus ≈ 2× plus fréquent)
    maxSteps: 80,           // garde-fou contre les boucles
  };

  // Poids d'apparition [jeu de base, tours gratuits, super bonus] et gain de base (× mise, grappe de 5).
  const SYMBOLS = {
    corn:    { name: 'Maïs',    w: [22, 22, 22], pay: 0.2 },
    carrot:  { name: 'Carotte', w: [21, 21, 21], pay: 0.25 },
    apple:   { name: 'Pomme',   w: [20, 20, 20], pay: 0.3 },
    sheep:   { name: 'Mouton',  w: [16, 16, 16], pay: 0.5 },
    pig:     { name: 'Cochon',  w: [14, 14, 14], pay: 0.75 },
    cow:     { name: 'Vache',   w: [12, 12, 12], pay: 1 },
    fox:     { name: 'Renard',  w: [9, 9, 9],    pay: 1.5 },
    barn:    { name: 'Grange',  w: [1.72, 1.3, 1.3] },
    egg:     { name: 'Œuf',     w: [1.6, 6, 9] },
    wild:    { name: 'Poussin', w: [0, 0, 0] },
  };
  const PAYING = ['corn', 'carrot', 'apple', 'sheep', 'pig', 'cow', 'fox'];
  const SPAWNABLE = [...PAYING, 'barn', 'egg'];

  // Gain selon la taille de la grappe : 5, 6, 7 … 15+ (multiplie le gain de base).
  const CURVE = [1, 1.5, 2, 3, 4, 6, 8, 12, 16, 25, 40];

  // Solidité des œufs (coups avant éclosion) : jeu de base, tours gratuits, super bonus.
  const EGG_HP = {
    base:  [[1, 50], [2, 35], [3, 15]],
    fs:    [[1, 60], [2, 30], [3, 10]],
    super: [[1, 70], [2, 25], [3, 5]],
  };

  // Ce qui sort d'un œuf. mult : s'ajoute au Panier. chick : Poussin Wild. dyn : dynamite (explosion 3×3).
  const PRIZES = {
    base:  { kinds: [['mult', 55], ['chick', 28], ['dyn', 17]],
             mult: [[2, 34], [3, 24], [4, 14], [5, 11], [8, 7], [10, 5], [15, 2.5], [25, 1.5], [50, 0.7], [100, 0.3]] },
    fs:    { kinds: [['mult', 58], ['chick', 26], ['dyn', 16]],
             mult: [[2, 30], [3, 22], [4, 14], [5, 12], [8, 8], [10, 6], [15, 3.5], [25, 2.5], [50, 1.3], [100, 0.5], [250, 0.15], [500, 0.05]] },
    super: { kinds: [['mult', 64], ['chick', 22], ['dyn', 14]],
             mult: [[5, 34], [8, 22], [10, 17], [15, 10], [25, 8], [50, 5], [100, 2.8], [250, 0.9], [500, 0.3]] },
  };
  const MODE_IDX = { base: 0, fs: 1, super: 2 };

  // Achats de bonus : prix en multiples de la mise, calés par simulation (simulate.js --buy).
  const BONUS_BUYS = {
    grange: { name: 'La Grange en Folie', cost: 100, mode: 'fs', desc: '10 tours gratuits, Panier persistant' },
    super:  { name: 'Super Grange',       cost: 370, mode: 'super', desc: '10 tours gratuits, œufs en pagaille, multiplicateurs ×5 minimum' },
  };

  /* ---------- outils ---------- */

  const key = (c, r) => c * 16 + r;
  const inGrid = (c, r) => c >= 0 && c < COLS && r >= 0 && r < ROWS;
  const randInt = (rng, n) => Math.floor(rng() * n);
  const round2 = (x) => Math.round(x * 100) / 100;

  function pickWeighted(entries, rng) {
    let total = 0;
    for (const e of entries) total += e[1];
    let x = rng() * total;
    for (const e of entries) { x -= e[1]; if (x < 0) return e[0]; }
    return entries[entries.length - 1][0];
  }

  function shuffle(a, rng) {
    for (let i = a.length - 1; i > 0; i--) { const j = randInt(rng, i + 1); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  const snap = (grid) => grid.map((col) => col.map((x) => ({ ...x })));

  function countOf(grid, s) {
    let n = 0;
    for (const col of grid) for (const x of col) if (x.s === s) n++;
    return n;
  }

  /* ---------- génération ---------- */

  function newCell(ctx, forbidEgg) {
    const mi = MODE_IDX[ctx.mode];
    const entries = SPAWNABLE.map((k) => {
      let w = SYMBOLS[k].w[mi];
      if (k === 'barn' && ctx.ante) w *= CONFIG.anteScatter;
      if (k === 'egg' && (forbidEgg || ctx.eggs >= CONFIG.maxEggs)) w = 0;
      return [k, w];
    });
    return makeCell(ctx, pickWeighted(entries, ctx.rng));
  }

  function makeCell(ctx, s) {
    const cell = { id: ctx.nextId++, s };
    if (s === 'egg') { cell.hp = pickWeighted(EGG_HP[ctx.mode], ctx.rng); ctx.eggs++; }
    return cell;
  }

  function freshGrid(ctx) {
    ctx.eggs = 0;
    const g = [];
    for (let c = 0; c < COLS; c++) { g.push([]); for (let r = 0; r < ROWS; r++) g[c].push(newCell(ctx)); }
    return g;
  }

  // Grille d'affichage (au chargement de la page) : que des symboles simples.
  function randomGrid(rng) {
    const ctx = { rng, mode: 'base', nextId: 1, eggs: CONFIG.maxEggs };
    const g = [];
    for (let c = 0; c < COLS; c++) {
      g.push([]);
      for (let r = 0; r < ROWS; r++) g[c].push(makeCell(ctx, PAYING[randInt(rng, PAYING.length)]));
    }
    return g;
  }

  /* ---------- grappes ---------- */

  function findClusters(grid) {
    const out = [];
    for (const sym of PAYING) {
      const seen = new Set();
      for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
        if (grid[c][r].s !== sym || seen.has(key(c, r))) continue;
        const cells = [];
        const stack = [[c, r]];
        seen.add(key(c, r));
        while (stack.length) {
          const [x, y] = stack.pop();
          cells.push([x, y]);
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy;
            if (!inGrid(nx, ny) || seen.has(key(nx, ny))) continue;
            const s = grid[nx][ny].s;
            if (s === sym || s === 'wild') { seen.add(key(nx, ny)); stack.push([nx, ny]); }
          }
        }
        if (cells.length >= CONFIG.minCluster) out.push({ sym, cells, size: cells.length });
      }
    }
    return out;
  }

  const clusterPay = (sym, size) =>
    SYMBOLS[sym].pay * CURVE[Math.min(size - CONFIG.minCluster, CURVE.length - 1)] * CONFIG.payScale;

  /* ---------- une dégringolade complète ---------- */

  // Joue la grille jusqu'à ce qu'il n'y ait plus de gain. Renvoie le gain (avant Panier) et le Panier.
  function runSequence(ctx, grid) {
    let win = 0;
    let basket = 0;
    let guard = 0;
    while (guard++ < CONFIG.maxSteps) {
      const clusters = findClusters(grid);
      if (!clusters.length) break;

      const removed = new Set();
      let stepWin = 0;
      const wins = clusters.map((cl) => {
        const pay = round2(clusterPay(cl.sym, cl.size) * ctx.bet * (ctx.mode === 'base' ? 1 : CONFIG.fsPayScale));
        stepWin += pay;
        for (const [c, r] of cl.cells) removed.add(key(c, r));
        return { sym: cl.sym, size: cl.size, pay, cells: cl.cells, ids: cl.cells.map(([c, r]) => grid[c][r].id) };
      });
      win += stepWin;
      ctx.steps.push({ type: 'win', clusters: wins, win: round2(stepWin), seqWin: round2(win) });

      // Les œufs touchés par une grappe (8 cases autour) se fêlent.
      const events = [];
      const queue = [];
      const hit = new Set();
      for (const k of removed) {
        const c = Math.floor(k / 16), r = k % 16;
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
          const nx = c + dx, ny = r + dy;
          if (inGrid(nx, ny) && grid[nx][ny].s === 'egg' && !hit.has(key(nx, ny))) { hit.add(key(nx, ny)); queue.push([nx, ny]); }
        }
      }
      const table = PRIZES[ctx.mode];
      const born = new Set();
      while (queue.length) {
        const [c, r] = queue.shift();
        const egg = grid[c][r];
        if (egg.s !== 'egg') continue;
        egg.hp--;
        if (egg.hp > 0) { events.push({ t: 'crack', c, r, id: egg.id, hp: egg.hp }); continue; }

        const kind = pickWeighted(table.kinds, ctx.rng);
        ctx.eggs--;
        if (kind === 'mult') {
          const v = pickWeighted(table.mult, ctx.rng);
          basket += v;
          egg.s = 'hatched';
          removed.add(key(c, r));
          events.push({ t: 'mult', c, r, id: egg.id, value: v, basket });
        } else if (kind === 'chick') {
          egg.s = 'wild';
          delete egg.hp;
          removed.delete(key(c, r));
          born.add(key(c, r));
          events.push({ t: 'chick', c, r, id: egg.id });
        } else {
          egg.s = 'hatched';
          removed.add(key(c, r));
          const blast = [];
          for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
            const nx = c + dx, ny = r + dy;
            if (!inGrid(nx, ny) || (dx === 0 && dy === 0) || born.has(key(nx, ny)) || removed.has(key(nx, ny))) continue;
            const s = grid[nx][ny].s;
            if (s === 'egg') queue.push([nx, ny]);          // réaction en chaîne
            else if (s !== 'barn') { removed.add(key(nx, ny)); blast.push([nx, ny]); }
          }
          events.push({ t: 'dyn', c, r, id: egg.id, blast, ids: blast.map(([x, y]) => grid[x][y].id) });
        }
      }
      if (events.length) ctx.steps.push({ type: 'eggs', events, basket });

      if (ctx.capped || ctx.total + win * Math.max(1, basket) >= CONFIG.maxWinX * ctx.bet) break;

      // Chute : on retire, tout tombe, on remplit par le haut.
      const gone = [];
      const next = [];
      for (let c = 0; c < COLS; c++) {
        const kept = [];
        for (let r = 0; r < ROWS; r++) {
          if (removed.has(key(c, r))) { gone.push(grid[c][r].id); if (grid[c][r].s === 'egg') ctx.eggs--; }
          else kept.push(grid[c][r]);
        }
        const add = [];
        while (add.length + kept.length < ROWS) add.push(newCell(ctx));
        next.push([...add, ...kept]);
      }
      for (let c = 0; c < COLS; c++) grid[c] = next[c];
      ctx.steps.push({ type: 'tumble', gone, grid: snap(grid) });
    }
    return { win: round2(win), basket };
  }

  /* ---------- Coco pond des œufs ---------- */

  function cocoLays(ctx, grid, chance) {
    if (ctx.rng() >= chance) return;
    const spots = [];
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) if (PAYING.includes(grid[c][r].s)) spots.push([c, r]);
    const n = Math.min(CONFIG.cocoEggs[0] + randInt(ctx.rng, CONFIG.cocoEggs[1] - CONFIG.cocoEggs[0] + 1),
      Math.max(0, CONFIG.maxEggs - ctx.eggs));
    if (n <= 0) return;
    const eggs = shuffle(spots, ctx.rng).slice(0, n).map(([c, r]) => {
      const cell = makeCell(ctx, 'egg');
      cell.hp = Math.min(cell.hp, 2);
      grid[c][r] = cell;
      return { c, r, cell: { ...cell } };
    });
    ctx.steps.push({ type: 'coco', eggs, grid: snap(grid) });
  }

  /* ---------- plafond ---------- */

  function addWin(ctx, w) {
    ctx.total = round2(ctx.total + w);
    if (ctx.total >= CONFIG.maxWinX * ctx.bet) {
      ctx.total = CONFIG.maxWinX * ctx.bet;
      if (!ctx.capped) { ctx.capped = true; ctx.steps.push({ type: 'maxwin', total: ctx.total }); }
    }
  }

  /* ---------- tours gratuits ---------- */

  function freeSpins(ctx, spins) {
    const prevMode = ctx.mode;
    let left = spins;
    let index = 0;
    let totalMult = 0;
    const start = ctx.total;
    ctx.steps.push({ type: 'fsStart', spins, mode: ctx.mode });
    while (left > 0 && !ctx.capped) {
      left--; index++;
      const grid = freshGrid(ctx);
      ctx.steps.push({ type: 'fsSpin', index, left, totalMult, grid: snap(grid) });
      cocoLays(ctx, grid, CONFIG.cocoChanceFs);
      const seq = runSequence(ctx, grid);
      let w = seq.win;
      totalMult += seq.basket;
      if (totalMult > 0 && w > 0) {
        const mw = round2(w * totalMult);
        ctx.steps.push({ type: 'basket', base: w, add: seq.basket, mult: totalMult, win: mw });
        w = mw;
      }
      addWin(ctx, w);
      ctx.steps.push({ type: 'fsSpinEnd', win: w, fsWin: round2(ctx.total - start), totalMult });
      const barns = countOf(grid, 'barn');
      if (barns >= CONFIG.retriggerNeed && !ctx.capped) {
        left += CONFIG.retriggerSpins;
        ctx.steps.push({ type: 'retrigger', barns, add: CONFIG.retriggerSpins, left });
      }
    }
    ctx.steps.push({ type: 'fsEnd', win: round2(ctx.total - start), spins: index, totalMult });
    ctx.mode = prevMode;
  }

  /* ---------- API ---------- */

  function newCtx(bet, rng, opts) {
    return { rng, bet, mode: 'base', ante: !!(opts && opts.ante), nextId: 1, eggs: 0, steps: [], total: 0, capped: false };
  }

  function result(ctx, cost, bonus) {
    return { steps: ctx.steps, win: round2(ctx.total), cost, bonus };
  }

  // Une mise complète.
  function spin(bet, rng, opts) {
    const ctx = newCtx(bet, rng, opts);
    const cost = round2(bet * (ctx.ante ? CONFIG.anteCost : 1));
    const grid = freshGrid(ctx);
    ctx.steps.push({ type: 'grid', grid: snap(grid) });
    cocoLays(ctx, grid, CONFIG.cocoChance);
    const seq = runSequence(ctx, grid);
    let w = seq.win;
    if (seq.basket > 0 && w > 0) {
      const mw = round2(w * seq.basket);
      ctx.steps.push({ type: 'basket', base: w, add: seq.basket, mult: seq.basket, win: mw });
      w = mw;
    }
    addWin(ctx, w);

    const barns = countOf(grid, 'barn');
    let bonus = false;
    if (barns >= CONFIG.scatterNeed && !ctx.capped) {
      const pay = round2((CONFIG.scatterPay[Math.min(barns, 6)] || 0) * bet);
      ctx.steps.push({ type: 'scatter', barns, pay, spins: CONFIG.freeSpins });
      addWin(ctx, pay);
      bonus = true;
      ctx.mode = 'fs';
      freeSpins(ctx, CONFIG.freeSpins);
    }
    ctx.steps.push({ type: 'end', win: round2(ctx.total) });
    return result(ctx, cost, bonus);
  }

  // Achat direct des tours gratuits.
  function buyBonus(kind, bet, rng) {
    const b = BONUS_BUYS[kind];
    const ctx = newCtx(bet, rng);
    ctx.mode = b.mode;
    ctx.steps.push({ type: 'buy', kind, name: b.name });
    freeSpins(ctx, CONFIG.freeSpins);
    ctx.steps.push({ type: 'end', win: round2(ctx.total) });
    return result(ctx, round2(bet * b.cost), true);
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const api = { COLS, ROWS, CONFIG, SYMBOLS, PAYING, CURVE, PRIZES, BONUS_BUYS, spin, buyBonus, randomGrid, findClusters, clusterPay, mulberry32 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CocoEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
