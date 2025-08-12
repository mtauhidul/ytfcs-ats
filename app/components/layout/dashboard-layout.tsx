"use client";

import type { ReactNode } from "react";
import { AppSidebar } from "~/components/app-sidebar";
import NavigationBreadcrumb from "~/components/shared/navigation-breadcrumb";
import { Separator } from "~/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";
import { useRealtimeSync } from "~/hooks/use-realtime-sync";
import { AppLoader } from "~/components/app-loader";

type DashboardLayoutProps = {
  children: ReactNode;
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  useRealtimeSync();

  return (
    <AppLoader>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
              />
              <NavigationBreadcrumb />
            </div>
          </header>

          <main className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </AppLoader>
  );
}
