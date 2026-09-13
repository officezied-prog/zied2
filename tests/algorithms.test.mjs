/* =========================================================================
   ALGORITHM TESTS — synthetic pixel buffers and synthetic poses in,
   assertions out. These describe what each algorithm is SUPPOSED to do,
   independent of any particular photo, so a regression shows up as a
   failing name rather than as a subtly worse cut-out nobody notices.
   ========================================================================= */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp, makeImage, rectOnField, alphaAt, rgbAt } from './harness.mjs';

/* Objects built inside the VM carry that realm's Object.prototype, which
   deepEqual treats as a mismatch even when every field agrees. Strip them
   back to plain host objects before comparing shapes. */
const plain = v => JSON.parse(JSON.stringify(v));

const app = loadApp();
const {
  sfRemoveBg, sfDominantColor, sfOpaqueFraction, sfAlphaBounds, sfPlaceGarment,
  sfAnchorFor, sfOutfitRegions, sfFallbackPose, sfNormalizeArabic, sfWordOverlap,
  sfMapCropRect
} = app;

const WHITE = [245, 245, 245];
const RED   = [190, 40, 40];
const BLACK = [20, 20, 20];
const NAVY  = [30, 40, 80];

/** share of pixels inside `box` that survived removal */
function keptInside(out, w, box){
  let kept = 0, total = 0;
  for(let y = box.y; y < box.y + box.h; y++){
    for(let x = box.x; x < box.x + box.w; x++){ total++; if(alphaAt(out, w, x, y) > 128) kept++; }
  }
  return kept / total;
}
/** share of pixels OUTSIDE `box` that survived removal (should be ~0) */
function keptOutside(out, w, h, box){
  let kept = 0, total = 0;
  for(let y = 0; y < h; y++){
    for(let x = 0; x < w; x++){
      if(x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h) continue;
      total++; if(alphaAt(out, w, x, y) > 128) kept++;
    }
  }
  return kept / total;
}

