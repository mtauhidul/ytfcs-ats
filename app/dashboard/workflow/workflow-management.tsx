// app/dashboard/workflow/workflow-management.tsx

"use client";

import {
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
} from "firebase/firestore";
import {
  BriefcaseIcon,
  LayersIcon,
  BookTemplateIcon,
  PlusIcon,
  SearchIcon,
  Settings,
  BookOpenIcon,
  Zap,
  Copy,
  Edit,
  Trash2,
  CheckCircle,
  Users,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { db } from "~/lib/firebase";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import { Checkbox } from "~/components/ui/checkbox";

interface Stage {
  id: string;
  title: string;
  color: string;
  order: number;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  stages: {
    stageId: string;
    order: number;
    customTitle?: string;
    customColor?: string;
  }[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Job {
  id: string;
  title: string;
  department: string;
  status: string;
  hasWorkflow?: boolean;
}

interface JobWorkflow {
  id: string;
  jobId: string;
  templateId?: string;
  stages: {
    id: string;
    stageId: string;
    title: string;
    color: string;
    order: number;
    candidateCount?: number;
  }[];
  createdAt: string;
}

export default function WorkflowManagementPage() {
  // Data states
  const [stages, setStages] = useState<Stage[]>([]);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobWorkflows, setJobWorkflows] = useState<{ [jobId: string]: JobWorkflow }>({});
  
  // UI states
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  
  // Dialog states
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [showCreateWorkflow, setShowCreateWorkflow] = useState(false);
  const [selectedJob, setSelectedJob] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  
  // Form states
  const [templateForm, setTemplateForm] = useState({
    name: "",
    description: "",
    category: "",
    selectedStages: [] as string[],
  });

  // Fetch global stages
  useEffect(() => {
    const q = query(collection(db, "stages"), orderBy("order", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const stagesList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Stage[];
      setStages(stagesList);
    });
    return () => unsubscribe();
  }, []);

  // Fetch workflow templates
  useEffect(() => {
    const q = query(collection(db, "workflowTemplates"), orderBy("name", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const templatesList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as WorkflowTemplate[];
      setTemplates(templatesList);
    });
    return () => unsubscribe();
  }, []);

  // Fetch jobs
  useEffect(() => {
    const q = query(collection(db, "jobs"), orderBy("title", "asc"));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const jobsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        title: doc.data().title,
        department: doc.data().department || "",
        status: doc.data().status || "Draft",
      })) as Job[];

      // Check which jobs have workflows
      const workflowsQuery = query(collection(db, "jobWorkflowStages"));
      const workflowsSnapshot = await getDocs(workflowsQuery);
      const jobsWithWorkflows = new Set(
        workflowsSnapshot.docs.map(doc => doc.data().jobId)
      );

      const jobsWithWorkflowFlag = jobsList.map(job => ({
        ...job,
        hasWorkflow: jobsWithWorkflows.has(job.id),
      }));

      setJobs(jobsWithWorkflowFlag);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch job workflows for jobs that have them
  useEffect(() => {
    const jobsWithWorkflows = jobs.filter(job => job.hasWorkflow);
    
    if (jobsWithWorkflows.length === 0) return;

    const unsubscribes = jobsWithWorkflows.map(job => {
      const q = query(
        collection(db, "jobWorkflowStages"),
        where("jobId", "==", job.id),
        orderBy("order", "asc")
      );
      
      return onSnapshot(q, (snapshot) => {
        const workflowStages = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            stageId: data.stageId || "",
            title: data.title || "",
            color: data.color || "",
            order: data.order || 0,
            candidateCount: data.candidateCount,
          };
        });

        if (workflowStages.length > 0) {
          setJobWorkflows(prev => ({
            ...prev,
            [job.id]: {
              id: `workflow-${job.id}`,
              jobId: job.id,
              stages: workflowStages,
              createdAt: (workflowStages[0] as any)?.createdAt || new Date().toISOString(),
            },
          }));
        }
      });
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [jobs]);

  // Manual data initialization (removed auto-seeding)
  const handleInitializeData = async () => {
    setInitializing(true);
    try {
      // Manual initialization only - no auto-population
      toast.success("Manual initialization - please create stages manually");
    } catch (error) {
      console.error("Error initializing data:", error);
      toast.error("Failed to initialize workflow data");
    } finally {
      setInitializing(false);
    }
  };

  // Create workflow template
  const handleCreateTemplate = async () => {
    if (!templateForm.name.trim() || templateForm.selectedStages.length === 0) {
      toast.error("Please provide a name and select at least one stage");
      return;
    }

    try {
      const templateData = {
        name: templateForm.name,
        description: templateForm.description,
        category: templateForm.category || "General",
        stages: templateForm.selectedStages.map((stageId, index) => ({
          stageId,
          order: index + 1,
        })),
        isDefault: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await addDoc(collection(db, "workflowTemplates"), templateData);
      toast.success("Template created successfully");
      
      // Reset form
      setTemplateForm({
        name: "",
        description: "",
        category: "",
        selectedStages: [],
      });
      setShowCreateTemplate(false);
    } catch (error) {
      console.error("Error creating template:", error);
      toast.error("Failed to create template");
    }
  };

  // Create workflow from template
  const handleCreateWorkflowFromTemplate = async () => {
    if (!selectedJob || !selectedTemplate) {
      toast.error("Please select a job and template");
      return;
    }

    try {
      const template = templates.find(t => t.id === selectedTemplate);
      if (!template) {
        toast.error("Template not found");
        return;
      }

      // Create workflow stages
      const stagePromises = template.stages.map(async (templateStage, index) => {
        const globalStage = stages.find(s => s.id === templateStage.stageId);
        if (!globalStage) return null;

        const stageData = {
          stageId: templateStage.stageId,
          jobId: selectedJob,
          title: templateStage.customTitle || globalStage.title,
          color: templateStage.customColor || globalStage.color,
          order: templateStage.order,
          isActive: true,
          createdAt: new Date().toISOString(),
        };

        return addDoc(collection(db, "jobWorkflowStages"), stageData);
      });

      await Promise.all(stagePromises.filter(Boolean));
      toast.success("Workflow created successfully");
      
      // Reset form
      setSelectedJob("");
      setSelectedTemplate("");
      setShowCreateWorkflow(false);
    } catch (error) {
      console.error("Error creating workflow:", error);
      toast.error("Failed to create workflow");
    }
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredJobs = jobs.filter(job =>
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const jobsWithoutWorkflow = jobs.filter(job => !job.hasWorkflow);
  const jobsWithWorkflow = jobs.filter(job => job.hasWorkflow);

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workflow Management</h1>
          <p className="text-muted-foreground">
            Manage global stages, workflow templates, and job-specific workflows
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {(stages.length === 0 || templates.length === 0) && (
            <Button onClick={handleInitializeData} disabled={initializing}>
              {initializing ? "Initializing..." : "Initialize Default Data"}
            </Button>
          )}
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="workflows">Job Workflows</TabsTrigger>
          <TabsTrigger value="stages">Global Stages</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
                <BriefcaseIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{jobs.length}</div>
                <p className="text-xs text-muted-foreground">
                  {jobsWithWorkflow.length} with workflows
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Templates</CardTitle>
                <BookTemplateIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{templates.length}</div>
                <p className="text-xs text-muted-foreground">
                  {templates.filter(t => t.isDefault).length} default templates
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Global Stages</CardTitle>
                <LayersIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stages.length}</div>
                <p className="text-xs text-muted-foreground">Reusable building blocks</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Object.keys(jobWorkflows).length}</div>
                <p className="text-xs text-muted-foreground">Currently running</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Jobs Without Workflows</CardTitle>
                <CardDescription>
                  {jobsWithoutWorkflow.length} jobs need workflow setup
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {jobsWithoutWorkflow.slice(0, 5).map((job) => (
                    <div key={job.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <p className="font-medium">{job.title}</p>
                        <p className="text-sm text-muted-foreground">{job.department}</p>
                      </div>
                      <Dialog open={showCreateWorkflow} onOpenChange={setShowCreateWorkflow}>
                        <DialogTrigger asChild>
                          <Button 
                            size="sm" 
                            onClick={() => setSelectedJob(job.id)}
                          >
                            Setup
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Create Workflow</DialogTitle>
                            <DialogDescription>
                              Create a workflow for {job.title}
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="template-select">Choose Template</Label>
                              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a template" />
                                </SelectTrigger>
                                <SelectContent>
                                  {templates.map((template) => (
                                    <SelectItem key={template.id} value={template.id}>
                                      {template.name} ({template.stages.length} stages)
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setShowCreateWorkflow(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleCreateWorkflowFromTemplate}>
                              Create Workflow
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  ))}
                  
                  {jobsWithoutWorkflow.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center pt-2">
                      And {jobsWithoutWorkflow.length - 5} more...
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Workflow Activity</CardTitle>
                <CardDescription>Latest workflow changes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.values(jobWorkflows)
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, 5)
                    .map((workflow) => {
                      const job = jobs.find(j => j.id === workflow.jobId);
                      return (
                        <div key={workflow.id} className="flex items-center gap-3">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <div className="flex-1">
                            <p className="font-medium">{job?.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {workflow.stages.length} stages configured
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            
            <Dialog open={showCreateTemplate} onOpenChange={setShowCreateTemplate}>
              <DialogTrigger asChild>
                <Button>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Workflow Template</DialogTitle>
                  <DialogDescription>
                    Create a reusable workflow template from global stages
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="template-name">Template Name</Label>
                    <Input
                      id="template-name"
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Senior Developer Process"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="template-description">Description</Label>
                    <Textarea
                      id="template-description"
                      value={templateForm.description}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe when to use this template..."
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="template-category">Category</Label>
                    <Input
                      id="template-category"
                      value={templateForm.category}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, category: e.target.value }))}
                      placeholder="e.g., Engineering, Sales"
                    />
                  </div>
                  
                  <div>
                    <Label>Select Stages</Label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {stages.map((stage) => (
                        <div key={stage.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={stage.id}
                            checked={templateForm.selectedStages.includes(stage.id)}
                            onCheckedChange={(checked) => {
                              setTemplateForm(prev => ({
                                ...prev,
                                selectedStages: checked
                                  ? [...prev.selectedStages, stage.id]
                                  : prev.selectedStages.filter(id => id !== stage.id)
                              }));
                            }}
                          />
                          <label htmlFor={stage.id} className="text-sm">
                            {stage.title}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateTemplate(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateTemplate}>
                    Create Template
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    {template.isDefault && (
                      <Badge variant="secondary">Default</Badge>
                    )}
                  </div>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{template.category}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {template.stages.length} stages
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {template.stages.slice(0, 3).map((templateStage) => {
                        const stage = stages.find(s => s.id === templateStage.stageId);
                        return stage ? (
                          <Badge key={stage.id} variant="outline" className="text-xs">
                            {stage.title}
                          </Badge>
                        ) : null;
                      })}
                      {template.stages.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{template.stages.length - 3} more
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Copy className="h-3 w-3 mr-1" />
                        Duplicate
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>

          <div className="grid gap-4">
            {filteredJobs.map((job) => {
              const workflow = jobWorkflows[job.id];
              return (
                <Card key={job.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{job.title}</CardTitle>
                        <CardDescription>{job.department}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {workflow ? (
                          <Badge variant="default">Active Workflow</Badge>
                        ) : (
                          <Badge variant="secondary">No Workflow</Badge>
                        )}
                        <Button size="sm">
                          {workflow ? "Edit" : "Setup"}
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {workflow && (
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {workflow.stages.map((stage) => (
                          <Badge key={stage.id} variant="outline">
                            {stage.title}
                            {stage.candidateCount !== undefined && (
                              <span className="ml-1">({stage.candidateCount})</span>
                            )}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="stages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Global Stages</CardTitle>
              <CardDescription>
                Reusable building blocks for creating workflow templates and job-specific workflows.
                <br />
                <Button variant="link" className="p-0 h-auto text-sm">
                  Manage stages in the Stages section →
                </Button>
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid gap-1.5 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                {stages.map((stage) => (
                  <div
                    key={stage.id}
                    className="flex items-center gap-2 px-2.5 py-1.5 border rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: stage.color }}
                    />
                    <span className="font-medium text-sm truncate flex-1">{stage.title}</span>
                    <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 min-w-[24px] flex-shrink-0">
                      {stage.order}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
