import {
  BarChart3, // Changed to BarChart3 for better visual
  Briefcase, // Changed from Building2Icon to Briefcase for jobs
  Building2, // For clients/employers
  FileCheck, // For applications review
  FileText, // Changed from FolderArchive to FileText for categories
  Group,
  Layers3, // Changed from LayersIcon to Layers3
  Mail,
  MessageSquare, // Changed from MessageSquareText to MessageSquare
  Settings,
  Tag,
  Upload,
  User,
  Users, // Changed from UsersIcon to User for profile
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
      logo: Briefcase,
      plan: "ATS",
    },
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard", // This will now point to the dashboard index page
      icon: BarChart3, // Using BarChart3 for better visual
      isActive: false,
    },
    {
      title: "Applications",
      url: "/dashboard/applications",
      icon: FileCheck, // For application review
      isActive: false,
    },
    {
      title: "Jobs List",
      url: "/dashboard/jobs",
      icon: Briefcase, // More semantic icon for jobs
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
      title: "Clients",
      url: "/dashboard/clients",
      icon: Building2,
      isActive: false,
    },
    {
      title: "Workflow Hub",
      url: "/dashboard/workflow",
      icon: Workflow,
      isActive: false,
    },
    {
      title: "Workflow Management",
      url: "/dashboard/workflow/management",
      icon: Settings,
      isActive: false,
    },
    {
      title: "Communication",
      url: "/dashboard/communication",
      icon: MessageSquare, // Cleaner icon
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
      icon: FileText, // More appropriate for categories
      isActive: false,
    },
    {
      title: "Stages",
      url: "/dashboard/stages",
      icon: Layers3, // Better visual representation
      isActive: false,
    },
    {
      title: "Profile",
      url: "/dashboard/profile",
      icon: User, // More appropriate single user icon
      isActive: false,
    },
    {
      title: "Email Monitoring",
      url: "/dashboard/monitoring",
      icon: Mail,
      isActive: true,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      collapsible="icon"
      className="border-r-0 shadow-sm transition-all duration-150 ease-in-out"
      {...props}
    >
      <SidebarHeader className="border-b border-border/40 pb-3 transition-all duration-150 ease-in-out">
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent className="py-3 transition-all duration-150 ease-in-out">
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter className="border-t border-border/40 pt-3 transition-all duration-150 ease-in-out">
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
