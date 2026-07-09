# Browser e2e + Security Tests (Playwright)

Design spec for backlog #3. Adds a real-browser end-to-end test layer next to the
existing shell smoke tests, with a security focus: prove that untrusted Markdown
content is interpreted safely.

## Motivation

The current CI runs shell smoke tests that only **grep the built HTML** — they
confirm a control is *present* but never *execute* it. This exact gap shipped a
dead light/dark toggle (fixed in #12). More importantly, the viewer interprets
**untrusted third-party Markdown** — an interpreter is a classic attack surface
(owner feedback via Christian, 2026-07-09; analogy: a malicious RSS feed in a
podcast app). Grep tests structurally cannot prove that nothing executes at
runtime. Only a real browser can.

## Scope

In scope:

1. Real-browser click-through of the web app's interactive controls.
2. Runtime security assertions against a malicious-Markdown corpus.
3. A runtime check of the relative-URL containment shipped in #18.

Out of scope (YAGNI): multi-browser (Chromium only), visual-regression /
screenshot diffing, mobile-layout tests (that is backlog #2), performance
assertions.

## Architecture

A new **dev-only** test layer. The shipped artifacts (`viewer.html`,
`web/index.html`) stay self-contained and dependency-free; test tooling never
touches them.

| Piece | Detail |
|-------|--------|
| `package.json` | First in the repo. Dev-only, exact-pinned `@playwright/test` (no `^`/`~`). `test:e2e` script. |
| `node_modules/` | git-ignored. |
| `playwright.config.ts` | Chromium only, headless, no retries locally, HTML/list reporter. |
| `test/e2e/` | Spec files (`controls.spec.ts`, `security.spec.ts`). |
| `test/e2e/fixtures/` | The malicious-Markdown corpus. |
| Shell smoke tests | Unchanged — kept as the fast structural gate. |

## Two test surfaces

1. **Web app** (`web/index.html`) — served by Playwright's built-in static
   `webServer` (serves the `web/` dir). Exercises the controls that grep can't:
   - Theme mode toggle flips `data-mode` (light ⇄ dark).
   - Theme dropdown opens and closes; selecting a theme flips `data-theme`.
   - README ⇄ Changelog content swap renders the expected body.
2. **Finder viewer** (`viewer.html` via `bin/mdview`) — the security-critical
   path, because that is where an untrusted `.md` is rendered. The test generates
   the temp HTML with `MDVIEW_NO_OPEN=1 bin/mdview <fixture>` and loads it over
   `file://`.

## Security core

A malicious-Markdown corpus at `test/e2e/fixtures/malicious.md` covering, at
minimum: raw `<script>`, `<img onerror=…>`, a `javascript:` link, `<iframe>`,
`data:text/html` src, an inline SVG with `onload`, and a bare `on*` handler
attribute.

Runtime assertions (real browser, on both the web-app render and the
Finder-viewer render of the corpus):

1. **Nothing executes.** Each injected payload attempts to set
   `window.__pwned = true`. After render, the test asserts `window.__pwned` is
   still `undefined`. This is the load-bearing assertion — it is what grep cannot
   prove.
2. **No script survives sanitisation.** The rendered content pane contains no
   `<script>` element and no element with an `on*` handler attribute.
3. **No dangerous URLs.** No `a[href^="javascript:"]` in the rendered tree.
4. **Containment (from #18) holds at runtime.** A fixture with
   `![](../../../../etc/hosts)` rendered via the Finder viewer produces an `img`
   whose `src` is NOT a `file://` URL to `/etc/hosts` (it is left unresolved).

> **Note:** The `window.__pwned` probe works because DOMPurify is expected to
> strip the injected scripts before they run. If a regression lets one through,
> the browser executes it and the flag flips — turning a silent sanitisation
> failure into a hard test failure.

## CI integration

A new job `e2e` in `.github/workflows/ci.yml`, gated like `smoke`:

```
- uses: actions/setup-node@<pinned-sha>
- run: npm ci
- run: npx playwright install --with-deps chromium   # cached by version
- run: npx playwright test
```

The Playwright browser binary is cached (keyed on the pinned Playwright version)
to keep CI time down. Exact-version pinning honours the repo's dependency policy.

**Stats cascade (deferred, stage 2):** wiring the Playwright reporter's count
into the estate `stats.json` cascade is a follow-up, not part of this change — it
should not block or bloat the e2e PR.

## Testing the tests

- Each spec is self-verifying: the security spec must FAIL if DOMPurify is
  removed from the render path (a sanity check run locally during development,
  not committed as a permanent mutation).
- The shell smoke suite continues to pass unchanged.

## Success criteria

1. `npx playwright test` green locally and in the new CI `e2e` job.
2. The `window.__pwned` assertion demonstrably fails when sanitisation is
   bypassed (verified once during development).
3. Existing shell smoke + unit suites still green.
4. Shipped artifacts unchanged (no build-freshness diff).
