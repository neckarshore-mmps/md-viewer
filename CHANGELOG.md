# Changelog

All notable changes to **md-viewer**. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html). Pre-1.0 (`0.x`)
means the shape can still move. Each release links the pull requests it contains.

## v0.4.0 — 2026-07-09

**Images and local links now show up in the Finder tool** · `3d1ab67`

- Open a Markdown file from Finder and the images it references now appear —
  pictures stored next to the file (or in a subfolder) used to stay broken.
  Links to other files in the same place work too. ([#17](https://github.com/neckarshore-mmps/md-viewer/pull/17))
- Web addresses, embedded images, email links and in-page "jump to" links keep
  working exactly as before.
- Safety built in: a Markdown file from someone else can't use a sneaky path to
  reach files outside your own folders (like system files) — those references
  are simply ignored. Obsidian's shared-attachments folders still work fine.
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
