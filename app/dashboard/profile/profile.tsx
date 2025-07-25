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
  Clock,
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
import { TooltipProvider } from "~/components/ui/tooltip";
import { db } from "~/lib/firebase";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [justSaved, setJustSaved] = useState(false);
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

  // Check if user has set up a password by checking if they have a UID in Firestore
  useEffect(() => {
    const checkPasswordStatus = async () => {
      if (!user) return;

      setDisplayName(user.name || "");

      try {
        // Query Firestore to check if the user has a UID in their document
        const teamMemberQuery = query(
          collection(db, "teamMembers"),
          where("email", "==", user.email)
        );

        const querySnapshot = await getDocs(teamMemberQuery);

        if (!querySnapshot.empty) {
          const teamMemberData = querySnapshot.docs[0].data();
          // If the user has a UID in Firestore, they've set up a password
          const hasUidInFirestore = Boolean(teamMemberData.uid);
          setHasPassword(hasUidInFirestore);
        } else {
          setHasPassword(false);
        }
      } catch (error) {
        console.error("Error checking password status:", error);
        setHasPassword(false);
      }
    };

    checkPasswordStatus();
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

      // Show success state
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);

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

      // Check if current password is required but not provided
      if (hasPassword && !currentPassword) {
        setPasswordError("Current password is required");
        setIsSubmitting(false);
        return;
      }

      // Call the setupUserPassword function with the appropriate parameters
      await setupUserPassword(
        newPassword,
        hasPassword ? currentPassword : undefined
      );

      // Find the teamMember document and update the UID field if it's not already set
      const teamMemberQuery = query(
        collection(db, "teamMembers"),
        where("email", "==", user?.email)
      );

      const querySnapshot = await getDocs(teamMemberQuery);

      if (!querySnapshot.empty) {
        const teamMemberRef = querySnapshot.docs[0].ref;
        const auth = getAuth();
        const currentUser = auth.currentUser;

        if (currentUser) {
          // Update the UID in Firestore to indicate the user has set up a password
          await updateDoc(teamMemberRef, {
            uid: currentUser.uid,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // Success! Clean up the form and update states
      setHasPassword(true);
      setNewPassword("");
      setConfirmPassword("");
      setCurrentPassword("");
      setPasswordDialogOpen(false);

      // Show success message
      toast.success(
        hasPassword
          ? "Password updated successfully"
          : "Password set up successfully"
      );

      // Refresh user data to get the updated password status
      await refreshUser();
    } catch (error: any) {
      console.error("Error setting up password:", error);

      // Handle specific error cases
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetPasswordDialog = () => {
    setPasswordDialogOpen(false);
    setPasswordError("");
    setNewPassword("");
    setConfirmPassword("");
    setCurrentPassword("");
    setPasswordStrength("");
  };

  // Generate initials from name
  const getInitials = (name: string) => {
    if (!name) return "?";
    const names = name.trim().split(" ");
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (
      names[0].charAt(0) + names[names.length - 1].charAt(0)
    ).toUpperCase();
  };

  // Format last updated date
  const formatLastUpdated = (date: string | Date) => {
    if (!date) return null;
    try {
      const d = typeof date === "string" ? new Date(date) : date;
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return null;
    }
  };

  // Show loading state if user data is not available
  if (!user) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-4 px-4 sm:py-6 sm:px-6 lg:py-8 lg:px-8 max-w-5xl">
          <Toaster position="top-right" />

          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2 sm:gap-3">
                  <UserCircle className="h-6 w-6" />
                  My Profile
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Manage your account settings and preferences
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-700 font-medium">
                  Online
                </span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6 sm:space-y-8"
          >
            <div className="border-b border-border">
              <TabsList className="h-12 sm:h-14 bg-transparent p-0 gap-4 sm:gap-8 w-full justify-start">
                <TabsTrigger
                  value="profile"
                  className="flex items-center gap-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 sm:pb-4 transition-all duration-200 hover:text-primary text-xs sm:text-sm"
                >
                  <User className="size-3 sm:size-4" />
                  <span className="font-medium">Profile</span>
                </TabsTrigger>
                <TabsTrigger
                  value="security"
                  className="flex items-center gap-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 sm:pb-4 transition-all duration-200 hover:text-primary text-xs sm:text-sm"
                >
                  <KeyRound className="size-3 sm:size-4" />
                  <span className="font-medium">Security</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent
              value="profile"
              className="space-y-6 sm:space-y-8 mt-6 sm:mt-8"
            >
              <Card className="shadow-sm">
                <CardHeader className="pb-4 sm:pb-6">
                  <CardTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg">
                    <div className="p-1 sm:p-1.5 bg-primary/10 rounded-lg">
                      <User className="size-3 sm:size-4 text-primary" />
                    </div>
                    Account Information
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Update your personal details and profile information
                  </CardDescription>
                </CardHeader>

                <form onSubmit={handleUpdateProfile}>
                  <CardContent className="space-y-6 sm:space-y-8 p-4 sm:p-6">
                    {/* Avatar Section */}
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 p-4 sm:p-6 bg-muted/30 rounded-lg border">
                      <div className="relative">
                        <Avatar className="size-16 sm:size-20 ring-4 ring-white shadow-lg">
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-lg sm:text-2xl font-bold">
                            {getInitials(displayName || user.name || "")}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      <div className="space-y-3 flex-1 w-full sm:w-auto text-center sm:text-left">
                        <div className="flex items-center justify-center sm:justify-start gap-2">
                          <Label htmlFor="name" className="text-sm font-medium">
                            Display Name
                          </Label>
                          {justSaved && (
                            <div className="flex items-center gap-1 text-green-600 animate-in fade-in-0 duration-500">
                              <Check className="size-3" />
                              <span className="text-xs font-medium">Saved</span>
                            </div>
                          )}
                        </div>
                        <Input
                          id="name"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Enter your display name"
                          className="text-sm sm:text-base h-10 sm:h-11"
                        />
                      </div>
                    </div>

                    {/* Account Details */}
                    <div className="grid gap-4 sm:gap-6">
                      <div className="space-y-2 sm:space-y-3">
                        <Label htmlFor="email" className="text-sm font-medium">
                          Email Address
                        </Label>
                        <Input
                          id="email"
                          value={user.email}
                          disabled
                          className="bg-muted/50 h-10 sm:h-11 text-sm sm:text-base"
                        />
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <ShieldAlert className="size-3 flex-shrink-0" />
                          Your email address cannot be changed for security
                          reasons
                        </p>
                      </div>

                      <div className="space-y-2 sm:space-y-3">
                        <Label htmlFor="role" className="text-sm font-medium">
                          Role
                        </Label>
                        <Input
                          id="role"
                          value={user.role || "Team Member"}
                          disabled
                          className="bg-muted/50 h-10 sm:h-11 text-sm sm:text-base"
                        />
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 pt-4 sm:pt-6 border-t p-4 sm:p-6">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {user.updatedAt && (
                        <>
                          <Clock className="size-3 flex-shrink-0" />
                          <span>
                            Last updated: {formatLastUpdated(user.updatedAt)}
                          </span>
                        </>
                      )}
                    </div>

                    <Button
                      type="submit"
                      disabled={
                        !displayName.trim() ||
                        isSubmitting ||
                        displayName === user.name
                      }
                      className="min-w-[120px] sm:min-w-[140px] h-9 sm:h-11 text-xs sm:text-sm"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 size-3 sm:size-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 size-3 sm:size-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>

            <TabsContent
              value="security"
              className="space-y-6 sm:space-y-8 mt-6 sm:mt-8"
            >
              <Card className="shadow-sm">
                <CardHeader className="pb-4 sm:pb-6">
                  <CardTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg">
                    <div className="p-1 sm:p-1.5 bg-primary/10 rounded-lg">
                      <KeyRound className="size-3 sm:size-4 text-primary" />
                    </div>
                    Password Management
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {hasPassword
                      ? "Update your account password for enhanced security"
                      : "Set up a password for quick and secure login access"}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
                  <div
                    className={`p-4 sm:p-6 rounded-lg border-2 transition-all duration-300 ${
                      hasPassword
                        ? "bg-green-50 border-green-200"
                        : "bg-amber-50 border-amber-200"
                    }`}
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div
                        className={`p-2 rounded-full ${
                          hasPassword ? "bg-green-100" : "bg-amber-100"
                        }`}
                      >
                        <ShieldAlert
                          className={`size-4 sm:size-5 ${
                            hasPassword ? "text-green-600" : "text-amber-600"
                          }`}
                        />
                      </div>
                      <div className="space-y-2 flex-1">
                        <h4
                          className={`font-medium text-sm sm:text-base ${
                            hasPassword ? "text-green-800" : "text-amber-800"
                          }`}
                        >
                          {hasPassword
                            ? "✓ Password Protection Enabled"
                            : "⚡ Using Passwordless Authentication"}
                        </h4>
                        <p
                          className={`text-xs sm:text-sm leading-relaxed ${
                            hasPassword ? "text-green-700" : "text-amber-700"
                          }`}
                        >
                          {hasPassword
                            ? "Your account is secured with a password. You can sign in using either your email and password, or continue using magic links for convenience."
                            : "You're currently using our secure magic link system for authentication. Setting up a password gives you an additional login option with your email and password."}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <h4 className="font-medium mb-3 text-sm sm:text-base">
                      Authentication Methods
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-muted/30 border">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
                            <svg
                              className="size-3 sm:size-4 text-primary"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 8l7.89 7.89a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-xs sm:text-sm">
                              Magic Link
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Sign in via email
                            </p>
                          </div>
                        </div>
                        <div className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                          Active
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-muted/30 border">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
                            <KeyRound className="size-3 sm:size-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-xs sm:text-sm">
                              Email & Password
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Traditional login
                            </p>
                          </div>
                        </div>
                        <div
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            hasPassword
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {hasPassword ? "Active" : "Not Set"}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pt-4 sm:pt-6 border-t p-4 sm:p-6">
                  <Button
                    onClick={() => setPasswordDialogOpen(true)}
                    className="h-9 sm:h-11 text-xs sm:text-sm"
                    variant={hasPassword ? "outline" : "default"}
                  >
                    <KeyRound className="mr-2 size-3 sm:size-4" />
                    {hasPassword ? "Change Password" : "Set Up Password"}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Password Dialog */}
          <Dialog
            open={passwordDialogOpen}
            onOpenChange={setPasswordDialogOpen}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader className="space-y-3">
                <DialogTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <KeyRound className="size-4 sm:size-5 text-primary" />
                  </div>
                  {hasPassword ? "Change Your Password" : "Set Up Password"}
                </DialogTitle>
                <DialogDescription className="leading-relaxed text-xs sm:text-sm">
                  {hasPassword
                    ? "Enter your current password and create a new one to update your credentials."
                    : "Create a secure password to enable email and password login alongside magic links."}
                </DialogDescription>
              </DialogHeader>

              <form
                onSubmit={handleSetupPassword}
                className="space-y-4 sm:space-y-6 py-4 sm:py-6"
              >
                {hasPassword && (
                  <div className="space-y-2">
                    <Label
                      htmlFor="current-password"
                      className="text-xs sm:text-sm font-medium"
                    >
                      Current Password
                    </Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter your current password"
                      className="h-10 sm:h-11 text-sm"
                    />
                  </div>
                )}

                <div className="space-y-2 sm:space-y-3">
                  <Label
                    htmlFor="new-password"
                    className="text-xs sm:text-sm font-medium"
                  >
                    {hasPassword ? "New Password" : "Password"}
                  </Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={
                      hasPassword
                        ? "Enter your new password"
                        : "Create a secure password"
                    }
                    className="h-10 sm:h-11 text-sm"
                  />
                  {passwordStrength && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Password strength
                        </span>
                        <span
                          className={`text-xs font-medium capitalize ${
                            passwordStrength === "weak"
                              ? "text-red-600"
                              : passwordStrength === "medium"
                              ? "text-amber-600"
                              : "text-green-600"
                          }`}
                        >
                          {passwordStrength}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ease-out ${
                            passwordStrength === "weak"
                              ? "w-1/3 bg-red-500"
                              : passwordStrength === "medium"
                              ? "w-2/3 bg-amber-500"
                              : "w-full bg-green-500"
                          }`}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="confirm-password"
                    className="text-xs sm:text-sm font-medium"
                  >
                    Confirm Password
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="h-10 sm:h-11 text-sm"
                  />
                </div>

                {passwordError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs sm:text-sm text-red-700 font-medium">
                      {passwordError}
                    </p>
                  </div>
                )}

                <DialogFooter className="gap-2 sm:gap-3 pt-2 sm:pt-4">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={resetPasswordDialog}
                    className="h-9 sm:h-11 text-xs sm:text-sm"
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
                    className="h-9 sm:h-11 min-w-[100px] sm:min-w-[120px] text-xs sm:text-sm"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 size-3 sm:size-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 size-3 sm:size-4" />
                        {hasPassword ? "Update" : "Set Password"}
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </TooltipProvider>
  );
}
