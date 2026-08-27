import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Miri is the visible Arabic and Turkish assistant identity", async () => {
  const [html, app] = await Promise.all([read("index.html"), read("app.js")]);
  assert.match(html, /class="assistant-identity"/);
  assert.match(html, /data-i18n="assistantName">Miri/);
  assert.match(app, /assistantGreeting: "أهلًا، أنا ميري/);
  assert.match(app, /assistantGreeting: "Merhaba, ben Miri/);
  assert.match(app, /thinking: "ميري بتحضّر لك ردًا مفيدًا/);
  assert.match(app, /thinking: "Miri yanıtını hazırlıyor/);
});

test("Turkish welcome steps retain left-to-right ordering", async () => {
  const css = await read("style.css");
  assert.match(css, /html\[dir="ltr"\] \{ direction: ltr; \}/);
  assert.match(css, /\.locale-tr \.how-grid, \.locale-tr \.how-detail-panel \{ direction: ltr;/);
  assert.match(css, /\.locale-tr \.how-grid article, \.locale-tr \.how-detail-panel article \{ direction: ltr; text-align: left; \}/);
});

test("Gemini receives Miri’s limited Yoldaş scope while health safeguards remain", async () => {
  const functionSource = await read("supabase/functions/health-assistant/index.ts");
  assert.match(functionSource, /أنت ميري، المساعدة الداعمة داخل Yoldaş لتنظيم اليوم والتغذية والتمارين والحركة والماء/);
  assert.match(functionSource, /Sen Miri'sin/);
  assert.match(functionSource, /لا تشخّص أمراضًا/);
  assert.match(functionSource, /Hastalık teşhisi koyma/);
  assert.match(functionSource, /لا تجيبي عن الرياضيات/);
  assert.match(functionSource, /Never answer mathematics/);
});
