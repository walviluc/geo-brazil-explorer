import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { Explorer } from "@/components/Explorer";
import { Pricing } from "@/components/Pricing";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { subscription, loading: subLoading } = useSubscription();
  
  // Determine user plan: null if not logged in, otherwise their subscription plan
  const userPlan = authLoading || subLoading 
    ? null 
    : user 
      ? (subscription?.plan as 'gratuito' | 'profissional' | 'completo') || 'gratuito' 
      : null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <Features />
      <Explorer userPlan={userPlan} />
      <Pricing />
      <Footer />
    </div>
  );
};

export default Index;
