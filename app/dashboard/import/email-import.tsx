// app/dashboard/import/email-import.tsx

import { Check, Info, Loader2, Mail, RefreshCw, Search, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { AppDispatch } from "~/store";
// Import the email service
import { emailService } from "~/services/emailService";

// Email provider configuration interfaces
interface EmailProvider {
  id: string;
  name: string;
  icon: React.ReactNode;
  authUrl: string;
  requiredScopes: string[];
}

interface EmailMessage {
  id: string;
  from: {
    name: string;
    email: string;
  };
  subject: string;
  receivedAt: string;
  hasAttachments: boolean;
  attachments?: EmailAttachment[];
  isSelected?: boolean;
  isProcessed?: boolean;
}

interface EmailAttachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
  isResume: boolean; // Based on file extension
}

interface EmailImportProps {
  onImportComplete: (data: any) => void;
}

const providers: EmailProvider[] = [
  {
    id: "gmail",
    name: "Gmail",
    icon: <Mail className="h-4 w-4" />,
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    requiredScopes: ["https://www.googleapis.com/auth/gmail.readonly"],
  },
  {
    id: "outlook",
    name: "Outlook",
    icon: <Mail className="h-4 w-4" />,
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    requiredScopes: ["Mail.Read"],
  },
  {
    id: "other",
    name: "IMAP",
    icon: <Mail className="h-4 w-4" />,
    authUrl: "",
    requiredScopes: [],
  },
];

