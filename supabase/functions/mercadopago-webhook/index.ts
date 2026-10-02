import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');

    if (!accessToken) {
      console.error('MERCADOPAGO_ACCESS_TOKEN not configured');
      throw new Error('Mercado Pago não configurado');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const rawBody = await req.text();
    let body: any;
    try { body = JSON.parse(rawBody); } catch { body = {}; }
    const url = new URL(req.url);
    const dataId = String(body?.data?.id ?? url.searchParams.get('data.id') ?? '');

    // Verify Mercado Pago signature (x-signature: ts=...,v1=...)
    const webhookSecret = Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('MERCADOPAGO_WEBHOOK_SECRET not configured; rejecting webhook');
      return new Response(JSON.stringify({ error: 'not configured' }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const sigHeader = req.headers.get('x-signature') ?? '';
    const requestId = req.headers.get('x-request-id') ?? '';
    const parts = Object.fromEntries(sigHeader.split(',').map((p) => p.trim().split('=') as [string, string]));
    const ts = parts['ts'];
    const v1 = parts['v1'];
    if (!ts || !v1 || !/^[A-Za-z0-9]+$/.test(dataId)) {
      return new Response(JSON.stringify({ error: 'invalid signature' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(webhookSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest)));
    const expected = Array.from(sig).map((b) => b.toString(16).padStart(2, '0')).join('');
    if (expected !== v1) {
      return new Response(JSON.stringify({ error: 'invalid signature' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Mercado Pago sends different types of notifications
    if (body.type === 'payment' && dataId) {
      const paymentId = dataId;
      
      // Get payment details from Mercado Pago
      const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.text();
        console.error('Error fetching payment:', errorData);
        throw new Error('Erro ao buscar pagamento');
      }

      const payment = await paymentResponse.json();

      // Check if payment was approved
      if (payment.status === 'approved') {
        // Replay protection: an approved payment is only applied once.
        const { data: existing } = await supabase
          .from('payment_records')
          .select('id')
          .eq('provider', 'mercadopago')
          .eq('payment_id', String(paymentId))
          .eq('status', 'approved')
          .maybeSingle();
        if (existing) {
          return new Response(JSON.stringify({ received: true, duplicate: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
        }

        // Parse external reference
        let externalRef;
        try {
          externalRef = JSON.parse(payment.external_reference);
        } catch (e) {
          console.error('Error parsing external_reference:', e);
          throw new Error('Referência externa inválida');
        }

        const { userId, planId, billingCycle } = externalRef;
        const PRICES: Record<string, Record<string, number>> = {
          profissional: { monthly: 29.90, yearly: 240 },
          completo: { monthly: 60, yearly: 540 },
        };
        const expectedPrice = PRICES[planId]?.[billingCycle];
        if (!expectedPrice || Math.abs(Number(payment.transaction_amount) - expectedPrice) > 0.01) {
          throw new Error('Pagamento não corresponde ao plano');
        }

        // Calculate expiration date
        const expiresAt = new Date();
        if (billingCycle === 'monthly') {
          expiresAt.setMonth(expiresAt.getMonth() + 1);
        } else {
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        }

        // Update subscription in database
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            plan: planId,
            billing_cycle: billingCycle,
            status: 'active',
            started_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
          })
          .eq('user_id', userId);

        if (updateError) {
          console.error('Error updating subscription:', updateError);
          throw new Error('Erro ao atualizar assinatura');
        }

        // Registrar recibo do pagamento
        const { error: recordError } = await supabase
          .from('payment_records')
          .upsert({
            user_id: userId,
            plan: planId,
            billing_cycle: billingCycle,
            amount: payment.transaction_amount ?? 0,
            currency: payment.currency_id ?? 'BRL',
            status: 'approved',
            provider: 'mercadopago',
            payment_id: String(paymentId),
            payment_method: payment.payment_method_id ?? payment.payment_type_id ?? null,
            paid_at: payment.date_approved ?? new Date().toISOString(),
            period_start: new Date().toISOString(),
            period_end: expiresAt.toISOString(),
          }, { onConflict: 'provider,payment_id' });

        if (recordError) {
          console.error('Error inserting payment record:', recordError);
        }

        console.log('Subscription updated successfully');
      } else if (payment.external_reference) {
        // Registrar tentativas não aprovadas (pendente/recusado)
        try {
          const { userId, planId, billingCycle } = JSON.parse(payment.external_reference);
          const { error: recordError } = await supabase
            .from('payment_records')
            .upsert({
              user_id: userId,
              plan: planId,
              billing_cycle: billingCycle,
              amount: payment.transaction_amount ?? 0,
              currency: payment.currency_id ?? 'BRL',
              status: payment.status ?? 'pending',
              provider: 'mercadopago',
              payment_id: String(paymentId),
              payment_method: payment.payment_method_id ?? payment.payment_type_id ?? null,
            }, { onConflict: 'provider,payment_id' });
          if (recordError) console.error('Error inserting pending payment record:', recordError);
        } catch (e) {
          console.error('Could not record non-approved payment:', e);
        }
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: unknown) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    // Always return 200 to acknowledge receipt, even on error
    // This prevents Mercado Pago from retrying indefinitely
    return new Response(
      JSON.stringify({ received: true, error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }
});
