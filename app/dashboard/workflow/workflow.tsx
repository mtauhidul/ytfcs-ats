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
  PlusIcon,
  SettingsIcon,
  UserIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
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
import { Skeleton } from "~/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";

type Stage = { id: string; title: string; order: number; color: string };
type Candidate = {
  id: string;
  name: string;
  stageId: string;
  tags?: string[];
  rating?: number;
  updatedAt?: string;
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

    // Return if dropped outside a valid droppable area
    if (!destination) return;

    // Return if the item was dropped in the same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )
      return;

    // Get the stage titles for the toast message
    const sourceStage = stages.find((s) => s.id === source.droppableId)?.title;
    const destStage = stages.find(
      (s) => s.id === destination.droppableId
    )?.title;
    const candidateName = candidates.find((c) => c.id === draggableId)?.name;

    try {
      // Update Firestore
      await updateDoc(doc(db, "candidates", draggableId), {
        stageId: destination.droppableId,
        updatedAt: new Date().toISOString(),
      });

      // Show success toast
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

        <div className="flex gap-3 overflow-x-auto pb-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="w-64 min-w-[16rem] flex-shrink-0">
              <CardHeader className="flex-row items-center justify-between p-2">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-12" />
              </CardHeader>
              <CardContent className="p-2 space-y-2">
                {[1, 2, 3].map((j) => (
                  <Skeleton key={j} className="h-14 w-full" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Render no stages message
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

  // Helper to render rating stars
  const RatingStars = ({ rating = 0 }: { rating?: number }) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            xmlns="http://www.w3.org/2000/svg"
            className={`h-3 w-3 ${
              star <= rating ? "fill-amber-400 text-amber-400" : "text-muted/30"
            }`}
            viewBox="0 0 24 24"
          >
            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        ))}
      </div>
    );
  };

  // Get board background color based on stage color
  const getBoardHeaderColor = (color: string) => {
    if (!color) return "bg-zinc-100 dark:bg-zinc-800"; // Default fallback

    // Extract just the background color class if it exists
    const bgClass = color.split(" ")[0]; // Take the first class from the string

    if (bgClass && bgClass.startsWith("bg-")) {
      // If it's a bg class, use it directly
      return bgClass;
    }

    // Fallback - try to extract color name from any class
    const colorMatch = color.match(/(?:bg|border|text)-([a-z]+)-\d+/);
    if (colorMatch && colorMatch[1]) {
      return `bg-${colorMatch[1]}-100`;
    }

    return "bg-zinc-100"; // Default fallback
  };

  return (
    <div
      className="flex-grow overflow-hidden p-4"
      style={{ maxWidth: "100vw" }}
    >
      <Toaster />
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <LayersIcon className="size-5" />
            Application Workflow
          </h1>
          <p className="text-muted-foreground text-xs mt-1">
            Drag candidates between stages to update their status
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <SettingsIcon className="size-3.5 mr-1.5" />
                  <span className="text-xs">Settings</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Configure workflow settings
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Badge variant="secondary" className="text-xs py-1 h-7 px-2">
            {candidates.length} candidates
          </Badge>
          <Button variant="default" size="sm" className="h-8">
            <PlusIcon className="size-3.5 mr-1.5" />
            <span className="text-xs">Add Candidate</span>
          </Button>
        </div>
      </div>

      {/* Main container - needs to have a fixed height and overflow-auto for auto-scroll to work */}
      <div className="h-[calc(100vh-120px)] overflow-hidden">
        <DragDropContext onDragEnd={onDragEnd} onDragStart={onDragStart}>
          <div className="flex gap-3 h-full overflow-x-auto pb-2">
            {stages.map((stage, index) => {
              const stageItems = candidates.filter(
                (c) => c.stageId === stage.id
              );
              const headerBgClass = getBoardHeaderColor(stage.color);

              return (
                <Droppable key={stage.id} droppableId={stage.id}>
                  {(droppableProvided, snapshot) => (
                    <div
                      className={cn(
                        "flex flex-col rounded-lg border shadow-sm h-full min-w-[280px] w-[280px] flex-shrink-0 bg-card",
                        snapshot.isDraggingOver && "ring-1 ring-primary/50"
                      )}
                    >
                      <div
                        className={cn(
                          "p-2 text-center font-medium rounded-t-lg flex items-center justify-between",
                          headerBgClass
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          <Badge
                            className={cn(
                              "size-5 p-0 flex items-center justify-center rounded-md",
                              stage.color
                            )}
                          >
                            {index + 1}
                          </Badge>
                          <span className="text-sm">{stage.title}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="secondary"
                            className="h-5 text-xs px-1.5"
                          >
                            {stageItems.length}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-5 text-muted-foreground hover:text-foreground"
                            onClick={() =>
                              setOpenAutomationFor({
                                id: stage.id,
                                title: stage.title,
                              })
                            }
                          >
                            <BellIcon className="size-3" />
                          </Button>
                        </div>
                      </div>

                      <div
                        ref={droppableProvided.innerRef}
                        {...droppableProvided.droppableProps}
                        className="p-2 space-y-2 flex-grow overflow-y-auto"
                      >
                        {stageItems.length === 0 &&
                          !snapshot.isDraggingOver && (
                            <div className="flex flex-col items-center justify-center text-center py-4 text-xs text-muted-foreground bg-muted/10 rounded-md h-20">
                              <UserIcon className="size-4 mb-1 opacity-40" />
                              <p>No candidates</p>
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
                                  "bg-card rounded-md p-2 border text-sm",
                                  dragSnapshot.isDragging
                                    ? "ring-2 ring-primary/50 shadow-md"
                                    : "hover:border-muted"
                                )}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-grow">
                                    <div className="flex items-center mb-1">
                                      <GripHorizontalIcon className="size-3 mr-1 opacity-40" />
                                      <p className="font-medium truncate text-xs">
                                        {candidate.name}
                                      </p>
                                    </div>

                                    {/* Show tags if available */}
                                    {candidate.tags &&
                                      candidate.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {candidate.tags
                                            .slice(0, 2)
                                            .map((tag) => (
                                              <Badge
                                                key={tag}
                                                variant="outline"
                                                className="px-1 py-0 text-[10px]"
                                              >
                                                {tag}
                                              </Badge>
                                            ))}
                                          {candidate.tags.length > 2 && (
                                            <Badge
                                              variant="outline"
                                              className="px-1 py-0 text-[10px]"
                                            >
                                              +{candidate.tags.length - 2}
                                            </Badge>
                                          )}
                                        </div>
                                      )}
                                  </div>

                                  {candidate.rating !== undefined && (
                                    <RatingStars rating={candidate.rating} />
                                  )}
                                </div>

                                {/* Last updated information */}
                                {candidate.updatedAt && (
                                  <div className="text-[10px] text-muted-foreground mt-1 flex items-center">
                                    <InfoIcon className="size-2.5 mr-0.5 opacity-70" />
                                    {new Date(
                                      candidate.updatedAt
                                    ).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {droppableProvided.placeholder}
                      </div>

                      <div className="p-1.5 border-t text-xs text-muted-foreground text-center">
                        {isDragging && snapshot.isDraggingOver ? (
                          <div className="font-medium text-primary text-xs">
                            Drop to move to {stage.title}
                          </div>
                        ) : (
                          <div className="text-xs">
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
              );
            })}
          </div>
        </DragDropContext>
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
