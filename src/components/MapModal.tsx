import { useEffect, useRef, useState, useCallback } from "react";
import { X, Loader2, AlertCircle, Layers, Eye, EyeOff, Plus, MapPin, ZoomIn, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layer, downloadLayerAsGeoJSON, FEATURES_PER_PAGE } from "@/lib/wms-explorer";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WmsManager, CustomWmsSource, loadStoredWmsSources } from "./WmsManager";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapModalProps {
  layer: Layer;
  onClose: () => void;
}

interface OverlappingFeature {
  feature: GeoJSON.Feature;
  layer: L.Layer;
  id: string;
}

// Custom popup styles
const popupStyles = `
  .custom-popup .leaflet-popup-content-wrapper {
    background: hsl(var(--background));
    color: hsl(var(--foreground));
    border: 2px solid hsl(var(--border));
    border-radius: 0;
    box-shadow: 4px 4px 0px 0px hsl(var(--border));
    padding: 0;
  }
  .custom-popup .leaflet-popup-tip {
    background: hsl(var(--background));
    border: 2px solid hsl(var(--border));
    box-shadow: none;
  }
  .custom-popup .leaflet-popup-close-button {
    color: hsl(var(--foreground));
    font-size: 18px;
    padding: 8px;
    top: 4px;
    right: 4px;
  }
  .custom-popup .leaflet-popup-content {
    margin: 0;
    max-height: 300px;
    overflow-y: auto;
  }
`;

function formatPropertyKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim();
}

function formatPropertyValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') {
    return value.toLocaleString('pt-BR');
  }
  if (typeof value === 'boolean') {
    return value ? 'Sim' : 'Não';
  }
  const str = String(value);
  if (str.length > 80) {
    return str.substring(0, 77) + '...';
  }
  return str;
}

function getFeatureId(feature: GeoJSON.Feature, index: number): string {
  const props = feature.properties;
  if (!props) return `feature-${index}`;
  
  // Try common ID fields
  const idFields = ['id', 'ID', 'cod_imovel', 'COD_IMOVEL', 'nome', 'NOME', 'name', 'NAME', 'gid', 'GID', 'fid', 'FID'];
  for (const field of idFields) {
    if (props[field] !== undefined && props[field] !== null) {
      return String(props[field]);
    }
  }
  
  // Use first non-geometry property
  const firstProp = Object.entries(props).find(([key]) => 
    !key.toLowerCase().includes('geom') && !key.toLowerCase().includes('geometry')
  );
  
  return firstProp ? String(firstProp[1]).substring(0, 50) : `feature-${index}`;
}

function createPopupContent(props: Record<string, unknown>, title: string): string {
  const entries = Object.entries(props)
    .filter(([key, value]) => 
      value !== null && 
      value !== undefined && 
      value !== '' && 
      !key.toLowerCase().includes('geom') &&
      !key.toLowerCase().includes('geometry')
    )
    .slice(0, 12);

  let html = `
    <div style="min-width: 250px;">
      <div style="background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); padding: 12px 16px; font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 8px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        ${title}
      </div>
      <div style="padding: 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
  `;

  entries.forEach(([key, value], index) => {
    const bgColor = index % 2 === 0 ? 'hsl(var(--muted))' : 'hsl(var(--background))';
    html += `
      <tr style="background: ${bgColor};">
        <td style="padding: 8px 12px; font-weight: 500; color: hsl(var(--muted-foreground)); white-space: nowrap; border-bottom: 1px solid hsl(var(--border) / 0.3);">
          ${formatPropertyKey(key)}
        </td>
        <td style="padding: 8px 12px; color: hsl(var(--foreground)); border-bottom: 1px solid hsl(var(--border) / 0.3);">
          ${formatPropertyValue(value)}
        </td>
      </tr>
    `;
  });

  html += `
        </table>
      </div>
    </div>
  `;

  return html;
}

