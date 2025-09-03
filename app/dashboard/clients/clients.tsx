// app/dashboard/clients/clients.tsx
"use client";

import { format } from "date-fns";
import {
  Building2,
  Calendar,
  Clock,
  Edit,
  Eye,
  FileText,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  Star,
  TrendingUp,
  Trash2,
  Users,
  Briefcase,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
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
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Progress } from "~/components/ui/progress";
import { clientService } from "~/services/clientService";
import type { 
  Client, 
  ClientFeedback, 
  ClientCommunicationEntry 
} from "~/types/client";
import type { Job, Candidate } from "~/types";

interface ClientWithStats extends Client {
  jobs: Job[];
  candidates: Candidate[];
  recentFeedback: ClientFeedback[];
  recentCommunications: ClientCommunicationEntry[];
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientWithStats | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isCommunicationOpen, setIsCommunicationOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<ClientWithStats | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [isSubmittingCommunication, setIsSubmittingCommunication] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected">("connected");
  
  // Form states
  const [newClient, setNewClient] = useState({
    name: "",
    companyName: "",
    contactEmail: "",
    contactPhone: "",
    industry: "",
    status: "active" as const,
  });
  
  const [editClient, setEditClient] = useState({
    name: "",
    companyName: "",
    contactEmail: "",
    contactPhone: "",
    industry: "",
    status: "active" as "active" | "inactive" | "prospect" | "archived",
  });
  
  const [newFeedback, setNewFeedback] = useState({
    feedbackType: "general" as const,
    feedback: "",
    rating: 5,
    receivedVia: "email" as const,
    receivedBy: "",
  });
  
  const [newCommunication, setNewCommunication] = useState({
    type: "email" as const,
    subject: "",
    summary: "",
    details: "",
    teamMember: "",
    followUpRequired: false,
  });

