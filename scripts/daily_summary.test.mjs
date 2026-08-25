import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("daily spoken summary is absent after the requested removal", async () => {
  const [html, app] = await Promise.all([read("index.html"), read("app.js")]);
  assert.doesNotMatch(html, /play-daily-summary|daily-summary-message/);
  assert.doesNotMatch(app, /buildDailyVoiceSummary|playDailyVoiceSummary|speechSynthesis|SpeechSynthesisUtterance/);
});
