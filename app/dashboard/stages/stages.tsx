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
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  GripVertical,
  Info,
  Layers2Icon,
  Loader2,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  ShieldAlert,
  SortAscIcon,
  TrashIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Toaster, toast } from "sonner";
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
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import type { Stage } from "~/types";

export default function StagesPage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

  // Fetch stages in real-time, ordered by `order`
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
            color: data.color || "", // provide default if missing
          } as Stage;
        })
      );
    });
    return () => unsub();
  }, []);

  const filteredStages = stages.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  // Add new stage at the end
  const handleCreate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newTitle.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const maxOrder = stages.length
        ? Math.max(...stages.map((s) => s.order))
        : 0;

      // Generate a default color based on order
      const defaultColors = [
        "bg-blue-50 border-blue-200 text-blue-700",
        "bg-indigo-50 border-indigo-200 text-indigo-700",
        "bg-violet-50 border-violet-200 text-violet-700",
        "bg-purple-50 border-purple-200 text-purple-700",
        "bg-emerald-50 border-emerald-200 text-emerald-700",
        "bg-green-50 border-green-200 text-green-700",
        "bg-amber-50 border-amber-200 text-amber-700",
        "bg-rose-50 border-rose-200 text-rose-700",
        "bg-red-50 border-red-200 text-red-700",
        "bg-orange-50 border-orange-200 text-orange-700",
        "bg-yellow-50 border-yellow-200 text-yellow-700",
        "bg-gray-50 border-gray-200 text-gray-700",
        "bg-slate-50 border-slate-200 text-slate-700",
        "bg-zinc-50 border-zinc-200 text-zinc-700",
        "bg-neutral-50 border-neutral-200 text-neutral-700",
        "bg-stone-50 border-stone-200 text-stone-700",
        "bg-cyan-50 border-cyan-200 text-cyan-700",
        "bg-teal-50 border-teal-200 text-teal-700",
        "bg-lime-50 border-lime-200 text-lime-700",
      ];
      const color = defaultColors[maxOrder % defaultColors.length];

      await addDoc(collection(db, "stages"), {
        title: newTitle.trim(),
        order: maxOrder + 1,
        color: color, // Store the color
        createdAt: new Date().toISOString(),
      });

      setNewTitle("");
      toast.success("Stage added successfully");
    } catch (error) {
      toast.error("Failed to add stage");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (id: string, title: string) => {
    setEditingId(id);
    setEditingTitle(title);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingTitle("");
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingTitle.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await updateDoc(doc(db, "stages", id), {
        title: editingTitle.trim(),
        updatedAt: new Date().toISOString(),
      });

      setEditingId(null);
      setEditingTitle("");
      toast.success("Stage updated successfully");
    } catch (error) {
      toast.error("Failed to update stage");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = (id: string) => {
    setDeleteId(id);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await deleteDoc(doc(db, "stages", deleteId));
      setIsDeleteOpen(false);
      toast.success("Stage deleted successfully");
    } catch (error) {
      toast.error("Failed to delete stage");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fix for the move functionality
  const handleMove = async (stageId: string, direction: -1 | 1) => {
    if (isSubmitting || isReordering) return;

    // Find current stage and its index
    const currentStage = stages.find((s) => s.id === stageId);
    if (!currentStage) return;

    const currentIndex = stages.findIndex((s) => s.id === stageId);
    const nextIndex = currentIndex + direction;

    // Check if move is valid
    if (nextIndex < 0 || nextIndex >= stages.length) return;

    const nextStage = stages[nextIndex];

    try {
      setIsReordering(true);

      // Swap the orders
      const currentOrder = currentStage.order;
      const nextOrder = nextStage.order;

      // Update current stage
      await updateDoc(doc(db, "stages", currentStage.id), {
        order: nextOrder,
      });

      // Update target stage
      await updateDoc(doc(db, "stages", nextStage.id), {
        order: currentOrder,
      });

      toast.success("Stage reordered successfully");
    } catch (error) {
      toast.error("Failed to reorder stages");
      console.error(error);
    } finally {
      setIsReordering(false);
    }
  };

  // Reorder all stages to fix any gaps or inconsistencies
  const handleFixOrdering = async () => {
    if (isSubmitting || isReordering || stages.length < 2) return;

    try {
      setIsReordering(true);

      // Sort stages by current order
      const orderedStages = [...stages].sort((a, b) => a.order - b.order);

      // Update each stage with sequential order
      const updates = orderedStages.map((stage, index) => {
        const newOrder = index + 1;
        if (stage.order !== newOrder) {
          return updateDoc(doc(db, "stages", stage.id), {
            order: newOrder,
          });
        }
        return Promise.resolve();
      });

      await Promise.all(updates);
      toast.success("Stages reordered successfully");
    } catch (error) {
      toast.error("Failed to reorder stages");
      console.error(error);
    } finally {
      setIsReordering(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Toaster position="top-right" />

      <Card className="w-full shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4">
          <div>
            <CardTitle className="flex items-center gap-3 text-xl font-semibold">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary border border-primary/20 shadow-sm">
                <Layers2Icon className="h-4 w-4" />
              </div>
              <span>Workflow Stages</span>
            </CardTitle>
            <CardDescription>
              Define and organize your hiring pipeline stages
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs py-1 px-2 h-7">
              {stages.length} {stages.length === 1 ? "stage" : "stages"}
            </Badge>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={isReordering || isSubmitting}
                    onClick={handleFixOrdering}
                  >
                    {isReordering ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <SortAscIcon className="size-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Fix stage ordering</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* New Stage Form */}
          <Card className="border-dashed bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <form onSubmit={handleCreate} className="flex gap-3">
                <div className="relative flex-1">
                  <Input
                    placeholder="Enter new stage name..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="pr-10"
                    disabled={isSubmitting}
                  />
                  {newTitle && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 size-9"
                      onClick={() => setNewTitle("")}
                      disabled={isSubmitting}
                    >
                      <XIcon className="size-4" />
                    </Button>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={!newTitle.trim() || isSubmitting}
                  className="gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span className="hidden sm:inline">Adding...</span>
                    </>
                  ) : (
                    <>
                      <PlusIcon className="size-4" />
                      <span className="hidden sm:inline">Add Stage</span>
                      <span className="inline sm:hidden">Add</span>
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Search */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search stages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-10"
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 size-7 opacity-70 hover:opacity-100"
                onClick={() => setSearch("")}
              >
                <XIcon className="size-3.5" />
              </Button>
            )}
          </div>

          {/* Stages List */}
          <ScrollArea className="h-[420px] pr-4 -mr-4">
            {isReordering && (
              <div className="mb-2 bg-muted/30 p-2 text-xs text-center flex items-center justify-center gap-2 rounded-md">
                <Loader2 className="size-3 animate-spin" />
                <span>Reordering stages...</span>
              </div>
            )}

            <div className="space-y-2">
              {filteredStages.length > 0 ? (
                filteredStages.map((stage, i) => {
                  const stageNumber = i + 1;
                  const isFirst = i === 0;
                  const isLast = i === filteredStages.length - 1;

                  return (
                    <div
                      key={stage.id}
                      className="group flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center">
                                <GripVertical className="size-4 opacity-40" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p className="text-xs">
                                Drag to reorder (coming soon)
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <div
                          className={`
                            flex items-center justify-center size-6
                            rounded-full font-medium text-xs
                            ${stage.color}
                            drop-shadow-sm
                          `}
                        >
                          {stageNumber}
                        </div>
                      </div>

                      {editingId === stage.id ? (
                        <div className="flex-1 flex items-center gap-2">
                          <Input
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            className="flex-1"
                            autoFocus
                            disabled={isSubmitting}
                          />
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={handleCancelEdit}
                              className="size-8"
                              disabled={isSubmitting}
                            >
                              <XIcon className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleSaveEdit(stage.id)}
                              disabled={!editingTitle.trim() || isSubmitting}
                              className="size-8 text-green-500"
                            >
                              {isSubmitting ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <CheckIcon className="size-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <span className="font-medium flex-1 truncate">
                            {stage.title}
                          </span>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleMove(stage.id, -1)}
                                    disabled={
                                      isFirst || isSubmitting || isReordering
                                    }
                                    className="size-7 text-muted-foreground"
                                  >
                                    <ArrowUpIcon className="size-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p>Move up</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleMove(stage.id, 1)}
                                    disabled={
                                      isLast || isSubmitting || isReordering
                                    }
                                    className="size-7 text-muted-foreground"
                                  >
                                    <ArrowDownIcon className="size-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p>Move down</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      handleStartEdit(stage.id, stage.title)
                                    }
                                    disabled={isSubmitting || isReordering}
                                    className="size-7 text-muted-foreground"
                                  >
                                    <PencilIcon className="size-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p>Edit stage</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      handleConfirmDelete(stage.id)
                                    }
                                    disabled={isSubmitting || isReordering}
                                    className="size-7 text-destructive"
                                  >
                                    <TrashIcon className="size-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p>Delete stage</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                  {stages.length === 0 ? (
                    <>
                      <div className="bg-muted rounded-full p-3 mb-3">
                        <PlusIcon className="size-6 opacity-40" />
                      </div>
                      <h3 className="text-base font-medium mb-1">
                        No stages defined
                      </h3>
                      <p className="text-sm max-w-xs text-muted-foreground/70">
                        Create your first stage to start building your hiring
                        workflow
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="bg-muted rounded-full p-3 mb-3">
                        <SearchIcon className="size-6 opacity-40" />
                      </div>
                      <h3 className="text-base font-medium mb-1">
                        No results found
                      </h3>
                      <p className="text-sm max-w-xs text-muted-foreground/70">
                        No stages match your search "{search}"
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>

          {stages.length > 0 && (
            <div className="bg-muted/30 p-3 rounded-lg text-sm flex items-start gap-2 text-muted-foreground">
              <ShieldAlert className="size-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">
                  Workflow Information
                </p>
                <p>
                  Stages represent the steps in your hiring process. Candidates
                  will move from one stage to the next as they progress through
                  your pipeline. You can reorder stages by using the up and down
                  arrows.
                </p>
              </div>
            </div>
          )}
        </CardContent>

        <Separator />

        <CardFooter className="flex justify-between text-xs text-muted-foreground pt-4">
          <div className="flex items-center gap-1">
            <Info className="size-3 opacity-70" />
            <span>
              {filteredStages.length} of {stages.length} stages
              {search && " matching your search"}
            </span>
          </div>
          <span>Last updated: {new Date().toLocaleDateString()}</span>
        </CardFooter>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this stage?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Any candidates currently in this
              stage will need to be reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-1">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Deleting...</span>
                </div>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
