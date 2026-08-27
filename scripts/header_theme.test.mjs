import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("header uses compact accessible language menus and theme controls in both views", async () => {
  const html = await read("index.html");
  assert.equal((html.match(/data-language-menu/g) || []).length, 2);
  assert.equal((html.match(/class="theme-toggle"/g) || []).length, 2);
  assert.match(html, /aria-haspopup="menu" aria-expanded="false"/);
  assert.match(html, /data-language-current/);
  assert.match(html, /id="welcome-theme-toggle"/);
  assert.match(html, /id="dashboard-theme-toggle"/);
});

test("language and theme follow device preferences first, then preserve manual choices", async () => {
  const app = await read("app.js");
  assert.match(app, /function detectInitialLocale\(\)/);
  assert.match(app, /localStorage\.getItem\("yoldas_locale"\)/);
  assert.match(app, /navigator\.language/);
  assert.match(app, /function detectInitialTheme\(\)/);
  assert.match(app, /prefers-color-scheme: dark/);
  assert.match(app, /localStorage\.getItem\("yoldas_theme"\)/);
  assert.match(app, /localStorage\.setItem\("yoldas_theme", currentTheme\)/);
  assert.match(app, /document\.documentElement\.dir = currentLocale === "ar" \? "rtl" : "ltr"/);
  assert.match(app, /setMetaContent\('meta\[name="theme-color"\]/);
});

test("dropdown behavior and dark-theme CSS prevent mobile header overflow", async () => {
  const [app, css] = await Promise.all([read("app.js"), read("style.css")]);
  assert.match(app, /function closeLanguageMenus/);
  assert.match(app, /event\.key === "Escape"/);
  assert.match(app, /event\.target\.closest\("\[data-language-menu\]"\)/);
  assert.match(css, /\.language-menu-list/);
  assert.match(css, /\.language-menu-button/);
  assert.match(css, /html\[data-theme="dark"\]/);
  assert.match(css, /@media \(max-width: 480px\)[\s\S]*?\.language-menu-button/);
  assert.match(css, /\.topbar-tools \{ display: flex; min-width: 0;/);
});
