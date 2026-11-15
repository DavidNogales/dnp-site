# Design

## Context

See proposal.md for motivation and specs/contact-submission/spec.md for the behavior contract. `ContactForm.astro` currently has no script: native POST plus `data-astro-reload` deliberately navigates to Formspree. `scripts/check-loading.mjs` prohibits a contact script, and two Playwright cases require native navigation (including JavaScript disabled). These are intentional existing behaviors to replace, not regressions to preserve.

Astro's ClientRouter swaps pages without reloading the document. Theme state lives in `document.documentElement.dataset.theme`, which may differ from system preference. At 320px, the fixed sidebar leaves roughly 184px for content: normal/flexible Turnstile widgets have a 300px minimum and do not fit. Existing tests isolate builds in `.test-dist/`, intercept external traffic, and enforce cold-load budgets.

## Goals / Non-Goals

**Goals:** a small explicit lifecycle controller; protected asynchronous submission; site-owned accessible states; deterministic local tests; operator-owned credentials and rollout.

**Non-Goals:** frontend token verification, custom mail delivery, a new server/Worker, React or a Formspree SDK, guaranteed delivery under connection loss, cross-navigation draft storage, or custom CSS inside Cloudflare's iframe.

## Decisions

### 1. Keep the server boundary at Formspree

Use the existing form endpoint and native `FormData`, adding `cf-turnstile-response` and requesting JSON. Formspree validates the token with the matching secret. Never call Siteverify from the browser, log tokens/message content, or put the secret in repository/CI configuration. The new `PUBLIC_TURNSTILE_SITE_KEY` is a public Actions repository variable passed to the build and documented in `.env.example`.

Alternative: a Worker that verifies tokens and forwards mail. Rejected: unnecessary backend and secret-management scope. Adding an SDK alone would not resolve provider/dashboard mismatch.

### 2. Explicit, interaction-triggered verification

Use one shared loader promise for `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit`; load the official script directly, never proxy or bundle it. Initialize the form handler immediately, but load/render Turnstile only after first form interaction (focus/input or Send). This avoids third-party requests on cold home/contact reads. A failed load can be retried without accumulating script nodes or callbacks.

Proposed defaults: Managed widget, `appearance: interaction-only`, automatic verification after render. The visitor can type during verification. A valid Send attempt either uses an available token or records one pending intent and sends once verification succeeds; revalidate fields before sending. Repeated clicks cannot queue extra sends. Clear pending intent on verification failure, expiry, timeout, theme-triggered replacement, or navigation.

Discard tokens on expiry and after every submission attempt; reset verification before an explicit retry. Tokens have five-minute validity and single-use semantics. Use provider timeout/error/expiry callbacks, a 30-second script-load timeout and a 30-second submission timeout; do not impose that short deadline on a person completing an interactive challenge. Provider interaction timeout returns control with retry feedback.

### 3. Local states and fail-closed fallback

Model unavailable, idle, verifying, ready, sending, success, recoverable error, and uncertain delivery. Use a polite live region for progress/results, visible error text, native field validation, and field associations for recognized validation errors. Display provider messages as text, never HTML. Only a successful, recognized Formspree acceptance response clears fields and reports success. Unknown/malformed success responses and network timeouts are uncertain; HTTP failures retain input and show appropriate status. No automatic POST retry.

Render controls disabled in a fieldset initially; install submit interception before enabling them. Keep the existing absolute form action and `data-astro-reload` as router opt-out, but never invoke native submission. Provide a `noscript` explanation. Missing configuration leaves controls unavailable. This consciously replaces no-JavaScript sending to meet the no-redirect goal, rather than silently falling back to the hosted verification page.

### 4. Lifecycle and presentation

Keep provider state in a focused client module if component script complexity warrants it. Initialize once per mounted form; use Astro lifecycle events to dispose before swap and initialize after swap/direct entry. Remove the widget, disconnect observers, invalidate callbacks by mount/attempt identity, and abort pending fetches on teardown. Aborting transport does not establish non-delivery; never replay it on return. A loader resolving after navigation must not render into a detached or replacement form.

