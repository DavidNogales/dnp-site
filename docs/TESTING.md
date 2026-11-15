# Repeatable local tests

[Back to README](../README.md)

## Run tests

Install dependencies first with `make install`, then:

```bash
make test                       # Type-check, unit tests, build, loading checks, Playwright
make perf                       # Five Lighthouse runs/page, mobile profile
make perf PERF_PROFILE=desktop
make perf PERF_PROFILE=slow-3g
```

Equivalent commands inside `nix develop 'path:.#test'` are `pnpm test` and `pnpm test:perf mobile` (or `desktop` / `slow-3g`). The test shell supplies Chromium pinned by `flake.lock`; Playwright and Lighthouse CI are pinned by `pnpm-lock.yaml`. No browser download or cloud account is required with Nix. Outside Nix, install Playwright's Chromium and supply `CHROME_PATH` for Lighthouse; don't compare results across different browser versions.

For focused debugging, `pnpm test:perf slow-3g /blog/welcome/` runs five measurements of just that configured route. Full profiles take several minutes, especially applied slow-3G; do not run them concurrently.

## Isolation and browser coverage

`pnpm test:unit` runs build-metadata and public contact-configuration validation tests with Node's built-in test runner. Browser fixtures use a fixed synthetic commit SHA and repository, overriding shell/CI metadata. Label tests verify exact commit links, keyboard focus, placement below the theme toggle, short-screen scrolling, and rendering with JavaScript and fonts disabled; they never follow the GitHub link.

When changing version metadata, run `pnpm test:version-builds` inside the Nix shell. This checks every generated HTML page across five temporary production builds: valid, absent, invalid SHA, invalid repository, and project subpath. It checks exact destinations, local fallbacks, and unchanged browser JavaScript, then removes only its own temporary output; neither `dist/` nor `.test-dist/` is replaced. Run it separately from browser/performance tests because Astro's generated caches are shared.

Tests build production output into **`.test-dist/`**, leaving deployable `dist/` untouched. The fixture uses `/`, a localhost site URL, and a fake Formspree ID. Browser tests intercept submissions and block third-party traffic. Port **4173** must be free; existing servers are not reused. Reports stay local and are gitignored.

Playwright runs one worker, zero retries, fresh contexts, fixed English locale/UTC timezone, and four projects: desktop/mobile × light/dark. Coverage includes navigation/back/reload, theme persistence, blocked-font interactivity, loaded fonts, math-only CSS, text-token contrast, overflow, reduced motion, mocked inline contact submission, and PDF availability. Failures retain screenshots/traces under `test-results/`; open the HTML report with `pnpm exec playwright show-report`.

Contact tests intercept both Cloudflare and Formspree. The synthetic public site key and fake form ID override local/CI settings only in `.test-dist/`; deployable `dist/` is untouched. No real verification or email is performed. Tests cover lazy/blocked/slow loading, expiry, theme replacement, navigation cleanup, single-flight AJAX, exact payload, inline errors, timeouts, preserved input, and disabled-JavaScript safety. The provider fixture invokes the official script `onload` callback and rejects `ready()` with async/defer scripts. Regression cases check late script arrival before/after retry without duplicate imports, collapsed silent/failed widget space, interactive keyboard access, and icon-plus-text feedback. Run focused checks with:

```bash
pnpm test:build
pnpm exec playwright test tests/browser/contact.spec.ts
pnpm test:contact-builds
```

The contact build suite generates isolated temporary variants for absent/invalid configuration and a project subpath, then exercises them in Chromium. Run build variants separately from other suites because Astro caches are shared. JavaScript-disabled users now see disabled controls and an explanation, not a hosted verification fallback.

