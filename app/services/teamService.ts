// app/services/teamService.ts
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "~/lib/firebase";
import type {
  TeamMember,
  TeamRole,
  TeamInvitation,
  TeamActivity,
  TeamStats,
  Permission,
} from "~/types/team";
import { DEFAULT_ROLES } from "~/types/team";

class TeamService {
  private readonly COLLECTIONS = {
    TEAM_MEMBERS: "teamMembers",
    TEAM_ROLES: "teamRoles",
    TEAM_INVITATIONS: "teamInvitations",
    TEAM_ACTIVITIES: "teamActivities",
  };

  // Team Members
  async getTeamMembers(): Promise<TeamMember[]> {
    try {
      const q = query(
        collection(db, this.COLLECTIONS.TEAM_MEMBERS),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as TeamMember[];
    } catch (error) {
      console.error("Error fetching team members:", error);
      throw error;
    }
  }

  subscribeToTeamMembers(callback: (members: TeamMember[]) => void): Unsubscribe {
    const q = query(
      collection(db, this.COLLECTIONS.TEAM_MEMBERS),
      orderBy("createdAt", "desc")
    );

    return onSnapshot(q, (snapshot) => {
      try {
        const members = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || "",
            email: data.email || "",
            role: data.role || "",
            status: data.status || "pending",
            avatar: data.avatar,
            joinDate: data.joinDate || new Date().toISOString(),
            lastActive: data.lastActive,
            permissions: data.permissions || [],
            invitedBy: data.invitedBy,
            department: data.department,
            phoneNumber: data.phoneNumber,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
          } as TeamMember;
        });
        callback(members);
      } catch (error) {
        console.error("Error processing team members snapshot:", error);
        callback([]);
      }
    });
  }

  async getTeamMember(id: string): Promise<TeamMember | null> {
    try {
      const docRef = doc(db, this.COLLECTIONS.TEAM_MEMBERS, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data(),
        } as TeamMember;
      }
      return null;
    } catch (error) {
      console.error("Error fetching team member:", error);
      throw error;
    }
  }

  async addTeamMember(memberData: Omit<TeamMember, "id" | "createdAt" | "updatedAt">): Promise<string> {
    try {
      // Ensure required fields are present and valid
      if (!memberData.name || !memberData.email || !memberData.role) {
        throw new Error("Missing required fields: name, email, or role");
      }

      // Filter out undefined/null values
      const filteredData: any = {};
      Object.entries(memberData).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          filteredData[key] = value;
        }
      });

      // Set default values for required fields if not provided
      const memberToAdd = {
        ...filteredData,
        status: filteredData.status || "pending",
        permissions: filteredData.permissions || [],
        joinDate: filteredData.joinDate || new Date().toISOString(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, this.COLLECTIONS.TEAM_MEMBERS), memberToAdd);

      // Log activity
      await this.logActivity({
        type: "member_added",
        description: `${memberData.name} was added to the team`,
        performedBy: memberData.invitedBy || "system",
        performedByName: "System",
        targetUserId: docRef.id,
        targetUserName: memberData.name,
      });

      return docRef.id;
    } catch (error) {
      console.error("Error adding team member:", error);
      throw error;
    }
  }

  async updateTeamMember(id: string, updates: Partial<TeamMember>): Promise<void> {
    try {
      // Filter out undefined values to prevent Firestore errors
      const filteredUpdates: any = {};
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          filteredUpdates[key] = value;
        }
      });

      // Only proceed if there are valid updates
      if (Object.keys(filteredUpdates).length === 0) {
        throw new Error("No valid updates provided");
      }

      const docRef = doc(db, this.COLLECTIONS.TEAM_MEMBERS, id);
      await updateDoc(docRef, {
        ...filteredUpdates,
        updatedAt: serverTimestamp(),
      });

      // Log activity for role changes
      if (filteredUpdates.role) {
        const member = await this.getTeamMember(id);
        await this.logActivity({
          type: "role_changed",
          description: `${member?.name}'s role was changed to ${filteredUpdates.role}`,
          performedBy: "current_user", // This should be passed from the UI
          performedByName: "Current User",
          targetUserId: id,
          targetUserName: member?.name || "Unknown",
          metadata: { newRole: filteredUpdates.role, oldRole: member?.role },
        });
      }
    } catch (error) {
      console.error("Error updating team member:", error);
      throw error;
    }
  }

  async deleteTeamMember(id: string): Promise<void> {
    try {
      const member = await this.getTeamMember(id);
      const docRef = doc(db, this.COLLECTIONS.TEAM_MEMBERS, id);
      await deleteDoc(docRef);

      // Log activity
      if (member) {
        await this.logActivity({
          type: "member_removed",
          description: `${member.name} was removed from the team`,
          performedBy: "current_user", // This should be passed from the UI
          performedByName: "Current User",
          targetUserId: id,
          targetUserName: member.name,
        });
      }
    } catch (error) {
      console.error("Error deleting team member:", error);
      throw error;
    }
  }

  // Team Roles
  async getTeamRoles(): Promise<TeamRole[]> {
    try {
      const q = query(
        collection(db, this.COLLECTIONS.TEAM_ROLES),
        orderBy("name", "asc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as TeamRole[];
    } catch (error) {
      console.error("Error fetching team roles:", error);
      throw error;
    }
  }

  async addTeamRole(roleData: Omit<TeamRole, "id" | "createdAt" | "updatedAt">): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.COLLECTIONS.TEAM_ROLES), {
        ...roleData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error("Error adding team role:", error);
      throw error;
    }
  }

  async updateTeamRole(id: string, updates: Partial<TeamRole>): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTIONS.TEAM_ROLES, id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating team role:", error);
      throw error;
    }
  }

  async deleteTeamRole(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTIONS.TEAM_ROLES, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error("Error deleting team role:", error);
      throw error;
    }
  }

  // Team Invitations
  async getTeamInvitations(): Promise<TeamInvitation[]> {
    try {
      const q = query(
        collection(db, this.COLLECTIONS.TEAM_INVITATIONS),
        orderBy("sentAt", "desc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as TeamInvitation[];
    } catch (error) {
      console.error("Error fetching team invitations:", error);
      throw error;
    }
  }

  async sendTeamInvitation(invitationData: Omit<TeamInvitation, "id" | "sentAt" | "expiresAt" | "status">): Promise<string> {
    try {
      // Validate required fields
      if (!invitationData.email || !invitationData.role || !invitationData.invitedBy) {
        throw new Error("Missing required fields: email, role, or invitedBy");
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expire in 7 days

      const invitationToAdd = {
        email: invitationData.email,
        role: invitationData.role,
        invitedBy: invitationData.invitedBy,
        invitedByName: invitationData.invitedByName || "Unknown",
        status: "pending" as const,
        sentAt: serverTimestamp(),
        expiresAt: expiresAt.toISOString(),
      };

      const docRef = await addDoc(collection(db, this.COLLECTIONS.TEAM_INVITATIONS), invitationToAdd);

      // Log activity
      await this.logActivity({
        type: "invitation_sent",
        description: `Invitation sent to ${invitationData.email}`,
        performedBy: invitationData.invitedBy,
        performedByName: invitationData.invitedByName || "Unknown",
        metadata: { email: invitationData.email, role: invitationData.role },
      });

      return docRef.id;
    } catch (error) {
      console.error("Error sending team invitation:", error);
      throw error;
    }
  }

  async updateInvitationStatus(id: string, status: TeamInvitation["status"]): Promise<void> {
    try {
      if (!id || !status) {
        throw new Error("Missing required parameters: id or status");
      }

      const docRef = doc(db, this.COLLECTIONS.TEAM_INVITATIONS, id);
      const updateData: any = {
        status,
        updatedAt: serverTimestamp(),
      };

      if (status === "accepted") {
        updateData.acceptedAt = serverTimestamp();
      } else if (status === "declined") {
        updateData.declinedAt = serverTimestamp();
      }

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error("Error updating invitation status:", error);
      throw error;
    }
  }

  // Team Activities
  async getTeamActivities(limit: number = 50): Promise<TeamActivity[]> {
    try {
      const q = query(
        collection(db, this.COLLECTIONS.TEAM_ACTIVITIES),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      const activities = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as TeamActivity[];
      
      return activities.slice(0, limit);
    } catch (error) {
      console.error("Error fetching team activities:", error);
      throw error;
    }
  }

  subscribeToTeamActivities(callback: (activities: TeamActivity[]) => void, limit: number = 20): Unsubscribe {
    const q = query(
      collection(db, this.COLLECTIONS.TEAM_ACTIVITIES),
      orderBy("createdAt", "desc")
    );

    return onSnapshot(q, (snapshot) => {
      try {
        const activities = snapshot.docs.map((doc) => {
          const data = doc.data();
          
          // Handle different date formats from Firebase
          let createdAt: string;
          if (data.createdAt) {
            try {
              // Handle Firebase Timestamp objects
              if (typeof data.createdAt === 'object' && 'seconds' in data.createdAt) {
                createdAt = new Date(data.createdAt.seconds * 1000).toISOString();
              } else if (typeof data.createdAt === 'string') {
                // Validate ISO string
                const testDate = new Date(data.createdAt);
                if (isNaN(testDate.getTime())) {
                  createdAt = new Date().toISOString();
                } else {
                  createdAt = data.createdAt;
                }
              } else {
                // Try to convert whatever format it is
                const testDate = new Date(data.createdAt);
                createdAt = isNaN(testDate.getTime()) ? new Date().toISOString() : testDate.toISOString();
              }
            } catch (error) {
              console.warn("Error parsing createdAt for team activity:", error);
              createdAt = new Date().toISOString();
            }
          } else {
            createdAt = new Date().toISOString();
          }
          
          return {
            id: doc.id,
            type: data.type,
            description: data.description || "",
            performedBy: data.performedBy || "",
            performedByName: data.performedByName || "",
            targetUserId: data.targetUserId,
            targetUserName: data.targetUserName,
            metadata: data.metadata,
            createdAt,
          } as TeamActivity;
        });
        callback(activities.slice(0, limit));
      } catch (error) {
        console.error("Error processing team activities snapshot:", error);
        callback([]);
      }
    });
  }

  private async logActivity(activityData: Omit<TeamActivity, "id" | "createdAt">): Promise<void> {
    try {
      // Filter out undefined values
      const filteredData: any = {};
      Object.entries(activityData).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          filteredData[key] = value;
        }
      });

      // Ensure required fields have defaults
      const activityToAdd = {
        type: filteredData.type,
        description: filteredData.description || "Activity performed",
        performedBy: filteredData.performedBy || "system",
        performedByName: filteredData.performedByName || "System",
        targetUserId: filteredData.targetUserId,
        targetUserName: filteredData.targetUserName,
        metadata: filteredData.metadata,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, this.COLLECTIONS.TEAM_ACTIVITIES), activityToAdd);
    } catch (error) {
      console.error("Error logging team activity:", error);
      // Don't throw here to avoid breaking the main operation
    }
  }

  // Team Statistics
  async getTeamStats(): Promise<TeamStats> {
    try {
      const [members, invitations] = await Promise.all([
        this.getTeamMembers(),
        this.getTeamInvitations(),
      ]);

      const activeMembers = members.filter(m => m.status === "active").length;
      const pendingInvitations = invitations.filter(i => i.status === "pending").length;
      
      // Calculate new members this month
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      
      const newMembersThisMonth = members.filter(m => {
        const joinDate = new Date(m.joinDate);
        return joinDate >= thisMonth;
      }).length;

      const roles = await this.getTeamRoles();

      return {
        totalMembers: members.length,
        activeMembers,
        pendingInvitations,
        totalRoles: roles.length,
        averageRating: 4.8, // This could be calculated from feedback data
        newMembersThisMonth,
      };
    } catch (error) {
      console.error("Error calculating team stats:", error);
      throw error;
    }
  }

  // Utility methods
  async initializeDefaultRoles(): Promise<void> {
    try {
      const existingRoles = await this.getTeamRoles();
      if (existingRoles.length > 0) {
        return; // Already initialized
      }

      const batch = writeBatch(db);
      
      Object.values(DEFAULT_ROLES).forEach((role) => {
        const docRef = doc(collection(db, this.COLLECTIONS.TEAM_ROLES));
        batch.set(docRef, {
          ...role,
          isDefault: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      await batch.commit();
    } catch (error) {
      console.error("Error initializing default roles:", error);
      throw error;
    }
  }

  async updateDefaultRoles(): Promise<void> {
    try {
      // Get ALL team roles (not just default ones) to check for duplicates
      const allRoles = await this.getTeamRoles();
      console.log("All roles before cleanup:", allRoles.map(r => ({ name: r.name, isDefault: r.isDefault })));
      
      const batch = writeBatch(db);
      
      // Delete ALL default roles (to handle duplicates)
      allRoles.forEach((role) => {
        if (role.isDefault) {
          const docRef = doc(db, this.COLLECTIONS.TEAM_ROLES, role.id);
          batch.delete(docRef);
        }
      });
      
      // Add the new default roles (only once)
      Object.values(DEFAULT_ROLES).forEach((role) => {
        const docRef = doc(collection(db, this.COLLECTIONS.TEAM_ROLES));
        batch.set(docRef, {
          ...role,
          isDefault: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      await batch.commit();
      console.log("Default roles updated successfully");
    } catch (error) {
      console.error("Error updating default roles:", error);
      throw error;
    }
  }

  async cleanupDuplicateRoles(): Promise<void> {
    try {
      const allRoles = await this.getTeamRoles();
      console.log("All roles before duplicate cleanup:", allRoles.map(r => ({ id: r.id, name: r.name, isDefault: r.isDefault })));
      
      // Group roles by name to find duplicates
      const roleGroups: { [key: string]: TeamRole[] } = {};
      allRoles.forEach(role => {
        if (!roleGroups[role.name]) {
          roleGroups[role.name] = [];
        }
        roleGroups[role.name].push(role);
      });
      
      const batch = writeBatch(db);
      let duplicatesFound = false;
      
      // Keep only one instance of each role name
      Object.entries(roleGroups).forEach(([roleName, roles]) => {
        if (roles.length > 1) {
          console.log(`Found ${roles.length} duplicates for role: ${roleName}`);
          duplicatesFound = true;
          
          // Keep the first role, delete the rest
          roles.slice(1).forEach(role => {
            const docRef = doc(db, this.COLLECTIONS.TEAM_ROLES, role.id);
            batch.delete(docRef);
          });
        }
      });
      
      if (duplicatesFound) {
        await batch.commit();
        console.log("Duplicate roles cleaned up successfully");
      } else {
        console.log("No duplicate roles found");
      }
    } catch (error) {
      console.error("Error cleaning up duplicate roles:", error);
      throw error;
    }
  }

  async migrateToNewRoles(): Promise<void> {
    try {
      // First, cleanup any duplicate roles
      await this.cleanupDuplicateRoles();
      
      // Check if migration is needed by looking for old role names
      const existingRoles = await this.getTeamRoles();
      console.log("Current roles in database after cleanup:", existingRoles.map(r => ({ name: r.name, isDefault: r.isDefault })));
      
      const currentRoleNames = existingRoles.map(role => role.name);
      const expectedRoleNames = Object.values(DEFAULT_ROLES).map(role => role.name);
      
      console.log("Current role names:", currentRoleNames);
      console.log("Expected role names:", expectedRoleNames);
      
      // Check if we have the new roles structure
      const hasNewRoles = expectedRoleNames.every(name => currentRoleNames.includes(name));
      const hasOldRoles = currentRoleNames.includes("HR Manager") || currentRoleNames.includes("Junior Recruiter");
      
      console.log("Has new roles:", hasNewRoles);
      console.log("Has old roles:", hasOldRoles);
      
      if (hasNewRoles && !hasOldRoles) {
        console.log("Roles are already up to date");
        return;
      }
      
      console.log("Migrating to new role structure...");
      await this.updateDefaultRoles();
      console.log("Role migration completed");
    } catch (error) {
      console.error("Error during role migration:", error);
      throw error;
    }
  }

  // Permission helpers
  hasPermission(member: TeamMember, permission: Permission): boolean {
    return member.permissions.includes(permission);
  }

  hasAnyPermission(member: TeamMember, permissions: Permission[]): boolean {
    return permissions.some(permission => member.permissions.includes(permission));
  }

  async getMembersByRole(roleName: string): Promise<TeamMember[]> {
    try {
      const q = query(
        collection(db, this.COLLECTIONS.TEAM_MEMBERS),
        where("role", "==", roleName)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as TeamMember[];
    } catch (error) {
      console.error("Error fetching members by role:", error);
      throw error;
    }
  }
}

export const teamService = new TeamService();
