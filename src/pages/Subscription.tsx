import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MapPin, ArrowLeft, Check, Star, Crown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription, PlanType, BillingCycle } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';

const plans: {
  id: PlanType;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  popular: boolean;
}[] = [
  {
    id: 'gratuito',
    name: 'Gratuito',
    description: 'Perfeito para conhecer a plataforma',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      'Acesso a Unidades de Conservação Federal',
      'Acesso a CAR Uso Restrito',
      'Visualização no mapa',
      'Download em GeoJSON',
      'Busca por estado'
    ],
    popular: false
  },
  {
    id: 'profissional',
    name: 'Profissional',
    description: 'Para profissionais e pequenas equipes',
    monthlyPrice: 29.90,
    yearlyPrice: 20,
    features: [
      'Tudo do plano Gratuito',
      'Acesso a 50+ camadas adicionais',
      'Territórios Indígenas',
      'Áreas de Proteção Ambiental',
      'Download ilimitado',
      'Suporte por email'
    ],
    popular: true
  },
  {
    id: 'completo',
    name: 'Completo',
    description: 'Acesso total para empresas e pesquisadores',
    monthlyPrice: 60,
    yearlyPrice: 45,
    features: [
      'Acesso a TODAS as camadas',
      'Atualizações em tempo real',
      'API de integração',
      'Suporte prioritário 24/7',
      'Dados históricos',
      'Exportação em múltiplos formatos',
      'Dashboard personalizado'
    ],
    popular: false
  }
];

export default function Subscription() {
  const { user, loading: authLoading } = useAuth();
  const { subscription, loading: subLoading, updateSubscription } = useSubscription();
  const [isYearly, setIsYearly] = useState(false);
  const [updating, setUpdating] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || subLoading) {
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
    
    setUpdating(true);
    
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
        description: `Você agora está no plano ${plans.find(p => p.id === planId)?.name}`
      });
    }
    
    setUpdating(false);
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
            
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Dashboard
            </Button>
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
            Seu plano atual: <span className="font-semibold text-primary">{plans.find(p => p.id === currentPlan)?.name}</span>
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
                plan.id === currentPlan
                  ? 'ring-2 ring-primary bg-primary/5'
                  : plan.popular 
                    ? 'bg-secondary border-2 border-primary shadow-xl scale-105' 
                    : 'bg-card border border-border'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1">
                  <Star className="w-4 h-4" />
                  Mais Popular
                </div>
              )}
              
              {plan.id === currentPlan && (
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
                    {isYearly ? plan.yearlyPrice.toFixed(0) : plan.monthlyPrice.toFixed(0).replace('.', ',')}
                  </span>
                  {plan.monthlyPrice > 0 && (
                    <span className={`text-sm ${plan.popular ? 'text-secondary-foreground/70' : 'text-muted-foreground'}`}>/mês</span>
                  )}
                </div>
                {isYearly && plan.monthlyPrice > 0 && (
                  <p className={`text-sm mt-2 ${plan.popular ? 'text-secondary-foreground/60' : 'text-muted-foreground'}`}>
                    cobrado anualmente (R$ {(plan.yearlyPrice * 12).toFixed(0)}/ano)
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
                variant={plan.id === currentPlan ? 'secondary' : plan.popular ? 'default' : 'outline'}
                size="lg"
                disabled={plan.id === currentPlan || updating}
                onClick={() => handleSelectPlan(plan.id)}
              >
                {plan.id === currentPlan 
                  ? 'Plano Atual' 
                  : updating 
                    ? 'Processando...'
                    : plan.monthlyPrice === 0 
                      ? 'Mudar para Gratuito' 
                      : `Assinar ${plan.name}`}
              </Button>
            </div>
          ))}
        </div>
        
        <p className="text-center text-sm text-muted-foreground mt-12">
          Nota: A integração com pagamentos será implementada em breve. Por enquanto, a mudança de plano é simulada.
        </p>
      </main>
    </div>
  );
}
