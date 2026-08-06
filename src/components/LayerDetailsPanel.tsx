import { useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ExternalLink, Map, MapPin, Layers, Frame, Database, Code2 } from "lucide-react";
import { DATA_SOURCES } from "@/lib/data-sources";
import { BoundingBox, UF_NAMES, getUF } from "@/lib/wms-explorer";
import { GetFeatureInfoDialog } from "./GetFeatureInfoDialog";

const CATEGORY_LABELS: Record<string, string> = {
  geral: "Geral",
  ambiente: "Meio ambiente",
  territorio: "Território e limites",
  infraestrutura: "Infraestrutura",
  recursos: "Recursos naturais",
  social: "Social e demografia",
};

export interface LayerDetails {
  name: string;
  title: string;
  abstract: string;
  sourceUrl: string;
  bbox: BoundingBox | null;
  uf?: string | null;
}

interface LayerDetailsPanelProps {
  layer: LayerDetails | null;
  onClose: () => void;
  onShowMap?: () => void;
}

function fmt(n: number) {
  return n.toFixed(4);
}

export function LayerDetailsPanel({ layer, onClose, onShowMap }: LayerDetailsPanelProps) {
  const [showQuery, setShowQuery] = useState(false);

  if (!layer) return null;

  const source = DATA_SOURCES.find((s) => s.url === layer.sourceUrl)
    ?? DATA_SOURCES.find((s) => layer.sourceUrl.startsWith(s.url));
  const isInternal = layer.sourceUrl.startsWith("internal://");
  const uf = layer.uf || getUF(`${layer.name} ${layer.title}`);
  const workspace = layer.name.includes(":") ? layer.name.split(":")[0] : null;
  const theme = source ? CATEGORY_LABELS[source.category] ?? source.category : "Não informado";
  const wmsLink = isInternal
    ? null
    : `${layer.sourceUrl}?service=WMS&version=1.3.0&request=GetCapabilities`;

  const rows: Array<{ icon: JSX.Element; label: string; value: React.ReactNode }> = [
    {
      icon: <Layers className="w-4 h-4" />,
      label: "Nome técnico",
      value: <span className="font-mono text-xs break-all">{layer.name}</span>,
    },
    {
      icon: <MapPin className="w-4 h-4" />,
      label: "UF",
      value: uf ? `${uf} — ${UF_NAMES[uf] ?? "—"}` : "Cobertura nacional / não informada",
    },
    {
      icon: <Database className="w-4 h-4" />,
      label: "Tema",
      value: workspace ? `${theme} · ${workspace}` : theme,
    },
    {
      icon: <Frame className="w-4 h-4" />,
      label: "Bounding box (EPSG:4326)",
      value: layer.bbox ? (
        <span className="font-mono text-xs block leading-relaxed">
          Oeste {fmt(layer.bbox.minx)} · Sul {fmt(layer.bbox.miny)}
          <br />
          Leste {fmt(layer.bbox.maxx)} · Norte {fmt(layer.bbox.maxy)}
        </span>
      ) : (
        "Não informado pelo servidor"
      ),
    },
  ];

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto z-[1200]">
        <SheetHeader>
          <SheetTitle className="text-left">{layer.title}</SheetTitle>
          <SheetDescription className="text-left">
            {layer.abstract || "Sem descrição disponível."}
          </SheetDescription>
        </SheetHeader>

        <dl className="mt-6 space-y-4">
          {rows.map((r) => (
            <div key={r.label} className="border-b border-border pb-3 last:border-0">
              <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                {r.icon}
                {r.label}
              </dt>
              <dd className="text-sm text-foreground">{r.value}</dd>
            </div>
          ))}

          <div className="pb-1">
            <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
              <ExternalLink className="w-4 h-4" />
              Origem
            </dt>
            <dd className="text-sm">
              {wmsLink ? (
                <>
                  <p className="text-muted-foreground mb-1">{source?.label ?? "Serviço WMS externo"}</p>
                  <a
                    href={wmsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline break-all text-xs"
                  >
                    {wmsLink}
                  </a>
                </>
              ) : (
                <span className="text-muted-foreground">
                  Catálogo Premium interno (arquivo vetorial hospedado no portal).
                </span>
              )}
            </dd>
          </div>
        </dl>

        {onShowMap && (
          <Button className="w-full mt-6" onClick={onShowMap}>
            <Map className="w-4 h-4 mr-2" />
            Ver no mapa
          </Button>
        )}
      </SheetContent>
    </Sheet>
  );
}