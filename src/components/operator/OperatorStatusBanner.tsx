"use client";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OperatorStatus } from "@/types/logistics-operators";

interface OperatorStatusBannerProps {
  status: OperatorStatus;
  className?: string;
}

/**
 * Banner que se muestra en las pantallas del operador cuando NO está
 * `active`. La navegación sigue funcionando (puede ver sus envíos, el
 * detalle, etc) pero los botones de acción quedan disabled — este banner
 * explica por qué.
 */
export function OperatorStatusBanner({
  status,
  className,
}: OperatorStatusBannerProps) {
  if (status === "active") return null;

  const isSuspended = status === "suspended";

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border px-3 py-2.5",
        isSuspended
          ? "border-destructive/30 bg-destructive/10"
          : "border-amber-500/30 bg-amber-500/10",
        className,
      )}
    >
      <Lock
        className={cn(
          "mt-0.5 size-4 shrink-0",
          isSuspended ? "text-destructive" : "text-amber-700 dark:text-amber-300",
        )}
      />
      <div className="space-y-0.5 leading-tight">
        <p
          className={cn(
            "text-sm font-semibold",
            isSuspended ? "text-destructive" : "text-amber-700 dark:text-amber-300",
          )}
        >
          {isSuspended ? "Tu cuenta está suspendida" : "Tu cuenta está inactiva"}
        </p>
        <p
          className={cn(
            "text-[11px]",
            isSuspended ? "text-destructive/80" : "text-amber-700/80 dark:text-amber-300/80",
          )}
        >
          Podés ver tus envíos pero no podés ejecutar acciones. Contactá a un
          admin para que reactive tu cuenta.
        </p>
      </div>
    </div>
  );
}
