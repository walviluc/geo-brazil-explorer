import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PlanRecord {
  id: string;
  slug: string;
  name: string;
  description: string;
  monthly_price: number;
  yearly_price: number;
  features: string[];
  excluded: string[];
  cta: string;
  popular: boolean;
  enabled: boolean;
  sort_order: number;
}

export type PlanInput = Omit<PlanRecord, 'id'>;

export const emptyPlan = (): PlanInput => ({
  slug: '',
  name: '',
  description: '',
  monthly_price: 0,
  yearly_price: 0,
  features: [],
  excluded: [],
  cta: 'Assinar',
  popular: false,
  enabled: true,
  sort_order: 0,
});

/**
 * Reads the plan catalog managed by admins in /admin/plans.
 * `includeDisabled` is only effective for admins (RLS enforces it).
 */
export function usePlans(includeDisabled = false) {
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('plans')
      .select('id,slug,name,description,monthly_price,yearly_price,features,excluded,cta,popular,enabled,sort_order')
      .order('sort_order', { ascending: true });
    if (!includeDisabled) query = query.eq('enabled', true);

    const { data, error } = await query;
    if (error) {
      setError(error.message);
    } else {
      setError(null);
      setPlans(
        (data ?? []).map((p) => ({
          ...p,
          monthly_price: Number(p.monthly_price),
          yearly_price: Number(p.yearly_price),
          features: p.features ?? [],
          excluded: p.excluded ?? [],
        })) as PlanRecord[]
      );
    }
    setLoading(false);
  }, [includeDisabled]);

  useEffect(() => { load(); }, [load]);

  return { plans, loading, error, reload: load };
}
