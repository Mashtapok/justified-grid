# Justified Grid

A responsive, virtualized media gallery built with React and TypeScript. It renders 2,000 mixed image and video items in justified rows while keeping scrolling, resizing, and density changes smooth.

I built this project to explore the details that make a media-heavy feed feel fast: layout calculation, row-based virtualization, scroll anchoring, responsive image selection, progressive previews, and conservative video loading.

## Highlights

- **Justified layout.** Images and videos keep their original aspect ratios while each completed row fills the available width. A sparse final row stays left-aligned instead of being stretched too tall.
- **Bounded DOM size.** The feed is virtualized by row, so only visible rows and a small overscan area are mounted—even with 2,000 items in the dataset.
- **Adjustable density.** The `Items per row` control targets two to six items per row. The layout responds to density changes and viewport resizing without losing the reader's position.
- **Progressive media loading.** Media URLs are assigned only to visible or nearby cells. Images use BlurHash previews, responsive `srcset` candidates, fetch priority, and a bounded decoded-image cache.
- **Careful video playback.** Videos do not autoplay across the feed. A preview is mounted only after a 150 ms hover-intent delay, which avoids unnecessary network and decoder work during scrolling.
- **Fast-scroll handling.** At high scroll velocity, newly entering cells briefly render as lightweight placeholders and catch up when scrolling slows.
- **Smooth transitions.** Density changes animate cell positions on the GPU and respect the user's reduced-motion preference.
- **Stable prepends.** `Generate more` adds one to five mocked items at the top while scroll anchoring keeps the current item in place.

## How it works

### Layout

The gallery uses a greedy justified-row algorithm. For each row, it estimates a target height from a small sample of nearby aspect ratios, adds items until the row is close to that target, and then calculates the exact height needed to fill the container.

A global line-breaking algorithm could make row heights more uniform, but it would add complexity and do more work across the full collection. The local greedy approach keeps recalculation predictable as the viewport and density change.

### Virtualization

Rows—not individual cells—are the virtualization unit because each row owns its height. TanStack Virtual tracks the visible row range, while media cells are absolutely positioned inside a stage with the full calculated height. This keeps the DOM bounded and aligned with the layout model.

### Scroll anchoring

Before a resize, density change, or prepend, the feed records the most visible item and its viewport offset. It restores that offset in `useLayoutEffect` after the new layout is applied. Native scroll anchoring is disabled on the scroller to prevent competing corrections.

### Media pipeline

Images are requested from width buckets (`160`, `320`, `640`, `960`, and `1280`) according to their rendered size. If a larger bucket is already cached, the feed reuses it instead of requesting a smaller version. Loaded bucket state survives virtualization, and decoded images are retained in a bounded weighted LRU cache.

BlurHash previews fill visible image cells until the requested source is ready. Video posters follow the same visibility rules, while MP4 playback is created only after deliberate pointer interaction. Resize and scroll measurements are batched with `requestAnimationFrame` to avoid redundant work.

## Tech stack

- React 19 and TypeScript
- Vite and React Compiler
- TanStack Virtual
- Radix UI Slider
- BlurHash
- Vitest, ESLint, and Prettier

## Getting started

The dataset is committed to the repository, so no API credentials or generation step is required.

```bash
pnpm install
pnpm dev
```

Create and preview a production build:

```bash
pnpm build
pnpm preview
```

## Quality checks

```bash
pnpm test
pnpm lint
pnpm format:check
```

The test suite covers the layout algorithm, dataset parsing, responsive image bucket selection, and media cache behavior.

## Dataset

[`public/dataset.json`](public/dataset.json) contains 1,700 Unsplash image records and 300 interleaved video records. The mix is deterministic, so regenerating from the same source data produces stable ordering. Videos use a small pool of Coverr previews with unique feed IDs.

To refresh the image metadata from Unsplash, provide an [Unsplash access key](https://unsplash.com/developers):

```bash
UNSPLASH_ACCESS_KEY=... pnpm gen:dataset:unsplash
```

To regenerate the dataset from an existing `.cache/unsplash-photos.json` file without calling the API:

```bash
pnpm gen:dataset:unsplash:cache
```

The application needs an internet connection to load the remote image and video assets referenced by the dataset.

## Known limitations

- Video posters do not have the same responsive WebP variants as the Unsplash images.
- Video previews are MP4 because the current source does not provide WebM alternatives.
- A density of five or six items per row can make cells too small on narrow mobile screens.

## Possible next steps

- Profile media loading and decoding in Chrome DevTools under slower network and device conditions.
- Tune spacing, density limits, and tap targets for narrow mobile viewports.
- Persist the density preference in `localStorage`.
- Add a focused gallery view and media-type filters.

Images are served by [Unsplash](https://unsplash.com/). Video previews are supplied by [Coverr](https://coverr.co/).
