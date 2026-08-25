// انسخ هذا الملف إلى config.js ثم ضع القيم العامة الخاصة بمشروعك في Supabase.
// لا تضع هنا أي مفتاح سري (لا service_role، ولا GEMINI_API_KEY).
window.YOLDAS_CONFIG = {
  // رابط مشروعك في Supabase — من Project Settings > API
  // شكله الصحيح: https://PROJECT_REF.supabase.co
  // تنبيه: لا تضف /rest/v1 أو أي مسار بعد الرابط.
  supabaseUrl: "https://imzlviynwgnzsfwbvaqj.supabase.co",

  // المفتاح العام فقط (Publishable key أو anon key) — من نفس الصفحة.
  // لا تستخدم أبدًا service_role key هنا.
  supabasePublishableKey: "sb_publishable_rSp8f-erHFqqE6z5Yu0J4A_vNagLwBO",

  // اسم الـ Edge Function المنشورة في Supabase للمساعد (لا تغيّره إلا إذا غيّرت اسم الدالة فعليًا)
  assistantFunction: "health-assistant",

  // دالة الحسابات الآمنة باسم المستخدم وكلمة المرور
  accountFunction: "account-auth"
};
