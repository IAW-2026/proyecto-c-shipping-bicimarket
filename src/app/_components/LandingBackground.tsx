"use client";
import { motion } from "motion/react";

/**
 * Fondo animado para la landing pública. Grilla estática + "estelas" que
 * recorren la pantalla horizontal y verticalmente como las serpientes del
 * snake. Cada estela tiene su propio offset/duración/delay para que el
 * efecto sea continuo y no sincronizado.
 *
 * Va detrás del contenido (`-z-0` con el contenido en `z-10`) dentro de un
 * wrapper sin fondo opaco para que se vea.
 */
export function LandingBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Grilla estática sutil */}
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgb(16 185 129 / 0.35) 1px, transparent 1px), linear-gradient(to bottom, rgb(16 185 129 / 0.35) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Vignette para que las estelas resalten más cerca del centro */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,var(--color-background)_85%)]" />

      {/* Estelas horizontales (snake) */}
      {H_TRAILS.map((trail, i) => (
        <motion.div
          key={`h-${i}`}
          className="absolute h-px"
          style={{
            top: trail.topPct,
            width: trail.width,
            background:
              "linear-gradient(to right, transparent 0%, rgb(16 185 129 / 0.0) 5%, rgb(16 185 129 / 0.9) 50%, rgb(16 185 129 / 0.0) 95%, transparent 100%)",
            boxShadow: "0 0 8px rgb(16 185 129 / 0.5)",
          }}
          initial={{ x: "-30vw" }}
          animate={{ x: "110vw" }}
          transition={{
            duration: trail.duration,
            repeat: Infinity,
            ease: "linear",
            delay: trail.delay,
          }}
        />
      ))}

      {/* Estelas verticales */}
      {V_TRAILS.map((trail, i) => (
        <motion.div
          key={`v-${i}`}
          className="absolute w-px"
          style={{
            left: trail.leftPct,
            height: trail.height,
            background:
              "linear-gradient(to bottom, transparent 0%, rgb(56 189 248 / 0.0) 5%, rgb(56 189 248 / 0.85) 50%, rgb(56 189 248 / 0.0) 95%, transparent 100%)",
            boxShadow: "0 0 8px rgb(56 189 248 / 0.45)",
          }}
          initial={{ y: "-30vh" }}
          animate={{ y: "110vh" }}
          transition={{
            duration: trail.duration,
            repeat: Infinity,
            ease: "linear",
            delay: trail.delay,
          }}
        />
      ))}
    </div>
  );
}

// Filas (top en %) en las que circulan las estelas horizontales. Cada una
// tiene su propia velocidad y delay para que no se vean coordinadas.
const H_TRAILS = [
  { topPct: "12%", width: "260px", duration: 6.5, delay: 0 },
  { topPct: "27%", width: "180px", duration: 8.5, delay: 2.2 },
  { topPct: "45%", width: "320px", duration: 5.5, delay: 1.1 },
  { topPct: "62%", width: "220px", duration: 7.5, delay: 3.4 },
  { topPct: "78%", width: "280px", duration: 6, delay: 0.6 },
  { topPct: "90%", width: "160px", duration: 9, delay: 4 },
];

const V_TRAILS = [
  { leftPct: "10%", height: "200px", duration: 7, delay: 1.5 },
  { leftPct: "25%", height: "260px", duration: 9.5, delay: 0 },
  { leftPct: "42%", height: "180px", duration: 6.5, delay: 3.2 },
  { leftPct: "58%", height: "300px", duration: 8, delay: 2 },
  { leftPct: "73%", height: "220px", duration: 7.5, delay: 0.8 },
  { leftPct: "88%", height: "240px", duration: 6, delay: 4.5 },
];
