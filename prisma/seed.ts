/**
 * Seed dev — Shipping App (ADR-005)
 *
 * Corre con:
 *   npm run db:seed              (limpia y reseedea TODO)
 *   npx prisma migrate reset     (drop + migrate + seed)
 *
 * ⚠️ NUNCA correr contra producción. Borra TODOS los shipments / quotes /
 * operadores / status history.
 *
 * Contenido del seed:
 *   - 45 shipping_rates (5 distancias × 3 pesos × 3 services).
 *   - 2 operadores demo (Juan en van, María en moto).
 *   - 8 pedidos con casos de uso que cubren single + multi-vendedor en
 *     distintos puntos de la máquina de estado. Diseñado para que las
 *     pantallas del operador, admin y pública muestren situaciones reales.
 *
 * Casos de uso del seed:
 *   1. DISPONIBLE_SINGLE       — single-origen, ready_for_pickup, sin operador
 *   2. EN_TRANSITO_SINGLE      — single-origen, in_transit, asignado a Juan
 *   3. ENTREGADO_SINGLE        — single-origen, delivered + proof, Juan
 *   4. FALLIDO_SINGLE          — single-origen, failed_delivery, María
 *   5. MULTI_INICIAL           — 2 orígenes, ambos ready_for_pickup, libre
 *   6. MULTI_PARCIAL           — 3 orígenes, 2 picked_up + 1 ready, Juan
 *   7. MULTI_EN_TRANSITO       — 2 orígenes, ambos in_transit, Juan
 *   8. MULTI_ENTREGADO         — 2 orígenes, ambos delivered + proofs, Juan
 *
 * Operadores en Clerk: para loguearte como Juan o María hay que crear esos
 * usuarios en Clerk Dashboard con publicMetadata.role="logistics" y los
 * clerk_user_id que aparecen abajo. AUTO_PROVISION_OPERATORS=true crea la
 * fila DB cuando se loguean por primera vez.
 */

import "dotenv/config";
import {
  AssignmentStatus,
  OperatorStatus,
  PrismaClient,
  ServiceLevel,
  ShipmentStatus,
  StatusHistorySource,
  TrackingEventType,
  VehicleType,
} from "../src/generated/prisma/client";

const prisma = new PrismaClient();

// ── Helpers ──────────────────────────────────────────────────────────────

function generateId(prefix: string): string {
  const hex = (
    globalThis.crypto ?? (require("crypto") as { randomUUID: () => string })
  )
    .randomUUID()
    .replace(/-/g, "");
  return `${prefix}_${hex.slice(0, 24)}`;
}

function generateTrackingNumber(): string {
  const digits = Math.floor(10_000_000 + Math.random() * 90_000_000);
  return `TRK-AR-${digits}`;
}

function generateGroupTrackingNumber(): string {
  const digits = Math.floor(1_000_000_000 + Math.random() * 9_000_000_000);
  return `BMK-${digits}`;
}

// Rollup del estado del pedido a partir de los estados de sus N shipments.
// Espejo de src/lib/shipment-rollup.ts (el seed no importa de src/lib).
const STATUS_ORDER: Record<ShipmentStatus, number> = {
  created: 0,
  ready_for_pickup: 1,
  picked_up: 2,
  in_transit: 3,
  out_for_delivery: 4,
  delivered: 5,
  failed_delivery: 6,
  returned: 7,
};
function rollupStatus(statuses: ShipmentStatus[]): ShipmentStatus {
  if (statuses.length === 0) return ShipmentStatus.created;
  if (statuses.every((s) => s === ShipmentStatus.delivered))
    return ShipmentStatus.delivered;
  if (statuses.some((s) => s === ShipmentStatus.failed_delivery))
    return ShipmentStatus.failed_delivery;
  if (statuses.some((s) => s === ShipmentStatus.returned))
    return ShipmentStatus.returned;
  return statuses.reduce(
    (least, s) => (STATUS_ORDER[s] < STATUS_ORDER[least] ? s : least),
    statuses[0],
  );
}

function daysAgo(d: number): Date {
  return new Date(Date.now() - d * 24 * 60 * 60 * 1000);
}

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

// Direcciones reutilizables (CPs reales del dataset).
interface SeedAddress {
  street: string;
  number: string;
  apartment?: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  receiver_name?: string;
}

