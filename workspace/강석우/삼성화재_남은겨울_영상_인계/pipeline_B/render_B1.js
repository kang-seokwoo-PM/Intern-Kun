// render_B1.js - plays work/film_B1.html frame by frame (30 fps) into work/frames_B1/ and writes work/frames_B1/marks.json.
// Quick look: EVERY=10 node render_B1.js  (every 10th frame -> work/preview_B1/)
// Playwright: `npm i playwright && npx playwright install chromium`, or point PLAYWRIGHT_PATH at an existing install.
let pw; try { pw = require('playwright'); } catch (e) { pw = require(process.env.PLAYWRIGHT_PATH); }
const { chromium } = pw;
const fs = require('fs'), path = require('path');
const FPS = 30, EVERY = +(process.env.EVERY || 1);
const WORK = path.join(__dirname, 'work'), OUT = path.join(WORK, EVERY > 1 ? 'preview_B1' : 'frames_B1');
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--allow-file-access-from-files'] });
  const page = await (await browser.newContext({ viewport: { width: 800, height: 450 }, deviceScaleFactor: 2.4, locale: 'ko-KR' })).newPage();
  page.on('pageerror', e => { console.log('PAGEERR', e.message); process.exitCode = 1; });
  await page.goto('file://' + path.join(WORK, 'film_B1.html'));
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.fonts].map(f => f.load())); await evLogo.decode(); });
  const T = await page.evaluate(() => window.__T), n = Math.round(T.total * FPS);
  fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
  // bridge video stills: frames 1..301, then a loop whose first 30 frames are cross-faded (x0001..x0030), as in the v6 film
  const vfn = i => { if (i < 301) return 'f' + String(i + 1).padStart(4, '0'); const j = (i - 301) % 301; return (j < 30 ? 'x' : 'f') + String(j + 1).padStart(4, '0'); };
  let last = '', uiFirst = null; const seen = [];
  for (let i = 0; i < n; i++) {
    const t = i / FPS;
    await page.evaluate(async ([t, names]) => {
      const im = document.getElementById('bFrame'), s = '../../pipeline/work/vf/' + names[window.__vfIndex(t)] + '.jpg';
      if (!im.src.endsWith(s.slice(5))) { im.src = s; await im.decode(); }
      window.__frame(t);
    }, [t, Array.from({ length: n + 2 }, (_, k) => vfn(k))]);
    const v = await page.evaluate(() => window.__visible());
    const key = v.text.join(' | ');
    if (key !== last) { seen.push([+t.toFixed(2), key]); last = key; }
    if (v.ui && uiFirst === null) uiFirst = +t.toFixed(2);
    if (i % EVERY === 0) await page.screenshot({ path: path.join(OUT, String(i).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 96 });
  }
  for (const [t, k] of seen) console.log(String(t).padStart(6), k || '(no text)');
  console.log('first frame with any landing UI (closing screen / end card):', uiFirst, '| cut 7 starts at', T.closing);
  if (uiFirst < T.closing) { console.log('ERROR: UI before cut 7'); process.exitCode = 1; }
  fs.writeFileSync(path.join(OUT, 'marks.json'), JSON.stringify({ fps: FPS, frames: n, T, onscreen: seen }, null, 1));
  console.log('rendered', n, 'frames ->', OUT);
  await browser.close();
})();
