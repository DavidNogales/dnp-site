import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const fixture = readFileSync("tests/fixtures/turnstile.js", "utf8");
const provider = "https://challenges.cloudflare.com/turnstile/**";
const endpoint = "https://formspree.io/f/test-form";
const status = (page: Page) => page.locator("[data-status]");
const send = (page: Page) => page.getByRole("button", { name: "Send message" });
const message = (page: Page) => page.getByRole("textbox", { name: "Message", exact: true });
const count = (page: Page) => page.evaluate(() => (window as any).__turnstileMock?.widgets.length ?? 0);
async function callback(page: Page, name = "callback", index = -1) {
  await page.evaluate(({ name, index }) => {
    const widgets = (window as any).__turnstileMock.widgets;
    widgets.at(index).options[name]("fixture-token");
  }, { name, index });
}
async function fill(page: Page) {
  await page.getByRole("textbox", { name: "Email address" }).fill("test@example.com");
  await page.getByRole("textbox", { name: "Subject" }).fill("Test subject");
  await message(page).fill("Intercepted locally.");
  await expect.poll(() => count(page)).toBeGreaterThan(0);
}
test.beforeEach(async ({ context, page }) => {
  await context.route("**/*", route =>
    new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
  await page.route(provider, route => route.fulfill({ contentType: "text/javascript", body: fixture }));
});

test("lazy verification, local validation, exact AJAX payload and single acceptance", async ({ page }) => {
  let loads = 0, posts = 0;
  page.on("request", r => { if (r.url().includes("challenges.cloudflare.com")) loads++; });
  await page.route(endpoint, async route => {
    posts++;
    const r = route.request();
    expect(r.method()).toBe("POST");
    expect(r.isNavigationRequest()).toBe(false);
    expect(r.headers().accept).toBe("application/json");
    const fields = await new Response(r.postData(), { headers: { "content-type": r.headers()["content-type"]! } }).formData();
    expect(Object.fromEntries(fields)).toEqual({
      email: "test@example.com", subject: "Test subject", message: "Intercepted locally.",
      _gotcha: "", "cf-turnstile-response": "fixture-token",
    });
    await route.fulfill({ json: { next: "https://formspree.io/thanks" } });
  });
  await page.goto("/");
  expect(loads).toBe(0);
  await page.getByRole("navigation").getByRole("link", { name: "Contact" }).click();
  await expect(send(page)).toBeEnabled();
  expect(loads).toBe(0);
  await send(page).click();
  expect(posts).toBe(0);
  await expect(page.locator('[name="email"]:invalid')).toHaveCount(1);
  await fill(page);
  await send(page).click();
  await expect(send(page)).toBeDisabled();
  expect(await status(page).evaluate(el => el.closest('[aria-busy="true"]'))).toBeNull();
  await page.locator("form").evaluate(form => {
    (form as HTMLFormElement).requestSubmit();
    (form as HTMLFormElement).requestSubmit();
  });
  await callback(page);
  await callback(page); // Late duplicate callback cannot send twice.
  await expect(status(page)).toHaveText("Message sent. Thank you.");
  await expect(message(page)).toHaveValue("");
  expect(posts).toBe(1);
  expect(loads).toBe(1);
  await expect(page).toHaveURL(/\/contact\/?$/);
});

test("JavaScript disabled never submits by button or Enter", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL: "http://127.0.0.1:4173" });
  let external = 0;
  await context.route("**/*", route => {
    if (new URL(route.request().url()).hostname === "127.0.0.1") return route.continue();
    external++; return route.abort();
  });
  try {
    const page = await context.newPage();
    await page.goto("/contact/");
    await expect(send(page)).toBeDisabled();
    await expect(message(page)).toBeDisabled();
    await expect(page.locator("noscript p")).toBeVisible();
    await expect(page.locator("noscript p")).toContainText("JavaScript");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/contact\/$/);
    expect(external).toBe(0);
  } finally { await context.close(); }
});

