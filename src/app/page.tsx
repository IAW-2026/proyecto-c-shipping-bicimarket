import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ArrowRight, ExternalLink, Package } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { resolveLandingPath } from "@/lib/auth-helpers";

/**
 * Landing pública. Mockup: `desing -references/Landing.png`.
 *
 * - Si hay sesión activa → redirect a la pantalla que corresponde según rol
 *   (admin / operador / forbidden), via resolveLandingPath.
 * - Si no, render del card central con CTA "Iniciar sesión".
 */
export default async function Home() {
  const { userId, sessionClaims } = await auth();
  if (userId) {
    const target = await resolveLandingPath(sessionClaims);
    redirect(target);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Package className="size-4" />
          </span>
          <div className="leading-tight">
            <p className="font-heading text-sm font-semibold">BiciMarket</p>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Logística
            </p>
          </div>
        </div>
        <a
          href="https://bicimarket.com"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          bicimarket.com
          <ExternalLink className="size-3.5" />
        </a>
      </header>

      <main className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10">
            <Package className="size-8 text-primary" strokeWidth={1.75} />
          </div>

          <div className="space-y-3">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">
              Plataforma de
              <br />
              operaciones logísticas
            </h1>
            <p className="text-sm text-muted-foreground">
              Gestioná retiros, tránsito y entregas de los envíos del
              marketplace de BiciMarket.
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 pt-2">
            <Link
              href="/sign-in"
              className={buttonVariants({
                size: "lg",
                className: "h-11 w-full px-4",
              })}
            >
              Iniciar sesión
              <ArrowRight className="size-4" />
            </Link>
            <a
              href="mailto:soporte@bicimarket.com"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Soporte
            </a>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Servicios operativos · v2.4.0
          </div>
        </div>
      </main>

      <footer className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-6 py-6 text-xs text-muted-foreground">
        <p>© 2026 BiciMarket S.A.</p>
        <p className="flex items-center gap-3">
          <a href="#" className="hover:text-foreground">Términos</a>
          <span>·</span>
          <a href="#" className="hover:text-foreground">Privacidad</a>
          <span>·</span>
          <span>Hecho con ♥ en Argentina</span>
        </p>
      </footer>
    </div>
  );
}
