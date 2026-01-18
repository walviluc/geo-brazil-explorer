import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Planos válidos no sistema
const VALID_PLANS = ['gratuito', 'completo'];

Deno.serve(async (req) => {
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

    if (body.type === 'payment' && body.data?.id) {
      const paymentId = body.data.id;
      
      const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.text();
        console.error('Error fetching payment:', errorData);
        throw new Error('Erro ao buscar pagamento');
      }

      const payment = await paymentResponse.json();
      console.log('Payment details:', JSON.stringify(payment));

      if (payment.status === 'approved') {
        let externalRef;
        try {
          externalRef = JSON.parse(payment.external_reference);
        } catch (e) {
          console.error('Error parsing external_reference:', e);
          throw new Error('Referência externa inválida');
        }

        const { userId, planId, billingCycle } = externalRef;
        
        // Validar plano
        if (!VALID_PLANS.includes(planId)) {
          console.error('Invalid plan:', planId);
          throw new Error('Plano inválido');
        }
        
        console.log('Updating subscription for user:', userId, 'plan:', planId, 'cycle:', billingCycle);

        const expiresAt = new Date();
        if (billingCycle === 'monthly') {
          expiresAt.setMonth(expiresAt.getMonth() + 1);
        } else {
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        }

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

        console.log('Subscription updated successfully for plan:', planId);
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: unknown) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ received: true, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
