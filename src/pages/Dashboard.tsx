import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Database, Layers, Bell, ArrowRight, Map, Receipt } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { usePublicSources } from '@/hooks/usePublicSources';
import { DashboardExplorer } from '@/components/DashboardExplorer';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { UserMenu } from '@/components/UserMenu';
import { Button } from '@/components/ui/button';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

const planLabels: Record<string, string> = {
  gratuito: 'Gratuito',
  profissional: 'Profissional',
  completo: 'Completo',
};

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { subscription, loading: subLoading } = useSubscription();
  const { sources } = usePublicSources();
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
  const isPremium = currentPlan !== 'gratuito';
  const firstName = (user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário')
    .split(' ')[0];
  const publicCount = sources.filter((s) => !s.internal).length;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  const stats = [
    {
      icon: Database,
      value: publicCount,
      label: 'Fontes públicas ativas',
      tone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    {
      icon: Crown,
      value: planLabels[currentPlan],
      label: 'Seu plano atual',
      tone: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
    {
      icon: Layers,
      value: isPremium ? 'Liberado' : 'Bloqueado',
      label: 'Catálogo Premium',
      tone: isPremium
        ? 'bg-primary/10 text-primary'
        : 'bg-muted text-muted-foreground',
    },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/30">
        <DashboardSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
            <div className="flex items-center gap-3 px-4 h-16">
              <SidebarTrigger />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Área do usuário
                </p>
                <h1 className="text-lg font-bold text-foreground leading-tight truncate">
                  Visão geral
                </h1>
              </div>
              <Button variant="ghost" size="icon" aria-label="Notificações" className="hidden sm:flex">
                <Bell className="w-5 h-5" />
              </Button>
              <UserMenu showPlanBadge={false} />
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6 space-y-6">
            {/* Greeting hero */}
            <section className="rounded-xl border border-border bg-card p-6 md:p-8">
              <p className="text-sm text-muted-foreground mb-2">
                {greeting}, {firstName}
              </p>
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex-1">
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                    Seus geodados do Brasil em um só lugar.
                  </h2>
                  <p className="text-muted-foreground max-w-2xl">
                    Explore camadas vetoriais oficiais por estado, visualize no mapa e baixe nos
                    formatos GeoJSON, KML e Shapefile.
                  </p>
                </div>
                <Button
                  size="lg"
                  onClick={() =>
                    document.getElementById('geodados')?.scrollIntoView({ behavior: 'smooth' })
                  }
                >
                  <Map className="w-5 h-5 mr-2" />
                  Explorar geodados
                </Button>
              </div>
            </section>

            {/* Stats */}
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-border bg-card p-5 flex items-center gap-4"
                >
                  <span className={`w-11 h-11 rounded-lg flex items-center justify-center ${stat.tone}`}>
                    <stat.icon className="w-5 h-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xl font-bold text-foreground leading-tight truncate">
                      {stat.value}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">{stat.label}</p>
                  </div>
                </div>
              ))}
            </section>

            {/* Explorer */}
            <section className="rounded-xl border border-border bg-card p-4 md:p-6">
              <h3 className="text-lg font-semibold text-foreground mb-1">Geodados por UF</h3>
              <p className="text-sm text-muted-foreground">
                Escolha uma fonte de dados e navegue pelas camadas organizadas por estado
                brasileiro.
              </p>
              <div id="geodados" className="scroll-mt-24">
                <DashboardExplorer
                  userPlan={currentPlan as 'gratuito' | 'profissional' | 'completo'}
                />
              </div>
            </section>

            {/* Quick actions */}
            <section className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-border bg-card p-6 h-fit">

                <h3 className="text-lg font-semibold text-foreground mb-1">Sua conta</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Atalhos para plano, pagamentos e dados pessoais.
                </p>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => navigate('/subscription')}
                    className="w-full flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 text-sm font-medium hover:bg-muted transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-primary" />
                      {isPremium ? 'Gerenciar assinatura' : 'Assinar Catálogo Premium'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/subscription/history')}
                    className="w-full flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 text-sm font-medium hover:bg-muted transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Receipt className="w-4 h-4" />
                      Histórico e recibos
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/profile')}
                    className="w-full flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 text-sm font-medium hover:bg-muted transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      Meu perfil
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
