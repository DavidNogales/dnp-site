# dnp-site

Static personal site built with Astro, Typst, and Nix.

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

## Configuration

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
