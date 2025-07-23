import { Loader2, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useAuth } from "~/context/auth-context";
import { sendInvitation, type UserRole } from "~/lib/auth";

interface InviteTeamMemberProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function InviteTeamMember({
  isOpen,
  onClose,
  onSuccess,
}: InviteTeamMemberProps) {
  const { user } = useAuth();
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    role: "Team Member" as UserRole,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setFormState({
      name: "",
      email: "",
      role: "Team Member",
    });
    setError(null);
  };

  const handleInvite = async () => {
    if (!user?.email) {
      setError("You must be logged in to invite team members");
      return;
    }

    // Validate the form
    if (!formState.name.trim()) {
      setError("Please enter a name");
      return;
    }

    if (!formState.email.trim()) {
      setError("Please enter an email address");
      return;
    }

    if (!formState.email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const success = await sendInvitation(
        formState.email,
        formState.name,
        formState.role,
        user.email
      );

      if (success) {
        toast.success(`Invitation sent to ${formState.name}`);
        resetForm();
        onClose();
        if (onSuccess) onSuccess();
      } else {
        throw new Error("Failed to send invitation");
      }
    } catch (err) {
      console.error("Error inviting team member:", err);
      setError("Failed to send invitation. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          resetForm();
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5" />
            Invite Team Member
          </DialogTitle>
          <DialogDescription>
            Send an email invitation to a new team member. They'll receive a
            magic link to access the system.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={formState.name}
              onChange={(e) =>
                setFormState({ ...formState, name: e.target.value })
              }
              disabled={isSubmitting}
              placeholder="John Doe"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formState.email}
              onChange={(e) =>
                setFormState({ ...formState, email: e.target.value })
              }
              disabled={isSubmitting}
              placeholder="john@example.com"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={formState.role}
              onValueChange={(value) =>
                setFormState({ ...formState, role: value as UserRole })
              }
              disabled={isSubmitting}
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="Hiring Manager">Hiring Manager</SelectItem>
                <SelectItem value="Recruiter">Recruiter</SelectItem>
                <SelectItem value="Interviewer">Interviewer</SelectItem>
                <SelectItem value="Team Member">Team Member</SelectItem>
                <SelectItem value="Client">Client</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="text-sm font-medium text-destructive">{error}</div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Send Invitation"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
