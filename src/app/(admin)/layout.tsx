import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { isAdmin } from "@/lib/auth-helpers";

/**
 * Layout para todas las páginas /admin/*. Verifica que el JWT tenga
 * publicMetadata.admin === true (per docs/05 §2). Si no, redirige al dashboard.
 *
 * El middleware solo asegura que el user esté logueado (Clerk JWT válido);
 * el check de rol admin lo hace este layout.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect("/sign-in");
  if (!isAdmin(sessionClaims)) redirect("/dashboard");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b px-6 py-3">
        <h1 className="text-lg font-semibold">Shipping · Admin</h1>
      </header>
      <main className="flex-1 px-6 py-6">{children}</main>
    </div>
  );
}
