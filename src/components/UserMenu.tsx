import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useUserRole } from '@/hooks/useUserRole';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreditCard, Crown, LogOut, Shield, User, LayoutDashboard } from 'lucide-react';

const planLabels: Record<string, string> = {
  gratuito: 'Gratuito',
  profissional: 'Profissional',
  completo: 'Completo',
};

interface UserMenuProps {
  showPlanBadge?: boolean;
  showDashboardLink?: boolean;
}

export function UserMenu({ showPlanBadge = true, showDashboardLink = false }: UserMenuProps) {
  const { user, signOut } = useAuth();
  const { subscription } = useSubscription();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();

  if (!user) return null;

  const currentPlan = subscription?.plan || 'gratuito';
  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário';
  const initial = (user.user_metadata?.full_name || user.email || '?').charAt(0).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="flex items-center gap-3">
      {showPlanBadge && (
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/15 text-primary text-xs font-semibold">
          <Crown className="w-3.5 h-3.5" />
          {planLabels[currentPlan]}
        </div>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 text-secondary-foreground hover:bg-secondary-foreground/10 pr-3 pl-1.5"
          >
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-primary/20 text-primary text-sm font-semibold">
                {initial}
              </AvatarFallback>
            </Avatar>
            <span className="hidden md:inline max-w-[160px] truncate text-sm font-medium">
              {displayName}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60 bg-popover">
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="font-semibold truncate">{displayName}</span>
            <span className="text-xs font-normal text-muted-foreground truncate">
              {user.email}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {showDashboardLink && (
            <DropdownMenuItem onClick={() => navigate('/dashboard')}>
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Dashboard
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => navigate('/profile')}>
            <User className="w-4 h-4 mr-2" />
            Meu perfil
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/profile')}>
            <User className="w-4 h-4 mr-2" />
            Minha conta
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/subscription')}>
            <CreditCard className="w-4 h-4 mr-2" />
            Gerenciar plano
          </DropdownMenuItem>
          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/admin/data-sources')}>
                <Shield className="w-4 h-4 mr-2 text-primary" />
                Painel ADM
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/admin/public-sources')}>
                <Shield className="w-4 h-4 mr-2 text-primary" />
                Fontes públicas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/admin/plans')}>
                <Crown className="w-4 h-4 mr-2 text-primary" />
                Gerenciar planos
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}