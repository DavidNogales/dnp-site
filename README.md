# dnp-site

Personal website built with Astro, Typst, and Nix. Shared YAML content powers the web CV and downloadable PDF.

## Build and run

Requires Nix with flakes enabled and Make.

```bash
cp .env.example .env  # Set local configuration
make install
make run             # Development server
make build           # Compile PDF and static site into dist/
make preview         # Build and preview production output
```

## Deploy

The [GitHub Actions workflow](.github/workflows/deploy.yml) deploys to GitHub Pages on pushes to `main` or manual runs; pull requests only validate the build.

1. Set **Settings → Pages → Source → GitHub Actions**.
2. Under **Settings → Secrets and variables → Actions → Variables**, optionally set `SITE_URL`, `BASE_PATH`, and `PUBLIC_FORMSPREE_FORM_ID`. Defaults target `https://<owner>.github.io/<repository>/`; the contact form requires a Formspree ID.
3. Push to `main` or run the deployment workflow manually.

For a custom domain, configure it in Pages settings, set `SITE_URL` to its HTTPS origin, and set `BASE_PATH=/`.

Details: [development and configuration](docs/DEVELOPMENT.md) · [local tests and performance audits](docs/TESTING.md) · [UI style guide](docs/STYLE_GUIDE.md).
