import {
  BarChart2,
  Bot, // Import for dashboard icon
  Building2,
  Building2Icon,
  FolderArchive,
  Group,
  LayersIcon,
  MessageSquareText,
  Settings,
  Tag,
  Upload,
  Users,
  UsersIcon,
  Workflow,
  Zap,
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
      title: "Dashboard",
      url: "/dashboard", // This will now point to the dashboard index page
      icon: BarChart2, // Using BarChart2 for the dashboard icon
      isActive: false,
    },
    {
      title: "Jobs List",
      url: "/dashboard/jobs",
      icon: Building2Icon,
      isActive: false,
    },
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
    {
      title: "Tags",
      url: "/dashboard/tags",
      icon: Tag,
      isActive: false,
    },
    {
      title: "Categories",
      url: "/dashboard/categories",
      icon: FolderArchive,
      isActive: false,
    },
    {
      title: "Stages",
      url: "/dashboard/stages",
      icon: LayersIcon,
      isActive: false,
    },
    {
      title: "Profile",
      url: "/dashboard/profile",
      icon: UsersIcon,
      isActive: false,
    },
    {
      title: "Automation",
      url: "/dashboard/automation",
      icon: Bot,
      isActive: true,
      items: [
        {
          title: "Email Monitoring",
          url: "/dashboard/automation",
          icon: Zap,
        },
        {
          title: "Settings",
          url: "/dashboard/automation/settings",
          icon: Settings,
        },
      ],
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
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
