# md-viewer Web Enhancements 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Second round of web-app enhancements — a typeahead theme dropdown, louder theme-scoped chrome (Brutalist + Swiss Grid) with a Swiss left grid rail, larger raw-source font, and proportional scroll sync. Then run Lighthouse (informational).

**Architecture:** Continue the token-driven system. New chrome is theme-scoped via `:root[data-theme="x"]` overrides on shared nav/footer + a decorative left rail element hidden outside Swiss. The swatch trio is replaced by a custom accessible combobox with keyboard typeahead.

**Tech Stack:** Static HTML/CSS/JS via `build.sh`; existing vendored libs + self-hosted fonts. Web app only; Finder tool untouched.

## Global Constraints

- Web app only. Do NOT modify `viewer.html`, `src/body.html`, `src/app.js`, `src/layout.css`, or the Quick Action. Finder `test/smoke.sh` stays green and `viewer.html` byte-identical.
- Keep token-driven: no per-theme hardcoded colors outside `web-themes.css`; chrome overrides reference tokens (`--accent`, `--punch`, `--sfg`, `--font-display`).
- No new runtime deps; stay offline-capable. No FOUC regressions.
- Branch `feat/web-enhancements-2` → PR → self-merge to `main` (founder authorized) → prod.
- Lighthouse is informational only this round — run and report, do cheap wins, do NOT gate completion on scores.
- Verification = Playwright over locally served `web/index.html` (force repaint via `browser_resize` before screenshots; `getComputedStyle` is authoritative).

## File Structure

- Modify `src/web-body.html` — replace `.theme-switcher` swatches with a combobox (`#themeMenu`); add decorative left rail `<aside class="grid-rail">`; wrap main area in `.stage` (rail + split).
- Create `src/web-chrome-themes.css` — theme-scoped chrome: Brutalist loud header/footer, Swiss loud header/footer + grid rail; combobox styles live in `web-chrome.css`.
- Modify `src/web-chrome.css` — combobox styles; `.stage` flex row; rail base (hidden by default); raw-font handled in web-md.css.
- Modify `src/web-md.css` — raw `#rawcode` font-size 12.5px → 14px.
- Modify `src/web-app.js` — combobox open/close/typeahead/selection (replaces swatch clicks); proportional scroll sync between panes.
- Modify `build.sh` — add `web-chrome-themes.css` to the web CSS chain.
- Modify `README.md`; create/extend `test/web-smoke.sh` assertions.

---

### Task 1: Theme dropdown with keyboard typeahead

**Files:** Modify `src/web-body.html`, `src/web-chrome.css`, `src/web-app.js`.

**Interfaces:**
- Produces: `#themeMenu` (button `#themeMenuBtn` with `.theme-current` label + caret; `ul#themeMenuList` with `li.theme-opt[data-theme]` for minimalist/swiss/brutalist). `applyTheme(t)` (existing) updates the button label + `aria-selected`.

- [ ] **Step 1:** In `web-body.html` replace the `.theme-switcher` swatch block with a combobox: a `<button id="themeMenuBtn" aria-haspopup="listbox" aria-expanded="false">` showing the current theme name + caret, and a `<ul id="themeMenuList" role="listbox" hidden>` with three `<li class="theme-opt" role="option" data-theme="…">` (Minimalist / Swiss Grid / Brutalist).
- [ ] **Step 2:** In `web-chrome.css` style the combobox (button like `.btn`; dropdown panel absolute under it, `background:var(--surface);color:var(--sfg);border:var(--bw) solid var(--line)`; options padded, hover/`.active` use `var(--accent)`; `role=listbox` hidden state).
- [ ] **Step 3:** In `web-app.js` remove swatch wiring; add combobox: toggle open on button click (`aria-expanded`, list `hidden`), select on option click → `applyTheme` + close, close on outside-click/Escape. Keyboard typeahead: while open, letter keys jump to the first option whose name starts with the typed prefix (reset prefix after 700ms via a counter, not a timer — accumulate on keydown and clear when a non-matching key arrives). `applyTheme` updates `#themeMenuBtn .theme-current` text + `li.active`.
- [ ] **Step 4:** Build, serve, Playwright: open menu → 3 options; click Brutalist → theme applies + label reads "Brutalist" + persisted; press "s" while open → Swiss Grid option focused/selectable; Escape closes.
- [ ] **Step 5:** Commit `feat(web): typeahead theme dropdown (replaces swatches)`.

### Task 2: Larger raw-source font + proportional scroll sync

**Files:** Modify `src/web-md.css`, `src/web-app.js`.

**Interfaces:** Consumes `.pane.left`, `.pane.right` (scroll containers).

- [ ] **Step 1:** In `web-md.css` set `#rawcode` `font-size: 14px` (from 12.5px); keep line-height 1.6. (Rendered body is 15px; 14px mono reads about equal.)
- [ ] **Step 2:** In `web-app.js` add proportional scroll sync: on `scroll` of the left pane, set right `scrollTop = ratio * (right.scrollHeight - right.clientHeight)` and vice-versa, where `ratio = src.scrollTop / (src.scrollHeight - src.clientHeight)`. Guard re-entrancy with a `syncing` flag reset on next frame (`requestAnimationFrame`). Attach to `.pane.left` and `.pane.right`.
- [ ] **Step 3:** Build, serve, Playwright: set left pane `scrollTop` to 50% → right pane ratio within ±0.05 of 0.5; scroll right → left follows.
- [ ] **Step 4:** Commit `feat(web): larger source font + proportional scroll sync`.

