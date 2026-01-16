import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Map, Loader2, Lock, CheckCircle } from "lucide-react";
import { downloadLayerAsGeoJSON, isLayerFree } from "@/lib/wms-explorer";

interface LayerCardProps {
  name: string;
  title: string;
  abstract: string;
  onShowMap: () => void;
}

export function LayerCard({ name, title, abstract, onShowMap }: LayerCardProps) {
  const [downloading, setDownloading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const isFree = isLayerFree(name);

  const handleDownload = async () => {
    if (!isFree) return;
    
    setDownloading(true);
    setStatus('idle');
    
    try {
      const data = await downloadLayerAsGeoJSON(name);
      
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setStatus('success');
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setDownloading(false);
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  return (
    <div className="p-5 rounded-xl bg-card border border-border hover:border-primary/30 transition-all">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground truncate">{title}</h4>
          <p className="text-xs font-mono text-muted-foreground truncate">{name}</p>
        </div>
        {isFree ? (
          <span className="flex-shrink-0 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Grátis
          </span>
        ) : (
          <span className="flex-shrink-0 px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Premium
          </span>
        )}
      </div>
      
      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
        {abstract}
      </p>
      
      <div className="flex gap-2">
        <Button 
          variant={isFree ? "default" : "outline"} 
          size="sm" 
          onClick={handleDownload}
          disabled={downloading || !isFree}
          className="flex-1"
        >
          {downloading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          {isFree ? 'Baixar JSON' : 'Premium'}
        </Button>
        <Button variant="outline" size="sm" onClick={onShowMap} className="flex-1">
          <Map className="w-4 h-4 mr-2" />
          Ver Mapa
        </Button>
      </div>
      
      {status === 'success' && (
        <p className="mt-3 text-sm text-primary flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Download concluído!
        </p>
      )}
      
      {status === 'error' && (
        <p className="mt-3 text-sm text-destructive">
          ❌ {errorMessage}
        </p>
      )}
    </div>
  );
}
