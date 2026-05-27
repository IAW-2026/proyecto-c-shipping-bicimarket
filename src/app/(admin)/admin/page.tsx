import { redirect } from "next/navigation";

// /admin (sin subpath) no es una pantalla — redirige a /admin/shipments,
// que es la landing del rol admin (lista de envíos).
export default function AdminIndexPage() {
  redirect("/admin/shipments");
}