### Task 3: Brutalist loud header + footer

**Files:** Create `src/web-chrome-themes.css`; modify `build.sh`.

**Interfaces:** Consumes tokens + nav/footer structure. Theme-scoped under `:root[data-theme="brutalist"]`.

- [ ] **Step 1:** Wire `web-chrome-themes.css` into `build.sh` web CSS chain (after `web-chrome.css`, before `web-md.css`).
- [ ] **Step 2:** Brutalist chrome in `web-chrome-themes.css`: taller nav (`--bar-h: 64px` scoped), `#filename` in `var(--font-display)` (Bebas) larger + uppercase + `letter-spacing`, thick `border-bottom: 5px solid var(--accent)`; a punch accent — e.g. `.bar` gets an inset top strip or `#filename` prefixed with a `var(--punch)` block via `::before`; footer: `border-top:5px solid var(--accent)`, label in Bebas, `color:var(--punch)`. Keep buttons legible (`color:var(--sfg)`).
- [ ] **Step 3:** Build, serve, Playwright: `data-theme=brutalist` → nav computed height ≥ 60px, `#filename` font-family contains "Bebas Neue", nav border-bottom width ≥ 4px; footer border-top ≥ 4px.
- [ ] **Step 4:** Screenshot (resize first) light + dark; visually confirm louder.
- [ ] **Step 5:** Commit `feat(web): louder Brutalist header + footer`.

### Task 4: Swiss Grid loud chrome + decorative left grid rail

**Files:** Modify `src/web-body.html`, `src/web-chrome.css`, `src/web-chrome-themes.css`.

**Interfaces:** Produces `.stage` (flex row wrapping rail + split) and `<aside class="grid-rail">` with vertical `.rail-num` markers.

- [ ] **Step 1:** In `web-body.html` wrap `.split` in `<div class="stage">` and add `<aside class="grid-rail" aria-hidden="true"><span class="rail-num">001</span>…<span class="rail-num">04</span></aside>` before `.split`.
- [ ] **Step 2:** In `web-chrome.css`: `.stage{flex:1;display:flex;min-height:0}`; `.split{flex:1}`; `.grid-rail{display:none}` (base — hidden for all themes); on mobile `.grid-rail{display:none!important}`.
- [ ] **Step 3:** In `web-chrome-themes.css` Swiss block: `:root[data-theme="swiss"] .grid-rail{display:flex;flex-direction:column;justify-content:space-between;flex:0 0 46px;border-right:1px solid var(--line);padding:14px 0}`; `.rail-num{writing-mode:vertical-rl;transform:rotate(180deg);font-family:var(--font-mono);font-size:0.62rem;letter-spacing:0.1em;color:var(--muted);text-align:center}`; first `.rail-num` colored `var(--accent)`. Swiss nav: `#filename` bolder/larger, a `GRID` mono tag + `001` marker via `.bar::before`/a span, thin `border-bottom:1px solid var(--line)`, red accent underline on hover; footer mono uppercase markers.
- [ ] **Step 4:** Build, serve, Playwright: `data-theme=swiss` → `.grid-rail` computed display `flex` and width ~46px; other themes → `.grid-rail` display `none`; mobile (≤640) → `none`. Rendered content not overlapped (left pane starts right of rail).
- [ ] **Step 5:** Screenshot swiss light + dark (resize first); confirm rail + louder chrome.
- [ ] **Step 6:** Commit `feat(web): Swiss Grid loud chrome + decorative left grid rail`.

### Task 5: Lighthouse (informational), smoke, docs, matrix, PR + merge

**Files:** Modify `README.md`, `test/web-smoke.sh`.

- [ ] **Step 1:** Extend `test/web-smoke.sh`: assert combobox present (`themeMenuList`), `web-chrome-themes.css` inlined, grid-rail markup present, raw font 14px; keep prior assertions; Finder smoke still green.
- [ ] **Step 2:** Update `README.md` web section (dropdown, louder themes, grid rail, scroll sync, larger source font).
- [ ] **Step 3:** Full Playwright matrix (3 themes × 2 modes + mobile) once more; XSS still stripped; scroll sync + dropdown work.
- [ ] **Step 4:** Commit; push; open PR; self-merge to `main`; verify prod serves new markers.
- [ ] **Step 5:** Run Lighthouse against `https://md.neckarshore.ai` (`npx --yes lighthouse <url> --only-categories=performance,accessibility,best-practices,seo --output=json --quiet --chrome-flags="--headless"`); report the four scores; apply only cheap, safe wins (e.g. `<html lang>`, meta description, image dims) if any — informational, not a gate.

## Self-Review

- Coverage: #6 dropdown → Task 1; #8 raw font → Task 2 Step 1; #9 scroll sync → Task 2 Step 2; #7 Brutalist → Task 3; #10 Swiss chrome + #11 rail → Task 4; Lighthouse → Task 5.
- Names consistent: `#themeMenuBtn`/`#themeMenuList`/`.theme-opt`, `.stage`/`.grid-rail`/`.rail-num`, `applyTheme` reused. Grid rail hidden by default, shown only for swiss and never on mobile — no layout regression for minimalist/brutalist.
- No placeholders; token-driven; Finder untouched.
