"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

/**
 * Helper para tablas server-side donde el estado vive en la URL (per doc 09).
 * Soporta valores únicos y arrays (bracket notation: ?key[]=v1&key[]=v2).
 *
 * Uso:
 *   const { getParam, getArrayParam, setMultipleParams } = useUrlParams();
 *   setMultipleParams({ page: "1", "status[]": ["in_transit", "delivered"] });
 */
export function useUrlParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setMultipleParams(
    updates: Record<string, string | string[] | null>,
  ) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(updates)) {
      // Limpieza: borra el key y su variante array antes de re-setear
      params.delete(key);
      params.delete(`${key}[]`);

      if (value === null) continue;

      if (Array.isArray(value)) {
        for (const v of value) params.append(`${key}[]`, v);
      } else {
        params.set(key, value);
      }
    }

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return {
    getParam: (key: string) => searchParams.get(key),
    getArrayParam: (key: string) => searchParams.getAll(`${key}[]`),
    setMultipleParams,
    clearAllParams: () => router.replace(pathname, { scroll: false }),
  };
}
