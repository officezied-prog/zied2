/* =========================================================================
   OFFLINE CLASSIFIER + ON-DEVICE LEARNING
   Synthetic silhouettes for the shape reader, and a real train/test split
   for the learned model — "it improves with corrections" is a claim that
   has to be measured, not asserted.
   ========================================================================= */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp, makeImage } from './harness.mjs';

const app = loadApp();
const {
  sfGarmentFeatures, sfHeuristicScores, sfTopCat, sfModelNew, sfModelTrain,
  sfModelScores, sfModelTrust, sfBlendScores, sfBrainLearnCategory, sfBrainPredict,
  sfBrainReset, sfBrainLearnFit, sfBrainFitPrior, sfBrainLearnThreshold, sfBrainThreshold
} = app;

const INK = [40, 40, 48, 255];
const CLEAR = [0, 0, 0, 0];
/** silhouette painter: `inside(x01, y01)` in normalised garment coords */
function silhouette(w, h, inside){
  return makeImage(w, h, (x, y) => {
    // leave a transparent margin so the bbox logic is genuinely exercised
    const u = (x - w * 0.12) / (w * 0.76), v = (y - h * 0.08) / (h * 0.84);
    if(u < 0 || u > 1 || v < 0 || v > 1) return CLEAR;
    return inside(u, v) ? INK : CLEAR;
  });
}

const SHAPES = {
  // wide shoulders + sleeves, straight hem, no split
  shirt: () => silhouette(300, 320, (u, v) =>
    v < 0.28 ? true : Math.abs(u - 0.5) < 0.34),
  // tall, splits into two legs below the hip
  trouser: () => silhouette(260, 420, (u, v) =>
    v < 0.26 ? Math.abs(u - 0.5) < 0.5
             : (Math.abs(u - 0.27) < 0.19 || Math.abs(u - 0.73) < 0.19)),
  // A-line: narrow waist, wide hem, no split
  skirt: () => silhouette(300, 300, (u, v) =>
    Math.abs(u - 0.5) < 0.22 + 0.28 * v),
  // long, fitted waist, flared hem
  dress: () => silhouette(260, 520, (u, v) =>
    v < 0.16 ? Math.abs(u - 0.5) < 0.34
             : Math.abs(u - 0.5) < 0.22 + 0.28 * Math.max(0, (v - 0.4) / 0.6)),
  // much wider than tall
  shoe: () => silhouette(400, 180, (u, v) =>
    v > 0.35 || u > 0.45),
};

describe('sfGarmentFeatures — reading the silhouette', () => {
  test('aspect ratio tracks the real shape', () => {
    const f = n => sfGarmentFeatures(SHAPES[n]().data, SHAPES[n]().w, SHAPES[n]().h);
    assert.ok(f('shoe')[0] < f('shirt')[0], 'a shoe is squatter than a shirt');
    assert.ok(f('shirt')[0] < f('trouser')[0], 'a shirt is squatter than trousers');
    assert.ok(f('trouser')[0] < f('dress')[0], 'trousers are squatter than a long dress');
  });

  test('the leg-gap feature fires on trousers and on nothing else', () => {
    for(const [name, mk] of Object.entries(SHAPES)){
      const img = mk();
      const gap = sfGarmentFeatures(img.data, img.w, img.h)[5];
      if(name === 'trouser') assert.ok(gap > 0.7, 'trousers must split, got ' + gap);
      else assert.ok(gap < 0.3, name + ' must not read as split, got ' + gap);
    }
  });

  test('an A-line hem is wider than its waist, a shirt hem is not', () => {
    const sk = SHAPES.skirt(), sh = SHAPES.shirt();
    const fSk = sfGarmentFeatures(sk.data, sk.w, sk.h);
    const fSh = sfGarmentFeatures(sh.data, sh.w, sh.h);
    assert.ok(fSk[4] > fSk[2] * 1.3, 'skirt: hem must be wider than the waist');
    assert.ok(fSh[4] <= fSh[2], 'shirt: hem must not be wider than the shoulders');
  });

  test('every feature is finite and normalised', () => {
    for(const mk of Object.values(SHAPES)){
      const img = mk();
      for(const v of sfGarmentFeatures(img.data, img.w, img.h)){
        assert.ok(Number.isFinite(v) && v >= 0 && v <= 1, 'out of range: ' + v);
      }
    }
  });

  test('a blank image does not crash or produce NaN', () => {
    const blank = makeImage(40, 40, () => CLEAR);
    for(const v of sfGarmentFeatures(blank.data, 40, 40)) assert.ok(Number.isFinite(v));
  });
});

