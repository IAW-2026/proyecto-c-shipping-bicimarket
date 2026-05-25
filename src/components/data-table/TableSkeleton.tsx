import { Skeleton } from "@/components/ui/skeleton";

export function TableSkeleton({
  rows = 10,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton, no reordering
          key={rowIdx}
          className="flex gap-4"
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
              key={colIdx}
              className="h-10 flex-1"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
