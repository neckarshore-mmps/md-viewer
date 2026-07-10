# Split-Layout: Mobile Tabs + Desktop Edge-Slider

Design spec for backlog #2. Makes the two-pane view usable on a phone and lets
either pane take the full width on desktop — **without adding any button to the
toolbar**. The divider itself becomes the collapse control.

## Motivation

Two problems with today's fixed 50/50 split:

1. **Mobile is unreadable.** On a phone the rendered and raw panes share the
   screen 50/50 — both far too narrow to read (owner feedback, 2026-07-09).
2. **No focus mode on desktop.** There is no way to give one pane the full width
   when you just want to read the rendered document or scan the raw source.

The design keeps the toolbar untouched (a recurring owner concern: the web-app
bar is already dense — Open, Readme, How it works, theme, dark). Instead of new
controls, the **existing divider is promoted to a full-range slider**: drag it to
an edge to collapse a pane; on mobile it is replaced by a tab switch.

## Scope

In scope:

1. **Desktop edge-slider** — the divider drags the full 0–100% range; snapping
   into either edge collapses a pane; the collapsed edge is a pinned red bar that
   drags back to restore; double-click resets to 50/50.
2. **Mobile tabs** — below the breakpoint the split is replaced by a
   `[Rendered | Raw]` segmented control; one pane fills the height at a time.
3. **Toolbar icons (web app only)** — the text-glyph controls gain flat
   monochrome Material inline-SVG icons on a single size scale; the `readme.md`
   button is relabelled **Readme**.
4. Applies to **both build targets**: the Finder tool (`viewer.html`, built from
   `src/body.html` + `src/layout.css` + `src/app.js`) and the web app
   (`web/index.html`, built from the `src/web-*` files). The edge-slider and
   mobile tabs are shared behaviour; the toolbar icons are web-app only (the
   Finder bar has no such buttons).

Out of scope (YAGNI):

1. **Persistence** of the last ratio / collapsed state across reloads —
   explicitly **Won't-do** (owner decision 2026-07-10; struck from the backlog,
   not merely deferred). The view always starts at 50/50.
2. A separate "restore last ratio" affordance — dragging back from an edge
   follows the pointer; double-click is the only reset. No stored ratio.
3. Multi-theme icon redraws beyond the five listed controls.
4. Changing what the Readme button links to — only its label and icon change.

## Decisions

Recorded as Decision → Rationale → Affects. These resolve a long design
conversation; the rejected alternatives are listed so they are not re-litigated.

| # | Decision | Rationale | Affects |
|---|----------|-----------|---------|
| 1 | The divider is the collapse control (edge-slider), **no toolbar buttons** | Zero new chrome — directly answers the "toolbar is overloaded" concern; the divider is already a slider, so full-collapse is just "drag to the edge" | `*-layout.css`/`web-chrome.css`, `app.js`/`web-app.js` |
| 2 | A collapsed edge is a **pinned red bar** (accent), widened hit area + subtle glow | Doubles as the collapse *status* (replaces any ratio readout) and the *grab target* to drag back | divider CSS |
| 3 | **Double-click** the divider → 50/50 | Cheap, discoverable reset; replaces the earlier long-press idea (desktop is pointer-first) | `app.js`/`web-app.js` |
| 4 | **Mobile = tabs**, not stacked panes | Each pane gets 100% height (the scarcest resource on a phone); one tap to switch; no scrolling the whole document to reach the source | body HTML, CSS, JS |
| 5 | Icons are **Material Symbols as inline SVG**, `fill: currentColor` | Flat, monochrome, CSS-driven colour (flips automatically with theme / active state); **no CDN** keeps the artifact self-contained and offline — the "nothing is uploaded" promise | `web-body.html`, `web-chrome.css` |
| 6 | **No persistence** (start 50/50) | Keeps the feature slim and predictable; slider persistence is **Won't-do** (owner, 2026-07-10 — struck from backlog) | — |
| 7 | Reuse the existing **640px** breakpoint | Already the mobile breakpoint in `web-chrome.css`; one breakpoint everywhere | CSS |

Rejected alternatives (in order they were explored and dropped): three-state
`[Rendered · Split · Raw]` toolbar toggle; two-button `[full Rendered] [full Raw]`
toggle; a Split-button **ratio-cycler** (80·70·50·30·20) with long-press reset —
dropped because it re-implements the divider/slider it sits next to; divider
**chevrons** — dropped in favour of the edge-slider needing no extra glyphs.

## Behaviour — Desktop (viewport ≥ 640px)

The `.split` is the existing horizontal flex (`.pane.left` = rendered,
`.divider`, `.pane.right` = raw). Changes:

1. **Full-range drag.** The divider sets the left pane's `flex-basis` in percent
   across the full `0–100%` range (today it is clamped to `15–85%`; remove the
   clamp).
2. **Edge snapping.** While dragging, if the computed ratio is within `SNAP` (=
   `6%`, tunable) of an edge it snaps to exactly `0%` or `100%`:
   - `0%` → rendered pane collapsed, **raw full width**.
   - `100%` → raw pane collapsed, **rendered full width**.
3. **Collapsed edge = red pinned bar.** At `0%`/`100%` the divider gets an
   `.edge` class: background `--accent`/`--mdv-red`, `flex-basis` widened to
   `~8px`, a subtle outer glow, and it stays pinned at the viewport edge. It
   remains draggable — grabbing it and pulling inward leaves the edge state and
   the ratio follows the pointer again.
4. **Double-click** anywhere on the divider → ratio resets to `50%`, `.edge`
   removed.
