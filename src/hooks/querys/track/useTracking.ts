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
    staleTime: 30 * 1000,
  });
}
