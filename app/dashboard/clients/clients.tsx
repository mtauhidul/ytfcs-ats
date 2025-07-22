// app/dashboard/clients/clients.tsx
"use client";

import {
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { Calendar, Eye, Users } from "lucide-react";
import { useEffect, useState } from "react";
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
import { ScrollArea } from "~/components/ui/scroll-area";
import { db } from "~/lib/firebase";
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
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientWithInterviews[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] =
    useState<ClientWithInterviews | null>(null);

  // Fetch clients (team members with Interviewer role)
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const q = query(
          collection(db, "teamMembers"),
          where("role", "==", "Interviewer")
        );
        const snapshot = await getDocs(q);
        const clientList = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || "",
          email: doc.data().email || "",
          role: doc.data().role || "",
        }));

        // Initialize clients with empty interview data
        const clientsWithInterviews = clientList.map((client) => ({
          client,
          interviews: [],
          totalInterviews: 0,
          pendingInterviews: 0,
          passedInterviews: 0,
          rejectedInterviews: 0,
        }));

        setClients(clientsWithInterviews);
      } catch (error) {
        console.error("Error fetching clients:", error);
      }
    };

    fetchClients();
  }, []);

  // Fetch candidates with interview history
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "candidates"), (snapshot) => {
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
    });

    return () => unsubscribe();
  }, []);

  // Process interview data when candidates or clients change
  useEffect(() => {
    if (candidates.length > 0 && clients.length > 0) {
      const updatedClients = clients.map((clientData) => {
        const interviews: InterviewSummary[] = [];

        // Find all interviews for this client across all candidates
        candidates.forEach((candidate) => {
          if (candidate.interviewHistory) {
            candidate.interviewHistory
              .filter(
                (interview) => interview.interviewerId === clientData.client.id
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

        return {
          ...clientData,
          interviews,
          totalInterviews,
          pendingInterviews,
          passedInterviews,
          rejectedInterviews,
        };
      });

      setClients(updatedClients);
    }
  }, [candidates]);

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
            Clients / Employers
          </h1>
          <p className="text-muted-foreground text-sm">
            Track interview history for each client and prevent duplicate
            interviews
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="py-1 px-3">
            {clients.length} clients
          </Badge>
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
                                {getOutcomeBadge(interview.outcome)}
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
              : "No team members with 'Interviewer' role found."}
          </p>
          {!searchTerm && (
            <p className="text-sm text-gray-400">
              Add team members with the "Interviewer" role to track client
              interview history.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
