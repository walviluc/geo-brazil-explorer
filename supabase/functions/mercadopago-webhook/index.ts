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

    const body = await req.json();
    console.log('Webhook received:', JSON.stringify(body));

    // Mercado Pago sends different types of notifications
    if (body.type === 'payment' && body.data?.id) {
      const paymentId = body.data.id;
      
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
      console.log('Payment details:', JSON.stringify(payment));

      // Check if payment was approved
      if (payment.status === 'approved') {
        // Parse external reference
        let externalRef;
        try {
          externalRef = JSON.parse(payment.external_reference);
        } catch (e) {
          console.error('Error parsing external_reference:', e);
          throw new Error('Referência externa inválida');
        }

        const { userId, planId, billingCycle } = externalRef;
        
        console.log('Updating subscription for user:', userId, 'plan:', planId, 'cycle:', billingCycle);

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
