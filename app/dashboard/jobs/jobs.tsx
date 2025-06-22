// app/dashboard/jobs/jobs.tsx

"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import {
  AlertCircle,
  Briefcase,
  ListChecks,
  Loader2,
  Plus,
  Search,
  Shield,
  TagIcon,
  Trash2,
  UserIcon,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Toaster, toast } from "sonner";

import type { RowSelectionState } from "@tanstack/react-table";
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
import { columns, type Job } from "./columns";

interface Status {
  id: string;
  title: string;
  order: number;
  color?: string;
}

// History entry interface
interface HistoryEntry {
  date: string;
  note: string;
}

// Constants for empty values
const UNASSIGNED_VALUE = "unassigned";
const NONE_CATEGORY_VALUE = "none";

// Default job statuses
const DEFAULT_JOB_STATUSES = [
  {
    title: "Draft",
    order: 1,
    color: "bg-gray-100 text-gray-800 border-gray-300",
  },
  {
    title: "Published",
    order: 2,
    color: "bg-green-100 text-green-800 border-green-300",
  },
  {
    title: "On Hold",
    order: 3,
    color: "bg-yellow-100 text-yellow-800 border-yellow-300",
  },
  {
    title: "Closed",
    order: 4,
    color: "bg-red-100 text-red-800 border-red-300",
  },
];

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // For searching
  const [globalFilter, setGlobalFilter] = useState("");

  // For shared tags & categories
  const [allTags, setAllTags] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);

  // For bulk actions
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [bulkStatusId, setBulkStatusId] = useState("");
  const [bulkTag, setBulkTag] = useState("");

  // For create job modal
  const [createJobOpen, setCreateJobOpen] = useState(false);
  const [createJobData, setCreateJobData] = useState({
    title: "",
    description: "",
    requirements: [] as string[],
    location: "",
    salaryRange: "",
    department: "",
    employmentType: "",
    statusId: "",
    tags: [] as string[],
    category: "",
  });

  // For detail modal
  const [detailJob, setDetailJob] = useState<Job | null>(null);
  const [modalTitle, setModalTitle] = useState("");
  const [modalDescription, setModalDescription] = useState("");
  const [modalRequirements, setModalRequirements] = useState<string[]>([]);
  const [modalLocation, setModalLocation] = useState("");
  const [modalSalaryRange, setModalSalaryRange] = useState("");
  const [modalDepartment, setModalDepartment] = useState("");
  const [modalEmploymentType, setModalEmploymentType] = useState("");
  const [modalStatusId, setModalStatusId] = useState("");
  const [modalTags, setModalTags] = useState<string[]>([]);
  const [modalCategory, setModalCategory] = useState("");
  const [modalHistory, setModalHistory] = useState<HistoryEntry[]>([]);
  const [modalNewHistory, setModalNewHistory] = useState("");
  const [activeTab, setActiveTab] = useState("details");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Track original state for change detection
  const [originalState, setOriginalState] = useState<any>(null);

  // Initialize job statuses on first load
  const initializeJobStatuses = async () => {
    try {
      const statusesSnapshot = await getDocs(collection(db, "job-statuses"));
      if (statusesSnapshot.empty) {
        // Create default statuses
        for (const status of DEFAULT_JOB_STATUSES) {
          await addDoc(collection(db, "job-statuses"), status);
        }
      }
    } catch (error) {
      console.error("Error initializing job statuses:", error);
    }
  };

  useEffect(() => {
    initializeJobStatuses();
  }, []);

  // 1. Real-time Firestore jobs
  useEffect(() => {
    const q = query(collection(db, "jobs"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          jobId: data.jobId || "", // Custom job ID
          title: data.title || "",
          description: data.description || "",
          requirements: data.requirements || [],
          location: data.location || "",
          salaryRange: data.salaryRange || "",
          department: data.department || "",
          employmentType: data.employmentType || "",
          tags: data.tags || [],
          category: data.category || "",
          statusId: data.statusId || "",
          history: data.history || [],
          createdAt: data.createdAt,
          updatedAt: data.updatedAt || "",
          onEdit: (job: Job) => openJobDetail(job),
        } as Job;
      });
      setJobs(docs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Real-time Firestore job statuses - sorted by order
  useEffect(() => {
    const q = query(collection(db, "job-statuses"), orderBy("order", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const statusList = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: data.title,
          order: data.order,
          color: data.color,
        };
      });
      setStatuses(statusList);
    });
    return () => unsubscribe();
  }, []);

  // 3. Real-time Firestore tags (shared with candidates)
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
    setSelectedJobIds(selectedIds);
  }, [rowSelection]);

  // 4. Real-time Firestore categories (shared with candidates)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "categories"), (snapshot) => {
      const list = snapshot.docs.map((d) => d.data().name) as string[];
      setAllCategories(list);
    });
    return () => unsubscribe();
  }, []);

  // 5. Filter (search) logic
  const filteredJobs = useMemo(() => {
    const f = globalFilter.toLowerCase();
    if (!f) return jobs;

    // Get status titles for searching
    const statusTitleMap = new Map(
      statuses.map((s) => [s.id, s.title.toLowerCase()])
    );

    return jobs.filter((job) => {
      // Get status title for this job if it exists
      const statusTitle = statusTitleMap.get(job.statusId) || "";

      // Searching across title, tags, category, status, etc.
      const combined = [
        job.title,
        job.description || "",
        job.location || "",
        job.department || "",
        job.employmentType || "",
        job.tags.join(" "),
        job.category,
        statusTitle,
        job.requirements?.join(" "),
        job.salaryRange,
      ]
        .join(" ")
        .toLowerCase();
      return combined.includes(f);
    });
  }, [jobs, globalFilter, statuses]);

  // Helper function to detect changes between current and original state
  const detectChanges = () => {
    if (!originalState || !detailJob) return {};

    const changes: Record<string, { from: any; to: any }> = {};

    // Check for status changes
    const origStatusId =
      originalState.statusId === UNASSIGNED_VALUE ? "" : originalState.statusId;
    const newStatusId = modalStatusId === UNASSIGNED_VALUE ? "" : modalStatusId;
    if (origStatusId !== newStatusId) {
      const oldStatus =
        statuses.find((s) => s.id === origStatusId)?.title || "Unassigned";
      const newStatus =
        statuses.find((s) => s.id === newStatusId)?.title || "Unassigned";
      changes.status = { from: oldStatus, to: newStatus };
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

    // Check for tags changes
    if (JSON.stringify(originalState.tags) !== JSON.stringify(modalTags)) {
      changes.tags = {
        from:
          originalState.tags.length > 0
            ? originalState.tags.join(", ")
            : "None",
        to: modalTags.length > 0 ? modalTags.join(", ") : "None",
      };
    }

    // Check for requirements changes
    if (
      JSON.stringify(originalState.requirements) !==
      JSON.stringify(modalRequirements)
    ) {
      changes.requirements = {
        from:
          originalState.requirements.length > 0
            ? originalState.requirements.join(", ")
            : "None",
        to:
          modalRequirements.length > 0 ? modalRequirements.join(", ") : "None",
      };
    }

    // Check for basic field changes
    const fields = [
      "title",
      "description",
      "location",
      "salaryRange",
      "department",
      "employmentType",
    ];

    fields.forEach((field) => {
      const modalValue =
        field === "title"
          ? modalTitle
          : field === "description"
          ? modalDescription
          : field === "location"
          ? modalLocation
          : field === "salaryRange"
          ? modalSalaryRange
          : field === "department"
          ? modalDepartment
          : modalEmploymentType;

      if (originalState[field] !== modalValue) {
        changes[field] = {
          from: originalState[field] || "None",
          to: modalValue || "None",
        };
      }
    });

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
        case "status":
          note = `Status changed from "${from}" to "${to}"`;
          break;
        case "category":
          note = `Category changed from "${from}" to "${to}"`;
          break;
        case "tags":
          note = `Tags updated from [${from}] to [${to}]`;
          break;
        case "requirements":
          note = `Requirements updated from [${from}] to [${to}]`;
          break;
        case "title":
          note = `Job title updated`;
          break;
        case "description":
          note = `Job description updated`;
          break;
        case "location":
          note = `Location updated from "${from}" to "${to}"`;
          break;
        case "salaryRange":
          note = `Salary range updated from "${from}" to "${to}"`;
          break;
        case "department":
          note = `Department updated from "${from}" to "${to}"`;
          break;
        case "employmentType":
          note = `Employment type updated from "${from}" to "${to}"`;
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

  // Generate custom job ID
  const generateJobId = () => {
    const prefix = "JOB";
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
    const random = Math.random().toString(36).substring(2, 5).toUpperCase(); // 3 random chars
    return `${prefix}-${timestamp}-${random}`;
  };

  // Create new job
  const handleCreateJob = async () => {
    if (!createJobData.title.trim()) {
      toast.error("Job title is required");
      return;
    }

    try {
      setIsSubmitting(true);
      const createLoading = toast.loading("Creating job...");

      const customJobId = generateJobId();

      const newJob = {
        jobId: customJobId, // Custom job ID
        title: createJobData.title.trim(),
        description: createJobData.description.trim(),
        requirements: createJobData.requirements,
        location: createJobData.location.trim(),
        salaryRange: createJobData.salaryRange.trim(),
        department: createJobData.department.trim(),
        employmentType: createJobData.employmentType,
        statusId:
          createJobData.statusId === UNASSIGNED_VALUE
            ? ""
            : createJobData.statusId,
        tags: createJobData.tags,
        category:
          createJobData.category === NONE_CATEGORY_VALUE
            ? ""
            : createJobData.category,
        history: [
          {
            date: new Date().toISOString(),
            note: `Job posting created with ID: ${customJobId}`,
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await addDoc(collection(db, "jobs"), newJob);
      toast.dismiss(createLoading);
      toast.success(`Job created successfully with ID: ${customJobId}`);

      // Reset form and close modal
      setCreateJobData({
        title: "",
        description: "",
        requirements: [],
        location: "",
        salaryRange: "",
        department: "",
        employmentType: "",
        statusId: "",
        tags: [],
        category: "",
      });
      setCreateJobOpen(false);
    } catch (err) {
      console.error("Error creating job:", err);
      toast.error("Error creating job");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 6. Open job detail
  const openJobDetail = (job: Job) => {
    setDetailJob(job);
    setModalTitle(job.title || "");
    setModalDescription(job.description || "");
    setModalRequirements(job.requirements || []);
    setModalLocation(job.location || "");
    setModalSalaryRange(job.salaryRange || "");
    setModalDepartment(job.department || "");
    setModalEmploymentType(job.employmentType || "");
    setModalStatusId(job.statusId || UNASSIGNED_VALUE);
    setModalTags(job.tags || []);
    setModalCategory(job.category || NONE_CATEGORY_VALUE);
    setModalHistory(job.history || []);
    setModalNewHistory("");
    setActiveTab("details");

    // Store original state for change tracking
    setOriginalState({
      title: job.title || "",
      description: job.description || "",
      requirements: [...(job.requirements || [])],
      location: job.location || "",
      salaryRange: job.salaryRange || "",
      department: job.department || "",
      employmentType: job.employmentType || "",
      statusId: job.statusId || UNASSIGNED_VALUE,
      tags: [...(job.tags || [])],
      category: job.category || NONE_CATEGORY_VALUE,
    });
  };

  // 7. Save job detail changes
  const handleSaveDetail = async () => {
    if (!detailJob) return;

    try {
      setIsSubmitting(true);
      const saveLoading = toast.loading("Saving changes...");

      // Detect changes for history
      const changes = detectChanges();
      const hasChanges = Object.keys(changes).length > 0;

      // Generate history entries for the changes
      const changeHistoryEntries = generateHistoryEntries(changes);

      const ref = doc(db, "jobs", detailJob.id);
      const updatedData = {
        title: modalTitle,
        description: modalDescription,
        requirements: modalRequirements,
        location: modalLocation,
        salaryRange: modalSalaryRange,
        department: modalDepartment,
        employmentType: modalEmploymentType,
        // Convert back from UNASSIGNED_VALUE to empty string for storage
        statusId: modalStatusId === UNASSIGNED_VALUE ? "" : modalStatusId,
        tags: modalTags,
        // Convert back from NONE_CATEGORY_VALUE to empty string for storage
        category: modalCategory === NONE_CATEGORY_VALUE ? "" : modalCategory,
        history: modalHistory,
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
          `Job updated with ${changeHistoryEntries.length} changes tracked`
        );
      } else {
        toast.success("Job updated successfully");
      }

      closeDetail();
    } catch (err) {
      console.error("Error saving job detail:", err);
      toast.error("Error updating job");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 8. Delete job
  const handleDeleteJob = async () => {
    if (!detailJob) return;

    try {
      setIsSubmitting(true);
      const deleteLoading = toast.loading("Deleting job...");

      // Delete the job record from Firestore
      const jobRef = doc(db, "jobs", detailJob.id);
      await deleteDoc(jobRef);

      toast.dismiss(deleteLoading);
      toast.success("Job deleted successfully");
      setShowDeleteDialog(false);
      closeDetail();
    } catch (err) {
      console.error("Error deleting job:", err);
      toast.error("Error deleting job");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle bulk actions
  const handleBulkAction = async (action: "status" | "tag" | "delete") => {
    if (selectedJobIds.length === 0) {
      toast.error("No jobs selected");
      return;
    }

    // Additional validation per action type
    if (action === "status" && !bulkStatusId) {
      toast.error("Please select a status");
      return;
    }

    if (action === "tag" && !bulkTag) {
      toast.error("Please select a tag");
      return;
    }

    try {
      setIsSubmitting(true);
      const actionLoading = toast.loading(
        `Processing ${selectedJobIds.length} jobs...`
      );

      let successCount = 0;

      for (const id of selectedJobIds) {
        try {
          // Find job in local state
          const job = jobs.find((j) => j.id === id);
          if (!job) {
            console.warn(
              `Job with ID ${id} not found in local state, skipping`
            );
            continue;
          }

          // Create Firestore reference
          const jobRef = doc(db, "jobs", id);

          // Create history entry
          const historyEntry = {
            date: new Date().toISOString(),
            note: "",
          };

          if (action === "status" && bulkStatusId) {
            // Status change logic
            const oldStatus =
              statuses.find((s) => s.id === job.statusId)?.title ||
              "Unassigned";
            const newStatus =
              statuses.find((s) => s.id === bulkStatusId)?.title ||
              "Unassigned";

            historyEntry.note = `Status changed from "${oldStatus}" to "${newStatus}" via bulk update`;

            await updateDoc(jobRef, {
              statusId: bulkStatusId,
              history: [...(job.history || []), historyEntry],
              updatedAt: new Date().toISOString(),
            });

            successCount++;
          } else if (action === "tag" && bulkTag) {
            // Tag action
            const currentTags = Array.isArray(job.tags) ? [...job.tags] : [];

            if (!currentTags.includes(bulkTag)) {
              historyEntry.note = `Tag "${bulkTag}" added via bulk update`;
              const newTags = [...currentTags, bulkTag];

              await updateDoc(jobRef, {
                tags: newTags,
                history: [...(job.history || []), historyEntry],
                updatedAt: new Date().toISOString(),
              });

              successCount++;
            }
          } else if (action === "delete") {
            // Delete action
            await deleteDoc(jobRef);
            successCount++;
          }
        } catch (jobError) {
          console.error(`Error processing job ${id}:`, jobError);
          // Continue with other jobs even if one fails
        }
      }

      toast.dismiss(actionLoading);

      if (successCount > 0) {
        toast.success(
          action === "delete"
            ? `Deleted ${successCount} of ${selectedJobIds.length} jobs`
            : `Updated ${successCount} of ${selectedJobIds.length} jobs`
        );

        // Clear selection after successful action
        setRowSelection({});
        setSelectedJobIds([]);
        setBulkActionOpen(false);
      } else {
        toast.error(`Failed to process any jobs. Check console for errors.`);
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
    setDetailJob(null);
    setOriginalState(null);
  };

  // Get a color style for badge by statusId
  const getBadgeColorByStatusId = (statusId: string) => {
    const status = statuses.find((s) => s.id === statusId);
    return status?.color || "";
  };

  // Get status title from status ID
  const getStatusTitleById = (statusId: string) => {
    const status = statuses.find((s) => s.id === statusId);
    return status ? status.title : "Unassigned";
  };

  // Handle row selection changes
  const handleRowSelectionChange = (newRowSelection: RowSelectionState) => {
    setRowSelection(newRowSelection);

    // Also update the legacy selectedJobIds array
    const selectedIds = Object.keys(newRowSelection).filter(
      (id) => newRowSelection[id]
    );
    setSelectedJobIds(selectedIds);
  };

  if (loading) {
    return (
      <section className="p-6">
        <div className="flex flex-col items-center justify-center h-60 gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
          <div className="text-muted-foreground text-sm">Loading jobs...</div>
        </div>
      </section>
    );
  }

  return (
    <section className="p-6 max-w-full">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="h-6 w-6" />
            Jobs
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage and track your job postings
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="py-1 px-3">
            {jobs.length} jobs
          </Badge>
          <Button onClick={() => setCreateJobOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Job
          </Button>
        </div>
      </div>

      {/* Searching */}
      <div className="flex flex-col md:flex-row gap-4 items-center mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs by title, location, department..."
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
            {filteredJobs.length} of {jobs.length} jobs
          </span>
        </div>
      </div>

      {/* Bulk Actions UI */}
      {selectedJobIds.length > 0 && (
        <div className="bg-muted/20 flex items-center justify-between px-4 py-2 rounded-md mb-4 border">
          <div className="flex items-center">
            <Checkbox
              checked={selectedJobIds.length === filteredJobs.length}
              onCheckedChange={(checked) => {
                if (checked) {
                  // Select all rows
                  const newRowSelection: RowSelectionState = {};
                  filteredJobs.forEach((job) => {
                    newRowSelection[job.id] = true;
                  });
                  setRowSelection(newRowSelection);
                  setSelectedJobIds(filteredJobs.map((j) => j.id));
                } else {
                  // Clear selection
                  setRowSelection({});
                  setSelectedJobIds([]);
                }
              }}
              className="mr-2"
            />
            <span className="text-sm font-medium">
              {selectedJobIds.length} job
              {selectedJobIds.length !== 1 ? "s" : ""} selected
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
                setSelectedJobIds([]);
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
          columns={columns}
          data={filteredJobs.map((job) => {
            const status = statuses.find((s) => s.id === job.statusId);
            return {
              ...job,
              status: status ? status.title : "Unassigned",
              statusColor: status ? status.color : "",
            };
          })}
          globalFilter={globalFilter}
          onRowSelectionChange={handleRowSelectionChange}
          rowSelection={rowSelection}
          getRowId={(row) => row.id}
        />
      </div>

      {/* Create Job Modal */}
      <Dialog open={createJobOpen} onOpenChange={setCreateJobOpen}>
        <DialogContent className="max-w-4xl w-full h-[90vh] flex flex-col p-0">
          <div className="flex flex-col h-full">
            {/* Fixed Header */}
            <DialogHeader className="px-6 py-4 border-b">
              <DialogTitle className="text-xl">Create New Job</DialogTitle>
              <DialogDescription>
                Add a new job posting to your database
              </DialogDescription>
            </DialogHeader>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                {/* Basic Information Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium border-b pb-2">
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="create-title"
                        className="text-sm font-medium"
                      >
                        Job Title *
                      </Label>
                      <Input
                        id="create-title"
                        value={createJobData.title}
                        onChange={(e) =>
                          setCreateJobData({
                            ...createJobData,
                            title: e.target.value,
                          })
                        }
                        placeholder="e.g. Senior Software Engineer"
                        className="h-10"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="create-department"
                        className="text-sm font-medium"
                      >
                        Department
                      </Label>
                      <Input
                        id="create-department"
                        value={createJobData.department}
                        onChange={(e) =>
                          setCreateJobData({
                            ...createJobData,
                            department: e.target.value,
                          })
                        }
                        placeholder="e.g. Engineering"
                        className="h-10"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="create-location"
                        className="text-sm font-medium"
                      >
                        Location
                      </Label>
                      <Input
                        id="create-location"
                        value={createJobData.location}
                        onChange={(e) =>
                          setCreateJobData({
                            ...createJobData,
                            location: e.target.value,
                          })
                        }
                        placeholder="e.g. New York, NY or Remote"
                        className="h-10"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="create-salary"
                        className="text-sm font-medium"
                      >
                        Salary Range
                      </Label>
                      <Input
                        id="create-salary"
                        value={createJobData.salaryRange}
                        onChange={(e) =>
                          setCreateJobData({
                            ...createJobData,
                            salaryRange: e.target.value,
                          })
                        }
                        placeholder="e.g. $80,000 - $120,000"
                        className="h-10"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="create-employment-type"
                        className="text-sm font-medium"
                      >
                        Employment Type
                      </Label>
                      <Select
                        value={createJobData.employmentType}
                        onValueChange={(value) =>
                          setCreateJobData({
                            ...createJobData,
                            employmentType: value,
                          })
                        }
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select employment type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full-time">Full-time</SelectItem>
                          <SelectItem value="part-time">Part-time</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                          <SelectItem value="internship">Internship</SelectItem>
                          <SelectItem value="temporary">Temporary</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="create-status"
                        className="text-sm font-medium"
                      >
                        Status
                      </Label>
                      <Select
                        value={createJobData.statusId}
                        onValueChange={(value) =>
                          setCreateJobData({
                            ...createJobData,
                            statusId: value,
                          })
                        }
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={UNASSIGNED_VALUE}>
                            Unassigned
                          </SelectItem>
                          {statuses.map((status) => (
                            <SelectItem key={status.id} value={status.id}>
                              {status.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Job Details Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium border-b pb-2">
                    Job Details
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="create-description"
                        className="text-sm font-medium"
                      >
                        Job Description
                      </Label>
                      <Textarea
                        id="create-description"
                        value={createJobData.description}
                        onChange={(e) =>
                          setCreateJobData({
                            ...createJobData,
                            description: e.target.value,
                          })
                        }
                        placeholder="Describe the role, responsibilities, and what the candidate will be working on..."
                        className="min-h-[120px] resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="create-requirements"
                        className="text-sm font-medium"
                      >
                        Requirements
                      </Label>
                      <Textarea
                        id="create-requirements"
                        value={createJobData.requirements.join(", ")}
                        onChange={(e) =>
                          setCreateJobData({
                            ...createJobData,
                            requirements: e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          })
                        }
                        placeholder="Enter requirements separated by commas (e.g. 5+ years experience, JavaScript, React, Node.js)"
                        className="min-h-[80px] resize-none"
                      />
                      <p className="text-xs text-muted-foreground">
                        Separate each requirement with a comma
                      </p>
                    </div>
                  </div>
                </div>

                {/* Organization Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium border-b pb-2">
                    Organization
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="create-category"
                        className="text-sm font-medium"
                      >
                        Category
                      </Label>
                      <Select
                        value={createJobData.category}
                        onValueChange={(value) =>
                          setCreateJobData({
                            ...createJobData,
                            category: value,
                          })
                        }
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select category" />
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
                    </div>

                    {/* Tags selection */}
                    {allTags.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Tags</Label>
                        <div className="border rounded-md p-3 bg-muted/10 max-h-32 overflow-y-auto">
                          <div className="flex flex-wrap gap-2">
                            {allTags.map((tag) => {
                              const isSelected =
                                createJobData.tags.includes(tag);
                              return (
                                <Badge
                                  key={tag}
                                  variant={isSelected ? "default" : "outline"}
                                  className={cn(
                                    "cursor-pointer hover:opacity-80 h-7 px-3 text-xs transition-all",
                                    isSelected
                                      ? "bg-primary text-primary-foreground"
                                      : ""
                                  )}
                                  onClick={() => {
                                    if (isSelected) {
                                      setCreateJobData({
                                        ...createJobData,
                                        tags: createJobData.tags.filter(
                                          (t) => t !== tag
                                        ),
                                      });
                                    } else {
                                      setCreateJobData({
                                        ...createJobData,
                                        tags: [...createJobData.tags, tag],
                                      });
                                    }
                                  }}
                                >
                                  {tag}
                                </Badge>
                              );
                            })}
                          </div>
                          {allTags.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No tags available. Create tags in the Tags
                              management section.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Add some bottom padding for better spacing */}
                <div className="h-4"></div>
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="px-6 py-4 border-t bg-background">
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setCreateJobOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateJob}
                  disabled={isSubmitting || !createJobData.title.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Job"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Job Detail Modal */}
      {detailJob && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => {
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
              <h2 className="text-xl font-bold">{detailJob.title}</h2>

              <div className="mt-2 md:mt-0 flex items-center">
                <Badge
                  className={`mr-2 ${
                    modalStatusId !== UNASSIGNED_VALUE
                      ? getBadgeColorByStatusId(modalStatusId)
                      : ""
                  }`}
                  variant={
                    modalStatusId !== UNASSIGNED_VALUE ? "default" : "outline"
                  }
                >
                  {modalStatusId !== UNASSIGNED_VALUE
                    ? getStatusTitleById(modalStatusId)
                    : "Unassigned"}
                </Badge>
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
                  <Briefcase className="size-4" />
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
              </TabsList>

              <ScrollArea className="flex-grow">
                <TabsContent value="details" className="py-2 min-h-[400px]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label
                          htmlFor="title"
                          className="text-sm font-medium mb-2 block"
                        >
                          Job Title
                        </Label>
                        <Input
                          id="title"
                          value={modalTitle}
                          onChange={(e) => setModalTitle(e.target.value)}
                          placeholder="e.g. Senior Software Engineer"
                        />
                      </div>

                      <div>
                        <Label
                          htmlFor="location"
                          className="text-sm font-medium mb-2 block"
                        >
                          Location
                        </Label>
                        <Input
                          id="location"
                          value={modalLocation}
                          onChange={(e) => setModalLocation(e.target.value)}
                          placeholder="e.g. New York, NY"
                        />
                      </div>

                      <div>
                        <Label
                          htmlFor="department"
                          className="text-sm font-medium mb-2 block"
                        >
                          Department
                        </Label>
                        <Input
                          id="department"
                          value={modalDepartment}
                          onChange={(e) => setModalDepartment(e.target.value)}
                          placeholder="e.g. Engineering"
                        />
                      </div>

                      <div>
                        <Label
                          htmlFor="employmentType"
                          className="text-sm font-medium mb-2 block"
                        >
                          Employment Type
                        </Label>
                        <Select
                          value={modalEmploymentType}
                          onValueChange={setModalEmploymentType}
                        >
                          <SelectTrigger id="employmentType">
                            <SelectValue placeholder="Select employment type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full-time">Full-time</SelectItem>
                            <SelectItem value="part-time">Part-time</SelectItem>
                            <SelectItem value="contract">Contract</SelectItem>
                            <SelectItem value="internship">
                              Internship
                            </SelectItem>
                            <SelectItem value="temporary">Temporary</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label
                          htmlFor="status"
                          className="text-sm font-medium mb-2 block"
                        >
                          Status
                        </Label>
                        <Select
                          value={modalStatusId}
                          onValueChange={setModalStatusId}
                        >
                          <SelectTrigger id="status" className="w-full">
                            <SelectValue placeholder="Select a status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={UNASSIGNED_VALUE}>
                              Unassigned
                            </SelectItem>
                            {statuses.map((status) => (
                              <SelectItem key={status.id} value={status.id}>
                                {status.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label
                          htmlFor="salaryRange"
                          className="text-sm font-medium mb-2 block"
                        >
                          Salary Range
                        </Label>
                        <Input
                          id="salaryRange"
                          value={modalSalaryRange}
                          onChange={(e) => setModalSalaryRange(e.target.value)}
                          placeholder="e.g. $80,000 - $120,000"
                        />
                      </div>

                      <div>
                        <Label
                          htmlFor="description"
                          className="text-sm font-medium mb-2 block"
                        >
                          Job Description
                        </Label>
                        <Textarea
                          id="description"
                          value={modalDescription}
                          onChange={(e) => setModalDescription(e.target.value)}
                          placeholder="Job description and responsibilities..."
                          className="resize-none min-h-[120px]"
                        />
                      </div>

                      <div>
                        <Label
                          htmlFor="requirements"
                          className="text-sm font-medium mb-2 block"
                        >
                          Requirements (comma-separated)
                        </Label>
                        <Textarea
                          id="requirements"
                          value={modalRequirements.join(", ")}
                          onChange={(e) =>
                            setModalRequirements(
                              e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean)
                            )
                          }
                          placeholder="e.g. 5+ years experience, JavaScript, React"
                          className="resize-none min-h-[100px]"
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
                            <Briefcase className="mb-2 h-6 w-6 opacity-40" />
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
                        The system automatically tracks changes to job
                        information
                      </p>
                    </div>

                    {/* Add new history entry */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="newHistory"
                        className="text-sm font-medium"
                      >
                        Add History Note
                      </Label>
                      <div className="flex gap-2">
                        <Textarea
                          id="newHistory"
                          value={modalNewHistory}
                          onChange={(e) => setModalNewHistory(e.target.value)}
                          placeholder="Add a note about this job..."
                          className="resize-none"
                          rows={2}
                        />
                      </div>
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

                            if (entry.note.includes("Status changed")) {
                              Icon = TagIcon;
                              iconColor = "text-violet-500";
                            } else if (entry.note.includes("Tags updated")) {
                              Icon = TagIcon;
                              iconColor = "text-emerald-500";
                            } else if (entry.note.includes("Department")) {
                              Icon = UserIcon;
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
              </ScrollArea>
            </Tabs>

            {/* Action Buttons */}
            <div className="mt-4 pt-4 border-t flex justify-between">
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isSubmitting}
              >
                Delete Job
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
            <AlertDialogTitle>Delete this job?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete{" "}
              <strong>{detailJob?.title}</strong> from your job database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteJob}
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
              Apply actions to {selectedJobIds.length} selected job
              {selectedJobIds.length !== 1 ? "s" : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Change Status
              </label>
              <Select value={bulkStatusId} onValueChange={setBulkStatusId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      {status.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                className="w-full mt-2"
                variant="outline"
                onClick={() => handleBulkAction("status")}
                disabled={!bulkStatusId || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Apply Status Change"
                )}
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
