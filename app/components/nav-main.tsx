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
} from "~/components/ui/sidebar";

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

  // Determine if an item is active by comparing its URL with the current location.
  // For items with sub-items, return true if any sub-item URL matches.
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

  return (
    <SidebarGroup>
      <SidebarGroupLabel>ATS Dashboard</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
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
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={item.title}
                      data-active={active}
                      className={`transition-colors duration-300 font-normal ${
                        active
                          ? "bg-deep-500 text-deep-100"
                          : "hover:bg-light-500 hover:text-light-100"
                      }`}
                    >
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items.map((subItem) => {
                        const subActive = location.pathname === subItem.url;
                        return (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              asChild
                              data-active={subActive}
                              className={`transition-colors duration-300 font-normal ${
                                subActive
                                  ? "bg-deep-500 text-deep-100"
                                  : "hover:bg-light-500 hover:text-light-100"
                              }`}
                            >
                              <Link to={subItem.url}>
                                <span>{subItem.title}</span>
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
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  data-active={active}
                  className={`transition-colors duration-300 font-normal ${
                    active
                      ? "bg-deep-500 text-deep-100"
                      : "hover:bg-light-500 hover:text-light-100"
                  }`}
                >
                  <Link to={item.url}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          }
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
