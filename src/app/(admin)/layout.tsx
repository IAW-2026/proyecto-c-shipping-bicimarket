import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { Package, Scale, Search, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth-helpers";
import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";

/**
 * Shell admin desktop-first. Sidebar oscuro fijo a 240px + topbar con
 * breadcrumb dinámico + content area con max-width 1400px.
 *
 * Auth (per docs/05 §2):
 *   - sin user logueado     → /sign-in
 *   - logueado sin admin    → /dashboard (camino del operador)
 *   - logueado admin        → render
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect("/sign-in");
  // requireAdmin combina el check del JWT (rápido) con un fallback a
  // Clerk API (un round-trip si el custom session token no está configurado).
  if (!(await requireAdmin(sessionClaims))) redirect("/dashboard");

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
        <div className="space-y-1 px-5 pb-6 pt-6">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
              <Package className="size-4" />
            </span>
            <div className="leading-tight">
              <p className="font-heading text-sm font-semibold">BiciMarket</p>
              <p className="text-[11px] uppercase tracking-wider text-sidebar-foreground/70">
                Logística
              </p>
            </div>
            <span className="ml-auto rounded bg-sidebar-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-accent-foreground">
              Admin
            </span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          <SidebarLink href="/admin/shipments" icon={Package} label="Envíos" />
          <SidebarLink href="/admin/operators" icon={Users} label="Operadores" />
          <SidebarLink href="/admin/rates" icon={Scale} label="Tarifaría" />
        </nav>

        <div className="border-t border-sidebar-border px-4 py-3">
          <div className="flex items-center gap-2">
            <UserButton appearance={{ elements: { avatarBox: "size-7" } }} />
            <p className="text-xs text-sidebar-foreground/80">
              Sesión activa
            </p>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-card/80 px-6 backdrop-blur-md">
          <AdminBreadcrumb />
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground md:flex">
              <Search className="size-3.5" />
              Buscar
              <kbd className="ml-2 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                ⌘K
              </kbd>
            </div>
            <div className="lg:hidden">
              <UserButton appearance={{ elements: { avatarBox: "size-7" } }} />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof Package;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/90 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}
