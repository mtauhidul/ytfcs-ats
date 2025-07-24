// app/dashboard/clients/clients.tsx
"use client";

import { format } from "date-fns";
import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  Calendar,
  Clock,
  Edit,
  Eye,
  Plus,
  RefreshCw,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Calendar as CalendarComponent } from "~/components/ui/calendar";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { db } from "~/lib/firebase";
import { cn } from "~/lib/utils";
import type { Candidate } from "~/types";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface InterviewSummary {
  candidateId: string;
  candidateName: string;
  interviewDate: string;
  outcome: string;
  notes?: string;
}

interface ClientWithInterviews {
  client: TeamMember;
  interviews: InterviewSummary[];
  totalInterviews: number;
  pendingInterviews: number;
  passedInterviews: number;
  rejectedInterviews: number;
  uninterviewedCandidates: Candidate[];
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientWithInterviews[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] =
    useState<ClientWithInterviews | null>(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(undefined);
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleNotes, setScheduleNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdateStatusOpen, setIsUpdateStatusOpen] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<{
    candidateId: string;
    interviewIndex: number;
    interview: InterviewSummary;
  } | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [statusNotes, setStatusNotes] = useState("");
  const [lastDataSync, setLastDataSync] = useState<Date>(new Date());
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "connecting"
  >("connecting");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Manual refresh function for troubleshooting
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    setConnectionStatus("connecting");

