/* End-to-end smoke test in a real browser: does the app boot, navigate,
   segment a real photo, classify it, save it, and composite a try-on? */
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const OUT = new URL('./__screenshots__/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
/* Use the image's pre-installed Chromium when one is present so this can
   run without downloading a browser. */
const EXEC = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch(fs.existsSync(EXEC) ? { executablePath: EXEC } : {});
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });

const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
/* A blocked Google Fonts request is an environment fact, not an app
   defect — the app is explicitly built to work offline, so filter those
   out rather than failing the run on them. */
page.on('console', m => {
  if(m.type() !== 'error') return;
  const txt = m.text();
  if(/ERR_(CONNECTION|NAME_NOT_RESOLVED|INTERNET|PROXY|BLOCKED)/.test(txt)) return;
  errors.push('CONSOLE: ' + txt);
});

await page.goto('file://' + path.resolve(new URL('../labsa.html', import.meta.url).pathname));
await page.waitForTimeout(600);

const bootErr = await page.evaluate(() => {
  const b = document.getElementById('bootErr');
  return (b && b.style.display === 'block') ? document.getElementById('bootErrMsg').textContent : null;
});
console.log('boot error panel :', bootErr || 'none');
console.log('active screen    :', await page.evaluate(() => document.querySelector('.screen.active')?.id));

// --- walk onboarding -> language -> guest -> home ---
await page.click('[data-i18n="onb_start"]');
await page.waitForTimeout(150);
await page.click('#langOptEn');
await page.waitForTimeout(100);
console.log('lang switched    :', await page.evaluate(() => document.documentElement.lang + '/' + document.documentElement.dir));
await page.click('[data-i18n="lang_next"], [data-i18n="auth_guest"], .btn-pri').catch(()=>{});
await page.waitForTimeout(200);
await page.evaluate(() => { if(typeof startGuest === 'function') startGuest(); });
await page.waitForTimeout(200);
console.log('after guest      :', await page.evaluate(() => document.querySelector('.screen.active')?.id));

