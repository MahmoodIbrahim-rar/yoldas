import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("page title, descriptions, and sharing metadata follow the selected locale", async () => {
  const [html, app] = await Promise.all([read("index.html"), read("app.js")]);
  assert.match(html, /<meta name="description" content="Yoldaş يساعدك/);
  assert.match(html, /<meta property="og:title"/);
  assert.match(html, /<meta name="twitter:description"/);
  assert.match(app, /const PAGE_META = \{/);
  assert.match(app, /title: "Yoldaş \| خطة أكل وتمارين ومتابعة صحية يومية"/);
  assert.match(app, /title: "Yoldaş \| Kişisel beslenme ve egzersiz planın"/);
  assert.match(app, /title: "Yoldaş \| Personal food plan, workouts and daily tracking"/);
  assert.match(app, /ogLocale: "ar_EG"/);
  assert.match(app, /ogLocale: "tr_TR"/);
  assert.match(app, /ogLocale: "en_US"/);
  assert.match(app, /document\.title = meta\.title/);
  assert.match(app, /setMetaContent\('meta\[name="description"\]', meta\.description\)/);
  assert.match(app, /setMetaContent\('meta\[property="og:description"\]', meta\.description\)/);
  assert.match(app, /setMetaContent\('meta\[name="twitter:description"\]', meta\.description\)/);
  assert.match(app, /function applyLocale\(\) \{[\s\S]*?updatePageMeta\(\);/);
});