describe('sfRemoveBg — background removal', () => {
  test('keeps a plain garment and erases a plain field', () => {
    const box = { x: 20, y: 15, w: 60, h: 70 };
    const { data, w, h } = rectOnField(100, 100, box, RED, WHITE);
    const out = sfRemoveBg(data, w, h, 28);
    assert.ok(keptInside(out, w, box) > 0.97, 'garment should survive');
    assert.ok(keptOutside(out, w, h, box) < 0.03, 'field should be erased');
  });

  test('keeps BOTH tones of a two-tone garment', () => {
    // A red garment with a wide black band across its middle. The band is
    // nowhere near the border, so nothing may punch it out.
    const box = { x: 20, y: 10, w: 60, h: 80 };
    const { data, w, h } = makeImage(100, 100, (x, y) => {
      const inside = x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h;
      if(!inside) return WHITE;
      return (y > 40 && y < 60) ? BLACK : RED;
    });
    const out = sfRemoveBg(data, w, h, 28);
    assert.ok(keptInside(out, w, { x: 25, y: 42, w: 50, h: 16 }) > 0.95, 'black band must survive');
    assert.ok(keptInside(out, w, { x: 25, y: 15, w: 50, h: 20 }) > 0.95, 'red body must survive');
  });

  test('survives a close-up where the garment touches every border', () => {
    // Trousers photographed tight: the item bleeds off all four edges and
    // only the corners show background.
    const { data, w, h } = makeImage(100, 100, (x, y) => {
      const corner = (x < 12 || x > 87) && (y < 12 || y > 87);
      return corner ? WHITE : NAVY;
    });
    const out = sfRemoveBg(data, w, h, 28);
    assert.ok(keptInside(out, w, { x: 30, y: 30, w: 40, h: 40 }) > 0.95, 'garment must not be erased');
    assert.ok(alphaAt(out, w, 2, 2) === 0, 'corner background must go');
  });

  test('erases the gap BETWEEN two legs (background reachable from the edge)', () => {
    const { data, w, h } = makeImage(100, 100, (x, y) => {
      if(y < 10) return WHITE;                       // above the waistband
      const leftLeg  = x >= 22 && x < 44;
      const rightLeg = x >= 56 && x < 78;
      if(y < 30) return (x >= 22 && x < 78) ? NAVY : WHITE;   // joined at the hip
      return (leftLeg || rightLeg) ? NAVY : WHITE;            // split below
    });
    const out = sfRemoveBg(data, w, h, 28);
    assert.ok(alphaAt(out, w, 50, 80) === 0, 'gap between the legs must be removed');
    assert.ok(keptInside(out, w, { x: 24, y: 40, w: 18, h: 40 }) > 0.95, 'left leg survives');
    assert.ok(keptInside(out, w, { x: 58, y: 40, w: 18, h: 40 }) > 0.95, 'right leg survives');
  });

  test('separates a dark garment from a slightly-different dark background', () => {
    const box = { x: 25, y: 20, w: 50, h: 60 };
    const { data, w, h } = rectOnField(100, 100, box, [28, 28, 34], [70, 70, 76]);
    const out = sfRemoveBg(data, w, h, 28);
    assert.ok(keptInside(out, w, box) > 0.9, 'dark garment survives');
    assert.ok(keptOutside(out, w, h, box) < 0.1, 'dark background goes');
  });

  test('tolerates a gradient background', () => {
    const box = { x: 25, y: 20, w: 50, h: 60 };
    const { data, w, h } = makeImage(100, 100, (x, y) => {
      const inside = x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h;
      if(inside) return RED;
      const v = 200 + Math.round((x + y) / 4);   // 200 -> 249 across the frame
      return [v, v, v];
    });
    const out = sfRemoveBg(data, w, h, 28);
    assert.ok(keptInside(out, w, box) > 0.95, 'garment survives a gradient backdrop');
    assert.ok(keptOutside(out, w, h, box) < 0.05, 'whole gradient is removed');
  });

  test('degrades honestly when garment and backdrop share a colour', () => {
    // Cream stripes on a cream wall: genuinely ambiguous. The one
    // unacceptable outcome is quietly eating the pale stripes, because
    // nothing on screen would tell the person that happened.
    const box = { x: 25, y: 15, w: 50, h: 70 };
    const { data, w, h } = makeImage(100, 100, (x, y) => {
      const inside = x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h;
      if(inside) return (Math.floor(y / 6) % 2 === 0) ? RED : [240, 235, 225];
      const v = 232 + ((x * 7 + y * 3) % 12) - 6;
      return [v, v - 2, v - 6];
    });
    const out = sfRemoveBg(data, w, h, 28);
    assert.ok(keptInside(out, w, box) > 0.98, 'the garment must survive intact');
    assert.ok(app.sfOpaqueFraction(out) > 0.93,
      'an unresolvable photo must come back visibly untouched so the UI can say so');
  });

  test('the slider has real authority over an ambiguous photo', () => {
    /* The two modes are the point. Left of the middle the segmenter
       protects the garment, which on this photo means it can only report
       that it found nothing to remove. Pushed right it trusts the rim
       instead and actually cuts. A slider that could only ever pick the
       cautious reading was powerless on precisely the photos where it
       was the last thing left to try. */
    const box = { x: 25, y: 15, w: 50, h: 70 };
    const { data, w, h } = makeImage(100, 100, (x, y) => {
      const inside = x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h;
      if(inside) return (Math.floor(y / 6) % 2 === 0) ? RED : [240, 235, 225];
      const v = 232 + ((x * 7 + y * 3) % 12) - 6;
      return [v, v - 2, v - 6];
    });
    const cautious = sfRemoveBg(data, w, h, 28);
    assert.ok(keptInside(cautious, w, box) > 0.98, 'cautious mode keeps the garment whole');

    const bold = sfRemoveBg(data, w, h, 70);
    assert.ok(app.sfOpaqueFraction(bold) < app.sfOpaqueFraction(cautious) - 0.2,
      'bold mode must actually remove something');
  });

  test('a grainy backdrop is unreachable cautiously but removable boldly', () => {
    // Sensor grain splits a plain wall across several colour clusters,
    // none of which individually dominates the rim. Cautiously that reads
    // as "no background found"; the slider is the way through.
    let seed = 7;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const box = { x: 15, y: 11, w: 16, h: 6 };
    const { data, w, h } = makeImage(67, 55, (x, y) => {
      const inside = x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h;
      return (inside ? [154, 177, 114] : [213, 32, 94])
        .map(v => Math.max(0, Math.min(255, v + (rnd() - 0.5) * 30)));
    });
    assert.ok(app.sfOpaqueFraction(sfRemoveBg(data, w, h, 28)) > 0.93,
      'cautiously: reports nothing removed rather than guessing');
    const bold = sfRemoveBg(data, w, h, 60);
    assert.ok(app.sfOpaqueFraction(bold) < 0.2, 'boldly: the backdrop goes');
    assert.ok(keptInside(bold, w, box) > 0.8, 'and the item stays');
  });

  test('the two modes meet at the middle of the slider, not at an edge', () => {
    // A photo the cautious mode cannot cut must change behaviour somewhere
    // the person can actually reach by dragging.
    let seed = 7;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const { data, w, h } = makeImage(67, 55, (x, y) => {
      const inside = x >= 15 && x < 31 && y >= 11 && y < 17;
      return (inside ? [154, 177, 114] : [213, 32, 94])
        .map(v => Math.max(0, Math.min(255, v + (rnd() - 0.5) * 30)));
    });
    // slider runs 8..80
    assert.ok(app.sfOpaqueFraction(sfRemoveBg(data, w, h, 41)) > 0.9, 'still cautious just below');
    assert.ok(app.sfOpaqueFraction(sfRemoveBg(data, w, h, 42)) < 0.9, 'bold just above');
  });

  test('a textured backdrop is removed in full', () => {
    const box = { x: 22, y: 18, w: 56, h: 64 };
    const { data, w, h } = makeImage(100, 100, (x, y) => {
      if(x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h) return [60, 90, 150];
      const t = Math.sin(x * 0.9) * 18 + Math.sin(y * 0.3) * 10;
      return [165 + t, 130 + t, 95 + t];
    });
    const out = sfRemoveBg(data, w, h, 28);
    assert.ok(keptInside(out, w, box) > 0.97);
    assert.ok(keptOutside(out, w, h, box) < 0.03, 'wood grain must not survive as speckle');
  });

  test('strays and speckle are dropped, a genuine second piece is not', () => {
    // A pair of shoes (two comparable blobs) plus one 3px fleck of noise.
    const { data, w, h } = makeImage(100, 100, (x, y) => {
      const left  = x >= 15 && x < 40 && y >= 40 && y < 60;
      const right = x >= 60 && x < 85 && y >= 40 && y < 60;
      const fleck = x >= 50 && x < 53 && y >= 8 && y < 11;
      return (left || right || fleck) ? BLACK : WHITE;
    });
    const out = sfRemoveBg(data, w, h, 28);
    assert.ok(keptInside(out, w, { x: 17, y: 42, w: 20, h: 16 }) > 0.95, 'left shoe kept');
    assert.ok(keptInside(out, w, { x: 62, y: 42, w: 20, h: 16 }) > 0.95, 'right shoe kept');
    assert.equal(alphaAt(out, w, 51, 9), 0, 'the 3px fleck must be dropped');
  });

  test('the cut edge is feathered, not a hard stair-step', () => {
    const { data, w, h } = rectOnField(100, 100, { x: 20, y: 20, w: 60, h: 60 }, RED, WHITE);
    const out = sfRemoveBg(data, w, h, 28);
    const edge = alphaAt(out, w, 20, 50), inner = alphaAt(out, w, 25, 50);
    assert.equal(inner, 255, 'the interior stays fully opaque');
    assert.ok(edge > 0 && edge < 255, 'the boundary pixel is partially transparent, got ' + edge);
  });

  /* ---- the case that produced a visibly wrong try-on ----
     Colours below are measured off a real result this app produced:
     cream trousers rgb(220,212,199) on a kraft card rgb(208,202,190),
     31 apart on a scale that runs to 765, with the contact shadow
     rgb(155,127,105) where the fabric meets the card. Colour clustering
     cannot separate the first two and never will; the shadow is the only
     thing in the photo that says where the garment ends. */
  function trousersOnCard(withShadow){
    const W = 390, H = 520;
    const inset = (u, v) => (v > 0.055 && v < 0.93)
      ? Math.min(
          v < 0.32 ? 0.235 - Math.abs(u - 0.5)
                   : Math.max(0.105 - Math.abs(u - 0.385), 0.105 - Math.abs(u - 0.615)),
          (v - 0.055) * 2, (0.93 - v) * 2)
      : -1;
    const img = makeImage(W, H, (x, y) => {
      const u = x / W, v = y / H, d = inset(u, v);
      const k = Math.pow(u, 1.6);   // the card is lit unevenly across the frame
      if(d < 0) return [210 - 58*k, 204 - 86*k, 192 - 100*k];
      const fold = Math.round(15 * Math.sin(v * 9));
      const cloth = [220 - fold, 212 - fold, 199 - fold];
      if(!withShadow) return cloth;
      const t = Math.min(1, d / 0.022), sh = [155, 127, 105];
      return cloth.map((cv, i) => Math.round(sh[i] + (cv - sh[i]) * t));
    });
    return { ...img, inset };
  }
  function cardVsCloth(out, img){
    let cardKept = 0, cardN = 0, clothKept = 0, clothN = 0;
    for(let y = 0; y < img.h; y++){
      for(let x = 0; x < img.w; x++){
        const d = img.inset(x / img.w, y / img.h);
        const a = alphaAt(out, img.w, x, y);
        if(d < 0){ cardN++; if(a > 128) cardKept++; }
        else if(d > 0.03){ clothN++; if(a > 128) clothKept++; }   // ignore the shadow band itself
      }
    }
    return { card: cardKept / cardN, cloth: clothKept / clothN };
  }

  test('cuts a cream garment off a near-identical card (the reported failure)', () => {
    const img = trousersOnCard(true);
    const r = cardVsCloth(sfRemoveBg(img.data, img.w, img.h, 28), img);
    assert.ok(r.cloth > 0.97, 'the trousers must survive whole, got ' + (r.cloth*100).toFixed(0) + '%');
    assert.ok(r.card < 0.25,
      'the card must be cut away, got ' + (r.card*100).toFixed(0) + '% still there');
  });

  test('and refuses to guess when the garment has no edge at all', () => {
    // Same photo with the contact shadow removed: now genuinely
    // unsegmentable. Leaving it alone is the correct answer; quietly
    // eating the garment is not.
    const img = trousersOnCard(false);
    const r = cardVsCloth(sfRemoveBg(img.data, img.w, img.h, 28), img);
    assert.ok(r.cloth > 0.95, 'the garment must not be eaten, got ' + (r.cloth*100).toFixed(0) + '%');
  });

  test('the edge pass is skipped entirely when colour already worked', () => {
    // It must not cost anything on the ordinary photos that never needed it.
    const big = rectOnField(360, 480, { x: 90, y: 60, w: 180, h: 340 }, RED, WHITE);
    const t0 = Date.now();
    const out = sfRemoveBg(big.data, big.w, big.h, 28);
    const ms = Date.now() - t0;
    assert.ok(keptInside(out, big.w, { x: 90, y: 60, w: 180, h: 340 }) > 0.97);
    assert.ok(ms < 400, 'a plain photo should stay fast, took ' + ms + 'ms');
  });

  test('never mutates its input buffer', () => {
    const { data, w, h } = rectOnField(60, 60, { x: 15, y: 15, w: 30, h: 30 }, RED, WHITE);
    const copy = Uint8ClampedArray.from(data);
    sfRemoveBg(data, w, h, 28);
    assert.deepEqual(Array.from(data), Array.from(copy));
  });

  test('is deterministic', () => {
    const { data, w, h } = rectOnField(80, 80, { x: 20, y: 20, w: 40, h: 40 }, NAVY, WHITE);
    const a = sfRemoveBg(data, w, h, 28);
    const b = sfRemoveBg(data, w, h, 28);
    assert.deepEqual(Array.from(a), Array.from(b));
  });
});