const ADDR: Record<string, SeedAddress> = {
  caballito: {
    street: "Av. Rivadavia",
    number: "9000",
    city: "Caballito",
    province: "Buenos Aires",
    postal_code: "C1406",
    country: "AR",
  },
  villaCrespo: {
    street: "Av. Corrientes",
    number: "5800",
    city: "Villa Crespo",
    province: "Buenos Aires",
    postal_code: "C1414",
    country: "AR",
  },
  almagro: {
    street: "Av. Rivadavia",
    number: "3800",
    city: "Almagro",
    province: "Buenos Aires",
    postal_code: "C1205",
    country: "AR",
  },
  florida: {
    street: "Av. Maipú",
    number: "2400",
    city: "Florida",
    province: "Buenos Aires",
    postal_code: "B1602",
    country: "AR",
  },
  sanIsidro: {
    street: "Av. Centenario",
    number: "150",
    city: "San Isidro",
    province: "Buenos Aires",
    postal_code: "B1640",
    country: "AR",
  },
  // Destinos comprador
  buyerCaba: {
    street: "Av. Corrientes",
    number: "1234",
    apartment: "5B",
    city: "Almagro",
    province: "Buenos Aires",
    postal_code: "C1043",
    country: "AR",
    receiver_name: "María González",
  },
  buyerLaPlata: {
    street: "Calle 7",
    number: "1500",
    city: "La Plata",
    province: "Buenos Aires",
    postal_code: "B1900",
    country: "AR",
    receiver_name: "Carlos Rodríguez",
  },
};

// Sellers (refs opacas a Seller App).
const SELLERS = {
  pedalesPlata: "slp_pedalesplata",
  bikeShop: "slp_bikeshop",
  cicleria: "slp_cicleria_norte",
} as const;

const BUYERS = {
  maria: "byp_mariagonzalez",
  carlos: "byp_carlosrodriguez",
} as const;

// ── Tarifaría (idéntica al seed anterior) ─────────────────────────────────

const RATES = (() => {
  const distances = [
    { min: 0, max: 10, label: "local" },
    { min: 10, max: 50, label: "metro" },
    { min: 50, max: 150, label: "regional" },
    { min: 150, max: 500, label: "nacional-medio" },
    { min: 500, max: 999_999, label: "nacional-largo" },
  ];
  const weights = [
    { min: 0, max: 2000, mul: 1 },
    { min: 2001, max: 10000, mul: 1.8 },
    { min: 10001, max: 50000, mul: 3.5 },
  ];
  const baseStandard: Record<string, number> = {
    local: 250_000,
    metro: 350_000,
    regional: 500_000,
    "nacional-medio": 750_000,
    "nacional-largo": 1_200_000,
  };
  const services: Array<{
    level: ServiceLevel;
    carrier: string;
    serviceMul: number;
    days: [number, number];
  }> = [
    { level: ServiceLevel.standard, carrier: "andreani", serviceMul: 1, days: [3, 5] },
    { level: ServiceLevel.express, carrier: "andreani", serviceMul: 1.6, days: [1, 2] },
    { level: ServiceLevel.same_day, carrier: "propio", serviceMul: 2.4, days: [0, 0] },
  ];
  const rows: Array<{
    id: string;
    carrier: string;
    serviceLevel: ServiceLevel;
    distanceKmMin: number;
    distanceKmMax: number;
    weightGramsMin: number;
    weightGramsMax: number;
    costCents: number;
    estimatedDaysMin: number;
    estimatedDaysMax: number;
    active: boolean;
  }> = [];
  for (const w of weights) {
    for (const d of distances) {
      for (const s of services) {
        const sameDayOnLongDistance =
          s.level === ServiceLevel.same_day && d.min >= 150;
        const base = baseStandard[d.label] ?? 250_000;
        const cost = Math.round(base * w.mul * s.serviceMul);
        rows.push({
          id: generateId("rat"),
          carrier: s.carrier,
          serviceLevel: s.level,
          distanceKmMin: d.min,
          distanceKmMax: d.max,
          weightGramsMin: w.min,
          weightGramsMax: w.max,
          costCents: cost,
          estimatedDaysMin: s.days[0],
          estimatedDaysMax: s.days[1],
          active: !sameDayOnLongDistance,
        });
      }
    }
  }
  return rows;
})();

