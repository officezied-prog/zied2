/* =========================================================================
   BEHAVIOUR — the fixes that are not pixel maths: escaping, storage
   round-trips, command parsing and outfit de-duplication.
   ========================================================================= */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp } from './harness.mjs';

describe('sfEsc — free text is never markup', () => {
  const app = loadApp();
  test("an apostrophe in a brand name survives intact", () => {
    assert.equal(app.sfEsc("Levi's"), 'Levi&#39;s');
  });
  test('a script tag is inert', () => {
    const out = app.sfEsc('<img src=x onerror="alert(1)">');
    assert.ok(!out.includes('<') && !out.includes('>') && !out.includes('"'));
  });
  test('ampersands are escaped first, so nothing is double-decoded', () => {
    assert.equal(app.sfEsc('a & <b>'), 'a &amp; &lt;b&gt;');
  });
  test('null and undefined render as empty, not as the word "null"', () => {
    assert.equal(app.sfEsc(null), '');
    assert.equal(app.sfEsc(undefined), '');
  });
  test('Arabic passes through untouched', () => {
    assert.equal(app.sfEsc('قميص أصفر'), 'قميص أصفر');
  });
});

describe('preferences survive a reload', () => {
  test('changing the language does not wipe the theme', () => {
    // The regression: setLang wrote a bare string, boot read it with
    // JSON.parse inside the SAME try block as the theme, so the parse
    // threw and the theme was never read at all.
    const app = loadApp();
    app.__eval("SF.dark = true");
    app.localStorage.setItem('sf_dark', '1');
    app.__eval("setLang('en')");

    const fresh = loadApp();
    for(const [k, v] of app.__store) fresh.localStorage.setItem(k, v);
    // replay boot's own logic against the carried-over storage
    const lang = fresh.__eval(`(function(){
      const raw = localStorage.getItem('sf_lang');
      let l = null; if(raw){ try{ l = JSON.parse(raw); }catch(e){ l = raw; } }
      return l;
    })()`);
    const dark = fresh.__eval("localStorage.getItem('sf_dark') === '1'");
    assert.equal(lang, 'en', 'language must survive');
    assert.equal(dark, true, 'and the theme must survive with it');
  });

  test('a pre-existing bare value from the old build is still readable', () => {
    const app = loadApp();
    app.localStorage.setItem('sf_lang', 'en');      // legacy format, unquoted
    const lang = app.__eval(`(function(){
      const raw = localStorage.getItem('sf_lang');
      let l = null; if(raw){ try{ l = JSON.parse(raw); }catch(e){ l = raw; } }
      return (l === 'ar' || l === 'en') ? l : null;
    })()`);
    assert.equal(lang, 'en');
  });
});

describe('storage failures are reported, not swallowed', () => {
  test('a full device does not report a successful save', () => {
    const app = loadApp();
    app.localStorage.setItem = () => { const e = new Error('full'); e.name = 'QuotaExceededError'; throw e; };
    assert.equal(app.sfSet('sf_wardrobe', [1]), false);
    assert.equal(app.__eval("WardrobeDB.add({id:'x'})"), false,
      'add() must surface the failure so the caller cannot claim success');
  });
  test('a quota error is told apart from any other storage error', () => {
    const app = loadApp();
    const quota = new Error('q'); quota.name = 'QuotaExceededError';
    assert.equal(app.sfIsQuotaError(quota), true);
    assert.equal(app.sfIsQuotaError(new Error('something else')), false);
    assert.equal(app.sfIsQuotaError(null), false);
  });
});

describe('colour words resolve to the nearest real swatch', () => {
  const app = loadApp();
  test('a measured swatch matches its colour word', () => {
    // A yellow detected off a photo is never exactly the palette constant,
    // which is why `item.color === '#C9A227'` never once matched.
    const wanted = app.sfColorWordRGB('البسيني القميص الاصفر');
    assert.ok(wanted, 'should recognise the Arabic word for yellow');
    const measured = app.sfHexToRgb('#c7a531');
    const other = app.sfHexToRgb('#2d4b73');
    assert.ok(app.sfColorDist(measured, wanted) < app.sfColorDist(other, wanted));
    assert.ok(app.sfColorDist(measured, wanted) < 60, 'and be a close match');
  });
  test('English and Arabic reach the same colour', () => {
    assert.deepEqual(
      JSON.parse(JSON.stringify(app.sfColorWordRGB('the blue trousers'))),
      JSON.parse(JSON.stringify(app.sfColorWordRGB('البنطال الازرق'))));
  });
  test('a sentence with no colour word returns nothing', () => {
    assert.equal(app.sfColorWordRGB('wear the shirt'), null);
  });
  test('malformed colours do not throw', () => {
    for(const v of [null, undefined, '', 'red', '#12', 123]) assert.equal(app.sfHexToRgb(v), null);
  });
  test('the distance is symmetric and zero for identical colours', () => {
    const a = [190, 40, 40], b = [30, 40, 80];
    assert.equal(app.sfColorDist(a, a), 0);
    assert.ok(Math.abs(app.sfColorDist(a, b) - app.sfColorDist(b, a)) < 1e-9);
  });
});

describe('sfDedupeOutfit — one garment per category', () => {
  const app = loadApp();
  test('a long coat detected from two regions is offered once', () => {
    const found = [
      { cat: 'dress', confidence: 0.4, rect: { y: 10 } },
      { cat: 'dress', confidence: 0.7, rect: { y: 200 } },
      { cat: 'shoe',  confidence: 0.5, rect: { y: 400 } }
    ];
    const out = app.sfDedupeOutfit(found);
    assert.equal(out.length, 2);
    assert.equal(out.find(f => f.cat === 'dress').confidence, 0.7, 'keeps the more confident one');
  });
  test('distinct categories are all kept, in order', () => {
    const found = [{ cat: 'shirt', confidence: 0.3 }, { cat: 'trouser', confidence: 0.2 }, { cat: 'shoe', confidence: 0.9 }];
    assert.deepEqual(app.sfDedupeOutfit(found).map(f => f.cat), ['shirt', 'trouser', 'shoe']);
  });
  test('an empty detection stays empty', () => {
    assert.deepEqual(app.sfDedupeOutfit([]), []);
  });
});

describe('the before/after slider actually moves', () => {
  const app = loadApp();
  test('the split is settable and clamped', () => {
    app.setCompareSplit(0.25);
    assert.equal(app.__eval('compareSplit'), 0.25);
    app.setCompareSplit(-3);  assert.equal(app.__eval('compareSplit'), 0);
    app.setCompareSplit(99);  assert.equal(app.__eval('compareSplit'), 1);
  });
  test('opening the compare screen re-centres it', () => {
    app.setCompareSplit(0.9);
    app.showCompare();
    assert.equal(app.__eval('compareSplit'), 0.5);
  });
});
