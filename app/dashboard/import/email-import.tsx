// app/dashboard/import/email-import.tsx

import { collection, getDocs, query, where } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
  Calendar,
  Check,
  CheckSquare,
  Info,
  Loader2,
  Mail,
  Paperclip,
  RefreshCw,
  Search,
  Shield,
  X,
  XSquareIcon,
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
import { db, storage } from "~/lib/firebase";

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

// Updated imported candidate interface to include file URL
export interface ImportedCandidate {
  name: string;
  email: string;
  skills?: string[];
  experience?: string;
  education?: string;
  resumeText?: string;
  linkedIn?: string;
  location?: string;
  languages?: string[];
  jobTitle?: string;
  resumeFileName?: string | null;
  originalFilename?: string | null;
  resumeFileURL?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  source?: string;
}

// Email import hook
export const useEmailImport = (onImportComplete?: (data: any) => void) => {
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

  // Function to upload attachment to Firebase Storage
  const uploadAttachmentToStorage = async (
    emailId: string,
    attachment: EmailAttachment,
    fileBuffer: ArrayBuffer
  ): Promise<string | null> => {
    if (!attachment || !fileBuffer) return null;

    try {
      // Create a unique filename
      const timestamp = new Date().getTime();
      const filename = `email-attachments/${emailId}/${timestamp}_${attachment.name}`;

      // Create a storage reference
      const storageRef = ref(storage, filename);

      // Create a Blob from the buffer
      const fileBlob = new Blob([fileBuffer], { type: attachment.contentType });

      // Upload the file
      const snapshot = await uploadBytes(storageRef, fileBlob);

      // Get the download URL
      const downloadURL = await getDownloadURL(snapshot.ref);

      console.log("Email attachment uploaded successfully:", downloadURL);
      return downloadURL;
    } catch (error) {
      console.error("Error uploading email attachment:", error);
      return null;
    }
  };

  // Check for existing connection on mount
  useEffect(() => {
    const checkExistingConnection = async () => {
      try {
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
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/email/inbox/connect`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": import.meta.env.VITE_API_KEY || "",
          },
          body: JSON.stringify(credentials),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
            errorData.message ||
            "Failed to connect to email provider"
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
      // Make API call to fetch emails
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/email/inbox/list`,
        {
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
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || errorData.message || "Failed to fetch emails"
        );
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
        const chunkSize = 10;
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

        setEmails(fetchedEmails);
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

  // Toggle select all emails
  const toggleSelectAll = () => {
    if (selectedEmails.length === emails.length) {
      setSelectedEmails([]);
    } else {
      const allEmailIds = emails.map((email) => email.id);
      setSelectedEmails(allEmailIds);
    }
  };

  // FIXED: Don't process and save directly, just prepare data for review
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
      // Get selected email objects
      const selectedEmailObjects = emails.filter((email) =>
        selectedEmails.includes(email.id)
      );

      if (selectedEmailObjects.length === 0) {
        throw new Error("No emails selected");
      }

      // For simplicity, let's process the first email only
      // For multiple emails, you'd need to decide how to handle them
      const emailToProcess = selectedEmailObjects[0];

      setImportProgress(30);

      // Check if the email has resume attachments
      let resumeAttachment = null;
      if (emailToProcess.hasAttachments && emailToProcess.attachments) {
        resumeAttachment = emailToProcess.attachments.find(
          (att) => att.isResume
        );
      }

      if (resumeAttachment) {
        // If there's a resume attachment, call the attachment processor
        await handleProcessAttachment(emailToProcess, resumeAttachment);
      } else {
        // If no resume attachment, just create basic candidate data
        const candidateData = {
          name: emailToProcess.from.name,
          email: emailToProcess.from.email,
          source: "email_import",
          resumeFileName: null,
          skills: [],
          experience: "",
          education: "",
        };

        // Call onImportComplete to show in UI instead of saving directly
        if (onImportComplete) {
          onImportComplete(candidateData);
        }
      }

      setImportProgress(100);
      toast.dismiss(processingToast);

      // Mark as processed in UI
      setEmails((prevEmails) =>
        prevEmails.map((email) =>
          email.id === emailToProcess.id
            ? { ...email, isProcessed: true }
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
      setTimeout(() => setImportProgress(0), 2000);
    }
  };

  // FIXED: Process email attachment and show in UI instead of saving directly
  const processEmailAttachment = async (
    emailId: string,
    attachmentId: string
  ) => {
    if (!emailCredentials) {
      toast.error("Not connected to email provider");
      return null;
    }

    try {
      // First, download the actual attachment file
      const attachmentResponse = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/email/download-attachment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": import.meta.env.VITE_API_KEY || "",
          },
          body: JSON.stringify({
            ...emailCredentials,
            emailId,
            attachmentId,
          }),
        }
      );

      if (!attachmentResponse.ok) {
        const errorData = await attachmentResponse.json();
        throw new Error(
          errorData.error ||
            errorData.message ||
            "Failed to download attachment"
        );
      }

      // Get attachment data
      const attachmentData = await attachmentResponse.json();
      let resumeFileURL = null;
      let fileMetadata = {
        filename: "",
        contentType: "",
        size: 0,
      };

      // If we have the attachment content, upload it to Firebase Storage
      if (attachmentData.success && attachmentData.data) {
        // Convert base64 to ArrayBuffer
        const base64Content = attachmentData.data.content;
        const binaryContent = atob(base64Content);
        const bytes = new Uint8Array(binaryContent.length);
        for (let i = 0; i < binaryContent.length; i++) {
          bytes[i] = binaryContent.charCodeAt(i);
        }

        // Store file metadata
        fileMetadata = {
          filename: attachmentData.data.filename,
          contentType: attachmentData.data.contentType,
          size: attachmentData.data.size || bytes.length,
        };

        // Get attachment info
        const attachment = {
          id: attachmentId,
          name: attachmentData.data.filename,
          contentType: attachmentData.data.contentType,
          size: bytes.length,
          isResume: true,
        };

        // Upload to Firebase Storage
        resumeFileURL = await uploadAttachmentToStorage(
          emailId,
          attachment,
          bytes.buffer
        );
      }

      // Make API call to process the attachment for parsing
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/email/parse-attachment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": import.meta.env.VITE_API_KEY || "",
          },
          body: JSON.stringify({
            ...emailCredentials,
            emailId,
            attachmentId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || errorData.message || "Failed to process attachment"
        );
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error("Invalid response from attachment parsing API");
      }

      // Add resumeFileURL to the parsed data
      const parsedData = {
        ...result.data,
        resumeFileURL: resumeFileURL,
        originalFilename: fileMetadata.filename,
        fileType: fileMetadata.contentType,
        fileSize: fileMetadata.size,
      };

      // Return the parsed data with the file URL
      return parsedData;
    } catch (error) {
      console.error("Error processing email attachment:", error);
      throw error;
    }
  };

  // FIXED: Process individual attachments and show in UI instead of saving directly
  const handleProcessAttachment = async (
    email: EmailMessage,
    attachment: EmailAttachment
  ) => {
    if (!attachment.isResume) {
      toast.info("Only resume attachments can be processed.");
      return;
    }

    const processingToast = toast.loading("Processing attachment...");

    try {
      const parsedData = await processEmailAttachment(email.id, attachment.id);

      if (parsedData && onImportComplete) {
        // Mark this email as processed
        setEmails((prevEmails) =>
          prevEmails.map((e) =>
            e.id === email.id ? { ...e, isProcessed: true } : e
          )
        );

        // Pass the parsed data to the parent component with source info
        onImportComplete({
          name: parsedData.name || email.from.name,
          email: parsedData.email || email.from.email,
          phone: parsedData.phone || "",
          skills: parsedData.skills || [],
          experience: parsedData.experience || "",
          education: parsedData.education || "",
          resumeText: parsedData.resumeText || "",
          linkedIn: parsedData.linkedIn || "",
          location: parsedData.location || "",
          languages: parsedData.languages || [],
          jobTitle: parsedData.jobTitle || "",
          resumeFileName: attachment.name,
          resumeFileURL: parsedData.resumeFileURL,
          originalFilename: parsedData.originalFilename,
          fileType: parsedData.fileType,
          fileSize: parsedData.fileSize,
          source: "email_attachment",
        });

        // Dismiss the loading toast after successful processing
        toast.dismiss(processingToast);
        toast.success("Attachment processed successfully!");
      } else {
        toast.dismiss(processingToast);
        toast.error("Failed to process attachment");
      }
    } catch (error) {
      toast.dismiss(processingToast);
      toast.error(
        error instanceof Error ? error.message : "Failed to process attachment"
      );
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
    filteredEmails,
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
    handleProcessAttachment,
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
    filteredEmails,
    handleProcessAttachment,
  } = useEmailImport(onImportComplete);

  return (
    <div className="space-y-4">
      {!isConnected ? (
        // Connection form
        <div className="space-y-5">
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Email Provider
              </Label>
              <RadioGroup
                value={provider}
                onValueChange={(value: EmailProvider) => setProvider(value)}
                className="grid grid-cols-1 sm:grid-cols-3 gap-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="gmail" id="provider-gmail" />
                  <Label
                    htmlFor="provider-gmail"
                    className="flex items-center gap-1.5 cursor-pointer"
                  >
                    <Mail className="size-4 text-red-500" />
                    <span className="text-sm">Gmail</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="outlook" id="provider-outlook" />
                  <Label
                    htmlFor="provider-outlook"
                    className="flex items-center gap-1.5 cursor-pointer"
                  >
                    <Mail className="size-4 text-blue-500" />
                    <span className="text-sm">Outlook</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="provider-other" />
                  <Label
                    htmlFor="provider-other"
                    className="flex items-center gap-1.5 cursor-pointer"
                  >
                    <Mail className="size-4 text-purple-500" />
                    <span className="text-sm">IMAP</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3 border rounded-md p-4 bg-muted/20">
              {provider === "other" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="imap-server" className="text-sm">
                      IMAP Server
                    </Label>
                    <Input
                      id="imap-server"
                      placeholder="imap.example.com"
                      value={imapServer}
                      onChange={(e) => setImapServer(e.target.value)}
                      className="mt-1"
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
                      className="mt-1"
                    />
                  </div>
                </div>
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
                  className="mt-1"
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
                  className="mt-1"
                />
                {provider !== "other" && (
                  <div className="flex items-start gap-1.5 text-xs mt-2 bg-amber-50 text-amber-800 p-2 rounded-md border border-amber-200">
                    <Shield className="size-3.5 mt-0.5 flex-shrink-0" />
                    <div>
                      For Gmail, use an app password.{" "}
                      <a
                        href="https://support.google.com/accounts/answer/185833"
                        target="_blank"
                        rel="noreferrer"
                        className="underline hover:text-amber-900"
                      >
                        Learn more
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {importProgress > 0 && (
            <div className="mt-4">
              <div className="flex justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">
                  Connecting...
                </span>
                <span className="text-xs font-medium">{importProgress}%</span>
              </div>
              <Progress value={importProgress} className="w-full h-1.5" />
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
        </div>
      ) : (
        // Email management - connected state
        <div className="space-y-4">
          <div className="bg-muted/20 p-3 rounded-md border">
            <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3 mb-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="font-normal flex gap-1.5 items-center bg-primary/10 text-primary border-primary/20"
                >
                  <Mail className="h-3 w-3" />
                  {provider === "other"
                    ? "IMAP Server"
                    : `${provider.charAt(0).toUpperCase()}${provider.slice(1)}`}
                </Badge>
                <span className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis max-w-[180px]">
                  {imapUsername}
                </span>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={disconnectProvider}
                  className="h-8 text-xs px-3"
                >
                  Disconnect
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchEmails}
                  disabled={isLoadingEmails}
                  className="h-8 text-xs px-3"
                >
                  {isLoadingEmails ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                  ) : (
                    <RefreshCw className="h-3 w-3 mr-1.5" />
                  )}
                  <span>Refresh</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Filter controls */}
          <div className="space-y-3 my-3">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 w-full"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full w-8 opacity-70 hover:opacity-100"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full sm:w-[140px] h-10 text-sm">
                  <Calendar className="mr-2 h-3.5 w-3.5 opacity-70" />
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex flex-grow flex-wrap items-center gap-4 bg-muted/10 px-3 py-2 rounded-md border">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-attachments"
                    checked={showOnlyWithAttachments}
                    onCheckedChange={(value) =>
                      setShowOnlyWithAttachments(!!value)
                    }
                  />
                  <Label
                    htmlFor="show-attachments"
                    className="text-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Paperclip className="size-3 opacity-70" />
                    Attachments
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-job-related"
                    checked={showOnlyJobRelated}
                    onCheckedChange={(value) => setShowOnlyJobRelated(!!value)}
                  />
                  <Label
                    htmlFor="show-job-related"
                    className="text-xs cursor-pointer flex items-center gap-1.5"
                  >
                    Job related
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs max-w-xs">
                          Shows emails with job-related keywords like 'job',
                          'candidate', 'resume', or 'cv'
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 mb-2">
            <div className="text-xs text-muted-foreground">
              {filteredEmails.length} emails found
              {(searchQuery ||
                dateFilter !== "all" ||
                showOnlyWithAttachments ||
                showOnlyJobRelated) &&
                " matching filters"}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
                disabled={emails.length === 0}
                className="h-7 text-xs w-full xs:w-auto"
              >
                {selectedEmails.length > 0 &&
                selectedEmails.length === filteredEmails.length ? (
                  <>
                    <XSquareIcon className="h-3.5 w-3.5 mr-1.5" />
                    <span>Deselect All</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
                    <span>Select All</span>
                  </>
                )}
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={processSelectedEmails}
                disabled={selectedEmails.length === 0}
                className="h-7 text-xs w-full xs:w-auto"
              >
                <span className="mr-1">Import</span>
                {selectedEmails.length > 0 && (
                  <Badge
                    variant="outline"
                    className="ml-1 h-4 px-1 bg-white/20 text-white"
                  >
                    {selectedEmails.length}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Progress indicator for import process */}
          {importProgress > 0 && (
            <div className="my-2">
              <div className="flex justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">
                  {importProgress < 100 ? "Importing..." : "Import complete!"}
                </span>
                <span className="text-xs font-medium">{importProgress}%</span>
              </div>
              <Progress value={importProgress} className="w-full h-1.5" />
            </div>
          )}

          {/* Email list */}
          <div className="border rounded-md overflow-hidden bg-white">
            {isLoadingEmails ? (
              <div className="p-8 flex flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-sm text-muted-foreground">
                  Loading emails...
                </p>
              </div>
            ) : emails.length === 0 ? (
              <div className="p-8 flex flex-col items-center justify-center text-center">
                <div className="bg-muted/30 rounded-full p-4 mb-3">
                  <Mail className="h-6 w-6 text-muted-foreground/60" />
                </div>
                <p className="font-medium">No emails found</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                  {searchQuery ||
                  dateFilter !== "all" ||
                  showOnlyWithAttachments ||
                  showOnlyJobRelated
                    ? "Try changing your filters to see more results"
                    : "Your inbox is empty or no job-related emails found"}
                </p>
              </div>
            ) : (
              <div className="divide-y max-h-[400px] overflow-y-auto">
                {filteredEmails.map((email) => (
                  <div
                    key={email.id}
                    className={`px-4 py-3 hover:bg-muted/30 transition-colors ${
                      selectedEmails.includes(email.id) ? "bg-primary/5" : ""
                    } ${
                      email.isProcessed || email.isImported ? "opacity-60" : ""
                    }`}
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
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="size-3" />
                            <span>
                              {new Date(email.receivedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {email.from.email}
                        </div>
                        <div className="text-sm mt-1 font-medium truncate">
                          {email.subject}
                        </div>

                        {email.hasAttachments && email.attachments && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {email.attachments?.map(
                              (attachment: EmailAttachment) => (
                                <Badge
                                  key={attachment.id}
                                  variant={
                                    attachment.isResume ? "default" : "outline"
                                  }
                                  className={`text-xs px-1.5 py-0.5 ${
                                    attachment.isResume
                                      ? "bg-primary/10 text-primary border-primary/20 cursor-pointer"
                                      : ""
                                  }`}
                                  onClick={() =>
                                    attachment.isResume &&
                                    handleProcessAttachment(email, attachment)
                                  }
                                >
                                  {attachment.name.length > 25
                                    ? `${attachment.name.substring(0, 25)}...`
                                    : attachment.name}{" "}
                                  <span className="opacity-60 text-[10px]">
                                    ({(attachment.size / 1024).toFixed(0)} KB)
                                  </span>
                                </Badge>
                              )
                            )}
                          </div>
                        )}

                        <div className="mt-2 flex items-center gap-2">
                          {email.isImported && (
                            <div className="text-xs flex items-center text-green-600 bg-green-50 px-1.5 py-0.5 rounded-sm">
                              <Check className="h-3 w-3 mr-1" />
                              Already imported
                            </div>
                          )}

                          {email.isProcessed && !email.isImported && (
                            <div className="text-xs flex items-center text-green-600 bg-green-50 px-1.5 py-0.5 rounded-sm">
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

          <div className="flex justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Info className="h-3 w-3" />
              {selectedEmails.length === 0
                ? "Select emails to import candidates"
                : `${selectedEmails.length} email${
                    selectedEmails.length === 1 ? "" : "s"
                  } selected`}
            </div>
          </div>

          <Separator className="my-3" />

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
            ) : selectedEmails.length > 0 ? (
              <>
                Process {selectedEmails.length}
                <span className="hidden xs:inline">
                  {" "}
                  Selected Email{selectedEmails.length !== 1 ? "s" : ""}
                </span>
              </>
            ) : (
              <>Select emails to process</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default EmailImport;
