import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layer } from "@/lib/wms-explorer";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapModalProps {
  layer: Layer;
  onClose: () => void;
}

export function MapModal({ layer, onClose }: MapModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current);
    mapRef.current = map;

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Set initial view
    if (layer.bbox) {
      const bounds: L.LatLngBoundsExpression = [
        [layer.bbox.miny, layer.bbox.minx],
        [layer.bbox.maxy, layer.bbox.maxx]
      ];
      map.fitBounds(bounds);
      
      // Add bounding box rectangle
      L.rectangle(bounds, {
        color: '#0891b2',
        fillColor: '#0891b2',
        fillOpacity: 0.2,
        weight: 2
      }).addTo(map).bindPopup(`
        <strong>${layer.title}</strong><br>
        <small>${layer.name}</small><br>
        <em>${layer.abstract.substring(0, 150)}...</em>
      `);
    } else {
      map.setView([-14.235, -51.925], 4);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [layer]);

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
            <p className="text-sm text-muted-foreground font-mono truncate">
              {layer.name}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Map */}
        <div ref={mapContainerRef} className="h-[500px] w-full" />
      </div>
    </div>
  );
}
