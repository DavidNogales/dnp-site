import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";
import test from "node:test";
import { chromium, expect } from "@playwright/test";
import { contactMetadata } from "../fixtures/contact.mjs";

test("contact builds fail closed, isolate configuration and work under a subpath", async t => {
  const root = mkdtempSync(join(tmpdir(), "dnp-contact-builds-"));
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
  const variants = [
    { name: "valid", base: "/", valid: true },
    { name: "missing-form", base: "/", form: "", valid: false },
    { name: "missing-key", base: "/", key: "", valid: false },
    { name: "invalid-key", base: "/", key: "<invalid>", valid: false },
    { name: "subpath", base: "/dnp-site/", valid: true },
  ];
  const secretCanary = "test-only-private-key-must-not-be-bundled";
  try {
    for (const variant of variants) await t.test(variant.name, async () => {
      const output = join(root, variant.name);
      const result = spawnSync(process.execPath, ["node_modules/astro/astro.js", "build", "--outDir", output], {
        encoding: "utf8",
        env: { ...process.env, ...contactMetadata, SITE_URL: "http://127.0.0.1:4173", BASE_PATH: variant.base,
          PUBLIC_FORMSPREE_FORM_ID: variant.form ?? contactMetadata.PUBLIC_FORMSPREE_FORM_ID,
          PUBLIC_TURNSTILE_SITE_KEY: variant.key ?? contactMetadata.PUBLIC_TURNSTILE_SITE_KEY,
          TURNSTILE_SECRET_KEY: secretCanary },
      });
      assert.equal(result.status, 0, result.stdout + result.stderr);
      const html = readFileSync(join(output, "contact/index.html"), "utf8");
      if (variant.valid) {
        assert.match(html, /<fieldset disabled\b[^>]*>/);
        assert.ok(html.includes('data-sitekey="' + contactMetadata.PUBLIC_TURNSTILE_SITE_KEY + '"'));
        assert.ok(html.includes('action="https://formspree.io/f/test-form"'));
      } else {
        assert.match(html, /data-contact-unavailable/);
        assert.doesNotMatch(html, /<form\b/);
      }
      for (const path of readdirSync(output, { recursive: true }).filter(p => /\.(html|js)$/.test(p))) {
        assert.ok(!readFileSync(join(output, path), "utf8").includes(secretCanary));
      }
      const context = await browser.newContext({ serviceWorkers: "block" });
      let posts = 0, providerLoads = 0;
      await context.route("**/*", async route => {
        const url = new URL(route.request().url());
        if (url.hostname === "challenges.cloudflare.com") {
          providerLoads++;
          return route.fulfill({ contentType: "text/javascript", body: readFileSync("tests/fixtures/turnstile.js", "utf8") });
        }
        if (url.href === "https://formspree.io/f/test-form") {
          posts++;
          assert.equal(route.request().isNavigationRequest(), false);
          return route.fulfill({ json: { ok: true } });
        }
        if (url.hostname !== "127.0.0.1" || !url.pathname.startsWith(variant.base)) return route.abort();
        let path = url.pathname.slice(variant.base.length);
        if (!path) path = "index.html";
        else if (!extname(path)) path = path.replace(/\/$/, "") + "/index.html";
        const file = resolve(output, path);
        assert.ok(file.startsWith(output + "/"));
        const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".svg": "image/svg+xml" };
        try { return await route.fulfill({ body: readFileSync(file), contentType: types[extname(file)] ?? "application/octet-stream" }); }
        catch { return route.fulfill({ status: 404, body: "" }); }
      });
      try {
        const page = await context.newPage();
        const url = "http://127.0.0.1:4173" + variant.base + "contact/";
        await page.goto(url);
        if (!variant.valid) {
          await expect(page.locator("[data-contact-unavailable]")).toBeVisible();
          await expect(page.locator("form")).toHaveCount(0);
          await page.keyboard.press("Enter");
          await expect(page).toHaveURL(url);
          assert.equal(posts, 0);
          assert.equal(providerLoads, 0);
        } else {
          assert.equal(providerLoads, 0);
          await page.locator('[name="email"]').fill("fixture@example.com");
          await page.locator('[name="message"]').fill("Locally intercepted only");
          await page.getByRole("button", { name: "Mock verification" }).click();
          await page.getByRole("button", { name: "Send message" }).click();
          await expect(page.locator("[data-status]")).toContainText("Message sent");
          await expect(page).toHaveURL(url);
          assert.equal(posts, 1);
          // Exercise Astro entry and browser history under the configured base too.
          await page.getByRole("navigation").getByRole("link", { name: "Home", exact: true }).click();
          await expect(page.locator("form")).toHaveCount(0);
          await page.getByRole("navigation").getByRole("link", { name: "Contact", exact: true }).click();
          await page.locator('[name="email"]').fill("fixture@example.com");
          await page.locator('[name="message"]').fill("Second intercepted visit");
          await page.getByRole("button", { name: "Mock verification" }).click();
          await page.getByRole("button", { name: "Send message" }).click();
          await expect(page.locator("[data-status]")).toContainText("Message sent");
          assert.equal(new URL(page.url()).pathname.replace(/\/$/, ""), variant.base + "contact");
          assert.equal(posts, 2);
          await page.goBack();
          await expect(page.locator("form")).toHaveCount(0);
          await page.goForward();
          await expect(page.getByRole("button", { name: "Send message" })).toBeEnabled();
        }
      } finally { await context.close(); }
    });
  } finally {
    await browser.close();
    // Remove only this invocation's temporary output.
    rmSync(root, { recursive: true, force: true });
  }
});
