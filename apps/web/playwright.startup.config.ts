import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({ ...base, testIgnore: [], testMatch: "**/startup.spec.ts",
  outputDir: "../../.artifacts/ui-audit/startup-browser",
  reporter: [["list"], ["html", { outputFolder: "../../.artifacts/ui-audit/startup-report", open: "never" }]],
  webServer: {
  command: "node e2e/server.mjs", url: "http://127.0.0.1:3100/dashboard", timeout: 120_000, reuseExistingServer: false,
  env: { PORTAL_STARTUP_ENABLED: "true" },
} });
