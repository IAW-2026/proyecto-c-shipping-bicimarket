import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { NewOperatorForm } from "./NewOperatorForm";

export default function NewOperatorPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/admin/operators"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Volver a operadores
      </Link>

      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Nuevo operador
        </h1>
        <p className="text-sm text-muted-foreground">
          Antes de crear acá, invitá al operador desde el Clerk Dashboard y
          copiá su <code className="font-mono text-xs">user_…</code> ID.
        </p>
      </div>

      <NewOperatorForm />
    </div>
  );
}
