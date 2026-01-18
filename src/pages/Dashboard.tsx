import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MapPin, LogOut, User, Crown, CreditCard } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { DashboardExplorer } from '@/components/DashboardExplorer';

const planLabels: Record<string, { label: string; color: string; icon: typeof Crown }> = {
  gratuito: { label: 'Plano Gratuito', color: 'bg-muted text-muted-foreground', icon: User },
  profissional: { label: 'Plano Profissional', color: 'bg-primary/20 text-primary', icon: Crown },
  completo: { label: 'Plano Completo', color: 'bg-accent/20 text-accent-foreground', icon: Crown }
};

export default function Dashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { subscription, loading: subLoading } = useSubscription();
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
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/subscription')}
                className="hidden md:flex items-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                Gerenciar Plano
              </Button>
              
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                <span className="hidden md:inline">Sair</span>
              </Button>
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