// Email import hook
const useEmailImport = (onImportComplete?: (data: any) => void) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [provider, setProvider] = useState<string>("gmail");
  const [emailCredentials, setEmailCredentials] = useState<any>(null);
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [showOnlyWithAttachments, setShowOnlyWithAttachments] = useState(true);

  // Used for server email credentials
  const [imapServer, setImapServer] = useState("");
  const [imapPort, setImapPort] = useState("993");
  const [imapUsername, setImapUsername] = useState("");
  const [imapPassword, setImapPassword] = useState("");

  const dispatch = useDispatch<AppDispatch>();

  // Check if we have stored credentials
  useEffect(() => {
    const checkExistingConnection = async () => {
      try {
        // In a real app, you would check localStorage, sessionStorage, or secure storage
        const storedCredentials = localStorage.getItem("emailCredentials");

        if (storedCredentials) {
          const credentials = JSON.parse(storedCredentials);
          setEmailCredentials(credentials);
          setIsConnected(true);
          setProvider(credentials.provider);
        }
      } catch (error) {
        console.error("Error checking existing email connection:", error);
      }
    };

    checkExistingConnection();
  }, []);

  // Connect to email provider
  const connectToProvider = async () => {
    setIsConnecting(true);

    try {
      // Instead of simulating the connection, actually connect via the backend
      const credentials = {
        provider,
        server: provider === "other" ? imapServer : undefined,
        port: provider === "other" ? imapPort : undefined,
        username: provider === "other" ? imapUsername : imapUsername, // Gmail/Outlook still need username
        password: provider === "other" ? imapPassword : imapPassword, // Gmail/Outlook still need password
      };

      // Call the backend to verify credentials and setup connection
      await emailService.importCandidatesFromEmail(credentials);

      // Store minimal credential info (no passwords) for state management
      const safeCredentials = {
        provider,
        username: imapUsername,
        server: provider === "other" ? imapServer : undefined,
      };

      localStorage.setItem("emailCredentials", JSON.stringify(safeCredentials));
      setEmailCredentials(safeCredentials);
      setIsConnected(true);
      toast.success(
        `Connected to ${provider === "other" ? "IMAP server" : provider}`
      );

      // Immediately fetch emails after connecting
      await fetchEmails();
    } catch (error) {
      console.error("Error connecting to email provider:", error);

      // Handle specific error types
      if (
        error instanceof Error &&
        error.message.includes("authentication failed")
      ) {
        toast.error("Authentication failed. Please check your credentials.");
      } else if (
        error instanceof Error &&
        error.message.includes("connection refused")
      ) {
        toast.error(
          "Connection refused. Please check server details and try again."
        );
      } else {
        toast.error("Failed to connect to email provider");
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect from email provider
  const disconnectProvider = () => {
    // Clear stored credentials
    localStorage.removeItem("emailCredentials");
    setEmailCredentials(null);
    setIsConnected(false);
    setEmails([]);
    setSelectedEmails([]);
    toast.success("Disconnected from email provider");
  };

  // Fetch emails from provider
  const fetchEmails = async () => {
    if (!isConnected || !emailCredentials) {
      toast.error("Not connected to email provider");
      return;
    }

    setIsLoadingEmails(true);

    try {
      // Actually fetch emails from the backend
      const response = await emailService.importCandidatesFromEmail({
        ...emailCredentials,
        action: "listEmails",
        filters: {
          dateFilter,
          showOnlyWithAttachments,
          searchQuery,
        },
      });

      setEmails(response.emails || []);
    } catch (error) {
      console.error("Error fetching emails:", error);

      // Handle specific error types
      if (error instanceof Error && error.message.includes("session expired")) {
        toast.error("Email session expired. Please reconnect.");
        // Disconnect to force reconnection
        disconnectProvider();
      } else {
        toast.error("Failed to fetch emails");
      }
    } finally {
      setIsLoadingEmails(false);
    }
  };

  // Toggle email selection
  const toggleEmailSelection = (emailId: string) => {
    setSelectedEmails((prevSelected) => {
      if (prevSelected.includes(emailId)) {
        return prevSelected.filter((id) => id !== emailId);
      } else {
        return [...prevSelected, emailId];
      }
    });
  };

  // Toggle select all emails
  const toggleSelectAll = () => {
    if (selectedEmails.length === filteredEmails.length) {
      setSelectedEmails([]);
    } else {
      setSelectedEmails(filteredEmails.map((email) => email.id));
    }
  };

  // Filter emails based on search and filters
  const filteredEmails = emails.filter((email) => {
    const matchesSearch =
      searchQuery === "" ||
      email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.from.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.from.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDate =
      dateFilter === "all" ||
      (dateFilter === "today" &&
        new Date(email.receivedAt).toDateString() ===
          new Date().toDateString()) ||
      (dateFilter === "week" &&
        new Date(email.receivedAt) >
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) ||
      (dateFilter === "month" &&
        new Date(email.receivedAt) >
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

    const matchesAttachments = !showOnlyWithAttachments || email.hasAttachments;

    return matchesSearch && matchesDate && matchesAttachments;
  });

  // Process selected emails
  const processSelectedEmails = async () => {
    if (selectedEmails.length === 0) {
      toast.error("No emails selected");
      return;
    }

    const toastId = toast.loading(
      `Processing ${selectedEmails.length} emails...`
    );

    try {
      // Process emails via the backend service
      const result = await emailService.importCandidatesFromEmail({
        ...emailCredentials,
        action: "processEmails",
        emailIds: selectedEmails,
      });

      toast.dismiss(toastId);
      toast.success(`Processed ${result.processed} emails successfully`);

      // Mark processed emails
      setEmails((prevEmails) =>
        prevEmails.map((email) =>
          selectedEmails.includes(email.id)
            ? { ...email, isProcessed: true }
            : email
        )
      );

      setSelectedEmails([]);

      // Notify the parent component if needed
      if (typeof onImportComplete === "function") {
        onImportComplete(result.candidates);
      }
    } catch (error) {
      console.error("Error processing emails:", error);
      toast.dismiss(toastId);

      // Handle specific error types
      if (error instanceof Error && error.message.includes("session expired")) {
        toast.error("Email session expired. Please reconnect.");
        // Disconnect to force reconnection
        disconnectProvider();
      } else if (
        error instanceof Error &&
        error.message.includes("parser error")
      ) {
        toast.error(
          "Error parsing email content. Some candidates may not be imported correctly."
        );
      } else {
        toast.error("Failed to process emails");
      }
    }
  };

  return {
    isConnected,
    isConnecting,
    provider,
    setProvider,
    emails: filteredEmails,
    isLoadingEmails,
    selectedEmails,
    searchQuery,
    setSearchQuery,
    dateFilter,
    setDateFilter,
    showOnlyWithAttachments,
    setShowOnlyWithAttachments,
    imapServer,
    setImapServer,
    imapPort,
    setImapPort,
    imapUsername,
    setImapUsername,
    imapPassword,
    setImapPassword,
    connectToProvider,
    disconnectProvider,
    fetchEmails,
    toggleEmailSelection,
    toggleSelectAll,
    processSelectedEmails,
  };
};

const EmailImport: React.FC<EmailImportProps> = ({ onImportComplete }) => {
  const {
    isConnected,
    isConnecting,
    provider,
    setProvider,
    emails,
    isLoadingEmails,
    selectedEmails,
    searchQuery,
    setSearchQuery,
    dateFilter,
    setDateFilter,
    showOnlyWithAttachments,
    setShowOnlyWithAttachments,
    imapServer,
    setImapServer,
    imapPort,
    setImapPort,
    imapUsername,
    setImapUsername,
    imapPassword,
    setImapPassword,
    connectToProvider,
    disconnectProvider,
    fetchEmails,
    toggleEmailSelection,
    toggleSelectAll,
    processSelectedEmails,
  } = useEmailImport(onImportComplete);

  return (
    <div className="space-y-4">
      {!isConnected ? (
        // Connection form
        <>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Email Provider
              </Label>
              <RadioGroup
                value={provider}
                onValueChange={setProvider}
                className="grid grid-cols-3 gap-2"
              >
                {providers.map((p) => (
                  <div key={p.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={p.id} id={`provider-${p.id}`} />
                    <Label
                      htmlFor={`provider-${p.id}`}
                      className="flex items-center gap-1"
                    >
                      {p.icon}
                      {p.name}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {provider === "other" && (
              <div className="space-y-3 border rounded-md p-3 bg-muted/30">
                <div>
                  <Label htmlFor="imap-server">IMAP Server</Label>
                  <Input
                    id="imap-server"
                    placeholder="imap.example.com"
                    value={imapServer}
                    onChange={(e) => setImapServer(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="imap-port">Port</Label>
                  <Input
                    id="imap-port"
                    placeholder="993"
                    value={imapPort}
                    onChange={(e) => setImapPort(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="imap-username">Username/Email</Label>
                  <Input
                    id="imap-username"
                    placeholder="user@example.com"
                    value={imapUsername}
                    onChange={(e) => setImapUsername(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="imap-password">Password</Label>
                  <Input
                    id="imap-password"
                    type="password"
                    placeholder="Password"
                    value={imapPassword}
                    onChange={(e) => setImapPassword(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <Button
            onClick={connectToProvider}
            disabled={isConnecting}
            className="w-full mt-2"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Connect to {provider === "other" ? "IMAP Server" : provider}
              </>
            )}
          </Button>
        </>
      ) : (
        // Email management
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="font-normal flex gap-1 items-center"
              >
                <Mail className="h-3.5 w-3.5" />
                {provider === "other"
                  ? "IMAP Server"
                  : `${provider.charAt(0).toUpperCase()}${provider.slice(1)}`}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={disconnectProvider}
                className="h-7 text-xs"
              >
                Disconnect
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchEmails}
                disabled={isLoadingEmails}
                className="h-7 text-xs"
              >
                {isLoadingEmails ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                <span className="ml-1">Refresh</span>
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
                disabled={emails.length === 0}
                className="h-7 text-xs"
              >
                {selectedEmails.length === emails.length && emails.length > 0
                  ? "Deselect All"
                  : "Select All"}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={processSelectedEmails}
                disabled={selectedEmails.length === 0}
                className="h-7 text-xs"
              >
                <span className="mr-1">Import</span>
                {selectedEmails.length > 0 && `(${selectedEmails.length})`}
              </Button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 my-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full w-10 opacity-70 hover:opacity-100"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[180px] h-10">
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-attachments"
                checked={showOnlyWithAttachments}
                onCheckedChange={(value) => setShowOnlyWithAttachments(!!value)}
              />
              <Label htmlFor="show-attachments" className="text-sm">
                Show only emails with attachments
              </Label>
            </div>
          </div>

          <div className="border rounded-md overflow-hidden">
            {isLoadingEmails ? (
              <div className="p-8 flex flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p>Loading emails...</p>
              </div>
            ) : emails.length === 0 ? (
              <div className="p-8 flex flex-col items-center justify-center text-center">
                <Mail className="h-8 w-8 text-muted-foreground mb-4" />
                <p className="font-medium">No emails found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchQuery ||
                  dateFilter !== "all" ||
                  showOnlyWithAttachments
                    ? "Try changing your filters"
                    : "Your inbox is empty"}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {emails.map((email) => (
                  <div
                    key={email.id}
                    className={`p-4 hover:bg-muted/40 ${
                      selectedEmails.includes(email.id) ? "bg-primary/5" : ""
                    } ${email.isProcessed ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedEmails.includes(email.id)}
                        onCheckedChange={() => toggleEmailSelection(email.id)}
                        disabled={email.isProcessed}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="font-medium truncate">
                            {email.from.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(email.receivedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {email.from.email}
                        </div>
                        <div className="text-sm mt-1 font-medium">
                          {email.subject}
                        </div>

                        {email.hasAttachments && email.attachments && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {email.attachments.map((attachment) => (
                              <Badge
                                key={attachment.id}
                                variant={
                                  attachment.isResume ? "default" : "outline"
                                }
                                className={`text-xs ${
                                  attachment.isResume
                                    ? "bg-primary/20 text-primary"
                                    : ""
                                }`}
                              >
                                {attachment.name} (
                                {(attachment.size / 1024).toFixed(0)} KB)
                              </Badge>
                            ))}
                          </div>
                        )}

                        {email.isProcessed && (
                          <div className="mt-2 flex items-center text-xs text-green-500">
                            <Check className="h-3 w-3 mr-1" />
                            Imported
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <div>
              {emails.length} {emails.length === 1 ? "email" : "emails"} found
              {(searchQuery ||
                dateFilter !== "all" ||
                showOnlyWithAttachments) &&
                " matching filters"}
            </div>
            <div className="flex items-center gap-1">
              <Info className="h-3 w-3" />
              {selectedEmails.length === 0
                ? "Select emails to import"
                : `${selectedEmails.length} email${
                    selectedEmails.length === 1 ? "" : "s"
                  } selected`}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EmailImport;
