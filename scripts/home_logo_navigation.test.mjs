import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("every Yoldaş wordmark safely returns the user to the welcome page", async () => {
  const root = new URL("../", import.meta.url);
  const [html, app] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
  ]);

  assert.equal((html.match(/data-home-link/g) || []).length, 2);
  assert.match(html, /href="#welcome-view" data-home-link/);
  assert.match(app, /document\.querySelectorAll\("\[data-home-link\]"\)/);
  assert.match(app, /homeConfirm:/);
  assert.match(app, /isDashboardOpen && !window\.confirm\(t\("homeConfirm"\)\)/);
  assert.match(app, /showWelcome\(\);/);
  assert.match(app, /window\.scrollTo\(\{ top: 0, behavior: "smooth" \}\)/);
  assert.doesNotMatch(app, /data-home-link[\s\S]{0,220}signOut/);
});
