const { test, expect } = require("@playwright/test");

test("the quaternion lab links algebra, 3D rotation and documented applications", async ({ page }) => {
  await page.goto("/");
  await page.locator('#real-structure [data-symbol="ℂ"]').click();
  await page.locator('#complex-plane-view [data-symbol="ℍ"]').click();
  await expect(page.locator("#higher-dimension-view")).toBeVisible();

  await page.locator('.mode-button[data-mode="algebra"]').click();
  await page.locator('[data-quaternion-example="ij"]').click();
  await expect(page.locator("#quaternion-results")).toContainText("k");
  await expect(page.locator("#quaternion-results")).toContainText("-1k");

  await page.locator('.mode-button[data-mode="geometrie"]').click();
  await page.locator("#rotation-angle").evaluate(element => {
    element.value = "90";
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(page.locator("#rotation-value")).toHaveText("90°");
  await expect(page.locator("#quaternion-cube")).toBeVisible();
  await expect(page.locator("#quaternion-vector-result")).not.toBeEmpty();

  await page.locator('.mode-button[data-mode="pouziti"]').click();
  await expect(page.getByRole("link", { name: "PX4 VehicleAttitude" })).toBeVisible();
  await expect(page.getByRole("link", { name: "NASA/JPL SPICE" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Unity" })).toBeVisible();
});
