# Comparison view: design

Date: 2026-11-07. Status: built, awaiting the owner's visual acceptance.

## Goal

Pick the best PDF to Markdown converter by reading its output next to the original. The user opens one PDF and the results of several converters (produced outside md-viewer) and compares them side by side. When a new tool appears, the same comparison runs again with one more file. Once a converter is chosen, the same view works as a plain PDF and Markdown 1:1 view.

md-viewer stays a viewer. Conversion, storage and batch runs are out of scope and belong to a separate program.

## Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **PDF plus two result panes, each with a selector** over every loaded result | Scales to any number of tools, keeps each pane readable on a desktop screen. With three or more results, two are visible at a time by design |
| 2 | **1:1 is the same layout with one pane** (one result loaded, or the 1:1 toggle) | The post-decision view needs no separate mode |
| 3 | **Labels come from filenames**: `<doc>.<label>.<ext>`, for example `report.docling.md` | No list of known tools in the code, so a new tool needs no change |
| 4 | **One renderer for every pane**: the viewer's pipeline (`marked` gfm, then `DOMPurify`) moved into `src/render.js` and is used by both pages | Two results can only differ because their converters differ |
| 5 | **`.txt` results are shown as plain text** in both views | An OCR text reference must not gain formatting its tool never produced |
| 6 | **No visible text means a note**, "No text layer, OCR not available.", not an error | A scanned PDF without a text layer is an expected outcome of the comparison |
| 7 | **Desktop only** (1024 px and wider). Narrower screens get a note; the nav entry stays | Three readable columns do not fit a phone |
| 8 | **The PDF uses the browser's own viewer** in an iframe on a `blob:` URL | No new dependency. If a browser fails here, adding pdf.js is a separate, explicit decision |
| 9 | **Its own page**, `web/compare.html`, built by `build.sh` and self-contained like `index.html` | The viewer, its pre-render and its scores stay untouched; the view has a shareable URL |

## Security and privacy

1. Everything runs in the browser. Files are read with `FileReader` and never sent anywhere, so the promise "nothing is uploaded" holds for this page too.
2. Results are untrusted input. They pass the same sanitizer as the viewer: no scripts, no inline handlers, no `javascript:` or `data:text/html` URLs. The Playwright malicious corpus runs against a result pane as well.
3. Links in a result open in a new tab with `rel="noopener noreferrer"`; in-page anchors stay in place.
4. The page has a Content Security Policy that blocks every remote load: `connect-src 'self'`, `img-src 'self' data: blob:`, `frame-src blob:`. A result cannot fetch a tracking pixel or call home.

## Tests

1. `test/e2e/compare.spec.ts`: the empty state, loading, selector, plain text, empty-state note, Rendered and Source per pane, the 1:1 toggle, the single-result case, link targets, a new PDF starting a new set, the CSP, the narrow-screen note and the cross links.
2. `test/e2e/security.spec.ts`: the malicious corpus in a comparison pane.
3. `test/web-smoke.sh`: the built page, the shared renderer in both pages, the CSP, the sitemap entry and the deploy-time SHA.
4. Fixtures in `test/e2e/fixtures/compare/` are neutral and self-made, including a hand-built one-page PDF.
