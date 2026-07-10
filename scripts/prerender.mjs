#!/usr/bin/env node
// scripts/prerender.mjs — bake the rendered README into #rendered of web/index.html
// so non-JS crawlers / AI fetchers see the intro prose (backlog #9).
//
// Parity without a browser: we run the SAME vendored marked.min.js + dompurify.min.js
// the shipped page runs, under jsdom (which gives DOMPurify a DOM). The default README
// has no frontmatter and no hljs in the rendered pane, so mirroring web-app.js is just
// `DOMPurify.sanitize(marked.parse(readme))` — no duplication of splitFrontmatter /
// buildPropsPanel. (If README.md ever gains a `--- … ---` frontmatter block, mirror
// splitFrontmatter here so the static render matches the client render.)
//
// Fail-open: any failure leaves the file untouched and exits non-zero, so build.sh
// warns and ships the client-rendered page exactly as before — never a broken build.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const ANCHOR = '<article id="rendered" class="rendered"></article>';

async function main() {
  const target = resolve(process.argv[2] || join(ROOT, "web/index.html"));
  const html = readFileSync(target, "utf8");

  const anchorCount = html.split(ANCHOR).length - 1;
  if (anchorCount !== 1) {
    throw new Error(`expected exactly one empty #rendered anchor, found ${anchorCount} — template changed?`);
  }

  const { JSDOM } = await import("jsdom");
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { runScripts: "outside-only" });
  const { window } = dom;
  window.eval(readFileSync(join(ROOT, "vendor/marked.min.js"), "utf8"));
  window.eval(readFileSync(join(ROOT, "vendor/dompurify.min.js"), "utf8"));
  if (!window.marked || !window.DOMPurify) {
    throw new Error("vendored marked / DOMPurify did not load in jsdom");
  }

  const readme = readFileSync(join(ROOT, "README.md"), "utf8");
  // Mirror web-app.js exactly: same marked options, then sanitise.
  window.marked.setOptions({ gfm: true, breaks: false });
  const rendered = window.DOMPurify.sanitize(window.marked.parse(readme));
  if (!rendered || !rendered.trim()) throw new Error("rendered README came back empty");

  const filled = html.replace(
    ANCHOR,
    `<article id="rendered" class="rendered">${rendered}</article>`,
  );
  writeFileSync(target, filled);
  console.log(`prerender: baked ${rendered.length} chars into #rendered of ${target}`);
}

main().catch((err) => {
  console.error(`prerender: skipped — ${err.message}`);
  process.exit(3);
});
