import { MapPin, Mail, Phone } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="bg-secondary py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-5 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-6 h-6 text-primary" />
              <span className="text-xl font-bold text-secondary-foreground">GeoData Brasil</span>
            </div>
            <p className="text-secondary-foreground/70 max-w-md">
              Portal de consulta, visualização e download de dados geoespaciais do Brasil.
              Fontes públicas oficiais gratuitas em GeoJSON, KML e Shapefile, mais um Catálogo
              Premium com shapefiles curados por estado.
            </p>
          </div>
          
          {/* Links */}
          <div>
            <h4 className="font-semibold text-secondary-foreground mb-4">Links</h4>
            <ul className="space-y-2 text-secondary-foreground/70">
              <li><a href="#explorer" className="hover:text-primary transition-colors">Explorar Dados</a></li>
              <li><a href="#premium" className="hover:text-primary transition-colors">Catálogo Premium</a></li>
              <li><a href="#pricing" className="hover:text-primary transition-colors">Planos</a></li>
            </ul>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-secondary-foreground mb-4">Legal</h4>
            <ul className="space-y-2 text-secondary-foreground/70 text-sm">
              <li><Link to="/termos-de-uso" className="hover:text-primary transition-colors">Termos de Uso</Link></li>
              <li><Link to="/politica-de-privacidade" className="hover:text-primary transition-colors">Política de Privacidade</Link></li>
              <li><Link to="/politica-de-cookies" className="hover:text-primary transition-colors">Política de Cookies</Link></li>
              <li><Link to="/politica-de-reembolso" className="hover:text-primary transition-colors">Reembolso e Cancelamento</Link></li>
              <li><Link to="/licenca-de-dados" className="hover:text-primary transition-colors">Licença e Uso dos Dados</Link></li>
            </ul>
          </div>

          
          {/* Contact */}
          <div>
            <h4 className="font-semibold text-secondary-foreground mb-4">Contato</h4>
            <ul className="space-y-3 text-secondary-foreground/70">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <a href="mailto:contato@geodatabrasil.com" className="hover:text-primary transition-colors">
                  contato@geodatabrasil.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span>(11) 9999-9999</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-secondary-foreground/10 pt-8 text-center text-secondary-foreground/50 text-sm">
          <p>© {new Date().getFullYear()} GeoData Brasil. Todos os direitos reservados.</p>
          <p className="mt-2">
           Este é um projeto de serviço público digital que promove o acesso à informação em conformidade com a Lei nº 12.527/2011 (Lei de Acesso à Informação). Os dados são de responsabilidade dos órgãos originais.
          </p>
        </div>
      </div>
    </footer>
  );
}
