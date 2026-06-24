"use client";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUrlParams } from "@/hooks/useUrlParams";

/**
 * Botón de header para tablas server-side. Actualiza ?sort_by y ?sort_dir
 * en la URL — el hook que llama al servidor reacciona automáticamente.
 *
 * Comportamiento: 1er click → asc, 2do click → desc, 3er click → quita el sort
 * (vuelve al sort_by por default que setea el page.tsx).
 */
export function ServerSortButton({
  columnId,
  title,
}: {
  columnId: string;
  title: string;
}) {
  const { getParam, setMultipleParams } = useUrlParams();
  const currentSortBy = getParam("sort_by");
  const currentSortDir = getParam("sort_dir") as "asc" | "desc" | null;

  const isActive = currentSortBy === columnId;

  function toggle() {
    if (!isActive) {
      setMultipleParams({ sort_by: columnId, sort_dir: "asc", page: "1" });
    } else if (currentSortDir === "asc") {
      setMultipleParams({ sort_dir: "desc", page: "1" });
    } else {
      // 3er click: limpia. El page.tsx redirige al default.
      setMultipleParams({ sort_by: null, sort_dir: null, page: "1" });
    }
  }

  const Icon = !isActive
    ? ArrowUpDown
    : currentSortDir === "asc"
      ? ArrowUp
      : ArrowDown;

  return (
    <Button
      variant="ghost"
      onClick={toggle}
      className="-ml-3 h-8 data-[active=true]:bg-accent"
      data-active={isActive}
    >
      {title}
      <Icon className="ml-2 h-4 w-4" />
    </Button>
  );
}
