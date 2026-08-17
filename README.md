# Short Video Feed

## Run

```bash
node serve.mjs
```

A local server is used because the app relies on ES modules and proper HTTP byte-range handling for video. `serve.mjs` supports `Range` requests, which also avoids media playback issues on Safari and iOS.

## Implementation

Scrolling is entirely native and uses CSS Scroll Snap. `IntersectionObserver` is the single source of truth for the active slide, so there is no continuous scroll handler or frame loop doing layout calculations.

The endless feed uses a fixed pool of five reusable slides. Once scrolling settles, the pool is recentred and the outer slides are recycled with new virtual indices. `overflow-anchor: none` prevents browser scroll anchoring from interfering with this recentering.

Media resources are managed separately from the DOM pool. Only the active video and its immediate neighbours keep their sources attached. Distant videos are paused, have their `src` removed, and are reset with `load()`. This keeps media and decoder usage bounded regardless of how long the feed is used.

Preloading is staged so the active video gets priority before adjacent clips are warmed up. There is a small trade-off here: returning to a sufficiently distant video may require another request, in exchange for keeping memory usage predictable.

Playback is guarded against async `play()` races with a generation counter, so rapidly moving through several clips cannot leave an older video playing in the background. Playback is paused while the document is hidden and resumes only when appropriate.

The layout uses dynamic viewport units, safe-area insets and a responsive desktop container. Keyboard shortcuts are scoped to the feed, native controls remain keyboard accessible, and reduced-motion preferences are respected.

## Structure

| File | Role |
| --- | --- |
| `feed-data.js` | Source data and virtual index mapping |
| `slide-pool.js` | Reusable slide pool and recentering |
| `media-lifecycle.js` | Loading, playback and media cleanup |
| `feed-controller.js` | Active state, scrolling and interaction |
| `main.js` | UI wiring |
| `config.js` | Feed tuning values |
