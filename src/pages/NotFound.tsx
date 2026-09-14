import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Compass, ArrowLeft, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    document.title = "Página não encontrada — GeoData Brasil";
  }, [location.pathname]);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
          <Compass className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-muted-foreground mb-2">Erro 404</p>
        <h1 className="text-3xl font-bold text-foreground mb-3">
          Não encontramos esta página
        </h1>
        <p className="text-muted-foreground mb-8">
          O endereço acessado não existe ou foi movido. Volte à página inicial para
          continuar explorando os dados geoespaciais do Brasil.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg">
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Página inicial
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/dashboard">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Ir para o painel
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
};

export default NotFound;
