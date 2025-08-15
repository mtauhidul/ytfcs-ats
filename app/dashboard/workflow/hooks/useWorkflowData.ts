// app/dashboard/workflow/hooks/useWorkflowData.ts

import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '~/store';
import { 
  fetchJobWorkflow, 
  fetchWorkflowTemplates,
  clearJobWorkflow,
  clearError 
} from '~/features/workflowSlice';
import { workflowRealtimeService } from '~/services/workflowRealtimeService';

interface UseWorkflowDataProps {
  jobId?: string;
  enableRealtime?: boolean;
  autoRefresh?: boolean;
}

export const useWorkflowData = ({ 
  jobId, 
  enableRealtime = true, 
  autoRefresh = true 
}: UseWorkflowDataProps = {}) => {
  const dispatch = useDispatch<AppDispatch>();
  
  const workflowState = useSelector((state: RootState) => state.workflow);
  
  const {
    jobWorkflows,
    templates,
    loading,
    templatesLoading,
    error,
    lastFetched,
    isInitialized
  } = workflowState;

  // Get workflow for specific job
  const currentWorkflow = jobId ? jobWorkflows[jobId] || [] : [];
  
  // Initialize service and load templates
  const initialize = useCallback(async () => {
    try {
      if (!isInitialized) {
        await workflowRealtimeService.initialize();
        dispatch(fetchWorkflowTemplates());
      }
    } catch (error) {
      console.error('Failed to initialize workflow data:', error);
    }
  }, [dispatch, isInitialized]);

  // Load workflow for specific job
  const loadJobWorkflow = useCallback(async (targetJobId: string, forceRefresh = false) => {
    const lastFetch = lastFetched[targetJobId];
    const cacheValid = lastFetch && (Date.now() - lastFetch) < 5 * 60 * 1000; // 5 minutes cache
    
    if (!cacheValid || forceRefresh) {
      dispatch(fetchJobWorkflow(targetJobId));
    }
  }, [dispatch, lastFetched]);

  // Refresh all templates
  const refreshTemplates = useCallback(() => {
    dispatch(fetchWorkflowTemplates());
  }, [dispatch]);

  // Clear workflow data for a job
  const clearWorkflow = useCallback((targetJobId: string) => {
    dispatch(clearJobWorkflow(targetJobId));
  }, [dispatch]);

  // Clear any errors
  const clearWorkflowError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  // Setup real-time listeners
  useEffect(() => {
    if (enableRealtime && jobId) {
      const unsubscribe = workflowRealtimeService.setupJobWorkflowListener(jobId);
      
      return () => {
        workflowRealtimeService.stopJobWorkflowListener(jobId);
      };
    }
  }, [enableRealtime, jobId]);

  // Initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Load job workflow when jobId changes
  useEffect(() => {
    if (jobId) {
      loadJobWorkflow(jobId);
    }
  }, [jobId, loadJobWorkflow]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !jobId) return;

    const interval = setInterval(() => {
      loadJobWorkflow(jobId, true);
    }, 5 * 60 * 1000); // Refresh every 5 minutes

    return () => clearInterval(interval);
  }, [autoRefresh, jobId, loadJobWorkflow]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      workflowRealtimeService.cleanup();
    };
  }, []);

  return {
    // Data
    workflow: currentWorkflow,
    templates,
    
    // Loading states
    loading,
    templatesLoading,
    
    // Error state
    error,
    
    // Service state
    isInitialized,
    isConnected: workflowRealtimeService.initialized,
    activeListeners: workflowRealtimeService.activeListeners,
    
    // Actions
    loadJobWorkflow,
    refreshTemplates,
    clearWorkflow,
    clearError: clearWorkflowError,
    initialize,
    
    // Cache info
    lastFetched: jobId ? lastFetched[jobId] : null,
    isCacheValid: jobId ? 
      Boolean(lastFetched[jobId] && (Date.now() - lastFetched[jobId]) < 5 * 60 * 1000) : 
      false
  };
};
