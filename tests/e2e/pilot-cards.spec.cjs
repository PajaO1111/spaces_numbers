const { test, expect } = require("@playwright/test");

test("the two pilot cards preserve world identity, keyboard focus and laboratory states", async ({ page }, testInfo) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator(".pilot-card")).toHaveCount(2);
  await expect(page.locator(".pilot-atmosphere")).toHaveAttribute("aria-hidden", "true");
  expect(await page.locator(".pilot-atmosphere").evaluate(element => getComputedStyle(element).pointerEvents)).toBe("none");
  for (const theme of ["dark", "light"]) {
    if (theme === "light") await page.locator("#theme-toggle").click();
    for (const [symbol, world] of [["ℕ", "n"], ["ℤ", "z"], ["ℚ", "q"], ["ℝ∖ℚ", "irrational"], ["ℝ", "r"], ["ℂ", "c"]]) {
      await page.locator(`.map-node[data-symbol="${symbol}"]:visible`).first().click();
      await expect(page.locator(".pilot-card--reading")).toHaveAttribute("data-world", world);
      await expect(page.locator("#depth-world")).toContainText(symbol);
    }
    for (const [symbol, world] of [["ℍ", "h"], ["𝕆", "o"]]) {
      await page.locator(`#complex-plane-view [data-symbol="${symbol}"]`).click();
      await expect(page.locator(".pilot-card--reading")).toHaveAttribute("data-world", world);
      await expect(page.locator("#depth-world")).toContainText(symbol);
      await page.getByRole("button", { name: "Zpět do komplexní roviny" }).click();
    }
    await page.locator('.level-button[data-level="akademicka"]').focus();
    await page.keyboard.press("Enter");
    await expect(page.locator('.level-button[data-level="akademicka"]')).toBeFocused();
    await expect(page.locator("#depth-detail section")).toHaveCount(3);
    const style = await page.locator(".pilot-card--reading").evaluate(element => {
      const css = getComputedStyle(element);
      return { opacity: css.opacity, radius: css.borderRadius, edge: css.borderTopWidth, shadow: css.boxShadow,
        bottom: css.borderBottomWidth, left: css.borderLeftWidth, right: css.borderRightWidth, background: css.backgroundImage };
    });
    expect(style.opacity).toBe("1");
    expect(style.radius).toBe("18px");
    expect(style.edge).toBe("1px");
    expect([style.bottom, style.left, style.right]).toEqual(["1px", "1px", "1px"]);
    expect(style.background).toContain("linear-gradient");
    expect(style.shadow).not.toBe("none");
    await page.locator('[data-lab-example="rotation"]').click();
    await expect(page.locator("#lab-result")).toContainText("-1 + 2i");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => {
      for (const link of document.querySelectorAll('link[href$="card-materials.css"], link[href$="pilot-cards.css"]')) {
        link.sheet.disabled = true;
      }
    });
    for (const kind of ["reading", "lab"]) {
      const image = await page.locator(`.pilot-card--${kind}`).screenshot({
        path: testInfo.outputPath(`${theme}-1440-${kind}-previous-material.png`)
      });
      await testInfo.attach(`${theme}-${kind}-previous-material`, { body: image, contentType: "image/png" });
    }
    await page.evaluate(() => {
      for (const link of document.querySelectorAll('link[href$="card-materials.css"], link[href$="pilot-cards.css"]')) {
        link.sheet.disabled = false;
      }
    });
    for (const width of [1440, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      await page.locator(".pilot-card--reading").scrollIntoViewIfNeeded();
      const context = await page.screenshot({ path: testInfo.outputPath(`${theme}-${width}-atmosphere.png`) });
      await testInfo.attach(`${theme}-${width}-atmosphere`, { body: context, contentType: "image/png" });
      for (const kind of ["reading", "lab"]) {
        const card = page.locator(`.pilot-card--${kind}`);
        const image = await card.screenshot({ path: testInfo.outputPath(`${theme}-${width}-${kind}.png`) });
        await testInfo.attach(`${theme}-${width}-${kind}`, { body: image, contentType: "image/png" });
      }
    }
    await page.locator("#lab-a").fill("invalid");
    await expect(page.locator("#lab-a")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#lab-error")).toBeVisible();
    await expect(page.locator("#lab-valid")).toBeHidden();
    await page.locator('[data-lab-example="fractions"]').click();
    await expect(page.locator("#lab-result")).toContainText("5/6");
    await expect(page.locator("#lab-error")).toBeHidden();
    await page.locator("#back-to-real").focus();
    await page.keyboard.press("Enter");
    await expect(page.locator('#real-structure [data-symbol="ℝ"]')).toBeFocused();
  }
  expect(errors).toEqual([]);
});