describe('sfDominantColor', () => {
  test('reports a solid garment colour accurately', () => {
    const { data } = rectOnField(40, 40, { x: 0, y: 0, w: 40, h: 40 }, RED, RED);
    const hex = sfDominantColor(data);
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
    assert.ok(Math.abs(r - RED[0]) < 12 && Math.abs(g - RED[1]) < 12 && Math.abs(b - RED[2]) < 12, hex);
  });

  test('picks the DOMINANT tone of a two-tone garment, not the average', () => {
    // 70% red, 30% white. Averaging yields pink (~#D9968F) which is neither
    // colour and is useless both as a swatch and for "the red shirt".
    const { data } = makeImage(100, 100, (x, y) => (y < 70 ? RED : WHITE));
    const hex = sfDominantColor(data);
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
    const nearRed   = Math.abs(r - RED[0]) < 45 && Math.abs(g - RED[1]) < 45 && Math.abs(b - RED[2]) < 45;
    assert.ok(nearRed, 'expected the red majority, got ' + hex);
  });

  test('ignores transparent pixels', () => {
    const { data } = makeImage(60, 60, (x, y) => (x < 30 ? [...RED, 255] : [0, 255, 0, 0]));
    const hex = sfDominantColor(data);
    const g = parseInt(hex.slice(3, 5), 16);
    assert.ok(g < 90, 'transparent green must not bleed in: ' + hex);
  });
});

