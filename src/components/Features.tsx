import { Map, Download, Filter, Globe, Layers, Crown } from "lucide-react";

const features = [
  {
    icon: Globe,
    title: "13 fontes oficiais conectadas",
    description: "IBGE, INPE, ICMBio, MMA, ANP, CPRM, EMBRAPA, MAPA, SFB, DNIT, ANATEL e IPHAN — organizados por estado e tema."
  },
  {
    icon: Layers,
    title: "Gerenciador WMS próprio",
    description: "Adicione seus próprios serviços WMS ao mapa, com controle de visibilidade e opacidade por camada."
  },
  {
    icon: Download,
    title: "GeoJSON, KML e Shapefile",
    description: "Baixe cada camada no formato que preferir, pronto para QGIS, ArcGIS ou Google Earth."
  },
  {
    icon: Map,
    title: "Mapa interativo",
    description: "Explore as feições no navegador, consulte atributos e sobreponha camadas antes de baixar."
  },
  {
    icon: Filter,
    title: "Busca e filtros por fonte",
    description: "Seletor de fontes em cards com busca, categorias temáticas e agrupamento automático por UF."
  },
  {
    icon: Crown,
    title: "Catálogo Premium interno",
    description: "Shapefiles curados por estado, hospedados na plataforma, para os planos Profissional e Completo."
  }
];

export function Features() {
  return (
    <section className="py-20 bg-card">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            O que o portal faz por você
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Consulta, visualização e download de dados geoespaciais do Brasil — dados públicos gratuitos e um catálogo premium curado
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
