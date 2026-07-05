# md-viewer — Backlog

Prioritised list of what's deferred. Treat as the single source of truth for
"what's next" so future sessions don't re-derive it. Scope: personal power-tool
(with light personal-branding / "building in public" intent) — **not** a product.

## Next up (high value)

| # | Item | Why | Notes |
|---|------|-----|-------|
| 1 | **Obsidian / GFM feature coverage** | The owner's real files (Obsidian vault, planning docs) use these; the viewer is half-blind to them today | YAML frontmatter (render as a clean table, not raw), Mermaid diagrams, task lists `- [ ]`, callouts `> [!note]`, `[[wikilinks]]`, footnotes, math. Web app + Finder tool. |
| 2 | **Relative images & links in the Finder tool** | Correctness gap: a `.md` with `![](./img.png)` or relative links renders broken because the temp HTML lives in a temp dir | Options: rewrite relative URLs to `file://` absolute against the source file's dir, or inline images as data URIs at generation time. |

## Nice-to-have

| # | Item | Notes |
|---|------|-------|
| 3 | Copy button on code blocks | Small JS + button per `<pre>` |
| 4 | Remember divider position + last file | localStorage; last file only feasible on web via File System Access handle |
| 5 | Print / PDF export | `@media print` stylesheet + a print button |
| 6 | Real line-number gutter in the source pane | We shipped the decorative Swiss rail instead; a true per-line gutter is a separate feature |
| 7 | `og:image` for shared-link preview | Needs a generated preview image; otherwise the social card has no image |
| 8 | Browser e2e in CI (Playwright) | Current CI runs the shell smoke tests; a headless browser test would guard the JS behaviour (themes, dropdown, XSS, scroll sync) that shell tests can't |

## Performance round (deliberately deferred — Lighthouse already 100 on SEO/A11y/Best-Practices)

| # | Item | Notes |
|---|------|-------|
| 9 | Minify own JS / reduce the ~220 KB inline blob | Trade-off with the "single self-contained file, offline" principle |
| 10 | Defer hljs highlighting of the default README | Lowers Total Blocking Time |
| 11 | Static pre-render of intro content | Helps non-JS crawlers + AI citability; the body is client-rendered today |

## Done

- CI gate on PRs (`.github/workflows/ci.yml`) — build-freshness check + web/Finder smoke tests.
