# Development and configuration

[Back to README](../README.md)

## Local workflow

Use the Make targets in the README, or work directly inside the Nix shell:

```bash
nix develop
pnpm install --frozen-lockfile
pnpm dev
```

Run `pnpm build` for production output and `pnpm preview` to serve it locally. `pnpm check` (or `make check`) runs Astro's checks. See [testing](TESTING.md) for browser tests and performance audits.

For spec-driven planning and implementation, see [OpenSpec](OPENSPEC.md).

## Environment and contact form

Copy `.env.example` to `.env` before configuring local builds. `.env` is ignored by Git; never put private credentials in public frontend variables.

- `SITE_URL`: canonical origin, such as `https://example.com`.
- `BASE_PATH`: deployment path; use `/` for a root site or `/repository` for project GitHub Pages.
- `PUBLIC_FORMSPREE_FORM_ID`: public Formspree endpoint identifier, not a secret.

The deployment workflow reads GitHub Actions **repository variables**, not the local `.env`. Its defaults use the repository owner's GitHub Pages origin and the repository name as the base path. For a custom domain, set `SITE_URL` to that origin, set `BASE_PATH=/`, and configure the domain in the repository's Pages settings.

To enable contact:

1. Create a Formspree form.
2. Set `PUBLIC_FORMSPREE_FORM_ID` locally and as a GitHub Actions repository variable.
3. Add local, GitHub Pages, and custom domains to Formspree's allowed domains.

No email address or private API key is placed in frontend form code.

## Content and CV

Add Markdown or MDX files to `src/content/blog`. Frontmatter is validated in `src/content.config.ts`. The included posts and project descriptions are examples and can be replaced.

Both Typst and the themed `/cv/` page load their content from `cv/data.yaml`; edit that file once to update both versions. `pnpm build` compiles `cv/main.typ` to `public/cv/cv.pdf`, then builds Astro. Run `pnpm build:cv` inside the Nix shell to regenerate only the PDF.

## Design and fonts

UI changes must follow the authoritative [style guide](STYLE_GUIDE.md).

The browser uses committed, subset WOFF2 copies of Space Grotesk and Inconsolata. Typst still uses the original TTFs. Regenerate web fonts after updating the sources or supported character ranges:

```bash
nix develop .#fonts --command bash scripts/build-web-fonts.sh
```

This optional shell supplies FontTools and Brotli; normal builds need neither. Keep both font license files. Extend the subset ranges before adding text in scripts beyond Latin.

Run `pnpm build && pnpm check:loading` to verify inline core CSS, inline math CSS only on math articles, compressed fonts, and control initialization before the full page load. Math font files remain external. Compare cold-cache production-preview runs under the same throttling settings when measuring performance.
