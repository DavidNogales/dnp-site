# DNP Site Style Guide

This document is the authoritative reference for the site's visual language. Read it before changing UI. When implementation and documentation disagree, either restore the implementation to this guide or update both in the same change.

## Design philosophy

The site uses deliberate visual simplicity:

- Extreme minimalism: every visible element must help navigation, comprehension, or action.
- Typography first: hierarchy comes from type, spacing, and alignment.
- Generous negative space: content should breathe without feeling staged.
- Content over decoration: writing and work are the interface.
- Subtle cyberpunk and industrial character: precise mono details and a restrained red accent provide identity.
- Predictable interaction: links look and behave consistently; controls do not surprise.
- Accessibility and readability: semantic structure, contrast, focus, and comfortable measures are requirements.

Do not add decoration merely to make a page appear more complete. Empty space is part of the design.

## Color system

Colors live in `src/styles/global.css` as semantic custom properties. Components must consume these tokens instead of defining replacements.

| Token | Dark | Light | Role |
| --- | --- | --- | --- |
| `--bg` | `#131212` | `#EEE6DA` | Page background |
| `--surface` | `#1B1919` | `#E2D8CC` | Quiet code and control surfaces |
| `--text` | `#E6DDD0` | `#1A1818` | Primary text |
| `--muted` | `#A79A8D` | `#655C56` | Secondary text and metadata |
| `--border` | `#302A2A` | `#C4B8AA` | Rules and control boundaries |
| `--accent` | `#E62317` | `#B91D15` | Links, active navigation, focus |
| `--accent-hover` | `#FF4B2B` | `#95150E` | Hover state |
| `--code` | `#1B1919` | `#E2D8CC` | Code-block background |

Use red sparingly. Appropriate uses are text links, active navigation, visible focus, and interactive hover states. Do not use red for large backgrounds or ordinary body copy. Use `--surface` only when a distinct reading surface is necessary, not to turn every section into a card.

All text and controls must remain legible in both themes. Never rely on color alone to communicate state: active navigation also uses an underline, and focus uses an outline. New color values, gradients, and translucent decorative overlays require a design-system change.

## Typography

### Families and loading

- `--font-sans`: Space Grotesk, then native sans-serif fallbacks. It is used for headings, prose, project descriptions, the HTML CV, inputs, and buttons. Its compact geometry gives the site character while remaining readable.
- `--font-mono`: Inconsolata, then native monospace fallbacks. It is used for navigation, metadata, dates, technical labels, code, and footer text. It separates interface detail from reading content without adding decoration.

Both families are self-hosted variable TTF files in `src/assets/fonts/`, loaded with `font-display: swap`. `BaseLayout.astro` preloads only Space Grotesk because it renders the primary content. Inconsolata loads when needed. The SIL Open Font License notices are stored beside the fonts. Do not add a remote font request or font-loading package.

### Tokens

| Token | Value | Use |
| --- | --- | --- |
| `--weight-regular` | `400` | Body, metadata, code |
| `--weight-medium` | `500` | Page titles, navigation, article titles, labels |
| `--weight-semibold` | `600` | Section headings and restrained emphasis |
| `--text-2xs` | `.75rem` | Compact dates and footer metadata |
| `--text-xs` | `.78rem` | Metadata and eyebrow labels |
| `--text-sm` | `.9rem` | Navigation and form labels |
| `--text-base` | `1rem` | Body copy |
| `--text-list-heading` | `1.15rem` | Project list headings |
| `--text-lede` | `clamp(1.05rem, 2vw, 1.18rem)` | Introductory copy |
| `--text-h3` | `1.05rem` | Third-level and list headings |
| `--text-h2` | `clamp(1.35rem, 3vw, 1.65rem)` | Section headings |
| `--text-h1` | `clamp(2.25rem, 5vw, 3rem)` | Hero and page titles |
| `--leading-body` | `1.65` | Prose and UI copy |
| `--leading-heading` | `1.2` | Headings |
| `--tracking-tight` | `-.025em` | Headings |
| `--tracking-label` | `.04em` | Occasional small labels |

Use `h1` at weight 500, `h2`/`h3` at 600, and body copy at 400. Do not introduce weights merely for variety. Uppercase and tracking are reserved for brief `.eyebrow` labels; body text and navigation stay normally cased. Long articles keep the body line height and reading width. Inline code and code blocks use Inconsolata.

Responsive heading and lede sizes already use `clamp()`. Do not make hero type larger than `--text-h1` without a documented reason.

### CV typography

The Astro CV follows this web type system and reads data from `cv/data.yaml`. The Typst PDF reads the same data but remains a print-specific layout with its own font metrics and pagination constraints. Keep content synchronized through YAML; do not force identical browser and Typst line breaks. Any print font change must preserve the one-page PDF and be verified through the existing CV build.

## Layout and spacing

- `--max: 60rem` is the outer content width.
- `--reading: 42.5rem` is the preferred measure for prose, forms, and CV sections.
- `.container` supplies responsive horizontal margins. At `40rem` and below it keeps a `1rem` margin on each side.
- Main content uses responsive vertical padding from `4rem` to `7rem`, reduced to `3.5rem` on narrow screens.
- Page introductions and major sections separate themselves with whitespace. Thin borders are acceptable only where they clarify repeated entries or section boundaries.
- Text is left aligned. Right-aligned metadata is acceptable in paired CV rows and must return to left alignment on small screens.