describe('sfHeuristicScores — instant guess with no model download', () => {
  const guess = name => {
    const img = SHAPES[name]();
    return sfTopCat(sfHeuristicScores(sfGarmentFeatures(img.data, img.w, img.h))).cat;
  };

  test('separates the three shapes that decide where a garment is drawn', () => {
    // Getting top / bottom / full-length right is what keeps a garment on
    // the right half of the body; finer distinctions are CLIP's job.
    const upper = new Set(['shirt', 'jacket']);
    const lower = new Set(['trouser', 'skirt']);
    assert.ok(upper.has(guess('shirt')), 'shirt read as ' + guess('shirt'));
    assert.ok(lower.has(guess('trouser')), 'trouser read as ' + guess('trouser'));
    assert.ok(lower.has(guess('skirt')) || guess('skirt') === 'dress', 'skirt read as ' + guess('skirt'));
  });

  test('trousers are never mistaken for a top', () => {
    assert.ok(!['shirt', 'jacket', 'hat'].includes(guess('trouser')));
  });

  test('a wide flat object is not read as clothing for the torso', () => {
    assert.ok(!['shirt', 'jacket', 'dress'].includes(guess('shoe')), 'shoe read as ' + guess('shoe'));
  });

  test('scores are a valid probability distribution', () => {
    const img = SHAPES.shirt();
    const s = sfHeuristicScores(sfGarmentFeatures(img.data, img.w, img.h));
    const total = Object.values(s).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(total - 1) < 1e-9, 'sums to ' + total);
    assert.ok(Object.values(s).every(v => v >= 0 && v <= 1));
  });
});

describe('sfModelTrain — the model genuinely learns', () => {
  /* A deliberately adversarial setup: the labels CONTRADICT the built-in
     prototypes, so the only way accuracy can rise is by actually fitting
     the examples rather than leaning on the prior. */
  function rng(seed){ let s = seed; return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; }
  const CENTRES = {
    shirt:   [0.20, 0.70, 0.90, 0.80, 0.70, 0.02, 0.90, 0.45, 0.20, 0.4, 0.5],
    trouser: [0.40, 0.55, 0.90, 0.85, 0.80, 0.85, 0.90, 0.50, 0.05, 0.3, 0.4],
    shoe:    [0.08, 0.75, 0.55, 0.85, 0.95, 0.05, 0.55, 0.60, 0.80, 0.2, 0.3]
  };
  function sample(rnd, cat, noise){
    return CENTRES[cat].map(v => Math.max(0, Math.min(1, v + (rnd() - 0.5) * noise)));
  }
  function makeSet(rnd, n, noise){
    const cats = Object.keys(CENTRES), out = [];
    for(let i = 0; i < n; i++){ const c = cats[i % cats.length]; out.push([sample(rnd, c, noise), c]); }
    return out;
  }
  const accuracy = (model, set) =>
    set.filter(([f, c]) => sfTopCat(sfModelScores(model, f)).cat === c).length / set.length;

  test('held-out accuracy rises from chance to near-perfect', () => {
    const rnd = rng(7);
    const train = makeSet(rnd, 150, 0.18);
    const held = makeSet(rng(99), 60, 0.18);
    const model = sfModelNew();
    const before = accuracy(model, held);
    for(const [f, c] of train) sfModelTrain(model, f, c);
    const after = accuracy(model, held);
    assert.ok(after > 0.85, `expected >85% after training, got ${(after*100).toFixed(0)}%`);
    assert.ok(after > before + 0.3, `expected a real gain (${before} -> ${after})`);
  });

  test('more corrections keep helping, they do not destabilise it', () => {
    const rnd = rng(3);
    const train = makeSet(rnd, 300, 0.2);
    const held = makeSet(rng(555), 60, 0.2);
    const model = sfModelNew();
    const marks = [];
    train.forEach(([f, c], i) => {
      sfModelTrain(model, f, c);
      if((i + 1) % 60 === 0) marks.push(accuracy(model, held));
    });
    assert.ok(marks[marks.length - 1] >= marks[0], 'accuracy must not regress with more data');
    for(const cat of Object.keys(CENTRES)){
      assert.ok(model.w[cat].every(Number.isFinite), 'weights blew up for ' + cat);
    }
  });

  test('weights stay bounded over a long run (decay is doing its job)', () => {
    const rnd = rng(11);
    const model = sfModelNew();
    for(const [f, c] of makeSet(rnd, 1200, 0.2)) sfModelTrain(model, f, c);
    for(const cat of Object.keys(CENTRES)){
      assert.ok(Math.max(...model.w[cat].map(Math.abs)) < 60, 'weights drifted for ' + cat);
    }
  });

  test('an untrained model is ignored, a well-fed one is trusted', () => {
    assert.equal(sfModelTrust(0), 0);
    assert.ok(sfModelTrust(5) < 0.25, 'five examples must not outvote anything');
    assert.ok(sfModelTrust(60) > 0.7, 'a wardrobe of examples should carry real weight');
    assert.ok(sfModelTrust(1e6) < 1, 'trust is bounded');
  });
});