// ── Operadores ────────────────────────────────────────────────────────────

const OPERATORS = [
  {
    id: generateId("lop"),
    clerkUserId: "user_demo_juan",
    fullName: "Juan Pérez",
    email: "juan.perez@bicimarket.demo",
    phone: "+5491133333333",
    documentId: "30123456",
    vehicleType: VehicleType.van,
    licensePlate: "AB123CD",
    status: OperatorStatus.active,
  },
  {
    id: generateId("lop"),
    clerkUserId: "user_demo_maria",
    fullName: "María López",
    email: "maria.lopez@bicimarket.demo",
    phone: "+5491144444444",
    documentId: "32987654",
    vehicleType: VehicleType.motorcycle,
    licensePlate: "EF456GH",
    status: OperatorStatus.active,
  },
] as const;

// ── Diseño de cada escenario ──────────────────────────────────────────────

interface PickupSpec {
  sellerProfileId: string;
  pickupAddress: SeedAddress;
  packages: Array<{
    weight_grams: number;
    length_cm: number;
    width_cm: number;
    height_cm: number;
    description: string;
  }>;
}

interface ScenarioSpec {
  label: string;
  description: string;
  serviceLevel: ServiceLevel;
  shippingAddress: SeedAddress;
  buyerProfileId: string;
  pickups: PickupSpec[];
  /** Estado final al que llegamos. La función ejecuta todas las
   *  transiciones intermedias. */
  finalStatus: ShipmentStatus;
  /** Operador asignado a TODOS los pickups del pedido (o null). */
  assignedToClerkUserId: string | null;
  /** Hace cuántas horas se creó el primer shipment. */
  createdHoursAgo: number;
}

const PKG_BIKE = {
  weight_grams: 14500,
  length_cm: 180,
  width_cm: 60,
  height_cm: 110,
  description: "Bicicleta Trek Marlin 5",
};
const PKG_HELMET = {
  weight_grams: 800,
  length_cm: 35,
  width_cm: 30,
  height_cm: 25,
  description: "Casco MET Roar",
};
const PKG_TIRE = {
  weight_grams: 1200,
  length_cm: 75,
  width_cm: 75,
  height_cm: 10,
  description: 'Cubierta Continental 29"',
};
const PKG_KIT = {
  weight_grams: 600,
  length_cm: 30,
  width_cm: 20,
  height_cm: 10,
  description: "Kit luces + candado",
};

