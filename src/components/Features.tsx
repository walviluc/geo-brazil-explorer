import { Map, Download, Filter, Globe, Layers, Lock } from "lucide-react";

const features = [
  {
    icon: Globe,
    title: "Cobertura Nacional",
    description: "Dados geoespaciais de todos os 27 estados brasileiros organizados por região e tema."
  },
  {
    icon: Layers,
    title: "Múltiplas Camadas",
    description: "Unidades de conservação, áreas de uso restrito, territórios indígenas, CAR e muito mais."
  },
  {
    icon: Download,
    title: "Download GeoJSON",
    description: "Baixe os dados em formato GeoJSON pronto para uso em GIS, mapas e análises."
  },
  {
    icon: Map,
    title: "Visualização no Mapa",
    description: "Visualize as camadas diretamente no navegador antes de fazer o download."
  },
  {
    icon: Filter,
    title: "Busca Inteligente",
    description: "Encontre rapidamente as camadas que precisa com filtros por estado e tema."
  },
  {
    icon: Lock,
    title: "Dados Oficiais",
    description: "Informações provenientes de fontes oficiais do governo brasileiro."
  }
];

export function Features() {
  return (
    <section className="py-20 bg-card">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Tudo que você precisa em um só lugar
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Plataforma completa para consulta e download de dados geoespaciais do Brasil
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="p-6 rounded-xl bg-background border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg group"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
