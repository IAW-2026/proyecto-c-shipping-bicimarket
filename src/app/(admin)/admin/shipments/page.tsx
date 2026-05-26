import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { ShipmentsTable } from "./ShipmentsTable";
import { TableSkeleton } from "@/components/data-table/TableSkeleton";
import { buttonVariants } from "@/components/ui/button";

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            Envíos
          </h2>
          <p className="text-sm text-muted-foreground">
            Todos los envíos del marketplace
          </p>
        </div>
        <Link
          href="/admin/shipments/new"
          className={buttonVariants({ size: "lg" })}
        >
          <Plus className="size-4" /> Nuevo envío
        </Link>
      </div>

      <Suspense fallback={<TableSkeleton rows={20} columns={7} />}>
        <ShipmentsTable />
      </Suspense>
    </div>
  );
}
