import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("account creation requires a binary gender choice and passes it only to account setup", async () => {
  const [html, app, accountFunction, sql] = await Promise.all([
    read("index.html"), read("app.js"), read("supabase/functions/account-auth/index.ts"), read("supabase/account-profile-gender-setup.sql"),
  ]);
  assert.match(html, /name="account-gender" value="male"/);
  assert.match(html, /name="account-gender" value="female"/);
  assert.match(html, /id="account-username-field"/);
  assert.match(app, /!\["male", "female"\]\.includes\(gender\)/);
  assert.match(app, /body: \{ mode: "signup", username, password, recoveryEmail, gender \}/);
  assert.match(accountFunction, /gender !== "male" && gender !== "female"/);
  assert.match(accountFunction, /recovery_email: recoveryEmail,\s*gender,/);
  assert.match(sql, /check \(gender is null or gender in \('male', 'female'\)\)/);
  assert.match(accountFunction, /mode === "signup"/);
});

test("Miri receives gender only as limited context without personality inference", async () => {
  const healthFunction = await read("supabase/functions/health-assistant/index.ts");
  assert.match(healthFunction, /select\("gender"\)/);
  assert.match(healthFunction, /never infer personality, preferences, or ability/);
  assert.match(healthFunction, /profileGender = await getProfileGender/);
});

test("existing accounts without a gender are stopped at one profile-completion step", async () => {
  const app = await read("app.js");
  assert.match(app, /async function profileNeedsGender/);
  assert.match(app, /if \(await profileNeedsGender\(user.id\)\)/);
  assert.match(app, /openAccountPanel\("complete_gender"\)/);
  assert.match(app, /accountMode === "complete_gender"/);
  assert.match(app, /let profileGenderComplete = false/);
  assert.match(app, /!profileGenderComplete/);
  assert.match(app, /update\(\{ gender, updated_at:/);
});

test("personal features require a registered account with a completed gender", async () => {
  const [app, html] = await Promise.all([read("app.js"), read("index.html")]);
  assert.doesNotMatch(app, /signInAnonymously/);
  assert.match(app, /function requireRegisteredAccount\(\)/);
  assert.match(app, /currentUser && !currentUser\.is_anonymous && profileGenderComplete/);
  assert.match(app, /function showDashboard\(\) \{\s*if \(!hasRegisteredAccount\(\)\)/);
  assert.match(app, /function switchScreen\(name\) \{\s*if \(!requireRegisteredAccount\(\)\) return;/);
  assert.match(app, /querySelectorAll\("\.tab\[data-screen\], \.mobile-tab\[data-screen\]"\)[\s\S]*switchScreen\(btn\.dataset\.screen\)/);
  assert.match(app, /querySelectorAll\("\[data-go\]"\)[\s\S]*requireRegisteredAccount\(\)/);
  assert.match(app, /async function startJourney\(\)[\s\S]*openAccountPanel\("signup"\)/);
  assert.match(app, /if \(hasRegisteredAccount\(\)\) \{\s*showDashboard\(\);\s*switchScreen\("today"\)/);
  assert.match(app, /if \(!requireRegisteredAccount\(\) \|\| !supabase\) return;/);
  assert.match(app, /if \(!requireRegisteredAccount\(\)\) return;/);
  assert.match(html, /href="#food-library" data-i18n="exploreFoodGuide"/);
  assert.ok(html.indexOf('id="food-library"') < html.indexOf('id="dashboard-view"'));
  assert.match(app, /async function saveReferenceRecipe[\s\S]*requireRegisteredAccount\(\)/);
  assert.match(app, /async function socialCall[\s\S]*requireRegisteredAccount\(\)/);
  assert.match(app, /async function submitPlan[\s\S]*requireRegisteredAccount\(\)/);
  assert.match(app, /async function reviseActivePlan[\s\S]*requireRegisteredAccount\(\)/);
  assert.match(app, /function bindSettings[\s\S]*recovery-email-save[\s\S]*requireRegisteredAccount\(\)/);
  assert.match(app, /async function saveMotivationSettings[\s\S]*requireRegisteredAccount\(\)/);
});
