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
  FolderIcon,
  Plus,
  Search,
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

export default function CategoriesPage() {
  // State for categories
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    []
  );
  const [newCategory, setNewCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // For editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  // For delete confirmation
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Subscribe to the "categories" collection
  useEffect(() => {
    const colRef = collection(db, "categories");
    const unsub = onSnapshot(colRef, (snap) => {
      setCategories(
        snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name as string,
        }))
      );
    });
    return () => unsub();
  }, []);

  // Create category
  const handleAdd = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = newCategory.trim();
    if (!name) return;

    try {
      await addDoc(collection(db, "categories"), { name });
      toast.success("Category added successfully");
      setNewCategory("");
    } catch (e) {
      console.error(e);
      toast.error("Error adding category");
    }
  };

  // Delete category
  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "categories", id));
      toast.success("Category deleted successfully");
      setIsDeleteDialogOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("Error deleting category");
    }
  };

  // Start editing
  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  // Save edit
  const saveEdit = async (id: string) => {
    const name = editingName.trim();
    if (!name) return;

    try {
      await updateDoc(doc(db, "categories", id), { name });
      toast.success("Category updated successfully");
      cancelEdit();
    } catch (e) {
      console.error(e);
      toast.error("Error updating category");
    }
  };

  // Open delete confirmation dialog
  const openDeleteDialog = (id: string) => {
    setDeleteCategoryId(id);
    setIsDeleteDialogOpen(true);
  };

  // Filter categories based on search query
  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get a color for category badge (for visual variety)
  const getCategoryColor = (name: string) => {
    const colors = [
      "primary",
      "sky",
      "indigo",
      "violet",
      "pink",
      "rose",
      "orange",
      "amber",
      "emerald",
      "teal",
    ];
    const hash = name
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <div className="container py-8 mx-auto">
      <Toaster position="top-right" />

      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <FolderIcon className="size-5" />
              Category Management
            </CardTitle>
            <CardDescription>
              Create, edit, and delete categories for organizing candidates
            </CardDescription>
          </div>

          <Badge variant="outline" className="text-xs py-1">
            {categories.length} Categories
          </Badge>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Create New Category */}
          <Card className="bg-primary-foreground border-dashed">
            <CardContent className="pt-6">
              <form onSubmit={handleAdd} className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Input
                    placeholder="Enter new category name"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="pr-10"
                  />
                  {newCategory && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 size-9"
                      onClick={() => setNewCategory("")}
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
                <Button type="submit" disabled={!newCategory.trim()}>
                  <Plus className="size-4 mr-2" />
                  Add Category
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Search and Filter */}
          <div className="relative">
            <Input
              placeholder="Search categories..."
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

          {/* Categories Grid */}
          <ScrollArea className="h-[340px] pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredCategories.length > 0 ? (
                filteredCategories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-secondary/20 transition-colors"
                  >
                    {editingId === category.id ? (
                      <div className="flex items-center w-full gap-2">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="flex-1"
                          autoFocus
                        />
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={cancelEdit}
                            className="size-8"
                          >
                            <X className="size-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => saveEdit(category.id)}
                            className="size-8"
                            disabled={!editingName.trim()}
                          >
                            <CheckCircle2 className="size-4 text-green-500" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 flex items-center gap-2">
                          <span
                            className={`size-3 rounded-full bg-${getCategoryColor(
                              category.name
                            )}-500`}
                          />
                          <span className="font-medium truncate">
                            {category.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              startEdit(category.id, category.name)
                            }
                            className="size-8"
                          >
                            <Edit3 className="size-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(category.id)}
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
                <div className="col-span-2 flex flex-col items-center justify-center py-10 text-center">
                  <FolderIcon className="size-10 text-muted-foreground/30 mb-2" />
                  <p className="text-muted-foreground font-medium">
                    {categories.length === 0
                      ? "No categories found"
                      : "No matching categories"}
                  </p>
                  <p className="text-sm text-muted-foreground/70 mt-1 max-w-xs">
                    {categories.length === 0
                      ? "Create your first category using the form above"
                      : "Try changing your search query"}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>

        <CardFooter className="flex justify-between text-xs text-muted-foreground border-t pt-4">
          <p>
            {filteredCategories.length} of {categories.length} categories{" "}
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
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This category will be permanently
              deleted and may affect any candidates currently assigned to it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCategoryId && handleDelete(deleteCategoryId)}
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
