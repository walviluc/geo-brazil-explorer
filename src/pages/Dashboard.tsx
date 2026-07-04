import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MapPin, LogOut, User, Crown, CreditCard } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { DashboardExplorer } from '@/components/DashboardExplorer';
import { useUserRole } from '@/hooks/useUserRole';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Shield } from 'lucide-react';

const planLabels: Record<string, { label: string; color: string; icon: typeof Crown }> = {
  gratuito: { label: 'Plano Gratuito', color: 'bg-muted text-muted-foreground', icon: User },
  profissional: { label: 'Plano Profissional', color: 'bg-primary/20 text-primary', icon: Crown },
  completo: { label: 'Plano Completo', color: 'bg-accent/20 text-accent-foreground', icon: Crown }
};

export default function Dashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { subscription, loading: subLoading } = useSubscription();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!user) return null;

  const currentPlan = subscription?.plan || 'gratuito';
  const planInfo = planLabels[currentPlan];
  const PlanIcon = planInfo.icon;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-secondary/95 backdrop-blur-sm border-b border-secondary-foreground/10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <a href="/" className="flex items-center gap-2">
              <MapPin className="w-6 h-6 text-primary" />
              <span className="text-lg font-bold text-secondary-foreground">GeoData Brasil</span>
            </a>
            
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${planInfo.color}`}>
                <PlanIcon className="w-4 h-4" />
                {planInfo.label}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2 text-secondary-foreground hover:bg-secondary-foreground/10">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-primary/20 text-primary text-sm font-medium">
                        {(user.user_metadata?.full_name || user.email || '?').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:inline max-w-[160px] truncate">
                      {user.user_metadata?.full_name || user.email?.split('@')[0]}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-popover">
                  <DropdownMenuLabel className="truncate">
                    {user.email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
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
                    <DropdownMenuItem onClick={() => navigate('/admin/data-sources')}>
                      <Shield className="w-4 h-4 mr-2" />
                      Painel ADM
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>
      
      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Olá, {user.user_metadata?.full_name || user.email?.split('@')[0]}!
          </h1>
          <p className="text-muted-foreground">
            Explore os dados geoespaciais disponíveis no seu plano.
          </p>
        </div>
        
        <DashboardExplorer userPlan={currentPlan as 'gratuito' | 'profissional' | 'completo'} />
      </main>
    </div>
  );
}
