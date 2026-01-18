import { Building2, FolderOpen, Lock, CheckCircle, Crown } from "lucide-react";

interface ServiceCardProps {
  name: string;
  fullName: string;
  serviceCount: number;
  isFree: boolean;
  hasAccess: boolean;
  groupBy: 'theme' | 'institution';
  onClick: () => void;
}

export function ServiceCard({ name, fullName, serviceCount, isFree, hasAccess, groupBy, onClick }: ServiceCardProps) {
  const getBadge = () => {
    if (isFree) {
      return (
        <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Grátis
        </span>
      );
    }
    if (hasAccess) {
      return (
        <span className="px-2 py-1 rounded-full bg-accent/10 text-accent-foreground text-xs font-medium flex items-center gap-1">
          <Crown className="w-3 h-3" />
          Incluso
        </span>
      );
    }
    return (
      <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium flex items-center gap-1">
        <Lock className="w-3 h-3" />
        Premium
      </span>
    );
  };

  return (
    <button
      onClick={onClick}
      className="p-4 rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all text-left group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
          {groupBy === 'institution' ? (
            <Building2 className="w-5 h-5 text-primary" />
          ) : (
            <FolderOpen className="w-5 h-5 text-primary" />
          )}
        </div>
        {groupBy === 'institution' && getBadge()}
      </div>
      
      <h3 className="font-semibold text-foreground mb-1 truncate">{name}</h3>
      <p className="text-xs text-muted-foreground truncate mb-2">{fullName}</p>
      <p className="text-sm text-primary font-medium">
        {serviceCount} {serviceCount === 1 ? 'serviço' : 'serviços'}
      </p>
    </button>
  );
}