Observe the root theme attribute while contact is mounted. Use explicit light/dark widget settings, not OS-based auto. Recreate the widget when necessary without losing field values; defer replacement while sending, and invalidate old tokens/callbacks. Prefer compact sizing consistently to fit the existing narrow content column without complex responsive re-rendering. Reserve appropriate space when verification becomes active and keep focus/feedback scrollable above the fixed footer. Site-owned markup retains the current fonts, colors, and controls; Cloudflare's internal appearance remains provider-controlled.

Alternative: implicit scanning or `window.onload`. Rejected: unreliable on ClientRouter re-entry and unnecessarily tied to full-page resource completion.

### 5. Tests and measurement

Replace native-submit tests and the script prohibition with lifecycle and no-navigation checks. Intercept both the official script URL (a controllable render/reset/remove/callback fixture) and Formspree requests. Force synthetic site key/form ID in `.test-dist/`; never forward test messages or bypass verification in production code. Cover success, token expiry/reuse, HTTP and non-JSON errors, uncertain delivery, blocked/delayed script, retry, double activation, theme changes, back/forward, and stale callbacks after navigation.

Check disabled JavaScript and missing configuration, 320px/mobile/desktop layouts, root/subpath builds, keyboard focus/live feedback, and loading while fonts are blocked. Assert no provider request before interaction and no live widget after leaving contact. Cloudflare dummy keys may be used for a separate manual widget smoke check; they cannot validate against a production Formspree secret and are not a real-delivery test.

Run existing local checks and five-run mobile/slow-3g audits for home/contact without relaxing budgets. Lazy-load audits measure initial rendering, not the challenge itself: separately exercise delayed interaction and record a controlled manual provider check. No CV layout changes are planned; existing build/PDF availability checks remain sufficient.

## Risks / Trade-offs

- CAPTCHA provider mismatch during rollout -> coordinate frontend and Formspree switch; disclose a brief submission interruption and keep fields on-page.
- Third-party script blocked -> explain/retry, never send unverified or navigate externally.
- Lost success response -> report uncertainty and require a deliberate fresh-token retry; client code cannot promise exactly-once email delivery.
- Theme or navigation races -> generation guards and disposal; do not reuse a token from a removed widget.
- Third-party latency/appearance -> interaction-only loading, compact sizing, existing performance budgets; provider styling remains limited.
- No-JavaScript compatibility loss -> explicit static explanation and disabled controls, documented as breaking behavior.

## Migration Plan

1. Prepare and test code/config/docs locally before changing production protection. No admin actions are part of planning or automated test runs.
2. Operator creates a Managed Turnstile widget allowing `davidnogales.com` (covers subdomains), keeps DNS-only unchanged, and leaves pre-clearance disabled: this protects a Formspree submission, not a Cloudflare WAF session. Use a separate development widget/hostname allowance only for intentional real-provider testing.
3. Operator sets `PUBLIC_TURNSTILE_SITE_KEY` as a GitHub Actions repository variable. Keep `PUBLIC_FORMSPREE_FORM_ID=xvkapara`, `SITE_URL=https://davidnogales.com`, and `BASE_PATH=/`.
4. In a coordinated window, deploy the frontend and switch Formspree's CAPTCHA provider to Cloudflare Turnstile with the matching secret, keeping CAPTCHA enabled. Prefer a separately configured staging form to verify the combination before the production switch. Neither ordering is atomic; do not promise uninterrupted submissions or disable CAPTCHA as a bridge.
5. With explicit operator approval, perform one real production submission, confirm no top-level navigation, successful token validation, and received email. Also confirm rejection without a valid token through an authorized integration check. Mocked tests cannot certify service-side enforcement or delivery.
6. Rollback requires both restoring the prior native-submit frontend and restoring its matching reCAPTCHA configuration. Do not leave native reCAPTCHA code paired with Turnstile settings or expose the secret to resolve errors.

## References

- [Formspree Turnstile integration](https://help.formspree.io/articles/form-and-project-settings/protecting-your-forms-with-cloudflare-turnstile/)
- [Cloudflare widget configuration](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/)
- [Token validation and lifetime](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Isolated Turnstile testing](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)

No product-scope questions remain. Real site-key values, dashboard access, and rollout timing are operator inputs, not prerequisites for isolated implementation tests.
