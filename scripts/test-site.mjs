import { spawnSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { buildMetadata } from "../tests/fixtures/build-version.mjs";
import { contactMetadata } from "../tests/fixtures/contact.mjs";

// Override deployment settings; never put a fake form ID in deployable dist/.
const env = { ...process.env, ...buildMetadata, ...contactMetadata, SITE_URL: "http://127.0.0.1:4173", BASE_PATH: "/" };
const astro = "node_modules/astro/astro.js";
function run(command, args) {
  const result = spawnSync(command, args, { env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
if (process.argv[2] === "build") {
  run(process.execPath, ["scripts/build-cv.mjs"]);
  run(process.execPath, [astro, "build", "--outDir", ".test-dist"]);
  run(process.execPath, ["scripts/check-loading.mjs", ".test-dist"]);
} else if (process.argv[2] === "serve") {
  if (!existsSync(".test-dist/index.html")) throw new Error("Run pnpm test:build first.");
  const server = spawn(process.execPath, [astro, "preview", "--outDir", ".test-dist", "--host", "127.0.0.1", "--port", "4173"], { env, stdio: "inherit" });
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.kill(signal));
  server.on("error", error => { throw error; });
  server.on("exit", code => process.exit(code ?? 0));
} else {
  throw new Error("Expected build or serve.");
}
