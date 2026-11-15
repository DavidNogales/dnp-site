import { test, expect } from "@playwright/test";

// No test may send a real form submission or contact a third-party service.
test.beforeEach(async ({ context }) => {
  await context.route("**/*", route => {
    const url = new URL(route.request().url());
    return url.hostname === "127.0.0.1" ? route.continue() : route.abort();
  });
});

test("navigation preserves theme and initializes each toggle once", async ({ page }) => {
  await page.goto("/");
  const initial = await page.locator("html").getAttribute("data-theme");
  const other = initial === "dark" ? "light" : "dark";
  await page.getByRole("button", { name: `Switch to ${other} theme` }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", other);
  for (const name of ["Projects", "Blog", "CV", "Contact", "Home"]) {
    await page.getByRole("navigation").getByRole("link", { name, exact: true }).click();
    await expect(page.getByRole("navigation").locator('[aria-current="page"]')).toHaveText(name);
    await expect(page.locator("html")).toHaveAttribute("data-theme", other);
    // A duplicate handler would toggle twice and leave the theme unchanged.
    await page.getByRole("button", { name: `Switch to ${initial} theme` }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", initial!);
    await page.getByRole("button", { name: `Switch to ${other} theme` }).click();
  }
  await page.goBack();
  await expect(page.getByRole("navigation").locator('[aria-current="page"]')).toHaveText("Contact");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", other);
});

test("text and theme controls work before fonts finish downloading", async ({ page }) => {
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route(/\.woff2(?:\?|$)/, async route => {
    await held;
    await route.continue();
  });
  try {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.fonts.status)).toBe("loading");
    const before = await page.locator("html").getAttribute("data-theme");
    await page.locator(".theme-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", before === "dark" ? "light" : "dark");
  } finally {
    release();
  }
  await page.evaluate(() => document.fonts.ready);
  const fonts = await page.evaluate(() => Array.from(document.fonts).map(f => ({ family: f.family, status: f.status })));
  for (const family of ["Space Grotesk", "Inconsolata"]) {
    expect(fonts.some(f => f.family.replaceAll('"', "") === family && f.status === "loaded")).toBe(true);
  }
});

test("math CSS loads only on the math article, including client navigation", async ({ page }) => {
  await page.goto("/blog/");
  await expect(page.locator('link[rel="stylesheet"]')).toHaveCount(0);
  await expect(page.locator('style[data-math="katex"]')).toHaveCount(0);
  await page.getByRole("link", { name: "Why this site stays small" }).click();
  await expect(page.locator(".katex")).toBeVisible();
  await expect(page.locator(".katex")).toHaveCSS("font-family", /KaTeX_Main/);
  await expect(page.locator('link[rel="stylesheet"]')).toHaveCount(0);
  await expect(page.locator('style[data-math="katex"]')).toHaveCount(1);
  await page.getByRole("navigation").getByRole("link", { name: "Blog", exact: true }).click();
  await expect(page.locator('style[data-math="katex"]')).toHaveCount(0);
  await page.getByRole("link", { name: "A checklist for daily data pipelines" }).click();
  await expect(page.locator('link[rel="stylesheet"]')).toHaveCount(0);
  await expect(page.locator('style[data-math="katex"]')).toHaveCount(0);
});

test("layouts fit viewport and text accents meet contrast", async ({ page }) => {
  for (const path of ["/", "/projects/", "/blog/", "/cv/", "/contact/", "/blog/welcome/"]) {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    const result = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      const luminance = (hex: string) => {
        const rgb = hex.trim().replace("#", "").match(/../g)!.map(c => parseInt(c, 16) / 255)
          .map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
        return rgb[0]! * .2126 + rgb[1]! * .7152 + rgb[2]! * .0722;
      };
      const contrasts = ["--accent", "--accent-hover", "--muted", "--text"].flatMap(fg =>
        ["--bg", "--surface"].map(bg => {
          const a = luminance(style.getPropertyValue(fg)), b = luminance(style.getPropertyValue(bg));
          return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
        }));
      return { overflow: document.documentElement.scrollWidth > innerWidth, contrasts };
    });
    expect(result.overflow, path).toBe(false);
    for (const contrast of result.contrasts) expect(contrast, path).toBeGreaterThanOrEqual(4.5);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  }
});


test("reduced motion disables movement and PDF remains available", async ({ page, request }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");
  await page.getByRole("navigation").getByRole("link", { name: "CV", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const href = await page.getByRole("link", { name: /Download PDF/ }).getAttribute("href");
  const pdf = await request.get(href!);
  expect(pdf.ok()).toBe(true);
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
});
