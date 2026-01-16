import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Database, Layers, RefreshCw } from "lucide-react";
import { fetchLayers, groupLayersByState, Layer, UF_NAMES } from "@/lib/wms-explorer";
import { StateCard } from "./StateCard";
import { StateModal } from "./StateModal";
import { MapModal } from "./MapModal";

export function Explorer() {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [filteredLayers, setFilteredLayers] = useState<Layer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedState, setSelectedState] = useState<{ uf: string; layers: Layer[] } | null>(null);
  const [mapLayer, setMapLayer] = useState<Layer | null>(null);

  const loadLayers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchLayers();
      setLayers(data);
      setFilteredLayers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

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
    <section id="explorer" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Explorar Dados Geoespaciais
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Selecione um estado para visualizar e baixar as camadas disponíveis
          </p>
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
          <div className="flex justify-center gap-8 mb-12">
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
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
              <Database className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Pronto para explorar?
            </h3>
            <p className="text-muted-foreground mb-6">
              Clique no botão acima para carregar as camadas de dados geoespaciais
            </p>
          </div>
        )}
      </div>

      {/* State Modal */}
      {selectedState && (
        <StateModal
          uf={selectedState.uf}
          layers={selectedState.layers}
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
}