Local mocks cannot prove real Cloudflare challenges, Formspree token enforcement, or receipt. Follow the authorized operator acceptance/rejection checklist in [development](DEVELOPMENT.md#operator-setup-and-coordinated-cutover); do not aim automated tests at the production form.

## Lighthouse profiles and budgets

Lighthouse runs sequentially on home, blog index, math article, CV, and contact. Every URL gets **five cold-cache runs** in an extension-free browser. [`lighthouserc.cjs`](../lighthouserc.cjs) defines the profiles and median-based budgets:

| Profile | Viewport | Network / CPU | FCP / LCP budget |
| --- | --- | --- | --- |
| desktop | 1365×900 | Simulated 40ms RTT, 10,240 Kbit/s, 1× CPU | 1.0s / 1.5s |
| mobile | 390×844 | Simulated 150ms RTT, 1,638.4 Kbit/s, 4× CPU | 1.8s / 2.5s |
| slow-3g | 390×844 | Applied 2,000ms request latency, 400 Kbit/s up/down, 4× CPU | 4.0s / 5.0s |

All profiles require median TBT ≤200ms, CLS ≤0.1, transfer size ≤220 kB, and accessibility score 100. These are project regression budgets, not promises about every connection or field Core Web Vitals. Slow-3g is a custom stress profile, not a claim to match a specific DevTools preset. Normal desktop/mobile profiles use Lighthouse simulation; their scores and original trace timings differ.

## Reports and comparisons

Each performance run saves timestamped HTML/JSON reports and `summary.json` in `reports/lighthouse/<profile>/`. The summary contains per-metric medians, browser/Lighthouse/Node versions, and effective settings; assertion failures still preserve collected reports. Keep a baseline folder before changes and compare matching profiles, URLs, versions, and machines. Avoid parallel tests or heavy background work. Nix pins software, not host CPU performance. Rebaseline deliberately after toolchain updates. Test deployed hosting separately for CDN, compression, caching, and real network behavior.

## Turnstile verification record — 2026-11-15

`pnpm test` passed: type-check, six unit tests, loading checks, and **124 browser cases** across all four projects. `pnpm test:contact-builds` passed all five build variants, including root/subpath AJAX submission and client/back-forward navigation. OpenSpec strict validation passed.

Five-run cold-load medians, using Node 22.23.4, Chromium 157.0.8103.38, and Lighthouse 13.6.0:

| Profile | Page | FCP | LCP | TBT | CLS | Transfer |
| --- | --- | --- | --- | --- | --- | --- |
| mobile | home | 602ms | 602ms | 14.5ms | 0 | 112.0kB |
| mobile | contact | 604ms | 1505ms | 0ms | 0 | 115.2kB |
| slow-3g | home | 2159ms | 2212ms | 0ms | 0.00002 | 112.0kB |
| slow-3g | contact | 2183ms | 2221ms | 0ms | 0 | 115.2kB |

All unchanged budgets passed. Accessibility scored 100 in every recorded run. Cold-load network traces contained no Cloudflare Turnstile or Formspree requests. These measurements exclude challenge completion and mail delivery.

Reproduce with `pnpm test:perf mobile /`, `pnpm test:perf mobile /contact/`, `pnpm test:perf slow-3g /`, and `pnpm test:perf slow-3g /contact/` sequentially. Local evidence folders under `reports/lighthouse/`:

- `mobile/2026-11-15T17-43-59.106Z` (home)
- `mobile/2026-11-15T17-52-15.678Z` (final contact)
- `slow-3g/2026-11-15T17-45-50.261Z` (home)
- `slow-3g/2026-11-15T17-53-10.295Z` (final contact)

Separately, the mocked delayed-interaction tests held the provider script while typing, verified a single shared request, exercised a 30-second load deadline/retry, and released a late load after navigation while fonts remained blocked. Form input remained usable; stale callbacks did not create a detached widget or send a message. This is deterministic lifecycle coverage, not a measurement of Cloudflare's real challenge latency.

Outstanding operator checks: configure the real widget and Formspree secret, coordinate rollout, then authorize one accepted-message/receipt check and one invalid-token rejection check. No production admin changes, real messages, or real-provider validation were performed here.

### Production loader regression

The original mock above accepted `turnstile.ready()` on an async script, unlike the real provider. Consequently, the original passing suite did not catch the production loader failure. The updated fixture reproduces that restriction. Loading now uses the provider's URL `onload` callback; the 30-second UI deadline retains the pending script, so retries cannot import the same API twice. Widget space is shown only between interactive callbacks, not reserved during silent verification or failures. The historical Lighthouse measurements above predate this fix.

Fix verification: `pnpm test` passed type-checking, six unit tests, loading checks, and **136 browser cases** across all four projects. `pnpm test:contact-builds` passed all five variants. Real-provider challenge and mail delivery remain operator checks, not covered by these mocks.

Operator follow-up — 2026-11-15: the user confirmed production verification reached “Verification complete. Ready to send.” and subsequently reported the contact flow worked. Cloudflare iframe console warnings did not prevent that verification. This is user-reported production evidence, not an automated live test; inbox receipt and a deliberate invalid-token rejection check were not separately confirmed.
