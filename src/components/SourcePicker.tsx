import { useMemo, useState } from "react";
import { Check, Crown, Search, Globe, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DATA_SOURCES, DataSource } from "@/lib/data-sources";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS: Record<DataSource["category"], string> = {
  geral: "Geral",
  ambiente: "Ambiente",
  territorio: "Território",
  infraestrutura: "Infraestrutura",
  recursos: "Recursos",
  social: "Social",
};

const CATEGORY_ORDER: DataSource["category"][] = [
  "geral",
  "territorio",
  "ambiente",
  "recursos",
  "infraestrutura",
  "social",
];

interface SourcePickerProps {
  value: string;
  onChange: (id: string) => void;
  sources?: DataSource[];
}

export function SourcePicker({ value, onChange, sources = DATA_SOURCES }: SourcePickerProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"todas" | DataSource["category"]>("todas");
  const [open, setOpen] = useState(false);

  const selected = sources.find((s) => s.id === value);

  const categories = useMemo(() => {
    const present = new Set(sources.map((s) => s.category));
    return CATEGORY_ORDER.filter((c) => present.has(c));
  }, [sources]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sources.filter((s) => {
      if (category !== "todas" && s.category !== category) return false;
      if (!q) return true;
      return `${s.label} ${s.description}`.toLowerCase().includes(q);
    });
  }, [query, category, sources]);

  const grouped = useMemo(() => {
    return CATEGORY_ORDER.map((cat) => ({
      cat,
      items: filtered.filter((s) => s.category === cat),
    })).filter((g) => g.items.length > 0);
  }, [filtered]);

  const renderCard = (src: DataSource) => {
    const isSelected = src.id === value;
    return (
      <button
        key={src.id}
        type="button"
        onClick={() => {
          onChange(src.id);
          setOpen(false);
        }}
        aria-pressed={isSelected}
        className={cn(
          "relative text-left rounded-lg border p-3 transition-all hover:border-primary/60 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isSelected ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30" : "border-border bg-card",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="font-medium text-sm text-foreground leading-tight">{src.label}</span>
          {isSelected && (
            <span className="shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <Check className="w-3 h-3" />
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{src.description}</p>
        <div className="flex items-center gap-2 mt-2">
          {src.internal ? (
            <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-primary/10 text-primary flex items-center gap-1">
              <Crown className="w-3 h-3" /> Premium
            </span>
          ) : (
            <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              Grátis
            </span>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="mb-8 rounded-xl border border-border bg-card/50 p-4">
      {/* Selected source summary */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Globe className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Fonte de dados</p>
            <p className="font-semibold text-foreground truncate">
              {selected?.label ?? "Selecione uma fonte"}
            </p>
            {selected && (
              <p className="text-xs text-muted-foreground truncate">{selected.description}</p>
            )}
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen((v) => !v)}
          className="shrink-0"
          aria-expanded={open}
        >
          {open ? <ChevronUp className="w-4 h-4 mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}
          {open ? "Fechar lista" : "Trocar fonte"}
        </Button>
      </div>

      {open && (
        <div className="mt-4 border-t border-border pt-4">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar fonte (IBGE, INPE, ambiente...)"
              className="pl-9 h-10"
            />
          </div>

          {/* Category chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            {(["todas", ...categories] as const).map((cat) => {
              const count =
                cat === "todas" ? sources.length : sources.filter((s) => s.category === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat as typeof category)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                    category === cat
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground",
                  )}
                >
                  {cat === "todas" ? "Todas" : CATEGORY_LABELS[cat as DataSource["category"]]}
                  <span className="ml-1.5 opacity-70">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Grouped cards */}
          <div className="space-y-5 max-h-[420px] overflow-y-auto pr-1">
            {grouped.map((group) => (
              <div key={group.cat}>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  {CATEGORY_LABELS[group.cat]}
                  <span className="ml-2 font-normal opacity-70">{group.items.length}</span>
                </h4>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {group.items.map(renderCard)}
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhuma fonte encontrada para "{query}".
            </p>
          )}
        </div>
      )}
    </div>
  );
}
