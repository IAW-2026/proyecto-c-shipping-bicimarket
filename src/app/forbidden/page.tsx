import { Lock } from "lucide-react";
import { ErrorPageLayout } from "@/components/feedback/ErrorPageLayout";

/**
 * 403 estatico. Las rutas que detectan falta de permisos hacen
 * `redirect("/forbidden")`. Centralizado acá para que el copy sea el mismo.
 */
export default function Forbidden() {
  return (
    <ErrorPageLayout
      icon={Lock}
      tone="destructive"
      eyebrow="Error 403"
      title="No tenés permisos para ver esta página"
      subtitle="Si pensás que es un error, contactá a tu coordinador o a soporte."
      cta={{ label: "Ir al dashboard", href: "/dashboard" }}
    />
  );
}
