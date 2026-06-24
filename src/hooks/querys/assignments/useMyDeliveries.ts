"use client";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { getMyDeliveries } from "@/services/api/assignments";

export function useMyDeliveries(page = 1, limit = 20) {
  return useQuery({
    queryKey: ["my-deliveries", page, limit],
    queryFn: () => getMyDeliveries(page, limit),
    retry: (failureCount, error) => {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 401 || status === 403) return false;
      }
      return failureCount < 2;
    },
    staleTime: 60 * 1000,
  });
}
