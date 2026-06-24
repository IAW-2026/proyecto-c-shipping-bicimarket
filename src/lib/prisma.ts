import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const DEFAULT_POOL_TIMEOUT_SECONDS = 30;

function databaseUrlWithPoolTimeout(): string | undefined {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return undefined;

  const configuredTimeout = Number(
    process.env.PRISMA_POOL_TIMEOUT_SECONDS ??
      DEFAULT_POOL_TIMEOUT_SECONDS,
  );
  const poolTimeout =
    Number.isFinite(configuredTimeout) && configuredTimeout > 0
      ? Math.floor(configuredTimeout)
      : DEFAULT_POOL_TIMEOUT_SECONDS;

  if (/[?&]pool_timeout=\d+/i.test(databaseUrl)) {
    return databaseUrl.replace(
      /([?&]pool_timeout=)\d+/i,
      `$1${poolTimeout}`,
    );
  }

  const separator = databaseUrl.includes("?") ? "&" : "?";
  return `${databaseUrl}${separator}pool_timeout=${poolTimeout}`;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: databaseUrlWithPoolTimeout(),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
