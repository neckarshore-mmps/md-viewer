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

test("drag to far right collapses raw → rendered full, edge stays inside + grabbable", async ({ page }) => {
  const splitBox = await page.locator(".split").boundingBox();
  if (!splitBox) throw new Error("split not visible");
  await dragDividerToX(page, splitBox.x + splitBox.width);   // far right
  await expect(page.locator("#divider")).toHaveClass(/edge/);

  const rightW = await page.locator(".pane.right").evaluate((el) => el.getBoundingClientRect().width);
  expect(rightW).toBeLessThan(2);   // raw pane collapsed

  // Regression guard: at p=100 the divider must stay INSIDE the container so it
  // remains visible (red) and grabbable — it must not be pushed off the right
  // edge (the bug: left=100% + divider width overflowed the split by ~8px).
  const inside = await page.locator("#divider").evaluate((el) => {
    const d = el.getBoundingClientRect();
    const s = document.querySelector(".split")!.getBoundingClientRect();
    return d.width > 0 && d.left >= s.left && d.right <= s.right + 1;
  });
  expect(inside).toBe(true);
});

test("drag back inward from the right edge leaves the edge state", async ({ page }) => {
  const splitBox = await page.locator(".split").boundingBox();
  if (!splitBox) throw new Error("split not visible");
  await dragDividerToX(page, splitBox.x + splitBox.width);
  await expect(page.locator("#divider")).toHaveClass(/edge/);
  await dragDividerToX(page, splitBox.x + splitBox.width / 2);
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

test("mobile: divider hidden, tabs switch panes", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await expect(page.locator("#divider")).toBeHidden();
  const tabs = page.locator(".viewtabs");
  await expect(tabs).toBeVisible();

  // default = rendered visible, raw hidden
  await expect(page.locator(".pane.left")).toBeVisible();
  await expect(page.locator(".pane.right")).toBeHidden();

  await page.click('.viewtab[data-view="raw"]');
  await expect(page.locator(".pane.right")).toBeVisible();
  await expect(page.locator(".pane.left")).toBeHidden();
  expect(await page.getAttribute('.viewtab[data-view="raw"]', "aria-selected")).toBe("true");
});
