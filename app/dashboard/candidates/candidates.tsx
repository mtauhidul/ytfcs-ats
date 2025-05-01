// app/dashboard/candidates/candidates.tsx

"use client";

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import {
  AlertCircle,
  Clipboard,
  ClipboardCheck,
  Download,
  Eye,
  FileText,
  ListChecks,
  Loader2,
  MessageCircle,
  MessageSquare,
  MessageSquarePlus,
  Search,
  Shield,
  TagIcon,
  Trash2,
  Upload,
  UploadCloud,
  UserIcon,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Toaster, toast } from "sonner";

import { Link } from "react-router";
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
import { Checkbox } from "~/components/ui/checkbox";
import { DataTable } from "~/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import { db } from "~/lib/firebase";
import { cn } from "~/lib/utils";
import { columns, type Candidate } from "./columns";

interface Stage {
  id: string;
  title: string;
  order: number;
  color?: string;
}

// Constants for empty values - fixes the SelectItem empty value issue
const UNASSIGNED_VALUE = "unassigned";
const NONE_CATEGORY_VALUE = "none";

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // For searching
  const [globalFilter, setGlobalFilter] = useState("");

  // For user-defined tags & categories
  const [allTags, setAllTags] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);

  // For bulk actions
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>(
    []
  );
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [bulkStageId, setBulkStageId] = useState("");
  const [bulkTag, setBulkTag] = useState("");

  // For detail modal
  const [detailCandidate, setDetailCandidate] = useState<Candidate | null>(
    null
  );
  const [modalSkills, setModalSkills] = useState<string[]>([]);
  const [modalEducation, setModalEducation] = useState("");
  const [modalNotes, setModalNotes] = useState("");
  const [modalRating, setModalRating] = useState<number>(0);
  const [modalStageId, setModalStageId] = useState("");
  const [modalTags, setModalTags] = useState<string[]>([]);
  const [modalCategory, setModalCategory] = useState("");
  const [modalHistory, setModalHistory] = useState<
    { date: string; note: string }[]
  >([]);
  const [modalNewHistory, setModalNewHistory] = useState("");
  const [modalExperience, setModalExperience] = useState("");
  const [activeTab, setActiveTab] = useState("details");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // 1. Real-time Firestore candidates
  useEffect(() => {
    const q = query(collection(db, "candidates"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          tags: data.tags || [],
          category: data.category || "",
          rating: data.rating || 0,
          stageId: data.stageId || "",
          experience: data.experience || "",
          education: data.education || "",
          skills: data.skills || [],
          notes: data.notes || "",
          history: data.history || [],
          updatedAt: data.updatedAt || "",
          onEdit: (cand: Candidate) => openCandidateDetail(cand),
        } as Candidate;
      });
      setCandidates(docs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Real-time Firestore stages - sorted by order
  useEffect(() => {
    const q = query(collection(db, "stages"), orderBy("order", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const stageList = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: data.title,
          order: data.order,
          color: data.color,
        };
      });
      setStages(stageList);
    });
    return () => unsubscribe();
  }, []);

  // 3. Real-time Firestore tags
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "tags"), (snapshot) => {
      const list = snapshot.docs.map((d) => d.data().name) as string[];
      setAllTags(list);
    });
    return () => unsubscribe();
  }, []);

  // 4. Real-time Firestore categories
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "categories"), (snapshot) => {
      const list = snapshot.docs.map((d) => d.data().name) as string[];
      setAllCategories(list);
    });
    return () => unsubscribe();
  }, []);

  // 5. Filter (search) logic
  const filteredCandidates = useMemo(() => {
    const f = globalFilter.toLowerCase();
    if (!f) return candidates;

    // Get stage titles for searching
    const stageTitleMap = new Map(
      stages.map((s) => [s.id, s.title.toLowerCase()])
    );

    return candidates.filter((cand) => {
      // Get stage title for this candidate if it exists
      const stageTitle = stageTitleMap.get(cand.stageId) || "";

      // Searching across name, tags, category, stage, etc.
      const combined = [
        cand.name,
        cand.email || "",
        cand.phone || "",
        cand.tags.join(" "),
        cand.category,
        stageTitle,
        cand.experience,
        cand.education,
        cand.skills?.join(" "),
        cand.notes,
      ]
        .join(" ")
        .toLowerCase();
      return combined.includes(f);
    });
  }, [candidates, globalFilter, stages]);

  // 6. Open candidate detail
  const openCandidateDetail = (cand: Candidate) => {
    setDetailCandidate(cand);
    setModalSkills(cand.skills || []);
    setModalEducation(cand.education || "");
    setModalNotes(cand.notes || "");
    setModalRating(cand.rating || 0);
    // If stageId is empty, set to UNASSIGNED_VALUE instead
    setModalStageId(cand.stageId || UNASSIGNED_VALUE);
    setModalTags(cand.tags || []);
    // If category is empty, set to NONE_CATEGORY_VALUE instead
    setModalCategory(cand.category || NONE_CATEGORY_VALUE);
    setModalHistory(cand.history || []);
    setModalNewHistory("");
    setModalExperience(cand.experience || "");
    setActiveTab("details");
  };

  // 7. Save candidate detail changes
  const handleSaveDetail = async () => {
    if (!detailCandidate) return;

    try {
      setIsSubmitting(true);
      const saveLoading = toast.loading("Saving changes...");

      const ref = doc(db, "candidates", detailCandidate.id);
      const updatedData = {
        skills: modalSkills,
        education: modalEducation,
        notes: modalNotes,
        rating: modalRating,
        // Convert back from UNASSIGNED_VALUE to empty string for storage
        stageId: modalStageId === UNASSIGNED_VALUE ? "" : modalStageId,
        tags: modalTags,
        // Convert back from NONE_CATEGORY_VALUE to empty string for storage
        category: modalCategory === NONE_CATEGORY_VALUE ? "" : modalCategory,
        history: modalHistory,
        experience: modalExperience,
        updatedAt: new Date().toISOString(),
      };

      // If user typed a new history note
      if (modalNewHistory.trim()) {
        const newEntry = {
          date: new Date().toISOString(),
          note: modalNewHistory.trim(),
        };
        updatedData.history = [...modalHistory, newEntry];
      }

      await updateDoc(ref, updatedData);
      toast.dismiss(saveLoading);
      toast.success("Candidate updated successfully");
      closeDetail();
    } catch (err) {
      console.error("Error saving candidate detail:", err);
      toast.error("Error updating candidate");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 8. Delete candidate
  const handleDeleteCandidate = async () => {
    if (!detailCandidate) return;

    try {
      setIsSubmitting(true);
      const deleteLoading = toast.loading("Deleting candidate...");

      const ref = doc(db, "candidates", detailCandidate.id);
      await deleteDoc(ref);

      toast.dismiss(deleteLoading);
      toast.success("Candidate deleted successfully");
      setShowDeleteDialog(false);
      closeDetail();
    } catch (err) {
      console.error("Error deleting candidate:", err);
      toast.error("Error deleting candidate");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle bulk actions
  const handleBulkAction = async (action: "stage" | "tag" | "delete") => {
    if (selectedCandidateIds.length === 0) return;

    try {
      setIsSubmitting(true);
      const actionLoading = toast.loading(
        `Processing ${selectedCandidateIds.length} candidates...`
      );

      for (const id of selectedCandidateIds) {
        const candidateRef = doc(db, "candidates", id);

        if (action === "stage" && bulkStageId) {
          await updateDoc(candidateRef, {
            stageId: bulkStageId,
            updatedAt: new Date().toISOString(),
          });
        } else if (action === "tag" && bulkTag) {
          const candidate = candidates.find((c) => c.id === id);
          const currentTags = candidate?.tags || [];
          if (!currentTags.includes(bulkTag)) {
            await updateDoc(candidateRef, {
              tags: [...currentTags, bulkTag],
              updatedAt: new Date().toISOString(),
            });
          }
        } else if (action === "delete") {
          await deleteDoc(candidateRef);
        }
      }

      toast.dismiss(actionLoading);
      toast.success(
        action === "delete"
          ? `Deleted ${selectedCandidateIds.length} candidates`
          : `Updated ${selectedCandidateIds.length} candidates`
      );

      // Clear selection after action
      setSelectedCandidateIds([]);
      setBulkActionOpen(false);
    } catch (err) {
      console.error(`Error performing bulk ${action}:`, err);
      toast.error(`Error updating candidates`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeDetail = () => {
    setDetailCandidate(null);
  };

  // Reset rating
  const resetRating = () => {
    setModalRating(0);
  };

  // Set rating
  const setRating = (rating: number) => {
    setModalRating(rating);
  };

  // Get a color style for badge by stageId
  const getBadgeColorByStageId = (stageId: string) => {
    const stage = stages.find((s) => s.id === stageId);
    return stage?.color || "";
  };

  // Get stage title from stage ID
  const getStageTitleById = (stageId: string) => {
    const stage = stages.find((s) => s.id === stageId);
    return stage ? stage.title : "Unassigned";
  };

  // Handle row selection changes
  const handleRowSelectionChange = (selection: { [key: string]: boolean }) => {
    // Extract selected IDs from the selection object
    const selectedIds = Object.entries(selection)
      .filter(([_, isSelected]) => isSelected)
      .map(([id]) => id);

    setSelectedCandidateIds(selectedIds);
  };

  if (loading) {
    return (
      <section className="p-6">
        <div className="flex flex-col items-center justify-center h-60 gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
          <div className="text-muted-foreground text-sm">
            Loading candidates...
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="p-6 max-w-full">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserIcon className="h-6 w-6" />
            Candidates
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage and track your candidate database
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="py-1 px-3">
            {candidates.length} candidates
          </Badge>
          <Button variant="outline" asChild>
            <Link to="/dashboard/import">Import Candidates</Link>
          </Button>
        </div>
      </div>

      {/* Searching */}
      <div className="flex flex-col md:flex-row gap-4 items-center mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search candidates by name, skills, tags..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-10 pr-10"
          />
          {globalFilter && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-10 w-10 opacity-70 hover:opacity-100"
              onClick={() => setGlobalFilter("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex items-center text-sm text-muted-foreground">
          <span>
            {filteredCandidates.length} of {candidates.length} candidates
          </span>
        </div>
      </div>

      {/* Bulk Actions UI */}
      {selectedCandidateIds.length > 0 && (
        <div className="bg-muted/20 flex items-center justify-between px-4 py-2 rounded-md mb-4 border">
          <div className="flex items-center">
            <Checkbox
              checked={
                selectedCandidateIds.length === filteredCandidates.length
              }
              onCheckedChange={(checked) => {
                if (checked) {
                  setSelectedCandidateIds(filteredCandidates.map((c) => c.id));
                } else {
                  setSelectedCandidateIds([]);
                }
              }}
              className="mr-2"
            />
            <span className="text-sm font-medium">
              {selectedCandidateIds.length} candidate
              {selectedCandidateIds.length !== 1 ? "s" : ""} selected
            </span>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkActionOpen(true)}
            >
              <ListChecks className="size-4 mr-2" />
              Bulk Actions
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedCandidateIds([])}
            >
              <X className="size-4 mr-2" />
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="w-full mb-4">
        <DataTable
          columns={columns}
          data={filteredCandidates.map((candidate) => {
            const stage = stages.find((s) => s.id === candidate.stageId);
            return {
              ...candidate,
              stage: stage ? stage.title : "Unassigned",
              stageColor: stage ? stage.color : "",
            };
          })}
          globalFilter={globalFilter}
          onRowSelectionChange={handleRowSelectionChange}
        />
      </div>

      {/* Candidate Detail Modal */}
      {detailCandidate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => {
            // Only close if clicking on the backdrop, not the modal itself
            if (e.target === e.currentTarget) {
              closeDetail();
            }
          }}
        >
          <div
            className="bg-background p-6 rounded-lg max-w-3xl w-full h-[90vh] max-h-[800px] overflow-hidden relative flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 z-10"
              onClick={closeDetail}
            >
              <X className="h-4 w-4" />
            </Button>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 pr-10">
              <h2 className="text-xl font-bold">{detailCandidate.name}</h2>

              <div className="mt-2 md:mt-0 flex items-center">
                <Badge
                  className={`mr-2 ${
                    modalStageId !== UNASSIGNED_VALUE
                      ? getBadgeColorByStageId(modalStageId)
                      : ""
                  }`}
                  variant={
                    modalStageId !== UNASSIGNED_VALUE ? "default" : "outline"
                  }
                >
                  {modalStageId !== UNASSIGNED_VALUE
                    ? getStageTitleById(modalStageId)
                    : "Unassigned"}
                </Badge>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-4 w-4 ${
                        star <= modalRating
                          ? "fill-amber-400 text-amber-400"
                          : "text-gray-300"
                      }`}
                      viewBox="0 0 24 24"
                    >
                      <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  ))}
                </div>
              </div>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex-grow flex flex-col overflow-hidden"
            >
              <TabsList className="mb-4 overflow-x-auto justify-start">
                <TabsTrigger
                  value="details"
                  className="flex items-center gap-1"
                >
                  <FileText className="size-4" />
                  <span>Details</span>
                </TabsTrigger>
                <TabsTrigger value="tags" className="flex items-center gap-1">
                  <TagIcon className="size-4" />
                  <span>Tags & Categories</span>
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="flex items-center gap-1"
                >
                  <Shield className="size-4" />
                  <span>History</span>
                </TabsTrigger>
                <TabsTrigger
                  value="communications"
                  className="flex items-center gap-1"
                >
                  <MessageSquare className="size-4" />
                  <span>Communications</span>
                </TabsTrigger>
                <TabsTrigger
                  value="feedback"
                  className="flex items-center gap-1"
                >
                  <MessageCircle className="size-4" />
                  <span>Feedback</span>
                </TabsTrigger>
                <TabsTrigger
                  value="documents"
                  className="flex items-center gap-1"
                >
                  <FileText className="size-4" />
                  <span>Documents</span>
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-grow">
                <TabsContent value="details" className="py-2 min-h-[400px]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label
                          htmlFor="stage"
                          className="text-sm font-medium mb-2 block"
                        >
                          Stage
                        </Label>
                        <Select
                          value={modalStageId}
                          onValueChange={setModalStageId}
                        >
                          <SelectTrigger id="stage" className="w-full">
                            <SelectValue placeholder="Select a stage" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={UNASSIGNED_VALUE}>
                              Unassigned
                            </SelectItem>
                            {stages.map((stage) => (
                              <SelectItem key={stage.id} value={stage.id}>
                                {stage.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label
                          htmlFor="experience"
                          className="text-sm font-medium mb-2 block"
                        >
                          Experience
                        </Label>
                        <Input
                          id="experience"
                          value={modalExperience}
                          onChange={(e) => setModalExperience(e.target.value)}
                          placeholder="e.g. 5 years"
                        />
                      </div>

                      <div>
                        <Label
                          htmlFor="rating"
                          className="text-sm font-medium mb-2 block"
                        >
                          Rating
                        </Label>
                        <div className="flex items-center gap-3">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                className="p-1 hover:scale-110 transition-transform"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className={`h-6 w-6 ${
                                    star <= modalRating
                                      ? "fill-amber-400 text-amber-400"
                                      : "text-gray-300"
                                  }`}
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  fill="none"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                                  />
                                </svg>
                              </button>
                            ))}
                          </div>

                          {modalRating > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={resetRating}
                              className="h-8 text-xs"
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label
                          htmlFor="skills"
                          className="text-sm font-medium mb-2 block"
                        >
                          Skills (comma-separated)
                        </Label>
                        <Textarea
                          id="skills"
                          value={modalSkills.join(", ")}
                          onChange={(e) =>
                            setModalSkills(
                              e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean)
                            )
                          }
                          placeholder="e.g. JavaScript, React, Node.js"
                          className="resize-none min-h-[100px]"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label
                          htmlFor="education"
                          className="text-sm font-medium mb-2 block"
                        >
                          Education
                        </Label>
                        <Textarea
                          id="education"
                          value={modalEducation}
                          onChange={(e) => setModalEducation(e.target.value)}
                          placeholder="Education details"
                          className="resize-none min-h-[100px]"
                        />
                      </div>

                      <div>
                        <Label
                          htmlFor="notes"
                          className="text-sm font-medium mb-2 block"
                        >
                          Notes
                        </Label>
                        <Textarea
                          id="notes"
                          value={modalNotes}
                          onChange={(e) => setModalNotes(e.target.value)}
                          placeholder="Add notes about this candidate..."
                          className="resize-none min-h-[180px]"
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="tags" className="py-2 min-h-[400px]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <h3 className="text-sm font-medium">Tags</h3>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2 border p-3 rounded bg-background min-h-[200px]">
                          {allTags.length > 0 ? (
                            allTags.map((tag) => {
                              const isSelected = modalTags.includes(tag);
                              return (
                                <Badge
                                  key={tag}
                                  variant={isSelected ? "default" : "outline"}
                                  className={cn(
                                    "cursor-pointer hover:opacity-80 h-8 px-3 inline-flex items-center",
                                    isSelected
                                      ? "bg-primary text-primary-foreground"
                                      : ""
                                  )}
                                  onClick={() => {
                                    if (isSelected) {
                                      setModalTags(
                                        modalTags.filter((t) => t !== tag)
                                      );
                                    } else {
                                      setModalTags([...modalTags, tag]);
                                    }
                                  }}
                                >
                                  {tag}
                                </Badge>
                              );
                            })
                          ) : (
                            <div className="text-sm text-muted-foreground w-full text-center py-10 flex flex-col items-center">
                              <TagIcon className="mb-2 h-6 w-6 opacity-40" />
                              No tags available
                              <p className="text-xs mt-1">
                                Tags can be created in the Tags management
                                section
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="h-full">
                      <CardHeader className="pb-2">
                        <h3 className="text-sm font-medium">Category</h3>
                      </CardHeader>
                      <CardContent>
                        <Select
                          value={modalCategory}
                          onValueChange={setModalCategory}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE_CATEGORY_VALUE}>
                              (None)
                            </SelectItem>
                            {allCategories.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {allCategories.length === 0 && (
                          <div className="text-sm text-muted-foreground w-full text-center mt-6 py-6 flex flex-col items-center border rounded-md">
                            <FileText className="mb-2 h-6 w-6 opacity-40" />
                            No categories available
                            <p className="text-xs mt-1">
                              Categories can be created in the Categories
                              management section
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="history" className="py-2 min-h-[400px]">
                  <Card>
                    <CardHeader className="pb-2">
                      <h3 className="text-sm font-medium">
                        Add New History Entry
                      </h3>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder="Add a new history entry..."
                        value={modalNewHistory}
                        onChange={(e) => setModalNewHistory(e.target.value)}
                        className="resize-none"
                      />
                    </CardContent>
                  </Card>

                  <div className="mt-6">
                    <h3 className="text-sm font-medium mb-3">
                      History Timeline
                    </h3>

                    {modalHistory.length === 0 ? (
                      <div className="text-sm text-muted-foreground py-10 flex flex-col items-center border rounded-md">
                        <AlertCircle className="mb-2 h-6 w-6 opacity-40" />
                        <p className="italic">No history entries yet</p>
                        <p className="text-xs mt-1">
                          Add your first entry in the form above
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {[...modalHistory].reverse().map((entry, idx) => (
                          <div
                            key={idx}
                            className="border-l-2 border-muted pl-3 py-2 hover:border-primary transition-colors"
                          >
                            <p className="text-xs text-muted-foreground">
                              {new Date(entry.date).toLocaleString()}
                            </p>
                            <p className="text-sm mt-1">{entry.note}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent
                  value="communications"
                  className="py-2 min-h-[400px]"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">Communication History</h3>
                      <Button size="sm">
                        <MessageSquarePlus className="size-4 mr-2" />
                        New Message
                      </Button>
                    </div>

                    {/* Show placeholder if no communications */}
                    <div className="text-center py-12 border rounded-md bg-muted/20">
                      <MessageSquare className="size-8 mx-auto mb-2 text-muted-foreground/50" />
                      <p className="text-muted-foreground">
                        No communication history yet
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Messages sent to this candidate will appear here
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="feedback" className="py-2 min-h-[400px]">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">Interview Feedback</h3>
                      <Button size="sm">
                        <Clipboard className="size-4 mr-2" />
                        Add Feedback
                      </Button>
                    </div>

                    {/* Show placeholder if no feedback */}
                    <div className="text-center py-12 border rounded-md bg-muted/20">
                      <ClipboardCheck className="size-8 mx-auto mb-2 text-muted-foreground/50" />
                      <p className="text-muted-foreground">
                        No feedback submitted yet
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Team feedback for this candidate will appear here
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="documents" className="py-2 min-h-[400px]">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">Candidate Documents</h3>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Download className="size-4 mr-2" />
                          Download All
                        </Button>
                        <Button size="sm">
                          <Upload className="size-4 mr-2" />
                          Upload
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Resume document */}
                      <div className="border rounded-md p-4 flex flex-col">
                        <div className="flex items-center mb-2">
                          <FileText className="size-5 mr-2 text-muted-foreground" />
                          <span className="font-medium truncate flex-1">
                            Resume.pdf
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mb-3">
                          Uploaded on {new Date().toLocaleDateString()}
                        </div>
                        <div className="flex justify-between mt-auto pt-2">
                          <Button size="sm" variant="ghost">
                            <Eye className="size-4 mr-1" />
                            View
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Download className="size-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>

                      {/* Placeholder for additional documents */}
                      <div className="border border-dashed rounded-md p-4 flex flex-col items-center justify-center text-center py-8 text-muted-foreground">
                        <UploadCloud className="size-8 mb-2 opacity-40" />
                        <p className="text-sm">
                          Drag & drop additional documents
                        </p>
                        <p className="text-xs mt-1">or</p>
                        <Button size="sm" variant="outline" className="mt-2">
                          Browse Files
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>

            {/* Action Buttons */}
            <div className="mt-4 pt-4 border-t flex justify-between">
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isSubmitting}
              >
                Delete Candidate
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={closeDetail}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveDetail} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this candidate?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete{" "}
              <strong>{detailCandidate?.name}</strong> from your candidate
              database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCandidate}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Action Dialog */}
      <Dialog open={bulkActionOpen} onOpenChange={setBulkActionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Actions</DialogTitle>
            <DialogDescription>
              Apply actions to {selectedCandidateIds.length} selected candidate
              {selectedCandidateIds.length !== 1 ? "s" : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Change Stage
              </label>
              <Select value={bulkStageId} onValueChange={setBulkStageId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a stage" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                className="w-full mt-2"
                variant="outline"
                onClick={() => handleBulkAction("stage")}
                disabled={!bulkStageId || isSubmitting}
              >
                Apply Stage Change
              </Button>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Add Tag</label>
              <Select value={bulkTag} onValueChange={setBulkTag}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tag to add" />
                </SelectTrigger>
                <SelectContent>
                  {allTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                className="w-full mt-2"
                variant="outline"
                onClick={() => handleBulkAction("tag")}
                disabled={!bulkTag || isSubmitting}
              >
                Add Tag to Selected
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="destructive"
              className="mr-auto"
              onClick={() => handleBulkAction("delete")}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Trash2 className="size-4 mr-2" />
                  Delete Selected
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => setBulkActionOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </section>
  );
}
