import {
  AssignmentStatus,
  OperatorStatus,
  type Prisma,
  type PrismaClient,
  ServiceLevel,
  ShipmentStatus,
  StatusHistorySource,
  TrackingEventType,
  VehicleType,
} from "../src/generated/prisma/client";

type DatasetNumber = 1 | 2;

interface SeedAddress {
  street: string;
  number: string;
  apartment?: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
}

interface PackageSeed {
  weight_grams: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
}

interface ShipmentSeed {
  sellerNumber: number;
  sellerProfileId: string;
  orderSellerGroupId: string;
  salesOrderId: string;
  status: ShipmentStatus;
  createdAt: Date;
  weightGramsTotal: number;
  costCents: number;
  packages: PackageSeed[];
}

const END = new Date("2026-06-24T23:59:59Z");

const DESTINATION: SeedAddress = {
  street: "Av. Corrientes",
  number: "1234",
  apartment: "5B",
  city: "CABA",
  province: "Buenos Aires",
  postal_code: "C1043",
  country: "AR",
};

const SELLER_PICKUPS: Record<number, SeedAddress> = {
  1: { street: "Av. Rivadavia", number: "9000", city: "Caballito", province: "Buenos Aires", postal_code: "C1406", country: "AR" },
  2: { street: "Av. Corrientes", number: "5432", city: "Almagro", province: "Buenos Aires", postal_code: "C1043", country: "AR" },
  3: { street: "Calle 12", number: "3456", city: "La Plata", province: "Buenos Aires", postal_code: "B1900", country: "AR" },
  4: { street: "Av. San Martín", number: "2100", city: "Córdoba", province: "Córdoba", postal_code: "X5000", country: "AR" },
  5: { street: "Sarmiento", number: "789", city: "Rosario", province: "Santa Fe", postal_code: "S2000", country: "AR" },
  7: { street: "Av. Libertador", number: "15000", city: "San Isidro", province: "Buenos Aires", postal_code: "B1642", country: "AR" },
  8: { street: "Mitre", number: "3210", city: "Quilmes", province: "Buenos Aires", postal_code: "B1878", country: "AR" },
  10: { street: "Alvear", number: "890", city: "Zárate", province: "Buenos Aires", postal_code: "B2800", country: "AR" },
};

const SELLERS_BY_ORDER: number[][] = [
  [1], [2], [3], [4], [5], [1], [2], [3], [4], [5],
  [1], [2], [3], [4], [5], [7], [8], [1, 2], [3, 4], [5, 7],
  [8, 10], [1, 3, 5], [2, 4], [7, 8], [10], [1], [2], [3], [4], [5],
];

const STATUS_PATHS: Record<ShipmentStatus, ShipmentStatus[]> = {
  created: [ShipmentStatus.created],
  ready_for_pickup: [ShipmentStatus.created, ShipmentStatus.ready_for_pickup],
  picked_up: [ShipmentStatus.created, ShipmentStatus.ready_for_pickup, ShipmentStatus.picked_up],
  in_transit: [ShipmentStatus.created, ShipmentStatus.ready_for_pickup, ShipmentStatus.picked_up, ShipmentStatus.in_transit],
  out_for_delivery: [ShipmentStatus.created, ShipmentStatus.ready_for_pickup, ShipmentStatus.picked_up, ShipmentStatus.in_transit, ShipmentStatus.out_for_delivery],
  delivered: [ShipmentStatus.created, ShipmentStatus.ready_for_pickup, ShipmentStatus.picked_up, ShipmentStatus.in_transit, ShipmentStatus.out_for_delivery, ShipmentStatus.delivered],
  failed_delivery: [ShipmentStatus.created, ShipmentStatus.ready_for_pickup, ShipmentStatus.picked_up, ShipmentStatus.in_transit, ShipmentStatus.out_for_delivery, ShipmentStatus.failed_delivery],
  returned: [ShipmentStatus.created, ShipmentStatus.ready_for_pickup, ShipmentStatus.picked_up, ShipmentStatus.in_transit, ShipmentStatus.out_for_delivery, ShipmentStatus.failed_delivery, ShipmentStatus.returned],
};

