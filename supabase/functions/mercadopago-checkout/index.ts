import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CheckoutRequest {
  planId: 'completo';
  billingCycle: 'monthly' | 'yearly';
}

const PLAN_PRICES = {
  completo: {
    monthly: 49.90,
    yearly: 39.90 * 12,
  }
};

const PLAN_NAMES = {
  completo: 'GeoData Brasil - Plano Completo',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');

    if (!accessToken) {
      throw new Error('Mercado Pago não configurado');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Não autorizado');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Usuário não autenticado');
    }

    const { planId, billingCycle } = await req.json() as CheckoutRequest;
    
    if (!planId || !billingCycle || planId !== 'completo') {
      throw new Error('Dados inválidos');
    }

    const price = PLAN_PRICES[planId][billingCycle];
    const planName = PLAN_NAMES[planId];
    const description = billingCycle === 'yearly' 
      ? `${planName} - Assinatura Anual`
      : `${planName} - Assinatura Mensal`;

    const preferenceResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [{
          title: description,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: price,
        }],
        payer: { email: user.email },
        back_urls: {
          success: `${req.headers.get('origin')}/subscription?status=success&plan=${planId}&cycle=${billingCycle}`,
          failure: `${req.headers.get('origin')}/subscription?status=failure`,
          pending: `${req.headers.get('origin')}/subscription?status=pending`,
        },
        auto_return: 'approved',
        external_reference: JSON.stringify({ userId: user.id, planId, billingCycle }),
        notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
      }),
    });

    if (!preferenceResponse.ok) {
      throw new Error('Erro ao criar preferência de pagamento');
    }

    const preference = await preferenceResponse.json();

    return new Response(
      JSON.stringify({
        preferenceId: preference.id,
        initPoint: preference.init_point,
        sandboxInitPoint: preference.sandbox_init_point,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro interno';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
