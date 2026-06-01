import { Network, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ApiDocsExplorer } from "./ApiDocsExplorer";

/**
 * /admin/api-docs — documentación tipo Swagger del contrato REST que Shipping
 * EXPONE para las otras apps del marketplace (Buyer / Seller / carriers), con
 * un playground "Try it" funcional por endpoint.
 *
 * Los endpoints son S2S (auth X-Service-Token). El playground no manda el token
 * desde el navegador: ejecuta vía el proxy admin-only POST
 * /api/v1/admin/api-explorer, que lo inyecta del lado del servidor. La página
 * ya está protegida como admin por (admin)/layout.tsx.
 */
export default function ApiDocsPage() {
  return (
    <div className="space-y-8 pb-12">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            <Network className="size-3" /> Contrato inter-app
          </Badge>
          <Badge variant="outline">REST · X-Service-Token</Badge>
        </div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          API que Shipping expone
        </h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Estos son los endpoints REST que la Shipping App expone para que las
          otras apps del marketplace la consuman: Buyer cotiza y consulta
          envíos, Seller crea envíos y agrega paquetes, y los carriers reportan
          eventos de tracking. Todos se autentican server-to-server con el header{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]">
            X-Service-Token
          </code>
          . Cada endpoint trae un formulario para probarlo en vivo, con el body
          de ejemplo precargado.
        </p>

        <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-400">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          <p>
            El playground ejecuta cada llamada a través de un proxy interno
            solo-admin que inyecta el <code>X-Service-Token</code> del lado del
            servidor — el secreto nunca llega al navegador. Tip: encadená las
            llamadas — corré <code>POST /api/v1/shipping-quotes</code>, copiá un{" "}
            <code>qte_…</code> de la respuesta y pegalo en{" "}
            <code>POST /api/v1/shipments</code> para crear un envío real, después
            usá ese <code>shp_…</code> en los demás endpoints.
          </p>
        </div>
      </header>

      <ApiDocsExplorer />
    </div>
  );
}
