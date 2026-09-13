# لبسة · Labsa

تطبيق تجربة الملابس افتراضياً — يعمل بالكامل على الجهاز، بلا خادم وبلا حساب.
صفحة `labsa.html` واحدة، مع مجموعة اختبارات للخوارزميات.

An on-device virtual try-on app: photograph your clothes, photograph
yourself, and see the outfit composed onto your own body. Everything —
segmentation, pose detection, classification and compositing — runs in the
browser. No server, no account, nothing uploaded.

```
labsa.html          the whole app, one file
tests/              algorithm tests (node --test) + a browser smoke test
```

```bash
npm test           # 92 algorithm tests, no browser needed
npm run test:browser   # end-to-end: boot, segment, classify, composite, save
```

---

## How it works

### 1. Cutting the garment out of its photo — `sfRemoveBg`

The hard part is that a garment photo gives you no labels: nothing says
which pixels are the shirt and which are the wall behind it.

Earlier versions asked a one-sided question — *how far is this pixel from
the background colour?* (sampled from a corner, then from the border) or
*…from the garment colour?* Each broke on a real photo:

- guessing the **background** fails on a close-up, where the garment itself
  owns most of the border;
- guessing a single **subject** colour fails on anything two-toned — a black
  band across a red dress is as far from "red" as the wall is, so the band
  was cut out along with the wall.

Both are the wrong question. What separates a garment from its backdrop is
**ownership**: a colour that lives mostly around the rim of the frame is
the backdrop; one that lives mostly in the middle is the item — whatever
those colours are, and however many of them there are. So the segmenter
samples a border ring and a centre box, clusters the colours once, and asks
of each cluster only *where does this colour mostly live?* A pixel is then
background if it is nearer a rim-owned cluster than a centre-owned one, and
connectivity from the border stops the cut punching holes inside the item.

Two refinements carry most of the accuracy:

- **Ties go to the garment.** The two mistakes are not symmetrical — keeping
  some backdrop costs one drag of a slider, erasing half the garment cannot
  be undone. So a colour that genuinely lives in both places is kept.
- **The sensitivity slider is a real second mode.** There is a pair of
  situations the shares cannot separate *even in principle* — a pale stripe
  on a pale wall, and a grainy backdrop split across several clusters — and
  they want opposite answers. The default is cautious; pushing the slider
  past the middle switches to the blunt reading, *whatever leans to the rim
  is backdrop*. Without that second mode the slider was powerless on exactly
  the photos where it was the last thing left to try.

Edges are feathered and colour-decontaminated, so a garment composited onto
a body no longer carries a halo of the wall it was photographed against.

Measured over 363 randomised synthetic photos:

| | |
|---|---|
| clean cut at the default sensitivity | 76.6% |
| clean cut reachable by moving the slider | **100%** |
| garment damaged at the default | **0%** |

### 2. Recognising what the garment is

Category recognition used to rest entirely on CLIP: a ~150MB download that
must finish before the app can say anything, and that answers nothing at
all offline.

But the segmenter has already produced the one thing that separates most
clothing at a glance — the outline. `sfGarmentFeatures` reads eleven numbers
straight off the alpha mask (aspect, fill, width profile, leg gap, symmetry,
centroid, saturation, lightness) and scores them against per-category
prototype silhouettes. It costs nothing, needs no network, and is decisive
where it matters most: the split between the legs is what makes trousers
trousers and not a long skirt.

CLIP still leads when it arrives, and its labels are now restricted to the
categories a given crop can plausibly contain — a crop taken between the
hips and the ankles is scored only against trousers and skirts. Zero-shot
classification is a comparison against whatever you offer it; offering it
impossible answers is how it picks one.

### 3. Learning from corrections — `sfBrain`

Every correction was previously thrown away: override "shirt" to "jacket"
forty times and the forty-first photo was guessed exactly as badly as the
first.

The app now keeps a small multinomial logistic model over the silhouette
features, trained by one gradient step each time a garment is saved — so it
learns from the category actually settled on, whether the suggestion was
accepted or corrected. Its weight in the blend grows with the number of
examples, from *ignore me* at zero to roughly half the vote once it has seen
a wardrobe's worth. On held-out synthetic data accuracy rises from chance to
above 85%; the tests measure this rather than asserting it.

Two smaller things are learned the same way:

- **Fit.** If every render comes out a touch large and the size slider is
  dragged back every time, the next render starts there instead.
- **Sensitivity.** Someone who always photographs against the same wall
  should not have to find the same slider position for every item.

All of it lives in `localStorage` beside the rest of the app. Nothing is
uploaded, and *delete my data* deletes this too.

### 4. Placing it on the body

MoveNet keypoints give the anchor for each garment. Notable corrections:

- **Tops follow the shoulder line, bottoms follow the hip line.** Using the
  shoulders for everything tilted a skirt with a shrug.
- **Body width is the larger of the shoulder and hip estimates.** A
  three-quarter pose — very common in a photo someone takes of herself —
  foreshortens the shoulders, and sizing off them alone pinched every
  garment.
- **A waist-up photo can still wear a top.** The onboarding invites "full
  body, or even just down to the waist", but every torso garment needed a
  hip keypoint and rendered nothing without one. The hips are now estimated
  from the shoulders. Anything that genuinely needs the legs still declines
  — guessing where an unseen knee is would be inventing the result.
- **Hats are anchored to the ear line, not the nose.** The nose moves when
  the head turns and carries no orientation, so a tilted head got a level
  hat floating off to one side.
- **Shoes are scaled from the shank**, bounded by the shoulder estimate so a
  misread knee cannot produce a shoe the size of the person.

---

## Bugs fixed in this pass

| | |
|---|---|
| **Changing the language silently forgot the language *and* the theme, forever.** `setLang` wrote a bare string; boot read it back with `JSON.parse`, which threw — and the theme was read inside the same `try` block, so it was skipped too. | one format, one reader, and each preference read separately |
| **The before/after slider was decorative.** It shipped with a handle, a knob and an ↔ glyph and no code behind any of it. The overlay was also a zero-height box, so `clip-path` hid the "after" image entirely. | wired for pointer and touch; overlay given a real box |
| **Item names were interpolated raw into `innerHTML`.** An apostrophe in "Levi's" broke the card; anything sharper was a script-injection route. | escaped at every interpolation point |
| **A full device reported a successful save.** The item appeared in the grid from memory and was gone on the next launch. | quota failures are named and surfaced; callers no longer claim success |
| **Whole-outfit detection ignored its own region categories.** A crop of someone's legs was scored against all nine labels and came back "shirt". | labels restricted per region; duplicate categories de-duplicated |
| **"The yellow shirt" never resolved.** Colour commands demanded `item.color === '#C9A227'`, and a swatch measured off a photo is never exactly a palette constant. | nearest-colour matching, with a distance ceiling so a wardrobe with no yellow declines instead of guessing |
| **"Delete everything" left the previous photo one tap away** — the last render, pose and detected item stayed in memory. | all live state cleared |
| **The swatch for a red shirt with white cuffs was pink** — a colour nowhere in the garment. | dominant cluster instead of the mean |
| **The adjustment sliders stuttered.** Every frame of a drag re-decoded each garment PNG and rescanned every pixel for its bounds. | computed once per item and cached |
| **A cut that erased the garment but kept the wall passed silently** — the whole-image opaque fraction cannot see it. | centre-region quality check, reported to the user |

---

## Privacy

Photos never leave the device. The pose and category models are downloaded
*to* the browser and run there; no image is ever uploaded. The learned model
is a few hundred numbers in `localStorage`. Everything is erased by
**Delete all my data** in the profile screen.
