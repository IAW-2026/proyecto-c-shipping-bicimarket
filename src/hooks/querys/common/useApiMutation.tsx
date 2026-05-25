"use client";

import {
  useMutation,
  type UseMutationOptions,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { toast } from "sonner";
import type React from "react";
import type { ApiErrorBody } from "@/types/common";

export type ApiError = AxiosError<ApiErrorBody>;

interface UseApiMutationOptions<TData, TVariables, TContext = unknown>
  extends Omit<
    UseMutationOptions<TData, ApiError, TVariables, TContext>,
    "mutationFn"
  > {
  mutationFn: (variables: TVariables) => Promise<TData>;
  invalidateKeys?: QueryKey[];
  successMessage?: string | React.ReactNode;
  errorMessage?: string;
  loadingMessage?: string;
}

/**
 * Wrapper único para todas las mutations del proyecto. Encapsula:
 *   - Toast loading → success / error → dismiss (sonner)
 *   - Invalidación de queryKeys con exact: false
 *   - Parsing de errores tolerante a 2 shapes:
 *       (a) nuestro:    { error: { code, message, details } }   (docs/03 §0.3)
 *       (b) genérico:   { message }
 *
 * Convención del proyecto: SIEMPRE usar este helper en lugar de useMutation
 * directo. La única excepción son optimistic updates complejos.
 *
 * Ver docs/08-flujo-mutations.md.
 */
export function useApiMutation<TData, TVariables>({
  mutationFn,
  invalidateKeys,
  successMessage,
  errorMessage,
  loadingMessage = "Procesando operación...",
  onMutate,
  onSuccess,
  onError,
  onSettled,
  ...options
}: UseApiMutationOptions<TData, TVariables>) {
  const queryClient = useQueryClient();

  // biome-ignore lint/suspicious/noExplicitAny: el contexto custom + el nuestro se mezclan
  return useMutation<TData, ApiError, TVariables, any>({
    mutationFn,

    // 1. ANTES DE LA MUTACIÓN
    // biome-ignore lint/suspicious/noExplicitAny: callback signatures
    onMutate: async (...args: any[]) => {
      const toastId = toast.loading(loadingMessage);

      let customContext = {};
      if (onMutate) {
        // biome-ignore lint/suspicious/noExplicitAny: ver doc arriba
        customContext = (await (onMutate as any)(...args)) || {};
      }

      return { ...customContext, loadingToastId: toastId };
    },

    // 2. EN CASO DE ÉXITO
    // biome-ignore lint/suspicious/noExplicitAny: callback signatures
    onSuccess: async (...args: any[]) => {
      if (invalidateKeys) {
        await Promise.all(
          invalidateKeys.map((key) =>
            queryClient.invalidateQueries({ queryKey: key, exact: false }),
          ),
        );
      }

      if (successMessage) {
        toast.success("¡Éxito!", {
          description: successMessage,
        });
      }

      if (onSuccess) {
        // biome-ignore lint/suspicious/noExplicitAny: ver doc arriba
        await (onSuccess as any)(...args);
      }
    },

    // 3. EN CASO DE ERROR
    // biome-ignore lint/suspicious/noExplicitAny: callback signatures
    onError: (...args: any[]) => {
      const error = args[0] as ApiError;
      const body = error.response?.data;
      // Soporte para los dos shapes posibles: el nuestro y uno genérico
      const msg =
        body?.error?.message ||
        body?.message ||
        errorMessage ||
        "Ocurrió un error inesperado";

      toast.error("Error en la operación", {
        description: msg,
      });

      console.error("Mutation Error:", msg, { code: body?.error?.code });
      if (onError) {
        // biome-ignore lint/suspicious/noExplicitAny: ver doc arriba
        (onError as any)(...args);
      }
    },

    // 4. AL FINALIZAR (Éxito o Error)
    // biome-ignore lint/suspicious/noExplicitAny: callback signatures
    onSettled: async (...args: any[]) => {
      // Buscamos dinámicamente el contexto dentro de los argumentos
      // (independiente de la posición que use React Query)
      const context = args.find(
        (arg) => arg && typeof arg === "object" && "loadingToastId" in arg,
      );

      if (context?.loadingToastId) {
        toast.dismiss(context.loadingToastId);
      }

      if (onSettled) {
        // biome-ignore lint/suspicious/noExplicitAny: ver doc arriba
        await (onSettled as any)(...args);
      }
    },

    ...options,
  });
}
