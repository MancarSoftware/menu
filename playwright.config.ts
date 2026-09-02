import { defineConfig, devices } from "@playwright/test";
if (process.env.ALLOW_DATABASE_TESTS !== "1") throw new Error("Use npm run test:e2e with an approved disposable .env.test.");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: "http://127.0.0.1:3107", trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: { command: "npm run dev -- --port 3107", url: "http://127.0.0.1:3107", reuseExistingServer: false, timeout: 120000 },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["iPhone 13"], browserName: "chromium" } },
  ],
});
