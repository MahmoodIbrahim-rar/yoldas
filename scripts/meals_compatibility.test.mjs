import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("meals compatibility update is additive and owner-scoped", async () => {
  const [sql, app] = await Promise.all([read("supabase/meals-compatibility-setup.sql"), read("app.js")]);
  assert.match(sql, /add column if not exists meal_type text/);
  assert.match(sql, /add column if not exists calories_estimate integer/);
  assert.match(sql, /add column if not exists notes text/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /auth\.uid\(\) = user_id/);
  assert.doesNotMatch(sql, /drop table|truncate|delete from/i);
  assert.match(app, /code: error\?\.code \|\| "unknown"/);
  assert.match(app, /details: error\?\.details \|\| ""/);
});
