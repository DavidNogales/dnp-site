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

test("contact validates locally and posts natively after client navigation", async ({ page }) => {
  let submissions = 0;
  await page.route("https://formspree.io/**", async route => {
    submissions++;
    const request = route.request();
    expect(request.url()).toBe("https://formspree.io/f/test-form");
    expect(request.method()).toBe("POST");
    expect(request.isNavigationRequest()).toBe(true);
    expect(request.headers().accept).toContain("text/html");
    const fields = new URLSearchParams(request.postData()!);
    expect(fields.get("email")).toBe("test@example.com");
    expect(fields.get("subject")).toBe("Test subject");
    expect(fields.get("message")).toBe("Automated test: intercepted locally.");
    expect(fields.get("_gotcha")).toBe("");
    await route.fulfill({ contentType: "text/html", body: "<h1>Mock hosted verification</h1>" });
  });
  await page.goto("/");
  await page.getByRole("navigation").getByRole("link", { name: "Contact" }).click();
  await expect(page.locator("[data-contact]")).toHaveAttribute("data-astro-reload", "");
  await page.getByRole("button", { name: "Send message" }).click();
  expect(submissions).toBe(0);
  await expect(page.getByRole("textbox", { name: "Email address" })).toBeFocused();
  await page.getByRole("textbox", { name: "Email address" }).fill("test@example.com");
  await page.getByRole("textbox", { name: "Subject" }).fill("Test subject");
  await page.getByRole("textbox", { name: "Message", exact: true }).fill("Automated test: intercepted locally.");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("heading", { name: "Mock hosted verification" })).toBeVisible();
  expect(submissions).toBe(1);
});

test("contact works as basic HTML without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL: "http://127.0.0.1:4173", serviceWorkers: "block" });
  let submissions = 0;
  await context.route("**/*", async route => {
    const request = route.request();
    if (new URL(request.url()).hostname === "127.0.0.1") return route.continue();
    if (request.url() !== "https://formspree.io/f/test-form") return route.abort();
    submissions++;
    expect(request.method()).toBe("POST");
    expect(request.isNavigationRequest()).toBe(true);
    await route.fulfill({ contentType: "text/html", body: "<h1>Mock submission received</h1>" });
  });
  try {
    const page = await context.newPage();
    await page.goto("/contact/");
    await expect(page.locator("[data-contact]")).toHaveAttribute("action", "https://formspree.io/f/test-form");
    await page.getByRole("textbox", { name: "Email address" }).fill("test@example.com");
    await page.getByRole("textbox", { name: "Message", exact: true }).fill("Intercepted native submission");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByRole("heading", { name: "Mock submission received" })).toBeVisible();
    expect(submissions).toBe(1);
  } finally {
    await context.close();
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
