import { defineConfig } from "@playwright/test";

// Point at a SANDBOX dashboard (throwaway HERMES_HOME), never the live one: the spec
// expects a seeded task. See README.md.
export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.mjs",
  timeout: 30000,
  use: {
    baseURL: process.env.KANBAN_E2E_URL || "http://127.0.0.1:9229",
    headless: true,
    // Optional: reuse an already-installed Chromium instead of downloading the pinned build.
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
});
