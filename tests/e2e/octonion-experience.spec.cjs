const { test, expect } = require("@playwright/test");

test("octonion structure connects Fano multiplication to the standalone explorer", async ({ page }) => {
  await page.goto("/");
  await page.locator('#real-structure [data-symbol="ℂ"]').click();
  await page.locator('#complex-plane-view [data-symbol="𝕆"]').click();
  await page.locator('.mode-button[data-mode="struktura"]').click();
  await expect(page.locator("#structure-associator")).toContainText("norma = 2");

  await page.locator("#structure-open-fano").click();
  await expect(page.locator("#fano-plane")).toBeVisible();
  await page.locator('.fano-node[data-unit="e1"]').click();
  await page.locator('.fano-node[data-unit="e2"]').click();
  await expect(page.locator("#fano-product")).toContainText("e₁ × e₂ = e₃");

  await page.locator('a[href="octonion-explorer.php"]').click();
  await expect(page).toHaveURL(/\/octonion-explorer\.php$/);
  await expect(page.getByRole("heading", { name: "Oktonionový explorátor" })).toBeVisible();
  await expect(page.locator("#combination-statistics")).toContainText("35");

  for (const mode of ["Layered", "Incidence", "Fano", "Oktoniony", "Asociátor", "Universe"]) {
    await page.getByRole("button", { name: mode, exact: true }).click();
    await expect(page.locator(".mode-button[aria-pressed=true]")).toHaveCount(1);
    await expect(page.locator("#scene-host canvas")).toHaveCount(1);
  }
  await page.getByRole("button", { name: "Světlý režim" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const dimensions = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth
    }));
    expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
  }
});

test("the explorer keeps textual navigation when WebGL is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (String(type).startsWith("webgl")) return null;
      return originalGetContext.call(this, type, ...args);
    };
  });
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));

  await page.goto("/octonion-explorer.php");
  await expect(page.locator(".webgl-error")).toContainText("3D vykreslení není dostupné");
  await expect(page.locator("#mode-controls")).toContainText("základní expozici");
  await expect(page.locator(".mode-nav .mode-button").first()).toBeDisabled();
  expect(pageErrors).toEqual([]);
});
