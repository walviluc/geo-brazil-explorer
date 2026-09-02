import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MapPin, ArrowLeft, Check, Star, Crown, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription, PlanType, BillingCycle } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePlans } from '@/hooks/usePlans';

// Planos são gerenciados pelo admin em /admin/plans (tabela: plans)




export default function Subscription() {
  const { user, loading: authLoading } = useAuth();
  const { subscription, loading: subLoading, updateSubscription } = useSubscription();
  const { plans, loading: plansLoading } = usePlans();
  const [isYearly, setIsYearly] = useState(false);
  const [processingPlan, setProcessingPlan] = useState<PlanType | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  // Handle payment return status
  useEffect(() => {
    const status = searchParams.get('status');
    const planId = searchParams.get('plan') as PlanType | null;
    const cycle = searchParams.get('cycle') as BillingCycle | null;

    if (status === 'success' && planId && cycle) {
      toast({
        title: 'Pagamento realizado!',
        description: `Seu plano ${plans.find(p => p.slug === planId)?.name} foi ativado com sucesso.`,
      });
      // Refresh subscription data
      window.location.href = '/subscription';
    } else if (status === 'failure') {
      toast({
        variant: 'destructive',
        title: 'Pagamento não aprovado',
        description: 'O pagamento não foi processado. Tente novamente.',
      });
    } else if (status === 'pending') {
      toast({
        title: 'Pagamento pendente',
        description: 'Seu pagamento está sendo processado. Aguarde a confirmação.',
      });
    }
  }, [searchParams, toast, plans]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || subLoading || plansLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!user) return null;

  const currentPlan = subscription?.plan || 'gratuito';

  const handleSelectPlan = async (planId: PlanType) => {
    if (planId === currentPlan) return;
    
    // If downgrading to free plan, just update directly
    if (planId === 'gratuito') {
      setProcessingPlan(planId);
      const billingCycle: BillingCycle = isYearly ? 'yearly' : 'monthly';
      const { error } = await updateSubscription(planId, billingCycle);
      
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Erro ao atualizar plano',
          description: error.message
        });
      } else {
        toast({
          title: 'Plano atualizado!',
          description: 'Você agora está no plano Gratuito'
        });
      }
      setProcessingPlan(null);
      return;
    }

    // For paid plans, create Mercado Pago checkout
    setProcessingPlan(planId);

    try {
      const billingCycle: BillingCycle = isYearly ? 'yearly' : 'monthly';
      
      const { data, error } = await supabase.functions.invoke('mercadopago-checkout', {
        body: { planId, billingCycle }
      });

      if (error) {
        throw new Error(error.message || 'Erro ao criar checkout');
      }

      if (data?.initPoint) {
        // Redirect to Mercado Pago checkout
        window.location.href = data.initPoint;
      } else {
        throw new Error('URL de checkout não recebida');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao processar pagamento',
        description: error.message || 'Tente novamente mais tarde'
      });
      setProcessingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-secondary/95 backdrop-blur-sm border-b border-secondary-foreground/10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <a href="/" className="flex items-center gap-2">
              <MapPin className="w-6 h-6 text-primary" />
              <span className="text-lg font-bold text-secondary-foreground">GeoData Brasil</span>
            </a>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigate('/subscription/history')}>
                <Receipt className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Histórico e recibos</span>
                <span className="sm:hidden">Histórico</span>
              </Button>
              <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Voltar ao Dashboard</span>
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Gerenciar Assinatura
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Seu plano atual: <span className="font-semibold text-primary">{plans.find(p => p.slug === currentPlan)?.name}</span>
          </p>
          
          {/* Toggle */}
          <div className="inline-flex items-center gap-4 p-1 rounded-full bg-muted">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                !isYearly ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                isYearly ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Anual <span className="text-xs opacity-80">(até 25% off)</span>
            </button>
          </div>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div 
              key={plan.id}
              className={`relative rounded-2xl p-8 transition-all ${
                plan.slug === currentPlan
                  ? 'ring-2 ring-primary bg-primary/5'
                  : plan.popular 
                    ? 'bg-secondary border-2 border-primary shadow-xl scale-105' 
                    : 'bg-card border border-border'
              }`}
            >
              {plan.popular && plan.slug !== currentPlan && (

                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1">
                  <Star className="w-4 h-4" />
                  Mais Popular
                </div>
              )}
              
              {plan.slug === currentPlan && (
                <div className="absolute -top-4 right-4 px-4 py-1 rounded-full bg-accent text-accent-foreground text-sm font-medium flex items-center gap-1">
                  <Crown className="w-4 h-4" />
                  Seu Plano
                </div>
              )}
              
              <div className="text-center mb-6">
                <h3 className={`text-2xl font-bold mb-2 ${plan.popular ? 'text-secondary-foreground' : 'text-foreground'}`}>
                  {plan.name}
                </h3>
                <p className={`text-sm ${plan.popular ? 'text-secondary-foreground/70' : 'text-muted-foreground'}`}>
                  {plan.description}
                </p>
              </div>
              
              <div className="text-center mb-8">
                <div className="flex items-baseline justify-center gap-1">
                  <span className={`text-lg ${plan.popular ? 'text-secondary-foreground/70' : 'text-muted-foreground'}`}>R$</span>
                  <span className={`text-5xl font-bold ${plan.popular ? 'text-secondary-foreground' : 'text-foreground'}`}>
                    {(isYearly ? plan.yearly_price : plan.monthly_price).toFixed(0)}
                  </span>
                  {plan.monthly_price > 0 && (
                    <span className={`text-sm ${plan.popular ? 'text-secondary-foreground/70' : 'text-muted-foreground'}`}>/mês</span>
                  )}
                </div>
                {isYearly && plan.monthly_price > 0 && (
                  <p className={`text-sm mt-2 ${plan.popular ? 'text-secondary-foreground/60' : 'text-muted-foreground'}`}>
                    cobrado anualmente (R$ {(plan.yearly_price * 12).toFixed(0)}/ano)
                  </p>
                )}
              </div>
              
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className={`w-5 h-5 mt-0.5 flex-shrink-0 ${plan.popular ? 'text-primary' : 'text-primary'}`} />
                    <span className={`text-sm ${plan.popular ? 'text-secondary-foreground' : 'text-foreground'}`}>{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button 
                className="w-full" 
                variant={plan.slug === currentPlan ? 'secondary' : plan.popular ? 'default' : 'outline'}
                size="lg"
                disabled={plan.slug === currentPlan || processingPlan !== null}
                onClick={() => handleSelectPlan(plan.slug as PlanType)}
              >
                {plan.slug === currentPlan ? (
                  'Plano Atual'
                ) : processingPlan === plan.slug ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : plan.monthly_price === 0 ? (
                  'Mudar para Gratuito'
                ) : (
                  plan.cta
                )}
              </Button>
            </div>
          ))}
        </div>
        
        <div className="text-center mt-12 space-y-2">
          <p className="text-sm text-muted-foreground">
            Pagamento seguro processado pelo Mercado Pago
          </p>
          <p className="text-xs text-muted-foreground/70">
            Você pode cancelar sua assinatura a qualquer momento
          </p>
        </div>
      </main>
    </div>
  );
}
