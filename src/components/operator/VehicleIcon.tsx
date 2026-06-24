import { Bike, Car, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { VEHICLE_LABELS } from "@/lib/status-styles";
import type { VehicleType } from "@/types/logistics-operators";

interface VehicleIconProps {
  vehicle: VehicleType;
  withLabel?: boolean;
  className?: string;
}

export function VehicleIcon({
  vehicle,
  withLabel = false,
  className,
}: VehicleIconProps) {
  const Icon =
    vehicle === "motorcycle"
      ? Bike
      : vehicle === "car"
        ? Car
        : Truck; // van + truck

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <Icon className="size-4" aria-hidden />
      {withLabel && <span>{VEHICLE_LABELS[vehicle]}</span>}
    </span>
  );
}
