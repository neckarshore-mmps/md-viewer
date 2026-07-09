# md-viewer — Backlog

Prioritised list of what's deferred. Treat as the single source of truth for
"what's next" so future sessions don't re-derive it. Scope: personal power-tool
(with light personal-branding / "building in public" intent) — **not** a product.

## Next up (high value)

| # | Item | Why | Notes |
|---|------|-----|-------|
| 1 | **Obsidian / GFM feature coverage** | The owner's real files (Obsidian vault, planning docs) use these; the viewer is half-blind to them today | YAML frontmatter (render as a clean table, not raw), Mermaid diagrams, task lists `- [ ]`, callouts `> [!note]`, `[[wikilinks]]`, footnotes, math. Web app + Finder tool. |

## Nice-to-have

| # | Item | Notes |
|---|------|-------|
| 3 | Copy button on code blocks | Small JS + button per `<pre>` |
| 4 | Remember divider position + last file | localStorage; last file only feasible on web via File System Access handle |
| 5 | Print / PDF export | `@media print` stylesheet + a print button |
| 6 | Real line-number gutter in the source pane | We shipped the decorative Swiss rail instead; a true per-line gutter is a separate feature |
| 7 | `og:image` for shared-link preview | Needs a generated preview image; otherwise the social card has no image |
| 8 | Browser e2e in CI (Playwright) — **raised priority: security** | Current CI runs shell smoke tests that only **grep the built HTML** — they see "button present" but never execute a click, so a control with a missing handler passes. This exact gap shipped a dead light/dark toggle (fixed in #12). Add a headless "click through every control" sweep: click each nav/footer button + link, assert the observable effect (`data-mode`/`data-theme` flip, rendered-content swap for readme/changelog, dropdown open/close), plus the JS behaviour shell tests can't reach (**XSS sanitisation**, scroll sync). **Security emphasis (Christian, 2026-07-09):** the viewer interprets untrusted third-party content — an interpreter is a classic attack surface (his analogy: a malicious RSS feed in a podcast app). The runtime XSS assertion belongs here: render `test/xss.md` in a real browser and assert no script executes, no handler fires, no `javascript:`/`data:text/html` navigation. Grep tests structurally cannot prove this. Consider a dedicated malicious-input corpus beyond the single `xss.md` fixture. |

## Performance round (deliberately deferred — Lighthouse already 100 on SEO/A11y/Best-Practices)

| # | Item | Notes |
|---|------|-------|
| 9 | Minify own JS / reduce the ~220 KB inline blob | Trade-off with the "single self-contained file, offline" principle |
| 10 | Defer hljs highlighting of the default README | Lowers Total Blocking Time |
| 11 | Static pre-render of intro content | Helps non-JS crawlers + AI citability; the body is client-rendered today |

## Done

- **Relative images & links in the Finder tool** (v0.4.0, PR #17) — `mdview` passes
  the source file's directory into the viewer; relative `<img>`/`<a>` URLs are
  rewritten to `file://` absolute after DOMPurify. Schemes / protocol-relative /
  in-page anchors untouched. Unit-tested (`test/url-resolve.test.mjs`, 15 cases).
  Web app unchanged (no source dir). *Reported by Christian.*
- CI gate on PRs (`.github/workflows/ci.yml`) — build-freshness check + web/Finder smoke tests.
