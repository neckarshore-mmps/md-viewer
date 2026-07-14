# Changelog

All notable changes to **md-viewer**. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[Semantic Versioning](https://semver.org/). Pre-1.0 (`0.x`) means the shape
can still move. Entries land under **[Unreleased]** per user-facing change;
each release links the pull requests it contains.

## [Unreleased]

- Scrolling one pane no longer makes the page **drift or keep scrolling by itself**.
  The rendered and raw panes now follow each other strictly one-way: the pane you are
  actually scrolling leads, and the other one just follows — so trackpad momentum can
  no longer start a tug-of-war between them. ([#31](https://github.com/neckarshore-mmps/md-viewer/pull/31))
- The page footer now tells you exactly which build you're looking at — the
  product, its version, and the **commit hash of the deployed build**, linked
  straight to that commit on GitHub. The hash is stamped in at deploy time, so
  it always matches what is actually live (never a stale one). ([#28](https://github.com/neckarshore-mmps/md-viewer/pull/28))

## v0.5.0 — 2026-07-10

**Resizable split view, phone-friendly tabs, and a page that reads without JavaScript** · `1b06714`

- The divider between the rendered and the raw pane is now **draggable** — pull it to
  rebalance the two sides, drag it all the way to either edge to collapse one pane
  completely (the edge turns red so you can always grab it back), or double-click to
  snap back to 50/50. It works from the keyboard too. ([#20](https://github.com/neckarshore-mmps/md-viewer/pull/20))
- Dragging fully to the **right** used to lock the source pane shut with no way to
  reopen it — the handle slid off the edge of the screen. Fixed: it now pins to the
  visible edge on both sides, exactly mirroring the left. ([#21](https://github.com/neckarshore-mmps/md-viewer/pull/21))
- On a **phone**, the rendered and raw panes no longer squeeze into a cramped 50/50 —
  a simple **[Rendered | Raw]** tab switches between them, each full-width. ([#20](https://github.com/neckarshore-mmps/md-viewer/pull/20))
- The intro page is now **readable without JavaScript**, so search engines and AI
  assistants can finally see what md-viewer is — they used to get a blank page. Nothing
  changes for you: the page still renders the same, just a touch faster. ([#23](https://github.com/neckarshore-mmps/md-viewer/pull/23))
- **Minor improvements** — small cosmetic polish gathered together, e.g. the toolbar
  icons now sit a touch apart from their labels. ([#25](https://github.com/neckarshore-mmps/md-viewer/pull/25))
- Safety, tightened: the automated test that proves a hostile Markdown file can't run
  code on your machine was broadened from one sample to a large corpus of attack tricks
  (sneaky links, framed documents, hidden handlers), so a future change can't quietly
  weaken it. ([#22](https://github.com/neckarshore-mmps/md-viewer/pull/22))

## v0.4.0 — 2026-07-09

**Images and local links now show up in the Finder tool** · `d936c9b`

- Open a Markdown file from Finder and the images it references now appear —
  pictures stored next to the file (or in a subfolder) used to stay broken.
  Links to other files in the same place work too. ([#17](https://github.com/neckarshore-mmps/md-viewer/pull/17))
- Web addresses, embedded images, email links and in-page "jump to" links keep
  working exactly as before.
- Safety built in: a Markdown file from someone else can't use a sneaky path to
  reach files outside your own folders (like system files) — those references
  are simply ignored. Obsidian's shared-attachments folders still work fine.
- That safety is now checked automatically: before every release, a test opens a
  deliberately hostile Markdown file in a real browser and confirms it cannot run
  code, open windows, or reach files on your computer. If a future change ever
  weakened this, the release is blocked. ([#19](https://github.com/neckarshore-mmps/md-viewer/pull/19))
- The web app (drag / drop / paste in the browser) is unchanged — it has no
  folder on your disk to look in, so this applies to the Finder tool only.

## v0.3.1 — 2026-07-06

**Footer legibility + privacy claim** · `5411938`

- Footer text lifted off `--muted` (blended toward `--fg`) so it clears WCAG AA
  on every theme — the low grey-on-black contrast was a Lighthouse flag. Size
  bumped to 12px, with extra bottom padding so a floating OS overlay no longer
  sits on the footer. ([#13](https://github.com/neckarshore-mmps/md-viewer/pull/13))
- Footer privacy note now reads **nothing is uploaded. everything locally
  rendered.**, in red with a subtle 5s low-frequency pulse (honours
  `prefers-reduced-motion`). ([#13](https://github.com/neckarshore-mmps/md-viewer/pull/13))
- The same claim now appears prominently near the top of the **How it works**
  page. ([#14](https://github.com/neckarshore-mmps/md-viewer/pull/14))

## v0.3.0 — 2026-07-06

**Obsidian frontmatter support** · `fd8af50`

- YAML frontmatter (the leading `--- … ---` block from Obsidian, Jekyll and
  Hugo) is no longer rendered as a giant heading — it is parsed and shown as a
  typed **Properties panel** above the document. ([#10](https://github.com/neckarshore-mmps/md-viewer/pull/10))
- List properties (`tags`, `aliases`, …) render as **colour-varied chips** —
  red / black / grey, filled and outlined, driven by the active theme. ([#10](https://github.com/neckarshore-mmps/md-viewer/pull/10))
- The raw source pane still shows the full document, `---` block included.

## v0.2.0 — 2026-07-05

**Open source** · `c33bfb1`

- MIT `LICENSE` and third-party attribution added for the public flip. ([#9](https://github.com/neckarshore-mmps/md-viewer/pull/9))

## v0.1.0 — 2026-07-05

**First public web app** · `f35cc80`

- Interactive web viewer with split rendered/source view, drag-to-resize,
  scroll sync, drag & drop, paste, and file-open dialog. ([#1](https://github.com/neckarshore-mmps/md-viewer/pull/1))
- Theme system (Minimalist / Swiss Grid) with light/dark modes and a theme
  dropdown. ([#2](https://github.com/neckarshore-mmps/md-viewer/pull/2), [#3](https://github.com/neckarshore-mmps/md-viewer/pull/3), [#5](https://github.com/neckarshore-mmps/md-viewer/pull/5))
- SEO baseline: meta description, `robots.txt`, `sitemap.xml`, Open Graph,
  JSON-LD, canonical, descriptive title, and a `<main>` landmark. ([#4](https://github.com/neckarshore-mmps/md-viewer/pull/4), [#5](https://github.com/neckarshore-mmps/md-viewer/pull/5))
- "How it works" page with navigation link. ([#7](https://github.com/neckarshore-mmps/md-viewer/pull/7), [#8](https://github.com/neckarshore-mmps/md-viewer/pull/8))
- CI smoke-test gate on every PR. ([#6](https://github.com/neckarshore-mmps/md-viewer/pull/6))
