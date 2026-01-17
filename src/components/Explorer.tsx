import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Database, ArrowRight, CheckCircle } from "lucide-react";

export function Explorer() {
  const navigate = useNavigate();

  const benefits = [
    "Acesso a dados geoespaciais de todos os estados",
    "Download em formato GeoJSON",
    "Visualização interativa no mapa",
    "Atualizações constantes de dados"
  ];

  return (
    <section id="explorer" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          {/* Icon */}
          <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Database className="w-10 h-10 text-primary" />
          </div>

          {/* Title */}
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Explorar Dados Geoespaciais
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Crie sua conta gratuita para acessar nossa base de dados geoespaciais do Brasil
          </p>

          {/* Benefits */}
          <div className="grid sm:grid-cols-2 gap-4 mb-10 text-left max-w-xl mx-auto">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-sm text-foreground">{benefit}</span>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <Button 
            size="lg" 
            onClick={() => navigate('/auth')}
            className="min-w-[250px] h-14 text-lg"
          >
            Criar Conta Gratuita
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>

          <p className="mt-4 text-sm text-muted-foreground">
            Já tem uma conta?{' '}
            <button 
              onClick={() => navigate('/auth')}
              className="text-primary hover:underline font-medium"
            >
              Fazer login
            </button>
          </p>
        </div>
      </div>
    </section>
  );
}
