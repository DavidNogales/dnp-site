import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { buildMetadata } from "../fixtures/build-version.mjs";

test("static builds embed only their supplied version metadata", async t => {
  const root = mkdtempSync(join(tmpdir(), "dnp-version-builds-"));
  const cases = [
    { name: "valid", sha: buildMetadata.BUILD_COMMIT_SHA, repo: buildMetadata.BUILD_REPOSITORY, base: "/", linked: true },
    { name: "absent", sha: "", repo: "", base: "/", linked: false },
    { name: "invalid-sha", sha: "not-a-commit", repo: buildMetadata.BUILD_REPOSITORY, base: "/", linked: false },
    { name: "invalid-repository", sha: buildMetadata.BUILD_COMMIT_SHA, repo: "https://invalid.example/repo", base: "/", linked: false },
    { name: "subpath", sha: buildMetadata.BUILD_COMMIT_SHA, repo: buildMetadata.BUILD_REPOSITORY, base: "/dnp-site/", linked: true },
  ];
  let baselineScripts;
  try {
    for (const variant of cases) {
      await t.test(variant.name, () => {
        const output = join(root, variant.name);
        const result = spawnSync(process.execPath, ["node_modules/astro/astro.js", "build", "--outDir", output], {
          encoding: "utf8",
          env: { ...process.env, BUILD_COMMIT_SHA: variant.sha, BUILD_REPOSITORY: variant.repo,
            BASE_PATH: variant.base, SITE_URL: "http://127.0.0.1:4173", PUBLIC_FORMSPREE_FORM_ID: "test-form" },
        });
        assert.ifError(result.error);
        assert.equal(result.status, 0, result.stdout + result.stderr);
        const pages = readdirSync(output, { recursive: true }).filter(path => path.endsWith(".html"));
        assert.ok(pages.length >= 9, "Expected all static site pages, including 404");
        for (const page of pages) {
          const html = readFileSync(join(output, page), "utf8");
          const matches = [...html.matchAll(/<(a|span)\b([^>]*\bclass="build-version(?: local)?"[^>]*)>(.*?)<\/\1>/gs)];
          assert.equal(matches.length, 1, `${variant.name}/${page}: exactly one version label`);
          const [, tag, attributes, text] = matches[0];
          if (variant.linked) {
            assert.equal(tag, "a");
            assert.equal(text.trim(), "abcdef0");
            assert.ok(attributes.includes(`href="https://github.com/${variant.repo}/commit/${variant.sha}"`));
            assert.ok(attributes.includes(`aria-label="Build commit ${variant.sha}"`));
          } else {
            assert.equal(tag, "span");
            assert.equal(text.trim(), "local");
            assert.doesNotMatch(attributes, /href=|aria-label=/);
          }
        }
        const scripts = readdirSync(join(output, "_astro")).filter(path => path.endsWith(".js"))
          .sort().map(path => readFileSync(join(output, "_astro", path), "utf8"));
        baselineScripts ??= scripts;
        assert.deepEqual(scripts, baselineScripts, "Version metadata must not change browser JavaScript");
      });
    }
  } finally {
    // Only remove this invocation's generated temporary builds.
    rmSync(root, { recursive: true, force: true });
  }
});
