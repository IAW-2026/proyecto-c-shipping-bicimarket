"use client";
import { useQuery } from "@tanstack/react-query";
import { getMyOperator } from "@/services/api/my-operator";

export function useMyOperator() {
  return useQuery({
    queryKey: ["my-operator"],
    queryFn: getMyOperator,
    staleTime: 5 * 60 * 1000,
  });
}
