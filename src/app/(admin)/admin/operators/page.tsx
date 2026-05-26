import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { TableSkeleton } from "@/components/data-table/TableSkeleton";
import { OperatorsTable } from "./OperatorsTable";

const DEFAULTS = {
  page: "1",
  per_page: "20",
  sort_by: "created_at",
  sort_dir: "desc",
};

export default async function OperatorsAdminPage({
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
    redirect(`/admin/operators?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            Operadores
          </h2>
          <p className="text-sm text-muted-foreground">
            Logística — operadores propios y tercerizados.
          </p>
        </div>
        <Link
          href="/admin/operators/new"
          className={buttonVariants({ size: "lg" })}
        >
          <Plus className="size-4" /> Nuevo operador
        </Link>
      </div>

      <Suspense fallback={<TableSkeleton rows={10} columns={8} />}>
        <OperatorsTable />
      </Suspense>
    </div>
  );
}
