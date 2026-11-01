const { test, expect } = require("@playwright/test");
const { resolve } = require("node:path");
const { pathToFileURL } = require("node:url");

const worlds = ["n", "z", "q", "r", "c", "h", "o", "irrational"];
const palette = ["#38bdf8", "#4ade80", "#fb923c", "#facc15", "#22d3ee", "#c084fc", "#fb7185", "#facc15"];
const roles = ["--vn-text", "--vn-text-muted", "--vn-interaction", "--vn-error", "--vn-success", "--vn-focus", "--vn-border"];
const surfaces = ["--vn-surface-solid", "--vn-surface-reading", "--vn-surface-lab", "--vn-surface-workspace", "--vn-surface-inset", "--vn-interaction-soft"];

function components(color) {
  const values = color.match(/[\d.]+/g).map(Number);
  return [...values.slice(0, 3), values[3] ?? 1];
}

function contrast(first, second) {
  const luminance = color => color.slice(0, 3).map(value => {
    const scaled = value / 255;
    return scaled <= .04045 ? scaled / 12.92 : ((scaled + .055) / 1.055) ** 2.4;
  }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
  const a = luminance(first), b = luminance(second);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}

async function samples(page) {
  return page.evaluate(({ worlds, roles, surfaces }) => {
    const probe = document.createElement("div");
    probe.style.setProperty("transition", "none", "important");
    document.body.append(probe);
    const color = name => {
      probe.style.color = `var(${name})`;
      return getComputedStyle(probe).color;
    };
    const background = name => {
      probe.style.backgroundColor = `var(${name})`;
      return getComputedStyle(probe).backgroundColor;
    };
    const result = {
      page: background("--vn-page"),
      roles: Object.fromEntries(roles.map(name => [name, color(name)])),
      surfaces: Object.fromEntries(surfaces.map(name => [name, background(name)])),
      palette: worlds.map(world => {
        probe.dataset.world = world;
        return {
          world,
          raw: getComputedStyle(probe).getPropertyValue("--vn-world-edge").trim(),
          text: color("--vn-world-text")
        };
      }),
      font: getComputedStyle(document.documentElement).getPropertyValue("--vn-font-body").trim(),
      radius: getComputedStyle(document.documentElement).getPropertyValue("--vn-radius-card").trim(),
      motion: getComputedStyle(document.documentElement).getPropertyValue("--vn-motion-fast").trim(),
      controlSelected: background("--vn-control-selected"),
      controlDisabledText: color("--vn-control-disabled-text")
    };
    probe.remove();
    return result;
  }, { worlds, roles, surfaces });
}

test("both entry points share theme roles and accessible planned token combinations", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const entries = [];
  for (const url of ["/", "/octonion-explorer.php"]) {
    await page.goto(url);
    await expect(page.locator("h1").first()).toBeVisible();
    const themes = [];
    for (const theme of ["dark", "light"]) {
      await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
      const values = await samples(page);
      expect(values.radius).toBe("18px");
      expect(values.motion).toBe("0s");
      expect(values.controlSelected).toBe(values.surfaces["--vn-interaction-soft"]);
      expect(values.controlDisabledText).toBe(values.roles["--vn-text-muted"]);
      expect(values.font).toContain("system-ui");
      expect(values.palette.map(item => item.raw)).toEqual(palette);
      for (const [surface, css] of Object.entries(values.surfaces)) {
        const rgba = components(css), backdrop = components(values.page);
        const blended = rgba.slice(0, 3).map((value, index) => value * rgba[3] + backdrop[index] * (1 - rgba[3]));
        for (const [role, foreground] of Object.entries(values.roles)) {
          const minimum = ["--vn-focus", "--vn-border"].includes(role) ? 3 : 4.5;
          expect(contrast(components(foreground), blended), `${theme} ${role} on ${surface}`).toBeGreaterThanOrEqual(minimum);
        }
        for (const item of values.palette) {
          expect(contrast(components(item.text), blended), `${theme} world ${item.world} on ${surface}`).toBeGreaterThanOrEqual(4.5);
        }
      }
      themes.push(values);
    }
    entries.push(themes);
  }
  expect(entries[0]).toEqual(entries[1]);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  expect((await samples(page)).motion).toBe(".18s");
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect((await samples(page)).motion).toBe("0s");
  expect(errors).toEqual([]);
});

test("the standalone file atlas loads shared tokens and keeps mathematical interaction", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(pathToFileURL(resolve("wireframe.html")).href);
  expect((await samples(page)).radius).toBe("18px");
  await page.locator('#real-structure [data-symbol="ℂ"]').click();
  await page.locator('[data-lab-example="rotation"]').click();
  await expect(page.locator("#lab-result")).toContainText("-1 + 2i");
  await page.locator("#theme-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect((await samples(page)).palette.find(item => item.world === "c").text).toBe("rgb(21, 94, 117)");
  await expect(page.locator("#complex-plane-view")).toBeVisible();
  expect(errors).toEqual([]);
});
