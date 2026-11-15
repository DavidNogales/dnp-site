import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";
import { basename } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import remarkMathStyles from "./remark-math-styles.mjs";
const dist = process.argv[2] ?? "dist";

// Run after the production build, including when testing a non-root BASE_PATH.
for (const page of ["index", "projects/index", "cv/index", "contact/index", "blog/index", "blog/data-pipelines/index"]) {
  const html = readFileSync(`${dist}/${page}.html`, "utf8");
  assert.doesNotMatch(html, /<link\b[^>]*rel="stylesheet"/, `${page}: unexpected blocking stylesheet`);
  assert.doesNotMatch(html, /\.ttf|\.katex\{/, `${page}: unnecessary font/math payload`);
  assert.match(html, /font-display:swap/);
  assert.match(html, /type="font\/woff2"/);
}
const mathPage = readFileSync(`${dist}/blog/welcome/index.html`, "utf8");
assert.match(mathPage, /class="katex"/);
assert.doesNotMatch(mathPage, /<link\b[^>]*rel="stylesheet"/, "Math page must not add a blocking CSS request");
const mathCss = mathPage.match(/<style data-math="katex">([\s\S]*?)<\/style>/)[1];
assert.match(mathCss, /\.katex/);
for (const [, url] of mathCss.matchAll(/url\(([^)]+)\)/g)) {
  assert.ok(existsSync(`${dist}/_astro/${basename(url.replaceAll('"', "").replaceAll("'", ""))}`), `Missing math font: ${url}`);
}
let before = 0, after = 0;
for (const family of ["space-grotesk", "inconsolata"]) {
  const path = `src/assets/fonts/${family}-variable`;
  before += statSync(`${path}.ttf`).size;
  after += statSync(`${path}.woff2`).size;
  assert.equal(readFileSync(`${path}.woff2`).subarray(0, 4).toString(), "wOF2");
}
assert.ok(after <= 105_000, "Combined web fonts exceed the 105 kB budget");

for (const type of ["inlineMath", "math", "code", "text"]) {
  const file = { data: { astro: { frontmatter: {} } } };
  remarkMathStyles()({ children: [{ children: [{ type, value: "$x$" }] }] }, file);
  assert.equal(file.data.astro.frontmatter.hasMath, type === "math" || type === "inlineMath");
}

// Exercise initialization before window.load and across repeated page swaps.
for (const [component, event] of [["ThemeToggle", "click"], ["ContactForm", "submit"]]) {
  const listeners = new Map();
  const createElement = () => ({
    handlers: [],
    addEventListener(name, callback) { this.handlers.push({ name, callback }); },
    setAttribute() {},
    querySelector() { return {}; },
  });
  let element = createElement();
  const document = {
    documentElement: { dataset: { theme: "dark" } },
    querySelector: () => element,
    addEventListener: (name, callback) => listeners.set(name, callback),
  };
  const source = readFileSync(`src/components/${component}.astro`, "utf8").match(/<script>([\s\S]*?)<\/script>/)[1];
  runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText,
    { document, localStorage: { setItem() {} } });
  assert.equal(element.handlers.length, 1, `${component}: initialize without load event`);
  assert.equal(element.handlers[0].name, event);
  listeners.get("astro:after-swap")();
  assert.equal(element.handlers.length, 1, `${component}: no duplicate listener`);
  element = createElement();
  listeners.get("astro:after-swap")();
  assert.equal(element.handlers.length, 1, `${component}: initialize replaced element`);
  if (component === "ThemeToggle") {
    element.handlers[0].callback();
    assert.equal(document.documentElement.dataset.theme, "light");
    element.handlers[0].callback();
    assert.equal(document.documentElement.dataset.theme, "dark");
  }
}
console.log(`Loading checks passed; web fonts ${before} → ${after} bytes.`);
