import { Suspense } from "react";
import { ShipmentAdminDetail } from "./ShipmentAdminDetail";
import { Skeleton } from "@/components/ui/skeleton";

export default async function ShipmentAdminDetailPage({
  params,
}: {
  params: Promise<{ shipmentId: string }>;
}) {
  const { shipmentId } = await params;

  return (
    <Suspense fallback={<DetailSkeleton />}>
      <ShipmentAdminDetail shipmentId={shipmentId} />
    </Suspense>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-72" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
