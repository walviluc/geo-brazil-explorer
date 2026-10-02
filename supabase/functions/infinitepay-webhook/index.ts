import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// InfinitePay notifies this endpoint after a payment. The notice itself is
// not trusted: we confirm with InfinitePay's payment_check API, only apply
// orders we created (pending record), check the amount and apply each once.

const HANDLE = 'editora-itacaiunas';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const UUID = /^[0-9a-f-]{36}$/i;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const body = await req.json().catch(() => ({}));
    const orderNsu = String(body.order_nsu ?? '');
    const transactionNsu = String(body.transaction_nsu ?? '');
    const slug = String(body.invoice_slug ?? body.slug ?? '');

    if (!UUID.test(orderNsu) || !transactionNsu || !slug) return json({ error: 'invalid payload' }, 400);

    // Only orders created by our checkout are processed.
    const { data: record } = await supabase
      .from('payment_records')
      .select('id, user_id, plan, billing_cycle, amount, status')
      .eq('provider', 'infinitepay')
      .eq('payment_id', orderNsu)
      .maybeSingle();
    if (!record) return json({ error: 'unknown order' }, 404);
    if (record.status === 'approved') return json({ received: true, duplicate: true });

    // Confirm with InfinitePay.
    const check = await fetch('https://api.infinitepay.io/invoices/public/checkout/payment_check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle: HANDLE, order_nsu: orderNsu, transaction_nsu: transactionNsu, slug }),
    });
    const checkText = await check.text();
    if (!check.ok) {
      console.error(`payment_check failed [${check.status}]: ${checkText}`);
      return json({ error: 'payment check failed' }, 502);
    }
    const result = JSON.parse(checkText);
    if (!result.success || !result.paid) {
      return json({ received: true, paid: false });
    }

    const paidCents = Number(result.paid_amount ?? result.amount ?? 0);
    const expectedCents = Math.round(Number(record.amount) * 100);
    if (paidCents < expectedCents) {
      console.error('Amount mismatch', { paidCents, expectedCents });
      return json({ error: 'amount mismatch' }, 400);
    }

    // Mark approved first (only if still pending) to block concurrent replays.
    const now = new Date();
    const expiresAt = new Date(now);
    if (record.billing_cycle === 'yearly') expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    else expiresAt.setMonth(expiresAt.getMonth() + 1);

    const { data: updated } = await supabase
      .from('payment_records')
      .update({
        status: 'approved',
        paid_at: now.toISOString(),
        period_start: now.toISOString(),
        period_end: expiresAt.toISOString(),
        payment_method: body.capture_method ?? null,
      })
      .eq('id', record.id)
      .neq('status', 'approved')
      .select('id');
    if (!updated || updated.length === 0) return json({ received: true, duplicate: true });

    const { error: subErr } = await supabase
      .from('subscriptions')
      .update({
        plan: record.plan,
        billing_cycle: record.billing_cycle,
        status: 'active',
        started_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .eq('user_id', record.user_id);
    if (subErr) {
      console.error('Subscription update failed:', subErr);
      return json({ error: 'subscription update failed' }, 500);
    }

    return json({ received: true, paid: true });
  } catch (e) {
    console.error('Webhook error:', e);
    return json({ error: e instanceof Error ? e.message : 'error' }, 500);
  }
});
