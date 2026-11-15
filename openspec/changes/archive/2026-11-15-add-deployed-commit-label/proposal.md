# Proposal

## Why

The website does not identify which source revision produced the page a visitor is viewing. A small commit label makes deployed versions recognizable without consulting deployment logs.

## What Changes

- Add a compact version label directly below the theme toggle in the sidebar's non-scrolling bottom area, on every page using the shared layout.
- For deployment builds, show the first seven characters of the build's commit SHA and link to that exact commit on GitHub.
- Embed the label in generated HTML without additional browser JavaScript, API requests, or dependencies.
- Use non-linked `local` text when deployment metadata is absent or invalid.
- Preserve theme switching, accessible navigation, bottom safe-area spacing, and the existing copyright footer.
- Non-goals: live update detection, release history, GitHub badges, deployment timestamps, local dirty-tree detection, or changes to the PDF CV.

## Capabilities

### New Capabilities

- `deployment-version`: Static, accessible identification of the source revision represented by the rendered site, with a safe local fallback.

### Modified Capabilities

None. No existing OpenSpec capabilities are defined.

## Impact

- `src/components/Header.astro` and a small build-version component/helper.
- `.github/workflows/deploy.yml` for explicit build metadata.
- `scripts/test-site.mjs`, loading checks, and browser tests for deterministic metadata and layout coverage.
- `docs/DEVELOPMENT.md` and `docs/STYLE_GUIDE.md` for metadata and placement documentation.
- No new runtime dependencies, network services, or repository secrets.
