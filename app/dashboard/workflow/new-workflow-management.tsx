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
          toast.error("Failed to sync job workflows in real-time");
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
          toast.error("Failed to sync stages in real-time");
        });

        // Store stages unsubscriber for cleanup as well
        setStagesUnsubscriber(() => unsubscribeStages);
        
        toast.success("Workflow management initialized with real-time updates");
      } catch (error) {
        console.error("Failed to initialize workflow data:", error);
        toast.error("Failed to initialize workflow management");
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
      toast.error("Please enter a stage title");
      return;
    }

    try {
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
      
      toast.success(`Stage "${newStage.title}" created successfully`);
    } catch (error) {
      console.error("Failed to create stage:", error);
      toast.error("Failed to create stage. Please try again.");
    }
  };

  // Handle stage deletion
  const handleDeleteStage = async (stageId: string) => {
    const stageToDelete = stages.find(s => s.id === stageId);
    
    try {
      await deleteDoc(doc(db, "stages", stageId));
      dispatch(setStages(stages.filter((stage) => stage.id !== stageId)));
      
      toast.success(`Stage "${stageToDelete?.title || 'Unknown'}" deleted successfully`);
    } catch (error) {
      console.error("Failed to delete stage:", error);
      toast.error("Failed to delete stage. Please try again.");
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
      toast.error("Please enter a template name");
      return;
    }

    if (newTemplate.stages.length === 0) {
      toast.error("Please select at least one stage for the template");
      return;
    }

    try {
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
      
      toast.success(`Template "${newTemplate.name}" created successfully`);
    } catch (error) {
      console.error("Failed to create template:", error);
      toast.error("Failed to create template. Please try again.");
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
      toast.error("Please select both a job and a template");
      return;
    }

    try {
      const job = jobs.find((j) => j.id === selectedJob);
      const template = templates.find((t) => t.id === selectedTemplate);
      
      if (!job) {
        toast.error("Selected job not found");
        return;
      }
      
      if (!template) {
        toast.error("Selected template not found");
        return;
      }

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
      
      toast.success(`Workflow setup completed for "${job.title}" using "${template.name}" template`);
    } catch (error) {
      console.error("Failed to setup job workflow:", error);
      toast.error("Failed to setup job workflow. Please try again.");
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Workflow Management</h1>
          <p className="text-muted-foreground">
            Manage workflow templates and job workflows
          </p>
        </div>
        <Badge variant="secondary" className="px-3 py-1">
          <Activity className="h-4 w-4 mr-1" />
          {Object.keys(jobWorkflows).length} Active
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Copy className="h-4 w-4" />
            Templates ({templates.length})
          </TabsTrigger>
          <TabsTrigger value="jobs" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Jobs ({loadedJobWorkflows.length})
          </TabsTrigger>
          <TabsTrigger value="stages" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Stages ({stages.length})
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-2"
                  onClick={() => {
                    setActiveTab("templates");
                    setTimeout(() => setIsCreatingTemplate(true), 100);
                  }}
                >
                  <Plus className="h-6 w-6" />
                  <div className="text-center">
                    <p className="font-medium">Create Template</p>
                    <p className="text-xs text-muted-foreground">
                      Build workflow template
                    </p>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-2"
                  onClick={() => {
                    setActiveTab("jobs");
                    setTimeout(() => setIsSettingUpWorkflow(true), 100);
                  }}
                >
                  <Target className="h-6 w-6" />
                  <div className="text-center">
                    <p className="font-medium">Setup Workflow</p>
                    <p className="text-xs text-muted-foreground">
                      Configure job pipeline
                    </p>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-2"
                  onClick={() => setActiveTab("stages")}
                >
                  <Settings className="h-6 w-6" />
                  <div className="text-center">
                    <p className="font-medium">Manage Stages</p>
                    <p className="text-xs text-muted-foreground">
                      Configure stages
                    </p>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Jobs</p>
                    <p className="text-2xl font-bold">{workflowStats.totalJobs}</p>
                  </div>
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">With Workflows</p>
                    <p className="text-2xl font-bold">{workflowStats.jobsWithWorkflow}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Templates</p>
                    <p className="text-2xl font-bold">{workflowStats.totalTemplates}</p>
                  </div>
                  <Copy className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Coverage</p>
                    <p className="text-2xl font-bold">{workflowStats.workflowCoverage}%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="mt-4">
                  <Progress value={workflowStats.workflowCoverage} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Workflow Templates</h2>
            <Button onClick={() => setIsCreatingTemplate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </div>

          {templatesLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Loading templates...</span>
            </div>
          ) : templates.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Workflow className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Templates</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first workflow template
                </p>
                <Button onClick={() => setIsCreatingTemplate(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold">{template.name}</h4>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {template.category}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {template.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {template.description}
                      </p>
                    )}
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Stages:</span>
                        <span>{template.stageIds?.length || 0}</span>
                      </div>
                      
                      <div className="flex gap-1 flex-wrap">
                        {template.stageIds?.slice(0, 3).map((stageId, index) => {
                          const stage = stages.find(s => s.id === stageId);
                          if (!stage) return null;
                          return (
                            <Badge key={stageId} variant="outline" className="text-xs">
                              {stage.title}
                            </Badge>
                          );
                        })}
                        {(template.stageIds?.length || 0) > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{(template.stageIds?.length || 0) - 3}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => handleViewTemplate(template)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
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
            <h2 className="text-xl font-semibold">Job Workflows</h2>
            <Button onClick={() => setIsSettingUpWorkflow(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Setup Workflow
            </Button>
          </div>

          {loadedJobWorkflows.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Job Workflows</h3>
                <p className="text-muted-foreground mb-4">
                  Set up workflows for your job positions
                </p>
                <Button onClick={() => setIsSettingUpWorkflow(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Setup Workflow
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loadedJobWorkflows.map((jobWorkflow) => {
                const job = jobs.find((j) => j.id === jobWorkflow.jobId);
                const template = templates.find((t) => t.id === jobWorkflow.templateId);
                const workflowStages = jobWorkflow.stageIds ? 
                  jobWorkflow.stageIds.map((stageId: string) => stages.find(s => s.id === stageId)).filter(Boolean) : 
                  [];
                
                return (
                  <Card key={jobWorkflow.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{job?.title || "Unknown Job"}</h4>
                          {job?.department && (
                            <p className="text-sm text-muted-foreground">{job.department}</p>
                          )}
                          {template && (
                            <p className="text-xs text-muted-foreground">Template: {template.name}</p>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {workflowStages.length} stages
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex gap-1 flex-wrap">
                          {workflowStages.slice(0, 3).map((stage: any, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {stage?.title || 'Unknown Stage'}
                            </Badge>
                          ))}
                          {workflowStages.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{workflowStages.length - 3}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex gap-2 pt-2">
                          <Button variant="outline" size="sm" className="flex-1" asChild>
                            <Link to={`/dashboard/workflow?job=${jobWorkflow.jobId}`}>
                              <Eye className="h-3 w-3 mr-1" />
                              View Board
                            </Link>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleEditJobWorkflow(jobWorkflow)}
                          >
                            <Edit3 className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteJobWorkflow(jobWorkflow.jobId)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" />
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
              <h2 className="text-xl font-semibold">Stages</h2>
              <p className="text-sm text-muted-foreground">
                Manage global stages for workflow templates
              </p>
            </div>
            <Button onClick={() => setIsCreatingStage(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Stage
            </Button>
          </div>

          {stages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
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
                    bgColor = stage.color + '10'; // Very light background
                    textColor = stage.color;
                    cardClasses = 'relative p-3 rounded-lg border-2 hover:shadow-sm transition-all duration-200 bg-opacity-10';
                  } else {
                    // Existing format: CSS classes
                    cardClasses = `${stage.color || 'bg-gray-50 border-gray-200 text-gray-700'} relative p-3 rounded-lg border-2 hover:shadow-sm transition-all duration-200`;
                    // Extract border color from CSS classes for consistency
                    const borderColorMatch = stage.color?.match(/border-(\w+)-(\d+)/);
                    borderColor = borderColorMatch ? `var(--${borderColorMatch[1]}-${borderColorMatch[2]})` : '#e5e7eb';
                  }
                  
                  return (
                    <div
                      key={stage.id}
                      className={cardClasses}
                      style={isHexColor ? { 
                        borderLeftColor: borderColor,
                        borderLeftWidth: '4px',
                        backgroundColor: bgColor,
                        color: textColor
                      } : { 
                        borderLeftWidth: '4px'
                      }}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: isHexColor ? borderColor : undefined }}
                          />
                          <h4 className="font-medium text-xs truncate">{stage.title}</h4>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteStage(stage.id)}
                            className="h-5 w-5 p-0 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Description */}
                      {stage.description && (
                        <p className="text-xs opacity-70 mb-2 line-clamp-1">
                          {stage.description}
                        </p>
                      )}
                      
                      {/* Footer */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono opacity-60 text-xs">
                          {templateCount} {templateCount === 1 ? 'template' : 'templates'}
                        </span>
                        <span className="text-xs opacity-50" title={stage.color}>
                          {isHexColor ? 'color' : 'styled'}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Stages</h3>
                <p className="text-muted-foreground mb-4">
                  Create global stages for your workflow templates
                </p>
                <Button onClick={() => setIsCreatingStage(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Stage
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Template Creation Modal */}
      <Dialog open={isCreatingTemplate} onOpenChange={setIsCreatingTemplate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="pb-4">
            <DialogTitle>Create Workflow Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  placeholder="Engineering Workflow"
                  value={newTemplate.name}
                  onChange={(e) =>
                    setNewTemplate({ ...newTemplate, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-category">Category</Label>
                <Input
                  id="template-category"
                  placeholder="Engineering"
                  value={newTemplate.category}
                  onChange={(e) =>
                    setNewTemplate({ ...newTemplate, category: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-description">Description</Label>
              <Textarea
                id="template-description"
                placeholder="Describe this workflow template..."
                value={newTemplate.description}
                onChange={(e) =>
                  setNewTemplate({ ...newTemplate, description: e.target.value })
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
                      id={`stage-${stage.id}`}
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
                      className="rounded border-gray-300"
                    />
                    <label
                      htmlFor={`stage-${stage.id}`}
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
                onClick={() => setIsCreatingTemplate(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateTemplate}
                disabled={!newTemplate.name.trim() || newTemplate.stages.length === 0}
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
          <DialogHeader className="pb-4">
            <DialogTitle>Setup Job Workflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="job-select">Select Job</Label>
              <Select value={selectedJob} onValueChange={setSelectedJob}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a job position" />
                </SelectTrigger>
                <SelectContent>
                  {jobs && jobs.length > 0 ? (
                    jobs
                      .filter((job) => !jobWorkflows[job.id])
                      .map((job) => (
                        <SelectItem key={job.id} value={job.id}>
                          <div className="flex flex-col items-start">
                            <div className="font-medium">{job.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {job.department}
                            </div>
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

            <div className="space-y-2">
              <Label htmlFor="template-select">Select Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a workflow template" />
                </SelectTrigger>
                <SelectContent>
                  {templates && templates.length > 0 ? (
                    templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex flex-col items-start">
                          <div className="font-medium">{template.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {template.stageIds?.length || 0} stages
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

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setIsSettingUpWorkflow(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSetupJobWorkflow}
                disabled={!selectedJob || !selectedTemplate}
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
          <DialogHeader className="pb-4">
            <DialogTitle>Create New Stage</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="stage-title">Stage Title</Label>
              <Input
                id="stage-title"
                placeholder="Application Review"
                value={newStage.title}
                onChange={(e) =>
                  setNewStage({ ...newStage, title: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stage-description">Description</Label>
              <Textarea
                id="stage-description"
                placeholder="Describe this stage..."
                value={newStage.description}
                onChange={(e) =>
                  setNewStage({ ...newStage, description: e.target.value })
                }
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stage-color">Color</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="stage-color"
                  type="color"
                  value={newStage.color}
                  onChange={(e) =>
                    setNewStage({ ...newStage, color: e.target.value })
                  }
                  className="w-16 h-10 p-1 border rounded"
                />
                <Input
                  value={newStage.color}
                  onChange={(e) =>
                    setNewStage({ ...newStage, color: e.target.value })
                  }
                  placeholder="#3b82f6"
                  className="flex-1 text-sm font-mono"
                />
              </div>
              <div 
                className="p-3 rounded border text-center text-sm"
                style={{ 
                  backgroundColor: newStage.color + '20', // 20% opacity
                  borderColor: newStage.color,
                  color: newStage.color
                }}
              >
                Preview: {newStage.title || "Stage Name"}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsCreatingStage(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateStage}
                disabled={!newStage.title.trim()}
              >
                Create Stage
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template View Modal */}
      <Dialog open={!!viewingTemplate} onOpenChange={() => setViewingTemplate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="pb-4">
            <DialogTitle>View Template: {viewingTemplate?.name}</DialogTitle>
          </DialogHeader>
          {viewingTemplate && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Template Name</Label>
                  <p className="text-sm mt-1 p-2 bg-gray-50 rounded">{viewingTemplate.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Category</Label>
                  <p className="text-sm mt-1 p-2 bg-gray-50 rounded">{viewingTemplate.category || 'General'}</p>
                </div>
              </div>
              
              {viewingTemplate.description && (
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm mt-1 p-2 bg-gray-50 rounded">{viewingTemplate.description}</p>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader className="pb-4">
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          {editingTemplate && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-template-name">Template Name</Label>
                  <Input
                    id="edit-template-name"
                    placeholder="Engineering Workflow"
                    value={editingTemplate.name}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-template-category">Category</Label>
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
