"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import {
  AlertCircle,
  Check,
  Clock,
  Copy,
  Edit,
  Eye,
  InfoIcon,
  Loader2,
  Mail,
  MessageSquare,
  MessageSquarePlus,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  SearchIcon,
  Settings,
  SettingsIcon,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Toaster, toast } from "sonner";
import { Badge } from "~/components/ui/badge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import { db } from "~/lib/firebase";
import { cn } from "~/lib/utils";
// Import the email service
import { emailService } from "~/services/emailService";
// Import useAuth to get the current user's information
import { useAuth } from "~/context/auth-context";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: string;
  createdAt: string;
  updatedAt?: string;
}

interface CandidateBasic {
  id: string;
  name: string;
  email?: string;
  stageId?: string;
}

interface MessageRecord {
  id: string;
  candidateId: string;
  candidateName: string;
  subject: string;
  body: string;
  status: "sending" | "sent" | "failed" | "read";
  type: "email" | "sms";
  sentAt: string;
  readAt?: string;
}

interface MessageForm {
  recipientId: string;
  subject: string;
  body: string;
  type: "email" | "sms";
}

interface EmailVariable {
  key: string;
  name: string;
  value: string;
  description: string;
}

interface EmailSettings {
  id: string;
  companyName: string;
  variables: EmailVariable[];
  updatedAt?: string;
}

