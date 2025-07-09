// app/dashboard/monitoring/email-connection.tsx

import {
  Bot,
  Check,
  Clock,
  Info,
  Loader2,
  Mail,
  RefreshCw,
  Shield,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Progress } from "~/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Switch } from "~/components/ui/switch";

// Email provider types
export type EmailProvider = "gmail" | "outlook" | "other";

// Email provider configuration
export interface EmailConfig {
  provider: EmailProvider;
  server?: string;
  port?: string;
  username: string;
  password: string;
}

interface EmailConnectionProps {
  onConnectionSuccess?: () => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

const EmailConnection: React.FC<EmailConnectionProps> = ({
  onConnectionSuccess,
  isOpen: externalIsOpen,
  onOpenChange: externalOnOpenChange,
  trigger,
}) => {
  // Connection states
  const [isConnecting, setIsConnecting] = useState(false);
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [provider, setProvider] = useState<EmailProvider>("gmail");
  const [connectionProgress, setConnectionProgress] = useState(0);

  // Use external control if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = externalOnOpenChange || setInternalIsOpen;

  // IMAP server credentials
  const [imapServer, setImapServer] = useState("");
  const [imapPort, setImapPort] = useState("993");
  const [imapUsername, setImapUsername] = useState("");
  const [imapPassword, setImapPassword] = useState("");

  // Reset form function
  const resetForm = () => {
    setProvider("gmail");
    setImapServer("");
    setImapPort("993");
    setImapUsername("");
    setImapPassword("");
    setConnectionProgress(0);
  };

  // Connect to email provider
  const connectToProvider = async () => {
    setIsConnecting(true);
    setConnectionProgress(10);

    try {
      // Prepare credentials based on provider
      let credentials: EmailConfig;

      if (provider === "other") {
        if (!imapServer || !imapUsername || !imapPassword) {
          throw new Error("Please provide all IMAP server details");
        }

        credentials = {
          provider: "other",
          server: imapServer,
          port: imapPort,
          username: imapUsername,
          password: imapPassword,
        };
      } else {
        // For OAuth providers (Gmail, Outlook)
        credentials = {
          provider,
          username: imapUsername,
          password: imapPassword,
        };
      }

      setConnectionProgress(30);

      // Test connection to email provider
      const testResponse = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/email/test-connection`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": import.meta.env.VITE_API_KEY || "",
          },
          body: JSON.stringify(credentials),
        }
      );

      setConnectionProgress(60);

      if (!testResponse.ok) {
        const errorData = await testResponse.json();
        throw new Error(
          errorData.message || "Failed to connect to email provider"
        );
      }

      setConnectionProgress(80);

      // If connection test passes, add the account to automation system
      const addAccountResponse = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/email/automation/accounts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": import.meta.env.VITE_API_KEY || "",
          },
          body: JSON.stringify({
            ...credentials,
            automationEnabled: true, // Enable automation by default
          }),
        }
      );

      setConnectionProgress(100);

      if (!addAccountResponse.ok) {
        const errorData = await addAccountResponse.json();
        throw new Error(
          errorData.message || "Failed to add email account to automation"
        );
      }

      const result = await addAccountResponse.json();

      toast.success("Email account connected successfully!");
      
      // Reset form and close dialog
      resetForm();
      setIsOpen(false);
      
      // Notify parent component
      if (onConnectionSuccess) {
        onConnectionSuccess();
      }

    } catch (error) {
      console.error("Connection error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to connect to email"
      );
    } finally {
      setIsConnecting(false);
      setConnectionProgress(0);
    }
  };

  // Handle dialog close
  const handleDialogClose = () => {
    if (!isConnecting) {
      setIsOpen(false);
      resetForm();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {/* Only render DialogTrigger when not using external control */}
      {externalIsOpen === undefined && (
        <DialogTrigger asChild>
          <Button className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600">
            <Mail className="h-4 w-4 mr-2" />
            Connect Email Account
          </Button>
        </DialogTrigger>
      )}
      
      <DialogContent className="sm:max-w-[500px] max-w-[95vw] max-h-[90vh] overflow-y-auto mx-4" onInteractOutside={handleDialogClose}>
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Mail className="h-5 w-5 text-blue-500" />
            Connect Email Account
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Connect your email account to automatically monitor for new candidate emails and resumes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-w-full">
          {/* Provider Selection */}
          <div>
            <Label className="text-sm font-medium mb-3 block">
              Email Provider
            </Label>
            <RadioGroup
              value={provider}
              onValueChange={(value: EmailProvider) => setProvider(value)}
              className="grid grid-cols-1 gap-2"
            >
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="gmail" id="provider-gmail" />
                <Label
                  htmlFor="provider-gmail"
                  className="flex items-center gap-2 cursor-pointer text-sm flex-1 min-w-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                    <span>Gmail</span>
                  </div>
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    Most Popular
                  </Badge>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="outlook" id="provider-outlook" />
                <Label
                  htmlFor="provider-outlook"
                  className="flex items-center gap-2 cursor-pointer text-sm flex-1 min-w-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                    <span>Outlook</span>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="other" id="provider-other" />
                <Label
                  htmlFor="provider-other"
                  className="flex items-center gap-2 cursor-pointer text-sm flex-1 min-w-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0"></div>
                    <span>Other (IMAP)</span>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Connection Form */}
          <Card className="border-dashed">
            <CardContent className="p-3 sm:p-4 space-y-4">
              {provider === "other" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="imap-server" className="text-sm font-medium">
                      IMAP Server
                    </Label>
                    <Input
                      id="imap-server"
                      placeholder="imap.example.com"
                      value={imapServer}
                      onChange={(e) => setImapServer(e.target.value)}
                      className="mt-1"
                      disabled={isConnecting}
                    />
                  </div>
                  <div>
                    <Label htmlFor="imap-port" className="text-sm font-medium">
                      Port
                    </Label>
                    <Input
                      id="imap-port"
                      placeholder="993"
                      value={imapPort}
                      onChange={(e) => setImapPort(e.target.value)}
                      className="mt-1"
                      disabled={isConnecting}
                    />
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="email-username" className="text-sm font-medium">
                  Email Address
                </Label>
                <Input
                  id="email-username"
                  placeholder="user@example.com"
                  value={imapUsername}
                  onChange={(e) => setImapUsername(e.target.value)}
                  className="mt-1"
                  disabled={isConnecting}
                />
              </div>

              <div>
                <Label htmlFor="email-password" className="text-sm font-medium">
                  {provider !== "other" ? "Password / App Password" : "Password"}
                </Label>
                <Input
                  id="email-password"
                  type="password"
                  placeholder="Password"
                  value={imapPassword}
                  onChange={(e) => setImapPassword(e.target.value)}
                  className="mt-1"
                  disabled={isConnecting}
                />
                {provider === "gmail" && (
                  <div className="flex items-start gap-2 text-sm mt-2 bg-amber-50 text-amber-800 p-3 rounded-lg border border-amber-200">
                    <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Use App Password for Gmail</p>
                      <p className="text-xs mt-1">
                        For security, use an app-specific password instead of your regular password.{" "}
                        <a
                          href="https://support.google.com/accounts/answer/185833"
                          target="_blank"
                          rel="noreferrer"
                          className="underline hover:text-amber-900"
                        >
                          Learn how to create one
                        </a>
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Connection Progress */}
              {connectionProgress > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {connectionProgress < 30 ? "Validating credentials..." :
                       connectionProgress < 60 ? "Testing connection..." :
                       connectionProgress < 80 ? "Verifying email access..." :
                       "Setting up automation..."}
                    </span>
                    <span className="font-medium">{connectionProgress}%</span>
                  </div>
                  <Progress value={connectionProgress} className="h-2" />
                </div>
              )}

              {/* Info about automation */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Bot className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900">Auto-Monitoring Enabled</p>
                    <p className="text-blue-700 text-xs mt-1">
                      Once connected, your email will be automatically monitored for new candidate emails. 
                      Resumes will be parsed and stored automatically.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleDialogClose}
              disabled={isConnecting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={connectToProvider}
              disabled={isConnecting || !imapUsername || !imapPassword}
              className="w-full sm:w-auto min-w-[120px]"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Connect
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmailConnection;
