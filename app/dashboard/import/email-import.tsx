// app/dashboard/import/email-import.tsx

import { addDoc, collection, getDocs, query, where } from "firebase/firestore";
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
import { Separator } from "~/components/ui/separator";
import { db } from "~/lib/firebase";
import type { AppDispatch } from "~/store";

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
const useEmailImport = () => {
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

    // For demo purposes, we'll simulate the OAuth flow
    try {
      // In a real implementation, you would:
      // 1. Redirect to provider auth URL
      // 2. Handle the callback with code
      // 3. Exchange code for tokens
      // 4. Store tokens securely

      // Simulate OAuth flow delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // For IMAP server, validate credentials
      if (provider === "other") {
        if (!imapServer || !imapUsername || !imapPassword) {
          throw new Error("Please provide all IMAP server details");
        }

        // Simulate server connection
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const credentials = {
          provider: "other",
          server: imapServer,
          port: imapPort,
          username: imapUsername,
          // In a real app, never store passwords in localStorage
          // This is just for demonstration
          password: imapPassword,
        };

        // Store credentials (in a real app, use a secure method or just token)
        localStorage.setItem("emailCredentials", JSON.stringify(credentials));
        setEmailCredentials(credentials);
      } else {
        // For OAuth providers (Gmail, Outlook)
        const credentials = {
          provider,
          accessToken: "simulated_access_token",
          refreshToken: "simulated_refresh_token",
          expiresAt: Date.now() + 3600 * 1000, // 1 hour from now
        };

        // Store credentials (in a real app, use a secure method)
        localStorage.setItem("emailCredentials", JSON.stringify(credentials));
        setEmailCredentials(credentials);
      }

      setIsConnected(true);
      toast.success(
        `Connected to ${provider === "other" ? "IMAP server" : provider}`
      );

      // Immediately fetch emails after connecting
      await fetchEmails();
    } catch (error) {
      console.error("Error connecting to email provider:", error);
      toast.error("Failed to connect to email provider");
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
      // In a real implementation, you would:
      // 1. Call your backend API or directly use email provider's API
      // 2. Fetch emails and attachments
      // 3. Process and filter the results

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Generate mock email data
      const mockEmails: EmailMessage[] = Array.from({ length: 15 }, (_, i) => {
        const hasAttachments = Math.random() > 0.3;
        const attachments: EmailAttachment[] = hasAttachments
          ? [
              {
                id: `att-${i}-1`,
                name: `resume-${i}.${Math.random() > 0.5 ? "pdf" : "docx"}`,
                contentType:
                  Math.random() > 0.5
                    ? "application/pdf"
                    : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                size: Math.floor(Math.random() * 5000000) + 100000,
                isResume: true,
              },
              ...Array.from(
                { length: Math.floor(Math.random() * 2) },
                (_, j) => ({
                  id: `att-${i}-${j + 2}`,
                  name: `attachment-${j}.${
                    ["jpg", "png", "txt"][Math.floor(Math.random() * 3)]
                  }`,
                  contentType: ["image/jpeg", "image/png", "text/plain"][
                    Math.floor(Math.random() * 3)
                  ],
                  size: Math.floor(Math.random() * 1000000) + 10000,
                  isResume: false,
                })
              ),
            ]
          : [];

        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 30));

        return {
          id: `email-${i}`,
          from: {
            name: `Candidate ${i + 1}`,
            email: `candidate${i + 1}@example.com`,
          },
          subject: [
            `Job Application`,
            `Resume for review`,
            `Looking for opportunities`,
            `Application for position`,
          ][Math.floor(Math.random() * 4)],
          receivedAt: date.toISOString(),
          hasAttachments,
          attachments,
          isSelected: false,
        };
      });

      setEmails(mockEmails);
    } catch (error) {
      console.error("Error fetching emails:", error);
      toast.error("Failed to fetch emails");
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

    const processingToast = toast.loading(
      `Processing ${selectedEmails.length} emails...`
    );

    try {
      // For each selected email
      for (const emailId of selectedEmails) {
        const email = emails.find((e) => e.id === emailId);
        if (!email) continue;

        if (email.hasAttachments && email.attachments) {
          // Find resume attachments
          const resumeAttachments = email.attachments.filter(
            (att) => att.isResume
          );

          for (const attachment of resumeAttachments) {
            // In a real implementation, you would:
            // 1. Download attachment content
            // 2. Convert to a File object
            // 3. Process through AI parser or Affinda

            // Simulate API delay
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Create a basic candidate
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

            // Add to Firestore
            await addDoc(collection(db, "candidates"), candidateData);
          }
        } else if (email.from && email.from.email) {
          // Create candidate from sender if there are no attachments
          const candidateData = {
            name: email.from.name,
            email: email.from.email,
            source: "email_sender",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            notes: `Imported from email sender: ${email.subject}`,
            stageId: "", // Default stage
            history: [
              {
                date: new Date().toISOString(),
                note: `Imported from email sender with subject: "${email.subject}"`,
              },
            ],
          };

          // Check if candidate with this email already exists
          const q = query(
            collection(db, "candidates"),
            where("email", "==", email.from.email)
          );
          const querySnapshot = await getDocs(q);

          if (querySnapshot.empty) {
            // Only add if candidate doesn't exist
            await addDoc(collection(db, "candidates"), candidateData);
          }
        }
      }

      toast.dismiss(processingToast);
      toast.success(`Processed ${selectedEmails.length} emails successfully`);
      setSelectedEmails([]);

      // Mark processed emails
      setEmails((prevEmails) =>
        prevEmails.map((email) =>
          selectedEmails.includes(email.id)
            ? { ...email, isProcessed: true }
            : email
        )
      );
    } catch (error) {
      console.error("Error processing emails:", error);
      toast.dismiss(processingToast);
      toast.error("Failed to process emails");
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
                      <span className="text-sm">{p.name}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {provider === "other" && (
              <div className="space-y-3 border rounded-md p-3 bg-muted/30">
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
                <div>
                  <Label htmlFor="imap-username" className="text-sm">
                    Username/Email
                  </Label>
                  <Input
                    id="imap-username"
                    placeholder="user@example.com"
                    value={imapUsername}
                    onChange={(e) => setImapUsername(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="imap-password" className="text-sm">
                    Password
                  </Label>
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
              <div className="divide-y max-h-[300px] overflow-y-auto">
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
                        <div className="flex items-center justify-between flex-wrap gap-1">
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
                                {attachment.name.length > 30
                                  ? `${attachment.name.substring(0, 30)}...`
                                  : attachment.name}{" "}
                                ({(attachment.size / 1024).toFixed(0)} KB)
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

          <Separator className="my-2" />

          <Button
            onClick={processSelectedEmails}
            disabled={selectedEmails.length === 0}
            className="w-full"
          >
            Process {selectedEmails.length} Selected Email
            {selectedEmails.length !== 1 ? "s" : ""}
          </Button>
        </>
      )}
    </div>
  );
};

export default EmailImport;
