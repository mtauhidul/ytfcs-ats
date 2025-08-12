import {
  ArrowDownUp,
  CheckCircle2,
  Edit3,
  GridIcon,
  Hash,
  Info,
  ListIcon,
  Plus,
  Search,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "~/hooks/redux";
import { useTagsSync } from "~/hooks/use-realtime-sync";
import { addTag, updateTag, deleteTag } from "~/features/tagsSlice";
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
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

export default function TagsPage() {
  const dispatch = useAppDispatch();
  const { tags, loading, error } = useAppSelector((state) => state.tags);
  
  useTagsSync();

  const [newTag, setNewTag] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [sortBy, setSortBy] = useState<"name" | "recent">("name");
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState("");
  const [deleteTagId, setDeleteTagId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleAddTag = async () => {
    if (!newTag.trim()) return;

    try {
      await dispatch(addTag({ 
        name: newTag.trim(),
        createdAt: new Date().toISOString()
      })).unwrap();
      setNewTag("");
      toast.success("Tag added successfully");
    } catch (error) {
      toast.error("Failed to add tag");
    }
  };

  const handleEditTag = async () => {
    if (!editingTagId || !editingTagName.trim()) return;

    try {
      await dispatch(updateTag({
        id: editingTagId,
        data: { name: editingTagName.trim() }
      })).unwrap();
      setEditingTagId(null);
      setEditingTagName("");
      toast.success("Tag updated successfully");
    } catch (error) {
      toast.error("Failed to update tag");
    }
  };

  const handleDeleteTag = async () => {
    if (!deleteTagId) return;

    try {
      await dispatch(deleteTag(deleteTagId)).unwrap();
      setIsDeleteDialogOpen(false);
      setDeleteTagId(null);
      toast.success("Tag deleted successfully");
    } catch (error) {
      toast.error("Failed to delete tag");
    }
  };

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedTags = [...filteredTags].sort((a, b) => {
    if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    }
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  const emptyState = (
    <Card>
      <CardContent className="text-center py-8">
        <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No tags found</h3>
        <p className="text-muted-foreground">
          {searchQuery ? "No tags match your search criteria." : "Start by creating your first tag."}
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tags</h1>
          <p className="text-muted-foreground">
            Manage and organize your recruitment tags
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tags..."
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
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <ListIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <GridIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Tag
          </CardTitle>
          <CardDescription>
            Create a new tag to categorize your candidates and jobs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="new-tag">Tag Name</Label>
              <Input
                id="new-tag"
                placeholder="Enter tag name..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddTag} disabled={loading || !newTag.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Tag
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5" />
          <span className="font-medium">Tags ({sortedTags.length})</span>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Info className="h-3 w-3" />
          Real-time synced
        </Badge>
      </div>

      <DataLoader
        loading={loading}
        data={tags}
        error={error}
        emptyState={emptyState}
        loadingText="Loading tags..."
      >
        <div className={
          viewMode === "grid" 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            : "space-y-2"
        }>
          {sortedTags.map((tag) => (
            <Card key={tag.id} className={viewMode === "list" ? "p-4" : ""}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  {editingTagId === tag.id ? (
                    <Input
                      value={editingTagName}
                      onChange={(e) => setEditingTagName(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleEditTag()}
                      className="h-8"
                      autoFocus
                    />
                  ) : (
                    <span className="font-medium">{tag.name}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {editingTagId === tag.id ? (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleEditTag}
                        disabled={loading}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingTagId(null);
                          setEditingTagName("");
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingTagId(tag.id);
                          setEditingTagName(tag.name);
                        }}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setDeleteTagId(tag.id);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
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
            <AlertDialogTitle>Delete Tag</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this tag? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTag} disabled={loading}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
