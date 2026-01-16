import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin, Menu, X, User, LogOut, Crown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";

const planLabels: Record<string, string> = {
  gratuito: 'Gratuito',
  profissional: 'Pro',
  completo: 'Completo'
};

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { subscription } = useSubscription();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const currentPlan = subscription?.plan || 'gratuito';

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-secondary/95 backdrop-blur-sm border-b border-secondary-foreground/10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" />
            <span className="text-lg font-bold text-secondary-foreground">GeoData Brasil</span>
          </a>
          
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#explorer" className="text-secondary-foreground/70 hover:text-primary transition-colors">
              Explorar
            </a>
            <a href="#pricing" className="text-secondary-foreground/70 hover:text-primary transition-colors">
              Planos
            </a>
            <a href="#" className="text-secondary-foreground/70 hover:text-primary transition-colors">
              Documentação
            </a>
          </nav>
          
          {/* CTA */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  <Crown className="w-4 h-4" />
                  {planLabels[currentPlan]}
                </div>
                <Button variant="ghost" className="text-secondary-foreground" onClick={() => navigate('/dashboard')}>
                  <User className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
                <Button variant="outline" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" className="text-secondary-foreground" onClick={() => navigate('/auth')}>
                  Entrar
                </Button>
                <Button onClick={() => navigate('/auth')}>
                  Começar Grátis
                </Button>
              </>
            )}
          </div>
          
          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 text-secondary-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-secondary-foreground/10">
            <nav className="flex flex-col gap-4">
              <a href="#explorer" className="text-secondary-foreground/70 hover:text-primary transition-colors py-2">
                Explorar
              </a>
              <a href="#pricing" className="text-secondary-foreground/70 hover:text-primary transition-colors py-2">
                Planos
              </a>
              <a href="#" className="text-secondary-foreground/70 hover:text-primary transition-colors py-2">
                Documentação
              </a>
              <div className="flex flex-col gap-2 pt-4 border-t border-secondary-foreground/10">
                {user ? (
                  <>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium w-fit">
                      <Crown className="w-4 h-4" />
                      {planLabels[currentPlan]}
                    </div>
                    <Button variant="ghost" className="w-full justify-start text-secondary-foreground" onClick={() => { navigate('/dashboard'); setMobileMenuOpen(false); }}>
                      <User className="w-4 h-4 mr-2" />
                      Dashboard
                    </Button>
                    <Button variant="outline" className="w-full" onClick={handleSignOut}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Sair
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" className="w-full text-secondary-foreground" onClick={() => { navigate('/auth'); setMobileMenuOpen(false); }}>
                      Entrar
                    </Button>
                    <Button className="w-full" onClick={() => { navigate('/auth'); setMobileMenuOpen(false); }}>
                      Começar Grátis
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
