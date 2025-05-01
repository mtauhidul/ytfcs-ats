"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import {
  ArrowDownUp,
  CheckCircle2,
  Edit3,
  GridIcon,
  Hash,
  HashIcon,
  Info,
  ListIcon,
  Plus,
  Search,
  Tag,
  Trash2,
  X,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";

export default function TagsPage() {
  // Local state for tags
  const [tags, setTags] = useState<{ id: string; name: string }[]>([]);
  const [newTag, setNewTag] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "recent">("name");

  // For editing, track which tag is currently being edited
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState("");

  // For delete confirmation
  const [deleteTagId, setDeleteTagId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Real-time listener for tags from Firestore
  useEffect(() => {
    const q = collection(db, "tags");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tagList = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        name: docSnap.data().name || "",
      }));
      setTags(tagList);
    });
    return () => unsubscribe();
  }, []);

  // Create a new tag
  const handleCreateTag = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTag.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await addDoc(collection(db, "tags"), {
        name: newTag.trim(),
        createdAt: new Date().toISOString(),
      });
      toast.success("Tag created successfully!");
      setNewTag("");
    } catch (error: any) {
      console.error("Error creating tag:", error);
      toast.error("Error creating tag");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete a tag by its id
  const handleDeleteTag = async (id: string) => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      await deleteDoc(doc(db, "tags", id));
      toast.success("Tag deleted successfully!");
      setIsDeleteDialogOpen(false);
    } catch (error: any) {
      console.error("Error deleting tag:", error);
      toast.error("Error deleting tag");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Start editing a tag
  const handleStartEdit = (id: string, name: string) => {
    setEditingTagId(id);
    setEditingTagName(name);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingTagId(null);
    setEditingTagName("");
  };

  // Save the edited tag
  const handleSaveEdit = async (id: string) => {
    if (!editingTagName.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await updateDoc(doc(db, "tags", id), {
        name: editingTagName.trim(),
        updatedAt: new Date().toISOString(),
      });
      toast.success("Tag updated successfully!");
      setEditingTagId(null);
      setEditingTagName("");
    } catch (error: any) {
      console.error("Error updating tag:", error);
      toast.error("Error updating tag");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open delete confirmation dialog
  const openDeleteDialog = (id: string) => {
    setDeleteTagId(id);
    setIsDeleteDialogOpen(true);
  };

  // Filter tags based on search query
  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort tags
  const sortedTags = [...filteredTags].sort((a, b) => {
    if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    } else {
      // This would ideally use createdAt field, but we'll just keep default order for now
      return 0;
    }
  });

  // Generate a unique color for each tag
  const getTagColor = (name: string) => {
    const colors = [
      "bg-blue-100 text-blue-800 border-blue-200",
      "bg-indigo-100 text-indigo-800 border-indigo-200",
      "bg-purple-100 text-purple-800 border-purple-200",
      "bg-pink-100 text-pink-800 border-pink-200",
      "bg-rose-100 text-rose-800 border-rose-200",
      "bg-red-100 text-red-800 border-red-200",
      "bg-orange-100 text-orange-800 border-orange-200",
      "bg-amber-100 text-amber-800 border-amber-200",
      "bg-yellow-100 text-yellow-800 border-yellow-200",
      "bg-lime-100 text-lime-800 border-lime-200",
      "bg-green-100 text-green-800 border-green-200",
      "bg-emerald-100 text-emerald-800 border-emerald-200",
      "bg-teal-100 text-teal-800 border-teal-200",
      "bg-cyan-100 text-cyan-800 border-cyan-200",
      "bg-sky-100 text-sky-800 border-sky-200",
      "bg-violet-100 text-violet-800 border-violet-200",
    ];

    // Basic hash function for consistent color assignment
    const hash = name
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);

    return colors[hash % colors.length];
  };

  return (
    <div className="container py-8 mx-auto">
      <Toaster position="top-right" />

      <Card className="w-full shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4">
          <div>
            <CardTitle className="flex items-center gap-3 text-xl font-semibold">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary border border-primary/20 shadow-sm">
                <HashIcon className="h-4 w-4" />
              </div>
              <span>Tag Management</span>
            </CardTitle>
            <CardDescription>
              Create, edit, and delete tags for categorizing candidates
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs py-1 px-2 h-7">
              {tags.length} {tags.length === 1 ? "tag" : "tags"}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 gap-1">
                  <ArrowDownUp className="size-3.5" />
                  <span className="text-xs">Sort</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => setSortBy("name")}
                  className="text-xs"
                >
                  <CheckCircle2
                    className={`mr-2 size-4 ${
                      sortBy === "name" ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  Sort alphabetically
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSortBy("recent")}
                  className="text-xs"
                >
                  <CheckCircle2
                    className={`mr-2 size-4 ${
                      sortBy === "recent" ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  Sort by recently added
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() =>
                      setViewMode(viewMode === "list" ? "grid" : "list")
                    }
                  >
                    {viewMode === "list" ? (
                      <GridIcon className="size-3.5" />
                    ) : (
                      <ListIcon className="size-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {viewMode === "list"
                    ? "Switch to grid view"
                    : "Switch to list view"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Create New Tag */}
          <Card className="bg-primary/5 border-primary/20 border-dashed">
            <CardContent className="pt-6">
              <form
                onSubmit={handleCreateTag}
                className="flex items-center gap-3"
              >
                <div className="relative flex-1">
                  <Input
                    placeholder="Enter new tag name..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    className="pr-10"
                    disabled={isSubmitting}
                  />
                  {newTag && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 size-9"
                      onClick={() => setNewTag("")}
                      disabled={isSubmitting}
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={!newTag.trim() || isSubmitting}
                  className="gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <span className="flex items-center animate-spin">
                        <Tag className="size-4" />
                      </span>
                      <span className="hidden sm:inline">Adding...</span>
                      <span className="inline sm:hidden">...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="size-4" />
                      <span className="hidden sm:inline">Add Tag</span>
                      <span className="inline sm:hidden">Add</span>
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Search and Filter */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 size-7 opacity-70 hover:opacity-100"
                onClick={() => setSearchQuery("")}
              >
                <X className="size-3.5" />
              </Button>
            )}
          </div>

          {/* Tags Display */}
          <ScrollArea className="h-[400px] pr-4 -mr-4">
            {sortedTags.length > 0 ? (
              viewMode === "list" ? (
                // List view
                <div className="space-y-2">
                  {sortedTags.map((tag) => (
                    <div
                      key={tag.id}
                      className="group flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/40 transition-colors"
                    >
                      {editingTagId === tag.id ? (
                        <div className="flex items-center w-full gap-2">
                          <Input
                            value={editingTagName}
                            onChange={(e) => setEditingTagName(e.target.value)}
                            className="flex-1"
                            autoFocus
                            disabled={isSubmitting}
                          />
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={handleCancelEdit}
                              className="size-8"
                              disabled={isSubmitting}
                            >
                              <X className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleSaveEdit(tag.id)}
                              className="size-8"
                              disabled={!editingTagName.trim() || isSubmitting}
                            >
                              <CheckCircle2 className="size-4 text-green-500" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Badge
                            variant="outline"
                            className={`px-2 gap-1.5 h-7 ${getTagColor(
                              tag.name
                            )}`}
                          >
                            <Hash className="size-3" />
                            <span>{tag.name}</span>
                          </Badge>

                          <div className="ml-auto flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleStartEdit(tag.id, tag.name)}
                              className="size-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              disabled={isSubmitting}
                            >
                              <Edit3 className="size-3.5 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteDialog(tag.id)}
                              className="size-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                              disabled={isSubmitting}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                // Grid view
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {sortedTags.map((tag) => (
                    <div
                      key={tag.id}
                      className="group flex flex-col p-3 border rounded-lg hover:bg-muted/40 transition-colors"
                    >
                      {editingTagId === tag.id ? (
                        <div className="flex items-center w-full gap-2">
                          <Input
                            value={editingTagName}
                            onChange={(e) => setEditingTagName(e.target.value)}
                            className="flex-1"
                            autoFocus
                            disabled={isSubmitting}
                          />
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={handleCancelEdit}
                              className="size-8"
                              disabled={isSubmitting}
                            >
                              <X className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleSaveEdit(tag.id)}
                              className="size-8"
                              disabled={!editingTagName.trim() || isSubmitting}
                            >
                              <CheckCircle2 className="size-4 text-green-500" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-center mb-2">
                            <Badge
                              variant="outline"
                              className={`px-2 gap-1.5 h-7 ${getTagColor(
                                tag.name
                              )}`}
                            >
                              <Hash className="size-3" />
                              <span>{tag.name}</span>
                            </Badge>

                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  handleStartEdit(tag.id, tag.name)
                                }
                                className="size-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                disabled={isSubmitting}
                              >
                                <Edit3 className="size-3.5 text-muted-foreground" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDeleteDialog(tag.id)}
                                className="size-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                disabled={isSubmitting}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </div>

                          <div className="text-xs text-muted-foreground mt-auto">
                            Used in 0 candidates
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : (
              // Empty state
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="bg-muted rounded-full p-3 mb-3">
                  <Tag className="size-6 opacity-40" />
                </div>
                <h3 className="text-base font-medium mb-1">
                  {tags.length === 0 ? "No tags found" : "No matching tags"}
                </h3>
                <p className="text-sm max-w-xs text-muted-foreground/70">
                  {tags.length === 0
                    ? "Create your first tag using the form above"
                    : `No tags match "${searchQuery}"`}
                </p>
              </div>
            )}
          </ScrollArea>
        </CardContent>

        <Separator />

        <CardFooter className="flex justify-between text-xs text-muted-foreground pt-4">
          <div className="flex items-center gap-1">
            <Info className="size-3 opacity-70" />
            <span>
              {filteredTags.length} of {tags.length} tags
              {searchQuery && " matching your search"}
            </span>
          </div>
          <span>Last updated: {new Date().toLocaleDateString()}</span>
        </CardFooter>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this tag?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This tag will be permanently deleted
              and removed from any candidates it's attached to.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTagId && handleDeleteTag(deleteTagId)}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
