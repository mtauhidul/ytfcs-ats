import { BellIcon, Loader2Icon } from "lucide-react";
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

interface AutomationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  stageTitle?: string;
}

export function AutomationDialog({
  isOpen,
  onClose,
  stageTitle,
}: AutomationDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <BellIcon className="size-5" />
            Stage Automations
          </AlertDialogTitle>
          <AlertDialogDescription>
            Configure alerts or automations for the{" "}
            <strong>{stageTitle}</strong> stage. Set up notifications, email
            templates, or actions to be triggered automatically.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <Loader2Icon className="size-10 text-muted-foreground/40 mx-auto mb-3 animate-spin" />
              <p className="text-muted-foreground">
                Automation features coming soon
              </p>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
          <AlertDialogAction disabled>Configure Automations</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
