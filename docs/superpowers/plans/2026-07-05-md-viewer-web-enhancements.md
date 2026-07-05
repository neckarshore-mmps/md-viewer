# md-viewer Web Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 3-theme design system (Minimalist, Swiss Grid, Brutalist) with a light/dark toggle to the md-viewer **web app**, load the repo README by default, add a fixed footer, and make the viewer responsive on mobile.

**Architecture:** All styling flows through CSS custom properties (design tokens). `[data-theme]` on `<html>` selects one of three token sets; `[data-mode]` selects light/dark within each. The rendered pane and the raw-pane syntax highlighting are both driven by the same tokens, so "Minimalist = grayscale" falls out naturally from monochrome token values. Web app only — the Finder tool (`viewer.html`) is untouched and keeps its GitHub styling.

**Tech Stack:** Static HTML/CSS/JS assembled by `build.sh`; `marked` + `DOMPurify` + `highlight.js` (already vendored); self-hosted woff2 fonts (IBM Plex Sans/Mono, Bebas Neue, Space Mono); deployed to Vercel (`md-viewer`, root dir `web`).

## Global Constraints

- Web app only. Do NOT modify `viewer.html`, `src/body.html`, `src/app.js`, `src/layout.css`, or the Finder Quick Action. `test/smoke.sh` (Finder) must stay green.
- Self-contained & offline: no external network requests at runtime. Fonts are self-hosted under `web/fonts/`, referenced by relative URL.
- No npm / no build framework. `build.sh` stays pure Bash; `web/index.html` is a generated, committed artifact.
- Default theme = **Swiss Grid**. Light/dark toggle: initial = system (`prefers-color-scheme`), choice persisted in `localStorage`, no FOUC.
- Themes are **extensible**: adding a theme = one token block + one nav swatch, nothing else.
- Rendered HTML stays DOMPurify-sanitized; raw pane still shows source verbatim.
- Branch `feat/web-enhancements`. Ship as PR(s) merged to `main` (auto-deploy to prod). Founder has authorized self-merge.

## Token Vocabulary

Every theme×mode defines exactly these; all other CSS references them:

| Token | Meaning |
|-------|---------|
| `--bg` / `--fg` | page background / main text (rendered pane) |
| `--surface` / `--sfg` | panel background / text on panel (nav, footer, raw pane) |
| `--muted` | secondary text (labels, comments) |
| `--line` | hairline / border color |
| `--accent` | primary accent (links, headings-in-source, bullets) |
| `--punch` | secondary accent (links-in-source, inline code) |
| `--font-sans` / `--font-mono` / `--font-display` | body / monospace / heading font stacks |
| `--bw` | base border width (nav bottom, footer top, divider) |

Theme token values:

| Token | Minimalist L | Minimalist D | Swiss L | Swiss D | Brutalist L | Brutalist D |
|-------|-----|-----|-----|-----|-----|-----|
| `--bg` | `#ffffff` | `#0d0d0d` | `#ffffff` | `#080808` | `#f5f0e8` | `#0d0d0d` |
| `--fg` | `#1a1a1a` | `#e8e8e8` | `#141414` | `#f0f0f0` | `#0c0c0b` | `#d4cfc3` |
| `--surface` | `#f5f5f5` | `#1a1a1a` | `#f2f2f2` | `#141414` | `#0c0c0b` | `#141414` |
| `--sfg` | `#1a1a1a` | `#e8e8e8` | `#141414` | `#f0f0f0` | `#f5f0e8` | `#d4cfc3` |
| `--muted` | `#8a8a8a` | `#777777` | `#909090` | `#606060` | `#8a8577` | `#7d7869` |
| `--line` | `#e2e2e2` | `#2c2c2c` | `rgba(0,0,0,.12)` | `rgba(240,240,240,.10)` | `#0c0c0b` | `#d4cfc3` |
| `--accent` | `#4a4a4a` | `#b0b0b0` | `#cc0000` | `#ff2800` | `#e8240a` | `#ff2d00` |
| `--punch` | `#6a6a6a` | `#9a9a9a` | `#141414` | `#f0f0f0` | `#c9a800` | `#00ff87` |
| `--bw` | `1px` | `1px` | `1px` | `1px` | `3px` | `3px` |