test("blocked script retries; slow script shares one load and never blocks typing", async ({ page }) => {
  let loads = 0, release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route(provider, async route => {
    loads++;
    if (loads === 1) return route.abort();
    await held;
    await route.fulfill({ contentType: "text/javascript", body: fixture });
  });
  await page.goto("/contact/");
  await message(page).fill("Keep this message");
  await expect(status(page)).toContainText("could not load");
  await page.getByRole("button", { name: "Retry verification" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill("test@example.com");
  await send(page).click();
  await expect(status(page)).toContainText("Verifying");
  await expect(message(page)).toHaveValue("Keep this message");
  expect(loads).toBe(2);
  release();
  await expect.poll(() => count(page)).toBe(1);
});

test("script deadline enables retry without automatic POST", async ({ page }) => {
  await page.clock.install();
  let blocked: import("@playwright/test").Route | undefined;
  await page.route(provider, route => { blocked = route; });
  await page.goto("/contact/");
  await message(page).fill("Retained");
  await expect.poll(() => !!blocked).toBe(true);
  await page.clock.fastForward(30_001);
  await expect(status(page)).toContainText("could not load");
  await expect(page.getByRole("button", { name: "Retry verification" })).toBeVisible();
  await expect(message(page)).toHaveValue("Retained");
  await blocked!.abort(); // Network recovers; discarded request cannot initialize a widget.
  await page.route(provider, route => route.fulfill({ contentType: "text/javascript", body: fixture }));
  await page.getByRole("button", { name: "Retry verification" }).click();
  await expect.poll(() => count(page)).toBe(1);
});

for (const failure of ["expired-callback", "error-callback", "timeout-callback"]) {
  test(`verification ${failure} cancels intent and ignores stale token`, async ({ page }) => {
    let posts = 0;
    await page.route(endpoint, route => { posts++; return route.fulfill({ json: { ok: true } }); });
    await page.goto("/contact/");
    await fill(page);
    await send(page).click();
    await callback(page, failure);
    await callback(page, "callback", 0);
    await expect(page.getByRole("button", { name: "Retry verification" })).toBeVisible();
    expect(posts).toBe(0);
    await page.getByRole("button", { name: "Retry verification" }).click();
    await expect.poll(() => count(page)).toBe(2);
    await callback(page);
    expect(posts).toBe(0);
    await send(page).click();
    await expect(status(page)).toContainText("Message sent");
    expect(posts).toBe(1);
  });
}

test("five-minute token expiry and theme replacement invalidate verification", async ({ page }) => {
  await page.clock.install();
  await page.goto("/contact/");
  await fill(page);
  await callback(page);
  await page.clock.fastForward(300_001);
  await expect(status(page)).toContainText("expired");
  await page.getByRole("button", { name: "Retry verification" }).click();
  await expect.poll(() => count(page)).toBe(2);
  await callback(page);
  const before = await page.locator("html").getAttribute("data-theme");
  await page.locator(".theme-toggle").click();
  await expect.poll(() => count(page)).toBe(3);
  const options = await page.evaluate(() => {
    const { theme, appearance, size } = (window as any).__turnstileMock.widgets.at(-1).options;
    return { theme, appearance, size };
  });
  expect(options).toEqual({ theme: before === "dark" ? "light" : "dark", appearance: "interaction-only", size: "compact" });
  await expect(message(page)).toHaveValue("Intercepted locally.");
  await expect(status(page)).toContainText("Verifying");
});

test("320px layout and keyboard focus survive reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/contact/");
  await fill(page);
  await message(page).focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Mock verification" })).toBeFocused();
  const focus = await page.locator(":focus").evaluate(el => getComputedStyle(el).outlineStyle);
  expect(focus).not.toBe("none");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");
});

test("navigation teardown, late callbacks, back entry and duplicate init", async ({ page }) => {
  await page.goto("/contact/");
  await fill(page);
  await page.getByRole("navigation").getByRole("link", { name: "Home", exact: true }).click();
  await expect(page.locator("[data-contact]")).toHaveCount(0);
  await callback(page, "callback", 0);
  expect(await page.evaluate(() => (window as any).__turnstileMock.removed)).toContain("0");
  await page.goBack();
  await expect(send(page)).toBeEnabled();
  await page.evaluate(() => { document.dispatchEvent(new Event("astro:after-swap")); document.dispatchEvent(new Event("astro:after-swap")); });
  await fill(page);
  expect(await count(page)).toBe(2);
  await page.goForward();
  await expect(page.locator("[data-contact]")).toHaveCount(0);
});

