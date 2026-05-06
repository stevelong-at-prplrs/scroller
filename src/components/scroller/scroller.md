# Scroller

A custom-rendered scrolling container with an overlay scrollbar. Use it as a content-scroller component in any layout where the native browser scrollbar isn't appropriate — overlaying decorative content, carousels, panels with fixed dimensions, or anywhere the consumer needs full control of scroll behavior, theming, or instrumentation.

## Usage

### Minimal

```tsx
import Scroller from "./components/scroller/scroller";

<Scroller orientation="vertical" viewHeight={500}>
    {items.map((item, i) => <div key={i}>{item}</div>)}
</Scroller>
```

The component auto-measures both the viewport (the visible area) and the content (the inner stack/row of children), so no size needs to be passed unless the consumer wants to lock it.

### With a theme

```tsx
<Scroller
    orientation="horizontal"
    viewWidth={800}
    viewHeight={120}
    theme={{
        backgroundColor: "#1a1a2e",
        thumbColor: "rgba(255, 255, 255, 0.5)",
        thumbThickness: 12,
        thumbBorderRadius: 6,
        thumbInset: 4,
        focusColor: "#7dd3fc",
        hideDelayMs: 1500,
        fadeMs: 200,
        minThumbLength: 40,
    }}
>
    {items}
</Scroller>
```

### With a ref (imperative control)

```tsx
const ref = React.useRef<ScrollerHandle>(null);

<Scroller ref={ref} orientation="vertical" viewHeight={500}>
    {items}
</Scroller>

// later:
ref.current?.scrollToIndex(15);
ref.current?.scrollBy(200);
ref.current?.scrollTo(0);
```

### Controlled mode

```tsx
const [pos, setPos] = React.useState(0);

<Scroller
    orientation="vertical"
    viewHeight={500}
    scrollPosition={pos}
    onScroll={setPos}
>
    {items}
</Scroller>
```

When `scrollPosition` is provided, the parent owns scroll state. The component fires `onScroll` for every requested change, but does not commit anything internally — the parent decides whether to apply.

### Loading more on scroll

```tsx
<Scroller
    orientation="vertical"
    viewHeight={500}
    onReachEnd={() => loadMore()}
>
    {items}
</Scroller>
```

`onReachEnd` fires only on the *transition* into the end position — not on every scroll event while sitting at the boundary.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `orientation` | `"horizontal" \| "vertical"` | required | Scroll axis. |
| `children` | `ReactNode` | required | Whatever should scroll. The component renders children directly inside its inner wrapper; their layout (flex, float, grid, etc.) is up to the consumer. |
| `contentSize` | `number?` | auto-measured | Total scrollable size in pixels. If omitted, measured from the wrapper via `ResizeObserver`. Provide explicitly to skip the observer. |
| `viewWidth` | `number?` | `100%` | Viewport width. |
| `viewHeight` | `number?` | `100%` | Viewport height. |
| `theme` | `ScrollerTheme?` | `{}` | Visual + timing tokens (see below). |
| `scrollPosition` | `number?` | uncontrolled | Controlled-mode scroll position. |
| `onScroll` | `(pos: number) => void` | — | Fires on every scroll change in either mode. |
| `onReachStart` | `() => void` | — | Fires on transition into position `0`. |
| `onReachEnd` | `() => void` | — | Fires on transition into the maximum scroll position. |
| `alwaysShowThumb` | `boolean?` | `false` | Disables auto-hide; thumb stays visible whenever there's something to scroll. |

## ScrollerTheme

All fields are optional; each falls back to a sensible default via CSS `var(--name, fallback)`:

| Field | Type | Default | Effect |
| --- | --- | --- | --- |
| `backgroundColor` | `string` | `darkblue` | Content viewport background. |
| `thumbColor` | `string` | `rgba(128, 128, 128, 0.5)` | Slider thumb color. |
| `thumbThickness` | `string \| number` | `10px` | Thumb cross-axis size (height for horizontal, width for vertical). Numbers are treated as pixels. |
| `thumbBorderRadius` | `string \| number` | `5px` | Thumb corner radius. |
| `thumbInset` | `string \| number` | `3px` | Distance from the thumb to the edge of the viewport (margin-bottom for horizontal, margin-right for vertical). |
| `focusColor` | `string` | `dodgerblue` | Color of the keyboard-focus outline on the track. |
| `hideDelayMs` | `number` | `1000` | Time after the last scroll event before the thumb auto-hides. |
| `fadeMs` | `number` | `150` | Thumb fade in/out duration. |
| `minThumbLength` | `number` | `30` | Minimum thumb length in pixels — keeps the thumb grabbable on very long content. |

## Imperative API (`ScrollerHandle`)

Pass a `ref` of type `React.RefObject<ScrollerHandle>` to the component. The handle exposes:

- `scrollTo(position: number)` — set absolute scroll position (clamped).
- `scrollBy(delta: number)` — scroll relative to current position.
- `scrollToIndex(index: number)` — scroll so the *n*th direct child of the wrapper aligns with the start of the viewport. Uses `offsetLeft`/`offsetTop`, so it's transform-independent.
- `getScrollPosition(): number` — returns the latest committed position, including in-flight commits before React re-renders.

## Behavior

