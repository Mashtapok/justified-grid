# Justified Feed Demo

React 19 + TypeScript media feed rendering 2,000 mixed image/video items in justified rows.

## Setup

```bash
pnpm i
pnpm dev
```

`public/dataset.json` is committed, so dataset generation is not required for local setup.

To regenerate it from Unsplash you will need an [ACCESS_KEY](https://unsplash.com/):

```bash
UNSPLASH_ACCESS_KEY=... pnpm gen:dataset:unsplash
pnpm gen:dataset:unsplash:cache # requires .cache/unsplash-photos.json
```

## What's Done

### All required items are implemented:

- **R1 - Justified-row layout:** mixed image/video items are arranged into justified rows while preserving their original aspect ratios. The final row is clamped and left-aligned when it would otherwise become too tall.
- **R2 - Scales to large datasets:** the feed runs against the committed 2,000-item dataset and virtualizes by layout row, so DOM size is bounded by the visible rows plus overscan.
- **R3 - Column-count control:** the `Items per row` slider supports 2-6 target items per row. Layout reacts to slider changes and viewport resize while preserving the user's scroll anchor.
- **R4 - Efficient media loading:** media URLs are assigned only for visible/near cells. Images use `srcset`, fetch priority, and a bounded decoded-image cache. Videos do not autoplay globally; preview playback starts only after a 150 ms hover intent delay.

### All stretch goals are also covered:

- **S1 - Smooth column-count transition:** cell positions animate on GPU during density changes, with reduced-motion support.
- **S2 - Fast-scroll grace:** high scroll velocity temporarily renders newly entering cells as plain placeholders, then catches up after scrolling slows or stops.
- **S3 - Animation-friendly media cache:** loaded image bucket state survives virtualization, and decoded image elements are retained in a bounded weighted LRU so returning cells avoid unnecessary reload/decode work.
- **S4 - Right-sized media:** image requests are selected from width buckets (`320`, `640`, `1280`, `1920`) based on rendered cell width and device pixel ratio. If a larger bucket was already loaded, it is reused instead of downgrading.
- **S5 - Robust resize:** resize and scroll measurements are batched with `requestAnimationFrame`, and the virtualizer is remeasured after layout changes.
- **S6 - Live-data ergonomics:** the `Generate more` button prepends 1-5 mocked items with stable generated IDs. Scroll anchoring keeps the reader on the same item after prepend.

Dataset: `public/dataset.json` contains 1,700 Unsplash image records and 300 interleaved video records. Script `scripts/gen-unsplash-dataset.ts` can refresh Unsplash metadata and uses a deterministic seeded mix. Videos reuse a small Coverr MP4 preview pool with real poster URLs and unique feed IDs.

Videos supplied by [Coverr](https://coverr.co/).

## Design Decisions

- The layout uses a greedy justified-row algorithm. For each row it estimates a local target height from nearby aspect ratios, grows the row until it is close to that target, then computes the exact row height needed to fill the container width. A more global line-breaking algorithm such as Knuth-Plass could produce more visually even rows, but it is more complex and does more work across the item list. For this task the feed must stay responsive at around 2,000 items, so the greedy approach is the better tradeoff.

- Virtualization is row-based, not cell-based. Rows are the unit that owns height, so virtualizing rows keeps TanStack Virtual aligned with the layout model and avoids managing thousands of independently measured cells. Cells are still absolutely positioned inside the total-height stage.

- Scroll anchoring is handled manually. The feed chooses the most visible item before layout changes and restores its viewport offset in `useLayoutEffect` after resize, density changes, or prepends. Browser scroll anchoring is disabled on the scroller to avoid competing corrections.

- The density control is a discrete slider inspired by [Higgsfield Cinema Studio's](https://higgsfield.ai/cinema-studio).

- Media loading favors native browser behavior where possible. Images use `srcset`/`sizes` , which preserves browser caching. The tradeoff is that active native image requests are not manually aborted; instead, the app avoids assigning URLs to far-away cells.

- Video is treated conservatively because it is the highest bandwidth and decoder risk. Posters are loaded like images, while MP4 playback is mounted only after deliberate interaction. The 150 ms hover delay filters accidental pointer passes without making previews feel sluggish.

- Blurhash previews are rendered for visible images while the requested bucket is still loading to make the feed feel faster and avoid empty cells during normal browsing.

## Known Issues

- Video posters are not as efficient as the images. The current poster source does not provide the `WebP` as Unsplash images.
- Videos are `MP4`. `WebM` would usually be preferable for modern browsers, but the current video source does not provide it.
- At 5-6 items per row on narrow mobile screens, some cells can become too small for user

## Next Steps

- Detailed profiling with Chrome Devtools to find possible bottlenecks with image loading.
- Improve mobile rendering: increase tap-target sizes, tune spacing, and clamp density on narrow viewports.
- Persist the slider selection in `localStorage` to preserve layout density between sessions and improve UX.
- Add features: click-through gallery/detail view, image/video filtering once product requirements need it.
- Add clearer hover states for images and videos if the feed becomes more interactive.
