# Split-Layout: Mobile Tabs + Desktop Edge-Slider — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the two-pane view usable on a phone (tab switch) and let either pane take full width on desktop (edge-slider divider) — without adding any toolbar button.

**Architecture:** The divider/tab interaction is extracted into one shared source partial `src/split-view.js` that `build.sh` concatenates into **both** build targets (`viewer.html` and `web/index.html`). The two app scripts (`app.js`, `web-app.js`) stop owning divider drag. Desktop uses the divider as a full-range slider that collapses a pane at the edges; below 640px the divider is hidden and a `[Rendered | Raw]` tablist drives which pane shows.

**Tech Stack:** Vanilla ES5-style JS (no framework, matches the codebase), CSS with a 640px media query, `build.sh` (bash concatenation), Playwright e2e (`test/e2e/`, Chromium).

## Global Constraints

- **Self-contained / offline:** shipped `viewer.html` and `web/index.html` inline all CSS/JS; **no CDN / network request may be added**. Icons are inline SVG.
- **No new runtime dependencies.** Dev-only deps stay exact-pinned (no `^`/`~`).
- **ES5-compatible JS** in `src/*.js` (the codebase uses `var`, function expressions, no arrow/const in shipped scripts) — match it.
- **Rebuild after every `src/` edit:** run `./build.sh`; the CI freshness gate fails if `viewer.html`/`web/index.html` are stale.
- **Breakpoint:** `640px` (reuse the existing one in `web-chrome.css`).
- **Snap zone:** `6%` from each edge.
- **DOM ids are contracts:** keep `#divider`, `.split`, `.pane.left`, `.pane.right`, `#open`, `#readme`, `#changelog`, `#mode`, `#themeMenuBtn`, `#howto` — e2e tests and `web-app.js` reference them.
- **Persistence is Won't-do** — never write layout state to localStorage. Always start 50/50.
- **Visual acceptance is owner-signed** — do not self-declare the visual result "done".

---

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `src/split-view.js` | Shared divider edge-slider + mobile tabs + a11y. Self-initializes by DOM query. | Create |
| `build.sh` | Concatenate `split-view.js` into both targets. | Modify |
| `src/app.js` | Finder logic; **remove** its divider block. | Modify |
| `src/web-app.js` | Web logic; **remove** its divider block, keep scroll-sync. | Modify |
| `src/body.html` | Finder DOM: add divider a11y attrs + mobile tablist. | Modify |
| `src/web-body.html` | Web DOM: divider a11y attrs, mobile tablist, toolbar SVG icons, "Readme" relabel. | Modify |
| `src/layout.css` | Finder: `.edge` red state, mobile tabs, hide/show rules. | Modify |
| `src/web-chrome.css` | Web: `.edge` red state, `.btn svg` sizing, replace mobile stacked-split with tabs. | Modify |
| `test/e2e/split-view.spec.ts` | e2e for edge-slider, dbl-click, keyboard, mobile tabs. | Create |
| `test/e2e/controls.spec.ts` | Add "icons render" assertions. | Modify |
| `test/web-smoke.sh` | Add structural checks (split-view.js inlined, tablist present) for both outputs. | Modify |

---

## Task 1: Extract the shared split-view module (pure refactor, behaviour unchanged)

Establish the shared module with the *current* baseline behaviour (divider drag, 15–85% clamp) before adding features. De-risks by keeping e2e green.

**Files:**
- Create: `src/split-view.js`
- Modify: `build.sh`, `src/app.js:57-78`, `src/web-app.js` (divider block ~233-255)

**Interfaces:**
- Produces: a self-initializing IIFE that, on load, queries `.split`, `#divider`, `.pane.left`, `.pane.right` and wires pointer-drag. No exported symbols — pure DOM wiring. Later tasks extend the same private `render(pct)` function.

- [ ] **Step 1: Write the failing structural test**

Add to `test/web-smoke.sh` (near the other `grep` checks), then it fails because the marker is absent:

