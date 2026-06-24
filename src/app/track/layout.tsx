import Link from "next/link";
import { Package } from "lucide-react";

/**
 * Layout público para /track/* — sin sidebar, sin Clerk UserButton.
 * Diseñado para que cualquiera pueda abrir el link en cualquier dispositivo.
 * Las clases `print:hidden` ocultan header/footer cuando se imprime / guarda
 * como PDF.
 */
export default function TrackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card print:hidden">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Package className="size-3.5" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold">BiciMarket</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Seguimiento de envíos
              </p>
            </div>
          </Link>
          <Link
            href="/track"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Nueva búsqueda
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
        {children}
      </main>

      <footer className="mx-auto w-full max-w-3xl px-4 pb-6 text-xs text-muted-foreground print:hidden">
        <p>
          © {new Date().getFullYear()} BiciMarket S.A. · Si tu envío tiene una
          demora,{" "}
          <a
            href="mailto:soporte@bicimarket.com"
            className="hover:text-foreground"
          >
            contactá a soporte
          </a>
          .
        </p>
      </footer>
    </div>
  );
}
