import { Building2 } from "lucide-react";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar";

export function TeamSwitcher() {
  return (
    <SidebarMenu>
      <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
        <SidebarMenuButton
          size="lg"
          className="cursor-default hover:bg-transparent h-12 transition-all duration-150 ease-in-out group-data-[collapsible=icon]:h-12 group-data-[collapsible=icon]:w-12 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
        >
          <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-xl shadow-sm transition-all duration-150 ease-in-out group-data-[collapsible=icon]:size-8">
            <Building2 className="size-4 transition-all duration-150 ease-in-out group-data-[collapsible=icon]:size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate font-semibold text-sidebar-foreground">
              YTFCS
            </span>
            <span className="truncate text-xs text-sidebar-foreground/60 font-medium">
              Applicant Tracking System
            </span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
