"use client";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { getMyAssignments } from "@/services/api/assignments";

export function useMyAssignments(page = 1, limit = 20) {
  return useQuery({
    queryKey: ["my-assignments", page, limit],
    queryFn: () => getMyAssignments(page, limit),
    retry: (failureCount, error) => {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 401 || status === 403) return false;
      }
      return failureCount < 2;
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true, // volver al tab → refresca para ver nuevos asignados
  });
}
