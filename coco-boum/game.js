/* =========================================================
   COCO BOUM! — interface, animations et sons
   La page ne calcule aucun gain : elle rejoue les étapes
   renvoyées par CocoEngine (engine.js).
   ========================================================= */
(function () {
  'use strict';
  const E = window.CocoEngine;
  const A = window.CocoArt;
  const { COLS, ROWS } = E;
  const $ = (id) => document.getElementById(id);

  // Aléa de démonstration. En production, le résultat vient du serveur du casino.
  const rng = () => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] / 4294967296; };

  const BETS = [0.2, 0.4, 0.6, 1, 2, 4, 5, 10, 20, 50, 100];
  const state = { balance: 1000, betIdx: 3, busy: false, turbo: false, auto: 0, sound: true, hurry: false, fs: false, fsTotal: 0 };
  try { const b = +localStorage.getItem('cocoBalance'); if (b > 0) state.balance = b; } catch (e) { /* stockage indisponible */ }

  const fmt = (n) => n.toLocaleString('fr-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const bet = () => BETS[state.betIdx];
  const spd = () => (state.turbo ? 2 : 1) * (state.hurry ? 3 : 1);
  const applySpeed = () => document.documentElement.style.setProperty('--speed', spd());
  const wait = (ms) => new Promise((r) => setTimeout(r, ms / spd()));
  const reflow = (el) => void el.offsetWidth;

  document.body.insertAdjacentHTML('afterbegin', A.sprite());
  $('coco').innerHTML = A.COCO;

  /* ---------- sons (synthétisés, rien à télécharger) ---------- */
  let ac = null, unlocked = false;
  addEventListener('pointerdown', () => { unlocked = true; }, { once: true, capture: true });
  addEventListener('keydown', () => { unlocked = true; }, { once: true, capture: true });
  function audio() {
    if (!state.sound || !unlocked) return null;
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tone(f, dur, type = 'square', vol = 0.06, to = null, delay = 0) {
    const a = audio(); if (!a) return;
    const t = a.currentTime + delay;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol = 0.2, freq = 1200, delay = 0) {
    const a = audio(); if (!a) return;
    const t = a.currentTime + delay;
    const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    src.buffer = buf; f.type = 'lowpass'; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(a.destination); src.start(t);
  }
  const sfx = {
    whoosh: () => noise(0.25, 0.08, 2500),
    land: (c) => tone(260 - c * 12, 0.09, 'triangle', 0.05, 120),
    pop: (i) => { tone(520 + i * 70, 0.12, 'square', 0.04, 1000); noise(0.05, 0.05, 4000); },
    win: (n) => [0, 4, 7, 12].forEach((s, i) => tone(523 * Math.pow(2, (s + n * 2) / 12), 0.14, 'square', 0.045, null, i * 0.07)),
    crack: () => { noise(0.07, 0.25, 3500); noise(0.05, 0.2, 2500, 0.07); },
    hatch: () => tone(600, 0.2, 'sine', 0.1, 1500),
    ding: () => { tone(1320, 0.25, 'triangle', 0.07); tone(1760, 0.3, 'triangle', 0.05, null, 0.08); },
    chick: () => { tone(1800, 0.07, 'sine', 0.08, 2600); tone(1800, 0.07, 'sine', 0.08, 2600, 0.12); },
    fuse: () => noise(0.7, 0.07, 7000),
    boom: () => { noise(0.9, 0.55, 600); tone(110, 0.6, 'sawtooth', 0.15, 35); },
    cluck: () => [0, 0.14, 0.3].forEach((d) => tone(760, 0.08, 'square', 0.05, 520, d)),
    boing: () => tone(180, 0.35, 'sine', 0.14, 620),
    fanfare: () => [0, 4, 7, 12, 7, 12, 16].forEach((s, i) => tone(392 * Math.pow(2, s / 12), 0.2, 'square', 0.05, null, i * 0.12)),
    coin: () => tone(1600 + Math.random() * 600, 0.08, 'triangle', 0.035),
  };

  /* ---------- plateau ---------- */
  const board = $('board'), fx = $('fx'), wrap = $('boardWrap');
  const els = new Map();
  let gen = 0;
  const k = (id) => gen + ':' + id;
  const cellPx = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cell')) || 64;
  const center = (c, r) => [(c + 0.5) * cellPx(), (r + 0.5) * cellPx()];

  function crackHTML(hp) { return hp >= 3 ? '' : A.use(hp === 2 ? 'crack1' : 'crack2'); }
  function symHTML(cell) {
    if (cell.s === 'egg') return `${cell.sticky ? `<div class="nestbase">${A.use('nestbase')}</div>` : ''}<div class="sym">${A.use('egg')}<div class="crack">${crackHTML(cell.hp)}</div></div>`;
    return `<div class="sym">${A.use(cell.s)}</div>`;
  }
  function makeEl(cell) {
    const el = document.createElement('div');
    el.className = 'cell ' + cell.s + (cell.sticky ? ' sticky' : '');
    el.innerHTML = symHTML(cell);
    board.appendChild(el);
    els.set(k(cell.id), el);
    return el;
  }
  function setCell(el, cell) { el.className = 'cell ' + cell.s; el.innerHTML = symHTML(cell); }
  function place(el, c, r) {
    el.style.transform = `translate(calc(var(--cell) * ${c}), calc(var(--cell) * ${r}))`;
    el.dataset.c = c; el.dataset.r = r;
  }
  function land(list) {
    for (const el of list) { el.classList.remove('landed'); reflow(el); el.classList.add('landed'); }
  }

  // Chute colonne par colonne : chaque colonne tombe d'un bloc (accélération), puis fait un mini rebond.
  const COL_GAP = 105, FALL = 340;
  function fallColumns(items, gap = COL_GAP) {
    const cols = [...new Set(items.map((m) => m[1]))].sort((a, b) => a - b);
    cols.forEach((c, i) => {
      const list = items.filter((m) => m[1] === c);
      for (const [el, , r] of list) {
        el.classList.remove('no-anim');
        el.style.transitionTimingFunction = 'cubic-bezier(.45,0,.9,.55)';
        el.style.transitionDuration = FALL / spd() + 'ms';
        el.style.transitionDelay = (i * gap) / spd() + 'ms';
        place(el, c, r);
      }
      setTimeout(() => {
        sfx.land(c);
        for (const [el] of list) { el.style.transitionDelay = ''; el.style.transitionDuration = ''; el.style.transitionTimingFunction = ''; }
        land(list.map((m) => m[0]));
      }, (i * gap + FALL) / spd());
    });
    return wait(Math.max(0, cols.length - 1) * gap + FALL + 260);
  }

  async function dropGrid(grid, first) {
    const old = [...board.querySelectorAll('.cell')];
    if (old.length && !first) {
      sfx.whoosh();
      for (const el of old) {
        el.style.transitionTimingFunction = 'cubic-bezier(.5,0,.9,.4)';
        el.style.transitionDuration = FALL / spd() + 'ms';
        el.style.transitionDelay = (+el.dataset.c * 60) / spd() + 'ms';
        place(el, +el.dataset.c, +el.dataset.r + ROWS + 1);
      }
      await wait(FALL + (COLS - 1) * 60);
    }
    old.forEach((el) => el.remove());
    els.clear();
    const fresh = [];
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
      const el = makeEl(grid[c][r]);
      el.classList.add('no-anim');
      place(el, c, r - ROWS - 0.5);
      fresh.push([el, c, r]);
    }
    reflow(board);
    await fallColumns(fresh);
  }

  async function tumble(step) {
    let i = 0;
    for (const id of step.gone) {
      const el = els.get(k(id));
      if (!el) continue;
      el.classList.add('pop');
      const [x, y] = center(+el.dataset.c, +el.dataset.r);
      if (i++ % 3 === 0) stars(x, y, 3);
    }
    sfx.pop(0);
    await wait(300);
    for (const id of step.gone) { const el = els.get(k(id)); if (el) { el.remove(); els.delete(k(id)); } }

    const moved = [];
    for (let c = 0; c < COLS; c++) {
      let fresh = 0;
      for (let r = 0; r < ROWS; r++) if (!els.has(k(step.grid[c][r].id))) fresh++;
      for (let r = 0; r < ROWS; r++) {
        const cell = step.grid[c][r];
        let el = els.get(k(cell.id));
        if (!el) { el = makeEl(cell); el.classList.add('no-anim'); place(el, c, r - fresh - 0.3); }
        else if (+el.dataset.r === r) continue;
        moved.push([el, c, r]);
      }
    }
    reflow(board);
    if (moved.length) await fallColumns(moved, 70);
  }

  /* ---------- petits effets ---------- */
  function word(text, x, y, cls = '', size = 0.55) {
    const w = document.createElement('div');
    w.className = 'word ' + cls;
    w.textContent = text;
    w.style.left = x + 'px'; w.style.top = y + 'px';
    w.style.fontSize = cellPx() * size + 'px';
    fx.appendChild(w);
    setTimeout(() => w.remove(), 1000 / spd());
  }
  function stars(x, y, n) {
    for (let i = 0; i < n; i++) {
      const s = document.createElement('div');
      s.className = 'star';
      s.innerHTML = A.use('spark');
      s.style.cssText = `left:${x}px;top:${y}px;--dx:${(Math.random() - 0.5) * 140}px;--dy:${-30 - Math.random() * 60}px`;
      fx.appendChild(s);
      setTimeout(() => s.remove(), 650 / spd());
    }
  }
  function shells(x, y) {
    for (const cls of ['top', 'bot']) {
      const s = document.createElement('div');
      s.className = 'shell ' + cls;
      s.style.left = x - cellPx() * 0.25 + 'px';
      s.style.top = y + (cls === 'top' ? -cellPx() * 0.3 : 0) + 'px';
      fx.appendChild(s);
      setTimeout(() => s.remove(), 650 / spd());
    }
  }
  function puff(x, y) {
    const p = document.createElement('div');
    p.className = 'puff'; p.style.left = x + 'px'; p.style.top = y + 'px';
    fx.appendChild(p);
    setTimeout(() => p.remove(), 550 / spd());
  }
  function shakeBoard() { wrap.classList.remove('shakeAll'); reflow(wrap); wrap.classList.add('shakeAll'); }

  let bubbleTimer = 0;
  function say(text, ms = 1400) {
    const b = $('bubble');
    b.textContent = text; b.hidden = false;
    b.style.animation = 'none'; reflow(b); b.style.animation = '';
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => { b.hidden = true; }, ms / spd());
  }
  function coco(mood) {
    const c = $('coco');
    c.classList.remove('happy', 'scared'); reflow(c);
    if (mood) c.classList.add(mood);
  }

  function setBasket(v, bump) {
    $('basketVal').textContent = '×' + v;
    $('basket').classList.toggle('hot', v > 0);
    if (bump) { const b = $('basket'); b.classList.remove('bump'); reflow(b); b.classList.add('bump'); }
  }
  function showWin(v) { $('win').textContent = fmt(v); }
  function showBalance() {
    $('balance').textContent = fmt(state.balance);
    try { localStorage.setItem('cocoBalance', String(state.balance)); } catch (e) { /* stockage indisponible */ }
  }
  function floatWin(html, ms = 900) {
    const f = $('winFloat');
    f.innerHTML = html; f.hidden = false;
    f.style.animation = 'none'; reflow(f); f.style.animation = '';
    return wait(ms).then(() => { f.hidden = true; });
  }

  /* ---------- fenêtres ---------- */
  function overlay(html, { autoMs = 0, dismiss = true, wide = false } = {}) {
    return new Promise((resolve) => {
      const ov = $('overlay'), card = $('overlayCard');
      card.innerHTML = html;
      card.classList.toggle('wide', wide);
      ov.hidden = false;
      let done = false;
      const close = (v) => { if (done) return; done = true; ov.hidden = true; resolve(v); };
      card.querySelectorAll('[data-v]').forEach((b) => b.addEventListener('click', () => close(b.dataset.v)));
      if (dismiss) ov.onclick = (e) => { if (e.target === ov) close(null); };
      else ov.onclick = null;
      if (autoMs) setTimeout(() => close('go'), autoMs);
      const first = card.querySelector('button');
      if (first) first.focus();
    });
  }

  /* ---------- confettis : pièces, plumes, œufs ---------- */
  const cv = $('confetti'), cx = cv.getContext('2d');
  let parts = [], raf = 0;
  function rain(n, kinds = ['coin', 'feather', 'coin', 'egg']) {
    cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio;
    for (let i = 0; i < n; i++) parts.push({
      kind: kinds[i % kinds.length], x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * 0.8,
      vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 3, a: Math.random() * 6, va: (Math.random() - 0.5) * 0.2, s: 10 + Math.random() * 10,
    });
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function tick() {
    const d = devicePixelRatio;
    cx.setTransform(d, 0, 0, d, 0, 0);
    cx.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter((p) => p.y < innerHeight + 40);
    for (const p of parts) {
      p.x += p.vx + (p.kind === 'feather' ? Math.sin(p.a) * 1.5 : 0); p.y += p.kind === 'feather' ? p.vy * 0.5 : p.vy; p.a += p.va; p.vy += p.kind === 'feather' ? 0 : 0.05;
      cx.save(); cx.translate(p.x, p.y); cx.rotate(p.a); cx.lineWidth = 2.5; cx.strokeStyle = '#2a1608';
      cx.beginPath();
      if (p.kind === 'coin') { cx.ellipse(0, 0, p.s * Math.abs(Math.cos(p.a * 2)) + 1, p.s, 0, 0, 7); cx.fillStyle = '#ffd23f'; }
      else if (p.kind === 'egg') { cx.ellipse(0, 0, p.s * 0.75, p.s, 0, 0, 7); cx.fillStyle = '#fff4dc'; }
      else { cx.ellipse(0, 0, p.s * 0.35, p.s, 0, 0, 7); cx.fillStyle = '#fff'; }
      cx.fill(); cx.stroke(); cx.restore();
    }
    raf = parts.length ? requestAnimationFrame(tick) : 0;
    if (!raf) cx.clearRect(0, 0, innerWidth, innerHeight);
  }

  /* ---------- rejouer une mise ---------- */
  let runBase = 0, seqVal = 0, fsBase = 0, cascade = 0;

  const handlers = {
    async grid(s) { cascade = 0; await dropGrid(s.grid); },

    async coco(s) {
      coco('happy'); say('COT COT!'); sfx.cluck();
      const runner = document.createElement('div');
      runner.className = 'runner';
      runner.innerHTML = A.COCO;
      fx.appendChild(runner);
      reflow(runner);
      runner.style.left = '105%';
      const cross = 1100;
      for (const e of [...s.eggs].sort((a, b) => a.c - b.c)) {
        setTimeout(() => {
          const old = [...board.querySelectorAll('.cell')].find((el) => +el.dataset.c === e.c && +el.dataset.r === e.r);
          if (old) { old.classList.add('pop'); setTimeout(() => old.remove(), 250 / spd()); for (const [kk, v] of els) if (v === old) els.delete(kk); }
          const el = makeEl(e.cell);
          el.classList.add('no-anim'); place(el, e.c, -1.2); reflow(el);
          el.classList.remove('no-anim'); place(el, e.c, e.r);
          setTimeout(() => { land([el]); sfx.boing(); }, 380 / spd());
        }, (cross * (e.c + 0.8)) / (COLS + 1.5) / spd());
      }
      await wait(cross + 500);
      runner.remove();
    },

    async win(s) {
      cascade++;
      const all = [];
      for (const cl of s.clusters) {
        for (const id of cl.ids) { const el = els.get(k(id)); if (el) { el.classList.add('win'); all.push(el); } }
        const [sx, sy] = cl.cells.reduce((a, [c, r]) => [a[0] + c, a[1] + r], [0, 0]);
        const [x, y] = center(sx / cl.cells.length, sy / cl.cells.length);
        word('+' + fmt(cl.pay), x, y, 'white', 0.42);
      }
      sfx.win(Math.min(cascade - 1, 6));
      if (cascade === 1) coco('happy');
      seqVal = s.seqWin;
      showWin(runBase + seqVal);
      await wait(650);
      for (const el of all) el.classList.remove('win');
    },

    async eggs(s) {
      for (const e of s.events) {
        const el = els.get(k(e.id));
        const [x, y] = center(e.c, e.r);
        if (e.t === 'crack') {
          if (el) { el.classList.remove('shake'); reflow(el); el.classList.add('shake'); el.querySelector('.crack').innerHTML = crackHTML(e.hp); }
          word('CRAC!', x, y - cellPx() * 0.3, '', 0.4);
          sfx.crack();
          await wait(380);
        } else if (e.t === 'mult') {
          if (el) { el.classList.add('shake'); await wait(260); el.style.opacity = '0'; }
          shells(x, y); puff(x, y); sfx.hatch();
          const m = document.createElement('div');
          m.className = 'medal born';
          m.innerHTML = A.use('burst') + `<b>×${e.value}</b>`;
          m.style.left = x + 'px'; m.style.top = y + 'px';
          fx.appendChild(m);
          if (e.value >= 25) { say(e.value >= 100 ? 'WOUAAH!' : 'OH OUI!'); coco('happy'); }
          await wait(e.value >= 25 ? 900 : 560);
          const br = $('basket').getBoundingClientRect(), fr = fx.getBoundingClientRect();
          m.classList.remove('born');
          m.style.left = br.left + br.width / 2 - fr.left + 'px';
          m.style.top = br.top + br.height / 2 - fr.top + 'px';
          m.style.transform = 'translate(-50%,-50%) scale(.5)';
          await wait(600);
          m.remove();
          setBasket(state.fs ? state.fsTotal + e.basket : e.basket, true);
          sfx.ding();
        } else if (e.t === 'chick') {
          if (el) { el.classList.add('shake'); await wait(260); }
          puff(x, y); sfx.chick();
          if (el) { setCell(el, { s: 'wild' }); land([el]); }
          word('PIOU!', x, y - cellPx() * 0.4, '', 0.45);
          await wait(450);
        } else if (e.t === 'dyn') {
          if (el) { el.classList.add('shake'); await wait(240); el.style.opacity = '0'; }
          shells(x, y);
          const d = document.createElement('div');
          d.className = 'dyn';
          d.innerHTML = A.use('dynamite') + `<div class="sp">${A.use('spark')}</div>`;
          d.style.left = x + 'px'; d.style.top = y + 'px';
          fx.appendChild(d);
          coco('scared'); say('AÏE AÏE!', 900); sfx.fuse();
          await wait(750);
          d.remove();
          const b = document.createElement('div');
          b.className = 'boom'; b.innerHTML = A.use('burst');
          b.style.left = x + 'px'; b.style.top = y + 'px';
          fx.appendChild(b);
          setTimeout(() => b.remove(), 700 / spd());
          word('BOUM!', x, y, 'red', 0.8);
          sfx.boom(); shakeBoard();
          for (const id of e.ids) { const t = els.get(k(id)); if (t) t.classList.add('charred'); }
          await wait(520);
        }
      }
    },

    tumble,

    async basket(s) {
      sfx.boing();
      seqVal = s.win;
      await floatWin(`${fmt(s.base)} <em>×${s.mult}</em>`, 900);
      sfx.fanfare();
      showWin(runBase + seqVal);
      await floatWin(fmt(s.win), 900);
      if (!state.fs) setBasket(0);
    },

    async scatter(s) {
      for (const el of board.querySelectorAll('.cell.barn')) el.classList.add('glow');
      sfx.fanfare(); coco('happy'); say(s.kind === 'super' ? 'SUPER GRANGE!' : 'LA GRANGE!', 1800);
      runBase = runBase + seqVal + s.pay; seqVal = 0;
      showWin(runBase);
      await wait(1500);
    },

    async buy() { runBase = 0; seqVal = 0; },

    async fsStart(s) {
      const B = E.BONUSES[s.kind];
      await overlay(`<div class="bonus-intro">${A.use(B.icon, 'intro-ico')}
        <h2 class="red">${B.name.toUpperCase()}!</h2>
        <div class="big">${s.spins} tours gratuits</div>
        <p>${B.desc}</p>
        <p class="note">${B.keep ? 'Panier persistant : les multiplicateurs s\'additionnent pendant tout le bonus.' : 'Le Panier repart de zéro à chaque tour.'}</p>
        <button class="go" data-v="go">C'est parti !</button></div>`, { autoMs: state.auto ? 2500 : 0, dismiss: false });
      state.fs = true; state.fsTotal = 0; state.fsKeep = !!B.keep; fsBase = runBase;
      document.body.classList.add('fs', 'fs-' + s.kind);
      $('fsBox').hidden = false; $('fsLeft').textContent = s.spins;
      $('fsName').textContent = B.name;
      setBasket(0);
    },

    async chicks(s) {
      say('PIOU PIOU!', 1200); sfx.chick();
      for (const e of s.cells) {
        const old = [...board.querySelectorAll('.cell')].find((el) => +el.dataset.c === e.c && +el.dataset.r === e.r);
        if (old) { old.classList.add('pop'); setTimeout(() => old.remove(), 250 / spd()); for (const [kk, v] of els) if (v === old) els.delete(kk); }
        const el = makeEl(e.cell);
        el.classList.add('no-anim'); place(el, e.c, -1.2); reflow(el);
        el.classList.remove('no-anim'); place(el, e.c, e.r);
        setTimeout(() => {
          land([el]); sfx.boing();
          const [x, y] = center(e.c, e.r);
          puff(x, y); word('PIOU!', x, y - cellPx() * 0.4, '', 0.4);
        }, 380 / spd());
        await wait(300);
      }
      await wait(500);
    },

    async bombs(s) {
      coco('scared'); say('ATTENTION!', 1200);
      const sticks = s.bombs.map((b) => {
        const [x, y] = center(b.c, b.r);
        const d = document.createElement('div');
        d.className = 'dyn falling';
        d.innerHTML = A.use('dynamite') + `<div class="sp">${A.use('spark')}</div>`;
        d.style.left = x + 'px'; d.style.top = y + 'px';
        fx.appendChild(d);
        return [d, x, y, b];
      });
      sfx.fuse();
      await wait(900);
      for (const [d, x, y, b] of sticks) {
        d.remove();
        const bo = document.createElement('div');
        bo.className = 'boom'; bo.innerHTML = A.use('burst');
        bo.style.left = x + 'px'; bo.style.top = y + 'px';
        fx.appendChild(bo);
        setTimeout(() => bo.remove(), 700 / spd());
        word('BOUM!', x, y, 'red', 0.8);
        sfx.boom(); shakeBoard();
        for (const id of b.ids) { const t = els.get(k(id)); if (t) t.classList.add('charred'); }
        await wait(380);
      }
      await wait(250);
    },

    async fsSpin(s) {
      state.fsTotal = s.totalMult; seqVal = 0; cascade = 0;
      $('fsLeft').textContent = s.left;
      setBasket(s.totalMult);
      await dropGrid(s.grid);
    },

    async fsSpinEnd(s) {
      runBase = fsBase + s.fsWin; seqVal = 0;
      state.fsTotal = s.totalMult;
      setBasket(s.totalMult);
      showWin(runBase);
      await wait(s.win > 0 ? 450 : 250);
    },

    async retrigger(s) {
      for (const el of board.querySelectorAll('.cell.barn')) el.classList.add('glow');
      $('fsLeft').textContent = s.left;
      const [x, y] = center(COLS / 2 - 0.5, ROWS / 2 - 0.5);
      word(`+${s.add} TOURS!`, x, y, 'red', 1);
      sfx.fanfare();
      await wait(1300);
    },

    async fsEnd(s) {
      await overlay(`<h2>TOTAL GAGNÉ</h2><div class="big">${fmt(s.win)}</div>
        <p>${s.name} : ${s.spins} tours gratuits${E.BONUSES[s.kind].keep ? `, Panier final ×${s.totalMult}` : ''}.</p><button class="go" data-v="go">Super !</button>`, { autoMs: state.auto ? 2500 : 0 });
      state.fs = false; state.fsTotal = 0;
      document.body.className = '';
      $('fsBox').hidden = true;
      setBasket(0);
    },

    async maxwin(s) {
      rain(160); sfx.fanfare();
      await overlay(`<h2 class="red">BOUM MAXIMUM!</h2><div class="big">×${E.CONFIG.maxWinX.toLocaleString('fr-CH')}</div>
        <p>Coco a fait sauter la banque : ${fmt(s.total)}.</p><button class="go" data-v="go">Incroyable !</button>`);
    },

    async end(s) { showWin(s.win); },
  };

  async function bigWin(win) {
    const x = win / bet();
    if (x < 20) return;
    const tiers = [[500, 'COCO-LOSSAL!'], [100, 'ÉNORME!'], [50, 'MÉGA GAIN!'], [20, 'GROS GAIN!']];
    const title = tiers.find((t) => x >= t[0])[1];
    coco('happy'); say('COT COT CODEC!', 2500);
    rain(Math.min(220, 40 + x / 3));
    const p = overlay(`<div class="bigwin"><h2>${title}</h2><div class="big" id="bwAmount">0,00</div><p>×${Math.round(x)} la mise</p>
      <button class="go" data-v="go">Encaisser</button></div>`, { autoMs: state.auto ? 3500 : 0 });
    const t0 = performance.now(), dur = Math.min(4000, 1200 + x * 6) / spd();
    let lastCoin = 0;
    (function count(now) {
      const f = Math.min(1, (now - t0) / dur);
      const node = $('bwAmount');
      if (!node) return;
      node.textContent = fmt(win * (1 - Math.pow(1 - f, 3)));
      if (now - lastCoin > 90) { sfx.coin(); lastCoin = now; }
      if (f < 1) requestAnimationFrame(count);
    })(t0);
    await p;
  }

  async function play(makeResult, cost) {
    if (state.busy) return;
    if (state.balance + 1e-9 < cost) {
      state.auto = 0; updateButtons();
      await overlay(`<h2 class="red">Plus assez de crédits</h2><p>Coco vous offre 1 000 crédits fictifs pour continuer à jouer.</p><button class="go" data-v="go">Merci Coco !</button>`);
      state.balance += 1000; showBalance();
      return;
    }
    state.busy = true; state.hurry = false; applySpeed(); updateButtons();
    state.balance = Math.round((state.balance - cost) * 100) / 100; showBalance();
    showWin(0); runBase = 0; seqVal = 0;
    const res = makeResult();
    gen++;
    for (const s of res.steps) { const h = handlers[s.type]; if (h) await h(s); }
    state.balance = Math.round((state.balance + res.win) * 100) / 100; showBalance();
    await bigWin(res.win);
    state.busy = false; state.hurry = false; applySpeed(); updateButtons();
    if (state.auto > 0) {
      state.auto--; updateButtons();
      if (state.auto > 0) setTimeout(spinOnce, 300);
    }
  }

  function spinOnce() {
    const ante = $('ante').checked;
    const b = bet();
    play(() => E.spin(b, rng, { ante }), Math.round(b * (ante ? E.CONFIG.anteCost : 1) * 100) / 100);
  }

  /* ---------- commandes ---------- */
  function updateButtons() {
    $('spin').classList.toggle('busy', state.busy);
    $('bet').textContent = fmt(bet());
    $('betDown').disabled = state.busy || state.betIdx === 0;
    $('betUp').disabled = state.busy || state.betIdx === BETS.length - 1;
    $('buyBtn').classList.toggle('off', state.busy);
    $('anteBox').classList.toggle('off', state.busy);
    $('autoBtn').textContent = state.auto ? `Stop (${state.auto})` : 'Auto';
    $('autoBtn').classList.toggle('on', state.auto > 0);
    $('turboBtn').classList.toggle('on', state.turbo);
    $('soundBtn').textContent = state.sound ? '🔊' : '🔇';
  }

  $('spin').addEventListener('click', () => {
    audio();
    if (state.busy) { state.hurry = true; applySpeed(); return; }
    spinOnce();
  });
  wrap.addEventListener('click', () => { if (state.busy) { state.hurry = true; applySpeed(); } });
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && $('overlay').hidden) { e.preventDefault(); $('spin').click(); }
  });
  $('betDown').onclick = () => { if (state.betIdx > 0) state.betIdx--; updateButtons(); };
  $('betUp').onclick = () => { if (state.betIdx < BETS.length - 1) state.betIdx++; updateButtons(); };
  $('turboBtn').onclick = () => { state.turbo = !state.turbo; applySpeed(); updateButtons(); };
  $('soundBtn').onclick = () => { state.sound = !state.sound; updateButtons(); };
  $('autoBtn').onclick = () => {
    audio();
    if (state.auto) { state.auto = 0; updateButtons(); return; }
    state.auto = 50; updateButtons();
    if (!state.busy) spinOnce();
  };

  const pct = (x) => Math.round(x).toLocaleString('fr-CH') + ' %';

  $('buyBtn').onclick = async () => {
    if (state.busy) return;
    audio();
    const b = bet();
    const cards = Object.entries(E.BONUSES).map(([kind, v], i) => {
      const price = v.cost * b;
      return `<div class="buycard tier${i}">
        <div class="tag-price">${v.cost}×</div>
        ${A.use(v.icon, 'buy-ico')}
        <h3>${v.name}</h3>
        <p class="short">${v.short}</p>
        <p class="spins">${v.spins} tours gratuits · ${v.keep ? 'Panier persistant' : 'Panier par tour'}</p>
        <button class="go" data-v="${kind}" ${state.balance < price ? 'disabled' : ''}>${fmt(price)}</button>
      </div>`;
    }).join('');
    const kind = await overlay(`<button class="round close" data-v="" aria-label="Fermer">×</button>
      <h2 class="red">Acheter un bonus</h2>
      <p>Prix pour une mise de ${fmt(b)}. Chaque bonus rend environ 96 % de son prix en moyenne.</p>
      <div class="buygrid">${cards}</div>`, { wide: true });
    if (kind && E.BONUSES[kind]) play(() => E.buyBonus(kind, b, rng), E.BONUSES[kind].cost * b);
  };

  function rulesHTML(tab) {
    const b = bet();
    const sizes = [5, 6, 7, 8, 9, 10, 12, 15];
    const T = {
      gains: `
        <p class="lead">Une <b>grappe</b> = 5 symboles identiques ou plus qui se touchent par un côté (haut, bas, gauche, droite). Les diagonales ne comptent pas. Montants pour une mise de <b>${fmt(b)}</b>.</p>
        <div class="demo" aria-hidden="true">${[1,1,0,0,0, 0,1,1,0,0, 0,0,1,0,0].map((x) => `<i class="${x ? 'on' : ''}"></i>`).join('')}<span>= grappe de 5, elle paie</span></div>
        <div class="tablewrap"><table class="paytab">
          <thead><tr><th>Symbole</th>${sizes.map((n) => `<th>${n}${n === 15 ? '+' : ''}</th>`).join('')}</tr></thead>
          <tbody>${E.PAYING.slice().reverse().map((sym, i) => `<tr class="${i === 0 ? 'top' : ''}">
            <th>${A.use(sym, 'tab-ico')}<span>${E.SYMBOLS[sym].name}</span></th>
            ${sizes.map((n) => `<td>${fmt(E.clusterPay(sym, n) * b)}</td>`).join('')}</tr>`).join('')}</tbody>
        </table></div>
        <p class="small">Tous les gains d'une même mise s'additionnent. Les grappes gagnantes explosent, tout tombe, de nouveaux symboles arrivent : c'est la <b>dégringolade</b>, qui continue tant qu'il y a des gains. Pendant les bonus, les gains des grappes sont plus élevés.</p>`,

      oeufs: `
        <div class="specials">
          <div class="sp-card">${A.use('wild', 'sp-ico')}<h4>Poussin Wild</h4><p>Remplace n'importe quel symbole pour compléter une grappe. Il peut servir à plusieurs grappes à la fois.</p></div>
          <div class="sp-card">${A.use('barn', 'sp-ico')}<h4>Grange</h4><p>4 Granges : La Grange en Folie. 5 ou plus : Super Grange. Elles paient aussi 4 : ×3, 5 : ×5, 6+ : ×100 la mise.</p></div>
          <div class="sp-card">${COCO_MINI}<h4>Coco pond</h4><p>Environ une mise sur 8, Coco traverse la grille et pond 2 à 4 œufs.</p></div>
        </div>
        <h3 class="sub">Les œufs</h3>
        <div class="egg-steps">
          <div>${A.use('egg', 'sp-ico')}<b>Intact</b><small>3 coups</small></div><span>→</span>
          <div class="cr">${A.use('egg', 'sp-ico')}<div>${A.use('crack1', 'sp-ico')}</div><b>Fêlé</b><small>2 coups</small></div><span>→</span>
          <div class="cr">${A.use('egg', 'sp-ico')}<div>${A.use('crack2', 'sp-ico')}</div><b>Prêt à éclore</b><small>1 coup</small></div>
        </div>
        <p>Chaque fois qu'une grappe gagnante explose <b>à côté</b> d'un œuf (diagonales comprises), l'œuf se fêle. Quand il éclot, il donne :</p>
        <table class="odds">
          <thead><tr><th>Surprise</th><th>Jeu normal</th><th>Bonus</th><th>Super Grange</th></tr></thead>
          <tbody>
            ${[['mult', 'burst', 'Multiplicateur', 'va dans le Panier'], ['chick', 'wild', 'Poussin Wild', 'reste sur la grille'], ['dyn', 'dynamite', 'Dynamite', 'explose en 3×3, fêle les œufs voisins']].map(([key, ico, name, what]) => {
              const odds = ['base', 'fs', 'super'].map((m) => { const t = E.PRIZES[m].kinds; const tot = t.reduce((a, x) => a + x[1], 0); return pct(100 * t.find((x) => x[0] === key)[1] / tot); });
              return `<tr><th>${A.use(ico, 'tab-ico')}<span>${name}<small>${what}</small></span></th>${odds.map((o) => `<td>${o}</td>`).join('')}</tr>`;
            }).join('')}
            <tr><th colspan="1"><span>Valeurs des multiplicateurs</span></th>${['base', 'fs', 'super'].map((m) => { const v = E.PRIZES[m].mult.map((x) => x[0]); return `<td>×${v[0]} à ×${v[v.length - 1]}</td>`; }).join('')}</tr>
          </tbody>
        </table>
        <h3 class="sub">Le Panier</h3>
        <p>Les multiplicateurs éclos pendant une mise s'<b>additionnent</b> dans le Panier (×2 + ×5 = ×7). À la fin de la dégringolade, le gain de la mise est multiplié par le Panier. Dans les bonus à Panier persistant, il ne se vide jamais et multiplie chaque tour gagnant.</p>`,

      bonus: `
        <p class="lead">5 bonus, du moins cher au plus cher. Prix pour une mise de <b>${fmt(b)}</b>.</p>
        <div class="bonus-list">${Object.entries(E.BONUSES).map(([kind, v], i) => `
          <div class="bl tier${i}">
            ${A.use(v.icon, 'bl-ico')}
            <div class="bl-main"><h4>${v.name}</h4><p>${v.desc}</p>
              <div class="chips"><span>${v.spins} tours</span><span>${v.keep ? 'Panier persistant' : 'Panier par tour'}</span>${v.barns ? `<span class="hot">${v.barns === 4 ? '4 Granges' : v.barns + '+ Granges'}</span>` : '<span>achat seulement</span>'}</div>
            </div>
            <div class="bl-price"><b>${v.cost}×</b><small>${fmt(v.cost * b)}</small></div>
          </div>`).join('')}
        </div>
        <p class="small">Pendant tous les bonus : 3 Granges ou plus rajoutent <b>+${E.CONFIG.retriggerSpins} tours</b>. Les œufs y sont plus nombreux et plus fragiles.</p>`,

      infos: `
        <table class="facts"><tbody>
          <tr><th>RTP (retour au joueur)</th><td>≈ 96 %</td></tr>
          <tr><th>RTP de chaque bonus acheté</th><td>≈ 96 %</td></tr>
          <tr><th>Gain maximum</th><td>×${E.CONFIG.maxWinX.toLocaleString('fr-CH')} la mise</td></tr>
          <tr><th>Volatilité</th><td>Élevée</td></tr>
          <tr><th>Mises gagnantes</th><td>≈ 27 % (1 sur 4)</td></tr>
          <tr><th>Bonus naturel</th><td>≈ 1 mise sur 300</td></tr>
          <tr><th>Double Chance</th><td>Mise ×${E.CONFIG.anteCost.toLocaleString('fr-CH')}, bonus ≈ 1 mise sur 185</td></tr>
          <tr><th>Grille</th><td>${COLS} colonnes × ${ROWS} lignes, grappes de 5+</td></tr>
        </tbody></table>
        <h3 class="sub">Commandes</h3>
        <ul class="keys"><li><kbd>Espace</kbd> lance un tour</li><li>Cliquer sur la grille pendant un tour l'accélère</li><li><b>Turbo</b> : animations 2× plus rapides</li><li><b>Auto</b> : 50 tours automatiques (cliquer pour arrêter)</li></ul>
        <p class="small">Démonstration en crédits fictifs. Si le gain d'une mise atteint le maximum, la mise s'arrête et le gain est plafonné. Une panne annule toutes les mises et tous les gains.</p>`,
    };
    const tabs = [['gains', 'Gains'], ['oeufs', 'Œufs & Coco'], ['bonus', 'Les 5 bonus'], ['infos', 'Infos']];
    return `<button class="round close" data-v="" aria-label="Fermer">×</button><h2>Règles du jeu</h2>
      <div class="tabs" role="tablist">${tabs.map(([id, label]) => `<button role="tab" class="tab ${id === tab ? 'on' : ''}" data-tab="${id}" aria-selected="${id === tab}">${label}</button>`).join('')}</div>
      <div class="tabbody">${T[tab]}</div>`;
  }
  const COCO_MINI = `<div class="sp-ico coco-mini">${A.COCO}</div>`;

  $('infoBtn').onclick = () => {
    const show = (tab) => {
      $('overlayCard').innerHTML = rulesHTML(tab);
      $('overlayCard').querySelectorAll('[data-tab]').forEach((t) => t.addEventListener('click', () => show(t.dataset.tab)));
      $('overlayCard').querySelector('.close').addEventListener('click', () => { $('overlay').hidden = true; });
    };
    overlay('', { wide: true });
    show('gains');
  };

  /* ---------- taille du plateau ---------- */
  const narrow = matchMedia('(max-width: 820px), (max-aspect-ratio: 1/1)');
  function resize() {
    const st = $('stage').getBoundingClientRect();
    let w, h;
    if (narrow.matches) {
      w = st.width - 20;
      h = st.height - $('left').offsetHeight - $('right').offsetHeight - 30;
    } else {
      w = st.width - Math.max(200, st.width * 0.2) * 2 - 40;
      h = st.height - 16;
    }
    const cell = Math.max(30, Math.min(118, Math.floor(Math.min((w - 38) / COLS, (h - 38) / ROWS))));
    document.documentElement.style.setProperty('--cell', cell + 'px');
  }
  addEventListener('resize', resize);
  resize();

  showBalance(); updateButtons(); applySpeed();
  dropGrid(E.randomGrid(rng), true);
  setTimeout(() => say('Clique sur l\'œuf !', 2500), 900);

  // Pour tester depuis la console : coco.bonus(), coco.super()
  window.coco = {
    bonus: (kind = 'grange') => play(() => E.buyBonus(kind, bet(), rng), 0),
    replay: (r) => play(() => r, 0),
    eggs: () => { let r; do r = E.spin(bet(), rng); while (!r.steps.some((s) => s.type === 'coco')); play(() => r, bet()); },
  };
})();
