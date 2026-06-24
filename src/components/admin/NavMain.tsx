"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, type LucideIcon } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

interface NavMainItem {
  title: string;
  url: string;
  icon: LucideIcon;
  items?: readonly { title: string; url: string }[];
}

/**
 * Navegación principal del admin. Detecta automáticamente el item activo
 * según el pathname. Cada item se renderiza con su propio state controlado
 * (no usamos `defaultOpen` porque cambiaría entre navegaciones y base-ui
 * tira warning de uncontrolled component).
 */
export function NavMain({ items }: { items: NavMainItem[] }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Operaciones</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <NavMainItemRow key={item.title} item={item} />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}

function NavMainItemRow({ item }: { item: NavMainItem }) {
  const pathname = usePathname();
  const isActive =
    pathname === item.url || pathname.startsWith(`${item.url}/`);

  // Controlled: el collapsible se abre automáticamente cuando el pathname
  // coincide con su rama. El usuario puede colapsarlo manualmente y se
  // mantiene cerrado mientras siga en la misma rama; si navega a otra rama
  // y vuelve, se re-abre.
  const [open, setOpen] = useState(isActive);
  useEffect(() => {
    if (isActive) setOpen(true);
  }, [isActive]);

  const hasSubItems = !!item.items && item.items.length > 0;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip={item.title}
          isActive={isActive}
          render={<Link href={item.url} />}
        >
          <item.icon />
          <span>{item.title}</span>
        </SidebarMenuButton>

        {hasSubItems && (
          <>
            <CollapsibleTrigger
              render={
                <SidebarMenuAction className="data-[state=open]:rotate-90">
                  <ChevronRight />
                  <span className="sr-only">Expandir</span>
                </SidebarMenuAction>
              }
            />
            <CollapsibleContent>
              <SidebarMenuSub>
                {item.items?.map((sub) => {
                  const subActive = pathname === sub.url;
                  return (
                    <SidebarMenuSubItem key={sub.title}>
                      <SidebarMenuSubButton
                        isActive={subActive}
                        render={<Link href={sub.url} />}
                      >
                        <span>{sub.title}</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  );
                })}
              </SidebarMenuSub>
            </CollapsibleContent>
          </>
        )}
      </SidebarMenuItem>
    </Collapsible>
  );
}
