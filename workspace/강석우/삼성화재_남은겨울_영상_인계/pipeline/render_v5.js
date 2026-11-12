// render_v5.js - plays work/page_v5.html frame by frame (30 fps) and saves JPEG frames per scene into work/frames_v5/.
// Quick look: EVERY=6 node render_v5.js  (every 6th frame -> work/preview_v5/)
// Playwright: `npm i playwright && npx playwright install chromium`, or point PLAYWRIGHT_PATH at an existing install.
let pw; try { pw = require('playwright'); } catch (e) { pw = require(process.env.PLAYWRIGHT_PATH); }
const { chromium } = pw;
const fs = require('fs'), path = require('path');
const DIR = __dirname, FPS = 30, DT = 1000 / FPS;
const EVERY = +(process.env.EVERY || 1);
const WORK = path.join(DIR, 'work'), OUT = path.join(WORK, EVERY > 1 ? 'preview_v5' : 'frames_v5');
const clamp = x => Math.max(0, Math.min(1, x));
const ease = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const seg = (t, a, b) => ease((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const VW = 800, VH = 450;             // page px; x2.4 device scale = 1920x1080
// intro plate camera. Units are landing px of the intro illustration (474 wide): k = zoom, (cx, cy) = point kept at screen centre.
const cam = (k, cx, cy) => ({ bgw: (3 * 474 * k).toFixed(2) + 'px', bgx: (400 - cx * k - 474 * k).toFixed(2) + 'px', bgy: (225 - cy * k).toFixed(2) + 'px' });
const T = {};

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox', '--allow-file-access-from-files'] });
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 2.4, locale: 'ko-KR' });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGEERR', e.message));
  await page.clock.install({ time: new Date('2026-11-12T10:00:00+09:00') });
  await page.goto('file://' + path.join(WORK, 'page_v5.html'));
  await page.evaluate(() => document.fonts.ready);
  await page.clock.pauseAt(new Date('2026-11-12T10:00:05+09:00'));
  await page.evaluate(() => window.__tick(0));          // freeze the intro entrances at t=0 so frame 0 is the true start
  let acc = 0;
  const tick = async () => { acc += DT; const ms = Math.floor(acc); acc -= ms; await page.clock.runFor(ms); await page.evaluate(dt => window.__tick(dt), DT); };
  const dur = {};
  async function scene(name, d, onFrame) {
    const dd = path.join(OUT, name); fs.rmSync(dd, { recursive: true, force: true }); fs.mkdirSync(dd, { recursive: true });
    const n = Math.round(d * FPS); dur[name] = n / FPS;
    for (let i = 0; i < n; i++) {
      await onFrame(i / FPS, i);
      if (i % EVERY === 0) await page.screenshot({ path: path.join(dd, String(i).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 96 });
      await tick();
    }
    console.log('scene', name, n, 'frames');
  }
  const set = (v, sel) => page.evaluate(([v, sel]) => window.__set(v, sel), [v, sel]);
  const fired = new Set(); const once = async (k, fn) => { if (!fired.has(k)) { fired.add(k); await fn(); } };
  const cls = (sel, add, rem) => page.evaluate(([sel, add, rem]) => { const e = document.querySelector(sel); (rem || []).forEach(c => e.classList.remove(c)); (add || []).forEach(c => e.classList.add(c)); }, [sel, add, rem]);

  // one continuous slow push-in on the pair across scenes 1+2 (no tilt, painted lettering never in frame)
  const D1 = 5.0, D2 = 8.1, DA = D1 + D2;
  const plate = g => { const e = g / DA; return cam(1.60 * (1 + 0.085 * e), lerp(250, 240, e), lerp(566, 560, e)); };

  // ---------- 1. COLD OPEN: copy only (no title), snow from frame 0 ----------
  await scene('1_intro', D1, async t => { await set({ ...plate(t), s: '1' }); });

  // ---------- 2. INPUT: ages flash -> question + compressed hesitation ----------
  await page.evaluate(() => document.querySelector('[data-go="s-input"]').click());
  await page.evaluate(() => { me.value = ''; mom.value = ''; });
  const type = (id, v) => page.evaluate(([id, v]) => { const e = document.getElementById(id); e.focus(); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, [id, v]);
  const G = 2.05;                       // ages -> question switch
  let P = null;
  const ptrAt = t => {
    for (let i = P.length - 1; i >= 0; i--) if (t >= P[i].t) {
      const a = P[i], b = P[i + 1]; if (!b) return a.p;
      const e = ease((t - a.t) / (b.t - a.t)); return [lerp(a.p[0], b.p[0], e), lerp(a.p[1], b.p[1], e)];
    }
    return P[0].p;
  };
  const PICK = 7.1;
  await scene('2_input', D2, async t => {
    await set({ ...plate(D1 + t), s: '1' });
    if (t >= .40) await once('a', () => type('me', '4'));
    if (t >= .52) await once('b', () => type('me', '48'));
    if (t >= .85) await once('c', () => type('mom', '7'));
    if (t >= .97) await once('d', () => type('mom', '74'));
    if (t >= 1.5) await once('e', () => page.evaluate(() => document.activeElement.blur()));
    if (t >= G) await once('g', () => cls('#s-input', ['g']));
    if (t >= G + 1.15) await once('chips', async () => {
      const c = []; for (let i = 0; i < 4; i++) c.push(await page.evaluate(i => window.__chip(i), i));
      const o = (i, dx, dy) => [c[i][0] + dx, c[i][1] + dy];
      P = [ { t: G + 1.2, p: o(2, 70, 96) },
            { t: G + 2.0, p: o(1, 4, 14) }, { t: G + 2.6, p: o(1, 6, 13) },      // drifts to 10년쯤, pauses
            { t: G + 3.3, p: o(3, -5, 14) }, { t: G + 4.0, p: o(3, -3, 15) },    // 30년 넘게: almost presses
            { t: G + 4.25, p: o(3, -12, 22) },                                 // backs off
            { t: PICK - .15, p: o(2, 4, 14) }, { t: D2, p: o(2, 3, 14) } ];     // settles on 20년쯤
    });
    if (P) {
      const [x, y] = ptrAt(t);
      const po = Math.min(seg(t, G + 1.2, G + 1.5), 1 - seg(t, PICK + .35, PICK + .7));
      let pz = 1, ps = 1, pi = -1;
      const n0 = G + 3.35, n1 = G + 4.05;
      if (t >= n0 && t < n1) { const u = Math.sin(Math.PI * clamp((t - n0) / (n1 - n0))); pz = 1 - .2 * u; ps = 1 - .05 * u; pi = 3; }
      if (t >= PICK - .05 && t < PICK + .17) pz = .78;
      await page.evaluate(([x, y, po, pz, ps, pi, hovOn]) => {
        const p = document.getElementById('ptr'); p.style.setProperty('--px', x + 'px'); p.style.setProperty('--py', y + 'px'); p.style.setProperty('--po', po); p.style.setProperty('--pz', pz);
        document.querySelectorAll('#guess .sg').forEach((b, i) => {
          const r = b.getBoundingClientRect();
          b.classList.toggle('hov', hovOn && x >= r.left && x <= r.right && y >= r.top - 4 && y <= r.bottom + 4);
          b.style.setProperty('--ps', i === pi ? ps : 1);
        });
      }, [x, y, po, pz, ps, pi, t >= G + 1.5 && t < PICK + .4]);
      if (t >= PICK) await once('pick', () => page.evaluate(() => document.querySelectorAll('#guess .sg')[2].click()));
    }
    if (t >= D2 - .4) await once('press', () => page.evaluate(() => { countBtn.style.transform = 'scale(.97)'; countBtn.style.filter = 'brightness(.9)'; }));
  });
  await page.evaluate(() => { countBtn.style.transform = ''; countBtn.style.filter = ''; });
  console.log('ages/guess:', await page.evaluate(() => [me.value, mom.value, S.guess, document.querySelector('#guess [aria-pressed="true"]').textContent].join(' | ')));

  // ---------- 3. BRIDGE: breath (snow only, dimmed) -> 16 hit ----------
  await page.evaluate(() => countBtn.click());
  await page.evaluate(() => window.__dots(16));
  let vfi = 0;
  const vfn = i => { if (i < 301) return 'f' + String(i + 1).padStart(4, '0'); const j = (i - 301) % 301; return (j < 30 ? 'x' : 'f') + String(j + 1).padStart(4, '0'); };
  const T0 = 1.25, HIT = .30, D3 = T0 + 5.75;
  Object.assign(T, { breath: [0, T0], reveal: T0, land: T0 + HIT + .45 });
  await scene('3_bridge', D3, async t => {
    await page.evaluate(n => window.__vf(n), vfn(vfi++));
    const u = t - T0, h = u - HIT;
    const vb = lerp(.50, .80, seg(u, -.05, .9));
    const s = lerp(1, 1.05, seg(h, 0, .7)) * lerp(1, 1.035, seg(h, .6, 6));
    const fl = h < .25 ? 0 : .5 * Math.exp(-(h - .25) / .32) * clamp((h - .25) / .08 + .35);
    await set({ s: s.toFixed(4), ox: '50%', oy: '36%', vy: '17%', vb: vb.toFixed(3), vblur: lerp(0, 2.2, seg(u, -.2, 1.2)).toFixed(2) + 'px', sc: seg(u, -.3, .8).toFixed(3), fl: fl.toFixed(3) });
    if (u >= 0) await once('start', () => page.evaluate(() => { window.__remap = { 3600: 1e9, 7200: 1e9, 10600: 1e9 }; window.__startBridge(); window.__remap = null; }));
    if (u >= 0) await once('b1', () => cls('#s-bridge', ['r-b1']));
    if (h >= 0) await once('num', () => cls('#s-bridge', ['r-num']));
    if (h >= .5) { const n = Math.min(16, Math.floor((h - .5) / .05) + 1); await page.evaluate(n => document.querySelectorAll('#v3dots i').forEach((d, i) => d.classList.toggle('on', i < n)), n); }
    if (h >= .85) await once('lbl', () => cls('#s-bridge', ['r-lbl']));
    if (h >= 1.7) await once('sub', () => cls('#s-bridge', ['r-sub']));
    if (h >= 3 && h < 3.1) await once('log1', async () => console.log('reveal:', await page.evaluate(() => [bNum.dataset.n, bLbl.innerText, bSub.innerText].join(' | '))));
  });

  // ---------- 4. THE 2.2 HIT (own cut): slam -> tiny shake -> two heartbeat pulses -> rest ----------
  await cls('#s-bridge', ['final', 'v3-fact']);
  const D4 = 4.8, FH = .72, P1 = FH + 1.62, P2 = P1 + .34;      // FH = frame the number lands; P1/P2 = lub, dub
  Object.assign(T, { fact_hit: FH, pulse1: P1, pulse2: P2 });
  const beat = (t, t0, amp, len) => (t < t0 || t > t0 + len) ? 0 : amp * Math.pow(Math.sin(Math.PI * Math.pow((t - t0) / len, .62)), 2);   // fast up, slower down
  await scene('4_fact', D4, async t => {
    await page.evaluate(n => window.__vf(n), vfn(vfi++));
    const a = clamp((t - (FH - .26)) / .26), v = t - FH;
    let ns = lerp(2.5, 1, a * a * a), nx = 0, fl = 0;
    if (v >= 0) { ns = 1 - .045 * Math.exp(-v / .085) * Math.cos(v * 34); nx = 3.4 * Math.exp(-v / .1) * Math.sin(v * 72); fl = .3 * Math.exp(-v / .22); }
    const hb = beat(t, P1, .075, .26) + beat(t, P2, .06, .30);
    ns *= 1 + hb;
    await set({ s: '1', ox: '50%', oy: '42%', vy: '44%', vb: '.66', vblur: '1.8px', sc: '1', scy: '44%', fl: fl.toFixed(3),
      ns: ns.toFixed(4), nx: nx.toFixed(2) + 'px', no: clamp((t - (FH - .26)) / .1).toFixed(3), nb: lerp(14, 0, a).toFixed(2) + 'px', ng: (hb / .075).toFixed(3),
      to: seg(v, .04, .4).toFixed(3), so: seg(v, .5, .9).toFixed(3), co: seg(v, .75, 1.15).toFixed(3) });
    if (t >= 3.2 && t < 3.3) await once('logf', async () => console.log('fact:', await page.evaluate(() => [...document.querySelectorAll('#v5fact .row span:not(.u), #v5fact .s2, #v5fact .cite')].map(e => e.textContent).join(' | '))));
  });

  // ---------- 5. CLOSING + CTA PRESS -> 6. EVENT-LOGO END CARD (one scene; the press triggers the end card) ----------
  await page.evaluate(() => document.getElementById('bCta').click());
  await page.evaluate(() => document.querySelector('[data-solo="unknown"]').click());
  await page.evaluate(() => document.getElementById('catNext').click());
  for (const q of ['q2', 'q3', 'q5']) {
    await page.evaluate(q => [...document.querySelectorAll(`.opts[data-q="${q}"] button`)].pop().click(), q);
    await page.clock.runFor(300);
  }
  await page.evaluate(() => { window.__lines(closeHead); window.__tick(0); });
  console.log('closing:', await page.evaluate(() => [document.querySelector('.step.on').dataset.step, closeHead.innerText.replace(/\n/g, ' / '), listBtn.innerText].join(' | ')));
  console.log('logo:', await page.evaluate(async () => { await evLogo.decode(); return evLogo.naturalWidth + 'x' + evLogo.naturalHeight; }));
  const bh = await page.evaluate(() => listBtn.offsetHeight);
  const PO = 112;                                                // where on the CTA the pointer lands: px right of its centre (clear of the label)
  const BX = 44 + 150, BY = VH - 38 - bh / 2;                    // CTA centre (layout px, before the scene's slow push)
  const PRESS = 3.1, REL = PRESS + .22, END0 = REL + .12;        // press -> release -> end card starts
  const LOGO = REL + 1.2, HOLD = 2.3, FADE = .6, D5 = +(LOGO + HOLD + FADE).toFixed(2);
  Object.assign(T, { press: PRESS, release: REL, end0: END0, logo: LOGO });
  await scene('5_closing', D5, async t => {
    await set({ hy: '-548px', s: lerp(1, 1.04, seg(t, -2, 8)).toFixed(4), ox: '62%', oy: '46%', warm: lerp(.45, 1, seg(t, 0, 3.2)).toFixed(3) });
    if (t >= 1.55) await once('fx', () => cls('#listBtn', ['fx']));
    const g = seg(t, 1.9, 2.95), px = lerp(BX + 200, BX + PO, g), py = lerp(BY - 84, BY + 4, g);
    const dn = clamp((t - PRESS) / .07), up = clamp((t - REL) / .16), p = dn * (1 - up * up * (3 - 2 * up));
    const r = clamp((t - PRESS) / .62), ro = 1 - Math.pow(1 - r, 3);
    const btn = { bs: (1 - .04 * p).toFixed(4), bk: (1 - .2 * p).toFixed(3), bsh: (1 - .6 * p).toFixed(3),
      rx: (150 + PO) + 'px', ry: (bh / 2 + 4) + 'px', rs: (t < PRESS ? 0 : lerp(.6, 36, ro)).toFixed(3), ro: (t < PRESS ? 0 : .5 * Math.pow(1 - r, 1.4)).toFixed(3) };
    const ptr = { px: px.toFixed(2) + 'px', py: py.toFixed(2) + 'px', po: Math.min(seg(t, 1.9, 2.2), 1 - seg(t, REL + .05, REL + .35)).toFixed(3), pz: (1 - .22 * p).toFixed(3),
      gs: (t < PRESS ? 0 : lerp(.35, 1.7, ro)).toFixed(3), go: (t < PRESS ? 0 : .6 * Math.pow(1 - r, 1.6)).toFixed(3) };
    await set(btn, '#listBtn'); await set(ptr, '#ptr2'); await set(ptr, '#ring');
    await set({ eo: seg(t, END0, END0 + .7).toFixed(3), ey: lerp(-176, -150, seg(t, END0 - .5, D5 + 1)).toFixed(2) + 'px', es: lerp(1, 1.035, clamp((t - END0) / (D5 - END0))).toFixed(4),
      lo: seg(t, LOGO - .7, LOGO).toFixed(3), mo: seg(t, LOGO - .3, LOGO + .3).toFixed(3) }, '#v5end');
  });
  console.log('form untouched:', await page.evaluate(() => [uname.value, phone.value, agree1.checked, doneBox.hidden].join(',')));
  fs.writeFileSync(path.join(OUT, 'marks.json'), JSON.stringify({ dur, T, PICK, G, D1, FADE }));
  await browser.close();
})();
