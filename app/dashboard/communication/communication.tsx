"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
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
  RefreshCw,
  Search,
  SearchIcon,
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

      // Create a message record (modify the status to 'sending')
      const messageData = {
        ...messageForm,
        candidateId: messageForm.recipientId,
        candidateName: recipient.name || "",
        status: "sending", // Change to 'sending' instead of 'sent'
        sentAt: new Date().toISOString(),
      };

      // Save the message to firestore first
      const docRef = await addDoc(collection(db, "messages"), messageData);

      // Actually send the email via backend
      try {
        await emailService.sendCandidateEmail({
          messageId: docRef.id,
          candidateId: messageForm.recipientId,
          candidateName: recipient.name,
          candidateEmail: recipient.email,
          subject: messageForm.subject,
          body: messageForm.body,
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

        throw emailError; // Re-throw to be caught by the outer catch
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
      // Only show the generic error if it wasn't already handled in the inner catch
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

  const replaceTemplateVariables = (text: string, candidateId: string) => {
    const candidate = candidates.find((c) => c.id === candidateId);
    if (!candidate) return text;

    return text
      .replace(/{{candidate_name}}/g, candidate.name)
      .replace(/{{job_title}}/g, "Open Position") // Would come from jobs collection
      .replace(/{{company_name}}/g, "Your Company"); // Would come from settings
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
                    Use variables:{" "}
                    <span className="font-mono">{"{{candidate_name}}"}</span>,{" "}
                    <span className="font-mono">{"{{job_title}}"}</span>,{" "}
                    <span className="font-mono">{"{{company_name}}"}</span>
                  </div>
                  <div>{messageForm.body.length} characters</div>
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
                  <ul className="list-disc list-inside">
                    <li>
                      <span className="font-mono">{"{{candidate_name}}"}</span>{" "}
                      - The candidate's full name
                    </li>
                    <li>
                      <span className="font-mono">{"{{job_title}}"}</span> -
                      Position title
                    </li>
                    <li>
                      <span className="font-mono">{"{{company_name}}"}</span> -
                      Your company name
                    </li>
                  </ul>
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
    </div>
  );
}
