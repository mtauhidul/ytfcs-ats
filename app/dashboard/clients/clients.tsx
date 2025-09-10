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
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  Star,
  TrendingUp,
  Trash2,
  Users,
  User,
  Briefcase,
  ChevronDown,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
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
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Progress } from "~/components/ui/progress";
import { CompactImageUpload } from "~/components/ui/compact-image-upload";
import { clientService } from "~/services/clientService";
import { storageService } from "~/services/storageService";
import type { 
  Client, 
  ClientFeedback, 
  ClientCommunicationEntry 
} from "~/types/client";
import type { Job, Candidate } from "~/types";
import { useAppDispatch, useAppSelector } from "~/hooks/redux";
import { useClients, useClientData } from "~/hooks/use-clients";
import { 
  fetchClientsWithRelatedData, 
  setupRealtimeListeners,
  cleanupListeners,
  selectClients,
  selectClientsLoading,
  selectClientsError,
  selectClientById,
  selectClientJobs,
  selectClientCandidates,
  selectClientFeedback,
  selectClientCommunications,
  type ClientWithRelatedData
} from "~/features/clientsSlice";

export default function ClientsPage() {
  // Use the simplified clients hook
  const { clients, loading, error } = useClients();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientWithRelatedData | null>(null);
  
  // Get real-time data for selected client
  const { 
    jobs: selectedClientJobs,
    candidates: selectedClientCandidates,
    feedback: selectedClientFeedback,
    communications: selectedClientCommunications 
  } = useClientData(selectedClient?.id || null);
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isCommunicationOpen, setIsCommunicationOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<ClientWithRelatedData | null>(null);
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
    logoUrl: "" as string | undefined,
  });
  
  const [editClient, setEditClient] = useState({
    name: "",
    companyName: "",
    contactEmail: "",
    contactPhone: "",
    industry: "",
    status: "active" as "active" | "inactive" | "prospect" | "archived",
    logoUrl: "" as string | undefined,
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

  // Handle connection status based on error state
  useEffect(() => {
    if (error) {
      setConnectionStatus("disconnected");
      toast.error("Failed to load client data");
    } else {
      setConnectionStatus("connected");
    }
  }, [error]);

  const filteredClients = clients.filter((client: ClientWithRelatedData) =>
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
      const loadingToast = toast.loading("Creating client...");
      
      await clientService.createClient({
        ...newClient,
        logoUrl: newClient.logoUrl,
        status: newClient.status,
        createdBy: "current-user", // TODO: Get from auth context
      });
      
      toast.dismiss(loadingToast);
      setIsCreateOpen(false);
      setNewClient({
        name: "",
        companyName: "",
        contactEmail: "",
        contactPhone: "",
        industry: "",
        status: "active",
        logoUrl: undefined,
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
      const loadingToast = toast.loading("Updating client...");
      
      await clientService.updateClient(selectedClient.id, {
        name: editClient.name,
        companyName: editClient.companyName,
        contactEmail: editClient.contactEmail,
        contactPhone: editClient.contactPhone,
        industry: editClient.industry,
        logoUrl: editClient.logoUrl,
        status: editClient.status,
      });
      
      toast.dismiss(loadingToast);
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
      const loadingToast = toast.loading("Deleting client...");
      
      await clientService.deleteClient(clientToDelete.id);
      
      toast.dismiss(loadingToast);
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

  const handleStatusUpdate = async (clientId: string, newStatus: Client['status']) => {
    // Find the current client to check if status is already the same
    const currentClient = clients.find(c => c.id === clientId);
    if (currentClient?.status === newStatus) {
      toast.info(`Client is already ${newStatus}`);
      return;
    }

    try {
      const loadingToast = toast.loading("Updating client status...");
      
      await clientService.updateClient(clientId, { status: newStatus });
      
      toast.dismiss(loadingToast);
      toast.success(`Client status updated to ${newStatus}`);
    } catch (error) {
      console.error("Error updating client status:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update status");
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
      const loadingToast = toast.loading("Adding feedback...");
      
      await clientService.addClientFeedback(selectedClient.id, {
        ...newFeedback,
        feedbackDate: new Date().toISOString(),
      });
      
      toast.dismiss(loadingToast);
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
      const loadingToast = toast.loading("Logging communication...");
      
      await clientService.logCommunication(selectedClient.id, {
        ...newCommunication,
        date: new Date().toISOString(),
        initiatedBy: "internal",
      });
      
      toast.dismiss(loadingToast);
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

  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
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
                    {client.logoUrl && (
                      <AvatarImage src={client.logoUrl} alt={`${client.name} client logo`} />
                    )}
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      {(client.companyName || "").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{client.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{client.companyName}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Badge className={`${getStatusColor(client.status)} cursor-pointer hover:opacity-80 transition-opacity`}>
                      {formatStatus(client.status)}
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Badge>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-32">
                    <DropdownMenuItem 
                      onClick={() => handleStatusUpdate(client.id, 'active')}
                      className={client.status === 'active' ? 'bg-accent' : ''}
                      disabled={client.status === 'active'}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Active
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleStatusUpdate(client.id, 'prospect')}
                      className={client.status === 'prospect' ? 'bg-accent' : ''}
                      disabled={client.status === 'prospect'}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        Prospect
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleStatusUpdate(client.id, 'inactive')}
                      className={client.status === 'inactive' ? 'bg-accent' : ''}
                      disabled={client.status === 'inactive'}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                        Inactive
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleStatusUpdate(client.id, 'archived')}
                      className={client.status === 'archived' ? 'bg-accent' : ''}
                      disabled={client.status === 'archived'}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        Archived
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
                <Dialog onOpenChange={(open) => {
                  if (!open) {
                    // Clear selected client when modal is closed
                    setSelectedClient(null);
                  }
                }}>
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
                  <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
                    <DialogHeader className="space-y-3">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          {client.logoUrl && (
                            <AvatarImage src={client.logoUrl} alt={`${client.name} client logo`} />
                          )}
                          <AvatarFallback className="bg-blue-100 text-blue-600 text-lg font-semibold">
                            {(client.companyName || "").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <DialogTitle className="text-xl">{client.name}</DialogTitle>
                          <p className="text-muted-foreground">{client.companyName}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Badge className={`${getStatusColor(client.status)} cursor-pointer hover:opacity-80 transition-opacity`} variant="secondary">
                                {formatStatus(client.status)}
                                <ChevronDown className="h-3 w-3 ml-1" />
                              </Badge>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-32">
                              <DropdownMenuItem 
                                onClick={() => handleStatusUpdate(client.id, 'active')}
                                className={client.status === 'active' ? 'bg-accent' : ''}
                                disabled={client.status === 'active'}
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  Active
                                </div>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleStatusUpdate(client.id, 'prospect')}
                                className={client.status === 'prospect' ? 'bg-accent' : ''}
                                disabled={client.status === 'prospect'}
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  Prospect
                                </div>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleStatusUpdate(client.id, 'inactive')}
                                className={client.status === 'inactive' ? 'bg-accent' : ''}
                                disabled={client.status === 'inactive'}
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                                  Inactive
                                </div>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleStatusUpdate(client.id, 'archived')}
                                className={client.status === 'archived' ? 'bg-accent' : ''}
                                disabled={client.status === 'archived'}
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                  Archived
                                </div>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          {client.priority && (
                            <Badge variant="outline" className={getPriorityColor(client.priority)}>
                              <Star className={`h-3 w-3 mr-1 ${getPriorityColor(client.priority)}`} />
                              {client.priority} priority
                            </Badge>
                          )}
                        </div>
                      </div>
                      <DialogDescription>
                        Complete client profile with job history, feedback, and communication records
                      </DialogDescription>
                    </DialogHeader>
                    
                    <Tabs defaultValue="overview" className="flex-grow flex flex-col">
                      <TabsList className="grid w-full grid-cols-4 mb-4">
                        <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
                        <TabsTrigger value="jobs" className="text-xs sm:text-sm">
                          Jobs ({selectedClientJobs.length})
                        </TabsTrigger>
                        <TabsTrigger value="feedback" className="text-xs sm:text-sm">
                          Feedback ({selectedClientFeedback.length})
                        </TabsTrigger>
                        <TabsTrigger value="communications" className="text-xs sm:text-sm">
                          Comms ({selectedClientCommunications.length})
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="overview" className="flex-1">
                        <ScrollArea className="h-[450px]">
                          <div className="space-y-6 p-1">
                            {/* Quick Stats */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                              <Card className="border-l-4 border-l-blue-500">
                                <CardContent className="p-2.5">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="text-base font-bold text-blue-600">{selectedClientJobs.length}</div>
                                      <div className="text-xs text-muted-foreground">Active Jobs</div>
                                    </div>
                                    <Briefcase className="h-4 w-4 text-blue-500 opacity-70" />
                                  </div>
                                </CardContent>
                              </Card>
                              <Card className="border-l-4 border-l-green-500">
                                <CardContent className="p-2.5">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="text-base font-bold text-green-600">{selectedClientCandidates.length}</div>
                                      <div className="text-xs text-muted-foreground">Total Candidates</div>
                                    </div>
                                    <Users className="h-4 w-4 text-green-500 opacity-70" />
                                  </div>
                                </CardContent>
                              </Card>
                              <Card className="border-l-4 border-l-purple-500">
                                <CardContent className="p-2.5">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="text-base font-bold text-purple-600">{client.totalHires || 0}</div>
                                      <div className="text-xs text-muted-foreground">Successful Hires</div>
                                    </div>
                                    <Star className="h-4 w-4 text-purple-500 opacity-70" />
                                  </div>
                                </CardContent>
                              </Card>
                              <Card className="border-l-4 border-l-orange-500">
                                <CardContent className="p-2.5">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="text-base font-bold text-orange-600">
                                        {selectedClientCandidates.length > 0 
                                          ? Math.round((client.totalHires || 0) / selectedClientCandidates.length * 100)
                                          : 0}%
                                      </div>
                                      <div className="text-xs text-muted-foreground">Success Rate</div>
                                    </div>
                                    <TrendingUp className="h-4 w-4 text-orange-500 opacity-70" />
                                  </div>
                                </CardContent>
                              </Card>
                            </div>

                            {/* Contact Information */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <Building2 className="h-5 w-5" />
                                  Contact Information
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="grid grid-cols-2 gap-6">
                                  <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                      <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                      <div>
                                        <Label className="text-sm font-medium text-muted-foreground">Contact Person</Label>
                                        <p className="text-sm font-medium">{client.name}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                      <div>
                                        <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                                        <p className="text-sm font-medium">{client.contactEmail}</p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                      <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                      <div>
                                        <Label className="text-sm font-medium text-muted-foreground">Company</Label>
                                        <p className="text-sm font-medium">{client.companyName}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                      <div>
                                        <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                                        <p className="text-sm font-medium">{client.contactPhone || "Not provided"}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                {client.industry && (
                                  <div className="mt-4 pt-4 border-t">
                                    <div className="flex items-center gap-3">
                                      <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                      <div>
                                        <Label className="text-sm font-medium text-muted-foreground">Industry</Label>
                                        <p className="text-sm font-medium">{client.industry}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>

                            {/* Recent Activity */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <Clock className="h-5 w-5" />
                                  Recent Activity
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-3">
                                  {selectedClientFeedback.slice(0, 3).map((feedback) => (
                                    <div key={feedback.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                      <div className="flex items-center gap-1 mt-0.5">
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
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <Badge variant="secondary" className="text-xs">
                                            {feedback.feedbackType}
                                          </Badge>
                                          <span className="text-xs text-muted-foreground">
                                            {format(new Date(feedback.feedbackDate), "MMM d, yyyy")}
                                          </span>
                                        </div>
                                        <p className="text-sm text-gray-700 line-clamp-2">
                                          {(feedback.feedback || "").slice(0, 120)}
                                          {(feedback.feedback || "").length > 120 && "..."}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          via {feedback.receivedVia} • by {feedback.receivedBy}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                  {selectedClientFeedback.length === 0 && (
                                    <div className="text-center py-6 text-muted-foreground">
                                      <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                                      <p className="text-sm">No recent feedback available</p>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                            
                            {/* Bottom spacing for better scrolling experience */}
                            <div className="h-6"></div>
                          </div>
                        </ScrollArea>
                      </TabsContent>
                      
                      <TabsContent value="jobs" className="flex-1">
                        <ScrollArea className="h-[450px]">
                          <div className="space-y-4 p-1">
                            <div className="flex justify-between items-center mb-4">
                              <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Briefcase className="h-5 w-5" />
                                Jobs & Candidates
                              </h3>
                              <Badge variant="outline" className="px-3 py-1">
                                {selectedClientJobs.length} active jobs
                              </Badge>
                            </div>
                            
                            {selectedClientJobs.map((job) => (
                              <Card key={job.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-5">
                                  <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1">
                                      <h4 className="font-semibold text-lg mb-1">{job.title}</h4>
                                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                          <MapPin className="h-3 w-3" />
                                          {job.location || "Remote"}
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          {job.employmentType || "Full-time"}
                                        </span>
                                      </div>
                                    </div>
                                    <Badge variant={job.status === "active" ? "default" : "secondary"}>
                                      {job.status}
                                    </Badge>
                                  </div>
                                  
                                  <div className="grid grid-cols-3 gap-4 mt-4">
                                    <div className="text-center p-2 bg-blue-50 rounded-lg">
                                      <div className="text-lg font-semibold text-blue-600">
                                        {selectedClientCandidates.filter(c => c.jobId === job.id).length}
                                      </div>
                                      <div className="text-xs text-muted-foreground">Candidates</div>
                                    </div>
                                    <div className="text-center p-2 bg-green-50 rounded-lg">
                                      <div className="text-lg font-semibold text-green-600">
                                        {selectedClientCandidates.filter(c => c.jobId === job.id && c.status === "hired").length}
                                      </div>
                                      <div className="text-xs text-muted-foreground">Hired</div>
                                    </div>
                                    <div className="text-center p-2 bg-purple-50 rounded-lg">
                                      <div className="text-lg font-semibold text-purple-600">
                                        {selectedClientCandidates.filter(c => c.jobId === job.id && c.status === "interviewing").length}
                                      </div>
                                      <div className="text-xs text-muted-foreground">Interviewing</div>
                                    </div>
                                  </div>

                                  {job.description && (
                                    <div className="mt-3 pt-3 border-t">
                                      <p className="text-sm text-muted-foreground line-clamp-2">
                                        {job.description.slice(0, 150)}
                                        {job.description.length > 150 && "..."}
                                      </p>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                            
                            {selectedClientJobs.length === 0 && (
                              <div className="text-center py-12">
                                <Briefcase className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No Jobs Yet</h3>
                                <p className="text-muted-foreground">
                                  No jobs have been assigned to this client yet
                                </p>
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </TabsContent>
                      
                      <TabsContent value="feedback" className="flex-1">
                        <ScrollArea className="h-[450px]">
                          <div className="space-y-4 p-1">
                            <div className="flex justify-between items-center mb-4">
                              <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Star className="h-5 w-5" />
                                Client Feedback
                              </h3>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedClient(client);
                                  setIsFeedbackOpen(true);
                                }}
                                className="gap-2"
                              >
                                <Plus className="h-4 w-4" />
                                Add Feedback
                              </Button>
                            </div>
                            
                            {selectedClientFeedback.map((feedback) => (
                              <Card key={feedback.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-5">
                                  <div className="flex justify-between items-start mb-3">
                                    <Badge variant="secondary" className="capitalize">
                                      {feedback.feedbackType}
                                    </Badge>
                                    <div className="flex items-center gap-1">
                                      {[...Array(5)].map((_, i) => (
                                        <Star
                                          key={i}
                                          className={`h-4 w-4 ${
                                            i < (feedback.rating || 0) 
                                              ? "fill-yellow-400 text-yellow-400" 
                                              : "text-gray-300"
                                          }`}
                                        />
                                      ))}
                                      <span className="ml-1 text-sm font-medium">
                                        {feedback.rating}/5
                                      </span>
                                    </div>
                                  </div>
                                  
                                  <blockquote className="text-sm leading-relaxed mb-4 pl-4 border-l-4 border-gray-200 italic">
                                    "{feedback.feedback}"
                                  </blockquote>
                                  
                                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t">
                                    <div className="flex items-center gap-4">
                                      <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {format(new Date(feedback.feedbackDate), "MMM d, yyyy")}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        {feedback.receivedVia === "email" && <Mail className="h-3 w-3" />}
                                        {feedback.receivedVia === "phone" && <Phone className="h-3 w-3" />}
                                        {feedback.receivedVia === "meeting" && <Users className="h-3 w-3" />}
                                        via {feedback.receivedVia}
                                      </span>
                                    </div>
                                    <span>by {feedback.receivedBy}</span>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                            
                            {selectedClientFeedback.length === 0 && (
                              <div className="text-center py-12">
                                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No Feedback Yet</h3>
                                <p className="text-muted-foreground mb-4">
                                  No feedback has been recorded for this client
                                </p>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedClient(client);
                                    setIsFeedbackOpen(true);
                                  }}
                                  className="gap-2"
                                >
                                  <Plus className="h-4 w-4" />
                                  Add First Feedback
                                </Button>
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </TabsContent>
                      
                      <TabsContent value="communications" className="flex-1">
                        <ScrollArea className="h-[450px]">
                          <div className="space-y-4 p-1">
                            <div className="flex justify-between items-center mb-4">
                              <h3 className="text-lg font-semibold flex items-center gap-2">
                                <MessageSquare className="h-5 w-5" />
                                Communication History
                              </h3>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedClient(client);
                                  setIsCommunicationOpen(true);
                                }}
                                className="gap-2"
                              >
                                <Plus className="h-4 w-4" />
                                Log Communication
                              </Button>
                            </div>
                            
                            {selectedClientCommunications.map((comm) => (
                              <Card key={comm.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-5">
                                  <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                      {comm.type === "email" && (
                                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                          <Mail className="h-4 w-4" />
                                        </div>
                                      )}
                                      {comm.type === "phone" && (
                                        <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                                          <Phone className="h-4 w-4" />
                                        </div>
                                      )}
                                      {comm.type === "meeting" && (
                                        <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                                          <Calendar className="h-4 w-4" />
                                        </div>
                                      )}
                                      {comm.type === "note" && (
                                        <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                                          <FileText className="h-4 w-4" />
                                        </div>
                                      )}
                                      <div>
                                        <Badge variant="secondary" className="capitalize mb-1">
                                          {comm.type}
                                        </Badge>
                                        <p className="text-xs text-muted-foreground">
                                          {format(new Date(comm.date), "MMM d, yyyy 'at' h:mm a")}
                                        </p>
                                      </div>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                      {comm.initiatedBy}
                                    </Badge>
                                  </div>
                                  
                                  {comm.subject && (
                                    <h4 className="font-medium text-sm mb-2">{comm.subject}</h4>
                                  )}
                                  
                                  <p className="text-sm text-gray-700 leading-relaxed mb-3">
                                    {comm.summary}
                                  </p>
                                  
                                  {comm.details && (
                                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                      <p className="text-xs text-muted-foreground mb-1">Additional Details:</p>
                                      <p className="text-sm text-gray-600">{comm.details}</p>
                                    </div>
                                  )}
                                  
                                  <div className="flex items-center justify-between mt-4 pt-3 border-t">
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      by {comm.teamMember}
                                    </span>
                                    {comm.followUpRequired && (
                                      <Badge variant="destructive" className="text-xs">
                                        Follow-up required
                                      </Badge>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                            
                            {selectedClientCommunications.length === 0 && (
                              <div className="text-center py-12">
                                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No Communications Yet</h3>
                                <p className="text-muted-foreground mb-4">
                                  No communications have been logged for this client
                                </p>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedClient(client);
                                    setIsCommunicationOpen(true);
                                  }}
                                  className="gap-2"
                                >
                                  <Plus className="h-4 w-4" />
                                  Log First Communication
                                </Button>
                              </div>
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
                      logoUrl: client.logoUrl,
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
              <CompactImageUpload
                value={newClient.logoUrl}
                onChange={(url) => setNewClient({ ...newClient, logoUrl: url || undefined })}
                clientId="new-client"
                label="Client Logo (Optional)"
                disabled={isSubmitting}
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
              <CompactImageUpload
                value={editClient.logoUrl}
                onChange={(url) => setEditClient({ ...editClient, logoUrl: url || undefined })}
                clientId={selectedClient?.id || "edit-client"}
                label="Client Logo (Optional)"
                disabled={isSubmitting}
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
      
      <Toaster position="top-right" />
    </div>
  );
}
