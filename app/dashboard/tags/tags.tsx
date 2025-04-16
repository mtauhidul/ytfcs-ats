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
  CheckCircle2,
  Edit3,
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
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";

export default function TagsPage() {
  // Local state for tags
  const [tags, setTags] = useState<{ id: string; name: string }[]>([]);
  const [newTag, setNewTag] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

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
    if (!newTag.trim()) return;

    try {
      await addDoc(collection(db, "tags"), { name: newTag.trim() });
      toast.success("Tag created successfully!");
      setNewTag("");
    } catch (error: any) {
      console.error("Error creating tag:", error);
      toast.error("Error creating tag");
    }
  };

  // Delete a tag by its id
  const handleDeleteTag = async (id: string) => {
    try {
      await deleteDoc(doc(db, "tags", id));
      toast.success("Tag deleted successfully!");
      setIsDeleteDialogOpen(false);
    } catch (error: any) {
      console.error("Error deleting tag:", error);
      toast.error("Error deleting tag");
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
    if (!editingTagName.trim()) return;

    try {
      await updateDoc(doc(db, "tags", id), { name: editingTagName.trim() });
      toast.success("Tag updated successfully!");
      setEditingTagId(null);
      setEditingTagName("");
    } catch (error: any) {
      console.error("Error updating tag:", error);
      toast.error("Error updating tag");
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

  return (
    <div className="container py-8 mx-auto">
      <Toaster position="top-right" />

      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Tag className="size-5" />
              Tag Management
            </CardTitle>
            <CardDescription>
              Create, edit, and delete tags for categorizing candidates
            </CardDescription>
          </div>

          <Badge variant="outline" className="text-xs py-1">
            {tags.length} Tags
          </Badge>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Create New Tag */}
          <Card className="bg-primary-foreground border-dashed">
            <CardContent className="pt-6">
              <form
                onSubmit={handleCreateTag}
                className="flex items-center gap-3"
              >
                <div className="relative flex-1">
                  <Input
                    placeholder="Enter new tag name"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    className="pr-10"
                  />
                  {newTag && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 size-9"
                      onClick={() => setNewTag("")}
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
                <Button type="submit" disabled={!newTag.trim()}>
                  <Plus className="size-4 mr-2" />
                  Add Tag
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Search and Filter */}
          <div className="relative">
            <Input
              placeholder="Search tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 size-6"
                onClick={() => setSearchQuery("")}
              >
                <X className="size-3" />
              </Button>
            )}
          </div>

          {/* Tags List */}
          <ScrollArea className="h-[340px] pr-4">
            <div className="space-y-2">
              {filteredTags.length > 0 ? (
                filteredTags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-secondary/20 transition-colors"
                  >
                    {editingTagId === tag.id ? (
                      <div className="flex items-center w-full gap-2">
                        <Input
                          value={editingTagName}
                          onChange={(e) => setEditingTagName(e.target.value)}
                          className="flex-1"
                          autoFocus
                        />
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleCancelEdit}
                            className="size-8"
                          >
                            <X className="size-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSaveEdit(tag.id)}
                            className="size-8"
                            disabled={!editingTagName.trim()}
                          >
                            <CheckCircle2 className="size-4 text-green-500" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Badge variant="secondary" className="h-6 px-2 gap-1">
                          <span className="size-2 rounded-full bg-primary" />
                          <span>{tag.name}</span>
                        </Badge>

                        <div className="ml-auto flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStartEdit(tag.id, tag.name)}
                            className="size-8"
                          >
                            <Edit3 className="size-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(tag.id)}
                            className="size-8 text-destructive hover:text-destructive/90"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Tag className="size-10 text-muted-foreground/30 mb-2" />
                  <p className="text-muted-foreground font-medium">
                    {tags.length === 0 ? "No tags found" : "No matching tags"}
                  </p>
                  <p className="text-sm text-muted-foreground/70 mt-1 max-w-xs">
                    {tags.length === 0
                      ? "Create your first tag using the form above"
                      : "Try changing your search query"}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>

        <CardFooter className="flex justify-between text-xs text-muted-foreground border-t pt-4">
          <p>
            {filteredTags.length} of {tags.length} tags{" "}
            {searchQuery && "matching search"}
          </p>
          <p>Last updated: {new Date().toLocaleDateString()}</p>
        </CardFooter>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This tag will be permanently deleted
              and removed from any candidates it's attached to.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTagId && handleDeleteTag(deleteTagId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