describe('sfOpaqueFraction / sfAlphaBounds', () => {
  test('opaque fraction matches the drawn area', () => {
    const { data } = makeImage(100, 100, (x, y) => (y < 25 ? [0, 0, 0, 255] : [0, 0, 0, 0]));
    assert.ok(Math.abs(sfOpaqueFraction(data) - 0.25) < 0.01);
  });

  test('alpha bounds are tight around the visible pixels', () => {
    const { data } = makeImage(100, 100, (x, y) =>
      (x >= 30 && x <= 59 && y >= 10 && y <= 79) ? [1, 2, 3, 255] : [0, 0, 0, 0]);
    assert.deepEqual(plain(sfAlphaBounds(data, 100, 100)), { x: 30, y: 10, w: 30, h: 70 });
  });

  test('a fully transparent image falls back to the whole frame', () => {
    const { data } = makeImage(20, 30, () => [0, 0, 0, 0]);
    assert.deepEqual(plain(sfAlphaBounds(data, 20, 30)), { x: 0, y: 0, w: 20, h: 30 });
  });
});

describe('sfGradientMap — finding the outline', () => {
  test('a smooth lighting ramp is not an edge', () => {
    const { data, w, h } = makeImage(60, 60, (x) => { const v = 180 + x * 0.8; return [v, v, v]; });
    const g = app.sfGradientMap(data, w, h);
    assert.ok(g[30 * w + 30] < 3, 'a gentle ramp read as an edge: ' + g[30 * w + 30]);
  });
  test('a step IS an edge, and its strength tracks the step size', () => {
    const mk = step => {
      const { data, w, h } = makeImage(60, 60, (x) => (x < 30 ? [120, 120, 120] : [120 + step, 120 + step, 120 + step]));
      return app.sfGradientMap(data, w, h)[30 * w + 30];
    };
    assert.ok(mk(60) > mk(10), 'a bigger step must read stronger');
    assert.ok(mk(60) > 20, 'a 60-level step must clear a sane barrier');
  });
  test('the barrier adapts to the image instead of being a fixed number', () => {
    const soft = makeImage(60, 60, (x) => { const v = 180 + x * 0.5; return [v, v, v]; });
    const hard = makeImage(60, 60, (x, y) => ((x + y) % 8 < 4 ? [40, 40, 40] : [230, 230, 230]));
    const bs = app.sfGradientBarrier(app.sfGradientMap(soft.data, 60, 60), 0.9);
    const bh = app.sfGradientBarrier(app.sfGradientMap(hard.data, 60, 60), 0.9);
    assert.ok(bh > bs, `a busy image needs a higher bar (${bs} vs ${bh})`);
    assert.ok(bs >= 14, 'and a flat image must not drive the bar to zero');
  });
  test('dilation seals a one-pixel hole in an outline', () => {
    const g = new Float32Array(5 * 5);
    for(let y = 0; y < 5; y++) g[y * 5 + 2] = 100;   // a vertical wall
    g[2 * 5 + 2] = 0;                                 // with a pinhole
    const e = app.sfDilateEdges(g, 5, 5, 50);
    assert.equal(e[2 * 5 + 2], 1, 'the pinhole must be sealed');
    assert.equal(e[0 * 5 + 0], 0, 'and open ground left open');
  });
});

