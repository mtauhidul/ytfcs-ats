// app/dashboard/import/email-import.tsx (Enhanced version - minimal changes)

import { collection, getDocs, query, where } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
  Bot, // ADD THIS IMPORT
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
  Trash2,
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
import { Switch } from "~/components/ui/switch"; // ADD THIS IMPORT
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
  const [statusUpdateInterval, setStatusUpdateInterval] =
    useState<NodeJS.Timeout | null>(null);
  const [isStatusLoading, setIsStatusLoading] = useState(false);
  const [lastStatusUpdate, setLastStatusUpdate] = useState<Date | null>(null);

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

  // ADD AUTOMATION STATES
  const [automationEnabled, setAutomationEnabled] = useState(false);
  const [automationStats, setAutomationStats] = useState({
    lastChecked: null as string | null,
    totalImported: 0,
  });

  const [isTogglingAutomation, setIsTogglingAutomation] = useState(false);
  const [monitoredEmails, setMonitoredEmails] = useState<string[]>([]);
  const [isRemovingEmail, setIsRemovingEmail] = useState<string | null>(null);

  // Add this helper function to format education data properly

  interface EducationObject {
    degree?: string;
    qualification?: string;
    title?: string;
    institution?: string;
    school?: string;
    university?: string;
    college?: string;
    year?: string | number;
    graduationYear?: string | number;
    endYear?: string | number;
    completionYear?: string | number;
    field?: string;
    major?: string;
    fieldOfStudy?: string;
    specialization?: string;
    [key: string]: any;
  }

  type EducationInput =
    | string
    | EducationObject
    | (string | EducationObject)[]
    | null
    | undefined;

  const formatEducationData = (education: EducationInput): string => {
    if (!education) return "";

    // If it's already a string, return it
    if (typeof education === "string") {
      return education;
    }

    // If it's an array of objects or strings
    if (Array.isArray(education)) {
      return education
        .map((edu) => {
          if (typeof edu === "object" && edu !== null) {
            // Extract properties from education object
            const degree = edu.degree || edu.qualification || edu.title || "";
            const school =
              edu.institution ||
              edu.school ||
              edu.university ||
              edu.college ||
              "";
            const year =
              edu.year ||
              edu.graduationYear ||
              edu.endYear ||
              edu.completionYear ||
              "";
            const field =
              edu.field ||
              edu.major ||
              edu.fieldOfStudy ||
              edu.specialization ||
              "";

            // Build readable education string
            let eduString = "";
            if (degree) {
              eduString += degree;
              if (field) eduString += ` in ${field}`;
            } else if (field) {
              eduString += field;
            }

            if (school) {
              eduString += eduString ? ` - ${school}` : school;
            }

            if (year) {
              eduString += ` (${year})`;
            }

            return eduString || JSON.stringify(edu); // Fallback if no readable format
          }
          return String(edu);
        })
        .filter(Boolean)
        .join("\n");
    }

    // If it's a single object
    if (typeof education === "object" && education !== null) {
      const degree =
        education.degree || education.qualification || education.title || "";
      const school =
        education.institution ||
        education.school ||
        education.university ||
        education.college ||
        "";
      const year =
        education.year ||
        education.graduationYear ||
        education.endYear ||
        education.completionYear ||
        "";
      const field =
        education.field ||
        education.major ||
        education.fieldOfStudy ||
        education.specialization ||
        "";

      let eduString = "";
      if (degree) {
        eduString += degree;
        if (field) eduString += ` in ${field}`;
      } else if (field) {
        eduString += field;
      }

      if (school) {
        eduString += eduString ? ` - ${school}` : school;
      }

      if (year) {
        eduString += ` (${year})`;
      }

      return eduString || JSON.stringify(education); // Fallback
    }

    // Fallback for any other type
    return String(education);
  };

  // Add this helper function to ensure proper date formatting
  interface EnsureValidDate {
    (dateValue: string | Date | number | null | undefined): string;
  }

  const ensureValidDate: EnsureValidDate = (dateValue) => {
    if (!dateValue) return new Date().toISOString();

    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        console.warn("Invalid date provided:", dateValue);
        return new Date().toISOString();
      }
      return date.toISOString();
    } catch (error) {
      console.warn("Error parsing date:", dateValue, error);
      return new Date().toISOString();
    }
  };

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

  // ADD AUTOMATION FUNCTIONS
  // Get comprehensive automation status
  const getAutomationStatus = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/api/email/automation/status`,
        {
          headers: { "X-API-KEY": import.meta.env.VITE_API_KEY || "" },
        }
      );

      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      console.error("Error getting automation status:", error);
    }
    return null;
  };

  // Start automation service
  const startAutomationService = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/api/email/automation/start`,
        {
          method: "POST",
          headers: { "X-API-KEY": import.meta.env.VITE_API_KEY || "" },
        }
      );

      if (response.ok) {
        toast.success("Automation service started");
        return true;
      }
    } catch (error) {
      console.error("Error starting automation:", error);
      toast.error("Failed to start automation service");
    }
    return false;
  };

  // Stop automation service
  const stopAutomationService = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/api/email/automation/stop`,
        {
          method: "POST",
          headers: { "X-API-KEY": import.meta.env.VITE_API_KEY || "" },
        }
      );

      if (response.ok) {
        toast.success("Automation service stopped");
        return true;
      }
    } catch (error) {
      console.error("Error stopping automation:", error);
      toast.error("Failed to stop automation service");
    }
    return false;
  };

  // Get monitored emails
  const getMonitoredEmails = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/api/email/automation/monitored`,
        {
          headers: { "X-API-KEY": import.meta.env.VITE_API_KEY || "" },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMonitoredEmails(data.emails || []);
        return data.emails || [];
      }
    } catch (error) {
      console.error("Error getting monitored emails:", error);
    }
    return [];
  };

  // Remove email from automation monitoring
  const removeEmailFromMonitoring = async (email: string) => {
    try {
      setIsRemovingEmail(email);
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/api/email/automation/remove`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-KEY": import.meta.env.VITE_API_KEY || "",
          },
          body: JSON.stringify({ email }),
        }
      );

      if (response.ok) {
        toast.success(`${email} removed from monitoring`);
        // Refresh the monitored emails list
        await getMonitoredEmails();
        return true;
      } else {
        toast.error("Failed to remove email from monitoring");
      }
    } catch (error) {
      console.error("Error removing email from monitoring:", error);
      toast.error("Failed to remove email from monitoring");
    } finally {
      setIsRemovingEmail(null);
    }
    return false;
  };

  // ENHANCED automation status check with loading state and error handling
  const checkAutomationStatus = async (showLoading = false) => {
    if (!isConnected || !emailCredentials) return;

    if (showLoading) setIsStatusLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/api/email/automation/accounts`,
        {
          headers: { "X-API-KEY": import.meta.env.VITE_API_KEY || "" },
        }
      );

      // Handle 404 - backend doesn't have automation endpoints yet
      if (response.status === 404) {
        console.warn(
          "Automation endpoints not implemented yet. Using fallback behavior."
        );
        // Set default automation state
        setAutomationEnabled(false);
        setAutomationStats({
          lastChecked: null,
          totalImported: 0,
        });
        return;
      }

      if (response.ok) {
        const data = await response.json();
        const currentAccount = data.data?.find(
          (account: any) => account.username === emailCredentials.username
        );

        if (currentAccount) {
          // Update automation status
          setAutomationEnabled(currentAccount.automationEnabled);

          // Update stats with proper number conversion
          setAutomationStats({
            lastChecked: currentAccount.lastChecked,
            totalImported: Number(currentAccount.totalImported) || 0,
          });

          // Load monitored emails if automation is enabled
          if (currentAccount.automationEnabled) {
            getMonitoredEmails();
          }

          setLastStatusUpdate(new Date());

          console.log("Automation status updated:", {
            enabled: currentAccount.automationEnabled,
            lastChecked: currentAccount.lastChecked,
            totalImported: currentAccount.totalImported,
          });
        }
      }
    } catch (error) {
      console.error("Error checking automation status:", error);
      // Fallback to manual mode if automation API is not available
      setAutomationEnabled(false);
    } finally {
      if (showLoading) setIsStatusLoading(false);
    }
  };

  // NEW FUNCTION: Start automatic status polling
  const startStatusPolling = () => {
    // Clear existing interval if any
    if (statusUpdateInterval) {
      clearInterval(statusUpdateInterval);
    }

    // Check automation status every 30 seconds
    const interval = setInterval(() => {
      checkAutomationStatus(false);
    }, 30000); // 30 seconds

    setStatusUpdateInterval(interval);
    console.log("Started automation status polling every 30 seconds");
  };

  // NEW FUNCTION: Stop automatic status polling
  const stopStatusPolling = () => {
    if (statusUpdateInterval) {
      clearInterval(statusUpdateInterval);
      setStatusUpdateInterval(null);
      console.log("Stopped automation status polling");
    }
  };

  // NEW FUNCTION: Manual status refresh
  const refreshAutomationStatus = async () => {
    await checkAutomationStatus(true);
    // Also refresh monitored emails list
    if (automationEnabled) {
      await getMonitoredEmails();
    }
    toast.success("Automation status refreshed");
  };

  // Updated toggleAutomation function with loader
  const toggleAutomation = async (enabled: boolean) => {
    if (!isConnected || !emailCredentials) {
      toast.error("Please connect to an email account first");
      return;
    }

    // Start loading state
    setIsTogglingAutomation(true);

    try {
      // Check if account exists in automation system
      const accountsResponse = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/api/email/automation/accounts`,
        {
          headers: { "X-API-KEY": import.meta.env.VITE_API_KEY || "" },
        }
      );

      let accountId = null;
      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json();
        const existingAccount = accountsData.data?.find(
          (account: any) => account.username === emailCredentials.username
        );
        accountId = existingAccount?.id;
      }

      if (enabled && !accountId) {
        // Create new automation account
        const createResponse = await fetch(
          `${import.meta.env.VITE_API_URL || ""}/api/email/automation/accounts`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-API-KEY": import.meta.env.VITE_API_KEY || "",
            },
            body: JSON.stringify({
              ...emailCredentials,
              automationEnabled: true,
            }),
          }
        );

        if (!createResponse.ok) {
          throw new Error("Failed to create automation account");
        }
      } else if (accountId) {
        // Update existing account
        const updateResponse = await fetch(
          `${
            import.meta.env.VITE_API_URL || ""
          }/api/email/automation/accounts/${accountId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "X-API-KEY": import.meta.env.VITE_API_KEY || "",
            },
            body: JSON.stringify({
              automationEnabled: enabled,
            }),
          }
        );

        if (!updateResponse.ok) {
          throw new Error("Failed to update automation settings");
        }
      }

      // Update local state only after successful API response
      setAutomationEnabled(enabled);

      // Start or stop polling based on automation status
      if (enabled) {
        startStatusPolling();
      } else {
        stopStatusPolling();
      }

      // Immediately check status after toggle
      setTimeout(() => checkAutomationStatus(false), 1000);

      toast.success(
        enabled
          ? "Automation enabled - will check for new candidates regularly"
          : "Automation disabled - manual import only"
      );
    } catch (error) {
      console.error("Error toggling automation:", error);
      toast.error("Failed to update automation settings");
    } finally {
      // Stop loading state
      setIsTogglingAutomation(false);
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

  // ENHANCED automation check effect with polling
  useEffect(() => {
    if (isConnected && emailCredentials) {
      // Initial status check
      checkAutomationStatus(true);

      // Start polling if automation is enabled
      const checkAndStartPolling = async () => {
        await checkAutomationStatus(false);
        if (automationEnabled) {
          startStatusPolling();
        }
      };

      // Check after a short delay to ensure state is updated
      setTimeout(checkAndStartPolling, 2000);
    } else {
      // Stop polling when not connected
      stopStatusPolling();
    }

    // Cleanup on unmount
    return () => {
      stopStatusPolling();
    };
  }, [isConnected, emailCredentials]);

  // NEW EFFECT: Start/stop polling when automation is toggled
  useEffect(() => {
    if (isConnected && emailCredentials && automationEnabled) {
      startStatusPolling();
    } else {
      stopStatusPolling();
    }

    return () => {
      stopStatusPolling();
    };
  }, [automationEnabled, isConnected]);

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
        `${import.meta.env.VITE_API_URL || ""}/api/email/inbox/connect`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-KEY": import.meta.env.VITE_API_KEY || "",
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

  // ENHANCED disconnect function to stop polling
  const disconnectProvider = () => {
    localStorage.removeItem("emailCredentials");
    setEmailCredentials(null);
    setIsConnected(false);
    setEmails([]);
    setSelectedEmails([]);
    setAutomationEnabled(false);
    setAutomationStats({ lastChecked: null, totalImported: 0 });

    // Stop status polling when disconnecting
    stopStatusPolling();

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
        `${import.meta.env.VITE_API_URL || ""}/api/email/inbox/list`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-KEY": import.meta.env.VITE_API_KEY || "",
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

        // Query Firestore for existing candidates and applications with these emails
        const importedEmails = new Set<string>();

        // Process each chunk separately
        for (const chunk of emailChunks) {
          if (chunk.length === 0) continue;

          // Check both candidates and applications collections
          const [candidatesQuery, applicationsQuery] = [
            query(collection(db, "candidates"), where("email", "in", chunk)),
            query(collection(db, "applications"), where("email", "in", chunk)),
          ];

          const [candidatesSnapshot, applicationsSnapshot] = await Promise.all([
            getDocs(candidatesQuery),
            getDocs(applicationsQuery),
          ]);

          candidatesSnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.email) {
              importedEmails.add(data.email);
            }
          });

          applicationsSnapshot.forEach((doc) => {
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
      const selectedEmailObjects = emails.filter((email) =>
        selectedEmails.includes(email.id)
      );

      if (selectedEmailObjects.length === 0) {
        throw new Error("No emails selected");
      }

      const emailToProcess = selectedEmailObjects[0];
      setImportProgress(30);

      let resumeAttachment = null;
      if (emailToProcess.hasAttachments && emailToProcess.attachments) {
        resumeAttachment = emailToProcess.attachments.find(
          (att) => att.isResume
        );
      }

      if (resumeAttachment) {
        await handleProcessAttachment(emailToProcess, resumeAttachment);
      } else {
        // FIXED: Ensure proper date formatting for basic candidate data
        const candidateData = {
          name: emailToProcess.from.name,
          email: emailToProcess.from.email,
          source: "email_import",
          resumeFileName: null,
          skills: [],
          experience: "",
          education: "",
          // FIXED: Add proper date formatting
          createdAt: ensureValidDate(emailToProcess.receivedAt),
          updatedAt: ensureValidDate(new Date()),
        };

        if (onImportComplete) {
          onImportComplete(candidateData);
        }
      }

      setImportProgress(100);
      toast.dismiss(processingToast);

      setEmails((prevEmails) =>
        prevEmails.map((email) =>
          email.id === emailToProcess.id
            ? { ...email, isProcessed: true }
            : email
        )
      );

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
        `${import.meta.env.VITE_API_URL || ""}/api/email/download-attachment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-KEY": import.meta.env.VITE_API_KEY || "",
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
        `${import.meta.env.VITE_API_URL || ""}/api/email/parse-attachment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-KEY": import.meta.env.VITE_API_KEY || "",
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

        // FIXED: Format education properly before passing to parent
        const formattedEducation = formatEducationData(parsedData.education);

        // Pass the parsed data to the parent component with proper formatting
        onImportComplete({
          name: parsedData.name || email.from.name,
          email: parsedData.email || email.from.email,
          phone: parsedData.phone || "",
          skills: Array.isArray(parsedData.skills) ? parsedData.skills : [],
          experience: parsedData.experience || "",
          education: formattedEducation, // FIXED: Use formatted education
          resumeText: parsedData.resumeText || "",
          linkedIn: parsedData.linkedIn || "",
          location: parsedData.location || "",
          languages: Array.isArray(parsedData.languages)
            ? parsedData.languages
            : [],
          jobTitle: parsedData.jobTitle || "",
          resumeFileName: attachment.name,
          resumeFileURL: parsedData.resumeFileURL,
          originalFilename: parsedData.originalFilename,
          fileType: parsedData.fileType,
          fileSize: parsedData.fileSize,
          source: "email_attachment",
          // FIXED: Ensure proper date formatting
          createdAt: ensureValidDate(parsedData.createdAt),
          updatedAt: ensureValidDate(parsedData.updatedAt),
        });

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
    // ADD AUTOMATION METHODS
    automationEnabled,
    automationStats,
    toggleAutomation,
    isTogglingAutomation,
    // NEW RETURNS
    refreshAutomationStatus,
    isStatusLoading,
    lastStatusUpdate,
    monitoredEmails,
    getMonitoredEmails,
    removeEmailFromMonitoring,
    isRemovingEmail,
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
    // ADD AUTOMATION PROPS
    automationEnabled,
    automationStats,
    toggleAutomation,
    isTogglingAutomation,
    // NEW ADDITIONS
    refreshAutomationStatus,
    isStatusLoading,
    lastStatusUpdate,
    monitoredEmails,
    getMonitoredEmails,
    removeEmailFromMonitoring,
    isRemovingEmail,
  } = useEmailImport(onImportComplete);

  // Helper function to format the last checked time
  const formatLastChecked = (lastChecked: string | null) => {
    if (!lastChecked) return "Never";

    try {
      const date = new Date(lastChecked);
      const now = new Date();
      const diffInMinutes = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60)
      );

      if (diffInMinutes < 1) return "Just now";
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;

      return (
        date.toLocaleDateString() +
        " " +
        date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    } catch (error) {
      return "Invalid date";
    }
  };

  // Compact and Responsive EmailImport Component UI

  return (
    <div className="space-y-4">
      {!isConnected ? (
        // Compact Connection Form
        <div className="space-y-4">
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Email Provider
              </Label>
              <RadioGroup
                value={provider}
                onValueChange={(value: EmailProvider) => setProvider(value)}
                className="grid grid-cols-3 gap-2"
              >
                <div className="flex items-center space-x-2 p-2 border rounded hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="gmail" id="provider-gmail" />
                  <Label
                    htmlFor="provider-gmail"
                    className="flex items-center gap-1.5 cursor-pointer text-sm"
                  >
                    <Mail className="size-3 text-red-500" />
                    Gmail
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-2 border rounded hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="outlook" id="provider-outlook" />
                  <Label
                    htmlFor="provider-outlook"
                    className="flex items-center gap-1.5 cursor-pointer text-sm"
                  >
                    <Mail className="size-3 text-blue-500" />
                    Outlook
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-2 border rounded hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="other" id="provider-other" />
                  <Label
                    htmlFor="provider-other"
                    className="flex items-center gap-1.5 cursor-pointer text-sm"
                  >
                    <Mail className="size-3 text-purple-500" />
                    IMAP
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3 border rounded p-3 bg-muted/20">
              {provider === "other" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="imap-server" className="text-xs">
                      IMAP Server
                    </Label>
                    <Input
                      id="imap-server"
                      placeholder="imap.example.com"
                      value={imapServer}
                      onChange={(e) => setImapServer(e.target.value)}
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="imap-port" className="text-xs">
                      Port
                    </Label>
                    <Input
                      id="imap-port"
                      placeholder="993"
                      value={imapPort}
                      onChange={(e) => setImapPort(e.target.value)}
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                </div>
              )}
              <div>
                <Label htmlFor="email-username" className="text-xs">
                  Username/Email
                </Label>
                <Input
                  id="email-username"
                  placeholder="user@example.com"
                  value={imapUsername}
                  onChange={(e) => setImapUsername(e.target.value)}
                  className="mt-1 h-8 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="email-password" className="text-xs">
                  {provider !== "other" ? "Password/App Password" : "Password"}
                </Label>
                <Input
                  id="email-password"
                  type="password"
                  placeholder="Password"
                  value={imapPassword}
                  onChange={(e) => setImapPassword(e.target.value)}
                  className="mt-1 h-8 text-sm"
                />
                {provider !== "other" && (
                  <div className="flex items-start gap-1.5 text-xs mt-2 bg-amber-50 text-amber-800 p-2 rounded border border-amber-200">
                    <Shield className="size-3 mt-0.5 flex-shrink-0" />
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
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Connecting...</span>
                <span className="font-medium">{importProgress}%</span>
              </div>
              <Progress value={importProgress} className="h-1.5" />
            </div>
          )}

          <Button
            onClick={connectToProvider}
            disabled={isConnecting || !imapUsername || !imapPassword}
            className="w-full h-9 text-sm"
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
        // Compact Connected State
        <div className="space-y-3">
          {/* Compact Connection Status */}
          <div className="bg-muted/20 p-3 rounded border">
            {/* Top Row - Compact Layout */}
            <div className="flex flex-col space-y-3">
              {/* Provider and Toggle Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="flex gap-1.5 items-center bg-primary/10 text-primary border-primary/20 text-xs px-2 py-1"
                  >
                    <Mail className="h-3 w-3" />
                    {provider === "other"
                      ? "IMAP"
                      : provider.charAt(0).toUpperCase() + provider.slice(1)}
                  </Badge>
                  <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                    {imapUsername}
                  </span>
                  {automationEnabled && (
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-700 border-green-200 text-xs px-2 py-0.5"
                    >
                      <Bot className="h-3 w-3 mr-1" />
                      Auto
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <div className="flex items-center gap-1.5 bg-background border rounded px-2 py-1">
                    <Label
                      htmlFor="automation-toggle"
                      className={`text-xs transition-opacity ${
                        isTogglingAutomation ? "opacity-50" : "opacity-100"
                      }`}
                    >
                      Auto
                    </Label>
                    <div className="relative">
                      <Switch
                        id="automation-toggle"
                        checked={automationEnabled}
                        onCheckedChange={toggleAutomation}
                        disabled={isTogglingAutomation}
                        className={`scale-75 transition-opacity ${
                          isTogglingAutomation ? "opacity-50" : "opacity-100"
                        }`}
                      />
                      {isTogglingAutomation && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="h-3 w-3 animate-spin text-primary" />
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={disconnectProvider}
                    className="h-7 text-xs px-2"
                  >
                    Disconnect
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchEmails}
                    disabled={isLoadingEmails}
                    className="h-7 text-xs px-2"
                  >
                    {isLoadingEmails ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Automation Status Row - More Compact */}
              {automationEnabled && (
                <div className="pt-2 border-t border-border/50">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Last:</span>
                        <span className="font-medium">
                          {automationStats.lastChecked
                            ? (() => {
                                const date = new Date(
                                  automationStats.lastChecked
                                );
                                const now = new Date();
                                const diffInMinutes = Math.floor(
                                  (now.getTime() - date.getTime()) / (1000 * 60)
                                );

                                if (diffInMinutes < 1) return "Just now";
                                if (diffInMinutes < 60)
                                  return `${diffInMinutes}m ago`;
                                return date.toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                });
                              })()
                            : "Never"}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={refreshAutomationStatus}
                          disabled={isStatusLoading}
                          className="h-4 w-4 p-0 opacity-60 hover:opacity-100"
                        >
                          {isStatusLoading ? (
                            <Loader2 className="h-2.5 w-2.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-2.5 w-2.5" />
                          )}
                        </Button>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Imported:</span>
                        <Badge
                          variant="outline"
                          className="bg-green-50 text-green-700 border-green-200 text-xs px-1.5 py-0"
                        >
                          {automationStats.totalImported || 0}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {lastStatusUpdate && (
                        <span className="text-[10px] text-muted-foreground/70">
                          Updated:{" "}
                          {lastStatusUpdate.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                      )}
                      <div className="flex items-center gap-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs text-green-700">Active</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Monitored Emails Management - Show when automation is enabled */}
          {automationEnabled && monitoredEmails.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground">
                  Monitored Emails ({monitoredEmails.length})
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={getMonitoredEmails}
                  className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
              <div className="bg-muted/20 rounded border max-h-32 overflow-y-auto">
                <div className="divide-y">
                  {monitoredEmails.map((email) => (
                    <div
                      key={email}
                      className="flex items-center justify-between p-2 hover:bg-muted/30"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs truncate">{email}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEmailFromMonitoring(email)}
                        disabled={isRemovingEmail === email}
                        className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {isRemovingEmail === email ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Compact Search and Filters */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-8 h-8 text-sm"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-8 w-8 opacity-70 hover:opacity-100"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <Calendar className="mr-1.5 h-3 w-3 opacity-70" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex flex-1 items-center gap-3 bg-muted/30 px-3 py-1.5 rounded border">
                <div className="flex items-center space-x-1.5">
                  <Checkbox
                    id="show-attachments"
                    checked={showOnlyWithAttachments}
                    onCheckedChange={(value) =>
                      setShowOnlyWithAttachments(!!value)
                    }
                    className="scale-75"
                  />
                  <Label
                    htmlFor="show-attachments"
                    className="text-xs cursor-pointer flex items-center gap-1"
                  >
                    <Paperclip className="size-3 opacity-70" />
                    Attachments
                  </Label>
                </div>

                <div className="flex items-center space-x-1.5">
                  <Checkbox
                    id="show-job-related"
                    checked={showOnlyJobRelated}
                    onCheckedChange={(value) => setShowOnlyJobRelated(!!value)}
                    className="scale-75"
                  />
                  <Label
                    htmlFor="show-job-related"
                    className="text-xs cursor-pointer flex items-center gap-1"
                  >
                    Job related
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs max-w-xs">
                          Shows emails with job-related keywords
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                </div>
              </div>
            </div>
          </div>

          {/* Compact Results and Actions */}
          <div className="flex items-center justify-between p-2 bg-muted/20 rounded text-xs">
            <div className="text-muted-foreground">
              <span className="font-medium">{filteredEmails.length}</span>{" "}
              emails found
              {(searchQuery ||
                dateFilter !== "all" ||
                showOnlyWithAttachments ||
                showOnlyJobRelated) && (
                <span className="ml-1 bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px]">
                  filtered
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
                disabled={emails.length === 0}
                className="h-6 text-xs px-2"
              >
                {selectedEmails.length > 0 &&
                selectedEmails.length === filteredEmails.length ? (
                  <>
                    <XSquareIcon className="h-3 w-3 mr-1" />
                    Deselect All
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-3 w-3 mr-1" />
                    Select All
                  </>
                )}
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={processSelectedEmails}
                disabled={selectedEmails.length === 0}
                className="h-6 text-xs px-2"
              >
                Import
                {selectedEmails.length > 0 && (
                  <Badge
                    variant="outline"
                    className="ml-1 h-3.5 px-1 bg-white/20 text-white text-[10px]"
                  >
                    {selectedEmails.length}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Compact Progress */}
          {importProgress > 0 && (
            <div className="space-y-1 p-2 bg-blue-50 border border-blue-200 rounded">
              <div className="flex justify-between text-xs">
                <span className="text-blue-700 font-medium">
                  {importProgress < 100 ? "Importing..." : "Complete!"}
                </span>
                <span className="font-bold text-blue-800">
                  {importProgress}%
                </span>
              </div>
              <Progress value={importProgress} className="h-1.5" />
            </div>
          )}

          {/* Compact Email List */}
          <div className="border rounded overflow-hidden bg-white">
            {isLoadingEmails ? (
              <div className="p-8 flex flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                <p className="text-sm text-muted-foreground">
                  Loading emails...
                </p>
              </div>
            ) : emails.length === 0 ? (
              <div className="p-8 flex flex-col items-center justify-center text-center">
                <div className="bg-muted/30 rounded-full p-4 mb-3">
                  <Mail className="h-6 w-6 text-muted-foreground/60" />
                </div>
                <p className="font-medium mb-1">No emails found</p>
                <p className="text-sm text-muted-foreground">
                  {searchQuery ||
                  dateFilter !== "all" ||
                  showOnlyWithAttachments ||
                  showOnlyJobRelated
                    ? "Try changing your filters"
                    : "No job-related emails found"}
                </p>
              </div>
            ) : (
              <div className="divide-y max-h-[400px] overflow-y-auto">
                {filteredEmails.map((email) => (
                  <div
                    key={email.id}
                    className={`px-3 py-2.5 hover:bg-muted/30 transition-colors ${
                      selectedEmails.includes(email.id)
                        ? "bg-primary/5 border-l-2 border-l-primary"
                        : ""
                    } ${
                      email.isProcessed || email.isImported ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <Checkbox
                        checked={selectedEmails.includes(email.id)}
                        onCheckedChange={() => toggleEmailSelection(email.id)}
                        disabled={email.isProcessed}
                        className="mt-0.5 scale-75"
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-sm truncate">
                            {email.from.name}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                            <Calendar className="size-3" />
                            <span>
                              {new Date(email.receivedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {email.from.email}
                        </div>
                        <div className="text-xs font-medium truncate">
                          {email.subject}
                        </div>

                        {email.hasAttachments && email.attachments && (
                          <div className="flex flex-wrap gap-1">
                            {email.attachments?.map(
                              (attachment: EmailAttachment) => (
                                <Badge
                                  key={attachment.id}
                                  variant={
                                    attachment.isResume ? "default" : "outline"
                                  }
                                  className={`text-xs px-1.5 py-0.5 ${
                                    attachment.isResume
                                      ? "bg-primary/10 text-primary border-primary/20 cursor-pointer hover:bg-primary/20"
                                      : ""
                                  }`}
                                  onClick={() =>
                                    attachment.isResume &&
                                    handleProcessAttachment(email, attachment)
                                  }
                                >
                                  {attachment.name.length > 20
                                    ? `${attachment.name.substring(0, 20)}...`
                                    : attachment.name}{" "}
                                  <span className="opacity-60 text-[9px]">
                                    ({(attachment.size / 1024).toFixed(0)}KB)
                                  </span>
                                </Badge>
                              )
                            )}
                          </div>
                        )}

                        {(email.isImported || email.isProcessed) && (
                          <div className="flex items-center gap-1">
                            <div className="text-xs flex items-center text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
                              <Check className="h-3 w-3 mr-1" />
                              {email.isImported
                                ? "Already imported"
                                : "Imported"}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Compact Footer */}
          <div className="flex items-center justify-between p-2 bg-muted/20 rounded text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Info className="h-3 w-3" />
              {automationEnabled ? (
                <div className="flex items-center gap-1 text-blue-600">
                  <Bot className="h-3 w-3" />
                  <span>Auto-monitoring enabled</span>
                </div>
              ) : selectedEmails.length === 0 ? (
                "Select emails to import"
              ) : (
                <span>{selectedEmails.length} selected</span>
              )}
            </div>
          </div>

          <Button
            onClick={processSelectedEmails}
            disabled={selectedEmails.length === 0}
            className="w-full h-8 text-sm"
          >
            {isLoadingEmails ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : selectedEmails.length > 0 ? (
              `Process ${selectedEmails.length} Email${
                selectedEmails.length !== 1 ? "s" : ""
              }`
            ) : (
              "Select emails to process"
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default EmailImport;
