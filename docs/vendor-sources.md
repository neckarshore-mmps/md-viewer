# Vendored Library Sources

All third-party libraries are vendored into `vendor/` and inlined into
`viewer.html` at build time, so the viewer stays self-contained and offline.
Pinned versions and their download URLs:

| # | File | Version | Source URL |
|---|------|---------|------------|
| 1 | `dompurify.min.js` | 3.1.6 | `https://cdn.jsdelivr.net/npm/dompurify@3.1.6/dist/purify.min.js` |
| 2 | `github-markdown.css` | 5.5.1 | `https://cdn.jsdelivr.net/npm/github-markdown-css@5.5.1/github-markdown.css` |
| 3 | `highlight.min.js` | 11.9.0 | `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js` |
| 4 | `hljs-github-dark.css` | 11.9.0 | `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css` |
| 5 | `hljs-github-light.css` | 11.9.0 | `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css` |
| 6 | `marked.min.js` | 12.0.2 | `https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js` |
| 7 | `markdown.min.js` | 11.9.0 | `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/markdown.min.js` |

To update: re-download the file(s) into `vendor/`, bump the version here, then
run `./build.sh` and `./test/smoke.sh`.
