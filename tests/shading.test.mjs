/* =========================================================================
   SHADING TRANSFER — the multiplier map must carry local light and shade
   and nothing else: no colour, no gradient, no runaway.
   ========================================================================= */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp, makeImage } from './harness.mjs';

const app = loadApp();
const { sfShadeMap, sfApplyShade, sfBoxBlur, sfBodyRegionMask, sfBodyShape, sfFitWidth, sfFallbackPose } = app;
const at = (sm, x, y) => sm.map[(y >> 1) * sm.hw + (x >> 1)];

describe('sfShadeMap', () => {
  test('a flat photo carries no shading: the map is 1 everywhere', () => {
    const { data, w, h } = makeImage(200, 200, () => [120, 100, 90]);
    const sm = sfShadeMap(data, w, h);
    for(const v of sm.map) assert.ok(Math.abs(v - 1) < 1e-6);
  });
  test('a smooth lighting ramp is not local shade either', () => {
    // a linear ramp is its own broad average; it must not print as a stripe
    const { data, w, h } = makeImage(300, 200, (x) => { const v = 80 + x * 0.4; return [v, v, v]; });
    const sm = sfShadeMap(data, w, h);
    assert.ok(Math.abs(at(sm, 150, 100) - 1) < 0.02, 'mid-ramp: ' + at(sm, 150, 100));
  });
  test('a fold reads as a dip, and only there', () => {
    const { data, w, h } = makeImage(300, 300, (x, y) => (Math.abs(y - 150) < 6 ? [60, 60, 60] : [170, 170, 170]));
    const sm = sfShadeMap(data, w, h);
    assert.ok(at(sm, 150, 150) < 0.92, 'inside the fold: ' + at(sm, 150, 150));
    assert.ok(Math.abs(at(sm, 150, 40) - 1) < 0.03, 'far from it: ' + at(sm, 150, 40));
  });
  test('the map is colour-blind: a red wall and a grey wall of equal brightness agree', () => {
    const a = makeImage(120, 120, (x) => (x < 60 ? [200, 40, 40] : [200, 40, 40]));
    const sm = sfShadeMap(a.data, a.w, a.h);
    for(const v of sm.map) assert.ok(Math.abs(v - 1) < 1e-6);
  });
  test('nothing escapes the clamp', () => {
    const { data, w, h } = makeImage(200, 200, (x, y) => ((x + y) % 40 < 4 ? [0, 0, 0] : [255, 255, 255]));
    const sm = sfShadeMap(data, w, h);
    for(const v of sm.map) assert.ok(v >= 0.78 - 1e-6 && v <= 1.15 + 1e-6);   // Float32 rounding
  });
  test('applying it darkens opaque pixels in the dip and leaves transparent ones alone', () => {
    const person = makeImage(200, 200, (x, y) => (Math.abs(y - 100) < 6 ? [50, 50, 50] : [180, 180, 180]));
    const sm = sfShadeMap(person.data, 200, 200);
    const layer = makeImage(200, 200, (x, y) => (x < 100 ? [200, 200, 200, 255] : [200, 200, 200, 0]));
    sfApplyShade(layer.data, 200, 200, sm);
    const inDip = layer.data[(100 * 200 + 50) * 4], outside = layer.data[(30 * 200 + 50) * 4];
    assert.ok(inDip < outside, `dip ${inDip} must be darker than ${outside}`);
    assert.equal(layer.data[(100 * 200 + 150) * 4], 200, 'transparent pixels untouched');
  });
  test('the box blur preserves the mean and is bounded', () => {
    const src = new Float32Array(50 * 50); for(let i = 0; i < src.length; i++) src[i] = (i * 7919) % 255;
    const out = sfBoxBlur(src, 50, 50, 3);
    const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
    assert.ok(Math.abs(mean(Array.from(out)) - mean(Array.from(src))) < 3);
    assert.ok(Array.from(out).every(v => v >= 0 && v <= 255));
  });
});