describe('sfBlendScores — combining the three opinions', () => {
  const ids = app.sfCatIds();
  const flat = () => Object.fromEntries(ids.map(c => [c, 1 / ids.length]));
  const spike = c => Object.fromEntries(ids.map(k => [k, k === c ? 0.9 : 0.1 / (ids.length - 1)]));

  test('always returns a valid distribution, in every combination', () => {
    for(const learned of [null, spike('shoe')]){
      for(const clip of [null, spike('dress')]){
        for(const trust of [0, 0.3, 0.9]){
          const out = sfBlendScores(flat(), learned, trust, clip);
          const total = Object.values(out).reduce((a, b) => a + b, 0);
          assert.ok(Math.abs(total - 1) < 1e-9, 'sums to ' + total);
        }
      }
    }
  });

  test('CLIP leads when it is available', () => {
    const out = sfBlendScores(spike('shirt'), null, 0, spike('dress'));
    assert.equal(sfTopCat(out).cat, 'dress');
  });

  test('the shape reader decides alone when nothing else has an opinion', () => {
    assert.equal(sfTopCat(sfBlendScores(spike('trouser'), null, 0, null)).cat, 'trouser');
  });

  test('a well-trained model can overrule the shape prior', () => {
    const out = sfBlendScores(spike('shirt'), spike('jacket'), 0.8, null);
    assert.equal(sfTopCat(out).cat, 'jacket');
  });

  test('a barely-trained model cannot', () => {
    const out = sfBlendScores(spike('shirt'), spike('jacket'), sfModelTrust(2), null);
    assert.equal(sfTopCat(out).cat, 'shirt');
  });
});

describe('sfBrain — corrections persist and change later guesses', () => {
  test('repeated corrections move the app\'s answer', () => {
    sfBrainReset();
    const img = SHAPES.skirt();
    const f = sfGarmentFeatures(img.data, img.w, img.h);
    const before = sfBrainPredict(f).cat;
    for(let i = 0; i < 80; i++) sfBrainLearnCategory(f, 'dress');   // "no, this is a dress"
    const after = sfBrainPredict(f);
    assert.equal(after.cat, 'dress', `still answering ${after.cat} after 80 corrections (was ${before})`);
    assert.ok(after.samples === 80 && after.trust > 0.7);
    sfBrainReset();
  });

  test('learning survives a reload and is wiped by a reset', () => {
    sfBrainReset();
    const img = SHAPES.shirt();
    const f = sfGarmentFeatures(img.data, img.w, img.h);
    for(let i = 0; i < 40; i++) sfBrainLearnCategory(f, 'bag');
    assert.equal(sfBrainPredict(f).samples, 40, 'persisted across calls');
    sfBrainReset();
    assert.equal(sfBrainPredict(f).samples, 0, 'reset must clear it');
  });

  test('the fit prior needs a pattern, not a single nudge', () => {
    sfBrainReset();
    assert.deepEqual(JSON.parse(JSON.stringify(sfBrainFitPrior())), { scale: 1, dx: 0, dy: 0 });
    sfBrainLearnFit({ scale: 0.9, dx: 0, dy: -4 });
    assert.equal(sfBrainFitPrior().scale, 1, 'one correction is not yet a habit');
    for(let i = 0; i < 6; i++) sfBrainLearnFit({ scale: 0.9, dx: 0, dy: -4 });
    const p = sfBrainFitPrior();
    assert.ok(Math.abs(p.scale - 0.9) < 0.02, 'scale prior: ' + p.scale);
    assert.equal(p.dy, -4);
    sfBrainReset();
  });

  test('the fit prior follows a change instead of averaging it away forever', () => {
    sfBrainReset();
    for(let i = 0; i < 10; i++) sfBrainLearnFit({ scale: 1.3, dx: 0, dy: 0 });
    for(let i = 0; i < 10; i++) sfBrainLearnFit({ scale: 0.8, dx: 0, dy: 0 });
    assert.ok(Math.abs(sfBrainFitPrior().scale - 0.8) < 0.05, 'should have followed the new pattern');
    sfBrainReset();
  });

  test('the fit prior is clamped to what the sliders can express', () => {
    sfBrainReset();
    for(let i = 0; i < 10; i++) sfBrainLearnFit({ scale: 99, dx: 900, dy: -900 });
    const p = sfBrainFitPrior();
    assert.ok(p.scale <= 1.5 && p.dx <= 25 && p.dy >= -25, JSON.stringify(p));
    sfBrainReset();
  });

  test('the segmentation threshold is remembered once it is a habit', () => {
    sfBrainReset();
    assert.equal(sfBrainThreshold(), 28);
    sfBrainLearnThreshold(55);
    assert.equal(sfBrainThreshold(), 28, 'one photo is not a habit');
    for(let i = 0; i < 6; i++) sfBrainLearnThreshold(55);
    assert.ok(Math.abs(sfBrainThreshold() - 55) <= 2, 'got ' + sfBrainThreshold());
    sfBrainReset();
  });
});
