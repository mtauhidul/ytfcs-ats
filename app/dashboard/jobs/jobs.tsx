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
  Building,
  Calendar,
  ChevronDown,
  DollarSign,
  ListChecks,
  Loader2,
  MapPin,
  MoreHorizontal,
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
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
import type { Job } from "~/types";
import type { ClientBasic } from "~/types/client";
import { clientService } from "~/services/clientService";
import { columns } from "./columns";

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
  const [clients, setClients] = useState<ClientBasic[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // For mobile view toggle
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // For searching
  const [globalFilter, setGlobalFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("all"); // New client filter

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
    statusId: UNASSIGNED_VALUE,
    tags: [] as string[],
    category: NONE_CATEGORY_VALUE,
    clientId: "",
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
  const [modalClientId, setModalClientId] = useState(""); // Client selection in edit modal
  const [modalHistory, setModalHistory] = useState<HistoryEntry[]>([]);
  const [activeTab, setActiveTab] = useState("details");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Track original state for change detection
  const [originalState, setOriginalState] = useState<any>(null);

  // Check screen size for responsive behavior
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setViewMode("cards");
      } else {
        setViewMode("table");
      }
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Initialize job statuses on first load
  const initializeJobStatuses = async () => {
    try {
      const statusesSnapshot = await getDocs(collection(db, "job-statuses"));
      if (statusesSnapshot.empty) {
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

  // Load clients for job assignment
  useEffect(() => {
    const loadClients = async () => {
      try {
        const clientsData = await clientService.getActiveClients();
        setClients(clientsData);
      } catch (error) {
        console.error("Error loading clients:", error);
      }
    };
    loadClients();
  }, []);

  // Real-time Firestore jobs
  useEffect(() => {
    const q = query(collection(db, "jobs"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          jobId: data.jobId || "",
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
          // Client information - CRITICAL for client-job relationship
          clientId: data.clientId || "",
          clientName: data.clientName || "",
          clientCompany: data.clientCompany || "",
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

  // Real-time Firestore job statuses
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

  // Real-time Firestore tags
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "tags"), (snapshot) => {
      const list = snapshot.docs.map((d) => d.data().name) as string[];
      setAllTags(list);
    });
    return () => unsubscribe();
  }, []);

  // Real-time Firestore categories
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "categories"), (snapshot) => {
      const list = snapshot.docs.map((d) => d.data().name) as string[];
      setAllCategories(list);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const selectedIds = Object.keys(rowSelection).filter(
      (id) => rowSelection[id]
    );
    setSelectedJobIds(selectedIds);
  }, [rowSelection]);

  // Filter logic
  const filteredJobs = useMemo(() => {
    let filtered = jobs;

    // Apply client filter first
    if (clientFilter && clientFilter !== "all") {
      filtered = filtered.filter((job) => job.clientId === clientFilter);
    }

    // Apply text search filter
    const f = globalFilter.trim().toLowerCase();
    if (!f) return filtered;

    const statusTitleMap = new Map(
      statuses.map((s) => [s.id, s.title.toLowerCase()])
    );

    return filtered.filter((job) => {
      const statusTitle = statusTitleMap.get(job.statusId) || "";

      // Ensure tags is always an array and normalize them
      const jobTags = Array.isArray(job.tags) ? job.tags : [];
      const normalizedTags = jobTags.map((tag) =>
        String(tag).toLowerCase().trim()
      );
      const tagsText = normalizedTags.join(" ");

      // Build searchable content with proper normalization
      const searchableFields = [
        String(job.title || "")
          .toLowerCase()
          .trim(),
        String(job.jobId || "")
          .toLowerCase()
          .trim(),
        String(job.description || "")
          .toLowerCase()
          .trim(),
        String(job.location || "")
          .toLowerCase()
          .trim(),
        String(job.department || "")
          .toLowerCase()
          .trim(),
        String(job.employmentType || "")
          .toLowerCase()
          .trim(),
        String(job.clientName || "")
          .toLowerCase()
          .trim(),
        String(job.clientCompany || "")
          .toLowerCase()
          .trim(),
        tagsText,
        String(job.category || "")
          .toLowerCase()
          .trim(),
        statusTitle,
        Array.isArray(job.requirements)
          ? job.requirements.join(" ").toLowerCase().trim()
          : "",
        String(job.salaryRange || "")
          .toLowerCase()
          .trim(),
      ].filter(Boolean);

      const combined = searchableFields.join(" ");

      // Check if search term matches any field
      return (
        combined.includes(f) || normalizedTags.some((tag) => tag.includes(f))
      );
    });
  }, [jobs, globalFilter, clientFilter, statuses]);

  // Helper functions
  const detectChanges = () => {
    if (!originalState || !detailJob) return {};
    const changes: Record<string, { from: any; to: any }> = {};

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

    if (JSON.stringify(originalState.tags) !== JSON.stringify(modalTags)) {
      changes.tags = {
        from:
          originalState.tags.length > 0
            ? originalState.tags.join(", ")
            : "None",
        to: modalTags.length > 0 ? modalTags.join(", ") : "None",
      };
    }

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

    // Detect client changes
    if (originalState.clientId !== modalClientId) {
      const oldClient = clients.find(c => c.id === originalState.clientId);
      const newClient = clients.find(c => c.id === modalClientId);
      changes.client = {
        from: oldClient ? `${oldClient.name} (${oldClient.companyName})` : "None",
        to: newClient ? `${newClient.name} (${newClient.companyName})` : "None",
      };
    }

    return changes;
  };

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
      entries.push({ date: timestamp, note });
    });

    return entries;
  };

  const generateJobId = () => {
    const prefix = "JOB";
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  };

  const handleCreateJob = async () => {
    if (!createJobData.title.trim()) {
      toast.error("Job title is required");
      return;
    }

    if (!createJobData.clientId) {
      toast.error("Please select a client for this job");
      return;
    }

    try {
      setIsSubmitting(true);
      const createLoading = toast.loading("Creating job...");
      const customJobId = generateJobId();

      // Get client info for caching
      const selectedClient = clients.find(c => c.id === createJobData.clientId);

      const newJob = {
        jobId: customJobId,
        title: createJobData.title.trim(),
        description: createJobData.description.trim(),
        requirements: createJobData.requirements,
        location: createJobData.location.trim(),
        salaryRange: createJobData.salaryRange.trim(),
        department: createJobData.department.trim(),
        employmentType: createJobData.employmentType,
        clientId: createJobData.clientId,
        clientName: selectedClient?.name || "",
        clientCompany: selectedClient?.companyName || "",
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
        clientId: "",
      });
      setCreateJobOpen(false);
    } catch (err) {
      console.error("Error creating job:", err);
      toast.error("Error creating job");
    } finally {
      setIsSubmitting(false);
    }
  };

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
    setModalClientId(job.clientId || ""); // Initialize client selection
    setModalHistory(job.history || []);
    setActiveTab("details");

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
      clientId: job.clientId || "", // Track client changes
    });
  };

  const handleSaveDetail = async () => {
    if (!detailJob) return;

    // Validate required fields
    if (!modalClientId) {
      toast.error("Please select a client for this job");
      return;
    }

    if (!modalTitle.trim()) {
      toast.error("Job title is required");
      return;
    }

    try {
      setIsSubmitting(true);
      const saveLoading = toast.loading("Saving changes...");

      const changes = detectChanges();
      const hasChanges = Object.keys(changes).length > 0;
      const changeHistoryEntries = generateHistoryEntries(changes);

      // Get updated client info for caching
      const selectedClient = clients.find(c => c.id === modalClientId);

      const ref = doc(db, "jobs", detailJob.id);
      const updatedData = {
        title: modalTitle,
        description: modalDescription,
        requirements: modalRequirements,
        location: modalLocation,
        salaryRange: modalSalaryRange,
        department: modalDepartment,
        employmentType: modalEmploymentType,
        statusId: modalStatusId === UNASSIGNED_VALUE ? "" : modalStatusId,
        tags: modalTags,
        category: modalCategory === NONE_CATEGORY_VALUE ? "" : modalCategory,
        // Update client relationship
        clientId: modalClientId,
        clientName: selectedClient?.name || "",
        clientCompany: selectedClient?.companyName || "",
        history: modalHistory,
        updatedAt: new Date().toISOString(),
      };

      if (changeHistoryEntries.length > 0) {
        updatedData.history = [...modalHistory, ...changeHistoryEntries];
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

  const handleDeleteJob = async () => {
    if (!detailJob) return;

    try {
      setIsSubmitting(true);
      const deleteLoading = toast.loading("Deleting job...");

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

  const handleBulkAction = async (action: "status" | "tag" | "delete") => {
    if (selectedJobIds.length === 0) {
      toast.error("No jobs selected");
      return;
    }

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
          const job = jobs.find((j) => j.id === id);
          if (!job) {
            console.warn(
              `Job with ID ${id} not found in local state, skipping`
            );
            continue;
          }

          const jobRef = doc(db, "jobs", id);
          const historyEntry = {
            date: new Date().toISOString(),
            note: "",
          };

          if (action === "status" && bulkStatusId) {
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
            await deleteDoc(jobRef);
            successCount++;
          }
        } catch (jobError) {
          console.error(`Error processing job ${id}:`, jobError);
        }
      }

      toast.dismiss(actionLoading);

      if (successCount > 0) {
        toast.success(
          action === "delete"
            ? `Deleted ${successCount} of ${selectedJobIds.length} jobs`
            : `Updated ${successCount} of ${selectedJobIds.length} jobs`
        );
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

  const getBadgeColorByStatusId = (statusId: string) => {
    const status = statuses.find((s) => s.id === statusId);
    return status?.color || "";
  };

  const getStatusTitleById = (statusId: string) => {
    const status = statuses.find((s) => s.id === statusId);
    return status ? status.title : "Unassigned";
  };

  const handleRowSelectionChange = (newRowSelection: RowSelectionState) => {
    setRowSelection(newRowSelection);
    const selectedIds = Object.keys(newRowSelection).filter(
      (id) => newRowSelection[id]
    );
    setSelectedJobIds(selectedIds);
  };

  // Mobile Card Component
  const JobCard = ({ job }: { job: Job }) => {
    const status = statuses.find((s) => s.id === job.statusId);
    const isSelected = selectedJobIds.includes(job.id);

    return (
      <Card
        className={cn(
          "relative transition-all duration-200 hover:shadow-md",
          isSelected && "ring-2 ring-primary bg-primary/5"
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => {
                  const newSelection = { ...rowSelection };
                  if (checked) {
                    newSelection[job.id] = true;
                  } else {
                    delete newSelection[job.id];
                  }
                  setRowSelection(newSelection);
                }}
              />
              <div className="min-w-0 flex-1">
                <h3
                  className="font-semibold text-sm truncate"
                  title={job.title}
                >
                  {job.title}
                </h3>
                {job.jobId && (
                  <p className="text-xs text-muted-foreground font-mono">
                    {job.jobId}
                  </p>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openJobDetail(job)}>
                  View Details
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {/* Status */}
          <div className="flex items-center justify-between">
            <Badge
              variant={status ? "default" : "outline"}
              className={cn("text-xs", status?.color)}
            >
              {status ? status.title : "Unassigned"}
            </Badge>
          </div>

          {/* Department and Location */}
          <div className="space-y-2">
            {job.department && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Building className="h-3 w-3" />
                <span className="truncate">{job.department}</span>
              </div>
            )}
            {job.location && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{job.location}</span>
              </div>
            )}
            {job.salaryRange && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <DollarSign className="h-3 w-3" />
                <span className="truncate">{job.salaryRange}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {job.tags && job.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {job.tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs px-2 py-0"
                >
                  {tag}
                </Badge>
              ))}
              {job.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs px-2 py-0">
                  +{job.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Updated Date */}
          {job.updatedAt && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>
                Updated {new Date(job.updatedAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <div className="flex flex-col items-center justify-center h-60 gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
          <div className="text-muted-foreground text-sm">Loading jobs...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-full">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Briefcase className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
            <span className="truncate">Jobs</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage and track your job postings
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <Badge variant="outline" className="py-1 px-3 text-xs sm:text-sm">
            {jobs.length} jobs
          </Badge>
          <Button
            onClick={() => setCreateJobOpen(true)}
            size={isMobile ? "sm" : "default"}
          >
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Create Job</span>
            <span className="sm:hidden">Create</span>
          </Button>
        </div>
      </div>

      {/* Search and View Toggle */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-4">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-10 pr-10 h-9 sm:h-10"
          />
          {globalFilter && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-9 w-9 sm:h-10 sm:w-10 opacity-70 hover:opacity-100"
              onClick={() => setGlobalFilter("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Client Filter */}
        <div className="w-full sm:w-auto min-w-[200px]">
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="h-9 sm:h-10">
              <SelectValue placeholder="All clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All clients</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{client.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {client.companyName}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle for Mobile/Tablet */}
          <div className="md:hidden">
            <Tabs
              value={viewMode}
              onValueChange={(value) => setViewMode(value as "table" | "cards")}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="cards" className="text-xs">
                  Cards
                </TabsTrigger>
                <TabsTrigger value="table" className="text-xs">
                  Table
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex items-center text-sm text-muted-foreground">
            <span>
              {filteredJobs.length} of {jobs.length} jobs
            </span>
          </div>
        </div>
      </div>

      {/* Bulk Actions UI */}
      {selectedJobIds.length > 0 && (
        <div className="bg-muted/20 flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 rounded-md mb-4 border gap-3">
          <div className="flex items-center">
            <Checkbox
              checked={selectedJobIds.length === filteredJobs.length}
              onCheckedChange={(checked) => {
                if (checked) {
                  const newRowSelection: RowSelectionState = {};
                  filteredJobs.forEach((job) => {
                    newRowSelection[job.id] = true;
                  });
                  setRowSelection(newRowSelection);
                  setSelectedJobIds(filteredJobs.map((j) => j.id));
                } else {
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
              className="flex-1 sm:flex-initial"
            >
              <ListChecks className="size-4 mr-2" />
              Actions
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setRowSelection({});
                setSelectedJobIds([]);
              }}
              className="flex-1 sm:flex-initial"
            >
              <X className="size-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Content Area - Responsive */}
      <div className="w-full mb-4">
        {viewMode === "cards" ? (
          /* Card View for Mobile/Tablet */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
            {filteredJobs.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No jobs found</p>
              </div>
            )}
          </div>
        ) : (
          /* Table View for Desktop */
          <div className="overflow-hidden rounded-md border">
            <div className="overflow-x-auto">
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
                onRowSelectionChange={handleRowSelectionChange}
                rowSelection={rowSelection}
                getRowId={(row) => row.id}
              />
            </div>
          </div>
        )}
      </div>

      {/* Create Job Modal */}
      <Dialog open={createJobOpen} onOpenChange={setCreateJobOpen}>
        <DialogContent className="w-[95vw] max-w-4xl h-[90vh] flex flex-col p-0">
          <div className="flex flex-col h-full">
            <DialogHeader className="px-4 sm:px-6 py-4 border-b flex-shrink-0">
              <DialogTitle className="text-lg sm:text-xl">
                Create New Job
              </DialogTitle>
              <DialogDescription className="text-sm">
                Add a new job posting to your database
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="flex-1 px-4 sm:px-6 py-4">
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-base sm:text-lg font-medium border-b pb-2">
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                        onChange={(e) => {
                          const value = e.target.value;
                          setCreateJobData({
                            ...createJobData,
                            location: value,
                          });

                          // Auto-suggest "Remote" if certain keywords are detected
                          const keywords = [
                            "remote",
                            "work from home",
                            "wfh",
                            "anywhere",
                            "virtual",
                            "distributed",
                          ];
                          const lowercaseValue = value.toLowerCase();

                          if (
                            keywords.some((keyword) =>
                              lowercaseValue.includes(keyword)
                            ) &&
                            !lowercaseValue.includes("remote")
                          ) {
                            // Don't auto-complete if they're already typing "remote"
                            if (!lowercaseValue.startsWith("remote")) {
                              setCreateJobData({
                                ...createJobData,
                                location: value + " - Remote",
                              });
                            }
                          }
                        }}
                        placeholder="e.g. New York, NY or Remote"
                        className="h-10"
                      />
                      {createJobData.location &&
                        !createJobData.location
                          .toLowerCase()
                          .includes("office") &&
                        !createJobData.location
                          .toLowerCase()
                          .includes("onsite") &&
                        !createJobData.location
                          .toLowerCase()
                          .includes("on-site") && (
                          <div className="text-xs text-blue-600 flex items-center gap-1">
                            <span>💡</span>
                            <span>
                              Consider adding "Remote" if this position allows
                              remote work
                            </span>
                          </div>
                        )}
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

                {/* Job Details */}
                <div className="space-y-4">
                  <h3 className="text-base sm:text-lg font-medium border-b pb-2">
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

                {/* Organization */}
                <div className="space-y-4">
                  <h3 className="text-base sm:text-lg font-medium border-b pb-2">
                    Organization
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="create-client"
                        className="text-sm font-medium"
                      >
                        Client *
                      </Label>
                      <Select
                        value={createJobData.clientId}
                        onValueChange={(value) =>
                          setCreateJobData({
                            ...createJobData,
                            clientId: value,
                          })
                        }
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select client" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.length > 0 ? (
                            clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{client.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {client.companyName}
                                  </span>
                                </div>
                              </SelectItem>
                            ))
                          ) : (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                              No clients available. Please create a client first.
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      {!createJobData.clientId && (
                        <p className="text-xs text-red-500">
                          Please select a client for this job
                        </p>
                      )}
                    </div>

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

                    {/* Tags Dropdown */}
                    {allTags.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Tags</Label>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-between h-10"
                            >
                              <span className="truncate">
                                {createJobData.tags.length > 0
                                  ? `${createJobData.tags.length} tag${
                                      createJobData.tags.length > 1 ? "s" : ""
                                    } selected`
                                  : "Select tags"}
                              </span>
                              <ChevronDown className="h-4 w-4 opacity-50" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-56 max-h-60 overflow-y-auto">
                            {allTags.map((tag) => (
                              <DropdownMenuCheckboxItem
                                key={tag}
                                checked={createJobData.tags.includes(tag)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setCreateJobData({
                                      ...createJobData,
                                      tags: [...createJobData.tags, tag],
                                    });
                                  } else {
                                    setCreateJobData({
                                      ...createJobData,
                                      tags: createJobData.tags.filter(
                                        (t) => t !== tag
                                      ),
                                    });
                                  }
                                }}
                              >
                                {tag}
                              </DropdownMenuCheckboxItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        {createJobData.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {createJobData.tags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="text-xs"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div className="px-4 sm:px-6 py-4 border-t bg-background flex-shrink-0">
              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setCreateJobOpen(false)}
                  disabled={isSubmitting}
                  className="order-2 sm:order-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateJob}
                  disabled={isSubmitting || !createJobData.title.trim() || !createJobData.clientId}
                  className="order-1 sm:order-2"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeDetail();
            }
          }}
        >
          <div
            className="bg-background rounded-lg w-full max-w-4xl h-[95vh] sm:h-[90vh] overflow-hidden relative flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 sm:right-4 sm:top-4 z-10"
              onClick={closeDetail}
            >
              <X className="h-4 w-4" />
            </Button>

            {/* Fixed Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 sm:p-6 pb-2 sm:pb-4 pr-10 sm:pr-16 flex-shrink-0 border-b">
              <h2 className="text-lg sm:text-xl font-bold truncate mr-4">
                {detailJob.title}
              </h2>
              <div className="mt-2 sm:mt-0 flex items-center flex-shrink-0">
                <Badge
                  className={cn(
                    modalStatusId !== UNASSIGNED_VALUE
                      ? getBadgeColorByStatusId(modalStatusId)
                      : ""
                  )}
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

            {/* Scrollable Content */}
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="flex-1 flex flex-col px-3 sm:px-6 min-h-0"
              >
                <TabsList className="my-3 sm:my-4 w-full sm:w-auto flex-shrink-0">
                  <TabsTrigger
                    value="details"
                    className="flex-1 sm:flex-initial text-xs sm:text-sm"
                  >
                    <Briefcase className="size-4 mr-1" />
                    <span className="hidden sm:inline">Details</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="tags"
                    className="flex-1 sm:flex-initial text-xs sm:text-sm"
                  >
                    <TagIcon className="size-4 mr-1" />
                    <span className="hidden sm:inline">Tags</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="history"
                    className="flex-1 sm:flex-initial text-xs sm:text-sm"
                  >
                    <Shield className="size-4 mr-1" />
                    <span className="hidden sm:inline">History</span>
                  </TabsTrigger>
                </TabsList>

                {/* Scrollable Tab Content */}
                <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
                  <TabsContent value="details" className="m-0 pb-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                            onChange={(e) => {
                              const value = e.target.value;
                              setModalLocation(value);

                              // Auto-suggest "Remote" if certain keywords are detected
                              const keywords = [
                                "remote",
                                "work from home",
                                "wfh",
                                "anywhere",
                                "virtual",
                                "distributed",
                              ];
                              const lowercaseValue = value.toLowerCase();

                              if (
                                keywords.some((keyword) =>
                                  lowercaseValue.includes(keyword)
                                ) &&
                                !lowercaseValue.includes("remote")
                              ) {
                                // Don't auto-complete if they're already typing "remote"
                                if (!lowercaseValue.startsWith("remote")) {
                                  setModalLocation(value + " - Remote");
                                }
                              }
                            }}
                            placeholder="e.g. New York, NY or Remote"
                          />
                          {modalLocation &&
                            !modalLocation.toLowerCase().includes("office") &&
                            !modalLocation.toLowerCase().includes("onsite") &&
                            !modalLocation
                              .toLowerCase()
                              .includes("on-site") && (
                              <div className="mt-1 text-xs text-blue-600 flex items-center gap-1">
                                <span>💡</span>
                                <span>
                                  Consider adding "Remote" if this position
                                  allows remote work
                                </span>
                              </div>
                            )}
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
                            htmlFor="client"
                            className="text-sm font-medium mb-2 block"
                          >
                            Client *
                          </Label>
                          <Select
                            value={modalClientId}
                            onValueChange={setModalClientId}
                          >
                            <SelectTrigger id="client">
                              <SelectValue placeholder="Select client" />
                            </SelectTrigger>
                            <SelectContent>
                              {clients.map((client) => (
                                <SelectItem key={client.id} value={client.id}>
                                  {client.name} - {client.companyName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {!modalClientId && (
                            <p className="text-sm text-red-500 mt-1">
                              Client selection is required
                            </p>
                          )}
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
                              <SelectItem value="full-time">
                                Full-time
                              </SelectItem>
                              <SelectItem value="part-time">
                                Part-time
                              </SelectItem>
                              <SelectItem value="contract">Contract</SelectItem>
                              <SelectItem value="internship">
                                Internship
                              </SelectItem>
                              <SelectItem value="temporary">
                                Temporary
                              </SelectItem>
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
                            onChange={(e) =>
                              setModalSalaryRange(e.target.value)
                            }
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
                            onChange={(e) =>
                              setModalDescription(e.target.value)
                            }
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

                  <TabsContent value="tags" className="m-0 pb-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card className="overflow-hidden">
                        <CardHeader className="pb-2">
                          <h3 className="text-sm font-medium">Tags</h3>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="w-full justify-between"
                                >
                                  <span className="truncate">
                                    {modalTags.length > 0
                                      ? `${modalTags.length} tag${
                                          modalTags.length > 1 ? "s" : ""
                                        } selected`
                                      : "Select tags"}
                                  </span>
                                  <ChevronDown className="h-4 w-4 opacity-50" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="w-56 max-h-60 overflow-y-auto">
                                {allTags.length > 0 ? (
                                  allTags.map((tag) => (
                                    <DropdownMenuCheckboxItem
                                      key={tag}
                                      checked={modalTags.includes(tag)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setModalTags([...modalTags, tag]);
                                        } else {
                                          setModalTags(
                                            modalTags.filter((t) => t !== tag)
                                          );
                                        }
                                      }}
                                    >
                                      {tag}
                                    </DropdownMenuCheckboxItem>
                                  ))
                                ) : (
                                  <div className="p-4 text-center text-muted-foreground text-sm">
                                    No tags available
                                  </div>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>

                            {modalTags.length > 0 && (
                              <div className="border rounded-md p-3 bg-muted/10 min-h-[100px]">
                                <div className="flex flex-wrap gap-2">
                                  {modalTags.map((tag) => (
                                    <Badge
                                      key={tag}
                                      variant="default"
                                      className="cursor-pointer hover:opacity-80"
                                      onClick={() => {
                                        setModalTags(
                                          modalTags.filter((t) => t !== tag)
                                        );
                                      }}
                                    >
                                      {tag}
                                      <X className="ml-1 h-3 w-3" />
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {allTags.length === 0 && (
                              <div className="text-sm text-muted-foreground w-full text-center py-10 flex flex-col items-center border rounded-md">
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

                  <TabsContent value="history" className="m-0 pb-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-4">
                        <Shield className="text-primary/70 size-4" />
                        <h3 className="font-medium text-sm sm:text-base">
                          History Timeline
                        </h3>
                      </div>

                      <div className="bg-muted/10 border border-muted/30 rounded-md px-3 py-2 flex items-center gap-2 mb-4">
                        <AlertCircle className="size-4 text-blue-500/70 flex-shrink-0" />
                        <p className="text-xs text-muted-foreground">
                          Changes are automatically tracked and logged
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
                        <div className="space-y-2.5">
                          {[...modalHistory].reverse().map((entry, idx) => {
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
                                    className={`size-3.5 mr-2 ${iconColor} flex-shrink-0`}
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
                                  <p className="text-sm break-words">
                                    {entry.note}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>

            {/* Fixed Footer */}
            <div className="border-t flex flex-col sm:flex-row justify-between gap-3 p-3 sm:p-6 flex-shrink-0">
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isSubmitting}
                size="sm"
              >
                Delete Job
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={closeDetail}
                  disabled={isSubmitting}
                  size="sm"
                  className="flex-1 sm:flex-initial"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveDetail}
                  disabled={isSubmitting || !modalClientId || !modalTitle.trim()}
                  size="sm"
                  className="flex-1 sm:flex-initial"
                >
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

      {/* Create Job Modal - Enhanced Scrolling for All Devices */}
      <Dialog open={createJobOpen} onOpenChange={setCreateJobOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] xl:max-w-[90vw] 2xl:max-w-[85vw] h-[95vh] sm:h-[90vh] flex flex-col p-0 overflow-hidden">
          <div className="flex flex-col h-full min-h-0">
            {/* Fixed Header */}
            <DialogHeader className="px-3 sm:px-6 py-3 sm:py-4 border-b flex-shrink-0">
              <DialogTitle className="text-lg sm:text-xl">
                Create New Job
              </DialogTitle>
              <DialogDescription className="text-sm">
                Add a new job posting to your database
              </DialogDescription>
            </DialogHeader>

            {/* Scrollable Content */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
              <div className="px-3 sm:px-6 py-4">
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-base sm:text-lg font-medium border-b pb-2">
                      Basic Information
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                          onChange={(e) => {
                            const value = e.target.value;
                            setCreateJobData({
                              ...createJobData,
                              location: value,
                            });

                            // Auto-suggest "Remote" if certain keywords are detected
                            const keywords = [
                              "remote",
                              "work from home",
                              "wfh",
                              "anywhere",
                              "virtual",
                              "distributed",
                            ];
                            const lowercaseValue = value.toLowerCase();

                            if (
                              keywords.some((keyword) =>
                                lowercaseValue.includes(keyword)
                              ) &&
                              !lowercaseValue.includes("remote")
                            ) {
                              // Don't auto-complete if they're already typing "remote"
                              if (!lowercaseValue.startsWith("remote")) {
                                setCreateJobData({
                                  ...createJobData,
                                  location: value + " - Remote",
                                });
                              }
                            }
                          }}
                          placeholder="e.g. New York, NY or Remote"
                          className="h-10"
                        />
                        {createJobData.location &&
                          !createJobData.location
                            .toLowerCase()
                            .includes("office") &&
                          !createJobData.location
                            .toLowerCase()
                            .includes("onsite") &&
                          !createJobData.location
                            .toLowerCase()
                            .includes("on-site") && (
                            <div className="text-xs text-blue-600 flex items-center gap-1">
                              <span>💡</span>
                              <span>
                                Consider adding "Remote" if this position allows
                                remote work
                              </span>
                            </div>
                          )}
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
                            <SelectItem value="internship">
                              Internship
                            </SelectItem>
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

                  {/* Job Details */}
                  <div className="space-y-4">
                    <h3 className="text-base sm:text-lg font-medium border-b pb-2">
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

                  {/* Organization */}
                  <div className="space-y-4">
                    <h3 className="text-base sm:text-lg font-medium border-b pb-2">
                      Organization
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

                      {/* Tags Dropdown */}
                      {allTags.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Tags</Label>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-between h-10"
                              >
                                <span className="truncate">
                                  {createJobData.tags.length > 0
                                    ? `${createJobData.tags.length} tag${
                                        createJobData.tags.length > 1 ? "s" : ""
                                      } selected`
                                    : "Select tags"}
                                </span>
                                <ChevronDown className="h-4 w-4 opacity-50" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56 max-h-60 overflow-y-auto">
                              {allTags.map((tag) => (
                                <DropdownMenuCheckboxItem
                                  key={tag}
                                  checked={createJobData.tags.includes(tag)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setCreateJobData({
                                        ...createJobData,
                                        tags: [...createJobData.tags, tag],
                                      });
                                    } else {
                                      setCreateJobData({
                                        ...createJobData,
                                        tags: createJobData.tags.filter(
                                          (t) => t !== tag
                                        ),
                                      });
                                    }
                                  }}
                                >
                                  {tag}
                                </DropdownMenuCheckboxItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          {createJobData.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {createJobData.tags.map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom padding for scroll spacing */}
                  <div className="h-6"></div>
                </div>
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="px-3 sm:px-6 py-3 sm:py-4 border-t bg-background flex-shrink-0">
              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setCreateJobOpen(false)}
                  disabled={isSubmitting}
                  className="order-2 sm:order-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateJob}
                  disabled={isSubmitting || !createJobData.title.trim()}
                  className="order-1 sm:order-2"
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-md mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this job?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete{" "}
              <strong>{detailJob?.title}</strong> from your job database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteJob}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto"
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
        <DialogContent className="max-w-md mx-4">
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
                size="sm"
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
                size="sm"
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

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="destructive"
              className="w-full sm:w-auto order-2 sm:order-1"
              onClick={() => handleBulkAction("delete")}
              disabled={isSubmitting}
              size="sm"
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
            <Button
              variant="outline"
              onClick={() => setBulkActionOpen(false)}
              className="w-full sm:w-auto order-1 sm:order-2"
              size="sm"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}
