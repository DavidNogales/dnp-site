# dnp-site

Static personal site built with Astro, Typst, and Nix.

UI changes must follow the authoritative [style guide](docs/STYLE_GUIDE.md).

## Development

```bash
nix develop
pnpm install
pnpm dev
```

Production build:

```bash
pnpm build
pnpm preview
```

Or run the same workflow from outside the Nix shell:

```bash
make install
make run
make build
make preview
make check
```

`pnpm build` compiles `cv/main.typ` to `public/cv/cv.pdf`, then builds Astro. Both Typst and the themed `/cv/` page load their content from `cv/data.yaml`; edit that file once to update both versions.

## Repeatable local tests

```bash
make test                       # Type-check, build test site, loading checks, Playwright
make perf                       # Five Lighthouse runs/page, mobile profile
make perf PERF_PROFILE=desktop
make perf PERF_PROFILE=slow-3g
```

Equivalent commands inside `nix develop 'path:.#test'` are `pnpm test` and `pnpm test:perf mobile` (or `desktop` / `slow-3g`). Run `pnpm install --frozen-lockfile` first. The test shell supplies Chromium pinned by `flake.lock`; Playwright and Lighthouse CI are pinned by `pnpm-lock.yaml`. No browser download or cloud account is required with Nix. Outside Nix, install Playwright's Chromium and supply `CHROME_PATH` for Lighthouse; don't compare results across different browser versions.

For focused debugging, `pnpm test:perf slow-3g /blog/welcome/` runs five measurements of just that configured route. Full profiles take several minutes, especially applied slow-3G; do not run them concurrently.

Tests build production output into **`.test-dist/`**, leaving deployable `dist/` untouched. The fixture uses `/`, a localhost site URL, and a fake Formspree ID. Browser tests intercept submissions and block third-party traffic. Port **4173** must be free; existing servers are not reused. Reports stay local and are gitignored.

Playwright runs one worker, zero retries, fresh contexts, fixed English locale/UTC timezone, and four projects: desktop/mobile × light/dark. Coverage includes navigation/back/reload, theme persistence, blocked-font interactivity, loaded fonts, math-only CSS, text-token contrast, overflow, reduced motion, mocked form success/failure, and PDF availability. Failures retain screenshots/traces under `test-results/`; open the HTML report with `pnpm exec playwright show-report`.

Lighthouse runs sequentially on home, blog index, math article, CV, and contact. Every URL gets **five cold-cache runs** in an extension-free browser. `lighthouserc.cjs` defines the profiles and median-based budgets:

| Profile | Viewport | Network / CPU | FCP / LCP budget |
| --- | --- | --- | --- |
| desktop | 1365×900 | Simulated 40ms RTT, 10,240 Kbit/s, 1× CPU | 1.0s / 1.5s |
| mobile | 390×844 | Simulated 150ms RTT, 1,638.4 Kbit/s, 4× CPU | 1.8s / 2.5s |
| slow-3g | 390×844 | Applied 2,000ms request latency, 400 Kbit/s up/down, 4× CPU | 4.0s / 5.0s |

All profiles require median TBT ≤200ms, CLS ≤0.1, transfer size ≤220 kB, and accessibility score 100. These are project regression budgets, not promises about every connection or field Core Web Vitals. Slow-3g is a custom stress profile, not a claim to match a specific DevTools preset. Normal desktop/mobile profiles use Lighthouse simulation; their scores and original trace timings differ.

Each performance run saves timestamped HTML/JSON reports and `summary.json` in `reports/lighthouse/<profile>/`. The summary contains per-metric medians, browser/Lighthouse/Node versions, and effective settings; assertion failures still preserve collected reports. Keep a baseline folder before changes and compare matching profiles, URLs, versions, and machines. Avoid parallel tests or heavy background work. Nix pins software, not host CPU performance. Rebaseline deliberately after toolchain updates. Test deployed hosting separately for CDN, compression, caching, and real network behavior.

## Configuration

### Web fonts

The browser uses committed, subset WOFF2 copies of Space Grotesk and Inconsolata. Typst still uses the original TTFs. Regenerate web fonts after updating the sources or supported character ranges:

```bash
nix develop .#fonts --command bash scripts/build-web-fonts.sh
```

This optional shell supplies FontTools and Brotli; normal builds need neither. Keep both font license files. Extend the subset ranges before adding text in scripts beyond Latin.

Run `pnpm build && pnpm check:loading` to verify inline core CSS, inline math CSS only on math articles, compressed fonts, and control initialization before the full page load. Math font files remain external. Compare cold-cache production-preview runs under the same throttling settings when measuring performance.

### Environment

Copy `.env.example` to `.env`. `SITE_URL` sets the canonical origin and `BASE_PATH` supports project GitHub Pages repositories. The workflow reads repository variables with these names. For a custom domain, set `SITE_URL` to that origin, set `BASE_PATH=/`, and add the domain in the repository's Pages settings.

To enable contact:

1. Create a Formspree form.
2. Set `PUBLIC_FORMSPREE_FORM_ID` locally and as a GitHub Actions repository variable.
3. Add local, GitHub Pages, and custom domains to Formspree's allowed domains.

The public form ID is not a secret. No email address or private API key is placed in frontend form code.

## Writing

Add Markdown or MDX files to `src/content/blog`. Frontmatter is validated in `src/content.config.ts`. The included posts and project descriptions are examples and can be replaced.

## Three.js later

Install `three` only when needed. Import it inside a page-specific Astro component `<script>` so it loads only on that page. Create the renderer after the component mounts; remove resize listeners, stop animation frames, and dispose geometries, materials, and the renderer during teardown. No frontend framework is required.

## Deployment

`.github/workflows/deploy.yml` validates pull requests and deploys `dist/` on pushes to `main` or manual runs. In GitHub, enable **Settings → Pages → Source → GitHub Actions**. For a custom domain, configure it there; GitHub manages the resulting domain metadata and TLS.
