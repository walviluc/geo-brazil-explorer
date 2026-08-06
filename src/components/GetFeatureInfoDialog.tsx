import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, ExternalLink, Info } from "lucide-react";
import { toast } from "sonner";
import { BoundingBox } from "@/lib/wms-explorer";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  layerName: string;
  layerTitle: string;
  sourceUrl: string;
  bbox: BoundingBox | null;
}

const WIDTH = 101;
const HEIGHT = 101;

export function GetFeatureInfoDialog({
  open, onOpenChange, layerName, layerTitle, sourceUrl, bbox,
}: Props) {
  const [copied, setCopied] = useState(false);
  const isInternal = sourceUrl.startsWith("internal://");

  // Small bbox around the center of the layer extent, so the example returns
  // a plausible feature instead of the whole country.
  const b = bbox ?? { minx: -74, miny: -34, maxx: -34, maxy: 6 };
  const cx = (b.minx + b.maxx) / 2;
  const cy = (b.miny + b.maxy) / 2;
  const d = Math.max((b.maxx - b.minx) / 100, 0.001);
  const queryBbox = [cy - d, cx - d, cy + d, cx + d].map((n) => n.toFixed(6)).join(",");

  const params = new URLSearchParams({
    service: "WMS",
    version: "1.3.0",
    request: "GetFeatureInfo",
    layers: layerName,
    query_layers: layerName,
    crs: "EPSG:4326",
    bbox: queryBbox,
    width: String(WIDTH),
    height: String(HEIGHT),
    i: String(Math.floor(WIDTH / 2)),
    j: String(Math.floor(HEIGHT / 2)),
    info_format: "application/json",
    feature_count: "5",
  });

  const url = `${sourceUrl}?${params.toString()}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast("URL copiada", { description: "Consulta GetFeatureInfo na área de transferência." });
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl z-[1300]">
        <DialogHeader>
          <DialogTitle className="text-left">Exemplo de consulta GetFeatureInfo</DialogTitle>
          <DialogDescription className="text-left">
            {layerTitle}
          </DialogDescription>
        </DialogHeader>

        {isInternal ? (
          <div className="flex gap-3 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>
              Esta camada pertence ao Catálogo Premium interno e é distribuída como arquivo
              vetorial (GeoJSON/KML/Shapefile), sem endpoint WMS público. Use o download direto
              para consultar os atributos.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                Requisição de exemplo
              </p>
              <pre className="rounded-lg bg-muted p-3 text-xs font-mono whitespace-pre-wrap break-all text-foreground max-h-56 overflow-y-auto">
                {url}
              </pre>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              {[
                ["query_layers", layerName],
                ["crs", "EPSG:4326"],
                ["bbox", queryBbox],
                ["i / j (pixel)", `${Math.floor(WIDTH / 2)} / ${Math.floor(HEIGHT / 2)}`],
                ["info_format", "application/json"],
                ["feature_count", "5"],
              ].map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-mono break-all text-foreground">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" className="flex-1" onClick={handleCopy}>
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? "Copiado" : "Copiar URL"}
              </Button>
              <Button asChild className="flex-1">
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir consulta
                </a>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Alguns servidores só aceitam <span className="font-mono">info_format=text/html</span> ou{" "}
              <span className="font-mono">text/plain</span>. Ajuste o parâmetro caso a resposta venha vazia.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
