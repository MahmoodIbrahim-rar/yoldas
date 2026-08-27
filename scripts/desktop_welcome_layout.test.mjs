import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("desktop and laptop welcome cards remain side-by-side without an intro offset", async () => {
  const css = await readFile(new URL("../style.css", import.meta.url), "utf8");

  assert.match(css, /@media \(min-width: 901px\) and \(max-width: 1350px\)/);
  assert.match(css, /grid-template-columns:\s*minmax\(0, 1\.08fr\) minmax\(0, 0\.92fr\)/);
  assert.match(css, /\.intro-card\s*\{[\s\S]*?margin-top:\s*0;/);
  assert.match(css, /\.hero-card\s*\{[\s\S]*?min-height:\s*620px;/);
  assert.match(css, /@media \(min-width: 901px\) and \(max-width: 1120px\)/);
  assert.match(css, /\.hero-card, \.intro-card \{ min-width: 0; margin: 0; \}/);
});
