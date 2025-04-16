import {
  Building2,
  Group,
  MessageSquareText,
  Upload,
  Users,
  Workflow,
} from "lucide-react";
import * as React from "react";

import { NavMain } from "~/components/nav-main";
import { NavUser } from "~/components/nav-user";
import { TeamSwitcher } from "~/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "~/components/ui/sidebar";

const data = {
  user: {
    name: "Mir Tauhidul",
    email: "tauhidul.stu2017@juniv.edu",
    avatar: "/avatar.png", // Replace with actual path or avatar logic
  },
  teams: [
    {
      name: "YTFCS",
      logo: Building2,
      plan: "ATS",
    },
  ],
  navMain: [
    {
      title: "Candidate Import",
      url: "/dashboard/import",
      icon: Upload,
      isActive: false,
    },
    {
      title: "Candidates List",
      url: "/dashboard/candidates",
      icon: Users,
      isActive: false,
    },
    {
      title: "Application Flow",
      url: "/dashboard/workflow",
      icon: Workflow,
      isActive: false,
    },
    {
      title: "Communication",
      url: "/dashboard/communication",
      icon: MessageSquareText,
      isActive: false,
    },
    {
      title: "Collaboration",
      url: "/dashboard/collaboration",
      icon: Group,
      isActive: false,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