export default function CommunicationPage() {
  // State for data
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [candidates, setCandidates] = useState<CandidateBasic[]>([]);
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [stages, setStages] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState({
    templates: true,
    candidates: true,
    messages: true,
    settings: true,
  });

  // Get the current user from auth context
  const { user } = useAuth();

  // State for forms
  const [newTemplate, setNewTemplate] = useState<{
    name: string;
    subject: string;
    body: string;
    type: "email" | "sms";
  }>({
    name: "",
    subject: "",
    body: "",
    type: "email",
  });

  const [messageForm, setMessageForm] = useState<MessageForm>({
    recipientId: "",
    subject: "",
    body: "",
    type: "email",
  });

  // State for editing
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(
    null
  );
  const [viewingMessage, setViewingMessage] = useState<MessageRecord | null>(
    null
  );

  // State for UI controls
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [isDeleteTemplateDialogOpen, setIsDeleteTemplateDialogOpen] =
    useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("compose");
  const [viewMessageDialog, setViewMessageDialog] = useState(false);

  // State for email settings
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    id: "email-settings",
    companyName: "Your Company",
    variables: [
      {
        key: "company_name",
        name: "Company Name",
        value: "Your Company",
        description: "The name of your company",
      },
      {
        key: "job_title",
        name: "Job Title",
        value: "Open Position",
        description: "Default job title for communications",
      },
    ],
  });
  const [newVariableKey, setNewVariableKey] = useState("");
  const [newVariableName, setNewVariableName] = useState("");
  const [newVariableValue, setNewVariableValue] = useState("");
  const [newVariableDescription, setNewVariableDescription] = useState("");
  const [isAddVariableOpen, setIsAddVariableOpen] = useState(false);
  const [isEditVariableOpen, setIsEditVariableOpen] = useState(false);
  const [editingVariable, setEditingVariable] = useState<EmailVariable | null>(
    null
  );

  // Fetch email templates
  useEffect(() => {
    const q = query(
      collection(db, "emailTemplates"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTemplates(
        snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            } as EmailTemplate)
        )
      );
      setLoading((prev) => ({ ...prev, templates: false }));
    });
    return () => unsubscribe();
  }, []);

  // Fetch candidates
  useEffect(() => {
    const q = query(collection(db, "candidates"), orderBy("name"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCandidates(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || "",
          email: doc.data().email || "",
          stageId: doc.data().stageId || "",
        }))
      );
      setLoading((prev) => ({ ...prev, candidates: false }));
    });
    return () => unsubscribe();
  }, []);

  // Fetch messages
  useEffect(() => {
    const q = query(collection(db, "messages"), orderBy("sentAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(
        snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            } as MessageRecord)
        )
      );
      setLoading((prev) => ({ ...prev, messages: false }));
    });
    return () => unsubscribe();
  }, []);

  // Fetch stages for filtering
  useEffect(() => {
    const q = query(collection(db, "stages"), orderBy("order"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setStages(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          title: doc.data().title || "",
        }))
      );
    });
    return () => unsubscribe();
  }, []);

  // Update the email settings fetching effect:
  useEffect(() => {
    const settingsDocRef = doc(db, "settings", "email-settings");

    // Use onSnapshot for real-time updates
    const unsubscribe = onSnapshot(settingsDocRef, async (docSnap) => {
      try {
        if (docSnap.exists()) {
          setEmailSettings(docSnap.data() as EmailSettings);
        } else {
          // Create default settings if none exist
          const defaultSettings = {
            id: "email-settings",
            companyName: "Your Company",
            variables: [
              {
                key: "company_name",
                name: "Company Name",
                value: "Your Company",
                description: "The name of your company",
              },
              {
                key: "job_title",
                name: "Job Title",
                value: "Open Position",
                description: "Default job title for communications",
              },
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          await setDoc(settingsDocRef, defaultSettings);
          setEmailSettings(defaultSettings);
        }
        setLoading((prev) => ({ ...prev, settings: false }));
      } catch (error) {
        console.error("Error fetching email settings:", error);
        toast.error("Failed to load email settings");
        setLoading((prev) => ({ ...prev, settings: false }));
      }
    });

    return () => unsubscribe();
  }, []);

  // TEMPLATE FUNCTIONS
  const handleSaveTemplate = async () => {
    if (
      !newTemplate.name.trim() ||
      !newTemplate.subject.trim() ||
      !newTemplate.body.trim()
    ) {
      toast.error("Please fill out all fields");
      return;
    }

    try {
      setIsSubmitting(true);
      await addDoc(collection(db, "emailTemplates"), {
        ...newTemplate,
        createdAt: new Date().toISOString(),
      });
      setNewTemplate({ name: "", subject: "", body: "", type: "email" });
      toast.success("Template saved successfully");
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Error saving template");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTemplate = async () => {
    if (
      !editingTemplate ||
      !editingTemplate.name.trim() ||
      !editingTemplate.subject.trim() ||
      !editingTemplate.body.trim()
    ) {
      toast.error("Please fill out all fields");
      return;
    }

    try {
      setIsSubmitting(true);
      const templateRef = doc(db, "emailTemplates", editingTemplate.id);
      await updateDoc(templateRef, {
        name: editingTemplate.name,
        subject: editingTemplate.subject,
        body: editingTemplate.body,
        type: editingTemplate.type,
        updatedAt: new Date().toISOString(),
      });
      setEditingTemplate(null);
      toast.success("Template updated successfully");
    } catch (error) {
      console.error("Error updating template:", error);
      toast.error("Error updating template");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;

    try {
      setIsSubmitting(true);
      await deleteDoc(doc(db, "emailTemplates", templateToDelete));
      setTemplateToDelete(null);
      setIsDeleteTemplateDialogOpen(false);
      toast.success("Template deleted successfully");
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Error deleting template");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyTemplate = (template: EmailTemplate) => {
    setMessageForm((prev) => ({
      ...prev,
      subject: template.subject,
      body: template.body,
      type: template.type as "email" | "sms",
    }));

    setActiveTab("compose");
    toast.success("Template applied");
  };

  // MESSAGE FUNCTIONS
  const handleSendMessage = async () => {
    if (!messageForm.recipientId || !messageForm.subject || !messageForm.body) {
      toast.error("Please fill out all message fields");
      return;
    }

    try {
      setIsSending(true);

      // Get recipient info
      const recipient = candidates.find(
        (c) => c.id === messageForm.recipientId
      );

      if (!recipient) {
        throw new Error("Recipient not found");
      }

      if (messageForm.type === "email" && !recipient.email) {
        toast.error("Selected candidate doesn't have an email address");
        return;
      }

      // Replace variables in subject and body before sending
      const replacedSubject = replaceTemplateVariables(
        messageForm.subject,
        messageForm.recipientId,
        emailSettings
      );

      const replacedBody = replaceTemplateVariables(
        messageForm.body,
        messageForm.recipientId,
        emailSettings
      );

      // Create a message record with replaced content
      const messageData = {
        ...messageForm,
        candidateId: messageForm.recipientId,
        candidateName: recipient.name || "",
        subject: replacedSubject,
        body: replacedBody,
        status: "sending" as const,
        sentAt: new Date().toISOString(),
      };

      // Save the message to firestore
      const docRef = await addDoc(collection(db, "messages"), messageData);

      // Send the email with replaced content
      try {
        await emailService.sendCandidateEmail({
          messageId: docRef.id,
          candidateId: messageForm.recipientId,
          candidateName: recipient.name,
          candidateEmail: recipient.email,
          subject: replacedSubject, // Use replaced subject
          body: replacedBody, // Use replaced body
          type: messageForm.type,
          senderName: user?.name || "Hiring Team",
        });

        // Update the message status to 'sent'
        await updateDoc(doc(db, "messages", docRef.id), {
          status: "sent",
        });
      } catch (emailError) {
        console.error("Email sending error:", emailError);

        // Update the message status to 'failed'
        await updateDoc(doc(db, "messages", docRef.id), {
          status: "failed",
        });

        // Handle specific error types
        if (
          emailError instanceof Error &&
          emailError.message.includes("rate limit")
        ) {
          toast.error(
            "Email sending failed: Rate limit exceeded. Please try again later."
          );
        } else if (
          emailError instanceof Error &&
          emailError.message.includes("authentication")
        ) {
          toast.error(
            "Email sending failed: Authentication error. Please check email settings."
          );
        } else {
          toast.error("Failed to send email. Message saved as draft.");
        }

        throw emailError;
      }

      // Reset form
      setMessageForm({
        recipientId: "",
        subject: "",
        body: "",
        type: "email",
      });

      toast.success(`Message sent to ${recipient.name} successfully`);
    } catch (error) {
      console.error("Error sending message:", error);
      if (
        !(error instanceof Error && error.message.includes("rate limit")) &&
        !(error instanceof Error && error.message.includes("authentication"))
      ) {
        toast.error("Error sending message");
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      setIsSubmitting(true);
      await deleteDoc(doc(db, "messages", messageId));
      toast.success("Message deleted successfully");
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error("Error deleting message");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddVariable = async () => {
    if (!newVariableKey || !newVariableName || !newVariableValue) {
      toast.error("Please fill out all variable fields");
      return;
    }

    // Check if key already exists
    const keyExists = emailSettings.variables.some(
      (v) => v.key === newVariableKey
    );
    if (keyExists) {
      toast.error(`Variable with key '${newVariableKey}' already exists`);
      return;
    }

    try {
      setIsSubmitting(true);

      const newVar: EmailVariable = {
        key: newVariableKey,
        name: newVariableName,
        value: newVariableValue,
        description: newVariableDescription,
      };

      const updatedSettings = {
        ...emailSettings,
        variables: [...emailSettings.variables, newVar],
        updatedAt: new Date().toISOString(),
      };

      // Save to Firestore immediately
      await setDoc(doc(db, "settings", "email-settings"), updatedSettings);

      // Update local state
      setEmailSettings(updatedSettings);

      // Reset form
      setNewVariableKey("");
      setNewVariableName("");
      setNewVariableValue("");
      setNewVariableDescription("");
      setIsAddVariableOpen(false);

      toast.success(`Added variable: ${newVariableName}`);
    } catch (error) {
      console.error("Error adding variable:", error);
      toast.error("Failed to add variable");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditVariable = async () => {
    if (!editingVariable) return;

    try {
      setIsSubmitting(true);

      const updatedVariables = emailSettings.variables.map((v) =>
        v.key === editingVariable.key ? editingVariable : v
      );

      const updatedSettings = {
        ...emailSettings,
        variables: updatedVariables,
        updatedAt: new Date().toISOString(),
      };

      // Save to Firestore immediately
      await setDoc(doc(db, "settings", "email-settings"), updatedSettings);

      // Update local state
      setEmailSettings(updatedSettings);

      setEditingVariable(null);
      setIsEditVariableOpen(false);
      toast.success(`Updated variable: ${editingVariable.name}`);
    } catch (error) {
      console.error("Error updating variable:", error);
      toast.error("Failed to update variable");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVariable = async (key: string) => {
    // Don't allow deleting core variables
    if (key === "company_name" || key === "job_title") {
      toast.error("Cannot delete core system variables");
      return;
    }

    try {
      setIsSubmitting(true);

      const updatedVariables = emailSettings.variables.filter(
        (v) => v.key !== key
      );

      const updatedSettings = {
        ...emailSettings,
        variables: updatedVariables,
        updatedAt: new Date().toISOString(),
      };

      // Save to Firestore immediately
      await setDoc(doc(db, "settings", "email-settings"), updatedSettings);

      // Update local state
      setEmailSettings(updatedSettings);

      toast.success("Variable deleted");
    } catch (error) {
      console.error("Error deleting variable:", error);
      toast.error("Failed to delete variable");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditVariable = (variable: EmailVariable) => {
    setEditingVariable(variable);
    setIsEditVariableOpen(true);
  };

  // HELPER FUNCTIONS
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    }).format(date);
  };

  const replaceTemplateVariables = (
    text: string,
    candidateId: string,
    settings = emailSettings
  ) => {
    const candidate = candidates.find((c) => c.id === candidateId);
    if (!candidate) return text;

    let replacedText = text;

    // Replace candidate name
    replacedText = replacedText.replace(/{{candidate_name}}/g, candidate.name);

    // Replace all custom variables from settings
    if (settings && settings.variables) {
      settings.variables.forEach((variable) => {
        const regex = new RegExp(`{{${variable.key}}}`, "g");
        replacedText = replacedText.replace(regex, variable.value);
      });
    }

    return replacedText;
  };

  // Filter candidates based on search query and stage
  const filteredCandidates = candidates.filter((candidate) => {
    const matchesSearch =
      searchQuery.trim() === "" ||
      candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (candidate.email &&
        candidate.email.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStage =
      stageFilter === "all" || candidate.stageId === stageFilter;

    return matchesSearch && matchesStage;
  });

  // Filter templates based on type
  const filteredTemplates = templates.filter((template) => {
    return templateFilter === "all" || template.type === templateFilter;
  });

  return (
    <div className="container mx-auto py-6">
      <Toaster position="top-right" richColors />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Mail className="size-6" />
            Communication Tools
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage communications with candidates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="py-1 px-3">
            {messages.length} messages sent
          </Badge>
          <Badge variant="outline" className="py-1 px-3">
            {templates.length} templates
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="compose" className="flex items-center gap-1.5">
            <MessageSquare className="size-4" />
            <span>Compose Message</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-1.5">
            <Copy className="size-4" />
            <span>Email Templates</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1.5">
            <Settings className="size-4" />
            <span>Email Settings</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1.5">
            <Clock className="size-4" />
            <span>Message History</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="size-5" />
                New Message
              </CardTitle>
              <CardDescription>
                Send an email or SMS to candidates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">
                    Filter by stage:
                  </label>
                  <Select value={stageFilter} onValueChange={setStageFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All stages" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All stages</SelectItem>
                      {stages.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          {stage.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search candidates..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setSearchQuery("")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">To:</label>
                <Select
                  value={messageForm.recipientId}
                  onValueChange={(value) =>
                    setMessageForm({ ...messageForm, recipientId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select recipient" />
                  </SelectTrigger>
                  <SelectContent>
                    {loading.candidates ? (
                      <div className="flex items-center justify-center py-2">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span>Loading candidates...</span>
                      </div>
                    ) : filteredCandidates.length > 0 ? (
                      filteredCandidates.map((candidate) => (
                        <SelectItem key={candidate.id} value={candidate.id}>
                          <div className="flex flex-col">
                            <span>{candidate.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {candidate.email
                                ? candidate.email
                                : "No email available"}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="text-center py-2 text-muted-foreground">
                        No candidates match your criteria
                      </div>
                    )}
                  </SelectContent>
                </Select>
                {messageForm.recipientId && (
                  <div className="mt-2">
                    <div className="text-sm flex items-center gap-1">
                      <span className="font-medium">Selected:</span>
                      <span>
                        {
                          candidates.find(
                            (c) => c.id === messageForm.recipientId
                          )?.name
                        }
                      </span>
                      {candidates.find((c) => c.id === messageForm.recipientId)
                        ?.email && (
                        <span className="text-muted-foreground">
                          (
                          {
                            candidates.find(
                              (c) => c.id === messageForm.recipientId
                            )?.email
                          }
                          )
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Subject:
                </label>
                <Input
                  placeholder="Email subject"
                  value={messageForm.subject}
                  onChange={(e) =>
                    setMessageForm({ ...messageForm, subject: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Message:
                </label>
                <Textarea
                  placeholder="Type your message here"
                  className="min-h-[200px]"
                  value={messageForm.body}
                  onChange={(e) =>
                    setMessageForm({ ...messageForm, body: e.target.value })
                  }
                />
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <div>
                    Available variables:{" "}
                    <span
                      className="font-mono cursor-pointer text-primary hover:underline"
                      onClick={() => setActiveTab("settings")}
                    >
                      Click to manage
                    </span>
                  </div>
                  <div>{messageForm.body.length} characters</div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span
                    className="font-mono bg-muted text-xs px-1.5 py-0.5 rounded cursor-pointer hover:bg-primary/10"
                    onClick={() =>
                      setMessageForm({
                        ...messageForm,
                        body: messageForm.body + " {{candidate_name}}",
                      })
                    }
                  >
                    {"{{candidate_name}}"}
                  </span>
                  {emailSettings.variables.map((variable) => (
                    <span
                      key={variable.key}
                      className="font-mono bg-muted text-xs px-1.5 py-0.5 rounded cursor-pointer hover:bg-primary/10"
                      onClick={() =>
                        setMessageForm({
                          ...messageForm,
                          body: messageForm.body + ` {{${variable.key}}}`,
                        })
                      }
                      title={variable.description}
                    >
                      {`{{${variable.key}}}`}
                    </span>
                  ))}
                </div>
              </div>

              {templates.length > 0 && (
                <div className="bg-muted/20 p-3 rounded-md">
                  <div className="text-sm font-medium mb-2">
                    Apply a template:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {templates.slice(0, 5).map((template) => (
                      <Button
                        key={template.id}
                        variant="outline"
                        size="sm"
                        onClick={() => handleApplyTemplate(template)}
                        className="h-7 text-xs"
                      >
                        {template.name}
                      </Button>
                    ))}
                    {templates.length > 5 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTab("templates")}
                        className="h-7 text-xs"
                      >
                        View all templates
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Select
                value={messageForm.type}
                onValueChange={(value: "email" | "sms") =>
                  setMessageForm({ ...messageForm, type: value })
                }
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Message type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email" className="flex items-center gap-2">
                    <Mail className="size-4" />
                    <span>Email</span>
                  </SelectItem>
                  <SelectItem value="sms" className="flex items-center gap-2">
                    <Phone className="size-4" />
                    <span>SMS</span>
                  </SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                {messageForm.recipientId &&
                  messageForm.type === "email" &&
                  !candidates.find((c) => c.id === messageForm.recipientId)
                    ?.email && (
                    <div className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="size-4" />
                      <span>Candidate has no email</span>
                    </div>
                  )}
                <Button
                  onClick={handleSendMessage}
                  disabled={
                    isSending ||
                    !messageForm.recipientId ||
                    !messageForm.subject ||
                    !messageForm.body ||
                    (messageForm.type === "email" &&
                      !candidates.find((c) => c.id === messageForm.recipientId)
                        ?.email)
                  }
                >
                  {isSending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Message
                    </>
                  )}
                </Button>
              </div>
            </CardFooter>
          </Card>

          {messageForm.recipientId && (
            <div className="mt-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Message Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-md p-4 bg-muted/20">
                    <div className="font-medium mb-1">
                      Subject: {messageForm.subject}
                    </div>
                    <Separator className="my-2" />
                    <div className="whitespace-pre-wrap">
                      {replaceTemplateVariables(
                        messageForm.body,
                        messageForm.recipientId
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Copy className="size-5" />
                  {editingTemplate ? "Edit Template" : "Create Template"}
                </CardTitle>
                <CardDescription>
                  {editingTemplate
                    ? "Update an existing email template"
                    : "Create reusable email templates for common communications"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label
                    htmlFor="template-name"
                    className="text-sm font-medium"
                  >
                    Template Name
                  </Label>
                  <Input
                    id="template-name"
                    placeholder="e.g. Interview Invitation"
                    value={
                      editingTemplate ? editingTemplate.name : newTemplate.name
                    }
                    onChange={(e) =>
                      editingTemplate
                        ? setEditingTemplate({
                            ...editingTemplate,
                            name: e.target.value,
                          })
                        : setNewTemplate({
                            ...newTemplate,
                            name: e.target.value,
                          })
                    }
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="template-subject"
                    className="text-sm font-medium"
                  >
                    Subject
                  </Label>
                  <Input
                    id="template-subject"
                    placeholder="Email subject line"
                    value={
                      editingTemplate
                        ? editingTemplate.subject
                        : newTemplate.subject
                    }
                    onChange={(e) =>
                      editingTemplate
                        ? setEditingTemplate({
                            ...editingTemplate,
                            subject: e.target.value,
                          })
                        : setNewTemplate({
                            ...newTemplate,
                            subject: e.target.value,
                          })
                    }
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="template-body"
                    className="text-sm font-medium"
                  >
                    Body
                  </Label>
                  <Textarea
                    id="template-body"
                    placeholder="Hello {{candidate_name}},..."
                    className="min-h-[200px] mt-1"
                    value={
                      editingTemplate ? editingTemplate.body : newTemplate.body
                    }
                    onChange={(e) =>
                      editingTemplate
                        ? setEditingTemplate({
                            ...editingTemplate,
                            body: e.target.value,
                          })
                        : setNewTemplate({
                            ...newTemplate,
                            body: e.target.value,
                          })
                    }
                  />
                </div>

                <div>
                  <Label
                    htmlFor="template-type"
                    className="text-sm font-medium"
                  >
                    Type
                  </Label>
                  <Select
                    value={
                      editingTemplate ? editingTemplate.type : newTemplate.type
                    }
                    onValueChange={(value: string) =>
                      editingTemplate
                        ? setEditingTemplate({
                            ...editingTemplate,
                            type: value,
                          })
                        : setNewTemplate({
                            ...newTemplate,
                            type: value as "email" | "sms",
                          })
                    }
                  >
                    <SelectTrigger id="template-type" className="mt-1">
                      <SelectValue placeholder="Template type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-2 text-xs text-muted-foreground">
                  <p className="mb-1 font-medium">Available variables:</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
                      {"{{candidate_name}}"}
                    </span>
                    {emailSettings.variables.map((variable) => (
                      <span
                        key={variable.key}
                        className="font-mono bg-muted px-1.5 py-0.5 rounded"
                        title={variable.description}
                      >
                        {`{{${variable.key}}}`}
                      </span>
                    ))}
                  </div>
                  <p
                    className="mt-2 text-primary hover:underline cursor-pointer"
                    onClick={() => setActiveTab("settings")}
                  >
                    Manage variables in Email Settings
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                {editingTemplate ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setEditingTemplate(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleUpdateTemplate}
                      disabled={
                        isSubmitting ||
                        !editingTemplate.name ||
                        !editingTemplate.subject ||
                        !editingTemplate.body
                      }
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        "Update Template"
                      )}
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={handleSaveTemplate}
                    disabled={
                      isSubmitting ||
                      !newTemplate.name ||
                      !newTemplate.subject ||
                      !newTemplate.body
                    }
                    className="w-full md:w-auto"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Template"
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>

            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <MessageSquarePlus className="size-5" />
                  Your Templates
                </h3>
                <div className="flex items-center gap-2">
                  <Select
                    value={templateFilter}
                    onValueChange={setTemplateFilter}
                  >
                    <SelectTrigger className="w-[140px] h-8 text-xs">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                    </SelectContent>
                  </Select>
                  <Badge variant="outline">
                    {filteredTemplates.length} templates
                  </Badge>
                </div>
              </div>

              {loading.templates ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Loading templates...</span>
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-12 border rounded-md bg-muted/20">
                  <Copy className="size-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-muted-foreground">No templates yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create your first template to get started
                  </p>
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-12 border rounded-md bg-muted/20">
                  <SearchIcon className="size-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-muted-foreground">
                    No templates match your filter
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Try changing your search criteria
                  </p>
                </div>
              ) : (
                <div className="space-y-3 overflow-y-auto max-h-[600px] pr-2">
                  {filteredTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="border rounded-md p-4 hover:bg-muted/10 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium">{template.name}</div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              template.type === "email"
                                ? "secondary"
                                : "outline"
                            }
                            className="h-6 font-normal"
                          >
                            {template.type === "email" ? (
                              <Mail className="mr-1 size-3" />
                            ) : (
                              <Phone className="mr-1 size-3" />
                            )}
                            {template.type}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setEditingTemplate(template)}
                                className="cursor-pointer"
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                <span>Edit</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleApplyTemplate(template)}
                                className="cursor-pointer"
                              >
                                <Mail className="mr-2 h-4 w-4" />
                                <span>Use Template</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive cursor-pointer"
                                onClick={() => {
                                  setTemplateToDelete(template.id);
                                  setIsDeleteTemplateDialogOpen(true);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <div className="text-sm font-medium mb-1">
                        Subject: {template.subject}
                      </div>
                      <div className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {template.body}
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div>
                          Created: {formatTimestamp(template.createdAt)}
                        </div>
                        {template.updatedAt && (
                          <div>
                            Updated: {formatTimestamp(template.updatedAt)}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApplyTemplate(template)}
                          className="h-8"
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          Use Template
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingTemplate(template)}
                          className="h-8"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="size-5" />
                Email Variables Settings
              </CardTitle>
              <CardDescription>
                Manage email variables for use in templates and messages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loading.settings ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Loading email settings...</span>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-medium">
                        Manage Template Variables
                      </h3>
                      <Button
                        onClick={() => setIsAddVariableOpen(true)}
                        size="sm"
                        className="gap-1"
                      >
                        <Plus className="size-3.5" />
                        Add Variable
                      </Button>
                    </div>

                    {/* Add overflow-x-auto to create horizontal scrolling when needed */}
                    <div className="overflow-x-auto">
                      <div className="border rounded-md overflow-hidden min-w-full">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-muted/50">
                              <th className="text-left p-3 font-medium">
                                Name
                              </th>
                              <th className="text-left p-3 font-medium">
                                Variable
                              </th>
                              <th className="text-left p-3 font-medium">
                                Value
                              </th>
                              <th className="text-left p-3 font-medium">
                                Description
                              </th>
                              <th className="text-right p-3 font-medium w-[100px]">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {emailSettings.variables.map((variable) => (
                              <tr
                                key={variable.key}
                                className="border-t hover:bg-muted/10"
                              >
                                <td className="p-3 font-medium whitespace-nowrap">
                                  {variable.name}
                                </td>
                                <td className="p-3 whitespace-nowrap">
                                  <code className="font-mono bg-muted/30 px-1.5 py-0.5 rounded text-sm">
                                    {`{{${variable.key}}}`}
                                  </code>
                                </td>
                                <td className="p-3 max-w-[200px] truncate">
                                  {variable.value}
                                </td>
                                <td className="p-3 text-muted-foreground text-sm max-w-[250px] truncate">
                                  {variable.description}
                                </td>
                                <td className="p-3 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() =>
                                        startEditVariable(variable)
                                      }
                                      className="size-8"
                                      disabled={isSubmitting}
                                    >
                                      <Pencil className="size-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() =>
                                        handleDeleteVariable(variable.key)
                                      }
                                      className="size-8 text-destructive hover:text-destructive"
                                      disabled={
                                        isSubmitting ||
                                        variable.key === "company_name" ||
                                        variable.key === "job_title"
                                      }
                                    >
                                      <Trash2 className="size-3.5" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="bg-muted/20 p-4 rounded-md border flex items-start gap-3">
                      <InfoIcon className="size-5 mt-0.5 text-muted-foreground" />
                      <div className="text-sm">
                        <p className="font-medium mb-1">
                          Using variables in emails
                        </p>
                        <p className="text-muted-foreground">
                          Variables can be added to email templates and messages
                          by inserting the variable code (e.g.,{" "}
                          <code className="bg-muted/50 px-1 rounded">
                            {"{{company_name}}"}
                          </code>
                          ). When the email is sent, these variables will be
                          replaced with their actual values. The{" "}
                          <code className="bg-muted/50 px-1 rounded">
                            {"{{candidate_name}}"}
                          </code>{" "}
                          variable is always available and is replaced with the
                          recipient's name.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="size-5" />
                    Message History
                  </CardTitle>
                  <CardDescription>
                    View previous communications with candidates
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="py-1 px-2">
                    {messages.length} messages
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Refresh"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading.messages ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Loading message history...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12 border rounded-md bg-muted/20 flex flex-col items-center">
                  <MessageSquarePlus className="size-10 text-muted-foreground/40 mb-2" />
                  <p className="text-muted-foreground">
                    Message history will appear here
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                    <InfoIcon className="size-3" />
                    Send your first message to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className="border p-4 rounded-md hover:bg-muted/10 transition-colors cursor-pointer"
                      onClick={() => {
                        setViewingMessage(message);
                        setViewMessageDialog(true);
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">
                          {message.candidateName}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              message.status === "sent" ? "default" : "outline"
                            }
                            className={cn(
                              "h-6",
                              message.status === "failed" &&
                                "bg-destructive/10 text-destructive",
                              message.status === "read" &&
                                "bg-green-100 text-green-800"
                            )}
                          >
                            {message.status === "sent" && (
                              <Check className="mr-1 size-3" />
                            )}
                            {message.status === "failed" && (
                              <X className="mr-1 size-3" />
                            )}
                            {message.status === "read" && (
                              <Check className="mr-1 size-3" />
                            )}
                            {message.status === "sending" && (
                              <Loader2 className="mr-1 size-3 animate-spin" />
                            )}
                            {message.status.charAt(0).toUpperCase() +
                              message.status.slice(1)}
                          </Badge>
                          <Badge variant="outline" className="h-6">
                            {message.type === "email" ? (
                              <Mail className="mr-1 size-3" />
                            ) : (
                              <Phone className="mr-1 size-3" />
                            )}
                            {message.type}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-sm font-medium mb-1">
                        Subject: {message.subject}
                      </div>
                      <div className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {message.body}
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                        <div className="flex items-center gap-1">
                          <Clock className="size-3" />
                          <span>Sent: {formatTimestamp(message.sentAt)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingMessage(message);
                              setViewMessageDialog(true);
                            }}
                          >
                            <Eye className="mr-1 size-3" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteMessage(message.id);
                            }}
                          >
                            <Trash2 className="mr-1 size-3" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Template Confirmation Dialog */}
      <Dialog
        open={isDeleteTemplateDialogOpen}
        onOpenChange={setIsDeleteTemplateDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this template? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteTemplateDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTemplate}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Template"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Message Dialog */}
      <Dialog open={viewMessageDialog} onOpenChange={setViewMessageDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="size-5" />
              Message Details
            </DialogTitle>
            <DialogDescription>
              Message sent to {viewingMessage?.candidateName} on{" "}
              {viewingMessage?.sentAt && formatTimestamp(viewingMessage.sentAt)}
            </DialogDescription>
          </DialogHeader>

          {viewingMessage && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="h-7">
                  {viewingMessage.type === "email" ? (
                    <Mail className="mr-1 size-3" />
                  ) : (
                    <Phone className="mr-1 size-3" />
                  )}
                  {viewingMessage.type.toUpperCase()}
                </Badge>
                <Badge
                  variant={
                    viewingMessage.status === "sent" ? "default" : "outline"
                  }
                  className={cn(
                    "h-7",
                    viewingMessage.status === "failed" &&
                      "bg-destructive/10 text-destructive",
                    viewingMessage.status === "read" &&
                      "bg-green-100 text-green-800"
                  )}
                >
                  {viewingMessage.status === "sent" && (
                    <Check className="mr-1 size-3" />
                  )}
                  {viewingMessage.status === "failed" && (
                    <X className="mr-1 size-3" />
                  )}
                  {viewingMessage.status === "read" && (
                    <Check className="mr-1 size-3" />
                  )}
                  {viewingMessage.status === "sending" && (
                    <Loader2 className="mr-1 size-3 animate-spin" />
                  )}
                  {viewingMessage.status.charAt(0).toUpperCase() +
                    viewingMessage.status.slice(1)}
                </Badge>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-1">To:</h4>
                <p className="text-sm">{viewingMessage.candidateName}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-1">Subject:</h4>
                <p className="text-sm">{viewingMessage.subject}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-1">Message:</h4>
                <div className="border rounded-md p-3 bg-muted/20">
                  <p className="text-sm whitespace-pre-wrap">
                    {viewingMessage.body}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div>Sent on: {formatTimestamp(viewingMessage.sentAt)}</div>
                {viewingMessage.readAt && (
                  <div>Read on: {formatTimestamp(viewingMessage.readAt)}</div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setViewMessageDialog(false)}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                // Prepare a new message with same recipient but empty subject/body
                if (viewingMessage) {
                  setMessageForm({
                    recipientId: viewingMessage.candidateId,
                    subject: "",
                    body: "",
                    type: viewingMessage.type,
                  });
                  setActiveTab("compose");
                  setViewMessageDialog(false);
                }
              }}
            >
              <MessageSquarePlus className="mr-2 h-4 w-4" />
              New Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Variable Dialog */}
      <Dialog open={isAddVariableOpen} onOpenChange={setIsAddVariableOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Variable</DialogTitle>
            <DialogDescription>
              Create a new variable for use in your email templates and messages
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="variable-key" className="text-sm font-medium">
                  Variable Key*
                </Label>
                <Input
                  id="variable-key"
                  value={newVariableKey}
                  onChange={(e) =>
                    setNewVariableKey(
                      e.target.value.replace(/\s+/g, "_").toLowerCase()
                    )
                  }
                  placeholder="e.g. interview_location"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Used in templates as {"{{"}
                  {newVariableKey ? newVariableKey : "variable_key"}
                  {"}}"}
                </p>
              </div>
              <div>
                <Label htmlFor="variable-name" className="text-sm font-medium">
                  Display Name*
                </Label>
                <Input
                  id="variable-name"
                  value={newVariableName}
                  onChange={(e) => setNewVariableName(e.target.value)}
                  placeholder="e.g. Interview Location"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="variable-value" className="text-sm font-medium">
                Default Value*
              </Label>
              <Input
                id="variable-value"
                value={newVariableValue}
                onChange={(e) => setNewVariableValue(e.target.value)}
                placeholder="e.g. Our office at 123 Main St"
                className="mt-1"
              />
            </div>
            <div>
              <Label
                htmlFor="variable-description"
                className="text-sm font-medium"
              >
                Description
              </Label>
              <Textarea
                id="variable-description"
                value={newVariableDescription}
                onChange={(e) => setNewVariableDescription(e.target.value)}
                placeholder="Optional description of what this variable is used for"
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddVariableOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddVariable}
              disabled={
                !newVariableKey || !newVariableName || !newVariableValue
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Variable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Variable Dialog */}
      <Dialog open={isEditVariableOpen} onOpenChange={setIsEditVariableOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Variable</DialogTitle>
            <DialogDescription>
              Update the variable for use in your email templates
            </DialogDescription>
          </DialogHeader>

          {editingVariable && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="edit-variable-key"
                    className="text-sm font-medium"
                  >
                    Variable Key
                  </Label>
                  <Input
                    id="edit-variable-key"
                    value={editingVariable.key}
                    readOnly
                    disabled
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Used in templates as {"{{"}
                    {editingVariable.key}
                    {"}}"}
                  </p>
                </div>
                <div>
                  <Label
                    htmlFor="edit-variable-name"
                    className="text-sm font-medium"
                  >
                    Display Name*
                  </Label>
                  <Input
                    id="edit-variable-name"
                    value={editingVariable.name}
                    onChange={(e) =>
                      setEditingVariable({
                        ...editingVariable,
                        name: e.target.value,
                      })
                    }
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label
                  htmlFor="edit-variable-value"
                  className="text-sm font-medium"
                >
                  Default Value*
                </Label>
                <Input
                  id="edit-variable-value"
                  value={editingVariable.value}
                  onChange={(e) =>
                    setEditingVariable({
                      ...editingVariable,
                      value: e.target.value,
                    })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label
                  htmlFor="edit-variable-description"
                  className="text-sm font-medium"
                >
                  Description
                </Label>
                <Textarea
                  id="edit-variable-description"
                  value={editingVariable.description}
                  onChange={(e) =>
                    setEditingVariable({
                      ...editingVariable,
                      description: e.target.value,
                    })
                  }
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditVariableOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditVariable}
              disabled={
                !editingVariable ||
                !editingVariable.name ||
                !editingVariable.value
              }
            >
              <Save className="mr-2 h-4 w-4" />
              Update Variable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
