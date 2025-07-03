"use client";

import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { pointerOutsideOfPreview } from "@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { toast, Toaster } from "sonner";
import { db } from "~/lib/firebase";

import {
  ArrowRightIcon,
  BellIcon,
  BuildingIcon,
  CalendarIcon,
  ChevronDownIcon,
  FilterIcon,
  GripVerticalIcon,
  InfoIcon,
  LayersIcon,
  MenuIcon,
  MoreHorizontal,
  PlusIcon,
  Search,
  StarIcon,
  TagIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";

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
import { Card } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
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

type DragState = {
  isDragging: boolean;
  draggedItem: string | null;
  draggedOverStage: string | null;
};

type FilterState = {
  rating?: number;
  tags?: string[];
  hasReviewers?: boolean;
};

export default function ModernKanbanBoard() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedItem: null,
    draggedOverStage: null,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [filterState, setFilterState] = useState<FilterState>({});
  const [isMobile, setIsMobile] = useState(false);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [openAutomationFor, setOpenAutomationFor] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());
  const stageRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Detect mobile screen
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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

  // Setup drag and drop
  useEffect(() => {
    const cleanups: (() => void)[] = [
      monitorForElements({
        onDragStart: ({ source }) => {
          setDragState({
            isDragging: true,
            draggedItem: source.data.candidateId as string,
            draggedOverStage: null,
          });
        },
        onDrop: ({ source, location }) => {
          setDragState({
            isDragging: false,
            draggedItem: null,
            draggedOverStage: null,
          });

          const destination = location.current.dropTargets[0];
          if (!destination) return;

          const candidateId = source.data.candidateId as string;
          const newStageId = destination.data.stageId as string;
          const oldStageId = source.data.stageId as string;

          if (newStageId === oldStageId) return;

          handleMoveCandidate(candidateId, newStageId, oldStageId);
        },
      }),
    ];

    if (boardRef.current) {
      cleanups.push(
        autoScrollForElements({
          element: boardRef.current,
        })
      );
    }

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  // Setup draggable items
  useEffect(() => {
    const cleanupFunctions: (() => void)[] = [];

    candidates.forEach((candidate) => {
      const element = cardRefs.current.get(candidate.id);
      if (!element) return;

      const cleanup = draggable({
        element,
        dragHandle: element.querySelector("[data-drag-handle]") as HTMLElement,
        getInitialData: () => ({
          candidateId: candidate.id,
          stageId: candidate.stageId,
        }),
        onGenerateDragPreview: ({ nativeSetDragImage }) => {
          setCustomNativeDragPreview({
            nativeSetDragImage,
            getOffset: pointerOutsideOfPreview({
              x: "16px",
              y: "8px",
            }),
            render: ({ container }) => {
              const preview = element.cloneNode(true) as HTMLElement;
              preview.style.width = `${element.offsetWidth}px`;
              preview.style.transform = "rotate(5deg)";
              preview.style.opacity = "0.8";
              container.appendChild(preview);
              // No return value needed
            },
          });
        },
      });

      cleanupFunctions.push(cleanup);
    });

    return () => {
      cleanupFunctions.forEach((cleanup) => cleanup());
    };
  }, [candidates]);

  // Setup drop targets
  useEffect(() => {
    const cleanupFunctions: (() => void)[] = [];

    stages.forEach((stage) => {
      const element = stageRefs.current.get(stage.id);
      if (!element) return;

      const cleanup = dropTargetForElements({
        element,
        getData: () => ({ stageId: stage.id }),
        onDragEnter: () => {
          setDragState((prev) => ({
            ...prev,
            draggedOverStage: stage.id,
          }));
        },
        onDragLeave: () => {
          setDragState((prev) => ({
            ...prev,
            draggedOverStage: null,
          }));
        },
      });

      cleanupFunctions.push(cleanup);
    });

    return () => {
      cleanupFunctions.forEach((cleanup) => cleanup());
    };
  }, [stages]);

  const handleMoveCandidate = async (
    candidateId: string,
    newStageId: string,
    oldStageId: string
  ) => {
    const candidate = candidates.find((c) => c.id === candidateId);
    const sourceStage = stages.find((s) => s.id === oldStageId);
    const destStage = stages.find((s) => s.id === newStageId);

    if (!candidate || !sourceStage || !destStage) return;

    try {
      await updateDoc(doc(db, "candidates", candidateId), {
        stageId: newStageId,
        updatedAt: new Date().toISOString(),
      });

      toast.success(
        `Moved ${candidate.name} from "${sourceStage.title}" to "${destStage.title}"`,
        {
          duration: 3000,
          position: "bottom-right",
        }
      );
    } catch (error) {
      console.error("Error updating candidate stage:", error);
      toast.error("Failed to update candidate stage", {
        position: "bottom-right",
      });
    }
  };

  // Filter candidates
  const filteredCandidates = candidates.filter((candidate) => {
    const matchesSearch = candidate.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    const matchesRating = filterState.rating
      ? (candidate.rating || 0) >= filterState.rating
      : true;

    const matchesTags =
      filterState.tags && filterState.tags.length > 0
        ? filterState.tags.some((tag) => candidate.tags?.includes(tag))
        : true;

    const matchesReviewers =
      filterState.hasReviewers !== undefined
        ? filterState.hasReviewers
          ? candidate.reviewers && candidate.reviewers.length > 0
          : !candidate.reviewers || candidate.reviewers.length === 0
        : true;

    return matchesSearch && matchesRating && matchesTags && matchesReviewers;
  });

  const getCandidatesForStage = (stageId: string) => {
    return filteredCandidates.filter((c) => c.stageId === stageId);
  };

  // Rating component
  const RatingStars = ({ rating = 0 }: { rating?: number }) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <StarIcon
          key={i}
          className={cn(
            "h-3 w-3",
            i <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300"
          )}
        />
      );
    }
    return <div className="flex gap-0.5">{stars}</div>;
  };

  // Reviewer avatars
  const getReviewerAvatars = (reviewers?: string[]) => {
    if (!reviewers || reviewers.length === 0) return null;

    const displayReviewers = reviewers.slice(0, 3);
    const remainingCount = reviewers.length - 3;

    return (
      <div className="flex -space-x-1">
        {displayReviewers.map((reviewer, index) => (
          <TooltipProvider key={reviewer}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 border-2 border-white flex items-center justify-center text-xs font-medium text-white shadow-sm"
                  style={{ zIndex: 10 - index }}
                >
                  {reviewer.charAt(0).toUpperCase()}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{reviewer}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
        {remainingCount > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-6 h-6 rounded-full bg-gray-400 border-2 border-white flex items-center justify-center text-xs font-medium text-white shadow-sm">
                  +{remainingCount}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>+{remainingCount} more reviewers</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="flex gap-4 overflow-x-auto">
          {[1, 2, 3].map((i) => (
            <div key={i} className="min-w-[300px] space-y-3">
              <Skeleton className="h-12 w-full" />
              <div className="space-y-2">
                {[1, 2, 3].map((j) => (
                  <Skeleton key={j} className="h-32 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (!stages.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <div className="bg-muted/50 p-6 rounded-full mb-4">
          <LayersIcon className="size-12 text-muted-foreground/50" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">No stages defined</h2>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          You need to define stages in your hiring pipeline before you can
          visualize your workflow.
        </p>
        <Button asChild size="lg">
          <a href="/dashboard/stages">
            <PlusIcon className="size-4 mr-2" />
            Create Stages
          </a>
        </Button>
      </div>
    );
  }

  // Mobile view
  if (isMobile) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <Toaster />

        {/* Mobile Header */}
        <div className="bg-white border-b p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <LayersIcon className="size-5" />
              Workflow
            </h1>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <FilterIcon className="size-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MenuIcon className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>View Settings</DropdownMenuItem>
                  <DropdownMenuItem>Export Data</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Manage Stages</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search candidates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="bg-gray-50 -mx-4 -mb-4 p-4 border-t">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Min Rating:</label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        {filterState.rating || "Any"}{" "}
                        <ChevronDownIcon className="size-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() =>
                          setFilterState((prev) => ({
                            ...prev,
                            rating: undefined,
                          }))
                        }
                      >
                        Any Rating
                      </DropdownMenuItem>
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <DropdownMenuItem
                          key={rating}
                          onClick={() =>
                            setFilterState((prev) => ({ ...prev, rating }))
                          }
                        >
                          {rating}+ Stars
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stage Navigation */}
        <div className="bg-white border-b">
          <ScrollArea className="w-full">
            <div className="flex gap-2 p-2">
              {stages.map((stage) => {
                const count = getCandidatesForStage(stage.id).length;
                return (
                  <Button
                    key={stage.id}
                    variant={selectedStage === stage.id ? "default" : "outline"}
                    size="sm"
                    className="shrink-0"
                    onClick={() => setSelectedStage(stage.id)}
                  >
                    {stage.title}
                    <Badge variant="secondary" className="ml-2">
                      {count}
                    </Badge>
                  </Button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Selected Stage Content */}
        {selectedStage && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-3">
              {getCandidatesForStage(selectedStage).map((candidate) => (
                <Card key={candidate.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium">{candidate.name}</h3>
                      {candidate.position && (
                        <p className="text-sm text-muted-foreground">
                          {candidate.position}
                          {candidate.company && ` at ${candidate.company}`}
                        </p>
                      )}
                    </div>
                    {getReviewerAvatars(candidate.reviewers)}
                  </div>

                  {candidate.tags && candidate.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {candidate.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <RatingStars rating={candidate.rating} />
                    {candidate.updatedAt && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <CalendarIcon className="size-3" />
                        {new Date(candidate.updatedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop view
  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <Toaster />

      {/* Desktop Header - Fixed with proper responsive layout */}
      <div className="bg-white border-b p-4 flex-shrink-0">
        <div className="w-full">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                <LayersIcon className="size-6" />
                Application Workflow
              </h1>
              <p className="text-muted-foreground mt-1">
                Drag candidates between stages to update their status
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:flex-shrink-0">
              {/* Search */}
              <div className="relative sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search candidates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full"
                />
              </div>

              <div className="flex items-center gap-3">
                {/* Filter Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="shrink-0">
                      <FilterIcon className="size-4 mr-2" />
                      Filter
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    <DropdownMenuLabel>Filter by Rating</DropdownMenuLabel>
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <DropdownMenuCheckboxItem
                        key={rating}
                        checked={filterState.rating === rating}
                        onCheckedChange={(checked) =>
                          setFilterState((prev) => ({
                            ...prev,
                            rating: checked ? rating : undefined,
                          }))
                        }
                      >
                        {rating}+ Stars
                      </DropdownMenuCheckboxItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Filter by Reviewers</DropdownMenuLabel>
                    <DropdownMenuCheckboxItem
                      checked={filterState.hasReviewers === true}
                      onCheckedChange={(checked) =>
                        setFilterState((prev) => ({
                          ...prev,
                          hasReviewers: checked ? true : undefined,
                        }))
                      }
                    >
                      Has Reviewers
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={filterState.hasReviewers === false}
                      onCheckedChange={(checked) =>
                        setFilterState((prev) => ({
                          ...prev,
                          hasReviewers: checked ? false : undefined,
                        }))
                      }
                    >
                      No Reviewers
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Stats */}
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant="secondary"
                    className="px-3 py-1 whitespace-nowrap"
                  >
                    {filteredCandidates.length} candidates
                  </Badge>
                  <Badge
                    variant="outline"
                    className="px-3 py-1 whitespace-nowrap"
                  >
                    {stages.length} stages
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board Container - Scrollable only horizontally */}
      <div className="flex-1 overflow-hidden">
        <div
          ref={boardRef}
          className="h-full overflow-x-auto overflow-y-hidden"
          style={{
            scrollbarWidth: "thin",
          }}
        >
          <div
            className="flex gap-4 p-4 h-full"
            style={{
              minWidth: `${
                stages.length * 320 + (stages.length - 1) * 16 + 32
              }px`,
            }}
          >
            {stages.map((stage) => {
              const stageItems = getCandidatesForStage(stage.id);
              const isDropTarget = dragState.draggedOverStage === stage.id;

              return (
                <div
                  key={stage.id}
                  ref={(el) => {
                    if (el) stageRefs.current.set(stage.id, el);
                  }}
                  className={cn(
                    "flex flex-col bg-white rounded-lg border shadow-sm transition-all duration-200 flex-shrink-0",
                    isDropTarget && "ring-2 ring-blue-500 ring-offset-2",
                    dragState.isDragging && "opacity-90"
                  )}
                  style={{
                    width: "320px",
                    height: "calc(100vh - 140px)", // Adjusted for larger header
                  }}
                >
                  {/* Stage Header */}
                  <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: stage.color || "#6b7280" }}
                      />
                      <h3 className="font-semibold text-gray-900">
                        {stage.title}
                      </h3>
                      <Badge variant="secondary" className="px-2 py-1">
                        {stageItems.length}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setOpenAutomationFor({
                                  id: stage.id,
                                  title: stage.title,
                                })
                              }
                            >
                              <BellIcon className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Configure automations</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Add Candidate</DropdownMenuItem>
                          <DropdownMenuItem>
                            Configure Automations
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>Manage Stage</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Candidates List */}
                  <div className="flex-1 overflow-y-auto p-3">
                    <div className="space-y-3">
                      {stageItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <div className="bg-gray-100 p-4 rounded-full mb-3">
                            <UserIcon className="size-8 text-gray-400" />
                          </div>
                          <p className="text-sm text-gray-500">No candidates</p>
                          {isDropTarget && (
                            <p className="text-xs text-blue-600 mt-1 font-medium">
                              Drop here to move to {stage.title}
                            </p>
                          )}
                        </div>
                      ) : (
                        stageItems.map((candidate) => (
                          <div
                            key={candidate.id}
                            ref={(el) => {
                              if (el) cardRefs.current.set(candidate.id, el);
                            }}
                            className={cn(
                              "group bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing",
                              dragState.draggedItem === candidate.id &&
                                "opacity-50 rotate-2 scale-105"
                            )}
                          >
                            {/* Drag Handle */}
                            <div
                              data-drag-handle
                              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 mb-2"
                            >
                              <div className="flex items-center justify-center">
                                <GripVerticalIcon className="size-4 text-gray-400" />
                              </div>
                            </div>

                            {/* Candidate Info */}
                            <div className="space-y-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-gray-900 truncate">
                                    {candidate.name}
                                  </h4>
                                  {candidate.position && (
                                    <div className="flex items-center gap-1 mt-1">
                                      <BuildingIcon className="size-3 text-gray-400" />
                                      <p className="text-xs text-gray-600 truncate">
                                        {candidate.position}
                                        {candidate.company &&
                                          ` at ${candidate.company}`}
                                      </p>
                                    </div>
                                  )}
                                </div>
                                {getReviewerAvatars(candidate.reviewers)}
                              </div>

                              {/* Tags */}
                              {candidate.tags && candidate.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {candidate.tags.slice(0, 3).map((tag) => (
                                    <Badge
                                      key={tag}
                                      variant="secondary"
                                      className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200"
                                    >
                                      <TagIcon className="size-2.5 mr-1" />
                                      {tag}
                                    </Badge>
                                  ))}
                                  {candidate.tags.length > 3 && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs px-2 py-0.5"
                                    >
                                      +{candidate.tags.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              )}

                              {/* Footer */}
                              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                <div className="flex items-center gap-2">
                                  <RatingStars rating={candidate.rating} />
                                  {candidate.rating && (
                                    <span className="text-xs text-gray-500">
                                      {candidate.rating.toFixed(1)}
                                    </span>
                                  )}
                                </div>

                                {candidate.updatedAt && (
                                  <div className="flex items-center gap-1 text-xs text-gray-400">
                                    <CalendarIcon className="size-3" />
                                    <span>
                                      {new Date(
                                        candidate.updatedAt
                                      ).toLocaleDateString()}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Stage Footer */}
                  <div className="p-3 border-t bg-gray-50 rounded-b-lg flex-shrink-0">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        {stageItems.length}{" "}
                        {stageItems.length === 1 ? "candidate" : "candidates"}
                      </span>

                      {isDropTarget && dragState.isDragging && (
                        <div className="flex items-center gap-1 text-blue-600 font-medium">
                          <ArrowRightIcon className="size-3" />
                          Drop to move here
                        </div>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        <PlusIcon className="size-3 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stage Automations Dialog */}
      <AlertDialog
        open={Boolean(openAutomationFor)}
        onOpenChange={() => setOpenAutomationFor(null)}
      >
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <BellIcon className="size-5" />
              Stage Automations - {openAutomationFor?.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Configure alerts, notifications, and automations for candidates in
              the <strong>{openAutomationFor?.title}</strong> stage.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Email Notifications */}
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <BellIcon className="size-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Email Notifications</h3>
                    <p className="text-xs text-muted-foreground">
                      Send automatic emails
                    </p>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Candidate enters stage</span>
                    <div className="w-8 h-4 bg-gray-200 rounded-full"></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Daily digest</span>
                    <div className="w-8 h-4 bg-gray-200 rounded-full"></div>
                  </div>
                </div>
              </Card>

              {/* Slack Integration */}
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <UsersIcon className="size-4 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Slack Integration</h3>
                    <p className="text-xs text-muted-foreground">
                      Team notifications
                    </p>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Post to #hiring</span>
                    <div className="w-8 h-4 bg-gray-200 rounded-full"></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Mention reviewers</span>
                    <div className="w-8 h-4 bg-gray-200 rounded-full"></div>
                  </div>
                </div>
              </Card>

              {/* Auto-assignment */}
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <UserIcon className="size-4 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Auto-assignment</h3>
                    <p className="text-xs text-muted-foreground">
                      Assign reviewers automatically
                    </p>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Round-robin assignment</span>
                    <div className="w-8 h-4 bg-gray-200 rounded-full"></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Skills-based matching</span>
                    <div className="w-8 h-4 bg-gray-200 rounded-full"></div>
                  </div>
                </div>
              </Card>

              {/* Calendar Integration */}
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <CalendarIcon className="size-4 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Calendar Integration</h3>
                    <p className="text-xs text-muted-foreground">
                      Schedule interviews
                    </p>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Auto-schedule interviews</span>
                    <div className="w-8 h-4 bg-gray-200 rounded-full"></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Send calendar invites</span>
                    <div className="w-8 h-4 bg-gray-200 rounded-full"></div>
                  </div>
                </div>
              </Card>
            </div>

            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <InfoIcon className="size-4 text-amber-600" />
                <span className="font-medium text-amber-800">Coming Soon</span>
              </div>
              <p className="text-sm text-amber-700">
                Automation features are currently in development. You'll be
                notified when they become available.
              </p>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction disabled>Save Configuration</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
