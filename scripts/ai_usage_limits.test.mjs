import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Miri daily usage is reserved server-side and capped", async () => {
  const [sql, edge, app] = await Promise.all([
    read("supabase/ai-usage-limits-setup.sql"),
    read("supabase/functions/health-assistant/index.ts"),
    read("app.js"),
  ]);
  assert.match(sql, /ai_daily_usage/);
  assert.match(sql, /primary key \(user_id, usage_date\)/);
  assert.match(sql, /reserve_miri_text_request/);
  assert.match(sql, /miri_text_requests < p_limit/);
  assert.match(sql, /auth\.uid\(\) <> p_user_id/);
  assert.match(sql, /release_miri_text_request/);
  assert.match(edge, /MIRI_TEXT_DAILY_LIMIT = 5/);
  assert.match(edge, /reserveMiriTextRequest/);
  assert.match(edge, /mode === "create_plan"/);
  assert.match(edge, /mode === "translate_plan"/);
  assert.match(edge, /mode === "chat"/);
  assert.match(edge, /AI_DAILY_LIMIT/);
  assert.match(edge, /releaseMiriTextRequest/);
  assert.match(app, /aiDailyLimit/);
  assert.match(app, /AI_DAILY_LIMIT/);
});