for (const code of [400, 403, 429, 500]) {
  test(`HTTP ${code} preserves input and requires new token`, async ({ page }) => {
    let posts = 0;
    await page.route(endpoint, route => {
      posts++;
      return route.fulfill(posts === 1 ? { status: code, json: { errors: [{ field: "email", message: "<b>Rejected token or field</b>" }] } } : { json: { ok: true } });
    });
    await page.goto("/contact/");
    await fill(page);
    await callback(page);
    await send(page).click();
    await expect(status(page)).toContainText(`HTTP ${code}`);
    await expect(message(page)).toHaveValue("Intercepted locally.");
    await expect(page.locator('[name="email"]')).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator('[data-field-error="email"]')).toHaveText("<b>Rejected token or field</b>");
    await expect(page.locator('[data-field-error="email"] b')).toHaveCount(0);
    await send(page).click();
    await expect.poll(() => count(page)).toBe(2);
    expect(posts).toBe(1);
    await callback(page);
    await expect(status(page)).toContainText("Message sent");
    expect(posts).toBe(2);
  });
}

for (const kind of ["non-json", "malformed-success", "empty-success", "disconnect", "timeout"]) {
  test(`submission ${kind} retains message without automatic retry`, async ({ page }) => {
    let posts = 0;
    if (kind === "timeout") await page.clock.install();
    await page.route(endpoint, route => {
      posts++;
      if (kind === "timeout") return;
      if (kind === "disconnect") return route.abort();
      if (kind === "empty-success") return route.fulfill({ json: {} });
      return route.fulfill({ status: kind === "non-json" ? 500 : 200, contentType: "text/html", body: "<h1>Not JSON</h1>" });
    });
    await page.goto("/contact/");
    await fill(page);
    await callback(page);
    await send(page).click();
    if (kind === "timeout") {
      await expect.poll(() => posts).toBe(1);
      await page.clock.fastForward(30_001);
    }
    await expect(status(page)).toContainText(kind === "non-json" ? "HTTP 500" : "Could not confirm delivery");
    await expect(message(page)).toHaveValue("Intercepted locally.");
    await expect(send(page)).toBeEnabled();
    expect(posts).toBe(1);
  });
}

test("late script load after navigation initializes only the new form, before fonts finish", async ({ page }) => {
  let releaseScript!: () => void, releaseFonts!: () => void, loads = 0;
  const scriptHeld = new Promise<void>(resolve => { releaseScript = resolve; });
  const fontsHeld = new Promise<void>(resolve => { releaseFonts = resolve; });
  await page.route(provider, async route => {
    loads++;
    await scriptHeld;
    await route.fulfill({ contentType: "text/javascript", body: fixture });
  });
  await page.route(/\.woff2(?:\?|$)/, async route => { await fontsHeld; await route.continue(); });
  try {
    await page.goto("/contact/", { waitUntil: "domcontentloaded" });
    await message(page).fill("Old visit");
    await expect.poll(() => loads).toBe(1);
    await page.getByRole("navigation").getByRole("link", { name: "Home", exact: true }).click();
    await expect(page.locator("[data-contact]")).toHaveCount(0);
    releaseScript();
    await expect.poll(() => page.evaluate(() => !!(window as any).__turnstileMock)).toBe(true);
    expect(await count(page)).toBe(0);
    await page.getByRole("navigation").getByRole("link", { name: "Contact" }).click();
    await message(page).fill("New visit");
    await expect.poll(() => count(page)).toBe(1);
    await expect(message(page)).toHaveValue("New visit");
    expect(await page.evaluate(() => document.fonts.status)).toBe("loading");
    expect(loads).toBe(1);
  } finally { releaseScript(); releaseFonts(); }
});

test("provider errors cannot masquerade as a successful JSON response", async ({ page }) => {
  await page.route(endpoint, route => route.fulfill({ json: { ok: true, next: "/thanks", error: "Verification rejected" } }));
  await page.goto("/contact/");
  await fill(page);
  await callback(page);
  await send(page).click();
  await expect(status(page)).toContainText("Verification rejected");
  await expect(message(page)).toHaveValue("Intercepted locally.");
});

test("theme change during fetch neither replaces widget nor repeats POST; stale fetch cannot update next visit", async ({ page }) => {
  let release!: () => void, posts = 0;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route(endpoint, async route => { posts++; await held; await route.fulfill({ json: { ok: true } }).catch(() => {}); });
  await page.goto("/contact/");
  await fill(page);
  await callback(page);
  await send(page).click();
  await expect(status(page)).toHaveText("Sending…");
  await page.locator(".theme-toggle").click();
  expect(await count(page)).toBe(1);
  await expect(message(page)).toBeDisabled();
  await page.getByRole("navigation").getByRole("link", { name: "Home", exact: true }).click();
  await page.getByRole("navigation").getByRole("link", { name: "Contact" }).click();
  release();
  await expect(status(page)).toContainText("Your message stays");
  expect(posts).toBe(1);
});
