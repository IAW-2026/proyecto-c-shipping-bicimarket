import { UserButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { getOrCreateLocalUser } from "@/lib/auth";

export default async function DashboardPage() {
  // Provisioning perezoso: si el usuario no existe en la DB local, se crea acá.
  const user = await getOrCreateLocalUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-6 py-3">
          <h1 className="font-heading text-lg font-semibold tracking-tight">
            Marketplace
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {user.firstName} {user.lastName}
            </span>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="container mx-auto space-y-6 px-6 py-8">
        <div>
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            Dashboard
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Template base. Cada fork reemplaza este contenido por la UI propia
            de su app (Buyer / Seller / Shipping / Payments).
          </p>
        </div>
      </main>
    </div>
  );
}
