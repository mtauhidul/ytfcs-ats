import { useEffect, useState } from "react";
import { Outlet } from "react-router";
import { 
  Users, 
  UserPlus, 
  Shield, 
  Mail, 
  MoreHorizontal,
  Crown,
  Star,
  Clock,
  CheckCircle,
  Edit,
  Trash2,
  Eye,
  UserMinus,
  Plus,
  Search,
  Filter,
  Loader2,
  X,
} from "lucide-react";
import { toast, Toaster } from "sonner";

import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";

import { teamService } from "~/services/teamService";
import { useAuth } from "~/context/auth-context";
import type { TeamMember, TeamRole, TeamInvitation, TeamActivity, TeamStats, TEAM_PERMISSIONS } from "~/types/team";

const roleColors: Record<string, string> = {
  "Admin": "bg-red-100 text-red-800",
  "HR Manager": "bg-purple-100 text-purple-800",
  "Recruiter": "bg-blue-100 text-blue-800",
  "Hiring Manager": "bg-orange-100 text-orange-800",
  "Junior Recruiter": "bg-gray-100 text-gray-800"
};

const statusColors: Record<string, string> = {
  "active": "bg-green-100 text-green-800",
  "pending": "bg-yellow-100 text-yellow-800",
  "inactive": "bg-red-100 text-red-800"
};

