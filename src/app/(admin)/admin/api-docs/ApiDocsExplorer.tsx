"use client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { API_CATALOG, groupByTag } from "./catalog";
import { EndpointPlayground, MethodChip } from "./EndpointPlayground";

/**
 * Vista tipo Swagger del contrato S2S que Shipping expone para otras apps.
 * Agrupa los endpoints por tag (SH1–SH4) y, dentro de cada uno, un acordeón
 * con la doc + el playground "Try it" funcional.
 */
export function ApiDocsExplorer() {
  const groups = groupByTag(API_CATALOG);

  return (
    <div className="space-y-8">
      {groups.map(([tag, specs]) => (
        <section key={tag} className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {tag}
          </h2>
          <Accordion className="rounded-xl border border-border bg-card px-4">
            {specs.map((spec) => (
              <AccordionItem key={spec.id} value={spec.id}>
                <AccordionTrigger>
                  <span className="flex flex-1 flex-wrap items-center gap-2 pr-3">
                    <MethodChip method={spec.method} />
                    <code className="font-mono text-xs text-foreground">
                      {spec.path}
                    </code>
                    <span className="text-xs font-normal text-muted-foreground">
                      {spec.summary}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <EndpointPlayground spec={spec} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      ))}
    </div>
  );
}
