import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ShipmentsTable } from "./ShipmentsTable";
import { TableSkeleton } from "@/components/data-table/TableSkeleton";

const DEFAULTS = {
  page: "1",
  per_page: "20",
  sort_by: "created_at",
  sort_dir: "desc",
};

export default async function ShipmentsAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  // Redirige a la URL con defaults si faltan params obligatorios.
  // Evita que la primera entrada caiga en estado vacío y se generen race
  // conditions con el cliente.
  const missing = Object.keys(DEFAULTS).some(
    (k) => typeof sp[k] !== "string",
  );
  if (missing) {
    const params = new URLSearchParams();
    const merged: Record<string, string | string[] | undefined> = {
      ...DEFAULTS,
      ...sp,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (typeof v === "string") {
        params.set(k, v);
      } else if (Array.isArray(v)) {
        for (const item of v) params.append(k, item);
      }
    }
    redirect(`/admin/shipments?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Envíos</h2>
        <p className="text-sm text-muted-foreground">
          Todos los envíos del marketplace
        </p>
      </div>

      <Suspense fallback={<TableSkeleton rows={20} columns={5} />}>
        <ShipmentsTable />
      </Suspense>
    </div>
  );
}
