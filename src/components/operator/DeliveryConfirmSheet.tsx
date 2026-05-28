"use client";
import { useRef, useState } from "react";
import { Camera, Check, Loader2, RotateCw } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useShipmentMutations } from "@/hooks/querys/shipments/useShipmentMutations";
import { uploadDeliveryProof } from "@/services/api/uploads";
import { useRouter } from "next/navigation";

interface DeliveryConfirmSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipmentId: string;
  trackingNumber: string;
}

/**
 * Sheet con foto OPCIONAL (la captura desde mobile a veces falla por tamaño /
 * permisos; el operador debe poder cerrar la entrega igual). Flujo:
 *   1. (Opcional) El operador toca "Tomar foto" → captura desde la cámara.
 *   2. Mostramos preview con URL local (createObjectURL).
 *   3. Al confirmar:
 *      a. Si hay foto, la subimos a /api/v1/uploads/delivery-proof
 *      b. Si la subida falla, avisamos pero permitimos reintentar sin foto
 *      c. Mandamos /shipments/{id}/deliver con la URL (o sin ella)
 *      d. El backend crea: tracking_event delivered + delivery_proof +
 *         shipment.status=delivered + status_history.
 *
 * Mockup: operador-detalle-de-envio/Modal _ Confirmar entrega.png
 */
export function DeliveryConfirmSheet({
  open,
  onOpenChange,
  shipmentId,
  trackingNumber,
}: DeliveryConfirmSheetProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);

  const { deliver } = useShipmentMutations(shipmentId);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    // URL local solo para preview — no se sube todavía
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
  }

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setNote("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleConfirm() {
    let proofUrl: string | undefined;

    // 1. Si hay foto, intentar subir. Si falla, avisamos y seguimos sin foto
    //    para no bloquear al operador (mobile a veces falla por tamaño).
    if (file) {
      try {
        setUploading(true);
        const uploaded = await uploadDeliveryProof(file);
        proofUrl = uploaded.url;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Error subiendo la foto";
        toast.warning("No pudimos subir la foto, confirmamos sin ella", {
          description: msg,
        });
      } finally {
        setUploading(false);
      }
    }

    // 2. Disparar el endpoint deliver — proof_photo_url es opcional
    deliver.mutate(
      {
        ...(proofUrl && { proof_photo_url: proofUrl }),
        note: note || undefined,
        occurred_at: new Date().toISOString(),
      },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
          router.push("/dashboard/assignments");
        },
      },
    );
  }

  const busy = uploading || deliver.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle>Confirmar entrega</SheetTitle>
          <p className="font-mono text-xs text-muted-foreground">
            {trackingNumber}
          </p>
        </SheetHeader>

        <div className="my-4 space-y-4">
          {/* Foto */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Foto del paquete{" "}
              <span className="font-normal text-muted-foreground">
                (opcional)
              </span>
            </Label>

            {previewUrl ? (
              <div className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Prueba de entrega"
                  className="aspect-video w-full rounded-lg border border-border object-cover"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                  disabled={busy}
                >
                  <RotateCw className="size-3.5" />
                  Retomar foto
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 py-8 text-center transition-colors hover:border-primary hover:bg-primary/5"
              >
                <span className="flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Camera className="size-5" />
                </span>
                <span className="text-sm font-medium">Tomar foto</span>
                <span className="text-xs text-muted-foreground">
                  Del paquete entregado o de la persona que recibió
                </span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Nota */}
          <div className="space-y-2">
            <Label htmlFor="note" className="text-sm font-medium">
              Nota (opcional)
            </Label>
            <Textarea
              id="note"
              placeholder="Ej: Recibió María en portería, planta baja."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              disabled={busy}
            />
          </div>

          {/* Firma — placeholder */}
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground">
              ⓘ Firma del receptor — próximamente
            </p>
          </div>
        </div>

        <SheetFooter className="gap-2">
          <Button
            size="lg"
            disabled={busy}
            onClick={handleConfirm}
          >
            {uploading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Subiendo foto…
              </>
            ) : deliver.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Confirmando…
              </>
            ) : (
              <>
                <Check className="size-4" />
                {file ? "Confirmar entrega" : "Confirmar sin foto"}
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="lg"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancelar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
