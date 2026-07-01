import { useState, useEffect, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Database, Layers, RefreshCw, Globe } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { fetchLayers, groupLayersByState, Layer, UF_NAMES, PlanType } from "@/lib/wms-explorer";
import { DATA_SOURCES, DEFAULT_SOURCE, getSourceById } from "@/lib/data-sources";
import { StateCard } from "./StateCard";
import { StateModal } from "./StateModal";
import { MapModal } from "./MapModal";

interface DashboardExplorerProps {
  userPlan: 'gratuito' | 'profissional' | 'completo';
}

export const DashboardExplorer = forwardRef<HTMLElement, DashboardExplorerProps>(
  function DashboardExplorer({ userPlan }, ref) {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [filteredLayers, setFilteredLayers] = useState<Layer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedState, setSelectedState] = useState<{ uf: string; layers: Layer[] } | null>(null);
  const [mapLayer, setMapLayer] = useState<Layer | null>(null);
  const [sourceId, setSourceId] = useState<string>(DEFAULT_SOURCE.id);

  const currentSource = getSourceById(sourceId);

  const loadLayers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchLayers(currentSource.url);
      setLayers(data);
      setFilteredLayers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  // Reset when source changes
  useEffect(() => {
    setLayers([]);
    setFilteredLayers([]);
    setError(null);
  }, [sourceId]);

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    const filtered = layers.filter(l => 
      [l.name, l.title, l.abstract].some(v => v?.toLowerCase().includes(term))
    );
    setFilteredLayers(filtered);
  }, [searchTerm, layers]);

  const groups = groupLayersByState(filteredLayers);
  const orderedStates = [...groups.keys()]
    .filter(k => k !== 'OUTROS' && UF_NAMES[k])
    .sort()
    .concat(groups.has('OUTROS') ? ['OUTROS'] : []);

  return (
    <section ref={ref} className="py-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          Dados Geoespaciais
        </h2>
        <p className="text-muted-foreground">
          Escolha uma fonte de dados pública e explore as camadas disponíveis
        </p>
      </div>

      {/* Data source selector */}
      <div className="max-w-2xl mx-auto mb-6">
        <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
          <Globe className="w-4 h-4" />
          Fonte de dados
        </label>
        <Select value={sourceId} onValueChange={setSourceId}>
          <SelectTrigger className="h-12">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-[400px]">
            {DATA_SOURCES.map(src => (
              <SelectItem key={src.id} value={src.id}>
                <div className="flex flex-col text-left">
                  <span className="font-medium">{src.label}</span>
                  <span className="text-xs text-muted-foreground">{src.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
        <Button 
          onClick={loadLayers} 
          disabled={loading}
          size="lg"
          className="min-w-[200px]"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : layers.length > 0 ? (
            <RefreshCw className="w-5 h-5 mr-2" />
          ) : (
            <Database className="w-5 h-5 mr-2" />
          )}
          {loading ? 'Carregando...' : layers.length > 0 ? 'Atualizar Dados' : 'Carregar Camadas'}
        </Button>
        
        {layers.length > 0 && (
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar camadas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
        )}
      </div>

      {/* Stats */}
      {layers.length > 0 && (
        <div className="flex justify-center gap-8 mb-8">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Database className="w-5 h-5" />
            <span><strong className="text-foreground">{layers.length}</strong> total</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Layers className="w-5 h-5" />
            <span><strong className="text-foreground">{filteredLayers.length}</strong> filtradas</span>
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

      {/* States Grid */}
      {layers.length > 0 && (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {orderedStates.map(uf => {
            const stateLayers = groups.get(uf) || [];
            if (stateLayers.length === 0) return null;
            
            return (
              <StateCard
                key={uf}
                uf={uf}
                layerCount={stateLayers.length}
                onClick={() => setSelectedState({ uf, layers: stateLayers })}
              />
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && layers.length === 0 && !error && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Database className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Pronto para explorar?
          </h3>
          <p className="text-muted-foreground mb-4">
            Clique no botão acima para carregar as camadas de dados geoespaciais
          </p>
        </div>
      )}

      {/* State Modal */}
      {selectedState && (
        <StateModal
          uf={selectedState.uf}
          layers={selectedState.layers}
          userPlan={userPlan}
          onClose={() => setSelectedState(null)}
          onShowMap={(layer) => {
            setMapLayer(layer);
            setSelectedState(null);
          }}
        />
      )}

      {/* Map Modal */}
      {mapLayer && (
        <MapModal
          layer={mapLayer}
          onClose={() => setMapLayer(null)}
        />
      )}
    </section>
  );
});

DashboardExplorer.displayName = "DashboardExplorer";
