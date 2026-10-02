import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HANDLE = 'editora-itacaiunas';
const ALLOWED_ORIGINS = [
  'https://geodatabrasil.lovable.app',
  'https://id-preview--7ccf76c7-ddff-4ced-ad5a-116599c01b97.lovable.app',
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Não autorizado' }, 401);
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return json({ error: 'Usuário não autenticado' }, 401);

    const { planId, billingCycle } = await req.json().catch(() => ({}));
    if (typeof planId !== 'string' || !['monthly', 'yearly'].includes(billingCycle)) {
      return json({ error: 'Dados inválidos' }, 400);
    }

    // Prices come from the admin-managed plans table.
    const { data: plan } = await supabase
      .from('plans')
      .select('slug, name, monthly_price, yearly_price, enabled')
      .eq('slug', planId)
      .maybeSingle();
    if (!plan || !plan.enabled || Number(plan.monthly_price) <= 0) return json({ error: 'Plano inválido' }, 400);

    // yearly_price is the monthly-equivalent value, charged 12x per year.
    const amount = billingCycle === 'yearly' ? Number(plan.yearly_price) * 12 : Number(plan.monthly_price);
    const priceCents = Math.round(amount * 100);
    const description = `GeoData Brasil - Plano ${plan.name} (${billingCycle === 'yearly' ? 'Anual' : 'Mensal'})`;

    const reqOrigin = req.headers.get('origin') ?? '';
    const trusted =
      ALLOWED_ORIGINS.includes(reqOrigin) ||
      /^https:\/\/[a-z0-9-]+--7ccf76c7-ddff-4ced-ad5a-116599c01b97\.lovable\.app$/.test(reqOrigin) ||
      /^http:\/\/localhost(:\d+)?$/.test(reqOrigin);
    const origin = trusted ? reqOrigin : ALLOWED_ORIGINS[0];

    const orderNsu = crypto.randomUUID();

    const { error: insErr } = await supabase.from('payment_records').insert({
      user_id: user.id,
      plan: plan.slug,
      billing_cycle: billingCycle,
      amount,
      currency: 'BRL',
      status: 'pending',
      provider: 'infinitepay',
      payment_id: orderNsu,
    });
    if (insErr) {
      console.error('Insert pending record failed:', insErr);
      return json({ error: 'Erro ao registrar pedido' }, 500);
    }

    const res = await fetch('https://api.checkout.infinitepay.io/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        handle: HANDLE,
        order_nsu: orderNsu,
        items: [{ quantity: 1, price: priceCents, description }],
        redirect_url: `${origin}/subscription?status=pending&order=${orderNsu}`,
        webhook_url: `${supabaseUrl}/functions/v1/infinitepay-webhook`,
        customer: { email: user.email },
      }),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error(`InfinitePay error [${res.status}]: ${text}`);
      return json({ error: 'Erro ao criar link de pagamento', status: res.status, details: text }, 502);
    }
    let data: any = {};
    try { data = JSON.parse(text); } catch { /* ignore */ }
    const checkoutUrl = data.url ?? data.link ?? data.checkout_url;
    if (!checkoutUrl) return json({ error: 'URL de checkout não recebida', details: text }, 502);

    return json({ checkoutUrl, orderNsu });
  } catch (e) {
    console.error('Checkout error:', e);
    return json({ error: e instanceof Error ? e.message : 'Erro interno' }, 500);
  }
});
