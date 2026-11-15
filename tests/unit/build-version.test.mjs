import assert from "node:assert/strict";
import test from "node:test";
import { resolveBuildVersion } from "../../src/lib/build-version.mjs";

const sha = "abcdef0123456789abcdef0123456789abcdef01";
const repository = "DavidNogales/dnp-site";

test("normalizes a full SHA and preserves the full commit destination", () => {
  assert.deepEqual(resolveBuildVersion(` ${sha.toUpperCase()}\n`, ` ${repository} `), {
    sha,
    shortSha: "abcdef0",
    href: `https://github.com/${repository}/commit/${sha}`,
  });
});

test("rejects missing and malformed commit values", () => {
  for (const value of [undefined, null, 123, {}, "", "abcdef0", "a".repeat(39), "a".repeat(41), "g".repeat(40), `${sha}\nextra`]) {
    assert.equal(resolveBuildVersion(value, repository), null, String(value));
  }
});

test("rejects missing, malformed, and URL-like repository values", () => {
  for (const value of [undefined, null, 123, {}, "", "owner", "/repo", "owner/", "owner/repo/extra", "https://github.com/owner/repo", "owner/repo?x=1", "owner/repo#x", "owner/..", "owner/.", "-owner/repo", "owner-/repo", "own--er/repo", "own_er/repo", "owner/re po", "owner/repo%2Fother", "owner/repo\\other", `${"o".repeat(40)}/repo`, `owner/${"r".repeat(101)}`]) {
    assert.equal(resolveBuildVersion(sha, value), null, String(value));
  }
});

test("accepts supported repository identifiers without changing their case", () => {
  for (const value of [repository, "a/b", "some-owner/Project_Name.js", "owner/.github"]) {
    assert.equal(resolveBuildVersion(sha, value)?.href, `https://github.com/${value}/commit/${sha}`);
  }
});