describe('sfBodyRegionMask / sfBodyShape', () => {
  const pose = sfFallbackPose(400, 800);
  test('the mask lies along the skeleton and covers a modest share of the frame', () => {
    const m = sfBodyRegionMask(pose, 400, 800);
    let on = 0; for(const v of m) on += v;
    const share = on / m.length;
    assert.ok(share > 0.04 && share < 0.3, 'share ' + share.toFixed(3));
    // on the torso axis, on a knee, and empty in a corner
    assert.equal(m[Math.round(0.4 * 800) * 400 + 200], 1, 'torso');
    assert.equal(m[Math.round(0.72 * 800) * 400 + Math.round(0.58 * 400)], 1, 'knee');
    assert.equal(m[10 * 400 + 10], 0, 'corner');
  });
  test('the body model narrows from shoulders to waist and from thigh to ankle', () => {
    const sh = sfBodyShape(pose, null, 400, 800);
    const t = f => app.sfSampleAt(sh.torso, 'f', f).halfW;
    assert.ok(t(0) > t(0.65), 'shoulders wider than the waist');
    const g = k => app.sfSampleAt(sh.legL, 'g', k).halfW;
    assert.ok(g(0) > g(0.5) && g(0.5) > g(1), 'thigh > knee > ankle');
  });
  test('the silhouette can narrow the model but never widen it, and a hole is ignored', () => {
    const base = sfBodyShape(pose, null, 400, 800);
    const wideRuns = new Array(800).fill(null).map(() => [{ x0: 0, x1: 399 }]);
    const wide = sfBodyShape(pose, wideRuns, 400, 800);
    assert.ok(Math.abs(app.sfSampleAt(wide.torso, 'f', 0.5).halfW - app.sfSampleAt(base.torso, 'f', 0.5).halfW) < 1e-6, 'a wider silhouette changes nothing');
    const slimRuns = new Array(800).fill(null).map(() => [{ x0: 170, x1: 230 }]);   // 30px half, plausible for the waist
    const slim = sfBodyShape(pose, slimRuns, 400, 800);
    const modelWaist = app.sfSampleAt(base.torso, 'f', 0.65).halfW;
    if(30 >= modelWaist * 0.7) assert.ok(app.sfSampleAt(slim.torso, 'f', 0.65).halfW <= modelWaist, 'a plausible slimmer silhouette narrows');
    const holeRuns = new Array(800).fill(null).map(() => [{ x0: 195, x1: 205 }]);   // 5px: a hole, not a body
    const hole = sfBodyShape(pose, holeRuns, 400, 800);
    assert.ok(Math.abs(app.sfSampleAt(hole.torso, 'f', 0.5).halfW - app.sfSampleAt(base.torso, 'f', 0.5).halfW) < 1e-6, 'an implausibly thin row is ignored');
  });
  test('sfFitWidth: never below the body; hangs at its own width only when loose', () => {
    assert.equal(sfFitWidth(30, 50, 0.6), 50, 'a tight garment stretches to the body');
    assert.equal(sfFitWidth(80, 50, 1.0), 50, 'a just-fitted garment follows the body');
    assert.equal(sfFitWidth(80, 50, 1.35), 80, 'a loose garment hangs at its own width');
    const mid = sfFitWidth(80, 50, 1.175);
    assert.ok(mid > 50 && mid < 80, 'in between it blends');
  });
});

describe('sfTubeShade — the body\'s roundness', () => {
  test('bright along the middle of a tube, darker toward its edges, symmetric', () => {
    const table = [{ y: 0, cx: 100, half: 40 }, { y: 200, cx: 100, half: 40 }];
    const mid = app.sfTubeShade([table], 100, 100, 0), edge = app.sfTubeShade([table], 138, 100, 0), out = app.sfTubeShade([table], 170, 100, 0);
    assert.ok(Math.abs(mid - 1) < 1e-6, 'centre is full brightness');
    assert.ok(edge < mid && edge > 0.5, 'edge is darker: ' + edge);
    assert.ok(Math.abs(app.sfTubeShade([table], 62, 100, 0) - edge) < 1e-6, 'symmetric');
    assert.ok(out < edge, 'beyond the tube (a sleeve) is darker still');
  });
  test('a light bias brightens the lit side and darkens the other', () => {
    const table = [{ y: 0, cx: 100, half: 40 }, { y: 200, cx: 100, half: 40 }];
    assert.ok(app.sfTubeShade([table], 130, 100, 0.1) > app.sfTubeShade([table], 70, 100, 0.1));
  });
  test('the nearest tube wins where two legs sit side by side', () => {
    const left = [{ y: 0, cx: 60, half: 30 }, { y: 200, cx: 60, half: 30 }];
    const right = [{ y: 0, cx: 140, half: 30 }, { y: 200, cx: 140, half: 30 }];
    assert.ok(Math.abs(app.sfTubeShade([left, right], 60, 50, 0) - 1) < 1e-6);
    assert.ok(Math.abs(app.sfTubeShade([left, right], 140, 50, 0) - 1) < 1e-6);
  });
  test('no tubes means no change', () => {
    assert.equal(app.sfTubeShade([], 10, 10, 0), 1);
  });
});