Fonts: Minimalist → system (`-apple-system,...` / `ui-monospace`), display = sans. Swiss → sans `'IBM Plex Sans'`, mono `'IBM Plex Mono'`, display = sans. Brutalist → sans/body `'Space Mono'`, mono `'Space Mono'`, display `'Bebas Neue'`.

## File Structure

- Create `web/fonts/*.woff2` — vendored fonts (8 files).
- Create `src/web-fonts.css` — `@font-face` blocks (relative `./fonts/…` URLs).
- Create `src/web-themes.css` — token blocks per `[data-theme][data-mode]` + font tokens + `--bw`.
- Create `src/web-chrome.css` — structural layout for the web app driven by tokens: nav, controls, theme switcher, split, panes, divider, footer, drop overlay, mobile media query. (Replaces `layout.css`+`web-layout.css` for the web build.)
- Create `src/web-md.css` — token-driven markdown rendering (rendered pane) + hljs token classes (raw pane). (Replaces `github-markdown.css`+hljs themes for the web build.)
- Create `src/web-head.html` — inline no-FOUC theme-init script.
- Modify `src/web-body.html` — new nav (filename, Open, readme.md, theme swatches, mode toggle), split, footer; remove centered empty-state.
- Modify `src/web-app.js` — theme/mode logic, README default + button, mobile-aware divider; keep open-dialog/paste/drop.
- Modify `build.sh` — web path: new CSS set, head-extra, README base64 embed; Finder path unchanged.
- Modify `docs/vendor-sources.md`, `README.md`.
- Create `test/web-smoke.sh` — asserts web build wiring (tokens, README embed, fonts referenced, no leftover placeholders).

**Verification model:** CSS/JS can't unit-TDD cleanly. Each task's "test" is a Playwright assertion over a locally served `web/index.html` (computed styles, DOM state) plus the shell smoke test. Serve with `python3 -m http.server` from `web/`.

---

### Task 1: Vendor fonts + @font-face

**Files:**
- Create: `web/fonts/{ibm-plex-sans-400,ibm-plex-sans-500,ibm-plex-sans-700,ibm-plex-mono-400,ibm-plex-mono-700,bebas-neue-400,space-mono-400,space-mono-700}.woff2`
- Create: `src/web-fonts.css`
- Modify: `docs/vendor-sources.md`

**Interfaces:**
- Produces: font-family names `'IBM Plex Sans'`, `'IBM Plex Mono'`, `'Bebas Neue'`, `'Space Mono'` available to later CSS.

- [ ] **Step 1: Download the 8 woff2 files** from jsDelivr `@fontsource/*@5/files/*-latin-<weight>-normal.woff2` into `web/fonts/` (see command in exec notes). Verify each is >5 KB.
- [ ] **Step 2: Write `src/web-fonts.css`** with 8 `@font-face` blocks using `font-display: swap` and relative `url('./fonts/<file>.woff2')`; group weights under the right family; Bebas Neue is weight 400 only.
- [ ] **Step 3: Record versions** in `docs/vendor-sources.md` (resolved fontsource versions + URLs).
- [ ] **Step 4: Commit** `feat(web): vendor theme fonts (IBM Plex, Bebas Neue, Space Mono)`.

### Task 2: Theme tokens + no-FOUC init + build wiring

**Files:**
- Create: `src/web-themes.css`, `src/web-head.html`
- Modify: `build.sh`

**Interfaces:**
- Consumes: font families from Task 1.
- Produces: `[data-theme]`/`[data-mode]` token contract (the Token Vocabulary table); global `window.__mdvSetTheme`/`__mdvSetMode` are added in Task 5 — here only the init sets attributes.