const EVENT_BY_STATUS: Record<ShipmentStatus, TrackingEventType> = {
  created: TrackingEventType.created,
  ready_for_pickup: TrackingEventType.ready_for_pickup,
  picked_up: TrackingEventType.picked_up,
  in_transit: TrackingEventType.in_transit,
  out_for_delivery: TrackingEventType.out_for_delivery,
  delivered: TrackingEventType.delivered,
  failed_delivery: TrackingEventType.failed_delivery,
  returned: TrackingEventType.returned,
};

const EVENT_OFFSETS_HOURS: Record<ShipmentStatus, number> = {
  created: 0,
  ready_for_pickup: 4,
  picked_up: 24,
  in_transit: 36,
  out_for_delivery: 60,
  delivered: 72,
  failed_delivery: 72,
  returned: 120,
};

export const OPERATORS = [
  { id: "lop_operator_001", clerkUserId: "user_logistics_001", fullName: "Juan Pérez", email: "juan.perez@logistica.com", phone: "+5491122221111", documentId: "30123456", vehicleType: VehicleType.van, licensePlate: "AB123CD", status: OperatorStatus.active },
  { id: "lop_operator_002", clerkUserId: "user_logistics_002", fullName: "María Gómez", email: "maria.gomez@logistica.com", phone: "+5491122222222", documentId: "31234567", vehicleType: VehicleType.motorcycle, licensePlate: "CD456EF", status: OperatorStatus.active },
  { id: "lop_operator_003", clerkUserId: "user_logistics_003", fullName: "Carlos Sánchez", email: "carlos.sanchez@logistica.com", phone: "+5491122223333", documentId: "32345678", vehicleType: VehicleType.truck, licensePlate: "EF789GH", status: OperatorStatus.active },
  { id: "lop_operator_004", clerkUserId: "user_logistics_004", fullName: "Lucía Díaz", email: "lucia.diaz@logistica.com", phone: "+5491122224444", documentId: "33456789", vehicleType: VehicleType.car, licensePlate: "GH012IJ", status: OperatorStatus.active },
  { id: "lop_operator_005", clerkUserId: "user_logistics_005", fullName: "Pedro Martínez", email: "pedro.martinez@logistica.com", phone: "+5491122225555", documentId: "34567890", vehicleType: VehicleType.van, licensePlate: "IJ345KL", status: OperatorStatus.active },
  { id: "lop_operator_006", clerkUserId: "user_logistics_006", fullName: "Ana Rodríguez", email: "ana.rodriguez@logistica.com", phone: "+5491122226666", documentId: "35678901", vehicleType: VehicleType.motorcycle, licensePlate: "KL678MN", status: OperatorStatus.active },
  { id: "lop_operator_007", clerkUserId: "user_logistics_007", fullName: "Diego Fernández", email: "diego.fernandez@logistica.com", phone: "+5491122227777", documentId: "36789012", vehicleType: VehicleType.van, licensePlate: "MN901OP", status: OperatorStatus.inactive },
  { id: "lop_operator_008", clerkUserId: "user_logistics_008", fullName: "Valentina Torres", email: "valentina.torres@logistica.com", phone: "+5491122228888", documentId: "37890123", vehicleType: VehicleType.truck, licensePlate: "OP234QR", status: OperatorStatus.active },
] as const;

const ACTIVE_OPERATORS = OPERATORS.filter(
  (operator) => operator.status === OperatorStatus.active,
);

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function asJson(value: object): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function daysBefore(random: () => number, days: number): Date {
  const date = new Date(END);
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(6 + Math.floor(random() * 16), Math.floor(random() * 60), 0, 0);
  return date;
}

function pad(value: number, length = 3): string {
  return String(value).padStart(length, "0");
}

