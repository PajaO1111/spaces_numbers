const { test, expect } = require("@playwright/test");

function contrast(a, b) {
  const luminance = rgb => rgb.slice(0, 3).map(value => {
    const c = value / 255;
    return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
  }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}

async function renderedContrast(page, selector) {
  const card = page.locator(selector);
  await card.scrollIntoViewIfNeeded();
  const samples = await card.evaluate(element => {
    const origin = element.getBoundingClientRect();
    return [...element.querySelectorAll("h3, h4, p, label, legend, button, th, td, summary, .pilot-world")].flatMap(node => {
      const rect = node.getBoundingClientRect();
      if (!rect.width || !rect.height || !node.textContent.trim()) return [];
      const scrollRegion = node.closest(".table-wrap");
      const visible = scrollRegion ? scrollRegion.getBoundingClientRect() : origin;
      const left = Math.max(rect.left, visible.left, origin.left);
      const right = Math.min(rect.right, visible.right, origin.right);
      if (right - left < 12) return [];
      const css = getComputedStyle(node);
      return [{ label: node.id || node.textContent.trim().slice(0, 45),
        color: css.color.match(/[\d.]+/g).slice(0, 3).map(Number),
        x: (left + right) / 2 - origin.left,
        y: rect.top - origin.top + rect.height / 2 }];
    });
  });
  const hideText = await page.addStyleTag({ content:
    `${selector} * { color: transparent !important; text-shadow: none !important; }`
  });
  let png;
  try { png = await card.screenshot(); } finally { await hideText.evaluate(element => element.remove()); }
  return page.evaluate(async ({ encoded, samples }) => {
    const image = new Image();
    image.src = `data:image/png;base64,${encoded}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width; canvas.height = image.height;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0);
    return samples.map(sample => ({ ...sample,
      background: [...context.getImageData(Math.floor(sample.x), Math.floor(sample.y), 1, 1).data].slice(0, 3)
    }));
  }, { encoded: png.toString("base64"), samples });
}

test("rendered pilot text meets contrast thresholds in both themes and error states", async ({ page }, testInfo) => {
  test.setTimeout(90000);
  await page.goto("/");
  const measurements = [];
  for (const theme of ["dark", "light"]) {
    if (theme === "light") await page.locator("#theme-toggle").click();
    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const symbol of ["ℕ", "ℤ", "ℚ", "ℝ∖ℚ", "ℝ", "ℂ"]) {
        await page.locator(`.map-node[data-symbol="${symbol}"]:visible`).first().click();
        await page.locator('.level-button[data-level="akademicka"]').click();
        const samples = await renderedContrast(page, ".pilot-card--reading");
        for (const sample of samples) {
          const ratio = contrast(sample.color, sample.background);
          measurements.push({ theme, width, symbol, label: sample.label, ratio });
          expect(ratio, `${theme} ${width} ${symbol} ${sample.label}`).toBeGreaterThanOrEqual(4.5);
        }
      }
      for (const symbol of ["ℍ", "𝕆"]) {
        await page.locator(`#complex-plane-view [data-symbol="${symbol}"]`).click();
        for (const sample of await renderedContrast(page, ".pilot-card--reading")) {
          const ratio = contrast(sample.color, sample.background);
          measurements.push({ theme, width, symbol, label: sample.label, ratio });
          expect(ratio, `${theme} ${width} ${symbol} ${sample.label}`).toBeGreaterThanOrEqual(4.5);
        }
        await page.locator("#back-to-complex").click();
      }
      for (const invalid of [false, true]) {
        await page.locator('[data-lab-example="rotation"]').click();
        if (invalid) await page.locator("#lab-a").fill("invalid");
        for (const sample of await renderedContrast(page, ".pilot-card--lab")) {
          const ratio = contrast(sample.color, sample.background);
          measurements.push({ theme, width, invalid, label: sample.label, ratio });
          expect(ratio, `${theme} ${width} lab ${sample.label}`).toBeGreaterThanOrEqual(4.5);
        }
      }
      await page.locator("#back-to-real").click();
    }
  }
  await testInfo.attach("rendered-contrast", { body: JSON.stringify(measurements, null, 2), contentType: "application/json" });
  console.log(`PILOT_CONTRAST samples=${measurements.length} minimum=${Math.min(...measurements.map(item => item.ratio)).toFixed(3)}`);
});

