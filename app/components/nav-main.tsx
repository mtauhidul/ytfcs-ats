"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import { Link, useLocation } from "react-router";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from "~/components/ui/sidebar";

// Define navigation groups for better organization
const navigationGroups = {
  overview: {
    label: "Overview",
    items: ["Dashboard"],
  },
  jobs: {
    label: "Job Management",
    items: ["Jobs List", "Application Flow", "Stages"],
  },
  candidates: {
    label: "Candidate Management",
    items: ["Candidates List", "Candidate Import", "Clients / Employers"],
  },
  utilities: {
    label: "Utilities",
    items: ["Communication", "Collaboration", "Tags", "Categories"],
  },
  settings: {
    label: "Settings",
    items: ["Profile", "Email Monitoring"],
  },
};

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
}) {
  const location = useLocation();

  // Determine if an item is active
  const isItemActive = (item: {
    url: string;
    items?: { url: string }[];
  }): boolean => {
    if (location.pathname === item.url) return true;
    if (item.items && item.items.length > 0) {
      return item.items.some((sub) => location.pathname === sub.url);
    }
    return false;
  };

  // Group items by category
  const groupedItems = Object.entries(navigationGroups)
    .map(([key, group]) => ({
      key,
      label: group.label,
      items: items.filter((item) => group.items.includes(item.title)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="flex flex-col gap-1">
      {groupedItems.map((group, groupIndex) => (
        <div key={group.key}>
          <SidebarGroup className="py-0">
            <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/60 px-2 py-2 mb-1 group-data-[collapsible=icon]:hidden">
              {group.label}
            </SidebarGroupLabel>
            <SidebarMenu className="gap-0.5 px-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center">
              {group.items.map((item) => {
                const active = isItemActive(item);

                if (item.items && item.items.length) {
                  // Nested menu with sub-items
                  return (
                    <Collapsible
                      key={item.title}
                      asChild
                      defaultOpen={active}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem className="group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            tooltip={item.title}
                            data-active={active}
                            className={`h-9 font-medium transition-all duration-150 ease-in-out group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center ${
                              active
                                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                                : "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                            }`}
                          >
                            {item.icon && (
                              <item.icon className="h-4 w-4 shrink-0" />
                            )}
                            <span className="truncate group-data-[collapsible=icon]:sr-only">
                              {item.title}
                            </span>
                            <ChevronRight className="ml-auto h-4 w-4 shrink-0 transition-transform duration-150 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="transition-all duration-150 ease-in-out data-[state=closed]:animate-none data-[state=open]:animate-none">
                          <SidebarMenuSub className="border-l-0 ml-0 pl-6 group-data-[collapsible=icon]:hidden">
                            {item.items.map((subItem) => {
                              const subActive =
                                location.pathname === subItem.url;
                              return (
                                <SidebarMenuSubItem key={subItem.title}>
                                  <SidebarMenuSubButton
                                    asChild
                                    data-active={subActive}
                                    className={`h-8 font-normal transition-all duration-150 ease-in-out ${
                                      subActive
                                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                        : "hover:bg-sidebar-accent/30 hover:text-sidebar-accent-foreground"
                                    }`}
                                  >
                                    <Link to={subItem.url}>
                                      <span className="truncate">
                                        {subItem.title}
                                      </span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                } else {
                  // Flat menu item
                  return (
                    <SidebarMenuItem
                      key={item.title}
                      className="group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center"
                    >
                      <SidebarMenuButton
                        asChild
                        tooltip={item.title}
                        data-active={active}
                        className={`h-9 font-medium transition-all duration-150 ease-in-out group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center ${
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                            : "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                        }`}
                      >
                        <Link to={item.url}>
                          {item.icon && (
                            <item.icon className="h-4 w-4 shrink-0" />
                          )}
                          <span className="truncate group-data-[collapsible=icon]:sr-only">
                            {item.title}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }
              })}
            </SidebarMenu>
          </SidebarGroup>

          {/* Add separator between groups, except for the last one */}
          {groupIndex < groupedItems.length - 1 && (
            <SidebarSeparator className="my-3 mx-2 group-data-[collapsible=icon]:hidden" />
          )}
        </div>
      ))}

      {/* Quick Action Buttons - Removed non-functional placeholders */}
      <div className="mt-4 px-2">
        <SidebarSeparator className="mb-3 group-data-[collapsible=icon]:hidden" />
        <div className="flex flex-col gap-2 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-1">
          {/* Quick action buttons can be implemented here when needed */}
        </div>
      </div>
    </div>
  );
}