// --- build a synthetic garment photo + person photo in-page ---
const result = await page.evaluate(async () => {
  function paint(w, h, fn){
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(w, h);
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){
      const [r,g,b] = fn(x,y); const i = (y*w+x)*4;
      img.data[i]=r; img.data[i+1]=g; img.data[i+2]=b; img.data[i+3]=255;
    }
    ctx.putImageData(img,0,0); return cv;
  }
  // a "shirt": wide top with sleeves, on a plain wall
  const garment = paint(420, 460, (x,y) => {
    const u = x/420, v = y/460;
    const inside = v > 0.10 && v < 0.90 && (v < 0.35 ? Math.abs(u-0.5) < 0.45 : Math.abs(u-0.5) < 0.30);
    return inside ? [40,70,130] : [238,236,230];
  });
  // a "person": a simple standing figure so MoveNet has something, though
  // the model will not load offline -- the fallback pose is the point.
  const person = paint(420, 700, (x,y) => {
    const u = x/420, v = y/700;
    const body = (v > 0.22 && v < 0.58 && Math.abs(u-0.5) < 0.16)
              || (v >= 0.58 && v < 0.95 && (Math.abs(u-0.42) < 0.07 || Math.abs(u-0.58) < 0.07))
              || (v <= 0.22 && v > 0.06 && Math.abs(u-0.5) < 0.09);
    return body ? [90,80,75] : [225,228,232];
  });

  const out = {};
  // --- segmentation ---
  const gctx = garment.getContext('2d');
  const raw = gctx.getImageData(0,0,garment.width,garment.height).data;
  const t0 = performance.now();
  const removed = sfRemoveBg(raw, garment.width, garment.height, 28);
  out.segmentMs = Math.round(performance.now() - t0);
  out.opaqueFraction = +sfOpaqueFraction(removed).toFixed(3);
  out.centreQuality = +sfSegmentQuality(removed, garment.width, garment.height).toFixed(3);
  out.swatch = sfDominantColor(removed);

  // --- offline classification, no model download ---
  const feats = sfGarmentFeatures(removed, garment.width, garment.height);
  out.features = feats.map(v => +v.toFixed(2));
  const guess = sfBrainPredict(feats, null);
  out.guess = guess.cat; out.guessConf = +guess.confidence.toFixed(2);

  // --- save it to the wardrobe through the real path ---
  const cv = document.createElement('canvas');
  cv.width = garment.width; cv.height = garment.height;
  cv.getContext('2d').putImageData(new ImageData(removed, garment.width, garment.height), 0, 0);
  WardrobeDB.add({ id:'g_test', img: cv.toDataURL('image/png'), category:'shirt',
                   name:"Levi's <b>test</b>", color: out.swatch, brand:'', season:'all', notes:'', addedAt: Date.now() });
  PersonDB.set({ img: person.toDataURL('image/jpeg', 0.9), w: person.width, h: person.height, capturedAt: Date.now() });
  buildPicks = { shirt: 'g_test' };

  // --- composite ---
  const pose = sfFallbackPose(person.width, person.height);
  const t1 = performance.now();
  const composed = await sfComposite(PersonDB.get(), pose, {scale:1,dx:0,dy:0});
  out.compositeMs = Math.round(performance.now() - t1);
  out.composedBytes = composed.length;
  lastResultDataUrl = composed; lastPersonDataUrl = PersonDB.get().img;

  // --- learning actually persists ---
  const before = sfBrainPredict(feats, null).samples;
  for(let i=0;i<30;i++) sfBrainLearnCategory(feats, 'jacket');
  out.learnedSamples = sfBrainPredict(feats, null).samples - before;
  out.afterLearning = sfBrainPredict(feats, null).cat;
  sfBrainReset();
  return out;
});
console.log('segmentation     :', result.segmentMs + 'ms, opaque ' + result.opaqueFraction +
            ', centre quality ' + result.centreQuality + ', swatch ' + result.swatch);
console.log('offline guess    :', result.guess, '(' + result.guessConf + ')  features', result.features.join(' '));
console.log('composite        :', result.compositeMs + 'ms, ' + Math.round(result.composedBytes/1024) + 'KB');
console.log('learning         :', result.learnedSamples, 'samples ->', result.afterLearning);

// --- render the wardrobe and check the escaped name did not break markup ---
await page.evaluate(() => { renderWardrobe(); go('wardrobe'); });
await page.waitForTimeout(200);
const cardText = await page.evaluate(() => {
  const c = document.querySelector('.w-card');
  return c ? { html: c.innerHTML.slice(0, 120), boldTags: c.querySelectorAll('b').length } : null;
});
console.log('wardrobe card    : bold tags injected =', cardText?.boldTags, '(must be 0)');

await page.evaluate(() => { openDetail('g_test'); });
await page.waitForTimeout(150);
console.log('detail name      :', await page.evaluate(() => document.querySelector('#detailBody .h2')?.textContent));

// --- result + compare slider ---
await page.evaluate(() => { renderResult(); go('result'); });
await page.waitForTimeout(250);
await page.screenshot({ path: path.join(OUT, 'result.png') });
await page.evaluate(() => showCompare());
await page.waitForTimeout(200);
const clipBefore = await page.evaluate(() => document.getElementById('compareAfterWrap').style.clipPath);
await page.mouse.move(120, 400); await page.mouse.down(); await page.mouse.move(300, 400); await page.mouse.up();
await page.waitForTimeout(150);
const clipAfter = await page.evaluate(() => document.getElementById('compareAfterWrap').style.clipPath);
console.log('compare drag     :', clipBefore, '->', clipAfter, clipBefore !== clipAfter ? '(moves ✓)' : '(DEAD ✗)');
await page.screenshot({ path: path.join(OUT, 'compare.png') });

console.log('\npage errors      :', errors.length ? errors : 'none');
await browser.close();
process.exit(errors.length ? 1 : 0);
