---
title: Swiss Grid — Style Guide
theme: Swiss Grid
scope: intern
fonts: IBM Plex Sans + IBM Plex Mono
accent: "#cc0000 (light) / #ff2800 (dark)"
tags: [design-system, hairline, international-typographic-style]
---

# Swiss Grid — Style Guide

Interne Design-System-Referenz für das **Swiss Grid**-Theme des md-viewer.
Kein aufgesetztes Panel: dieses Dokument *ist* Markdown, vom Viewer selbst
gerendert — du siehst genau das Rendering, das die App liefert. Links das
gerenderte Dokument, rechts die Quelle. Flip Light/Dark oben rechts.

> **Versteckt.** Erreichbar nur über einen Doppelklick auf die Theme-Auswahl
> ("Swiss Grid") — kein Link, keine Suche. Für mich, nicht für Besucher.

Quelle der Tokens: `src/web-themes.css`. Chrome (Leiste, Dropdown, Footer):
`src/web-chrome.css` + `src/web-chrome-themes.css`. Änderungen passieren dort,
nicht in diesem Dokument — es spiegelt nur, was existiert.

## Design-Prinzip

Swiss Grid folgt dem **International Typographic Style**: IBM Plex als einzige
Schriftfamilie, strenge Haarlinien statt Schatten, **ein** roter Akzent,
großzügiger Weißraum und ein dezentes Zahlen-Raster am linken Rand. Ruhig,
sachlich, präzise — ein Schweizer Plakat, kein Dashboard.

## Farb-Tokens

Acht Variablen, pro Modus definiert. `[data-theme="swiss"]` wählt Schrift und
Rahmenstärke, `[data-theme][data-mode]` die Palette.

### Light

| Token | Wert | Einsatz |
| --- | --- | --- |
| `--bg` | `#ffffff` | Seiten-Grund |
| `--fg` | `#141414` | Fließtext |
| `--surface` | `#f2f2f2` | Code-Blöcke, Panels, Raw-Pane |
| `--muted` | `#909090` | Sekundär-Text, Captions |
| `--line` | `rgba(0,0,0,.12)` | Haarlinien, Tabellen-Rahmen, Divider |
| `--accent` | `#cc0000` | Links, Marker, Divider-Kante |
| `--punch` | `#141414` | Headings, starke Betonung |
| `--sfg` | `#141414` | Text auf `--surface` |

### Dark

| Token | Wert | Einsatz |
| --- | --- | --- |
| `--bg` | `#080808` | Seiten-Grund |
| `--fg` | `#f0f0f0` | Fließtext |
| `--surface` | `#141414` | Code-Blöcke, Panels, Raw-Pane |
| `--muted` | `#606060` | Sekundär-Text, Captions |
| `--line` | `rgba(240,240,240,.10)` | Haarlinien, Tabellen-Rahmen, Divider |
| `--accent` | `#ff2800` | Links, Marker, Divider-Kante (heller im Dunkeln) |
| `--punch` | `#f0f0f0` | Headings, starke Betonung |
| `--sfg` | `#f0f0f0` | Text auf `--surface` |

## Typografie

**IBM Plex Sans** trägt Display und Body, **IBM Plex Mono** Code und den
Raw-Pane. Display-Gewicht 700, Laufweite `-0.02em` — tight, aber nicht eng.
Die Skala ist die native Markdown-Hierarchie:

# H1 — Seitentitel
## H2 — Abschnitt
### H3 — Unterabschnitt
#### H4 — Detail
##### H5 — selten
###### H6 — noch seltener

Fließtext trägt **fett** für Betonung, *kursiv* für Begriffe und `inline code`
für Werte und Pfade. Links sind rot: [md.neckarshore.ai](https://md.neckarshore.ai).

## Markdown-Elemente

Jedes Element im Swiss-Grid-Rendering:

> Blockquote — mit rotem Akzent-Rand. Für Hinweise, Zitate, Kontext.

Ungeordnete Liste:

- Haarlinien statt Schatten
- Ein Akzent, sparsam
  - Verschachtelt geht auch
  - Zweite Ebene
- Weißraum ist ein Element

Geordnete Liste:

1. Erst die Struktur
2. Dann die Typografie
3. Zuletzt der Akzent

Task-Liste:

- [x] Farb-Tokens dokumentiert
- [x] Typo-Skala gezeigt
- [ ] Von dir abgenommen

Code-Block mit Syntax-Highlighting (IBM Plex Mono):

```js
function render(md, name) {
  const dirty = marked.parse(md);
  const clean = DOMPurify.sanitize(dirty);
  document.getElementById("rendered").innerHTML = clean;
}
```

```bash
# Der Quick-Action-Weg im Finder
mdview README.md   # Rechtsklick → Quick Actions → View Markdown
```

Ein horizontaler Trenner:

---

## Die Tokens im Original

Verbatim aus `src/web-themes.css` — hier zum Nachschlagen:

```css
:root[data-theme="swiss"] {
  --font-sans: "IBM Plex Sans", Helvetica, Arial, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, Menlo, monospace;
  --display-weight: 700;
  --display-spacing: -0.02em;
}

/* Light */
:root[data-theme="swiss"][data-mode="light"] {
  --bg: #ffffff; --fg: #141414; --surface: #f2f2f2; --sfg: #141414;
  --muted: #909090; --line: rgba(0,0,0,0.12); --accent: #cc0000; --punch: #141414;
}

/* Dark */
:root[data-theme="swiss"][data-mode="dark"] {
  --bg: #080808; --fg: #f0f0f0; --surface: #141414; --sfg: #f0f0f0;
  --muted: #606060; --line: rgba(240,240,240,0.10); --accent: #ff2800; --punch: #f0f0f0;
}
```

## Chrome-Komponenten

Die Rahmen-Elemente rund um das gerenderte Dokument:

| Komponente | Selektor | Rolle |
| --- | --- | --- |
| Top-Leiste | `.bar` | Dateiname · Open / Readme / How it works · Theme + Light/Dark |
| Theme-Auswahl | `.theme-menu` | Dropdown — **Doppelklick öffnet diesen Style Guide** |
| Zahlen-Raster | `.grid-rail` | Dekoratives Raster am Rand (001 · 02 · 03 · 04) |
| View-Tabs | `.viewtabs` | Rendered / Raw — auf schmalen Screens |
| Divider | `.divider` | Ziehbarer Split-Teiler; Kante wird rot beim Kollabieren |
| Footer | `.foot` | Hinweise · Produkt · Version · Commit-SHA · Changelog |

---

*md-viewer · Swiss Grid · intern — nur über den versteckten Trigger erreichbar.*
