import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  updateDoc,
  writeBatch,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import {
  Activity,
  AlertCircle,
  BarChart3,
  CheckCircle,
  ChevronDown,
  Copy,
  Download,
  Edit3,
  Eye,
  Filter,
  Grid3X3,
  GripVertical,
  Layers,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Target,
  Trash2,
  TrendingUp,
  Upload,
  Users,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Progress } from "~/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import { fetchJobs } from "~/features/jobsSlice";
import { setStages } from "~/features/stagesSlice";
import {
  fetchWorkflowTemplates,
  createWorkflowTemplate,
  createJobWorkflowFromTemplate,
  deleteWorkflowTemplate,
  deleteJobWorkflow,
  removeStageFromJobWorkflow,
  addStageToJobWorkflow,
  reorderJobWorkflowStages,
} from "~/features/workflowSlice";
import { db } from "~/lib/firebase";
import { seedWorkflowData } from "~/lib/workflow-templates-seeder";
import { WorkflowErrorHandler, withWorkflowErrorHandling } from "~/lib/workflow-error-handler";
import WorkflowErrorBoundary from "./components/WorkflowErrorBoundary";
import { workflowRealtimeService } from "~/services/workflowRealtimeService";
import type { AppDispatch, RootState } from "~/store";
import type { Stage } from "~/types";

interface WorkflowAnalytics {
  totalJobs: number;
  jobsWithWorkflow: number;
  totalTemplates: number;
  activeTemplates: number;
  workflowCoverage: number;
  averageStagesPerWorkflow: number;
  mostUsedTemplate: string;
  stageDistribution: Record<string, number>;
}

interface JobWorkflowWithStats {
  id: string;
  jobId: string;
  jobTitle: string;
  stageIds: string[];
  templateId?: string;
  candidateCount: number;
  stageStats: Record<string, number>;
  conversionRate: number;
  averageTimeToHire: number;
  createdAt: string;
  updatedAt: string;
}

