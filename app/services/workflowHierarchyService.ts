// app/services/workflowHierarchyService.ts
import { 
  collection, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  writeBatch,
  type Unsubscribe 
} from 'firebase/firestore';
import { db } from '~/lib/firebase';
import type { 
  JobWorkflow, 
  Stage, 
  WorkflowTemplate, 
  ClientJobWorkflow,
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  WorkflowValidation
} from '~/types/workflow';
import type { Job } from '~/types/job';
import type { Client } from '~/types/client';

class WorkflowHierarchyService {
  private unsubscribers: Map<string, Unsubscribe> = new Map();

  /**
   * Get all workflows for a specific client
   */
  async getClientWorkflows(clientId: string): Promise<ClientJobWorkflow[]> {
    try {
      // Get all jobs for this client
      const jobsQuery = query(
        collection(db, 'jobs'),
        where('clientId', '==', clientId)
      );
      const jobsSnapshot = await getDocs(jobsQuery);
      const jobs = jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Job[];

      // Get workflows for each job
      const clientWorkflows: ClientJobWorkflow[] = [];
      
      for (const job of jobs) {
        const workflow = await this.getJobWorkflow(job.id);
        if (workflow) {
          const stages = await this.getWorkflowStages(workflow.stageIds);
          
          // Get client info (cached in job or fetch)
          const client = {
            id: clientId,
            name: job.clientName || 'Unknown Client',
            companyName: job.clientCompany || 'Unknown Company'
          };

          clientWorkflows.push({
            client,
            job: {
              id: job.id,
              title: job.title,
              status: job.status
            },
            workflow,
            stages
          });
        }
      }

      return clientWorkflows;
    } catch (error) {
      console.error('Error fetching client workflows:', error);
      throw error;
    }
  }

  /**
   * Get workflow for a specific job
   */
  async getJobWorkflow(jobId: string): Promise<JobWorkflow | null> {
    try {
      const workflowQuery = query(
        collection(db, 'jobWorkflows'),
        where('jobId', '==', jobId)
      );
      const snapshot = await getDocs(workflowQuery);
      
      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as JobWorkflow;
    } catch (error) {
      console.error('Error fetching job workflow:', error);
      throw error;
    }
  }

  /**
   * Get stages for a workflow
   */
  async getWorkflowStages(stageIds: string[]): Promise<Stage[]> {
    try {
      if (!stageIds || stageIds.length === 0) {
        return [];
      }

      const stages: Stage[] = [];
      
      // Fetch each stage (Firestore doesn't support 'in' with more than 10 items)
      for (const stageId of stageIds) {
        const stageDoc = await getDoc(doc(db, 'stages', stageId));
        if (stageDoc.exists()) {
          stages.push({ id: stageDoc.id, ...stageDoc.data() } as Stage);
        }
      }

      // Sort by order
      return stages.sort((a, b) => a.order - b.order);
    } catch (error) {
      console.error('Error fetching workflow stages:', error);
      throw error;
    }
  }

  /**
   * Create a new workflow for a job
   */
  async createJobWorkflow(request: CreateWorkflowRequest): Promise<string> {
    try {
      // Validate the request
      const validation = await this.validateWorkflowRequest(request);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Get job details for caching
      const jobDoc = await getDoc(doc(db, 'jobs', request.jobId));
      if (!jobDoc.exists()) {
        throw new Error('Job not found');
      }
      const job = jobDoc.data() as Job;

      // Create workflow
      const workflowData: Omit<JobWorkflow, 'id'> = {
        jobId: request.jobId,
        jobTitle: job.title,
        clientId: request.clientId,
        clientName: job.clientName,
        stageIds: request.stageIds,
        templateId: request.templateId,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'jobWorkflows'), workflowData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating job workflow:', error);
      throw error;
    }
  }

  /**
   * Update an existing workflow
   */
  async updateJobWorkflow(request: UpdateWorkflowRequest): Promise<void> {
    try {
      const updateData: any = {
        updatedAt: new Date().toISOString(),
      };

      if (request.stageIds) {
        updateData.stageIds = request.stageIds;
      }
      if (request.isActive !== undefined) {
        updateData.isActive = request.isActive;
      }

      await updateDoc(doc(db, 'jobWorkflows', request.id), updateData);
    } catch (error) {
      console.error('Error updating job workflow:', error);
      throw error;
    }
  }

