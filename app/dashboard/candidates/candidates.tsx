// app/dashboard/candidates/candidates.tsx

"use client";

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from "firebase/storage";
import {
  AlertCircle,
  BadgeCheck,
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
  UserIcon,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Toaster, toast } from "sonner";

import type { RowSelectionState } from "@tanstack/react-table";
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
import { Progress } from "~/components/ui/progress";
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
import { db, storage } from "~/lib/firebase";
import { cn } from "~/lib/utils";
import type {
  Candidate,
  CandidateDocument,
  CommunicationEntry,
  InterviewFeedback,
  Stage,
} from "~/types";
import InterviewManager from "../interviews/interview-manager";
import { columns } from "./columns";
import ScoreDetail from "./score-detail";

// History entry interface
interface HistoryEntry {
  date: string;
  note: string;
}

// Define job interface
interface Job {
  id: string;
  title: string;
  status: string;
  location: string;
  department: string;
  salary: string;
}

// Use centralized feedback type instead of local interface
// interface FeedbackEntry - removed, using InterviewFeedback from ~/types

// Constants for empty values - fixes the SelectItem empty value issue
const UNASSIGNED_VALUE = "unassigned";
const NONE_CATEGORY_VALUE = "none";
const NO_TAGS_VALUE = "no-tags";

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackList, setFeedbackList] = useState<InterviewFeedback[]>([]);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);
  const [isLoadingCommunications, setIsLoadingCommunications] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

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
  const [modalHistory, setModalHistory] = useState<HistoryEntry[]>([]);
  const [modalNewHistory, setModalNewHistory] = useState("");
  const [modalExperience, setModalExperience] = useState("");
  const [activeTab, setActiveTab] = useState("details");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Communications state
  const [modalCommunications, setModalCommunications] = useState<
    CommunicationEntry[]
  >([]);

  // Resume scoring state
  const [newScoringJobId, setNewScoringJobId] = useState<string>("");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isScoring, setIsScoring] = useState(false);

  // Documents state
  const [modalDocuments, setModalDocuments] = useState<CandidateDocument[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showDocumentDeleteDialog, setShowDocumentDeleteDialog] =
    useState(false);
  const [documentToDelete, setDocumentToDelete] =
    useState<CandidateDocument | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Document preview
  const [previewDocument, setPreviewDocument] =
    useState<CandidateDocument | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  // Track original state for change detection
  const [originalState, setOriginalState] = useState<any>(null);

  // Add this state to your component
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  // Add this useEffect to fetch jobs
  useEffect(() => {
    const fetchJobs = async () => {
      setLoadingJobs(true);
      try {
        const jobsCollection = collection(db, "jobs");
        const jobsQuery = query(jobsCollection);
        const snapshot = await getDocs(jobsQuery);

        const jobsList = snapshot.docs.map((doc) => ({
          id: doc.id,
          title: doc.data().title || "Untitled Job",
          status: doc.data().status || "Draft",
          location: doc.data().location || "",
          department: doc.data().department || "",
          salary: doc.data().salary || "",
        }));

        setJobs(jobsList);
      } catch (error) {
        console.error("Error fetching jobs:", error);
        toast.error("Failed to load jobs");
      } finally {
        setLoadingJobs(false);
      }
    };

    fetchJobs();
  }, []);

  // Add a function to handle the selection of a job
  const handleJobSelection = (jobId: string) => {
    setNewScoringJobId(jobId);
    const selectedJob = jobs.find((job) => job.id === jobId);
    setSelectedJob(selectedJob || null);
  };

  // 1. Fetch Feedbacks - real-time
  const fetchCandidateFeedback = async (candidateId: string) => {
    if (!candidateId) return;

    try {
      setIsFeedbackLoading(true);

      // Create a query to get feedback for this specific candidate
      const q = query(
        collection(db, "feedback"),
        where("candidateId", "==", candidateId)
      );

      // Get the documents
      const querySnapshot = await getDocs(q);

      // Map the documents to our FeedbackEntry interface
      const feedbackEntries = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          candidateId: data.candidateId || "",
          candidateName: data.candidateName || "",
          interviewerId: data.teamMemberId || "",
          interviewerName: data.teamMemberName || "",
          overallRating: data.rating || 0,
          recommendation:
            data.recommendation === "hire"
              ? "hire"
              : data.recommendation === "reject"
              ? "no-hire"
              : data.recommendation === "consider"
              ? "consider"
              : "hire",
          strengths: data.strengths || "",
          weaknesses: data.weaknesses || "",
          reasoning: data.recommendation || "",
          improvementAreas: "",
          technicalSkills: data.rating || 0,
          communication: data.rating || 0,
          culturalFit: data.rating || 0,
          experience: data.rating || 0,
          interviewId: "", // Will need to link properly
          createdAt: data.createdAt || new Date().toISOString(),
        } as InterviewFeedback;
      });

      setFeedbackList(feedbackEntries);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      toast.error("Failed to load feedback");
    } finally {
      setIsFeedbackLoading(false);
    }
  };

  // Handle scoring against a job
  const handleScoreAgainstJob = async () => {
    if (!detailCandidate || !newScoringJobId) {
      toast.error("Please select a job to score against");
      return;
    }

    try {
      setIsScoring(true);

      // Make API call to score endpoint
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/resume/score`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": import.meta.env.VITE_API_KEY || "",
          },
          body: JSON.stringify({
            resumeData: {
              name: detailCandidate.name,
              skills: detailCandidate.skills || [],
              experience: detailCandidate.experience || "",
              education: detailCandidate.education || "",
              jobTitle: detailCandidate.jobTitle || "",
            },
            jobData: {
              id: newScoringJobId,
              title: selectedJob?.title || "Job Position",
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to score resume");
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error("Failed to score resume");
      }

      // Update candidate with new score
      if (data.data) {
        const scoreResult = data.data;

        // Update candidate document in Firestore
        const candidateRef = doc(db, "candidates", detailCandidate.id);
        const newHistoryEntry = {
          date: new Date().toISOString(),
          note: `Resume scored against job "${
            selectedJob?.title || "Job Position"
          }" with a match of ${Math.round(scoreResult.finalScore)}%`,
        };
        await updateDoc(candidateRef, {
          resumeScore: scoreResult.finalScore,
          resumeScoringDetails: scoreResult,
          scoredAgainstJobId: newScoringJobId,
          scoredAgainstJobTitle: selectedJob?.title,
          updatedAt: new Date().toISOString(),
          history: [...(detailCandidate.history || []), newHistoryEntry],
        });

        // Optimistically update local state for immediate UI feedback
        setDetailCandidate((prev) =>
          prev
            ? {
                ...prev,
                resumeScore: scoreResult.finalScore,
                resumeScoringDetails: scoreResult,
                scoredAgainstJobId: newScoringJobId,
                scoredAgainstJobTitle: selectedJob?.title,
                updatedAt: new Date().toISOString(),
                history: [...(prev.history || []), newHistoryEntry],
              }
            : prev
        );

        toast.success("Resume scored successfully");

        // Reset the job selection
        setNewScoringJobId("");
        setSelectedJob(null);
      }
    } catch (error) {
      console.error("Error scoring resume:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to score resume"
      );
    } finally {
      setIsScoring(false);
    }
  };

  // In your first useEffect for fetching candidates
  useEffect(() => {
    const q = query(collection(db, "candidates"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();

        // Create documents array that includes the resume if it exists
        let documents = data.documents || [];

        // If resumeFileURL exists and documents array is empty, add the resume
        if (data.resumeFileURL && documents.length === 0) {
          const resumeDoc: CandidateDocument = {
            id: docSnap.id + "-resume",
            name: data.originalFilename || "Resume.pdf",
            type: data.fileType || "application/pdf",
            size: data.fileSize || 0,
            uploadDate:
              data.updatedAt || data.createdAt || new Date().toISOString(),
            path: data.resumeFileURL,
            url: data.resumeFileURL,
          };
          documents = [resumeDoc];
        }

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
          jobTitle: data.jobTitle || "",
          stageColor: data.stageColor || "",
          resumeScore: data.resumeScore || 0,
          resumeScoringDetails: data.resumeScoringDetails || null,
          scoredAgainstJobId: data.scoredAgainstJobId || "",
          scoredAgainstJobTitle: data.scoredAgainstJobTitle || "",
          // Use the documents array we constructed
          history: data.history || [],
          communications: data.communications || [],
          interviewHistory: data.interviewHistory || [],
          documents: documents, // Use our constructed documents array
          resumeFileURL: data.resumeFileURL,
          originalFilename: data.originalFilename,
          fileType: data.fileType,
          fileSize: data.fileSize,
          createdAt: data.createdAt,
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

  useEffect(() => {
    const selectedIds = Object.keys(rowSelection).filter(
      (id) => rowSelection[id]
    );
    setSelectedCandidateIds(selectedIds);
  }, [rowSelection]);

  // 4. Real-time Firestore categories
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "categories"), (snapshot) => {
      const list = snapshot.docs.map((d) => d.data().name) as string[];
      setAllCategories(list);
    });
    return () => unsubscribe();
  }, []);

  // Real-time Firestore communications
  const fetchCandidateMessages = async (candidateId: string) => {
    if (!candidateId) return;

    try {
      setIsLoadingCommunications(true);

      // Simplified query that doesn't require a composite index
      // Just fetch messages by recipientId without ordering
      const messagesQuery = query(
        collection(db, "messages"),
        where("recipientId", "==", candidateId)
      );

      const messagesSnapshot = await getDocs(messagesQuery);

      // Map the documents to our CommunicationEntry interface
      const communicationEntries = messagesSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          date: data.sentAt || "",
          message: data.body || "",
          type: "sent", // All messages from collection are sent messages
          sender: "HR Team", // Default sender
          subject: data.subject || "",
          read: true, // Messages from our system are always marked as read
        } as CommunicationEntry;
      });

      // Sort manually in memory (client-side) instead of using Firestore's orderBy
      communicationEntries.sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      // Update the communications state
      setModalCommunications(communicationEntries);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load communication history");
    } finally {
      setIsLoadingCommunications(false);
    }
  };

  // 5. Filter (search) logic
  const filteredCandidates = useMemo(() => {
    const f = globalFilter.toLowerCase().trim();
    if (!f) return candidates;

    // Get stage titles for searching
    const stageTitleMap = new Map(
      stages.map((s) => [s.id, s.title.toLowerCase()])
    );

    return candidates.filter((cand) => {
      // Get stage title for this candidate if it exists
      const stageTitle = stageTitleMap.get(cand.stageId) || "";

      // Helper function to safely convert to searchable string
      const toSearchString = (value: any): string => {
        if (value == null) return "";
        if (Array.isArray(value)) return value.join(" ");
        return String(value);
      };

      // Create searchable fields array
      const searchableFields = [
        cand.name,
        cand.email,
        cand.phone,
        cand.jobTitle,
        cand.experience,
        cand.education,
        cand.notes,
        cand.category,
        stageTitle,
        toSearchString(cand.tags),
        toSearchString(cand.skills),
      ];

      // Combine all fields and search
      const combined = searchableFields
        .filter(Boolean) // Remove null/undefined values
        .map((field) => String(field).toLowerCase())
        .join(" ");

      return combined.includes(f);
    });
  }, [candidates, globalFilter, stages]);

  // Helper function to detect changes between current and original state
  const detectChanges = () => {
    if (!originalState || !detailCandidate) return {};

    const changes: Record<string, { from: any; to: any }> = {};

    // Check for stage changes
    const origStageId =
      originalState.stageId === UNASSIGNED_VALUE ? "" : originalState.stageId;
    const newStageId = modalStageId === UNASSIGNED_VALUE ? "" : modalStageId;
    if (origStageId !== newStageId) {
      const oldStage =
        stages.find((s) => s.id === origStageId)?.title || "Unassigned";
      const newStage =
        stages.find((s) => s.id === newStageId)?.title || "Unassigned";
      changes.stage = { from: oldStage, to: newStage };
    }

    // Check for rating changes
    if (originalState.rating !== modalRating) {
      changes.rating = { from: originalState.rating, to: modalRating };
    }

    // Check for category changes
    const origCategory =
      originalState.category === NONE_CATEGORY_VALUE
        ? ""
        : originalState.category;
    const newCategory =
      modalCategory === NONE_CATEGORY_VALUE ? "" : modalCategory;
    if (origCategory !== newCategory) {
      changes.category = {
        from: origCategory || "None",
        to: newCategory || "None",
      };
    }

    // Check for tags changes - handle array comparison
    if (JSON.stringify(originalState.tags) !== JSON.stringify(modalTags)) {
      changes.tags = {
        from:
          originalState.tags.length > 0
            ? originalState.tags.join(", ")
            : "None",
        to: modalTags.length > 0 ? modalTags.join(", ") : "None",
      };
    }

    // Check for skills changes
    if (JSON.stringify(originalState.skills) !== JSON.stringify(modalSkills)) {
      changes.skills = {
        from:
          originalState.skills.length > 0
            ? originalState.skills.join(", ")
            : "None",
        to: modalSkills.length > 0 ? modalSkills.join(", ") : "None",
      };
    }

    // Check for experience changes
    if (originalState.experience !== modalExperience) {
      changes.experience = {
        from: originalState.experience || "None",
        to: modalExperience || "None",
      };
    }

    // Check for education changes
    if (originalState.education !== modalEducation) {
      changes.education = {
        from: originalState.education || "None",
        to: modalEducation || "None",
      };
    }

    // Check for notes changes (only track that they changed, not the content)
    if (originalState.notes !== modalNotes) {
      changes.notes = { from: "Previous notes", to: "Updated notes" };
    }

    return changes;
  };

  // Generate history entries from detected changes
  const generateHistoryEntries = (
    changes: Record<string, { from: any; to: any }>
  ) => {
    const entries: HistoryEntry[] = [];
    const timestamp = new Date().toISOString();

    Object.entries(changes).forEach(([field, { from, to }]) => {
      let note = "";

      switch (field) {
        case "stage":
          note = `Stage changed from "${from}" to "${to}"`;
          break;
        case "rating":
          note = `Rating changed from ${from} to ${to} stars`;
          break;
        case "category":
          note = `Category changed from "${from}" to "${to}"`;
          break;
        case "tags":
          note = `Tags updated from [${from}] to [${to}]`;
          break;
        case "skills":
          note = `Skills updated from [${from}] to [${to}]`;
          break;
        case "experience":
          note = `Experience updated from "${from}" to "${to}"`;
          break;
        case "education":
          note = `Education information updated`;
          break;
        case "notes":
          note = `Notes were updated`;
          break;
        default:
          note = `${field} was updated`;
      }

      entries.push({
        date: timestamp,
        note: note,
      });
    });

    return entries;
  };

  // 6. Open candidate detail
  const openCandidateDetail = (cand: Candidate) => {
    setDetailCandidate(cand);
    setModalSkills(cand.skills || []);
    setModalEducation(cand.education || "");
    setModalNotes(cand.notes || "");
    setModalRating(cand.rating || 0);
    setModalStageId(cand.stageId || UNASSIGNED_VALUE);
    setModalTags(cand.tags || []);
    setModalCategory(cand.category || NONE_CATEGORY_VALUE);
    setModalHistory(cand.history || []);

    // Initialize with any existing communications from the candidate object
    setModalCommunications(cand.communications || []);

    // Fetch additional messages from the messages collection
    fetchCandidateMessages(cand.id);

    // Documents should already be prepared from the data fetch
    setModalDocuments(cand.documents || []);

    // Load document URLs if needed
    if (cand.documents && cand.documents.length > 0) {
      loadDocumentUrls(cand.documents);
    }

    // Fetch feedback for this candidate
    fetchCandidateFeedback(cand.id);

    setModalNewHistory("");
    setModalExperience(cand.experience || "");
    setActiveTab("details");

    // Store original state for change tracking
    setOriginalState({
      skills: [...(cand.skills || [])],
      education: cand.education || "",
      notes: cand.notes || "",
      rating: cand.rating || 0,
      stageId: cand.stageId || UNASSIGNED_VALUE,
      tags: [...(cand.tags || [])],
      category: cand.category || NONE_CATEGORY_VALUE,
      experience: cand.experience || "",
    });
  };

  // Load the download URLs for documents
  const loadDocumentUrls = async (documents: CandidateDocument[]) => {
    if (!documents.length) return;

    const updatedDocs = await Promise.all(
      documents.map(async (doc) => {
        if (!doc.url) {
          try {
            const storageRef = ref(storage, doc.path);
            const url = await getDownloadURL(storageRef);
            return { ...doc, url };
          } catch (error) {
            console.error(`Error loading URL for ${doc.name}:`, error);
            return doc;
          }
        }
        return doc;
      })
    );

    setModalDocuments(updatedDocs);
  };

  // Mark a message as read
  const markMessageAsRead = async (messageId: string) => {
    if (!detailCandidate) return;

    try {
      // Find and update the message
      const updatedCommunications = modalCommunications.map((msg) =>
        msg.id === messageId ? { ...msg, read: true } : msg
      );

      // Update Firestore
      const ref = doc(db, "candidates", detailCandidate.id);
      await updateDoc(ref, {
        communications: updatedCommunications,
      });

      // Update local state
      setModalCommunications(updatedCommunications);
    } catch (err) {
      console.error("Error marking message as read:", err);
      toast.error("Failed to update message status");
    }
  };

  // 7. Save candidate detail changes
  const handleSaveDetail = async () => {
    if (!detailCandidate) return;

    try {
      setIsSubmitting(true);
      const saveLoading = toast.loading("Saving changes...");

      // Detect changes for history
      const changes = detectChanges();
      const hasChanges = Object.keys(changes).length > 0;

      // Generate history entries for the changes
      const changeHistoryEntries = generateHistoryEntries(changes);

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
        communications: modalCommunications,
        documents: modalDocuments, // Save documents
        experience: modalExperience,
        updatedAt: new Date().toISOString(),
      };

      // Add any automatically generated history entries
      if (changeHistoryEntries.length > 0) {
        updatedData.history = [...modalHistory, ...changeHistoryEntries];
      }

      // If user typed a new history note, add it as well
      if (modalNewHistory.trim()) {
        const newEntry = {
          date: new Date().toISOString(),
          note: modalNewHistory.trim(),
        };
        updatedData.history = [...updatedData.history, newEntry];
      }

      await updateDoc(ref, updatedData);
      toast.dismiss(saveLoading);

      if (hasChanges) {
        toast.success(
          `Candidate updated with ${changeHistoryEntries.length} changes tracked`
        );
      } else {
        toast.success("Candidate updated successfully");
      }

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

      // Delete all associated documents from storage first
      if (detailCandidate.documents && detailCandidate.documents.length > 0) {
        for (const document of detailCandidate.documents) {
          const storageRef = ref(storage, document.path);
          await deleteObject(storageRef).catch((error) => {
            console.error(`Error deleting document ${document.name}:`, error);
            // Continue with deletion even if some files fail to delete
          });
        }
      }

      // Delete the candidate record from Firestore
      const candidateRef = doc(db, "candidates", detailCandidate.id);
      await deleteDoc(candidateRef);

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

  // Handle file upload
  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files.length || !detailCandidate) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const file = e.target.files[0];
      const fileId = crypto.randomUUID();
      const fileName = file.name;
      const fileType = file.type || getFileExtension(fileName);
      const filePath = `candidates/${detailCandidate.id}/documents/${fileId}-${fileName}`;

      // Create a reference to the file location in Firebase Storage
      const storageRef = ref(storage, filePath);

      // Upload file with progress monitoring
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
          setUploadProgress(progress);
        },
        (error) => {
          console.error("Upload error:", error);
          toast.error("File upload failed");
          setIsUploading(false);
        },
        async () => {
          // Upload completed successfully
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          // Create new document record
          const newDocument: CandidateDocument = {
            id: fileId,
            name: fileName,
            type: fileType,
            size: file.size,
            uploadDate: new Date().toISOString(),
            path: filePath,
            url: downloadURL,
          };

          // Add to documents array
          const updatedDocuments = [...modalDocuments, newDocument];
          setModalDocuments(updatedDocuments);

          // Prepare the update data
          const updateData: any = {
            documents: updatedDocuments,
            updatedAt: new Date().toISOString(),
          };

          // If this is a resume file (PDF or has 'resume' in the name), also update the legacy fields
          const isResume =
            fileType.includes("pdf") ||
            fileName.toLowerCase().includes("resume") ||
            fileName.toLowerCase().includes("cv");

          if (
            isResume &&
            (modalDocuments.length === 0 ||
              (modalDocuments.length === 1 &&
                modalDocuments[0].id.includes("-resume")))
          ) {
            updateData.resumeFileURL = downloadURL;
            updateData.originalFilename = fileName;
            updateData.fileType = fileType;
            updateData.fileSize = file.size;
          }

          // Update Firestore with the new document
          const candidateRef = doc(db, "candidates", detailCandidate.id);
          await updateDoc(candidateRef, updateData);

          // Add history entry for the document upload
          const historyEntry: HistoryEntry = {
            date: new Date().toISOString(),
            note: `Document "${fileName}" was uploaded`,
          };

          const updatedHistory = [...modalHistory, historyEntry];
          setModalHistory(updatedHistory);

          await updateDoc(candidateRef, {
            history: updatedHistory,
          });

          toast.success("Document uploaded successfully");
          setIsUploading(false);

          // Reset the file input
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }
      );
    } catch (error) {
      console.error("Error in file upload process:", error);
      toast.error("File upload process failed");
      setIsUploading(false);
    }
  };

  // Handle document download
  const handleDocumentDownload = async (candidateDoc: CandidateDocument) => {
    try {
      // If we already have the URL, use it, otherwise get it
      let downloadURL = candidateDoc.url;
      if (!downloadURL) {
        const storageRef = ref(storage, candidateDoc.path);
        downloadURL = await getDownloadURL(storageRef);
      }

      // Create a temporary link and trigger download
      const link = globalThis.document.createElement("a");
      link.href = downloadURL;
      link.download = candidateDoc.name;
      globalThis.document.body.appendChild(link);
      link.click();
      globalThis.document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading document:", error);
      toast.error("Failed to download document");
    }
  };

  // Handle document preview
  const handleDocumentPreview = (document: CandidateDocument) => {
    setPreviewDocument(document);
    setShowPreviewDialog(true);
  };

  // Handle document deletion
  const confirmDeleteDocument = (document: CandidateDocument) => {
    setDocumentToDelete(document);
    setShowDocumentDeleteDialog(true);
  };

  const handleDeleteDocument = async () => {
    if (!documentToDelete || !detailCandidate) return;

    try {
      setIsSubmitting(true);
      const deleteLoading = toast.loading("Deleting document...");

      // Delete from Firebase Storage
      if (documentToDelete.path) {
        try {
          const storageRef = ref(storage, documentToDelete.path);
          await deleteObject(storageRef);
        } catch (error) {
          console.error("Error deleting file from storage:", error);
          // Continue with deletion even if storage deletion fails
        }
      }

      // Update documents array to remove the deleted document
      const updatedDocuments = modalDocuments.filter(
        (doc) => doc.id !== documentToDelete.id
      );
      setModalDocuments(updatedDocuments);

      // Prepare update data
      const updateData: any = {
        documents: updatedDocuments,
        updatedAt: new Date().toISOString(),
      };

      // If deleting a resume file (based on ID), also clear the legacy fields
      if (documentToDelete.id.includes("-resume")) {
        updateData.resumeFileURL = "";
        updateData.originalFilename = "";
        updateData.fileType = "";
        updateData.fileSize = 0;
      }

      // Update Firestore
      const candidateRef = doc(db, "candidates", detailCandidate.id);
      await updateDoc(candidateRef, updateData);

      // Add history entry for the document deletion
      const historyEntry: HistoryEntry = {
        date: new Date().toISOString(),
        note: `Document "${documentToDelete.name}" was deleted`,
      };

      const updatedHistory = [...modalHistory, historyEntry];
      setModalHistory(updatedHistory);

      await updateDoc(candidateRef, {
        history: updatedHistory,
      });

      toast.dismiss(deleteLoading);
      toast.success("Document deleted successfully");
      setShowDocumentDeleteDialog(false);
      setDocumentToDelete(null);
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Failed to delete document");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle download all documents
  const handleDownloadAllDocuments = async () => {
    if (!modalDocuments.length || !detailCandidate) return;

    const downloadLoading = toast.loading(
      "Preparing documents for download..."
    );

    try {
      // Process each document
      for (const document of modalDocuments) {
        let downloadURL = document.url;
        if (!downloadURL) {
          const storageRef = ref(storage, document.path);
          downloadURL = await getDownloadURL(storageRef);
        }

        // Open each document in a new tab
        window.open(downloadURL, "_blank");
      }

      toast.dismiss(downloadLoading);
      toast.success(`${modalDocuments.length} documents ready for download`);
    } catch (error) {
      console.error("Error downloading documents:", error);
      toast.dismiss(downloadLoading);
      toast.error("Failed to download some documents");
    }
  };

  // Trigger file input click
  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Helper function to get file extension from filename
  const getFileExtension = (filename: string): string => {
    const parts = filename.split(".");
    return parts.length > 1 ? `.${parts[parts.length - 1].toLowerCase()}` : "";
  };

  // Helper function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Record a communication to history
  const recordCommunicationHistory = async (
    candidateId: string,
    type: "sent" | "received",
    subject?: string
  ) => {
    try {
      const candidate = candidates.find((c) => c.id === candidateId);
      if (!candidate) return;

      const historyEntry: HistoryEntry = {
        date: new Date().toISOString(),
        note:
          type === "sent"
            ? `Message sent to candidate${
                subject ? ` (Subject: ${subject})` : ""
              }`
            : `Message received from candidate${
                subject ? ` (Subject: ${subject})` : ""
              }`,
      };

      const ref = doc(db, "candidates", candidateId);
      await updateDoc(ref, {
        history: [...(candidate.history || []), historyEntry],
        updatedAt: new Date().toISOString(),
      });

      return historyEntry;
    } catch (err) {
      console.error(`Error recording ${type} communication:`, err);
      return null;
    }
  };

  // Handle bulk actions
  // Updated handleBulkAction function with extensive debugging and error handling
  const handleBulkAction = async (action: "stage" | "tag" | "delete") => {
    if (selectedCandidateIds.length === 0) {
      toast.error("No candidates selected");
      return;
    }

    // Additional validation per action type
    if (action === "stage" && !bulkStageId) {
      toast.error("Please select a stage");
      return;
    }

    if (action === "tag" && !bulkTag) {
      toast.error("Please select a tag");
      return;
    }

    try {
      setIsSubmitting(true);
      const actionLoading = toast.loading(
        `Processing ${selectedCandidateIds.length} candidates...`
      );

      console.log(`Starting bulk ${action} action`);
      console.log("Selected candidate IDs:", selectedCandidateIds);

      // For delete action, log additional info
      if (action === "delete") {
        console.log("Attempting to delete candidates:", selectedCandidateIds);
      }

      // For tag action, log the tag being added
      if (action === "tag") {
        console.log(
          `Adding tag "${bulkTag}" to candidates:`,
          selectedCandidateIds
        );
      }

      let successCount = 0;

      for (const id of selectedCandidateIds) {
        try {
          console.log(`Processing candidate ID: ${id} for ${action} action`);

          // Find candidate in local state
          const candidate = candidates.find((c) => c.id === id);
          if (!candidate) {
            console.warn(
              `Candidate with ID ${id} not found in local state, skipping`
            );
            continue;
          }

          // Create Firestore reference
          const candidateRef = doc(db, "candidates", id);
          console.log(`Created reference to document: candidates/${id}`);

          // Create history entry
          const historyEntry = {
            date: new Date().toISOString(),
            note: "",
          };

          if (action === "stage" && bulkStageId) {
            // Stage change logic (working already)
            const oldStage =
              stages.find((s) => s.id === candidate.stageId)?.title ||
              "Unassigned";
            const newStage =
              stages.find((s) => s.id === bulkStageId)?.title || "Unassigned";

            historyEntry.note = `Stage changed from "${oldStage}" to "${newStage}" via bulk update`;

            await updateDoc(candidateRef, {
              stageId: bulkStageId,
              history: [...(candidate.history || []), historyEntry],
              updatedAt: new Date().toISOString(),
            });

            successCount++;
          } else if (action === "tag" && bulkTag) {
            // Tag action - enhanced with better logging
            const currentTags = Array.isArray(candidate.tags)
              ? [...candidate.tags]
              : [];
            console.log(`Current tags for candidate ${id}:`, currentTags);

            if (!currentTags.includes(bulkTag)) {
              historyEntry.note = `Tag "${bulkTag}" added via bulk update`;
              const newTags = [...currentTags, bulkTag];
              console.log(`New tags will be:`, newTags);

              // Use set with merge to ensure the update works even if there are field type issues
              await updateDoc(candidateRef, {
                tags: newTags,
                history: [...(candidate.history || []), historyEntry],
                updatedAt: new Date().toISOString(),
              });

              console.log(`Successfully added tag to candidate ${id}`);
              successCount++;
            } else {
              console.log(
                `Candidate ${id} already has tag "${bulkTag}", skipping`
              );
            }
          } else if (action === "delete") {
            // Delete action - enhanced with additional checks
            console.log(`Starting deletion process for candidate ${id}`);

            // Check if we can get the document first
            try {
              const docSnap = await getDoc(candidateRef);
              if (!docSnap.exists()) {
                console.warn(`Document ${id} does not exist, skipping`);
                continue;
              }
              console.log(`Document ${id} exists, proceeding with deletion`);
            } catch (error) {
              console.error(`Error checking document ${id}:`, error);
              continue;
            }

            // Delete documents from storage if they exist
            if (candidate.documents && candidate.documents.length > 0) {
              for (const document of candidate.documents) {
                if (document.path) {
                  try {
                    console.log(`Deleting document at path: ${document.path}`);
                    const storageRef = ref(storage, document.path);
                    await deleteObject(storageRef);
                  } catch (error) {
                    console.error(`Error deleting document:`, error);
                    // Continue with candidate deletion even if document deletion fails
                  }
                }
              }
            }

            // Delete the candidate document with explicit error handling
            try {
              console.log(`Calling deleteDoc for candidate ${id}`);
              await deleteDoc(candidateRef);
              console.log(`Successfully deleted candidate ${id}`);
              successCount++;
            } catch (deleteError) {
              console.error(`Error deleting candidate ${id}:`, deleteError);
              throw deleteError; // Re-throw to be caught by outer try/catch
            }
          }
        } catch (candidateError) {
          console.error(`Error processing candidate ${id}:`, candidateError);
          // Continue with other candidates even if one fails
        }
      }

      toast.dismiss(actionLoading);

      if (successCount > 0) {
        toast.success(
          action === "delete"
            ? `Deleted ${successCount} of ${selectedCandidateIds.length} candidates`
            : `Updated ${successCount} of ${selectedCandidateIds.length} candidates`
        );

        // Clear selection after successful action
        setRowSelection({});
        setSelectedCandidateIds([]);
        setBulkActionOpen(false);

        // For delete action, we need to make sure our UI reflects the changes
        if (action === "delete") {
          // The onSnapshot listener should update the UI automatically
          console.log("Deletion completed, UI should update via onSnapshot");
        }
      } else {
        toast.error(
          `Failed to process any candidates. Check console for errors.`
        );
      }
    } catch (err) {
      console.error(`Error in bulk ${action} operation:`, err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Operation failed: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeDetail = () => {
    setDetailCandidate(null);
    setOriginalState(null);
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
  const handleRowSelectionChange = (newRowSelection: RowSelectionState) => {
    setRowSelection(newRowSelection);

    // Also update the legacy selectedCandidateIds array
    const selectedIds = Object.keys(newRowSelection).filter(
      (id) => newRowSelection[id]
    );
    setSelectedCandidateIds(selectedIds);
  };

  // Get icon for file type
  const getFileIcon = (fileType: string) => {
    if (fileType.includes("pdf")) {
      return <FileText className="size-5 text-red-500" />;
    } else if (fileType.includes("word") || fileType.includes("doc")) {
      return <FileText className="size-5 text-blue-500" />;
    } else if (
      fileType.includes("excel") ||
      fileType.includes("sheet") ||
      fileType.includes("xls")
    ) {
      return <FileText className="size-5 text-green-500" />;
    } else if (fileType.includes("image")) {
      return <FileText className="size-5 text-purple-500" />;
    } else {
      return <FileText className="size-5 text-gray-500" />;
    }
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
                  // Select all rows
                  const newRowSelection: RowSelectionState = {};
                  filteredCandidates.forEach((candidate) => {
                    newRowSelection[candidate.id] = true;
                  });
                  setRowSelection(newRowSelection);
                  setSelectedCandidateIds(filteredCandidates.map((c) => c.id));
                } else {
                  // Clear selection
                  setRowSelection({});
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
              onClick={() => {
                setRowSelection({});
                setSelectedCandidateIds([]);
              }}
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
          key={`datatable-${globalFilter}-${filteredCandidates.length}`}
          columns={columns}
          data={filteredCandidates.map((candidate) => {
            const stage = stages.find((s) => s.id === candidate.stageId);
            return {
              ...candidate,
              stage: stage ? stage.title : "Unassigned",
              stageColor: stage ? stage.color : "",
            };
          })}
          onRowSelectionChange={handleRowSelectionChange}
          rowSelection={rowSelection}
          getRowId={(row) => row.id}
        />
      </div>

      {/* Hidden file input for document upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
      />

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

            {/* Header - Fixed height */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 pr-10 flex-shrink-0">
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

            {/* Tabs Container - Flex grow to take remaining space */}
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex-1 flex flex-col min-h-0"
            >
              {/* Tabs Bar - Fixed height, always visible */}
              <TabsList className="mb-4 overflow-x-auto justify-start flex-nowrap whitespace-nowrap scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent w-full flex-shrink-0 h-12 p-1">
                <TabsTrigger
                  value="details"
                  className="flex items-center gap-1 h-10 px-4 text-sm font-medium"
                >
                  <FileText className="size-4" />
                  <span>Details</span>
                </TabsTrigger>
                <TabsTrigger
                  value="tags"
                  className="flex items-center gap-1 h-10 px-4 text-sm font-medium"
                >
                  <TagIcon className="size-4" />
                  <span>Tags & Categories</span>
                </TabsTrigger>
                <TabsTrigger
                  value="scoring"
                  className="flex items-center gap-1 h-10 px-4 text-sm font-medium"
                >
                  <BadgeCheck className="size-4" />
                  <span>Scoring</span>
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="flex items-center gap-1 h-10 px-4 text-sm font-medium"
                >
                  <Shield className="size-4" />
                  <span>History</span>
                </TabsTrigger>
                <TabsTrigger
                  value="communications"
                  className="flex items-center gap-1 h-10 px-4 text-sm font-medium"
                >
                  <MessageSquare className="size-4" />
                  <span>Communications</span>
                </TabsTrigger>
                <TabsTrigger
                  value="interviews"
                  className="flex items-center gap-1 h-10 px-4 text-sm font-medium"
                >
                  <Users className="size-4" />
                  <span>Interviews</span>
                </TabsTrigger>
                <TabsTrigger
                  value="feedback"
                  className="flex items-center gap-1 h-10 px-4 text-sm font-medium"
                >
                  <MessageCircle className="size-4" />
                  <span>Feedback</span>
                </TabsTrigger>
                <TabsTrigger
                  value="documents"
                  className="flex items-center gap-1 h-10 px-4 text-sm font-medium"
                >
                  <FileText className="size-4" />
                  <span>Documents</span>
                </TabsTrigger>
              </TabsList>

              {/* Tab Content Area - Scrollable content that takes remaining space */}
              <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="pr-4">
                    {/* Document Preview Dialog */}
                    <Dialog
                      open={showPreviewDialog}
                      onOpenChange={setShowPreviewDialog}
                    >
                      <DialogContent className="max-w-4xl w-full max-h-[80vh] flex flex-col">
                        <DialogHeader>
                          <DialogTitle>{previewDocument?.name}</DialogTitle>
                          <DialogDescription>
                            {previewDocument && (
                              <span className="text-xs">
                                {formatFileSize(previewDocument.size)} •
                                Uploaded{" "}
                                {new Date(
                                  previewDocument.uploadDate
                                ).toLocaleDateString()}
                              </span>
                            )}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex-grow flex items-center justify-center overflow-auto border rounded-md bg-muted/20 p-2 min-h-[400px]">
                          {previewDocument?.url ? (
                            previewDocument.type.includes("pdf") ? (
                              <iframe
                                src={`${previewDocument.url}#toolbar=0`}
                                className="w-full h-full min-h-[400px]"
                                title={previewDocument.name}
                              />
                            ) : previewDocument.type.includes("image") ? (
                              <img
                                src={previewDocument.url}
                                alt={previewDocument.name}
                                className="max-w-full max-h-full object-contain"
                              />
                            ) : (
                              <div className="text-center p-8">
                                <FileText className="size-12 mx-auto mb-4 text-muted-foreground" />
                                <p>Preview not available for this file type</p>
                                <Button
                                  onClick={() =>
                                    handleDocumentDownload(previewDocument)
                                  }
                                  className="mt-4"
                                >
                                  <Download className="size-4 mr-2" />
                                  Download to View
                                </Button>
                              </div>
                            )
                          ) : (
                            <div className="flex flex-col items-center">
                              <Loader2 className="size-8 animate-spin mb-4" />
                              <p>Loading document...</p>
                            </div>
                          )}
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() =>
                              handleDocumentDownload(previewDocument!)
                            }
                          >
                            <Download className="size-4 mr-2" />
                            Download
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    {/* Document Delete Confirmation Dialog */}
                    <AlertDialog
                      open={showDocumentDeleteDialog}
                      onOpenChange={setShowDocumentDeleteDialog}
                    >
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Delete this document?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently
                            delete the document
                            <strong> {documentToDelete?.name}</strong>.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={isSubmitting}>
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteDocument}
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

                    <TabsContent value="details" className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          {/* Contact Information Section */}
                          <div className="bg-muted/10 p-4 rounded-lg border">
                            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                              <UserIcon className="size-4" />
                              Contact Information
                            </h4>
                            <div className="space-y-3">
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Email
                                </Label>
                                <p className="text-sm font-medium">
                                  {detailCandidate.email || "Not provided"}
                                </p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Phone
                                </Label>
                                <p className="text-sm font-medium">
                                  {detailCandidate.phone || "Not provided"}
                                </p>
                              </div>
                              {detailCandidate.jobTitle && (
                                <div>
                                  <Label className="text-xs text-muted-foreground">
                                    Job Title
                                  </Label>
                                  <p className="text-sm font-medium">
                                    {detailCandidate.jobTitle}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

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
                              onChange={(e) =>
                                setModalExperience(e.target.value)
                              }
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
                        </div>

                        <div className="space-y-4">
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
                              onChange={(e) =>
                                setModalEducation(e.target.value)
                              }
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
                              className="resize-none min-h-[120px]"
                            />
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="tags" className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="overflow-hidden">
                          <CardHeader className="pb-2">
                            <h3 className="text-sm font-medium">Tags</h3>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {/* Selected Tags Display */}
                              {modalTags.length > 0 && (
                                <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/20">
                                  {modalTags.map((tag) => (
                                    <Badge
                                      key={tag}
                                      variant="default"
                                      className="flex items-center gap-1"
                                    >
                                      {tag}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setModalTags(
                                            modalTags.filter((t) => t !== tag)
                                          );
                                        }}
                                        className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                                      >
                                        <X className="size-3" />
                                      </button>
                                    </Badge>
                                  ))}
                                </div>
                              )}

                              {/* Tag Selection Dropdown */}
                              <Select
                                value=""
                                onValueChange={(value) => {
                                  if (value && !modalTags.includes(value)) {
                                    setModalTags([...modalTags, value]);
                                  }
                                }}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Add a tag..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {allTags
                                    .filter((tag) => !modalTags.includes(tag))
                                    .map((tag) => (
                                      <SelectItem key={tag} value={tag}>
                                        {tag}
                                      </SelectItem>
                                    ))}
                                  {allTags.filter(
                                    (tag) => !modalTags.includes(tag)
                                  ).length === 0 && (
                                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                      {allTags.length === 0
                                        ? "No tags available"
                                        : "All tags selected"}
                                    </div>
                                  )}
                                </SelectContent>
                              </Select>

                              {allTags.length === 0 && (
                                <div className="text-sm text-muted-foreground w-full text-center mt-6 py-6 flex flex-col items-center border rounded-md">
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

                    <TabsContent value="history" className="space-y-6">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Shield className="text-primary/70 size-4" />
                            <h3 className="font-medium">History Timeline</h3>
                          </div>
                        </div>

                        <div className="bg-muted/10 border border-muted/30 rounded-md px-3 py-2 flex items-center gap-2 mb-2">
                          <AlertCircle className="size-4 text-blue-500/70" />
                          <p className="text-xs text-muted-foreground">
                            The system automatically tracks changes to candidate
                            information
                          </p>
                        </div>

                        {modalHistory.length === 0 ? (
                          <div className="text-center py-10 border-dashed border rounded-md bg-muted/5">
                            <AlertCircle className="size-8 mx-auto mb-2 text-muted-foreground/40" />
                            <p className="text-muted-foreground text-sm">
                              No history entries yet
                            </p>
                          </div>
                        ) : (
                          <ScrollArea className="h-[300px] pr-4">
                            <div className="space-y-2.5 pb-1">
                              {[...modalHistory].reverse().map((entry, idx) => {
                                // Determine icon and color based on content
                                let Icon = AlertCircle;
                                let iconColor = "text-blue-500";

                                if (entry.note.includes("Stage changed")) {
                                  Icon = TagIcon;
                                  iconColor = "text-violet-500";
                                } else if (
                                  entry.note.includes("Rating changed")
                                ) {
                                  Icon = AlertCircle;
                                  iconColor = "text-amber-500";
                                } else if (
                                  entry.note.includes("Tags updated")
                                ) {
                                  Icon = TagIcon;
                                  iconColor = "text-emerald-500";
                                } else if (
                                  entry.note.includes("uploaded") ||
                                  entry.note.includes("Document")
                                ) {
                                  Icon = FileText;
                                  iconColor = "text-red-500";
                                } else if (
                                  entry.note.includes("Notes were updated")
                                ) {
                                  Icon = MessageCircle;
                                  iconColor = "text-sky-500";
                                }

                                return (
                                  <div
                                    key={idx}
                                    className="border rounded-md bg-background overflow-hidden hover:shadow-sm transition-all"
                                  >
                                    <div className="flex items-center border-b border-muted/30 px-3 py-1.5 bg-muted/5">
                                      <Icon
                                        className={`size-3.5 mr-2 ${iconColor}`}
                                      />
                                      <span className="text-xs text-muted-foreground">
                                        {new Date(entry.date).toLocaleString(
                                          undefined,
                                          {
                                            month: "short",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          }
                                        )}
                                      </span>
                                    </div>
                                    <div className="p-2.5">
                                      <p className="text-sm">{entry.note}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </ScrollArea>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="communications" className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium">Communication History</h3>
                          <Button size="sm" asChild>
                            <Link to={`/dashboard/communication`}>
                              <MessageSquarePlus className="size-4 mr-2" />
                              New Message
                            </Link>
                          </Button>
                        </div>

                        {isLoadingCommunications ? (
                          <div className="flex flex-col items-center justify-center h-[350px] border rounded-md">
                            <Loader2 className="h-8 w-8 animate-spin text-primary/60 mb-2" />
                            <p className="text-sm text-muted-foreground">
                              Loading messages...
                            </p>
                          </div>
                        ) : modalCommunications.length === 0 ? (
                          <div className="text-center py-12 border rounded-md bg-muted/20">
                            <MessageSquare className="size-8 mx-auto mb-2 text-muted-foreground/50" />
                            <p className="text-muted-foreground">
                              No communication history yet
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Messages sent to this candidate will appear here
                            </p>
                          </div>
                        ) : (
                          <div className="border rounded-md overflow-hidden bg-background">
                            <ScrollArea className="h-[350px]">
                              <div className="space-y-1 p-3">
                                {modalCommunications.map((comm) => (
                                  <div
                                    key={comm.id}
                                    className={`border p-3 rounded-md hover:border-primary/40 transition-colors ${
                                      comm.type === "received" && !comm.read
                                        ? "bg-muted/30 border-primary/50"
                                        : "bg-card"
                                    }`}
                                    onClick={() => {
                                      if (
                                        comm.type === "received" &&
                                        !comm.read
                                      ) {
                                        markMessageAsRead(comm.id);
                                      }
                                    }}
                                  >
                                    <div className="flex justify-between items-start mb-1">
                                      <div className="flex items-center gap-2">
                                        <Badge
                                          variant={
                                            comm.type === "sent"
                                              ? "default"
                                              : "secondary"
                                          }
                                          className="text-xs py-0 h-5"
                                        >
                                          {comm.type === "sent"
                                            ? "Sent"
                                            : "Received"}
                                        </Badge>
                                        <span className="text-sm font-medium">
                                          {comm.type === "sent"
                                            ? "HR Team"
                                            : detailCandidate?.name}
                                        </span>
                                      </div>
                                      <span className="text-xs text-muted-foreground">
                                        {new Date(comm.date).toLocaleString(
                                          undefined,
                                          {
                                            month: "short",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          }
                                        )}
                                      </span>
                                    </div>
                                    {comm.subject && (
                                      <p className="text-sm font-medium mb-1">
                                        {comm.subject}
                                      </p>
                                    )}
                                    <p className="text-sm mt-1 whitespace-pre-line text-muted-foreground">
                                      {comm.message.length > 120
                                        ? `${comm.message.substring(0, 120)}...`
                                        : comm.message}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="interviews" className="space-y-6">
                      <InterviewManager
                        candidate={detailCandidate}
                        onInterviewScheduled={() => {
                          // Refresh candidate data to show updated interview history
                          if (detailCandidate) {
                            openCandidateDetail(detailCandidate);
                          }
                        }}
                      />
                    </TabsContent>

                    <TabsContent value="feedback" className="space-y-6">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-medium">Interview Feedback</h3>
                          <Button
                            size="sm"
                            variant="outline"
                            asChild
                            className="h-8"
                          >
                            <Link to={`/dashboard/communication`}>
                              <Clipboard className="size-4 mr-1" />
                              Add Feedback
                            </Link>
                          </Button>
                        </div>

                        {isFeedbackLoading ? (
                          <div className="flex items-center justify-center h-40">
                            <Loader2 className="h-7 w-7 animate-spin text-primary/60" />
                          </div>
                        ) : feedbackList.length === 0 ? (
                          <div className="text-center py-8 border border-dashed rounded-md bg-muted/10">
                            <ClipboardCheck className="size-8 mx-auto mb-2 text-muted-foreground/40" />
                            <p className="text-muted-foreground text-sm">
                              No feedback submitted yet
                            </p>
                          </div>
                        ) : (
                          <ScrollArea className="h-[350px] pr-4">
                            <div className="space-y-3 pb-2">
                              {feedbackList.map((feedback) => (
                                <Card
                                  key={feedback.id}
                                  className="overflow-hidden shadow-sm border-muted/80 hover:border-primary/50 transition-colors"
                                >
                                  <div className="p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <UserIcon className="size-4 text-muted-foreground" />
                                        <span className="text-sm font-medium">
                                          {feedback.interviewerName}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          {new Date(
                                            feedback.createdAt
                                          ).toLocaleDateString()}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge
                                          variant={
                                            feedback.recommendation ===
                                            "consider"
                                              ? "outline"
                                              : feedback.recommendation ===
                                                "no-hire"
                                              ? "destructive"
                                              : "default"
                                          }
                                          className="text-xs font-medium py-0 h-5"
                                        >
                                          {feedback.recommendation
                                            .charAt(0)
                                            .toUpperCase() +
                                            feedback.recommendation.slice(1)}
                                        </Badge>
                                        <div className="flex">
                                          {[1, 2, 3, 4, 5].map((star) => (
                                            <svg
                                              key={star}
                                              xmlns="http://www.w3.org/2000/svg"
                                              className={`h-3.5 w-3.5 ${
                                                star <= feedback.overallRating
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

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                                      {feedback.strengths && (
                                        <div className="bg-muted/10 p-2 rounded border border-muted/40">
                                          <div className="text-xs font-medium text-emerald-600 mb-1">
                                            Strengths
                                          </div>
                                          <p className="text-xs">
                                            {feedback.strengths}
                                          </p>
                                        </div>
                                      )}
                                      {feedback.weaknesses && (
                                        <div className="bg-muted/10 p-2 rounded border border-muted/40">
                                          <div className="text-xs font-medium text-amber-600 mb-1">
                                            Areas for Improvement
                                          </div>
                                          <p className="text-xs">
                                            {feedback.weaknesses}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          </ScrollArea>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="documents" className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium">Candidate Documents</h3>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleDownloadAllDocuments}
                              disabled={!modalDocuments.length}
                            >
                              <Download className="size-4 mr-2" />
                              Download All
                            </Button>
                            <Button
                              size="sm"
                              onClick={triggerFileUpload}
                              disabled={isUploading}
                            >
                              {isUploading ? (
                                <>
                                  <Loader2 className="size-4 mr-2 animate-spin" />
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <Upload className="size-4 mr-2" />
                                  Upload
                                </>
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* Upload progress bar */}
                        {isUploading && (
                          <div className="mb-4">
                            <div className="flex justify-between mb-1 text-xs">
                              <span>Uploading...</span>
                              <span>{uploadProgress}%</span>
                            </div>
                            <Progress value={uploadProgress} />
                          </div>
                        )}

                        {/* Document list or empty state */}
                        {modalDocuments.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {modalDocuments.map((doc) => (
                              <div
                                key={doc.id}
                                className="border rounded-md p-4 flex flex-col hover:border-primary transition-colors"
                              >
                                <div className="flex items-center mb-2">
                                  {getFileIcon(doc.type)}
                                  <span className="font-medium truncate flex-1 ml-2">
                                    {doc.name}
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground mb-3">
                                  <div>Size: {formatFileSize(doc.size)}</div>
                                  <div>
                                    Uploaded:{" "}
                                    {new Date(
                                      doc.uploadDate
                                    ).toLocaleDateString()}
                                  </div>
                                </div>
                                <div className="flex justify-between mt-auto pt-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDocumentPreview(doc)}
                                  >
                                    <Eye className="size-4 mr-1" />
                                    View
                                  </Button>
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() =>
                                        handleDocumentDownload(doc)
                                      }
                                    >
                                      <Download className="size-4 mr-1" />
                                      Download
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-destructive hover:text-destructive"
                                      onClick={() => confirmDeleteDocument(doc)}
                                    >
                                      <Trash2 className="size-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="border rounded-lg p-6 flex flex-col items-center justify-center text-center py-16">
                            <FileText className="size-10 text-muted-foreground/50 mb-4" />
                            <h3 className="text-lg font-medium mb-1">
                              No documents uploaded yet
                            </h3>
                            <p className="text-muted-foreground">
                              Documents will appear here once uploaded
                            </p>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                    <TabsContent value="scoring" className="space-y-6">
                      <div className="space-y-6 overflow-auto h-full max-h-[460px]">
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-medium">Resume Scoring</h3>

                            {detailCandidate?.resumeScore ? (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "px-2 py-1",
                                  detailCandidate.resumeScore >= 80
                                    ? "bg-green-50 text-green-700"
                                    : detailCandidate.resumeScore >= 60
                                    ? "bg-blue-50 text-blue-700"
                                    : detailCandidate.resumeScore >= 40
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-red-50 text-red-700"
                                )}
                              >
                                <BadgeCheck className="mr-1.5 h-4 w-4" />
                                {Math.round(detailCandidate.resumeScore)}% Match
                              </Badge>
                            ) : null}
                          </div>

                          <ScoreDetail
                            scoreDetails={detailCandidate?.resumeScoringDetails}
                            score={detailCandidate?.resumeScore}
                            jobTitle={detailCandidate?.scoredAgainstJobTitle}
                            jobId={detailCandidate?.scoredAgainstJobId}
                            scoredAt={
                              detailCandidate?.resumeScoringDetails?.metadata
                                ?.scoredAt || detailCandidate?.updatedAt
                            }
                          />
                        </div>

                        <div>
                          <h4 className="text-sm font-medium mb-3">
                            Score Against a Different Job
                          </h4>
                          <div className="flex justify-between gap-3">
                            <div className="flex-1">
                              <Select
                                value={newScoringJobId}
                                onValueChange={handleJobSelection}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select a job to score against" />
                                </SelectTrigger>
                                <SelectContent>
                                  {jobs.map((job) => (
                                    <SelectItem key={job.id} value={job.id}>
                                      {job.title}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <div className="text-xs text-muted-foreground mt-1">
                                Select a job to calculate a resume match score
                              </div>
                            </div>
                            <Button
                              onClick={handleScoreAgainstJob}
                              disabled={!newScoringJobId || isScoring}
                              className="whitespace-nowrap self-start"
                            >
                              {isScoring ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Scoring...
                                </>
                              ) : (
                                <>
                                  <Zap className="mr-2 h-4 w-4" />
                                  Score Resume
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </div>
                </ScrollArea>
              </div>
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
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Apply Stage Change"
                )}
              </Button>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Add Tag</label>
              <Select
                value={bulkTag}
                onValueChange={(value) => {
                  console.log("Setting bulk tag to:", value);
                  setBulkTag(value);
                }}
              >
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
                onClick={() => {
                  console.log("Add tag button clicked");
                  console.log("Selected IDs:", selectedCandidateIds);
                  console.log("Tag to add:", bulkTag);
                  // Make sure bulkTag is not empty
                  if (!bulkTag) {
                    toast.error("Please select a tag to add");
                    return;
                  }
                  handleBulkAction("tag");
                }}
                disabled={!bulkTag || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Add Tag to Selected"
                )}
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