function ComprehensiveWorkflowManagementBase() {
  const dispatch = useDispatch<AppDispatch>();
  const { templates, jobWorkflows, loading, templatesLoading } = useSelector(
    (state: RootState) => state.workflow
  );
  const { jobs } = useSelector((state: RootState) => state.jobs);
  const { stages } = useSelector((state: RootState) => state.stages);

  // State for creating new templates
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    category: "",
    stages: [] as string[],
  });

  // State for job workflow setup
  const [isSettingUpWorkflow, setIsSettingUpWorkflow] = useState(false);
  const [selectedJob, setSelectedJob] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [loadedJobWorkflows, setLoadedJobWorkflows] = useState<any[]>([]);

  // Real-time listener cleanup functions
  const [jobWorkflowsUnsubscriber, setJobWorkflowsUnsubscriber] = useState<(() => void) | null>(null);
  const [stagesUnsubscriber, setStagesUnsubscriber] = useState<(() => void) | null>(null);
  const [candidatesUnsubscriber, setCandidatesUnsubscriber] = useState<(() => void) | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState("dashboard");

  // State for stage management
  const [isCreatingStage, setIsCreatingStage] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [newStage, setNewStage] = useState({
    title: "",
    description: "",
    color: "#3b82f6",
  });

  // State for template viewing/editing
  const [viewingTemplate, setViewingTemplate] = useState<any>(null);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  // State for job workflow editing
  const [editingJobWorkflow, setEditingJobWorkflow] = useState<any>(null);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedJobStatus, setSelectedJobStatus] = useState("all");

  // Bulk actions state
  const [selectedWorkflows, setSelectedWorkflows] = useState<string[]>([]);
  const [bulkActionMode, setBulkActionMode] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Analytics state
  const [candidatesData, setCandidatesData] = useState<any[]>([]);
  const [applicationsData, setApplicationsData] = useState<any[]>([]);

  // Manual workflow data initialization function
  const handleInitializeWorkflowData = async () => {
    setIsInitializing(true);
    try {
      const result = await withWorkflowErrorHandling(async () => {
        return await seedWorkflowData();
      }, 'seedWorkflowData');

      if (result.success) {
        toast.success("Workflow data initialized successfully!");
        dispatch(fetchWorkflowTemplates());
        dispatch(fetchJobs());
        
        const stagesCollection = collection(db, "stages");
        const stagesSnapshot = await getDocs(stagesCollection);
        const stagesData = stagesSnapshot.docs
          .map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              title: data.title,
              description: data.description,
              color: data.color,
              order: data.order,
              createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : data.createdAt,
              updatedAt: data.updatedAt?.toDate?.() ? data.updatedAt.toDate().toISOString() : data.updatedAt,
            };
          })
          .filter((stage) => 
            stage.id && 
            stage.title && 
            typeof stage.title === 'string'
          ) as Stage[];

        dispatch(setStages(stagesData));
      } else {
        const errorMessage = typeof result.error === 'string' 
          ? result.error 
          : (result.error as any)?.message || 'Failed to initialize workflow data';
        throw new Error(errorMessage);
      }
    } catch (error) {
      WorkflowErrorHandler.handleError(error, 'seedWorkflowData');
    } finally {
      setIsInitializing(false);
    }
  };

  // Initialize real-time service and load data
  useEffect(() => {
    const initializeData = async () => {
      try {
        dispatch(fetchWorkflowTemplates());
        dispatch(fetchJobs());

        // Set up real-time listener for job workflows
        const jobWorkflowsCollection = collection(db, "jobWorkflows");
        const unsubscribeJobWorkflows = onSnapshot(jobWorkflowsCollection, (snapshot) => {
          const jobWorkflowsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setLoadedJobWorkflows(jobWorkflowsData);
        }, (error) => {
          console.error("❌ Error listening to job workflows:", error);
          toast.error("Failed to sync job workflows in real-time");
        });

        setJobWorkflowsUnsubscriber(() => unsubscribeJobWorkflows);

        // Set up real-time listener for stages
        const stagesCollection = collection(db, "stages");
        const unsubscribeStages = onSnapshot(stagesCollection, (snapshot) => {
          const stagesData = snapshot.docs
            .map((doc) => {
              const data = doc.data();
              return {
                id: doc.id,
                title: data.title,
                description: data.description,
                color: data.color,
                order: data.order,
                createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : data.createdAt,
                updatedAt: data.updatedAt?.toDate?.() ? data.updatedAt.toDate().toISOString() : data.updatedAt,
              };
            })
            .filter((stage) => 
              stage.id && 
              stage.title && 
              typeof stage.title === 'string'
            ) as Stage[];

          dispatch(setStages(stagesData));
        }, (error) => {
          console.error("❌ Error listening to stages:", error);
          toast.error("Failed to sync stages in real-time");
        });

        setStagesUnsubscriber(() => unsubscribeStages);

        // Set up real-time listener for candidates to calculate analytics
        const candidatesCollection = collection(db, "candidates");
        const unsubscribeCandidates = onSnapshot(candidatesCollection, (snapshot) => {
          const candidatesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setCandidatesData(candidatesData);
        });

        setCandidatesUnsubscriber(() => unsubscribeCandidates);

        // Set up real-time listener for applications
        const applicationsCollection = collection(db, "applications");
        const unsubscribeApplications = onSnapshot(applicationsCollection, (snapshot) => {
          const applicationsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setApplicationsData(applicationsData);
        });

        toast.success("Workflow management initialized with real-time updates");
      } catch (error) {
        console.error("Failed to initialize workflow data:", error);
        toast.error("Failed to initialize workflow management");
      }
    };

    initializeData();

    return () => {
      if (jobWorkflowsUnsubscriber) {
        jobWorkflowsUnsubscriber();
      }
      if (stagesUnsubscriber) {
        stagesUnsubscriber();
      }
      if (candidatesUnsubscriber) {
        candidatesUnsubscriber();
      }
    };
  }, [dispatch]);

  // Calculate comprehensive workflow analytics
  const workflowAnalytics: WorkflowAnalytics = useMemo(() => {
    const totalJobs = jobs.length;
    const jobsWithWorkflow = loadedJobWorkflows.length;
    const totalTemplates = templates.length;
    const activeTemplates = templates.filter((t) =>
      loadedJobWorkflows.some((workflow) => workflow.templateId === t.id)
    ).length;

    const averageStagesPerWorkflow = jobsWithWorkflow > 0 
      ? loadedJobWorkflows.reduce((sum, workflow) => sum + (workflow.stageIds?.length || 0), 0) / jobsWithWorkflow
      : 0;

    const templateUsage = loadedJobWorkflows.reduce((acc, workflow) => {
      if (workflow.templateId) {
        acc[workflow.templateId] = (acc[workflow.templateId] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const mostUsedTemplateId = Object.keys(templateUsage).reduce((a, b) => 
      templateUsage[a] > templateUsage[b] ? a : b, ""
    );
    const mostUsedTemplate = templates.find(t => t.id === mostUsedTemplateId)?.name || "None";

    const stageDistribution = stages.reduce((acc, stage) => {
      acc[stage.title] = loadedJobWorkflows.filter(workflow => 
        workflow.stageIds?.includes(stage.id)
      ).length;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalJobs,
      jobsWithWorkflow,
      totalTemplates,
      activeTemplates,
      workflowCoverage: totalJobs > 0 ? Math.round((jobsWithWorkflow / totalJobs) * 100) : 0,
      averageStagesPerWorkflow: Math.round(averageStagesPerWorkflow * 10) / 10,
      mostUsedTemplate,
      stageDistribution,
    };
  }, [jobs, loadedJobWorkflows, templates, stages]);

  // Calculate job workflows with statistics
  const jobWorkflowsWithStats: JobWorkflowWithStats[] = useMemo(() => {
    return loadedJobWorkflows.map(workflow => {
      const jobCandidates = candidatesData.filter(c => c.jobId === workflow.jobId);
      const jobApplications = applicationsData.filter(a => a.jobId === workflow.jobId);
      
      const stageStats = workflow.stageIds?.reduce((acc: Record<string, number>, stageId: string) => {
        acc[stageId] = jobCandidates.filter(c => c.currentStage === stageId).length;
        return acc;
      }, {}) || {};

      const conversionRate = jobApplications.length > 0 
        ? Math.round((jobCandidates.filter(c => c.status === 'hired').length / jobApplications.length) * 100)
        : 0;

      return {
        ...workflow,
        candidateCount: jobCandidates.length,
        stageStats,
        conversionRate,
        averageTimeToHire: 0, // This would require more complex calculation
      };
    });
  }, [loadedJobWorkflows, candidatesData, applicationsData]);

  // Filter and search functions
  const filteredTemplates = useMemo(() => {
    return templates.filter(template => {
      const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           template.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [templates, searchQuery, selectedCategory]);

  const filteredJobWorkflows = useMemo(() => {
    return jobWorkflowsWithStats.filter(workflow => {
      const job = jobs.find(j => j.id === workflow.jobId);
      const matchesSearch = workflow.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           job?.title?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = selectedJobStatus === "all" || job?.status === selectedJobStatus;
      return matchesSearch && matchesStatus;
    });
  }, [jobWorkflowsWithStats, jobs, searchQuery, selectedJobStatus]);

  const categories = useMemo(() => {
    const cats = templates.map(t => t.category).filter(Boolean);
    return [...new Set(cats)];
  }, [templates]);

  // Handle stage creation
  const handleCreateStage = async () => {
    if (!newStage.title.trim()) {
      toast.error("Stage title is required");
      return;
    }

    try {
      toast.loading("Creating stage...", { id: "create-stage" });
      
      const maxOrder = stages.length > 0 
        ? Math.max(...stages.map(s => s.order || 0)) 
        : 0;

      const stageData = {
        ...newStage,
        order: maxOrder + 1,
        jobId: "global",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, "stages"), stageData);
      const createdStage = { id: docRef.id, ...stageData };

      dispatch(setStages([...stages, createdStage]));

      setNewStage({
        title: "",
        description: "",
        color: "#3b82f6",
      });
      setIsCreatingStage(false);
      
      toast.success(`Stage "${newStage.title}" created successfully`, {
        id: "create-stage",
      });
    } catch (error) {
      console.error("Failed to create stage:", error);
      toast.error("Failed to create stage", {
        id: "create-stage",
      });
    }
  };

  // Handle stage deletion
  const handleDeleteStage = async (stageId: string) => {
    const stageToDelete = stages.find(s => s.id === stageId);
    
    if (!confirm(`Are you sure you want to delete the stage "${stageToDelete?.title || 'Unknown'}"?`)) {
      return;
    }
    
    try {
      toast.loading("Deleting stage...", { id: "delete-stage" });
      
      await deleteDoc(doc(db, "stages", stageId));
      dispatch(setStages(stages.filter((stage) => stage.id !== stageId)));
      
      toast.success(`Stage "${stageToDelete?.title || 'Unknown'}" deleted successfully`, {
        id: "delete-stage",
      });
    } catch (error) {
      console.error("Failed to delete stage:", error);
      toast.error("Failed to delete stage", {
        id: "delete-stage",
      });
    }
  };

  // Handle template creation
  const handleCreateTemplate = async () => {
    if (!newTemplate.name.trim()) {
      toast.error("Template name is required");
      return;
    }

    if (newTemplate.stages.length === 0) {
      toast.error("At least one stage is required");
      return;
    }

    try {
      toast.loading("Creating template...", { id: "create-template" });
      
      const templateData = {
        name: newTemplate.name,
        description: newTemplate.description,
        category: newTemplate.category || "General",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        stageIds: newTemplate.stages,
      };

      await dispatch(createWorkflowTemplate(templateData)).unwrap();

      setNewTemplate({ name: "", description: "", category: "", stages: [] });
      setIsCreatingTemplate(false);
      
      toast.success(`Template "${newTemplate.name}" created successfully`, {
        id: "create-template",
      });
    } catch (error) {
      console.error("Failed to create template:", error);
      toast.error("Failed to create template", {
        id: "create-template",
      });
    }
  };

  // Handle template deletion
  const handleDeleteTemplate = async (templateId: string) => {
    const templateToDelete = templates.find(t => t.id === templateId);
    
    if (!confirm(`Are you sure you want to delete the template "${templateToDelete?.name || 'Unknown'}"?`)) {
      return;
    }

    try {
      await dispatch(deleteWorkflowTemplate(templateId)).unwrap();
      toast.success(`Template "${templateToDelete?.name || 'Unknown'}" deleted successfully`);
    } catch (error) {
      console.error("Failed to delete template:", error);
      toast.error("Failed to delete template. Please try again.");
    }
  };

  // Handle job workflow deletion
  const handleDeleteJobWorkflow = async (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    const jobTitle = job?.title || 'Unknown Job';
    
    if (!confirm(`Are you sure you want to delete the workflow for "${jobTitle}"?`)) {
      return;
    }

    try {
      await dispatch(deleteJobWorkflow(jobId)).unwrap();
      toast.success(`Workflow for "${jobTitle}" deleted successfully`);
    } catch (error) {
      console.error("Failed to delete job workflow:", error);
      toast.error("Failed to delete job workflow. Please try again.");
    }
  };

  // Handle template viewing
  const handleViewTemplate = (template: any) => {
    setViewingTemplate(template);
  };

  // Handle template editing
  const handleEditTemplate = (template: any) => {
    setEditingTemplate({
      ...template,
      stages: template.stageIds || []
    });
  };

  // Handle template update
  const handleUpdateTemplate = async () => {
    if (!editingTemplate.name.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    if (editingTemplate.stages.length === 0) {
      toast.error("Please select at least one stage for the template");
      return;
    }

    try {
      const templateData = {
        ...editingTemplate,
        stageIds: editingTemplate.stages,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, "workflowTemplates", editingTemplate.id), templateData);

      setEditingTemplate(null);
      toast.success(`Template "${editingTemplate.name}" updated successfully`);
      
      dispatch(fetchWorkflowTemplates());
    } catch (error) {
      console.error("Failed to update template:", error);
      toast.error("Failed to update template. Please try again.");
    }
  };

  // Handle job workflow editing
  const handleEditJobWorkflow = (jobWorkflow: any) => {
    const job = jobs.find(j => j.id === jobWorkflow.jobId);
    setEditingJobWorkflow({
      ...jobWorkflow,
      jobTitle: job?.title || 'Unknown Job',
      stages: jobWorkflow.stageIds || []
    });
  };

  // Handle job workflow update
  const handleUpdateJobWorkflow = async () => {
    if (!editingJobWorkflow.stages.length) {
      toast.error("Please select at least one stage for the workflow");
      return;
    }

    try {
      await updateDoc(doc(db, "jobWorkflows", editingJobWorkflow.id), {
        stageIds: editingJobWorkflow.stages,
        updatedAt: new Date().toISOString(),
      });

      setEditingJobWorkflow(null);
      toast.success(`Workflow for "${editingJobWorkflow.jobTitle}" updated successfully`);
    } catch (error) {
      console.error("Failed to update job workflow:", error);
      toast.error("Failed to update job workflow. Please try again.");
    }
  };

  // Handle job workflow setup
  const handleSetupJobWorkflow = async () => {
    if (!selectedJob || !selectedTemplate) {
      toast.error("Job and template selection required");
      return;
    }

    try {
      const job = jobs.find((j) => j.id === selectedJob);
      const template = templates.find((t) => t.id === selectedTemplate);
      
      if (!job || !template) {
        toast.error("Selected job or template not found");
        return;
      }

      toast.loading("Setting up workflow...", { id: "setup-workflow" });

      await dispatch(
        createJobWorkflowFromTemplate({
          jobId: selectedJob,
          jobTitle: job.title,
          templateId: selectedTemplate,
        })
      ).unwrap();

      workflowRealtimeService.setupJobWorkflowListener(selectedJob);

      setSelectedJob("");
      setSelectedTemplate("");
      setIsSettingUpWorkflow(false);
      
      toast.success(`Workflow setup completed for "${job.title}"`, {
        id: "setup-workflow",
      });
    } catch (error) {
      console.error("Failed to setup job workflow:", error);
      toast.error("Failed to setup job workflow", {
        id: "setup-workflow",
      });
    }
  };

  // Handle bulk actions
  const handleBulkDelete = async () => {
    if (selectedWorkflows.length === 0) {
      toast.error("No workflows selected");
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedWorkflows.length} selected workflow(s)?`)) {
      return;
    }

    try {
      const batch = writeBatch(db);
      selectedWorkflows.forEach(workflowId => {
        const workflowRef = doc(db, "jobWorkflows", workflowId);
        batch.delete(workflowRef);
      });

      await batch.commit();
      setSelectedWorkflows([]);
      setBulkActionMode(false);
      toast.success(`${selectedWorkflows.length} workflow(s) deleted successfully`);
    } catch (error) {
      console.error("Failed to delete workflows:", error);
      toast.error("Failed to delete selected workflows");
    }
  };

  // Handle stage reordering
  const handleStageReorder = async (stageId: string, newOrder: number) => {
    try {
      await updateDoc(doc(db, "stages", stageId), {
        order: newOrder,
        updatedAt: new Date().toISOString(),
      });
      
      toast.success("Stage order updated successfully");
    } catch (error) {
      console.error("Failed to reorder stage:", error);
      toast.error("Failed to reorder stage");
    }
  };

  // Handle bulk stage creation
  const handleBulkCreateStages = async (stageNames: string[]) => {
    try {
      const batch = writeBatch(db);
      const maxOrder = stages.length > 0 ? Math.max(...stages.map(s => s.order || 0)) : 0;
      
      stageNames.forEach((name, index) => {
        const stageRef = doc(collection(db, "stages"));
        batch.set(stageRef, {
          title: name.trim(),
          description: "",
          color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
          order: maxOrder + index + 1,
          jobId: "global",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });

      await batch.commit();
      toast.success(`${stageNames.length} stages created successfully`);
    } catch (error) {
      console.error("Failed to create stages:", error);
      toast.error("Failed to create stages");
    }
  };

  // Template duplication
  const handleDuplicateTemplate = async (templateId: string) => {
    const templateToDuplicate = templates.find(t => t.id === templateId);
    if (!templateToDuplicate) return;

    try {
      const { id, ...templateWithoutId } = templateToDuplicate;
      const duplicatedTemplate = {
        ...templateWithoutId,
        name: `${templateToDuplicate.name} (Copy)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await dispatch(createWorkflowTemplate(duplicatedTemplate)).unwrap();
      toast.success(`Template "${templateToDuplicate.name}" duplicated successfully`);
    } catch (error) {
      console.error("Failed to duplicate template:", error);
      toast.error("Failed to duplicate template");
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'n':
            event.preventDefault();
            if (activeTab === 'templates') {
              setIsCreatingTemplate(true);
            } else if (activeTab === 'stages') {
              setIsCreatingStage(true);
            } else if (activeTab === 'jobs') {
              setIsSettingUpWorkflow(true);
            }
            break;
          case 'e':
            event.preventDefault();
            handleExportWorkflows();
            break;
          case '/':
            event.preventDefault();
            // Focus search input if it exists
            const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
            if (searchInput) {
              searchInput.focus();
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

  // Export workflow data
  const handleExportWorkflows = () => {
    const exportData = {
      templates: templates,
      stages: stages,
      jobWorkflows: loadedJobWorkflows,
      exportedAt: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `workflow-export-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    toast.success("Workflow data exported successfully");
  };

  return (
    <div className="space-y-8 p-6">
      {/* Modern Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <Workflow className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Workflow Management</h1>
            <p className="text-sm text-gray-600">
              Comprehensive recruitment pipeline configuration
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <Badge variant="secondary" className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200">
            {workflowAnalytics.jobsWithWorkflow} Active
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <MoreHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleExportWorkflows}>
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab("analytics")}>
                <BarChart3 className="h-4 w-4 mr-2" />
                View Analytics
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowHelpModal(true)}>
                <AlertCircle className="h-4 w-4 mr-2" />
                Keyboard Shortcuts
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleInitializeWorkflowData}
                disabled={isInitializing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isInitializing ? 'animate-spin' : ''}`} />
                Initialize Data
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 bg-gray-50 p-1 h-auto rounded-xl">
          <TabsTrigger 
            value="dashboard" 
            className="flex items-center gap-2 text-sm font-medium h-11 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg"
          >
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger 
            value="jobs" 
            className="flex items-center gap-2 text-sm font-medium h-11 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg"
          >
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Jobs ({workflowAnalytics.jobsWithWorkflow})</span>
            <span className="sm:hidden">Jobs</span>
          </TabsTrigger>
          <TabsTrigger 
            value="templates" 
            className="flex items-center gap-2 text-sm font-medium h-11 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg"
          >
            <Copy className="h-4 w-4" />
            <span className="hidden sm:inline">Templates ({workflowAnalytics.totalTemplates})</span>
            <span className="sm:hidden">Templates</span>
          </TabsTrigger>
          <TabsTrigger 
            value="stages" 
            className="flex items-center gap-2 text-sm font-medium h-11 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Stages ({stages.length})</span>
            <span className="sm:hidden">Stages</span>
          </TabsTrigger>
          <TabsTrigger 
            value="analytics" 
            className="flex items-center gap-2 text-sm font-medium h-11 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg"
          >
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-8">
          {/* Quick Actions */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Zap className="h-5 w-5 text-blue-600" />
                </div>
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <Button
                  variant="outline"
                  className="h-auto p-6 flex flex-col items-center gap-3 hover:shadow-md transition-all duration-200 border-gray-200 hover:border-blue-300 bg-gradient-to-br from-white to-blue-50/30"
                  onClick={() => {
                    setActiveTab("templates");
                    setTimeout(() => setIsCreatingTemplate(true), 100);
                  }}
                >
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <Plus className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-900">Create Template</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Build reusable workflow
                    </p>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto p-6 flex flex-col items-center gap-3 hover:shadow-md transition-all duration-200 border-gray-200 hover:border-green-300 bg-gradient-to-br from-white to-green-50/30"
                  onClick={() => {
                    setActiveTab("jobs");
                    setTimeout(() => setIsSettingUpWorkflow(true), 100);
                  }}
                >
                  <div className="p-3 bg-green-100 rounded-xl">
                    <Target className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-900">Setup Workflow</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Configure job pipeline
                    </p>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto p-6 flex flex-col items-center gap-3 hover:shadow-md transition-all duration-200 border-gray-200 hover:border-purple-300 bg-gradient-to-br from-white to-purple-50/30"
                  onClick={() => setActiveTab("stages")}
                >
                  <div className="p-3 bg-purple-100 rounded-xl">
                    <Settings className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-900">Manage Stages</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Configure workflow stages
                    </p>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto p-6 flex flex-col items-center gap-3 hover:shadow-md transition-all duration-200 border-gray-200 hover:border-orange-300 bg-gradient-to-br from-white to-orange-50/30"
                  onClick={() => setActiveTab("analytics")}
                >
                  <div className="p-3 bg-orange-100 rounded-xl">
                    <TrendingUp className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-900">View Analytics</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Performance insights
                    </p>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-gray-200 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700">Total Jobs</p>
                    <p className="text-3xl font-bold text-blue-900 mt-1">{workflowAnalytics.totalJobs}</p>
                    <p className="text-xs text-blue-600 mt-1">
                      {workflowAnalytics.workflowCoverage}% have workflows
                    </p>
                  </div>
                  <div className="p-3 bg-blue-200 rounded-xl">
                    <Users className="h-6 w-6 text-blue-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-200 shadow-sm bg-gradient-to-br from-green-50 to-green-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700">Active Workflows</p>
                    <p className="text-3xl font-bold text-green-900 mt-1">{workflowAnalytics.jobsWithWorkflow}</p>
                    <p className="text-xs text-green-600 mt-1">
                      Avg {workflowAnalytics.averageStagesPerWorkflow} stages
                    </p>
                  </div>
                  <div className="p-3 bg-green-200 rounded-xl">
                    <CheckCircle className="h-6 w-6 text-green-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-200 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-700">Templates</p>
                    <p className="text-3xl font-bold text-purple-900 mt-1">{workflowAnalytics.totalTemplates}</p>
                    <p className="text-xs text-purple-600 mt-1">
                      {workflowAnalytics.activeTemplates} in use
                    </p>
                  </div>
                  <div className="p-3 bg-purple-200 rounded-xl">
                    <Copy className="h-6 w-6 text-purple-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-200 shadow-sm bg-gradient-to-br from-orange-50 to-orange-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-700">Coverage</p>
                    <p className="text-3xl font-bold text-orange-900 mt-1">{workflowAnalytics.workflowCoverage}%</p>
                    <p className="text-xs text-orange-600 mt-1">
                      Most used: {workflowAnalytics.mostUsedTemplate}
                    </p>
                  </div>
                  <div className="p-3 bg-orange-200 rounded-xl">
                    <TrendingUp className="h-6 w-6 text-orange-700" />
                  </div>
                </div>
                <div className="mt-4">
                  <Progress 
                    value={workflowAnalytics.workflowCoverage} 
                    className="h-2" 
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Activity className="h-5 w-5 text-gray-600" />
                </div>
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loadedJobWorkflows.slice(0, 5).map((workflow) => {
                  const job = jobs.find(j => j.id === workflow.jobId);
                  const template = templates.find(t => t.id === workflow.templateId);
                  return (
                    <div key={workflow.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Workflow className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{job?.title || workflow.jobTitle}</p>
                          <p className="text-sm text-gray-600">
                            {template ? `Using ${template.name} template` : 'Custom workflow'} • {workflow.stageIds?.length || 0} stages
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/dashboard/workflow?job=${workflow.jobId}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Link>
                      </Button>
                    </div>
                  );
                })}
                {loadedJobWorkflows.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No recent workflow activity
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Job Workflows Tab */}
        <TabsContent value="jobs" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Job Workflows</h2>
              <p className="text-gray-600">Manage workflows for specific job positions</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search jobs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64"
                />
              </div>
              <Select value={selectedJobStatus} onValueChange={setSelectedJobStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => setIsSettingUpWorkflow(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Setup Workflow
              </Button>
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {bulkActionMode && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{selectedWorkflows.length} selected</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedWorkflows([]);
                        setBulkActionMode(false);
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDelete}
                      disabled={selectedWorkflows.length === 0}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete Selected
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {filteredJobWorkflows.length === 0 ? (
            <Card className="border-gray-200 shadow-sm">
              <CardContent className="text-center py-16">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl mb-6 w-fit mx-auto border border-blue-100">
                  <Target className="h-12 w-12 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900">No Job Workflows</h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
                  Configure workflows for your job positions to manage candidates through structured recruitment stages.
                </p>
                <Button onClick={() => setIsSettingUpWorkflow(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Setup First Workflow
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredJobWorkflows.map((jobWorkflow) => {
                const job = jobs.find((j) => j.id === jobWorkflow.jobId);
                const template = templates.find((t) => t.id === jobWorkflow.templateId);
                const workflowStages = jobWorkflow.stageIds ? 
                  jobWorkflow.stageIds.map((stageId: string) => stages.find(s => s.id === stageId)).filter(Boolean) : 
                  [];
                
                return (
                  <Card key={jobWorkflow.id} className="border-gray-200 hover:border-gray-300 transition-colors group bg-white shadow-sm hover:shadow-md">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {bulkActionMode && (
                              <input
                                type="checkbox"
                                checked={selectedWorkflows.includes(jobWorkflow.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedWorkflows([...selectedWorkflows, jobWorkflow.id]);
                                  } else {
                                    setSelectedWorkflows(selectedWorkflows.filter(id => id !== jobWorkflow.id));
                                  }
                                }}
                                className="rounded border-gray-300"
                              />
                            )}
                            <h4 className="font-semibold text-gray-900 text-lg truncate">{job?.title || jobWorkflow.jobTitle}</h4>
                          </div>
                          {job?.department && (
                            <p className="text-sm text-gray-600 mb-2">{job.department}</p>
                          )}
                          <div className="flex items-center gap-2 mb-3">
                            {template && (
                              <Badge variant="secondary" className="text-xs px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200">
                                {template.name}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {workflowStages.length} stages
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {jobWorkflow.candidateCount} candidates
                            </Badge>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={`/dashboard/workflow?job=${jobWorkflow.jobId}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Board
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditJobWorkflow(jobWorkflow)}>
                              <Edit3 className="h-4 w-4 mr-2" />
                              Edit Workflow
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteJobWorkflow(jobWorkflow.jobId)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      <div className="space-y-4">
                        {/* Stage Preview */}
                        <div className="flex gap-1 flex-wrap">
                          {workflowStages.slice(0, 4).map((stage: any, index: number) => (
                            <div
                              key={index}
                              className="px-2 py-1 rounded text-xs font-medium"
                              style={{ 
                                backgroundColor: stage?.color + '15',
                                color: stage?.color,
                                border: `1px solid ${stage?.color}30`
                              }}
                            >
                              {stage?.title || 'Unknown Stage'}
                            </div>
                          ))}
                          {workflowStages.length > 4 && (
                            <div className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                              +{workflowStages.length - 4} more
                            </div>
                          )}
                        </div>

                        {/* Performance Metrics */}
                        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                          <div className="text-center">
                            <p className="text-lg font-bold text-green-600">{jobWorkflow.conversionRate}%</p>
                            <p className="text-xs text-gray-600">Conversion</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-blue-600">{jobWorkflow.candidateCount}</p>
                            <p className="text-xs text-gray-600">Candidates</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Bulk Actions Toggle */}
          {filteredJobWorkflows.length > 0 && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => setBulkActionMode(!bulkActionMode)}
                className={bulkActionMode ? "border-orange-300 bg-orange-50" : ""}
              >
                <Grid3X3 className="h-4 w-4 mr-2" />
                {bulkActionMode ? "Exit Bulk Mode" : "Bulk Actions"}
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Workflow Templates</h2>
              <p className="text-gray-600">Create and manage reusable workflow templates</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => category && (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => setIsCreatingTemplate(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </div>
          </div>

          {templatesLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl mb-4 w-fit mx-auto">
                  <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                </div>
                <span className="text-gray-600 font-medium">Loading templates...</span>
              </div>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <Card className="border-gray-200 shadow-sm">
              <CardContent className="text-center py-16">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl mb-6 w-fit mx-auto border border-blue-100">
                  <Copy className="h-12 w-12 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900">No Templates Found</h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
                  {searchQuery || selectedCategory !== "all" 
                    ? "No templates match your current filters. Try adjusting your search criteria."
                    : "Create your first workflow template to standardize recruitment processes across different job positions."
                  }
                </p>
                {!searchQuery && selectedCategory === "all" && (
                  <Button onClick={() => setIsCreatingTemplate(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Template
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="border-gray-200 hover:border-gray-300 transition-colors group bg-white shadow-sm hover:shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-lg mb-2 truncate">{template.name}</h4>
                        <Badge variant="secondary" className="text-xs px-2 py-1 bg-gray-100 text-gray-700 border-0">
                          {template.category}
                        </Badge>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewTemplate(template)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                            <Edit3 className="h-4 w-4 mr-2" />
                            Edit Template
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicateTemplate(template.id)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    {template.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">
                        {template.description}
                      </p>
                    )}
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 font-medium">Stages:</span>
                        <Badge variant="outline" className="text-xs border-gray-300">
                          {template.stageIds?.length || 0} stages
                        </Badge>
                      </div>
                      
                      <div className="flex gap-1 flex-wrap">
                        {template.stageIds?.slice(0, 3).map((stageId, index) => {
                          const stage = stages.find(s => s.id === stageId);
                          if (!stage) return null;
                          return (
                            <div
                              key={stageId}
                              className="px-2 py-1 rounded text-xs font-medium"
                              style={{ 
                                backgroundColor: stage.color + '15',
                                color: stage.color,
                                border: `1px solid ${stage.color}30`
                              }}
                            >
                              {stage.title}
                            </div>
                          );
                        })}
                        {(template.stageIds?.length || 0) > 3 && (
                          <div className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                            +{(template.stageIds?.length || 0) - 3} more
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                        <span>Used by {loadedJobWorkflows.filter(w => w.templateId === template.id).length} jobs</span>
                        <span>{new Date(template.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Stages Tab */}
        <TabsContent value="stages" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Workflow Stages</h2>
              <p className="text-gray-600">
                Create and manage stages for building workflow templates
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  const stageNames = prompt("Enter stage names separated by commas:");
                  if (stageNames) {
                    const names = stageNames.split(',').map(n => n.trim()).filter(Boolean);
                    if (names.length > 0) {
                      handleBulkCreateStages(names);
                    }
                  }
                }}
                className="hidden sm:flex"
              >
                <Plus className="h-4 w-4 mr-2" />
                Bulk Create
              </Button>
              <Button onClick={() => setIsCreatingStage(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Stage
              </Button>
            </div>
          </div>

          {stages.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {stages
                  .filter((stage, index, self) => {
                    if (!stage || !stage.id) return false;
                    return index === self.findIndex((s) => s.id === stage.id);
                  })
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                  .map((stage, index) => {
                    const templateCount = templates.filter((t) =>
                      t.stageIds?.includes(stage.id)
                    ).length;
                    
                    const workflowCount = loadedJobWorkflows.filter((w) =>
                      w.stageIds?.includes(stage.id)
                    ).length;
                    
                    const isHexColor = stage.color?.startsWith('#');
                    
                    return (
                      <Card
                        key={stage.id}
                        className="relative border-gray-200 hover:border-gray-300 transition-colors group bg-white shadow-sm hover:shadow-md cursor-move"
                        style={isHexColor ? { 
                          borderTopColor: stage.color,
                          borderTopWidth: '3px',
                        } : { 
                          borderTopWidth: '3px'
                        }}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', stage.id);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const draggedStageId = e.dataTransfer.getData('text/plain');
                          const draggedStage = stages.find(s => s.id === draggedStageId);
                          if (draggedStage && draggedStage.id !== stage.id) {
                            // Swap orders
                            handleStageReorder(draggedStage.id, stage.order || index);
                            handleStageReorder(stage.id, draggedStage.order || 0);
                          }
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <GripVertical className="w-3 h-3 text-gray-400 flex-shrink-0" />
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: isHexColor ? stage.color : '#6b7280' }}
                              />
                              <h4 className="font-medium text-sm text-gray-900 truncate">{stage.title}</h4>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <MoreHorizontal className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={() => {
                                    const newTitle = prompt("Enter new stage name:", stage.title);
                                    if (newTitle && newTitle !== stage.title) {
                                      updateDoc(doc(db, "stages", stage.id), {
                                        title: newTitle,
                                        updatedAt: new Date().toISOString(),
                                      });
                                    }
                                  }}
                                >
                                  <Edit3 className="h-4 w-4 mr-2" />
                                  Rename
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteStage(stage.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Stage
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          
                          {stage.description && (
                            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-3">
                              {stage.description}
                            </p>
                          )}

                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 border-0">
                              {templateCount} templates
                            </Badge>
                            <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                              {workflowCount} jobs
                            </Badge>
                          </div>

                          <div className="text-center mt-2">
                            <span className="text-xs text-gray-400">#{stage.order || index + 1}</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
              
              <div className="text-center">
                <p className="text-sm text-gray-500">
                  💡 Tip: Drag and drop stages to reorder them. Changes apply globally to all templates.
                </p>
              </div>
            </>
          ) : (
            <Card className="border-gray-200 shadow-sm">
              <CardContent className="text-center py-16">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl mb-6 w-fit mx-auto border border-blue-100">
                  <Settings className="h-12 w-12 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900">No Stages Created</h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
                  Create global stages that can be reused across multiple workflow templates to standardize your recruitment process.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      const stageNames = prompt("Enter stage names separated by commas (e.g., 'Applied, Phone Screen, Interview'):");
                      if (stageNames) {
                        const names = stageNames.split(',').map(n => n.trim()).filter(Boolean);
                        if (names.length > 0) {
                          handleBulkCreateStages(names);
                        }
                      }
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Quick Setup
                  </Button>
                  <Button onClick={() => setIsCreatingStage(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Stage
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Workflow Analytics</h2>
              <p className="text-gray-600">Performance insights and optimization opportunities</p>
            </div>
            <Button variant="outline" onClick={handleExportWorkflows}>
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>

          {/* Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <Card className="border-gray-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg Conversion Rate</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Math.round(jobWorkflowsWithStats.reduce((sum, w) => sum + w.conversionRate, 0) / Math.max(jobWorkflowsWithStats.length, 1))}%
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-500">Across all active workflows</p>
              </CardContent>
            </Card>

            <Card className="border-gray-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-green-100 rounded-xl">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Candidates</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {candidatesData.length}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-500">In active workflows</p>
              </CardContent>
            </Card>

            <Card className="border-gray-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-purple-100 rounded-xl">
                    <Activity className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg Stages</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {workflowAnalytics.averageStagesPerWorkflow}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-500">Per workflow</p>
              </CardContent>
            </Card>

            <Card className="border-gray-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-orange-100 rounded-xl">
                    <CheckCircle className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Template Usage</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {workflowAnalytics.activeTemplates}/{workflowAnalytics.totalTemplates}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-500">Templates in use</p>
              </CardContent>
            </Card>
          </div>

          {/* Stage Distribution Chart */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle>Stage Distribution</CardTitle>
              <p className="text-sm text-gray-600">Usage of stages across all workflows</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(workflowAnalytics.stageDistribution)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 10)
                  .map(([stageName, count]) => {
                    const stage = stages.find(s => s.title === stageName);
                    const percentage = Math.round((count / Math.max(loadedJobWorkflows.length, 1)) * 100);
                    return (
                      <div key={stageName} className="flex items-center gap-4">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: stage?.color || '#6b7280' }}
                          />
                          <span className="text-sm font-medium text-gray-900 truncate">{stageName}</span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full"
                              style={{ 
                                width: `${percentage}%`,
                                backgroundColor: stage?.color || '#6b7280'
                              }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 w-12 text-right">{count} jobs</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>

          {/* Top Performing Workflows */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle>Top Performing Workflows</CardTitle>
              <p className="text-sm text-gray-600">Workflows with highest conversion rates</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {jobWorkflowsWithStats
                  .sort((a, b) => b.conversionRate - a.conversionRate)
                  .slice(0, 5)
                  .map((workflow) => {
                    const job = jobs.find(j => j.id === workflow.jobId);
                    const template = templates.find(t => t.id === workflow.templateId);
                    return (
                      <div key={workflow.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{job?.title || workflow.jobTitle}</p>
                            <p className="text-sm text-gray-600">
                              {template ? `${template.name} template` : 'Custom workflow'} • {workflow.candidateCount} candidates
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">{workflow.conversionRate}%</p>
                          <p className="text-xs text-gray-600">conversion rate</p>
                        </div>
                      </div>
                    );
                  })}
                {jobWorkflowsWithStats.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No workflow data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Template Creation Modal */}
      <Dialog open={isCreatingTemplate} onOpenChange={setIsCreatingTemplate}>
        <DialogContent className="max-w-2xl border-gray-200 shadow-2xl">
          <DialogHeader className="pb-8 border-b border-gray-200">
            <DialogTitle className="flex items-center gap-4 text-xl font-bold">
              <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                <Copy className="h-6 w-6 text-blue-600" />
              </div>
              Create Workflow Template
            </DialogTitle>
            <p className="text-sm text-gray-600 mt-2">
              Create a reusable workflow template that can be applied to multiple jobs
            </p>
          </DialogHeader>
          <div className="space-y-8 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="template-name" className="text-sm font-semibold text-gray-900">Template Name</Label>
                <Input
                  id="template-name"
                  placeholder="e.g., Engineering Workflow"
                  value={newTemplate.name}
                  onChange={(e) =>
                    setNewTemplate({ ...newTemplate, name: e.target.value })
                  }
                  className="border-gray-300 focus:border-blue-500 h-11 rounded-lg"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="template-category" className="text-sm font-semibold text-gray-900">Category</Label>
                <Input
                  id="template-category"
                  placeholder="e.g., Engineering, Sales"
                  value={newTemplate.category}
                  onChange={(e) =>
                    setNewTemplate({ ...newTemplate, category: e.target.value })
                  }
                  className="border-gray-300 focus:border-blue-500 h-11 rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="template-description" className="text-sm font-semibold text-gray-900">Description</Label>
              <Textarea
                id="template-description"
                placeholder="Describe the purpose and use case of this workflow template..."
                value={newTemplate.description}
                onChange={(e) =>
                  setNewTemplate({ ...newTemplate, description: e.target.value })
                }
                rows={4}
                className="border-gray-300 focus:border-blue-500 rounded-lg resize-none"
              />
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-semibold text-gray-900">Select Workflow Stages</Label>
                <p className="text-xs text-gray-600 mt-1">Choose stages that will be part of this template</p>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3 max-h-56 overflow-y-auto border border-gray-200 rounded-xl p-5 bg-gray-50">
                {stages.map((stage) => (
                  <label key={stage.id} className="flex items-center space-x-3 p-3 hover:bg-white rounded-lg cursor-pointer transition-all duration-200 hover:shadow-sm border border-transparent hover:border-gray-300">
                    <input
                      type="checkbox"
                      checked={newTemplate.stages.includes(stage.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewTemplate({
                            ...newTemplate,
                            stages: [...newTemplate.stages, stage.id],
                          });
                        } else {
                          setNewTemplate({
                            ...newTemplate,
                            stages: newTemplate.stages.filter(
                              (id) => id !== stage.id
                            ),
                          });
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      <span className="text-sm font-medium">{stage.title}</span>
                    </div>
                  </label>
                ))}
              </div>
              {newTemplate.stages.length > 0 && (
                <p className="text-xs text-gray-600">
                  {newTemplate.stages.length} stage{newTemplate.stages.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            <div className="flex justify-end gap-4 pt-8 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => setIsCreatingTemplate(false)}
                className="px-6 h-11 border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateTemplate}
                disabled={!newTemplate.name.trim() || newTemplate.stages.length === 0}
                className="px-6 h-11 bg-blue-600 hover:bg-blue-700"
              >
                Create Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Job Workflow Setup Modal */}
      <Dialog open={isSettingUpWorkflow} onOpenChange={setIsSettingUpWorkflow}>
        <DialogContent className="max-w-md border-gray-200">
          <DialogHeader className="pb-6">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Target className="h-5 w-5 text-blue-600" />
              </div>
              Setup Job Workflow
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="job-select" className="text-sm font-medium">Select Job Position</Label>
              <Select value={selectedJob} onValueChange={setSelectedJob}>
                <SelectTrigger className="border-gray-300 focus:border-blue-500">
                  <SelectValue placeholder="Choose a job position" />
                </SelectTrigger>
                <SelectContent>
                  {jobs && jobs.length > 0 ? (
                    jobs
                      .filter((job) => !jobWorkflows[job.id])
                      .map((job) => (
                        <SelectItem key={job.id} value={job.id}>
                          <div className="flex flex-col items-start py-1">
                            <div className="font-medium">{job.title}</div>
                            {job.department && (
                              <div className="text-xs text-gray-600">
                                {job.department}
                              </div>
                            )}
                          </div>
                        </SelectItem>
                      ))
                  ) : (
                    <SelectItem value="no-jobs" disabled>
                      No jobs available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label htmlFor="template-select" className="text-sm font-medium">Select Workflow Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger className="border-gray-300 focus:border-blue-500">
                  <SelectValue placeholder="Choose a workflow template" />
                </SelectTrigger>
                <SelectContent>
                  {templates && templates.length > 0 ? (
                    templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex flex-col items-start py-1">
                          <div className="font-medium">{template.name}</div>
                          <div className="text-xs text-gray-600">
                            {template.stageIds?.length || 0} stages • {template.category}
                          </div>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-templates" disabled>
                      No templates available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedJob && selectedTemplate && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <p className="text-sm font-medium text-gray-900">Ready to Setup</p>
                </div>
                <p className="text-xs text-gray-600">
                  This will create a workflow for the selected job using the chosen template.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => setIsSettingUpWorkflow(false)}
                className="border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSetupJobWorkflow}
                disabled={!selectedJob || !selectedTemplate}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Setup Workflow
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stage Creation Modal */}
      <Dialog open={isCreatingStage} onOpenChange={setIsCreatingStage}>
        <DialogContent className="max-w-lg border-gray-200">
          <DialogHeader className="pb-6">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Settings className="h-5 w-5 text-blue-600" />
              </div>
              Create New Stage
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="stage-title" className="text-sm font-medium">Stage Name</Label>
              <Input
                id="stage-title"
                placeholder="e.g., Application Review, Phone Screen"
                value={newStage.title}
                onChange={(e) =>
                  setNewStage({ ...newStage, title: e.target.value })
                }
                className="border-gray-300 focus:border-blue-500"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="stage-description" className="text-sm font-medium">Description (Optional)</Label>
              <Textarea
                id="stage-description"
                placeholder="Describe the purpose and activities in this stage..."
                value={newStage.description}
                onChange={(e) =>
                  setNewStage({ ...newStage, description: e.target.value })
                }
                rows={3}
                className="border-gray-300 focus:border-blue-500 resize-none"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="stage-color" className="text-sm font-medium">Stage Color</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="stage-color"
                  type="color"
                  value={newStage.color}
                  onChange={(e) =>
                    setNewStage({ ...newStage, color: e.target.value })
                  }
                  className="w-16 h-10 p-1 border rounded-lg cursor-pointer"
                />
                <Input
                  value={newStage.color}
                  onChange={(e) =>
                    setNewStage({ ...newStage, color: e.target.value })
                  }
                  placeholder="#3b82f6"
                  className="flex-1 text-sm font-mono border-gray-300 focus:border-blue-500"
                />
              </div>
              <div 
                className="p-4 rounded-xl border-2 text-center text-sm font-medium transition-all"
                style={{ 
                  backgroundColor: newStage.color + '15',
                  borderColor: newStage.color,
                  color: newStage.color
                }}
              >
                <div className="flex items-center justify-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: newStage.color }}
                  />
                  Preview: {newStage.title || "Stage Name"}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <Button 
                variant="outline" 
                onClick={() => setIsCreatingStage(false)}
                className="border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateStage}
                disabled={!newStage.title.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Create Stage
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template View Modal */}
      <Dialog open={!!viewingTemplate} onOpenChange={() => setViewingTemplate(null)}>
        <DialogContent className="max-w-2xl border-gray-200 shadow-2xl">
          <DialogHeader className="pb-8 border-b border-gray-200">
            <DialogTitle className="flex items-center gap-4 text-xl font-bold">
              <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                <Eye className="h-6 w-6 text-blue-600" />
              </div>
              View Template: {viewingTemplate?.name}
            </DialogTitle>
            <p className="text-sm text-gray-600 mt-2">
              Review the details and configuration of this workflow template
            </p>
          </DialogHeader>
          {viewingTemplate && (
            <div className="space-y-8 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-900">Template Name</Label>
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium">{viewingTemplate.name}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-900">Category</Label>
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium">{viewingTemplate.category || 'General'}</p>
                  </div>
                </div>
              </div>
              
              {viewingTemplate.description && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-900">Description</Label>
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm leading-relaxed">{viewingTemplate.description}</p>
                  </div>
                </div>
              )}
              
              <div>
                <Label className="text-sm font-medium">Stages ({viewingTemplate.stageIds?.length || 0})</Label>
                <div className="grid grid-cols-2 gap-2 mt-2 p-4 bg-gray-50 rounded max-h-48 overflow-y-auto">
                  {viewingTemplate.stageIds?.map((stageId: string) => {
                    const stage = stages.find(s => s.id === stageId);
                    return stage ? (
                      <div key={stage.id} className="flex items-center gap-2 p-2 bg-white rounded">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                        <span className="text-sm">{stage.title}</span>
                      </div>
                    ) : null;
                  }) || <p className="text-sm text-gray-600">No stages assigned</p>}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Template Edit Modal */}
      <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
        <DialogContent className="max-w-2xl border-gray-200 shadow-2xl">
          <DialogHeader className="pb-8 border-b border-gray-200">
            <DialogTitle className="flex items-center gap-4 text-xl font-bold">
              <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                <Edit3 className="h-6 w-6 text-blue-600" />
              </div>
              Edit Template
            </DialogTitle>
            <p className="text-sm text-gray-600 mt-2">
              Modify the template name, category, description and stages
            </p>
          </DialogHeader>
          {editingTemplate && (
            <div className="space-y-8 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="edit-template-name" className="text-sm font-semibold text-gray-900">Template Name</Label>
                  <Input
                    id="edit-template-name"
                    placeholder="Engineering Workflow"
                    value={editingTemplate.name}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, name: e.target.value })
                    }
                    className="border-gray-300 focus:border-blue-500 h-11 rounded-lg"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="edit-template-category" className="text-sm font-semibold text-gray-900">Category</Label>
                  <Input
                    id="edit-template-category"
                    placeholder="Engineering"
                    value={editingTemplate.category || ''}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, category: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-template-description">Description</Label>
                <Textarea
                  id="edit-template-description"
                  placeholder="Describe this workflow template..."
                  value={editingTemplate.description || ''}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, description: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Select Stages</Label>
                <div className="grid grid-cols-2 gap-3 mt-2 max-h-48 overflow-y-auto border rounded-lg p-4 bg-gray-50">
                  {stages.map((stage) => (
                    <div key={stage.id} className="flex items-center space-x-3 p-2 hover:bg-white rounded">
                      <input
                        type="checkbox"
                        id={`edit-stage-${stage.id}`}
                        checked={editingTemplate.stages.includes(stage.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditingTemplate({
                              ...editingTemplate,
                              stages: [...editingTemplate.stages, stage.id],
                            });
                          } else {
                            setEditingTemplate({
                              ...editingTemplate,
                              stages: editingTemplate.stages.filter(
                                (id: string) => id !== stage.id
                              ),
                            });
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <label
                        htmlFor={`edit-stage-${stage.id}`}
                        className="text-sm cursor-pointer flex items-center gap-2"
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                        {stage.title}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setEditingTemplate(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateTemplate}
                  disabled={!editingTemplate.name.trim() || editingTemplate.stages.length === 0}
                >
                  Update Template
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Job Workflow Edit Modal */}
      <Dialog open={!!editingJobWorkflow} onOpenChange={() => setEditingJobWorkflow(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="pb-4">
            <DialogTitle>Edit Job Workflow: {editingJobWorkflow?.jobTitle}</DialogTitle>
          </DialogHeader>
          {editingJobWorkflow && (
            <div className="space-y-6">
              <div className="p-4 bg-gray-50 rounded">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{editingJobWorkflow.jobTitle}</h4>
                    <p className="text-sm text-gray-600">
                      Job ID: {editingJobWorkflow.jobId}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {editingJobWorkflow.stages.length} stages selected
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Select Workflow Stages</Label>
                <p className="text-sm text-gray-600">
                  Choose which stages should be part of this job's workflow
                </p>
                <div className="grid grid-cols-2 gap-3 mt-2 max-h-64 overflow-y-auto border rounded-lg p-4 bg-gray-50">
                  {stages.map((stage) => (
                    <div key={stage.id} className="flex items-center space-x-3 p-2 hover:bg-white rounded">
                      <input
                        type="checkbox"
                        id={`job-edit-stage-${stage.id}`}
                        checked={editingJobWorkflow.stages.includes(stage.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditingJobWorkflow({
                              ...editingJobWorkflow,
                              stages: [...editingJobWorkflow.stages, stage.id],
                            });
                          } else {
                            setEditingJobWorkflow({
                              ...editingJobWorkflow,
                              stages: editingJobWorkflow.stages.filter(
                                (id: string) => id !== stage.id
                              ),
                            });
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <label
                        htmlFor={`job-edit-stage-${stage.id}`}
                        className="text-sm cursor-pointer flex items-center gap-2"
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                        {stage.title}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setEditingJobWorkflow(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateJobWorkflow}
                  disabled={editingJobWorkflow.stages.length === 0}
                >
                  Update Workflow
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Help Modal with Keyboard Shortcuts */}
      <Dialog open={showHelpModal} onOpenChange={setShowHelpModal}>
        <DialogContent className="max-w-lg border-gray-200">
          <DialogHeader className="pb-6">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-blue-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-blue-600" />
              </div>
              Keyboard Shortcuts & Tips
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Keyboard Shortcuts</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-700">Create new item</span>
                  <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">Ctrl/Cmd + N</kbd>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-700">Export data</span>
                  <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">Ctrl/Cmd + E</kbd>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-700">Focus search</span>
                  <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">Ctrl/Cmd + /</kbd>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Quick Tips</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• Use bulk actions to manage multiple workflows at once</p>
                <p>• Templates can be duplicated and modified for similar roles</p>
                <p>• Stages are globally shared across all templates</p>
                <p>• Analytics tab shows conversion rates and performance metrics</p>
                <p>• Real-time updates ensure data is always current</p>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200">
              <Button onClick={() => setShowHelpModal(false)}>
                Got it
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Wrap the component with error boundary for production safety
export default function ComprehensiveWorkflowManagement() {
  return (
    <WorkflowErrorBoundary>
      <ComprehensiveWorkflowManagementBase />
    </WorkflowErrorBoundary>
  );
}
