import { test, expect } from "@playwright/test";
import * as path from "node:path";
import * as os from "node:os";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// The local, pre-filled comparison page that `md-converter compare <pdf>` writes (and the
// Finder quick action / Windows "Send to" open): web/compare.html with the files embedded
// as window.__MDV_COMPARE_FILES__ right after <body>, opened from file://. This builds the
// page the same way converter/src/md_converter/compare_page.py does, so the e2e job needs
// no Python.

const DIR = path.resolve("test/e2e/fixtures/compare");
const FILES = ["sample.pdf", "sample.alpha.md", "sample.beta.md", "sample.empty.md"];

function preloadedPage(files: string[]): string {
  const payload = files.map((name) => ({ name, b64: readFileSync(path.join(DIR, name)).toString("base64") }));
  const script = `<script>window.__MDV_COMPARE_FILES__ = ${JSON.stringify(payload).replace(/<\//g, "<\\/")};</script>`;
  const html = readFileSync(path.resolve("web/compare.html"), "utf8").replace(/<body[^>]*>/i, (m) => m + script);
  const out = path.join(mkdtempSync(path.join(os.tmpdir(), "md-compare-")), "sample.compare.html");
  writeFileSync(out, html);
  return pathToFileURL(out).href;
}

test("a preloaded page opened from file:// shows the PDF and fills both panes", async ({ page }) => {
  await page.goto(preloadedPage(FILES));
  await expect(page.locator("#cmpPdfName")).toHaveText("sample.pdf");
  const frame = page.locator("#cmpPdfBody iframe.cmp-frame");
  await expect(frame).toHaveCount(1);
  expect(await frame.getAttribute("src")).toMatch(/^blob:/);

  const options = await page.locator('.cmp-result[data-slot="0"] .cmp-select option').allTextContents();
  expect(options).toEqual(["alpha", "beta", "empty"]);
  await expect(page.locator('.cmp-result[data-slot="0"] .cmp-select')).toHaveValue("0");
  await expect(page.locator('.cmp-result[data-slot="1"] .cmp-select')).toHaveValue("1");
  await expect(page.locator('.cmp-result[data-slot="0"] .cmp-body')).not.toBeEmpty();
});

test("an empty preloaded result says no text layer", async ({ page }) => {
  await page.goto(preloadedPage(["sample.pdf", "sample.empty.md"]));
  // The note sits hidden in the markup from the start, so visibility is what proves it.
  await expect(page.locator('.cmp-result[data-slot="0"] .cmp-select option')).toHaveText(["empty"]);
  await expect(page.locator('.cmp-result[data-slot="0"] .cmp-empty')).toBeVisible();
});

test("without a preload the web page stays empty", async ({ page }) => {
  await page.goto("/compare.html");
  await expect(page.locator("#cmpPdfName")).not.toHaveText("sample.pdf");
  await expect(page.locator('.cmp-result[data-slot="0"] .cmp-none')).toBeVisible();
});
