"use client";
import { useState } from "react";

/** Imagen de fallback cuando la prueba de entrega no tiene foto o está rota. */
export const PROOF_FALLBACK_IMAGE = "/images.jpeg";

interface ProofImageProps {
  src?: string | null;
  alt?: string;
  className?: string;
}

/**
 * <img> de prueba de entrega con fallback. Si no hay URL, o la imagen no existe
 * / se rompe (404, archivo borrado del storage, formato inválido), muestra
 * PROOF_FALLBACK_IMAGE en lugar de un placeholder vacío.
 */
export function ProofImage({ src, alt, className }: ProofImageProps) {
  const [errored, setErrored] = useState(false);
  const resolved = !src || errored ? PROOF_FALLBACK_IMAGE : src;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolved}
      alt={alt ?? "Prueba de entrega"}
      className={className}
      loading="lazy"
      onError={() => {
        // Solo cambiamos una vez: si el propio fallback fallara, no loopeamos.
        if (!errored) setErrored(true);
      }}
    />
  );
}
