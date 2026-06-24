import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { NewShipmentForm } from "./NewShipmentForm";

export default function NewShipmentPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/admin/shipments"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Volver a envíos
      </Link>

      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Nuevo envío
        </h1>
        <p className="text-sm text-muted-foreground">
          Crea un envío manualmente para probar el flujo. En producción, Seller
          App es quien crea los envíos via S2S — esta pantalla es solo dev.
          
        </p>
      </div>

      <NewShipmentForm />
    </div>
  );
}
