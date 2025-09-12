import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  MoreHorizontal,
  Briefcase,
  Target,
  Activity,
  Layers,
  Eye,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

// Redux actions
import { 
  fetchJobWorkflow,
  fetchWorkflowTemplates,
  createWorkflowTemplate,
  deleteWorkflowTemplate,
  deleteJobWorkflow
} from '../../features/workflowSlice';
import { fetchJobs } from '../../features/jobsSlice';
import { setStages } from '../../features/stagesSlice';

// Firebase imports for real-time data
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function MinimalWorkflowManagement() {
  const dispatch = useDispatch<AppDispatch>();
  const workflowState = useSelector((state: RootState) => state.workflow);
  const { jobs, loading: jobsLoading, error: jobsError } = useSelector((state: RootState) => state.jobs);
  const { stages, loading: stagesLoading, error: stagesError } = useSelector((state: RootState) => state.stages);

  // Local state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJob, setSelectedJob] = useState<string>('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    stageIds: [] as string[]
  });

  // Load data on mount
  useEffect(() => {
    // Load workflow templates
    dispatch(fetchWorkflowTemplates());
    
    // Load jobs
    dispatch(fetchJobs());
    
    // Set up real-time listener for stages
    const stagesQuery = query(collection(db, 'stages'), orderBy('order', 'asc'));
    const unsubscribeStages = onSnapshot(stagesQuery, (snapshot) => {
      const stagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      dispatch(setStages(stagesData as any[]));
    });

    return () => {
      unsubscribeStages();
    };
  }, [dispatch]);

  // Filtered data
  const filteredTemplates = workflowState.templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get workflow for selected job
  const selectedJobWorkflow = selectedJob ? 
    workflowState.jobWorkflows[selectedJob] : null;

  // Stats
  const stats = {
    totalTemplates: workflowState.templates.length,
    totalJobWorkflows: Object.keys(workflowState.jobWorkflows).length,
    totalJobs: jobs.length,
    totalStages: stages.length
  };

  // Handlers
  const handleCreateTemplate = async () => {
    if (!newTemplate.name) return;

    try {
      await dispatch(createWorkflowTemplate({
        name: newTemplate.name,
        description: newTemplate.description,
        stageIds: newTemplate.stageIds,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })).unwrap();
      
      setNewTemplate({ name: '', description: '', stageIds: [] });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating template:', error);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await dispatch(deleteWorkflowTemplate(templateId)).unwrap();
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const handleViewJobWorkflow = async (jobId: string) => {
    try {
      setSelectedJob(jobId);
      setActiveTab('workflows');
      await dispatch(fetchJobWorkflow(jobId)).unwrap();
    } catch (error) {
      console.error('Error fetching job workflow:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Error Messages */}
      {jobsError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Error loading jobs: {jobsError}</AlertDescription>
        </Alert>
      )}
      {stagesError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Error loading stages: {stagesError}</AlertDescription>
        </Alert>
      )}
      {workflowState.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Error loading workflows: {workflowState.error}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Workflow Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage workflows and templates for your recruitment process
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Templates</p>
                <p className="text-2xl font-bold">{stats.totalTemplates}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium">Job Workflows</p>
                <p className="text-2xl font-bold">{stats.totalJobWorkflows}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Briefcase className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Jobs</p>
                <p className="text-2xl font-bold">{stats.totalJobs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Layers className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Stages</p>
                <p className="text-2xl font-bold">{stats.totalStages}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="workflows">Job Workflows</TabsTrigger>
          <TabsTrigger value="stages">Stages</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Templates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Recent Templates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {workflowState.templates.slice(0, 5).map((template) => (
                    <div key={template.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium">{template.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {template.stageIds.length} stages
                        </p>
                      </div>
                      <Badge variant="outline">Template</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Jobs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Briefcase className="h-5 w-5 mr-2" />
                  Jobs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {jobsLoading ? (
                    <div className="text-center py-4">Loading jobs...</div>
                  ) : jobs.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">No jobs available</div>
                  ) : (
                    jobs.slice(0, 5).map((job) => (
                      <div key={job.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <p className="font-medium">{job.title}</p>
                          <p className="text-sm text-muted-foreground">{job.department}</p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewJobWorkflow(job.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Templates Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Stages</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <p className="font-medium">{template.name}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{template.stageIds.length} stages</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Job Workflows Tab */}
        <TabsContent value="workflows" className="space-y-4">
          <div className="flex gap-4">
            <Select value={selectedJob} onValueChange={setSelectedJob}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder={jobsLoading ? "Loading jobs..." : "Select a job"} />
              </SelectTrigger>
              <SelectContent>
                {jobsLoading ? (
                  <SelectItem value="" disabled>Loading jobs...</SelectItem>
                ) : jobs.length === 0 ? (
                  <SelectItem value="" disabled>No jobs available</SelectItem>
                ) : (
                  jobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.title}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedJob && (
              <Button 
                variant="outline"
                onClick={() => handleViewJobWorkflow(selectedJob)}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            )}
          </div>

          {selectedJob && workflowState.loading && (
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-muted-foreground">
                  Loading workflow...
                </div>
              </CardContent>
            </Card>
          )}

          {selectedJob && !workflowState.loading && !selectedJobWorkflow && (
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-muted-foreground">
                  No workflow found for this job. Create a workflow first.
                </div>
              </CardContent>
            </Card>
          )}

          {selectedJobWorkflow && !workflowState.loading && (
            <Card>
              <CardHeader>
                <CardTitle>Workflow for {jobs.find(j => j.id === selectedJob)?.title}</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedJobWorkflow.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No stages in this workflow
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedJobWorkflow.map((stage, index) => (
                      <div key={stage.id} className="flex items-center space-x-3 p-3 rounded-lg border">
                        <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{stage.title}</p>
                          <p className="text-sm text-muted-foreground">{stage.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Stages Tab */}
        <TabsContent value="stages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available Stages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stagesLoading ? (
                  <div className="text-center py-4">Loading stages...</div>
                ) : stages.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">No stages available</div>
                ) : (
                  stages.map((stage) => (
                    <div key={stage.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: stage.color }}
                        />
                        <div>
                          <p className="font-medium">{stage.title}</p>
                          <p className="text-sm text-muted-foreground">{stage.description}</p>
                        </div>
                      </div>
                      <Badge variant="outline">Order: {stage.order}</Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Template Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Template</DialogTitle>
            <DialogDescription>
              Create a new workflow template that can be used for multiple jobs.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="template-name">Name</Label>
              <Input
                id="template-name"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                placeholder="Enter template name"
              />
            </div>
            <div>
              <Label htmlFor="template-description">Description</Label>
              <Input
                id="template-description"
                value={newTemplate.description}
                onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                placeholder="Enter template description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTemplate}>
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
