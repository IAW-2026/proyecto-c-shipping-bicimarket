import { cn } from "@/lib/utils";
import type { OperatorStatus } from "@/types/logistics-operators";

interface OperatorAvatarProps {
  name: string;
  status?: OperatorStatus;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Avatar circular con iniciales. Opcionalmente muestra un dot de status
 * abajo-derecha (verde/gris/rojo). No usa fotos en sprint 1.
 */
export function OperatorAvatar({
  name,
  status,
  size = "md",
  className,
}: OperatorAvatarProps) {
  const initials = getInitials(name);

  const sizeClasses = {
    sm: "size-8 text-xs",
    md: "size-10 text-sm",
    lg: "size-14 text-lg",
  }[size];

  const dotSize = {
    sm: "size-2",
    md: "size-2.5",
    lg: "size-3",
  }[size];

  const dotColor =
    status === "active"
      ? "bg-emerald-500"
      : status === "suspended"
        ? "bg-destructive"
        : status === "inactive"
          ? "bg-muted-foreground"
          : "bg-transparent";

  return (
    <div className={cn("relative inline-flex", className)}>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary",
          sizeClasses,
        )}
        aria-label={name}
      >
        {initials}
      </span>
      {status && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-2 border-background",
            dotSize,
            dotColor,
          )}
          aria-hidden
        />
      )}
    </div>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
