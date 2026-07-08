import { useEffect, useState } from "react";
import { Plus, Trash2, Eye, EyeOff, Folder, X, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";

export interface CustomWmsSource {
  id: string;
  title: string;
  url: string;
  layerName: string;
  visible: boolean;
  opacity: number;
}

interface WmsManagerProps {
  sources: CustomWmsSource[];
  onChange: (sources: CustomWmsSource[]) => void;
  onClose: () => void;
}

interface DiscoveredLayer {
  name: string;
  title: string;
  abstract: string;
}

const STORAGE_KEY = "geodata:custom-wms-sources";

export function loadStoredWmsSources(): CustomWmsSource[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredWmsSources(sources: CustomWmsSource[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sources));
  } catch {
    // ignore quota errors
  }
}

function newId() {
  return `wms-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function WmsManager({ sources, onChange, onClose }: WmsManagerProps) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [layerName, setLayerName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [discovered, setDiscovered] = useState<DiscoveredLayer[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    saveStoredWmsSources(sources);
  }, [sources]);

  const update = (id: string, patch: Partial<CustomWmsSource>) => {
    onChange(sources.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const remove = (id: string) => {
    onChange(sources.filter((s) => s.id !== id));
  };

  const addSource = (opts?: { title?: string; layerName?: string }) => {
    setError(null);
    const finalTitle = (opts?.title ?? title).trim();
    const finalLayer = (opts?.layerName ?? layerName).trim();
    const finalUrl = url.trim();
    if (!finalUrl || !finalLayer) {
      setError("Informe a URL do serviço WMS e o nome da camada.");
      return;
    }
    try {
      // Validate URL
      new URL(finalUrl);
    } catch {
      setError("URL inválida.");
      return;
    }
    const source: CustomWmsSource = {
      id: newId(),
      title: finalTitle || finalLayer,
      url: finalUrl,
      layerName: finalLayer,
      visible: true,
      opacity: 0.7,
    };
    onChange([...sources, source]);
    setTitle("");
    setLayerName("");
  };

  const discoverLayers = async () => {
    setError(null);
    setDiscovered([]);
    const finalUrl = url.trim();
    if (!finalUrl) {
      setError("Informe a URL do serviço WMS para pesquisar camadas.");
      return;
    }
    try {
      new URL(finalUrl);
    } catch {
      setError("URL inválida.");
      return;
    }
    setDiscovering(true);
    try {
      const capUrl = `${finalUrl}${finalUrl.includes("?") ? "&" : "?"}service=WMS&version=1.3.0&request=GetCapabilities`;
      const proxies = [
        (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
        (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
      ];
      let text: string | null = null;
      for (const p of proxies) {
        try {
          const r = await fetch(p(capUrl), { headers: { Accept: "application/xml, text/xml, */*" } });
          if (r.ok) {
            text = await r.text();
            break;
          }
        } catch {
          continue;
        }
      }
      if (!text) throw new Error("Não foi possível acessar o servidor.");
      const doc = new DOMParser().parseFromString(text, "text/xml");
      if (doc.querySelector("parsererror")) throw new Error("Resposta inválida do servidor.");
      const layers: DiscoveredLayer[] = [];
      doc.querySelectorAll('Layer[queryable="1"], Layer').forEach((el) => {
        const name = el.querySelector(":scope > Name")?.textContent?.trim();
        if (!name) return;
        const t = el.querySelector(":scope > Title")?.textContent?.trim() || name;
        const a = el.querySelector(":scope > Abstract")?.textContent?.trim() || "";
        if (!layers.some((l) => l.name === name)) layers.push({ name, title: t, abstract: a });
      });
      if (layers.length === 0) throw new Error("Nenhuma camada publicada encontrada.");
      setDiscovered(layers);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao pesquisar camadas.");
    } finally {
      setDiscovering(false);
    }
  };

  const filteredDiscovered = discovered.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return l.name.toLowerCase().includes(q) || l.title.toLowerCase().includes(q);
  });

  return (
    <div className="absolute inset-0 z-[1100] bg-background/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground border-b-2 border-border">
        <div className="flex items-center gap-2">
          <Folder className="w-5 h-5" />
          <h3 className="font-bold text-base">Catálogo WMS</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Add form */}
          <div className="border-2 border-border p-3 space-y-2 bg-card">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Adicionar serviço WMS</p>
            <div>
              <label className="text-xs font-medium block mb-1">URL do serviço</label>
              <Input
                placeholder="https://exemplo.gov.br/geoserver/ows"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium block mb-1">Nome da camada</label>
                <Input
                  placeholder="workspace:layer"
                  value={layerName}
                  onChange={(e) => setLayerName(e.target.value)}
                  className="h-9 text-sm font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Título (opcional)</label>
                <Input
                  placeholder="Meu overlay"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={() => addSource()} className="gap-1 flex-1">
                <Plus className="w-4 h-4" /> Adicionar
              </Button>
              <Button size="sm" variant="outline" onClick={discoverLayers} disabled={discovering} className="gap-1">
                {discovering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Pesquisar camadas
              </Button>
            </div>
          </div>

          {/* Discovered layers */}
          {discovered.length > 0 && (
            <div className="border-2 border-border bg-card">
              <div className="p-2 border-b border-border">
                <Input
                  placeholder="texto para pesquisa..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {filteredDiscovered.length} de {discovered.length} camadas
                </p>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-border">
                {filteredDiscovered.slice(0, 50).map((l) => (
                  <div key={l.name} className="p-2 flex items-start gap-2 hover:bg-muted">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{l.title}</p>
                      <p className="text-xs font-mono text-muted-foreground truncate">{l.name}</p>
                    </div>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7 flex-shrink-0"
                      title="Adicionar ao mapa"
                      onClick={() => addSource({ title: l.title, layerName: l.name })}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active sources */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Overlays ativos ({sources.length})
            </p>
            {sources.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Nenhum overlay adicionado ainda.</p>
            ) : (
              <div className="space-y-2">
                {sources.map((s) => (
                  <div key={s.id} className="border-2 border-border p-2 bg-card space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{s.title}</p>
                        <p className="text-xs font-mono text-muted-foreground truncate" title={s.layerName}>
                          {s.layerName}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate" title={s.url}>{s.url}</p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => update(s.id, { visible: !s.visible })}
                          title={s.visible ? "Ocultar" : "Mostrar"}
                        >
                          {s.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          onClick={() => remove(s.id)}
                          title="Remover"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-16">Opacidade</span>
                      <Slider
                        value={[Math.round(s.opacity * 100)]}
                        onValueChange={(v) => update(s.id, { opacity: (v[0] ?? 70) / 100 })}
                        min={0}
                        max={100}
                        step={5}
                        className="flex-1"
                      />
                      <span className="text-[10px] text-muted-foreground w-8 text-right">
                        {Math.round(s.opacity * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}