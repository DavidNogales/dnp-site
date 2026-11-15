# Design

## Context

See [proposal.md](proposal.md) for motivation and [the capability spec](specs/deployment-version/spec.md) for behavior. `Header.astro` already separates scrollable `.bar` navigation from the fixed-bottom `.theme-corner`. `BaseLayout.astro` includes this header across the site. The copyright footer occupies a separate region to the right.

The deployment workflow checks out the workflow revision, builds through Nix, and uploads `dist/`; pull requests build but do not deploy. No version metadata is currently passed explicitly. Tests use a separate `.test-dist/` fixture and block third-party browser traffic.

This design spans build configuration, shared UI, and deterministic tests, so a design artifact is warranted.

## Goals / Non-Goals

**Goals:** Keep version metadata tied to the generated artifact, constrain it to build-time rendering, and use the existing sidebar structure without changing global layout dimensions.

**Non-Goals:** No Git subprocess in page rendering, GitHub API integration, live freshness indicator, new release workflow, or persistent metadata service. See the proposal for user-facing scope exclusions.

## Decisions

### Explicit build inputs

Add `BUILD_COMMIT_SHA` from `${{ github.sha }}` and `BUILD_REPOSITORY` from `${{ github.repository }}` to the workflow's existing Build environment. With the current checkout behavior, these describe the source being compiled. Read these inputs only in Astro build-time code; no `PUBLIC_` variables or secrets are necessary.

Use explicit metadata rather than executing Git: archives and local environments need not contain `.git`, and local uncommitted changes must not be presented as a known deployment. Do not fetch the current branch head: it could differ from the served artifact. If checkout configuration changes later, metadata must track the checked-out source rather than blindly retaining the triggering SHA.

### Small static component

Introduce a small `BuildVersion.astro` component rendered after `ThemeToggle` inside `.theme-corner`. Keep parsing in a small pure helper if needed for direct edge-case tests. Accept a full 40-character hexadecimal SHA and an owner/repository pair containing only GitHub identifier characters; reject empty segments, additional path segments, URL schemes, and query/fragment characters. Trim surrounding whitespace, normalize SHA case, and construct the fixed-host HTTPS URL only after validation.

For valid inputs, show only seven hash characters in the compact sidebar, with an accessible name such as `Build commit <full-sha>`. The full SHA is used for the link destination. Keep ordinary same-tab link behavior. Missing or invalid inputs produce plain `local` text; no placeholder link and no implicit local Git lookup.

Seven-character display, exact-commit linking, local fallback, and normal link behavior are proposed defaults from exploration; sidebar placement below the toggle was explicitly chosen by the user.

### Reuse existing presentation

Use Inconsolata and existing small text, link, hover, and focus tokens. Retain a comfortable link hit area without enlarging the visible hash text. Stack the component below the toggle, keeping the bottom region non-shrinking and its existing safe-area padding. Navigation continues to consume the remaining height and scroll independently. Do not change `Footer.astro`, sidebar width, fonts, or transition behavior.

The alternative footer placement was rejected during exploration. A new floating badge would duplicate fixed-position layout concerns and add unwanted visual weight.

### Deterministic validation

Give `.test-dist/` a fixed full SHA and repository by explicitly overriding both inputs in `scripts/test-site.mjs`, independent of the developer shell or CI environment. Test parsing/fallback separately, including absent and malformed inputs. Check generated HTML for the known hash and full destination; verify a missing-metadata build and a `/dnp-site/` base-path build without replacing deployable `dist/` with test fixtures.

Extend browser coverage for label placement, keyboard focus, navigation/theme persistence, narrow and short viewports, and disabled JavaScript. Inspect destinations without contacting GitHub. Existing loading checks and a focused slow-3G home-page audit guard against new requests or rendering regressions.

## Risks / Trade-offs

- Short hashes can collide -> links and accessible names retain the full SHA; the short value is only a display label.
- Bottom content reduces available navigation height -> retain `.bar` scrolling and test short landscape viewports as well as current mobile/desktop projects.
- Missing metadata silently looks local -> verify the workflow supplies both inputs and test generated deployment HTML before release.
- Cached HTML can show an earlier hash -> intentional: the label identifies the page being viewed, not a remote latest version.
- Fixed-width display does not communicate a semantic release number -> intentional; release versioning is outside scope.

## Migration Plan

Ship metadata wiring and component together through the existing Pages build. No data migration, new credentials, or infrastructure is required. Verify the deployed label against that build's source SHA after deployment. Rollback restores the previous static artifact or reverts this feature; neither affects CV content or contact settings.
