import { X, ExternalLink, Lock, CheckCircle, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { INDEGeoService, isServiceFree, canAccessService, INSTITUTIONS, INDE_THEMES, PlanType } from "@/lib/inde-api";
import { useNavigate } from "react-router-dom";

interface ServiceModalProps {
  groupName: string;
  services: INDEGeoService[];
  userPlan: PlanType;
  groupBy: 'theme' | 'institution';
  onClose: () => void;
}

export function ServiceModal({ groupName, services, userPlan, groupBy, onClose }: ServiceModalProps) {
  const navigate = useNavigate();
  const fullName = groupBy === 'institution' ? INSTITUTIONS[groupName] || groupName : INDE_THEMES[groupName] || groupName;

  const handleServiceClick = (service: INDEGeoService) => {
    const hasAccess = canAccessService(service.instituicao, userPlan);
    if (!hasAccess) {
      navigate('/subscription');
      return;
    }
    window.open(service.url, '_blank');
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-secondary/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-background rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{groupName}</h2>
            <p className="text-muted-foreground">{fullName} • {services.length} serviços</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          <div className="grid gap-4">
            {services.map((service) => {
              const isFree = isServiceFree(service.instituicao);
              const hasAccess = canAccessService(service.instituicao, userPlan);
              
              return (
                <div 
                  key={service.id}
                  className="p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground">{service.nome}</h4>
                      <p className="text-xs text-muted-foreground">{service.tipo} • {service.instituicao}</p>
                    </div>
                    {isFree ? (
                      <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Grátis
                      </span>
                    ) : hasAccess ? (
                      <span className="px-2 py-1 rounded-full bg-accent/10 text-accent-foreground text-xs font-medium flex items-center gap-1">
                        <Crown className="w-3 h-3" />
                        Incluso
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Premium
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {service.descricao || 'Sem descrição disponível'}
                  </p>
                  
                  <Button 
                    variant={hasAccess ? "default" : "outline"} 
                    size="sm"
                    onClick={() => handleServiceClick(service)}
                    className="w-full"
                  >
                    {hasAccess ? (
                      <>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Acessar Serviço
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        Fazer Upgrade
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
