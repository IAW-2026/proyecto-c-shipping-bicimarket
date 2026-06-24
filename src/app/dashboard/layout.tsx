import Link from "next/link";
import { Package, User } from "lucide-react";

/**
 * Shell del operador logístico. Mobile-first centrado (max-width 480px aún en
 * desktop) para preservar la familiaridad del flujo en celular.
 * El check de "operador activo" se hace en cada page.tsx (no acá) para que
 * los redirects vivan junto al lugar que los necesita.
 *
 * El UserButton de Clerk vive dentro de /dashboard/profile, no en el nav,
 * para mantener el header simple.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-card/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[480px] items-center gap-2 px-4">
          <Link
            href="/dashboard/assignments"
            className="flex items-center gap-2"
          >
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Package className="size-3.5" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold">BiciMarket</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Logística
              </p>
            </div>
          </Link>

          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            En turno
          </span>
          <Link
            href="/dashboard/profile"
            aria-label="Mi perfil"
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <User className="size-4" />
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[480px] px-4 pb-20 pt-4">
        {children}
      </main>
    </div>
  );
}
