import { useEffect, useRef, useState } from "react";
import { X, Loader2, AlertCircle, Layers, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layer, downloadLayerAsGeoJSON, WMS_BASE_URL } from "@/lib/wms-explorer";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapModalProps {
  layer: Layer;
  onClose: () => void;
}

export function MapModal({ layer, onClose }: MapModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [featureCount, setFeatureCount] = useState(0);
  const [showWmsLayer, setShowWmsLayer] = useState(true);
  const [showVectorLayer, setShowVectorLayer] = useState(true);
  const wmsLayerRef = useRef<L.TileLayer.WMS | null>(null);
  const vectorLayerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current);
    mapRef.current = map;

    // Add OpenStreetMap tiles as base layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Set initial view for Brazil
    map.setView([-14.235, -51.925], 4);

    // Add WMS tile layer for raster visualization
    const wmsLayer = L.tileLayer.wms(WMS_BASE_URL, {
      layers: layer.name,
      format: 'image/png',
      transparent: true,
      version: '1.1.1',
      attribution: '© PortalMaps',
      opacity: 0.7
    }).addTo(map);
    wmsLayerRef.current = wmsLayer;

    // Fit to layer bounds if available
    if (layer.bbox) {
      const bounds: L.LatLngBoundsExpression = [
        [layer.bbox.miny, layer.bbox.minx],
        [layer.bbox.maxy, layer.bbox.maxx]
      ];
      map.fitBounds(bounds, { padding: [20, 20] });
    }

    // Fetch and render GeoJSON features
    const loadFeatures = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await downloadLayerAsGeoJSON(layer.name);
        const geojson = data.geojson as GeoJSON.FeatureCollection;
        
        if (!geojson.features || geojson.features.length === 0) {
          setError('Nenhuma feição encontrada para esta camada');
          setLoading(false);
          return;
        }
        
        setFeatureCount(geojson.features.length);
        
        // Create GeoJSON layer with styling
        const geoJsonLayer = L.geoJSON(geojson, {
          style: {
            color: '#0891b2',
            weight: 2,
            opacity: 0.8,
            fillColor: '#0891b2',
            fillOpacity: 0.3
          },
          pointToLayer: (feature, latlng) => {
            return L.circleMarker(latlng, {
              radius: 8,
              fillColor: '#0891b2',
              color: '#0891b2',
              weight: 2,
              opacity: 1,
              fillOpacity: 0.6
            });
          },
          onEachFeature: (feature, featureLayer) => {
            // Build popup content from properties
            const props = feature.properties;
            if (props) {
              let popupContent = '<div class="max-w-xs overflow-auto">';
              popupContent += `<h4 class="font-bold text-sm mb-2">${layer.title}</h4>`;
              popupContent += '<table class="text-xs w-full">';
              
              const keys = Object.keys(props).slice(0, 10); // Limit to 10 properties
              keys.forEach(key => {
                const value = props[key];
                if (value !== null && value !== undefined && value !== '') {
                  popupContent += `
                    <tr class="border-b border-gray-200">
                      <td class="font-medium pr-2 py-1">${key}</td>
                      <td class="py-1">${String(value).substring(0, 100)}</td>
                    </tr>
                  `;
                }
              });
              
              popupContent += '</table></div>';
              featureLayer.bindPopup(popupContent, { maxWidth: 300 });
            }
          }
        }).addTo(map);
        vectorLayerRef.current = geoJsonLayer;
        
        // Fit map to features bounds (overrides WMS bounds for better precision)
        const bounds = geoJsonLayer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [20, 20] });
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading features:', err);
        setError(err instanceof Error ? err.message : 'Erro ao carregar feições');
        setLoading(false);
        
        // Fallback: show bounding box if available
        if (layer.bbox) {
          const bounds: L.LatLngBoundsExpression = [
            [layer.bbox.miny, layer.bbox.minx],
            [layer.bbox.maxy, layer.bbox.maxx]
          ];
          map.fitBounds(bounds);
          
          L.rectangle(bounds, {
            color: '#dc2626',
            fillColor: '#dc2626',
            fillOpacity: 0.1,
            weight: 2,
            dashArray: '5, 5'
          }).addTo(map).bindPopup(`
            <strong>Área aproximada</strong><br>
            <small>Não foi possível carregar as feições</small>
          `);
        }
      }
    };

    loadFeatures();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      wmsLayerRef.current = null;
      vectorLayerRef.current = null;
    };
  }, [layer]);

  // Toggle WMS layer visibility
  useEffect(() => {
    if (wmsLayerRef.current && mapRef.current) {
      if (showWmsLayer) {
        wmsLayerRef.current.addTo(mapRef.current);
      } else {
        wmsLayerRef.current.remove();
      }
    }
  }, [showWmsLayer]);

  // Toggle Vector layer visibility
  useEffect(() => {
    if (vectorLayerRef.current && mapRef.current) {
      if (showVectorLayer) {
        vectorLayerRef.current.addTo(mapRef.current);
      } else {
        vectorLayerRef.current.remove();
      }
    }
  }, [showVectorLayer]);

  return (
    <div 
      className="fixed inset-0 z-50 bg-secondary/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-background rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="min-w-0 flex-1 mr-4">
            <h2 className="text-lg font-bold text-foreground truncate">
              {layer.title}
            </h2>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground font-mono truncate">
                {layer.name}
              </p>
              {!loading && !error && featureCount > 0 && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {featureCount} feições
                </span>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Map Container */}
        <div className="relative">
          <div ref={mapContainerRef} className="h-[500px] w-full" />
          
          {/* Layer Controls */}
          <div className="absolute top-4 right-4 z-[1000] bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border border-border p-2 space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground px-2 pb-1 border-b border-border">
              <Layers className="w-3 h-3" />
              <span>Camadas</span>
            </div>
            <button
              onClick={() => setShowWmsLayer(!showWmsLayer)}
              className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm transition-colors ${
                showWmsLayer ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {showWmsLayer ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              <span>WMS Raster</span>
            </button>
            <button
              onClick={() => setShowVectorLayer(!showVectorLayer)}
              className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm transition-colors ${
                showVectorLayer ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {showVectorLayer ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              <span>Vetorial</span>
            </button>
          </div>
          
          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Carregando feições...</p>
              </div>
            </div>
          )}
          
          {/* Error Banner */}
          {error && !loading && (
            <div className="absolute bottom-4 left-4 right-4 bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">Erro ao carregar feições</p>
                <p className="text-xs text-muted-foreground">{error}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
