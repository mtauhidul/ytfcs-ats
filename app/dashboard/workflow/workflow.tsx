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
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";

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
            color: data.color, // <–– pull in your stored Tailwind string
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
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-24" />
        </div>

        <div className="flex gap-6 overflow-x-auto pb-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="w-64 min-w-[16rem] flex-shrink-0">
              <CardHeader className="flex-row items-center justify-between px-4 py-3">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-12" />
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {[1, 2, 3].map((j) => (
                  <Skeleton key={j} className="h-16 w-full" />
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
        <Button variant="outline" asChild>
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
            className={`h-3.5 w-3.5 ${
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

  return (
    <div className="space-y-6 p-4 md:p-6">
      <Toaster />
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <LayersIcon className="size-6" />
            Application Workflow
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Drag and drop candidates between stages to update their status
          </p>
        </div>
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm">
                  <SettingsIcon className="size-4 mr-2" />
                  <span className="hidden sm:inline">Workflow Settings</span>
                  <span className="inline sm:hidden">Settings</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Coming soon: Customize workflow settings
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Badge
            variant="outline"
            className="text-xs py-1.5 h-9 px-3 mr-2 border-muted font-normal"
          >
            {candidates.length}{" "}
            {candidates.length === 1 ? "candidate" : "candidates"}
          </Badge>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd} onDragStart={onDragStart}>
        <div className="flex gap-4 overflow-x-auto pb-6 -mx-2 px-2 min-h-[calc(100vh-250px)]">
          {stages.map((stage, index) => {
            const stageItems = candidates.filter((c) => c.stageId === stage.id);

            return (
              <Droppable key={stage.id} droppableId={stage.id}>
                {(droppableProvided, snapshot) => (
                  <Card
                    ref={droppableProvided.innerRef}
                    {...droppableProvided.droppableProps}
                    className={`
                      w-72 min-w-[18rem] flex-shrink-0 flex flex-col
                      border-t-4 transition-colors duration-200
                      ${
                        snapshot.isDraggingOver
                          ? "border-t-primary/70 bg-accent/10"
                          : "border-t-primary/30"
                      }
                    `}
                  >
                    <CardHeader className="flex flex-row items-center justify-between p-3 pb-2 gap-2 border-b">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`${stage.color} h-6 w-6 p-0 flex items-center justify-center rounded-md font-medium`}
                        >
                          {index + 1}
                        </Badge>

                        <h2 className="text-md font-medium">{stage.title}</h2>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="h-6 font-medium">
                          {stageItems.length}
                        </Badge>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-muted-foreground hover:text-foreground"
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
                            <TooltipContent>Stage automations</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </CardHeader>

                    <CardContent className="p-3 space-y-2 flex-grow overflow-y-auto max-h-[calc(100vh-350px)]">
                      {stageItems.length === 0 && !snapshot.isDraggingOver && (
                        <div className="flex flex-col items-center justify-center text-center py-6 text-sm text-muted-foreground bg-muted/20 rounded-md h-32">
                          <UserIcon className="size-5 mb-2 opacity-40" />
                          <p>No candidates in this stage</p>
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
                              className={`
                                bg-background rounded-md p-3 border shadow-sm
                                ${
                                  dragSnapshot.isDragging
                                    ? "ring-2 ring-primary/60 shadow-md"
                                    : ""
                                }
                                transition-shadow hover:shadow hover:border-muted
                              `}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-grow">
                                  <div className="flex items-center mb-1.5">
                                    <div
                                      {...dragProvided.dragHandleProps}
                                      className="mr-1.5 opacity-40 hover:opacity-100 transition-opacity p-0.5 cursor-grab active:cursor-grabbing"
                                    >
                                      <GripHorizontalIcon className="size-3.5" />
                                    </div>
                                    <p className="font-medium">
                                      {candidate.name}
                                    </p>
                                  </div>

                                  {/* Show tags if available */}
                                  {candidate.tags &&
                                    candidate.tags.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-2 mb-1">
                                        {candidate.tags
                                          .slice(0, 3)
                                          .map((tag) => (
                                            <Badge
                                              key={tag}
                                              variant="outline"
                                              className="px-1.5 py-0 text-xs"
                                            >
                                              {tag}
                                            </Badge>
                                          ))}
                                        {candidate.tags.length > 3 && (
                                          <Badge
                                            variant="outline"
                                            className="px-1.5 py-0 text-xs"
                                          >
                                            +{candidate.tags.length - 3}
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
                                <div className="text-xs text-muted-foreground mt-2 flex items-center">
                                  <InfoIcon className="size-3 mr-1 opacity-70" />
                                  Updated{" "}
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
                    </CardContent>

                    <CardFooter className="p-2 border-t text-xs text-muted-foreground">
                      {isDragging && snapshot.isDraggingOver ? (
                        <div className="w-full text-center font-medium text-primary py-1">
                          Drop to move to {stage.title}
                        </div>
                      ) : (
                        <div className="w-full text-center py-1">
                          {stageItems.length}{" "}
                          {stageItems.length === 1 ? "candidate" : "candidates"}
                        </div>
                      )}
                    </CardFooter>
                  </Card>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>

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