function ids(dataset: DatasetNumber, orderNumber: number, sellerNumber: number) {
  if (dataset === 2) {
    return {
      orderId: `ord2_buyer_${pad(orderNumber)}`,
      buyerProfileId: `byp2_buyer_${pad(((orderNumber - 1) % 25) + 1)}`,
      sellerProfileId: `slp2_seller_${pad(sellerNumber)}`,
      orderSellerGroupId: `osg2_ord2_buyer_${pad(orderNumber)}_slp2_seller_${pad(sellerNumber)}`,
      salesOrderId: `sor2_slp2_seller_${pad(sellerNumber)}_${pad(orderNumber)}`,
    };
  }
  return {
    orderId: `ord_buyer_${pad(orderNumber)}`,
    buyerProfileId: `byp_buyer_${pad(((orderNumber - 1) % 25) + 1)}`,
    sellerProfileId: `slp_seller_${pad(sellerNumber)}`,
    orderSellerGroupId: `osg_ord_buyer_${pad(orderNumber)}_slp_seller_${pad(sellerNumber)}`,
    salesOrderId: `sor_slp_seller_${pad(sellerNumber)}_${pad(orderNumber)}`,
  };
}

function statusForShipment(index: number): ShipmentStatus {
  if (index < 10) return ShipmentStatus.delivered;
  if (index < 18) return ShipmentStatus.in_transit;
  if (index < 25) return ShipmentStatus.ready_for_pickup;
  if (index < 30) return ShipmentStatus.picked_up;
  if (index < 32) return ShipmentStatus.failed_delivery;
  if (index < 34) return ShipmentStatus.returned;
  return ShipmentStatus.created;
}

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

export function rollupSeedStatuses(statuses: ShipmentStatus[]): ShipmentStatus {
  if (statuses.every((status) => status === ShipmentStatus.delivered)) {
    return ShipmentStatus.delivered;
  }
  if (statuses.includes(ShipmentStatus.failed_delivery)) {
    return ShipmentStatus.failed_delivery;
  }
  if (statuses.includes(ShipmentStatus.returned)) {
    return ShipmentStatus.returned;
  }
  return statuses.reduce((least, status) =>
    STATUS_ORDER[status] < STATUS_ORDER[least] ? status : least,
  );
}

function assignmentStatus(status: ShipmentStatus): AssignmentStatus {
  if (status === ShipmentStatus.delivered) return AssignmentStatus.delivered;
  if (status === ShipmentStatus.returned) return AssignmentStatus.cancelled;
  if (
    status === ShipmentStatus.picked_up ||
    status === ShipmentStatus.in_transit ||
    status === ShipmentStatus.out_for_delivery ||
    status === ShipmentStatus.failed_delivery
  ) {
    return AssignmentStatus.picked_up;
  }
  return AssignmentStatus.assigned;
}

function eventLocation(status: ShipmentStatus, pickup: SeedAddress): string | null {
  if (status === ShipmentStatus.picked_up) return `${pickup.city}, ${pickup.province}`;
  if (status === ShipmentStatus.delivered || status === ShipmentStatus.failed_delivery) {
    return `${DESTINATION.street} ${DESTINATION.number}`;
  }
  if (status === ShipmentStatus.returned) return `${pickup.city}, ${pickup.province}`;
  if (status === ShipmentStatus.in_transit || status === ShipmentStatus.out_for_delivery) {
    return "Centro de distribución Avellaneda";
  }
  return null;
}

export async function seedLogisticsOperators(prisma: PrismaClient): Promise<void> {
  for (let index = 0; index < OPERATORS.length; index += 1) {
    const operator = OPERATORS[index];
    const createdAt = new Date(END.getTime() - (84 - index * 8) * 24 * 60 * 60 * 1000);
    await prisma.logisticsOperator.create({
      data: { ...operator, createdAt, updatedAt: createdAt },
    });
  }
}

