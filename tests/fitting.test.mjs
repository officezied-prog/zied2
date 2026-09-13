/* =========================================================================
   FITTING — seams land on joints. Synthetic garment + synthetic pose,
   where every answer is known in advance.
   ========================================================================= */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp, makeImage } from './harness.mjs';

const app = loadApp();
const { sfAffineFromTriangles, sfGarmentLandmarks, sfFitTop, sfFitTrousers, sfFallbackPose, sfBodyFrame } = app;
const INK = [60, 60, 70, 255], CLEAR = [0, 0, 0, 0];
const near = (p, q, tol, what) =>
  assert.ok(Math.hypot(p.x - q.x, p.y - q.y) <= tol, `${what}: expected ~(${q.x.toFixed(0)},${q.y.toFixed(0)}) got (${p.x.toFixed(0)},${p.y.toFixed(0)})`);
const apply = (m, p) => ({ x: m[0]*p.x + m[2]*p.y + m[4], y: m[1]*p.x + m[3]*p.y + m[5] });

describe('sfAffineFromTriangles', () => {
  test('carries all three points exactly', () => {
    const s = [{x:10,y:10},{x:110,y:20},{x:30,y:120}], d = [{x:200,y:300},{x:260,y:350},{x:190,y:420}];
    const m = sfAffineFromTriangles(...s, ...d);
    for(let i = 0; i < 3; i++) near(apply(m, s[i]), d[i], 1e-6, 'vertex ' + i);
  });
  test('identity when source equals destination', () => {
    const s = [{x:0,y:0},{x:1,y:0},{x:0,y:1}];
    assert.deepEqual(JSON.parse(JSON.stringify(sfAffineFromTriangles(...s, ...s).map(v => +v.toFixed(9) + 0))), [1,0,0,1,0,0]);
  });
  test('a degenerate source triangle yields null, not NaN', () => {
    assert.equal(sfAffineFromTriangles({x:0,y:0},{x:1,y:1},{x:2,y:2},{x:0,y:0},{x:1,y:1},{x:2,y:2}), null);
  });
});

function polo(){
  return makeImage(400, 480, (x, y) => {
    const body = x >= 100 && x < 300 && y >= 40 && y < 440;
    const sleeves = (x >= 60 && x < 100 || x >= 300 && x < 340) && y >= 40 && y < 150;
    const collar = x >= 170 && x < 230 && y >= 20 && y < 40;
    return (body || sleeves || collar) ? INK : CLEAR;
  });
}
function trousers(){
  return makeImage(400, 480, (x, y) => {
    if(y < 30 || y >= 460) return CLEAR;
    if(y < 200) return (x >= 80 && x < 320) ? INK : CLEAR;
    return ((x >= 80 && x < 190) || (x >= 210 && x < 320)) ? INK : CLEAR;
  });
}
const pose = sfFallbackPose(400, 800);
const P = n => pose.find(k => k.name === n);

