import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e", fullyParallel: false, workers: 1, timeout: 60_000,
  testIgnore: "**/startup.spec.ts",
  outputDir: "../../.artifacts/ui-audit/browser",
  reporter: [["list"], ["html", { outputFolder: "../../.artifacts/ui-audit/report", open: "never" }]],
  use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: { command: "node e2e/server.mjs", url: "http://127.0.0.1:3100/dashboard", timeout: 120_000, reuseExistingServer: false },
});
