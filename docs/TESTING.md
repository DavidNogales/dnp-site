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

`pnpm test:unit` runs build-metadata validation tests with Node's built-in test runner. Browser fixtures use a fixed synthetic commit SHA and repository, overriding shell/CI metadata. Label tests verify exact commit links, keyboard focus, placement below the theme toggle, short-screen scrolling, and rendering with JavaScript and fonts disabled; they never follow the GitHub link.

When changing version metadata, run `pnpm test:version-builds` inside the Nix shell. This checks every generated HTML page across five temporary production builds: valid, absent, invalid SHA, invalid repository, and project subpath. It checks exact destinations, local fallbacks, and unchanged browser JavaScript, then removes only its own temporary output; neither `dist/` nor `.test-dist/` is replaced. Run it separately from browser/performance tests because Astro's generated caches are shared.

Tests build production output into **`.test-dist/`**, leaving deployable `dist/` untouched. The fixture uses `/`, a localhost site URL, and a fake Formspree ID. Browser tests intercept submissions and block third-party traffic. Port **4173** must be free; existing servers are not reused. Reports stay local and are gitignored.

Playwright runs one worker, zero retries, fresh contexts, fixed English locale/UTC timezone, and four projects: desktop/mobile × light/dark. Coverage includes navigation/back/reload, theme persistence, blocked-font interactivity, loaded fonts, math-only CSS, text-token contrast, overflow, reduced motion, mocked form success/failure, and PDF availability. Failures retain screenshots/traces under `test-results/`; open the HTML report with `pnpm exec playwright show-report`.

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
