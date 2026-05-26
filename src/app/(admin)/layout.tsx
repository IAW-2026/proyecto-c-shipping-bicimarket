import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import { AppSidebar } from "@/components/admin/AppSidebar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { NavUser } from "@/components/admin/NavUser";

/**
 * Shell admin con patrón shadcn `Sidebar`. El contenedor de children tiene
 * un fondo blanco redondeado tipo "card flotante" sobre un degradado verde
 * de izquierda a derecha para darle aire visual al admin.
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
  if (!(await requireAdmin(sessionClaims))) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-linear-gradient from-green-50 to-green-100">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-white">
          <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 px-4">
            <div className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            
            <AdminBreadcrumb />
            </div>
            <div className="ml-auto" >

             <NavUser />
             </div>
          </header>
          <Separator />

          <main className="mx-3 my-4 flex-1 overflow-hidden rounded-lg bg-white">
            <div className="mx-auto w-full max-w-[1400px]">{children}</div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
