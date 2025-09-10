// app/components/workflow/workflow-hierarchy-view.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Label } from '~/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '~/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '~/components/ui/collapsible';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { useWorkflowHierarchy } from '~/hooks/use-workflow-hierarchy';
import { 
  Building2, 
  Briefcase, 
  GitBranch, 
  ChevronDown, 
  ChevronRight,
  Plus,
  Settings,
  Users,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import type { Client } from '~/types/client';
import type { Job } from '~/types/job';
import type { CreateWorkflowRequest } from '~/types/workflow';

interface WorkflowHierarchyViewProps {
  clients: Client[];
  jobs: Job[];
  selectedClientId?: string;
  onClientSelect?: (clientId: string) => void;
}

export function WorkflowHierarchyView({ 
  clients, 
  jobs, 
  selectedClientId,
  onClientSelect 
}: WorkflowHierarchyViewProps) {
  const {
    clientWorkflows,
    loading,
    error,
    loadClientWorkflows,
    createWorkflow,
    subscribeToClient,
    unsubscribeAll,
    clearError
  } = useWorkflowHierarchy();

  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedJobForWorkflow, setSelectedJobForWorkflow] = useState<string>('');

  // Load workflows when client is selected
  useEffect(() => {
    if (selectedClientId) {
      loadClientWorkflows(selectedClientId);
      const unsubscribe = subscribeToClient(selectedClientId);
      return unsubscribe;
    }
  }, [selectedClientId, loadClientWorkflows, subscribeToClient]);

  // Cleanup subscriptions
  useEffect(() => {
    return () => unsubscribeAll();
  }, [unsubscribeAll]);

  // Group workflows by client and job
  const workflowsByClient = clientWorkflows.reduce((acc, workflow) => {
    const clientId = workflow.client.id;
    if (!acc[clientId]) {
      acc[clientId] = {
        client: workflow.client,
        jobWorkflows: []
      };
    }
    acc[clientId].jobWorkflows.push(workflow);
    return acc;
  }, {} as Record<string, { client: any; jobWorkflows: any[] }>);

  const toggleClientExpansion = (clientId: string) => {
    const newExpanded = new Set(expandedClients);
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId);
    } else {
      newExpanded.add(clientId);
    }
    setExpandedClients(newExpanded);
  };

  const toggleJobExpansion = (jobId: string) => {
    const newExpanded = new Set(expandedJobs);
    if (newExpanded.has(jobId)) {
      newExpanded.delete(jobId);
    } else {
      newExpanded.add(jobId);
    }
    setExpandedJobs(newExpanded);
  };

  const handleCreateWorkflow = async (jobId: string, clientId: string) => {
    try {
      const request: CreateWorkflowRequest = {
        jobId,
        clientId,
        stageIds: [],
        templateId: undefined
      };
      
      await createWorkflow(request);
      setShowCreateDialog(false);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const getWorkflowStatusColor = (workflow: any) => {
    if (!workflow.isActive) return 'bg-gray-100 text-gray-600';
    return 'bg-green-100 text-green-700';
  };

  const getWorkflowStatusIcon = (workflow: any) => {
    if (!workflow.isActive) return <Clock className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  if (loading && clientWorkflows.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workflow hierarchy...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Workflow Hierarchy</h2>
          <p className="text-gray-600 mt-1">
            Manage workflows organized by clients and jobs
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Workflow
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Workflow</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="job-select">Select Job</Label>
                <Select value={selectedJobForWorkflow} onValueChange={setSelectedJobForWorkflow}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a job" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobs.map(job => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title} - {job.clientName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    if (selectedJobForWorkflow) {
                      const job = jobs.find(j => j.id === selectedJobForWorkflow);
                      if (job) {
                        handleCreateWorkflow(job.id, job.clientId);
                      }
                    }
                  }}
                  disabled={!selectedJobForWorkflow}
                >
                  Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            {error}
            <Button 
              variant="link" 
              onClick={clearError}
              className="text-red-600 p-0 ml-2 h-auto"
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Client Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building2 className="w-5 h-5 mr-2" />
            Select Client
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedClientId} onValueChange={onClientSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a client to view workflows" />
            </SelectTrigger>
            <SelectContent>
              {clients.map(client => (
                <SelectItem key={client.id} value={client.id}>
                  {client.companyName} - {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Hierarchy View */}
      {selectedClientId && (
        <div className="space-y-4">
          {Object.values(workflowsByClient).map(({ client, jobWorkflows }) => (
            <Card key={client.id} className="border-l-4 border-l-blue-500">
              <Collapsible 
                open={expandedClients.has(client.id)} 
                onOpenChange={() => toggleClientExpansion(client.id)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {expandedClients.has(client.id) ? 
                          <ChevronDown className="w-5 h-5 text-gray-400" /> : 
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        }
                        <Building2 className="w-6 h-6 text-blue-600" />
                        <div>
                          <h3 className="font-semibold text-lg">{client.companyName}</h3>
                          <p className="text-gray-600">{client.name}</p>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {jobWorkflows.length} workflow{jobWorkflows.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-3 ml-8">
                      {jobWorkflows.map(({ job, workflow, stages }) => (
                        <Card key={job.id} className="border-l-4 border-l-green-500">
                          <Collapsible 
                            open={expandedJobs.has(job.id)} 
                            onOpenChange={() => toggleJobExpansion(job.id)}
                          >
                            <CollapsibleTrigger asChild>
                              <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors py-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    {expandedJobs.has(job.id) ? 
                                      <ChevronDown className="w-4 h-4 text-gray-400" /> : 
                                      <ChevronRight className="w-4 h-4 text-gray-400" />
                                    }
                                    <Briefcase className="w-5 h-5 text-green-600" />
                                    <div>
                                      <h4 className="font-medium">{job.title}</h4>
                                      <p className="text-sm text-gray-500">Job ID: {job.id}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Badge className={getWorkflowStatusColor(workflow)}>
                                      {getWorkflowStatusIcon(workflow)}
                                      {workflow.isActive ? 'Active' : 'Inactive'}
                                    </Badge>
                                  </div>
                                </div>
                              </CardHeader>
                            </CollapsibleTrigger>
                            
                            <CollapsibleContent>
                              <CardContent className="pt-0">
                                <div className="ml-8 space-y-3">
                                  {/* Workflow Details */}
                                  <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg border-l-4 border-l-purple-500">
                                    <GitBranch className="w-5 h-5 text-purple-600" />
                                    <div className="flex-1">
                                      <h5 className="font-medium text-purple-900">
                                        Workflow: {workflow.jobTitle}
                                      </h5>
                                      <p className="text-sm text-purple-700">
                                        {stages.length} stage{stages.length !== 1 ? 's' : ''}
                                      </p>
                                      <p className="text-xs text-purple-600">
                                        Created: {new Date(workflow.createdAt).toLocaleDateString()}
                                      </p>
                                    </div>
                                    <div className="flex space-x-2">
                                      <Button size="sm" variant="outline">
                                        <Settings className="w-4 h-4 mr-1" />
                                        Configure
                                      </Button>
                                      <Button size="sm" variant="outline">
                                        <Users className="w-4 h-4 mr-1" />
                                        Assign
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Stages */}
                                  {stages.length > 0 && (
                                    <div className="ml-6">
                                      <h6 className="text-sm font-medium text-gray-700 mb-2">Workflow Stages:</h6>
                                      <div className="space-y-2">
                                        {stages.map((stage: any, index: number) => (
                                          <div 
                                            key={stage.id} 
                                            className="flex items-center space-x-2 p-2 bg-gray-50 rounded border-l-2 border-l-gray-300"
                                          >
                                            <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                                              {index + 1}
                                            </span>
                                            <span className="text-sm">{stage.name}</span>
                                            <Badge variant="outline" className="text-xs">
                                              {stage.type}
                                            </Badge>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </CollapsibleContent>
                          </Collapsible>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}

          {/* Empty State */}
          {Object.keys(workflowsByClient).length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <GitBranch className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No workflows found
                </h3>
                <p className="text-gray-600 mb-4">
                  This client doesn't have any workflows yet. Create one to get started.
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Workflow
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
