import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../supabase/functions/health-assistant/index.ts", import.meta.url), "utf8");

test("Miri rejects unrelated messages before reserving a Gemini request", () => {
  assert.match(source, /const MIRI_SCOPE_PATTERNS = \[/);
  assert.match(source, /const MATH_ONLY_PATTERN =/);
  assert.match(source, /function isMiriInScope\(message: string\)/);
  assert.match(source, /function outOfScopeReply\(locale: Locale\)/);
  const chatStart = source.indexOf('if (mode === "chat")');
  const scopeCheck = source.indexOf("if (!isMiriInScope(message))", chatStart);
  const reserveCall = source.indexOf("const reservation = await reserveMiriTextRequest", chatStart);
  assert.ok(chatStart >= 0 && scopeCheck > chatStart && reserveCall > scopeCheck, "scope guard must run before Gemini usage reservation");
  assert.match(source, /mathematics|Matematik|الرياضيات/);
  assert.match(source, /outOfScope: true/);
});
