import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2, ShieldAlert, ArrowLeft, MapPin, Crown, Save, Search } from 'lucide-react';
import { UserMenu } from '@/components/UserMenu';
import { z } from 'zod';

type Plan = 'gratuito' | 'profissional' | 'completo';
type Status = 'active' | 'canceled' | 'expired';
type BillingCycle = 'monthly' | 'yearly';

interface UserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  subscription: {
    id: string;
    plan: Plan;
    status: Status;
    billing_cycle: BillingCycle;
    expires_at: string | null;
  } | null;
}

const planSchema = z.object({
  plan: z.enum(['gratuito', 'profissional', 'completo']),
  status: z.enum(['active', 'canceled', 'expired']),
  billing_cycle: z.enum(['monthly', 'yearly']),
  expires_at: z.string().nullable(),
});

const planLabels: Record<Plan, string> = {
  gratuito: 'Gratuito',
  profissional: 'Profissional',
  completo: 'Completo',
};

export default function AdminPlans() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    const prev = document.title;
    document.title = 'Gerenciar planos · Painel ADM · GeoData Brasil';
    return () => { document.title = prev; };
  }, []);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: profiles, error: pErr }, { data: subs, error: sErr }] = await Promise.all([
        supabase.from('profiles').select('id,email,full_name').order('created_at', { ascending: false }),
        supabase.from('subscriptions').select('id,user_id,plan,status,billing_cycle,expires_at'),
      ]);
      if (pErr) throw pErr;
      if (sErr) throw sErr;
      const subMap = new Map((subs ?? []).map(s => [s.user_id, s]));
      const rows: UserRow[] = (profiles ?? []).map(p => {
        const s = subMap.get(p.id);
        return {
          id: p.id,
          email: p.email,
          full_name: p.full_name,
          subscription: s
            ? {
                id: s.id,
                plan: s.plan as Plan,
                status: s.status as Status,
                billing_cycle: s.billing_cycle as BillingCycle,
                expires_at: s.expires_at,
              }
            : null,
        };
      });
      setUsers(rows);
    } catch (err) {
      toast({
        title: 'Erro ao carregar',
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      (u.email ?? '').toLowerCase().includes(q) ||
      (u.full_name ?? '').toLowerCase().includes(q)
    );
  }, [users, query]);

  const updateLocal = (userId: string, patch: Partial<NonNullable<UserRow['subscription']>>) => {
    setUsers(prev => prev.map(u => {
      if (u.id !== userId) return u;
      const base = u.subscription ?? {
        id: '',
        plan: 'gratuito' as Plan,
        status: 'active' as Status,
        billing_cycle: 'monthly' as BillingCycle,
        expires_at: null,
      };
      return { ...u, subscription: { ...base, ...patch } };
    }));
  };

  const saveRow = async (u: UserRow) => {
    if (!u.subscription) return;
    const parsed = planSchema.safeParse({
      plan: u.subscription.plan,
      status: u.subscription.status,
      billing_cycle: u.subscription.billing_cycle,
      expires_at: u.subscription.expires_at,
    });
    if (!parsed.success) {
      toast({ title: 'Dados inválidos', variant: 'destructive' });
      return;
    }
    setSavingId(u.id);
    try {
      if (u.subscription.id) {
        const { error } = await supabase
          .from('subscriptions')
          .update(parsed.data)
          .eq('id', u.subscription.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('subscriptions')
          .insert({ ...parsed.data, user_id: u.id })
          .select('id')
          .single();
        if (error) throw error;
        updateLocal(u.id, { id: data.id });
      }
      toast({ title: 'Plano atualizado', description: u.email ?? u.id });
    } catch (err) {
      toast({
        title: 'Erro ao salvar',
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      });
    } finally {
      setSavingId(null);
    }
  };

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }
  if (!user) return null;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <AdminHeader />
        <main className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center p-8 rounded-2xl border bg-card shadow-sm">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 grid place-items-center">
              <ShieldAlert className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Acesso negado</h1>
            <p className="text-muted-foreground mb-6">
              Esta área é exclusiva para administradores.
            </p>
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Dashboard
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center gap-2 mb-1">
          <Crown className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold">Gerenciar planos</h1>
        </div>
        <p className="text-muted-foreground mb-6">
          Visualize e altere o plano, status e ciclo de cobrança de qualquer usuário.
        </p>

        <div className="flex items-center gap-2 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome ou email"
              className="pl-9"
            />
          </div>
          <Button variant="outline" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Recarregar'}
          </Button>
        </div>

        <div className="grid gap-3">
          {filtered.map(u => {
            const sub = u.subscription ?? {
              id: '',
              plan: 'gratuito' as Plan,
              status: 'active' as Status,
              billing_cycle: 'monthly' as BillingCycle,
              expires_at: null,
            };
            const expiresValue = sub.expires_at ? sub.expires_at.slice(0, 10) : '';
            return (
              <div key={u.id} className="p-4 rounded-lg border bg-card grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <div className="min-w-0">
                  <p className="font-medium truncate">{u.full_name || '—'}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email || u.id}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                    <div>
                      <Label className="text-xs">Plano</Label>
                      <Select value={sub.plan} onValueChange={(v) => updateLocal(u.id, { plan: v as Plan })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(planLabels) as Plan[]).map(p => (
                            <SelectItem key={p} value={p}>{planLabels[p]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Status</Label>
                      <Select value={sub.status} onValueChange={(v) => updateLocal(u.id, { status: v as Status })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Ativo</SelectItem>
                          <SelectItem value="canceled">Cancelado</SelectItem>
                          <SelectItem value="expired">Expirado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Ciclo</Label>
                      <Select value={sub.billing_cycle} onValueChange={(v) => updateLocal(u.id, { billing_cycle: v as BillingCycle })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Mensal</SelectItem>
                          <SelectItem value="yearly">Anual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Expira em</Label>
                      <Input
                        type="date"
                        value={expiresValue}
                        onChange={(e) => updateLocal(u.id, {
                          expires_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                        })}
                      />
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => saveRow({ ...u, subscription: sub })}
                  disabled={savingId === u.id}
                  className="md:self-end"
                >
                  {savingId === u.id
                    ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    : <Save className="w-4 h-4 mr-2" />}
                  Salvar
                </Button>
              </div>
            );
          })}
          {!loading && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
          )}
        </div>
      </main>
    </div>
  );
}

function AdminHeader() {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-40 bg-secondary/95 backdrop-blur-sm border-b border-secondary-foreground/10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <a href="/" className="flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" />
            <span className="text-lg font-bold text-secondary-foreground">GeoData Brasil</span>
          </a>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin/data-sources')}
              className="hidden sm:inline-flex text-secondary-foreground hover:bg-secondary-foreground/10"
            >
              Fontes
            </Button>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold">
              <ShieldAlert className="w-3.5 h-3.5" />
              Painel ADM
            </span>
            <UserMenu showPlanBadge={false} showDashboardLink />
          </div>
        </div>
      </div>
    </header>
  );
}