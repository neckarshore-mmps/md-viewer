import { test, expect } from "@playwright/test";

// Proportional scroll-sync between the two panes must be a ONE-WAY follow while
// the user is actively driving a pane: the pane the user drives is the "leader",
// and the follower's echoed scroll events must NOT drive the leader back.
//
// The original implementation guarded the echo with a single `syncing` boolean
// reset on the next animation frame. Under trackpad momentum the echoed scroll
// event can arrive AFTER the rAF reset, so the follower drives the leader back;
// the non-idempotent float→int proportional round-trip then nudges the position
// every cycle → the page "keeps scrolling by itself" and fights the user.
//
// These tests encode the invariant that fixes the feedback loop.

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector(".pane.left");
  await page.waitForSelector(".pane.right");
  // Wait until the README has rendered and both panes actually overflow.
  await page.waitForFunction(() => {
    const l = document.querySelector(".pane.left") as HTMLElement | null;
    const r = document.querySelector(".pane.right") as HTMLElement | null;
    if (!l || !r) return false;
    return (l.scrollHeight - l.clientHeight) > 20 && (r.scrollHeight - r.clientHeight) > 20;
  });
});

test("follower pane scroll does not displace the active leader (no feedback loop)", async ({ page }) => {
  // 1. User drives the LEFT pane → left becomes the leader.
  await page.evaluate(() => {
    const left = document.querySelector(".pane.left") as HTMLElement;
    left.scrollTop = Math.min(300, left.scrollHeight - left.clientHeight);
    left.dispatchEvent(new Event("scroll"));
  });
  // Past the old rAF-reset window, still inside a robust leader-hold window.
  await page.waitForTimeout(60);
  const leftAfterLead = await page.evaluate(
    () => (document.querySelector(".pane.left") as HTMLElement).scrollTop
  );
  expect(leftAfterLead).toBeGreaterThan(50);

  // 2. The RIGHT (follower) pane fires a scroll to a very different position —
  //    simulating the echoed/inertial event. It must NOT yank the leader back.
  await page.evaluate(() => {
    const right = document.querySelector(".pane.right") as HTMLElement;
    right.scrollTop = 0;
    right.dispatchEvent(new Event("scroll"));
  });
  await page.waitForTimeout(60);
  const leftFinal = await page.evaluate(
    () => (document.querySelector(".pane.left") as HTMLElement).scrollTop
  );

  expect(Math.abs(leftFinal - leftAfterLead)).toBeLessThanOrEqual(2);
});

test("scrolling one pane still drives the other (sync intact)", async ({ page }) => {
  const rightBefore = await page.evaluate(
    () => (document.querySelector(".pane.right") as HTMLElement).scrollTop
  );

  await page.evaluate(() => {
    const left = document.querySelector(".pane.left") as HTMLElement;
    left.scrollTop = Math.min(300, left.scrollHeight - left.clientHeight);
    left.dispatchEvent(new Event("scroll"));
  });
  await page.waitForTimeout(60);

  const rightAfter = await page.evaluate(
    () => (document.querySelector(".pane.right") as HTMLElement).scrollTop
  );
  // Follower moved proportionally in the same direction.
  expect(rightAfter).toBeGreaterThan(rightBefore + 20);
});
