import { test, expect } from "@playwright/test";

// Real click-through of the web app's controls. Grep tests see "button present"
// but never execute it — this is the gap that shipped a dead light/dark toggle
// (fixed in #12). Every control is clicked and its observable effect asserted.

const root = "html";
const attr = (page: import("@playwright/test").Page, name: string) =>
  page.evaluate((n) => document.documentElement.getAttribute(n), name);

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("light/dark toggle flips data-mode", async ({ page }) => {
  const before = await attr(page, "data-mode");
  await page.click("#mode");
  const after = await attr(page, "data-mode");
  expect(after, "data-mode should flip on toggle").not.toBe(before);
  expect(["light", "dark"]).toContain(after);
});

test("theme dropdown opens, selects, and closes", async ({ page }) => {
  const list = page.locator("#themeMenuList");
  await expect(list).toBeHidden();

  await page.click("#themeMenuBtn");
  await expect(list, "menu should open on click").toBeVisible();

  // Pick the theme that is not currently active so data-theme demonstrably changes.
  const current = await attr(page, "data-theme");
  const target = current === "swiss" ? "minimalist" : "swiss";
  await page.click(`.theme-opt[data-theme="${target}"]`);

  expect(await attr(page, "data-theme"), "data-theme should apply the picked theme").toBe(target);
  await expect(list, "menu should close after selection").toBeHidden();
});

test("readme / changelog content swap", async ({ page }) => {
  const rendered = page.locator("#rendered");
  await expect(rendered).toContainText(/Markdown/i); // README default

  await page.click("#changelog");
  await expect(rendered, "changelog view should render the changelog").toContainText(/Changelog/i);

  await page.click("#readme");
  await expect(rendered, "readme view should render the README again").toContainText(/Markdown/i);
});

test("toolbar buttons each render a non-empty icon", async ({ page }) => {
  for (const sel of ["#open", "#readme", "#howto", "#mode", "#themeMenuBtn"]) {
    const svg = page.locator(`${sel} svg`).first();
    await expect(svg, `${sel} should contain an svg`).toHaveCount(1);
    const box = await svg.boundingBox();
    expect(box && box.width > 0 && box.height > 0, `${sel} icon should be visible`).toBeTruthy();
  }
  await expect(page.locator("#readme")).toContainText("Readme");
});