Use rem values and the established `clamp()` patterns. Prefer a few meaningful gaps over a rigid grid or deeply nested wrappers. Large screens should cap line length instead of stretching content. Do not center prose or expand it to fill available space.

Current responsive thresholds are purpose-driven rather than a formal framework:

- `32rem`: blog entry date stacks below title.
- `38rem`: paired CV rows stack.
- `40rem`: global container and navigation adapt.

Add a breakpoint only when content fails, not to target a device brand.

## Component conventions

### Navigation

The home link uses the crescent-harp monogram: the dark and light SVGs follow the site's explicit theme, while the auto SVG is reserved for the browser favicon and follows the operating-system preference. Keep all three source assets in `src/assets/brand/`.

Use semantic `nav` and list markup. Navigation uses Inconsolata 500, muted text, a text-color hover, and an underlined red current page. Keep labels short. Horizontal overflow is preferable to illegibly compressed text.

### Links and buttons

Links use the accent token and retain an underline unless a component's structure already makes the affordance clear. Buttons are plain, rectangular text controls with a one-pixel border. Avoid large filled calls to action. Every interactive element needs a visible `:focus-visible` outline.

### Headings and lists

Use one `h1` for the page topic and descend levels without skipping. Use lists for true collections or sequences. Do not simulate hierarchy with font size alone.

### Projects and blog entries

Project entries are a vertical text list. Blog archive entries pair an article title with a mono date and use a thin divider. Do not wrap entries in cards, add badges, or introduce thumbnail decoration unless the content genuinely requires media.

### Code

Use semantic `code` and `pre`. Code uses Inconsolata, `--code`, `--text`, and a `--border` boundary. Blocks scroll horizontally instead of forcing the page wider. Syntax colors from article tooling must stay readable in both themes and should not introduce decorative glow.

### Forms

Every control has a visible label. Labels and technical hints use Inconsolata; inputs, textareas, and buttons use Space Grotesk. Controls use a transparent background, square corners, and a single border. Validation and submission status must be announced through semantic live regions.

### Footer

Footer metadata is quiet, small, and mono. It should not compete with content or become a secondary navigation panel.

### CV sections

The HTML CV uses ordinary sections, headings, definition lists, and restrained separators. Dates and locations use `.meta`. Keep the web CV responsive and readable; PDF mimicry is not a goal.

## Interaction and animation

Transitions are limited to short color changes. Theme switching must remain keyboard-operable and update accessible state. Avoid parallax, scroll-triggered reveals, glowing effects, animated backgrounds, and decorative motion.

The global `prefers-reduced-motion: reduce` rule disables transitions, animation, and smooth scrolling. New components must work when motion is removed. Never make animation necessary to discover or understand content.

## Responsive design

- Mobile: use one content column, preserve `1rem` side margins, stack paired metadata, and keep touch controls comfortably targetable.
- Tablet: retain readable measures and allow whitespace to grow; do not introduce extra columns without content pressure.
- Desktop: use the `60rem` outer cap and `42.5rem` reading measure. Whitespace is expected.
- Large screens: keep the same caps. Do not scale type or gaps indefinitely to fill the viewport.

Test at narrow and wide widths. Content must not cause horizontal page scrolling; code blocks and navigation may scroll within their own bounds.

## Accessibility

- Use semantic landmarks and native controls before ARIA.
- Maintain one logical heading hierarchy per page.
- Ensure every interaction works by keyboard and displays visible focus.
- Preserve dark- and light-theme contrast for text, borders, and states.
- Pair color states with another cue where meaning is important.
- Associate labels with form controls and provide useful names and status messages.
- Write link text that makes sense out of context.
- Keep DOM order equal to reading and keyboard order.
- Respect reduced-motion preferences.
- Keep touch targets and spacing usable without relying on tiny icons.
- Include alternative text for meaningful images and empty alternative text for decorative images.

## Anti-patterns

Do not introduce:

- Dashboard-style layouts or dense control panels.
- Repeated cards when headings, lists, and spacing suffice.
- Multiple competing accent colors.
- Gradients, glow, unnecessary shadows, or animated backgrounds.
- Oversized hero typography.
- Badge and icon clutter.
- Decorative separators around every section.
- Large, visually dominant buttons.
- Unnecessary nested containers.
- A CSS framework or component library for basic layout.

An exception is justified only when content or usability cannot be served by the existing language—for example, a data visualization that needs a categorical palette. Document the reason, meet accessibility requirements, and update this guide and tokens with the implementation.

## Implementation examples

Use existing tokens in component-scoped CSS:

```astro
<p class="meta"><time datetime={published.toISOString()}>{label}</time></p>

<style>
  .meta {
    color: var(--muted);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
  }
</style>
```

Use semantic structure instead of a decorative card:

```astro
<article class="project-entry">
  <h2><a href={project.url}>{project.title}</a></h2>
  <p>{project.description}</p>
  <p class="meta">{project.technologies}</p>
</article>
```

Use the global button convention rather than creating a new treatment:

```astro
<button class="button" type="submit">Send message</button>
```

When the design system changes, modify the centralized tokens first, update affected components, validate both themes and responsive states, and update this document in the same change.