export default function TeamLayout() {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamRoles, setTeamRoles] = useState<TeamRole[]>([]);
  const [teamInvitations, setTeamInvitations] = useState<TeamInvitation[]>([]);
  const [teamActivities, setTeamActivities] = useState<TeamActivity[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Helper function to generate initials from name
  const getInitials = (name: string): string => {
    if (!name || name.trim() === "") return "??";
    
    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
      // If only one word, take first two characters
      return words[0].substring(0, 2).toUpperCase();
    } else {
      // If multiple words, take first letter of first two words
      return (words[0][0] + (words[1] ? words[1][0] : "")).toUpperCase();
    }
  };

  // Form validation functions
  const validateInviteForm = () => {
    const errors = { name: "", email: "", role: "" };
    let isValid = true;

    if (!inviteForm.name.trim()) {
      errors.name = "Full name is required";
      isValid = false;
    }

    if (!inviteForm.email.trim()) {
      errors.email = "Email address is required";
      isValid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(inviteForm.email.trim())) {
        errors.email = "Please enter a valid email address";
        isValid = false;
      }
    }

    if (!inviteForm.role) {
      errors.role = "Role selection is required";
      isValid = false;
    }

    // Check for duplicate email
    const existingMember = teamMembers.find(m => 
      m.email.toLowerCase() === inviteForm.email.trim().toLowerCase()
    );
    if (existingMember) {
      errors.email = "A team member with this email already exists";
      isValid = false;
    }

    setFormErrors(prev => ({ ...prev, invite: errors }));
    return isValid;
  };

  const validateEditForm = () => {
    const errors = { name: "", email: "", role: "", status: "" };
    let isValid = true;

    if (!editForm.name.trim()) {
      errors.name = "Full name is required";
      isValid = false;
    }

    if (!editForm.email.trim()) {
      errors.email = "Email address is required";
      isValid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editForm.email.trim())) {
        errors.email = "Please enter a valid email address";
        isValid = false;
      }
    }

    if (!editForm.role) {
      errors.role = "Role selection is required";
      isValid = false;
    }

    if (!editForm.status) {
      errors.status = "Status selection is required";
      isValid = false;
    }

    setFormErrors(prev => ({ ...prev, edit: errors }));
    return isValid;
  };

  // Modal states
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  // Form states
  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: "",
    name: "",
  });
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: "",
    status: "active" as TeamMember["status"],
  });
  const [formErrors, setFormErrors] = useState({
    invite: { name: "", email: "", role: "" },
    edit: { name: "", email: "", role: "", status: "" },
  });

  // Load data on component mount
  useEffect(() => {
    loadInitialData();
    
    // Subscribe to real-time updates
    const unsubscribeMembers = teamService.subscribeToTeamMembers(setTeamMembers);
    const unsubscribeActivities = teamService.subscribeToTeamActivities(setTeamActivities);

    return () => {
      unsubscribeMembers();
      unsubscribeActivities();
    };
  }, []);

  // Reset edit form when selectedMember changes
  useEffect(() => {
    if (selectedMember && showEditDialog) {
      setEditForm({
        name: selectedMember.name || "",
        email: selectedMember.email || "",
        role: selectedMember.role || "",
        status: selectedMember.status || "active",
      });
    }
  }, [selectedMember, showEditDialog]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Initialize default roles if needed
      await teamService.initializeDefaultRoles();
      
      // Migrate to new role structure if needed
      await teamService.migrateToNewRoles();
      
      // Load all data
      const [roles, invitations, stats] = await Promise.all([
        teamService.getTeamRoles(),
        teamService.getTeamInvitations(),
        teamService.getTeamStats(),
      ]);

      setTeamRoles(roles);
      setTeamInvitations(invitations);
      setTeamStats(stats);
    } catch (error) {
      console.error("Error loading team data:", error);
      toast.error("Failed to load team data");
    } finally {
      setLoading(false);
    }
  };  // Handle invite member
  const handleInviteMember = async () => {
    // Clear previous errors
    setFormErrors(prev => ({ ...prev, invite: { name: "", email: "", role: "" } }));

    // Validate form
    if (!validateInviteForm()) {
      return;
    }

    if (!user) {
      toast.error("You must be logged in to invite members");
      return;
    }

    setInviteLoading(true);
    try {
      await teamService.sendTeamInvitation({
        email: inviteForm.email.trim(),
        role: inviteForm.role,
        invitedBy: user.uid,
        invitedByName: user.name || user.email || "Unknown",
      });

      toast.success(`Invitation sent to ${inviteForm.email}`);
      handleCloseInviteDialog();
      
      // Reload invitations and stats
      const [invitations, stats] = await Promise.all([
        teamService.getTeamInvitations(),
        teamService.getTeamStats(),
      ]);
      setTeamInvitations(invitations);
      setTeamStats(stats);
    } catch (error) {
      console.error("Error sending invitation:", error);
      toast.error("Failed to send invitation");
    } finally {
      setInviteLoading(false);
    }
  };

  // Handle closing invite dialog with cleanup
  const handleCloseInviteDialog = () => {
    setShowInviteDialog(false);
    setInviteForm({ email: "", role: "", name: "" });
    setFormErrors(prev => ({ ...prev, invite: { name: "", email: "", role: "" } }));
  };

  // Handle edit member
  const handleEditMember = async () => {
    if (!selectedMember) return;

    // Clear previous errors
    setFormErrors(prev => ({ ...prev, edit: { name: "", email: "", role: "", status: "" } }));

    // Validate form
    if (!validateEditForm()) {
      return;
    }

    setEditLoading(true);
    try {
      const updates: Partial<TeamMember> = {};
      
      // Only include fields that have changed and are not empty
      if (editForm.name.trim() !== selectedMember.name) {
        updates.name = editForm.name.trim();
      }
      if (editForm.email.trim() !== selectedMember.email) {
        updates.email = editForm.email.trim();
      }
      if (editForm.role !== selectedMember.role) {
        updates.role = editForm.role;
      }
      if (editForm.status !== selectedMember.status) {
        updates.status = editForm.status;
      }

      // Only update if there are changes
      if (Object.keys(updates).length === 0) {
        toast.info("No changes detected");
        handleCloseEditDialog();
        return;
      }

      await teamService.updateTeamMember(selectedMember.id, updates);

      toast.success("Team member updated successfully");
      handleCloseEditDialog();
    } catch (error) {
      console.error("Error updating team member:", error);
      toast.error("Failed to update team member");
    } finally {
      setEditLoading(false);
    }
  };

  // Handle closing edit dialog with cleanup
  const handleCloseEditDialog = () => {
    setShowEditDialog(false);
    setSelectedMember(null);
    setEditForm({ name: "", email: "", role: "", status: "active" });
    setFormErrors(prev => ({ ...prev, edit: { name: "", email: "", role: "", status: "" } }));
  };

  // Handle delete member
  const handleDeleteMember = async () => {
    if (!selectedMember) return;

    try {
      await teamService.deleteTeamMember(selectedMember.id);
      toast.success("Team member removed successfully");
      setShowDeleteDialog(false);
      setSelectedMember(null);
    } catch (error) {
      console.error("Error removing team member:", error);
      toast.error("Failed to remove team member");
    }
  };

  // Open edit dialog
  const openEditDialog = (member: TeamMember) => {
    // Ensure teamRoles are loaded before opening dialog
    if (teamRoles.length === 0) {
      toast.error("Team roles are still loading. Please try again in a moment.");
      return;
    }
    
    setSelectedMember(member);
    
    // The role field should match exactly with the SelectItem values
    // Since we store role names in the database, use the member.role directly
    setEditForm({
      name: member.name || "",
      email: member.email || "",
      role: member.role || "",
      status: member.status || "active",
    });
    
    // Clear any previous form errors
    setFormErrors(prev => ({ 
      ...prev, 
      edit: { name: "", email: "", role: "", status: "" } 
    }));
    
    setShowEditDialog(true);
  };

  // Open delete dialog
  const openDeleteDialog = (member: TeamMember) => {
    setSelectedMember(member);
    setShowDeleteDialog(true);
  };

  // Filter members based on search and filters
  const filteredMembers = teamMembers.filter((member) => {
    const matchesSearch = 
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || member.status === statusFilter;
    const matchesRole = roleFilter === "all" || member.role === roleFilter;

    return matchesSearch && matchesStatus && matchesRole;
  });

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min flex items-center justify-center">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading team data...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
              <p className="text-muted-foreground">
                Manage your team members, roles, and permissions
              </p>
            </div>
            <Button onClick={() => setShowInviteDialog(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Invite Member
            </Button>
          </div>
          
          {/* Stats Cards */}
          {teamStats && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
              <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">Team Members</h3>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{teamStats.activeMembers}</span>
                  <span className="text-sm text-muted-foreground">Active members</span>
                </div>
              </div>
              
              <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-purple-600" />
                  <h3 className="text-lg font-semibold">Roles</h3>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{teamStats.totalRoles}</span>
                  <span className="text-sm text-muted-foreground">Role types</span>
                </div>
              </div>
              
              <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="h-5 w-5 text-orange-600" />
                  <h3 className="text-lg font-semibold">Invitations</h3>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{teamStats.pendingInvitations}</span>
                  <span className="text-sm text-muted-foreground">Pending invites</span>
                </div>
              </div>

              <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold">New Members</h3>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{teamStats.newMembersThisMonth}</span>
                  <span className="text-sm text-muted-foreground">This month</span>
                </div>
              </div>
            </div>
          )}

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search members by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {teamRoles.map((role) => (
                  <SelectItem key={role.id} value={role.name}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Team Members Table */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">Team Members ({filteredMembers.length})</h3>
              <p className="text-sm text-muted-foreground">
                Manage team member access and permissions
              </p>
            </div>
            <div className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr className="border-b">
                      <th className="text-left p-4 font-medium">Member</th>
                      <th className="text-left p-4 font-medium">Role</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Last Active</th>
                      <th className="text-left p-4 font-medium">Join Date</th>
                      <th className="text-right p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          {searchTerm || statusFilter !== "all" || roleFilter !== "all" 
                            ? "No members match your current filters" 
                            : "No team members found. Invite your first team member to get started."}
                        </td>
                      </tr>
                    ) : (
                      filteredMembers.map((member) => (
                        <tr key={member.id} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                {member.avatar ? (
                                  <img src={member.avatar} alt={member.name} className="rounded-full" />
                                ) : (
                                  <AvatarFallback>
                                    {getInitials(member.name)}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <div>
                                <div className="font-medium flex items-center gap-2">
                                  {member.name}
                                  {member.role === "Admin" && <Crown className="h-4 w-4 text-yellow-600" />}
                                </div>
                                <div className="text-sm text-muted-foreground">{member.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge className={roleColors[member.role] || "bg-gray-100 text-gray-800"}>
                              {member.role}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <Badge className={statusColors[member.status]}>
                              {member.status === "active" && <CheckCircle className="h-3 w-3 mr-1" />}
                              {member.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                              {member.status}
                            </Badge>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            {member.lastActive || "Never"}
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            {new Date(member.joinDate).toLocaleDateString()}
                          </td>
                          <td className="p-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => openEditDialog(member)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Member
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => openDeleteDialog(member)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Remove Member
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="mt-8 rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
            {teamActivities.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No recent activity</p>
            ) : (
              <div className="space-y-4">
                {teamActivities.slice(0, 10).map((activity) => (
                  <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                    <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.createdAt && new Date(activity.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Invite Member Dialog */}
        <Dialog open={showInviteDialog} onOpenChange={handleCloseInviteDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Invite Team Member
              </DialogTitle>
              <DialogDescription>
                Send an invitation to a new team member. They will receive an email with instructions to join your team.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleInviteMember(); }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-name" className="text-sm font-medium">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="invite-name"
                  value={inviteForm.name}
                  onChange={(e) => {
                    setInviteForm({ ...inviteForm, name: e.target.value });
                    if (formErrors.invite.name) {
                      setFormErrors(prev => ({ ...prev, invite: { ...prev.invite, name: "" } }));
                    }
                  }}
                  placeholder="e.g. John Doe"
                  className={formErrors.invite.name ? "border-red-500 focus:border-red-500" : ""}
                  disabled={inviteLoading}
                  autoComplete="name"
                />
                {formErrors.invite.name && (
                  <p className="text-sm text-red-600">{formErrors.invite.name}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="invite-email" className="text-sm font-medium">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => {
                    setInviteForm({ ...inviteForm, email: e.target.value });
                    if (formErrors.invite.email) {
                      setFormErrors(prev => ({ ...prev, invite: { ...prev.invite, email: "" } }));
                    }
                  }}
                  placeholder="e.g. john.doe@company.com"
                  className={formErrors.invite.email ? "border-red-500 focus:border-red-500" : ""}
                  disabled={inviteLoading}
                  autoComplete="email"
                />
                {formErrors.invite.email && (
                  <p className="text-sm text-red-600">{formErrors.invite.email}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="invite-role" className="text-sm font-medium">
                  Role <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={inviteForm.role} 
                  onValueChange={(value) => {
                    setInviteForm({ ...inviteForm, role: value });
                    if (formErrors.invite.role) {
                      setFormErrors(prev => ({ ...prev, invite: { ...prev.invite, role: "" } }));
                    }
                  }}
                  disabled={inviteLoading}
                >
                  <SelectTrigger className={formErrors.invite.role ? "border-red-500 focus:border-red-500" : ""}>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamRoles.map((role) => (
                      <SelectItem key={role.id} value={role.name}>
                        <div className="flex flex-col">
                          <span className="font-medium">{role.name}</span>
                          {role.description && (
                            <span className="text-xs text-muted-foreground">{role.description}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.invite.role && (
                  <p className="text-sm text-red-600">{formErrors.invite.role}</p>
                )}
              </div>
              
              <DialogFooter className="gap-2 pt-4">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={handleCloseInviteDialog}
                  disabled={inviteLoading}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={inviteLoading || !inviteForm.name || !inviteForm.email || !inviteForm.role}
                  className="gap-2"
                >
                  {inviteLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      Send Invitation
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Member Dialog */}
        <Dialog open={showEditDialog} onOpenChange={handleCloseEditDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Edit Team Member
              </DialogTitle>
              <DialogDescription>
                Update team member information and permissions.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleEditMember(); }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-sm font-medium">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => {
                    setEditForm({ ...editForm, name: e.target.value });
                    if (formErrors.edit.name) {
                      setFormErrors(prev => ({ ...prev, edit: { ...prev.edit, name: "" } }));
                    }
                  }}
                  placeholder="Enter full name"
                  className={formErrors.edit.name ? "border-red-500 focus:border-red-500" : ""}
                  disabled={editLoading}
                  autoComplete="name"
                />
                {formErrors.edit.name && (
                  <p className="text-sm text-red-600">{formErrors.edit.name}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-email" className="text-sm font-medium">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => {
                    setEditForm({ ...editForm, email: e.target.value });
                    if (formErrors.edit.email) {
                      setFormErrors(prev => ({ ...prev, edit: { ...prev.edit, email: "" } }));
                    }
                  }}
                  placeholder="Enter email address"
                  className={formErrors.edit.email ? "border-red-500 focus:border-red-500" : ""}
                  disabled={editLoading}
                  autoComplete="email"
                />
                {formErrors.edit.email && (
                  <p className="text-sm text-red-600">{formErrors.edit.email}</p>
                )}
              </div>
              
                            <div className="space-y-2">
                <Label htmlFor="edit-role" className="text-sm font-medium">
                  Role <span className="text-red-500">*</span>
                </Label>
                <Select 
                  key={`edit-role-${selectedMember?.id}`}
                  value={editForm.role}
                  defaultValue={editForm.role}
                  onValueChange={(value) => {
                    setEditForm({ ...editForm, role: value });
                    if (formErrors.edit.role) {
                      setFormErrors(prev => ({ ...prev, edit: { ...prev.edit, role: "" } }));
                    }
                  }}
                  disabled={editLoading}
                >
                  <SelectTrigger className={formErrors.edit.role ? "border-red-500 focus:border-red-500" : ""}>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamRoles.map((role) => (
                      <SelectItem key={role.id} value={role.name}>
                        <div className="flex flex-col">
                          <span className="font-medium">{role.name}</span>
                          {role.description && (
                            <span className="text-xs text-muted-foreground">{role.description}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.edit.role && (
                  <p className="text-sm text-red-600">{formErrors.edit.role}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-status" className="text-sm font-medium">
                  Status <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={editForm.status} 
                  onValueChange={(value: TeamMember["status"]) => {
                    setEditForm({ ...editForm, status: value });
                    if (formErrors.edit.status) {
                      setFormErrors(prev => ({ ...prev, edit: { ...prev.edit, status: "" } }));
                    }
                  }}
                  disabled={editLoading}
                >
                  <SelectTrigger className={formErrors.edit.status ? "border-red-500 focus:border-red-500" : ""}>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>Active</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="pending">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-yellow-600" />
                        <span>Pending</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="inactive">
                      <div className="flex items-center gap-2">
                        <X className="h-4 w-4 text-red-600" />
                        <span>Inactive</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {formErrors.edit.status && (
                  <p className="text-sm text-red-600">{formErrors.edit.status}</p>
                )}
              </div>
              
              <DialogFooter className="gap-2 pt-4">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={handleCloseEditDialog}
                  disabled={editLoading}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={editLoading || !editForm.name || !editForm.email || !editForm.role || !editForm.status}
                  className="gap-2"
                >
                  {editLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Update Member
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Member Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove {selectedMember?.name} from the team? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteMember} className="bg-red-600 hover:bg-red-700">
                Remove Member
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Outlet />
      </div>
      <Toaster />
    </div>
  );
}
