// app/dashboard/communication/communication.tsx

import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { InfoIcon, Mail, MessageSquarePlus } from "lucide-react";
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
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import { db } from "~/lib/firebase";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: string;
  createdAt: string;
}

interface CandidateBasic {
  id: string;
  name: string;
  email?: string;
}

interface MessageForm {
  recipientId: string;
  subject: string;
  body: string;
  type: "email" | "sms";
}

export default function CommunicationPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [candidates, setCandidates] = useState<CandidateBasic[]>([]);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    subject: "",
    body: "",
    type: "email" as const,
  });

  const [messageForm, setMessageForm] = useState<MessageForm>({
    recipientId: "",
    subject: "",
    body: "",
    type: "email",
  });

  // Fetch email templates
  useEffect(() => {
    const q = query(collection(db, "emailTemplates"), orderBy("name"));
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
    });
    return () => unsubscribe();
  }, []);

  // Fetch candidates (for recipient selection)
  useEffect(() => {
    const q = query(collection(db, "candidates"), orderBy("name"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCandidates(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          email: doc.data().email || "",
        }))
      );
    });
    return () => unsubscribe();
  }, []);

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
      await addDoc(collection(db, "emailTemplates"), {
        ...newTemplate,
        createdAt: new Date().toISOString(),
      });
      setNewTemplate({ name: "", subject: "", body: "", type: "email" });
      toast.success("Template saved successfully");
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Error saving template");
    }
  };

  const handleSendMessage = async () => {
    if (!messageForm.recipientId || !messageForm.subject || !messageForm.body) {
      toast.error("Please fill out all message fields");
      return;
    }

    try {
      // Get recipient info
      const recipient = candidates.find(
        (c) => c.id === messageForm.recipientId
      );

      // Create a message record
      await addDoc(collection(db, "messages"), {
        ...messageForm,
        candidateId: messageForm.recipientId,
        candidateName: recipient?.name || "",
        status: "sent",
        sentAt: new Date().toISOString(),
      });

      // Reset form
      setMessageForm({
        recipientId: "",
        subject: "",
        body: "",
        type: "email",
      });

      toast.success("Message sent successfully");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Error sending message");
    }
  };

  const handleApplyTemplate = (template: EmailTemplate) => {
    setMessageForm((prev) => ({
      ...prev,
      subject: template.subject,
      body: template.body,
      type: template.type as "email" | "sms",
    }));

    // Switch to the compose tab
    (document.querySelector('[data-value="compose"]') as HTMLElement)?.click();
    toast.success("Template applied");
  };

  return (
    <div className="container mx-auto py-8">
      <Toaster position="top-right" />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Mail className="size-6" />
            Communication Tools
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage communications with candidates
          </p>
        </div>
      </div>

      <Tabs defaultValue="compose">
        <TabsList className="mb-4">
          <TabsTrigger value="compose">Compose Message</TabsTrigger>
          <TabsTrigger value="templates">Email Templates</TabsTrigger>
          <TabsTrigger value="history">Message History</TabsTrigger>
        </TabsList>

        <TabsContent value="compose">
          <Card>
            <CardHeader>
              <CardTitle>New Message</CardTitle>
              <CardDescription>Send an email to candidates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                    {candidates.map((candidate) => (
                      <SelectItem key={candidate.id} value={candidate.id}>
                        {candidate.name}{" "}
                        {candidate.email
                          ? `(${candidate.email})`
                          : "(No email)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              </div>
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
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleSendMessage}>Send Message</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Create Template</CardTitle>
                <CardDescription>
                  Create reusable email templates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Template Name:
                  </label>
                  <Input
                    placeholder="e.g. Interview Invitation"
                    value={newTemplate.name}
                    onChange={(e) =>
                      setNewTemplate({ ...newTemplate, name: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Subject:
                  </label>
                  <Input
                    placeholder="Email subject"
                    value={newTemplate.subject}
                    onChange={(e) =>
                      setNewTemplate({
                        ...newTemplate,
                        subject: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Body:
                  </label>
                  <Textarea
                    placeholder="Hello {{candidate_name}},..."
                    className="min-h-[200px]"
                    value={newTemplate.body}
                    onChange={(e) =>
                      setNewTemplate({ ...newTemplate, body: e.target.value })
                    }
                  />
                </div>

                <div className="pt-2 text-xs text-muted-foreground">
                  Available variables: &#123;&#123;candidate_name&#125;&#125;,
                  &#123;&#123;job_title&#125;&#125;,
                  &#123;&#123;company_name&#125;&#125;
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={handleSaveTemplate}
                  disabled={
                    !newTemplate.name ||
                    !newTemplate.subject ||
                    !newTemplate.body
                  }
                >
                  Save Template
                </Button>
              </CardFooter>
            </Card>

            <div>
              <h3 className="text-lg font-medium mb-4">Your Templates</h3>
              {templates.length === 0 ? (
                <div className="text-center py-12 border rounded-md bg-muted/20">
                  <p className="text-muted-foreground">No templates yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create your first template
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="border rounded-md p-3 hover:bg-muted/20"
                    >
                      <div className="flex justify-between items-start">
                        <div className="font-medium">{template.name}</div>
                        <Badge variant="outline">{template.type}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {template.subject}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApplyTemplate(template)}
                        >
                          Use Template
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
              <CardTitle>Message History</CardTitle>
              <CardDescription>
                Previous communications with candidates
              </CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
