"use client";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { getPublicTracking } from "@/services/api/track";

export function useTracking(code?: string) {
  return useQuery({
    queryKey: ["track", code],
    queryFn: () => {
      if (!code) throw new Error("code requerido");
      return getPublicTracking(code);
    },
    enabled: !!code,
    retry: (failureCount, error) => {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 404 || status === 400) return false;
      }
      return failureCount < 1;
    },
    // Tracking público — la data se queda fresca 30s y después se refetchea
    // automáticamente. Si el operador acaba de avanzar el estado, el
    // comprador lo ve sin tener que recargar la página.
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}
