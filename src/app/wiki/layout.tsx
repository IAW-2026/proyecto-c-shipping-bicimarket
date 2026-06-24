import Link from "next/link";
import { Package } from "lucide-react";

/**
 * Layout público para /wiki — la mini-wiki/FAQ del proyecto. Sin sidebar ni
 * Clerk: cualquiera (el profesor que corrige) puede abrirla sin loguearse.
 * Mismo chrome que /track para consistencia visual.
 */
export default function WikiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Package className="size-3.5" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold">BiciMarket</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Guía del proyecto
              </p>
            </div>
          </Link>
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Volver al inicio
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
        {children}
      </main>

      <footer className="mx-auto w-full max-w-3xl px-4 pb-10 text-xs text-muted-foreground">
        <p>
          © {new Date().getFullYear()} BiciMarket S.A. · Shipping App ·
          Proyecto IAW 2026 (tipo C — Marketplace).
        </p>
      </footer>
    </div>
  );
}
