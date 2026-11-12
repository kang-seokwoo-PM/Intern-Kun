// film_B1.js - the whole B cut as a pure function of time. render_B1.js calls __frame(t) once per frame (30 fps) and takes a screenshot.
// No timers, no CSS animations: the same t always gives the same picture. All copy comes from window.COPY (filled in by build_B1.py).
(function(){
  const C = window.COPY, $ = s => document.querySelector(s);
  const clamp = x => Math.max(0, Math.min(1, x));
  const ease = x => { x = clamp(x); return x < .5 ? 4*x*x*x : 1 - Math.pow(-2*x + 2, 3)/2; };
  const seg = (t, a, b) => ease((t - a)/(b - a));
  const lerp = (a, b, k) => a + (b - a)*k;

  // ------------------------------------------------------------------ timeline (seconds). Change numbers here; audio follows via marks.
  const T = window.__T = {
    line: [0.6, 1.6, 2.7, 3.15],            // cut 1: the opening question (in0, in1, out0, out1). No music under it.
    age: [3.2, 4.1, 4.75, 5.15],            // cut 2a: 74
    q: 5.25,                                // cut 2b: the landing question appears
    // the hesitation: [chip index in COPY.chips, start, end, peak opacity]. Each one stays a little longer; the 4th only half-forms (the waver).
    guess: [[3, 6.0, 6.55, 1], [1, 6.5, 7.1, 1], [2, 7.05, 7.75, 1], [1, 7.7, 8.3, .42], [2, 8.2, 99, 1]],
    settle: 8.75,                           // the last guess is fully there
    out2: [9.55, 10.0],                     // cut 2 fades
    breath: [10.0, 11.0],                   // cut 3: snow only
    n16: [11.1, 12.3], lbl16: 12.4, dots: 13.2, dotStep: .06,
    now: 14.8,                              // first dot goes out + "this winter is one of them"
    out4: [17.0, 17.5],
    lbl96: 17.6, n96: [17.8, 18.7], basis: 19.0, out5: [21.2, 21.7],
    fact: 21.85, factHit: 22.4, pulse1: 24.0, pulse2: 24.34, out6: [25.5, 26.0],
    closing: 25.7,                          // cut 7 picture starts to come up (cross-fade .9s); UI follows
    head: 26.3, btn: 27.0, ptr: 27.6, press: 28.6, release: 28.82, end0: 28.94, logo: 30.0, hold: 2.0, fade: .6
  };
  T.total = +(T.logo + T.hold + T.fade).toFixed(2);

  // ------------------------------------------------------------------ build the DOM from COPY
  const fx = C.fact1.split(C.factHero); if (fx.length !== 2) throw new Error('fact sentence changed');
  const heroNum = C.factHero.slice(0, -1), heroUnit = C.factHero.slice(-1);
  $('#stage').innerHTML = `
  <div id="bgB"><img id="bFrame" src="../../pipeline/work/vf/f0001.jpg" alt=""></div><div id="scrimB"></div>
  <div id="bgA"></div><div id="tintA"></div><div id="scrimA"></div>
  <div id="c1" class="col"><div class="line t">${C.newLine1}</div></div>
  <div id="c2a" class="col"><div class="lbl t">${C.momLabel}</div><div class="num t">${C.momAge}<span class="u">${C.ageUnit}</span></div></div>
  <div id="c2b" class="col"><div class="q t">${C.question}</div>${T.guess.map(g => `<div class="g t">${C.chips[g[0]]}</div>`).join('')}</div>
  <div id="c4" class="mid"><div class="hero t">${C.winters}<span class="u">${C.wintersUnit}</span></div><div class="lbl txt t">${C.wintersLabel}</div>
    <div class="dots">${'<i></i>'.repeat(+C.winters)}</div><div class="now txt t">${C.newLine2}</div></div>
  <div id="c5" class="mid"><div class="lbl txt t">${C.mealsLabel}</div><div class="hero t">${C.meals}<span class="u">${C.wintersUnit}</span></div><div class="basis txt dim t">${C.mealsBasis}</div></div>
  <div id="c6" class="mid"><div class="row"><span class="pre t">${fx[0].trim()}</span><span class="num">${heroNum}</span><span class="post t">${heroUnit}${fx[1]}</span></div>
    <div class="s2 t">${C.fact2}</div><div class="cite t">${C.factCite}</div></div>
  <div id="c7"><div class="bg"></div><div class="warm"></div><div class="haze"></div>
    <h2 id="closeHead">${C.closeHead.map(l => `<span class="ln">${l}</span>`).join('')}</h2>
    <button id="listBtn">${C.cta}<span class="rip"></span></button><div id="ptr"></div><div id="ring"></div></div>
  <div id="end"><div class="bg"></div><div class="warm"></div><div class="scrim"></div><div class="lock"><img class="logo" id="evLogo" src="../../pipeline/assets/event_logo.png" alt=""><div class="mark">${C.brand}</div></div></div>
  <div id="black"></div>`;

  // quiet entrance/exit: fade + 8px rise + blur-to-sharp. k = 0..1 visibility, dir = +1 entering, -1 leaving (leaves without moving)
  const put = (el, k, peak, rise) => { el.style.opacity = (k*(peak === undefined ? 1 : peak)).toFixed(3); el.style.transform = `translateY(${((1 - k)*(rise === undefined ? 8 : rise)).toFixed(2)}px)`; el.style.filter = k >= .999 ? 'none' : `blur(${((1 - k)*5).toFixed(2)}px)`; };
  const io = (t, a, b, c, d) => Math.min(seg(t, a, b), 1 - seg(t, c, d));
  const vars = (el, o) => { for (const k in o) el.style.setProperty('--' + k, o[k]); };
  const cam = (k, cx, cy) => ({ bgw: (3*474*k).toFixed(2) + 'px', bgx: (400 - cx*k - 474*k).toFixed(2) + 'px', bgy: (225 - cy*k).toFixed(2) + 'px' });   // intro plate; units = landing px of the illustration
  const beat = (t, t0, amp, len) => (t < t0 || t > t0 + len) ? 0 : amp*Math.pow(Math.sin(Math.PI*Math.pow((t - t0)/len, .62)), 2);
  const E = { bgA: $('#bgA'), tintA: $('#tintA'), scrimA: $('#scrimA'), bgB: $('#bgB'), scrimB: $('#scrimB'), c7: $('#c7'), end: $('#end'), black: $('#black'), btn: $('#listBtn'), ptr: $('#ptr'), ring: $('#ring'),
    line: $('#c1 .line'), albl: $('#c2a .lbl'), anum: $('#c2a .num'), q: $('#c2b .q'), g: [...document.querySelectorAll('#c2b .g')],
    n16: $('#c4 .hero'), l16: $('#c4 .lbl'), dots: [...document.querySelectorAll('#c4 .dots i')], now: $('#c4 .now'),
    l96: $('#c5 .lbl'), n96: $('#c5 .hero'), basis: $('#c5 .basis'), c6: $('#c6'), pre: $('#c6 .pre'), post: $('#c6 .post'), s2: $('#c6 .s2'), cite: $('#c6 .cite'), ch: [...document.querySelectorAll('#closeHead .ln')] };
  window.__vfIndex = t => Math.max(0, Math.round((t - (T.breath[0] - .4))*30));      // bridge video frame for time t (starts just before the breath)

  window.__frame = function(t){
    // ---------- pictures. A (the pair, dusk-dark) -> B (bare tree, night) across the breath -> closing (lit tree, warm)
    const aOut = 1 - seg(t, T.out2[0] + .15, T.breath[1] - .1);
    vars(E.bgA, { ...cam(lerp(1.60, 1.68, t/T.breath[1]), lerp(236, 230, t/T.breath[1]), 552), bd: (lerp(.32, .46, seg(t, 0, 2.2))).toFixed(3) });
    E.bgA.style.opacity = E.tintA.style.opacity = E.scrimA.style.opacity = aOut.toFixed(3);
    const b = (t - T.breath[0])/(T.closing + 1 - T.breath[0]);
    vars(E.bgB, { vs: lerp(1.04, 1.075, clamp(b)).toFixed(4), vb: lerp(.44, .62, seg(t, T.breath[0] + .3, T.n16[1] + 1)).toFixed(3) });
    E.scrimB.style.opacity = seg(t, T.breath[1] - .3, T.n16[1]).toFixed(3);
    E.black.style.opacity = Math.max(1 - seg(t, 0, .9), seg(t, T.total - T.fade, T.total - .03)).toFixed(3);
    // ---------- 1. the question to the viewer
    put(E.line, io(t, ...T.line));
    // ---------- 2a. 74
    put(E.albl, io(t, T.age[0], T.age[0] + .6, T.age[2], T.age[3]));
    put(E.anum, io(t, T.age[0] + .1, T.age[1], T.age[2], T.age[3]), 1, 0);
    // ---------- 2b. the landing question, then the hesitation as type
    const o2 = 1 - seg(t, ...T.out2);
    put(E.q, Math.min(seg(t, T.q, T.q + .7), o2));
    T.guess.forEach(([i, a, z, pk], n) => {
      const last = n === T.guess.length - 1;
      const k = last ? Math.min(seg(t, a, T.settle), o2) : io(t, a, a + .26, z - .26, z);
      const el = E.g[n]; el.style.opacity = (k*pk).toFixed(3); el.style.filter = k >= .999 ? 'none' : `blur(${((1 - k)*(last ? 6 : 4)).toFixed(2)}px)`;
      el.style.transform = last ? 'none' : `translateX(${(lerp(-5, 5, clamp((t - a)/(z - a)))*(n % 2 ? -1 : 1)).toFixed(2)}px)`;     // the unsettled ones drift a hair; the last one stands still
    });
    // ---------- 4. 16 winters
    const o4 = 1 - seg(t, ...T.out4);
    put(E.n16, Math.min(seg(t, ...T.n16), o4), 1, 0);
    put(E.l16, Math.min(seg(t, T.lbl16, T.lbl16 + .7), o4));
    const gone = seg(t, T.now, T.now + 1.1);
    E.dots.forEach((d, i) => { const k = Math.min(seg(t, T.dots + i*T.dotStep, T.dots + i*T.dotStep + .6), o4); d.style.opacity = (k*(i === 0 ? lerp(.9, .16, gone) : .9)).toFixed(3); });
    put(E.now, Math.min(seg(t, T.now + .1, T.now + .9), o4));
    // ---------- 5. 96 meals
    const o5 = 1 - seg(t, ...T.out5);
    put(E.l96, Math.min(seg(t, T.lbl96, T.lbl96 + .6), o5));
    put(E.n96, Math.min(seg(t, ...T.n96), o5), 1, 0);
    put(E.basis, Math.min(seg(t, T.basis, T.basis + .6), o5));
    // ---------- 6. the 2.2 (eases in; two soft pulses; rests)
    const o6 = 1 - seg(t, ...T.out6), FIN = T.factHit - T.fact, a6 = clamp((t - T.fact)/FIN), e6 = 1 - Math.pow(1 - a6, 3), v = t - T.factHit;
    const hb = beat(t, T.pulse1, .045, .28) + beat(t, T.pulse2, .035, .32);
    vars(E.c6, { ns: (lerp(1.14, 1, e6)*(1 + hb)).toFixed(4), no: (clamp((t - T.fact)/.35)*o6).toFixed(3), nb: lerp(6, 0, e6).toFixed(2) + 'px', ng: (hb/.045*.7).toFixed(3) });
    put(E.pre, Math.min(seg(v, .1, .6), o6), 1, 0); put(E.post, Math.min(seg(v, .1, .6), o6), 1, 0);
    put(E.s2, Math.min(seg(v, .6, 1.05), o6)); put(E.cite, Math.min(seg(v, .85, 1.3), o6), 1, 0);
    // ---------- 7. closing screen (the only UI in the film) + CTA press
    const u = t - T.closing;
    E.c7.style.opacity = seg(u, 0, .9).toFixed(3);
    vars(E.c7, { s: lerp(1, 1.04, seg(u, -2, 8)).toFixed(4), warm: lerp(.3, 1, seg(u, .2, 3.2)).toFixed(3), hz: seg(t, T.head - .35, T.head + .45).toFixed(3) });
    E.ch.forEach((l, i) => put(l, seg(t, T.head + i*.13, T.head + i*.13 + .6)));
    const bh = E.btn.offsetHeight, PO = 112, BX = 44 + 150, BY = 450 - 38 - bh/2;       // pointer lands PO px right of the button centre (clear of the label)
    const dn = clamp((t - T.press)/.07), up = clamp((t - T.release)/.16), p = dn*(1 - up*up*(3 - 2*up));
    const r = clamp((t - T.press)/.62), ro = 1 - Math.pow(1 - r, 3);
    vars(E.btn, { bo: seg(t, T.btn, T.btn + .5).toFixed(3), bs: (1 - .04*p).toFixed(4), bk: (1 - .2*p).toFixed(3), bsh: (1 - .6*p).toFixed(3), rx: (150 + PO) + 'px', ry: (bh/2 + 4) + 'px',
      rs: (t < T.press ? 0 : lerp(.6, 36, ro)).toFixed(3), ro: (t < T.press ? 0 : .5*Math.pow(1 - r, 1.4)).toFixed(3) });
    const g = seg(t, T.ptr + .1, T.press - .15);
    const pv = { px: lerp(BX + 200, BX + PO, g).toFixed(2) + 'px', py: lerp(BY - 84, BY + 4, g).toFixed(2) + 'px', po: Math.min(seg(t, T.ptr, T.ptr + .3), 1 - seg(t, T.release + .05, T.release + .35)).toFixed(3), pz: (1 - .22*p).toFixed(3),
      gs: (t < T.press ? 0 : lerp(.35, 1.7, ro)).toFixed(3), go: (t < T.press ? 0 : .6*Math.pow(1 - r, 1.6)).toFixed(3) };
    vars(E.ptr, pv); vars(E.ring, pv);
    // ---------- end card
    vars(E.end, { eo: seg(t, T.end0, T.end0 + .7).toFixed(3), ey: lerp(-176, -150, seg(t, T.end0 - .5, T.total + 1)).toFixed(2) + 'px', es: lerp(1, 1.035, clamp((t - T.end0)/(T.total - T.end0))).toFixed(4),
      lo: seg(t, T.logo - .7, T.logo).toFixed(3), mo: seg(t, T.logo - .3, T.logo + .3).toFixed(3) });
  };
  // what is on screen right now (text of every element with opacity > .5) - used by render_B1.js to log the copy per cut and to prove there is no UI before cut 7
  window.__visible = () => ({ text: [...document.querySelectorAll('.t,#closeHead .ln')].filter(e => +e.style.opacity > .5).map(e => e.textContent.trim()),
    ui: +getComputedStyle(E.c7).opacity > .01 || +getComputedStyle(E.end).opacity > .01 });
})();