describe('sfSegmentQuality', () => {
  test('a healthy cut scores high', () => {
    const { data } = makeImage(100, 100, (x, y) =>
      (x >= 20 && x < 80 && y >= 15 && y < 85) ? [190, 40, 40, 255] : [0, 0, 0, 0]);
    assert.ok(app.sfSegmentQuality(data, 100, 100) > 0.95);
  });
  test('a cut that erased the garment scores low even at an ordinary opaque fraction', () => {
    // 30% of the frame survives -- but it is the BORDER that survived,
    // which a whole-image fraction cannot distinguish from a good cut.
    const { data } = makeImage(100, 100, (x, y) =>
      (x < 15 || x > 84) ? [200, 200, 200, 255] : [0, 0, 0, 0]);
    assert.ok(app.sfOpaqueFraction(data) > 0.25, 'looks ordinary overall');
    assert.ok(app.sfSegmentQuality(data, 100, 100) < 0.05, 'but the centre is empty');
  });
});

describe('sfPlaceGarment', () => {
  test('never distorts the garment aspect ratio', () => {
    const box = { cx: 100, cy: 200, w: 80, h: 120 };
    for(const [sw, sh] of [[100, 100], [40, 160], [200, 60], [33, 97]]){
      const p = sfPlaceGarment(sw, sh, box, false);
      assert.ok(Math.abs((p.h / p.w) - (sh / sw)) < 1e-6, `${sw}x${sh} was distorted`);
    }
  });

  test('a top-anchored garment hangs from the top of its region', () => {
    const box = { cx: 100, cy: 200, w: 80, h: 120 };   // region top = 140
    const p = sfPlaceGarment(80, 100, box, true);
    assert.ok(Math.abs((p.cy - p.h / 2) - 140) < 1e-6, 'top edge must sit at the region top');
  });

  test('a very tall image is capped instead of running off the body', () => {
    const box = { cx: 100, cy: 200, w: 80, h: 120 };
    const p = sfPlaceGarment(40, 400, box, true);
    assert.ok(p.h <= box.h * 1.3, 'height must be capped, got ' + p.h);
  });
});

