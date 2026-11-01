const { defineConfig } = require("@playwright/test");

const php = process.env.PHP_CLI || "php";

module.exports = defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  timeout: 30000,
  expect: { timeout: 7000 },
  use: {
    baseURL: "http://127.0.0.1:4173",
    colorScheme: "dark",
    headless: true,
    reducedMotion: "reduce",
    trace: "retain-on-failure"
  },
  webServer: {
    command: `"${php}" -S 127.0.0.1:4173 -t public`,
    url: "http://127.0.0.1:4173/",
    reuseExistingServer: !process.env.CI,
    timeout: 30000
  }
});
