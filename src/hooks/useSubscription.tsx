import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type PlanType = 'gratuito' | 'completo';
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

  const updateSubscription = async (plan: PlanType, billingCycle: BillingCycle) => {
    if (!user) return { error: new Error('Usuário não autenticado') };

    const expiresAt = new Date();
    if (billingCycle === 'monthly') {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        plan,
        billing_cycle: billingCycle,
        expires_at: expiresAt.toISOString(),
        started_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('status', 'active')
      .select()
      .single();

    if (!error && data) {
      setSubscription(data as Subscription);
    }

    return { error };
  };

  return { subscription, loading, updateSubscription };
}
