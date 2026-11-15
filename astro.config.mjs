import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkMathStyles from "./scripts/remark-math-styles.mjs";

export default defineConfig({
  site: process.env.SITE_URL ?? "https://example.com",
  base: process.env.BASE_PATH ?? "/",
  integrations: [mdx(), sitemap()],
  build: { inlineStylesheets: "auto" },
  vite: {
    preview: { strictPort: true },
    build: {
      // Inline small page styles, not the larger math stylesheet or font assets.
      assetsInlineLimit: (filePath, content) => {
        if (/\.(woff2?|ttf|otf)$/.test(filePath)) return false;
        if (filePath.endsWith(".css")) return content.length < 16 * 1024;
        return undefined;
      },
    },
  },
  markdown: {
    remarkPlugins: [remarkMath, remarkMathStyles],
    rehypePlugins: [rehypeKatex],
    shikiConfig: { theme: "github-dark" },
  },
});
