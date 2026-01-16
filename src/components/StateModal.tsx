import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LayerCard } from "./LayerCard";
import { Layer, UF_NAMES, PlanType } from "@/lib/wms-explorer";

interface StateModalProps {
  uf: string;
  layers: Layer[];
  userPlan?: PlanType;
  onClose: () => void;
  onShowMap: (layer: Layer) => void;
}

export function StateModal({ uf, layers, userPlan = 'gratuito', onClose, onShowMap }: StateModalProps) {
  const stateName = uf === 'OUTROS' ? 'Outros' : UF_NAMES[uf] || uf;

  return (
    <div 
      className="fixed inset-0 z-50 bg-secondary/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-background rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Geodados {stateName}
            </h2>
            <p className="text-muted-foreground">
              {uf} • {layers.length} camadas disponíveis
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          <div className="grid md:grid-cols-2 gap-4">
            {layers.map((layer) => (
              <LayerCard
                key={layer.name}
                name={layer.name}
                title={layer.title}
                abstract={layer.abstract}
                userPlan={userPlan}
                onShowMap={() => onShowMap(layer)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
