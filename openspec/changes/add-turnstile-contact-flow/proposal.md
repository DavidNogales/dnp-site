# Proposal

## Why

The current contact form navigates to Formspree for reCAPTCHA verification and submission results, interrupting the site's themed contact experience. Turnstile with asynchronous submission can keep visitors on the contact page while Formspree continues to enforce server-side spam protection.

## What Changes

- Replace hosted reCAPTCHA navigation with embedded Cloudflare Turnstile and on-page Formspree submission.
- Keep email, optional subject, message, and honeypot fields; add accessible verification, sending, success, error, and retry states.
- Integrate verification with Astro client navigation, explicit site theme, and narrow sidebar-based layouts without loading the provider on unrelated pages.
- Add public Turnstile site-key configuration; keep the matching secret exclusively in Formspree's dashboard.
- **BREAKING**: remove native external submission, including the current JavaScript-disabled path. Without JavaScript, valid configuration, or usable verification, explain the limitation on-page and do not submit or redirect.
- Update browser/loading checks and operator documentation, including coordinated deployment and CAPTCHA-provider switching.

Non-goals: a custom backend, React/SDK migration, DNS/proxy changes, bypassing CAPTCHA, redesigning unrelated pages, styling Cloudflare's iframe internals, or changing CV/build-version behavior.

## Capabilities

### New Capabilities

- `contact-submission`: Protected contact submission with on-page results, recoverable failures, accessible presentation, and lifecycle-safe verification.

### Modified Capabilities

None. The existing `deployment-version` capability is unchanged. Native submission is currently described in development/style documentation and tests, not a main contact spec; this change explicitly replaces that behavior.

## Impact

- Frontend: `src/components/ContactForm.astro`, a focused client helper if needed, and narrowly scoped theme integration if required.
- Configuration: `.env.example`, `.github/workflows/deploy.yml`, and isolated test-build fixtures gain `PUBLIC_TURNSTILE_SITE_KEY` alongside the existing form ID.
- Validation: `tests/browser/site.spec.ts` or a focused contact suite, `scripts/check-loading.mjs`, `scripts/test-site.mjs`, and contact/home performance audits.
- Documentation: `docs/DEVELOPMENT.md`, `docs/STYLE_GUIDE.md`, and `docs/TESTING.md` must replace native-submit guidance.
- External administration: create a Cloudflare Managed widget for `davidnogales.com`; select Turnstile and configure its secret on Formspree form `xvkapara`. No dashboard changes are authorized by this proposal.
- Runtime: Cloudflare's official browser script plus Formspree's existing endpoint; static GitHub Pages hosting and existing npm dependencies remain sufficient.
