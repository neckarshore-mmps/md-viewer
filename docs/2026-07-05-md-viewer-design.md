# md-viewer — Design

Date: 2026-07-05

## Goal

A fast Markdown viewer for macOS. Right-click a `.md` file in Finder → it opens,
cleanly rendered — no need to go through VS Code. Show the pretty (CSS-styled)
rendering and the original source side by side: rendered always on the left, raw
Markdown on the right. The raw side is syntax-highlighted so structure (headings,
bullets, etc.) is visible in the source too.

## Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Trigger via **Automator Quick Action** | Appears directly in the Finder right-click menu; installable from a script; no separate app to build/sign. |
| 2 | Render as **self-contained HTML in the browser** | CSS is the right tool for "pretty rendering"; zero build chain, offline, no npm. |
| 3 | **Always split** (rendered left, raw right) | User preference — no toggle, both visible immediately. |
| 4 | **Auto light/dark** via `prefers-color-scheme` | Follows the system; no manual switching. |
| 5 | `bin/mdview` in **Bash** | Zero runtime dependency (macOS built-ins only). base64 makes the payload a single safe line, so Bash stays robust. |
| 6 | Sanitize rendered HTML with **DOMPurify** | A downloaded `.md` could embed scripts; neutralize them before injection. |

## Architecture

Two components plus a generated template:

1. **`bin/mdview`** — base64-encodes the file contents and filename, injects them
   into `viewer.html` (via `awk` gsub — base64 contains no `&`/`\`, so the
   replacement is safe), writes a temp HTML, and `open`s it in the default
   browser. `MDVIEW_NO_OPEN=1` prints the path instead of opening (for tests).
2. **`viewer.html`** — self-contained template assembled by `build.sh` from
   `src/` + `vendor/`. In-browser JS decodes the base64 payload, renders the left
   pane with `marked` → `DOMPurify` → `innerHTML`, and highlights the right pane
   with `highlight.js` (markdown grammar).
3. **`quick-action/View Markdown.workflow`** — Automator Service that runs
   `mdview` on the selected file(s); installed into `~/Library/Services/` with the
   absolute `mdview` path wired in by `install.sh`.

## Data flow

```
Finder right-click .md
  -> Quick Action runs: mdview "$file"
  -> mdview: base64(content), base64(name) -> awk-inject into viewer.html -> temp .html
  -> open temp .html in default browser
  -> viewer.html JS: decode -> left = marked+DOMPurify, right = highlight.js
```

## Testing

- `test/smoke.sh` — builds, runs `mdview` on `test/fixture.md`, asserts
  placeholders resolved, payload embedded, libraries inlined, missing-file
  rejected.
- Browser-level verification (during build): rendered pane produces headings,
  tables, code blocks, links; raw pane is syntax-highlighted; UTF-8 (umlauts,
  emoji) round-trips; XSS payloads (`<script>`, `onerror`) are stripped from the
  rendered pane while remaining visible as text in the raw pane.
- Plist validity (`plutil -lint`) and macOS service registration (`pbs -dump`).

## Out of scope (v1 / YAGNI)

Synchronized scrolling, configurable themes beyond auto light/dark, Mermaid /
LaTeX rendering. Captured in the README backlog.
