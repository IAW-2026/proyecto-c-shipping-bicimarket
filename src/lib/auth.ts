// DEPRECATED: este helper sincronizaba un modelo `User` que ya no existe en
// el schema de Shipping. Lo dejamos como stub para que no rompa imports
// viejos. Cualquier código nuevo debe usar:
//   - `getActiveOperator()` de @/lib/auth-helpers (operador activo)
//   - `auth()` / `currentUser()` de @clerk/nextjs/server (snapshot Clerk)
//
// Si encontrás un import de `getOrCreateLocalUser`, cambialo por uno de los
// dos de arriba según corresponda. Cuando no haya consumidores, borrar este
// archivo.

import { currentUser } from "@clerk/nextjs/server";

export async function getOrCreateLocalUser() {
  return currentUser();
}