describe('sfFitTop — shoulder on shoulder, sleeve along the arm', () => {
  const img = polo();
  const lm = sfGarmentLandmarks(img.data, img.w, img.h, 'shirt');
  const fit = sfFitTop(lm, pose, { scale: 1, dx: 0, dy: 0 });
  const F = sfBodyFrame(pose);

  test('the shoulder seams land on the shoulder joints', () => {
    // torsoDst[0]/[1] are the collar-top corners, directly above the seams
    const collar = (lm.shoulderL.y - lm.box.y) * fit.scale;
    near({ x: fit.torsoDst[0].x, y: fit.torsoDst[0].y + collar }, F.L.shoulder, 2, 'left seam');
    near({ x: fit.torsoDst[1].x, y: fit.torsoDst[1].y + collar }, F.R.shoulder, 2, 'right seam');
  });
  test('the scale is set by the shoulders, so the hem follows the garment\'s own length', () => {
    const shoulderDist = Math.hypot(F.R.shoulder.x - F.L.shoulder.x, F.R.shoulder.y - F.L.shoulder.y);
    assert.ok(Math.abs(fit.scale - shoulderDist / lm.shoulderW) < 1e-9);
    const hemY = (fit.torsoDst[2].y + fit.torsoDst[3].y) / 2;
    const expected = F.L.shoulder.y + lm.length * fit.scale;
    assert.ok(Math.abs(hemY - expected) < 3, `hem at ${hemY}, expected ${expected}`);
  });
  test('each sleeve stays sewn to the torso and swings its outer edge down the arm', () => {
    assert.ok(fit.sleeves.length >= 2, 'a quad per sleeve at least');
    const leftQuads = fit.sleeves.filter(s => s.pivotDst.x === F.L.shoulder.x);
    assert.ok(leftQuads.length >= 1, 'a sleeve hangs from the left shoulder');
    const top = leftQuads[0];
    // inner-top corner glued to the torso's left edge (within the overlap)
    const edge = fit.torsoDst[0];
    assert.ok(Math.hypot(top.dst[0].x - edge.x, top.dst[0].y - edge.y) < lm.shoulderW * 0.06 * fit.scale + 1,
      'inner edge must sit on the torso side');
    // the outer edge rotates about the shoulder by the arm angle: the
    // vector shoulder->outer-bottom, un-rotated, must equal scale * source vector
    const src = top.src[2], dst = top.dst[2];
    const g = { x: src.x - lm.shoulderL.x, y: src.y - lm.shoulderL.y };
    const rot = { x: g.x * Math.cos(top.angle) - g.y * Math.sin(top.angle), y: g.x * Math.sin(top.angle) + g.y * Math.cos(top.angle) };
    near(dst, { x: F.L.shoulder.x + rot.x * fit.scale, y: F.L.shoulder.y + rot.y * fit.scale }, 1e-6, 'outer corner');
    // and that angle is exactly the arm's: the garment sleeve axis rotated by it lies on shoulder->elbow
    const axisG = { x: (lm.sleeveL.x + lm.armpitL.x) / 2 - lm.shoulderL.x, y: (lm.sleeveL.y + lm.armpitL.y) / 2 - lm.shoulderL.y };
    const r2 = { x: axisG.x * Math.cos(top.angle) - axisG.y * Math.sin(top.angle), y: axisG.x * Math.sin(top.angle) + axisG.y * Math.cos(top.angle) };
    const arm = { x: F.L.elbow.x - F.L.shoulder.x, y: F.L.elbow.y - F.L.shoulder.y };
    assert.ok(Math.abs(Math.atan2(r2.x * arm.y - r2.y * arm.x, r2.x * arm.x + r2.y * arm.y)) < 1e-6, 'sleeve axis on the arm axis');
  });
  test('a long sleeve bends at the elbow; a short one does not', () => {
    assert.ok(fit.sleeves.every(s => !s.isLong), 'short sleeves are not elbow-hinged');
    const long = makeImage(400, 700, (x, y) => {
      const body = x >= 100 && x < 300 && y >= 40 && y < 600;
      const sleeves = (x >= 55 && x < 100 || x >= 300 && x < 345) && y >= 40 && y < 560;
      return (body || sleeves) ? INK : CLEAR;
    });
    const llm = sfGarmentLandmarks(long.data, long.w, long.h, 'jacket');
    const lfit = sfFitTop(llm, pose, null);
    const left = lfit.sleeves.filter(s => s.pivotDst.x === F.L.shoulder.x);
    assert.equal(left.length, 3, 'shoulder-to-armhole, armhole-to-elbow, elbow-to-cuff');
    assert.ok(left.every(s => s.isLong));
    // consecutive quads share their row, so the sleeve cannot tear
    near(left[0].dst[3], left[1].dst[0], 1e-9, 'quad 0 bottom-inner = quad 1 top-inner');
    near(left[1].dst[2], left[2].dst[1], 1e-9, 'quad 1 bottom-outer = quad 2 top-outer');
    // the cuff row lies along the forearm from the elbow row
    const fore = { x: F.L.wrist.x - F.L.elbow.x, y: F.L.wrist.y - F.L.elbow.y };
    const cuff = { x: left[2].dst[2].x - left[2].dst[1].x, y: left[2].dst[2].y - left[2].dst[1].y };
    const ang = Math.abs(Math.atan2(cuff.x * fore.y - cuff.y * fore.x, cuff.x * fore.x + cuff.y * fore.y));
    assert.ok(ang < 0.35, 'cuff hangs roughly along the forearm, angle off by ' + ang.toFixed(2));
  });
  test('no shoulders in the pose means no fit, not a crash', () => {
    assert.equal(sfFitTop(lm, pose.filter(k => !/shoulder/.test(k.name)), null), null);
  });
  test('the sliders shift the whole garment together', () => {
    const shifted = sfFitTop(lm, pose, { scale: 1, dx: 10, dy: 0 });
    const dx = shifted.torsoDst[0].x - fit.torsoDst[0].x;
    assert.ok(dx > 0, 'moves right');
    assert.ok(Math.abs((shifted.sleeves[0].pivotDst.x - fit.sleeves[0].pivotDst.x) - dx) < 1e-6, 'sleeves move with it');
  });
});

