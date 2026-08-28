import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("socialCall preserves a Social Edge Function error code from a non-2xx response", async () => {
  const app = await read("app.js");
  assert.match(app, /async function socialCall\(mode, payload = \{\}\)/);
  assert.match(app, /error\?\.context\?\.clone/);
  assert.match(app, /await error\.context\.clone\(\)\.json\(\)/);
  assert.match(app, /throw new Error\(code \|\| error\?\.message \|\| "social_failed"\)/);
  assert.match(app, /code\.includes\("SNAP_DAILY_LIMIT"\).*t\("snapLimit"\)/);
});
