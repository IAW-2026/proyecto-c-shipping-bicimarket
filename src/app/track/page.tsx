"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * /track — form para ingresar el código de seguimiento (tracking_number o
 * shipment_id). Al submit redirige a /track/[code].
 */
export default function TrackSearchPage() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    router.push(`/track/${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 py-6 sm:py-12">
      <div className="space-y-2 text-center">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Seguí tu envío
        </h1>
        <p className="text-sm text-muted-foreground">
          Ingresá el código de tu pedido que te dimos al comprar. Empieza con{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
            BMK-
          </code>{" "}
          y sigue tu pedido completo, aunque tenga varios vendedores.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-sm focus-within:border-primary"
      >
        <Search className="ml-2 size-4 shrink-0 text-muted-foreground" />
        <Input
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="BMK-1234567890"
          className="border-0 bg-transparent font-mono text-base shadow-none focus-visible:ring-0 focus-visible:border-0"
        />
        <Button type="submit" size="sm" disabled={!code.trim()}>
          Buscar
        </Button>
      </form>

      <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-center">
        <p className="text-xs text-muted-foreground">
          También aceptamos el código de un envío individual (
          <code className="font-mono">TRK-AR-…</code>) o el ID interno (
          <code className="font-mono">shp_…</code>) — te llevamos igual a tu pedido completo.
          Si no encontrás tu código, revisá el email de confirmación de tu compra o
          escribí a{" "}
          <a
            href="mailto:soporte@bicimarket.com"
            className="text-primary hover:underline"
          >
            soporte@bicimarket.com
          </a>
          .
        </p>
      </div>
    </div>
  );
}