describe('sfAnchorFor — pose-anchored placement', () => {
  const pose = sfFallbackPose(400, 800);
  const shoulderW = Math.abs(400 * 0.64 - 400 * 0.36);   // 112px

  test('a level pose yields a level garment', () => {
    for(const cat of ['shirt', 'jacket', 'dress', 'trouser', 'skirt']){
      const a = sfAnchorFor(cat, pose);
      assert.ok(a, cat + ' produced no anchor');
      assert.ok(Math.abs(a.angle) < 1e-6, cat + ' is rotated on a level pose: ' + a.angle);
    }
  });

  test('garments are sized from the body, not oversized', () => {
    const shirt = sfAnchorFor('shirt', pose);
    assert.ok(shirt.w > shoulderW && shirt.w < shoulderW * 1.6,
      'a shirt should be a little wider than the shoulders, got ' + shirt.w);
    const trouser = sfAnchorFor('trouser', pose);
    assert.ok(trouser.w < shirt.w, 'trousers must not be wider than a shirt');
  });

  test('a shirt sits on the torso and trousers below the hips', () => {
    const shirt = sfAnchorFor('shirt', pose);
    const trouser = sfAnchorFor('trouser', pose);
    assert.ok(shirt.cy < trouser.cy, 'shirt must sit above trousers');
    assert.ok(shirt.cy > 800 * 0.28 && shirt.cy < 800 * 0.55, 'shirt centre off the torso');
  });

  test('a tilted body rotates the garment the same way', () => {
    // Raise the subject's LEFT shoulder (image right) by 20px.
    const tilted = pose.map(k => k.name === 'left_shoulder' ? { ...k, y: k.y - 20 } : k);
    const a = sfAnchorFor('shirt', tilted);
    assert.ok(a.angle < -0.05, 'expected a negative (counter-clockwise) tilt, got ' + a.angle);
    assert.ok(Math.abs(a.angle) < Math.PI / 2, 'garment must never flip upside down');
  });

  test('shoes are produced per foot and mirrored', () => {
    const shoes = sfAnchorFor('shoe', pose);
    assert.ok(Array.isArray(shoes) && shoes.length === 2);
    assert.equal(shoes.filter(s => s.mirror).length, 1, 'exactly one shoe is mirrored');
  });

  test('bottoms follow the HIP line, tops follow the SHOULDER line', () => {
    // Shoulders level, hips tilted: a skirt must tilt, a shirt must not.
    const hipTilt = pose.map(k => k.name === 'left_hip' ? { ...k, y: k.y - 24 } : k);
    assert.ok(Math.abs(sfAnchorFor('shirt', hipTilt).angle) < 1e-6, 'shirt should stay level');
    assert.ok(sfAnchorFor('skirt', hipTilt).angle < -0.05, 'skirt should follow the hips');
    // and the reverse
    const shTilt = pose.map(k => k.name === 'left_shoulder' ? { ...k, y: k.y - 24 } : k);
    assert.ok(sfAnchorFor('shirt', shTilt).angle < -0.05, 'shirt should follow the shoulders');
    assert.ok(Math.abs(sfAnchorFor('skirt', shTilt).angle) < 1e-6, 'skirt should stay level');
  });

  test('a waist-up photo can still wear a top, but not trousers', () => {
    // The onboarding explicitly invites "full body, or even just to the
    // waist". Refusing to render anything for such a photo made that
    // invitation false.
    const waistUp = pose.filter(k => /shoulder|hip|nose|ear/.test(k.name));
    const shirt = sfAnchorFor('shirt', waistUp);
    assert.ok(shirt && shirt.w > 0 && shirt.h > 0, 'a shirt must place from shoulders + hips');
    assert.equal(sfAnchorFor('trouser', waistUp), null, 'legs we cannot see must not be invented');
    assert.equal(sfAnchorFor('skirt', waistUp), null);
    assert.equal(sfAnchorFor('shoe', waistUp), null);
  });

  test('a head-and-shoulders photo can still wear a top', () => {
    const topOnly = pose.filter(k => /shoulder|nose|ear/.test(k.name));
    const shirt = sfAnchorFor('shirt', topOnly);
    assert.ok(shirt && shirt.h > 0, 'the torso length is estimated from the shoulders');
    assert.ok(shirt.cy > shirt.h / 2, 'and it hangs below the shoulders, not above them');
    assert.equal(sfAnchorFor('trouser', topOnly), null);
  });

  test('a turned body is not pinched into a narrow garment', () => {
    // Three-quarter pose: the shoulder span foreshortens but the hips do
    // not. Sizing off the shoulders alone made every garment too narrow.
    const turned = pose.map(k =>
      /shoulder/.test(k.name) ? { ...k, x: 200 + (k.x - 200) * 0.45 } : k);
    const straight = sfAnchorFor('shirt', pose);
    const angled = sfAnchorFor('shirt', turned);
    assert.ok(angled.w > straight.w * 0.75,
      `a turned torso should not collapse the garment (${straight.w} -> ${angled.w})`);
  });

  test('a hat follows the tilt of the head', () => {
    const tilted = pose.map(k => k.name === 'left_ear' ? { ...k, y: k.y - 14 } : k);
    const level = sfAnchorFor('hat', pose);
    const hat = sfAnchorFor('hat', tilted);
    assert.ok(Math.abs(level.angle) < 1e-6, 'a level head gets a level hat');
    assert.ok(Math.abs(hat.angle) > 0.05, 'a tilted head gets a tilted hat');
    assert.ok(hat.cy < 800 * 0.13, 'the hat sits above the ears');
  });

  test('shoes are scaled from the leg, and stay sane when the knee is misread', () => {
    const normal = sfAnchorFor('shoe', pose)[0];
    assert.ok(normal.w > 20 && normal.w < 112, 'plausible foot width, got ' + normal.w);
    const badKnee = pose.map(k => /knee/.test(k.name) ? { ...k, y: 10 } : k);
    const wild = sfAnchorFor('shoe', badKnee)[0];
    assert.ok(wild.w <= normal.w * 1.6, 'a misread knee must not produce a giant shoe');
  });

  test('shoes are life-sized against the body, not two-thirds of it', () => {
    // Foot length is ~0.152 of stature and shoulder width ~0.23, so a foot
    // is roughly 0.66 of the shoulder span. The old cap put it at 0.46,
    // which is why rendered shoes looked visibly too small for the legs.
    const shoe = sfAnchorFor('shoe', pose)[0];
    assert.ok(shoe.w > shoulderW * 0.55,
      `a foot should be well over half the shoulder span, got ${(shoe.w/shoulderW).toFixed(2)}x`);
    assert.ok(shoe.w < shoulderW * 0.9, 'but not comically large');
  });

  test('a missing lower body does not crash or invent anchors', () => {
    const topOnly = pose.filter(k => /shoulder|nose|ear/.test(k.name));
    assert.equal(sfAnchorFor('trouser', topOnly), null);
    assert.ok(sfAnchorFor('shirt', topOnly) === null || sfAnchorFor('shirt', topOnly).w > 0);
  });

  test('low-confidence keypoints are ignored', () => {
    const unsure = pose.map(k => ({ ...k, score: 0.1 }));
    assert.equal(sfAnchorFor('shirt', unsure), null);
  });
});

