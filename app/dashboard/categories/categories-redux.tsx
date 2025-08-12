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
import { useState } from "react";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "~/hooks/redux";
import { useCategoriesSync } from "~/hooks/use-realtime-sync";
import { addCategory, updateCategory, deleteCategory } from "~/features/categoriesSlice";
import { DataLoader } from "~/components/ui/loading";

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
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

export default function CategoriesPageRedux() {
  const dispatch = useAppDispatch();
  const { categories, loading, error } = useAppSelector((state) => state.categories);
  
  useCategoriesSync();

  const [newCategory, setNewCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryView, setCategoryView] = useState<"grid" | "list">("grid");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "recent">("name");

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;

    try {
      await dispatch(addCategory({
        name: newCategory.trim(),
        createdAt: new Date().toISOString()
      })).unwrap();
      setNewCategory("");
      toast.success("Category added successfully");
    } catch (error) {
      toast.error("Failed to add category");
    }
  };

  const handleEditCategory = async () => {
    if (!editingId || !editingName.trim()) return;

    try {
      await dispatch(updateCategory({
        id: editingId,
        data: { name: editingName.trim() }
      })).unwrap();
      setEditingId(null);
      setEditingName("");
      toast.success("Category updated successfully");
    } catch (error) {
      toast.error("Failed to update category");
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategoryId) return;

    try {
      await dispatch(deleteCategory(deleteCategoryId)).unwrap();
      setIsDeleteDialogOpen(false);
      setDeleteCategoryId(null);
      toast.success("Category deleted successfully");
    } catch (error) {
      toast.error("Failed to delete category");
    }
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedCategories = [...filteredCategories].sort((a, b) => {
    if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    }
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">
            Organize your jobs and candidates with categories
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={sortBy} onValueChange={(value: "name" | "recent") => setSortBy(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Sort by Name</SelectItem>
              <SelectItem value="recent">Sort by Recent</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={categoryView === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setCategoryView("list")}
          >
            List
          </Button>
          <Button
            variant={categoryView === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setCategoryView("grid")}
          >
            Grid
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Category
          </CardTitle>
          <CardDescription>
            Create a new category to organize your recruitment process
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="new-category">Category Name</Label>
              <Input
                id="new-category"
                placeholder="Enter category name..."
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddCategory()}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddCategory} disabled={loading || !newCategory.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderTreeIcon className="h-5 w-5" />
          <span className="font-medium">Categories ({sortedCategories.length})</span>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Info className="h-3 w-3" />
          Real-time synced
        </Badge>
      </div>

      <DataLoader
        loading={loading}
        data={categories}
        error={error}
        emptyState={
          <Card>
            <CardContent className="text-center py-8">
              <FolderTreeIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No categories found</h3>
              <p className="text-muted-foreground">
                {searchQuery ? "No categories match your search criteria." : "Start by creating your first category."}
              </p>
            </CardContent>
          </Card>
        }
        loadingText="Loading categories..."
      >
        <div className={
          categoryView === "grid" 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            : "space-y-2"
        }>
          {sortedCategories.map((category) => (
            <Card key={category.id} className={categoryView === "list" ? "p-4" : ""}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderIcon className="h-4 w-4 text-muted-foreground" />
                  {editingId === category.id ? (
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleEditCategory()}
                      className="h-8"
                      autoFocus
                    />
                  ) : (
                    <span className="font-medium">{category.name}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {editingId === category.id ? (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleEditCategory}
                        disabled={loading}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(null);
                          setEditingName("");
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingId(category.id);
                            setEditingName(category.name);
                          }}
                        >
                          <Edit3 className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setDeleteCategoryId(category.id);
                            setIsDeleteDialogOpen(true);
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </DataLoader>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this category? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory} disabled={loading}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