describe('sfFitTrousers — waist on hips, legs on legs', () => {
  const img = trousers();
  const lm = sfGarmentLandmarks(img.data, img.w, img.h, 'trouser');
  const fit = sfFitTrousers(lm, pose, null);
  const F = sfBodyFrame(pose);

  test('the waistband spans the hips, a little above the joints', () => {
    const { L: wl, R: wr } = fit.waist;
    const hipDist = Math.hypot(F.R.hip.x - F.L.hip.x, F.R.hip.y - F.L.hip.y);
    assert.ok(Math.abs((wr.x - wl.x) - hipDist * app.SF_WAIST_OVER_HIPS) < 1, 'visible waist width from the hip calibration');
    assert.ok(wl.y < F.L.hip.y && wr.y < F.R.hip.y, 'waistband above the hip joints');
    assert.ok(Math.abs((wl.x + wr.x) / 2 - (F.L.hip.x + F.R.hip.x) / 2) < 1, 'centred on the hips');
  });
  test('full-length trousers end at the ankles, each leg on its own ankle', () => {
    assert.ok(fit.fullLength, 'the synthetic trousers are full length on this body');
    const hemL = fit.legRows.L[fit.legRows.L.length - 1].centre, hemR = fit.legRows.R[fit.legRows.R.length - 1].centre;
    assert.ok(Math.abs(hemL.x - F.L.ankle.x) < 6 && hemL.y >= F.L.ankle.y - 2, 'left hem at the left ankle');
    assert.ok(Math.abs(hemR.x - F.R.ankle.x) < 6 && hemR.y >= F.R.ankle.y - 2, 'right hem at the right ankle');
  });
  test('each leg\'s centreline runs through its knee', () => {
    const distToPolyline = (p, pts) => {
      let best = Infinity;
      for(let i = 1; i < pts.length; i++){
        const a = pts[i-1], b = pts[i], vx = b.x - a.x, vy = b.y - a.y, L2 = vx*vx + vy*vy || 1;
        const t = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / L2));
        best = Math.min(best, Math.hypot(p.x - (a.x + vx*t), p.y - (a.y + vy*t)));
      }
      return best;
    };
    assert.ok(distToPolyline(F.L.knee, fit.legRows.L.map(r => r.centre)) < 12, 'left knee on the left leg');
    assert.ok(distToPolyline(F.R.knee, fit.legRows.R.map(r => r.centre)) < 12, 'right knee on the right leg');
  });
  test('the crotch of the garment lands between the thighs', () => {
    const crotch = fit.crotch;
    assert.ok(crotch.y > F.L.hip.y && crotch.y < F.L.knee.y, 'below the hips, above the knees');
    assert.ok(Math.abs(crotch.x - (F.L.hip.x + F.R.hip.x) / 2) < 2, 'centred');
    // and both legs' first rows meet there
    near(fit.legRows.L[0].dstInner, crotch, 1e-6, 'left leg inner edge at the crotch');
    near(fit.legRows.R[0].dstInner, crotch, 1e-6, 'right leg inner edge at the crotch');
  });
  test('a cropped trouser keeps its own length instead of reaching the shoe', () => {
    const short = makeImage(400, 300, (x, y) => {
      if(y < 30 || y >= 280) return CLEAR;
      if(y < 120) return (x >= 80 && x < 320) ? INK : CLEAR;
      return ((x >= 80 && x < 190) || (x >= 210 && x < 320)) ? INK : CLEAR;
    });
    const slm = sfGarmentLandmarks(short.data, short.w, short.h, 'trouser');
    const sfit = sfFitTrousers(slm, pose, null);
    assert.ok(!sfit.fullLength);
    const hem = sfit.legRows.L[sfit.legRows.L.length - 1].centre;
    assert.ok(hem.y < F.L.ankle.y - 40, 'the hem must stop well above the ankle, got ' + hem.y + ' vs ankle ' + F.L.ankle.y);
  });
  test('a fitted garment follows the body, a loose one hangs at its own width', () => {
    // same body; the trousers drawn 1.6x wider on the table must come out
    // wider on the body, and the narrow pair must not go below the body
    const wide = makeImage(640, 480, (x, y) => {
      if(y < 30 || y >= 460) return CLEAR;
      if(y < 200) return (x >= 40 && x < 600) ? INK : CLEAR;
      return ((x >= 40 && x < 300) || (x >= 340 && x < 600)) ? INK : CLEAR;
    });
    const wlm = sfGarmentLandmarks(wide.data, wide.w, wide.h, 'trouser');
    const wfit = sfFitTrousers(wlm, pose, null);
    const thighW = f => { const r = f.legRows.L[1]; return Math.hypot(r.dstOuter.x - r.dstInner.x, r.dstOuter.y - r.dstInner.y); };
    assert.ok(wfit.looseness > fit.looseness, 'the wide pair reads looser');
    assert.ok(thighW(wfit) >= thighW(fit), 'and is drawn at least as wide');
    const shape = app.sfBodyShape(pose, null, 0, 0);
    const bodyThigh = app.sfSampleAt(shape.legL, 'g', 1/6).halfW * 2;
    assert.ok(thighW(fit) >= bodyThigh * 0.98, 'never narrower than the body itself');
  });
  test('no leg quad is twisted: every row runs outer->inner the same way', () => {
    // The image-right leg's inner edge is LEFT of its outer edge, which a
    // signed half-width once turned into a bow-tie with a hole of bare
    // body in the middle of the thigh.
    const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    for(const [i, p] of fit.pieces.entries()){
      const [tl, tr, br, bl] = p.dst;
      // a simple (non-self-intersecting) quad has all four corners turning the same way
      const turns = [cross(tl, tr, br), cross(tr, br, bl), cross(br, bl, tl), cross(bl, tl, tr)];
      assert.ok(turns.every(t => t > 0) || turns.every(t => t < 0), 'piece ' + i + ' is self-intersecting');
    }
  });
  test('no hips means no fit, not a crash', () => {
    assert.equal(sfFitTrousers(lm, pose.filter(k => !/hip/.test(k.name)), null), null);
  });
});
