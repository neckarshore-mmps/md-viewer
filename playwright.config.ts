import { defineConfig, devices } from "@playwright/test";

// Dev-only e2e/security layer. Chromium only (YAGNI — see the design spec).
// The web app is served by a plain static server over web/; Finder-viewer tests
// load mdview-generated temp files directly over file:// (no server needed).
// Port is env-overridable (PW_PORT) so a run never collides with a sibling
// session already holding the default port (e.g. another MMP's preview server).
const PORT = Number(process.env.PW_PORT) || 4173;

export default defineConfig({
  testDir: "./test/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  // 'list' (not 'html') so a run never spawns a blocking report server.
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `python3 -m http.server ${PORT} --directory web`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