const SCENARIOS: ScenarioSpec[] = [
  {
    label: "DISPONIBLE_SINGLE",
    description: "Disponible para cualquier operador, single-origen",
    serviceLevel: ServiceLevel.standard,
    shippingAddress: ADDR.buyerCaba,
    buyerProfileId: BUYERS.maria,
    pickups: [
      {
        sellerProfileId: SELLERS.pedalesPlata,
        pickupAddress: ADDR.caballito,
        packages: [PKG_HELMET, PKG_TIRE],
      },
    ],
    finalStatus: ShipmentStatus.ready_for_pickup,
    assignedToClerkUserId: null,
    createdHoursAgo: 2,
  },
  {
    label: "EN_TRANSITO_SINGLE",
    description: "En tránsito, asignado a Juan",
    serviceLevel: ServiceLevel.express,
    shippingAddress: ADDR.buyerCaba,
    buyerProfileId: BUYERS.maria,
    pickups: [
      {
        sellerProfileId: SELLERS.bikeShop,
        pickupAddress: ADDR.almagro,
        packages: [PKG_BIKE],
      },
    ],
    finalStatus: ShipmentStatus.in_transit,
    assignedToClerkUserId: OPERATORS[0].clerkUserId,
    createdHoursAgo: 30,
  },
  {
    label: "ENTREGADO_SINGLE",
    description: "Entregado con foto, asignado a Juan",
    serviceLevel: ServiceLevel.standard,
    shippingAddress: ADDR.buyerLaPlata,
    buyerProfileId: BUYERS.carlos,
    pickups: [
      {
        sellerProfileId: SELLERS.bikeShop,
        pickupAddress: ADDR.villaCrespo,
        packages: [PKG_BIKE, PKG_KIT],
      },
    ],
    finalStatus: ShipmentStatus.delivered,
    assignedToClerkUserId: OPERATORS[0].clerkUserId,
    createdHoursAgo: 96,
  },
  {
    label: "FALLIDO_SINGLE",
    description: "Entrega fallida, asignado a María",
    serviceLevel: ServiceLevel.express,
    shippingAddress: ADDR.buyerCaba,
    buyerProfileId: BUYERS.maria,
    pickups: [
      {
        sellerProfileId: SELLERS.pedalesPlata,
        pickupAddress: ADDR.caballito,
        packages: [PKG_TIRE],
      },
    ],
    finalStatus: ShipmentStatus.failed_delivery,
    assignedToClerkUserId: OPERATORS[1].clerkUserId,
    createdHoursAgo: 48,
  },
  {
    label: "MULTI_INICIAL",
    description: "Multi-vendedor (2 orígenes), ambos disponibles para retirar",
    serviceLevel: ServiceLevel.standard,
    shippingAddress: ADDR.buyerCaba,
    buyerProfileId: BUYERS.maria,
    pickups: [
      {
        sellerProfileId: SELLERS.pedalesPlata,
        pickupAddress: ADDR.caballito,
        packages: [PKG_BIKE],
      },
      {
        sellerProfileId: SELLERS.bikeShop,
        pickupAddress: ADDR.villaCrespo,
        packages: [PKG_HELMET, PKG_KIT],
      },
    ],
    finalStatus: ShipmentStatus.ready_for_pickup,
    assignedToClerkUserId: null,
    createdHoursAgo: 1,
  },
  {
    label: "MULTI_PARCIAL",
    description: "Multi-vendedor (3 orígenes), 2 retirados 1 pendiente, Juan",
    serviceLevel: ServiceLevel.standard,
    shippingAddress: ADDR.buyerCaba,
    buyerProfileId: BUYERS.maria,
    pickups: [
      {
        sellerProfileId: SELLERS.pedalesPlata,
        pickupAddress: ADDR.caballito,
        packages: [PKG_BIKE],
      },
      {
        sellerProfileId: SELLERS.bikeShop,
        pickupAddress: ADDR.villaCrespo,
        packages: [PKG_HELMET],
      },
      {
        sellerProfileId: SELLERS.cicleria,
        pickupAddress: ADDR.florida,
        packages: [PKG_KIT, PKG_TIRE],
      },
    ],
    finalStatus: ShipmentStatus.picked_up, // se sobreescribe per-pickup abajo
    assignedToClerkUserId: OPERATORS[0].clerkUserId,
    createdHoursAgo: 6,
  },
  {
    label: "MULTI_EN_TRANSITO",
    description: "Multi-vendedor (2 orígenes), ambos en tránsito, Juan",
    serviceLevel: ServiceLevel.express,
    shippingAddress: ADDR.buyerLaPlata,
    buyerProfileId: BUYERS.carlos,
    pickups: [
      {
        sellerProfileId: SELLERS.bikeShop,
        pickupAddress: ADDR.villaCrespo,
        packages: [PKG_BIKE],
      },
      {
        sellerProfileId: SELLERS.cicleria,
        pickupAddress: ADDR.sanIsidro,
        packages: [PKG_HELMET, PKG_TIRE],
      },
    ],
    finalStatus: ShipmentStatus.in_transit,
    assignedToClerkUserId: OPERATORS[0].clerkUserId,
    createdHoursAgo: 12,
  },
  {
    label: "MULTI_ENTREGADO",
    description: "Multi-vendedor (2 orígenes), ambos entregados con foto, Juan",
    serviceLevel: ServiceLevel.standard,
    shippingAddress: ADDR.buyerCaba,
    buyerProfileId: BUYERS.maria,
    pickups: [
      {
        sellerProfileId: SELLERS.pedalesPlata,
        pickupAddress: ADDR.caballito,
        packages: [PKG_BIKE, PKG_KIT],
      },
      {
        sellerProfileId: SELLERS.bikeShop,
        pickupAddress: ADDR.almagro,
        packages: [PKG_HELMET],
      },
    ],
    finalStatus: ShipmentStatus.delivered,
    assignedToClerkUserId: OPERATORS[0].clerkUserId,
    createdHoursAgo: 168,
  },
];