    // Force refresh by updating sync time and reset connection status
    setTimeout(() => {
      setIsRefreshing(false);
      setLastDataSync(new Date());
      setConnectionStatus("connected");
      toast.success("Data refreshed");
    }, 500);
  };

  // Fetch clients (team members with Client role) - Real-time sync
  useEffect(() => {
    setConnectionStatus("connecting");
    const unsubscribe = onSnapshot(
      query(collection(db, "teamMembers"), where("role", "==", "Client")),
      (snapshot) => {
        const clientList = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || "",
          email: doc.data().email || "",
          role: doc.data().role || "",
        }));

        // Initialize clients with empty interview data that will be populated by the candidates useEffect
        const clientsWithInterviews = clientList.map((client) => ({
          client,
          interviews: [],
          totalInterviews: 0,
          pendingInterviews: 0,
          passedInterviews: 0,
          rejectedInterviews: 0,
          uninterviewedCandidates: [],
        }));

        setClients(clientsWithInterviews);
        setLastDataSync(new Date());
        setConnectionStatus("connected");
        console.log(
          "Clients data synced:",
          new Date().toISOString(),
          clientsWithInterviews.length,
          "clients"
        );
      },
      (error) => {
        console.error("Error fetching clients:", error);
        setConnectionStatus("disconnected");
        toast.error("Failed to load clients data");
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch candidates with interview history - Real-time sync
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "candidates"),
      (snapshot) => {
        const candidateList = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || "",
            interviewHistory: data.interviewHistory || [],
            ...data,
          } as Candidate;
        });
        setCandidates(candidateList);
        setLoading(false);
        setLastDataSync(new Date());
        setConnectionStatus("connected");
        console.log(
          "Candidates data synced:",
          new Date().toISOString(),
          candidateList.length,
          "candidates"
        );
      },
      (error) => {
        console.error("Error fetching candidates:", error);
        setConnectionStatus("disconnected");
        toast.error("Failed to load candidates data");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Process interview data when candidates change
  useEffect(() => {
    if (candidates.length > 0) {
      setClients((currentClients) => {
        if (currentClients.length === 0) return currentClients;

        const updatedClients = currentClients.map((clientData) => {
          const interviews: InterviewSummary[] = [];

          // Find all interviews for this client across all candidates
          candidates.forEach((candidate) => {
            if (candidate.interviewHistory) {
              candidate.interviewHistory
                .filter(
                  (interview) =>
                    interview.interviewerId === clientData.client.id
                )
                .forEach((interview) => {
                  interviews.push({
                    candidateId: candidate.id,
                    candidateName: candidate.name,
                    interviewDate: interview.interviewDate,
                    outcome: interview.outcome || "pending",
                    notes: interview.notes,
                  });
                });
            }
          });

          // Sort interviews by date (newest first)
          interviews.sort(
            (a, b) =>
              new Date(b.interviewDate).getTime() -
              new Date(a.interviewDate).getTime()
          );

          // Calculate statistics
          const totalInterviews = interviews.length;
          const pendingInterviews = interviews.filter(
            (i) => i.outcome === "pending"
          ).length;
          const passedInterviews = interviews.filter(
            (i) => i.outcome === "passed"
          ).length;
          const rejectedInterviews = interviews.filter(
            (i) => i.outcome === "rejected"
          ).length;

          // Get uninterviewed candidates for this client
          const interviewedCandidateIds = new Set(
            interviews.map((i) => i.candidateId)
          );
          const uninterviewedCandidates = candidates.filter(
            (candidate) => !interviewedCandidateIds.has(candidate.id)
          );

          return {
            ...clientData,
            interviews,
            totalInterviews,
            pendingInterviews,
            passedInterviews,
            rejectedInterviews,
            uninterviewedCandidates,
          };
        });

        // Only update if there are actual changes to prevent unnecessary re-renders
        const hasChanges = updatedClients.some((updatedClient, index) => {
          const currentClient = currentClients[index];
          return (
            updatedClient.totalInterviews !== currentClient.totalInterviews ||
            updatedClient.pendingInterviews !==
              currentClient.pendingInterviews ||
            updatedClient.passedInterviews !== currentClient.passedInterviews ||
            updatedClient.rejectedInterviews !==
              currentClient.rejectedInterviews ||
            updatedClient.uninterviewedCandidates.length !==
              currentClient.uninterviewedCandidates.length ||
            JSON.stringify(updatedClient.interviews) !==
              JSON.stringify(currentClient.interviews)
          );
        });

        if (hasChanges) {
          setLastDataSync(new Date());
          console.log(
            "Client interview data processed:",
            new Date().toISOString(),
            updatedClients.length,
            "clients updated"
          );
        }

        return hasChanges ? updatedClients : currentClients;
      });
    }
  }, [candidates]);

  // Handle interview scheduling
  const handleScheduleInterview = async () => {
    if (
      !selectedClient ||
      !selectedCandidateId ||
      !scheduleDate ||
      !scheduleTime
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      setIsSubmitting(true);

      // Check if interview already exists (double-check)
      const candidate = candidates.find((c) => c.id === selectedCandidateId);
      if (
        candidate?.interviewHistory?.some(
          (interview) => interview.interviewerId === selectedClient.client.id
        )
      ) {
        toast.error(
          "This candidate has already been interviewed by this client"
        );
        return;
      }

      const interviewDateTime = new Date(
        `${format(scheduleDate, "yyyy-MM-dd")}T${scheduleTime}`
      ).toISOString();

      // Add interview to candidate's history
      const updatedInterviewHistory = [
        ...(candidate?.interviewHistory || []),
        {
          interviewerId: selectedClient.client.id,
          interviewDate: interviewDateTime,
          outcome: "pending",
          notes: scheduleNotes,
        },
      ];

      // Update candidate in Firestore
      const candidateRef = doc(db, "candidates", selectedCandidateId);
      await updateDoc(candidateRef, {
        interviewHistory: updatedInterviewHistory,
        updatedAt: new Date().toISOString(),
      });

      toast.success("Interview scheduled successfully");
      setIsScheduleOpen(false);
      setSelectedCandidateId("");
      setScheduleDate(undefined);
      setScheduleTime("");
      setScheduleNotes("");
    } catch (error) {
      console.error("Error scheduling interview:", error);
      toast.error("Failed to schedule interview");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle interview status update
  const handleUpdateInterviewStatus = async () => {
    if (!selectedInterview || !newStatus) {
      toast.error("Please select a status");
      return;
    }

    try {
      setIsSubmitting(true);

      // Find the candidate
      const candidate = candidates.find(
        (c) => c.id === selectedInterview.candidateId
      );
      if (!candidate) {
        toast.error("Candidate not found");
        return;
      }

      // Update the specific interview in the history
      const updatedInterviewHistory = [...(candidate.interviewHistory || [])];
      updatedInterviewHistory[selectedInterview.interviewIndex] = {
        ...updatedInterviewHistory[selectedInterview.interviewIndex],
        outcome: newStatus,
        notes:
          statusNotes ||
          updatedInterviewHistory[selectedInterview.interviewIndex].notes,
      };

      // Update candidate in Firestore
      const candidateRef = doc(db, "candidates", selectedInterview.candidateId);
      await updateDoc(candidateRef, {
        interviewHistory: updatedInterviewHistory,
        updatedAt: new Date().toISOString(),
      });

      toast.success("Interview status updated successfully");
      setIsUpdateStatusOpen(false);
      setSelectedInterview(null);
      setNewStatus("");
      setStatusNotes("");
    } catch (error) {
      console.error("Error updating interview status:", error);
      toast.error("Failed to update interview status");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredClients = clients.filter(
    (clientData) =>
      clientData.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clientData.client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case "passed":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Passed
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            Pending
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-muted-foreground">Loading clients...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-full">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Clients
          </h1>
          <p className="text-muted-foreground text-sm">
            Track client interview history and prevent duplicate interviews
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="py-1 px-3">
            {clients.length} clients
          </Badge>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <div
              className={`w-2 h-2 rounded-full ${
                connectionStatus === "connected"
                  ? "bg-green-500 animate-pulse"
                  : connectionStatus === "connecting"
                  ? "bg-yellow-500 animate-spin"
                  : "bg-red-500"
              }`}
            ></div>
            {connectionStatus === "connected" ? (
              <>
                Last synced:{" "}
                {lastDataSync.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </>
            ) : connectionStatus === "connecting" ? (
              "Connecting..."
            ) : (
              "Connection lost"
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="h-8 w-8 p-0"
            title="Refresh data"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Input
          placeholder="Search clients by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Clients Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredClients.map((clientData) => (
          <Card
            key={clientData.client.id}
            className="hover:shadow-md transition-shadow"
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <div>
                  <div className="font-semibold">{clientData.client.name}</div>
                  <div className="text-sm text-muted-foreground font-normal">
                    {clientData.client.email}
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {clientData.client.role}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Statistics */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="font-semibold text-lg">
                      {clientData.totalInterviews}
                    </div>
                    <div className="text-muted-foreground">Total</div>
                  </div>
                  <div className="text-center p-2 bg-yellow-50 rounded">
                    <div className="font-semibold text-lg text-yellow-700">
                      {clientData.pendingInterviews}
                    </div>
                    <div className="text-muted-foreground">Pending</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="text-center p-2 bg-green-50 rounded">
                    <div className="font-semibold text-lg text-green-700">
                      {clientData.passedInterviews}
                    </div>
                    <div className="text-muted-foreground">Passed</div>
                  </div>
                  <div className="text-center p-2 bg-red-50 rounded">
                    <div className="font-semibold text-lg text-red-700">
                      {clientData.rejectedInterviews}
                    </div>
                    <div className="text-muted-foreground">Rejected</div>
                  </div>
                </div>

                {/* Recent Interviews Preview */}
                {clientData.interviews.length > 0 && (
                  <div className="pt-2">
                    <div className="text-sm font-medium mb-2">
                      Recent Interviews:
                    </div>
                    <div className="space-y-1">
                      {clientData.interviews
                        .slice(0, 2)
                        .map((interview, idx) => (
                          <div
                            key={idx}
                            className="text-xs flex items-center justify-between p-2 bg-gray-50 rounded"
                          >
                            <span className="font-medium">
                              {interview.candidateName}
                            </span>
                            {getOutcomeBadge(interview.outcome)}
                          </div>
                        ))}
                      {clientData.interviews.length > 2 && (
                        <div className="text-xs text-muted-foreground text-center">
                          +{clientData.interviews.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Schedule Interview Button */}
                <Button
                  variant="default"
                  size="sm"
                  className="w-full mb-2"
                  onClick={() => {
                    setSelectedClient(clientData);
                    setIsScheduleOpen(true);
                  }}
                  disabled={clientData.uninterviewedCandidates.length === 0}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Interview
                  <Badge variant="secondary" className="ml-2">
                    {clientData.uninterviewedCandidates.length}
                  </Badge>
                </Button>

                {/* View Details Button */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full">
                      <Eye className="h-4 w-4 mr-2" />
                      View Interview History
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                    <DialogHeader>
                      <DialogTitle>
                        Interview History: {clientData.client.name}
                      </DialogTitle>
                      <DialogDescription>
                        Complete interview history for this client
                      </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="flex-grow">
                      <div className="space-y-4">
                        {clientData.interviews.length > 0 ? (
                          clientData.interviews.map((interview, idx) => (
                            <div key={idx} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="font-medium">
                                  {interview.candidateName}
                                </div>
                                <div className="flex items-center gap-2">
                                  {getOutcomeBadge(interview.outcome)}
                                  {interview.outcome === "pending" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedInterview({
                                          candidateId: interview.candidateId,
                                          interviewIndex: idx,
                                          interview,
                                        });
                                        setNewStatus("");
                                        setStatusNotes("");
                                        setIsUpdateStatusOpen(true);
                                      }}
                                    >
                                      <Edit className="h-3 w-3 mr-1" />
                                      Update
                                    </Button>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                <Calendar className="h-4 w-4" />
                                {new Date(
                                  interview.interviewDate
                                ).toLocaleDateString()}{" "}
                                at{" "}
                                {new Date(
                                  interview.interviewDate
                                ).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                              {interview.notes && (
                                <div className="text-sm text-gray-600 mt-2 p-2 bg-gray-50 rounded">
                                  {interview.notes}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                            <p>No interviews scheduled yet</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredClients.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No clients found
          </h3>
          <p className="text-gray-500 mb-4">
            {searchTerm
              ? "No clients match your search criteria."
              : "No team members with 'Client' role found."}
          </p>
          {!searchTerm && (
            <p className="text-sm text-gray-400">
              Add team members with the "Client" role to track client interview
              history.
            </p>
          )}
        </div>
      )}

      {/* Schedule Interview Dialog */}
      <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Interview</DialogTitle>
            <DialogDescription>
              Schedule a new interview with {selectedClient?.client.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Select Candidate
              </label>
              <Select
                value={selectedCandidateId}
                onValueChange={setSelectedCandidateId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a candidate" />
                </SelectTrigger>
                <SelectContent>
                  {selectedClient?.uninterviewedCandidates.map((candidate) => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      {candidate.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedClient?.uninterviewedCandidates.length === 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  All candidates have been interviewed by this client
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Interview Date
                </label>
                <Popover modal={true}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !scheduleDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {scheduleDate
                        ? format(scheduleDate, "PPP")
                        : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-50" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={scheduleDate}
                      onSelect={setScheduleDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Interview Time
                </label>
                <Select value={scheduleTime} onValueChange={setScheduleTime}>
                  <SelectTrigger className="z-10">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent className="z-50 max-h-[200px]">
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = i.toString().padStart(2, "0");
                      return (
                        <div key={i}>
                          <SelectItem value={`${hour}:00`}>
                            {hour}:00
                          </SelectItem>
                          <SelectItem value={`${hour}:30`}>
                            {hour}:30
                          </SelectItem>
                        </div>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Notes (optional)
              </label>
              <Textarea
                placeholder="Interview notes or instructions..."
                value={scheduleNotes}
                onChange={(e) => setScheduleNotes(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setIsScheduleOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleScheduleInterview}
              disabled={
                isSubmitting ||
                !selectedCandidateId ||
                !scheduleDate ||
                !scheduleTime
              }
            >
              {isSubmitting ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Scheduling...
                </>
              ) : (
                "Schedule Interview"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Update Interview Status Dialog */}
      <Dialog open={isUpdateStatusOpen} onOpenChange={setIsUpdateStatusOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Interview Status</DialogTitle>
            <DialogDescription>
              Update the outcome for{" "}
              {selectedInterview?.interview.candidateName}'s interview
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Interview Outcome
              </label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select outcome" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="passed">Passed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Interview Notes
              </label>
              <Textarea
                placeholder="Add feedback or notes about the interview..."
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                rows={3}
                className="resize-none"
              />
              {selectedInterview?.interview.notes && (
                <p className="text-xs text-muted-foreground mt-1">
                  Current notes: {selectedInterview.interview.notes}
                </p>
              )}
            </div>

            <div className="text-sm text-muted-foreground bg-gray-50 p-3 rounded">
              <div className="font-medium mb-1">Interview Details:</div>
              <div>
                Date:{" "}
                {selectedInterview &&
                  new Date(
                    selectedInterview.interview.interviewDate
                  ).toLocaleDateString()}
              </div>
              <div>
                Time:{" "}
                {selectedInterview &&
                  new Date(
                    selectedInterview.interview.interviewDate
                  ).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setIsUpdateStatusOpen(false);
                setSelectedInterview(null);
                setNewStatus("");
                setStatusNotes("");
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateInterviewStatus}
              disabled={isSubmitting || !newStatus}
            >
              {isSubmitting ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Status"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
