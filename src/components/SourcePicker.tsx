import { useMemo, useState } from "react";
import { Check, Crown, Search, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
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

interface SourcePickerProps {
  value: string;
  onChange: (id: string) => void;
  sources?: DataSource[];
}

export function SourcePicker({ value, onChange, sources = DATA_SOURCES }: SourcePickerProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"todas" | DataSource["category"]>("todas");

  const categories = useMemo(() => {
    const set = new Set(sources.map((s) => s.category));
    return [...set];
  }, [sources]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sources.filter((s) => {
      if (category !== "todas" && s.category !== category) return false;
      if (!q) return true;
      return `${s.label} ${s.description}`.toLowerCase().includes(q);
    });
  }, [query, category, sources]);

  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <label className="flex items-center gap-2 text-sm font-medium text-foreground shrink-0">
          <Globe className="w-4 h-4" />
          Fonte de dados
        </label>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar fonte (IBGE, INPE, ambiente...)"
            className="pl-9 h-10"
          />
        </div>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(["todas", ...categories] as const).map((cat) => (
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
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((src) => {
          const selected = src.id === value;
          return (
            <button
              key={src.id}
              type="button"
              onClick={() => onChange(src.id)}
              aria-pressed={selected}
              className={cn(
                "relative text-left rounded-lg border p-3 transition-all hover:border-primary/60 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected
                  ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30"
                  : "border-border bg-card",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-sm text-foreground leading-tight">
                  {src.label}
                </span>
                {selected && (
                  <span className="shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Check className="w-3 h-3" />
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{src.description}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-muted text-muted-foreground">
                  {CATEGORY_LABELS[src.category]}
                </span>
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
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">
          Nenhuma fonte encontrada para "{query}".
        </p>
      )}
    </div>
  );
}