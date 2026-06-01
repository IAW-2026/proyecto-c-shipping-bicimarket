"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { truncateId } from "@/lib/format";

const SEGMENT_LABELS: Record<string, string> = {
  admin: "Admin",
  shipments: "Envíos",
  operators: "Operadores",
  rates: "Tarifaría",
  "api-docs": "API · Contratos",
  new: "Nuevo",
};

/**
 * Breadcrumb auto-generado del pathname para las rutas /admin/*. IDs de
 * recursos (shp_…, lop_…) se truncan al final con el helper `truncateId`.
 */
export function AdminBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  return (
    <nav aria-label="breadcrumb">
      <ol className="flex items-center gap-1.5 text-sm">
        {segments.map((seg, idx) => {
          const href = "/" + segments.slice(0, idx + 1).join("/");
          const isLast = idx === segments.length - 1;
          const label = labelFor(seg);
          return (
            <li key={href} className="flex items-center gap-1.5">
              {idx > 0 && (
                <ChevronRight
                  className="size-3.5 text-muted-foreground"
                  aria-hidden
                />
              )}
              {isLast ? (
                <span className="font-medium text-foreground">{label}</span>
              ) : (
                <Link
                  href={href}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function labelFor(segment: string): string {
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment];
  // IDs con prefijo: mostrar truncado en mono
  if (/^(shp|lop|qte|pkg|evt|dla|prf|ssh|rat)_/.test(segment)) {
    return truncateId(segment, 8, 4);
  }
  return segment;
}