export async function seedShippingDataset(
  prisma: PrismaClient,
  dataset: DatasetNumber,
): Promise<void> {
  const random = mulberry32(20_260_624 + dataset);
  let shipmentIndex = 0;

  for (let orderIndex = 0; orderIndex < SELLERS_BY_ORDER.length; orderIndex += 1) {
    const orderNumber = orderIndex + 1;
    const sellerNumbers = SELLERS_BY_ORDER[orderIndex];
    const firstIds = ids(dataset, orderNumber, sellerNumbers[0]);
    const groupId = `grp_${firstIds.orderId}`;
    const groupCreatedAt = daysBefore(random, Math.floor(random() * 82));

    const shipments: ShipmentSeed[] = sellerNumbers.map((sellerNumber, pickupIndex) => {
      const externalIds = ids(dataset, orderNumber, sellerNumber);
      const packagesCount = 1 + Math.floor(random() * 2);
      const weightGramsTotal = 3_000 + Math.floor(random() * 15_000);
      const packages = Array.from({ length: packagesCount }, () => ({
        weight_grams: Math.floor(weightGramsTotal / packagesCount),
        length_cm: 50 + Math.floor(random() * 100),
        width_cm: 30 + Math.floor(random() * 40),
        height_cm: 10 + Math.floor(random() * 60),
      }));
      const shipment: ShipmentSeed = {
        sellerNumber,
        sellerProfileId: externalIds.sellerProfileId,
        orderSellerGroupId: externalIds.orderSellerGroupId,
        salesOrderId: externalIds.salesOrderId,
        status: statusForShipment(shipmentIndex),
        createdAt: new Date(groupCreatedAt.getTime() + pickupIndex * 5 * 60 * 1000),
        weightGramsTotal,
        costCents: 500_000 + Math.floor(random() * 3_000_000),
        packages,
      };
      shipmentIndex += 1;
      return shipment;
    });

    const groupStatus = rollupSeedStatuses(shipments.map((shipment) => shipment.status));
    const operator = ACTIVE_OPERATORS[(orderIndex + dataset - 1) % ACTIVE_OPERATORS.length];
    const latestAt = shipments.reduce((latest, shipment) => {
      const path = STATUS_PATHS[shipment.status];
      const finalAt = addHours(shipment.createdAt, EVENT_OFFSETS_HOURS[path.at(-1)!]);
      return finalAt > latest ? finalAt : latest;
    }, groupCreatedAt);

    await prisma.$transaction(async (tx) => {
      await tx.shipmentGroup.create({
        data: {
          id: groupId,
          orderId: firstIds.orderId,
          buyerProfileId: firstIds.buyerProfileId,
          trackingNumber: `BMK-${dataset}${pad(orderNumber, 9)}`,
          status: groupStatus,
          serviceLevel: ServiceLevel.standard,
          shippingAddressSnapshot: asJson(DESTINATION),
          originsCount: shipments.length,
          assignedOperatorClerkUserId: operator.clerkUserId,
          createdAt: groupCreatedAt,
          updatedAt: latestAt,
        },
      });

      for (let pickupIndex = 0; pickupIndex < shipments.length; pickupIndex += 1) {
        const shipment = shipments[pickupIndex];
        const pickup = SELLER_PICKUPS[shipment.sellerNumber];
        const quoteId = `qte_${firstIds.orderId}_${shipment.sellerProfileId}`;
        const shipmentId = `shp_${firstIds.orderId}_${shipment.sellerProfileId}`;
        const path = STATUS_PATHS[shipment.status];
        const eventDates = new Map(
          path.map((status) => [status, addHours(shipment.createdAt, EVENT_OFFSETS_HOURS[status])]),
        );
        const shippedAt = eventDates.get(ShipmentStatus.picked_up) ?? null;
        const deliveredAt = eventDates.get(ShipmentStatus.delivered) ?? null;

        await tx.shippingQuote.create({
          data: {
            id: quoteId,
            sellerProfileId: shipment.sellerProfileId,
            fromAddressSnapshot: asJson(pickup),
            toAddressSnapshot: asJson(DESTINATION),
            serviceLevel: ServiceLevel.standard,
            carrier: "andreani",
            costCents: shipment.costCents,
            currency: "ARS",
            weightGramsTotal: shipment.weightGramsTotal,
            packagesCount: shipment.packages.length,
            packagesSnapshot: asJson(shipment.packages),
            estimatedDaysMin: 3,
            estimatedDaysMax: 6,
            expiresAt: addHours(shipment.createdAt, 1),
            createdAt: shipment.createdAt,
          },
        });

        await tx.shipment.create({
          data: {
            id: shipmentId,
            orderId: firstIds.orderId,
            orderSellerGroupId: shipment.orderSellerGroupId,
            salesOrderId: shipment.salesOrderId,
            sellerProfileId: shipment.sellerProfileId,
            buyerProfileId: firstIds.buyerProfileId,
            shipmentGroupId: groupId,
            shippingQuoteId: quoteId,
            carrier: "andreani",
            serviceLevel: ServiceLevel.standard,
            trackingNumber: `TRK-AR-${dataset}${pad(shipmentIndex - shipments.length + pickupIndex + 1, 7)}`,
            labelUrl: `https://cdn.bicimarket.com/labels/${shipmentId}.pdf`,
            status: shipment.status,
            weightGramsTotal: shipment.weightGramsTotal,
            costCents: shipment.costCents,
            currency: "ARS",
            shippingAddressSnapshot: asJson(DESTINATION),
            pickupAddressSnapshot: asJson(pickup),
            shippedAt,
            deliveredAt,
            createdAt: shipment.createdAt,
            updatedAt: eventDates.get(path.at(-1)!)!,
          },
        });

        await tx.package.createMany({
          data: shipment.packages.map((packageSeed, packageIndex) => ({
            id: `pkg_${shipmentId}_${packageIndex + 1}`,
            shipmentId,
            weightGrams: packageSeed.weight_grams,
            lengthCm: packageSeed.length_cm,
            widthCm: packageSeed.width_cm,
            heightCm: packageSeed.height_cm,
            description: packageIndex === 0 ? "Paquete principal" : "Paquete secundario",
            labelUrl: shipment.status === ShipmentStatus.created ? null : `https://cdn.bicimarket.com/labels/${shipmentId}_pkg${packageIndex + 1}.pdf`,
            createdAt: shipment.createdAt,
          })),
        });

        await tx.trackingEvent.createMany({
          data: path.map((status, eventIndex) => ({
            id: `evt_${shipmentId}_${eventIndex + 1}`,
            shipmentId,
            eventType: EVENT_BY_STATUS[status],
            location: eventLocation(status, pickup),
            note: status === ShipmentStatus.created ? "Etiqueta generada" : null,
            occurredAt: eventDates.get(status)!,
            createdAt: eventDates.get(status)!,
          })),
        });

        if (path.length > 1) {
          await tx.shipmentStatusHistory.createMany({
            data: path.slice(1).map((status, historyIndex) => ({
              id: `ssh_${shipmentId}_${historyIndex + 1}`,
              shipmentId,
              fromStatus: path[historyIndex],
              toStatus: status,
              source: StatusHistorySource.system,
              occurredAt: eventDates.get(status)!,
              createdAt: eventDates.get(status)!,
            })),
          });
        }

        if (deliveredAt) {
          await tx.deliveryProof.create({
            data: {
              id: `prf_${shipmentId}`,
              shipmentId,
              proofPhotoUrl: `https://cdn.bicimarket.com/proofs/${shipmentId}.jpg`,
              signatureImageUrl: `https://cdn.bicimarket.com/proofs/sign_${shipmentId}.png`,
              note: "Entregado al cliente",
              deliveredAt,
              createdAt: deliveredAt,
            },
          });
        }
      }

      const assignmentCompletedAt =
        groupStatus === ShipmentStatus.delivered || groupStatus === ShipmentStatus.returned
          ? latestAt
          : null;
      const assignedAt = addHours(groupCreatedAt, 2);
      await tx.deliveryAssignment.create({
        data: {
          id: `dla_${groupId}`,
          shipmentGroupId: groupId,
          operatorClerkUserId: operator.clerkUserId,
          status: assignmentStatus(groupStatus),
          assignedAt,
          completedAt: assignmentCompletedAt,
          createdAt: assignedAt,
          updatedAt: assignmentCompletedAt ?? latestAt,
        },
      });
    }, { maxWait: 10_000, timeout: 20_000 });
  }
}
