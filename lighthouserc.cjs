const profile = process.env.PERF_PROFILE || "mobile";
const profiles = {
  desktop: { mobile: false, method: "simulate", rtt: 40, kbps: 10240, cpu: 1, fcp: 1000, lcp: 1500 },
  mobile: { mobile: true, method: "simulate", rtt: 150, kbps: 1638.4, cpu: 4, fcp: 1800, lcp: 2500 },
  // Applied request-level throttling; a stress test, not a real-user percentile.
  "slow-3g": { mobile: true, method: "devtools", rtt: 400, kbps: 400, cpu: 4, fcp: 4000, lcp: 5000 },
};
const p = profiles[profile];
if (!p) throw new Error(`Unknown PERF_PROFILE: ${profile}`);
const paths = ["/", "/blog/", "/blog/welcome/", "/cv/", "/contact/"];
if (process.env.PERF_PATH && !paths.includes(process.env.PERF_PATH)) throw new Error("PERF_PATH must be one of the configured local routes.");
const limit = maxNumericValue => ["error", { maxNumericValue, aggregationMethod: "median" }];
module.exports = {
  ci: {
    collect: {
      url: (process.env.PERF_PATH ? [process.env.PERF_PATH] : paths).map(path => `http://127.0.0.1:4173${path}`),
      startServerCommand: "pnpm test:serve",
      startServerReadyPattern: "127.0.0.1:4173",
      startServerReadyTimeout: 30000,
      numberOfRuns: 5,
      chromePath: process.env.CHROME_PATH,
      settings: {
        chromeFlags: "--headless --disable-extensions --force-dark-mode",
        onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
        formFactor: p.mobile ? "mobile" : "desktop",
        screenEmulation: { mobile: p.mobile, width: p.mobile ? 390 : 1365, height: p.mobile ? 844 : 900, deviceScaleFactor: 1, disabled: false },
        throttlingMethod: p.method,
        throttling: { rttMs: p.rtt, throughputKbps: p.kbps, cpuSlowdownMultiplier: p.cpu,
          requestLatencyMs: p.method === "devtools" ? 2000 : 0,
          downloadThroughputKbps: p.method === "devtools" ? p.kbps : 0,
          uploadThroughputKbps: p.method === "devtools" ? p.kbps : 0 },
        disableStorageReset: false,
      },
    },
    assert: {
      assertions: {
        "first-contentful-paint": limit(p.fcp),
        "largest-contentful-paint": limit(p.lcp),
        "total-blocking-time": limit(200),
        "cumulative-layout-shift": limit(.1),
        "total-byte-weight": limit(220000),
        "color-contrast": ["error", { minScore: 1, aggregationMethod: "median" }],
        "categories:accessibility": ["error", { minScore: 1, aggregationMethod: "median" }],
      },
    },
    // Local files only. Never use temporary-public-storage or upload to a server.
    upload: { target: "filesystem", outputDir: process.env.PERF_OUTPUT || `reports/lighthouse/${profile}` },
  },
};
