"use client";
import { useEffect, useRef, useState } from "react";
import { ShoppingBag } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { useFeaturedProducts } from "@/hooks/querys/products/useFeaturedProducts";
import { formatArs } from "@/lib/format";
import { cn } from "@/lib/utils";

const FALLBACK_IMAGE = "/images.jpeg";
const AUTOSCROLL_MS = 2800;

/**
 * Carrusel sutil "Seguir comprando": muestra los primeros productos de la
 * Seller App y se desplaza solo hacia el costado. Cada producto linkea a la
 * Seller App. Pensado para landing y tracking público. Si la Seller App no
 * responde (o no hay productos), no renderiza nada — no rompe la página.
 */
export function KeepShoppingCarousel({ className }: { className?: string }) {
  const { data } = useFeaturedProducts();
  const [api, setApi] = useState<CarouselApi>();
  const paused = useRef(false);

  useEffect(() => {
    if (!api) return;
    const id = setInterval(() => {
      if (paused.current || (typeof document !== "undefined" && document.hidden))
        return;
      api.scrollNext();
    }, AUTOSCROLL_MS);
    return () => clearInterval(id);
  }, [api]);

  if (!data || data.length === 0) return null;

  return (
    <section className={cn("space-y-2", className)}>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <ShoppingBag className="size-3.5" />
        Seguir comprando
      </div>

      <Carousel
        opts={{ loop: true, align: "start" }}
        setApi={setApi}
        className="w-full"
        onMouseEnter={() => {
          paused.current = true;
        }}
        onMouseLeave={() => {
          paused.current = false;
        }}
      >
        <CarouselContent className="-ml-3">
          {data.map((p) => (
            <CarouselItem key={p.id} className="basis-1/2 pl-3 sm:basis-1/3">
              <a
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="group block overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/50"
              >
                <div className="aspect-square w-full overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.image_url ?? FALLBACK_IMAGE}
                    alt={p.title}
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => {
                      if (!e.currentTarget.src.endsWith(FALLBACK_IMAGE))
                        e.currentTarget.src = FALLBACK_IMAGE;
                    }}
                  />
                </div>
                <div className="space-y-0.5 p-2.5">
                  {p.brand && (
                    <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
                      {p.brand}
                    </p>
                  )}
                  <p className="line-clamp-1 text-xs font-medium">{p.title}</p>
                  <p className="text-sm font-semibold text-primary">
                    {formatArs(p.price_cents)}
                  </p>
                </div>
              </a>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  );
}
