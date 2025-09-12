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
  BuildingIcon,
  ChevronDown,
  GripHorizontalIcon,
  InfoIcon,
  KanbanSquareIcon,
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
import { useSearchParams, useNavigate } from "react-router";
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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
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
  
  // Track if job was set from URL to avoid infinite loops
  const [jobSetFromUrl, setJobSetFromUrl] = useState(false);

  // Session storage key for persisting job selection
  const WORKFLOW_JOB_SESSION_KEY = "workflow_selected_job_id";

  // Helper functions for session storage
  const saveJobSelectionToSession = (jobId: string) => {
    try {
      if (typeof window !== 'undefined' && jobId) {
        sessionStorage.setItem(WORKFLOW_JOB_SESSION_KEY, jobId);
        console.log("📱 Saved job selection to session:", jobId);
      }
    } catch (error) {
      console.warn("Failed to save job selection to session storage:", error);
    }
  };

  const getJobSelectionFromSession = (): string | null => {
    try {
      if (typeof window !== 'undefined') {
        const savedJobId = sessionStorage.getItem(WORKFLOW_JOB_SESSION_KEY);
        console.log("📱 Retrieved job selection from session:", savedJobId);
        return savedJobId;
      }
    } catch (error) {
      console.warn("Failed to retrieve job selection from session storage:", error);
    }
    return null;
  };

  const clearJobSelectionFromSession = () => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(WORKFLOW_JOB_SESSION_KEY);
        console.log("📱 Cleared job selection from session");
      }
    } catch (error) {
      console.warn("Failed to clear job selection from session storage:", error);
    }
  };

  // Function to handle job selection changes (both from dropdown and URL)
  const handleJobChange = (jobId: string, updateUrl = true) => {
    setSelectedJobId(jobId);
    
    // Save to session storage for persistence within the session
    saveJobSelectionToSession(jobId);
    
    if (updateUrl && jobId) {
      // Update URL without causing a page reload
      navigate(`/dashboard/workflow?job=${jobId}`, { replace: true });
    }
  };

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

  // Handle URL parameters for auto-selecting job (only on initial load or URL change)
  useEffect(() => {
    const jobIdFromUrl = searchParams.get('job');
    
    // Only set from URL if we haven't already set it from URL, or if it's a different job
    if (jobIdFromUrl && (!jobSetFromUrl || jobIdFromUrl !== selectedJobId)) {
      // Verify the job exists in the jobs list before selecting it
      if (jobs.length > 0) {
        const jobExists = jobs.some(job => job.id === jobIdFromUrl);
        if (jobExists) {
          handleJobChange(jobIdFromUrl, false); // Don't update URL since we're reading from URL
          setJobSetFromUrl(true);
          console.log("📍 Auto-selected job from URL parameter:", jobIdFromUrl);
        } else {
          console.warn("⚠️ Job from URL parameter not found:", jobIdFromUrl);
          // Clear the invalid job parameter from URL and session
          navigate('/dashboard/workflow', { replace: true });
          clearJobSelectionFromSession();
        }
      } else if (!jobSetFromUrl) {
        // Jobs not loaded yet, set the selectedJobId anyway - it will be validated when jobs load
        setSelectedJobId(jobIdFromUrl);
        setJobSetFromUrl(true);
        console.log("📍 Pre-selected job from URL parameter (pending validation):", jobIdFromUrl);
      }
    } else if (!jobIdFromUrl && !selectedJobId && jobs.length > 0 && !jobSetFromUrl) {
      // No URL parameter - check if we should restore from session
      const savedJobId = getJobSelectionFromSession();
      if (savedJobId && jobs.some(job => job.id === savedJobId)) {
        console.log("📱 Restoring job from session (URL effect):", savedJobId);
        handleJobChange(savedJobId);
      }
    }
  }, [searchParams, jobs, selectedJobId, jobSetFromUrl, navigate]);

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
      
      // Handle job selection with priority order:
      // 1. URL parameter (highest priority)
      // 2. Session storage (medium priority) 
      // 3. No auto-selection (let user choose)
      const jobIdFromUrl = searchParams.get('job');
      
      if (jobIdFromUrl) {
        // URL has job parameter - validate it exists
        const jobExists = jobList.some(job => job.id === jobIdFromUrl);
        if (jobExists && jobIdFromUrl !== selectedJobId) {
          handleJobChange(jobIdFromUrl, false); // Don't update URL since we're reading from URL
        } else if (!jobExists) {
          // Invalid job in URL - clear it and check session storage
          navigate('/dashboard/workflow', { replace: true });
          clearJobSelectionFromSession();
        }
      } else if (!selectedJobId && jobList.length > 0) {
        // No URL parameter and no current selection - check session storage
        const savedJobId = getJobSelectionFromSession();
        if (savedJobId) {
          const savedJobExists = jobList.some(job => job.id === savedJobId);
          if (savedJobExists) {
            console.log("📱 Restoring job selection from session:", savedJobId);
            handleJobChange(savedJobId);
          } else {
            console.log("📱 Saved job no longer exists, clearing session");
            clearJobSelectionFromSession();
            // Don't auto-select first job - let user choose
          }
        }
        // If no saved job or saved job doesn't exist, don't auto-select anything
        // This ensures users must manually select a job in new sessions
      }
      
      setLoading(false);
    });
    return () => unsub();
  }, [selectedJobId, searchParams, navigate]);

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

  // Initialize job selection from session storage on component mount
  useEffect(() => {
    // This effect runs once on component mount to restore session if available
    const savedJobId = getJobSelectionFromSession();
    if (savedJobId && !selectedJobId && jobs.length === 0) {
      // Jobs not loaded yet, pre-set the selection
      console.log("📱 Pre-loading job selection from session:", savedJobId);
      setSelectedJobId(savedJobId);
    }
  }, []); // Empty dependency array - runs only on mount

  // Create default stages for a job if none exist
  const createDefaultStagesForJob = async (jobId: string) => {
    const selectedJobTitle = jobs.find(j => j.id === jobId)?.title || 'Selected Job';
    
    const defaultStages = [
      { title: "Applied", color: "bg-blue-50 border-blue-200 text-blue-700", order: 1 },
      { title: "Phone Screen", color: "bg-yellow-50 border-yellow-200 text-yellow-700", order: 2 },
      { title: "Interview", color: "bg-purple-50 border-purple-200 text-purple-700", order: 3 },
      { title: "Final Review", color: "bg-orange-50 border-orange-200 text-orange-700", order: 4 },
      { title: "Offer", color: "bg-green-50 border-green-200 text-green-700", order: 5 },
    ];

    try {
      toast.loading("Creating workflow stages...", { id: "create-stages" });
      
      const promises = defaultStages.map((stage) =>
        addDoc(collection(db, "stages"), {
          ...stage,
          jobId,
          createdAt: new Date().toISOString(),
        })
      );
      
      await Promise.all(promises);
      
      toast.success(`Created default workflow for "${selectedJobTitle}"`, { 
        id: "create-stages",
        description: `Added ${defaultStages.length} workflow stages`
      });
    } catch (error) {
      console.error("Error creating default stages:", error);
      toast.error("Failed to create workflow stages", { 
        id: "create-stages",
        description: "Please try again or contact support if the issue persists"
      });
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
          `Moved ${candidateName} successfully`,
          {
            description: `From "${sourceStage}" to "${destStage}"`,
            duration: 3000,
          }
        );
      }
    } catch (error) {
      console.error("Error updating candidate stage:", error);
      toast.error("Failed to move candidate", {
        description: "Please try again or refresh the page",
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
      <div className="p-6">
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div>
                  <Skeleton className="h-6 w-32 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <Skeleton className="h-10 w-80" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-[600px] border-border/60">
              <CardHeader className="flex-row items-center justify-between p-6 border-b border-border/30">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-8 rounded-full" />
                </div>
                <Skeleton className="h-6 w-6 rounded" />
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="p-4 border border-border/30 rounded-lg">
                    <Skeleton className="h-4 w-32 mb-3" />
                    <div className="flex gap-2 mb-3">
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <Skeleton className="h-3 w-full mb-2" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
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
        <div className="p-6 bg-gray-50 rounded-lg mb-6 border border-gray-200">
          <BriefcaseIcon className="size-12 text-gray-600 mx-auto" />
        </div>
        <h2 className="text-2xl font-semibold mb-3 text-foreground">No Jobs Available</h2>
        <p className="text-muted-foreground text-center max-w-md mb-8 leading-relaxed">
          You need to create job positions before you can manage workflows. Start by creating your first job posting.
        </p>
        <Button asChild className="bg-primary hover:bg-primary/90">
          <a href="/dashboard/jobs">
            <Plus className="size-4 mr-2" />
            Create First Job
          </a>
        </Button>
      </div>
    );
  }

  const selectedJob = jobs.find((j) => j.id === selectedJobId);

  return (
    <div className="flex-grow overflow-hidden p-2">
      <Toaster />

      {/* Clean Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex flex-col gap-4">
            {/* Title Row */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <KanbanSquareIcon className="size-5 text-gray-600" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Job Workflow</h1>
                <p className="text-sm text-gray-600">
                  Track candidates through your hiring pipeline
                </p>
              </div>
            </div>

            {/* Controls Row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full">
              <Select value={selectedJobId} onValueChange={handleJobChange}>
                <SelectTrigger className="w-full sm:w-64 bg-white border-gray-300">
                  <SelectValue placeholder="Select a job..." />
                </SelectTrigger>
                <SelectContent>
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      <div className="flex flex-col items-start py-1">
                        <span className="font-medium text-gray-900">{job.title}</span>
                        {job.department && (
                          <span className="text-xs text-gray-500">
                            {job.department}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 size-4" />
                <Input
                  placeholder="Search candidates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-48 bg-white border-gray-300"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="size-3" />
                  </Button>
                )}
              </div>
              
              <Button variant="outline" size="sm" asChild className="bg-white hover:bg-gray-50">
                <a href="/dashboard/workflow/management">
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Workflows
                </a>
              </Button>
              
              {selectedJobId && stages.length === 0 && !stagesLoading && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => createDefaultStagesForJob(selectedJobId)}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Plus className="size-4 mr-2" />
                  Create Stages
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {!selectedJobId ? (
        <div className="flex flex-col items-center justify-center h-[50vh] p-6">
          <div className="p-6 bg-gray-50 rounded-lg mb-6 border border-gray-200">
            <BriefcaseIcon className="size-12 text-gray-600 mx-auto" />
          </div>
          <h2 className="text-2xl font-semibold mb-3 text-foreground">Select a Job Position</h2>
          <p className="text-muted-foreground text-center max-w-md leading-relaxed">
            Choose a job from the dropdown above to view and manage its workflow stages and candidates.
          </p>
        </div>
      ) : stagesLoading ? (
        <div className="flex items-center justify-center h-[50vh]">
          <div className="text-center">
            <div className="p-4 bg-gray-50 rounded-lg mb-4 w-fit mx-auto border border-gray-200">
              <Loader2Icon className="size-8 animate-spin text-gray-600" />
            </div>
            <p className="text-muted-foreground font-medium">Loading workflow...</p>
          </div>
        </div>
      ) : !stages.length ? (
        <div className="flex flex-col items-center justify-center h-[50vh] p-6">
          <div className="p-6 bg-gray-50 rounded-lg mb-6 border border-gray-200">
            <LayersIcon className="size-12 text-gray-600 mx-auto" />
          </div>
          <h2 className="text-2xl font-semibold mb-3 text-foreground">No Workflow Stages</h2>
          <p className="text-muted-foreground text-center max-w-md mb-8 leading-relaxed">
            This job doesn't have any workflow stages configured. Create a default workflow or use a template to get started.
          </p>
          <div className="flex gap-4">
            <Button 
              onClick={() => createDefaultStagesForJob(selectedJobId)}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="size-4 mr-2" />
              Create Default Workflow
            </Button>
            <Button variant="outline" asChild className="bg-white hover:bg-gray-50">
              <a href="/dashboard/workflow/management">
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
          className="overflow-x-auto overflow-y-hidden h-[calc(100vh-240px)] pb-6"
        >
          <DragDropContext onDragEnd={onDragEnd} onDragStart={onDragStart}>
            <div className="flex gap-6 min-w-max p-2">
              {stages.map((stage) => {
                const stageItems = getCandidatesForStage(stage.id);
                const headerBgClass = getBoardHeaderColor(stage.color);

                return (
                  <div key={stage.id} className="w-full min-w-[300px] md:min-w-[340px] lg:min-w-[360px]">
                    <Droppable droppableId={stage.id}>
                      {(droppableProvided, snapshot) => (
                        <div
                          className={cn(
                            "flex flex-col rounded-lg border border-gray-200 h-[calc(100vh-240px)] bg-white",
                            snapshot.isDraggingOver && "border-blue-300 bg-blue-50"
                          )}
                        >
                          {/* Stage Header */}
                          <div
                            className={cn(
                              "p-4 flex items-center justify-between border-b border-gray-200",
                              headerBgClass
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{stage.title}</span>
                              <Badge 
                                variant="secondary" 
                                className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 border-0"
                              >
                                {stageItems.length}
                              </Badge>
                            </div>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                                >
                                  <MoreHorizontal className="size-4" />
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
                            className="flex-1 overflow-y-auto p-4 space-y-3"
                            style={{
                              maxHeight: "calc(100vh - 340px)",
                              overflowY: "auto",
                            }}
                          >
                            {stageItems.length === 0 && !snapshot.isDraggingOver && (
                              <div className="flex flex-col items-center justify-center text-center py-12 text-sm text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                                <UserIcon className="size-8 mb-3 text-gray-400" />
                                <p className="font-medium">No candidates yet</p>
                                <p className="text-xs mt-1">Drag candidates here</p>
                                {isDragging && (
                                  <p className="text-xs mt-3 text-blue-600 font-medium bg-blue-50 px-3 py-1 rounded border border-blue-200">
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
                                      "bg-white border border-gray-200 p-4 rounded-lg cursor-grab active:cursor-grabbing transition-colors duration-200 hover:border-gray-300",
                                      draggableSnapshot.isDragging &&
                                        "border-blue-300 bg-blue-50"
                                    )}
                                  >
                                    {/* Header */}
                                    <div className="flex items-center justify-between mb-3">
                                      <h4 className="font-medium text-sm text-gray-900 truncate">
                                        {candidate.name}
                                      </h4>
                                      <GripHorizontalIcon className="size-3 text-gray-400 flex-shrink-0" />
                                    </div>

                                    {/* Tags */}
                                    {candidate.tags && candidate.tags.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5 mb-3">
                                        {candidate.tags.slice(0, 3).map((tag) => (
                                          <Badge
                                            key={tag}
                                            variant="secondary"
                                            className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 border-0"
                                          >
                                            {tag}
                                          </Badge>
                                        ))}
                                        {candidate.tags.length > 3 && (
                                          <Badge
                                            variant="outline"
                                            className="text-xs px-2 py-0.5 border-gray-300"
                                          >
                                            +{candidate.tags.length - 3}
                                          </Badge>
                                        )}
                                      </div>
                                    )}

                                    {/* Additional Info */}
                                    {(candidate.company || candidate.position) && (
                                      <div className="text-xs text-gray-600 mb-3 space-y-1">
                                        {candidate.position && (
                                          <div className="font-medium">
                                            {candidate.position}
                                          </div>
                                        )}
                                        {candidate.company && (
                                          <div>
                                            at {candidate.company}
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Footer */}
                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                                      <RatingStars rating={candidate.rating} />

                                      {candidate.updatedAt && (
                                        <div className="text-xs text-gray-500">
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
                          <div className="p-3 border-t border-border/30 text-xs text-muted-foreground text-center bg-muted/10 rounded-b-xl">
                            {isDragging && snapshot.isDraggingOver ? (
                              <div className="font-semibold text-primary animate-pulse">
                                Drop to move to {stage.title}
                              </div>
                            ) : (
                              <div className="font-medium">
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
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BellIcon className="size-5 text-primary" />
              </div>
              <div>
                <div>Stage Automations</div>
                <div className="text-sm font-normal text-muted-foreground">
                  {openAutomationFor?.title}
                </div>
              </div>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed">
              Configure automated notifications, email templates, or custom actions for this stage.
              Set up workflows to streamline your recruitment process.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-6">
            <div className="flex items-center justify-center h-32 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <div className="text-center">
                <div className="p-3 bg-white rounded-lg mb-3 w-fit mx-auto border border-gray-200">
                  <Loader2Icon className="size-8 text-gray-400 animate-spin" />
                </div>
                <p className="text-muted-foreground font-medium">
                  Automation features coming soon
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Advanced workflow automation in development
                </p>
              </div>
            </div>
          </div>

          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="hover:bg-accent/80">Close</AlertDialogCancel>
            <AlertDialogAction disabled className="bg-primary/50">
              Configure Automations
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