describe('sfOutfitRegions — whole-outfit detection', () => {
  const pose = sfFallbackPose(400, 800);

  test('returns torso, legs and feet in top-to-bottom order', () => {
    const r = sfOutfitRegions(pose, 400, 800);
    assert.equal(r.length, 3);
    assert.ok(r[0].y < r[1].y && r[1].y < r[2].y);
  });

  test('every region stays inside the frame', () => {
    const r = sfOutfitRegions(pose, 400, 800);
    for(const x of r){
      assert.ok(x.x >= 0 && x.y >= 0 && x.x + x.w <= 400 && x.y + x.h <= 800, JSON.stringify(x));
    }
  });

  test('each region carries the categories that can plausibly live there', () => {
    const r = sfOutfitRegions(pose, 400, 800);
    assert.ok(r[0].cats.includes('shirt'), 'torso region must allow a top');
    assert.ok(!r[1].cats.includes('shirt'), 'the leg region must NOT offer a shirt');
    assert.deepEqual(plain(r[2].cats), ['shoe']);
  });

  test('an unusable pose yields no regions rather than nonsense', () => {
    assert.deepEqual(plain(sfOutfitRegions([], 400, 800)), []);
    assert.deepEqual(plain(sfOutfitRegions(pose.filter(k => k.name === 'nose'), 400, 800)), []);
  });
});

