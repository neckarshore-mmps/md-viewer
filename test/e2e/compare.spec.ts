import { test, expect, type Page } from "@playwright/test";
import * as path from "node:path";
import { readFileSync } from "node:fs";

// The comparison view (web/compare.html): one PDF next to two result panes, each
// with a selector over every loaded result. Fixtures are neutral and self-made:
// sample.pdf is a hand-built one-page PDF with a text layer; the results are named
// <doc>.<label>.<ext>, so the labels below come from filenames, not a tool list.

const DIR = path.resolve("test/e2e/fixtures/compare");
const f = (name: string) => path.join(DIR, name);
const ALL = ["sample.pdf", "sample.alpha.md", "sample.beta.md", "sample.gamma.txt", "sample.empty.md"].map(f);

const pane = (page: Page, slot: 0 | 1) => page.locator(`.cmp-result[data-slot="${slot}"]`);

async function load(page: Page, files: string[]) {
  await page.setInputFiles("#cmpFiles", files);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/compare.html");
});

test("before loading: three columns, both result panes say no result, 1:1 disabled", async ({ page }) => {
  await expect(page.locator("#cmp")).toBeVisible();
  await expect(page.locator("#cmp")).not.toHaveClass(/is-single/);
  await expect(pane(page, 0).locator(".cmp-none")).toBeVisible();
  await expect(pane(page, 1).locator(".cmp-none")).toBeVisible();
  await expect(page.locator("#cmpSingle")).toBeDisabled();
});

test("loading a PDF and four results fills the PDF pane and both result panes", async ({ page }) => {
  await load(page, ALL);
  const frame = page.locator("#cmpPdfBody iframe.cmp-frame");
  await expect(frame).toHaveCount(1);
  expect(await frame.getAttribute("src"), "the PDF is shown from a local blob URL").toMatch(/^blob:/);
  await expect(page.locator("#cmpPdfName")).toHaveText("sample.pdf");

  // Labels come from the filename after the PDF's stem.
  const options = await pane(page, 0).locator(".cmp-select option").allTextContents();
  expect(options).toEqual(["alpha", "beta", "gamma", "empty"]);
  await expect(pane(page, 0).locator(".cmp-rendered h1")).toHaveText("Alpha result");
  await expect(pane(page, 1).locator(".cmp-rendered h1")).toHaveText("Beta result");
  await expect(page.locator("#cmpSingle")).toBeEnabled();
});

test("three or more results: the selector swaps what a pane shows", async ({ page }) => {
  await load(page, ALL);
  await pane(page, 1).locator(".cmp-select").selectOption({ label: "alpha" });
  await expect(pane(page, 1).locator(".cmp-rendered h1")).toHaveText("Alpha result");
  await expect(pane(page, 0).locator(".cmp-rendered h1"), "the other pane is untouched").toHaveText("Alpha result");
});

test("a .txt result is plain text: no Markdown rendering", async ({ page }) => {
  await load(page, ALL);
  const p = pane(page, 1);
  await p.locator(".cmp-select").selectOption({ label: "gamma" });
  await expect(p.locator(".cmp-kind")).toHaveText("plain text");
  await expect(p.locator(".cmp-rendered pre.cmp-plain")).toContainText("# not a heading in plain text");
  await expect(p.locator(".cmp-rendered h1"), "a '#' line must not become a heading").toHaveCount(0);
});

test("a result without visible text shows the empty-state note, not an error", async ({ page }) => {
  await load(page, ALL);
  const p = pane(page, 0);
  await p.locator(".cmp-select").selectOption({ label: "empty" });
  await expect(p.locator(".cmp-empty")).toBeVisible();
  await expect(p.locator(".cmp-empty")).toHaveText("No text layer, OCR not available.");
  await expect(p.locator(".cmp-rendered")).toBeHidden();
  await p.locator('.cmp-view[data-view="source"]').click();
  await expect(p.locator(".cmp-empty"), "the note holds in the source view too").toBeVisible();
});

