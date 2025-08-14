// app/types/workflow.ts

// Global Stages (existing, no changes needed)
export interface Stage {
  id: string;
  title: string;
  order: number;
  color: string;
  // Note: No jobId - stages are global building blocks
}

// Workflow Templates (new)
export interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string; // e.g., "Engineering", "Sales", "Marketing"
  stages: TemplateStage[];
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface TemplateStage {
  stageId: string; // Reference to global stage
  order: number;
  customTitle?: string; // Override stage title if needed
  customColor?: string; // Override stage color if needed
}

// Job-Specific Workflows (new)
export interface JobWorkflow {
  id: string;
  jobId: string;
  name?: string; // Optional custom name
  templateId?: string; // Reference to template used (if any)
  stages: JobWorkflowStage[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface JobWorkflowStage {
  id: string; // Unique ID for this workflow stage instance
  stageId: string; // Reference to global stage
  jobId: string;
  order: number;
  title: string; // Can be customized from global stage
  color: string; // Can be customized from global stage
  isActive: boolean;
  createdAt: string;
}

// For Redux state management
export interface WorkflowState {
  // Global stages
  stages: Stage[];
  stagesLoading: boolean;
  stagesError: string | null;
  
  // Templates
  templates: WorkflowTemplate[];
  templatesLoading: boolean;
  templatesError: string | null;
  
  // Job workflows
  jobWorkflows: { [jobId: string]: JobWorkflow };
  jobWorkflowsLoading: boolean;
  jobWorkflowsError: string | null;
  
  // Current active workflow
  activeJobId: string | null;
  activeWorkflow: JobWorkflow | null;
}
