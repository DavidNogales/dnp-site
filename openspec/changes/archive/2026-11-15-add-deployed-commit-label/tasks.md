# Tasks

## 1. Build metadata and validation

- [x] 1.1 Add build-time metadata resolution for `BUILD_COMMIT_SHA` and `BUILD_REPOSITORY`; add direct tests covering full SHA normalization, seven-character display, exact full-SHA URL, and missing/malformed inputs with a non-linked local result. Verify these tests run through the local test workflow without GitHub access.
- [x] 1.2 Pass both inputs in `.github/workflows/deploy.yml` from the workflow's source SHA and repository context; verify configuration matches the current checkout revision and introduces no secrets or public runtime environment variables.
- [x] 1.3 Document metadata inputs and local fallback in `docs/DEVELOPMENT.md`; verify examples distinguish explicit deployment metadata from ordinary local builds and require no new global tools.

## 2. Sidebar version label

- [x] 2.1 Add the static build-version component after the theme toggle in `Header.astro`, using existing tokens, full-SHA accessible link text, and plain `local` fallback. Verify generated HTML contains the label without a component script and leaves copyright markup unchanged.
- [x] 2.2 Extend `scripts/test-site.mjs` with fixed metadata and browser tests with exact text/link assertions, keyboard focus, placement below the toggle, theme switching, and page navigation. Verify all four existing desktop/mobile and light/dark projects pass with external requests blocked.
- [x] 2.3 Add short-landscape viewport and JavaScript-disabled coverage; verify the label and toggle stay within the viewport without overlap, navigation remains scrollable, text remains visible, and no label-specific request occurs.
- [x] 2.4 Update the navigation section of `docs/STYLE_GUIDE.md` for the bottom label and preserved safe-area padding; verify implementation matches its documented spacing, typography, and link treatment in both themes.

## 3. Integration checks

- [x] 3.1 Run `make test`; verify Astro checks, loading checks, metadata tests, and browser tests pass with no real external requests or form submissions.
- [x] 3.2 Verify isolated production builds with valid metadata, absent metadata, and invalid metadata; inspect all generated HTML pages for the expected hash/link or non-linked local fallback. Verify a `/dnp-site/` build retains the exact absolute GitHub destination, and restore the root-path test fixture afterward.
- [x] 3.3 Run a focused `pnpm test:perf slow-3g /` inside `nix develop 'path:.#test'`; verify existing performance/accessibility budgets pass without changes and no new client script or version-fetching request is introduced.
- [x] 3.4 Run `pnpm openspec validate add-deployed-commit-label --strict` and `git diff --check`; verify the implementation satisfies the capability scenarios and changes remain within the planned scope.

## Workflow follow-up

- After deployment is separately authorized, compare the displayed hash and full commit link against that deployment's built source revision.
- Archive the change after implementation and review when requested.
