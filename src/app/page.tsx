import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ArrowRight, BookOpen, Package, Search } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { resolveLandingPath } from "@/lib/auth-helpers";
import { LandingBackground } from "./_components/LandingBackground";
import { KeepShoppingCarousel } from "@/components/products/KeepShoppingCarousel";

/**
 * Landing pública. Mockup: `desing -references/Landing.png`.
 *
 * - Si hay sesión activa → redirect a la pantalla que corresponde según rol
 *   (admin / operador / forbidden), via resolveLandingPath.
 * - Si no, render del card central con CTAs: "Seguir un envío" (tracking
 *   público, hero) e "Iniciar sesión" (operadores/admin).
 *
 * Fondo animado con blobs blur (motion/react) — ver LandingBackground.
 */
export default async function Home() {
  const { userId, sessionClaims } = await auth();
  if (userId) {
    const target = await resolveLandingPath(sessionClaims);
    redirect(target);
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
      <LandingBackground />

      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
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
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/15 backdrop-blur-sm">
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

          {/* Hero CTA: tracking público */}
          <Link
            href="/track"
            className={buttonVariants({
              size: "lg",
              className:
                "h-14 w-full gap-3 rounded-xl px-5 text-base font-semibold shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02]",
            })}
          >
            <Search className="size-5" />
            Seguir un envío
            <ArrowRight className="ml-auto size-5" />
          </Link>

          {/* CTA secundario: login operador/admin */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            <span>¿Operador o admin?</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <Link
            href="/sign-in"
            className={buttonVariants({
              variant: "outline",
              size: "lg",
              className: "h-11 w-full bg-card/70 px-4 backdrop-blur-sm",
            })}
          >
            Iniciar sesión
            <ArrowRight className="size-4" />
          </Link>

          {/* Guía / mini-wiki del proyecto (pensada para la corrección) */}
          <Link
            href="/wiki"
            className="inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <BookOpen className="size-3.5" />
            Guía del proyecto y FAQ (para corrección)
          </Link>
        </div>
      </main>

      {/* Seguir comprando: catálogo de la Seller App (sutil, auto-scroll) */}
      <div className="relative z-10 mx-auto w-full max-w-2xl px-6 pb-6">
        <KeepShoppingCarousel />
      </div>

      <footer className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-center px-6 py-6 text-xs text-muted-foreground">
        <p>Hecho con ♥ en Argentina</p>
      </footer>
    </div>
  );
}
