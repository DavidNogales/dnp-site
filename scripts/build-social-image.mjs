import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

// Optional regeneration only; ordinary builds use the committed PNG.
const logo = readFileSync(new URL("../src/assets/brand/rune-harp-dark.svg", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/styles/global.css", import.meta.url), "utf8");
const background = styles.match(/--bg:\s*(#[\da-f]{6})/i)?.[1];
if (!background) throw new Error("Missing dark background token");
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.route("**/*", route => route.abort());
  await page.setContent(`<style>
    body { margin: 0; width: 1200px; height: 630px; display: grid; place-items: center; background: ${background}; }
    svg { width: 500px; height: 500px; }
  </style>${logo}`);
  await page.screenshot({
    path: fileURLToPath(new URL("../src/assets/brand/social-preview.png", import.meta.url)),
    type: "png",
  });
} finally {
  await browser.close();
}
