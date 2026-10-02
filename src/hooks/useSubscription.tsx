import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type PlanType = 'gratuito' | 'profissional' | 'completo';
export type BillingCycle = 'monthly' | 'yearly';

interface Subscription {
  id: string;
  user_id: string;
  plan: PlanType;
  billing_cycle: BillingCycle;
  status: string;
  started_at: string;
  expires_at: string | null;
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    const fetchSubscription = async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (!error && data) {
        setSubscription(data as Subscription);
      }
      setLoading(false);
    };

    fetchSubscription();
  }, [user]);

  // Only downgrades to the free plan are done here; paid plans are activated
  // by the payment webhook on the server.
  const updateSubscription = async (plan: PlanType, _billingCycle: BillingCycle) => {
    if (!user) return { error: new Error('Usuário não autenticado') };
    if (plan !== 'gratuito') return { error: new Error('Planos pagos exigem pagamento.') };

    const { error: rpcError } = await supabase.rpc('downgrade_to_free' as never);
    if (rpcError) return { error: rpcError };

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!error && data) {
      setSubscription(data as Subscription);
    }

    return { error };
  };

  return { subscription, loading, updateSubscription };
}
