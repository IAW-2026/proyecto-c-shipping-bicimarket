"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Boxes,
  GitBranch,
  MapPin,
  Network,
  Package,
  Truck,
  Users,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

/**
 * Mini-wiki / FAQ pública del proyecto Shipping. Autocontenida: explica el
 * dominio, el flujo end-to-end, la máquina de estados, y sobre todo qué cambió
 * respecto del diseño de la etapa 1 (con los ADRs que lo justifican). Pensada
 * para que la cátedra pueda corregir la entrega sin abrir el repo.
 *
 * Es client component porque usa Accordion/Badge (base-ui, con hooks). No
 * fetchea datos: es contenido estático.
 */
export default function WikiPage() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            <BookOpen className="size-3" /> Guía del proyecto
          </Badge>
          <Badge variant="outline">Sprint 1 · standalone</Badge>
          <Badge variant="outline">IAW 2026 · tipo C</Badge>
        </div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Shipping App — cómo funciona y qué cambió
        </h1>
        <p className="text-sm text-muted-foreground">
          Esta página es una mini-wiki del módulo de envíos de BiciMarket.
          Explica el dominio, el flujo completo de un envío, la máquina de
          estados y las decisiones de arquitectura (ADRs) que diferencian este
          producto final del diseño original de la etapa 1. La documentación
          fuente, más extensa, vive en <code>docs/</code> y en el{" "}
          <code>README.md</code> del repo.
        </p>
      </header>

      {/* Índice */}
      <nav className="rounded-xl border border-border bg-card p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Contenido
        </p>
        <ol className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
          {TOC.map((t, i) => (
            <li key={t.id}>
              <a
                href={`#${t.id}`}
                className="text-primary hover:underline"
              >
                {i + 1}. {t.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* 1 — Qué es */}
      <Section
        id="que-es"
        icon={<Boxes className="size-4" />}
        title="Qué es BiciMarket y dónde encaja Shipping"
      >
        <p>
          <strong>BiciMarket</strong> es un marketplace de bicicletas y
          accesorios compuesto por <strong>cuatro aplicaciones</strong>{" "}
          independientes que se comunican <strong>solo por REST</strong> con un
          header <code>X-Service-Token</code> (sin webhooks entre nosotras, sin
          colas, sin event bus):
        </p>
        <ul className="ml-4 list-disc space-y-1">
          <li>
            <strong>Buyer</strong> — dueña del <code>order_id</code>; arma el
            carrito y el checkout.
          </li>
          <li>
            <strong>Seller</strong> — una <code>sales_order</code> por vendedor;
            prepara los paquetes.
          </li>
          <li>
            <strong>Shipping</strong> (esta app) — dueña de los{" "}
            <code>shipments</code>, paquetes, eventos de tracking, operadores
            logísticos y las cotizaciones.
          </li>
          <li>
            <strong>Payments</strong> — una <code>settlement</code> por vendedor;
            libera el dinero <em>cuando Shipping marca la entrega</em>.
          </li>
        </ul>
        <p>
          Una compra multi-vendedor se descompone: la <code>order</code> del
          comprador → N grupos por vendedor → <strong>un shipment por vendedor</strong>{" "}
          en Shipping → una liquidación por vendedor en Payments.
        </p>
      </Section>

      {/* 2 — Glosario */}
      <Section
        id="glosario"
        icon={<BookOpen className="size-4" />}
        title="Glosario rápido"
      >
        <dl className="space-y-2">
          {GLOSSARY.map((g) => (
            <div key={g.term} className="grid grid-cols-[7rem_1fr] gap-3">
              <dt className="font-mono text-xs font-semibold">{g.term}</dt>
              <dd className="text-sm text-muted-foreground">{g.def}</dd>
            </div>
          ))}
        </dl>
      </Section>

      {/* 3 — Roles */}
      <Section
        id="roles"
        icon={<Users className="size-4" />}
        title="Roles, acceso y usuarios de prueba"
      >
        <p>
          No hay columna <code>role</code> en la base. El rol se resuelve al
          loguear (cada app tiene su propio Clerk):
        </p>
        <ul className="ml-4 list-disc space-y-1">
          <li>
            <strong>Admin</strong> = el usuario tiene{" "}
            <code>publicMetadata.admin = true</code> en Clerk. Gestiona todos los
            envíos, operadores y tarifas.
          </li>
          <li>
            <strong>Operador logístico</strong> = existe un{" "}
            <code>LogisticsOperator</code> activo con su <code>clerk_user_id</code>.
            Ve y opera sus pedidos asignados.
          </li>
        </ul>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-3">Rol</th>
                <th className="py-2 pr-3">Email</th>
                <th className="py-2">Password</th>
              </tr>
            </thead>
            <tbody className="[&_td]:py-2 [&_td]:pr-3 [&_tr]:border-b [&_tr]:border-border/60">
              <tr>
                <td>Admin</td>
                <td className="font-mono text-xs">shippadminclerktest@iaw.com</td>
                <td className="font-mono text-xs">iawuser#</td>
              </tr>
              <tr>
                <td>Operador 1</td>
                <td className="font-mono text-xs">
                  shippoperatorclerktest@iaw.com
                </td>
                <td className="font-mono text-xs">iawuser#</td>
              </tr>
              <tr>
                <td>Operador 2</td>
                <td className="font-mono text-xs">
                  shipp2operatorclerktest@iaw.com
                </td>
                <td className="font-mono text-xs">iawuser#</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            href="/sign-in"
            className={buttonVariants({ size: "sm" })}
          >
            Iniciar sesión <ArrowRight className="size-3.5" />
          </Link>
          <Link
            href="/track"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Tracking público
          </Link>
        </div>
      </Section>

      {/* 4 — Flujo */}
      <Section
        id="flujo"
        icon={<Truck className="size-4" />}
        title="Flujo de un envío, de principio a fin"
      >
        <p>
          Orden cronológico de la vida de un pedido en Shipping (los nombres en{" "}
          <code>código</code> son los estados de la máquina):
        </p>
        <ol className="space-y-3">
          {FLOW.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                {i + 1}
              </span>
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{step.title}</p>
                <p className="text-sm text-muted-foreground">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
          <strong>Camino no feliz:</strong> si la entrega falla
          (<code>failed_delivery</code>), el operador puede reintentar
          (<code>→ in_transit</code>) o, tras los intentos, el pedido se devuelve
          al vendedor (<code>→ returned</code>).
        </div>
      </Section>

      {/* 5 — Estados */}
      <Section
        id="estados"
        icon={<GitBranch className="size-4" />}
        title="Máquina de estados"
      >
        <p>
          Cada transición se valida contra una tabla normativa. Una transición
          inválida devuelve <code>409 INVALID_TRANSITION</code> con{" "}
          <code>{`{ from, to, allowed }`}</code>.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-3">Estado</th>
                <th className="py-2">Puede pasar a…</th>
              </tr>
            </thead>
            <tbody className="[&_td]:py-2 [&_td]:pr-3 [&_td]:align-top [&_tr]:border-b [&_tr]:border-border/60">
              {TRANSITIONS.map((t) => (
                <tr key={t.from}>
                  <td className="font-mono text-xs">{t.from}</td>
                  <td className="font-mono text-xs text-muted-foreground">
                    {t.to}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm">
          <strong>Estado del pedido (rollup del grupo):</strong> el{" "}
          <code>ShipmentGroup</code> consolida el estado de sus N envíos así: si{" "}
          <em>todos</em> están <code>delivered</code> → el pedido está entregado;
          si <em>alguno</em> está <code>failed_delivery</code> → fallido; si
          alguno está <code>returned</code> → devuelto; si no, muestra el estado{" "}
          <em>menos avanzado</em> (el cuello de botella).
        </p>
      </Section>

      {/* 6 — Tracking público */}
      <Section
        id="tracking"
        icon={<MapPin className="size-4" />}
        title="Tracking público (BMK vs TRK)"
      >
        <p>
          Cualquiera con el código puede seguir un envío en{" "}
          <Link href="/track">/track</Link> sin loguearse. Hay dos vistas:
        </p>
        <ul className="ml-4 list-disc space-y-1">
          <li>
            <strong>
              <code>BMK-…</code> (vista pedido)
            </strong>{" "}
            — el código global que ve el comprador. Muestra el pedido completo:
            todos los vendedores, el estado consolidado y, si hubo varias
            entregas, <strong>todas las fotos en un carrusel</strong>.
          </li>
          <li>
            <strong>
              <code>TRK-AR-…</code> (vista envío)
            </strong>{" "}
            — el código de un envío individual (lo ve el vendedor). Es atómico:
            una sola foto de prueba de entrega. Un vendedor no ve los envíos de
            otros vendedores del mismo pedido.
          </li>
        </ul>
        <p className="text-sm text-muted-foreground">
          Si una prueba de entrega no tiene foto o la imagen está rota, se
          muestra una imagen de fallback para no romper la UI.
        </p>
      </Section>

      {/* 7 — Cotización */}
      <Section
        id="cotizacion"
        icon={<MapPin className="size-4" />}
        title="Cotización, geolocalización y tarifas"
      >
        <ul className="ml-4 list-disc space-y-1">
          <li>
            Hay un <strong>dataset de códigos postales argentinos</strong> con
            lat/lng, ciudad y provincia, expuesto en el endpoint público{" "}
            <code>GET /api/v1/postal-codes</code> (lo consumen los selectores de
            dirección).
          </li>
          <li>
            La distancia entre origen y destino se calcula con la fórmula de{" "}
            <strong>Haversine</strong> sobre esas coordenadas.
          </li>
          <li>
            Las <strong>tarifas</strong> se matchean por banda de{" "}
            <em>distancia × peso × nivel de servicio</em> (standard / express /
            same_day).
          </li>
          <li>
            <strong>Cotización multi-origen (ADR-005):</strong> un pedido con N
            vendedores cotiza en una sola llamada, sumando los tramos y aplicando
            un descuento del 5% por origen extra (tope 20%).
          </li>
        </ul>
        <p className="text-sm text-muted-foreground">
          En el form de “nuevo pedido” del admin, vendedor y comprador se eligen
          de un select de los que ya existen en la base, y su dirección se
          autocompleta y queda bloqueada: así no se pueden crear pedidos con
          datos que no existan ni con una ciudad/provincia que no coincida con el
          CP.
        </p>
      </Section>

      {/* 7.5 — API que expone Shipping */}
      <Section
        id="api"
        icon={<Network className="size-4" />}
        title="API que expone Shipping (documentación interactiva)"
      >
        <p>
          Shipping expone un contrato <strong>REST server-to-server</strong>{" "}
          para que las otras apps del marketplace la consuman: Buyer cotiza y
          consulta envíos, Seller crea envíos y agrega paquetes, y los carriers
          reportan eventos de tracking. Todas estas llamadas se autentican con
          el header <code>X-Service-Token</code> (no JWT de usuario).
        </p>
        <ul className="ml-4 list-disc space-y-1">
          <li>
            <strong>SH1 · Cotizaciones:</strong>{" "}
            <code>POST /api/v1/shipping-quotes</code> (lo llama Buyer).
          </li>
          <li>
            <strong>SH2 · Envíos:</strong> <code>POST /api/v1/shipments</code>{" "}
            (Seller), <code>GET /api/v1/shipments?orderId=…</code> (Buyer) y{" "}
            <code>GET /api/v1/shipments/{`{id}`}</code>.
          </li>
          <li>
            <strong>SH3 · Paquetes:</strong>{" "}
            <code>POST /api/v1/shipments/{`{id}`}/packages</code> (Seller).
          </li>
          <li>
            <strong>SH4 · Tracking events:</strong>{" "}
            <code>POST</code> y <code>GET /api/v1/shipments/{`{id}`}/tracking-events</code>{" "}
            (carrier o integración).
          </li>
        </ul>
        <p>
          En el panel admin hay una{" "}
          <strong>documentación interactiva tipo Swagger</strong> en{" "}
          <code>/admin/api-docs</code>: cada endpoint trae su descripción,
          parámetros, body de ejemplo, respuesta de ejemplo y tabla de errores,
          y sobre todo un formulario <strong>“Probar el endpoint”</strong> que
          ejecuta la llamada de verdad y muestra el status, el tiempo y el JSON
          de respuesta.
        </p>
        <p className="text-sm text-muted-foreground">
          Como el <code>X-Service-Token</code> es un secreto que no puede salir
          al navegador, el playground no llama al endpoint directo: ejecuta a
          través de un <strong>proxy interno solo-admin</strong> que inyecta el
          token del lado del servidor. Tip: encadená las llamadas — corré la
          cotización, copiá un <code>qte_…</code> de la respuesta, creá un envío
          con él y usá el <code>shp_…</code> resultante en el resto.
        </p>
      </Section>

      {/* 8 — Qué cambió */}
      <Section
        id="cambios"
        icon={<GitBranch className="size-4" />}
        title="Qué cambió respecto de la etapa 1 (y por qué)"
      >
        <p>
          El diseño de la etapa 1 era una especificación multi-app en papel.
          Construyendo el producto final tomamos decisiones que quedaron
          registradas como ADRs (Architecture Decision Records). Las más
          importantes:
        </p>
        <Accordion defaultValue={["adr-006"]} className="rounded-xl border border-border bg-card px-4">
          {DELTAS.map((d) => (
            <AccordionItem key={d.id} value={d.id}>
              <AccordionTrigger>
                <span className="flex items-center gap-2 pr-2">
                  <Badge variant="outline">{d.badge}</Badge>
                  <span>{d.title}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>Antes (etapa 1):</strong> {d.before}
                  </p>
                  <p>
                    <strong>Ahora (producto final):</strong> {d.after}
                  </p>
                  <p className="text-muted-foreground">
                    <strong>Por qué:</strong> {d.why}
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <p className="pt-2 text-sm">
          <strong>Otras decisiones tomadas sobre la marcha:</strong> selects de
          vendedor/comprador con dirección bloqueada en el alta de pedidos;
          compresión de imágenes en el navegador antes de subirlas a Supabase
          Storage (las fotos de celular superaban el límite de body y fallaban);
          imagen de fallback para pruebas de entrega sin foto o rotas; carrusel
          de fotos en el tracking de un pedido (BMK); carrusel “Seguir
          comprando” que trae productos reales de la Seller App por REST
          (ADR-007); auto-provisión de operadores en desarrollo; admin marcado
          por <code>publicMetadata</code> en Clerk.
        </p>
      </Section>

      {/* 9 — Cómo corregir */}
      <Section
        id="corregir"
        icon={<Users className="size-4" />}
        title="Cómo probar / corregir"
      >
        <ol className="ml-4 list-decimal space-y-1.5">
          <li>
            Entrá con el usuario <strong>admin</strong> (tabla de arriba,
            password <code>iawuser#</code>): vas a caer en{" "}
            <code>/admin/shipments</code> con ~16 pedidos precargados que cubren
            todos los estados. Probá el detalle, crear un pedido nuevo, los
            operadores y las tarifas.
          </li>
          <li>
            Entrá con un <strong>operador</strong>: vas a ver tus asignaciones en{" "}
            <code>/dashboard/assignments</code>. Tomá un pedido disponible y
            avanzá su estado (retiro → tránsito → reparto → entrega con foto o
            entrega fallida).
          </li>
          <li>
            Copiá un código <code>BMK-…</code> del detalle de un pedido y abrilo
            en <Link href="/track">/track</Link> sin login para ver el
            seguimiento público.
          </li>
          <li>
            Entrá a <code>/admin/api-docs</code> (como admin) para ver la
            documentación interactiva del contrato REST que Shipping expone para
            las otras apps y <strong>ejecutar cada endpoint en vivo</strong>{" "}
            desde el navegador.
          </li>
        </ol>
      </Section>

      {/* 10 — Limitaciones */}
      <Section
        id="limitaciones"
        icon={<Package className="size-4" />}
        title="Limitaciones conocidas / lo que no hicimos"
      >
        <ul className="ml-4 list-disc space-y-1">
          <li>
            <strong>Sprint 1 standalone (ADR-002):</strong> las llamadas
            salientes a Buyer/Seller/Payments están diferidas (se loguean) y los
            datos de esas apps están mockeados. La lógica propia de Shipping
            funciona end-to-end. <strong>Excepción (ADR-007):</strong> el
            carrusel “Seguir comprando” sí consume el catálogo real de la Seller
            App por REST (S2S con <code>X-Service-Token</code>) — es la primera
            conexión saliente entre apps funcionando de verdad.
          </li>
          <li>
            No hay integración real con carriers (Andreani/OCA): el{" "}
            <code>carrier</code> es informativo.
          </li>
          <li>
            La firma del receptor en la entrega es un placeholder.
          </li>
        </ul>
      </Section>

      {/* FAQ */}
      <Section
        id="faq"
        icon={<BookOpen className="size-4" />}
        title="Preguntas frecuentes"
      >
        <Accordion className="rounded-xl border border-border bg-card px-4">
          {FAQ.map((f, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger>{f.q}</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground">{f.a}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Section>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function Section({
  id,
  icon,
  title,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        <span className="flex size-7 items-center justify-center rounded-md bg-primary/15 text-primary">
          {icon}
        </span>
        {title}
      </h2>
      <div className="space-y-3 text-sm leading-relaxed [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12px] [&_a]:text-primary [&_a]:underline-offset-2 hover:[&_a]:underline">
        {children}
      </div>
    </section>
  );
}

/* ── Contenido ───────────────────────────────────────────────────────────── */

const TOC = [
  { id: "que-es", label: "Qué es BiciMarket y Shipping" },
  { id: "glosario", label: "Glosario" },
  { id: "roles", label: "Roles y usuarios de prueba" },
  { id: "flujo", label: "Flujo de un envío" },
  { id: "estados", label: "Máquina de estados" },
  { id: "tracking", label: "Tracking público (BMK / TRK)" },
  { id: "cotizacion", label: "Cotización y tarifas" },
  { id: "api", label: "API que expone Shipping (docs interactiva)" },
  { id: "cambios", label: "Qué cambió vs etapa 1 (ADRs)" },
  { id: "corregir", label: "Cómo probar / corregir" },
  { id: "limitaciones", label: "Limitaciones conocidas" },
  { id: "faq", label: "Preguntas frecuentes" },
];

const GLOSSARY: Array<{ term: string; def: string }> = [
  { term: "shipment", def: "Envío de un vendedor (un pedido multi-vendedor tiene N). ID shp_…" },
  { term: "ShipmentGroup", def: "El pedido completo: agrupa los N shipments de una orden. ID grp_…" },
  { term: "BMK-…", def: "Tracking global del pedido (lo ve el comprador), vive en el ShipmentGroup." },
  { term: "TRK-AR-…", def: "Tracking individual de un envío (lo ve el vendedor)." },
  { term: "quote", def: "Cotización de envío, vive 60 minutos. ID qte_…" },
  { term: "operador", def: "Operador logístico que retira y entrega. ID lop_…" },
  { term: "snapshot", def: "Copia inmutable de datos de otra app (dirección, precio): nunca se actualiza." },
  { term: "S2S", def: "Server-to-server: llamada entre apps autenticada con X-Service-Token." },
  { term: "ADR", def: "Architecture Decision Record: una decisión de diseño documentada y justificada." },
  { term: "centavos", def: "Todos los montos son enteros en centavos; moneda siempre ARS." },
];

const FLOW: Array<{ title: string; body: string }> = [
  {
    title: "Cotización",
    body: "Buyer pide una cotización a Shipping durante el checkout. La quote vive 60 minutos; al crear el envío se valida que no esté vencida.",
  },
  {
    title: "Creación del pedido",
    body: "Seller crea un shipment por vendedor (S2S). Shipping arma un ShipmentGroup por orden con el tracking global BMK-…; cada envío arranca en ready_for_pickup.",
  },
  {
    title: "Disponible para retiro",
    body: "El pedido queda disponible (ready_for_pickup) para que un operador lo tome. La asignación es a nivel pedido: un operador toma todos los orígenes.",
  },
  {
    title: "Retiro (picked_up)",
    body: "El operador retira los paquetes de cada vendedor. Cada envío pasa a picked_up.",
  },
  {
    title: "En tránsito / en reparto",
    body: "El pedido viaja (in_transit) y luego sale a la dirección del comprador (out_for_delivery).",
  },
  {
    title: "Entrega",
    body: "El operador confirma la entrega con foto (delivered) o registra una entrega fallida (failed_delivery).",
  },
  {
    title: "Liquidación al vendedor",
    body: "Cuando Shipping marca delivered, avisa a Payments para liberar el dinero al vendedor (en Sprint 1 esta llamada está diferida: se loguea).",
  },
];

const TRANSITIONS: Array<{ from: string; to: string }> = [
  { from: "created", to: "ready_for_pickup" },
  { from: "ready_for_pickup", to: "picked_up" },
  { from: "picked_up", to: "in_transit" },
  { from: "in_transit", to: "out_for_delivery · delivered · failed_delivery" },
  { from: "out_for_delivery", to: "delivered · failed_delivery" },
  { from: "failed_delivery", to: "in_transit · returned" },
  { from: "delivered", to: "— (terminal)" },
  { from: "returned", to: "— (terminal)" },
];

const DELTAS: Array<{
  id: string;
  badge: string;
  title: string;
  before: string;
  after: string;
  why: string;
}> = [
  {
    id: "adr-007",
    badge: "ADR-007",
    title: "Carrusel “Seguir comprando” — primera conexión REST real con Seller",
    before:
      "Por ADR-002 (Sprint 1 standalone) toda llamada saliente a otra app estaba diferida (se logueaba) y los datos de Seller/Buyer/Payments se mockeaban. Shipping no consumía nada real de las otras apps.",
    after:
      "El carrusel “Seguir comprando” (landing + tracking público) le pega de verdad al catálogo de la Seller App: GET /api/v1/seller-products es un route handler que hace una llamada S2S real (fetch con header X-Service-Token, timeout de 5s) a GET /api/v1/products de Seller, normaliza la respuesta cruda (SellerProductApi) a nuestro ProductDTO y la sirve al frontend. El componente la consume con el hook useFeaturedProducts (TanStack Query). Si Seller no responde o falta config, devuelve { data: [] } con 200 y el carrusel simplemente no se muestra (degradación silenciosa, no rompe la página).",
    why:
      "Es la primera integración inter-app REST funcionando end-to-end: demuestra que la app no es una isla, que el patrón S2S (X-Service-Token, normalización API→DTO, hook por GET) anda contra una app real y no solo contra mocks. Útil para la demo y como prueba de concepto de cara al Sprint 2, donde se reactivan el resto de las llamadas salientes.",
  },
  {
    id: "adr-006",
    badge: "ADR-006",
    title: "ShipmentGroup y tracking global BMK",
    before:
      "Una orden multi-vendedor generaba N shipments sin ninguna agrupación dentro de Shipping. La agrupación vivía en Buyer (order_seller_groups) y en Payments (settlements), pero el comprador no tenía un único número de seguimiento.",
    after:
      "Agregamos el ShipmentGroup (1 por orden), dueño del tracking global BMK-… que ve el comprador, con estado consolidado (rollup de los N envíos) y asignación a nivel grupo (un operador toma el pedido entero). Cada envío conserva su TRK-AR-… individual para el vendedor.",
    why:
      "El comprador piensa en 'mi pedido', no en N envíos sueltos; necesitaba un solo código y un estado consolidado. Y operativamente conviene que un operador retire todos los orígenes de una misma orden, no que se repartan por envío.",
  },
  {
    id: "adr-005",
    badge: "ADR-005",
    title: "Cotización por geo + endpoint de códigos postales",
    before:
      "Las tarifas se matcheaban por prefijo de código postal (from_postal_prefix / to_postal_prefix). No había endpoint de códigos postales ni cálculo de distancia.",
    after:
      "Dataset geográfico de CPs (lat/lng) + distancia Haversine + tarifas por banda de distancia × peso × servicio, un GET /api/v1/postal-codes público, y cotización multi-origen en una sola llamada con descuento por cantidad de orígenes (5% por extra, tope 20%).",
    why:
      "El prefijo de CP es demasiado grueso para estimar costo real; la distancia geográfica da una cotización mucho más razonable. El endpoint de CPs permite a los frontends autocompletar ciudad/provincia y validar direcciones.",
  },
];

const FAQ: Array<{ q: string; a: string }> = [
  {
    q: "¿Por qué un pedido tiene dos tipos de código (BMK y TRK)?",
    a: "El BMK es el del pedido completo (lo ve el comprador) y vive en el ShipmentGroup. El TRK es el de cada envío individual (lo ve el vendedor). Un pedido de 2 vendedores tiene 1 BMK y 2 TRK.",
  },
  {
    q: "¿Cuándo se le paga al vendedor?",
    a: "Cuando Shipping marca el envío como delivered, no cuando se aprueba el pago. Shipping avisa a Payments para que libere el dinero. En Sprint 1 esa llamada está diferida (se loguea).",
  },
  {
    q: "¿Por qué no puedo escribir cualquier vendedor/comprador o dirección al crear un pedido?",
    a: "Para que solo se creen pedidos con datos que existen en la base. El vendedor y el comprador se eligen de un select y su dirección se autocompleta y queda bloqueada, así ciudad/provincia siempre coinciden con el código postal.",
  },
  {
    q: "¿Qué pasa si una entrega falla?",
    a: "El envío pasa a failed_delivery. Desde ahí el operador puede reintentar (vuelve a in_transit) o, tras los intentos, el pedido se marca returned (devuelto al vendedor).",
  },
  {
    q: "¿Cómo se distingue un admin de un operador?",
    a: "El admin tiene publicMetadata.admin = true en Clerk. El operador es un LogisticsOperator activo identificado por su clerk_user_id. No hay columna de rol en la base.",
  },
];
