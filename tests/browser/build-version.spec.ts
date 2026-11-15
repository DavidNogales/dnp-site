import { test, expect, type Page } from "@playwright/test";
import { buildMetadata } from "../fixtures/build-version.mjs";

const sha = buildMetadata.BUILD_COMMIT_SHA;
const href = `https://github.com/${buildMetadata.BUILD_REPOSITORY}/commit/${sha}`;

test.beforeEach(async ({ context }) => {
  await context.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1"
    ? route.continue() : route.abort());
});

async function expectVersion(page: Page) {
  const label = page.getByRole("link", { name: `Build commit ${sha}`, exact: true });
  await expect(label).toHaveText("abcdef0");
  await expect(label).toHaveAttribute("href", href);
  await expect(label).toHaveCSS("font-family", /Inconsolata/);
  const toggleBox = await page.locator(".theme-toggle").boundingBox();
  const labelBox = await label.boundingBox();
  expect(toggleBox).not.toBeNull();
  expect(labelBox).not.toBeNull();
  expect(labelBox!.y).toBeGreaterThanOrEqual(toggleBox!.y + toggleBox!.height);
  expect(labelBox!.x + labelBox!.width / 2).toBeCloseTo(toggleBox!.x + toggleBox!.width / 2, 1);
  await expect(label).toHaveCSS("justify-content", "center");
  expect(labelBox!.height).toBeGreaterThanOrEqual(44);
  expect(labelBox!.y + labelBox!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  const accent = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--accent").trim());
  const rgb = accent.slice(1).match(/../g)!.map(c => parseInt(c, 16)).join(", ");
  await expect(label).toHaveCSS("color", `rgb(${rgb})`);
  await expect(page.locator("footer")).toContainText("David Nogales Pérez");
}

test("build version stays below toggle through themes and navigation", async ({ page }) => {
  await page.goto("/");
  for (const name of ["Projects", "Blog", "CV", "Contact", "Home"]) {
    await page.getByRole("navigation").getByRole("link", { name, exact: true }).click();
    await expect(page.getByRole("navigation").locator('[aria-current="page"]')).toHaveText(name);
    await expectVersion(page);
    const theme = await page.locator("html").getAttribute("data-theme");
    await page.locator(".theme-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme === "dark" ? "light" : "dark");
    await expectVersion(page);
  }
  await page.locator(".theme-toggle").focus();
  await page.keyboard.press("Tab");
  const label = page.getByRole("link", { name: `Build commit ${sha}` });
  await expect(label).toBeFocused();
  await expect(label).toHaveCSS("outline-style", "solid");
  await expect(label).toHaveCSS("outline-width", "2px");
  await page.goBack();
  await expect(page.getByRole("navigation").locator('[aria-current="page"]')).toHaveText("Contact");
  await page.reload();
  await expectVersion(page);
});

test("hash and local text share the toggle centerline", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  for (const text of ["abcdef0", "local"]) {
    // Exercise both text widths using the shared .build-version layout.
    const centers = await page.locator(".build-version").evaluate((el, value) => {
      el.textContent = value;
      const range = document.createRange();
      range.selectNodeContents(el);
      const textBox = range.getBoundingClientRect();
      const toggle = document.querySelector(".theme-toggle")!.getBoundingClientRect();
      return { text: textBox.x + textBox.width / 2, toggle: toggle.x + toggle.width / 2 };
    }, text);
    expect(centers.text).toBeCloseTo(centers.toggle, 1);
  }
});

test("bottom controls remain visible on narrow and short screens", async ({ page }) => {
  for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 320 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expectVersion(page);
    const label = page.locator(".build-version");
    const before = await label.boundingBox();
    await page.getByRole("navigation").getByRole("link", { name: "Contact" }).scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expectVersion(page);
    expect((await label.boundingBox())!.y).toBeCloseTo(before!.y, 1);
    const layout = await page.evaluate(() => {
      const bar = document.querySelector<HTMLElement>(".bar")!;
      const toggle = document.querySelector(".theme-toggle")!.getBoundingClientRect();
      const version = document.querySelector(".build-version")!.getBoundingClientRect();
      const footer = document.querySelector("footer")!.getBoundingClientRect();
      const corner = document.querySelector(".theme-corner")!;
      return {
        overflow: document.documentElement.scrollWidth > innerWidth,
        barBottom: bar.getBoundingClientRect().bottom,
        toggleTop: toggle.top,
        versionRight: version.right,
        footerLeft: footer.left,
        bottomGap: innerHeight - version.bottom,
        paddingBottom: parseFloat(getComputedStyle(corner).paddingBottom),
        scrollable: bar.scrollHeight > bar.clientHeight,
        scrollTop: bar.scrollTop,
      };
    });
    expect(layout.overflow).toBe(false);
    expect(layout.barBottom).toBeLessThanOrEqual(layout.toggleTop);
    expect(layout.versionRight).toBeLessThanOrEqual(layout.footerLeft);
    expect(layout.bottomGap).toBeGreaterThanOrEqual(layout.paddingBottom - 1);
    if (viewport.height === 320) {
      expect(layout.scrollable).toBe(true);
      expect(layout.scrollTop).toBeGreaterThan(0);
    }
  }
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("version is readable with fonts and external requests blocked", async ({ page }) => {
    const external: string[] = [];
    page.on("request", request => {
      if (new URL(request.url()).hostname !== "127.0.0.1") external.push(request.url());
    });
    await page.route(/\.woff2(?:\?|$)/, route => route.abort());
    await page.goto("/");
    await expectVersion(page);
    await expect(page.locator(".build-version")).toBeVisible();
    expect(external).toEqual([]);
  });
});
