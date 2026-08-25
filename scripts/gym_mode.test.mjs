import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("gym mode keeps sessions and sets private to their owner", async () => {
  const sql = await read("supabase/gym-mode-setup.sql");
  assert.match(sql, /create table if not exists public\.gym_sessions/i);
  assert.match(sql, /create table if not exists public\.gym_sets/i);
  assert.match(sql, /gym_sessions\.user_id = auth\.uid\(\)/i);
  assert.match(sql, /unique index if not exists idx_gym_sets_unique_order/i);
});

test("gym mode UI and Miri context rely on recorded sets", async () => {
  const [html, app, assistant] = await Promise.all([
    read("index.html"),
    read("app.js"),
    read("supabase/functions/health-assistant/index.ts"),
  ]);
  assert.match(html, /id="gym-set-form"/);
  assert.match(html, /id="gym-personal-bests"/);
  assert.match(app, /function saveGymSet/);
  assert.match(app, /function loadGymProgress/);
  assert.match(app, /gym_sessions/);
  assert.match(assistant, /gymProgressContext/);
  assert.match(assistant, /سجل الجيم الفعلي للمستخدم/);
  assert.match(html, /id="miri-style-options"/);
  assert.match(app, /miri_style/);
  assert.match(assistant, /getMiriStyle/);
  assert.match(assistant, /Enerjik ve canlı ol/);
});
