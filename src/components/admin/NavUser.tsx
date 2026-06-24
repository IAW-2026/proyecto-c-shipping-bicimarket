"use client";
import { UserButton } from "@clerk/nextjs";
import {
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

/**
 * Footer del sidebar — usa directamente el UserButton de Clerk. Renderiza
 * avatar + nombre y maneja "Manage account" / "Sign out" con la UI nativa
 * de Clerk (más confiable que envolverlo en un dropdown propio).
 */
export function NavUser() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex items-center gap-2 rounded-md px-2 py-1.5 group-data-[collapsible=icon]:justify-center">
          <UserButton
            showName
            appearance={{
              elements: {
                userButtonBox: "flex-row-reverse gap-2",
                userButtonOuterIdentifier:
                  "text-sm font-medium text-sidebar-foreground",
                avatarBox: "size-7 rounded-md",
              },
            }}
          />
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
