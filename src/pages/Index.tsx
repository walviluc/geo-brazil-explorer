import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { Explorer } from "@/components/Explorer";
import { Pricing } from "@/components/Pricing";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <Features />
      <Explorer />
      <Pricing />
      <Footer />
    </div>
  );
};

export default Index;
