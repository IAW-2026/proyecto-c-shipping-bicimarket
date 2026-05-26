"use client";
import * as React from "react";
import Link from "next/link";
import { type LucideIcon } from "lucide-react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

interface NavSecondaryItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

/**
 * Navegación secundaria del sidebar — utilities tipo Tracking público,
 * Soporte, links externos. Se renderiza más chica y va abajo (className="mt-auto").
 *
 * Acepta URLs externas (mailto:, https://, /track…). Si empieza con `/`,
 * usa Link de Next; si no, usa <a> regular.
 */
export function NavSecondary({
  items,
  ...props
}: {
  items: NavSecondaryItem[];
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isInternal = item.url.startsWith("/");
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  size="sm"
                  render={
                    isInternal ? (
                      <Link href={item.url} />
                    ) : (
                      <a
                        href={item.url}
                        target={item.url.startsWith("http") ? "_blank" : undefined}
                        rel="noreferrer"
                      />
                    )
                  }
                >
                  <item.icon />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
