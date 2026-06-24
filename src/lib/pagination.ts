import type { PaginatedResponse } from "@/types/common";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

interface PaginateArgs {
  where?: unknown;
  orderBy?: unknown;
  include?: unknown;
  select?: unknown;
}

interface PaginateOpts {
  page?: number;
  limit?: number;
}

/**
 * Wrapper de paginación que combina findMany + count y devuelve el shape
 * canónico { data, pagination } documentado en docs/02 §2.
 *
 * Uso:
 *   const result = await paginate(prisma.shipment, { where, orderBy }, { page, limit });
 *   return NextResponse.json(result);
 *
 * El tipo del modelo es 'any' a propósito — los modelos de Prisma comparten la
 * misma forma (findMany + count) pero sus tipos son distintos y no hay un
 * super-type Prisma sin inferencia compleja. El consumidor tipa el resultado
 * con `paginate<ShipmentDTO>(...)`.
 */
export async function paginate<T = unknown>(
  // biome-ignore lint/suspicious/noExplicitAny: ver doc arriba
  model: any,
  args: PaginateArgs,
  opts: PaginateOpts = {},
): Promise<PaginatedResponse<T>> {
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const rawLimit = Math.floor(opts.limit ?? DEFAULT_LIMIT);
  const limit = Math.min(Math.max(1, rawLimit), MAX_LIMIT);

  const [data, total] = await Promise.all([
    model.findMany({
      ...args,
      skip: (page - 1) * limit,
      take: limit,
    }),
    model.count({ where: args.where }),
  ]);

  return {
    data: data as T[],
    pagination: {
      total,
      page,
      limit,
      has_more: page * limit < total,
    },
  };
}
