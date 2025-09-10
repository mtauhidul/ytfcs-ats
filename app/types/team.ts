// app/types/team.ts
export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "pending" | "inactive";
  avatar?: string;
  joinDate: string;
  lastActive?: string;
  permissions: string[];
  invitedBy?: string;
  department?: string;
  phoneNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TeamInvitation {
  id: string;
  email: string;
  role: string;
  status: "pending" | "sent" | "accepted" | "declined" | "expired";
  invitedBy: string;
  invitedByName: string;
  sentAt: string;
  expiresAt: string;
  acceptedAt?: string;
  declinedAt?: string;
}

export interface TeamActivity {
  id: string;
  type: "member_added" | "member_removed" | "role_changed" | "invitation_sent" | "member_activated" | "member_deactivated";
  description: string;
  performedBy: string;
  performedByName: string;
  targetUserId?: string;
  targetUserName?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface TeamStats {
  totalMembers: number;
  activeMembers: number;
  pendingInvitations: number;
  totalRoles: number;
  averageRating: number;
  newMembersThisMonth: number;
}

// Permission constants
export const TEAM_PERMISSIONS = {
  // Team management
  MANAGE_TEAM: "manage_team",
  INVITE_MEMBERS: "invite_members",
  REMOVE_MEMBERS: "remove_members",
  MANAGE_ROLES: "manage_roles",
  
  // Candidate management
  VIEW_CANDIDATES: "view_candidates",
  MANAGE_CANDIDATES: "manage_candidates",
  ASSIGN_CANDIDATES: "assign_candidates",
  
  // Application management
  VIEW_APPLICATIONS: "view_applications",
  REVIEW_APPLICATIONS: "review_applications",
  
  // Job management
  VIEW_JOBS: "view_jobs",
  MANAGE_JOBS: "manage_jobs",
  
  // Interview management
  SCHEDULE_INTERVIEWS: "schedule_interviews",
  CONDUCT_INTERVIEWS: "conduct_interviews",
  
  // Analytics and reports
  VIEW_ANALYTICS: "view_analytics",
  MANAGE_SETTINGS: "manage_settings",
  
  // Communication
  SEND_COMMUNICATIONS: "send_communications",
  MANAGE_COMMUNICATIONS: "manage_communications",
} as const;

export type Permission = typeof TEAM_PERMISSIONS[keyof typeof TEAM_PERMISSIONS];

// Default roles
export const DEFAULT_ROLES = {
  ADMIN: {
    name: "Admin",
    description: "Full system access and team management",
    permissions: Object.values(TEAM_PERMISSIONS),
  },
  HIRING_MANAGER: {
    name: "Hiring Manager",
    description: "Manage hiring process, review applications, and conduct interviews",
    permissions: [
      TEAM_PERMISSIONS.VIEW_CANDIDATES,
      TEAM_PERMISSIONS.MANAGE_CANDIDATES,
      TEAM_PERMISSIONS.ASSIGN_CANDIDATES,
      TEAM_PERMISSIONS.VIEW_APPLICATIONS,
      TEAM_PERMISSIONS.REVIEW_APPLICATIONS,
      TEAM_PERMISSIONS.VIEW_JOBS,
      TEAM_PERMISSIONS.MANAGE_JOBS,
      TEAM_PERMISSIONS.SCHEDULE_INTERVIEWS,
      TEAM_PERMISSIONS.CONDUCT_INTERVIEWS,
      TEAM_PERMISSIONS.VIEW_ANALYTICS,
      TEAM_PERMISSIONS.SEND_COMMUNICATIONS,
      TEAM_PERMISSIONS.MANAGE_COMMUNICATIONS,
    ],
  },
  RECRUITER: {
    name: "Recruiter",
    description: "Manage candidates, applications, and recruitment activities",
    permissions: [
      TEAM_PERMISSIONS.VIEW_CANDIDATES,
      TEAM_PERMISSIONS.MANAGE_CANDIDATES,
      TEAM_PERMISSIONS.ASSIGN_CANDIDATES,
      TEAM_PERMISSIONS.VIEW_APPLICATIONS,
      TEAM_PERMISSIONS.REVIEW_APPLICATIONS,
      TEAM_PERMISSIONS.VIEW_JOBS,
      TEAM_PERMISSIONS.SCHEDULE_INTERVIEWS,
      TEAM_PERMISSIONS.CONDUCT_INTERVIEWS,
      TEAM_PERMISSIONS.SEND_COMMUNICATIONS,
    ],
  },
  INTERVIEWER: {
    name: "Interviewer",
    description: "Conduct interviews and provide feedback on candidates",
    permissions: [
      TEAM_PERMISSIONS.VIEW_CANDIDATES,
      TEAM_PERMISSIONS.VIEW_APPLICATIONS,
      TEAM_PERMISSIONS.VIEW_JOBS,
      TEAM_PERMISSIONS.CONDUCT_INTERVIEWS,
      TEAM_PERMISSIONS.SEND_COMMUNICATIONS,
    ],
  },
  TEAM_MEMBER: {
    name: "Team Member",
    description: "Basic access to view candidates and applications",
    permissions: [
      TEAM_PERMISSIONS.VIEW_CANDIDATES,
      TEAM_PERMISSIONS.VIEW_APPLICATIONS,
      TEAM_PERMISSIONS.VIEW_JOBS,
    ],
  },
} as const;
