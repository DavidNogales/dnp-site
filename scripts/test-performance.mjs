import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const profile = process.argv[2] ?? "mobile";
if (!["desktop", "mobile", "slow-3g"].includes(profile)) throw new Error("Use desktop, mobile, or slow-3g.");
const output = `reports/lighthouse/${profile}/${new Date().toISOString().replaceAll(":", "-")}`;
const path = process.argv[3] ?? "";
if (path && !["/", "/blog/", "/blog/welcome/", "/cv/", "/contact/"].includes(path)) throw new Error("Choose a configured local route, including its trailing slash.");
const env = { ...process.env, PERF_PROFILE: profile, PERF_PATH: path, PERF_OUTPUT: output };
function run(args) {
  const result = spawnSync("pnpm", args, { env, stdio: "inherit" });
  if (result.error) throw result.error;
  return result.status ?? 1;
}
if (run(["test:build"])) process.exit(1);
// Separate commands retain reports even when a regression assertion fails.
if (run(["exec", "lhci", "collect", "--config=lighthouserc.cjs"])) process.exit(1);
const assertionStatus = run(["exec", "lhci", "assert", "--config=lighthouserc.cjs"]);
const uploadStatus = run(["exec", "lhci", "upload", "--config=lighthouserc.cjs", "--target=filesystem", `--outputDir=${output}`]);
mkdirSync(output, { recursive: true });
if (existsSync(".lighthouseci/assertion-results.json")) {
  copyFileSync(".lighthouseci/assertion-results.json", join(output, "assertion-results.json"));
}
const reports = readdirSync(".lighthouseci").filter(name => /^lhr-.*\.json$/.test(name));
const grouped = new Map();
for (const name of reports) {
  const report = JSON.parse(readFileSync(join(".lighthouseci", name), "utf8"));
  copyFileSync(join(".lighthouseci", name), join(output, name));
  const list = grouped.get(report.finalUrl) ?? [];
  list.push(report);
  grouped.set(report.finalUrl, list);
}
const median = values => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
const summary = [...grouped].map(([url, runs]) => ({
  url, runs: runs.length,
  lighthouse: runs[0].lighthouseVersion,
  browser: runs[0].environment.hostUserAgent,
  settings: runs[0].configSettings,
  medians: Object.fromEntries(["first-contentful-paint", "largest-contentful-paint", "speed-index", "total-blocking-time", "cumulative-layout-shift", "total-byte-weight"].map(id => [id, median(runs.map(r => r.audits[id].numericValue))])),
}));
const chromiumVersion = process.env.CHROME_PATH
  ? spawnSync(process.env.CHROME_PATH, ["--version"], { encoding: "utf8" }).stdout?.trim()
  : undefined;
writeFileSync(join(output, "summary.json"), JSON.stringify({ profile, node: process.version, chromiumVersion, passed: !assertionStatus && !uploadStatus, summary }, null, 2));
console.table(summary.map(({ url, runs, medians: m }) => ({ page: new URL(url).pathname, runs, FCP: Math.round(m["first-contentful-paint"]), LCP: Math.round(m["largest-contentful-paint"]), TBT: Math.round(m["total-blocking-time"]), CLS: m["cumulative-layout-shift"].toFixed(4), kB: Math.round(m["total-byte-weight"] / 1000) })));
console.log(`Local reports: ${output}`);
process.exitCode = assertionStatus || uploadStatus;
