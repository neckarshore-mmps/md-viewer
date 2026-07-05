# How md-viewer works

*How a Markdown file becomes a split view.* One file, one pipeline, zero servers.
The same base64-injected, self-contained HTML powers both the macOS Finder Quick
Action and the web app at [md.neckarshore.ai](https://md.neckarshore.ai) — rendered
document on the left, syntax-highlighted source on the right.

> A visual version of this page lives at
> [md.neckarshore.ai/how-it-works](https://md.neckarshore.ai/how-it-works).

## 1. Two ways in, one engine

Both entry points feed the exact same in-browser rendering pipeline.

**Finder Quick Action (macOS)** — right-click any `.md`, no app to launch:

1. Right-click → **Quick Actions → View Markdown**
2. An Automator service runs `mdview "$file"`
3. Bash generates a temporary HTML file and `open`s it in your default browser

**Web app (browser)** — drop, paste, or open a file; fully client-side:

1. Drag & drop · paste (⌘V / Ctrl+V) · file picker
2. The repository README renders by default
3. Nothing is uploaded — it all runs in your browser

## 2. The rendering pipeline

| Step | What happens | Why |
|------|--------------|-----|
| **Source** | A Markdown file (`.md`) | Any bytes — Unicode, emoji, embedded HTML |
| **Encode** | base64 the content + filename | Turns the file into a single safe line — no character can break the HTML/JS it's injected into |
| **Inject** | Substitute into the self-contained template | One HTML file with every CSS/JS library already inlined; no network from here on |
| **Browser** | Decode base64 → UTF-8 text | Two renderers then run over the same text, in parallel |
| **Left · Rendered** | `marked` → `DOMPurify` → `innerHTML` | Markdown → HTML, sanitized so a downloaded file's scripts can't run |
| **Right · Source** | `highlight.js` (markdown grammar) | Raw text stays verbatim, colour-coded so structure is visible in the source too |
| **Result** | Split view · scroll-synced · resizable | Read the formatted version and the source at once |

## 3. What makes it hold together

1. **Self-contained & offline** — fonts, CSS and every JS library are inlined into
   one HTML file. It works with no internet, no `npm`, no runtime dependencies.
2. **Safe by construction** — base64 sidesteps every HTML-escaping bug; `DOMPurify`
   strips scripts and event handlers from the rendered side.
3. **Token-driven themes** — `[data-theme]` × `[data-mode]` drive Minimalist and
   Swiss Grid, each in light and dark, entirely from CSS custom properties.
4. **No build chain** — a pure Bash generator (`build.sh`, `bin/mdview`) assembles
   both outputs. Text in, text out — reviewable and diff-able.

## Built with

`marked` · `DOMPurify` · `highlight.js` · IBM Plex · Bash / Automator · Vercel ·
File System Access API.
