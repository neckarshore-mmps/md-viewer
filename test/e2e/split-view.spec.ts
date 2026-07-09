import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => { await page.goto("/"); });

async function dragDividerToX(page: import("@playwright/test").Page, targetX: number) {
  const box = await page.locator("#divider").boundingBox();
  if (!box) throw new Error("divider not visible");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetX, box.y + box.height / 2, { steps: 12 });
  await page.mouse.up();
}

test("drag to far left collapses rendered → raw full, edge is red-flagged", async ({ page }) => {
  await dragDividerToX(page, 0);
  await expect(page.locator("#divider")).toHaveClass(/edge/);
  const leftW = await page.locator(".pane.left").evaluate((el) => el.getBoundingClientRect().width);
  expect(leftW).toBeLessThan(2);
});

test("drag back inward leaves the edge state", async ({ page }) => {
  await dragDividerToX(page, 0);
  await expect(page.locator("#divider")).toHaveClass(/edge/);
  const mid = await page.locator(".split").evaluate((el) => el.getBoundingClientRect().width / 2);
  await dragDividerToX(page, mid);
  await expect(page.locator("#divider")).not.toHaveClass(/edge/);
});

test("double-click resets to ~50/50 and clears the edge", async ({ page }) => {
  await dragDividerToX(page, 0);
  await expect(page.locator("#divider")).toHaveClass(/edge/);
  await page.locator("#divider").dblclick();
  await expect(page.locator("#divider")).not.toHaveClass(/edge/);
  const ratio = await page.evaluate(() => {
    const split = document.querySelector(".split")!.getBoundingClientRect().width;
    const left = document.querySelector(".pane.left")!.getBoundingClientRect().width;
    return left / split;
  });
  expect(ratio).toBeGreaterThan(0.45);
  expect(ratio).toBeLessThan(0.55);
});

test("keyboard: End collapses, arrow restores, Enter resets", async ({ page }) => {
  const divider = page.locator("#divider");
  await divider.focus();
  await page.keyboard.press("End");
  await expect(divider).toHaveClass(/edge/);
  expect(await divider.getAttribute("aria-valuenow")).toBe("100");

  await page.keyboard.press("ArrowLeft");        // 100 → 98, off the edge
  await expect(divider).not.toHaveClass(/edge/);

  await page.keyboard.press("Enter");            // reset to 50
  expect(await divider.getAttribute("aria-valuenow")).toBe("50");
});
