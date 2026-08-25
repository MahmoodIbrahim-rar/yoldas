// ============================================================
// Yoldaş — account-auth
// دخول آمن باسم مستخدم وكلمة مرور، مع بريد استرجاع خاص غير ظاهر للناس.
// كلمة المرور تصل عبر HTTPS إلى Supabase Auth ولا تُحفظ في هذا الملف أو الجداول العامة.
// ============================================================

import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function validUsername(value: string) {
  return /^[a-z0-9][a-z0-9._-]{2,23}$/.test(value);
}

function internalIdentity(username: string) {
  // هوية قديمة للحسابات التي لم تضف بريد استرجاع بعد.
  return `${username}@username.yoldas.invalid`;
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return response({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return response({ ok: false, code: "SERVER_CONFIGURATION" }, 500);
  }

  let body: { mode?: string; username?: string; password?: string; recoveryEmail?: string; redirectTo?: string };
  try {
    body = await req.json();
  } catch {
    return response({ ok: false, code: "INVALID_REQUEST" }, 400);
  }

  const mode = ["login", "signup", "request_reset", "update_recovery"].includes(String(body.mode)) ? String(body.mode) : null;
  const username = String(body.username ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const recoveryEmail = String(body.recoveryEmail ?? "").trim().toLowerCase();
  if (!mode || (mode !== "update_recovery" && !validUsername(username)) || ((mode === "signup" || mode === "login") && password.length < 8)) {
    return response({ ok: false, code: "INVALID_INPUT" }, 400);
  }
  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  if (mode === "request_reset") {
    const { data: profile } = await adminClient.from("profiles").select("recovery_email").eq("username", username).maybeSingle();
    if (profile?.recovery_email && validEmail(profile.recovery_email)) {
      const redirectTo = String(body.redirectTo ?? "");
      // Supabase يسمح فقط بعناوين Redirect URLs المدرجة في إعدادات Auth بالمشروع.
      // نرفض الروابط غير المشفرة هنا، ثم نترك قائمة Supabase هي الحارس النهائي للنطاقات المسموحة.
      if (redirectTo.startsWith("https://")) {
        await authClient.auth.resetPasswordForEmail(profile.recovery_email, { redirectTo });
      }
    }
    // نفس الرد للحساب المعروف وغير المعروف حتى لا يمكن اكتشاف الحسابات من الخارج.
    return response({ ok: true });
  }

  if (mode === "update_recovery") {
    if (!validEmail(recoveryEmail)) return response({ ok: false, code: "INVALID_RECOVERY_EMAIL" }, 400);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return response({ ok: false, code: "AUTH_REQUIRED" }, 401);
    const sessionClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: current } = await sessionClient.auth.getUser();
    if (!current.user) return response({ ok: false, code: "AUTH_REQUIRED" }, 401);
    const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(current.user.id, { email: recoveryEmail, email_confirm: true });
    if (authUpdateError) return response({ ok: false, code: "RECOVERY_EMAIL_TAKEN" }, 409);
    const { error: profileError } = await adminClient.from("profiles").update({ recovery_email: recoveryEmail }).eq("id", current.user.id);
    if (profileError) return response({ ok: false, code: "RECOVERY_PROFILE_UPDATE_FAILED" }, 500);
    return response({ ok: true });
  }

  const { data: accountProfile } = await adminClient.from("profiles").select("recovery_email").eq("username", username).maybeSingle();
  const identity = accountProfile?.recovery_email || internalIdentity(username);

  if (mode === "signup") {
    if (!validEmail(recoveryEmail)) return response({ ok: false, code: "INVALID_RECOVERY_EMAIL" }, 400);
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email: recoveryEmail,
      password,
      email_confirm: true,
      user_metadata: { username },
    });
    if (createError || !created.user) {
      return response({ ok: false, code: "USERNAME_TAKEN" }, 409);
    }

    const { error: profileError } = await adminClient.from("profiles").insert({
      id: created.user.id,
      username,
      alias: username,
      recovery_email: recoveryEmail,
    });
    if (profileError) {
      // لا نكشف تفاصيل قاعدة البيانات أو كلمة المرور إلى المتصفح.
      console.error("account profile creation failed", profileError.code);
      await adminClient.auth.admin.deleteUser(created.user.id);
      return response({ ok: false, code: "PROFILE_SETUP_FAILED" }, 500);
    }
  }

  const { data: loginData, error: loginError } = await authClient.auth.signInWithPassword({
    email: identity,
    password,
  });
  if (loginError || !loginData.session || !loginData.user) {
    return response({ ok: false, code: "INVALID_CREDENTIALS" }, 401);
  }

  return response({ ok: true, session: loginData.session, user: loginData.user });
});