test("Rendered / Source toggles per pane", async ({ page }) => {
  await load(page, ALL);
  const p = pane(page, 0);
  await p.locator('.cmp-view[data-view="source"]').click();
  await expect(p.locator(".cmp-source")).toBeVisible();
  await expect(p.locator(".cmp-source code")).toContainText("# Alpha result");
  await expect(p.locator(".cmp-rendered")).toBeHidden();
  await expect(pane(page, 1).locator(".cmp-rendered"), "pane 2 keeps its own view").toBeVisible();
  await p.locator('.cmp-view[data-view="rendered"]').click();
  await expect(p.locator(".cmp-rendered h1")).toHaveText("Alpha result");
});

test("1:1 toggle shows one result next to the PDF, and back", async ({ page }) => {
  await load(page, ALL);
  await page.click("#cmpSingle");
  await expect(page.locator("#cmp")).toHaveClass(/is-single/);
  await expect(pane(page, 1)).toBeHidden();
  await expect(page.locator("#cmpSingle")).toHaveAttribute("aria-pressed", "true");
  await page.click("#cmpSingle");
  await expect(pane(page, 1)).toBeVisible();
});

test("one result only: the view is PDF plus one pane by itself", async ({ page }) => {
  await load(page, [f("sample.pdf"), f("sample.alpha.md")]);
  await expect(page.locator("#cmp")).toHaveClass(/is-single/);
  await expect(pane(page, 1)).toBeHidden();
  await expect(page.locator("#cmpSingle")).toBeDisabled();
});

test("links in a result open in a new tab; in-page links stay", async ({ page }) => {
  await load(page, ALL);
  const ext = pane(page, 0).locator('.cmp-rendered a[href^="https://"]');
  await expect(ext).toHaveAttribute("target", "_blank");
  await expect(ext).toHaveAttribute("rel", "noopener noreferrer");
  const anchor = pane(page, 0).locator('.cmp-rendered a[href^="#"]');
  expect(await anchor.getAttribute("target")).toBeNull();
});

test("a new PDF starts a new set; results added later join it", async ({ page }) => {
  await load(page, [f("sample.pdf"), f("sample.alpha.md")]);
  await load(page, [f("sample.beta.md")]);
  await expect(pane(page, 1).locator(".cmp-rendered h1")).toHaveText("Beta result");
  await load(page, [f("sample.pdf")]);
  await expect(pane(page, 0).locator(".cmp-none")).toBeVisible();
});

test("the page carries a CSP that blocks remote loads", async ({ page }) => {
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute("content");
  expect(csp).toContain("connect-src 'self'");
  expect(csp).toContain("img-src 'self' data: blob:");
  expect(csp).toContain("frame-src blob:");
});

test("a remote image in a result is never requested (CSP)", async ({ page }) => {
  // Answer the remote URL ourselves (a 1x1 PNG), so the test does not depend on
  // the network: the route can only be hit if the CSP lets the request through.
  const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
  let hits = 0;
  await page.route("https://example.com/**", (route) => { hits++; return route.fulfill({ body: PNG, contentType: "image/png" }); });
  await page.setInputFiles("#cmpFiles", [
    { name: "sample.pdf", mimeType: "application/pdf", buffer: readFileSync(f("sample.pdf")) },
    { name: "sample.pixel.md", mimeType: "text/markdown",
      buffer: Buffer.from("# Pixel\n\n![pixel](https://example.com/pixel.png)\n") },
  ]);
  await expect(pane(page, 0).locator(".cmp-rendered h1")).toHaveText("Pixel");
  await page.waitForTimeout(400);
  expect(hits, "the remote image request got past the CSP").toBe(0);
  const loaded = await pane(page, 0).locator('.cmp-rendered img').evaluate((img: HTMLImageElement) => img.naturalWidth);
  expect(loaded, "the remote image must not render").toBe(0);
});

test("narrow screens get a note instead of the comparison", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 900 });
  await expect(page.locator("#cmpNarrow")).toBeVisible();
  await expect(page.locator("#cmp")).toBeHidden();
});

test("the viewer and the comparison view link to each other", async ({ page }) => {
  await expect(page.locator("#viewer")).toHaveAttribute("href", "/");
  await page.goto("/");
  await expect(page.locator("#compare")).toHaveAttribute("href", "/compare");
});
