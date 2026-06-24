"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUrlParams } from "@/hooks/useUrlParams";

const PER_PAGE_OPTIONS = ["10", "20", "50", "100"];

export function DataTablePagination({ total }: { total: number }) {
  const { getParam, setMultipleParams } = useUrlParams();
  const page = Number(getParam("page") ?? 1);
  const perPage = Number(getParam("per_page") ?? 20);
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  return (
    <div className="flex items-center justify-between gap-4 px-2 py-3">
      <p className="text-sm text-muted-foreground">
        {from}–{to} de {total}
      </p>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">Filas por página</p>
          <Select
            value={String(perPage)}
            onValueChange={(v) => setMultipleParams({ per_page: v, page: "1" })}
          >
            <SelectTrigger size="sm" className="w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PER_PAGE_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            disabled={page <= 1}
            onClick={() => setMultipleParams({ page: String(page - 1) })}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="text-sm tabular-nums">
            {page} / {lastPage}
          </p>
          <Button
            variant="outline"
            size="icon"
            disabled={page >= lastPage}
            onClick={() => setMultipleParams({ page: String(page + 1) })}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
