import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Crown, FileArchive, ShieldCheck, MapPinned, Sparkles, ArrowRight, Headset } from "lucide-react";

const differentials = [
  {
    icon: FileArchive,
    title: "Shapefiles curados por estado",
    description: "Camadas tratadas, padronizadas e prontas para uso — sem inconsistências de projeção ou atributos."
  },
  {
    icon: MapPinned,
    title: "Recortes estaduais prontos",
    description: "Dados já organizados por UF e tema, evitando horas de filtragem e recorte manual em GIS."
  },
  {
    icon: Sparkles,
    title: "Múltiplos formatos de saída",
    description: "Baixe em GeoJSON, KML (Google Earth) ou Shapefile, com conversão feita pelo servidor."
  },
  {
    icon: ShieldCheck,
    title: "Hospedagem própria e estável",
    description: "Sem depender da disponibilidade dos servidores públicos: nosso catálogo fica sempre no ar."
  },
  {
    icon: Crown,
    title: "Acervo exclusivo",
    description: "Camadas mantidas e revisadas pela equipe da plataforma, indisponíveis nas fontes abertas."
  },
  {
    icon: Headset,
    title: "Suporte a demandas",
    description: "Planos pagos incluem atendimento por e-mail e, no Completo, suporte prioritário 24/7."
  }
];

export function PremiumCatalog() {
  const navigate = useNavigate();

  return (
    <section id="premium" className="py-20 bg-card">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 mb-6">
            <Crown className="w-4 h-4" />
            <span className="text-sm font-medium">Catálogo Premium</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            O que você ganha além dos dados públicos
          </h2>
          <p className="text-lg text-muted-foreground">
            Todas as fontes oficiais continuam gratuitas. O Catálogo Premium é o nosso acervo interno:
            shapefiles curados por estado, hospedados na plataforma e entregues prontos para análise.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {differentials.map((item, index) => (
            <div
              key={index}
              className="p-6 rounded-xl bg-background border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg"
            >
              <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Button size="lg" onClick={() => navigate('/subscription')} className="h-14 px-8 text-lg">
            Conhecer os planos premium
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <p className="mt-4 text-sm text-muted-foreground">
            Disponível nos planos Profissional e Completo. Dados públicos seguem 100% gratuitos.
          </p>
        </div>
      </div>
    </section>
  );
}