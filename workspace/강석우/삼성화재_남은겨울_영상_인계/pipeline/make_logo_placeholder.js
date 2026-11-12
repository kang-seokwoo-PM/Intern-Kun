// make_logo_placeholder.js - draws the TEMPORARY event logo (plain Pretendard type) to assets/event_logo.png (transparent PNG).
// The real logo replaces that file; this script is only for regenerating the placeholder.
let pw; try { pw = require('playwright'); } catch (e) { pw = require(process.env.PLAYWRIGHT_PATH); }
const path = require('path'), fs = require('fs');
(async () => {
  const b = await pw.chromium.launch({ args: ['--no-sandbox', '--allow-file-access-from-files'] });
  const p = await (await b.newContext({ viewport: { width: 1200, height: 400 }, deviceScaleFactor: 2 })).newPage();
  const html = `<style>@font-face{font-family:P;font-weight:600;src:url(fonts/Pretendard-SemiBold.woff2)}
  html,body{margin:0;background:transparent}#l{display:inline-flex;flex-direction:column;align-items:center;padding:24px 40px;font-family:P;color:#FFF8E4}
  .t{font-size:112px;line-height:1.2;font-weight:600;letter-spacing:.04em;word-spacing:.08em;white-space:nowrap}
  .r{width:88px;height:4px;background:#FFF8E4;opacity:.8;margin-top:26px}</style><div id="l"><div class="t">우리가 함께할 겨울</div><div class="r"></div></div>`;
  const f = path.join(__dirname, '_logo_tmp.html'); fs.writeFileSync(f, html);
  await p.goto('file://' + f); await p.evaluate(() => document.fonts.ready);
  await p.locator('#l').screenshot({ path: path.join(__dirname, 'assets', 'event_logo.png'), omitBackground: true });
  fs.unlinkSync(f); await b.close(); console.log('placeholder logo written -> assets/event_logo.png');
})();
