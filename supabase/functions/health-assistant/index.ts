import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// 1. CORS Headers for Vanilla JS Frontend
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // 2. Preflight Options Handle
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 3. JWT Security Authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'INVALID_TOKEN' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, text, plan_name, plan_description, plan_id } = await req.json();

    // 4. Create or Revise Plan Action
    if (action === 'create_plan' || action === 'revise_plan') {
      const { error: rpcError } = await supabase.rpc('reserve_premium_monthly_action', {
        user_id_param: user.id
      });

      if (rpcError) {
        return new Response(JSON.stringify({ error: 'PLAN_LIMIT_REACHED', message: rpcError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (action === 'create_plan') {
        await supabase.from('plans').insert([{ user_id: user.id, plan_name, plan_description }]);
      } else {
        await supabase.from('plans').update({ plan_name, plan_description }).eq('id', plan_id);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Send Miri Message Action (Tier Aware)
    if (action === 'send_miri_text') {
      const { data: profile } = await supabase.from('profiles').select('is_premium').eq('id', user.id).single();
      const isPremium = profile?.is_premium || false;
      const dailyLimit = isPremium ? 15 : 3;

      const today = new Date().toISOString().split('T')[0];
      const { data: miriTexts } = await supabase
        .from('miri_texts')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', today);

      if ((miriTexts?.length || 0) >= dailyLimit) {
        return new Response(JSON.stringify({ error: 'AI_QUOTA_EXCEEDED', message: 'Daily limit reached' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text }] }] })
      });

      if (geminiRes.status === 429) {
        return new Response(JSON.stringify({ error: 'AI_QUOTA_EXCEEDED' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await supabase.from('miri_texts').insert([{ user_id: user.id, text, date: today }]);

      const geminiData = await geminiRes.json();
      return new Response(JSON.stringify(geminiData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'INVALID_ACTION' }), { status: 400, headers: corsHeaders });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});