import { SearchX } from "lucide-react";
import { ErrorPageLayout } from "@/components/feedback/ErrorPageLayout";

export default function NotFound() {
  return (
    <ErrorPageLayout
      icon={SearchX}
      tone="neutral"
      eyebrow="Error 404"
      title="No encontramos lo que buscás"
      subtitle="La página o el recurso no existe. Revisá el link o volvé al inicio."
      cta={{ label: "Ir al inicio", href: "/" }}
    />
  );
}
