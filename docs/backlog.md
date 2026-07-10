# md-viewer — Backlog

Prioritised list of what's deferred. Treat as the single source of truth for
"what's next" so future sessions don't re-derive it. Scope: personal power-tool
(with light personal-branding / "building in public" intent) — **not** a product.

## Next up (high value)

| # | Item | Why | Notes |
|---|------|-----|-------|
| 1 | **Obsidian / GFM feature coverage** | The owner's real files (Obsidian vault, planning docs) use these; the viewer is half-blind to them today | YAML frontmatter is done (Properties panel, v0.3.0). Remaining: Mermaid diagrams, task lists `- [ ]`, callouts `> [!note]`, `[[wikilinks]]`, footnotes, math. Web app + Finder tool. Build as slices — task-lists / callouts / wikilinks first (pure renderer, light); Mermaid + math separately (heavier: Mermaid is a large blob, tension with the "single self-contained file" principle). |

## Nice-to-have

| # | Item | Notes |
|---|------|-------|
| 2 | Copy button on code blocks | Small JS + button per `<pre>` |
| 3 | Remember last file | localStorage; only feasible on web via a File System Access handle. (Divider-position persistence: **Won't-do** — owner, 2026-07-10, struck during the split-layout design.) |
| 4 | Print / PDF export | `@media print` stylesheet + a print button |
| 5 | Real line-number gutter in the source pane | We shipped the decorative Swiss rail instead; a true per-line gutter is a separate feature |
| 6 | `og:image` for shared-link preview | Needs a generated preview image; otherwise the social card has no image |

## Performance round (deliberately deferred — Lighthouse already 100 on SEO/A11y/Best-Practices)

| # | Item | Notes |
|---|------|-------|
| 7 | Minify own JS / reduce the ~220 KB inline blob | Trade-off with the "single self-contained file, offline" principle |
| 8 | ~~Defer hljs highlighting of the default README~~ | **Won't-do** (owner, 2026-07-10). Measured on the ground: highlighting the 5 KB README costs a **median 2.1 ms** on the main thread — far below the 50 ms long-task threshold, on a page already at Lighthouse 100. Deferring 2 ms buys nothing measurable and adds code + test churn. |

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
