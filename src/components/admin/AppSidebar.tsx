"use client";
import * as React from "react";
import Link from "next/link";
import {
  Compass,
  LifeBuoy,
  Package,
  Scale,
  Truck,
  Users,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NavMain } from "@/components/admin/NavMain";
import { NavSecondary } from "@/components/admin/NavSecondary";
import { NavUser } from "@/components/admin/NavUser";

const NAV_MAIN = [
  {
    title: "Envíos",
    url: "/admin/shipments",
    icon: Package,
    items: [
      { title: "Listado", url: "/admin/shipments" },
      { title: "Nuevo envío", url: "/admin/shipments/new" },
    ],
  },
  {
    title: "Operadores",
    url: "/admin/operators",
    icon: Users,
    items: [
      { title: "Listado", url: "/admin/operators" },
      { title: "Nuevo operador", url: "/admin/operators/new" },
    ],
  },
  {
    title: "Tarifaría",
    url: "/admin/rates",
    icon: Scale,
  },
] as const;

const NAV_SECONDARY = [
  {
    title: "Tracking público",
    url: "/track",
    icon: Compass,
  },
] as const;

/**
 * Sidebar admin basado en el patrón shadcn `Sidebar` (SidebarProvider +
 * SidebarInset). Reemplaza el sidebar custom anterior. Estructura:
 *
 *   Header (BiciMarket · Logística · chip Admin)
 *   ───────
 *   NavMain     → Envíos / Operadores / Tarifaría
 *   NavSecondary → Tracking público / Soporte
 *   ───────
 *   NavUser     → Avatar Clerk + dropdown con "Cuenta" y "Cerrar sesión"
 */
export function AppSidebar(
  props: React.ComponentProps<typeof Sidebar>,
) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/admin/shipments" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Truck className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">BiciMarket</span>
                <span className="truncate text-[11px] uppercase tracking-wider opacity-70">
                  Logística · Admin
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={[...NAV_MAIN]} />
        <NavSecondary items={[...NAV_SECONDARY]} className="mt-auto" />
      </SidebarContent>

    
    </Sidebar>
  );
}
