# Tasks

## 1. Configuration and safe unavailable state

- [x] 1.1 Add `PUBLIC_TURNSTILE_SITE_KEY` to `.env.example` and the deployment build environment; override it with a synthetic fixture in `scripts/test-site.mjs`. Verify fixture isolation and public configuration in generated HTML without introducing a secret input or production test submission.
- [x] 1.2 Add disabled initial controls, configuration guards, and a visible no-JavaScript explanation in `ContactForm.astro`; add tests verifying button/Enter cannot submit or navigate when JavaScript or required configuration is missing.
- [x] 1.3 Update `docs/DEVELOPMENT.md` with public-key/secret placement and the Cloudflare/Formspree prerequisites; verify instructions distinguish repository variables from dashboard-only credentials and explicitly identify the no-JavaScript behavior change.

## 2. Turnstile loading, lifecycle, and presentation

- [x] 2.1 Implement a single explicit-render loader triggered by contact interaction, with load timeout and retry; add a controllable Turnstile browser fixture and tests for cold-page request isolation, slow/blocked loads, and no concurrent duplicate loads.
- [x] 2.2 Implement per-form widget/token state and Astro teardown/re-entry; verify token expiry, reset/remove, duplicate initialization prevention, direct/client/back-forward entry, and late callbacks after navigation with mocked tests.
- [x] 2.3 Add Managed interaction-only rendering, compact sizing, and explicit site-theme synchronization; verify retained input, invalidated tokens on replacement, 320px/mobile/desktop fit, visible keyboard focus, and reduced-motion behavior in both themes.
- [x] 2.4 Replace the native-contact script prohibition in `scripts/check-loading.mjs` with checks appropriate to the new initialization and loading contract; update `docs/STYLE_GUIDE.md` for inline contact states/provider styling limits and verify `pnpm check` plus loading checks pass.

## 3. On-page submission and recoverable feedback

- [x] 3.1 Implement single-flight AJAX submission with native validation, current `cf-turnstile-response`, and JSON acceptance handling; replace native-navigation tests with assertions for exact payload, unchanged URL, one send per intent, success announcement, and clearing only on confirmed acceptance.
- [x] 3.2 Implement accessible HTTP/provider error feedback, field associations where supported, preserved input, token renewal, and explicit retries; verify validation errors, 403, 429, 500, non-JSON errors, expiry/reuse rejection, and recovery in the mocked suite.
- [x] 3.3 Implement bounded request waiting and uncertain-delivery messaging without automatic resubmission; verify timeout/disconnection/malformed-success behavior, navigation during fetch, stale results, and theme changes while sending.
- [x] 3.4 Update `docs/TESTING.md` and contact troubleshooting documentation with fixture use, focused commands, live-test limits, and disabled-JavaScript behavior; verify documented focused tests run without third-party submissions and no test key can leak into deployable output through the test harness.

## 4. Integration and operator handoff

- [x] 4.1 Run `pnpm test` inside the pinned Nix test shell and verify existing navigation, build-version, fonts, and PDF availability checks still pass; exercise a project-subpath build and confirm contact still uses the correct absolute Formspree destination without external page navigation.
- [x] 4.2 Run five-run mobile and slow-3g audits for home and contact using existing local performance commands; record medians against unchanged budgets, verify no Turnstile requests before interaction, and document a delayed-interaction check separately from cold-load results.
- [x] 4.3 Deliver the coordinated cutover/rollback checklist in `docs/DEVELOPMENT.md`, including widget hostname/mode, public repository variable, CAPTCHA-enabled Formspree provider switch, matched rollback, and authorized acceptance/rejection smoke checks. Verify the handoff clearly separates passing local tests from outstanding operator-run delivery and server-enforcement checks.

## Workflow follow-up

- Operator supplies production public site key and configures the matching secret in Formspree; agents do not change dashboards, deploy, or send real messages without explicit authorization.
- After rollout, operator verifies one accepted message and invalid-token rejection; record actual results separately from mocked tests. Do not claim production readiness solely from local test success.
- Review the completed implementation before requesting spec sync/archive. No implementation, deployment, or archival is performed by this proposal.
