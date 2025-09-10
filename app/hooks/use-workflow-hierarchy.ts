// app/hooks/use-workflow-hierarchy.ts
import { useState, useEffect, useCallback } from 'react';
import { workflowHierarchyService } from '~/services/workflowHierarchyService';
import type { 
  ClientJobWorkflow, 
  CreateWorkflowRequest, 
  UpdateWorkflowRequest 
} from '~/types/workflow';
import { toast } from 'sonner';

export interface UseWorkflowHierarchyReturn {
  // Data
  clientWorkflows: ClientJobWorkflow[];
  selectedWorkflow: ClientJobWorkflow | null;
  loading: boolean;
  error: string | null;

  // Actions
  loadClientWorkflows: (clientId: string) => Promise<void>;
  loadJobWorkflow: (jobId: string) => Promise<void>;
  createWorkflow: (request: CreateWorkflowRequest) => Promise<string>;
  updateWorkflow: (request: UpdateWorkflowRequest) => Promise<void>;
  deleteWorkflow: (workflowId: string) => Promise<void>;
  clearError: () => void;
  setSelectedWorkflow: (workflow: ClientJobWorkflow | null) => void;

  // Real-time subscriptions
  subscribeToClient: (clientId: string) => void;
  subscribeToJob: (jobId: string) => void;
  unsubscribeAll: () => void;
}

export function useWorkflowHierarchy(): UseWorkflowHierarchyReturn {
  const [clientWorkflows, setClientWorkflows] = useState<ClientJobWorkflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<ClientJobWorkflow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all workflows for a client
  const loadClientWorkflows = useCallback(async (clientId: string) => {
    if (!clientId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const workflows = await workflowHierarchyService.getClientWorkflows(clientId);
      setClientWorkflows(workflows);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load client workflows';
      setError(message);
      toast.error(message);
      setClientWorkflows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load specific job workflow
  const loadJobWorkflow = useCallback(async (jobId: string) => {
    if (!jobId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // This will be handled by the subscription
      const workflow = await workflowHierarchyService.getJobWorkflow(jobId);
      if (!workflow) {
        setSelectedWorkflow(null);
        return;
      }

      // Get full workflow details
      const stages = await workflowHierarchyService.getWorkflowStages(workflow.stageIds);
      
      // Create ClientJobWorkflow object (simplified version)
      const clientJobWorkflow: ClientJobWorkflow = {
        client: {
          id: workflow.clientId,
          name: workflow.clientName || 'Unknown Client',
          companyName: 'Unknown Company' // Would need to fetch from client doc
        },
        job: {
          id: workflow.jobId,
          title: workflow.jobTitle,
          status: 'active' // Would need to fetch from job doc
        },
        workflow,
        stages
      };
      
      setSelectedWorkflow(clientJobWorkflow);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load job workflow';
      setError(message);
      toast.error(message);
      setSelectedWorkflow(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create new workflow
  const createWorkflow = useCallback(async (request: CreateWorkflowRequest) => {
    setLoading(true);
    setError(null);
    
    try {
      const workflowId = await workflowHierarchyService.createJobWorkflow(request);
      toast.success('Workflow created successfully');
      
      // Reload client workflows to include the new one
      await loadClientWorkflows(request.clientId);
      
      return workflowId;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create workflow';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadClientWorkflows]);

  // Update workflow
  const updateWorkflow = useCallback(async (request: UpdateWorkflowRequest) => {
    setLoading(true);
    setError(null);
    
    try {
      await workflowHierarchyService.updateJobWorkflow(request);
      toast.success('Workflow updated successfully');
      
      // Update local state if this is the selected workflow
      if (selectedWorkflow?.workflow.id === request.id) {
        setSelectedWorkflow(prev => {
          if (!prev) return null;
          return {
            ...prev,
            workflow: {
              ...prev.workflow,
              stageIds: request.stageIds || prev.workflow.stageIds,
              isActive: request.isActive !== undefined ? request.isActive : prev.workflow.isActive,
              updatedAt: new Date().toISOString()
            }
          };
        });
      }
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update workflow';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [selectedWorkflow]);

  // Delete workflow
  const deleteWorkflow = useCallback(async (workflowId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await workflowHierarchyService.deleteJobWorkflow(workflowId);
      toast.success('Workflow deleted successfully');
      
      // Remove from local state
      setClientWorkflows(prev => 
        prev.filter(w => w.workflow.id !== workflowId)
      );
      
      // Clear selected if it was deleted
      if (selectedWorkflow?.workflow.id === workflowId) {
        setSelectedWorkflow(null);
      }
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete workflow';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [selectedWorkflow]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Subscribe to real-time updates for a client
  const subscribeToClient = useCallback((clientId: string) => {
    return workflowHierarchyService.subscribeToClientWorkflows(
      clientId,
      (workflows) => {
        setClientWorkflows(workflows);
        setLoading(false);
      }
    );
  }, []);

  // Subscribe to real-time updates for a job
  const subscribeToJob = useCallback((jobId: string) => {
    return workflowHierarchyService.subscribeToJobWorkflow(
      jobId,
      (workflow) => {
        setSelectedWorkflow(workflow);
        setLoading(false);
      }
    );
  }, []);

  // Unsubscribe from all real-time updates
  const unsubscribeAll = useCallback(() => {
    workflowHierarchyService.unsubscribeAll();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribeAll();
    };
  }, [unsubscribeAll]);

  return {
    // Data
    clientWorkflows,
    selectedWorkflow,
    loading,
    error,
    
    // Actions
    loadClientWorkflows,
    loadJobWorkflow,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    clearError,
    setSelectedWorkflow,
    
    // Real-time subscriptions
    subscribeToClient,
    subscribeToJob,
    unsubscribeAll,
  };
}
