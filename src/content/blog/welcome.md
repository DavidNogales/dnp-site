---
title: "Why this site stays small"
description: "A quick tour of the choices behind this personal site."
published: 2026-01-10
tags: [Astro, Typst, Nix]
---

This is an **example article**. Replace it with your own writing when ready.

The site uses static HTML by default. Astro handles content, Typst owns the CV, and Nix describes the development tools. The result has no application server at runtime.

## A code sample

```ts
const dependable = (simple: boolean): string => simple ? "usually" : "it depends";
```

| Tool | Role |
| --- | --- |
| Astro | Static site generation |
| Typst | CV source and output |
| Nix | Reproducible toolchain |

Inline mathematics works too: $E = mc^2$.
