import { mkdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { delimiter, dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "cv", "main.typ");
const output = join(root, "public", "cv");
const fontPath = join(root, "src", "assets", "fonts");
const typstFontPaths = [fontPath, process.env.TYPST_FONT_PATHS].filter(Boolean).join(delimiter);

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

function typst(args) {
  const result = spawnSync("typst", args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, TYPST_FONT_PATHS: typstFontPaths },
  });
  if (result.error?.code === "ENOENT") {
    console.error("typst not found. Run this command inside `nix develop`.");
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

typst(["compile", source, join(output, "cv.pdf")]);