export function MapModal({ layer, onClose }: MapModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [featureCount, setFeatureCount] = useState(0);
  const [totalLoaded, setTotalLoaded] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [showWmsLayer, setShowWmsLayer] = useState(true);
  const [showVectorLayer, setShowVectorLayer] = useState(true);
  const [overlappingFeatures, setOverlappingFeatures] = useState<OverlappingFeature[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<OverlappingFeature | null>(null);
  const [highlightedLayer, setHighlightedLayer] = useState<L.Layer | null>(null);
  const wmsLayerRef = useRef<L.TileLayer.WMS | null>(null);
  const vectorLayerRef = useRef<L.GeoJSON | null>(null);
  const allFeaturesRef = useRef<GeoJSON.Feature[]>([]);
  const featureLayersMapRef = useRef<Map<GeoJSON.Feature, L.Layer>>(new Map());
  const customLayersRef = useRef<Map<string, L.TileLayer.WMS>>(new Map());
  const [customSources, setCustomSources] = useState<CustomWmsSource[]>(() => loadStoredWmsSources());
  const [showWmsManager, setShowWmsManager] = useState(false);

  // Inject custom popup styles
  useEffect(() => {
    const styleId = 'map-popup-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = popupStyles;
      document.head.appendChild(style);
    }
  }, []);

  const highlightFeature = useCallback((featureLayer: L.Layer) => {
    // Reset previous highlight
    if (highlightedLayer && highlightedLayer !== featureLayer) {
      if ('setStyle' in highlightedLayer) {
        (highlightedLayer as L.Path).setStyle({
          color: '#0891b2',
          weight: 2,
          opacity: 0.8,
          fillColor: '#0891b2',
          fillOpacity: 0.3
        });
      }
    }

    // Apply highlight style
    if ('setStyle' in featureLayer) {
      (featureLayer as L.Path).setStyle({
        color: '#dc2626',
        weight: 4,
        opacity: 1,
        fillColor: '#dc2626',
        fillOpacity: 0.5
      });
    }

    setHighlightedLayer(featureLayer);
  }, [highlightedLayer]);

  const zoomToFeature = useCallback((feature: GeoJSON.Feature, featureLayer: L.Layer) => {
    if (!mapRef.current) return;

    highlightFeature(featureLayer);

    // Get bounds of the feature
    if ('getBounds' in featureLayer) {
      const bounds = (featureLayer as L.Polygon).getBounds();
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else if ('getLatLng' in featureLayer) {
      const latlng = (featureLayer as L.Marker).getLatLng();
      mapRef.current.setView(latlng, 15);
    }

    // Show popup with feature details
    if (feature.properties) {
      const popupContent = createPopupContent(feature.properties, layer.title);
      if ('getBounds' in featureLayer) {
        const bounds = (featureLayer as L.Polygon).getBounds();
        L.popup({ className: 'custom-popup', maxWidth: 350 })
          .setLatLng(bounds.getCenter())
          .setContent(popupContent)
          .openOn(mapRef.current);
      } else if ('getLatLng' in featureLayer) {
        const latlng = (featureLayer as L.Marker).getLatLng();
        L.popup({ className: 'custom-popup', maxWidth: 350 })
          .setLatLng(latlng)
          .setContent(popupContent)
          .openOn(mapRef.current);
      }
    }

    // Close overlapping features panel
    setOverlappingFeatures([]);
    setSelectedFeature({ feature, layer: featureLayer, id: getFeatureId(feature, 0) });
  }, [layer.title, highlightFeature]);

  const handleMapClick = useCallback((e: L.LeafletMouseEvent) => {
    if (!vectorLayerRef.current || !mapRef.current) return;

    const clickedFeatures: OverlappingFeature[] = [];
    
    vectorLayerRef.current.eachLayer((featureLayer: L.Layer) => {
      // Check if the click is within the layer bounds
      if ('getBounds' in featureLayer) {
        const bounds = (featureLayer as L.Polygon).getBounds();
        if (bounds.contains(e.latlng)) {
          // More precise check using point in polygon for polygon features
          const feature = (featureLayer as any).feature as GeoJSON.Feature;
          if (feature) {
            clickedFeatures.push({
              feature,
              layer: featureLayer,
              id: getFeatureId(feature, clickedFeatures.length)
            });
          }
        }
      } else if ('getLatLng' in featureLayer) {
        // For point features, check distance
        const latlng = (featureLayer as L.Marker).getLatLng();
        const distance = e.latlng.distanceTo(latlng);
        if (distance < 50) { // Within 50 meters
          const feature = (featureLayer as any).feature as GeoJSON.Feature;
          if (feature) {
            clickedFeatures.push({
              feature,
              layer: featureLayer,
              id: getFeatureId(feature, clickedFeatures.length)
            });
          }
        }
      }
    });

    if (clickedFeatures.length > 1) {
      // Multiple overlapping features - show selection panel
      setOverlappingFeatures(clickedFeatures);
      setSelectedFeature(null);
      mapRef.current.closePopup();
    } else if (clickedFeatures.length === 1) {
      // Single feature - zoom and highlight directly
      zoomToFeature(clickedFeatures[0].feature, clickedFeatures[0].layer);
    } else {
      // No features - reset
      setOverlappingFeatures([]);
      setSelectedFeature(null);
      if (highlightedLayer && 'setStyle' in highlightedLayer) {
        (highlightedLayer as L.Path).setStyle({
          color: '#0891b2',
          weight: 2,
          opacity: 0.8,
          fillColor: '#0891b2',
          fillOpacity: 0.3
        });
      }
      setHighlightedLayer(null);
    }
  }, [zoomToFeature, highlightedLayer]);

  const addFeaturesToMap = useCallback((features: GeoJSON.Feature[]) => {
    if (!mapRef.current) return;

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: allFeaturesRef.current
    };

    // Remove existing layer
    if (vectorLayerRef.current) {
      vectorLayerRef.current.remove();
    }

    featureLayersMapRef.current.clear();

    // Create new GeoJSON layer
    const geoJsonLayer = L.geoJSON(geojson, {
      style: {
        color: '#0891b2',
        weight: 2,
        opacity: 0.8,
        fillColor: '#0891b2',
        fillOpacity: 0.3
      },
      pointToLayer: (_feature, latlng) => {
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
        featureLayersMapRef.current.set(feature, featureLayer);
      }
    });

    if (showVectorLayer) {
      geoJsonLayer.addTo(mapRef.current);
    }
    vectorLayerRef.current = geoJsonLayer;

    // Fit bounds on first load
    if (features.length === allFeaturesRef.current.length) {
      const bounds = geoJsonLayer.getBounds();
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [20, 20] });
      }
    }
  }, [showVectorLayer]);

  const loadFeatures = useCallback(async (startIndex: number = 0, append: boolean = false) => {
    if (!append) {
      setLoading(true);
      setLoadProgress(10);
      allFeaturesRef.current = [];
    } else {
      setLoadingMore(true);
    }
    setError(null);
    
    try {
      setLoadProgress(30);
      const data = await downloadLayerAsGeoJSON(layer.name, layer.sourceUrl, startIndex, FEATURES_PER_PAGE);
      setLoadProgress(70);
      const geojson = data.geojson;
      
      if (!geojson.features || geojson.features.length === 0) {
        if (!append) {
          setError('Nenhuma feição encontrada para esta camada');
        }
        setHasMore(false);
        setLoading(false);
        setLoadingMore(false);
        setLoadProgress(100);
        return;
      }
      
      // Append features
      allFeaturesRef.current = [...allFeaturesRef.current, ...geojson.features];
      setTotalLoaded(allFeaturesRef.current.length);
      setFeatureCount(allFeaturesRef.current.length);
      setHasMore(data.metadata.hasMore);
      
      setLoadProgress(90);
      addFeaturesToMap(geojson.features);
      setLoadProgress(100);
      
      setLoading(false);
      setLoadingMore(false);
    } catch (err) {
      console.error('Error loading features:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar feições');
      setLoading(false);
      setLoadingMore(false);
      setLoadProgress(100);
      
      // Fallback: show bounding box if available
      if (!append && layer.bbox && mapRef.current) {
        const bounds: L.LatLngBoundsExpression = [
          [layer.bbox.miny, layer.bbox.minx],
          [layer.bbox.maxy, layer.bbox.maxx]
        ];
        mapRef.current.fitBounds(bounds);
        
        L.rectangle(bounds, {
          color: '#dc2626',
          fillColor: '#dc2626',
          fillOpacity: 0.1,
          weight: 2,
          dashArray: '5, 5'
        }).addTo(mapRef.current).bindPopup(`
          <strong>Área aproximada</strong><br>
          <small>Não foi possível carregar as feições</small>
        `);
      }
    }
  }, [layer, addFeaturesToMap]);

  const handleLoadMore = useCallback(() => {
    loadFeatures(totalLoaded, true);
  }, [loadFeatures, totalLoaded]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      attributionControl: false
    });
    mapRef.current = map;

    // Add OpenStreetMap tiles as base layer without attribution
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: ''
    }).addTo(map);

    // Set initial view for Brazil
    map.setView([-14.235, -51.925], 4);

    // Add WMS tile layer for raster visualization — skipped for internal
    // sources (they serve GeoJSON directly, not WMS tiles).
    if (!layer.sourceUrl.startsWith('internal://')) {
      const wmsLayer = L.tileLayer.wms(layer.sourceUrl, {
        layers: layer.name,
        format: 'image/png',
        transparent: true,
        version: '1.1.1',
        attribution: '',
        opacity: 0.7
      }).addTo(map);
      wmsLayerRef.current = wmsLayer;
    }

    // Fit to layer bounds if available
    if (layer.bbox) {
      const bounds: L.LatLngBoundsExpression = [
        [layer.bbox.miny, layer.bbox.minx],
        [layer.bbox.maxy, layer.bbox.maxx]
      ];
      map.fitBounds(bounds, { padding: [20, 20] });
    }

    loadFeatures();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      wmsLayerRef.current = null;
      vectorLayerRef.current = null;
      allFeaturesRef.current = [];
      featureLayersMapRef.current.clear();
    };
  }, [layer]);

  // Add click handler to map
  useEffect(() => {
    if (!mapRef.current) return;
    
    mapRef.current.on('click', handleMapClick);
    
    return () => {
      if (mapRef.current) {
        mapRef.current.off('click', handleMapClick);
      }
    };
  }, [handleMapClick]);

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
      <div className="bg-background rounded-none border-2 border-border w-full max-w-4xl overflow-hidden shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-border bg-card">
          <div className="min-w-0 flex-1 mr-4">
            <h2 className="text-lg font-bold text-foreground truncate flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
              {layer.title}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-muted-foreground font-mono truncate">
                {layer.name}
              </p>
              {!loading && !error && featureCount > 0 && (
                <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 font-medium">
                  {featureCount} feições
                </span>
              )}
              {hasMore && !loading && (
                <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5">
                  +mais disponíveis
                </span>
              )}
            </div>
          </div>
          <Button variant="outline" size="icon" onClick={onClose} className="border-2">
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Map Container */}
        <div className="relative">
          <div ref={mapContainerRef} className="h-[500px] w-full" />
          
          {/* Layer Controls */}
          <div className="absolute top-4 right-4 z-[1000] bg-background border-2 border-border shadow-sm p-2 space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground px-2 pb-1 border-b border-border">
              <Layers className="w-3 h-3" />
              <span>Camadas</span>
            </div>
            <button
              onClick={() => setShowWmsLayer(!showWmsLayer)}
              className={`flex items-center gap-2 w-full px-2 py-1.5 text-sm transition-colors ${
                showWmsLayer ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {showWmsLayer ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              <span>WMS Raster</span>
            </button>
            <button
              onClick={() => setShowVectorLayer(!showVectorLayer)}
              className={`flex items-center gap-2 w-full px-2 py-1.5 text-sm transition-colors ${
                showVectorLayer ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {showVectorLayer ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              <span>Vetorial</span>
            </button>
          </div>

          {/* Overlapping Features Panel */}
          {overlappingFeatures.length > 1 && (
            <div className="absolute top-4 left-4 z-[1000] bg-background border-2 border-border shadow-lg max-w-sm">
              <div className="flex items-center justify-between p-3 border-b border-border">
                <div>
                  <h3 className="font-bold text-sm">Feições sobrepostas ({overlappingFeatures.length} encontradas)</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Clique em "Ver Detalhes" para centralizar no mapa e ver as propriedades de cada feição.
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 flex-shrink-0"
                  onClick={() => setOverlappingFeatures([])}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <ScrollArea className="max-h-[300px]">
                <div className="p-2 space-y-2">
                  {overlappingFeatures.map((item, index) => (
                    <div 
                      key={index}
                      className="border border-border p-3 bg-card hover:bg-muted transition-colors"
                    >
                      <p className="font-mono text-sm font-medium truncate mb-2" title={item.id}>
                        {item.id}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2 h-8"
                        onClick={() => zoomToFeature(item.feature, item.layer)}
                      >
                        <ZoomIn className="w-3 h-3" />
                        Ver Detalhes
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Selected Feature Details Panel */}
          {selectedFeature && selectedFeature.feature.properties && (
            <div className="absolute bottom-4 left-4 z-[1000] bg-background border-2 border-border shadow-lg max-w-sm">
              <div className="flex items-center justify-between p-3 border-b border-border bg-primary text-primary-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span className="font-bold text-sm truncate" title={selectedFeature.id}>
                    {selectedFeature.id}
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 text-primary-foreground hover:bg-primary-foreground/20"
                  onClick={() => {
                    setSelectedFeature(null);
                    if (highlightedLayer && 'setStyle' in highlightedLayer) {
                      (highlightedLayer as L.Path).setStyle({
                        color: '#0891b2',
                        weight: 2,
                        opacity: 0.8,
                        fillColor: '#0891b2',
                        fillOpacity: 0.3
                      });
                    }
                    setHighlightedLayer(null);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <ScrollArea className="max-h-[200px]">
                <div className="divide-y divide-border">
                  {Object.entries(selectedFeature.feature.properties)
                    .filter(([key, value]) => 
                      value !== null && 
                      value !== undefined && 
                      value !== '' && 
                      !key.toLowerCase().includes('geom') &&
                      !key.toLowerCase().includes('geometry')
                    )
                    .slice(0, 15)
                    .map(([key, value], index) => (
                      <div 
                        key={key}
                        className={`flex justify-between gap-4 px-3 py-2 text-xs ${
                          index % 2 === 0 ? 'bg-muted' : 'bg-background'
                        }`}
                      >
                        <span className="font-medium text-muted-foreground whitespace-nowrap">
                          {formatPropertyKey(key)}
                        </span>
                        <span className="text-foreground text-right truncate" title={String(value)}>
                          {formatPropertyValue(value)}
                        </span>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Load More Button */}
          {hasMore && !loading && !loadingMore && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000]">
              <Button 
                onClick={handleLoadMore}
                className="gap-2 border-2 shadow-sm"
                variant="outline"
              >
                <Plus className="w-4 h-4" />
                Carregar mais feições
                <span className="text-xs bg-muted px-2 py-0.5 ml-1">
                  +{FEATURES_PER_PAGE}
                </span>
              </Button>
            </div>
          )}
          
          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 bg-background/90 flex items-center justify-center">
              <div className="text-center space-y-4 p-6 max-w-xs">
                <div className="relative">
                  <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Carregando feições...</p>
                  <Progress value={loadProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {loadProgress < 30 ? 'Conectando ao servidor...' :
                     loadProgress < 70 ? 'Baixando dados...' :
                     loadProgress < 90 ? 'Processando geometrias...' : 'Finalizando...'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Loading More Indicator */}
          {loadingMore && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000]">
              <div className="bg-background border-2 border-border px-4 py-2 flex items-center gap-2 shadow-sm">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm">Carregando mais feições...</span>
              </div>
            </div>
          )}
          
          {/* Error Banner */}
          {error && !loading && (
            <div className="absolute bottom-4 left-4 right-4 bg-destructive/10 border-2 border-destructive p-3 flex items-start gap-2">
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