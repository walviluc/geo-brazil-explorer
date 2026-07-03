import { useState, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Download, Map, Loader2, Lock, CheckCircle, Crown, LogIn } from "lucide-react";
import {
  downloadLayerFile,
  isPremiumSource,
  PlanType,
  DownloadFormat,
  PremiumFormatError,
} from "@/lib/wms-explorer";

interface LayerCardProps {
  name: string;
  title: string;
  abstract: string;
  sourceUrl: string;
  userPlan: PlanType;
  /** Per-format premium flags (internal catalog only). */
  premiumFormats?: { geojson: boolean; kml: boolean; shapefile: boolean };
  /** Stored file format on the server (only for internal). */
  storedFormat?: "geojson" | "shapefile";
  onShowMap: () => void;
}

export const LayerCard = forwardRef<HTMLDivElement, LayerCardProps>(
  function LayerCard(
    { name, title, abstract, sourceUrl, userPlan, premiumFormats, storedFormat, onShowMap },
    ref,
  ) {
    const navigate = useNavigate();
    const [downloading, setDownloading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [format, setFormat] = useState<DownloadFormat>("geojson");
    
    const isPremium = isPremiumSource(sourceUrl);
    const isFree = !isPremium;
    const isLoggedIn = userPlan !== null;
    const hasPlanAccess = userPlan === 'profissional' || userPlan === 'completo';

    // Whether the currently-selected format is locked behind a paid plan.
    // External (public) sources are always free. Internal sources check the
    // per-format flag from the admin panel.
    const currentFormatIsPremium = isPremium
      ? !!premiumFormats?.[format]
      : false;
    const canDownloadCurrent = !currentFormatIsPremium || hasPlanAccess;

    // "Ver Mapa" still gates on any-format access to the source.
    const anyPremium = isPremium && !!(
      premiumFormats?.geojson || premiumFormats?.kml || premiumFormats?.shapefile
    );
    const hasMapAccess = !anyPremium || hasPlanAccess;

    // Shapefile is only available when the internal file is stored as .zip.
    const shapefileAvailable = !isPremium || storedFormat === "shapefile";

    const handleDownload = async () => {
      if (!isLoggedIn) {
        navigate('/auth');
        return;
      }
      if (!canDownloadCurrent) {
        toast('Formato premium', {
          description: `O formato ${format.toUpperCase()} desta camada faz parte do Catálogo Premium. Faça upgrade para o plano Profissional ou Completo.`,
          action: { label: 'Ver Planos', onClick: () => navigate('/subscription') },
        });
        return;
      }
      if (format === "shapefile" && !shapefileAvailable) {
        toast('Shapefile indisponível', {
          description: 'Esta camada não foi publicada em formato Shapefile.',
        });
        return;
      }

      setDownloading(true);
      setStatus('idle');

      try {
        const { blob, filename } = await downloadLayerFile(name, sourceUrl, format);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setStatus('success');
      } catch (error) {
        if (error instanceof PremiumFormatError) {
          toast('Formato premium', {
            description: error.message,
            action: { label: 'Ver Planos', onClick: () => navigate('/subscription') },
          });
          setDownloading(false);
          return;
        }
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Erro desconhecido');
      } finally {
        setDownloading(false);
        setTimeout(() => setStatus('idle'), 5000);
      }
    };

    const handleMapClick = () => {
      if (!isLoggedIn) {
        navigate('/auth');
        return;
      }
      if (!hasMapAccess) {
        toast('Acesso ao Catálogo Premium', {
          description: 'Esta camada faz parte do Catálogo Premium. Faça upgrade para o plano Profissional ou Completo para visualizar.',
          action: {
            label: 'Ver Planos',
            onClick: () => navigate('/subscription'),
          },
        });
        return;
      }
      onShowMap();
    };

    const getButtonLabel = () => {
      if (!isLoggedIn) return 'Fazer Login';
      if (!canDownloadCurrent) return 'Upgrade';
      const label = format === 'geojson' ? 'GeoJSON' : format === 'kml' ? 'KML' : 'SHP';
      return `Baixar ${label}`;
    };

    const getButtonIcon = () => {
      if (downloading) return <Loader2 className="w-4 h-4 mr-2 animate-spin" />;
      if (!isLoggedIn) return <LogIn className="w-4 h-4 mr-2" />;
      if (!canDownloadCurrent) return <Lock className="w-4 h-4 mr-2" />;
      return <Download className="w-4 h-4 mr-2" />;
    };

    const getBadge = () => {
      if (isFree) {
        return (
          <span className="flex-shrink-0 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Grátis
          </span>
        );
      }
      if (hasPlanAccess || !anyPremium) {
        return (
          <span className="flex-shrink-0 px-2 py-1 rounded-full bg-accent/10 text-accent-foreground text-xs font-medium flex items-center gap-1">
            <Crown className="w-3 h-3" />
            {anyPremium ? 'Incluso' : 'Grátis'}
          </span>
        );
      }
      return (
        <span className="flex-shrink-0 px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium flex items-center gap-1">
          <Lock className="w-3 h-3" />
          Premium
        </span>
      );
    };

    const formatOptions: Array<{ value: DownloadFormat; label: string; premium: boolean; disabled?: boolean }> = [
      { value: 'geojson', label: 'GeoJSON (.geojson)', premium: !!(isPremium && premiumFormats?.geojson) },
      { value: 'kml', label: 'KML (Google Earth)', premium: !!(isPremium && premiumFormats?.kml) },
      { value: 'shapefile', label: 'Shapefile (.zip)', premium: !!(isPremium && premiumFormats?.shapefile), disabled: !shapefileAvailable },
    ];

    return (
      <div ref={ref} className="p-5 rounded-xl bg-card border border-border hover:border-primary/30 transition-all">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-foreground truncate">{title}</h4>
            <p className="text-xs font-mono text-muted-foreground truncate">{name}</p>
          </div>
          {getBadge()}
        </div>
        
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {abstract}
        </p>

        <div className="mb-3">
          <Select value={format} onValueChange={(v) => setFormat(v as DownloadFormat)}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {formatOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
                  <span className="flex items-center gap-2">
                    {opt.label}
                    {opt.premium && <Lock className="w-3 h-3 text-muted-foreground" />}
                    {opt.disabled && <span className="text-xs text-muted-foreground">(indisponível)</span>}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button 
            variant={canDownloadCurrent ? "default" : "outline"}
            size="sm" 
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1"
          >
            {getButtonIcon()}
            {getButtonLabel()}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleMapClick} 
            className="flex-1"
          >
            {!isLoggedIn ? (
              <LogIn className="w-4 h-4 mr-2" />
            ) : !hasMapAccess ? (
              <Lock className="w-4 h-4 mr-2" />
            ) : (
              <Map className="w-4 h-4 mr-2" />
            )}
            {!isLoggedIn ? 'Login p/ Ver' : !hasMapAccess ? 'Upgrade p/ Ver' : 'Ver Mapa'}
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
);