// Cadena de estados para llegar a cada finalStatus.
const TRANSITIONS_TO: Record<ShipmentStatus, ShipmentStatus[]> = {
  created: [],
  ready_for_pickup: [],
  picked_up: [ShipmentStatus.picked_up],
  in_transit: [ShipmentStatus.picked_up, ShipmentStatus.in_transit],
  out_for_delivery: [
    ShipmentStatus.picked_up,
    ShipmentStatus.in_transit,
    ShipmentStatus.out_for_delivery,
  ],
  delivered: [
    ShipmentStatus.picked_up,
    ShipmentStatus.in_transit,
    ShipmentStatus.out_for_delivery,
    ShipmentStatus.delivered,
  ],
  failed_delivery: [
    ShipmentStatus.picked_up,
    ShipmentStatus.in_transit,
    ShipmentStatus.out_for_delivery,
    ShipmentStatus.failed_delivery,
  ],
  returned: [
    ShipmentStatus.picked_up,
    ShipmentStatus.in_transit,
    ShipmentStatus.out_for_delivery,
    ShipmentStatus.failed_delivery,
    ShipmentStatus.returned,
  ],
};

const STATUS_TO_EVENT: Record<ShipmentStatus, TrackingEventType | null> = {
  created: null, // los seedeamos manualmente
  ready_for_pickup: TrackingEventType.ready_for_pickup,
  picked_up: TrackingEventType.picked_up,
  in_transit: TrackingEventType.in_transit,
  out_for_delivery: TrackingEventType.out_for_delivery,
  delivered: TrackingEventType.delivered,
  failed_delivery: TrackingEventType.failed_delivery,
  returned: TrackingEventType.returned,
};

// ── Lógica del seed ───────────────────────────────────────────────────────

// Estado final por pickup (MULTI_PARCIAL: el primero queda ready_for_pickup).
function pickupFinalStatusFor(spec: ScenarioSpec, i: number): ShipmentStatus {
  if (spec.label === "MULTI_PARCIAL" && i === 0) {
    return ShipmentStatus.ready_for_pickup;
  }
  return spec.finalStatus;
}

