// app/dashboard/import/email-import.tsx

import { addDoc, collection, getDocs, query, where } from "firebase/firestore";
import {
  Calendar,
  Check,
  Info,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  Shield,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Progress } from "~/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { db } from "~/lib/firebase";

// Email provider types
export type EmailProvider = "gmail" | "outlook" | "other";

// Email message interface
export interface EmailMessage {
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
  isImported?: boolean;
}

// Email attachment interface
export interface EmailAttachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
  isResume: boolean;
}

// Email provider configuration
export interface EmailConfig {
  provider: EmailProvider;
  server?: string;
  port?: string;
  username: string;
  password: string;
}

// Email import props
interface EmailImportProps {
  onImportComplete: (data: any) => void;
}

// Default API endpoint for email operations
const API_ENDPOINT = import.meta.env.VITE_API_URL || "/api";

// Email import hook
export const useEmailImport = () => {
  // Connection states
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [provider, setProvider] = useState<EmailProvider>("gmail");
  const [emailCredentials, setEmailCredentials] = useState<EmailConfig | null>(
    null
  );

  // Email data states
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);

  // Filtering states
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [showOnlyWithAttachments, setShowOnlyWithAttachments] = useState(true);
  const [showOnlyJobRelated, setShowOnlyJobRelated] = useState(true);

  // IMAP server credentials
  const [imapServer, setImapServer] = useState("");
  const [imapPort, setImapPort] = useState("993");
  const [imapUsername, setImapUsername] = useState("");
  const [imapPassword, setImapPassword] = useState("");

  // Check for existing connection on mount
  useEffect(() => {
    const checkExistingConnection = async () => {
      try {
        // Check for stored credentials in localStorage (for demo)
        // In production, you should use a more secure method
        const storedCredentials = localStorage.getItem("emailCredentials");

        if (storedCredentials) {
          const credentials = JSON.parse(storedCredentials) as EmailConfig;
          setEmailCredentials(credentials);
          setIsConnected(true);
          setProvider(credentials.provider);

          // If we have stored credentials, load emails automatically
          await fetchEmails(credentials);
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
    setImportProgress(10);

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
          password: imapPassword, // This would be an OAuth token in production
        };
      }

      setImportProgress(30);

      // Make API call to connect to email provider
      // Updated endpoint path to /api/email/inbox/connect
      const response = await fetch(`${API_ENDPOINT}/email/inbox/connect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": import.meta.env.VITE_API_KEY || "",
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to connect to email provider"
        );
      }

      setImportProgress(50);

      // Store credentials (in a real app, store tokens securely)
      localStorage.setItem("emailCredentials", JSON.stringify(credentials));
      setEmailCredentials(credentials);
      setIsConnected(true);

      setImportProgress(70);

      // Fetch emails after connecting
      await fetchEmails(credentials);

      setImportProgress(100);
      toast.success(
        `Connected to ${provider === "other" ? "IMAP server" : provider}`
      );
    } catch (error) {
      console.error("Error connecting to email provider:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to connect to email provider"
      );
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect from email provider
  const disconnectProvider = () => {
    localStorage.removeItem("emailCredentials");
    setEmailCredentials(null);
    setIsConnected(false);
    setEmails([]);
    setSelectedEmails([]);
    toast.success("Disconnected from email provider");
  };

  // Fetch emails from provider
  const fetchEmails = async (config?: EmailConfig) => {
    const credentials = config || emailCredentials;

    if (!isConnected && !credentials) {
      toast.error("Not connected to email provider");
      return;
    }

    setIsLoadingEmails(true);
    setImportProgress(10);

    try {
      // const {
      //   provider,
      //   server,
      //   port,
      //   username,
      //   password,
      //   filters = {},
      // } = req.body;
      // Include above the API call to fetch emails
      // Make API call to fetch emails
      // Updated endpoint path to /api/email/inbox/list
      const response = await fetch(`${API_ENDPOINT}/email/inbox/list`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": import.meta.env.VITE_API_KEY || "",
        },
        body: JSON.stringify({
          ...credentials,
          filters: {
            dateFilter,
            withAttachments: showOnlyWithAttachments,
            jobRelated: showOnlyJobRelated,
            searchTerm: searchQuery,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch emails");
      }

      setImportProgress(50);

      const data = await response.json();
      const fetchedEmails: EmailMessage[] = data.emails || [];

      // Check which emails are already imported
      const emailAddresses = fetchedEmails
        .map((email) => email.from.email)
        .filter(Boolean);

      if (emailAddresses.length > 0) {
        // Chunk the email addresses to avoid Firestore "in" query limits
        const chunkSize = 10; // Firestore allows up to 10 values in 'in' queries
        const emailChunks = [];

        for (let i = 0; i < emailAddresses.length; i += chunkSize) {
          emailChunks.push(emailAddresses.slice(i, i + chunkSize));
        }

        // Query Firestore for existing candidates with these emails
        const importedEmails = new Set<string>();

        // Process each chunk separately
        for (const chunk of emailChunks) {
          if (chunk.length === 0) continue;

          const candidatesQuery = query(
            collection(db, "candidates"),
            where("email", "in", chunk)
          );

          const querySnapshot = await getDocs(candidatesQuery);

          querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.email) {
              importedEmails.add(data.email);
            }
          });
        }

        // Mark emails as imported if they exist in Firestore
        setEmails(
          fetchedEmails.map((email) => ({
            ...email,
            isImported: importedEmails.has(email.from.email),
          }))
        );
      } else {
        setEmails(fetchedEmails);
      }

      setImportProgress(100);
    } catch (error) {
      console.error("Error fetching emails:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to fetch emails"
      );
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

  // Toggle select all emails and deselect all emails
  const toggleSelectAll = () => {
    if (selectedEmails.length === emails.length) {
      setSelectedEmails([]);
    } else {
      const allEmailIds = emails.map((email) => email.id);
      setSelectedEmails(allEmailIds);
    }
  };

  // Process selected emails
  const processSelectedEmails = async () => {
    if (selectedEmails.length === 0) {
      toast.error("No emails selected");
      return;
    }

    setImportProgress(0);
    const processingToast = toast.loading(
      `Processing ${selectedEmails.length} emails...`
    );

    try {
      // Make API call to process selected emails
      // Updated endpoint path to /api/email/inbox/process
      const response = await fetch(`${API_ENDPOINT}/email/inbox/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": import.meta.env.VITE_API_KEY || "",
        },
        body: JSON.stringify({
          ...emailCredentials,
          emailIds: selectedEmails,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to process emails");
      }

      const result = await response.json();

      // If no API available, process locally as fallback
      if (!result.success && !result.processed) {
        // Get selected email objects
        const selectedEmailObjects = emails.filter((email) =>
          selectedEmails.includes(email.id)
        );

        // Track progress for visual feedback
        let completed = 0;

        // For each selected email
        for (const email of selectedEmailObjects) {
          setImportProgress(
            Math.round((completed / selectedEmailObjects.length) * 80)
          );

          // Prepare candidate data
          const candidateData = {
            name: email.from.name,
            email: email.from.email,
            source: "email_import",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            notes: `Imported from email: ${email.subject}`,
            stageId: "", // Default stage
            history: [
              {
                date: new Date().toISOString(),
                note: `Imported from email with subject: "${email.subject}"`,
              },
            ],
          };

          // Store imported candidates in Firestore without batch operation)
          try {
            await addDoc(collection(db, "candidates"), candidateData);
            completed++;
          } catch (error) {
            console.error("Error adding candidate to Firestore:", error);
            toast.error(
              error instanceof Error
                ? error.message
                : "Failed to add candidate to Firestore"
            );
          }
        }
      }

      setImportProgress(100);
      toast.dismiss(processingToast);
      toast.success(`Processed ${selectedEmails.length} emails successfully`);

      // Mark processed emails
      setEmails((prevEmails) =>
        prevEmails.map((email) =>
          selectedEmails.includes(email.id)
            ? { ...email, isProcessed: true, isImported: false }
            : email
        )
      );

      // Clear selection
      setSelectedEmails([]);
    } catch (error) {
      console.error("Error processing emails:", error);
      toast.dismiss(processingToast);
      toast.error(
        error instanceof Error ? error.message : "Failed to process emails"
      );
    } finally {
      // Reset progress after a delay
      setTimeout(() => setImportProgress(0), 2000);
    }
  };

  // Check if an email is job-related based on subject
  const isJobRelatedEmail = (subject: string): boolean => {
    const lowerSubject = subject.toLowerCase();
    return (
      lowerSubject.includes("job") ||
      lowerSubject.includes("candidate") ||
      lowerSubject.includes("resume") ||
      lowerSubject.includes("cv")
    );
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

    const matchesJobRelated =
      !showOnlyJobRelated || isJobRelatedEmail(email.subject);

    return (
      matchesSearch && matchesDate && matchesAttachments && matchesJobRelated
    );
  });

  // Return hook methods and state
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
    showOnlyJobRelated,
    setShowOnlyJobRelated,
    imapServer,
    setImapServer,
    imapPort,
    setImapPort,
    imapUsername,
    setImapUsername,
    imapPassword,
    setImapPassword,
    importProgress,
    connectToProvider,
    disconnectProvider,
    fetchEmails: () => fetchEmails(),
    toggleEmailSelection,
    toggleSelectAll,
    processSelectedEmails,
  };
};

