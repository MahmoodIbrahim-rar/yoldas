import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("English is a complete third locale for the UI, plans, and Miri", async () => {
  const [html, app, edge] = await Promise.all([
    read("index.html"),
    read("app.js"),
    read("supabase/functions/health-assistant/index.ts"),
  ]);
  assert.match(html, /data-locale="en">English/);
  assert.match(app, /\["ar", "tr", "en"\]/);
  assert.match(app, /document\.documentElement\.dir = currentLocale === "ar" \? "rtl" : "ltr"/);
  assert.match(app, /UI_TEXT\.en = \{/);
  assert.match(app, /EXTRA_UI_TEXT[\s\S]*en: \{/);
  assert.match(app, /PLAN_QUESTIONS_EN/);
  assert.match(app, /currentLocale === "en" \? PLAN_QUESTIONS_EN/);
  assert.match(edge, /type Locale = "ar" \| "tr" \| "en"/);
  assert.match(edge, /locale === "en"/);
  assert.match(edge, /natural English/);
});
