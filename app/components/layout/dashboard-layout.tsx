"use client";

import type { ReactNode } from "react";
import { AppSidebar } from "~/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { Separator } from "~/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";

type DashboardLayoutProps = {
  children: ReactNode;
  breadcrumb?: {
    title: string;
    href?: string;
  }[];
};

export function DashboardLayout({
  children,
  breadcrumb = [],
}: DashboardLayoutProps) {
  const hasTrail = breadcrumb.length > 0;
  const lastItem = breadcrumb.at(-1);

  return (
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
            {hasTrail && (
              <Breadcrumb>
                <BreadcrumbList>
                  {breadcrumb.map((item, i) => (
                    <BreadcrumbItem key={item.title}>
                      {i < breadcrumb.length - 1 ? (
                        <>
                          <BreadcrumbLink href={item.href || "#"}>
                            {item.title}
                          </BreadcrumbLink>
                          <BreadcrumbSeparator className="hidden md:inline-flex" />
                        </>
                      ) : (
                        <BreadcrumbPage>{item.title}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            )}
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
