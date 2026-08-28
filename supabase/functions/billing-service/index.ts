// Yoldaş Premium — account status, code redemption, and iyzico subscription webhook.
// Secrets belong only in Supabase: IYZICO_MERCHANT_ID and IYZICO_SECRET_KEY.
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const fail = (code: string, status = 400) => json({ ok: false, code }, status);
const free = { tier: "free", isPremium: false, miriDailyLimit: 3, planCreateLimit: 1, planRevisionLimit: 2 };
const premium = (until: string) => ({ tier: "premium", isPremium: true, premiumUntil: until, miriDailyLimit: 15, planCreateLimit: 4, planRevisionLimit: 12 });

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}

async function hmacHex(key: string, message: string) {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey("raw", encoder.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message)));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return fail("METHOD_NOT_ALLOWED", 405);
  const url = new URL(request.url);
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE) return fail("SERVER_CONFIGURATION", 500);
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  if (url.searchParams.get("webhook") === "iyzico") {
    const merchantId = Deno.env.get("IYZICO_MERCHANT_ID");
    const secret = Deno.env.get("IYZICO_SECRET_KEY");
    if (!merchantId || !secret) return fail("PAYMENT_SETUP_REQUIRED", 503);
    let event: Record<string, unknown>;
    try { event = await request.json(); } catch { return fail("INVALID_WEBHOOK"); }
    const eventRef = String(event.iyziReferenceCode || "");
    const eventType = String(event.iyziEventType || "");
    const subscriptionRef = String(event.subscriptionReferenceCode || "");
    const orderRef = String(event.orderReferenceCode || "");
    const customerRef = String(event.customerReferenceCode || "");
    const supplied = request.headers.get("X-IYZ-SIGNATURE-V3") || "";
    if (!eventRef || !eventType || !subscriptionRef || !orderRef || !customerRef || !supplied) return fail("INVALID_WEBHOOK", 400);
    const calculated = await hmacHex(secret, `${merchantId}${secret}${eventType}${subscriptionRef}${orderRef}${customerRef}`);
    if (!constantTimeEqual(calculated, supplied.toLowerCase())) return fail("INVALID_WEBHOOK_SIGNATURE", 401);
    const { error: eventError } = await admin.from("billing_events").insert({ provider: "iyzico", provider_event_ref: eventRef, event_type: eventType, subscription_ref: subscriptionRef });
    if (eventError?.code === "23505") return json({ ok: true, duplicate: true });
    if (eventError) return fail("BILLING_EVENT_SAVE_FAILED", 500);
    if (eventType === "subscription.order.success") {
      const until = new Date(); until.setMonth(until.getMonth() + 1);
      await admin.from("premium_entitlements").update({ tier: "premium", premium_until: until.toISOString(), source: "iyzico", updated_at: new Date().toISOString() }).eq("provider_subscription_ref", subscriptionRef);
    }
    await admin.from("billing_events").update({ status: "processed", processed_at: new Date().toISOString() }).eq("provider", "iyzico").eq("provider_event_ref", eventRef);
    return json({ ok: true });
  }

  const auth = request.headers.get("Authorization");
  if (!auth) return fail("AUTH_REQUIRED", 401);
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: auth } } });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user || authData.user.is_anonymous) return fail("AUTH_REQUIRED", 401);
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return fail("INVALID_REQUEST"); }
  const mode = String(body.mode || "");
  if (mode === "status") {
    const { data } = await userClient.from("premium_entitlements").select("tier, premium_until").eq("user_id", authData.user.id).maybeSingle();
    return json({ ok: true, entitlement: data?.tier === "premium" && data.premium_until && new Date(data.premium_until).getTime() > Date.now() ? premium(data.premium_until) : free });
  }
  if (mode === "redeem_code") {
    const code = String(body.code || "").trim();
    if (!/^[A-Za-z0-9-]{8,64}$/.test(code)) return fail("INVALID_CODE");
    const { data, error } = await userClient.rpc("redeem_premium_code", { p_code: code });
    const result = Array.isArray(data) ? data[0] : data;
    if (error || !result?.ok) return fail(String(result?.code || "INVALID_CODE"), 409);
    return json({ ok: true, entitlement: premium(result.premium_until) });
  }
  // Checkout is deliberately blocked until the owner configures a real iyzico product and monthly plan.
  if (mode === "start_checkout") return fail("PAYMENT_SETUP_REQUIRED", 503);
  return fail("UNKNOWN_MODE", 404);
});