test("pilot reflows with enlarged text and retains a usable keyboard sequence", async ({ page }) => {
  await page.goto("/");
  await page.locator('#real-structure [data-symbol="ℂ"]').focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#complex-view-title")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator("#back-to-real")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator("#lab-a")).toBeFocused();
  const outline = await page.locator("#lab-a").evaluate(element => getComputedStyle(element).outlineWidth);
  expect(outline).toBe("3px");
  for (const theme of ["dark", "light"]) {
    if (theme === "light") await page.locator("#theme-toggle").click();
    await page.keyboard.press("Tab");
    await page.locator("#lab-a").focus();
    await expect.poll(() => page.locator("#lab-a").evaluate(element => getComputedStyle(element).outlineWidth)).toBe("3px");
    const controls = await page.locator("#lab-a").evaluate(element => {
      const css = getComputedStyle(element);
      const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number);
      return { border: rgb(css.borderTopColor), focus: rgb(css.outlineColor),
        inside: rgb(css.backgroundColor), outside: rgb(getComputedStyle(element.closest("fieldset")).backgroundColor) };
    });
    for (const background of [controls.inside, controls.outside]) {
      expect(contrast(controls.border, background)).toBeGreaterThanOrEqual(3);
      expect(contrast(controls.focus, background)).toBeGreaterThanOrEqual(3);
    }
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => document.documentElement.style.fontSize = "200%");
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
      await expect(page.locator("#lab-a")).toBeVisible();
      await page.locator('[data-lab-example="fractions"]').click();
      await expect(page.locator("#lab-result")).toContainText("5/6");
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
      await page.evaluate(() => document.documentElement.style.fontSize = "");
    }
  }
  // CSS layout zoom exercises reflow, but is not a certification of browser UI zoom.
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.evaluate(() => document.body.style.zoom = "4");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.evaluate(() => document.body.style.zoom = "");
});

test("opaque fallback and reduced motion keep the pilot operable without decorative animation", async ({ page }) => {
  await page.route("**/card-materials.css", async route => {
    const response = await route.fetch();
    const css = (await response.text()).replace("@supports (backdrop-filter: blur(1px))", "@supports (unsupported-pilot-property: true)");
    await route.fulfill({ response, body: css });
  });
  await page.goto("/");
  await page.locator('#real-structure [data-symbol="ℂ"]').click();
  for (const theme of ["dark", "light"]) {
    if (theme === "light") await page.locator("#theme-toggle").click();
    await expect.poll(() => page.locator(".pilot-card--reading").evaluate(element => getComputedStyle(element).backgroundColor))
      .toBe(theme === "dark" ? "rgb(23, 35, 52)" : "rgb(255, 255, 255)");
    const styles = await page.locator(".pilot-card").evaluateAll(elements => elements.map(element => {
      const css = getComputedStyle(element);
      return { background: css.backgroundColor, blur: css.backdropFilter, image: css.backgroundImage };
    }));
    for (const style of styles) {
      expect(style.background).toBe(theme === "dark" ? "rgb(23, 35, 52)" : "rgb(255, 255, 255)");
      expect(style.blur).toBe("none");
      expect(style.image).toBe("none");
    }
    await page.locator('[data-lab-example="zero"]').click();
    await expect(page.locator("#lab-polar")).toContainText("Nedefinován");
    await page.locator("#complex-operation").selectOption("divide");
    await page.locator("#lab-c").fill("0");
    await page.locator("#lab-d").fill("0");
    await expect(page.locator("#lab-error")).toBeVisible();
    await page.locator('[data-lab-example="rotation"]').click();
    await expect(page.locator("#lab-result")).toContainText("-1 + 2i");
  }
  for (const motion of ["reduce", "no-preference"]) {
    await page.emulateMedia({ reducedMotion: motion });
    expect(await page.locator(".pilot-atmosphere").evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
  }
});