describe('sfNormalizeArabic / sfWordOverlap — spoken commands', () => {
  test('normalises alef, ya, ta-marbuta, diacritics and the definite article', () => {
    assert.equal(sfNormalizeArabic('الأصفر'), 'اصفر');
    assert.equal(sfNormalizeArabic('القَميص'), 'قميص');
    assert.equal(sfNormalizeArabic('عباية'), 'عبايه');
  });

  test('a garment name matches a sentence that inflects it', () => {
    const needle = sfNormalizeArabic('قميص أصفر').split(/\s+/);
    const hay = sfNormalizeArabic('البسيني القميص الأصفر مع البنطال');
    assert.ok(sfWordOverlap(needle, hay) >= 0.6, 'overlap was ' + sfWordOverlap(needle, hay));
  });

  test('an unrelated sentence does not match', () => {
    const needle = sfNormalizeArabic('حذاء رياضي').split(/\s+/);
    const hay = sfNormalizeArabic('البسيني القميص الأصفر');
    assert.ok(sfWordOverlap(needle, hay) < 0.6);
  });

  test('English is handled too', () => {
    const needle = sfNormalizeArabic('Yellow Shirt').split(/\s+/);
    assert.ok(sfWordOverlap(needle, sfNormalizeArabic('wear the yellow shirt')) >= 0.6);
  });
});

describe('sfMapCropRect', () => {
  test('scales a preview rectangle up to source pixels', () => {
    assert.deepEqual(plain(sfMapCropRect({ x: 10, y: 20, w: 30, h: 40 }, 100, 200, 1000, 2000)),
      { x: 100, y: 200, w: 300, h: 400 });
  });
  test('clamps a rectangle dragged past the edge', () => {
    const r = sfMapCropRect({ x: 90, y: 190, w: 50, h: 50 }, 100, 200, 1000, 2000);
    assert.ok(r.x + r.w <= 1000 && r.y + r.h <= 2000);
    assert.ok(r.w >= 1 && r.h >= 1);
  });
});
