import { test, expect, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import * as path from "node:path";

const FIXTURES = path.resolve("test/e2e/fixtures");

// Render a fixture through the Finder tool exactly as `mdview` does, and return
// a file:// URL to the generated temp HTML. MDVIEW_NO_OPEN=1 makes mdview print
// the path instead of launching a browser.
function renderViaFinder(fixture: string): string {
  const out = execFileSync("bin/mdview", [path.join(FIXTURES, fixture)], {
    env: { ...process.env, MDVIEW_NO_OPEN: "1" },
    encoding: "utf8",
  }).trim();
  return "file://" + out;
}

// The load-bearing security assertions, run against whichever surface rendered
// the malicious corpus. `window.__pwned` is the proof grep cannot give: if any
// injected payload executed, the browser set the flag and this fails.
async function assertNothingExecuted(page: Page) {
  // 1. No injected script ran.
  const pwned = await page.evaluate(() => (window as unknown as { __pwned?: boolean }).__pwned);
  expect(pwned, "an injected payload executed (window.__pwned was set)").toBeUndefined();

  // 2. No <script> survived sanitisation in the rendered tree.
  expect(await page.locator("#rendered script").count(), "a <script> survived in #rendered").toBe(0);

  // 3. No inline on* event-handler attribute survived.
  const handlerCount = await page.locator("#rendered *").evaluateAll((els) =>
    els.filter((el) => el.getAttributeNames().some((n) => /^on/i.test(n))).length,
  );
  expect(handlerCount, "an inline on* handler survived in #rendered").toBe(0);

  // 4. No javascript: URL survived on a link.
  expect(
    await page.locator('#rendered a[href^="javascript:"]').count(),
    "a javascript: href survived in #rendered",
  ).toBe(0);
}

test.describe("security — untrusted Markdown is interpreted safely", () => {
  test("Finder viewer neutralises the malicious corpus", async ({ page }) => {
    await page.goto(renderViaFinder("malicious.md"));
    await expect(page.locator("#rendered")).toContainText("normal paragraph");
    await assertNothingExecuted(page);
  });

  test("Web app neutralises the malicious corpus (via file input)", async ({ page }) => {
    await page.goto("/");
    await page.setInputFiles("#file", path.join(FIXTURES, "malicious.md"));
    await expect(page.locator("#rendered")).toContainText("normal paragraph");
    await assertNothingExecuted(page);
  });

  test("relative-URL containment holds at runtime (the #18 fix)", async ({ page }) => {
    await page.goto(renderViaFinder("traversal.md"));

    // The safe image next to the file is rewritten to a file:// URL under the
    // source dir (checked on the raw attribute, which the rewrite sets).
    const safeSrc = await page.locator('#rendered img[alt="safe"]').getAttribute("src");
    expect(safeSrc, "safe image should be rewritten to a file:// URL").toMatch(/^file:\/\/.*\/ok\.png$/);

    // The traversal escape is left UNRESOLVED — the raw attribute is never a
    // file:// URL to a file outside the containment root.
    const escapeSrc = await page.locator('#rendered img[alt="escape"]').getAttribute("src");
    expect(escapeSrc, "escape ref must not become a live file:// URL").not.toMatch(/^file:\/\//);
  });
});
