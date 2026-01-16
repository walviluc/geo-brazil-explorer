import { Button } from "@/components/ui/button";
import { MapPin, Database, Shield } from "lucide-react";
import heroImage from "@/assets/hero-brazil-geo.jpg";

export function Hero() {
  const scrollToExplorer = () => {
    document.getElementById('explorer')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToPricing = () => {
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-secondary/90 via-secondary/80 to-secondary/95" />
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 text-primary-foreground border border-primary/30 mb-8">
          <MapPin className="w-4 h-4" />
          <span className="text-sm font-medium">Portal de Dados Geoespaciais do Brasil</span>
        </div>
        
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-secondary-foreground mb-6 leading-tight">
          GeoData <span className="text-primary">Brasil</span>
        </h1>
        
        <p className="text-lg md:text-xl text-secondary-foreground/80 max-w-3xl mx-auto mb-8 leading-relaxed">
          Acesse dados geoespaciais de todos os 27 estados brasileiros. Unidades de conservação, 
          áreas de uso restrito, territórios indígenas e muito mais em formato GeoJSON.
        </p>
        
        {/* Stats */}
        <div className="flex flex-wrap justify-center gap-8 mb-12">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/20">
              <Database className="w-6 h-6 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-2xl font-bold text-secondary-foreground">500+</p>
              <p className="text-sm text-secondary-foreground/70">Camadas de Dados</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/20">
              <MapPin className="w-6 h-6 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-2xl font-bold text-secondary-foreground">27</p>
              <p className="text-sm text-secondary-foreground/70">Estados + DF</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/20">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-2xl font-bold text-secondary-foreground">100%</p>
              <p className="text-sm text-secondary-foreground/70">Dados Oficiais</p>
            </div>
          </div>
        </div>
        
        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" onClick={scrollToExplorer} className="text-lg px-8 py-6">
            Explorar Dados Gratuitos
          </Button>
          <Button size="lg" variant="outline" onClick={scrollToPricing} className="text-lg px-8 py-6 border-primary/30 text-secondary-foreground hover:bg-primary/10">
            Ver Planos de Acesso
          </Button>
        </div>
      </div>
      
      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-secondary-foreground/30 flex items-start justify-center p-2">
          <div className="w-1.5 h-3 rounded-full bg-primary" />
        </div>
      </div>
    </section>
  );
}