  /**
   * Delete a workflow
   */
  async deleteJobWorkflow(workflowId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'jobWorkflows', workflowId));
    } catch (error) {
      console.error('Error deleting job workflow:', error);
      throw error;
    }
  }

  /**
   * Setup real-time listener for client workflows
   */
  subscribeToClientWorkflows(
    clientId: string, 
    callback: (workflows: ClientJobWorkflow[]) => void
  ): Unsubscribe {
    // Listen to jobs for this client
    const jobsQuery = query(
      collection(db, 'jobs'),
      where('clientId', '==', clientId)
    );

    const unsubscribe = onSnapshot(jobsQuery, async (snapshot) => {
      try {
        const workflows = await this.getClientWorkflows(clientId);
        callback(workflows);
      } catch (error) {
        console.error('Error in client workflows subscription:', error);
        callback([]);
      }
    });

    const key = `client-${clientId}`;
    this.unsubscribers.set(key, unsubscribe);
    return unsubscribe;
  }

  /**
   * Setup real-time listener for job workflow
   */
  subscribeToJobWorkflow(
    jobId: string,
    callback: (workflow: ClientJobWorkflow | null) => void
  ): Unsubscribe {
    const workflowQuery = query(
      collection(db, 'jobWorkflows'),
      where('jobId', '==', jobId)
    );

    const unsubscribe = onSnapshot(workflowQuery, async (snapshot) => {
      try {
        if (snapshot.empty) {
          callback(null);
          return;
        }

        const workflowDoc = snapshot.docs[0];
        const workflow = { id: workflowDoc.id, ...workflowDoc.data() } as JobWorkflow;
        
        // Get job and client details
        const jobDoc = await getDoc(doc(db, 'jobs', jobId));
        if (!jobDoc.exists()) {
          callback(null);
          return;
        }
        const job = jobDoc.data() as Job;

        const stages = await this.getWorkflowStages(workflow.stageIds);

        const clientJobWorkflow: ClientJobWorkflow = {
          client: {
            id: workflow.clientId,
            name: workflow.clientName || 'Unknown Client',
            companyName: job.clientCompany || 'Unknown Company'
          },
          job: {
            id: job.id,
            title: job.title,
            status: job.status
          },
          workflow,
          stages
        };

        callback(clientJobWorkflow);
      } catch (error) {
        console.error('Error in job workflow subscription:', error);
        callback(null);
      }
    });

    const key = `job-${jobId}`;
    this.unsubscribers.set(key, unsubscribe);
    return unsubscribe;
  }

  /**
   * Validate workflow request
   */
  private async validateWorkflowRequest(request: CreateWorkflowRequest): Promise<WorkflowValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if job exists and belongs to client
    try {
      const jobDoc = await getDoc(doc(db, 'jobs', request.jobId));
      if (!jobDoc.exists()) {
        errors.push('Job not found');
      } else {
        const job = jobDoc.data() as Job;
        if (job.clientId !== request.clientId) {
          errors.push('Job does not belong to the specified client');
        }
      }
    } catch (error) {
      errors.push('Failed to validate job');
    }

    // Check if stages exist
    if (!request.stageIds || request.stageIds.length === 0) {
      errors.push('At least one stage is required');
    } else {
      try {
        const stages = await this.getWorkflowStages(request.stageIds);
        if (stages.length !== request.stageIds.length) {
          warnings.push('Some stages were not found');
        }
      } catch (error) {
        errors.push('Failed to validate stages');
      }
    }

    // Check if workflow already exists for this job
    try {
      const existingWorkflow = await this.getJobWorkflow(request.jobId);
      if (existingWorkflow) {
        errors.push('Workflow already exists for this job');
      }
    } catch (error) {
      warnings.push('Could not check for existing workflow');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Cleanup subscriptions
   */
  unsubscribeAll(): void {
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.unsubscribers.clear();
  }

  /**
   * Unsubscribe from specific subscription
   */
  unsubscribe(key: string): void {
    const unsubscribe = this.unsubscribers.get(key);
    if (unsubscribe) {
      unsubscribe();
      this.unsubscribers.delete(key);
    }
  }
}

export const workflowHierarchyService = new WorkflowHierarchyService();
