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

test("all eight worlds have three distinct structured reading levels in both themes", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  for (const theme of ["dark", "light"]) {
    if (theme === "light") await page.locator("#theme-toggle").click();
    for (const symbol of ["ℕ", "ℤ", "ℚ", "ℝ∖ℚ", "ℝ", "ℂ", "ℍ", "𝕆"]) {
      if (symbol === "𝕆") {
        await page.getByRole("button", { name: "Zpět do komplexní roviny" }).click();
      }
      await page.locator(`.map-node[data-symbol="${symbol}"]:visible`).first().click();
      const texts = new Set();
      for (const level of ["zakladni", "pokrocila", "akademicka"]) {
        const button = page.locator(`.level-button[data-level="${level}"]`);
        await button.focus();
        await page.keyboard.press("Enter");
        await expect(button).toBeFocused();
        await expect(button).toHaveAttribute("aria-pressed", "true");
        await expect(page.locator("#depth-detail section")).toHaveCount(3);
        await expect(page.locator("#depth-detail h4")).toHaveText([
          "Hlavní myšlenka", "Příklad a souvislost", "Hranice a další krok"
        ]);
        const paragraphs = await page.locator("#depth-detail p").allTextContents();
        expect(paragraphs.every(text => text.length > 35)).toBe(true);
        texts.add(paragraphs.join("\n"));
      }
      expect(texts.size).toBe(3);
      for (const width of [320, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      }
    }
    await page.getByRole("button", { name: "Zpět do komplexní roviny" }).click();
    await page.getByRole("button", { name: "Zpět na reálná čísla" }).click();
  }
  await page.locator('.map-node[data-symbol="ℕ"]:visible').first().click();
  await page.locator('.level-button[data-level="pokrocila"]').click();
  await page.locator("#natural-zero").check();
  await expect(page.locator("#depth-detail")).toContainText("0 ∈ ℕ");
  await page.locator("#natural-zero").uncheck();
  await expect(page.locator("#depth-detail")).toContainText("0 ∉ ℕ");
  expect(errors).toEqual([]);
});

test("keyboard operation preserves exact fractions, explains rotation and recovers from invalid input", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await page.locator('#real-structure [data-symbol="ℂ"]').focus();
  await page.keyboard.press("Enter");
  const rotation = page.locator('[data-lab-example="rotation"]');
  await rotation.focus();
  await page.keyboard.press("Space");
  await expect(page.locator("#lab-result")).toContainText("-1 + 2i");
  await expect(page.locator("#lab-geometry")).toContainText("otočení ≈ 90°");
  await expect(page.locator("#lab-geometry")).toContainText("2,236068 → 2,236068");
  await expect(page.locator("#lab-polar tr")).toHaveCount(3);
  await expect(page.locator("#lab-polar tr").nth(1)).toContainText("90°");
  const table = page.getByRole("region", { name: "Moduly a argumenty komplexních čísel" });
  await table.focus();
  await page.keyboard.press("ArrowRight");
  await expect(table).toBeFocused();
  for (const theme of ["dark", "light"]) {
    if (theme === "light") await page.locator("#theme-toggle").click();
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    }
  }
  await page.locator("#lab-a").fill("1/2");
  await page.locator("#lab-b").fill("0");
  await page.locator("#lab-c").fill("1/3");
  await page.locator("#lab-d").fill("0");
  await page.locator("#complex-operation").selectOption("add");
  await expect(page.locator("#lab-result")).toContainText("5/6");
  await page.locator("#lab-a").fill("nonsense");
  await expect(page.locator("#lab-a")).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#lab-error")).not.toBeEmpty();
  await expect(page.locator("#lab-polar tr")).toHaveCount(0);
  await expect(page.locator("#lab-valid")).toBeHidden();
  await page.locator("#lab-a").fill("0");
  await page.locator("#lab-c").fill("0");
  await page.locator("#complex-operation").selectOption("divide");
  await expect(page.locator("#lab-error")).not.toBeEmpty();
  await expect(page.locator("#lab-valid")).toBeHidden();
  await page.locator("#complex-operation").selectOption("multiply");
  await expect(page.locator("#lab-error")).toBeEmpty();
  await expect(page.locator("#lab-valid")).toBeVisible();
  await expect(page.locator("#lab-polar tr")).toHaveCount(3);
  await expect(page.locator("#lab-polar tr").first()).toContainText("Nedefinován");
  expect(errors).toEqual([]);
});
