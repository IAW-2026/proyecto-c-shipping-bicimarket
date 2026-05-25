import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// Provisioning perezoso: en cada request autenticado, sincroniza el User local
// con los claims actuales del JWT de Clerk. No usamos webhook de Clerk.
// Devuelve el User local listo para usar.
export async function getOrCreateLocalUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email = clerkUser.primaryEmailAddress?.emailAddress ?? "";

  return prisma.user.upsert({
    where: { id: clerkUser.id },
    create: {
      id: clerkUser.id,
      email,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      imageUrl: clerkUser.imageUrl,
    },
    update: {
      email,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      imageUrl: clerkUser.imageUrl,
    },
  });
}
