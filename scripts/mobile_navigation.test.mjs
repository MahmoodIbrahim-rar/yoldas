import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("mobile navigation uses compact controls and line icons", async () => {
  const [html, css] = await Promise.all([read("index.html"), read("style.css")]);
  const mobileNav = html.match(/<nav id="mobile-nav"[\s\S]*?<\/nav>/)?.[0] || "";
  assert.match(html, /id="mobile-nav"/);
  assert.match(mobileNav, /class="mobile-icon"/);
  assert.doesNotMatch(mobileNav, /🏠|📋|💬|📈|⚙️/);
  assert.match(css, /dashboard-nav #reset-journey::before/);
  assert.match(css, /\.dashboard-nav \{[\s\S]*?position: sticky/);
  assert.match(css, /\.mobile-icon svg/);
  assert.match(css, /\.mobile-tab\.active::before/);
});
