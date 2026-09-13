/* =========================================================================
   GARMENT LANDMARKS — on silhouettes whose geometry is known exactly, the
   extractor must return the seams where they were drawn.
   ========================================================================= */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp, makeImage } from './harness.mjs';

const app = loadApp();
const { sfGarmentLandmarks } = app;
const INK = [60, 60, 70, 255], CLEAR = [0, 0, 0, 0];
const near = (p, x, y, tol, what) =>
  assert.ok(Math.abs(p.x - x) <= tol && Math.abs(p.y - y) <= tol,
    `${what}: expected ~(${x},${y}) got (${p.x},${p.y})`);

/* A polo drawn to spec: body panel x 100..300, shoulders at y=40, sleeves
   out to x=60/340 from y=40 down to y=150 (their hem), armpit at y=150,
   collar 170..230 rising to y=20, hem at y=440. Canvas 400x480. */
function polo(){
  return makeImage(400, 480, (x, y) => {
    const body = x >= 100 && x < 300 && y >= 40 && y < 440;
    const sleeves = (x >= 60 && x < 100 || x >= 300 && x < 340) && y >= 40 && y < 150;
    const collar = x >= 170 && x < 230 && y >= 20 && y < 40;
    return (body || sleeves || collar) ? INK : CLEAR;
  });
}
/* Trousers to spec: waistband x 80..320 at y=30, crotch at (200,200), legs
   x 80..190 and 210..320 down to y=460. Canvas 400x480. */
function trousers(){
  return makeImage(400, 480, (x, y) => {
    if(y < 30 || y >= 460) return CLEAR;
    if(y < 200) return (x >= 80 && x < 320) ? INK : CLEAR;
    return ((x >= 80 && x < 190) || (x >= 210 && x < 320)) ? INK : CLEAR;
  });
}

describe('sfGarmentLandmarks — tops', () => {
  const img = polo();
  const lm = sfGarmentLandmarks(img.data, img.w, img.h, 'shirt');

  test('finds both shoulder seams at the top of the body panel', () => {
    assert.ok(lm && lm.sleeved, 'should read as a sleeved top');
    near(lm.shoulderL, 100, 40, 8, 'left shoulder seam');
    near(lm.shoulderR, 299, 40, 8, 'right shoulder seam');
  });
  test('finds the armpits where the sleeve hem meets the body', () => {
    near(lm.armpitL, 100, 150, 8, 'left armpit');
    near(lm.armpitR, 299, 150, 8, 'right armpit');
  });
  test('sleeve tips are the sleeves\' farthest points from the shoulder', () => {
    near(lm.sleeveL, 60, 149, 8, 'left sleeve tip');
    near(lm.sleeveR, 339, 149, 8, 'right sleeve tip');
  });
  test('neck is the top of the collar, hem is the bottom of the body', () => {
    near(lm.neck, 200, 20, 6, 'neck');
    near(lm.hemL, 100, 439, 6, 'hem left');
    near(lm.hemR, 299, 439, 6, 'hem right');
    assert.ok(Math.abs(lm.shoulderW - 199) <= 10);
    assert.ok(Math.abs(lm.length - 399) <= 10);
  });
  test('the body-panel profile excludes the sleeves and follows the panel', () => {
    assert.equal(lm.panel.length, 11);
    // above the armpits the panel is 200 wide (x 100..300), not 280 with sleeves
    assert.ok(Math.abs(lm.panel[0].halfW - 100) <= 4, 'top of panel half-width: ' + lm.panel[0].halfW);
    assert.ok(Math.abs(lm.panel[10].halfW - 100) <= 4, 'hem half-width: ' + lm.panel[10].halfW);
    assert.ok(lm.panel.every(p => Math.abs(p.cx - 200) <= 3), 'centred');
  });
  test('a sleeveless top still yields shoulders at its top corners', () => {
    const vest = makeImage(300, 400, (x, y) => (x >= 80 && x < 220 && y >= 30 && y < 380) ? INK : CLEAR);
    const v = sfGarmentLandmarks(vest.data, vest.w, vest.h, 'shirt');
    assert.ok(v && !v.sleeved);
    near(v.shoulderL, 80, 30, 6, 'vest shoulder L');
    near(v.shoulderR, 219, 30, 6, 'vest shoulder R');
  });
  test('an empty mask returns null rather than throwing', () => {
    const blank = makeImage(50, 50, () => CLEAR);
    assert.equal(sfGarmentLandmarks(blank.data, 50, 50, 'shirt'), null);
    assert.equal(sfGarmentLandmarks(blank.data, 50, 50, 'trouser'), null);
  });
});

describe('sfGarmentLandmarks — trousers', () => {
  const img = trousers();
  const lm = sfGarmentLandmarks(img.data, img.w, img.h, 'trouser');

  test('waist corners sit on the waistband', () => {
    assert.ok(lm && lm.legs === 2);
    near(lm.waistL, 80, 38, 12, 'waist left');
    near(lm.waistR, 319, 38, 12, 'waist right');
  });
  test('the crotch is where the legs first split', () => {
    near(lm.crotch, 200, 200, 8, 'crotch');
  });
  test('each leg hem has its own outer and inner edge', () => {
    near(lm.hemL.outer, 80, 459, 6, 'left hem outer');
    near(lm.hemL.inner, 189, 459, 6, 'left hem inner');
    near(lm.hemR.inner, 210, 459, 6, 'right hem inner');
    near(lm.hemR.outer, 319, 459, 6, 'right hem outer');
  });
  test('knee row is halfway between crotch and hem, per leg', () => {
    assert.ok(Math.abs(lm.kneeL.outer.y - 330) <= 6);
    near(lm.kneeL.outer, 80, 330, 8, 'knee L outer');
    near(lm.kneeR.inner, 210, 330, 8, 'knee R inner');
  });
  test('each leg has its own width profile from crotch to hem', () => {
    assert.equal(lm.legProfileL.length, 11);
    assert.ok(lm.legProfileL.every(p => Math.abs(p.halfW - 55) <= 3), 'left leg is 110 wide throughout');
    assert.ok(lm.legProfileR.every(p => Math.abs(p.halfW - 55) <= 3), 'right leg is 110 wide throughout');
    assert.ok(lm.legProfileL[5].cx < lm.crotch.x && lm.legProfileR[5].cx > lm.crotch.x, 'legs on their own sides');
  });
  test('a skirt-like read (no split) still returns a usable waist and hem', () => {
    const tube = makeImage(300, 400, (x, y) => (x >= 60 && x < 240 && y >= 30 && y < 380) ? INK : CLEAR);
    const t = sfGarmentLandmarks(tube.data, tube.w, tube.h, 'trouser');
    assert.ok(t && t.legs === 1);
    assert.ok(t.hemL.inner.x < t.hemR.inner.x, 'the hem is split down the middle');
  });
});
