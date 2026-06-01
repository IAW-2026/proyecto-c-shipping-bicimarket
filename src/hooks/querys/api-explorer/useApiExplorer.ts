"use client";
import { useMutation } from "@tanstack/react-query";
import { executeApiCall } from "@/services/api/api-explorer";

/**
 * Hook del playground del API Explorer. EXCEPCIÓN consciente a la convención
 * de `useApiMutation`: el playground muestra la respuesta cruda inline (status,
 * tiempo, body) y un 409/422 del endpoint real es un RESULTADO válido a
 * mostrar, no un error que merezca toast. El proxy siempre responde 200 con el
 * status real adentro, así que acá no hay manejo de error de negocio: solo
 * fallaría si el proxy mismo rechaza (403 no-admin / 400 path inválido), y eso
 * se muestra en la UI del playground.
 */
export function useApiExplorer() {
  return useMutation({ mutationFn: executeApiCall });
}
