# Static pre-render of the default README (web app) — Design

Backlog #9 (performance / discoverability round). Make the intro content visible
to non-JS crawlers and AI answer-engines by baking the rendered README into the
served HTML at build time, instead of leaving `#rendered` empty for JavaScript
to fill on load.

## Problem

The web app (`web/index.html`) ships `<article id="rendered" class="rendered"></article>`
**empty**. All content is injected client-side: on load, `web-app.js` base64-decodes
the README, runs `marked` → `DOMPurify`, and writes the result into `#rendered`.

Verified on the ground (2026-07-10, served `web/index.html`): `#rendered` is empty
and the file contains **0 `<h1>`**. A crawler or AI fetcher without a JS runtime
(GPTBot, PerplexityBot, plain `curl`) sees no README prose — only an empty shell.
This costs AI-citability and non-JS SEO for a "building in public" surface.

The Finder tool (`viewer.html`) is out of scope: it opens local files, has no
crawler, and its content is injected per-file by `mdview`.

## Goal

The served `web/index.html` contains the fully rendered README markup inside
`#rendered` as static HTML — identical to what a JS-capable browser produces —
so the first paint and every non-JS fetch already carry the intro content.

Success criterion (testable): a plain fetch of the built file finds the README's
`<h1>` and a known intro string inside `#rendered`, with **no JavaScript executed**.

## Scope (approved)

Pre-render **only the rendered README (`#rendered`, left pane)**. The raw-source
pane (`#rawcode`) and all non-default documents (open / paste / drop, README
button, changelog) stay JS-rendered. Rationale: the rendered prose is what gets
indexed and cited; the raw pane is a duplicate code dump with zero crawler value;
smallest footprint (~+15 KB on a ~240 KB file), no duplication. OG/meta enrichment
is deliberately excluded — it overlaps the separate `og:image` backlog item.

## Approach (approved): build-time Node + jsdom render

> **Revised 2026-07-10 (Path 3).** The original approach headless-rendered the built
> page with Playwright and snapshotted `#rendered`. Grounding against CI revealed that
> a browser-in-build forces the lightweight `smoke` job (checkout-only) to grow a
> ~250 MB Chromium install, or the pre-render moves to the fragile Vercel build. Path 3
> gets the **same parity without a browser**: jsdom gives DOMPurify a DOM in Node, and
> we run the **exact same vendored `marked.min.js` + `dompurify.min.js`** the browser
> runs. For the default README (no frontmatter, no hljs in `#rendered`) this is literally
> `DOMPurify.sanitize(marked.parse(readme))` — no duplication of `splitFrontmatter` /
> `buildPropsPanel`, and the committed-artifact + freshness model stays intact.

Render the README with the **same vendored libraries** the browser uses, under jsdom —
no browser anywhere.

### Data flow

```
build.sh emits web/index.html  (README as base64, #rendered empty)
        │
        ▼
node scripts/prerender.mjs web/index.html
        │  ├─ new JSDOM window; window.eval(vendor/marked.min.js + dompurify.min.js)
        │  ├─ read README.md; marked.setOptions({gfm:true,breaks:false})
        │  ├─ html = DOMPurify.sanitize(marked.parse(readme))
        │  └─ rewrite <article id="rendered" …></article> to embed that html
        ▼
web/index.html  (README markup now static inside #rendered)
```

### Components

1. **`scripts/prerender.mjs`** (new, Node + jsdom, ES modules).
   - Input: path to the built `web/index.html`.
   - Builds a jsdom window and `window.eval`s the **vendored** `marked.min.js` +
     `dompurify.min.js` (same versions as shipped → parity, no npm-version drift).
   - Reads `README.md`, applies the same `marked` options as `web-app.js`, renders and
     sanitises, producing the `#rendered` inner HTML.
   - Replaces the single empty `<article id="rendered" class="rendered"></article>`
     with `<article id="rendered" class="rendered">…html…</article>` via an anchored
     string replace (hard-errors if the anchor is not found exactly once).
   - Writes the file back in place.

2. **`build.sh`** — after it emits `web/index.html`, invokes the pre-render step.
   **Fail-open:** if Node or jsdom is unavailable or the step errors, it prints a
   warning and leaves `#rendered` empty (today's behaviour). The build still succeeds,
   so a bare checkout without `node_modules` keeps working.

3. **`web-app.js`** — **unchanged.** It still calls `render(README)` on load, which
   overwrites `#rendered` with identical content. No hydration/skip logic: re-rendering
   identical content is invisible and keeps a single code path.

### Why not the alternatives

- **Playwright snapshot (original A):** perfect parity, but forces a browser into the
  build/freshness path (heavy `smoke` job) or into the Vercel build (fragile). Rejected
  after grounding.
- **npm `marked`/`dompurify` packages instead of the vendored files:** risks a version
  skew between the pre-render and the shipped libs. We `eval` the vendored min.js to
  guarantee identical versions.
- **Extract a shared render module:** cleanest long-term but a larger refactor of
  `web-app.js` than this item warrants. Deferred.

## Determinism & CI freshness

The README is static input and the `#rendered` output is pure `marked` + `DOMPurify`
(the rendered pane has **no** hljs highlighting — `marked` has no highlight hook set),
so the render is deterministic: same README → same HTML. No `Date`/random in the output.

The CI **build-freshness** check rebuilds and diffs against the committed files, so it
must run the same pre-render step. Because Path 3 needs no browser, the fix is small:
the `smoke` job gains `npm ci` (to install jsdom) before it runs `build.sh` — far
lighter than a Chromium install. This is the one integration point to wire in the plan.

## Error handling

| Situation | Behaviour |
|---|---|
| Node / jsdom absent (bare checkout, no `node_modules`) | Warn, skip pre-render, ship empty `#rendered` (= today). Build succeeds. |
| `#rendered` never populates within timeout | Error out the pre-render step (do not ship a half-rendered file); build.sh treats it as the fail-open warning path. |
| Anchor `<article id="rendered" …></article>` not found exactly once | Hard error — the template changed; fail so it is noticed, not silently skipped. |

Security: the embedded markup is DOMPurify-sanitised output of our **own** trusted
README — no new attack surface. The security corpus (PR #22) is unaffected.

## Testing

1. **`test/web-smoke.sh`** — assert `#rendered` in the built `web/index.html` is
   **non-empty** and contains a known README token (e.g. the `md-viewer` H1 and the
   "no-dependency Markdown viewer" intro). This is the crawler-visibility guarantee,
   checked on the raw file text (no browser) — exactly the non-JS surface we care about.
2. **e2e (existing)** — the current split-view / control specs already prove the JS
   render still works; identical content means no behavioural change. No new e2e needed
   for parity, but add one guard: after load, `#rendered` still shows the README H1.
3. **Freshness** — covered by the existing CI rebuild-and-diff, once `npm ci` is wired
   into the `smoke` job (installs jsdom).

## Out of scope

- Finder tool (`viewer.html`) pre-render.
- Raw-source pane (`#rawcode`) pre-render.
- OG/meta/`og:image` enrichment (separate backlog item).
- Pre-rendering non-default documents (changelog, opened files).
