# md-viewer — Backlog

**Since 2026-11-07 the backlog is the issues** ([ITSM.md](ITSM.md)). Open work lives there; this file keeps
the pointer, the decisions not to build, and the history. Scope: personal power-tool
(with light personal-branding / "building in public" intent) — **not** a product.

## Moved to issues (2026-11-07)

Each open row of this file became one issue in `in-specification`, its text carried word for word.

| # | Row | Issue |
|---|-----|-------|
| 1 | Obsidian / GFM feature coverage | [#42](https://github.com/neckarshore-mmps/md-viewer/issues/42) |
| 2 | Copy button on code blocks | [#43](https://github.com/neckarshore-mmps/md-viewer/issues/43) |
| 3 | Remember last file | [#44](https://github.com/neckarshore-mmps/md-viewer/issues/44) |
| 4 | Print / PDF export | [#45](https://github.com/neckarshore-mmps/md-viewer/issues/45) |
| 5 | Real line-number gutter in the source pane | [#46](https://github.com/neckarshore-mmps/md-viewer/issues/46) |
| 6 | `og:image` for shared-link preview | [#47](https://github.com/neckarshore-mmps/md-viewer/issues/47) |
| 7 | Minify own JS / reduce the ~220 KB inline blob | [#48](https://github.com/neckarshore-mmps/md-viewer/issues/48) |

## Decided against

| # | Item | Notes |
|---|------|-------|
| 8 | ~~Defer hljs highlighting of the default README~~ | **Won't-do** (owner, 2026-07-10). Measured on the ground: highlighting the 5 KB README costs a **median 2.1 ms** on the main thread — far below the 50 ms long-task threshold, on a page already at Lighthouse 100. Deferring 2 ms buys nothing measurable and adds code + test churn. |
| — | ~~Divider-position persistence~~ | **Won't-do** — owner, 2026-07-10, struck during the split-layout design (was part of row 3). |

## Done

- **Static pre-render of the README** (PR #23) — the rendered README is baked into
  `#rendered` at build time via jsdom running the vendored `marked` + `DOMPurify`
  (no browser), so non-JS crawlers / AI fetchers see the intro prose (was 0 `<h1>`
  in the served HTML). Deterministic; guarded by the freshness gate + a web-smoke
  assertion. Finder tool out of scope. Prod-verified no-JS. *AI-citability / non-JS SEO.*
- **Mobile / collapsible split layout** (PR #20) — mobile `[Rendered | Raw]` tabs
  replace the stacked split under 640 px; desktop gets a full-range edge-slider divider
  with keyboard a11y (`role=separator`, arrows/home/end/enter), double-click reset, and
  a red edge-collapse handle. Shared `src/split-view.js` for both build targets.
  Right-edge collapse bug (divider pushed off-screen, un-restorable) fixed in PR #21.
  Divider-position persistence struck (won't-do).
- **Browser e2e in CI — Playwright + security** (PR #19) — real-browser click-through
  of every nav/footer control asserting the observable effect, plus the runtime XSS
  proof shell grep can't give (the `window.__pwned` probe: no script runs, no handler
  fires, no `javascript:`/`data:text/html` navigation). Malicious-input corpus later
  expanded to 20+ bypass vectors with hardened assertions (PR #22). *Christian's
  interpreter-is-an-attack-surface point.*
- **Relative images & links in the Finder tool** (v0.4.0, PR #17) — `mdview` passes
  the source file's directory into the viewer; relative `<img>`/`<a>` URLs are
  rewritten to `file://` absolute after DOMPurify. Schemes / protocol-relative /
  in-page anchors untouched. Unit-tested (`test/url-resolve.test.mjs`, 15 cases).
  Web app unchanged (no source dir). *Reported by Christian.*
- CI gate on PRs (`.github/workflows/ci.yml`) — build-freshness check + web/Finder smoke tests.
