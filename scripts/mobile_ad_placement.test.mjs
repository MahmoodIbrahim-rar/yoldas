import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the original interface keeps balanced mobile-ready ad placements across major open sections", async () => {
  const [html, css] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../style.css", import.meta.url), "utf8"),
  ]);

  assert.match(html, /feature-list[\s\S]*ad-slot-mobile[\s\S]*welcome-actions/);
  assert.match(html, /data-ad-slot="welcome-mobile-inline"/);
  assert.doesNotMatch(html, /class="privacy"/);
  for (const slot of ["how-mobile-inline", "today-mobile-inline", "plans-mobile-inline", "assistant-mobile-inline", "progress-mobile-inline"]) {
    assert.match(html, new RegExp(`data-ad-slot="${slot}"`));
  }
  assert.match(css, /\.ad-slot-mobile\s*\{\s*display:\s*none;/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*\.ad-slot-mobile\s*\{[\s\S]*display:\s*flex;/);
});