5. There is **no ratio readout** in the footer (the footer is unchanged from
   today — the "Split nn:nn" text seen in the mockup was mockup-only
   instrumentation).

### Accessibility (desktop divider)

The divider must not be pointer-only (Lighthouse a11y ≥ 95, Core DoD):

1. `role="separator"`, `aria-orientation="vertical"`, `tabindex="0"`,
   `aria-label` (e.g. "Resize panes").
2. `aria-valuenow`/`aria-valuemin`/`aria-valuemax` track the left-pane percent.
3. Keyboard: `ArrowLeft`/`ArrowRight` move by `2%` across the full `0–100%`
   range (so from a collapsed edge, one arrow press moves off it → restore);
   `Home` = collapse to `0%`, `End` = collapse to `100%`; `Enter`/`Space` =
   reset to `50%` (mirrors double-click). Full collapse **and** restore are thus
   both reachable without a pointer.
4. Use **Pointer Events** (`pointerdown`/`pointermove`/`pointerup`, with
   `setPointerCapture`) rather than mouse-only handlers, so pen/touch trackpads
   on desktop work and capture survives fast drags.

## Behaviour — Mobile (viewport < 640px)

1. The split/divider is **hidden**. In its place a **tablist** `[Rendered | Raw]`
   sits directly under the bar, full width.
2. Exactly one pane is shown at a time, filling the available height. **Default:
   Rendered.**
3. Tapping a tab flips a state class on `.split`
   (`show-rendered` / `show-raw`) that controls which pane is displayed; the
   other is `display:none`.
4. Accessibility: `role="tablist"` / `role="tab"`, `aria-selected`, roving
   `tabindex`; the panes are the corresponding `role="tabpanel"`.

The tablist element exists in the DOM at all sizes but is `display:none` at
`≥ 640px`; the divider is `display:none` at `< 640px`. The two mechanisms are
mutually exclusive by breakpoint, so their JS state never has to reconcile.

## Toolbar icons (web app only)

All icons are inline `<svg viewBox="0 0 24 24" fill="currentColor">`, sized by
CSS so they share one visual scale. No external font/CDN.

| Control | Material icon | Label | Size notes |
|---------|---------------|-------|------------|
| Dark toggle | `dark_mode` (clean crescent) | Dark | `14px` — a filled shape reads heavier, so slightly smaller than the rest |
| How it works | `help` | How it works | `15px` |
| Open | `folder` | Open | `15px` |
| Readme | `menu_book` | Readme | `15px` — relabelled from `readme.md` |
| Theme dropdown | `arrow_drop_down` | (caret after "Swiss Grid") | `20px` with a fuller triangle path — the stock Material caret sits small inside its viewBox |

Base rule: `.btn svg { width:15px; height:15px; fill:currentColor; }`, with
per-icon overrides for the moon (`14px`) and caret (`20px`). Colour is never
hard-coded — it follows `currentColor`, so hover/active/theme all work for free.

## Files touched

| Target | File | Change |
|--------|------|--------|
| Both | `src/app.js`, `src/web-app.js` | Edge-slider (pointer events, snap, `.edge`, dbl-click, a11y), mobile tab switching. Logic must stay identical between the two — see "Shared logic" below. |
| Finder | `src/body.html` | Add the mobile tablist; divider a11y attributes |
| Finder | `src/layout.css` | `.edge` red state, mobile tabs + `640px` breakpoint, hide-divider/hide-tabs rules |
| Web | `src/web-body.html` | Toolbar inline-SVG icons + "Readme" relabel; add the mobile tablist; divider a11y attributes |
| Web | `src/web-chrome.css` | `.edge` red state, `.btn svg` sizing + moon/caret overrides, mobile tabs (extend existing `@media (max-width:640px)` block) |

### Shared logic

The divider/tab logic is duplicated across `app.js` and `web-app.js` today, which
risks divergence. The plan should either (a) factor the split/tab behaviour into a
shared source partial that `build.sh` concatenates into both targets, or (b) keep
two copies but add a smoke check that they stay in sync. Preference: (a). Verify
how `build.sh` composes each target before deciding.

## Testing

Extends the Playwright e2e layer shipped in #3 (`test/e2e/`). New assertions:

1. **Desktop edge-slider** — drag the divider to `x=0` → left pane width is 0 and
   the divider carries `.edge`; drag to far right → raw collapsed + `.edge`;
   drag back inward → `.edge` removed and both panes visible.
2. **Double-click reset** — after collapsing, double-click the divider → ratio
   back to ~50/50, no `.edge`.
3. **Keyboard** — focus the divider, `End` collapses, `Home`/`Enter` restores;
   `Arrow` keys change `aria-valuenow`.
4. **Mobile tabs** — set a `< 640px` viewport → the divider is hidden and the
   tablist is visible; tapping `Raw` shows the source pane and hides rendered;
   `aria-selected` tracks.
5. **Icons render** — the five toolbar buttons each contain an `<svg>`; no
   broken/empty glyph (bounding box > 0).

Shell smoke tests stay as the fast structural gate. Manual visual review (mobile
+ desktop, both themes) is owner-signed per the visual-acceptance rule — not
self-declared done.

## Success criteria

1. Phone: one pane fills the screen; tab switch works; nothing is 50/50-cramped.
2. Desktop: either pane reaches full width via the divider; red edge is visible
   and drags back; double-click resets.
3. Toolbar icons are one consistent scale; colours follow the theme; fully
   offline (no network requests added).
4. Lighthouse ≥ 95 on all metrics (incl. a11y); no console errors/warnings.
5. Both `viewer.html` and `web/index.html` behave identically for the shared
   behaviour.
