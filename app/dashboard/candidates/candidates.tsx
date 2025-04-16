"use client";

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
} from "firebase/firestore";
import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Toaster, toast } from "sonner";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { DataTable } from "~/components/ui/data-table";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import { db } from "~/lib/firebase";
import { cn } from "~/lib/utils";
import { columns, type Candidate } from "./columns";

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  // For searching
  const [globalFilter, setGlobalFilter] = useState("");

  // For user-defined tags & categories
  const [allTags, setAllTags] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);

  // For detail modal
  const [detailCandidate, setDetailCandidate] = useState<Candidate | null>(
    null
  );
  const [modalSkills, setModalSkills] = useState<string[]>([]);
  const [modalEducation, setModalEducation] = useState("");
  const [modalNotes, setModalNotes] = useState("");
  const [modalRating, setModalRating] = useState<number>(0);
  const [modalStage, setModalStage] = useState("");
  const [modalTags, setModalTags] = useState<string[]>([]);
  const [modalCategory, setModalCategory] = useState("");
  const [modalHistory, setModalHistory] = useState<
    { date: string; note: string }[]
  >([]);
  const [modalNewHistory, setModalNewHistory] = useState("");

  // 1. Real-time Firestore candidates
  useEffect(() => {
    const q = query(collection(db, "candidates"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name || "",
          tags: data.tags || [],
          category: data.category || "",
          rating: data.rating || 0,
          stage: data.stage || "",
          experience: data.experience || "",
          education: data.education || "",
          skills: data.skills || [],
          notes: data.notes || "",
          history: data.history || [],
          // We inject an onEdit callback:
          onEdit: (cand: Candidate) => openCandidateDetail(cand),
        } as Candidate;
      });
      setCandidates(docs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Real-time Firestore tags
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "tags"), (snapshot) => {
      const list = snapshot.docs.map((d) => d.data().name) as string[];
      setAllTags(list);
    });
    return () => unsubscribe();
  }, []);

  // 3. Real-time Firestore categories
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "categories"), (snapshot) => {
      const list = snapshot.docs.map((d) => d.data().name) as string[];
      setAllCategories(list);
    });
    return () => unsubscribe();
  }, []);

  // 4. Filter (search) logic
  const filteredCandidates = useMemo(() => {
    const f = globalFilter.toLowerCase();
    if (!f) return candidates;
    return candidates.filter((cand) => {
      // Searching across name, tags, category, stage, etc.
      const combined = [
        cand.name,
        cand.tags.join(" "),
        cand.category,
        cand.stage,
        cand.experience,
        cand.education,
        cand.skills?.join(" "),
        cand.notes,
      ]
        .join(" ")
        .toLowerCase();
      return combined.includes(f);
    });
  }, [candidates, globalFilter]);

  // 6. Open candidate detail
  const openCandidateDetail = (cand: Candidate) => {
    setDetailCandidate(cand);
    setModalSkills(cand.skills || []);
    setModalEducation(cand.education || "");
    setModalNotes(cand.notes || "");
    setModalRating(cand.rating || 0);
    setModalStage(cand.stage || "");
    setModalTags(cand.tags || []);
    setModalCategory(cand.category || "");
    setModalHistory(cand.history || []);
    setModalNewHistory("");
  };

  // 7. Save candidate detail changes
  const handleSaveDetail = async () => {
    if (!detailCandidate) return;
    try {
      const saveLoading = toast.loading("Saving changes...");
      const ref = doc(db, "candidates", detailCandidate.id);
      const updatedData = {
        skills: modalSkills,
        education: modalEducation,
        notes: modalNotes,
        rating: modalRating,
        stage: modalStage,
        tags: modalTags,
        category: modalCategory,
        history: modalHistory,
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
    }
  };

  // 8. Delete candidate
  const handleDeleteCandidate = async () => {
    if (!detailCandidate) return;
    if (
      !window.confirm(
        `Are you sure you want to delete ${detailCandidate.name}? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const deleteLoading = toast.loading("Deleting candidate...");
      const ref = doc(db, "candidates", detailCandidate.id);
      await deleteDoc(ref);
      toast.dismiss(deleteLoading);
      toast.success("Candidate deleted successfully");
      closeDetail();
    } catch (err) {
      console.error("Error deleting candidate:", err);
      toast.error("Error deleting candidate");
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

  if (loading) {
    return (
      <section className="p-6">
        <div className="flex items-center justify-center h-40">
          <div className="animate-pulse text-muted-foreground">
            Loading candidates...
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 p-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold">Candidates</h1>
          <p className="text-muted-foreground text-sm">
            Manage and track your candidate database
          </p>
        </div>
      </div>

      {/* Searching */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
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
      <Separator />

      {/* Data Table */}
      <div className="rounded-md border overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredCandidates}
          globalFilter={globalFilter}
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
            className="bg-background p-6 rounded-lg max-w-3xl w-full h-[90vh] max-h-[800px] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4"
              onClick={closeDetail}
            >
              <X className="h-4 w-4" />
            </Button>

            <h2 className="text-xl font-bold mb-4 pr-8">
              {detailCandidate.name}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Left Column */}
              <div className="space-y-4 md:col-span-2">
                <div>
                  <h3 className="text-sm font-medium mb-2">Stage</h3>
                  <select
                    className="w-full border p-2 rounded bg-background text-sm"
                    value={modalStage}
                    onChange={(e) => setModalStage(e.target.value)}
                  >
                    <option value="">Select Stage</option>
                    <option value="New">New</option>
                    <option value="Screening">Screening</option>
                    <option value="Interview">Interview</option>
                    <option value="Offer">Offer</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Hired">Hired</option>
                  </select>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Category</h3>
                  <select
                    className="w-full border p-2 rounded bg-background text-sm"
                    value={modalCategory}
                    onChange={(e) => setModalCategory(e.target.value)}
                  >
                    <option value="">(None)</option>
                    {allCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2 border p-3 rounded bg-background min-h-[80px]">
                    {allTags.map((tag) => {
                      const isSelected = modalTags.includes(tag);
                      return (
                        <Badge
                          key={tag}
                          variant={isSelected ? "default" : "outline"}
                          className={cn(
                            "cursor-pointer hover:opacity-80",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : ""
                          )}
                          onClick={() => {
                            if (isSelected) {
                              setModalTags(modalTags.filter((t) => t !== tag));
                            } else {
                              setModalTags([...modalTags, tag]);
                            }
                          }}
                        >
                          {tag}
                        </Badge>
                      );
                    })}
                    {allTags.length === 0 && (
                      <div className="text-sm text-muted-foreground w-full text-center py-4">
                        No tags available
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">
                    Skills (comma-separated)
                  </h3>
                  <textarea
                    className="w-full border p-2 rounded text-sm resize-none bg-background"
                    rows={3}
                    value={modalSkills.join(", ")}
                    onChange={(e) =>
                      setModalSkills(
                        e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean)
                      )
                    }
                  />
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Education</h3>
                  <textarea
                    className="w-full border p-2 rounded text-sm resize-none bg-background"
                    rows={3}
                    value={modalEducation}
                    onChange={(e) => setModalEducation(e.target.value)}
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Rating</h3>
                  <div className="flex items-center gap-2">
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
                  <h3 className="text-sm font-medium mb-2">Notes</h3>
                  <textarea
                    className="w-full border p-2 rounded text-sm resize-none bg-background"
                    rows={6}
                    value={modalNotes}
                    onChange={(e) => setModalNotes(e.target.value)}
                    placeholder="Add notes about this candidate..."
                  />
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Add History Note</h3>
                  <textarea
                    className="w-full border p-2 rounded text-sm resize-none bg-background"
                    rows={3}
                    placeholder="Add a new history entry..."
                    value={modalNewHistory}
                    onChange={(e) => setModalNewHistory(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* History Timeline */}
            <div className="mt-6 border-t pt-4">
              <h3 className="text-sm font-medium mb-3">History</h3>

              {modalHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  No history entries yet
                </p>
              ) : (
                <div className="space-y-3">
                  {[...modalHistory].reverse().map((entry, idx) => (
                    <div
                      key={idx}
                      className="border-l-2 border-muted pl-3 py-1"
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

            {/* Action Buttons */}
            <div className="mt-6 pt-4 border-t flex justify-between">
              <Button variant="destructive" onClick={handleDeleteCandidate}>
                Delete Candidate
              </Button>

              <div className="flex gap-2">
                <Button variant="outline" onClick={closeDetail}>
                  Cancel
                </Button>
                <Button onClick={handleSaveDetail}>Save Changes</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Toaster />
    </section>
  );
}
