// app/dashboard/profile/profile.tsx
"use client";

import {
  collection,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  Check,
  KeyRound,
  Loader2,
  Save,
  ShieldAlert,
  User,
  UserCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Toaster, toast } from "sonner";
import { useAuth } from "~/context/auth-context";
import { setupUserPassword } from "~/lib/auth";

import { getAuth, signOut } from "firebase/auth";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { db } from "~/lib/firebase";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const navigate = useNavigate();

  // Password States
  const [hasPassword, setHasPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<
    "weak" | "medium" | "strong" | ""
  >("");

  useEffect(() => {
    if (user) {
      setDisplayName(user.name || "");
      // Use the hasPassword property from AuthUser if available
      setHasPassword(user.hasPassword || false);
    }
  }, [user]);

  // Evaluate password strength when newPassword changes
  useEffect(() => {
    if (!newPassword) {
      setPasswordStrength("");
      return;
    }

    // Basic password strength check
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasNumbers = /[0-9]/.test(newPassword);
    const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(
      newPassword
    );
    const length = newPassword.length;

    const score = [
      hasLowerCase,
      hasUpperCase,
      hasNumbers,
      hasSpecialChars,
    ].filter(Boolean).length;

    if (length < 8) {
      setPasswordStrength("weak");
    } else if (score <= 2) {
      setPasswordStrength("medium");
    } else {
      setPasswordStrength("strong");
    }
  }, [newPassword]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !displayName.trim()) return;

    try {
      setIsSubmitting(true);

      // Use the team member query to find the document by email
      const teamMemberQuery = query(
        collection(db, "teamMembers"),
        where("email", "==", user.email)
      );

      const querySnapshot = await getDocs(teamMemberQuery);

      if (querySnapshot.empty) {
        throw new Error("User profile not found");
      }

      const teamMemberRef = querySnapshot.docs[0].ref;

      await updateDoc(teamMemberRef, {
        name: displayName.trim(),
        updatedAt: new Date().toISOString(),
      });

      // Refresh user data
      await refreshUser();

      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetupPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords don't match");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }

    try {
      setIsSubmitting(true);

      // Use the imported setupUserPassword function from auth.ts
      if (hasPassword && !currentPassword) {
        setPasswordError("Current password is required");
        setIsSubmitting(false);
        return;
      }

      // Call the auth function with proper parameters
      await setupUserPassword(
        newPassword,
        hasPassword ? currentPassword : undefined
      );

      setHasPassword(true);
      setNewPassword("");
      setConfirmPassword("");
      setCurrentPassword("");
      setPasswordDialogOpen(false);

      toast.success(
        hasPassword
          ? "Password updated successfully"
          : "Password set up successfully"
      );

      // Refresh user to update hasPassword state
      await refreshUser();
    } catch (error: any) {
      // In handleSetupPassword function, update the catch block
      console.error("Error setting up password:", error);

      if (error.code === "auth/wrong-password") {
        setPasswordError("Current password is incorrect");
      } else if (
        error.code === "auth/requires-recent-login" ||
        error.message?.includes("auth/requires-recent-login")
      ) {
        setPasswordError("");
        setPasswordDialogOpen(false);

        // Show a user-friendly message with redirect option
        const shouldRelogin = window.confirm(
          "For security reasons, you need to sign in again before setting up a password. " +
            "Would you like to sign out now? You'll need to sign back in to continue."
        );

        if (shouldRelogin) {
          // Sign out the user
          const auth = getAuth();
          await signOut(auth);
          // Redirect to login
          navigate("/auth/login");
        }
      } else {
        setPasswordError(error.message || "Failed to set up password");
      }
    }
  };

  // Generate initials from name
  const getInitials = (name: string) => {
    const nameParts = name.split(" ");
    if (nameParts.length === 1) {
      return nameParts[0].substring(0, 2).toUpperCase();
    } else {
      return (nameParts[0][0] + (nameParts[1]?.[0] || "")).toUpperCase();
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <Toaster position="top-right" />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <UserCircle className="size-6" />
            My Profile
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            View and manage your account details
          </p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList>
          <TabsTrigger value="profile" className="flex items-center gap-1.5">
            <User className="size-4" />
            <span>Profile</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-1.5">
            <KeyRound className="size-4" />
            <span>Security</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="size-5" />
                Account Information
              </CardTitle>
              <CardDescription>
                View and edit your profile information
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleUpdateProfile}>
              <CardContent className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <Avatar className="size-20">
                    <AvatarFallback className="bg-primary/10 text-primary text-lg">
                      {getInitials(displayName || user.name || "")}
                    </AvatarFallback>
                  </Avatar>

                  <div className="space-y-1.5 flex-1">
                    <Label htmlFor="name">Display Name</Label>
                    <Input
                      id="name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your name"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    value={user.email}
                    disabled
                    className="bg-muted/50 mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Your email address cannot be changed
                  </p>
                </div>

                <div>
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    value={user.role || "Team Member"}
                    disabled
                    className="bg-muted/50 mt-2"
                  />
                </div>
              </CardContent>

              <CardFooter>
                <Button
                  className="mt-2"
                  type="submit"
                  disabled={
                    !displayName.trim() ||
                    isSubmitting ||
                    displayName === user.name
                  }
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 size-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="size-5" />
                Password Management
              </CardTitle>
              <CardDescription>
                {hasPassword
                  ? "Update your account password"
                  : "Set up a password for quick login"}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="bg-muted/30 p-4 rounded-md flex items-start gap-3">
                <ShieldAlert className="size-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">
                    {hasPassword
                      ? "You have a password set up"
                      : "You're currently using passwordless authentication"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {hasPassword
                      ? "You can use your email and password to sign in, or continue using magic links."
                      : "Setting up a password allows you to sign in with your email and password instead of using magic links."}
                  </p>
                </div>
              </div>
            </CardContent>

            <CardFooter>
              <Button onClick={() => setPasswordDialogOpen(true)}>
                <KeyRound className="mr-2 size-4" />
                {hasPassword ? "Change Password" : "Set Up Password"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {hasPassword ? "Change Your Password" : "Set Up Password"}
            </DialogTitle>
            <DialogDescription>
              {hasPassword
                ? "Enter your current password and a new password to update your credentials."
                : "Create a password to enable email and password login."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSetupPassword} className="space-y-4 py-4">
            {hasPassword && (
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="new-password">
                {hasPassword ? "New Password" : "Password"}
              </Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={
                  hasPassword ? "Enter new password" : "Create a password"
                }
              />
              {passwordStrength && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        passwordStrength === "weak"
                          ? "w-1/3 bg-red-500"
                          : passwordStrength === "medium"
                          ? "w-2/3 bg-amber-500"
                          : "w-full bg-green-500"
                      }`}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground capitalize">
                    {passwordStrength}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
              />
            </div>

            {passwordError && (
              <p className="text-sm text-destructive">{passwordError}</p>
            )}

            <DialogFooter className="pt-4">
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setPasswordDialogOpen(false);
                  setPasswordError("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setCurrentPassword("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  !newPassword ||
                  !confirmPassword ||
                  (hasPassword && !currentPassword)
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 size-4" />
                    {hasPassword ? "Update Password" : "Set Password"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
