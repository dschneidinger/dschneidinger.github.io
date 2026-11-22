/* =========================================================================
   CHOOSE YOUR OWN WAVE — engine
   ========================================================================= */
(() => {
  'use strict';
  const { NODES, EDGES, SELF_LOOPS, GUIDED, DIAL_LABELS, PHYS } = window.CYOW;
  for (const id in NODES) NODES[id].id = id;

  const $ = s => document.querySelector(s);
  const W = 320, H = 180, HY = 122, FY = 154, CX = 193; // scene res, horizon, fork y, trail centre (under the portal)
  const C = { cyan: '#5fe1ff', ion: '#ff9a3c', ionDim: '#8a3f2a', yel: '#ffe14a', mag: '#ff5fd7', white: '#f4f4ff' };

  /* ------------------------------------------------------------------ state */
  const SAVE_KEY = 'cyow-progress-v1';
  const state = { completed: false, current: 'START', visited: ['START'], edges: [], guidedIndex: 0, sound: true, seenTitle: false };
  let arrivedVia = null, prevId = null;

  function load() {
    try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && NODES[s.current]) Object.assign(state, s); } catch (e) { /* ignore */ }
  }
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } }
  function resetProgress() {
    Object.assign(state, { completed: false, current: 'START', visited: ['START'], edges: [], guidedIndex: 0 });
    arrivedVia = null; prevId = null; save(); enterNode(false);
  }
  const visited = id => state.visited.includes(id);
  const edgeKey = e => e.a + '>' + e.b;

  /* ------------------------------------------------------------------ graph */
  function exitsOf(id) {
    const out = [];
    for (const e of EDGES) {
      if (e.a === id) out.push({ to: e.b, label: e.fwd, key: edgeKey(e) });
      else if (e.b === id) out.push({ to: e.a, label: e.back, key: edgeKey(e) });
    }
    out.sort((p, q) => NODES[p.to].pos[0] - NODES[q.to].pos[0]);
    (SELF_LOOPS[id] || []).forEach(s => out.push({ to: id, self: true, label: s.label, note: s.note }));
    return out;
  }
  function guidedNext() {
    if (state.completed) return null;
    if (GUIDED[state.guidedIndex] !== state.current) return null;
    return GUIDED[state.guidedIndex + 1] || null;
  }
  function exitAllowed(ex) {
    if (state.completed) return true;
    return !ex.self && ex.to === guidedNext();
  }

  /* --------------------------------------------------------------- physics */
  function interp(xs, ys, x) {
    if (x <= xs[0]) return ys[0];
    const n = xs.length - 1;
    if (x >= xs[n]) return ys[n];
    let lo = 0, hi = n;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (xs[m] > x) hi = m; else lo = m; }
    const t = (x - xs[lo]) / (xs[hi] - xs[lo]);
    return ys[lo] + t * (ys[hi] - ys[lo]);
  }
  function prepBranch(b, d) {
    if (b._ready) return b;
    if (b.n2) {
      const ks = [], ws = [], N = 8000, [a, c] = b.wr;
      for (let i = 0; i <= N; i++) {
        const w = a + (c - a) * i / N, n2 = b.n2(w);
        if (!(n2 > 0)) continue;
        const k = w * Math.sqrt(n2);
        if (ks.length && k <= ks[ks.length - 1]) continue;
        if (k > 60) break;
        ks.push(k); ws.push(w);
      }
      b._ks = ks; b._ws = ws;
      b.fn = k => interp(ks, ws, k);
      b.kLo = Math.max(ks[0], d.kMax * 0.03); b.kHi = Math.min(ks[ks.length - 1], d.kMax);
    } else {
      b.kLo = d.kMax * 0.04; b.kHi = d.kMax;
    }
    b._ready = true;
    return b;
  }
  function vgOf(b, k, d) {
    const h = d.kMax * 1e-3;
    return (b.fn(k + h) - b.fn(Math.max(1e-6, k - h))) / (k + h - Math.max(1e-6, k - h));
  }

  /* ui state for the portal / plot */
  const ui = { packet: true, branch: 0, k0: 1, t0: performance.now() };
  let F = null;  // active field (superposition of modes)

  function curNode() { return NODES[state.current]; }
  function activeBranch() { const d = curNode().disp; return d ? prepBranch(d.branches[ui.branch], d) : null; }

  function buildField() {
    const n = curNode(), d = n.disp;
    if (!d) { F = null; return; }
    const br = activeBranch(), k0 = ui.k0, w0 = br.fn(k0);
    const nl = n.vis.nl || 5, lam = 2 * Math.PI / k0, Lwin = nl * lam;
    const modes = [];
    if (ui.packet) {
      const dk = k0 / (2 * nl), sig = k0 / 4.5, xc = Lwin * 0.22;
      let sum = 0;
      for (let j = 1; j <= 8 * nl; j++) {
        const k = j * dk, a = Math.exp(-0.5 * ((k - k0) / sig) ** 2);
        if (a < 2e-3) continue;
        modes.push({ k, w: br.fn(k), a, ph: -k * xc }); sum += a;
      }
      modes.forEach(m => { m.a /= sum; });
    } else modes.push({ k: k0, w: w0, a: 1, ph: 0 });
    F = { k0, w0, Lwin, modes, tscale: 2 * Math.PI * 0.9 / w0, vg: vgOf(br, k0, d), vp: w0 / k0 };
    ui.t0 = performance.now();
  }
  function psiArr(Xs, tsec) {
    const n = Xs.length, re = new Float32Array(n), im = new Float32Array(n), t = tsec * F.tscale;
    for (const m of F.modes) {
      const wt = m.w * t - m.ph;
      for (let i = 0; i < n; i++) { const ph = m.k * Xs[i] - wt; re[i] += m.a * Math.cos(ph); im[i] += m.a * Math.sin(ph); }
    }
    return { re, im };
  }
  const gridX = N => { const a = new Float32Array(N); for (let i = 0; i < N; i++) a[i] = (i + 0.5) / N * F.Lwin; return a; };

  /* ------------------------------------------------------------ pixel text */
  const textCache = new Map();
  function hexRgb(h) { const v = parseInt(h.slice(1), 16); return [v >> 16 & 255, v >> 8 & 255, v & 255]; }
  function pixelText(g, str, x, y, color, align) {
    const key = str + '|' + color;
    let c = textCache.get(key);
    if (!c) {
      c = document.createElement('canvas');
      let cg = c.getContext('2d');
      cg.font = '8px "Press Start 2P", monospace';
      const w = Math.ceil(cg.measureText(str).width) + 2;
      c.width = w; c.height = 10;
      cg = c.getContext('2d');
      cg.font = '8px "Press Start 2P", monospace'; cg.textBaseline = 'top'; cg.fillStyle = '#fff';
      cg.fillText(str, 0, 1);
      const id = cg.getImageData(0, 0, w, 10), [r, gg, b] = hexRgb(color);
      for (let i = 0; i < id.data.length; i += 4) {
        if (id.data[i + 3] > 100) { id.data[i] = r; id.data[i + 1] = gg; id.data[i + 2] = b; id.data[i + 3] = 255; }
        else id.data[i + 3] = 0;
      }
      cg.putImageData(id, 0, 0);
      textCache.set(key, c);
    }
    const dx = align === 'center' ? x - (c.width >> 1) : align === 'right' ? x - c.width : x;
    g.drawImage(c, Math.round(dx), Math.round(y));
    return c.width;
  }

  /* --------------------------------------------------------------- biomes */
  const PAL = {
    dawn:   { sky: ['#ff9f9a', '#ffb7a4', '#ffcdb0', '#ffe0c0', '#fff1d6'], hill: '#a593b8', far: '#6d7d9e', ground: ['#5e9e4a', '#528f41', '#467e38', '#3c6e30'], fol: ['#1d4628', '#2f7238', '#5aa845'], trunk: '#5b3b23', path: ['#c8a070', '#9c7448', '#e0bc88'], sun: '#fff6d0', round: 0.3 },
    day:    { sky: ['#3a9fdc', '#56b6e6', '#78c9ec', '#a1dbf0', '#cdeef2'], hill: '#5d9aa6', far: '#3b765a', ground: ['#4f9a3d', '#448a35', '#3a7a2e', '#316a27'], fol: ['#1a4f28', '#2b7634', '#58b23c'], trunk: '#5b3b23', path: ['#c9a46e', '#9a7446', '#e2c08a'], sun: '#fff8c0', round: 0.35 },
    autumn: { sky: ['#e2794a', '#ec955a', '#f4b06c', '#f9cd8e', '#fde6b8'], hill: '#a8687a', far: '#7a4a3a', ground: ['#8a8a3a', '#7c7a32', '#6c6a2b', '#5c5a24'], fol: ['#6a2410', '#b4441b', '#f09020'], trunk: '#4a2c1a', path: ['#d2a66c', '#a07648', '#ecc890'], sun: '#fff0b0', round: 0.75 },
    dusk:   { sky: ['#100a2c', '#1b1044', '#2b195c', '#462373', '#6e3384'], hill: '#2a2a5a', far: '#182a3c', ground: ['#1f4a3c', '#1a4034', '#15362c', '#102c24'], fol: ['#0c242c', '#1d4752', '#3a7f86'], trunk: '#2a1e2a', path: ['#76668a', '#4e4262', '#9a8aae'], moon: '#e8e8ff', night: true, aurora: true, round: 0.1 },
    ember:  { sky: ['#0a0a22', '#16133a', '#2a1a4a', '#4a2152', '#73305a'], hill: '#3a2340', far: '#2a1a2a', ground: ['#3a3424', '#332e20', '#2a261a', '#221f15'], fol: ['#3e1414', '#782a20', '#c0582c'], trunk: '#2a1a14', path: ['#8a6a5a', '#5e4436', '#aa8a76'], moon: '#ffe8d0', night: true, aurora: true, round: 0.55 }
  };
  function biomeOf(n) {
    if (n.id === 'START') return PAL.dawn;
    const mag = n.dials.B0 !== 'none', ions = n.dials.ions === 'mobile';
    if (mag) return ions ? PAL.ember : PAL.dusk;
    return ions ? PAL.autumn : PAL.day;
  }

  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hashStr(s) { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; }

  /* --------------------------------------------------------------- sprites */
  function drawPine(g, x, yb, h, fol, trunk) {
    x = Math.round(x); yb = Math.round(yb); h = Math.max(6, Math.round(h));
    const th = Math.max(2, Math.round(h * 0.14)), tw = Math.max(1, Math.round(h * 0.07));
    g.fillStyle = trunk; g.fillRect(x - (tw >> 1), yb - th, tw, th);
    const crown = h - th, tiers = h < 22 ? 2 : 3, w = Math.max(4, h * 0.44);
    for (let t = 0; t < tiers; t++) {
      const top = Math.round(yb - h + crown * t * 0.27);
      const bot = t === tiers - 1 ? yb - th : Math.round(top + crown * 0.5);
      const wt = w * (0.55 + 0.45 * (t + 1) / tiers);
      for (let y = top; y <= bot; y++) {
        const f = (y - top) / Math.max(1, bot - top), half = Math.round(f * wt / 2);
        g.fillStyle = fol[0]; g.fillRect(x - half - 1, y, 2 * half + 3, 1);
        g.fillStyle = fol[1]; g.fillRect(x - half, y, 2 * half + 1, 1);
        if ((y & 1) === 0 && half > 1) { g.fillStyle = fol[2]; g.fillRect(x - half, y, Math.max(1, half >> 1), 1); }
      }
    }
  }
  function disc(g, cx, cy, r, color, dither) {
    for (let dy = -r; dy <= r; dy++) {
      const half = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy)));
      if (dither) { g.fillStyle = color; for (let dx = -half; dx <= half; dx++) if (((dx + dy) & 1) === 0) g.fillRect(cx + dx, cy + dy, 1, 1); }
      else { g.fillStyle = color; g.fillRect(cx - half, cy + dy, 2 * half + 1, 1); }
    }
  }
  function drawRound(g, x, yb, h, fol, trunk, rnd) {
    x = Math.round(x); yb = Math.round(yb); h = Math.max(8, Math.round(h));
    const th = Math.round(h * 0.38), tw = Math.max(1, Math.round(h * 0.08));
    g.fillStyle = trunk; g.fillRect(x - (tw >> 1), yb - th, tw, th);
    const r = Math.max(3, Math.round(h * 0.3)), cy = yb - th - r + 2;
    const blobs = [[0, 0, r], [-Math.round(r * 0.6), Math.round(r * 0.3), Math.round(r * 0.7)], [Math.round(r * 0.6), Math.round(r * 0.35), Math.round(r * 0.7)]];
    blobs.forEach(([dx, dy, rr]) => disc(g, x + dx, cy + dy, rr + 1, fol[0]));
    blobs.forEach(([dx, dy, rr]) => disc(g, x + dx, cy + dy, rr, fol[1]));
    disc(g, x - Math.round(r * 0.35), cy - Math.round(r * 0.35), Math.max(1, Math.round(r * 0.45)), fol[2], true);
    if (rnd() < 0.5) { g.fillStyle = fol[2]; g.fillRect(x + Math.round(r * 0.2), cy - Math.round(r * 0.5), 1, 1); }
  }

  /* ----------------------------------------------------------- background */
  let sceneData = null;
  function buildScene() {
    const n = curNode(), pal = biomeOf(n), rnd = mulberry32(hashStr(n.id + 'forest'));
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    // sky bands + dither
    const sky = pal.sky, bh = HY / sky.length;
    sky.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, Math.floor(i * bh), W, Math.ceil(bh) + 1); });
    for (let i = 1; i < sky.length; i++) {
      const y = Math.floor(i * bh); g.fillStyle = sky[i - 1];
      for (let x = 0; x < W; x += 2) { g.fillRect(x, y, 1, 1); if (x % 4 === 0) g.fillRect(x + 1, y + 2, 1, 1); }
    }
    if (pal.night) {
      for (let i = 0; i < 70; i++) { g.fillStyle = rnd() < 0.2 ? '#ffffff' : '#9a9ad0'; g.fillRect(Math.floor(rnd() * W), Math.floor(rnd() * HY * 0.7), 1, 1); }
    }
    if (pal.aurora) {
      const s = rnd() * 10;
      for (let x = 0; x < W; x++) {
        const y = 14 + Math.sin(x * 0.028 + s) * 7 + Math.sin(x * 0.011 + 2 * s) * 6;
        g.fillStyle = 'rgba(90,255,170,0.22)'; g.fillRect(x, Math.round(y), 1, 12 + Math.round(4 * Math.sin(x * 0.07)));
        g.fillStyle = 'rgba(90,255,170,0.35)'; g.fillRect(x, Math.round(y) + 10, 1, 2);
        const y2 = 34 + Math.sin(x * 0.02 + s * 1.7) * 5;
        g.fillStyle = 'rgba(255,110,200,0.14)'; g.fillRect(x, Math.round(y2), 1, 8);
      }
    }
    if (pal.sun) disc(g, 280, 26, 9, pal.sun);
    if (pal.moon) { disc(g, 284, 22, 7, pal.moon); disc(g, 287, 20, 6, pal.sky[0]); }
    // hills
    const hs = rnd() * 6;
    for (let x = 0; x < W; x++) {
      const y = Math.round(HY - 10 - (Math.sin(x * 0.021 + hs) * 5 + Math.sin(x * 0.057 + hs * 2) * 3));
      g.fillStyle = pal.hill; g.fillRect(x, y, 1, HY - y);
    }
    // far tree line
    for (let x = -4; x < W + 4; x += 4 + Math.floor(rnd() * 3)) {
      const h = 5 + Math.floor(rnd() * 9);
      for (let y = 0; y < h; y++) { const half = Math.floor(y / h * 3); g.fillStyle = pal.far; g.fillRect(x - half, HY - h + y, 2 * half + 1, 1); }
    }
    // ground bands
    const gb = pal.ground;
    for (let i = 0; i < gb.length; i++) {
      const y0 = Math.round(HY + (H - HY) * Math.pow(i / gb.length, 1.6));
      g.fillStyle = gb[i]; g.fillRect(0, y0, W, H - y0);
    }
    for (let i = 0; i < 260; i++) {
      const y = HY + Math.floor(Math.pow(rnd(), 0.7) * (H - HY)), x = Math.floor(rnd() * W);
      g.fillStyle = rnd() < 0.5 ? pal.fol[2] : pal.ground[gb.length - 1];
      g.fillRect(x, y, 1, y > 140 ? 2 : 1);
    }
    // paths
    const exits = exitsOf(n.id), N = exits.length;
    const spread = N <= 1 ? 0 : Math.min(70, 240 / (N - 1));
    const branches = [];
    const strip = (yTop, yBot, cxT, cxB, hwT, hwB) => {
      for (let y = yTop; y <= yBot; y++) {
        const t = (y - yTop) / Math.max(1, yBot - yTop), cx = cxT + (cxB - cxT) * t, hw = hwT + (hwB - hwT) * t;
        const l = Math.round(cx - hw), r = Math.round(cx + hw);
        g.fillStyle = pal.path[0]; g.fillRect(l, y, r - l + 1, 1);
        g.fillStyle = pal.path[1]; g.fillRect(l, y, 1, 1); g.fillRect(r, y, 1, 1);
      }
    };
    strip(FY, H, CX, CX, 9, 46);
    for (let i = 0; i < N; i++) {
      const hx = CX + (i - (N - 1) / 2) * spread;
      strip(HY + 1, FY, hx, CX, 1.5, 9);
      const ts = 0.62, sx = Math.round(hx + (CX - hx) * ts), sy = Math.round(HY + 1 + (FY - HY - 1) * ts);
      branches.push({ hx, hy: HY + 1, sx, sy });
    }
    if (N === 0) strip(HY + 1, FY, CX, CX, 2, 9);
    // pebbles on path
    for (let i = 0; i < 90; i++) {
      const y = FY + Math.floor(rnd() * (H - FY)), t = (y - FY) / (H - FY), hw = 9 + 37 * t;
      const x = Math.round(CX + (rnd() * 2 - 1) * hw * 0.85);
      g.fillStyle = rnd() < 0.5 ? pal.path[1] : pal.path[2]; g.fillRect(x, y, 1 + (t > 0.5 ? 1 : 0), 1);
    }
    // side trees (back to front)
    const trees = [];
    for (let i = 0; i < 30; i++) {
      const side = i % 2 ? 1 : -1, d = Math.pow(rnd(), 0.75);
      const yb = HY + 3 + d * d * (H - HY + 34), h = (12 + d * 100) * (0.8 + rnd() * 0.4);
      const minDx = 46 + d * 112, x = CX + side * (minDx + rnd() * (50 + d * 40));
      trees.push({ x, yb, h, type: rnd() < pal.round ? 'round' : 'pine' });
    }
    trees.sort((a, b) => a.yb - b.yb).forEach(t => {
      if (t.type === 'round') drawRound(g, t.x, t.yb, t.h, pal.fol, pal.trunk, rnd);
      else drawPine(g, t.x, t.yb, t.h, pal.fol, pal.trunk);
    });
    // foreground grass tufts
    for (let i = 0; i < 40; i++) {
      const x = Math.floor(rnd() * W), y = H - Math.floor(rnd() * 14);
      if (Math.abs(x - CX) < 50) continue;
      g.fillStyle = pal.fol[1]; g.fillRect(x, y - 3, 1, 3); g.fillRect(x + 2, y - 4, 1, 4);
      g.fillStyle = pal.fol[2]; g.fillRect(x + 1, y - 5, 1, 5);
    }
    // ambient motes
    const motes = [];
    const em = /EM/.test(n.dials.Ek);
    const count = em ? 22 : 10;
    for (let i = 0; i < count; i++) motes.push({ x: rnd() * W, y: HY - 20 + rnd() * 80, ph: rnd() * 6.28, sp: 0.3 + rnd() * 0.7 });
    sceneData = { bg: c, branches, exits, pal, motes, fire: em || pal.night };
  }

  /* ----------------------------------------------------------- the portal */
  const PF = { x: 72, y: 12, w: 242, h: 102 };         // frame
  const IN = { x: 77, y: 17, w: 232, h: 92 };          // inner
  const PCX = PF.x + PF.w / 2;
  function drawPortal(g, now) {
    const n = curNode();
    // pillars
    g.fillStyle = '#3e3e4e'; g.fillRect(PF.x + 6, PF.y + PF.h, 7, HY + 4 - PF.y - PF.h); g.fillRect(PF.x + PF.w - 13, PF.y + PF.h, 7, HY + 4 - PF.y - PF.h);
    g.fillStyle = '#7a7a8c'; g.fillRect(PF.x + 7, PF.y + PF.h, 2, HY + 4 - PF.y - PF.h); g.fillRect(PF.x + PF.w - 12, PF.y + PF.h, 2, HY + 4 - PF.y - PF.h);
    // frame
    g.fillStyle = '#14141e'; g.fillRect(PF.x - 1, PF.y - 1, PF.w + 2, PF.h + 2);
    g.fillStyle = '#5e5e70'; g.fillRect(PF.x, PF.y, PF.w, PF.h);
    g.fillStyle = '#8e8ea4'; g.fillRect(PF.x, PF.y, PF.w, 1); g.fillRect(PF.x, PF.y, 1, PF.h);
    g.fillStyle = '#3a3a4a'; g.fillRect(PF.x, PF.y + PF.h - 1, PF.w, 1); g.fillRect(PF.x + PF.w - 1, PF.y, 1, PF.h);
    for (let x = PF.x + 4; x < PF.x + PF.w - 4; x += 9) { g.fillStyle = '#4c4c5e'; g.fillRect(x, PF.y + 2, 1, 2); g.fillRect(x + 4, PF.y + PF.h - 4, 1, 2); }
    const gem = n.kind === 'osc' ? C.mag : n.kind === 'wave' ? C.cyan : C.yel;
    const pulse = 0.6 + 0.4 * Math.sin(now / 300);
    [[PF.x + 1, PF.y + 1], [PF.x + PF.w - 5, PF.y + 1], [PF.x + 1, PF.y + PF.h - 5], [PF.x + PF.w - 5, PF.y + PF.h - 5]].forEach(([x, y]) => {
      g.fillStyle = '#14141e'; g.fillRect(x, y, 4, 4); g.globalAlpha = pulse; g.fillStyle = gem; g.fillRect(x + 1, y + 1, 2, 2); g.globalAlpha = 1;
    });
    // inner
    g.fillStyle = '#0a0e22'; g.fillRect(IN.x, IN.y, IN.w, IN.h);
    g.fillStyle = '#0e1430'; for (let y = IN.y; y < IN.y + IN.h; y += 2) g.fillRect(IN.x, y, IN.w, 1);
    // the HD layer sits on top of this; while the camera moves, draw it into the scene so it moves too
    if (trans) g.drawImage(hd, IN.x, IN.y, IN.w, IN.h);
    // plaque
    const label = n.short;
    g.fillStyle = '#14141e';
    const tw = label.length * 8 + 10;
    g.fillRect(PCX - (tw >> 1) - 1, PF.y - 8, tw + 2, 13);
    g.fillStyle = '#2a2a3a'; g.fillRect(PCX - (tw >> 1), PF.y - 7, tw, 11);
    pixelText(g, label, PCX, PF.y - 6, n.kind === 'osc' ? '#ffb0ee' : n.kind === 'wave' ? '#b8f4ff' : '#ffeeaa', 'center');
  }

  /* ------------------------------------------------ HD portal renderer
     Drawn on its own canvas at full device resolution, laid over the
     portal. Coordinates are logical portal units: 0..BW × 0..BH, stretched to fill IN.     */
  const hd = $('#portalHD'), hctx = hd.getContext('2d');
  function sizeHD() {
    const r = hd.getBoundingClientRect(), dpr = Math.min(3, window.devicePixelRatio || 1);
    const w = Math.max(2, Math.round(r.width * dpr)), h = Math.max(2, Math.round(r.height * dpr));
    if (hd.width !== w || hd.height !== h) { hd.width = w; hd.height = h; }
  }
  if (window.ResizeObserver) new ResizeObserver(sizeHD).observe(hd);
  window.addEventListener('resize', sizeHD);

  const BW = 166, BH = 66;   // logical drawing units (scaled to the portal's real size)
  function circ(g, x, y, r, col, glow) {
    g.fillStyle = col;
    if (glow) { g.shadowColor = col; g.shadowBlur = glow; }
    g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill();
    if (glow) g.shadowBlur = 0;
  }
  function seg(g, x0, y0, x1, y1, col, lw) {
    g.strokeStyle = col; g.lineWidth = lw || 0.5; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  }
  function arrowHD(g, x0, y0, x1, y1, col, lw, head) {
    const L = Math.hypot(x1 - x0, y1 - y0);
    if (L < 0.4) { circ(g, x0, y0, (lw || 0.5) * 0.7, col); return; }
    const ux = (x1 - x0) / L, uy = (y1 - y0) / L, hs = Math.min(head || 1.8, L * 0.55);
    const bx = x1 - ux * hs, by = y1 - uy * hs;
    seg(g, x0, y0, bx, by, col, lw);
    g.fillStyle = col; g.beginPath();
    g.moveTo(x1, y1); g.lineTo(bx - uy * hs * 0.55, by + ux * hs * 0.55); g.lineTo(bx + uy * hs * 0.55, by - ux * hs * 0.55);
    g.closePath(); g.fill();
  }
  function polyline(g, pts, col, lw, glow) {
    g.strokeStyle = col; g.lineWidth = lw; g.lineJoin = 'round'; g.lineCap = 'round';
    if (glow) { g.shadowColor = col; g.shadowBlur = glow; }
    g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
    if (glow) g.shadowBlur = 0;
  }
  function textHD(g, s, x, y, col, size, align) {
    g.font = `${size || 4}px "Press Start 2P", monospace`; g.fillStyle = col;
    g.textAlign = align || 'left'; g.textBaseline = 'middle'; g.fillText(s, x, y);
  }
  function labelKHD(g) {
    textHD(g, 'k', 3, BH - 4.5, '#ffe7a0', 5);
    arrowHD(g, 9.5, BH - 4.5, 21, BH - 4.5, '#ffe7a0', 0.45, 1.6);
  }
  function labelB0HD(g, kind) {
    const x = BW - 24, y = BH - 4.5, col = '#c9b8ff';
    textHD(g, 'B', x - 1, y, col, 5); textHD(g, '0', x + 4.3, y + 1.5, col, 3.2);
    const cx = x + 13;
    if (kind === 'out') { g.strokeStyle = col; g.lineWidth = 0.4; g.beginPath(); g.arc(cx + 2, y, 2.2, 0, 6.2832); g.stroke(); circ(g, cx + 2, y, 0.6, col); }
    if (kind === 'right') arrowHD(g, cx - 2, y, cx + 9, y, col, 0.45, 1.6);
    if (kind === 'up') arrowHD(g, cx + 2, y + 3, cx + 2, y - 3.5, col, 0.45, 1.6);
  }
  // bottom-row key, centred between the k label and the B0 label
  function legendHD(g, items) {
    const y = BH - 4.5, ts = 3, gap = 5;
    const widths = items.map(it => (it.sw || 4) + 1.5 + it.label.length * ts);
    let x = (24 + (BW - 28)) / 2 - (widths.reduce((a, b) => a + b, 0) + gap * (items.length - 1)) / 2;
    g.fillStyle = 'rgba(6,10,28,0.72)';
    g.fillRect(x - 2, y - 3.2, widths.reduce((a, b) => a + b, 0) + gap * (items.length - 1) + 4, 6.4);
    items.forEach((it, i) => {
      const sw = it.sw || 4, cx = x + sw / 2;
      if (it.kind === 'e') circ(g, cx, y, 0.85, C.cyan, 2);
      else if (it.kind === 'ion') circ(g, cx, y, 1.2, C.ion, 2);
      else if (it.kind === 'ionFixed') circ(g, cx, y, 0.6, '#8a3f2a');
      else if (it.kind === 'E') arrowHD(g, x, y, x + sw, y, C.yel, 0.5, 1.4);
      else if (it.kind === 'line') { g.shadowColor = it.col; g.shadowBlur = 1.5; seg(g, x, y, x + sw, y, it.col, 0.6); g.shadowBlur = 0; }
      else if (it.kind === 'grad') {
        const gr = g.createLinearGradient(x, 0, x + sw, 0);
        gr.addColorStop(0, 'rgb(70,160,255)'); gr.addColorStop(1, 'rgb(240,250,255)');
        g.fillStyle = gr; g.fillRect(x, y - 0.9, sw, 1.8);
      }
      textHD(g, it.label, x + sw + 1.5, y + 0.2, it.tcol || '#b8c4e8', ts);
      x += widths[i] + gap;
    });
  }
  const E_ = { kind: 'e', label: 'e-' }, ION = { kind: 'ion', label: 'ion' }, ION0 = { kind: 'ionFixed', label: 'ion (fixed)' };
  const EF = { kind: 'E', label: 'E', sw: 5 };
  function backdrop(g) {
    const bg = g.createLinearGradient(0, 0, 0, BH);
    bg.addColorStop(0, '#0b1230'); bg.addColorStop(1, '#060a1c');
    g.fillStyle = bg; g.fillRect(0, 0, BW, BH);
    g.strokeStyle = 'rgba(80,110,200,0.10)'; g.lineWidth = 0.15;
    g.beginPath();
    for (let x = 0; x <= BW; x += 8.3) { g.moveTo(x, 0); g.lineTo(x, BH); }
    for (let y = 0; y <= BH; y += 8.25) { g.moveTo(0, y); g.lineTo(BW, y); }
    g.stroke();
  }
  function vignette(g) {
    const v = g.createRadialGradient(BW / 2, BH / 2, BH * 0.4, BW / 2, BH / 2, BW * 0.62);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,10,0.55)');
    g.fillStyle = v; g.fillRect(0, 0, BW, BH);
  }
  // smooth charge-density band from −∂ξ/∂x on a fine grid
  function densityBand(g, tsec, y, hgt) {
    const N = 166, Xs = gridX(N), { re } = psiArr(Xs, tsec), dx = BW / N;
    const norm = N / (F.k0 * F.Lwin);   // max |Δξ| per cell for a unit plane wave is k0·Lwin/N
    for (let i = 0; i < N; i++) {
      const a = re[Math.max(0, i - 1)], b = re[Math.min(N - 1, i + 1)];
      const c = Math.max(-1, Math.min(1, -(b - a) / 2 * norm));
      g.fillStyle = c > 0 ? `rgba(80,130,255,${Math.abs(c)})` : `rgba(255,80,100,${Math.abs(c)})`;
      g.fillRect(i * dx, y, dx + 0.05, hgt);
    }
  }

  function drawVisHD(now) {
    sizeHD();
    const g = hctx, n = curNode(), v = n.vis, tsec = (now - ui.t0) / 1000;
    g.setTransform(hd.width / BW, 0, 0, hd.height / BH, 0, 0);
    g.shadowBlur = 0; g.globalAlpha = 1;
    backdrop(g);
    if (v.type === 'idle' || !F) {
      for (let r = 0; r < 4; r++) for (let i = 0; i < 27; i++) {
        const x = 4 + i * 6.05, y = 9 + r * 12;
        circ(g, x, y, 1.0, '#9a4a32'); circ(g, x + 3, y + 5, 0.65, '#3aa0c0');
      }
      textHD(g, 'COLD · QUIET · UNIFORM', BW / 2, BH - 5, '#8a8cc0', 3.6, 'center');
      vignette(g); return;
    }
    const hot = !!v.hot;
    if (v.type === 'long' || v.type === 'ia') {
      const N = 42, sp = BW / N, Xs = gridX(N), { re } = psiArr(Xs, tsec), A = sp * 0.85;
      const rows = v.type === 'ia' ? [9, 23, 37] : [7, 17, 27, 37];
      for (const y of rows) for (let i = 0; i < N; i++) {
        const bx = (i + 0.5) * sp;
        if (v.type === 'ia') {
          circ(g, bx + re[i] * A, y, 1.25, C.ion, 2);
          for (let e = 0; e < 3; e++) circ(g, bx + re[i] * A + (Math.random() * 2 - 1) * 2.2, y + 4 + e * 1.6 + (Math.random() * 2 - 1) * 0.8, 0.42, C.cyan);
        } else {
          circ(g, bx, y + 4.5, 0.45, '#8a3f2a');
          const jx = hot ? (Math.random() * 2 - 1) * 1.0 : 0, jy = hot ? (Math.random() * 2 - 1) * 0.8 : 0;
          circ(g, bx + re[i] * A + jx, y + jy, 0.85, C.cyan, 2);
        }
      }
      densityBand(g, tsec, BH - 15.5, 3.5);
      textHD(g, 'charge density', BW - 2, BH - 18.2, 'rgba(180,190,230,0.6)', 3, 'right');
      labelKHD(g);
      legendHD(g, v.type === 'ia' ? [ION, E_] : [E_, ION0]);
      vignette(g); return;
    }
    if (v.type === 'ellipse') {
      const N = 18, sp = BW / N, Xs = gridX(N), { re, im } = psiArr(Xs, tsec), A = sp * 0.75;
      const rows = [11, 28, 45];
      const r = v.which === 'UH' ? PHYS.WC / F.w0 : v.which === 'EIC' ? 1 / F.w0 : 0.15;
      for (const y of rows) for (let i = 0; i < N; i++) {
        const bx = (i + 0.5) * sp, amp = Math.hypot(re[i], im[i]);
        g.strokeStyle = 'rgba(90,120,220,0.35)'; g.lineWidth = 0.25;
        g.beginPath(); g.ellipse(bx, y, Math.max(0.01, A * amp), Math.max(0.01, A * amp * r), 0, 0, 6.2832); g.stroke();
        if (v.which === 'UH') {
          circ(g, bx, y + 6.5, 0.5, '#8a3f2a');
          circ(g, bx + re[i] * A, y + im[i] * A * r, 1.0, C.cyan, 2.5);   // e-: counter-clockwise = right-handed about B0 (out of screen)
        } else if (v.which === 'EIC') {
          circ(g, bx + re[i] * A, y - im[i] * A * r, 1.4, C.ion, 2.5);   // ion: clockwise = left-handed about B0
          circ(g, bx + (Math.random() * 2 - 1) * 1.8, y + 6 + (Math.random() * 2 - 1) * 0.8, 0.45, C.cyan);
        } else { // LH: ions slosh along k, electrons E×B-drift across it
          g.strokeStyle = 'rgba(95,225,255,0.25)'; g.lineWidth = 0.25;
          g.beginPath(); g.moveTo(bx + 3, y - A * amp * 1.25); g.lineTo(bx + 3, y + A * amp * 1.25); g.stroke();
          circ(g, bx - re[i] * A, y + im[i] * A * 0.15, 1.4, C.ion, 2.5);   // ions ~ -E/w^2, small left-handed ellipse
          circ(g, bx + 3, y - im[i] * A * 1.25, 0.85, C.cyan, 2);
        }
      }
      labelKHD(g); labelB0HD(g, 'out');
      legendHD(g, v.which === 'UH' ? [E_, ION0] : [ION, E_]);
      vignette(g); return;
    }
    if (v.type === 'trans' || v.type === 'xwave') {
      const N = 29, sp = BW / N, Xs = gridX(N), { re, im } = psiArr(Xs, tsec), ym = 25;
      let rho = 0, s = 1, xa = [0, 0], xb = [1, 0];   // electron displacement amplitudes [re, im] along x and y
      if (v.type === 'xwave') {
        // Ex/Ey = -i rho with signed rho = wc / (w (w^2 - wUH^2))  (flips sign across the upper-hybrid resonance)
        const w = F.w0, wc = PHYS.WC;
        rho = Math.max(-3, Math.min(3, wc / (w * (w * w - PHYS.WUH * PHYS.WUH)))); s = 1 / Math.max(1, Math.abs(rho));
        // cold electrons, B0 out of screen:  w^2 xa + i w wc xb = Ea,  -i w wc xa + w^2 xb = Eb   (Ea = -i rho, Eb = 1)
        const det = w * w * (w * w - wc * wc);
        xa = [0, -(w * w * rho + w * wc) / det];
        xb = [(w * w + w * wc * rho) / det, 0];
        const m = Math.max(Math.hypot(...xa), Math.hypot(...xb)); xa = xa.map(q => q / m); xb = xb.map(q => q / m);
      }
      seg(g, 0, ym, BW, ym, 'rgba(120,140,220,0.35)', 0.25);
      // smooth envelope of E_y along the axis
      const D = 200, Xd = gridX(D), dd = psiArr(Xd, tsec);
      polyline(g, Array.from({ length: D }, (_, i) => [(i + 0.5) * BW / D, ym - dd.re[i] * 20 * s]), 'rgba(255,225,74,0.35)', 0.35);
      g.shadowColor = C.yel; g.shadowBlur = 2;
      for (let i = 0; i < N; i++) {
        const x = (i + 0.5) * sp, ey = re[i] * 20 * s, ex = rho * im[i] * 9 * s;
        arrowHD(g, x, ym, x + ex, ym - ey, C.yel, 0.55, 1.7);
      }
      g.shadowBlur = 0;
      for (let i = 0; i < N; i++) {
        const x = (i + 0.5) * sp;
        circ(g, x + (xa[0] * re[i] - xa[1] * im[i]) * 2.8, 52 - (xb[0] * re[i] - xb[1] * im[i]) * 2.8, 0.85, C.cyan, 2);
      }
      labelKHD(g);
      legendHD(g, [EF, E_]);
      if (v.type === 'xwave') labelB0HD(g, 'out');
      if (v.bAlongE) labelB0HD(g, 'up');
      vignette(g); return;
    }
    if (v.type === 'helix') {
      const ym = 28, L = 18, proj = (x, ey, ez) => [x - ez * 0.45 * L, ym - ey * L + ez * 0.35 * L];
      const D = 240, Xd = gridX(D), dd = psiArr(Xd, tsec);
      const curve = Array.from({ length: D }, (_, i) => { const x = (i + 0.5) * BW / D, ez = -v.hand * dd.im[i]; return { p: proj(x, dd.re[i], ez), z: ez }; });
      const N = 38, sp = BW / N, Xs = gridX(N), { re, im } = psiArr(Xs, tsec);
      const arrows = Array.from({ length: N }, (_, i) => { const x = (i + 0.5) * sp, ez = -v.hand * im[i]; return { x, tip: proj(x, re[i], ez), z: ez }; });
      // electrons: cold response to a circular E is xi = (e/m) E / (w (w -+ wce)), parallel or antiparallel to E
      const w = F.w0, fe = w / (w - v.hand * PHYS.WC);          // xi_e / (e E / m w^2)
      const se = Math.sign(fe) * Math.min(1.25, Math.max(0.3, Math.abs(fe))) * 0.55;
      const NP = 13, spp = BW / NP, Xp = gridX(NP), pp = psiArr(Xp, tsec);
      const elec = Array.from({ length: NP }, (_, i) => { const x = (i + 0.5) * spp, ez = -v.hand * pp.im[i] * se; return { x, p: proj(x, pp.re[i] * se, ez), z: ez }; });
      const orbit = (x, rad, col) => {
        const pts = []; for (let j = 0; j <= 24; j++) { const a = j / 24 * 6.2832; pts.push(proj(x, Math.cos(a) * rad, Math.sin(a) * rad)); }
        polyline(g, pts, col, 0.2);
      };
      for (let i = 0; i < NP; i++) orbit(elec[i].x, Math.abs(se) * Math.hypot(pp.re[i], pp.im[i]), 'rgba(95,225,255,0.18)');
      const drawE = front => elec.forEach(e => { if ((e.z >= 0) === front) circ(g, e.p[0], e.p[1], front ? 0.95 : 0.75, front ? C.cyan : 'rgba(95,225,255,0.55)', front ? 2.5 : 0); });
      // psi = exp(i(kx - wt)): right-hand rotation about B0 (+x) has E_z = Re(i psi) = -Im psi, hence ez = -hand * im
      // back half first, then the B0 axis, then the front half
      drawE(false);
      arrows.forEach(a => { if (a.z < 0) arrowHD(g, a.x, ym, a.tip[0], a.tip[1], 'rgba(160,140,60,0.75)', 0.45, 1.4); });
      for (let i = 1; i < D; i++) if (curve[i].z < 0) seg(g, curve[i - 1].p[0], curve[i - 1].p[1], curve[i].p[0], curve[i].p[1], 'rgba(170,110,170,0.6)', 0.45);
      seg(g, 0, ym, BW, ym, '#c9b8ff', 0.4);
      for (let i = 0; i < NP; i++) circ(g, elec[i].x, ym, 0.6, '#8a3f2a');
      g.shadowColor = '#ffd0f0'; g.shadowBlur = 2;
      for (let i = 1; i < D; i++) if (curve[i].z >= 0) seg(g, curve[i - 1].p[0], curve[i - 1].p[1], curve[i].p[0], curve[i].p[1], '#ffd0f0', 0.6);
      g.shadowColor = C.yel;
      arrows.forEach(a => { if (a.z >= 0) arrowHD(g, a.x, ym, a.tip[0], a.tip[1], C.yel, 0.55, 1.6); });
      g.shadowBlur = 0;
      drawE(true);
      textHD(g, v.hand > 0 ? 'R' : 'L', 3, 4, '#ffd0f0', 4);
      textHD(g, se < 0 ? 'e- move opposite E' : 'e- move with E', BW - 3, 4, '#8fb4d8', 3, 'right');
      labelKHD(g); labelB0HD(g, 'right');
      legendHD(g, [EF, E_, ION0]);
      vignette(g); return;
    }
    if (v.type === 'string') {
      const D = 240, Xd = gridX(D), { re } = psiArr(Xd, tsec);
      for (let r = 0; r < 5; r++) {
        const y0 = 7 + r * 9.5;
        polyline(g, Array.from({ length: D }, (_, i) => [(i + 0.5) * BW / D, y0 - re[i] * 6.5]), '#7fe8ff', 0.55, 2.5);
        for (let i = 8; i < D; i += 20) circ(g, (i + 0.5) * BW / D, y0 - re[i] * 6.5, 1.15, C.ion, 2);
      }
      labelKHD(g); labelB0HD(g, 'right');
      legendHD(g, [{ kind: 'line', col: '#7fe8ff', label: 'B line', sw: 6 }, ION]);
      vignette(g); return;
    }
    if (v.type === 'compress') {
      const N = 23, sp = BW / N, Xs = gridX(N), { re } = psiArr(Xs, tsec), A = sp * 0.42;
      const xs = Array.from({ length: N }, (_, i) => (i + 0.5) * sp + re[i] * A);
      for (let i = 0; i < N; i++) {
        const gap = ((i < N - 1 ? xs[i + 1] - xs[i] : sp) + (i > 0 ? xs[i] - xs[i - 1] : sp)) / 2;
        const c = Math.max(0, Math.min(1, (sp - gap) / (sp * 0.7) + 0.5));
        const col = `rgb(${Math.round(70 + 170 * c)},${Math.round(160 + 90 * c)},255)`;
        g.shadowColor = col; g.shadowBlur = 1 + 3 * c;
        seg(g, xs[i], 1.5, xs[i], BH - 11, col, 0.35 + 0.45 * c);
        g.shadowBlur = 0;
        if (i < N - 1) for (let r = 0; r < 3; r++) circ(g, (xs[i] + xs[i + 1]) / 2, 9 + r * 16, 1.0, C.ion, 1.5);
      }
      labelKHD(g); labelB0HD(g, 'up');
      legendHD(g, [{ kind: 'grad', label: 'B line: white = squeezed', sw: 6 }, ION]);
      vignette(g);
    }
  }

  /* ----------------------------------------------------- signs & motes */
  function drawSigns(g, now) {
    const { branches, exits } = sceneData, nxt = guidedNext();
    branches.forEach((b, i) => {
      const ex = exits[i], ok = exitAllowed(ex), isGuide = !state.completed && ex.to === nxt && !ex.self;
      const x = b.sx, y = b.sy;
      g.fillStyle = '#3a2614'; g.fillRect(x, y - 12, 2, 13);
      const px = x - 6, py = y - 22;
      const glow = isGuide ? 0.5 + 0.5 * Math.sin(now / 180) : 0;
      if (isGuide) { g.globalAlpha = 0.35 + glow * 0.4; g.fillStyle = C.yel; g.fillRect(px - 3, py - 3, 20, 16); g.globalAlpha = 1; }
      g.fillStyle = '#1c120a'; g.fillRect(px - 1, py - 1, 16, 12);
      g.fillStyle = ok ? (isGuide ? '#e6b04a' : '#a8743c') : '#5a5a66'; g.fillRect(px, py, 14, 10);
      g.fillStyle = ok ? '#c88c4c' : '#6e6e7a'; g.fillRect(px, py, 14, 1);
      pixelText(g, String(i + 1), px + 7, py + 1, ok ? '#1c120a' : '#2a2a34', 'center');
    });
  }
  function drawMotes(g, now) {
    const { motes, fire } = sceneData;
    motes.forEach(m => {
      const t = now / 1000 * m.sp + m.ph;
      const x = (m.x + Math.sin(t) * 8 + W) % W, y = m.y + Math.sin(t * 1.7) * 4;
      const a = fire ? 0.5 + 0.5 * Math.sin(t * 3) : 0.5;
      g.globalAlpha = a; g.fillStyle = fire ? '#e8ff7a' : '#fffbe0'; g.fillRect(Math.round(x), Math.round(y), 1, 1);
      if (fire && a > 0.8) { g.globalAlpha = 0.3; g.fillRect(Math.round(x) - 1, Math.round(y), 3, 1); g.fillRect(Math.round(x), Math.round(y) - 1, 1, 3); }
      g.globalAlpha = 1;
    });
  }
  function drawWorld(g, now) {
    g.drawImage(sceneData.bg, 0, 0);
    drawPortal(g, now);
    drawSigns(g, now);
    drawMotes(g, now);
  }

  /* --------------------------------------------------------------- map */
  function mapXY(pos, w, h, m) { return [m + pos[0] / 10 * (w - 2 * m), m * 0.9 + pos[1] / 8 * (h - 1.9 * m)]; }
  function drawMap(g, w, h, big, now) {
    const m = big ? 70 : 16, sc = big ? 2.4 : 1.35;
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#0c1024'; g.fillRect(0, 0, w, h);
    const yDiv = mapXY([0, 2.8], w, h, m)[1], xDiv = mapXY([5, 0], w, h, m)[0];
    g.fillStyle = 'rgba(90,190,100,0.10)'; g.fillRect(0, 0, w, yDiv);
    g.fillStyle = 'rgba(150,90,230,0.13)'; g.fillRect(0, yDiv, w, h - yDiv);
    g.fillStyle = 'rgba(255,255,255,0.03)'; g.fillRect(xDiv, 0, w - xDiv, h);
    g.strokeStyle = 'rgba(200,200,255,0.25)'; g.lineWidth = sc; g.setLineDash([3 * sc, 3 * sc]);
    g.beginPath(); g.moveTo(0, yDiv); g.lineTo(w, yDiv); g.moveTo(xDiv, 0); g.lineTo(xDiv, h); g.stroke(); g.setLineDash([]);
    g.font = `${big ? 26 : 13}px VT323, monospace`; g.textBaseline = 'top';
    g.fillStyle = 'rgba(190,240,190,0.75)'; g.textAlign = 'left'; g.fillText('B₀ = 0', 4 * sc, yDiv - (big ? 26 : 13));
    g.fillStyle = 'rgba(210,180,255,0.8)'; g.fillText('B₀ ≠ 0', 4 * sc, yDiv + 2 * sc);
    g.fillStyle = 'rgba(220,220,255,0.55)';
    g.textAlign = 'right'; g.fillText(big ? 'ELECTROSTATIC  E₁ ∥ k' : 'E₁∥k', xDiv - 4 * sc, h - (big ? 30 : 14));
    g.textAlign = 'left'; g.fillText(big ? 'ELECTROMAGNETIC  E₁ ⊥ k' : 'E₁⊥k', xDiv + 4 * sc, h - (big ? 30 : 14));
    // edges
    for (const e of EDGES) {
      const known = state.completed || visited(e.a) || visited(e.b);
      if (!known) continue;
      const trav = state.edges.includes(edgeKey(e));
      const [x0, y0] = mapXY(NODES[e.a].pos, w, h, m), [x1, y1] = mapXY(NODES[e.b].pos, w, h, m);
      g.strokeStyle = trav ? '#e8d8a8' : 'rgba(140,140,180,0.55)'; g.lineWidth = (trav ? 2 : 1) * sc;
      if (!trav) g.setLineDash([2 * sc, 3 * sc]);
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.setLineDash([]);
    }
    // nodes
    const nxt = guidedNext(), blink = Math.sin(now / 220) > 0;
    for (const id in NODES) {
      const n = NODES[id], [x, y] = mapXY(n.pos, w, h, m), seen = visited(id) || state.completed, r = 5 * sc;
      if (id === nxt && blink) { g.strokeStyle = C.yel; g.lineWidth = 2 * sc; g.beginPath(); g.arc(x, y, r + 4 * sc, 0, 7); g.stroke(); }
      if (!seen) {
        g.fillStyle = '#2a2e48'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
        g.fillStyle = '#7a7ea8'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `${big ? 24 : 12}px VT323, monospace`; g.fillText('?', x, y + 1);
      } else if (n.kind === 'osc') {
        g.fillStyle = C.mag; g.beginPath(); g.moveTo(x, y - r - 1); g.lineTo(x + r + 1, y); g.lineTo(x, y + r + 1); g.lineTo(x - r - 1, y); g.closePath(); g.fill();
        g.fillStyle = '#300a28'; g.fillRect(x - sc, y - sc, 2 * sc, 2 * sc);
      } else if (n.kind === 'wave') {
        g.fillStyle = C.cyan; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
        g.strokeStyle = '#083040'; g.lineWidth = sc; g.beginPath();
        for (let q = -r + 1; q <= r - 1; q++) { const yy = y + Math.sin(q / r * Math.PI * 1.5) * r * 0.4; if (q === -r + 1) g.moveTo(x + q, yy); else g.lineTo(x + q, yy); } g.stroke();
      } else {
        g.fillStyle = C.yel; g.fillRect(x - r * 0.8, y - r * 0.8, r * 1.6, r * 1.6);
      }
      if (big) {
        g.font = '22px VT323, monospace'; g.textAlign = 'center'; g.textBaseline = 'top';
        const label = seen ? n.name : '???';
        g.fillStyle = '#000'; g.fillText(label, x + 1, y + r + 5);
        g.fillStyle = seen ? (n.kind === 'osc' ? '#ffc0f0' : n.kind === 'wave' ? '#c0f4ff' : '#ffeeaa') : '#6a6e98';
        g.fillText(label, x, y + r + 4);
      }
    }
    // player
    const [px, py] = mapXY(curNode().pos, w, h, m), bob = Math.sin(now / 200) * 1.5 * sc;
    g.fillStyle = C.yel; g.strokeStyle = '#000'; g.lineWidth = sc;
    g.beginPath(); g.moveTo(px, py - 7 * sc + bob); g.lineTo(px - 4 * sc, py - 13 * sc + bob); g.lineTo(px + 4 * sc, py - 13 * sc + bob); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = C.yel; g.lineWidth = 1.5 * sc; g.beginPath(); g.arc(px, py, (8 + 2 * Math.sin(now / 250)) * sc, 0, 7); g.stroke();
    if (!big) { g.strokeStyle = '#4a4e7a'; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2); }
  }

  /* ----------------------------------------------------------- journal */
  const journal = $('#journal');
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function renderMath(el) {
    if (window.renderMathInElement) {
      try { window.renderMathInElement(el, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false }); } catch (e) { /* ignore */ }
    }
  }
  function renderJournal() {
    const n = curNode(), prev = prevId ? NODES[prevId] : null;
    const badge = n.kind === 'osc' ? 'OSCILLATION · v<sub>g</sub> = 0' : n.kind === 'wave' ? 'WAVE · v<sub>g</sub> ≠ 0' : 'TRAILHEAD';
    let h = `<div class="jhead"><span class="badge ${n.kind}">${badge}</span><h1>${esc(n.name)}</h1><div class="sub">${esc(n.subtitle)}</div></div>`;
    if (arrivedVia) h += `<div class="changed"><span>PATH TAKEN</span> ${esc(arrivedVia)}</div>`;
    h += `<p class="intro">${n.intro}</p>`;
    h += `<h2>Assumption dials</h2><table class="dials">`;
    for (const k in DIAL_LABELS) {
      const ch = prev && prev.dials[k] !== n.dials[k];
      h += `<tr class="${ch ? 'ch' : ''}"><th>${DIAL_LABELS[k]}</th><td>${esc(n.dials[k])}${ch ? ` <span class="was">was: ${esc(prev.dials[k])}</span>` : ''}</td></tr>`;
    }
    h += `</table>`;
    h += `<h2>${n.kind === 'start' ? 'Ground rules' : 'Minimal assumptions'}</h2><ul class="assume">${n.assume.map(a => `<li>${a}</li>`).join('')}</ul>`;
    if (n.steps.length) h += `<h2>Derivation</h2><ol class="steps">${n.steps.map(s => `<li>${s}</li>`).join('')}</ol>`;
    if (n.result) h += `<div class="result">$$${n.result}$$</div>`;
    if (n.extra) h += `<p class="extra">${n.extra}</p>`;
    if (n.disp) h += `<h2>Dispersion relation &amp; the two speeds</h2><canvas id="disp" width="560" height="340"></canvas><div id="readout"></div>`;
    h += `<h2>${n.kind === 'start' ? 'Oscillation vs. wave' : 'Oscillation or wave?'}</h2><div class="ow">${n.owNote}</div>`;
    h += `<h2>${n.kind === 'start' ? 'How to play' : 'Physical picture'}</h2><p>${n.picture}</p>`;
    h += `<h2>Paths from this clearing</h2><ul class="paths">`;
    exitsOf(n.id).forEach((ex, i) => {
      const dest = ex.self ? '↺ loops back here' : (visited(ex.to) || state.completed) ? NODES[ex.to].name : '???';
      h += `<li><kbd>${i + 1}</kbd> ${esc(ex.label)} <span class="dest">→ ${esc(dest)}</span></li>`;
    });
    h += `</ul>`;
    journal.innerHTML = h;
    renderMath(journal);
    journal.scrollTop = 0;
    drawDispersion();
  }

  function niceStep(r) { const p = Math.pow(10, Math.floor(Math.log10(r))), f = r / p; return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p; }
  function fmt(v) { return Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2); }
  function drawDispersion() {
    const c = $('#disp'), n = curNode(), d = n.disp;
    if (!c || !d) return;
    const g = c.getContext('2d'), Wc = c.width, Hc = c.height, L = 62, R = 16, T = 16, B = 50;
    const X = k => L + k / d.kMax * (Wc - L - R), Y = w => Hc - B - w / d.wMax * (Hc - T - B);
    g.fillStyle = '#0b0f22'; g.fillRect(0, 0, Wc, Hc);
    g.font = '20px VT323, monospace'; g.textBaseline = 'middle';
    const ks = niceStep(d.kMax / 5), ws = niceStep(d.wMax / 5);
    g.strokeStyle = '#1c2246'; g.lineWidth = 1;
    for (let k = ks; k <= d.kMax + 1e-9; k += ks) { g.beginPath(); g.moveTo(X(k) + 0.5, T); g.lineTo(X(k) + 0.5, Hc - B); g.stroke(); }
    for (let w = ws; w <= d.wMax + 1e-9; w += ws) { g.beginPath(); g.moveTo(L, Y(w) + 0.5); g.lineTo(Wc - R, Y(w) + 0.5); g.stroke(); }
    g.fillStyle = '#9a9ac8'; g.textAlign = 'center';
    const showTicks = !!d.vUnit;
    if (showTicks) for (let k = 0; k <= d.kMax + 1e-9; k += ks) g.fillText(+k.toFixed(2), X(k), Hc - B + 12);
    g.textAlign = 'right';
    for (let w = 0; w <= d.wMax + 1e-9; w += ws) g.fillText(+w.toFixed(2), L - 6, Y(w));
    g.strokeStyle = '#8a8ab8'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(L, T); g.lineTo(L, Hc - B); g.lineTo(Wc - R, Hc - B); g.stroke();
    g.fillStyle = '#d8d8f4'; g.textAlign = 'center'; g.font = '22px VT323, monospace';
    g.fillText(d.xLabel, (L + Wc - R) / 2, Hc - 14);
    g.save(); g.translate(16, (T + Hc - B) / 2); g.rotate(-Math.PI / 2); g.fillText(d.yLabel, 0, 0); g.restore();
    g.save(); g.beginPath(); g.rect(L + 1, T, Wc - L - R, Hc - B - T); g.clip();
    g.font = '19px VT323, monospace';
    (d.refs || []).forEach(r => {
      g.strokeStyle = 'rgba(200,170,255,0.55)'; g.lineWidth = 1.5; g.setLineDash([6, 5]); g.beginPath();
      if (r.type === 'h') {
        g.moveTo(L, Y(r.w)); g.lineTo(Wc - R, Y(r.w)); g.stroke(); g.setLineDash([]); g.fillStyle = '#c8b0ff';
        if (r.side === 'left') { g.textAlign = 'left'; g.fillText(r.label, L + 8, Y(r.w) - 10); }
        else { g.textAlign = 'right'; g.fillText(r.label, Wc - R - 4, Y(r.w) - 10); }
      } else {
        const kEnd = Math.min(d.kMax, d.wMax / r.slope); g.moveTo(X(0), Y(0)); g.lineTo(X(kEnd), Y(r.slope * kEnd)); g.stroke(); g.setLineDash([]);
        g.fillStyle = '#c8b0ff'; g.textAlign = 'right'; const kk = kEnd * (r.at || 0.85); g.fillText(r.label, X(kk) - 6, Y(r.slope * kk) - 12);
      }
      g.setLineDash([]);
    });
    const main = n.kind === 'osc' ? C.mag : C.cyan;
    d.branches.forEach((b0, bi) => {
      const b = prepBranch(b0, d), active = bi === ui.branch;
      g.strokeStyle = active ? main : 'rgba(95,225,255,0.4)'; g.lineWidth = active ? 3.5 : 2; g.beginPath();
      let started = false;
      if (b._ks) {
        for (let i = 0; i < b._ks.length; i += 2) {
          const k = b._ks[i], w = b._ws[i]; if (k > d.kMax * 1.05) break;
          if (!started) { g.moveTo(X(k), Y(w)); started = true; } else g.lineTo(X(k), Y(w));
        }
        g.lineTo(X(Math.min(b._ks[b._ks.length - 1], d.kMax * 1.05)), Y(b.fn(d.kMax * 1.05)));
      } else {
        for (let i = 0; i <= 300; i++) { const k = i / 300 * d.kMax, w = b.fn(k); if (!started) { g.moveTo(X(k), Y(w)); started = true; } else g.lineTo(X(k), Y(w)); }
      }
      g.stroke();
    });
    // velocities at k0
    const br = activeBranch(), k0 = ui.k0, w0 = br.fn(k0), vg = vgOf(br, k0, d), mx = X(k0), my = Y(w0);
    g.strokeStyle = '#ff9de2'; g.lineWidth = 2; g.setLineDash([3, 4]);
    g.beginPath(); g.moveTo(X(0), Y(0)); g.lineTo(mx, my); g.stroke(); g.setLineDash([]);
    const dk = d.kMax * 0.2;
    g.strokeStyle = C.yel; g.lineWidth = 3; g.beginPath(); g.moveTo(X(k0 - dk), Y(w0 - vg * dk)); g.lineTo(X(k0 + dk), Y(w0 + vg * dk)); g.stroke();
    g.fillStyle = '#000'; g.fillRect(mx - 6, my - 6, 12, 12); g.fillStyle = C.yel; g.fillRect(mx - 4, my - 4, 8, 8);
    g.restore();
    g.font = '20px VT323, monospace'; g.textAlign = 'left';
    g.fillStyle = '#ff9de2'; g.fillText('┄ slope = v_φ', L + 10, T + 12);
    g.fillStyle = C.yel; g.fillText('━ slope = v_g', L + 10, T + 32);
    // readout
    const vp = w0 / k0, ro = $('#readout');
    if (!ro) return;
    const isOsc = Math.abs(vg) < 1e-6 * Math.max(1, Math.abs(vp));
    const u = d.vUnit ? ' ' + d.vUnit : '';
    let html = `<div class="ro"><span class="vp">v<sub>φ</sub> = ω/k = ${d.vUnit ? fmt(vp) + u : 'ω/k (any value: depends only on your choice of k)'}</span>`;
    html += `<span class="vg">v<sub>g</sub> = ∂ω/∂k = ${isOsc ? '0 exactly' : fmt(vg) + u}</span></div>`;
    if (d.vUnitNote) html += `<div class="unitnote">${esc(d.vUnitNote)}</div>`;
    if (isOsc) html += `<div class="verdict osc">v<sub>g</sub> = 0 → OSCILLATION. In PACKET mode the envelope in the portal stays put while the crests slide through it.</div>`;
    else {
      const r = vg / vp;
      const desc = r > 1.02 ? 'the envelope outruns the crests' : r < 0.98 ? 'crests slide forward through a slower envelope' : 'crests and envelope move together (non-dispersive)';
      html += `<div class="verdict wave">v<sub>g</sub>/v<sub>φ</sub> = ${fmt(r)} → WAVE: ${desc}.</div>`;
    }
    ro.innerHTML = html;
  }

  /* ----------------------------------------------------------- controls */
  const kslider = $('#kslider');
  function setupControls() {
    const n = curNode(), d = n.disp, bs = $('#branchSel');
    $('#controls').classList.toggle('disabled', !d);
    bs.innerHTML = '';
    if (d && d.branches.length > 1) {
      d.branches.forEach((b, i) => {
        const btn = document.createElement('button');
        btn.className = 'pbtn' + (i === ui.branch ? ' on' : ''); btn.textContent = b.name.toUpperCase();
        btn.onclick = () => { ui.branch = i; const br = activeBranch(); ui.k0 = Math.min(br.kHi, Math.max(br.kLo, ui.k0)); setupControls(); buildField(); drawDispersion(); sfx('click'); };
        bs.appendChild(btn);
      });
    }
    if (d) { const br = activeBranch(); kslider.value = Math.round((ui.k0 - br.kLo) / (br.kHi - br.kLo) * 1000); }
    $('#modePacket').classList.toggle('on', ui.packet);
    $('#modePlane').classList.toggle('on', !ui.packet);
  }
  kslider.addEventListener('input', () => {
    const d = curNode().disp; if (!d) return;
    const br = activeBranch(); ui.k0 = br.kLo + (br.kHi - br.kLo) * kslider.value / 1000;
    buildField(); drawDispersion();
  });
  function setPacket(p) { ui.packet = p; setupControls(); buildField(); sfx('click'); }
  $('#modePacket').onclick = () => setPacket(true);
  $('#modePlane').onclick = () => setPacket(false);

  /* ----------------------------------------------------------- choices */
  const choicesEl = $('#choices');
  function renderChoices() {
    const exits = exitsOf(state.current), nxt = guidedNext();
    choicesEl.innerHTML = '';
    exits.forEach((ex, i) => {
      const ok = exitAllowed(ex), guide = !state.completed && ex.to === nxt && !ex.self;
      const dest = ex.self ? '↺ ?' : (visited(ex.to) || state.completed) ? NODES[ex.to].name : '???';
      const b = document.createElement('button');
      b.className = 'choice' + (ok ? '' : ' locked') + (guide ? ' guide' : '');
      b.innerHTML = `<span class="num">${i + 1}</span><span class="lbl">${esc(ex.label)}</span><span class="dest">${ok ? '→ ' + esc(dest) : '🔒 finish the trail first'}</span>`;
      b.onclick = () => choose(i);
      choicesEl.appendChild(b);
    });
    if (!exits.length) choicesEl.innerHTML = '<div class="nochoice">Dead end.</div>';
    const prog = $('#progress');
    if (state.completed) prog.textContent = `FREE ROAM · ${state.visited.length}/${Object.keys(NODES).length}`;
    else prog.textContent = `TRAIL ${state.guidedIndex}/${GUIDED.length - 1}`;
  }

  /* ----------------------------------------------------------- moving */
  let trans = null;
  function choose(i) {
    if (trans || !$('#overlay').hidden) return;
    const ex = sceneData.exits[i]; if (!ex) return;
    if (!exitAllowed(ex)) { toast(ex.self ? 'Loop-back paths open after you finish the trail. Follow the glowing sign.' : 'This way is still dark. Finish the trail first: follow the glowing sign.'); sfx('deny'); return; }
    if (ex.self) { trans = { type: 'loop', t0: performance.now(), dur: 1100, ex }; sfx('loop'); return; }
    const b = sceneData.branches[i];
    trans = { type: 'out', t0: performance.now(), dur: 900, hx: b.hx, hy: b.hy, ex };
    sfx('walk');
  }
  function arrive(ex) {
    prevId = state.current; arrivedVia = ex ? ex.label : null;
    state.current = ex.to;
    if (!visited(ex.to)) state.visited.push(ex.to);
    if (ex.key && !state.edges.includes(ex.key)) state.edges.push(ex.key);
    let finished = false;
    if (!state.completed && GUIDED[state.guidedIndex + 1] === ex.to) {
      state.guidedIndex++;
      if (state.guidedIndex === GUIDED.length - 1) { state.completed = true; finished = true; }
    }
    save(); enterNode(true);
    sfx(curNode().kind === 'osc' ? 'osc' : 'wave');
    if (finished) setTimeout(showComplete, 1300);
  }
  function fastTravel(id) {
    if (id === state.current) return;
    prevId = null; arrivedVia = 'Fast travel via the map';
    state.current = id; if (!visited(id)) state.visited.push(id);
    save(); closeMap(); trans = { type: 'in', t0: performance.now(), dur: 600 }; enterNode(true); sfx('wave');
  }
  function enterNode(keepUi) {
    const n = curNode();
    ui.branch = 0;
    if (n.disp) { const br = activeBranch(); ui.k0 = Math.min(br.kHi, Math.max(br.kLo, n.disp.k0)); }
    buildScene(); buildField(); setupControls(); renderChoices(); renderJournal();
  }

  /* ----------------------------------------------------------- frame */
  const scene = $('#scene'); scene.width = W; scene.height = H;
  const sctx = scene.getContext('2d'); sctx.imageSmoothingEnabled = false;
  const mm = $('#minimap'); mm.width = 240; mm.height = 192;
  const mctx = mm.getContext('2d');
  const ease = t => t * t * (3 - 2 * t);
  function frame(now) {
    requestAnimationFrame(frame);
    drawVisHD(now);
    hd.style.visibility = trans ? 'hidden' : 'visible';
    const g = sctx;
    g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false;
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    if (trans) {
      const p = Math.min(1, (now - trans.t0) / trans.dur);
      if (trans.type === 'out') {
        const e = p * p, s = 1 + 2.4 * e;
        const fx = trans.hx + (W / 2 - trans.hx) * ease(p), fy = trans.hy + (H * 0.5 - trans.hy) * ease(p) + Math.sin(p * Math.PI * 6) * 1.5;
        g.setTransform(s, 0, 0, s, fx - trans.hx * s, fy - trans.hy * s);
        drawWorld(g, now);
        g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = `rgba(0,0,0,${p})`; g.fillRect(0, 0, W, H);
        if (p >= 1) { const ex = trans.ex; trans = { type: 'in', t0: now, dur: 650 }; arrive(ex); }
      } else if (trans.type === 'in') {
        const q = ease(p), s = 1.3 - 0.3 * q;
        g.setTransform(s, 0, 0, s, CX - CX * s, (HY + 20) - (HY + 20) * s);
        drawWorld(g, now);
        g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = `rgba(0,0,0,${1 - q})`; g.fillRect(0, 0, W, H);
        if (p >= 1) trans = null;
      } else if (trans.type === 'loop') {
        const off = Math.round(ease(p) * W);
        g.setTransform(1, 0, 0, 1, -off, 0); drawWorld(g, now);
        g.setTransform(1, 0, 0, 1, W - off, 0); drawWorld(g, now);
        g.setTransform(1, 0, 0, 1, 0, 0);
        if (p >= 1) { const ex = trans.ex; trans = null; toast(ex.note, 5200); }
      }
    } else drawWorld(g, now);
    drawMap(mctx, mm.width, mm.height, false, now);
    if (!$('#mapOverlay').hidden) drawMap(bctx, bm.width, bm.height, true, now);
  }

  /* ----------------------------------------------------------- map overlay */
  const bm = $('#bigmap'); bm.width = 1100; bm.height = 820;
  const bctx = bm.getContext('2d');
  function openMap() {
    $('#mapOverlay').hidden = false; sfx('click');
    $('#mapnote').innerHTML = state.completed
      ? 'Click any clearing to fast-travel there. ◆ = oscillation (v<sub>g</sub> = 0) · ● = wave · ▲ = you.'
      : 'Fast travel unlocks after you finish the trail. ◆ = oscillation (v<sub>g</sub> = 0) · ● = wave · ? = undiscovered · ▲ = you. The blinking ring is your next stop.';
  }
  function closeMap() { $('#mapOverlay').hidden = true; }
  bm.addEventListener('click', ev => {
    if (!state.completed) { toast('Finish the trail first to fast-travel.'); return; }
    const r = bm.getBoundingClientRect(), x = (ev.clientX - r.left) * bm.width / r.width, y = (ev.clientY - r.top) * bm.height / r.height;
    let best = null, bd = 1e9;
    for (const id in NODES) { const [nx, ny] = mapXY(NODES[id].pos, bm.width, bm.height, 70); const dd = Math.hypot(nx - x, ny - y); if (dd < bd) { bd = dd; best = id; } }
    if (best && bd < 50) fastTravel(best);
  });
  mm.addEventListener('click', openMap);
  $('#btnMap').onclick = openMap;
  $('#mapClose').onclick = closeMap;
  $('#mapOverlay').addEventListener('click', ev => { if (ev.target.id === 'mapOverlay') closeMap(); });

  /* ----------------------------------------------------------- overlays */
  let toastTimer = null;
  function toast(msg, ms) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, ms || 3600);
  }
  function showOverlay(html) { $('#ovbox').innerHTML = html; $('#overlay').hidden = false; renderMath($('#ovbox')); }
  function hideOverlay() { $('#overlay').hidden = true; }
  function showTitle() {
    const started = state.visited.length > 1;
    showOverlay(`
      <div class="titlebox">
        <div class="title">CHOOSE YOUR<br>OWN WAVE</div>
        <div class="tag">A plasma-physics trek through the forest of assumptions</div>
        <div class="howto">
          <p>Each <b>fork</b> in the trail changes one assumption: heat the electrons, add a magnetic field, tilt $\\mathbf k$, rotate $\\mathbf E_1$…
          Each <b>clearing</b> is the wave (or oscillation) those assumptions allow, shown in a portal with its full derivation in your field journal.</p>
          <p>Your <b>first trek follows a set trail</b> through all 13 clearings. Finish it and the whole forest opens for free exploration.</p>
          <p class="keys"><kbd>1</kbd>–<kbd>9</kbd> choose a path · <kbd>M</kbd> map · <kbd>P</kbd> packet / plane wave · <kbd>Esc</kbd> close</p>
        </div>
        <div class="btnrow">
          <button id="ovStart" class="pbtn big">${state.completed ? '▶ ENTER THE OPEN FOREST' : started ? '▶ CONTINUE THE TRAIL' : '▶ BEGIN THE TRAIL'}</button>
          ${started ? '<button id="ovReset" class="pbtn">RESET PROGRESS</button>' : ''}
        </div>
      </div>`);
    $('#ovStart').onclick = () => { hideOverlay(); sfx('start'); };
    const rb = $('#ovReset');
    if (rb) rb.onclick = () => {
      if (rb.dataset.armed) { resetProgress(); hideOverlay(); return; }
      rb.dataset.armed = '1'; rb.textContent = 'CLICK AGAIN TO ERASE PROGRESS'; rb.classList.add('on');
    };
  }
  function showComplete() {
    sfx('complete');
    const osc = Object.values(NODES).filter(n => n.kind === 'osc'), waves = Object.values(NODES).filter(n => n.kind === 'wave');
    showOverlay(`
      <div class="titlebox">
        <div class="title small">TRAIL COMPLETE!</div>
        <div class="tag">The whole forest is now open</div>
        <div class="howto">
          <div class="cols">
            <div><h3 class="osc">◆ OSCILLATIONS (v<sub>g</sub> = 0)</h3><ul>${osc.map(n => `<li>${n.name}</li>`).join('')}</ul>
              <p class="small">All cold, all with $\\omega$ independent of $k$. Each turns into a <i>wave</i> once something couples neighbours: pressure ($T\\neq0$), a little $k_\\parallel$, or the electromagnetic field (they sit at the cutoffs and resonances of the EM waves).</p></div>
            <div><h3 class="wave">● WAVES (v<sub>g</sub> ≠ 0)</h3><ul>${waves.map(n => `<li>${n.name}</li>`).join('')}</ul></div>
          </div>
          <p>Every fork is now unlocked, including cross-links (plasma oscillation ↔ light, X wave ↔ magnetosonic, ion acoustic ↔ magnetosonic, …) and loop-back paths that change nothing.
          Open the map (<kbd>M</kbd>) to fast-travel.</p>
        </div>
        <div class="btnrow"><button id="ovStart" class="pbtn big">▶ EXPLORE FREELY</button></div>
      </div>`);
    $('#ovStart').onclick = () => { hideOverlay(); renderChoices(); renderJournal(); };
  }
  $('#btnHelp').onclick = showTitle;

  /* ----------------------------------------------------------- sound */
  let actx = null;
  function tone(f, d, t0, type, vol) {
    const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + (t0 || 0);
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(vol || 0.035, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + d + 0.03);
  }
  function sfx(kind) {
    if (!state.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      const seq = {
        click: [[880, .05]], deny: [[180, .12], [140, .16, .1]],
        walk: [[150, .06, 0, 'triangle', .08], [130, .06, .22, 'triangle', .08], [150, .06, .44, 'triangle', .08], [130, .06, .66, 'triangle', .08]],
        wave: [[523, .09], [659, .09, .08], [784, .14, .16]],
        osc: [[659, .08], [523, .08, .08], [659, .08, .16], [523, .12, .24]],
        loop: [[440, .07], [554, .07, .08], [659, .07, .16], [440, .12, .3]],
        start: [[392, .08], [523, .08, .08], [659, .08, .16], [784, .18, .24]],
        complete: [[523, .1], [659, .1, .1], [784, .1, .2], [1046, .3, .3], [784, .1, .5], [1046, .4, .6]]
      }[kind] || [];
      seq.forEach(([f, d, t0, ty, v]) => tone(f, d, t0, ty, v));
    } catch (e) { /* audio unavailable */ }
  }
  function syncSoundBtn() { $('#btnSound').textContent = state.sound ? '♪' : '×'; $('#btnSound').title = state.sound ? 'Sound on' : 'Sound off'; }
  $('#btnSound').onclick = () => { state.sound = !state.sound; save(); syncSoundBtn(); sfx('click'); };

  /* ----------------------------------------------------------- keys */
  document.addEventListener('keydown', ev => {
    if (ev.target.tagName === 'INPUT' && ev.key !== 'Escape') { if (!/^[1-9]$/.test(ev.key)) return; }
    if (ev.key === 'Escape') { if (!$('#mapOverlay').hidden) closeMap(); else if (!$('#overlay').hidden && $('#ovStart')) $('#ovStart').click(); return; }
    if (!$('#overlay').hidden) return;
    if (/^[1-9]$/.test(ev.key)) { choose(+ev.key - 1); ev.preventDefault(); }
    else if (ev.key === 'm' || ev.key === 'M') { if ($('#mapOverlay').hidden) openMap(); else closeMap(); }
    else if (ev.key === 'p' || ev.key === 'P') setPacket(!ui.packet);
  });

  /* ----------------------------------------------------------- boot */
  function boot() {
    load(); syncSoundBtn();
    enterNode(false);
    requestAnimationFrame(frame);
    showTitle();
  }
  const fontsReady = document.fonts && document.fonts.load
    ? Promise.race([Promise.all([document.fonts.load('8px "Press Start 2P"'), document.fonts.load('20px VT323')]), new Promise(r => setTimeout(r, 2500))])
    : Promise.resolve();
  fontsReady.then(() => { textCache.clear(); boot(); }, boot);
})();
