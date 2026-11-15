import assert from "node:assert/strict";
import test from "node:test";
import { resolveContactConfig } from "../../src/lib/contact-config.mjs";
import { contactMetadata as fixture } from "../fixtures/contact.mjs";

test("contact accepts public identifiers and constructs an absolute endpoint", () => {
  assert.deepEqual(resolveContactConfig(` ${fixture.PUBLIC_FORMSPREE_FORM_ID} `, ` ${fixture.PUBLIC_TURNSTILE_SITE_KEY} `), {
    endpoint: "https://formspree.io/f/test-form", siteKey: fixture.PUBLIC_TURNSTILE_SITE_KEY,
  });
});
test("contact fails closed for missing, malformed, or URL-shaped configuration", () => {
  for (const value of [undefined, null, 42, {}, "", "  ", "https://example.com", "../form", '<script>']) {
    assert.equal(resolveContactConfig(value, fixture.PUBLIC_TURNSTILE_SITE_KEY), null);
    assert.equal(resolveContactConfig(fixture.PUBLIC_FORMSPREE_FORM_ID, value), null);
  }
});
