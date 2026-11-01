const { test, expect } = require("@playwright/test");

async function surfaceState(page, selector) {
  return page.locator(selector).evaluateAll(elements => elements.map(element => {
    const style = getComputedStyle(element);
    return {
      material: style.getPropertyValue("--vn-card-material").trim(),
      border: style.borderTopWidth,
      radius: style.borderTopLeftRadius,
      opacity: style.opacity,
      blur: style.backdropFilter,
      image: style.backgroundImage
    };
  }));
}

test("atlas and explorer use shared card and inset roles in both themes", async ({ page }) => {
  for (const url of ["/", "/octonion-explorer.php"]) {
    await page.goto(url);
    await expect(page.locator("h1").first()).toBeVisible();
    for (const theme of ["dark", "light"]) {
      await page.evaluate(value => document.documentElement.dataset.theme = value, theme);
      const tokens = await page.evaluate(() => ({
        reading: getComputedStyle(document.documentElement).getPropertyValue("--vn-surface-reading").trim(),
        lab: getComputedStyle(document.documentElement).getPropertyValue("--vn-surface-lab").trim(),
        workspace: getComputedStyle(document.documentElement).getPropertyValue("--vn-surface-workspace").trim()
      }));
      const roles = await surfaceState(page, ".vn-card-surface");
      expect(roles.length, `${url} ${theme} surfaces`).toBeGreaterThanOrEqual(url === "/" ? 10 : 2);
      for (const role of roles) {
        expect(role.border).toBe("1px");
        expect(role.radius).toBe("18px");
        expect(role.opacity).toBe("1");
      }

      const reading = await surfaceState(page, ".vn-card-surface--reading");
      expect(reading.length).toBeGreaterThan(0);
      expect(reading.every(role => role.material === tokens.reading && role.blur === "blur(6px)")).toBe(true);

      const workspace = await surfaceState(page, ".vn-card-surface--workspace");
      expect(workspace.length).toBeGreaterThan(0);
      expect(workspace.every(role => role.material === tokens.workspace && role.blur === "none" && role.image === "none")).toBe(true);

      const insets = await surfaceState(page, ".vn-inset-surface");
      expect(insets.length).toBeGreaterThan(0);
      expect(insets.every(role => role.radius === "14px" && role.opacity === "1")).toBe(true);
      if (url === "/") {
        const labs = await surfaceState(page, ".vn-card-surface--lab");
        expect(labs.length).toBeGreaterThan(0);
        expect(labs.every(role => role.material === tokens.lab && role.blur === "blur(6px)")).toBe(true);
      }
    }

    if (url !== "/") {
      await page.getByRole("button", { name: "Fano", exact: true }).click();
      await expect(page.locator(".control-card.vn-inset-surface")).toBeVisible();
      await expect(page.locator("#scene-host canvas")).toBeVisible();
      await page.evaluate(() => document.documentElement.dataset.theme = "dark");
      await page.getByRole("button", { name: "Světlý režim" }).click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
      await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#f5f7fa");
    }
  }
});