- [ ] **Step 1:** Write `src/web-themes.css` — six `:root[data-theme=…][data-mode=…]` blocks with the exact token values from the table above, plus `--font-*` per theme.
- [ ] **Step 2:** Write `src/web-head.html` — inline script: read `localStorage['mdv-theme']` (default `swiss`) and `localStorage['mdv-mode']` (fallback `matchMedia('(prefers-color-scheme: dark)')`), set `documentElement.dataset.theme/mode` before paint.
- [ ] **Step 3:** Refactor `build.sh` `emit_html` to take a `head_extra` arg and a CSS-list arg; keep the Finder call identical (github+hljs+layout+web-layout→ actually Finder uses layout+github+hljs; unchanged), point the web call at `web-fonts.css web-themes.css web-chrome.css web-md.css` and `head_extra=src/web-head.html`.
- [ ] **Step 4:** Build; assert `web/index.html` contains all six token blocks and the init script, and Finder `viewer.html` byte-identical to before (diff).
- [ ] **Step 5:** Commit `feat(web): theme token system + no-FOUC init`.

### Task 3: Chrome + markdown styling (token-driven)

**Files:**
- Create: `src/web-chrome.css`, `src/web-md.css`
- Modify: `src/web-body.html`

**Interfaces:**
- Consumes: token contract (Task 2).
- Produces: DOM ids/classes: `nav.bar`, `#filename`, `.controls`, `#open`, `#readme` (renamed), `.theme-switcher` with `.tsw[data-theme]`, `#mode`, `.split`, `.pane.left #rendered.rendered`, `.divider`, `.pane.right #rawcode`, `footer.foot`, `#dropOverlay`.

- [ ] **Step 1:** Write `src/web-body.html` — nav with filename, controls (`#open`, `#readme`), right group (`.theme-switcher` three `<button class="tsw" data-theme>`, `#mode` toggle), `.split` (rendered left, divider, raw right), `footer.foot` one-liner, drop overlay. Remove `#empty`.
- [ ] **Step 2:** Write `src/web-chrome.css` — flex column: `body{height:100vh;display:flex;flex-direction:column;font-family:var(--font-sans);background:var(--bg);color:var(--fg)}`; nav & footer `background:var(--surface);color:var(--sfg);border via --bw --line`; `.split{flex:1;display:flex;min-height:0}`; panes overflow auto; `.pane.right{background:var(--surface);color:var(--sfg)}`; divider `var(--line)`; theme swatches; mode button; drop overlay. (Mobile media query added in Task 6.)
- [ ] **Step 3:** Write `src/web-md.css` — `.rendered` markdown elements (h1–h6 `var(--font-display)`, links `var(--accent)`, code blocks `background:var(--surface);color:var(--sfg)`, tables/blockquote/hr via `--line`/`--muted`) + hljs token classes (`.hljs-section/-bullet` `var(--accent)`, `.hljs-strong` weight+`var(--sfg)`, `.hljs-link/-code` `var(--punch)`, `.hljs-comment/-quote` `var(--muted)`), base `#rawcode` `color:var(--sfg);font-family:var(--font-mono)`.
- [ ] **Step 4:** Build, serve, Playwright: for each theme×mode set `documentElement.dataset`, assert computed `background-color` of body equals the token and nav/raw pane readable; assert `#rendered h1` uses expected font-family; Minimalist dark/light show no saturated colors (accent is gray).
- [ ] **Step 5:** Commit `feat(web): token-driven chrome + markdown/highlight styling`.

### Task 4: README as default view + "readme.md" button

**Files:**
- Modify: `src/web-app.js`, `build.sh`

**Interfaces:**
- Consumes: `render(md, name)` (existing), `#readme` button (Task 3).
- Produces: `__README_B64__` placeholder resolved at build; default render on load.

- [ ] **Step 1:** In `build.sh` web path, compute `README_B64=$(base64 < README.md | tr -d '\n')` and `awk`-inject into `web/index.html` replacing `__README_B64__` (base64 → safe).
- [ ] **Step 2:** In `src/web-app.js`, add `var README_B64="__README_B64__";` decode via existing `b64ToUtf8`; on load (no file) call `render(readme, "README.md")` instead of showing empty state; wire `#readme` button to the same. Remove `SAMPLE_MD`.
- [ ] **Step 3:** Build, serve, Playwright: on load `#rendered h1` non-empty and `document.title` starts `README.md`; click `#readme` re-renders README.
- [ ] **Step 4:** Commit `feat(web): render repo README by default; Sample→readme.md`.

### Task 5: Theme switcher + light/dark toggle interactions

**Files:**
- Modify: `src/web-app.js`

