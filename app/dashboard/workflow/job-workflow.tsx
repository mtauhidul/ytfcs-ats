"use client";

import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  BellIcon,
  BriefcaseIcon,
  ChevronDown,
  GripHorizontalIcon,
  InfoIcon,
  LayersIcon,
  Loader2Icon,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  UserIcon,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast, Toaster } from "sonner";
import { db } from "~/lib/firebase";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import type { Job, Candidate, Stage } from "~/types";

interface JobWorkflowCandidate {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  tags?: string[];
  category: string;
  rating?: number;
  stageId: string;
  stageColor?: string;
  experience?: string;
  education?: string;
  skills?: string[];
  notes?: string;
  documents?: any[];
  jobId?: string;
  updatedAt?: string;
  company?: string;
  position?: string;
  reviewers?: string[];
}

interface JobInfo {
  id: string;
  title: string;
  department?: string;
  status?: string;
}

export default function WorkflowPage() {
  const [jobs, setJobs] = useState<JobInfo[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [stages, setStages] = useState<Stage[]>([]);
  const [candidates, setCandidates] = useState<JobWorkflowCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [stagesLoading, setStagesLoading] = useState(false);
  const [openAutomationFor, setOpenAutomationFor] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dragScroll, setDragScroll] = useState({ x: 0, y: 0 });
  const boardRef = useRef<HTMLDivElement>(null);

  // Auto-scroll during drag
  const handleDragMove = (e: MouseEvent) => {
    if (!boardRef.current || !isDragging) return;

    const board = boardRef.current;
    const rect = board.getBoundingClientRect();
    const scrollZone = 20;
    const scrollSpeed = 5;

    let scrollX = 0;
    let scrollY = 0;

    if (e.clientX < rect.left + scrollZone) {
      scrollX = -scrollSpeed;
    } else if (e.clientX > rect.right - scrollZone) {
      scrollX = scrollSpeed;
    }

    if (e.clientY < rect.top + scrollZone) {
      scrollY = -scrollSpeed;
    } else if (e.clientY > rect.bottom - scrollZone) {
      scrollY = scrollSpeed;
    }

    setDragScroll({ x: scrollX, y: scrollY });
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleDragMove);
      return () => {
        window.removeEventListener("mousemove", handleDragMove);
      };
    }
  }, [isDragging]);

  useEffect(() => {
    if (!isDragging || !boardRef.current) return;

    const board = boardRef.current;
    let animationFrame: number;

    const autoScroll = () => {
      if (dragScroll.x !== 0) {
        board.scrollLeft += dragScroll.x;
      }
      if (dragScroll.y !== 0) {
        board.scrollTop += dragScroll.y;
      }
      animationFrame = requestAnimationFrame(autoScroll);
    };

    if (isDragging) {
      animationFrame = requestAnimationFrame(autoScroll);
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isDragging, dragScroll]);

  // Subscribe to jobs
  useEffect(() => {
    const q = query(collection(db, "jobs"));
    const unsub = onSnapshot(q, (snap) => {
      const jobList = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title || "Untitled Job",
          department: data.department,
          status: data.status,
        } as JobInfo;
      });
      setJobs(jobList);
      
      // Auto-select first job if none selected and jobs exist
      if (!selectedJobId && jobList.length > 0) {
        setSelectedJobId(jobList[0].id);
      }
      
      setLoading(false);
    });
    return () => unsub();
  }, [selectedJobId]);

  // Subscribe to stages for the selected job
  useEffect(() => {
    if (!selectedJobId) {
      setStages([]);
      return;
    }

    console.log("Loading workflow for job:", selectedJobId);
    setStagesLoading(true);
    
    // First, find the job workflow document for this job
    const jobWorkflowQuery = query(
      collection(db, "jobWorkflows"),
      where("jobId", "==", selectedJobId)
    );

    const unsubJobWorkflow = onSnapshot(jobWorkflowQuery, (jobWorkflowSnap) => {
      console.log("Job workflow query result:", jobWorkflowSnap.docs.length, "docs found");
      
      if (jobWorkflowSnap.empty) {
        // No workflow found for this job
        console.log("No job workflow found for job:", selectedJobId);
        setStages([]);
        setStagesLoading(false);
        return;
      }

      const jobWorkflowDoc = jobWorkflowSnap.docs[0];
      const jobWorkflowData = jobWorkflowDoc.data();
      console.log("Job workflow data:", jobWorkflowData);
      
      if (!jobWorkflowData.stageIds || jobWorkflowData.stageIds.length === 0) {
        console.log("No stageIds found in job workflow");
        setStages([]);
        setStagesLoading(false);
        return;
      }

      console.log("Loading stages for IDs:", jobWorkflowData.stageIds);

      // Load stages by their IDs from the workflow
      const stagesQuery = query(
        collection(db, "stages")
      );

      const unsubStages = onSnapshot(stagesQuery, (stagesSnap) => {
        console.log("All stages loaded:", stagesSnap.docs.length);
        console.log("All stage IDs in database:", stagesSnap.docs.map(d => d.id));
        
        const allStages = stagesSnap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: data.title,
            order: data.order,
            color: data.color,
          };
        });

        console.log("All stages data:", allStages);

        // Filter stages to only include those in the workflow
        const workflowStages = jobWorkflowData.stageIds
          .map((stageId: string) => {
            const stage = allStages.find(s => s.id === stageId);
            if (!stage) {
              console.log("Stage not found for ID:", stageId);
            } else {
              console.log("Found stage for ID:", stageId, stage);
            }
            return stage;
          })
          .filter(Boolean)
          .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

        console.log("Final workflow stages:", workflowStages);
        setStages(workflowStages);
        setStagesLoading(false);
      });

      // Store unsubStages to clean up later
      return unsubStages;
    });

    return () => {
      unsubJobWorkflow();
    };
  }, [selectedJobId]);

  // Subscribe to candidates for the selected job
  useEffect(() => {
    if (!selectedJobId) {
      setCandidates([]);
      return;
    }

    const q = query(
      collection(db, "candidates"),
      where("jobId", "==", selectedJobId),
      orderBy("name", "asc")
    );
    
    const unsub = onSnapshot(q, (snap) => {
      setCandidates(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<JobWorkflowCandidate, "id">),
        }))
      );
    });
    return () => unsub();
  }, [selectedJobId]);

  // Create default stages for a job if none exist
  const createDefaultStagesForJob = async (jobId: string) => {
    const defaultStages = [
      { title: "Applied", color: "bg-blue-50 border-blue-200 text-blue-700", order: 1 },
      { title: "Phone Screen", color: "bg-yellow-50 border-yellow-200 text-yellow-700", order: 2 },
      { title: "Interview", color: "bg-purple-50 border-purple-200 text-purple-700", order: 3 },
      { title: "Final Review", color: "bg-orange-50 border-orange-200 text-orange-700", order: 4 },
      { title: "Offer", color: "bg-green-50 border-green-200 text-green-700", order: 5 },
    ];

    try {
      const promises = defaultStages.map((stage) =>
        addDoc(collection(db, "stages"), {
          ...stage,
          jobId,
          createdAt: new Date().toISOString(),
        })
      );
      
      await Promise.all(promises);
      toast.success("Created default workflow stages for this job");
    } catch (error) {
      console.error("Error creating default stages:", error);
      toast.error("Failed to create default stages");
    }
  };

  // Handle drag-and-drop events
  const onDragEnd = async (result: DropResult) => {
    setIsDragging(false);

    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )
      return;

    const sourceStage = stages.find((s) => s.id === source.droppableId)?.title;
    const destStage = stages.find(
      (s) => s.id === destination.droppableId
    )?.title;
    const candidateName = candidates.find((c) => c.id === draggableId)?.name;

    try {
      await updateDoc(doc(db, "candidates", draggableId), {
        stageId: destination.droppableId,
        updatedAt: new Date().toISOString(),
      });

      if (sourceStage !== destStage) {
        toast.success(
          `Moved ${candidateName} from "${sourceStage}" to "${destStage}"`,
          {
            duration: 3000,
            position: "bottom-right",
          }
        );
      }
    } catch (error) {
      console.error("Error updating candidate stage:", error);
      toast.error("Failed to update candidate stage", {
        position: "bottom-right",
      });
    }
  };

  const onDragStart = () => {
    setIsDragging(true);
  };

  // Filter candidates based on search query
  const filteredCandidates = candidates.filter((candidate) =>
    candidate.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get candidates for a specific stage
  const getCandidatesForStage = (stageId: string) => {
    return filteredCandidates.filter((c) => c.stageId === stageId);
  };

  // Get board header color
  const getBoardHeaderColor = (color: string) => {
    if (!color) return "bg-muted/50 text-muted-foreground border-muted";
    return color;
  };

  // Rating component
  const RatingStars = ({ rating = 0 }: { rating?: number }) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <svg
            key={i}
            className="h-3 w-3 fill-amber-400 text-amber-400"
            viewBox="0 0 24 24"
          >
            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <svg key={i} className="h-3 w-3" viewBox="0 0 24 24">
            <defs>
              <linearGradient id={`half-${i}`}>
                <stop offset="50%" stopColor="#fbbf24" />
                <stop offset="50%" stopColor="#e5e7eb" />
              </linearGradient>
            </defs>
            <path
              fill={`url(#half-${i})`}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        );
      } else {
        stars.push(
          <svg
            key={i}
            className="h-3 w-3 fill-gray-200 text-gray-200"
            viewBox="0 0 24 24"
          >
            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        );
      }
    }

    return <div className="flex gap-0.5">{stars}</div>;
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-24" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-[600px]">
              <CardHeader className="flex-row items-center justify-between p-4">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-12" />
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {[1, 2, 3].map((j) => (
                  <Skeleton key={j} className="h-28 w-full" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!jobs.length) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] p-6">
        <div className="bg-muted/50 p-4 rounded-full mb-4">
          <BriefcaseIcon className="size-10 text-muted-foreground/50" />
        </div>
        <h2 className="text-xl font-medium mb-2">No jobs found</h2>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          You need to create jobs before you can manage workflows.
        </p>
        <Button asChild>
          <a href="/dashboard/jobs">Go to Jobs</a>
        </Button>
      </div>
    );
  }

  const selectedJob = jobs.find((j) => j.id === selectedJobId);

  return (
    <div className="flex-grow overflow-hidden p-2">
      <Toaster />

      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg p-4">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <BriefcaseIcon className="size-5 text-primary" />
            <h1 className="text-lg font-semibold">Workflow</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={selectedJobId} onValueChange={setSelectedJobId}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Select a job" />
              </SelectTrigger>
              <SelectContent>
                {jobs.map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{job.title}</span>
                      {job.department && (
                        <span className="text-xs text-muted-foreground">
                          {job.department}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedJob && (
              <Badge variant="outline">
                {candidates.length} candidates
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" asChild>
            <a href="/dashboard/workflow/management">
              <Settings className="h-4 w-4 mr-2" />
              Manage Workflows
            </a>
          </Button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground size-4" />
            <Input
              placeholder="Search candidates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => setSearchQuery("")}
              >
                <X className="size-3" />
              </Button>
            )}
          </div>
          
          {selectedJobId && stages.length === 0 && !stagesLoading && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => createDefaultStagesForJob(selectedJobId)}
            >
              <Plus className="size-4 mr-1" />
              Create Stages
            </Button>
          )}
        </div>
      </div>

      {!selectedJobId ? (
        <div className="flex flex-col items-center justify-center h-[50vh] p-6">
          <div className="bg-muted/50 p-4 rounded-full mb-4">
            <BriefcaseIcon className="size-10 text-muted-foreground/50" />
          </div>
          <h2 className="text-xl font-medium mb-2">Select a job</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Choose a job from the dropdown above to view and manage its specific workflow stages and candidates.
          </p>
        </div>
      ) : stagesLoading ? (
        <div className="flex items-center justify-center h-[50vh]">
          <div className="text-center">
            <Loader2Icon className="size-8 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">Loading workflow...</p>
          </div>
        </div>
      ) : !stages.length ? (
        <div className="flex flex-col items-center justify-center h-[50vh] p-6">
          <div className="bg-muted/50 p-4 rounded-full mb-4">
            <LayersIcon className="size-10 text-muted-foreground/50" />
          </div>
          <h2 className="text-xl font-medium mb-2">No workflow stages found</h2>
          <p className="text-muted-foreground text-center max-w-md mb-6">
            This job doesn't have any workflow stages. You can create a default workflow or use a template from the workflow management page.
          </p>
          <div className="flex gap-3">
            <Button onClick={() => createDefaultStagesForJob(selectedJobId)}>
              <Plus className="size-4 mr-2" />
              Create Default Workflow
            </Button>
            <Button variant="outline" asChild>
              <a href="/dashboard/workflow-management">
                <Settings className="size-4 mr-2" />
                Use Template
              </a>
            </Button>
          </div>
        </div>
      ) : (
        /* Kanban Board */
        <div
          ref={boardRef}
          className="overflow-x-auto overflow-y-hidden h-[calc(100vh-200px)] pb-4"
        >
          <DragDropContext onDragEnd={onDragEnd} onDragStart={onDragStart}>
            <div className="flex gap-4 min-w-max p-1">
              {stages.map((stage) => {
                const stageItems = getCandidatesForStage(stage.id);
                const headerBgClass = getBoardHeaderColor(stage.color);

                return (
                  <div key={stage.id} className="w-full min-w-[280px] md:min-w-[320px]">
                    <Droppable droppableId={stage.id}>
                      {(droppableProvided, snapshot) => (
                        <div
                          className={cn(
                            "flex flex-col rounded-lg border shadow-sm h-[calc(100vh-200px)] bg-card",
                            snapshot.isDraggingOver && "ring-2 ring-primary/50"
                          )}
                        >
                          {/* Stage Header */}
                          <div
                            className={cn(
                              "p-3 text-center font-medium rounded-t-lg flex items-center justify-between",
                              headerBgClass
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{stage.title}</span>
                              <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                                {stageItems.length}
                              </Badge>
                            </div>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                                >
                                  <MoreHorizontal className="size-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                  onClick={() =>
                                    setOpenAutomationFor({
                                      id: stage.id,
                                      title: stage.title,
                                    })
                                  }
                                >
                                  <BellIcon className="size-4 mr-2" />
                                  Automations
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  <LayersIcon className="size-4 mr-2" />
                                  Manage stage
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Candidates List */}
                          <div
                            ref={droppableProvided.innerRef}
                            {...droppableProvided.droppableProps}
                            className="flex-1 overflow-y-auto p-2 space-y-2"
                            style={{
                              maxHeight: "calc(100vh - 300px)",
                              overflowY: "auto",
                            }}
                          >
                            {stageItems.length === 0 && !snapshot.isDraggingOver && (
                              <div className="flex flex-col items-center justify-center text-center py-8 text-sm text-muted-foreground bg-muted/10 rounded-md">
                                <UserIcon className="size-6 mb-2 opacity-40" />
                                <p>No candidates</p>
                                {isDragging && (
                                  <p className="text-xs mt-1">
                                    Drop here to move to {stage.title}
                                  </p>
                                )}
                              </div>
                            )}

                            {stageItems.map((candidate, idx) => (
                              <Draggable
                                key={candidate.id}
                                draggableId={candidate.id}
                                index={idx}
                              >
                                {(draggableProvided, draggableSnapshot) => (
                                  <div
                                    ref={draggableProvided.innerRef}
                                    {...draggableProvided.draggableProps}
                                    {...draggableProvided.dragHandleProps}
                                    className={cn(
                                      "bg-background p-3 rounded-md border shadow-sm cursor-grab active:cursor-grabbing transition-all duration-200",
                                      draggableSnapshot.isDragging &&
                                        "shadow-lg rotate-2 scale-105 ring-2 ring-primary/50"
                                    )}
                                  >
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <h4 className="font-medium text-sm truncate">
                                          {candidate.name}
                                        </h4>
                                        <GripHorizontalIcon className="size-3 text-muted-foreground/50 flex-shrink-0" />
                                      </div>
                                    </div>

                                    {/* Tags */}
                                    {candidate.tags && candidate.tags.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mb-2">
                                        {candidate.tags.slice(0, 3).map((tag) => (
                                          <Badge
                                            key={tag}
                                            variant="secondary"
                                            className="text-[10px] px-1.5 py-0.5 h-5"
                                          >
                                            {tag}
                                          </Badge>
                                        ))}
                                        {candidate.tags.length > 3 && (
                                          <Badge
                                            variant="outline"
                                            className="text-[10px] px-1.5 py-0.5 h-5"
                                          >
                                            +{candidate.tags.length - 3}
                                          </Badge>
                                        )}
                                      </div>
                                    )}

                                    {/* Additional Info */}
                                    {(candidate.company || candidate.position) && (
                                      <div className="text-xs text-muted-foreground mb-2">
                                        {candidate.position && (
                                          <div>{candidate.position}</div>
                                        )}
                                        {candidate.company && (
                                          <div>at {candidate.company}</div>
                                        )}
                                      </div>
                                    )}

                                    {/* Footer */}
                                    <div className="flex items-center justify-between mt-3 pt-2 border-t">
                                      <RatingStars rating={candidate.rating} />

                                      {candidate.updatedAt && (
                                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                          <InfoIcon className="size-2.5" />
                                          {new Date(
                                            candidate.updatedAt
                                          ).toLocaleDateString()}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}

                            {droppableProvided.placeholder}
                          </div>

                          {/* Stage Footer */}
                          <div className="p-2 border-t text-xs text-muted-foreground text-center bg-muted/20">
                            {isDragging && snapshot.isDraggingOver ? (
                              <div className="font-medium text-primary">
                                Drop to move to {stage.title}
                              </div>
                            ) : (
                              <div>
                                {stageItems.length}{" "}
                                {stageItems.length === 1
                                  ? "candidate"
                                  : "candidates"}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </DragDropContext>
        </div>
      )}

      {/* Stage Automations Dialog */}
      <AlertDialog
        open={Boolean(openAutomationFor)}
        onOpenChange={() => setOpenAutomationFor(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <BellIcon className="size-5" />
              Stage Automations
            </AlertDialogTitle>
            <AlertDialogDescription>
              Configure alerts or automations for the{" "}
              <strong>{openAutomationFor?.title}</strong> stage. Set up
              notifications, email templates, or actions to be triggered
              automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <Loader2Icon className="size-10 text-muted-foreground/40 mx-auto mb-3 animate-spin" />
                <p className="text-muted-foreground">
                  Automation features coming soon
                </p>
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction disabled>
              Configure Automations
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