```bash
grep -q "mdv-split-view" web/index.html || { echo "FAIL: split-view.js not inlined in web/index.html"; exit 1; }
grep -q "mdv-split-view" viewer.html    || { echo "FAIL: split-view.js not inlined in viewer.html"; exit 1; }
```

- [ ] **Step 2: Run it to verify it fails**

Run: `./build.sh && bash test/web-smoke.sh`
Expected: FAIL "split-view.js not inlined" (module doesn't exist yet).

- [ ] **Step 3: Create `src/split-view.js`** with the current baseline behaviour

```javascript
/* mdv-split-view — shared divider/tab controller for both build targets.
   Self-initializes on load by DOM query. Desktop: drag the divider to resize.
   (Edge-collapse, double-click reset, keyboard a11y and mobile tabs are layered
   on in later tasks.) ES5-only to match the codebase. */
(function () {
  var split = document.querySelector(".split");
  var divider = document.getElementById("divider");
  var left = document.querySelector(".pane.left");
  if (!split || !divider || !left) return;

  var pct = 50;
  function render(p) {
    p = Math.max(15, Math.min(85, p));       // baseline clamp (Task 2 removes it)
    pct = p;
    left.style.flex = "0 0 " + p + "%";
  }

  var dragging = false;
  divider.addEventListener("pointerdown", function (e) {
    dragging = true;
    try { divider.setPointerCapture(e.pointerId); } catch (err) {}
    document.body.style.cursor = "col-resize";
    e.preventDefault();
  });
  divider.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    var rect = split.getBoundingClientRect();
    render(((e.clientX - rect.left) / rect.width) * 100);
  });
  divider.addEventListener("pointerup", function (e) {
    dragging = false;
    document.body.style.cursor = "";
    try { divider.releasePointerCapture(e.pointerId); } catch (err) {}
  });

  render(50);
})();
```

- [ ] **Step 4: Wire `build.sh`** to inline it in both targets

In `emit_finder()`, after the `cat "$SRC/app.js"` script block, add a second script block:

```bash
    echo '<script>'; cat "$SRC/app.js"; echo '</script>'
    echo '<script>'; cat "$SRC/split-view.js"; echo '</script>'
```

In `emit_web()`, after the `cat "$SRC/web-app.js"` script block, add:

```bash
    echo '<script>'; cat "$SRC/web-app.js"; echo '</script>'
    echo '<script>'; cat "$SRC/split-view.js"; echo '</script>'
```

Also add `"$SRC/split-view.js"` to the input-verification `for f in …` list.

- [ ] **Step 5: Remove the divider block from `src/app.js`**

Delete lines 57–78 (the `// Draggable divider` block through the `mouseup` listener) and the now-unused `var split` if not referenced elsewhere (it is only used there). Leave the rest untouched.

- [ ] **Step 6: Remove the divider block from `src/web-app.js`**

Delete the divider block (`// ─── Draggable divider …` through its `pointerup` handler, ~lines 233–255). **Keep** the scroll-sync block (`left.addEventListener("scroll" …)` etc.) — it stays in `web-app.js` and still references `left`/`right`, so keep those two `var` lookups it needs.

- [ ] **Step 7: Rebuild and run the smoke + existing e2e**

Run: `./build.sh && bash test/web-smoke.sh && npx playwright test`
Expected: smoke PASS (marker present in both files); all existing e2e PASS (divider still drags via the shared module; controls unaffected).

- [ ] **Step 8: Commit**

```bash
git add src/split-view.js build.sh src/app.js src/web-app.js test/web-smoke.sh viewer.html web/index.html
git commit -m "refactor(split): extract shared split-view divider module into both targets"
```

---

## Task 2: Edge-slider — full range, snap, red collapsed edge

**Files:**
- Modify: `src/split-view.js`, `src/layout.css`, `src/web-chrome.css`
- Test: `test/e2e/split-view.spec.ts` (create)

**Interfaces:**
- Consumes: `render(p)` from Task 1.
- Produces: `render(p)` now accepts `0–100`, snaps within 6% of an edge to `0`/`100`, and toggles the `edge` class on `#divider` at the extremes.

- [ ] **Step 1: Write the failing e2e** — create `test/e2e/split-view.spec.ts`

```typescript
import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => { await page.goto("/"); });

async function dragDividerToX(page: import("@playwright/test").Page, targetX: number) {
  const box = await page.locator("#divider").boundingBox();
  if (!box) throw new Error("divider not visible");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetX, box.y + box.height / 2, { steps: 12 });
  await page.mouse.up();
}

test("drag to far left collapses rendered → raw full, edge is red-flagged", async ({ page }) => {
  await dragDividerToX(page, 0);
  await expect(page.locator("#divider")).toHaveClass(/edge/);
  const leftW = await page.locator(".pane.left").evaluate((el) => el.getBoundingClientRect().width);
  expect(leftW).toBeLessThan(2);
});

test("drag back inward leaves the edge state", async ({ page }) => {
  await dragDividerToX(page, 0);
  await expect(page.locator("#divider")).toHaveClass(/edge/);
  const mid = await page.locator(".split").evaluate((el) => el.getBoundingClientRect().width / 2);
  await dragDividerToX(page, mid);
  await expect(page.locator("#divider")).not.toHaveClass(/edge/);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test test/e2e/split-view.spec.ts`
Expected: FAIL — `edge` class never applied (clamp still at 15–85).

- [ ] **Step 3: Update `render()` in `src/split-view.js`**

Replace the `render` function body with:

```javascript
  var SNAP = 6;
  function render(p) {
    p = Math.max(0, Math.min(100, p));
    if (p < SNAP) p = 0; else if (p > 100 - SNAP) p = 100;
    pct = p;
    left.style.flex = "0 0 " + p + "%";
    divider.classList.toggle("edge", p === 0 || p === 100);
  }
```

- [ ] **Step 4: Add the `.edge` red state to `src/layout.css`**

Append to the `.divider` rules:

```css
.divider.edge {
  background: var(--mdv-red);
  flex-basis: 8px;
  box-shadow: 0 0 0 1px var(--mdv-red), 0 0 14px rgba(204, 0, 0, 0.5);
}
```

- [ ] **Step 5: Add the `.edge` red state to `src/web-chrome.css`**

Append to the `.divider` rules:

```css
.divider.edge {
  background: var(--accent);
  flex-basis: 8px;
  box-shadow: 0 0 0 1px var(--accent), 0 0 14px color-mix(in srgb, var(--accent) 55%, transparent);
}
```

- [ ] **Step 6: Rebuild and run**

Run: `./build.sh && npx playwright test test/e2e/split-view.spec.ts`
Expected: PASS (both tests).

- [ ] **Step 7: Commit**

```bash
git add src/split-view.js src/layout.css src/web-chrome.css test/e2e/split-view.spec.ts viewer.html web/index.html
git commit -m "feat(split): edge-slider — full-range drag, snap, red collapsed edge"
```

---

## Task 3: Double-click resets to 50/50

**Files:**
- Modify: `src/split-view.js`
- Test: `test/e2e/split-view.spec.ts`

**Interfaces:**
- Consumes: `render(p)`.
- Produces: `dblclick` on `#divider` → `render(50)`.

- [ ] **Step 1: Write the failing e2e** — append to `split-view.spec.ts`

```typescript
test("double-click resets to ~50/50 and clears the edge", async ({ page }) => {
  await dragDividerToX(page, 0);
  await expect(page.locator("#divider")).toHaveClass(/edge/);
  await page.locator("#divider").dblclick();
  await expect(page.locator("#divider")).not.toHaveClass(/edge/);
  const ratio = await page.evaluate(() => {
    const split = document.querySelector(".split")!.getBoundingClientRect().width;
    const left = document.querySelector(".pane.left")!.getBoundingClientRect().width;
    return left / split;
  });
  expect(ratio).toBeGreaterThan(0.45);
  expect(ratio).toBeLessThan(0.55);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test test/e2e/split-view.spec.ts -g "double-click"`
Expected: FAIL — no dblclick handler.

- [ ] **Step 3: Add the handler in `src/split-view.js`** (after the `pointerup` listener)

```javascript
  divider.addEventListener("dblclick", function () { render(50); });
```

- [ ] **Step 4: Rebuild and run**

Run: `./build.sh && npx playwright test test/e2e/split-view.spec.ts -g "double-click"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/split-view.js viewer.html web/index.html
git commit -m "feat(split): double-click the divider resets to 50/50"
```

---

## Task 4: Divider keyboard a11y

**Files:**
- Modify: `src/body.html`, `src/web-body.html` (divider attrs), `src/split-view.js`
- Test: `test/e2e/split-view.spec.ts`

**Interfaces:**
- Consumes: `render(p)`, `pct`.
- Produces: `#divider` is a focusable `role="separator"` with live `aria-valuenow`; keys `ArrowLeft/Right` (±2%), `Home` (0), `End` (100), `Enter`/`Space` (50).

- [ ] **Step 1: Write the failing e2e** — append to `split-view.spec.ts`

```typescript
test("keyboard: End collapses, arrow restores, Enter resets", async ({ page }) => {
  const divider = page.locator("#divider");
  await divider.focus();
  await page.keyboard.press("End");
  await expect(divider).toHaveClass(/edge/);
  expect(await divider.getAttribute("aria-valuenow")).toBe("100");

  await page.keyboard.press("ArrowLeft");        // 100 → 98, off the edge
  await expect(divider).not.toHaveClass(/edge/);

  await page.keyboard.press("Enter");            // reset to 50
  expect(await divider.getAttribute("aria-valuenow")).toBe("50");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test test/e2e/split-view.spec.ts -g "keyboard"`
Expected: FAIL — divider not focusable / no `aria-valuenow`.

- [ ] **Step 3: Add a11y attributes to the divider in `src/body.html`**

Replace the divider line:

```html
<div class="divider" id="divider" role="separator" aria-orientation="vertical"
     aria-label="Resize panes" tabindex="0"
     aria-valuemin="0" aria-valuemax="100" aria-valuenow="50"
     title="Ziehen · Rand = voll · Doppelklick = 50/50"></div>
```

- [ ] **Step 4: Add the same attributes to the divider in `src/web-body.html`**

Replace the divider line inside `.split`:

```html
<div class="divider" id="divider" role="separator" aria-orientation="vertical"
     aria-label="Resize panes" tabindex="0"
     aria-valuemin="0" aria-valuemax="100" aria-valuenow="50"
     title="Drag · edge = full · double-click = 50/50"></div>
```

- [ ] **Step 5: Update `render()` to reflect `aria-valuenow`, and add key handling** in `src/split-view.js`

Add to the end of `render()` (before its closing brace):

```javascript
    divider.setAttribute("aria-valuenow", String(Math.round(p)));
```

Add after the `dblclick` listener:

```javascript
  divider.addEventListener("keydown", function (e) {
    var k = e.key;
    if (k === "ArrowLeft") render(pct - 2);
    else if (k === "ArrowRight") render(pct + 2);
    else if (k === "Home") render(0);
    else if (k === "End") render(100);
    else if (k === "Enter" || k === " ") render(50);
    else return;
    e.preventDefault();
  });
```

- [ ] **Step 6: Rebuild and run**

Run: `./build.sh && npx playwright test test/e2e/split-view.spec.ts -g "keyboard"`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/body.html src/web-body.html src/split-view.js viewer.html web/index.html
git commit -m "feat(split): keyboard-operable divider (role=separator, arrows/home/end/enter)"
```

---

## Task 5: Mobile tabs (< 640px)

**Files:**
- Modify: `src/body.html`, `src/web-body.html` (tablist), `src/layout.css`, `src/web-chrome.css`, `src/split-view.js`
- Test: `test/e2e/split-view.spec.ts`

**Interfaces:**
- Consumes: `split` element.
- Produces: a `.viewtabs` tablist toggling `show-rendered` / `show-raw` on `.split`; divider hidden < 640px, tabs hidden ≥ 640px.

- [ ] **Step 1: Write the failing e2e** — append to `split-view.spec.ts`

```typescript
test("mobile: divider hidden, tabs switch panes", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await expect(page.locator("#divider")).toBeHidden();
  const tabs = page.locator(".viewtabs");
  await expect(tabs).toBeVisible();

  // default = rendered visible, raw hidden
  await expect(page.locator(".pane.left")).toBeVisible();
  await expect(page.locator(".pane.right")).toBeHidden();

  await page.click('.viewtab[data-view="raw"]');
  await expect(page.locator(".pane.right")).toBeVisible();
  await expect(page.locator(".pane.left")).toBeHidden();
  expect(await page.getAttribute('.viewtab[data-view="raw"]', "aria-selected")).toBe("true");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test test/e2e/split-view.spec.ts -g "mobile"`
Expected: FAIL — `.viewtabs` does not exist.

- [ ] **Step 3: Add the tablist to `src/body.html`** (between `.bar` and `.split`)

```html
<div class="viewtabs" role="tablist" aria-label="Ansicht">
  <button class="viewtab" role="tab" data-view="rendered" aria-selected="true" tabindex="0" type="button">Rendered</button>
  <button class="viewtab" role="tab" data-view="raw" aria-selected="false" tabindex="-1" type="button">Raw</button>
</div>
```

- [ ] **Step 4: Add the tablist to `src/web-body.html`** (inside `<main class="stage">`, immediately before `<div class="split" id="split">`)

```html
<div class="viewtabs" role="tablist" aria-label="View">
  <button class="viewtab" role="tab" data-view="rendered" aria-selected="true" tabindex="0" type="button">Rendered</button>
  <button class="viewtab" role="tab" data-view="raw" aria-selected="false" tabindex="-1" type="button">Raw</button>
</div>
```

- [ ] **Step 5: Add shared tab CSS + mobile rules to `src/layout.css`**

```css
/* View tabs — desktop hidden, shown only on narrow viewports */
.viewtabs { display: none; }
.viewtab {
  flex: 1; font: inherit; font-size: 13px; font-weight: 600; padding: 10px 0;
  background: transparent; color: var(--bar-fg);
  border: 1px solid var(--border); border-right: none; cursor: pointer;
}
.viewtab:last-child { border-right: 1px solid var(--border); }
.viewtab[aria-selected="true"] { background: var(--bar-fg); color: var(--bg); }

@media (max-width: 640px) {
  .viewtabs { display: flex; }
  .divider { display: none; }
  .split { flex-direction: column; }
  .split .pane { display: none; }
  .split.show-rendered .pane.left { display: block; flex: 1 1 auto !important; }
  .split.show-raw .pane.right { display: block; flex: 1 1 auto !important; }
}
```

- [ ] **Step 6: Replace the mobile split block in `src/web-chrome.css`**

In the existing `@media (max-width: 640px)` block, **remove** the stacked-split rules (`.split { flex-direction: column }`, `.pane.left/right` flex, and the `.divider { … row-resize }` override) and **replace** with the tab rules. Add the shared `.viewtabs`/`.viewtab` base rules (display:none default) near the `.split` rules. Result inside the media query:

```css
  .viewtabs { display: flex; }
  .divider { display: none; }
  .split { flex-direction: column; }
  .split .pane { display: none; }
  .split.show-rendered .pane.left { display: block; flex: 1 1 auto !important; }
  .split.show-raw .pane.right { display: block; flex: 1 1 auto !important; }
```

And outside the media query, base:

```css
.viewtabs { display: none; }
.viewtab {
  flex: 1; font: inherit; font-family: var(--font-mono); font-size: 12px;
  letter-spacing: 0.03em; padding: 10px 0; background: transparent; color: var(--sfg);
  border: var(--bw) solid var(--line); border-right: none; cursor: pointer;
}
.viewtab:last-child { border-right: var(--bw) solid var(--line); }
.viewtab[aria-selected="true"] { background: var(--fg); color: var(--bg); }
```

- [ ] **Step 7: Wire tab switching in `src/split-view.js`** (after the `keydown` listener; then set the default)

```javascript
  var tabs = document.querySelectorAll(".viewtab");
  function showView(view) {
    split.classList.toggle("show-rendered", view === "rendered");
    split.classList.toggle("show-raw", view === "raw");
    for (var i = 0; i < tabs.length; i++) {
      var on = tabs[i].getAttribute("data-view") === view;
      tabs[i].setAttribute("aria-selected", on ? "true" : "false");
      tabs[i].setAttribute("tabindex", on ? "0" : "-1");
    }
  }
  for (var t = 0; t < tabs.length; t++) {
    tabs[t].addEventListener("click", function () { showView(this.getAttribute("data-view")); });
  }
  showView("rendered");   // default
```

- [ ] **Step 8: Rebuild and run the mobile test + full split suite**

Run: `./build.sh && npx playwright test test/e2e/split-view.spec.ts`
Expected: PASS (all, incl. mobile).

- [ ] **Step 9: Commit**

```bash
git add src/body.html src/web-body.html src/layout.css src/web-chrome.css src/split-view.js viewer.html web/index.html
git commit -m "feat(split): mobile [Rendered|Raw] tabs replace the stacked split under 640px"
```

---

## Task 6: Web-app toolbar icons + "Readme" relabel

**Files:**
- Modify: `src/web-body.html`, `src/web-chrome.css`
- Test: `test/e2e/controls.spec.ts`

**Interfaces:**
- Consumes: existing button ids (`#open`, `#readme`, `#howto`, `#mode`, `#themeMenuBtn`) — unchanged.
- Produces: each button carries an inline `<svg>`; `#readme` label is "Readme".

- [ ] **Step 1: Write the failing e2e** — append to `controls.spec.ts`

```typescript
test("toolbar buttons each render a non-empty icon", async ({ page }) => {
  for (const sel of ["#open", "#readme", "#howto", "#mode", "#themeMenuBtn"]) {
    const svg = page.locator(`${sel} svg`).first();
    await expect(svg, `${sel} should contain an svg`).toHaveCount(1);
    const box = await svg.boundingBox();
    expect(box && box.width > 0 && box.height > 0, `${sel} icon should be visible`).toBeTruthy();
  }
  await expect(page.locator("#readme")).toContainText("Readme");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test test/e2e/controls.spec.ts -g "icon"`
Expected: FAIL — buttons have no `<svg>`.

- [ ] **Step 3: Update the toolbar buttons in `src/web-body.html`**

Replace the `#open`, `#readme`, `#howto` buttons (keep ids/handlers), add icons + relabel:

```html
<button class="btn" id="open" type="button" title="Open .md">
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/></svg>Open
</button>
<input type="file" id="file" accept=".md,.markdown,.mdown,.mkd,.mdx,text/markdown" hidden>
<button class="btn" id="readme" type="button" title="Readme">
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.4 1 5.5v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 19.9 5.05 19.5 6.5 19.5c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V5.5c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"/></svg>Readme
</button>
<a class="btn" id="howto" href="/how-it-works" title="How it works">
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75-.9.92c-.72.73-1.17 1.33-1.17 2.83h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>How it works
</a>
```

Add a `dark_mode` moon into the `#mode` button (before its `.mode-icon`/label spans — replace the emoji icon span content) so it reads as an SVG:

```html
<button class="btn mode" id="mode" type="button" title="Toggle light/dark" aria-label="Toggle light/dark">
  <svg class="moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/></svg><span class="mode-label"></span>
</button>
```

Replace the theme dropdown caret glyph with an SVG in `#themeMenuBtn`:

```html
<span class="theme-current">Swiss Grid</span><svg class="caret" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8.5l7 8 7-8z"/></svg>
```

> **Note:** `web-app.js` sets the mode icon/label text at runtime (light/dark). Check `updateModeButton`/`applyMode` in `web-app.js`: if it writes into `.mode-icon` with an emoji, repoint it to leave the SVG in place (swap the moon for a `light_mode` sun path via `innerHTML` of the `.moon` svg, or toggle a class). Keep the existing behaviour of reflecting the current mode; only the glyph source changes from emoji to inline SVG.

- [ ] **Step 4: Add icon sizing to `src/web-chrome.css`**

Replace the `.theme-menu-btn .caret { font-size: 10px; … }` rule and add:

```css
.btn svg { width: 15px; height: 15px; fill: currentColor; display: block; }
.btn svg.moon { width: 14px; height: 14px; }
.btn svg.caret { width: 20px; height: 20px; opacity: 0.75; margin-left: -2px; }
```

- [ ] **Step 5: Rebuild and run controls + the full suite**

Run: `./build.sh && npx playwright test`
Expected: PASS — icons render; the existing `readme / changelog content swap` still passes (id `#readme` intact); light/dark + theme dropdown still pass.

- [ ] **Step 6: Commit**

```bash
git add src/web-body.html src/web-chrome.css viewer.html web/index.html
git commit -m "feat(nav): flat Material inline-SVG toolbar icons + Readme relabel"
```

---

## Task 7: Finder structural smoke + final full-suite gate

**Files:**
- Modify: `test/web-smoke.sh`

- [ ] **Step 1: Add Finder structural checks** to `test/web-smoke.sh`

```bash
grep -q 'class="viewtabs"' viewer.html      || { echo "FAIL: viewtabs missing in viewer.html"; exit 1; }
grep -q 'role="separator"' viewer.html      || { echo "FAIL: divider a11y missing in viewer.html"; exit 1; }
grep -q 'class="viewtabs"' web/index.html   || { echo "FAIL: viewtabs missing in web/index.html"; exit 1; }
grep -q '>Readme<' web/index.html           || { echo "FAIL: Readme label missing in web/index.html"; exit 1; }
```

- [ ] **Step 2: Run the whole gate**

Run: `./build.sh && bash test/smoke.sh && bash test/web-smoke.sh && npx playwright test && node --test test/*.test.mjs`
Expected: all PASS.

- [ ] **Step 3: Commit**

```bash
git add test/web-smoke.sh
git commit -m "test(smoke): structural gates for viewtabs, divider a11y, Readme label"
```

- [ ] **Step 4: Owner visual review (manual — not self-signed)**

Serve and review both outputs on desktop + a 375px viewport, both themes: edge-slider collapse + red edge + double-click; mobile tab switch; icon scale. Record the owner's verdict; keep the review open in the priority list until the owner says "passt".

---

## Self-Review

**Spec coverage:**
- Desktop edge-slider (drag full range, snap, red edge, drag-back) → Task 2. ✓
- Double-click 50/50 → Task 3. ✓
- Keyboard a11y (role=separator, arrows/home/end/enter, valuenow) → Task 4. ✓
- Mobile tabs (hide divider, `[Rendered|Raw]`, default Rendered, aria) → Task 5. ✓
- Toolbar icons (folder/menu_book/help/arrow_drop_down/dark_mode, currentColor, offline) + Readme relabel → Task 6. ✓
- Both targets, shared logic via build partial → Task 1. ✓
- No persistence → enforced by design (no localStorage writes anywhere). ✓
- 640px breakpoint → Tasks 5. ✓
- Testing (e2e + smoke) → Tasks 2–7. ✓
- Footer unchanged → no task touches the footer. ✓

**Placeholder scan:** No "TBD"/"handle edge cases"/"similar to". The one runtime nuance (mode-button glyph swap in `web-app.js`) is flagged as an explicit Step-3 check with a concrete instruction, not a placeholder.

**Type/name consistency:** `render(p)`, `pct`, `showView(view)`, classes `edge`/`show-rendered`/`show-raw`/`viewtabs`/`viewtab`, ids `#divider`/`#readme` used consistently across Tasks 1–7.
