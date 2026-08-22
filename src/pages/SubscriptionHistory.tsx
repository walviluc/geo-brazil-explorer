import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, ArrowLeft, Receipt, CalendarClock, RefreshCw, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { usePlans } from '@/hooks/usePlans';
import { supabase } from '@/integrations/supabase/client';

interface PaymentRecord {
  id: string;
  plan: string;
  billing_cycle: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  payment_id: string | null;
  payment_method: string | null;
  paid_at: string | null;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
}

const statusMeta: Record<string, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  approved: { label: 'Pago', className: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30', Icon: CheckCircle2 },
  pending: { label: 'Pendente', className: 'bg-amber-500/15 text-amber-600 border-amber-500/30', Icon: Clock },
  in_process: { label: 'Em análise', className: 'bg-amber-500/15 text-amber-600 border-amber-500/30', Icon: Clock },
  rejected: { label: 'Recusado', className: 'bg-destructive/15 text-destructive border-destructive/30', Icon: XCircle },
  cancelled: { label: 'Cancelado', className: 'bg-muted text-muted-foreground border-border', Icon: XCircle },
  refunded: { label: 'Reembolsado', className: 'bg-muted text-muted-foreground border-border', Icon: RefreshCw },
};

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const formatMoney = (value: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);

export default function SubscriptionHistory() {
  const { user, loading: authLoading } = useAuth();
  const { subscription, loading: subLoading } = useSubscription();
  const { plans } = usePlans();
  const navigate = useNavigate();
  const [records, setRecords] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('payment_records')
        .select('*')
        .order('created_at', { ascending: false });
      setRecords((data ?? []).map((r) => ({ ...r, amount: Number(r.amount) })) as PaymentRecord[]);
      setLoading(false);
    };
    load();
  }, [user]);

  const planName = (slug: string) => plans.find((p) => p.slug === slug)?.name ?? slug;

  const nextCycle = useMemo(() => {
    if (!subscription?.expires_at) return null;
    const end = new Date(subscription.expires_at);
    const days = Math.ceil((end.getTime() - Date.now()) / 86400000);
    return { end, days };
  }, [subscription]);

  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  const currentPlan = subscription?.plan ?? 'gratuito';
  const isPaid = currentPlan !== 'gratuito';

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-secondary/95 backdrop-blur-sm border-b border-secondary-foreground/10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <a href="/" className="flex items-center gap-2">
              <MapPin className="w-6 h-6 text-primary" />
              <span className="text-lg font-bold text-secondary-foreground">GeoData Brasil</span>
            </a>
            <Button variant="ghost" onClick={() => navigate('/subscription')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Gerenciar plano
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Receipt className="w-7 h-7 text-primary" />
            Histórico e recibos
          </h1>
          <p className="text-muted-foreground mt-2">
            Acompanhe o status da sua assinatura, os pagamentos realizados e o próximo ciclo de cobrança.
          </p>
        </div>

        {/* Resumo da assinatura */}
        <section className="grid sm:grid-cols-3 gap-4 mb-10">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Plano atual</p>
            <p className="text-xl font-bold text-foreground mt-1">{planName(currentPlan)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {subscription?.billing_cycle === 'yearly' ? 'Cobrança anual' : 'Cobrança mensal'}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Início</p>
            <p className="text-xl font-bold text-foreground mt-1">{formatDate(subscription?.started_at)}</p>
            <p className="text-sm text-muted-foreground mt-1">Status: {subscription?.status ?? 'ativo'}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1">
              <CalendarClock className="w-3.5 h-3.5" /> Próximo ciclo
            </p>
            <p className="text-xl font-bold text-foreground mt-1">
              {isPaid && nextCycle ? formatDate(nextCycle.end.toISOString()) : '—'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {isPaid && nextCycle
                ? nextCycle.days >= 0
                  ? `Renova em ${nextCycle.days} dia(s)`
                  : 'Vencido'
                : 'Plano gratuito, sem cobrança'}
            </p>
          </div>
        </section>

        {/* Recibos */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">Pagamentos</h2>

          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
            </div>
          ) : records.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center">
              <Receipt className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="font-medium text-foreground">Nenhum pagamento registrado</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Assim que você assinar um plano pago, os recibos aparecerão aqui.
              </p>
              <Button onClick={() => navigate('/subscription')}>Ver planos</Button>
            </div>
          ) : (
            <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
              {records.map((r) => {
                const meta = statusMeta[r.status] ?? {
                  label: r.status,
                  className: 'bg-muted text-muted-foreground border-border',
                  Icon: Clock,
                };
                const Icon = meta.Icon;
                return (
                  <div key={r.id} className="flex flex-wrap items-center justify-between gap-4 p-4 bg-card">
                    <div className="min-w-[200px]">
                      <p className="font-semibold text-foreground">
                        {planName(r.plan)}{' '}
                        <span className="text-sm font-normal text-muted-foreground">
                          · {r.billing_cycle === 'yearly' ? 'anual' : 'mensal'}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(r.paid_at ?? r.created_at)}
                        {r.payment_method ? ` · ${r.payment_method}` : ''}
                        {r.payment_id ? ` · #${r.payment_id}` : ''}
                      </p>
                      {(r.period_start || r.period_end) && (
                        <p className="text-xs text-muted-foreground">
                          Período: {formatDate(r.period_start)} → {formatDate(r.period_end)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className={`gap-1 ${meta.className}`}>
                        <Icon className="w-3.5 h-3.5" />
                        {meta.label}
                      </Badge>
                      <span className="font-bold text-foreground tabular-nums">
                        {formatMoney(r.amount, r.currency)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
