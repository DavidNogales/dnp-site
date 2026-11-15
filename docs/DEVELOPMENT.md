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

Copy `.env.example` to ignored `.env` for local configuration. Never put private credentials in frontend variables.

- `SITE_URL`: canonical origin; production uses `https://davidnogales.com`.
- `BASE_PATH`: `/` for the apex domain, or `/repository` for project Pages.
- `PUBLIC_FORMSPREE_FORM_ID`: public form ID (`xvkapara`), not the full endpoint.
- `PUBLIC_TURNSTILE_SITE_KEY`: public Cloudflare widget site key.

The workflow reads Actions **repository variables**, not your local `.env` or variables scoped only to the separate deploy job's `github-pages` environment. Changes require a new build/deployment. Both contact identifiers are public; the **Turnstile secret belongs only in Formspree's dashboard**, never in Git, frontend assets, or CI inputs.

### Contact behavior

The static Astro site sends `FormData` (including `cf-turnstile-response`) to Formspree using AJAX. Formspree validates the token server-side. No backend, React, or npm SDK is required. Verification, errors, and success remain on the contact page. The browser only loads Cloudflare's official script after form interaction.

JavaScript is now required: disabled scripts leave controls disabled with an explanation, not a hosted-page fallback. Missing public configuration disables contact. Blocked/failed verification offers retry without sending unverified data. Failed submissions preserve input. Connection loss or an unrecognized success response means delivery is uncertain; check before retrying. Tokens are renewed for subsequent attempts, never reused. No automatic message retries occur.

### Operator setup and coordinated cutover

1. In **Cloudflare → Turnstile**, create a **Managed** widget for `davidnogales.com` (also covers its subdomains). Use hostnames without scheme, path, or port. Keep DNS-only records unchanged and leave pre-clearance disabled; this form needs neither proxying nor WAF clearance.
2. Store its public site key in the repository variable `PUBLIC_TURNSTILE_SITE_KEY`. Keep the matching secret private. For real local testing, prefer a separate development widget/form; allow only intended development hostnames there.
3. Prepare/test the frontend first. If possible, validate the combination on a separate staging Formspree form before changing production.
4. Coordinate deployment with **Formspree → form xvkapara → Settings → CAPTCHA → Adjust settings → Cloudflare Turnstile**. Paste the matching secret and keep CAPTCHA enabled. The two changes are not atomic: old native reCAPTCHA code and new Turnstile settings (or the reverse) may temporarily fail. Do not disable CAPTCHA as a bridge.
5. If Formspree's **Restrict to Domain** is enabled, update it to `davidnogales.com`, without scheme/path. Verify the form's destination email in Formspree.
6. Operator acceptance check: intentionally submit one message, complete any verification, confirm the page never leaves the domain, and confirm receipt. Separately perform an authorized missing/invalid-token rejection check against the configured service. Local mocked tests cannot establish real delivery or server-side enforcement.
7. Rollback both sides together: restore the prior native-submit frontend and its matching reCAPTCHA settings. Never expose the secret or disable protection to work around a mismatch.

Dashboard changes, deployment, and real submissions require operator action or explicit authorization; ordinary local tests perform none of them.

### Troubleshooting

- Missing configuration: set both public repository variables and rebuild. A well-formed but invalid site key will be rejected by Cloudflare; check hostname and key pairing.
- Verification blocked/expired: preserve the message and use **Retry verification**. Script loading and submission each have a 30-second deadline; interactive challenges use Cloudflare's own timeout.
- HTTP 403: inspect the response and provider settings. The earlier `In order to submit via AJAX...` error came from hosted reCAPTCHA settings, not a private form ID.
- Other HTTP errors: inspect the POST status and JSON response in DevTools. The UI renders messages as text, never response HTML.
- Network interruption: delivery may already have occurred. There is no client-side exactly-once guarantee.

References: [Formspree Turnstile integration](https://help.formspree.io/articles/form-and-project-settings/protecting-your-forms-with-cloudflare-turnstile/), [Cloudflare widget configuration](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/), [token validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).

## Build version

The sidebar shows a seven-character commit link below the theme toggle. The deployment workflow supplies `BUILD_COMMIT_SHA` (the full source SHA) and `BUILD_REPOSITORY` (`owner/repository`) automatically. No repository variables or secrets need configuring for these inputs.

Both values are consumed during static rendering. The link uses the full SHA, so cached pages identify their own build even after the branch advances. No browser request or Git command is used to discover a version.

Ordinary local development and builds show non-linked `local` text when metadata is missing or invalid. To preview a particular revision deliberately, supply its full 40-character SHA and repository in the shell before building; do not mistake a local build with uncommitted edits for that deployed revision. If checkout settings change, keep the workflow metadata aligned with the source actually built.

## Content and CV

Add Markdown or MDX files to `src/content/blog`. Frontmatter is validated in `src/content.config.ts`. The included posts and project descriptions are examples and can be replaced.

Both Typst and the themed `/cv/` page load their content from `cv/data.yaml`; edit that file once to update both versions. `pnpm build` compiles `cv/main.typ` to `public/cv/cv.pdf`, then builds Astro. Run `pnpm build:cv` inside the Nix shell to regenerate only the PDF.

## Design and fonts

UI changes must follow the authoritative [style guide](STYLE_GUIDE.md).

### Shared-link preview

`Seo.astro` adds Open Graph and Twitter card metadata to every page, using the dark-logo PNG in `src/assets/brand/`. The image URL is absolute, based on `SITE_URL`, and preserves `BASE_PATH`. The preview is always dark; sharing crawlers do not use the visitor's theme toggle. No image request is added to ordinary page rendering.

After changing the logo or dark background token, regenerate and commit the PNG:

```bash
nix develop 'path:.#test' --command node scripts/build-social-image.mjs
```

Normal builds need no browser or image-generation step. Astro fingerprints the image URL when its contents change. Deploy before checking Discord/WhatsApp previews; those services may retain previously cached previews. Local tests verify the metadata and image, not third-party cache refresh timing.

Run `pnpm test:social-builds` for root/subpath HTML and PNG checks. Run it separately from other build suites because Astro caches are shared. The regular browser suite also checks that theme changes/navigation preserve the preview URL and that normal page loads do not fetch the sharing image.

### Font assets

The browser uses committed, subset WOFF2 copies of Space Grotesk and Inconsolata. Typst still uses the original TTFs. Regenerate web fonts after updating the sources or supported character ranges:

```bash
nix develop .#fonts --command bash scripts/build-web-fonts.sh
```

This optional shell supplies FontTools and Brotli; normal builds need neither. Keep both font license files. Extend the subset ranges before adding text in scripts beyond Latin.

Run `pnpm build && pnpm check:loading` to verify inline core CSS, inline math CSS only on math articles, compressed fonts, and control initialization before the full page load. Math font files remain external. Compare cold-cache production-preview runs under the same throttling settings when measuring performance.
