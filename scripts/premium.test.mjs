import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Premium uses a small entitlement model and hashed one-time code redemption", async () => {
  const sql = await read("supabase/premium-billing-setup.sql");
  assert.match(sql, /premium_entitlements/);
  assert.match(sql, /premium_plan_usage_events/);
  assert.match(sql, /premium_codes/);
  assert.match(sql, /code_hash text not null unique/);
  assert.match(sql, /grant_days integer not null default 30 check \(grant_days = 30\)/);
  assert.match(sql, /reserved_at >= now\(\) - interval '30 days'/);
  assert.match(sql, /redeem_premium_code\(p_code text\)/);
  assert.match(sql, /unique \(code_id, user_id\)/);
  assert.match(sql, /idx_premium_one_code_per_user/);
  assert.match(sql, /premium_code_attempt_windows/);
  assert.match(sql, /attempt_count integer/);
  assert.match(sql, /if attempt_count > 8 then return query select false, 'REDEEM_RATE_LIMIT'/);
  assert.match(sql, /drop function if exists public\.reserve_premium_monthly_action\(uuid, text, integer\)/);
  assert.match(sql, /create or replace function public\.reserve_premium_monthly_action\(p_user_id uuid, p_action text\)/);
  assert.match(sql, /where user_id = p_user_id and tier = 'premium' and premium_until > now\(\)/);
  assert.doesNotMatch(sql, /p_limit/);
});

test("Premium server keeps payment keys and webhook verification off the client", async () => {
  const [billing, app] = await Promise.all([
    read("supabase/functions/billing-service/index.ts"),
    read("app.js"),
  ]);
  assert.match(billing, /IYZICO_MERCHANT_ID/);
  assert.match(billing, /IYZICO_SECRET_KEY/);
  assert.match(billing, /X-IYZ-SIGNATURE-V3/);
  assert.match(billing, /constantTimeEqual/);
  assert.match(billing, /authData\.user\.is_anonymous/);
  assert.doesNotMatch(app, /IYZICO_SECRET_KEY|IYZICO_MERCHANT_ID/);
});

test("Premium limits are explicit and the new-account dialog is once-only", async () => {
  const [billing, health, app] = await Promise.all([
    read("supabase/functions/billing-service/index.ts"),
    read("supabase/functions/health-assistant/index.ts"),
    read("app.js"),
  ]);
  assert.match(billing, /miriDailyLimit: 3, planCreateLimit: 1, planRevisionLimit: 2/);
  assert.match(billing, /miriDailyLimit: 15, planCreateLimit: 4, planRevisionLimit: 12/);
  assert.match(health, /miriDailyLimit: 3, planCreateLimit: 1, planRevisionLimit: 2/);
  assert.match(health, /miriDailyLimit: 15, planCreateLimit: 4, planRevisionLimit: 12/);
  assert.match(app, /yoldas_premium_welcome_seen_\$\{user\.id\}/);
  assert.match(app, /Date\.now\(\) - createdAt < 10 \* 60 \* 1000/);
  assert.match(app, /setTimeout\(\(\) => showPremiumDialog\(\), 500\)/);
  assert.match(app, /premiumT\("planCreateLimit"\)/);
  assert.match(app, /premiumT\("planRevisionLimit"\)/);
});

test("Miri and plan reservations are released on save failures and cached translations stay free", async () => {
  const health = await read("supabase/functions/health-assistant/index.ts");
  assert.match(health, /if \(insertError\) \{\s+await releaseMiriTextRequest\(supabase, userId\);\s+await releasePremiumPlanAction\(supabase, userId, "plan_create"\);/);
  assert.match(health, /if \(insertError \|\| !inserted\) \{\s+await releaseMiriTextRequest\(supabase, userId\);\s+await releasePremiumPlanAction\(supabase, userId, "plan_revise"\);/);
  assert.match(health, /if \(updateError\) \{\s+await releaseMiriTextRequest\(supabase, userId\);/);
  assert.match(health, /if \(userMessageError\) \{\s+await releaseMiriTextRequest\(supabase, userId\);/);
  assert.match(health, /if \(assistantMessageError\) \{\s+await releaseMiriTextRequest\(supabase, userId\);/);
  assert.match(health, /if \(translations\[locale\]\) \{\s+return jsonResponse/);
  assert.match(health, /reserve_premium_monthly_action", \{ p_user_id: userId, p_action: action \}/);
  assert.doesNotMatch(health, /reserve_premium_monthly_action", \{[^}]*p_limit/);
});

test("Premium local features need an active entitlement and do not call Miri", async () => {
  const app = await read("app.js");
  const premiumBlock = app.slice(app.indexOf("function renderPremiumSurfaces"), app.indexOf("function renderGymProgress"));
  assert.match(app, /function isPremiumMember\(\)/);
  assert.match(app, /premium-day-rescue/);
  assert.match(app, /premium-gym-advisor/);
  assert.match(app, /data-rescue/);
  assert.match(app, /otomatik kayıt ve Miri isteği yok/);
  assert.match(app, /function startGuestExploration\(\)[\s\S]*food-library[\s\S]*scrollIntoView/);
  assert.match(app, /currentUser && !currentUser\.is_anonymous && profileGenderComplete/);
  assert.match(premiumBlock, /activePlanForRescue/);
  assert.match(premiumBlock, /referenceRecipes/);
  assert.match(premiumBlock, /premiumT\("gymCaution"\)/);
  assert.match(premiumBlock, /premiumT\("checkout"\)/);
  assert.doesNotMatch(premiumBlock, /Kapat|Kodum var|Premium etkinleştirildi/);
});

test("food reference catalog remains a valid local 100-recipe file", async () => {
  const recipes = JSON.parse(await read("data/reference_recipes.json"));
  assert.ok(Array.isArray(recipes));
  assert.equal(recipes.length, 100);
});
