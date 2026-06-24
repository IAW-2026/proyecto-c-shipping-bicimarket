export interface PackageDTO {
  id: string;
  weight_grams: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  description: string | null;
  label_url: string | null;
}

/** Body de POST /api/v1/shipments/{id}/packages (S2S Seller, docs/03 §SH3). */
export interface AddPackageBody {
  weight_grams: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  description?: string;
}
