import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("body-progress photos are retired from active UI and Miri", async () => {
  const [html, app, edge, retirementSql] = await Promise.all([
    read("index.html"),
    read("app.js"),
    read("supabase/functions/health-assistant/index.ts"),
    read("supabase/retire-progress-photos.sql"),
  ]);
  assert.doesNotMatch(html, /progress-photo-form/);
  assert.doesNotMatch(html, /progress-photos-card/);
  assert.doesNotMatch(app, /bindProgressPhotos\(\)/);
  assert.doesNotMatch(app, /loadProgressPhotos\(\)/);
  assert.doesNotMatch(app, /mode: "photo_feedback"/);
  assert.doesNotMatch(edge, /mode === "photo_feedback"/);
  assert.doesNotMatch(edge, /callGeminiWithPrivateImage/);
  assert.match(retirementSql, /غير قابل للاسترجاع/);
  assert.match(retirementSql, /delete from storage\.objects/);
});
