import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, XCircle, Loader2, Map, Receipt, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { usePlans } from '@/hooks/usePlans';
import { supabase } from '@/integrations/supabase/client';

type Rec = { status: string; plan: string; billing_cycle: string; amount: number; period_end: string | null };

export default function CheckoutReturn() {
  const [params] = useSearchParams();
  const order = params.get('order');
  const { user, loading: authLoading } = useAuth();
  const { plans } = usePlans();
  const navigate = useNavigate();
  const [rec, setRec] = useState<Rec | null>(null);
  const [tries, setTries] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user || !order) return;
    let cancelled = false;
    const check = async () => {
      const { data } = await supabase
        .from('payment_records')
        .select('status, plan, billing_cycle, amount, period_end')
        .eq('provider', 'infinitepay')
        .eq('payment_id', order)
        .maybeSingle();
      if (cancelled) return;
      // No record: the order was created before the redirect, so a missing
      // row means the order doesn't exist for this account — fail fast.
      if (!data) return setDone(true);
      setRec(data as Rec);
      if (data.status === 'approved' || data.status === 'rejected' || data.status === 'cancelled') return setDone(true);
      if (tries >= 10) return setDone(true);
      setTimeout(() => !cancelled && setTries((t) => t + 1), 3000);
    };
    check();
    return () => { cancelled = true; };
  }, [user, order, tries]);

  const approved = rec?.status === 'approved';
  const failed = rec?.status === 'rejected' || rec?.status === 'cancelled';
  const waiting = !approved && !failed;
  const planName = plans.find((p) => p.slug === rec?.plan)?.name ?? rec?.plan;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-xl border bg-card p-8 text-center space-y-5">
        {!order || (done && !rec) ? (
          <>
            <XCircle className="h-12 w-12 mx-auto text-destructive" />
            <h1 className="text-2xl font-bold">Pedido não encontrado</h1>
            <p className="text-muted-foreground">Não localizamos este pedido na sua conta. Veja seu histórico ou escolha um plano.</p>
          </>
        ) : approved ? (
          <>
            <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500" />
            <h1 className="text-2xl font-bold">Pagamento confirmado!</h1>
            <p className="text-muted-foreground">
              Seu plano <strong>{planName}</strong> ({rec?.billing_cycle === 'yearly' ? 'anual' : 'mensal'}) está ativo
              {rec?.period_end ? ` até ${new Date(rec.period_end).toLocaleDateString('pt-BR')}` : ''}.
            </p>
            <div className="text-left text-sm bg-muted/50 rounded-lg p-4 space-y-1">
              <p className="font-medium">Como acessar seu plano:</p>
              <p>1. Abra o <strong>Dashboard</strong> e escolha uma fonte de dados.</p>
              <p>2. Camadas e downloads liberados pelo plano já estarão disponíveis.</p>
              <p>3. Veja o recibo em <strong>Histórico e recibos</strong>.</p>
            </div>
          </>
        ) : failed ? (
          <>
            <XCircle className="h-12 w-12 mx-auto text-destructive" />
            <h1 className="text-2xl font-bold">Pagamento não concluído</h1>
            <p className="text-muted-foreground">O pagamento foi recusado ou cancelado. Nenhum plano foi alterado. Você pode tentar novamente.</p>
          </>
        ) : (
          <>
            {done ? <Clock className="h-12 w-12 mx-auto text-amber-500" /> : <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />}
            <h1 className="text-2xl font-bold">{done ? 'Pagamento em processamento' : 'Confirmando pagamento...'}</h1>
            <p className="text-muted-foreground">
              {done
                ? 'Ainda não recebemos a confirmação. Pix e boleto podem levar alguns minutos; seu plano será ativado automaticamente. Acompanhe em Histórico e recibos.'
                : 'Aguarde enquanto confirmamos seu pagamento com a InfinitePay.'}
            </p>
            {done && (
              <Button variant="outline" onClick={() => { setDone(false); setTries(0); }}>Verificar novamente</Button>
            )}
          </>
        )}
        <div className="flex flex-wrap gap-2 justify-center pt-2">
          <Button asChild><Link to="/dashboard"><Map className="h-4 w-4 mr-2" />Ir para o Dashboard</Link></Button>
          <Button asChild variant="outline"><Link to="/subscription/history"><Receipt className="h-4 w-4 mr-2" />Histórico e recibos</Link></Button>
          {(failed || !order) && <Button asChild variant="outline"><Link to="/subscription"><User className="h-4 w-4 mr-2" />Ver planos</Link></Button>}
        </div>
      </div>
    </div>
  );
}
