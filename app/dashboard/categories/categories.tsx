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
  FolderIcon,
  FolderTreeIcon,
  Info,
  MoreHorizontal,
  Plus,
  SearchIcon,
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

export default function CategoriesPage() {
  // State for categories
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    []
  );
  const [newCategory, setNewCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryView, setCategoryView] = useState<"grid" | "list">("grid");

  // For editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  // For delete confirmation
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // For sorting
  const [sortBy, setSortBy] = useState<"name" | "recent">("name");

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
    if (!name || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await addDoc(collection(db, "categories"), {
        name,
        createdAt: new Date().toISOString(),
      });
      toast.success("Category added successfully");
      setNewCategory("");
    } catch (e) {
      console.error(e);
      toast.error("Error adding category");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete category
  const handleDelete = async (id: string) => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      await deleteDoc(doc(db, "categories", id));
      toast.success("Category deleted successfully");
      setIsDeleteDialogOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("Error deleting category");
    } finally {
      setIsSubmitting(false);
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
    if (!name || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await updateDoc(doc(db, "categories", id), {
        name,
        updatedAt: new Date().toISOString(),
      });
      toast.success("Category updated successfully");
      cancelEdit();
    } catch (e) {
      console.error(e);
      toast.error("Error updating category");
    } finally {
      setIsSubmitting(false);
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

  // Sort categories based on sort option
  const sortedCategories = [...filteredCategories].sort((a, b) => {
    if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    } else {
      // This would be better if we stored created/updated timestamps
      return 0; // Default to no specific order for "recent"
    }
  });

  // Get a color for category badge (for visual variety)
  const getCategoryColor = (name: string) => {
    const colors = [
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
      "bg-sky-50 border-sky-200 text-sky-700",
      "bg-teal-50 border-teal-200 text-teal-700",
      "bg-cyan-50 border-cyan-200 text-cyan-700",
      "bg-lime-50 border-lime-200 text-lime-700",
      "bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700",
      "bg-pink-50 border-pink-200 text-pink-700",
    ];
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
                <FolderTreeIcon className="h-4 w-4" />
              </div>
              <span>Category Management</span>
            </CardTitle>
            <CardDescription>
              Create, edit, and delete categories for organizing candidates
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs py-1 px-2 h-7">
              {categories.length}{" "}
              {categories.length === 1 ? "category" : "categories"}
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
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() =>
                setCategoryView(categoryView === "grid" ? "list" : "grid")
              }
            >
              {categoryView === "grid" ? (
                <MoreHorizontal className="size-3.5" />
              ) : (
                <FolderIcon className="size-3.5" />
              )}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Create New Category */}
          <Card className="bg-primary/5 border-primary/20 border-dashed">
            <CardContent className="pt-6">
              <form onSubmit={handleAdd} className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Input
                    placeholder="Enter new category name..."
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
                <Button
                  type="submit"
                  disabled={!newCategory.trim() || isSubmitting}
                  className="gap-1.5"
                >
                  <Plus className="size-4" />
                  <span className="hidden sm:inline">Add Category</span>
                  <span className="inline sm:hidden">Add</span>
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Search and Filter */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
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

          {/* Categories Display */}
          <ScrollArea className="h-[400px] pr-4 -mr-4">
            {sortedCategories.length > 0 ? (
              categoryView === "grid" ? (
                // Grid view
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {sortedCategories.map((category) => (
                    <div
                      key={category.id}
                      className="group flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/40 transition-colors"
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
                              disabled={isSubmitting}
                            >
                              <X className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => saveEdit(category.id)}
                              className="size-8 text-green-500"
                              disabled={!editingName.trim() || isSubmitting}
                            >
                              <CheckCircle2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div
                            className={`flex items-center justify-center size-8 shrink-0 rounded-md ${getCategoryColor(
                              category.name
                            )}`}
                          >
                            <FolderIcon className="size-4" />
                          </div>
                          <span className="font-medium truncate flex-1">
                            {category.name}
                          </span>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                startEdit(category.id, category.name)
                              }
                              className="size-7 text-muted-foreground"
                              disabled={isSubmitting}
                            >
                              <Edit3 className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteDialog(category.id)}
                              className="size-7 text-destructive"
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
                // List view
                <div className="space-y-1">
                  {sortedCategories.map((category) => (
                    <div
                      key={category.id}
                      className="group flex items-center gap-3 p-2 rounded-md hover:bg-muted/40 transition-colors"
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
                              className="size-7"
                              disabled={isSubmitting}
                            >
                              <X className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => saveEdit(category.id)}
                              className="size-7 text-green-500"
                              disabled={!editingName.trim() || isSubmitting}
                            >
                              <CheckCircle2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div
                            className={`flex items-center justify-center size-6 shrink-0 rounded-md ${getCategoryColor(
                              category.name
                            )}`}
                          >
                            <FolderIcon className="size-3.5" />
                          </div>
                          <span className="font-medium truncate flex-1">
                            {category.name}
                          </span>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                startEdit(category.id, category.name)
                              }
                              className="size-6 text-muted-foreground"
                              disabled={isSubmitting}
                            >
                              <Edit3 className="size-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteDialog(category.id)}
                              className="size-6 text-destructive"
                              disabled={isSubmitting}
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="bg-muted rounded-full p-3 mb-3">
                  <FolderIcon className="size-6 opacity-40" />
                </div>
                <h3 className="text-base font-medium mb-1">
                  {categories.length === 0
                    ? "No categories found"
                    : "No matching categories"}
                </h3>
                <p className="text-sm max-w-xs text-muted-foreground/70">
                  {categories.length === 0
                    ? "Create your first category using the form above"
                    : `No categories match "${searchQuery}"`}
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
              {filteredCategories.length} of {categories.length} categories
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
            <AlertDialogTitle>Delete this category?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Any candidates currently assigned to
              this category will need to be reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCategoryId && handleDelete(deleteCategoryId)}
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
