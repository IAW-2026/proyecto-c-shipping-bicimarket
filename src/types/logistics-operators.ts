import type {
  VehicleType as PrismaVehicleType,
  OperatorStatus as PrismaOperatorStatus,
} from "@/generated/prisma/enums";

export type VehicleType = "motorcycle" | "car" | "van" | "truck";
export type OperatorStatus = "active" | "inactive" | "suspended";

type _checkVehicleType = [PrismaVehicleType] extends [VehicleType]
  ? [VehicleType] extends [PrismaVehicleType]
    ? true
    : never
  : never;
export const _vehicleTypeCheck: _checkVehicleType = true;

type _checkOperatorStatus = [PrismaOperatorStatus] extends [OperatorStatus]
  ? [OperatorStatus] extends [PrismaOperatorStatus]
    ? true
    : never
  : never;
export const _operatorStatusCheck: _checkOperatorStatus = true;

export interface LogisticsOperatorDTO {
  id: string;
  clerk_user_id: string;
  full_name: string;
  email: string;
  phone: string;
  document_id: string;
  vehicle_type: VehicleType;
  license_plate: string;
  status: OperatorStatus;
  created_at: string;
}

/** Body de POST /api/v1/logistics-operators (admin, docs/03 §SH5). */
export interface CreateLogisticsOperatorBody {
  clerk_user_id: string;
  full_name: string;
  email: string;
  phone: string;
  document_id: string;
  vehicle_type: VehicleType;
  license_plate: string;
}