**Interfaces:**
- Consumes: `.tsw[data-theme]`, `#mode` (Task 3); init attributes (Task 2).
- Produces: click handlers persisting to `localStorage`; `.tsw.active` reflects current theme; `#mode` label reflects mode.

- [ ] **Step 1:** Add `applyTheme(t)`/`applyMode(m)` that set `documentElement.dataset`, write `localStorage`, update `.tsw.active` and `#mode` label; call once on init to sync UI to the pre-painted attributes.
- [ ] **Step 2:** Wire each `.tsw` click → `applyTheme(data-theme)`; `#mode` click → toggle light/dark.
- [ ] **Step 3:** Build, serve, Playwright: click Brutalist swatch → `dataset.theme==='brutalist'` and body bg = brutalist token and `localStorage['mdv-theme']==='brutalist'`; reload → persists; click `#mode` → toggles and persists.
- [ ] **Step 4:** Commit `feat(web): theme switcher + light/dark toggle with persistence`.

### Task 6: Fixed footer + mobile responsive

**Files:**
- Modify: `src/web-chrome.css`, `src/web-app.js`

**Interfaces:**
- Consumes: `footer.foot`, `.split`, `.divider`, `.pane` (Task 3).
- Produces: `matchMedia('(max-width:640px)')`-aware divider drag (vertical on desktop, horizontal on mobile).

- [ ] **Step 1:** Footer CSS — flex column layout already keeps `footer.foot` pinned to viewport bottom (panes scroll internally); style height = nav height, one line, `overflow:hidden;text-overflow:ellipsis;white-space:nowrap`, `var(--font-mono)` small uppercase-ish, `var(--muted)`.
- [ ] **Step 2:** Mobile media query in `web-chrome.css` (`max-width:640px`): `.split{flex-direction:column}`, panes `flex:1 1 50%`, `.divider{width:100%;height:var(--bw* / 6px);cursor:row-resize}`, nav `flex-wrap:wrap`, footer smaller font.
- [ ] **Step 3:** In `web-app.js` divider drag: branch on `matchMedia('(max-width:640px)').matches` → adjust `left.style.flexBasis`/height by `clientY` else by `clientX`.
- [ ] **Step 4:** Build, serve, Playwright at 390×800: assert `.split` computed `flex-direction: column`, footer visible at bottom, both panes stacked; at 1200 wide assert `row`.
- [ ] **Step 5:** Commit `feat(web): fixed footer + responsive mobile stacking`.

### Task 7: Smoke test, docs, final matrix verification, PR

**Files:**
- Create: `test/web-smoke.sh`
- Modify: `README.md`

- [ ] **Step 1:** Write `test/web-smoke.sh` — build both outputs; assert `web/index.html`: 6 token blocks, README payload embedded (base64 prefix of `README.md` present), all 8 font files referenced, no `__README_B64__`/`__MD_*` leftovers, `data-theme` init present; assert Finder `test/smoke.sh` still passes.
- [ ] **Step 2:** Update `README.md` web-app section: three themes, light/dark toggle, README default, mobile.
- [ ] **Step 3:** Run `test/smoke.sh` + `test/web-smoke.sh`; run the full Playwright matrix (3 themes × 2 modes + mobile) once more; confirm XSS still stripped in rendered pane.
- [ ] **Step 4:** Commit; push branch; open PR; self-merge to `main`; verify prod (`md.neckarshore.ai`) serves the new version.

## Self-Review

- **Spec coverage:** #1 open-dialog already shipped; #2 README default+button → Task 4; #3 fixed footer → Task 6; #4 mobile → Task 6; #5 theme system (Minimalist/Swiss/Brutalist + toggle + fonts, web-only) → Tasks 1–3,5. Covered.
- **Placeholders:** token values, file list, DOM contract all concrete. Font exact versions resolved during Task 1 Step 3.
- **Type/name consistency:** ids/classes fixed in Task 3 Interfaces and reused verbatim in Tasks 4–6 (`#open`, `#readme`, `.tsw`, `#mode`, `#rendered.rendered`, `#rawcode`, `footer.foot`). `render(md,name)`/`b64ToUtf8` reused from existing `web-app.js`.
