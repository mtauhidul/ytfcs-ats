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

// DEPRECATED - Remove TemplateStage as it's not used in current implementation
// export interface TemplateStage {
//   stageId: string;
//   order: number;
//   customTitle?: string;
//   customColor?: string;
// }

// Job-Specific Workflows (updated to match implementation)
export interface JobWorkflow {
  id: string;
  jobId: string;
  jobTitle: string;
  stageIds: string[]; // Reference to stage IDs
  templateId?: string; // Reference to template used (if any)
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

// DEPRECATED - Remove JobWorkflowStage as stages are referenced, not duplicated
// export interface JobWorkflowStage {
//   id: string;
//   stageId: string;
//   jobId: string;
//   order: number;
//   title: string;
//   color: string;
//   isActive: boolean;
//   createdAt: string;
// }

// For Redux state management (updated to match actual implementation)
export interface WorkflowState {
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
}