### Input
- **Mouse, touch, and pen** all work via Pointer Events with `setPointerCapture`. Releasing outside the element never leaves drag state stuck — the browser keeps routing `pointermove`/`up` events to the captured element.
- **Drag the content view** to scroll the content (grab/grabbing cursor).
- **Click an empty area of the track** to snap the thumb under the cursor.
- **Click and drag the thumb** preserves the cursor's offset within the thumb, so it doesn't teleport on click — it tracks relative motion.
- **Wheel** scrolls the content. In horizontal mode, the dominant axis (`deltaX` or `deltaY`) is used so vertical-only wheels still work, and shift+wheel keeps working as expected.
- **Overscroll-aware**: the wheel handler only `preventDefault()`s when the scroller can actually consume the delta. At the boundaries, wheel events fall through to the page so it can scroll naturally.

### Keyboard
The track is in the tab order when there's something to scroll. Once focused:

| Key | Effect |
| --- | --- |
| ←/→ (horizontal) or ↑/↓ (vertical) | Scroll by 40 px |
| PageUp / PageDown | Scroll by one viewport length |
| Home / End | Jump to start / end |
| Space (vertical) | Page down (Shift+Space pages up) |

### Accessibility
- The track has `role="scrollbar"`, `aria-orientation`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, and `aria-controls` pointing to the content view's `id` (`React.useId`-generated, SSR-stable).
- `tabIndex` is `0` when scrollable, `-1` otherwise.
- A `:focus-visible` outline appears only on keyboard focus (no extra outline on click).
- The thumb is also visible while the track is focused so sighted keyboard users can see what they're driving.

### Visibility
The thumb is visible when `canScroll && (alwaysShowThumb || isScrolling || isTrackFocused || isHovered)`. Auto-hide kicks in `hideDelayMs` after the last scroll, fading over `fadeMs`. Hover detection only responds to mouse pointers — touch and pen don't have a hover concept.

### No-overflow guard
When the content fits the viewport (`totalOverflow <= 0`), all scroll-driving behaviors are suppressed:
- Wheel events propagate to the page.
- Drag and keyboard handlers no-op.
- The thumb is always invisible (no risk of NaN/∞ in the size math affecting layout).
- The track is removed from the tab order.

### Performance
- The wrapper scrolls via `transform: translate3d(...)`, not `left`/`top`. The wrapper is a compositor layer; the rest of the document stays unchanged on each frame.
- Drag handlers cache `getBoundingClientRect()` once on `pointerdown` and reuse it through the drag, avoiding the layout-thrash anti-pattern of reading layout while also writing it via the wrapper's translate.
- Wheel/keyboard reads of the latest scroll position go through `contentScrollRef.current`, an optimistically-updated ref that lets back-to-back commits in the same event tick read fresh values without waiting for React to re-render.

### CSS architecture
Component-scoped styles live in `scroller.module.css` (CSS Modules — class names hashed at build time so they can't collide with anything else on the page). Theme values are exposed as CSS custom properties (`--scroller-bg`, `--scroller-thumb-*`, `--scroller-focus`); the JS sets them on the root element via inline style, and the CSS uses them with built-in fallbacks. A single `.vertical` modifier class augments the three base classes (`view`, `wrapper`, `slider`) with orientation-specific rules.

## Future improvements

Items that would extend the component, roughly ordered by impact and feasibility.

### Design decisions needed
- **Drag-to-scroll vs. text selection.** Today, dragging anywhere in the content scrolls instead of selecting. Three candidate designs:
  - Empty-area-only drag (`e.target === e.currentTarget` gate) — preserves text selection on items, breaks drag-to-scroll for full-bleed content.
  - Modifier-key drag (Space or Alt held) — preserves selection, requires user education.
  - Opt-out prop (`dragToScroll?: boolean`) — cheapest, doesn't fix the conflict.

### Animation
- **Smooth/animated programmatic scroll** — `scrollTo(position, { smooth: true })` or similar; rAF-driven easing.
- **Inertia/momentum on drag release with elastic snapback at boundaries** — capture velocity from the last pointer moves, decay over time. When momentum carries past the boundary, allow a configurable stretch and then animate back (iOS rubber-band effect).

### Interaction modes
- **Snap-to-item** (loose snap) — animate to the nearest item boundary when motion stops. Builds on the smooth-scroll primitive.
- **Carousel mode** (strict snap) — discrete one-item-at-a-time scrolling.
- **Navigation arrows** — optional prev/next buttons via a prop, e.g. `arrows?: boolean | { prev?: ReactNode; next?: ReactNode }`. Hooks into the imperative API for movement.
- **Two-axis support** (`orientation: "both"`) — two perpendicular scrollbars, possibly with a corner element where they meet.

### Performance
- **Lazy loading of item content** — defer the heavy work inside items (image fetches, video poster loads, expensive React subtrees) until the item is at or near the viewport. Distinct from virtualization: virtualization avoids rendering DOM at all for off-screen items; lazy loading renders lightweight placeholders and only kicks in the expensive content as items approach visibility. Native `loading="lazy"` on `<img>` won't help here — it observes the document viewport, not the scroller's clipped region. A workable design is for the component to expose either an `IntersectionObserver`-based visibility hook (`useScrollerVisibility(itemRef)`) or a context that items consume, with a configurable "near-viewport" margin so loads can start slightly before items become visible.
- **Virtualization** for large item lists (>1k). Render only the visible window plus an overscan buffer. Requires consumer-provided per-item sizes or per-item `ResizeObserver`s, and a meaningful refactor of how `children` are rendered (since today the wrapper measures and scrolls all children). Complementary to lazy loading: virtualization saves DOM cost; lazy loading saves resource-fetch cost.
