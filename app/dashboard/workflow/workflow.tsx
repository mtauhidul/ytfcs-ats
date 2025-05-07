"use client";

import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import {
  BellIcon,
  GripHorizontalIcon,
  InfoIcon,
  LayersIcon,
  Loader2Icon,
  MoreHorizontal,
  Search,
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
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";

type Stage = {
  id: string;
  title: string;
  order: number;
  color: string;
};

type Candidate = {
  id: string;
  name: string;
  stageId: string;
  tags?: string[];
  rating?: number;
  updatedAt?: string;
  company?: string;
  position?: string;
  reviewers?: string[];
};

export default function WorkflowPage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAutomationFor, setOpenAutomationFor] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  // Add this at the top of your component
  const [dragScroll, setDragScroll] = useState({ x: 0, y: 0 });
  const boardRef = useRef<HTMLDivElement>(null);

  // Add this function
  const handleDragMove = (e: MouseEvent) => {
    if (!boardRef.current || !isDragging) return;

    const board = boardRef.current;
    const rect = board.getBoundingClientRect();

    // Calculate scroll zones (20px from edges)
    const scrollZone = 20;
    const scrollSpeed = 5;

    let scrollX = 0;
    let scrollY = 0;

    // Horizontal scrolling
    if (e.clientX < rect.left + scrollZone) {
      scrollX = -scrollSpeed;
    } else if (e.clientX > rect.right - scrollZone) {
      scrollX = scrollSpeed;
    }

    // Vertical scrolling
    if (e.clientY < rect.top + scrollZone) {
      scrollY = -scrollSpeed;
    } else if (e.clientY > rect.bottom - scrollZone) {
      scrollY = scrollSpeed;
    }

    setDragScroll({ x: scrollX, y: scrollY });
  };

  // Add event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleDragMove);
      return () => {
        window.removeEventListener("mousemove", handleDragMove);
      };
    }
  }, [isDragging]);

  // Add this effect for auto-scrolling during drag
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

  // Subscribe to stages
  useEffect(() => {
    const q = query(collection(db, "stages"), orderBy("order", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setStages(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: data.title,
            order: data.order,
            color: data.color,
          };
        })
      );
    });
    return () => unsub();
  }, []);

  // Subscribe to candidates
  useEffect(() => {
    const q = query(collection(db, "candidates"), orderBy("name", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setCandidates(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Candidate, "id">),
        }))
      );
      setLoading(false);
    });
    return () => unsub();
  }, []);

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

  // Render loading state
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

  if (!stages.length) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] p-6">
        <div className="bg-muted/50 p-4 rounded-full mb-4">
          <LayersIcon className="size-10 text-muted-foreground/50" />
        </div>
        <h2 className="text-xl font-medium mb-2">No stages defined</h2>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          You need to define stages in your hiring pipeline before you can
          visualize your workflow.
        </p>
        <Button asChild>
          <a href="/dashboard/stages">Go to Stages Configuration</a>
        </Button>
      </div>
    );
  }

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
                <stop offset="50%" className="fill-amber-400" />
                <stop offset="50%" className="fill-gray-300" />
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
          <svg key={i} className="h-3 w-3 text-gray-300" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        );
      }
    }

    return <div className="flex gap-0.5">{stars}</div>;
  };

  // Get board header color
  const getBoardHeaderColor = (color: string) => {
    if (!color) return "bg-zinc-100 dark:bg-zinc-800";

    const bgClass = color.split(" ")[0];

    if (bgClass && bgClass.startsWith("bg-")) {
      return bgClass;
    }

    const colorMatch = color.match(/(?:bg|border|text)-([a-z]+)-\d+/);
    if (colorMatch && colorMatch[1]) {
      return `bg-${colorMatch[1]}-100`;
    }

    return "bg-zinc-100";
  };

  // Filter candidates based on search
  const filteredCandidates = candidates.filter((candidate) => {
    const matchesSearch = candidate.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Get candidates for a stage
  const getCandidatesForStage = (stageId: string) => {
    return filteredCandidates.filter((c) => c.stageId === stageId);
  };

  // Group reviewers
  const getReviewerAvatars = (reviewers?: string[]) => {
    if (!reviewers || reviewers.length === 0) return null;

    const displayReviewers = reviewers.slice(0, 3);
    const remainingCount = reviewers.length - 3;

    return (
      <div className="flex -space-x-1">
        {displayReviewers.map((reviewer, index) => (
          <div
            key={reviewer}
            className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium"
            style={{ zIndex: 10 - index }}
          >
            {reviewer.charAt(0).toUpperCase()}
          </div>
        ))}
        {remainingCount > 0 && (
          <div className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs font-medium">
            +{remainingCount}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-grow overflow-hidden p-2">
      <Toaster />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-6">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <LayersIcon className="size-5" />
            Application Workflow
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Drag candidates between stages to update their status
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-[400px]">
          {/* Search input */}
          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search candidates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 h-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <Badge
            variant="secondary"
            className="text-xs py-1 h-9 px-3 flex items-center"
          >
            {candidates.length} candidates
          </Badge>
        </div>
      </div>

      {/* Kanban Board */}
      <div
        ref={boardRef}
        className="overflow-x-auto overflow-y-hidden pb-4 max-w-[78vw] h-[calc(100vh-200px)]"
      >
        <div className="flex gap-4 min-w-[100vw]">
          <DragDropContext onDragEnd={onDragEnd} onDragStart={onDragStart}>
            {stages.map((stage) => {
              const stageItems = getCandidatesForStage(stage.id);
              const headerBgClass = getBoardHeaderColor(stage.color);

              return (
                <div
                  key={stage.id}
                  className="w-full min-w-[280px] md:min-w-[320px]"
                >
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
                            <span className="text-sm font-medium">
                              {stage.title}
                            </span>
                            <Badge
                              variant="secondary"
                              className="h-5 text-xs px-2 bg-white/70"
                            >
                              {stageItems.length}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() =>
                                setOpenAutomationFor({
                                  id: stage.id,
                                  title: stage.title,
                                })
                              }
                            >
                              <BellIcon className="size-3" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                >
                                  <MoreHorizontal className="size-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  Configure automations
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  Manage stage
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Candidates List */}
                        {/* In the Droppable section, update the scrollable area */}
                        <div
                          ref={droppableProvided.innerRef}
                          {...droppableProvided.droppableProps}
                          className="flex-1 overflow-y-auto p-2 space-y-2"
                          style={{
                            maxHeight: "calc(100vh - 300px)", // Adjust this based on your header heights
                            overflowY: "auto",
                          }}
                        >
                          {stageItems.length === 0 &&
                            !snapshot.isDraggingOver && (
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
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  className={cn(
                                    "bg-white rounded-md p-3 border",
                                    dragSnapshot.isDragging
                                      ? "shadow-lg ring-2 ring-primary/50"
                                      : "hover:border-primary/50"
                                  )}
                                >
                                  {/* Candidate Header */}
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-1 mb-1">
                                        <GripHorizontalIcon className="size-3 opacity-40" />
                                        <h3 className="font-medium text-sm">
                                          {candidate.name}
                                        </h3>
                                      </div>

                                      {candidate.position && (
                                        <p className="text-xs text-muted-foreground">
                                          {candidate.position}
                                          {candidate.company &&
                                            ` at ${candidate.company}`}
                                        </p>
                                      )}
                                    </div>

                                    {getReviewerAvatars(candidate.reviewers)}
                                  </div>

                                  {/* Tags */}
                                  {candidate.tags &&
                                    candidate.tags.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mb-2">
                                        {candidate.tags
                                          .slice(0, 2)
                                          .map((tag) => (
                                            <Badge
                                              key={tag}
                                              variant="secondary"
                                              className="px-1.5 py-0 text-[10px] h-4"
                                            >
                                              {tag}
                                            </Badge>
                                          ))}
                                        {candidate.tags.length > 2 && (
                                          <Badge
                                            variant="secondary"
                                            className="px-1.5 py-0 text-[10px] h-4"
                                          >
                                            +{candidate.tags.length - 2}
                                          </Badge>
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
          </DragDropContext>
        </div>
      </div>

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
