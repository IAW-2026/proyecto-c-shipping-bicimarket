import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getOperatorRecord } from "@/lib/auth-helpers";
import { ProfileForm } from "./ProfileForm";
import { DeliveryHistory } from "./DeliveryHistory";

/**
 * /dashboard/profile — el operador edita sus propios datos
 * (teléfono, DNI, vehículo, patente). Los campos de Clerk
 * (nombre, email) se sincronizan automáticamente y no se editan acá.
 *
 * Debajo del formulario se muestra el historial de entregas finalizadas
 * (assignments con status=delivered) — el listado /assignments solo trae
 * los activos, así que sin esto el operador pierde el registro al cerrar.
 *
 * El form maneja internamente el caso "operador suspendido" — muestra
 * banner y deshabilita inputs/submit.
 */
export default async function ProfilePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const operator = await getOperatorRecord();
  if (!operator) redirect("/forbidden");

  return (
    <div className="space-y-8">
      <ProfileForm />
      <DeliveryHistory />
    </div>
  );
}
