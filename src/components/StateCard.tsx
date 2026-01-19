import { forwardRef } from "react";
import { MapPin, Layers } from "lucide-react";
import { UF_NAMES } from "@/lib/wms-explorer";

interface StateCardProps {
  uf: string;
  layerCount: number;
  onClick: () => void;
}

export const StateCard = forwardRef<HTMLButtonElement, StateCardProps>(
  function StateCard({ uf, layerCount, onClick }, ref) {
    const stateName = uf === 'OUTROS' ? 'Outros' : UF_NAMES[uf] || uf;
    
    return (
      <button
        ref={ref}
        onClick={onClick}
        className="group relative p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg text-left w-full"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <MapPin className="w-6 h-6 text-primary" />
          </div>
          <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm font-mono">
            {uf}
          </span>
        </div>
        
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {stateName}
        </h3>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Layers className="w-4 h-4" />
          <span>{layerCount} camadas disponíveis</span>
        </div>
        
        <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-primary/30 transition-colors" />
      </button>
    );
  }
);

StateCard.displayName = "StateCard";
