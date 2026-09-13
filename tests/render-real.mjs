/* Dress the real person photos with the real garment photos, exactly as
   the app would, and write the results out for inspection. The pose model
   cannot load in a sandbox, so the hand-measured keypoints in
   tests/fixtures/poses.json stand in for it.
     node tests/render-real.mjs            -> writes tests/__renders__/*.png  */
import { chromium } from 'playwright';
import fs from 'node:fs'; import path from 'node:path';
const HERE = path.dirname(new URL(import.meta.url).pathname);
const FIX = path.join(HERE, 'fixtures');
const OUT = process.env.RENDER_OUT || path.join(HERE, '__renders__');
fs.mkdirSync(OUT, { recursive: true });
const poses = JSON.parse(fs.readFileSync(path.join(FIX, 'poses.json'), 'utf8'));
const EXEC = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch(fs.existsSync(EXEC) ? { executablePath: EXEC } : {});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto('file://' + path.resolve(HERE, '..', 'labsa.html'));
await page.waitForTimeout(200);

const b64 = f => fs.readFileSync(path.join(FIX, f)).toString('base64');
const OUTFITS = [
  { person: 'person-rust-jacket.jpg', items: { shirt: 'garment-polo-yellow.jpg', trouser: 'garment-trousers-navy.jpg' } },
  { person: 'person-tan-jacket.jpg',  items: { shirt: 'garment-polo-blue-zip.jpg', trouser: 'garment-trousers-cream.jpg' } },
  { person: 'person-rust-jacket.jpg', items: { shirt: 'garment-polo-blue-zip.jpg', trouser: 'garment-trousers-cream.jpg' } },
  { person: 'person-tan-jacket.jpg',  items: { shirt: 'garment-polo-yellow.jpg', trouser: 'garment-trousers-navy.jpg' } },
];
for(const outfit of OUTFITS){
  const pose = poses[outfit.person];
  const r = await page.evaluate(async ({ personB64, items, pose, debug }) => {
    const load = async b => { const im = new Image(); im.src = 'data:image/jpeg;base64,' + b; await im.decode(); return im; };
    async function saveGarment(cat, b){
      const im = await load(b);
      const cv = document.createElement('canvas'); cv.width = im.naturalWidth; cv.height = im.naturalHeight;
      cv.getContext('2d').drawImage(im, 0, 0);
      const small = sfCanvasResize(cv, 520);
      const raw = small.getContext('2d').getImageData(0, 0, small.width, small.height).data;
      const rem = sfRemoveBg(raw, small.width, small.height, 28);
      const o = document.createElement('canvas'); o.width = small.width; o.height = small.height;
      o.getContext('2d').putImageData(new ImageData(rem, small.width, small.height), 0, 0);
      const id = 'g_' + cat;
      WardrobeDB.add({ id, img: o.toDataURL('image/png'), category: cat, name: cat, color: sfDominantColor(rem),
                       brand: '', season: 'all', notes: '', addedAt: Date.now() });
      delete sfBoundsCache[id]; delete sfLandmarkCache[id];
      return id;
    }
    localStorage.removeItem('sf_wardrobe');
    buildPicks = {};
    for(const cat in items) buildPicks[cat] = await saveGarment(cat, items[cat]);
    const pim = await load(personB64);
    PersonDB.set({ img: 'data:image/jpeg;base64,' + personB64, w: pim.naturalWidth, h: pim.naturalHeight, capturedAt: Date.now() });
    const t0 = performance.now();
    let url = await sfComposite(PersonDB.get(), pose.keypoints, { scale: 1, dx: 0, dy: 0 });
    const ms = Math.round(performance.now() - t0);
    if(debug){
      /* draw every fitted piece's destination outline over the result */
      const im = await load(url.split(',')[1]);
      const dc = document.createElement('canvas'); dc.width = im.naturalWidth; dc.height = im.naturalHeight;
      const g = dc.getContext('2d'); g.drawImage(im, 0, 0);
      const poly = (pts, col, label) => { g.strokeStyle = col; g.lineWidth = 2; g.beginPath();
        pts.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.closePath(); g.stroke();
        g.fillStyle = col; g.font = 'bold 12px sans-serif'; g.fillText(label, pts[0].x + 3, pts[0].y + 12); };
      for(const cat in buildPicks){
        const it = WardrobeDB.get_(buildPicks[cat]); const lm = sfLandmarkCache[it.id];
        const shape = await sfPersonShape(PersonDB.get(), pose.keypoints);
        const fit = sfFitGarment(cat, lm, pose.keypoints, { scale: 1, dx: 0, dy: 0 }, shape);
        if(!fit) continue;
        if(fit.kind === 'top'){ fit.torsoBands.forEach((b, i) => poly(b.dst, '#ff00ff', i ? '' : 'torso L' + fit.looseness.toFixed(2))); fit.sleeves.forEach((sl, i) => poly(sl.dst, '#00ccff', '')); }
        else fit.pieces.forEach((p, i) => poly(p.dst, ['#ff00ff', '#00ccff', '#00ff66', '#ffaa00', '#ff4444'][i % 5], i ? '' : 'L' + fit.looseness.toFixed(2)));
        // the body model itself, in green
        if(shape){ g.strokeStyle = '#00ff00'; g.lineWidth = 1.5;
          const trace = (arr) => { g.beginPath(); arr.forEach((r, i) => i ? g.lineTo(r.cx - r.halfW, r.cy) : g.moveTo(r.cx - r.halfW, r.cy)); g.stroke();
                                   g.beginPath(); arr.forEach((r, i) => i ? g.lineTo(r.cx + r.halfW, r.cy) : g.moveTo(r.cx + r.halfW, r.cy)); g.stroke(); };
          trace(shape.torso); if(shape.legL) trace(shape.legL); if(shape.legR) trace(shape.legR); }
      }
      url = dc.toDataURL('image/jpeg', 0.9);
    }
    // keypoint overlay for checking the annotations
    const ov = document.createElement('canvas'); ov.width = pim.naturalWidth; ov.height = pim.naturalHeight;
    const oc = ov.getContext('2d'); oc.drawImage(pim, 0, 0);
    const P = n => pose.keypoints.find(k => k.name === n);
    const bone = (a, b) => { const A = P(a), B = P(b); if(!A || !B) return; oc.strokeStyle = '#0f0'; oc.lineWidth = 3; oc.beginPath(); oc.moveTo(A.x, A.y); oc.lineTo(B.x, B.y); oc.stroke(); };
    [['left_shoulder','right_shoulder'],['left_shoulder','left_elbow'],['left_elbow','left_wrist'],['right_shoulder','right_elbow'],['right_elbow','right_wrist'],
     ['left_shoulder','left_hip'],['right_shoulder','right_hip'],['left_hip','right_hip'],['left_hip','left_knee'],['left_knee','left_ankle'],['right_hip','right_knee'],['right_knee','right_ankle']].forEach(([a,b]) => bone(a,b));
    for(const k of pose.keypoints){ oc.fillStyle = '#f00'; oc.beginPath(); oc.arc(k.x, k.y, 5, 0, 7); oc.fill(); }
    return { url, ms, overlay: ov.toDataURL('image/jpeg', 0.85) };
  }, { personB64: b64(outfit.person), items: Object.fromEntries(Object.entries(outfit.items).map(([c, f]) => [c, b64(f)])), pose, debug: !!process.env.DEBUG });
  const tag = outfit.person.replace('person-', '').replace('.jpg', '') + '__' + Object.values(outfit.items).map(f => f.replace('garment-', '').replace('.jpg', '')).join('+');
  fs.writeFileSync(path.join(OUT, tag + '.jpg'), Buffer.from(r.url.split(',')[1], 'base64'));
  fs.writeFileSync(path.join(OUT, outfit.person.replace('.jpg', '-pose.jpg')), Buffer.from(r.overlay.split(',')[1], 'base64'));
  console.log(tag.padEnd(58), r.ms + 'ms');
}
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
