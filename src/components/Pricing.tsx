import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, Star } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const plans = [
  {
    name: "Gratuito",
    description: "Todos os dados públicos oficiais, sem custo",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      "Acesso a TODAS as fontes públicas oficiais (IBGE, INPE, IBAMA, FUNAI, ICMBio, EMBRAPA e mais)",
      "Visualização e download em GeoJSON",
      "Busca por estado e tema",
      "500+ camadas gratuitas",
    ],
    excluded: [
      "Catálogo Premium interno (shapefiles curados por estado)",
      "Suporte dedicado"
    ],
    cta: "Começar Grátis",
    popular: false
  },
  {
    name: "Profissional",
    description: "Catálogo Premium curado + tudo do Gratuito",
    monthlyPrice: 29.90,
    yearlyPrice: 20,
    features: [
      "Tudo do plano Gratuito",
      "Acesso ao Catálogo Premium interno",
      "Shapefiles curados por estado",
      "Dados exclusivos gerenciados pela plataforma",
      "Suporte por email"
    ],
    excluded: [
      "Suporte prioritário 24/7"
    ],
    cta: "Assinar Profissional",
    popular: true
  },
  {
    name: "Completo",
    description: "Premium + suporte dedicado para empresas",
    monthlyPrice: 60,
    yearlyPrice: 45,
    features: [
      "Tudo do plano Profissional",
      "Acesso completo ao Catálogo Premium",
      "Suporte prioritário 24/7",
      "Atendimento a demandas específicas",
      "Exportação em múltiplos formatos"
    ],
    excluded: [],
    cta: "Assinar Completo",
    popular: false
  }
];

export function Pricing() {
  const [isYearly, setIsYearly] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handlePlanClick = (planName: string) => {
    if (user) {
      navigate('/subscription');
    } else {
      navigate('/auth');
    }
  };

  return (
    <section id="pricing" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Planos de Acesso
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Escolha o plano ideal para suas necessidades de dados geoespaciais
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
          {plans.map((plan, index) => (
            <div 
              key={index}
              className={`relative rounded-2xl p-8 ${
                plan.popular 
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
                {plan.excluded.map((feature, i) => (
                  <li key={`ex-${i}`} className="flex items-start gap-3 opacity-50">
                    <span className={`w-5 h-5 mt-0.5 flex-shrink-0 text-center ${plan.popular ? 'text-secondary-foreground/50' : 'text-muted-foreground'}`}>—</span>
                    <span className={`text-sm line-through ${plan.popular ? 'text-secondary-foreground/50' : 'text-muted-foreground'}`}>{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button 
                className="w-full" 
                variant={plan.popular ? "default" : "outline"}
                size="lg"
                onClick={() => handlePlanClick(plan.name)}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
