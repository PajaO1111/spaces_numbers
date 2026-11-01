const { test, expect } = require("@playwright/test");

test("the number map opens the complex plane and calculates geometric operations", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Vesmír čísel — základní expozice");
  await page.locator("#theme-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.locator("#theme-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.locator('#real-structure [data-symbol="ℂ"]').click();
  await expect(page.locator("#complex-plane-view")).toBeVisible();
  await expect(page.locator("#complex-view-title")).toContainText("Komplexní rovina");

  await page.locator("#lab-a").fill("2");
  await page.locator("#lab-b").fill("3");
  await page.locator("#lab-c").fill("1");
  await page.locator("#lab-d").fill("2");
  await page.locator("#complex-operation").selectOption("multiply");
  await expect(page.locator("#lab-results")).toContainText("-4");
  await expect(page.locator("#lab-results")).toContainText("7i");

  await page.locator('[data-lab-example="rotation"]').click();
  await expect(page.locator("#lab-results")).toContainText("otočení");
  await page.getByRole("button", { name: "Zpět na reálná čísla" }).click();
  await expect(page.locator("#real-structure")).toBeVisible();
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const dimensions = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth
    }));
    expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
  }

  const unlabeledControls = await page.locator("input, select, textarea").evaluateAll(elements =>
    elements.filter(element => !element.labels?.length &&
      !element.getAttribute("aria-label") &&
      !element.getAttribute("aria-labelledby")).map(element => element.id || element.tagName)
  );
  expect(unlabeledControls).toEqual([]);
});
