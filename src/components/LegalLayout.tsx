import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

interface LegalLayoutProps {
  title: string;
  subtitle: string;
  updatedAt: string;
  children: ReactNode;
}

export function LegalLayout({ title, subtitle, updatedAt, children }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 pt-16">
        <section className="bg-secondary py-14">
          <div className="container mx-auto px-4 max-w-3xl">
            <nav className="text-sm text-secondary-foreground/60 mb-4">
              <Link to="/" className="hover:text-primary transition-colors">Início</Link>
              <span className="mx-2">/</span>
              <span>{title}</span>
            </nav>
            <h1 className="text-3xl md:text-4xl font-bold text-secondary-foreground mb-3">{title}</h1>
            <p className="text-secondary-foreground/70">{subtitle}</p>
            <p className="text-secondary-foreground/50 text-sm mt-4">Última atualização: {updatedAt}</p>
          </div>
        </section>

        <section className="py-14">
          <div className="container mx-auto px-4 max-w-3xl">
            <article className="space-y-8 text-muted-foreground leading-relaxed [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mb-3 [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_a]:text-primary [&_a]:underline">
              {children}
            </article>

            <div className="mt-12 pt-8 border-t border-border text-sm">
              <p className="text-muted-foreground mb-3">Documentos relacionados:</p>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <Link to="/termos-de-uso" className="text-primary hover:underline">Termos de Uso</Link>
                <Link to="/politica-de-privacidade" className="text-primary hover:underline">Política de Privacidade</Link>
                <Link to="/politica-de-cookies" className="text-primary hover:underline">Política de Cookies</Link>
                <Link to="/politica-de-reembolso" className="text-primary hover:underline">Reembolso e Cancelamento</Link>
                <Link to="/licenca-de-dados" className="text-primary hover:underline">Licença e Uso dos Dados</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