// Main EmailImport component
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
    showOnlyJobRelated,
    setShowOnlyJobRelated,
    imapServer,
    setImapServer,
    imapPort,
    setImapPort,
    imapUsername,
    setImapUsername,
    imapPassword,
    setImapPassword,
    importProgress,
    connectToProvider,
    disconnectProvider,
    fetchEmails,
    toggleEmailSelection,
    toggleSelectAll,
    processSelectedEmails,
  } = useEmailImport();

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
                onValueChange={(value: EmailProvider) => setProvider(value)}
                className="grid grid-cols-3 gap-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="gmail" id="provider-gmail" />
                  <Label
                    htmlFor="provider-gmail"
                    className="flex items-center gap-1"
                  >
                    <Mail className="size-4" />
                    <span className="text-sm">Gmail</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="outlook" id="provider-outlook" />
                  <Label
                    htmlFor="provider-outlook"
                    className="flex items-center gap-1"
                  >
                    <Mail className="size-4" />
                    <span className="text-sm">Outlook</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="provider-other" />
                  <Label
                    htmlFor="provider-other"
                    className="flex items-center gap-1"
                  >
                    <Mail className="size-4" />
                    <span className="text-sm">IMAP</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Email credential inputs */}
            <div className="space-y-3 border rounded-md p-3 bg-muted/30">
              {provider === "other" && (
                <>
                  <div>
                    <Label htmlFor="imap-server" className="text-sm">
                      IMAP Server
                    </Label>
                    <Input
                      id="imap-server"
                      placeholder="imap.example.com"
                      value={imapServer}
                      onChange={(e) => setImapServer(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="imap-port" className="text-sm">
                      Port
                    </Label>
                    <Input
                      id="imap-port"
                      placeholder="993"
                      value={imapPort}
                      onChange={(e) => setImapPort(e.target.value)}
                    />
                  </div>
                </>
              )}
              <div>
                <Label htmlFor="email-username" className="text-sm">
                  Username/Email
                </Label>
                <Input
                  id="email-username"
                  placeholder="user@example.com"
                  value={imapUsername}
                  onChange={(e) => setImapUsername(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="email-password" className="text-sm">
                  {provider !== "other" ? "Password/App Password" : "Password"}
                </Label>
                <Input
                  id="email-password"
                  type="password"
                  placeholder="Password"
                  value={imapPassword}
                  onChange={(e) => setImapPassword(e.target.value)}
                />
                {provider !== "other" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    <Shield className="inline-block size-3 mr-1" />
                    For Gmail, use an app password.
                    <a
                      href="https://support.google.com/accounts/answer/185833"
                      target="_blank"
                      rel="noreferrer"
                      className="underline ml-1"
                    >
                      Learn more
                    </a>
                  </p>
                )}
              </div>
            </div>
          </div>

          {importProgress > 0 && (
            <div className="mt-4">
              <div className="flex justify-between mb-1">
                <span className="text-xs text-muted-foreground">
                  Connecting...
                </span>
                <span className="text-xs font-medium">{importProgress}%</span>
              </div>
              <Progress value={importProgress} className="w-full" />
            </div>
          )}

          <Button
            onClick={connectToProvider}
            disabled={isConnecting || !imapUsername || !imapPassword}
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
        // Email management - connected state
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
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
                {selectedEmails.length === emails.length ? (
                  <>
                    <X className="h-3 w-3" />
                    <span className="ml-1">Deselect All</span>
                  </>
                ) : (
                  <>
                    <Mail className="h-3 w-3" />
                    <span className="ml-1">Select All</span>
                  </>
                )}
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

          {/* Filter controls */}
          <div className="flex flex-col md:flex-row gap-3 my-3">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/3 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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

            <div className="flex flex-wrap items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-attachments"
                  checked={showOnlyWithAttachments}
                  onCheckedChange={(value) =>
                    setShowOnlyWithAttachments(!!value)
                  }
                />
                <Label htmlFor="show-attachments" className="text-sm">
                  With attachments
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-job-related"
                  checked={showOnlyJobRelated}
                  onCheckedChange={(value) => setShowOnlyJobRelated(!!value)}
                />
                <Label htmlFor="show-job-related" className="text-sm">
                  Job related
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Shows emails containing job-related keywords like 'job',
                      'candidate', 'resume', or 'cv'
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>

          {/* Progress indicator for import process */}
          {importProgress > 0 && (
            <div className="my-2">
              <div className="flex justify-between mb-1">
                <span className="text-xs text-muted-foreground">
                  {importProgress < 100 ? "Importing..." : "Import complete!"}
                </span>
                <span className="text-xs font-medium">{importProgress}%</span>
              </div>
              <Progress value={importProgress} className="w-full" />
            </div>
          )}

          {/* Email list */}
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
                  showOnlyWithAttachments ||
                  showOnlyJobRelated
                    ? "Try changing your filters"
                    : "Your inbox is empty or no job-related emails found"}
                </p>
              </div>
            ) : (
              <div className="divide-y max-h-[400px] overflow-y-auto">
                {emails.map((email) => (
                  <div
                    key={email.id}
                    className={`p-4 hover:bg-muted/40 ${
                      selectedEmails.includes(email.id) ? "bg-primary/5" : ""
                    } ${
                      email.isProcessed || email.isImported ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedEmails.includes(email.id)}
                        onCheckedChange={() => toggleEmailSelection(email.id)}
                        disabled={email.isProcessed || email.isImported}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <div className="font-medium truncate">
                            {email.from.name}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="size-3" />
                            <span>
                              {new Date(email.receivedAt).toLocaleDateString()}
                            </span>
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
                                {attachment.name.length > 30
                                  ? `${attachment.name.substring(0, 30)}...`
                                  : attachment.name}{" "}
                                ({(attachment.size / 1024).toFixed(0)} KB)
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="mt-2 flex items-center gap-2">
                          {email.isImported && (
                            <div className="text-xs flex items-center text-green-500">
                              <Check className="h-3 w-3 mr-1" />
                              Already imported
                            </div>
                          )}

                          {email.isProcessed && !email.isImported && (
                            <div className="text-xs flex items-center text-green-500">
                              <Check className="h-3 w-3 mr-1" />
                              Imported
                            </div>
                          )}
                        </div>
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
                showOnlyWithAttachments ||
                showOnlyJobRelated) &&
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

          <Separator className="my-2" />

          <Button
            onClick={processSelectedEmails}
            disabled={selectedEmails.length === 0}
            className="w-full"
          >
            {isLoadingEmails ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Process {selectedEmails.length} Selected Email
                {selectedEmails.length !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </>
      )}
    </div>
  );
};

export default EmailImport;
