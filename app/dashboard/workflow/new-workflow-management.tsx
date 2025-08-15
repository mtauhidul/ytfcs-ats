import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import {
  Activity,
  BarChart3,
  CheckCircle,
  Copy,
  Edit3,
  Eye,
  Layers,
  Plus,
  RefreshCw,
  Settings,
  Target,
  Trash2,
  TrendingUp,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import React, { useEffect, useState } from "react";
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
} from "~/features/workflowSlice";
import { db } from "~/lib/firebase";
import { seedWorkflowData } from "~/lib/workflow-templates-seeder";
import { WorkflowErrorHandler, withWorkflowErrorHandling } from "~/lib/workflow-error-handler";
import WorkflowErrorBoundary from "./components/WorkflowErrorBoundary";
import { workflowRealtimeService } from "~/services/workflowRealtimeService";
import type { AppDispatch, RootState } from "~/store";
import type { Stage } from "~/types";

function NewWorkflowManagementBase() {
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

  // Tab state
  const [activeTab, setActiveTab] = useState("dashboard");

  // State for stage management
  const [isCreatingStage, setIsCreatingStage] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [newStage, setNewStage] = useState({
    title: "",
    description: "",
    color: "#3b82f6", // Hex color for the color picker
  });

  // State for template viewing/editing
  const [viewingTemplate, setViewingTemplate] = useState<any>(null);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  // State for job workflow editing
  const [editingJobWorkflow, setEditingJobWorkflow] = useState<any>(null);

  // Manual workflow data initialization function
  const handleInitializeWorkflowData = async () => {
    setIsInitializing(true);
    try {
      const result = await withWorkflowErrorHandling(async () => {
        return await seedWorkflowData();
      }, 'seedWorkflowData');

      if (result.success) {
        toast.success("Workflow data initialized successfully!");
        // Refresh data after seeding
        dispatch(fetchWorkflowTemplates());
        dispatch(fetchJobs());
        
        // Reload stages
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
        // Load essential data with proper error handling
        dispatch(fetchWorkflowTemplates());
        dispatch(fetchJobs());

        // Set up real-time listener for job workflows
        const jobWorkflowsCollection = collection(db, "jobWorkflows");
        const unsubscribeJobWorkflows = onSnapshot(jobWorkflowsCollection, (snapshot) => {
          const jobWorkflowsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          // Store job workflows in local state with real-time updates
          setLoadedJobWorkflows(jobWorkflowsData);
          console.log("🔄 Real-time job workflows update:", jobWorkflowsData.length, "workflows");
        }, (error) => {
          console.error("❌ Error listening to job workflows:", error);
          toast.error("Failed to sync job workflows in real-time", {
            description: "Some data may not be up to date"
          });
        });

        // Store the unsubscriber for cleanup
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
                color: data.color, // This contains the CSS classes like "bg-yellow-50 border-yellow-200 text-yellow-700"
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
          console.log("🔄 Real-time stages update:", stagesData.length, "stages");
        }, (error) => {
          console.error("❌ Error listening to stages:", error);
          toast.error("Failed to sync stages in real-time", {
            description: "Stage data may not be up to date"
          });
        });

        // Store stages unsubscriber for cleanup as well
        setStagesUnsubscriber(() => unsubscribeStages);
        
        toast.success("Workflow management initialized with real-time updates", {
          description: "Real-time synchronization is now active"
        });
      } catch (error) {
        console.error("Failed to initialize workflow data:", error);
        toast.error("Failed to initialize workflow management", {
          description: "Please refresh the page or contact support"
        });
      }
    };

    initializeData();

    // Cleanup function
    return () => {
      if (jobWorkflowsUnsubscriber) {
        jobWorkflowsUnsubscriber();
        console.log("🧹 Cleaned up job workflows real-time listener");
      }
      if (stagesUnsubscriber) {
        stagesUnsubscriber();
        console.log("🧹 Cleaned up stages real-time listener");
      }
    };
  }, [dispatch]);

  // Calculate workflow statistics
  const workflowStats = React.useMemo(() => {
    const totalJobs = jobs.length;
    const jobsWithWorkflow = loadedJobWorkflows.length; // Use loaded job workflows
    const totalTemplates = templates.length;
    const activeTemplates = templates.filter((t) =>
      loadedJobWorkflows.some((workflow) => workflow.templateId === t.id)
    ).length;

    return {
      totalJobs,
      jobsWithWorkflow,
      totalTemplates,
      activeTemplates,
      workflowCoverage:
        totalJobs > 0 ? Math.round((jobsWithWorkflow / totalJobs) * 100) : 0,
    };
  }, [jobs, loadedJobWorkflows, templates]);

  // Handle stage creation
  const handleCreateStage = async () => {
    if (!newStage.title.trim()) {
      toast.error("Stage title is required", {
        description: "Please enter a descriptive name for the stage"
      });
      return;
    }

    try {
      toast.loading("Creating stage...", { id: "create-stage" });
      
      // Calculate the next order
      const maxOrder = stages.length > 0 
        ? Math.max(...stages.map(s => s.order || 0)) 
        : 0;

      const stageData = {
        ...newStage,
        order: maxOrder + 1, // Add the required order property
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
        description: "Stage is now available for workflow templates"
      });
    } catch (error) {
      console.error("Failed to create stage:", error);
      toast.error("Failed to create stage", {
        id: "create-stage",
        description: "Please try again or contact support if the issue persists"
      });
    }
  };

  // Handle stage deletion
  const handleDeleteStage = async (stageId: string) => {
    const stageToDelete = stages.find(s => s.id === stageId);
    
    if (!confirm(`Are you sure you want to delete the stage "${stageToDelete?.title || 'Unknown'}"?\n\nThis action cannot be undone and will remove the stage from all templates.`)) {
      return;
    }
    
    try {
      toast.loading("Deleting stage...", { id: "delete-stage" });
      
      await deleteDoc(doc(db, "stages", stageId));
      dispatch(setStages(stages.filter((stage) => stage.id !== stageId)));
      
      toast.success(`Stage "${stageToDelete?.title || 'Unknown'}" deleted successfully`, {
        id: "delete-stage",
        description: "Stage has been removed from all templates"
      });
    } catch (error) {
      console.error("Failed to delete stage:", error);
      toast.error("Failed to delete stage", {
        id: "delete-stage",
        description: "Please try again or contact support if the issue persists"
      });
    }
  };

  // Function to manually refresh job workflows (now mostly for fallback)
  const loadJobWorkflows = async () => {
    try {
      // Note: Real-time listener should handle updates automatically
      // This function is kept for manual refresh if needed
      console.log("📱 Manual refresh triggered (real-time should handle this automatically)");
      
      const jobWorkflowsCollection = collection(db, "jobWorkflows");
      const jobWorkflowsSnapshot = await getDocs(jobWorkflowsCollection);
      const jobWorkflowsData = jobWorkflowsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLoadedJobWorkflows(jobWorkflowsData);
    } catch (error) {
      console.error("Failed to manually load job workflows:", error);
      toast.error("Failed to refresh job workflows");
    }
  };

  // Handle template creation
  const handleCreateTemplate = async () => {
    if (!newTemplate.name.trim()) {
      toast.error("Template name is required", {
        description: "Please enter a descriptive name for the template"
      });
      return;
    }

    if (newTemplate.stages.length === 0) {
      toast.error("At least one stage is required", {
        description: "Please select workflow stages for the template"
      });
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
        stageIds: newTemplate.stages, // Store stage IDs instead of duplicating stage data
      };

      await dispatch(createWorkflowTemplate(templateData)).unwrap();

      // Reset form
      setNewTemplate({ name: "", description: "", category: "", stages: [] });
      setIsCreatingTemplate(false);
      
      toast.success(`Template "${newTemplate.name}" created successfully`, {
        id: "create-template",
        description: `Template with ${newTemplate.stages.length} stages is ready to use`
      });
    } catch (error) {
      console.error("Failed to create template:", error);
      toast.error("Failed to create template", {
        id: "create-template",
        description: "Please try again or contact support if the issue persists"
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
    
    if (!confirm(`Are you sure you want to delete the workflow for "${jobTitle}"?\n\nThis will remove all workflow stages for this job position. This action cannot be undone.`)) {
      return;
    }

    try {
      await dispatch(deleteJobWorkflow(jobId)).unwrap();
      toast.success(`Workflow for "${jobTitle}" deleted successfully`);
      
      // Real-time listener will automatically update the list
      // No need for manual refresh
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

      // Use Firebase update instead of Redux since we don't have updateWorkflowTemplate
      await updateDoc(doc(db, "workflowTemplates", editingTemplate.id), templateData);

      setEditingTemplate(null);
      toast.success(`Template "${editingTemplate.name}" updated successfully`);
      
      // Refresh templates
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
      // Update job workflow in Firestore
      await updateDoc(doc(db, "jobWorkflows", editingJobWorkflow.id), {
        stageIds: editingJobWorkflow.stages,
        updatedAt: new Date().toISOString(),
      });

      setEditingJobWorkflow(null);
      toast.success(`Workflow for "${editingJobWorkflow.jobTitle}" updated successfully`);
      
      // Real-time listener will automatically update the list
    } catch (error) {
      console.error("Failed to update job workflow:", error);
      toast.error("Failed to update job workflow. Please try again.");
    }
  };

  // Handle job workflow setup
  const handleSetupJobWorkflow = async () => {
    if (!selectedJob || !selectedTemplate) {
      toast.error("Job and template selection required", {
        description: "Please select both a job position and a workflow template"
      });
      return;
    }

    try {
      const job = jobs.find((j) => j.id === selectedJob);
      const template = templates.find((t) => t.id === selectedTemplate);
      
      if (!job) {
        toast.error("Selected job not found", {
          description: "The job position may have been deleted"
        });
        return;
      }
      
      if (!template) {
        toast.error("Selected template not found", {
          description: "The workflow template may have been deleted"
        });
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

      // Start real-time listening for this job
      workflowRealtimeService.setupJobWorkflowListener(selectedJob);

      setSelectedJob("");
      setSelectedTemplate("");
      setIsSettingUpWorkflow(false);
      
      toast.success(`Workflow setup completed for "${job.title}"`, {
        id: "setup-workflow",
        description: `Using "${template.name}" template with ${template.stageIds?.length || 0} stages`
      });
    } catch (error) {
      console.error("Failed to setup job workflow:", error);
      toast.error("Failed to setup job workflow", {
        id: "setup-workflow",
        description: "Please try again or contact support if the issue persists"
      });
    }
  };

  return (
    <div className="space-y-8 p-6">
      {/* Clean Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Workflow className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Workflow Management</h1>
            <p className="text-sm text-gray-600 hidden sm:block">
              Configure recruitment workflows and templates
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant="secondary" className="px-2 py-1 bg-gray-100 text-gray-700 border-0">
            {Object.keys(jobWorkflows).length} Active
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleInitializeWorkflowData}
            disabled={isInitializing}
            className="bg-white hover:bg-gray-50 border-gray-300 text-sm"
          >
            {isInitializing ? (
              <>
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                <span className="hidden sm:inline">Initializing...</span>
                <span className="sm:hidden">Init...</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Initialize</span>
                <span className="sm:hidden">Init</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 bg-muted/30 p-1 h-auto">
          <TabsTrigger 
            value="dashboard" 
            className="flex items-center gap-2 text-sm font-medium h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
            <span className="sm:hidden">Home</span>
          </TabsTrigger>
          <TabsTrigger 
            value="templates" 
            className="flex items-center gap-2 text-sm font-medium h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Copy className="h-4 w-4" />
            <span className="hidden sm:inline">Templates ({templates.length})</span>
            <span className="sm:hidden">Templates</span>
          </TabsTrigger>
          <TabsTrigger 
            value="jobs" 
            className="flex items-center gap-2 text-sm font-medium h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Jobs ({loadedJobWorkflows.length})</span>
            <span className="sm:hidden">Jobs</span>
          </TabsTrigger>
          <TabsTrigger 
            value="stages" 
            className="flex items-center gap-2 text-sm font-medium h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Stages ({stages.length})</span>
            <span className="sm:hidden">Stages</span>
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-8">
          {/* Quick Actions */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                <Button
                  variant="outline"
                  className="h-auto p-6 flex flex-col items-center gap-3 hover:shadow-md transition-all duration-200 border-border/60 hover:border-primary/30 bg-gradient-to-br from-background to-accent/10"
                  onClick={() => {
                    setActiveTab("templates");
                    setTimeout(() => setIsCreatingTemplate(true), 100);
                  }}
                >
                  <div className="p-3 bg-primary/10 rounded-xl">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-foreground">Create Template</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Build reusable workflow template
                    </p>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto p-6 flex flex-col items-center gap-3 hover:shadow-md transition-all duration-200 border-border/60 hover:border-primary/30 bg-gradient-to-br from-background to-accent/10"
                  onClick={() => {
                    setActiveTab("jobs");
                    setTimeout(() => setIsSettingUpWorkflow(true), 100);
                  }}
                >
                  <div className="p-3 bg-primary/10 rounded-xl">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-foreground">Setup Workflow</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Configure job recruitment pipeline
                    </p>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto p-6 flex flex-col items-center gap-3 hover:shadow-md transition-all duration-200 border-border/60 hover:border-primary/30 bg-gradient-to-br from-background to-accent/10"
                  onClick={() => setActiveTab("stages")}
                >
                  <div className="p-3 bg-primary/10 rounded-xl">
                    <Settings className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-foreground">Manage Stages</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Configure workflow stages
                    </p>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-border/60 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Jobs</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{workflowStats.totalJobs}</p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-xl">
                    <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">With Workflows</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{workflowStats.jobsWithWorkflow}</p>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-xl">
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Templates</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{workflowStats.totalTemplates}</p>
                  </div>
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-xl">
                    <Copy className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Coverage</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{workflowStats.workflowCoverage}%</p>
                  </div>
                  <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-xl">
                    <TrendingUp className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
                <div className="mt-4">
                  <Progress 
                    value={workflowStats.workflowCoverage} 
                    className="h-2" 
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {workflowStats.jobsWithWorkflow} of {workflowStats.totalJobs} jobs configured
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Workflow Templates</h2>
              <p className="text-muted-foreground">Create and manage reusable workflow templates</p>
            </div>
            <Button onClick={() => setIsCreatingTemplate(true)} className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </div>

          {templatesLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-4 rounded-xl mb-4 w-fit mx-auto">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                </div>
                <span className="text-muted-foreground font-medium">Loading templates...</span>
              </div>
            </div>
          ) : templates.length === 0 ? (
            <Card className="border-border/60 shadow-sm">
              <CardContent className="text-center py-16">
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 rounded-2xl mb-6 w-fit mx-auto">
                  <Workflow className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">No Templates Yet</h3>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
                  Create your first workflow template to standardize recruitment processes across different job positions.
                </p>
                <Button onClick={() => setIsCreatingTemplate(true)} className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {templates.map((template) => (
                <Card key={template.id} className="border border-gray-200 hover:border-gray-300 transition-colors group bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 text-lg mb-2">{template.name}</h4>
                        <Badge variant="secondary" className="text-xs px-2 py-1 bg-gray-100 text-gray-700 border-0">
                          {template.category}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="text-gray-500 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
                            <Badge key={stageId} variant="outline" className="text-xs border-gray-300 bg-gray-100">
                              {stage.title}
                            </Badge>
                          );
                        })}
                        {(template.stageIds?.length || 0) > 3 && (
                          <Badge variant="outline" className="text-xs border-gray-300 bg-gray-100">
                            +{(template.stageIds?.length || 0) - 3} more
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex gap-2 pt-3 border-t border-gray-200">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 bg-white hover:bg-gray-50 border-gray-300"
                          onClick={() => handleViewTemplate(template)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 bg-white hover:bg-gray-50 border-gray-300"
                          onClick={() => handleEditTemplate(template)}
                        >
                          <Edit3 className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Job Workflows Tab */}
        <TabsContent value="jobs" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Job Workflows</h2>
              <p className="text-muted-foreground">Manage workflows for specific job positions</p>
            </div>
            <Button onClick={() => setIsSettingUpWorkflow(true)} className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Setup Workflow
            </Button>
          </div>

          {loadedJobWorkflows.length === 0 ? (
            <Card className="border-border/60 shadow-sm">
              <CardContent className="text-center py-16">
                <div className="bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-900/20 dark:to-orange-800/10 p-6 rounded-2xl mb-6 w-fit mx-auto border border-orange-200 dark:border-orange-800/30">
                  <Target className="h-12 w-12 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">No Job Workflows</h3>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
                  Configure workflows for your job positions to manage candidates through structured recruitment stages.
                </p>
                <Button onClick={() => setIsSettingUpWorkflow(true)} className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Setup First Workflow
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {loadedJobWorkflows.map((jobWorkflow) => {
                const job = jobs.find((j) => j.id === jobWorkflow.jobId);
                const template = templates.find((t) => t.id === jobWorkflow.templateId);
                const workflowStages = jobWorkflow.stageIds ? 
                  jobWorkflow.stageIds.map((stageId: string) => stages.find(s => s.id === stageId)).filter(Boolean) : 
                  [];
                
                return (
                  <Card key={jobWorkflow.id} className="border border-gray-200 hover:border-gray-300 transition-colors group bg-white">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 text-lg mb-1">{job?.title || "Unknown Job"}</h4>
                          {job?.department && (
                            <p className="text-sm text-gray-600 mb-2">{job.department}</p>
                          )}
                          {template && (
                            <Badge variant="secondary" className="text-xs px-2 py-1 bg-gray-100 text-gray-700 border-0">
                              {template.name}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs border-border/60 bg-accent/20">
                            {workflowStages.length} stages
                          </Badge>
                          <Button 
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteJobWorkflow(jobWorkflow.jobId)}
                            className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-2"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex gap-1 flex-wrap">
                          {workflowStages.slice(0, 3).map((stage: any, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs border-border/60 bg-accent/20">
                              {stage?.title || 'Unknown Stage'}
                            </Badge>
                          ))}
                          {workflowStages.length > 3 && (
                            <Badge variant="outline" className="text-xs border-border/60 bg-muted/30">
                              +{workflowStages.length - 3} more
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex gap-2 pt-2">
                          <Button variant="outline" size="sm" className="flex-1 bg-background/80 hover:bg-accent/80" asChild>
                            <Link to={`/dashboard/workflow?job=${jobWorkflow.jobId}`}>
                              <Eye className="h-3 w-3 mr-1" />
                              View Board
                            </Link>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 bg-background/80 hover:bg-accent/80"
                            onClick={() => handleEditJobWorkflow(jobWorkflow)}
                          >
                            <Edit3 className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Stages Tab */}
        <TabsContent value="stages" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Workflow Stages</h2>
              <p className="text-muted-foreground">
                Create and manage stages for building workflow templates
              </p>
            </div>
            <Button onClick={() => setIsCreatingStage(true)} className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Create Stage
            </Button>
          </div>

          {stages.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {stages
                .filter((stage, index, self) => {
                  if (!stage || !stage.id) return false;
                  return index === self.findIndex((s) => s.id === stage.id);
                })
                .map((stage) => {
                  const templateCount = templates.filter((t) =>
                    t.stageIds?.includes(stage.id)
                  ).length;
                  
                  // Handle both CSS classes (existing data) and hex colors (new data)
                  const isHexColor = stage.color?.startsWith('#');
                  
                  let cardClasses, borderColor, bgColor, textColor;
                  
                  if (isHexColor) {
                    // New format: hex color
                    borderColor = stage.color;
                    bgColor = stage.color + '08'; // Very subtle background
                    textColor = stage.color;
                    cardClasses = 'relative p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors group bg-white';
                  } else {
                    // Existing format: CSS classes
                    cardClasses = `${stage.color || 'bg-gray-50 border-gray-200 text-gray-700'} relative p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors group bg-white`;
                    // Extract border color from CSS classes for consistency
                    const borderColorMatch = stage.color?.match(/border-(\w+)-(\d+)/);
                    borderColor = borderColorMatch ? `var(--${borderColorMatch[1]}-${borderColorMatch[2]})` : '#e5e7eb';
                  }
                  
                  return (
                    <div
                      key={stage.id}
                      className={cardClasses}
                      style={isHexColor ? { 
                        borderTopColor: borderColor,
                        borderTopWidth: '3px',
                        backgroundColor: bgColor
                      } : { 
                        borderTopWidth: '3px'
                      }}
                    >
                      {/* Compact Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: isHexColor ? borderColor : '#6b7280' }}
                          />
                          <h4 className="font-medium text-sm text-gray-900 truncate">{stage.title}</h4>
                          <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 border-0 ml-auto">
                            {templateCount}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteStage(stage.id)}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      {/* Description */}
                      {stage.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                          {stage.description}
                        </p>
                      )}
                    </div>
                  );
                })}
            </div>
          ) : (
            <Card className="border-border/60 shadow-sm">
              <CardContent className="text-center py-16">
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 rounded-2xl mb-6 w-fit mx-auto">
                  <Settings className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">No Stages Created</h3>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
                  Create global stages that can be reused across multiple workflow templates to standardize your recruitment process.
                </p>
                <Button onClick={() => setIsCreatingStage(true)} className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Stage
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Template Creation Modal */}
      <Dialog open={isCreatingTemplate} onOpenChange={setIsCreatingTemplate}>
        <DialogContent className="max-w-2xl border-border/40 shadow-2xl">
          <DialogHeader className="pb-8 border-b border-border/30">
            <DialogTitle className="flex items-center gap-4 text-xl font-bold">
              <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl border border-primary/20">
                <Copy className="h-6 w-6 text-primary" />
              </div>
              Create Workflow Template
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Create a reusable workflow template that can be applied to multiple jobs
            </p>
          </DialogHeader>
          <div className="space-y-8 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="template-name" className="text-sm font-semibold text-foreground">Template Name</Label>
                <Input
                  id="template-name"
                  placeholder="e.g., Engineering Workflow"
                  value={newTemplate.name}
                  onChange={(e) =>
                    setNewTemplate({ ...newTemplate, name: e.target.value })
                  }
                  className="bg-background/90 border-border/50 focus:border-primary/70 h-11 rounded-lg shadow-sm transition-all duration-200"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="template-category" className="text-sm font-semibold text-foreground">Category</Label>
                <Input
                  id="template-category"
                  placeholder="e.g., Engineering, Sales"
                  value={newTemplate.category}
                  onChange={(e) =>
                    setNewTemplate({ ...newTemplate, category: e.target.value })
                  }
                  className="bg-background/90 border-border/50 focus:border-primary/70 h-11 rounded-lg shadow-sm transition-all duration-200"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="template-description" className="text-sm font-semibold text-foreground">Description</Label>
              <Textarea
                id="template-description"
                placeholder="Describe the purpose and use case of this workflow template..."
                value={newTemplate.description}
                onChange={(e) =>
                  setNewTemplate({ ...newTemplate, description: e.target.value })
                }
                rows={4}
                className="bg-background/90 border-border/50 focus:border-primary/70 rounded-lg shadow-sm resize-none transition-all duration-200"
              />
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-semibold text-foreground">Select Workflow Stages</Label>
                <p className="text-xs text-muted-foreground mt-1">Choose stages that will be part of this template</p>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3 max-h-56 overflow-y-auto border border-border/40 rounded-xl p-5 bg-gradient-to-br from-muted/10 to-muted/5 shadow-inner">
                {stages.map((stage) => (
                  <label key={stage.id} className="flex items-center space-x-3 p-3 hover:bg-background/90 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-sm border border-transparent hover:border-border/30">
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
                      className="rounded border-border/60 text-primary focus:ring-primary"
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
                <p className="text-xs text-muted-foreground">
                  {newTemplate.stages.length} stage{newTemplate.stages.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            <div className="flex justify-end gap-4 pt-8 border-t border-border/40">
              <Button
                variant="outline"
                onClick={() => setIsCreatingTemplate(false)}
                className="px-6 h-11 border-border/50 hover:bg-accent/80 transition-all duration-200 font-medium"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateTemplate}
                disabled={!newTemplate.name.trim() || newTemplate.stages.length === 0}
                className="px-6 h-11 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-md hover:shadow-lg transition-all duration-200 font-medium"
              >
                Create Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Job Workflow Setup Modal */}
      <Dialog open={isSettingUpWorkflow} onOpenChange={setIsSettingUpWorkflow}>
        <DialogContent className="max-w-md">
          <DialogHeader className="pb-6">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Target className="h-5 w-5 text-primary" />
              </div>
              Setup Job Workflow
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="job-select" className="text-sm font-medium">Select Job Position</Label>
              <Select value={selectedJob} onValueChange={setSelectedJob}>
                <SelectTrigger className="bg-background/80 border-border/60 focus:border-primary">
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
                              <div className="text-xs text-muted-foreground">
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
                <SelectTrigger className="bg-background/80 border-border/60 focus:border-primary">
                  <SelectValue placeholder="Choose a workflow template" />
                </SelectTrigger>
                <SelectContent>
                  {templates && templates.length > 0 ? (
                    templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex flex-col items-start py-1">
                          <div className="font-medium">{template.name}</div>
                          <div className="text-xs text-muted-foreground">
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
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium text-foreground">Ready to Setup</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  This will create a workflow for the selected job using the chosen template.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-6 border-t border-border/30">
              <Button
                variant="outline"
                onClick={() => setIsSettingUpWorkflow(false)}
                className="hover:bg-accent/80"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSetupJobWorkflow}
                disabled={!selectedJob || !selectedTemplate}
                className="bg-primary hover:bg-primary/90"
              >
                Setup Workflow
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stage Creation Modal */}
      <Dialog open={isCreatingStage} onOpenChange={setIsCreatingStage}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="pb-6">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Settings className="h-5 w-5 text-primary" />
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
                className="bg-background/80 border-border/60 focus:border-primary"
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
                className="bg-background/80 border-border/60 focus:border-primary resize-none"
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
                  className="flex-1 text-sm font-mono bg-background/80 border-border/60 focus:border-primary"
                />
              </div>
              <div 
                className="p-4 rounded-xl border-2 text-center text-sm font-medium transition-all"
                style={{ 
                  backgroundColor: newStage.color + '15', // 15% opacity
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

            <div className="flex justify-end gap-3 pt-6 border-t border-border/30">
              <Button 
                variant="outline" 
                onClick={() => setIsCreatingStage(false)}
                className="hover:bg-accent/80"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateStage}
                disabled={!newStage.title.trim()}
                className="bg-primary hover:bg-primary/90"
              >
                Create Stage
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template View Modal */}
      <Dialog open={!!viewingTemplate} onOpenChange={() => setViewingTemplate(null)}>
        <DialogContent className="max-w-2xl border-border/40 shadow-2xl">
          <DialogHeader className="pb-8 border-b border-border/30">
            <DialogTitle className="flex items-center gap-4 text-xl font-bold">
              <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl border border-primary/20">
                <Eye className="h-6 w-6 text-primary" />
              </div>
              View Template: {viewingTemplate?.name}
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Review the details and configuration of this workflow template
            </p>
          </DialogHeader>
          {viewingTemplate && (
            <div className="space-y-8 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Template Name</Label>
                  <div className="p-4 bg-gradient-to-br from-muted/10 to-muted/5 rounded-lg border border-border/30">
                    <p className="text-sm font-medium">{viewingTemplate.name}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Category</Label>
                  <div className="p-4 bg-gradient-to-br from-muted/10 to-muted/5 rounded-lg border border-border/30">
                    <p className="text-sm font-medium">{viewingTemplate.category || 'General'}</p>
                  </div>
                </div>
              </div>
              
              {viewingTemplate.description && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Description</Label>
                  <div className="p-4 bg-gradient-to-br from-muted/10 to-muted/5 rounded-lg border border-border/30">
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
                  }) || <p className="text-sm text-muted-foreground">No stages assigned</p>}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Template Edit Modal */}
      <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
        <DialogContent className="max-w-2xl border-border/40 shadow-2xl">
          <DialogHeader className="pb-8 border-b border-border/30">
            <DialogTitle className="flex items-center gap-4 text-xl font-bold">
              <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl border border-primary/20">
                <Edit3 className="h-6 w-6 text-primary" />
              </div>
              Edit Template
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Modify the template name, category, description and stages
            </p>
          </DialogHeader>
          {editingTemplate && (
            <div className="space-y-8 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="edit-template-name" className="text-sm font-semibold text-foreground">Template Name</Label>
                  <Input
                    id="edit-template-name"
                    placeholder="Engineering Workflow"
                    value={editingTemplate.name}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, name: e.target.value })
                    }
                    className="bg-background/90 border-border/50 focus:border-primary/70 h-11 rounded-lg shadow-sm transition-all duration-200"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="edit-template-category" className="text-sm font-semibold text-foreground">Category</Label>
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
                    <p className="text-sm text-muted-foreground">
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
                <p className="text-sm text-muted-foreground">
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
    </div>
  );
}

// Wrap the component with error boundary for production safety
export default function NewWorkflowManagement() {
  return (
    <WorkflowErrorBoundary>
      <NewWorkflowManagementBase />
    </WorkflowErrorBoundary>
  );
}
