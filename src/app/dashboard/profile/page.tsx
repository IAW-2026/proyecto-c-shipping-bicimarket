import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getOrProvisionOperator } from "@/lib/auth-helpers";
import { ProfileForm } from "./ProfileForm";

/**
 * /dashboard/profile — el operador edita sus propios datos
 * (teléfono, DNI, vehículo, patente). Los campos de Clerk
 * (nombre, email) se sincronizan automáticamente y no se editan acá.
 */
export default async function ProfilePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const operator = await getOrProvisionOperator();
  if (!operator) redirect("/forbidden");

  return <ProfileForm />;
}
