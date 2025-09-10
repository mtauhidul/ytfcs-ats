import {
  BarChart3, // Changed to BarChart3 for better visual
  Briefcase, // Changed from Building2Icon to Briefcase for jobs
  Building2, // For clients/employers
  Calendar, // For interviews
  FileCheck, // For applications review
  FileText, // Changed from FolderArchive to FileText for categories
  HandHeart, // For offers
  Layers3, // Changed from LayersIcon to Layers3
  Mail,
  MessageSquare, // Changed from MessageSquareText to MessageSquare
  Settings,
  Share2, // For collaboration - sharing and working together
  Tag,
  Upload,
  User,
  Users, // For team management - multiple people
  UserCog, // Alternative for team management
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
    // Overview
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: BarChart3,
      isActive: false,
    },
    
    // Job Management
    {
      title: "Clients",
      url: "/dashboard/clients",
      icon: Building2,
      isActive: false,
    },
    {
      title: "Jobs",
      url: "/dashboard/jobs",
      icon: Briefcase,
      isActive: false,
    },
    {
      title: "Workflow",
      url: "/dashboard/workflow",
      icon: Workflow,
      isActive: false,
    },

    // Candidate Management
    {
      title: "Import",
      url: "/dashboard/import",
      icon: Upload,
      isActive: false,
    },
    {
      title: "Applications",
      url: "/dashboard/applications",
      icon: FileCheck,
      isActive: false,
    },
    {
      title: "Candidates",
      url: "/dashboard/candidates",
      icon: Users,
      isActive: false,
    },
    {
      title: "Interviews",
      url: "/dashboard/interviews",
      icon: Calendar,
      isActive: false,
    },
    {
      title: "Offers",
      url: "/dashboard/offers",
      icon: HandHeart,
      isActive: false,
    },

    // Team Management
    {
      title: "Team",
      url: "/dashboard/team",
      icon: Users,
      isActive: false,
    },
    {
      title: "Collaboration",
      url: "/dashboard/collaboration",
      icon: Share2,
      isActive: false,
    },
    {
      title: "Communication",
      url: "/dashboard/communication",
      icon: MessageSquare,
      isActive: false,
    },

    // Utilities
    {
      title: "Tags",
      url: "/dashboard/tags",
      icon: Tag,
      isActive: false,
    },
    {
      title: "Categories",
      url: "/dashboard/categories",
      icon: FileText,
      isActive: false,
    },
    {
      title: "Email Monitoring",
      url: "/dashboard/monitoring",
      icon: Mail,
      isActive: false,
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