async function seedScenario(spec: ScenarioSpec) {
  const orderId = generateId("ord");
  const baseDate = hoursAgo(spec.createdHoursAgo);

  // ADR-006: un ShipmentGroup por pedido, dueño del tracking GLOBAL ("BMK-…")
  // y del estado consolidado (rollup persistido). La asignación del operador
  // vive a nivel grupo (un operador toma el pedido entero).
  const groupId = generateId("grp");
  const pickupStatuses = spec.pickups.map((_, i) => pickupFinalStatusFor(spec, i));
  const groupStatus = rollupStatus(pickupStatuses);

  await prisma.shipmentGroup.create({
    data: {
      id: groupId,
      orderId,
      buyerProfileId: spec.buyerProfileId,
      trackingNumber: generateGroupTrackingNumber(),
      status: groupStatus,
      serviceLevel: spec.serviceLevel,
      shippingAddressSnapshot: spec.shippingAddress as unknown as object,
      originsCount: spec.pickups.length,
      assignedOperatorClerkUserId: spec.assignedToClerkUserId,
      createdAt: baseDate,
      updatedAt: baseDate,
    },
  });

  // Para crear la asignación a nivel grupo después del loop.
  let latestDeliveredAt: Date | null = null;

  for (let i = 0; i < spec.pickups.length; i++) {
    const pickup = spec.pickups[i];
    const pickupFinalStatus = pickupFinalStatusFor(spec, i);

    const shipmentId = generateId("shp");
    const quoteId = generateId("qte");
    const trackingNumber = generateTrackingNumber();
    const orderSellerGroupId = generateId("osg");
    const salesOrderId = generateId("sor");

    const weightTotal = pickup.packages.reduce(
      (s, p) => s + p.weight_grams,
      0,
    );

    // Spread temporal: cada pickup se crea ~5 min después del primero.
    const createdAt = new Date(baseDate.getTime() + i * 5 * 60 * 1000);

    await prisma.shippingQuote.create({
      data: {
        id: quoteId,
        sellerProfileId: pickup.sellerProfileId,
        fromAddressSnapshot: pickup.pickupAddress as object,
        toAddressSnapshot: spec.shippingAddress as object,
        serviceLevel: spec.serviceLevel,
        carrier: "andreani",
        costCents: 1_200_000, // placeholder dev
        weightGramsTotal: weightTotal,
        packagesCount: pickup.packages.length,
        packagesSnapshot: pickup.packages as unknown as object,
        estimatedDaysMin: 3,
        estimatedDaysMax: 5,
        expiresAt: new Date(createdAt.getTime() + 60 * 60 * 1000),
        createdAt,
      },
    });

    const transitions = TRANSITIONS_TO[pickupFinalStatus];
    const shippedAt =
      transitions.includes(ShipmentStatus.in_transit) ||
      transitions.includes(ShipmentStatus.picked_up)
        ? new Date(createdAt.getTime() + 60 * 60 * 1000)
        : null;
    const deliveredAt =
      pickupFinalStatus === ShipmentStatus.delivered
        ? new Date(createdAt.getTime() + 24 * 60 * 60 * 1000)
        : null;

    await prisma.shipment.create({
      data: {
        id: shipmentId,
        orderId,
        orderSellerGroupId,
        salesOrderId,
        sellerProfileId: pickup.sellerProfileId,
        buyerProfileId: spec.buyerProfileId,
        shipmentGroupId: groupId,
        shippingQuoteId: quoteId,
        carrier: "andreani",
        serviceLevel: spec.serviceLevel,
        trackingNumber,
        labelUrl: "/labels/sample.pdf",
        status: pickupFinalStatus,
        weightGramsTotal: weightTotal,
        costCents: 1_200_000,
        shippingAddressSnapshot: spec.shippingAddress as unknown as object,
        pickupAddressSnapshot: pickup.pickupAddress as unknown as object,
        shippedAt,
        deliveredAt,
        createdAt,
        updatedAt: createdAt,
      },
    });

    // Packages
    for (const p of pickup.packages) {
      await prisma.package.create({
        data: {
          id: generateId("pkg"),
          shipmentId,
          weightGrams: p.weight_grams,
          lengthCm: p.length_cm,
          widthCm: p.width_cm,
          heightCm: p.height_cm,
          description: p.description,
          createdAt,
        },
      });
    }

    // Tracking events: created + ready_for_pickup + cadena hasta el final
    const eventChain: Array<{ type: TrackingEventType; at: Date }> = [
      { type: TrackingEventType.created, at: createdAt },
      {
        type: TrackingEventType.ready_for_pickup,
        at: new Date(createdAt.getTime() + 60 * 1000),
      },
    ];
    transitions.forEach((status, idx) => {
      const ev = STATUS_TO_EVENT[status];
      if (!ev) return;
      eventChain.push({
        type: ev,
        at: new Date(createdAt.getTime() + (idx + 1) * 60 * 60 * 1000),
      });
    });

    await prisma.trackingEvent.createMany({
      data: eventChain.map((e) => ({
        id: generateId("evt"),
        shipmentId,
        eventType: e.type,
        occurredAt: e.at,
        createdAt: e.at,
        location:
          e.type === TrackingEventType.picked_up
            ? `${pickup.pickupAddress.city}, ${pickup.pickupAddress.province}`
            : null,
      })),
    });

    // Status history: created → ready_for_pickup + cada transición
    let prev: ShipmentStatus = ShipmentStatus.created;
    const histRows: Array<{
      id: string;
      shipmentId: string;
      fromStatus: ShipmentStatus;
      toStatus: ShipmentStatus;
      source: StatusHistorySource;
      occurredAt: Date;
      createdAt: Date;
    }> = [
      {
        id: generateId("ssh"),
        shipmentId,
        fromStatus: ShipmentStatus.created,
        toStatus: ShipmentStatus.ready_for_pickup,
        source: StatusHistorySource.system,
        occurredAt: new Date(createdAt.getTime() + 60 * 1000),
        createdAt: new Date(createdAt.getTime() + 60 * 1000),
      },
    ];
    prev = ShipmentStatus.ready_for_pickup;
    transitions.forEach((status, idx) => {
      histRows.push({
        id: generateId("ssh"),
        shipmentId,
        fromStatus: prev,
        toStatus: status,
        source: StatusHistorySource.logistics,
        occurredAt: new Date(createdAt.getTime() + (idx + 1) * 60 * 60 * 1000),
        createdAt: new Date(createdAt.getTime() + (idx + 1) * 60 * 60 * 1000),
      });
      prev = status;
    });
    await prisma.shipmentStatusHistory.createMany({ data: histRows });

    if (deliveredAt && (!latestDeliveredAt || deliveredAt > latestDeliveredAt)) {
      latestDeliveredAt = deliveredAt;
    }

    // Delivery proof si está delivered
    // proof_photo_url es NOT NULL en la DB actual (migración init) aunque el
    // schema lo permite nullable. Mandamos placeholder para no fallar el seed;
    // el componente de UI soporta null igualmente.
    if (pickupFinalStatus === ShipmentStatus.delivered && deliveredAt) {
      await prisma.deliveryProof.create({
        data: {
          id: generateId("prf"),
          shipmentId,
          proofPhotoUrl: "/labels/sample.pdf",
          signatureImageUrl: null,
          note: "Entregado en portería · firmó el conserje",
          deliveredAt,
          createdAt: deliveredAt,
        },
      });
    }
  }

  // ADR-006: una sola asignación a nivel GRUPO (el operador toma el pedido
  // entero). Se crea cuando el pedido tiene operador (ej. MULTI_PARCIAL: Juan
  // ya retiró 2 de 3, aunque el rollup siga en ready_for_pickup).
  if (spec.assignedToClerkUserId) {
    const assignmentStatus =
      groupStatus === ShipmentStatus.delivered
        ? AssignmentStatus.delivered
        : AssignmentStatus.picked_up;
    await prisma.deliveryAssignment.create({
      data: {
        id: generateId("dla"),
        shipmentGroupId: groupId,
        operatorClerkUserId: spec.assignedToClerkUserId,
        status: assignmentStatus,
        assignedAt: new Date(baseDate.getTime() + 30 * 60 * 1000),
        completedAt: latestDeliveredAt,
        createdAt: new Date(baseDate.getTime() + 30 * 60 * 1000),
        updatedAt: latestDeliveredAt ?? new Date(),
      },
    });
  }
}

