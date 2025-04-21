// app/dashboard/collaboration/collaboration.tsx

import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { UserCircle, Users } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import { db } from "~/lib/firebase";

interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface Candidate {
  id: string;
  name: string;
  assignedTo?: number | null;
  stageId?: string;
}

interface FeedbackForm {
  candidateId: string;
  teamMemberId: string;
  rating: number;
  strengths: string;
  weaknesses: string;
  recommendation: "hire" | "consider" | "reject";
}

export default function CollaborationPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [stages, setStages] = useState<{ id: string; title: string }[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([
    {
      id: 1,
      name: "Mir Tauhidul",
      email: "tauhidul.stu2017@juniv.edu",
      role: "Admin",
    },
    { id: 2, name: "Jane Smith", email: "jane@example.com", role: "Recruiter" },
    {
      id: 3,
      name: "John Doe",
      email: "john@example.com",
      role: "Hiring Manager",
    },
  ]);

  const [feedbackForm, setFeedbackForm] = useState<FeedbackForm>({
    candidateId: "",
    teamMemberId: "",
    rating: 3,
    strengths: "",
    weaknesses: "",
    recommendation: "consider",
  });

  const [loading, setLoading] = useState(true);

  // Fetch candidates
  useEffect(() => {
    const q = query(collection(db, "candidates"), orderBy("name"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCandidates(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || "",
          assignedTo: doc.data().assignedTo || null,
          stageId: doc.data().stageId || "",
        }))
      );
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch stages
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

  const handleAssignCandidate = async (
    candidateId: string,
    teamMemberId: string
  ) => {
    try {
      const memberIdNum = teamMemberId ? parseInt(teamMemberId) : null;
      await updateDoc(doc(db, "candidates", candidateId), {
        assignedTo: memberIdNum,
        lastUpdated: new Date().toISOString(),
      });
      toast.success("Candidate assigned successfully");
    } catch (error) {
      console.error("Error assigning candidate:", error);
      toast.error("Error assigning candidate");
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackForm.candidateId || !feedbackForm.teamMemberId) {
      toast.error("Please select a candidate and team member");
      return;
    }

    try {
      // Get candidate and team member info for reference
      const candidate = candidates.find(
        (c) => c.id === feedbackForm.candidateId
      );
      const teamMember = team.find(
        (t) => t.id.toString() === feedbackForm.teamMemberId
      );

      // Create feedback record
      await addDoc(collection(db, "feedback"), {
        ...feedbackForm,
        candidateName: candidate?.name || "",
        teamMemberName: teamMember?.name || "",
        createdAt: new Date().toISOString(),
      });

      // Reset form
      setFeedbackForm({
        candidateId: "",
        teamMemberId: "",
        rating: 3,
        strengths: "",
        weaknesses: "",
        recommendation: "consider",
      });

      toast.success("Feedback submitted successfully");
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Error submitting feedback");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted/50 rounded-md w-1/3 mx-auto"></div>
          <div className="h-4 bg-muted/50 rounded-md w-1/2 mx-auto"></div>
          <div className="h-64 bg-muted/50 rounded-md w-full mx-auto mt-8"></div>
        </div>
      </div>
    );
  }

  const getStageName = (stageId: string) => {
    const stage = stages.find((s) => s.id === stageId);
    return stage ? stage.title : "Unassigned";
  };

  return (
    <div className="container mx-auto py-8">
      <Toaster position="top-right" />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Users className="size-6" />
            Collaboration & Feedback
          </h1>
          <p className="text-muted-foreground text-sm">
            Collaborate with your team on candidate evaluations
          </p>
        </div>
      </div>

      <Tabs defaultValue="assignments">
        <TabsList className="mb-4">
          <TabsTrigger value="assignments">Candidate Assignments</TabsTrigger>
          <TabsTrigger value="feedback">Feedback Form</TabsTrigger>
          <TabsTrigger value="team">Team Members</TabsTrigger>
        </TabsList>

        <TabsContent value="assignments">
          <Card>
            <CardHeader>
              <CardTitle>Assign Candidates</CardTitle>
              <CardDescription>
                Assign candidates to team members for review
              </CardDescription>
            </CardHeader>
            <CardContent>
              {candidates.length === 0 ? (
                <div className="text-center py-12 border rounded-md bg-muted/20">
                  <p className="text-muted-foreground">
                    No candidates available
                  </p>
                </div>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left p-3 font-medium">Candidate</th>
                        <th className="text-left p-3 font-medium">
                          Current Stage
                        </th>
                        <th className="text-left p-3 font-medium">
                          Assigned To
                        </th>
                        <th className="text-left p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidates.map((candidate) => (
                        <tr key={candidate.id} className="border-t">
                          <td className="p-3">{candidate.name}</td>
                          <td className="p-3">
                            {candidate.stageId
                              ? getStageName(candidate.stageId)
                              : "Unassigned"}
                          </td>
                          <td className="p-3">
                            {candidate.assignedTo
                              ? team.find((t) => t.id === candidate.assignedTo)
                                  ?.name || "Unknown"
                              : "Unassigned"}
                          </td>
                          <td className="p-3">
                            <Select
                              value={candidate.assignedTo?.toString() || ""}
                              onValueChange={(value) =>
                                handleAssignCandidate(candidate.id, value)
                              }
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue placeholder="Assign to..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Unassigned">
                                  Unassigned
                                </SelectItem>
                                {team.map((member) => (
                                  <SelectItem
                                    key={member.id}
                                    value={member.id.toString()}
                                  >
                                    {member.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback">
          <Card>
            <CardHeader>
              <CardTitle>Interview Feedback</CardTitle>
              <CardDescription>
                Submit feedback for candidates after interviews
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Candidate:
                  </label>
                  <Select
                    value={feedbackForm.candidateId}
                    onValueChange={(value) =>
                      setFeedbackForm({ ...feedbackForm, candidateId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select candidate" />
                    </SelectTrigger>
                    <SelectContent>
                      {candidates.map((candidate) => (
                        <SelectItem key={candidate.id} value={candidate.id}>
                          {candidate.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Your Name:
                  </label>
                  <Select
                    value={feedbackForm.teamMemberId}
                    onValueChange={(value) =>
                      setFeedbackForm({ ...feedbackForm, teamMemberId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select interviewer" />
                    </SelectTrigger>
                    <SelectContent>
                      {team.map((member) => (
                        <SelectItem
                          key={member.id}
                          value={member.id.toString()}
                        >
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Overall Rating (1-5):
                </label>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() =>
                        setFeedbackForm({ ...feedbackForm, rating })
                      }
                      className={`p-2 hover:scale-110 transition-transform ${
                        feedbackForm.rating >= rating
                          ? "text-amber-400"
                          : "text-gray-300"
                      }`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Strengths:
                </label>
                <Textarea
                  placeholder="Candidate strengths..."
                  value={feedbackForm.strengths}
                  onChange={(e) =>
                    setFeedbackForm({
                      ...feedbackForm,
                      strengths: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Areas for Improvement:
                </label>
                <Textarea
                  placeholder="Areas where the candidate could improve..."
                  value={feedbackForm.weaknesses}
                  onChange={(e) =>
                    setFeedbackForm({
                      ...feedbackForm,
                      weaknesses: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Recommendation:
                </label>
                <Select
                  value={feedbackForm.recommendation}
                  onValueChange={(value: "hire" | "consider" | "reject") =>
                    setFeedbackForm({ ...feedbackForm, recommendation: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select recommendation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hire">
                      Strongly Recommend Hiring
                    </SelectItem>
                    <SelectItem value="consider">Consider Hiring</SelectItem>
                    <SelectItem value="reject">Do Not Recommend</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleSubmitFeedback}
                disabled={
                  !feedbackForm.candidateId || !feedbackForm.teamMemberId
                }
              >
                Submit Feedback
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                Team members with access to the ATS
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left p-3 font-medium">Name</th>
                      <th className="text-left p-3 font-medium">Email</th>
                      <th className="text-left p-3 font-medium">Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {team.map((member) => (
                      <tr key={member.id} className="border-t">
                        <td className="p-3 flex items-center gap-2">
                          <UserCircle className="text-primary/70 size-5" />
                          {member.name}
                        </td>
                        <td className="p-3">{member.email}</td>
                        <td className="p-3">
                          <Badge
                            variant={
                              member.role === "Admin" ? "default" : "secondary"
                            }
                          >
                            {member.role}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" disabled className="opacity-50">
                <span className="mr-2">+</span> Add Team Member
              </Button>
              <div className="ml-2 text-xs text-muted-foreground">
                Team member management coming soon
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
