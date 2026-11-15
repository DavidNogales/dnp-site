import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import test from "node:test";
import { contactMetadata } from "../fixtures/contact.mjs";

test("sharing metadata serves a dark PNG at root and project subpaths without JavaScript", async t => {
  const root = mkdtempSync(join(tmpdir(), "dnp-social-builds-"));
  try {
    for (const base of ["/", "/dnp-site/"]) {
      await t.test(base, () => {
        const output = join(root, base === "/" ? "root" : "subpath");
        const result = spawnSync(process.execPath, ["node_modules/astro/astro.js", "build", "--outDir", output], {
          encoding: "utf8",
          env: { ...process.env, ...contactMetadata, BASE_PATH: base, SITE_URL: "https://preview.example" },
        });
        assert.ifError(result.error);
        assert.equal(result.status, 0, result.stdout + result.stderr);
        const pages = readdirSync(output, { recursive: true }).filter(path => path.endsWith(".html"));
        assert.ok(pages.length >= 9);
        for (const path of pages) {
          const html = readFileSync(join(output, path), "utf8");
          const meta = name => {
            const matches = [...html.matchAll(new RegExp(`<meta (?:property|name)="${name}" content="([^"]*)"`, "g"))];
            assert.equal(matches.length, 1, `${path}: exactly one ${name}`);
            return matches[0][1];
          };
          const image = new URL(meta("og:image"));
          assert.equal(image.origin, "https://preview.example");
          assert.ok(image.pathname.startsWith(`${base}_astro/`));
          assert.match(image.pathname, /social-preview\.[\w-]+\.png$/);
          assert.equal(meta("og:image:type"), "image/png");
          assert.equal(meta("og:image:width"), "1200");
          assert.equal(meta("og:image:height"), "630");
          assert.match(meta("og:image:alt"), /monogram on a dark background/);
          assert.equal(meta("twitter:image"), image.href);
          assert.equal(meta("twitter:image:alt"), meta("og:image:alt"));
          assert.equal(meta("twitter:card"), "summary_large_image");
          assert.equal(meta("twitter:title"), meta("og:title"));
          const png = readFileSync(join(output, "_astro", basename(image.pathname)));
          assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
          assert.equal(png.readUInt32BE(16), 1200);
          assert.equal(png.readUInt32BE(20), 630);
          assert.ok(png.length < 100_000, "Keep the sharing image below 100 kB");
        }
      });
    }
  } finally {
    // Only this invocation's temporary builds are removed.
    rmSync(root, { recursive: true, force: true });
  }
});