async function main() {
  console.log("🌱 Seeding Shipping App DB (ADR-005)...\n");

  // ── Limpieza ───────────────────────────────────────────────────────────
  console.log("→ Limpiando datos previos...");
  // Cascade desde ShipmentGroup elimina shipments (y desde ahí packages,
  // events, proofs, history) + assignments por grupo. Borramos shipments
  // sueltos por las dudas (no debería quedar ninguno sin grupo).
  await prisma.shipmentGroup.deleteMany({});
  await prisma.shipment.deleteMany({});
  await prisma.shippingQuote.deleteMany({});
  await prisma.logisticsOperator.deleteMany({});
  await prisma.shippingRate.deleteMany({});

  // ── Rates ──────────────────────────────────────────────────────────────
  console.log(`→ Insertando ${RATES.length} shipping_rates...`);
  await prisma.shippingRate.createMany({ data: RATES });

  // ── Operadores ─────────────────────────────────────────────────────────
  console.log(`→ Insertando ${OPERATORS.length} operadores demo...`);
  await prisma.logisticsOperator.createMany({ data: OPERATORS as never });

  // ── Escenarios ─────────────────────────────────────────────────────────
  console.log(`→ Creando ${SCENARIOS.length} escenarios de uso...`);
  for (const sc of SCENARIOS) {
    console.log(`   • ${sc.label} — ${sc.description}`);
    await seedScenario(sc);
  }

  console.log("\n✅ Seed completo.\n");
  console.log("Resumen:");
  console.log(`  - ${RATES.length} shipping_rates`);
  console.log(`  - ${OPERATORS.length} operadores demo`);
  for (const op of OPERATORS) {
    console.log(`     ◦ ${op.fullName} (${op.clerkUserId})`);
  }
  console.log(`  - ${SCENARIOS.length} pedidos:`);
  for (const sc of SCENARIOS) {
    console.log(
      `     ◦ ${sc.label} · ${sc.pickups.length} origen(es) · estado final ${sc.finalStatus}`,
    );
  }
  console.log("");
  console.log("📝 Para loguearte como operador:");
  console.log("   1. Creá users en Clerk con publicMetadata.role='logistics'");
  console.log("   2. Usá los clerk_user_ids de arriba.");
  console.log("   3. AUTO_PROVISION_OPERATORS=true sincroniza on-login.");
  console.log(
    "   4. Para entrar como admin: publicMetadata.admin=true en Clerk.",
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
