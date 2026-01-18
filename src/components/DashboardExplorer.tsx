import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Database, Layers, RefreshCw, Building2, FolderOpen } from "lucide-react";
import { 
  fetchINDECatalog, 
  groupServicesByTheme, 
  groupServicesByInstitution,
  INDEGeoService,
  PlanType,
  isServiceFree,
  canAccessService,
  INDE_THEMES,
  INSTITUTIONS
} from "@/lib/inde-api";
import { ServiceCard } from "./ServiceCard";
import { ServiceModal } from "./ServiceModal";

interface DashboardExplorerProps {
  userPlan: 'gratuito' | 'completo';
}

type GroupBy = 'theme' | 'institution';

export function DashboardExplorer({ userPlan }: DashboardExplorerProps) {
  const [services, setServices] = useState<INDEGeoService[]>([]);
  const [filteredServices, setFilteredServices] = useState<INDEGeoService[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [groupBy, setGroupBy] = useState<GroupBy>('institution');
  const [selectedGroup, setSelectedGroup] = useState<{ key: string; services: INDEGeoService[] } | null>(null);

  const loadServices = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchINDECatalog();
      setServices(data);
      setFilteredServices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados da INDE');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    const filtered = services.filter(s => 
      [s.nome, s.descricao, s.instituicao, s.tema].some(v => v?.toLowerCase().includes(term))
    );
    setFilteredServices(filtered);
  }, [searchTerm, services]);

  const groups = groupBy === 'theme' 
    ? groupServicesByTheme(filteredServices)
    : groupServicesByInstitution(filteredServices);
  
  const orderedKeys = [...groups.keys()].sort();

  return (
    <section className="py-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          Catálogo INDE
        </h2>
        <p className="text-muted-foreground">
          Explore os geoserviços da Infraestrutura Nacional de Dados Espaciais
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
        <Button 
          onClick={loadServices} 
          disabled={loading}
          size="lg"
          className="min-w-[200px]"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : services.length > 0 ? (
            <RefreshCw className="w-5 h-5 mr-2" />
          ) : (
            <Database className="w-5 h-5 mr-2" />
          )}
          {loading ? 'Carregando...' : services.length > 0 ? 'Atualizar Catálogo' : 'Carregar Catálogo'}
        </Button>
        
        {services.length > 0 && (
          <>
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar serviços..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={groupBy === 'institution' ? 'default' : 'outline'}
                size="lg"
                onClick={() => setGroupBy('institution')}
              >
                <Building2 className="w-4 h-4 mr-2" />
                Instituição
              </Button>
              <Button
                variant={groupBy === 'theme' ? 'default' : 'outline'}
                size="lg"
                onClick={() => setGroupBy('theme')}
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                Tema
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Stats */}
      {services.length > 0 && (
        <div className="flex justify-center gap-8 mb-8">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Database className="w-5 h-5" />
            <span><strong className="text-foreground">{services.length}</strong> serviços</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Layers className="w-5 h-5" />
            <span><strong className="text-foreground">{filteredServices.length}</strong> filtrados</span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="max-w-md mx-auto p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-center mb-8">
          <p className="text-destructive font-medium">❌ {error}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Verifique sua conexão e tente novamente
          </p>
        </div>
      )}

      {/* Groups Grid */}
      {services.length > 0 && (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {orderedKeys.map(key => {
            const groupServices = groups.get(key) || [];
            if (groupServices.length === 0) return null;
            
            const isFree = groupBy === 'institution' && isServiceFree(key);
            const hasAccess = groupBy === 'institution' && canAccessService(key, userPlan);
            
            return (
              <ServiceCard
                key={key}
                name={key}
                fullName={groupBy === 'institution' ? INSTITUTIONS[key] || key : INDE_THEMES[key] || key}
                serviceCount={groupServices.length}
                isFree={isFree}
                hasAccess={hasAccess}
                groupBy={groupBy}
                onClick={() => setSelectedGroup({ key, services: groupServices })}
              />
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && services.length === 0 && !error && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Database className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Pronto para explorar?
          </h3>
          <p className="text-muted-foreground mb-4">
            Clique no botão acima para carregar o catálogo de geoserviços da INDE
          </p>
        </div>
      )}

      {/* Service Modal */}
      {selectedGroup && (
        <ServiceModal
          groupName={selectedGroup.key}
          services={selectedGroup.services}
          userPlan={userPlan}
          groupBy={groupBy}
          onClose={() => setSelectedGroup(null)}
        />
      )}
    </section>
  );
}
