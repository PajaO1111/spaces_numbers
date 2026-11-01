const { test, expect } = require("@playwright/test");

test("local runtime measurements remain reproducible for the atlas and largest explorer views", async ({ page }, testInfo) => {
  const measurements = { environment: "Local PHP, headless Chromium, reduced motion; not a device performance certification", views: [] };
  for (const url of ["/", "/octonion-explorer.php"]) {
    await page.goto(url);
    await expect(page.locator("h1").first()).toBeVisible();
    if (url !== "/") await expect(page.locator("#scene-host canvas")).toBeVisible();
    measurements.views.push(await page.evaluate(() => {
      const navigation = performance.getEntriesByType("navigation")[0];
      const resources = performance.getEntriesByType("resource");
      return {
        path: location.pathname,
        domContentLoadedMs: navigation.domContentLoadedEventEnd,
        loadMs: navigation.loadEventEnd,
        firstContentfulPaintMs: performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? null,
        bodyBytes: navigation.encodedBodySize + resources.reduce((sum, item) => sum + item.encodedBodySize, 0),
        resourceCount: resources.length,
        viewport: [innerWidth, innerHeight],
        devicePixelRatio
      };
    }));
  }
  measurements.frames = [];
  for (const mode of ["Layered", "Universe"]) {
    await page.getByRole("button", { name: mode, exact: true }).click();
    measurements.frames.push({ mode, ...await page.evaluate(() => new Promise(resolve => {
      const intervals = [];
      let previous;
      function sample(time) {
        if (previous !== undefined) intervals.push(time - previous);
        previous = time;
        if (intervals.length < 60) return requestAnimationFrame(sample);
        intervals.sort((a, b) => a - b);
        resolve({ samples: intervals.length, medianMs: intervals[29], p95Ms: intervals[56], maxMs: intervals[59] });
      }
      requestAnimationFrame(sample);
    })) });
  }
  await testInfo.attach("local-runtime-measurements", {
    body: JSON.stringify(measurements, null, 2), contentType: "application/json"
  });
  console.log(`LOCAL_RUNTIME_METRICS ${JSON.stringify(measurements)}`);
});
