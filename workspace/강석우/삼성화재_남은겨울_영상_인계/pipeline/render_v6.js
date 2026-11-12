// render_v6.js - plays work/page_v6.html frame by frame (30 fps) and saves JPEG frames per scene into work/frames_v6/.
// Quick look: EVERY=6 node render_v6.js  (every 6th frame -> work/preview_v6/)
// Playwright: `npm i playwright && npx playwright install chromium`, or point PLAYWRIGHT_PATH at an existing install.
let pw; try { pw = require('playwright'); } catch (e) { pw = require(process.env.PLAYWRIGHT_PATH); }
const { chromium } = pw;
const fs = require('fs'), path = require('path');
const DIR = __dirname, FPS = 30, DT = 1000 / FPS;
const EVERY = +(process.env.EVERY || 1);
const WORK = path.join(DIR, 'work'), OUT = path.join(WORK, EVERY > 1 ? 'preview_v6' : 'frames_v6');
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
  await page.goto('file://' + path.join(WORK, 'page_v6.html'));
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
  const G = 1.85;                       // ages -> question switch (seconds into scene 2)
  const D1 = 5.8, D2 = G + 6.05, DA = D1 + D2;
  const plate = g => { const e = g / DA; return cam(1.60 * (1 + 0.085 * e), lerp(250, 240, e), lerp(566, 560, e)); };

  // shared press look for both CTAs. depth: how far the button sinks (closing CTA = 1, intro CTA lighter)
  const pressVars = (t, PRESS, REL, depth, rx, ry, spread) => {
    const dn = clamp((t - PRESS) / .07), up = clamp((t - REL) / .16), p = dn * (1 - up * up * (3 - 2 * up));
    const r = clamp((t - PRESS) / .62), ro = 1 - Math.pow(1 - r, 3);
    return { p, r, ro, btn: { bs: (1 - .04 * depth * p).toFixed(4), bk: (1 - .2 * depth * p).toFixed(3), bsh: (1 - .6 * p).toFixed(3),
      rx: rx + 'px', ry: ry + 'px', rs: (t < PRESS ? 0 : lerp(.6, spread, ro)).toFixed(3), ro: (t < PRESS ? 0 : .5 * depth * Math.pow(1 - r, 1.4)).toFixed(3) } };
  };

  // ---------- 1. COLD OPEN: belief left hanging -> the landing's question -> intro CTA appears and is pressed (that press leads into the ages) ----------
  const ch = await page.evaluate(() => introCta.offsetHeight);
  const CX = 44 + 150, CY = 322 + ch / 2, CO = 118;               // intro CTA centre; CO = pointer lands this far right of centre (clear of the label)
  const CTA0 = 3.85, PRESS0 = 5.3, REL0 = PRESS0 + .2;             // CTA0 must match the animation delay of `.intro .st-foot .cta` in ls_v6.css
  Object.assign(T, { cta0: CTA0, press0: PRESS0 });
  console.log('open:', await page.evaluate(() => [...document.querySelectorAll('#v5open .ln')].map(e => e.textContent).join(' / ') + ' | ' + introCta.innerText));
  await scene('1_intro', D1, async t => {
    await set({ ...plate(t), s: '1' });
    if (t >= CTA0 + .55) await once('fx0', () => cls('#introCta', ['fx']));
    const g = seg(t, 4.35, 5.2), pv = pressVars(t, PRESS0, REL0, .7, 150 + CO, ch / 2 + 3, 30);
    await set(pv.btn, '#introCta');
    await set({ px: lerp(CX + 190, CX + CO, g).toFixed(2) + 'px', py: lerp(CY + 62, CY + 3, g).toFixed(2) + 'px', po: seg(t, 4.35, 4.65).toFixed(3), pz: (1 - .2 * pv.p).toFixed(3) }, '#ptr0');
  });

  // ---------- 2. INPUT: ages flash -> question + compressed hesitation ----------
  await page.evaluate(() => document.querySelector('[data-go="s-input"]').click());
  await page.evaluate(() => { me.value = ''; mom.value = ''; });
  const type = (id, v) => page.evaluate(([id, v]) => { const e = document.getElementById(id); e.focus(); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, [id, v]);
  let P = null;
  const ptrAt = t => {
    for (let i = P.length - 1; i >= 0; i--) if (t >= P[i].t) {
      const a = P[i], b = P[i + 1]; if (!b) return a.p;
      const e = ease((t - a.t) / (b.t - a.t)); return [lerp(a.p[0], b.p[0], e), lerp(a.p[1], b.p[1], e)];
    }
    return P[0].p;
  };
  const PICK = G + 5.05;
  await scene('2_input', D2, async t => {
    await set({ ...plate(D1 + t), s: '1' });
    if (t >= .38) await once('a', () => type('me', '4'));
    if (t >= .50) await once('b', () => type('me', '48'));
    if (t >= .80) await once('c', () => type('mom', '7'));
    if (t >= .92) await once('d', () => type('mom', '74'));
    if (t >= 1.35) await once('e', () => page.evaluate(() => document.activeElement.blur()));
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

  // ---------- 3. BRIDGE: breath (snow only, dimmed) -> the 16 simply appears. No flash, no slam, no camera punch. ----------
  await page.evaluate(() => countBtn.click());
  await page.evaluate(() => window.__dots(16));
  let vfi = 0;
  const vfn = i => { if (i < 301) return 'f' + String(i + 1).padStart(4, '0'); const j = (i - 301) % 301; return (j < 30 ? 'x' : 'f') + String(j + 1).padStart(4, '0'); };
  const T0 = 1.25;                                 // breath length
  const NUM = T0 + .55, NFADE = 1.3;               // the 16 starts to appear / how long the fade + focus-in takes
  const DOT0 = NUM + NFADE + .25, DOTSTEP = .07;   // 16 dots, one quietly after another
  // label -> "shorter than you guessed" (reality vs the guess) -> the conclusion takes that line's place (shown only here, once)
  const LBL = DOT0 + 16 * DOTSTEP - .1, SUB = LBL + .9, MSG = SUB + 1.6, D3 = +(MSG + 2.25).toFixed(2);
  Object.assign(T, { breath: [0, T0], reveal: T0, num: NUM, land: NUM + NFADE, lbl: LBL, sub: SUB, msg: MSG });
  await scene('3_bridge', D3, async t => {
    await page.evaluate(n => window.__vf(n), vfn(vfi++));
    const u = t - T0, k = seg(t, NUM, NUM + NFADE);
    await set({ s: lerp(1, 1.022, t / D3).toFixed(4), ox: '50%', oy: '36%', vy: '17%', vb: lerp(.50, .70, seg(u, -.1, 2.6)).toFixed(3), vblur: lerp(0, 2.0, seg(u, -.2, 2.6)).toFixed(2) + 'px', sc: seg(u, -.3, 1.6).toFixed(3),
      n16o: k.toFixed(3), n16b: lerp(5, 0, k).toFixed(2) + 'px' });
    // the landing rolls the digits like an odometer; let that finish unseen during the breath so the number just appears
    if (t >= .1) await once('start', () => page.evaluate(() => { window.__remap = { 3600: 1e9, 7200: 1e9, 10600: 1e9 }; window.__startBridge(); window.__remap = null; }));
    if (u >= 0) await once('b1', () => cls('#s-bridge', ['r-b1']));
    if (t >= DOT0) { const n = Math.min(16, Math.floor((t - DOT0) / DOTSTEP) + 1); await page.evaluate(n => document.querySelectorAll('#v3dots i').forEach((d, i) => d.classList.toggle('on', i < n)), n); }
    if (t >= LBL) await once('lbl', () => cls('#s-bridge', ['r-lbl']));
    if (t >= SUB) await once('sub', () => cls('#s-bridge', ['r-sub']));
    if (t >= SUB + 1 && t < SUB + 1.1) await once('log1', async () => console.log('reveal:', await page.evaluate(() => [bNum.dataset.n, bLbl.innerText, bSub.innerText].join(' | '))));
    if (t >= MSG - .35) await once('msg0', () => page.evaluate(() => { window.__msgTop(); document.querySelector('#s-bridge').classList.remove('r-sub'); }));
    if (t >= MSG) await once('msg', async () => { await cls('#s-bridge', ['r-msg']); console.log('conclusion:', await page.evaluate(() => document.getElementById('v6msg').innerText.replace(/\n/g, ' / '))); });
  });

  // ---------- 4. THE 2.2 (own cut): settles into place (no slam, no shake, no flash) -> two soft heartbeat pulses -> rest ----------
  await cls('#s-bridge', ['final', 'v3-fact']);
  const D4 = 4.5, FIN = .55, FH = .75, P1 = FH + 1.6, P2 = P1 + .34;   // number eases in over FIN seconds and is in place at FH; P1/P2 = lub, dub
  Object.assign(T, { fact_hit: FH, pulse1: P1, pulse2: P2 });
  const beat = (t, t0, amp, len) => (t < t0 || t > t0 + len) ? 0 : amp * Math.pow(Math.sin(Math.PI * Math.pow((t - t0) / len, .62)), 2);   // fast up, slower down
  await scene('4_fact', D4, async t => {
    await page.evaluate(n => window.__vf(n), vfn(vfi++));
    const a = clamp((t - (FH - FIN)) / FIN), e = 1 - Math.pow(1 - a, 3), v = t - FH;      // ease-out: arrives gently
    const hb = beat(t, P1, .05, .28) + beat(t, P2, .04, .32);
    await set({ s: '1', ox: '50%', oy: '42%', vy: '44%', vb: '.66', vblur: '1.8px', sc: '1', scy: '44%',
      ns: (lerp(1.22, 1, e) * (1 + hb)).toFixed(4), nx: '0px', no: clamp((t - (FH - FIN)) / .3).toFixed(3), nb: lerp(7, 0, e).toFixed(2) + 'px', ng: (hb / .05 * .7).toFixed(3),
      to: seg(v, .1, .6).toFixed(3), so: seg(v, .6, 1.05).toFixed(3), co: seg(v, .85, 1.3).toFixed(3) });
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
  const PRESS = 2.8, REL = PRESS + .22, END0 = REL + .12;        // press -> release -> end card starts
  const LOGO = REL + 1.2, HOLD = 2.0, FADE = .6, D5 = +(LOGO + HOLD + FADE).toFixed(2);
  Object.assign(T, { press: PRESS, release: REL, end0: END0, logo: LOGO });
  await scene('5_closing', D5, async t => {
    await set({ hy: '-548px', s: lerp(1, 1.04, seg(t, -2, 8)).toFixed(4), ox: '62%', oy: '46%', warm: lerp(.45, 1, seg(t, 0, 3.2)).toFixed(3) });
    if (t >= 1.55) await once('fx', () => cls('#listBtn', ['fx']));
    const g = seg(t, 1.7, 2.65), px = lerp(BX + 200, BX + PO, g), py = lerp(BY - 84, BY + 4, g);
    const { p, r, ro, btn } = pressVars(t, PRESS, REL, 1, 150 + PO, bh / 2 + 4, 36);
    const ptr = { px: px.toFixed(2) + 'px', py: py.toFixed(2) + 'px', po: Math.min(seg(t, 1.7, 2.0), 1 - seg(t, REL + .05, REL + .35)).toFixed(3), pz: (1 - .22 * p).toFixed(3),
      gs: (t < PRESS ? 0 : lerp(.35, 1.7, ro)).toFixed(3), go: (t < PRESS ? 0 : .6 * Math.pow(1 - r, 1.6)).toFixed(3) };
    await set(btn, '#listBtn'); await set(ptr, '#ptr2'); await set(ptr, '#ring');
    await set({ eo: seg(t, END0, END0 + .7).toFixed(3), ey: lerp(-176, -150, seg(t, END0 - .5, D5 + 1)).toFixed(2) + 'px', es: lerp(1, 1.035, clamp((t - END0) / (D5 - END0))).toFixed(4),
      lo: seg(t, LOGO - .7, LOGO).toFixed(3), mo: seg(t, LOGO - .3, LOGO + .3).toFixed(3) }, '#v5end');
  });
  console.log('form untouched:', await page.evaluate(() => [uname.value, phone.value, agree1.checked, doneBox.hidden].join(',')));
  fs.writeFileSync(path.join(OUT, 'marks.json'), JSON.stringify({ dur, T, PICK, G, D1, FADE }));
  await browser.close();
})();
