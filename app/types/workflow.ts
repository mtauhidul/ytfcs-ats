// app/types/workflow.ts

// Global Stages (existing, updated for consistency)
export interface Stage {
  id: string;
  title: string;
  description?: string;
  order: number;
  color: string; // Should be hex color for consistency
  createdAt: string;
  updatedAt: string;
}

// Workflow Templates (updated to match implementation)
export interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string; // e.g., "Engineering", "Sales", "Marketing"
  stageIds: string[]; // Reference to stage IDs, not full stage objects
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

// Job-Specific Workflows (updated with client hierarchy)
export interface JobWorkflow {
  id: string;
  jobId: string; // Required: Job this workflow belongs to
  jobTitle: string; // Cached for display
  clientId: string; // Required: Client this workflow belongs to (through job)
  clientName?: string; // Cached for display
  stageIds: string[]; // Reference to stage IDs
  templateId?: string; // Reference to template used (if any)
  isActive: boolean; // Whether this workflow is currently active
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

// Client-Job-Workflow hierarchy helper interface
export interface ClientJobWorkflow {
  client: {
    id: string;
    name: string;
    companyName: string;
  };
  job: {
    id: string;
    title: string;
    status: string;
  };
  workflow: JobWorkflow;
  stages: Stage[];
}
//   stageId: string;
//   jobId: string;
//   order: number;
//   title: string;
//   color: string;
//   isActive: boolean;
//   createdAt: string;
// }

// For Redux state management (updated to match hierarchy)
export interface WorkflowState {
  // Client-Job-Workflow hierarchy
  clientJobWorkflows: { [clientId: string]: { [jobId: string]: JobWorkflow } };
  
  // Job-specific workflows - maps jobId to array of stages
  jobWorkflows: { [jobId: string]: Stage[] };
  
  // Templates
  templates: WorkflowTemplate[];
  templatesLoading: boolean;
  templatesError: string | null;
  
  // Loading states
  loading: boolean;
  error: string | null;
  
  // Cache management
  lastFetched: { [jobId: string]: number };
  isInitialized: boolean;
  
  // Hierarchy loading states
  clientWorkflowsLoading: { [clientId: string]: boolean };
  jobWorkflowsLoading: { [jobId: string]: boolean };
}

// Workflow creation/update interfaces
export interface CreateWorkflowRequest {
  jobId: string;
  clientId: string; // Required for hierarchy
  stageIds: string[];
  templateId?: string;
}

export interface UpdateWorkflowRequest {
  id: string;
  stageIds?: string[];
  isActive?: boolean;
}

// Workflow validation
export interface WorkflowValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