  // Load clients with their related data
  useEffect(() => {
    const unsubscribe = clientService.subscribeToClients(async (clientsData) => {
      try {
        setConnectionStatus("connected");
        
        // Enrich each client with jobs, candidates, and recent activity
        const enrichedClients = await Promise.all(
          clientsData.map(async (client) => {
            const { jobs, candidates } = await clientService.getClientJobsAndCandidates(client.id);
            const recentFeedback = await clientService.getClientFeedback(client.id);
            const recentCommunications = await clientService.getClientCommunications(client.id);
            
            return {
              ...client,
              jobs: (jobs || []) as Job[],
              candidates: (candidates || []) as Candidate[],
              recentFeedback: (recentFeedback || []).slice(0, 5),
              recentCommunications: (recentCommunications || []).slice(0, 5),
            } as ClientWithStats;
          })
        );
        
        setClients(enrichedClients);
        setLoading(false);
      } catch (error) {
        console.error("Error loading client data:", error);
        setConnectionStatus("disconnected");
        toast.error("Failed to load client data");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.contactEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateClient = async () => {
    if (!newClient.name || !newClient.companyName || !newClient.contactEmail) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (isSubmitting) {
      return; // Prevent duplicate submissions
    }

    try {
      setIsSubmitting(true);
      await clientService.createClient({
        ...newClient,
        status: newClient.status,
        createdBy: "current-user", // TODO: Get from auth context
      });
      
      setIsCreateOpen(false);
      setNewClient({
        name: "",
        companyName: "",
        contactEmail: "",
        contactPhone: "",
        industry: "",
        status: "active",
      });
      toast.success("Client created successfully");
    } catch (error) {
      console.error("Error creating client:", error);
      toast.error("Failed to create client");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClient = async () => {
    if (!selectedClient || !editClient.name || !editClient.companyName || !editClient.contactEmail) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (isSubmitting) {
      return; // Prevent duplicate submissions
    }

    try {
      setIsSubmitting(true);
      await clientService.updateClient(selectedClient.id, {
        name: editClient.name,
        companyName: editClient.companyName,
        contactEmail: editClient.contactEmail,
        contactPhone: editClient.contactPhone,
        industry: editClient.industry,
        status: editClient.status,
      });
      
      setIsEditOpen(false);
      setSelectedClient(null);
      toast.success("Client updated successfully");
    } catch (error) {
      console.error("Error updating client:", error);
      toast.error("Failed to update client");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!clientToDelete) return;

    if (isDeleting) {
      return; // Prevent duplicate submissions
    }

    try {
      setIsDeleting(true);
      await clientService.deleteClient(clientToDelete.id);
      
      setIsDeleteOpen(false);
      setClientToDelete(null);
      toast.success("Client deleted successfully");
    } catch (error) {
      console.error("Error deleting client:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete client");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddFeedback = async () => {
    if (!selectedClient || !newFeedback.feedback || !newFeedback.receivedBy) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (isSubmittingFeedback) {
      return; // Prevent duplicate submissions
    }

    try {
      setIsSubmittingFeedback(true);
      await clientService.addClientFeedback(selectedClient.id, {
        ...newFeedback,
        feedbackDate: new Date().toISOString(),
      });
      
      setIsFeedbackOpen(false);
      setNewFeedback({
        feedbackType: "general",
        feedback: "",
        rating: 5,
        receivedVia: "email",
        receivedBy: "",
      });
      toast.success("Feedback added successfully");
    } catch (error) {
      console.error("Error adding feedback:", error);
      toast.error("Failed to add feedback");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleLogCommunication = async () => {
    if (!selectedClient || !newCommunication.summary || !newCommunication.teamMember) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (isSubmittingCommunication) {
      return; // Prevent duplicate submissions
    }

    try {
      setIsSubmittingCommunication(true);
      await clientService.logCommunication(selectedClient.id, {
        ...newCommunication,
        date: new Date().toISOString(),
        initiatedBy: "internal",
      });
      
      setIsCommunicationOpen(false);
      setNewCommunication({
        type: "email",
        subject: "",
        summary: "",
        details: "",
        teamMember: "",
        followUpRequired: false,
      });
      toast.success("Communication logged successfully");
    } catch (error) {
      console.error("Error logging communication:", error);
      toast.error("Failed to log communication");
    } finally {
      setIsSubmittingCommunication(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "inactive": return "bg-gray-100 text-gray-800";
      case "prospect": return "bg-blue-100 text-blue-800";
      case "archived": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "high": return "text-red-600";
      case "medium": return "text-yellow-600";
      case "low": return "text-green-600";
      default: return "text-gray-600";
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-lg">Loading clients...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Client Management</h1>
          <p className="text-muted-foreground">
            Manage client relationships, track feedback, and monitor hiring progress
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Client
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Total Clients</span>
            </div>
            <div className="text-2xl font-bold">{clients.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Active Clients</span>
            </div>
            <div className="text-2xl font-bold">
              {clients.filter(c => c.status === "active").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Total Jobs</span>
            </div>
            <div className="text-2xl font-bold">
              {clients.reduce((sum, c) => sum + (c.jobs || []).length, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium">Total Candidates</span>
            </div>
            <div className="text-2xl font-bold">
              {clients.reduce((sum, c) => sum + (c.candidates || []).length, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <Input
          placeholder="Search clients by name, company, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        {connectionStatus === "disconnected" && (
          <Badge variant="destructive">Disconnected</Badge>
        )}
      </div>

      {/* Client Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredClients.map((client) => (
          <Card key={client.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      {(client.companyName || "").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{client.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{client.companyName}</p>
                  </div>
                </div>
                <Badge className={getStatusColor(client.status)}>
                  {client.status}
                </Badge>
              </div>
              
              {client.priority && (
                <div className="flex items-center gap-1">
                  <Star className={`h-3 w-3 ${getPriorityColor(client.priority)}`} />
                  <span className={`text-xs ${getPriorityColor(client.priority)}`}>
                    {client.priority} priority
                  </span>
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Contact Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <span className="truncate">{client.contactEmail}</span>
                </div>
                {client.contactPhone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <span>{client.contactPhone}</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-lg font-semibold">{(client.jobs || []).length}</div>
                  <div className="text-xs text-muted-foreground">Jobs</div>
                </div>
                <div>
                  <div className="text-lg font-semibold">{(client.candidates || []).length}</div>
                  <div className="text-xs text-muted-foreground">Candidates</div>
                </div>
                <div>
                  <div className="text-lg font-semibold">{(client.recentFeedback || []).length}</div>
                  <div className="text-xs text-muted-foreground">Feedback</div>
                </div>
              </div>

              {/* Progress */}
              {(client.candidates || []).length > 0 && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Hiring Progress</span>
                    <span>
                      {Math.round((client.totalHires || 0) / (client.candidates || []).length * 100)}%
                    </span>
                  </div>
                  <Progress 
                    value={(client.totalHires || 0) / (client.candidates || []).length * 100} 
                    className="h-2"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setSelectedClient(client)}
                    >
                      <Eye className="h-3 w-3 mr-2" />
                      View Details
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                    <DialogHeader>
                      <DialogTitle>{client.name} - {client.companyName}</DialogTitle>
                      <DialogDescription>
                        Complete client profile and activity overview
                      </DialogDescription>
                    </DialogHeader>
                    
                    <Tabs defaultValue="overview" className="flex-grow">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="jobs">Jobs & Candidates</TabsTrigger>
                        <TabsTrigger value="feedback">Feedback</TabsTrigger>
                        <TabsTrigger value="communications">Communications</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="overview" className="space-y-4">
                        <ScrollArea className="h-[400px]">
                          <div className="space-y-4 p-4">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-sm font-medium">Contact Person</Label>
                                <p className="text-sm">{client.name}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Company</Label>
                                <p className="text-sm">{client.companyName}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Email</Label>
                                <p className="text-sm">{client.contactEmail}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Phone</Label>
                                <p className="text-sm">{client.contactPhone || "Not provided"}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Industry</Label>
                                <p className="text-sm">{client.industry || "Not specified"}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Status</Label>
                                <Badge className={getStatusColor(client.status)}>
                                  {client.status}
                                </Badge>
                              </div>
                            </div>

                            {/* Recent Activity */}
                            <div>
                              <Label className="text-sm font-medium">Recent Activity</Label>
                              <div className="mt-2 space-y-2">
                                {(client.recentFeedback || []).slice(0, 3).map((feedback) => (
                                  <div key={feedback.id} className="p-2 bg-gray-50 rounded text-xs">
                                    <div className="font-medium">{feedback.feedbackType} feedback</div>
                                    <div className="text-gray-600">{(feedback.feedback || "").slice(0, 100)}...</div>
                                    <div className="text-gray-500">{format(new Date(feedback.feedbackDate), "MMM d, yyyy")}</div>
                                  </div>
                                ))}
                                {(client.recentFeedback || []).length === 0 && (
                                  <p className="text-sm text-muted-foreground">No recent feedback</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </ScrollArea>
                      </TabsContent>
                      
                      <TabsContent value="jobs" className="space-y-4">
                        <ScrollArea className="h-[400px]">
                          <div className="space-y-4 p-4">
                            <div className="flex justify-between items-center">
                              <h3 className="font-medium">Jobs & Associated Candidates</h3>
                              <Badge variant="outline">{(client.jobs || []).length} jobs</Badge>
                            </div>
                            
                            {(client.jobs || []).map((job) => (
                              <Card key={job.id}>
                                <CardContent className="p-4">
                                  <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-medium">{job.title}</h4>
                                    <Badge variant="outline">{job.status}</Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-2">
                                    {job.location} • {job.employmentType}
                                  </p>
                                  
                                  <div className="text-xs text-muted-foreground">
                                    Candidates: {(client.candidates || []).filter(c => c.jobId === job.id).length}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                            
                            {(client.jobs || []).length === 0 && (
                              <p className="text-center py-8 text-muted-foreground">
                                No jobs assigned to this client yet
                              </p>
                            )}
                          </div>
                        </ScrollArea>
                      </TabsContent>
                      
                      <TabsContent value="feedback" className="space-y-4">
                        <ScrollArea className="h-[400px]">
                          <div className="space-y-4 p-4">
                            <div className="flex justify-between items-center">
                              <h3 className="font-medium">Client Feedback History</h3>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedClient(client);
                                  setIsFeedbackOpen(true);
                                }}
                              >
                                <Plus className="h-3 w-3 mr-2" />
                                Add Feedback
                              </Button>
                            </div>
                            
                            {(client.recentFeedback || []).map((feedback) => (
                              <Card key={feedback.id}>
                                <CardContent className="p-4">
                                  <div className="flex justify-between items-start mb-2">
                                    <Badge variant="outline">{feedback.feedbackType}</Badge>
                                    <div className="flex items-center gap-1">
                                      {[...Array(5)].map((_, i) => (
                                        <Star
                                          key={i}
                                          className={`h-3 w-3 ${
                                            i < (feedback.rating || 0) 
                                              ? "fill-yellow-400 text-yellow-400" 
                                              : "text-gray-300"
                                          }`}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                  <p className="text-sm mb-2">{feedback.feedback}</p>
                                  <div className="text-xs text-muted-foreground">
                                    {format(new Date(feedback.feedbackDate), "MMM d, yyyy")} • 
                                    via {feedback.receivedVia} • by {feedback.receivedBy}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                            
                            {(client.recentFeedback || []).length === 0 && (
                              <p className="text-center py-8 text-muted-foreground">
                                No feedback recorded yet
                              </p>
                            )}
                          </div>
                        </ScrollArea>
                      </TabsContent>
                      
                      <TabsContent value="communications" className="space-y-4">
                        <ScrollArea className="h-[400px]">
                          <div className="space-y-4 p-4">
                            <div className="flex justify-between items-center">
                              <h3 className="font-medium">Communication Log</h3>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedClient(client);
                                  setIsCommunicationOpen(true);
                                }}
                              >
                                <Plus className="h-3 w-3 mr-2" />
                                Log Communication
                              </Button>
                            </div>
                            
                            {(client.recentCommunications || []).map((comm) => (
                              <Card key={comm.id}>
                                <CardContent className="p-4">
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                      {comm.type === "email" && <Mail className="h-3 w-3" />}
                                      {comm.type === "phone" && <Phone className="h-3 w-3" />}
                                      {comm.type === "meeting" && <Calendar className="h-3 w-3" />}
                                      {comm.type === "note" && <FileText className="h-3 w-3" />}
                                      <span className="text-sm font-medium">{comm.type}</span>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                      {comm.initiatedBy}
                                    </Badge>
                                  </div>
                                  {comm.subject && (
                                    <p className="text-sm font-medium mb-1">{comm.subject}</p>
                                  )}
                                  <p className="text-sm text-muted-foreground mb-2">{comm.summary}</p>
                                  <div className="text-xs text-muted-foreground">
                                    {format(new Date(comm.date), "MMM d, yyyy")} • by {comm.teamMember}
                                  </div>
                                  {comm.followUpRequired && (
                                    <Badge variant="destructive" className="mt-2 text-xs">
                                      Follow-up required
                                    </Badge>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                            
                            {(client.recentCommunications || []).length === 0 && (
                              <p className="text-center py-8 text-muted-foreground">
                                No communications logged yet
                              </p>
                            )}
                          </div>
                        </ScrollArea>
                      </TabsContent>
                    </Tabs>
                  </DialogContent>
                </Dialog>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedClient(client);
                    setEditClient({
                      name: client.name,
                      companyName: client.companyName,
                      contactEmail: client.contactEmail,
                      contactPhone: client.contactPhone || "",
                      industry: client.industry || "",
                      status: client.status,
                    });
                    setIsEditOpen(true);
                  }}
                >
                  <Edit className="h-3 w-3" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setClientToDelete(client);
                    setIsDeleteOpen(true);
                  }}
                  className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredClients.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No clients found
          </h3>
          <p className="text-gray-500 mb-4">
            {searchTerm ? "Try adjusting your search terms" : "Get started by adding your first client"}
          </p>
          {!searchTerm && (
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Client
            </Button>
          )}
        </div>
      )}

      {/* Create Client Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Client</DialogTitle>
            <DialogDescription>
              Add a new client to your ATS for internal tracking and job assignment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="mb-2 block">Contact Person Name *</Label>
              <Input
                id="name"
                value={newClient.name}
                onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label htmlFor="companyName" className="mb-2 block">Company Name *</Label>
              <Input
                id="companyName"
                value={newClient.companyName}
                onChange={(e) => setNewClient({ ...newClient, companyName: e.target.value })}
                placeholder="Acme Corp"
              />
            </div>
            <div>
              <Label htmlFor="contactEmail" className="mb-2 block">Contact Email *</Label>
              <Input
                id="contactEmail"
                type="email"
                value={newClient.contactEmail}
                onChange={(e) => setNewClient({ ...newClient, contactEmail: e.target.value })}
                placeholder="john@acmecorp.com"
              />
            </div>
            <div>
              <Label htmlFor="contactPhone" className="mb-2 block">Contact Phone</Label>
              <Input
                id="contactPhone"
                value={newClient.contactPhone}
                onChange={(e) => setNewClient({ ...newClient, contactPhone: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div>
              <Label htmlFor="industry" className="mb-2 block">Industry</Label>
              <Input
                id="industry"
                value={newClient.industry}
                onChange={(e) => setNewClient({ ...newClient, industry: e.target.value })}
                placeholder="Technology"
              />
            </div>
            <div>
              <Label htmlFor="status" className="mb-2 block">Status</Label>
              <Select value={newClient.status} onValueChange={(value: any) => setNewClient({ ...newClient, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleCreateClient} disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Client"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>
              Update client information for {selectedClient?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editName" className="mb-2 block">Contact Person Name *</Label>
              <Input
                id="editName"
                value={editClient.name}
                onChange={(e) => setEditClient({ ...editClient, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label htmlFor="editCompanyName" className="mb-2 block">Company Name *</Label>
              <Input
                id="editCompanyName"
                value={editClient.companyName}
                onChange={(e) => setEditClient({ ...editClient, companyName: e.target.value })}
                placeholder="Acme Corp"
              />
            </div>
            <div>
              <Label htmlFor="editContactEmail" className="mb-2 block">Contact Email *</Label>
              <Input
                id="editContactEmail"
                type="email"
                value={editClient.contactEmail}
                onChange={(e) => setEditClient({ ...editClient, contactEmail: e.target.value })}
                placeholder="john@acme.com"
              />
            </div>
            <div>
              <Label htmlFor="editContactPhone" className="mb-2 block">Contact Phone</Label>
              <Input
                id="editContactPhone"
                value={editClient.contactPhone}
                onChange={(e) => setEditClient({ ...editClient, contactPhone: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div>
              <Label htmlFor="editIndustry" className="mb-2 block">Industry</Label>
              <Input
                id="editIndustry"
                value={editClient.industry}
                onChange={(e) => setEditClient({ ...editClient, industry: e.target.value })}
                placeholder="Technology"
              />
            </div>
            <div>
              <Label htmlFor="editStatus" className="mb-2 block">Status</Label>
              <Select value={editClient.status} onValueChange={(value: any) => setEditClient({ ...editClient, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleEditClient} disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Client"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Feedback Dialog */}
      <Dialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Client Feedback</DialogTitle>
            <DialogDescription>
              Record feedback received from {selectedClient?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="feedbackType" className="mb-2 block">Feedback Type</Label>
              <Select value={newFeedback.feedbackType} onValueChange={(value: any) => setNewFeedback({ ...newFeedback, feedbackType: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="interview">Interview Feedback</SelectItem>
                  <SelectItem value="general">General Feedback</SelectItem>
                  <SelectItem value="rejection">Rejection Feedback</SelectItem>
                  <SelectItem value="offer">Offer Feedback</SelectItem>
                  <SelectItem value="preference">Hiring Preference</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="feedback" className="mb-2 block">Feedback *</Label>
              <Textarea
                id="feedback"
                value={newFeedback.feedback}
                onChange={(e) => setNewFeedback({ ...newFeedback, feedback: e.target.value })}
                placeholder="Enter the feedback details..."
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="rating" className="mb-2 block">Rating (1-5)</Label>
              <Select value={newFeedback.rating.toString()} onValueChange={(value) => setNewFeedback({ ...newFeedback, rating: parseInt(value) })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Poor</SelectItem>
                  <SelectItem value="2">2 - Fair</SelectItem>
                  <SelectItem value="3">3 - Good</SelectItem>
                  <SelectItem value="4">4 - Very Good</SelectItem>
                  <SelectItem value="5">5 - Excellent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="receivedVia" className="mb-2 block">Received Via</Label>
              <Select value={newFeedback.receivedVia} onValueChange={(value: any) => setNewFeedback({ ...newFeedback, receivedVia: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone Call</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="form">Online Form</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="receivedBy" className="mb-2 block">Received By *</Label>
              <Input
                id="receivedBy"
                value={newFeedback.receivedBy}
                onChange={(e) => setNewFeedback({ ...newFeedback, receivedBy: e.target.value })}
                placeholder="Your name"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsFeedbackOpen(false)} disabled={isSubmittingFeedback}>
              Cancel
            </Button>
            <Button onClick={handleAddFeedback} disabled={isSubmittingFeedback}>
              {isSubmittingFeedback ? "Adding..." : "Add Feedback"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Log Communication Dialog */}
      <Dialog open={isCommunicationOpen} onOpenChange={setIsCommunicationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Communication</DialogTitle>
            <DialogDescription>
              Record communication with {selectedClient?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="type" className="mb-2 block">Communication Type</Label>
              <Select value={newCommunication.type} onValueChange={(value: any) => setNewCommunication({ ...newCommunication, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone Call</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="note">Internal Note</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newCommunication.type === "email" && (
              <div>
                <Label htmlFor="subject" className="mb-2 block">Subject</Label>
                <Input
                  id="subject"
                  value={newCommunication.subject}
                  onChange={(e) => setNewCommunication({ ...newCommunication, subject: e.target.value })}
                  placeholder="Email subject"
                />
              </div>
            )}
            <div>
              <Label htmlFor="summary" className="mb-2 block">Summary *</Label>
              <Textarea
                id="summary"
                value={newCommunication.summary}
                onChange={(e) => setNewCommunication({ ...newCommunication, summary: e.target.value })}
                placeholder="Brief summary of the communication..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="details" className="mb-2 block">Details</Label>
              <Textarea
                id="details"
                value={newCommunication.details}
                onChange={(e) => setNewCommunication({ ...newCommunication, details: e.target.value })}
                placeholder="Additional details..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="teamMember" className="mb-2 block">Team Member *</Label>
              <Input
                id="teamMember"
                value={newCommunication.teamMember}
                onChange={(e) => setNewCommunication({ ...newCommunication, teamMember: e.target.value })}
                placeholder="Your name"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="followUp"
                checked={newCommunication.followUpRequired}
                onChange={(e) => setNewCommunication({ ...newCommunication, followUpRequired: e.target.checked })}
              />
              <Label htmlFor="followUp">Follow-up required</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsCommunicationOpen(false)} disabled={isSubmittingCommunication}>
              Cancel
            </Button>
            <Button onClick={handleLogCommunication} disabled={isSubmittingCommunication}>
              {isSubmittingCommunication ? "Logging..." : "Log Communication"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Client Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{clientToDelete?.name}" from {clientToDelete?.companyName}? 
              This action cannot be undone and will also delete all associated feedback and communication records.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.19-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-amber-800">Warning</h4>
                <p className="text-sm text-amber-700 mt-1">
                  This client will be permanently deleted if they don't have any active jobs. 
                  If active jobs exist, you must reassign or delete them first.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteClient} 
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Client"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
