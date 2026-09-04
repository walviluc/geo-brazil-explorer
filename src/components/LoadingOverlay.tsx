import { Loader2 } from "lucide-react";

interface LoadingOverlayProps {
  title?: string;
  description?: string;
}

/** Full-screen blocking overlay shown while geodata sources are being loaded. */
export function LoadingOverlay({
  title = "Carregando base de dados…",
  description = "Estamos consultando o servidor da fonte selecionada. Isso pode levar alguns segundos.",
}: LoadingOverlayProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[90] flex items-center justify-center bg-background/85 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-4 px-6 text-center">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-4 border-primary/20" />
          <Loader2 className="absolute inset-0 m-auto w-10 h-10 animate-spin text-primary" />
        </div>
        <div>
          <p className="text-lg font-semibold text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">{description}</p>
        </div>
      </div>
    </div>
  );
}
