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
  Calendar,
  CheckCircle,
  Edit,
  Filter,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Search,
  Trash2,
  UserCircle,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Toaster, toast } from "sonner";

import { Avatar, AvatarFallback } from "~/components/ui/avatar";
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
import { Progress } from "~/components/ui/progress";
import { ScrollArea } from "~/components/ui/scroll-area";
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

// Define interfaces
interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  photoUrl?: string;
  createdAt?: string;
}

interface Candidate {
  id: string;
  name: string;
  assignedTo?: string | null;
  stageId?: string;
  tags?: string[];
  rating?: number;
  email?: string;
  skills?: string[];
  updatedAt?: string;
}

interface FeedbackRecord {
  id: string;
  candidateId: string;
  candidateName: string;
  teamMemberId: string;
  teamMemberName: string;
  rating: number;
  strengths: string;
  weaknesses: string;
  recommendation: "hire" | "consider" | "reject";
  createdAt: string;
}

interface Stage {
  id: string;
  title: string;
  order: number;
  color?: string;
}

// Define feedback form
interface FeedbackForm {
  candidateId: string;
  teamMemberId: string;
  rating: number;
  strengths: string;
  weaknesses: string;
  recommendation: "hire" | "consider" | "reject";
}

export default function CollaborationPage() {
  // State hooks
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [feedbackRecords, setFeedbackRecords] = useState<FeedbackRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [activeCandidate, setActiveCandidate] = useState<Candidate | null>(
    null
  );

  // Filters
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [assignedFilter, setAssignedFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Form states
  const [feedbackForm, setFeedbackForm] = useState<FeedbackForm>({
    candidateId: "",
    teamMemberId: "",
    rating: 3,
    strengths: "",
    weaknesses: "",
    recommendation: "consider",
  });

  // Modal states
  const [isViewFeedbackOpen, setIsViewFeedbackOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] =
    useState<FeedbackRecord | null>(null);
  const [isNewTeamMemberOpen, setIsNewTeamMemberOpen] = useState(false);
  const [newTeamMember, setNewTeamMember] = useState({
    name: "",
    email: "",
    role: "Team Member",
  });
  const [isEditTeamMemberOpen, setIsEditTeamMemberOpen] = useState(false);
  const [editingTeamMember, setEditingTeamMember] = useState<TeamMember | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch data
  useEffect(() => {
    // Fetch Candidates
    const candidatesQuery = query(
      collection(db, "candidates"),
      orderBy("name")
    );
    const candidatesUnsubscribe = onSnapshot(candidatesQuery, (snapshot) => {
      setCandidates(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || "",
          assignedTo: doc.data().assignedTo || null,
          stageId: doc.data().stageId || "",
          tags: doc.data().tags || [],
          rating: doc.data().rating || 0,
          email: doc.data().email || "",
          skills: doc.data().skills || [],
          updatedAt: doc.data().updatedAt || "",
        }))
      );
      setLoading(false);
    });

    // Fetch Stages
    const stagesQuery = query(collection(db, "stages"), orderBy("order"));
    const stagesUnsubscribe = onSnapshot(stagesQuery, (snapshot) => {
      setStages(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          title: doc.data().title || "",
          order: doc.data().order || 0,
          color: doc.data().color || "",
        }))
      );
    });

    // Fetch Team Members
    const teamQuery = query(collection(db, "teamMembers"), orderBy("name"));
    const teamUnsubscribe = onSnapshot(teamQuery, (snapshot) => {
      if (snapshot.docs.length === 0) {
        // If no team members, create default ones
        createDefaultTeamMembers();
      } else {
        setTeamMembers(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            name: doc.data().name || "",
            email: doc.data().email || "",
            role: doc.data().role || "Team Member",
            photoUrl: doc.data().photoUrl || "",
            createdAt: doc.data().createdAt || "",
          }))
        );
      }
    });

    // Fetch Feedback Records
    const feedbackQuery = query(
      collection(db, "feedback"),
      orderBy("createdAt", "desc")
    );
    const feedbackUnsubscribe = onSnapshot(feedbackQuery, (snapshot) => {
      setFeedbackRecords(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as FeedbackRecord[]
      );
      setFeedbackLoading(false);
    });

    return () => {
      candidatesUnsubscribe();
      stagesUnsubscribe();
      teamUnsubscribe();
      feedbackUnsubscribe();
    };
  }, []);

  // Create default team members if none exist
  const createDefaultTeamMembers = async () => {
    try {
      const defaultMembers = [
        {
          name: "Mir Tauhidul",
          email: "tauhidul.stu2017@juniv.edu",
          role: "Admin",
          createdAt: new Date().toISOString(),
        },
        {
          name: "Jane Smith",
          email: "jane@example.com",
          role: "Recruiter",
          createdAt: new Date().toISOString(),
        },
        {
          name: "John Doe",
          email: "john@example.com",
          role: "Hiring Manager",
          createdAt: new Date().toISOString(),
        },
      ];

      for (const member of defaultMembers) {
        await addDoc(collection(db, "teamMembers"), member);
      }

      toast.success("Default team members created");
    } catch (error) {
      console.error("Error creating default team members:", error);
    }
  };

  // Filter candidates
  const filteredCandidates = candidates.filter((candidate) => {
    const matchesStage =
      stageFilter === "all" ||
      (stageFilter === "unassigned" && !candidate.stageId) ||
      candidate.stageId === stageFilter;

    const matchesAssigned =
      assignedFilter === "all" ||
      (assignedFilter === "unassigned" && !candidate.assignedTo) ||
      (assignedFilter === "assigned" && candidate.assignedTo) ||
      candidate.assignedTo === assignedFilter;

    const matchesSearch = candidate.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    return matchesStage && matchesAssigned && matchesSearch;
  });

  // Get team member name by ID
  const getTeamMemberName = (id: string | null | undefined): string => {
    if (!id) return "Unassigned";
    const member = teamMembers.find((m) => m.id === id);
    return member ? member.name : "Unknown";
  };

  // Get stage title by ID
  const getStageName = (id: string | undefined): string => {
    if (!id) return "Unassigned";
    const stage = stages.find((s) => s.id === id);
    return stage ? stage.title : "Unknown Stage";
  };

  // Handle candidate assignment
  const handleAssignCandidate = async (
    candidateId: string,
    teamMemberId: string | null
  ) => {
    try {
      setIsSubmitting(true);
      await updateDoc(doc(db, "candidates", candidateId), {
        assignedTo: teamMemberId,
        updatedAt: new Date().toISOString(),
      });

      const candidateName = candidates.find((c) => c.id === candidateId)?.name;
      const memberName = teamMemberId
        ? getTeamMemberName(teamMemberId)
        : "Unassigned";

      toast.success(`Assigned ${candidateName} to ${memberName}`);
      setIsSubmitting(false);
    } catch (error) {
      console.error("Error assigning candidate:", error);
      toast.error("Error assigning candidate");
      setIsSubmitting(false);
    }
  };

  // Handle feedback submission
  const handleSubmitFeedback = async () => {
    if (!feedbackForm.candidateId || !feedbackForm.teamMemberId) {
      toast.error("Please select a candidate and team member");
      return;
    }

    try {
      setIsSubmitting(true);
      // Get candidate and team member info for reference
      const candidate = candidates.find(
        (c) => c.id === feedbackForm.candidateId
      );
      const teamMember = teamMembers.find(
        (t) => t.id === feedbackForm.teamMemberId
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
      setIsSubmitting(false);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Error submitting feedback");
      setIsSubmitting(false);
    }
  };

  // Handle team member creation
  const handleAddTeamMember = async () => {
    if (!newTeamMember.name || !newTeamMember.email) {
      toast.error("Please provide name and email");
      return;
    }

    try {
      setIsSubmitting(true);
      await addDoc(collection(db, "teamMembers"), {
        ...newTeamMember,
        createdAt: new Date().toISOString(),
      });

      setNewTeamMember({
        name: "",
        email: "",
        role: "Team Member",
      });

      setIsNewTeamMemberOpen(false);
      toast.success("Team member added successfully");
      setIsSubmitting(false);
    } catch (error) {
      console.error("Error adding team member:", error);
      toast.error("Error adding team member");
      setIsSubmitting(false);
    }
  };

  // Handle team member update
  const handleUpdateTeamMember = async () => {
    if (
      !editingTeamMember ||
      !editingTeamMember.name ||
      !editingTeamMember.email
    ) {
      toast.error("Please provide all required fields");
      return;
    }

    try {
      setIsSubmitting(true);
      await updateDoc(doc(db, "teamMembers", editingTeamMember.id), {
        name: editingTeamMember.name,
        email: editingTeamMember.email,
        role: editingTeamMember.role,
        updatedAt: new Date().toISOString(),
      });

      setIsEditTeamMemberOpen(false);
      toast.success("Team member updated successfully");
      setIsSubmitting(false);
    } catch (error) {
      console.error("Error updating team member:", error);
      toast.error("Error updating team member");
      setIsSubmitting(false);
    }
  };

  // Handle team member deletion
  const handleDeleteTeamMember = async (id: string) => {
    // Check if team member is assigned to any candidates
    const assignedCandidates = candidates.filter((c) => c.assignedTo === id);

    if (assignedCandidates.length > 0) {
      toast.error("Cannot delete team member assigned to candidates");
      return;
    }

    try {
      setIsSubmitting(true);
      await deleteDoc(doc(db, "teamMembers", id));
      toast.success("Team member deleted successfully");
      setIsSubmitting(false);
    } catch (error) {
      console.error("Error deleting team member:", error);
      toast.error("Error deleting team member");
      setIsSubmitting(false);
    }
  };

  // Handle view feedback
  const handleViewFeedback = (feedback: FeedbackRecord) => {
    setSelectedFeedback(feedback);
    setIsViewFeedbackOpen(true);
  };

  // Helper to format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get candidate feedback count
  const getCandidateFeedbackCount = (candidateId: string) => {
    return feedbackRecords.filter((f) => f.candidateId === candidateId).length;
  };

  // Get badge color for recommendation
  const getRecommendationBadge = (recommendation: string) => {
    switch (recommendation) {
      case "hire":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            Hire
          </Badge>
        );
      case "consider":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            Consider
          </Badge>
        );
      case "reject":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            Reject
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  // Rating display component
  const StarRating = ({
    value = 0,
    setRating,
    interactive = false,
  }: {
    value: number;
    setRating?: (rating: number) => void;
    interactive?: boolean;
  }) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => interactive && setRating && setRating(star)}
            className={`${
              interactive ? "hover:scale-110" : ""
            } transition-transform ${
              star <= value ? "text-amber-400" : "text-gray-300"
            }`}
            disabled={!interactive}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.799-2.034c-.784-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading collaboration data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Toaster position="top-right" richColors />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Users className="size-6" />
            Collaboration & Feedback
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Collaborate with your team on candidate evaluations and feedback
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="rounded-lg font-normal py-1 px-3">
            <Users className="mr-1 size-3.5" />
            {teamMembers.length} team members
          </Badge>
          <Badge variant="outline" className="rounded-lg font-normal py-1 px-3">
            <CheckCircle className="mr-1 size-3.5" />
            {feedbackRecords.length} feedback records
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="assignments" className="space-y-6">
        <TabsList className="mb-1">
          <TabsTrigger
            value="assignments"
            className="flex items-center gap-1.5"
          >
            <Users className="size-4" />
            <span>Assignments</span>
          </TabsTrigger>
          <TabsTrigger value="feedback" className="flex items-center gap-1.5">
            <CheckCircle className="size-4" />
            <span>Feedback</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-1.5">
            <UserCircle className="size-4" />
            <span>Team</span>
          </TabsTrigger>
        </TabsList>

        {/* ASSIGNMENTS TAB */}
        <TabsContent value="assignments" className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="size-5" />
                    Candidate Assignments
                  </CardTitle>
                  <CardDescription>
                    Assign candidates to team members for review
                  </CardDescription>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Stage filter */}
                  <Select value={stageFilter} onValueChange={setStageFilter}>
                    <SelectTrigger className="w-[180px]" size="sm">
                      <SelectValue placeholder="Filter by stage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Stages</SelectItem>
                      <SelectItem value="unassigned">
                        Unassigned Stage
                      </SelectItem>
                      {stages.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          {stage.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Assigned filter */}
                  <Select
                    value={assignedFilter}
                    onValueChange={setAssignedFilter}
                  >
                    <SelectTrigger className="w-[180px]" size="sm">
                      <SelectValue placeholder="Filter by assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Team Members</SelectItem>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      <SelectItem value="assigned">Any Assigned</SelectItem>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Search input */}
                  <div className="relative">
                    <Input
                      placeholder="Search candidates..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full md:w-[220px] pl-8"
                    />
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                        onClick={() => setSearchQuery("")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {candidates.length === 0 ? (
                <div className="text-center py-12 border rounded-md bg-muted/20">
                  <Users className="mx-auto mb-3 size-8 text-muted-foreground/50" />
                  <p className="text-muted-foreground">
                    No candidates available
                  </p>
                  <p className="text-sm text-muted-foreground/70 mt-2">
                    Import or add candidates to start assigning them
                  </p>
                </div>
              ) : filteredCandidates.length === 0 ? (
                <div className="text-center py-12 border rounded-md bg-muted/20">
                  <Filter className="mx-auto mb-3 size-8 text-muted-foreground/50" />
                  <p className="text-muted-foreground">
                    No candidates match your filters
                  </p>
                  <p className="text-sm text-muted-foreground/70 mt-2">
                    Try changing your search criteria
                  </p>
                </div>
              ) : (
                <div className="border rounded-md overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/40">
                        <th className="text-left p-3 font-medium">Candidate</th>
                        <th className="text-left p-3 font-medium">
                          Current Stage
                        </th>
                        <th className="text-left p-3 font-medium">
                          Assigned To
                        </th>
                        <th className="text-left p-3 font-medium">Tags</th>
                        <th className="text-left p-3 font-medium">Rating</th>
                        <th className="text-left p-3 font-medium">Feedback</th>
                        <th className="text-left p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCandidates.map((candidate) => (
                        <tr
                          key={candidate.id}
                          className="border-t hover:bg-muted/20"
                        >
                          <td className="p-3">
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {candidate.name}
                              </span>
                              {candidate.email && (
                                <span className="text-xs text-muted-foreground">
                                  {candidate.email}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge
                              variant="outline"
                              className={cn(
                                "font-normal",
                                candidate.stageId &&
                                  stages.find((s) => s.id === candidate.stageId)
                                    ?.color
                              )}
                            >
                              {getStageName(candidate.stageId)}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {candidate.assignedTo ? (
                                <>
                                  <Avatar className="size-6">
                                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                      {getTeamMemberName(candidate.assignedTo)
                                        .split(" ")
                                        .map((n) => n[0])
                                        .join("")}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span>
                                    {getTeamMemberName(candidate.assignedTo)}
                                  </span>
                                </>
                              ) : (
                                <span className="text-muted-foreground">
                                  Unassigned
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1 max-w-[180px]">
                              {candidate.tags && candidate.tags.length > 0 ? (
                                candidate.tags.slice(0, 2).map((tag, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="outline"
                                    className="px-1.5 py-0 text-xs"
                                  >
                                    {tag}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                              {candidate.tags && candidate.tags.length > 2 && (
                                <Badge
                                  variant="outline"
                                  className="px-1.5 py-0 text-xs"
                                >
                                  +{candidate.tags.length - 2}
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <StarRating value={candidate.rating || 0} />
                          </td>
                          <td className="p-3">
                            {getCandidateFeedbackCount(candidate.id) > 0 ? (
                              <Badge
                                className="bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer"
                                onClick={() => setActiveCandidate(candidate)}
                              >
                                {getCandidateFeedbackCount(candidate.id)}{" "}
                                records
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="p-3">
                            <Select
                              value={candidate.assignedTo || "unassigned"}
                              onValueChange={(value) =>
                                handleAssignCandidate(
                                  candidate.id,
                                  value === "unassigned" ? null : value
                                )
                              }
                              disabled={isSubmitting}
                            >
                              <SelectTrigger className="w-40 h-8 text-xs">
                                <SelectValue placeholder="Assign to..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned">
                                  Unassigned
                                </SelectItem>
                                {teamMembers.map((member) => (
                                  <SelectItem key={member.id} value={member.id}>
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

            <CardFooter className="flex justify-between text-xs text-muted-foreground pt-4">
              <div>
                Showing {filteredCandidates.length} of {candidates.length}{" "}
                candidates
                {searchQuery && " matching search criteria"}
              </div>
              <div className="flex items-center gap-1">
                <RefreshCw className="size-3" />
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* FEEDBACK TAB */}
        <TabsContent value="feedback" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Feedback Form Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="size-5" />
                  Submit Interview Feedback
                </CardTitle>
                <CardDescription>
                  Provide candidate evaluation and hiring recommendations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label
                      htmlFor="candidate"
                      className="text-sm font-medium mb-2 block"
                    >
                      Candidate
                    </Label>
                    <Select
                      value={feedbackForm.candidateId}
                      onValueChange={(value) =>
                        setFeedbackForm({ ...feedbackForm, candidateId: value })
                      }
                    >
                      <SelectTrigger id="candidate">
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
                    <Label
                      htmlFor="reviewer"
                      className="text-sm font-medium mb-2 block"
                    >
                      Reviewer
                    </Label>
                    <Select
                      value={feedbackForm.teamMemberId}
                      onValueChange={(value) =>
                        setFeedbackForm({
                          ...feedbackForm,
                          teamMemberId: value,
                        })
                      }
                    >
                      <SelectTrigger id="reviewer">
                        <SelectValue placeholder="Select team member" />
                      </SelectTrigger>
                      <SelectContent>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor="rating"
                    className="text-sm font-medium mb-2 block"
                  >
                    Overall Rating
                  </Label>
                  <div className="bg-muted/20 p-3 rounded-md flex flex-col items-center gap-2">
                    <StarRating
                      value={feedbackForm.rating}
                      setRating={(rating) =>
                        setFeedbackForm({ ...feedbackForm, rating })
                      }
                      interactive={true}
                    />
                    <span className="text-sm text-muted-foreground">
                      {feedbackForm.rating === 1 && "Below Expectations"}
                      {feedbackForm.rating === 2 && "Needs Improvement"}
                      {feedbackForm.rating === 3 && "Meets Expectations"}
                      {feedbackForm.rating === 4 && "Above Expectations"}
                      {feedbackForm.rating === 5 && "Exceptional"}
                    </span>
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor="strengths"
                    className="text-sm font-medium mb-2 block"
                  >
                    Strengths
                  </Label>
                  <Textarea
                    id="strengths"
                    placeholder="What are the candidate's key strengths and skills?"
                    value={feedbackForm.strengths}
                    onChange={(e) =>
                      setFeedbackForm({
                        ...feedbackForm,
                        strengths: e.target.value,
                      })
                    }
                    className="min-h-[100px]"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="weaknesses"
                    className="text-sm font-medium mb-2 block"
                  >
                    Areas for Improvement
                  </Label>
                  <Textarea
                    id="weaknesses"
                    placeholder="What areas could the candidate improve upon?"
                    value={feedbackForm.weaknesses}
                    onChange={(e) =>
                      setFeedbackForm({
                        ...feedbackForm,
                        weaknesses: e.target.value,
                      })
                    }
                    className="min-h-[100px]"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="recommendation"
                    className="text-sm font-medium mb-2 block"
                  >
                    Recommendation
                  </Label>
                  <Select
                    value={feedbackForm.recommendation}
                    onValueChange={(value: "hire" | "consider" | "reject") =>
                      setFeedbackForm({
                        ...feedbackForm,
                        recommendation: value,
                      })
                    }
                  >
                    <SelectTrigger id="recommendation">
                      <SelectValue placeholder="Your recommendation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hire">
                        <div className="flex items-center gap-2">
                          <div className="size-2 rounded-full bg-green-500"></div>
                          <span>Strongly Recommend Hiring</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="consider">
                        <div className="flex items-center gap-2">
                          <div className="size-2 rounded-full bg-blue-500"></div>
                          <span>Consider Hiring</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="reject">
                        <div className="flex items-center gap-2">
                          <div className="size-2 rounded-full bg-red-500"></div>
                          <span>Do Not Recommend</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={handleSubmitFeedback}
                  disabled={
                    isSubmitting ||
                    !feedbackForm.candidateId ||
                    !feedbackForm.teamMemberId ||
                    !feedbackForm.strengths ||
                    !feedbackForm.weaknesses
                  }
                  className="w-full md:w-auto"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="size-4 mr-2" />
                      Submit Feedback
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>

            {/* Feedback History Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="size-5" />
                  Feedback History
                </CardTitle>
                <CardDescription>
                  Recent feedback submitted by the team
                </CardDescription>
              </CardHeader>
              <CardContent>
                {feedbackLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="size-8 animate-spin text-muted-foreground" />
                  </div>
                ) : feedbackRecords.length === 0 ? (
                  <div className="text-center py-12 border rounded-md bg-muted/20">
                    <CheckCircle className="size-8 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-muted-foreground font-medium">
                      No feedback yet
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Submit your first feedback using the form
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[450px] pr-4">
                    <div className="space-y-3">
                      {feedbackRecords.map((record) => (
                        <div
                          key={record.id}
                          className="p-3 border rounded-lg hover:bg-muted/20 cursor-pointer transition-colors"
                          onClick={() => handleViewFeedback(record)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-medium">
                              {record.candidateName}
                            </div>
                            {getRecommendationBadge(record.recommendation)}
                          </div>
                          <div className="flex items-center gap-2 mt-1 mb-2">
                            <Avatar className="size-5">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {record.teamMemberName
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">
                              {record.teamMemberName}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <StarRating value={record.rating} />
                            <span>{formatDate(record.createdAt)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
              {activeCandidate && (
                <CardFooter className="flex-col items-start border-t pt-4">
                  <div className="text-sm font-medium mb-2 flex items-center gap-2">
                    <UserCircle className="size-4" />
                    Feedback for {activeCandidate.name}
                  </div>
                  {feedbackRecords.filter(
                    (f) => f.candidateId === activeCandidate.id
                  ).length > 0 ? (
                    <div className="w-full space-y-2">
                      <Progress
                        value={
                          (feedbackRecords
                            .filter((f) => f.candidateId === activeCandidate.id)
                            .reduce((sum, f) => sum + f.rating, 0) /
                            (feedbackRecords.filter(
                              (f) => f.candidateId === activeCandidate.id
                            ).length *
                              5)) *
                          100
                        }
                        className="h-2 w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <div>
                          Avg:{" "}
                          {(
                            feedbackRecords
                              .filter(
                                (f) => f.candidateId === activeCandidate.id
                              )
                              .reduce((sum, f) => sum + f.rating, 0) /
                            feedbackRecords.filter(
                              (f) => f.candidateId === activeCandidate.id
                            ).length
                          ).toFixed(1)}
                          /5.0
                        </div>
                        <div>
                          {
                            feedbackRecords.filter(
                              (f) =>
                                f.candidateId === activeCandidate.id &&
                                f.recommendation === "hire"
                            ).length
                          }{" "}
                          Hire •{" "}
                          {
                            feedbackRecords.filter(
                              (f) =>
                                f.candidateId === activeCandidate.id &&
                                f.recommendation === "consider"
                            ).length
                          }{" "}
                          Consider •{" "}
                          {
                            feedbackRecords.filter(
                              (f) =>
                                f.candidateId === activeCandidate.id &&
                                f.recommendation === "reject"
                            ).length
                          }{" "}
                          Reject
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      No feedback records yet
                    </div>
                  )}
                </CardFooter>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* TEAM TAB */}
        <TabsContent value="team" className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <UserCircle className="size-5" />
                    Team Members
                  </CardTitle>
                  <CardDescription>
                    Manage team members with access to the ATS
                  </CardDescription>
                </div>
                <Button onClick={() => setIsNewTeamMemberOpen(true)}>
                  <UserPlus className="size-4 mr-2" />
                  Add Team Member
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {teamMembers.length === 0 ? (
                <div className="text-center py-12 border rounded-md bg-muted/20">
                  <UserCircle className="size-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-muted-foreground font-medium">
                    No team members yet
                  </p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    Click "Add Team Member" to get started
                  </p>
                </div>
              ) : (
                <div className="border rounded-md overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/40">
                        <th className="text-left p-3 font-medium">Name</th>
                        <th className="text-left p-3 font-medium">Email</th>
                        <th className="text-left p-3 font-medium">Role</th>
                        <th className="text-left p-3 font-medium">
                          Assigned Candidates
                        </th>
                        <th className="text-left p-3 font-medium">
                          Feedback Given
                        </th>
                        <th className="text-right p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamMembers.map((member) => (
                        <tr
                          key={member.id}
                          className="border-t hover:bg-muted/20"
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Avatar className="size-8">
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {member.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{member.name}</span>
                            </div>
                          </td>
                          <td className="p-3">{member.email}</td>
                          <td className="p-3">
                            <Badge
                              variant={
                                member.role === "Admin"
                                  ? "default"
                                  : "secondary"
                              }
                              className="font-normal"
                            >
                              {member.role}
                            </Badge>
                          </td>
                          <td className="p-3">
                            {candidates.filter(
                              (c) => c.assignedTo === member.id
                            ).length > 0 ? (
                              <Badge variant="outline">
                                {
                                  candidates.filter(
                                    (c) => c.assignedTo === member.id
                                  ).length
                                }{" "}
                                candidates
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">
                                None
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            {feedbackRecords.filter(
                              (f) => f.teamMemberId === member.id
                            ).length > 0 ? (
                              <Badge variant="outline">
                                {
                                  feedbackRecords.filter(
                                    (f) => f.teamMemberId === member.id
                                  ).length
                                }{" "}
                                feedback
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">
                                None
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Open menu</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditingTeamMember(member);
                                    setIsEditTeamMemberOpen(true);
                                  }}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() =>
                                    handleDeleteTeamMember(member.id)
                                  }
                                  disabled={
                                    candidates.some(
                                      (c) => c.assignedTo === member.id
                                    ) ||
                                    feedbackRecords.some(
                                      (f) => f.teamMemberId === member.id
                                    )
                                  }
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between text-xs text-muted-foreground pt-4">
              <div>Total: {teamMembers.length} team members</div>
              <div className="flex items-center gap-1">
                <RefreshCw className="size-3" />
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Feedback Dialog */}
      <Dialog open={isViewFeedbackOpen} onOpenChange={setIsViewFeedbackOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Feedback Details</DialogTitle>
            <DialogDescription>
              Feedback submitted by {selectedFeedback?.teamMemberName} on{" "}
              {selectedFeedback?.createdAt &&
                formatDate(selectedFeedback.createdAt)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <h4 className="text-sm font-medium mb-1">Candidate</h4>
              <p className="text-muted-foreground">
                {selectedFeedback?.candidateName}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-1">Rating</h4>
              <div className="flex items-center gap-3">
                <StarRating value={selectedFeedback?.rating || 0} />
                <span className="text-muted-foreground text-sm">
                  {selectedFeedback?.rating}/5
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-1">Recommendation</h4>
              <div>
                {selectedFeedback &&
                  getRecommendationBadge(selectedFeedback.recommendation)}
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="text-sm font-medium mb-1">Strengths</h4>
              <p className="text-muted-foreground text-sm">
                {selectedFeedback?.strengths}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-1">
                Areas for Improvement
              </h4>
              <p className="text-muted-foreground text-sm">
                {selectedFeedback?.weaknesses}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsViewFeedbackOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Team Member Dialog */}
      <Dialog open={isNewTeamMemberOpen} onOpenChange={setIsNewTeamMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Add a new member to your hiring team
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="name" className="text-sm font-medium">
                Name
              </Label>
              <Input
                id="name"
                value={newTeamMember.name}
                onChange={(e) =>
                  setNewTeamMember({ ...newTeamMember, name: e.target.value })
                }
                placeholder="Full name"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={newTeamMember.email}
                onChange={(e) =>
                  setNewTeamMember({ ...newTeamMember, email: e.target.value })
                }
                placeholder="Email address"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="role" className="text-sm font-medium">
                Role
              </Label>
              <Select
                value={newTeamMember.role}
                onValueChange={(value) =>
                  setNewTeamMember({ ...newTeamMember, role: value })
                }
              >
                <SelectTrigger id="role" className="mt-1">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Hiring Manager">Hiring Manager</SelectItem>
                  <SelectItem value="Recruiter">Recruiter</SelectItem>
                  <SelectItem value="Interviewer">Interviewer</SelectItem>
                  <SelectItem value="Team Member">Team Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsNewTeamMemberOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddTeamMember}
              disabled={
                !newTeamMember.name || !newTeamMember.email || isSubmitting
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Member
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Team Member Dialog */}
      <Dialog
        open={isEditTeamMemberOpen}
        onOpenChange={setIsEditTeamMemberOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>
              Update team member information
            </DialogDescription>
          </DialogHeader>

          {editingTeamMember && (
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="edit-name" className="text-sm font-medium">
                  Name
                </Label>
                <Input
                  id="edit-name"
                  value={editingTeamMember.name}
                  onChange={(e) =>
                    setEditingTeamMember({
                      ...editingTeamMember,
                      name: e.target.value,
                    })
                  }
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="edit-email" className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editingTeamMember.email}
                  onChange={(e) =>
                    setEditingTeamMember({
                      ...editingTeamMember,
                      email: e.target.value,
                    })
                  }
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="edit-role" className="text-sm font-medium">
                  Role
                </Label>
                <Select
                  value={editingTeamMember.role}
                  onValueChange={(value) =>
                    setEditingTeamMember({
                      ...editingTeamMember,
                      role: value,
                    })
                  }
                >
                  <SelectTrigger id="edit-role" className="mt-1">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Hiring Manager">
                      Hiring Manager
                    </SelectItem>
                    <SelectItem value="Recruiter">Recruiter</SelectItem>
                    <SelectItem value="Interviewer">Interviewer</SelectItem>
                    <SelectItem value="Team Member">Team Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditTeamMemberOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateTeamMember}
              disabled={
                !editingTeamMember?.name ||
                !editingTeamMember?.email ||
                isSubmitting
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
