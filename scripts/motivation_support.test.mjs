import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("motivation support requires opt-in and never exposes aliases", async () => {
  const [sql, app, html] = await Promise.all([
    read("supabase/motivation-support-setup.sql"),
    read("app.js"),
    read("index.html"),
  ]);
  assert.match(sql, /is_opted_in boolean not null default false/);
  assert.match(sql, /Users read opted in motivation notes/);
  assert.match(app, /\.eq\("is_opted_in", true\)/);
  assert.match(app, /select\("id, message"\)/);
  assert.doesNotMatch(app, /motivation_notes"\)\.select\("alias/);
  assert.match(html, /id="motivation-opt-in"/);
  assert.match(html, /id="get-motivation"/);
  assert.match(app, /function refreshMotivationSetupState/);
  assert.match(app, /await refreshMotivationSetupState\(\)/);
});
