import type { EndpointSpec } from "@/types/api-explorer";

// Catálogo del contrato S2S que Shipping EXPONE para las otras apps del
// marketplace (Buyer / Seller / carriers). Fuente de verdad: docs/03-apis.md
// (SH1–SH4) + los route handlers y schemas zod reales. Solo se listan los
// endpoints inter-app autenticados con X-Service-Token; los endpoints de la UI
// propia (admin/operador: operadores, tarifas, deliver, assignments, override
// de status) NO van acá porque no se exponen "para las otras apps".
//
// Cada `requestBody` es un ejemplo válido contra el schema zod del endpoint, y
// `responseExample` refleja el DTO real. Los IDs de ejemplo son ilustrativos:
// para que una llamada concrete (201 en vez de 404/409) hay que encadenar
// quote → shipment (ver la nota del playground).

export const API_CATALOG: EndpointSpec[] = [
  // ── SH1 · Cotizaciones ─────────────────────────────────────────────────
  {
    id: "create-quote",
    tag: "SH1 · Cotizaciones",
    method: "POST",
    path: "/api/v1/shipping-quotes",
    summary: "Cotizar un envío multi-origen",
    description:
      "Lo llama Buyer App durante el checkout. Acepta siempre pickups[] (N≥1): una sola llamada cotiza toda la orden. Para N≥2 aplica descuento por origen extra (5% por extra, tope 20%). Cada quote vive 60 minutos.",
    caller: "Buyer App",
    auth: "X-Service-Token (S2S)",
    params: [
      {
        name: "Idempotency-Key",
        in: "header",
        required: false,
        description:
          "UUID elegido por el cliente. Las N quotes se persisten con clave `${K}:${idx}`.",
        example: "",
      },
    ],
    requestBody: {
      pickups: [
        {
          seller_profile_id: "slp_01HZX5K8Q2",
          packages: [
            {
              weight_grams: 14500,
              length_cm: 180,
              width_cm: 60,
              height_cm: 110,
            },
          ],
        },
        {
          seller_profile_id: "slp_02HZX5K8Q2",
          packages: [
            { weight_grams: 750, length_cm: 70, width_cm: 70, height_cm: 10 },
          ],
        },
      ],
      to: {
        city: "CABA",
        province: "Buenos Aires",
        postal_code: "C1043",
        country: "AR",
      },
      service_level: "standard",
    },
    responseStatus: 201,
    responseExample: {
      origins_count: 2,
      discount_pct: 0.05,
      total_gross_cents: 1800000,
      total_net_cents: 1710000,
      currency: "ARS",
      quotes: [
        {
          id: "qte_01HZX…",
          seller_profile_id: "slp_01HZX5K8Q2",
          service_level: "standard",
          carrier: "andreani",
          cost_cents: 1140000,
          currency: "ARS",
          estimated_days_min: 3,
          estimated_days_max: 5,
          weight_grams_total: 14500,
          packages_count: 1,
          expires_at: "2026-04-25T15:32:00Z",
        },
      ],
    },
    errors: [
      {
        code: "POSTAL_CODE_UNKNOWN",
        status: 422,
        when: "El destino o un origen no está en el dataset de códigos postales.",
      },
      {
        code: "RATE_NOT_FOUND",
        status: 422,
        when: "Algún origen no matchea una tarifa por distancia/peso/servicio.",
      },
      { code: "BAD_REQUEST", status: 400, when: "Body inválido (zod)." },
      { code: "UNAUTHORIZED", status: 401, when: "X-Service-Token ausente o inválido." },
    ],
    notes: [
      "service_level: standard | express | same_day.",
      "Sprint 1 (ADR-002): la pickup_address de cada seller se mockea en lib/mocks.ts.",
    ],
  },

  // ── SH2 · Envíos ───────────────────────────────────────────────────────
  {
    id: "create-shipment",
    tag: "SH2 · Envíos",
    method: "POST",
    path: "/api/v1/shipments",
    summary: "Crear un envío para un vendedor",
    description:
      "Lo llama Seller App. Crea un shipment por vendedor a partir de una quote vigente, lo agrupa en el ShipmentGroup del pedido (tracking global BMK-…) y arranca en ready_for_pickup. Valida que la quote no esté vencida y que no exista otro shipment para el mismo sales_order.",
    caller: "Seller App",
    auth: "X-Service-Token (S2S)",
    params: [
      {
        name: "Idempotency-Key",
        in: "header",
        required: false,
        description: "UUID. En POST repetido devuelve el shipment ya creado.",
        example: "",
      },
    ],
    requestBody: {
      shipping_quote_id: "qte_PEGAR_AQUI",
      order_id: "ord_01HZX5K8Q2",
      order_seller_group_id: "osg_01HZX5K8Q2",
      sales_order_id: "sor_01HZX5K8Q2",
      seller_profile_id: "slp_01HZX5K8Q2",
      buyer_profile_id: "byp_01HZX5K8Q2",
      shipping_address_snapshot: {
        street: "Av. Corrientes",
        number: "1234",
        city: "CABA",
        province: "Buenos Aires",
        postal_code: "C1043",
        country: "AR",
      },
      packages: [
        {
          weight_grams: 14500,
          length_cm: 180,
          width_cm: 60,
          height_cm: 110,
          description: "Bicicleta Trek Marlin 5",
        },
      ],
    },
    responseStatus: 201,
    responseExample: {
      id: "shp_01HZX…",
      order_id: "ord_01HZX5K8Q2",
      seller_profile_id: "slp_01HZX5K8Q2",
      carrier: "andreani",
      service_level: "standard",
      tracking_number: "TRK-AR-78901234",
      order_tracking_number: "BMK-1234567890",
      label_url: "/labels/sample.pdf",
      status: "ready_for_pickup",
      weight_grams_total: 14500,
      cost_cents: 1140000,
      currency: "ARS",
      packages: [{ id: "pkg_01HZX…", weight_grams: 14500 }],
      created_at: "2026-04-25T14:40:00Z",
    },
    errors: [
      { code: "QUOTE_EXPIRED", status: 409, when: "La cotización venció (>60 min)." },
      {
        code: "SHIPMENT_ALREADY_EXISTS",
        status: 409,
        when: "Ya existe un shipment para ese sales_order_id.",
      },
      { code: "NOT_FOUND", status: 404, when: "La quote no existe." },
      { code: "BAD_REQUEST", status: 400, when: "Body inválido (zod)." },
    ],
    notes: [
      "Encadená: primero ejecutá POST /shipping-quotes, copiá un `qte_…` de la respuesta y pegalo en shipping_quote_id.",
      "Sprint 1: label_url es un PDF placeholder; tracking_number = 'TRK-AR-' + 8 dígitos.",
    ],
  },
  {
    id: "list-shipments-by-order",
    tag: "SH2 · Envíos",
    method: "GET",
    path: "/api/v1/shipments",
    summary: "Listar los envíos de una orden",
    description:
      "Lo llama Buyer App con ?orderId=. Devuelve la lista paginada de shipments de esa orden (uno por vendedor).",
    caller: "Buyer App",
    auth: "X-Service-Token (S2S)",
    params: [
      {
        name: "orderId",
        in: "query",
        required: true,
        description: "ID de la orden del comprador.",
        example: "ord_01HZX5K8Q2",
      },
      {
        name: "page",
        in: "query",
        required: false,
        description: "Página (default 1).",
        example: "1",
      },
      {
        name: "limit",
        in: "query",
        required: false,
        description: "Tamaño de página (default 20).",
        example: "20",
      },
    ],
    responseStatus: 200,
    responseExample: {
      data: [
        {
          id: "shp_01HZX…",
          order_id: "ord_01HZX5K8Q2",
          seller_profile_id: "slp_01HZX5K8Q2",
          tracking_number: "TRK-AR-78901234",
          status: "in_transit",
        },
      ],
      pagination: { total: 1, page: 1, limit: 20, has_more: false },
    },
    errors: [
      { code: "BAD_REQUEST", status: 400, when: "Falta ?orderId en el llamado S2S." },
      { code: "UNAUTHORIZED", status: 401, when: "X-Service-Token ausente o inválido." },
    ],
  },
  {
    id: "get-shipment",
    tag: "SH2 · Envíos",
    method: "GET",
    path: "/api/v1/shipments/{shipmentId}",
    summary: "Detalle de un envío",
    description:
      "Detalle completo de un shipment (paquetes, tracking individual y global, pickups del pedido). Acepta S2S o JWT de cualquier usuario logueado.",
    caller: "Buyer / Seller App · UI propia",
    auth: "X-Service-Token (S2S) o JWT",
    params: [
      {
        name: "shipmentId",
        in: "path",
        required: true,
        description: "ID del envío (shp_…).",
        example: "shp_PEGAR_AQUI",
      },
    ],
    responseStatus: 200,
    responseExample: {
      id: "shp_01HZX…",
      status: "ready_for_pickup",
      tracking_number: "TRK-AR-78901234",
      order_tracking_number: "BMK-1234567890",
      packages: [{ id: "pkg_01HZX…", weight_grams: 14500 }],
    },
    errors: [
      { code: "NOT_FOUND", status: 404, when: "El shipment no existe." },
      { code: "UNAUTHORIZED", status: 401, when: "Sin S2S ni JWT válido." },
    ],
  },

  // ── SH3 · Paquetes ─────────────────────────────────────────────────────
  {
    id: "add-package",
    tag: "SH3 · Paquetes",
    method: "POST",
    path: "/api/v1/shipments/{shipmentId}/packages",
    summary: "Agregar un paquete a un envío",
    description:
      "Lo llama Seller App. Agrega un paquete a un shipment existente y recalcula weight_grams_total.",
    caller: "Seller App",
    auth: "X-Service-Token (S2S)",
    params: [
      {
        name: "shipmentId",
        in: "path",
        required: true,
        description: "ID del envío (shp_…).",
        example: "shp_PEGAR_AQUI",
      },
    ],
    requestBody: {
      weight_grams: 750,
      length_cm: 70,
      width_cm: 70,
      height_cm: 10,
      description: 'Cubierta Continental 29"',
    },
    responseStatus: 201,
    responseExample: {
      id: "pkg_01HZX…",
      weight_grams: 750,
      length_cm: 70,
      width_cm: 70,
      height_cm: 10,
      description: 'Cubierta Continental 29"',
    },
    errors: [
      { code: "NOT_FOUND", status: 404, when: "El shipment no existe." },
      { code: "BAD_REQUEST", status: 400, when: "Body inválido (zod)." },
    ],
  },

  // ── SH4 · Tracking events ──────────────────────────────────────────────
  {
    id: "create-tracking-event",
    tag: "SH4 · Tracking events",
    method: "POST",
    path: "/api/v1/shipments/{shipmentId}/tracking-events",
    summary: "Registrar un evento de tracking",
    description:
      "Lo puede llamar la integración del carrier (S2S) o un operador logístico (JWT). Si el evento cambia el estado del envío, valida la transición contra la máquina de estados y dispara las notificaciones a Buyer/Seller (diferidas en Sprint 1).",
    caller: "Carrier / integración (S2S) · Operador (JWT)",
    auth: "X-Service-Token (S2S) o JWT logistics",
    params: [
      {
        name: "shipmentId",
        in: "path",
        required: true,
        description: "ID del envío (shp_…).",
        example: "shp_PEGAR_AQUI",
      },
    ],
    requestBody: {
      event_type: "in_transit",
      location: "Centro de distribución Avellaneda",
      note: "Salió hacia destino",
      occurred_at: "2026-04-26T08:00:00Z",
    },
    responseStatus: 201,
    responseExample: {
      id: "evt_01HZX…",
      event_type: "in_transit",
      location: "Centro de distribución Avellaneda",
      note: "Salió hacia destino",
      occurred_at: "2026-04-26T08:00:00Z",
    },
    errors: [
      {
        code: "INVALID_TRANSITION",
        status: 409,
        when: "El evento implica una transición no permitida (details: { from, to, allowed }).",
      },
      {
        code: "SHIPMENT_ALREADY_ASSIGNED",
        status: 409,
        when: "picked_up sobre un pedido que ya tomó otro operador.",
      },
      { code: "NOT_FOUND", status: 404, when: "El shipment no existe." },
      { code: "BAD_REQUEST", status: 400, when: "Body inválido (zod)." },
    ],
    notes: [
      "event_type permitido por este endpoint: picked_up | in_transit | out_for_delivery | failed_delivery. (delivered va por POST /deliver; created/ready_for_pickup los pone el sistema.)",
      "occurred_at debe ser ISO 8601 con Z (ej 2026-04-26T08:00:00Z).",
    ],
  },
  {
    id: "list-tracking-events",
    tag: "SH4 · Tracking events",
    method: "GET",
    path: "/api/v1/shipments/{shipmentId}/tracking-events",
    summary: "Listar eventos de tracking",
    description:
      "Historial cronológico de eventos del envío. Acepta S2S o JWT de cualquier usuario logueado.",
    caller: "Buyer / Seller App · UI propia",
    auth: "X-Service-Token (S2S) o JWT",
    params: [
      {
        name: "shipmentId",
        in: "path",
        required: true,
        description: "ID del envío (shp_…).",
        example: "shp_PEGAR_AQUI",
      },
      {
        name: "page",
        in: "query",
        required: false,
        description: "Página (default 1).",
        example: "1",
      },
      {
        name: "limit",
        in: "query",
        required: false,
        description: "Tamaño de página (default 50).",
        example: "50",
      },
    ],
    responseStatus: 200,
    responseExample: {
      data: [
        {
          id: "evt_01HZX…",
          event_type: "created",
          location: null,
          note: "Etiqueta generada",
          occurred_at: "2026-04-25T14:40:00Z",
        },
        {
          id: "evt_02HZX…",
          event_type: "picked_up",
          location: "Caballito, CABA",
          note: "Retiro OK",
          occurred_at: "2026-04-26T07:30:00Z",
        },
      ],
      pagination: { total: 2, page: 1, limit: 50, has_more: false },
    },
    errors: [
      { code: "UNAUTHORIZED", status: 401, when: "Sin S2S ni JWT válido." },
    ],
  },
];

/** Endpoints agrupados por tag, preservando el orden de aparición. */
export function groupByTag(specs: EndpointSpec[]): [string, EndpointSpec[]][] {
  const groups = new Map<string, EndpointSpec[]>();
  for (const spec of specs) {
    const list = groups.get(spec.tag) ?? [];
    list.push(spec);
    groups.set(spec.tag, list);
  }
  return [...groups.entries()];
}
