import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { RatesTable } from "./RatesTable";

export default function RatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Tarifaría
        </h2>
        <p className="text-sm text-muted-foreground">
          Tabla de costos por carrier, service level, zona y peso. La consulta
          el motor de cotizaciones (POST /api/v1/shipping-quotes).
        </p>
      </div>

      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <RatesTable />
      </Suspense>
    </div>
  );
}
