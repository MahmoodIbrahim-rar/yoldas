import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("active plans are saved per user and shown in the fifth summary card", async () => {
  const [html, app, edge] = await Promise.all([
    read("index.html"),
    read("app.js"),
    read("supabase/functions/health-assistant/index.ts"),
  ]);
  assert.match(html, /id="active-plan-value"/);
  assert.match(app, /active_plan_types/);
  assert.match(app, /select\("id, plan_type"\)/);
  assert.match(app, /activePlanBoth/);
  assert.match(edge, /insert\(\{ user_id: userId, plan_type: planType, answers_json: answers, plan_json: planJson, is_active: true \}\)/);
  assert.match(edge, /\.eq\("user_id", userId\)/);
});
