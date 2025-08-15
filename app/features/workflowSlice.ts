import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { 
  addDoc, 
  collection, 
  deleteDoc, 
  doc, 
  getDocs,
  query,
  updateDoc, 
  where,
  orderBy,
  writeBatch
} from "firebase/firestore";
import { db } from "~/lib/firebase";
import { WorkflowErrorHandler, withWorkflowErrorHandling, validateWorkflow } from "~/lib/workflow-error-handler";
import type { Stage } from "~/types";

// Workflow Template Interface
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  stageIds: string[]; // Reference to existing stage IDs instead of duplicating stage data
  isDefault?: boolean;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

// Job Workflow Interface
export interface JobWorkflow {
  id: string;
  jobId: string;
  jobTitle: string;
  stageIds: string[]; // Reference to existing stage IDs
  templateId?: string;
  createdAt: string;
  updatedAt: string;
}

interface WorkflowState {
  // Job-specific workflows
  jobWorkflows: { [jobId: string]: Stage[] };
  
  // Workflow templates
  templates: WorkflowTemplate[];
  
  // Loading states
  loading: boolean;
  templatesLoading: boolean;
  
  // Error states
  error: string | null;
  
  // Cache management
  lastFetched: { [jobId: string]: number };
  isInitialized: boolean;
}

const initialState: WorkflowState = {
  jobWorkflows: {},
  templates: [],
  loading: false,
  templatesLoading: false,
  error: null,
  lastFetched: {},
  isInitialized: false,
};

// Async thunks for job workflow management
export const fetchJobWorkflow = createAsyncThunk(
  "workflow/fetchJobWorkflow",
  async (jobId: string, { rejectWithValue }) => {
    try {
      return await withWorkflowErrorHandling(async () => {
        // Fetch job workflow document
        const jobWorkflowQuery = query(
          collection(db, "jobWorkflows"),
          where("jobId", "==", jobId)
        );
        const jobWorkflowSnapshot = await getDocs(jobWorkflowQuery);
        
        if (jobWorkflowSnapshot.empty) {
          return { jobId, stages: [] };
        }
        
        const jobWorkflowDoc = jobWorkflowSnapshot.docs[0];
        const jobWorkflow = {
          id: jobWorkflowDoc.id,
          ...jobWorkflowDoc.data()
        } as JobWorkflow;
        
        // Fetch referenced stages
        if (jobWorkflow.stageIds.length === 0) {
          return { jobId, stages: [] };
        }
        
        const stagesQuery = query(
          collection(db, "stages"),
          where("__name__", "in", jobWorkflow.stageIds)
        );
        const stagesSnapshot = await getDocs(stagesQuery);
        
        const stages = stagesSnapshot.docs
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : data.createdAt,
              updatedAt: data.updatedAt?.toDate?.() ? data.updatedAt.toDate().toISOString() : data.updatedAt,
            };
          })
          .sort((a, b) => {
            // Sort by the order in stageIds array
            const aIndex = jobWorkflow.stageIds.indexOf(a.id);
            const bIndex = jobWorkflow.stageIds.indexOf(b.id);
            return aIndex - bIndex;
          }) as Stage[];
        
        return { jobId, stages };
      }, 'fetchWorkflow');
    } catch (error) {
      return rejectWithValue(WorkflowErrorHandler.handleError(error, 'fetchWorkflow'));
    }
  }
);

export const createJobWorkflowFromTemplate = createAsyncThunk(
  "workflow/createJobWorkflowFromTemplate",
  async ({ 
    jobId, 
    jobTitle, 
    templateId 
  }: { 
    jobId: string; 
    jobTitle: string; 
    templateId: string; 
  }, { rejectWithValue }) => {
    try {
      return await withWorkflowErrorHandling(async () => {
        // Fetch template by document ID directly
        const templateDoc = await getDocs(
          query(collection(db, "workflowTemplates"))
        );
        
        const templateSnapshot = templateDoc.docs.find(doc => doc.id === templateId);
        
        if (!templateSnapshot) {
          throw new Error("Template not found");
        }
        
        const template = {
          id: templateSnapshot.id,
          ...templateSnapshot.data()
        } as WorkflowTemplate;
        
        // Validate template data
        const validation = validateWorkflow(template, 'template');
        if (!validation.isValid) {
          throw new Error(`Invalid template: ${validation.error?.message}`);
        }
        
        // Create job workflow document that references stage IDs (no duplication)
        const jobWorkflowRef = doc(collection(db, "jobWorkflows"));
        const jobWorkflow: JobWorkflow = {
          id: jobWorkflowRef.id,
          jobId,
          jobTitle,
          stageIds: template.stageIds, // Reference existing stages, don't duplicate
          templateId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        await addDoc(collection(db, "jobWorkflows"), jobWorkflow);
        
        // Fetch the actual stage data for the UI (but don't duplicate in DB)
        const stagesQuery = query(
          collection(db, "stages"),
          where("__name__", "in", template.stageIds)
        );
        const stagesSnapshot = await getDocs(stagesQuery);
        const stages = stagesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Stage[];
        
        return { jobId, stages };
      }, 'createWorkflow');
    } catch (error) {
      return rejectWithValue(WorkflowErrorHandler.handleError(error, 'createWorkflow'));
    }
  }
);

export const createCustomJobWorkflow = createAsyncThunk(
  "workflow/createCustomJobWorkflow",
  async ({
    jobId,
    jobTitle,
    stageIds,
  }: {
    jobId: string;
    jobTitle: string;
    stageIds: string[]; // Reference existing stage IDs
  }) => {
    // Create job workflow document that references stage IDs
    const jobWorkflowRef = doc(collection(db, "jobWorkflows"));
    const jobWorkflow: JobWorkflow = {
      id: jobWorkflowRef.id,
      jobId,
      jobTitle,
      stageIds,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await addDoc(collection(db, "jobWorkflows"), jobWorkflow);
    
    // Fetch the actual stage data for the UI
    const stagesQuery = query(
      collection(db, "stages"),
      where("__name__", "in", stageIds)
    );
    const stagesSnapshot = await getDocs(stagesQuery);
    const stages = stagesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Stage[];
    
    return { jobId, stages };
  }
);

export const addStageToJobWorkflow = createAsyncThunk(
  "workflow/addStageToJobWorkflow",
  async ({
    jobId,
    stageId,
  }: {
    jobId: string;
    stageId: string; // Reference existing stage by ID
  }) => {
    // Find job workflow document
    const jobWorkflowQuery = query(
      collection(db, "jobWorkflows"),
      where("jobId", "==", jobId)
    );
    const jobWorkflowSnapshot = await getDocs(jobWorkflowQuery);
    
    if (jobWorkflowSnapshot.empty) {
      throw new Error("Job workflow not found");
    }
    
    const jobWorkflowDoc = jobWorkflowSnapshot.docs[0];
    const jobWorkflow = {
      id: jobWorkflowDoc.id,
      ...jobWorkflowDoc.data()
    } as JobWorkflow;
    
    // Add stage ID to the workflow
    const updatedStageIds = [...jobWorkflow.stageIds, stageId];
    
    await updateDoc(doc(db, "jobWorkflows", jobWorkflow.id), {
      stageIds: updatedStageIds,
      updatedAt: new Date().toISOString(),
    });
    
    // Fetch the stage data for UI
    const stageDoc = await getDocs(query(
      collection(db, "stages"),
      where("__name__", "==", stageId)
    ));
    
    const stage = stageDoc.docs[0] ? {
      id: stageDoc.docs[0].id,
      ...stageDoc.docs[0].data()
    } as Stage : null;
    
    return { jobId, stage };
  }
);

export const updateStageInJobWorkflow = createAsyncThunk(
  "workflow/updateStageInJobWorkflow",
  async ({
    jobId,
    stageId,
    updates,
  }: {
    jobId: string;
    stageId: string;
    updates: Partial<Stage>;
  }) => {
    await updateDoc(doc(db, "stages", stageId), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    
    return { jobId, stageId, updates };
  }
);

export const removeStageFromJobWorkflow = createAsyncThunk(
  "workflow/removeStageFromJobWorkflow",
  async ({
    jobId,
    stageId,
  }: {
    jobId: string;
    stageId: string;
  }) => {
    // Find job workflow document
    const jobWorkflowQuery = query(
      collection(db, "jobWorkflows"),
      where("jobId", "==", jobId)
    );
    const jobWorkflowSnapshot = await getDocs(jobWorkflowQuery);
    
    if (jobWorkflowSnapshot.empty) {
      throw new Error("Job workflow not found");
    }
    
    const jobWorkflowDoc = jobWorkflowSnapshot.docs[0];
    const jobWorkflow = {
      id: jobWorkflowDoc.id,
      ...jobWorkflowDoc.data()
    } as JobWorkflow;
    
    // Remove stage ID from the workflow
    const updatedStageIds = jobWorkflow.stageIds.filter(id => id !== stageId);
    
    await updateDoc(doc(db, "jobWorkflows", jobWorkflow.id), {
      stageIds: updatedStageIds,
      updatedAt: new Date().toISOString(),
    });
    
    return { jobId, stageId };
  }
);

export const reorderJobWorkflowStages = createAsyncThunk(
  "workflow/reorderJobWorkflowStages",
  async ({
    jobId,
    stageOrders,
  }: {
    jobId: string;
    stageOrders: { id: string; order: number }[];
  }) => {
    // Update order for all stages in batch
    const batch = writeBatch(db);
    
    stageOrders.forEach(({ id, order }) => {
      const stageRef = doc(db, "stages", id);
      batch.update(stageRef, { 
        order,
        updatedAt: new Date().toISOString(),
      });
    });
    
    await batch.commit();
    
    return { jobId, stageOrders };
  }
);

// Async thunks for workflow templates
export const fetchWorkflowTemplates = createAsyncThunk(
  "workflow/fetchWorkflowTemplates",
  async () => {
    const snapshot = await getDocs(collection(db, "workflowTemplates"));
    return snapshot.docs.map(doc => {
      const data = doc.data();
      // Convert Firestore Timestamps to ISO strings for Redux serialization
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      };
    }) as WorkflowTemplate[];
  }
);

export const createWorkflowTemplate = createAsyncThunk(
  "workflow/createWorkflowTemplate",
  async (template: Omit<WorkflowTemplate, 'id'>) => {
    const docRef = await addDoc(collection(db, "workflowTemplates"), template);
    return { id: docRef.id, ...template };
  }
);

export const deleteWorkflowTemplate = createAsyncThunk(
  "workflow/deleteWorkflowTemplate",
  async (templateId: string) => {
    await deleteDoc(doc(db, "workflowTemplates", templateId));
    return templateId;
  }
);

export const deleteJobWorkflow = createAsyncThunk(
  "workflow/deleteJobWorkflow",
  async (jobId: string, { rejectWithValue }) => {
    try {
      return await withWorkflowErrorHandling(async () => {
        // Find the job workflow document
        const jobWorkflowQuery = query(
          collection(db, "jobWorkflows"),
          where("jobId", "==", jobId)
        );
        const jobWorkflowSnapshot = await getDocs(jobWorkflowQuery);
        
        if (jobWorkflowSnapshot.empty) {
          throw new Error("Job workflow not found");
        }
        
        // Delete the job workflow document
        const jobWorkflowDoc = jobWorkflowSnapshot.docs[0];
        await deleteDoc(doc(db, "jobWorkflows", jobWorkflowDoc.id));
        
        return jobId;
      }, 'deleteJobWorkflow');
    } catch (error) {
      return rejectWithValue(WorkflowErrorHandler.handleError(error, 'deleteJobWorkflow'));
    }
  }
);

export const workflowSlice = createSlice({
  name: "workflow",
  initialState,
  reducers: {
    setJobWorkflow: (
      state,
      action: PayloadAction<{ jobId: string; stages: Stage[] }>
    ) => {
      const { jobId, stages } = action.payload;
      state.jobWorkflows[jobId] = stages;
      state.lastFetched[jobId] = Date.now();
    },
    
    clearJobWorkflow: (state, action: PayloadAction<string>) => {
      const jobId = action.payload;
      delete state.jobWorkflows[jobId];
      delete state.lastFetched[jobId];
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    setInitialized: (state) => {
      state.isInitialized = true;
    },
  },
  
  extraReducers: (builder) => {
    builder
      // Fetch job workflow
      .addCase(fetchJobWorkflow.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchJobWorkflow.fulfilled, (state, action) => {
        state.loading = false;
        const { jobId, stages } = action.payload;
        state.jobWorkflows[jobId] = stages;
        state.lastFetched[jobId] = Date.now();
      })
      .addCase(fetchJobWorkflow.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch job workflow";
      })
      
      // Create workflow from template
      .addCase(createJobWorkflowFromTemplate.fulfilled, (state, action) => {
        const { jobId, stages } = action.payload;
        state.jobWorkflows[jobId] = stages;
        state.lastFetched[jobId] = Date.now();
      })
      
      // Create custom workflow
      .addCase(createCustomJobWorkflow.fulfilled, (state, action) => {
        const { jobId, stages } = action.payload;
        state.jobWorkflows[jobId] = stages;
        state.lastFetched[jobId] = Date.now();
      })
      
      // Add stage to workflow
      .addCase(addStageToJobWorkflow.fulfilled, (state, action) => {
        const { jobId, stage } = action.payload;
        if (state.jobWorkflows[jobId] && stage) {
          state.jobWorkflows[jobId].push(stage);
        }
      })
      
      // Update stage in workflow
      .addCase(updateStageInJobWorkflow.fulfilled, (state, action) => {
        const { jobId, stageId, updates } = action.payload;
        if (state.jobWorkflows[jobId]) {
          const stageIndex = state.jobWorkflows[jobId].findIndex(s => s.id === stageId);
          if (stageIndex !== -1) {
            state.jobWorkflows[jobId][stageIndex] = {
              ...state.jobWorkflows[jobId][stageIndex],
              ...updates,
            };
          }
        }
      })
      
      // Remove stage from workflow
      .addCase(removeStageFromJobWorkflow.fulfilled, (state, action) => {
        const { jobId, stageId } = action.payload;
        if (state.jobWorkflows[jobId]) {
          state.jobWorkflows[jobId] = state.jobWorkflows[jobId].filter(
            s => s.id !== stageId
          );
        }
      })
      
      // Reorder workflow stages
      .addCase(reorderJobWorkflowStages.fulfilled, (state, action) => {
        const { jobId, stageOrders } = action.payload;
        if (state.jobWorkflows[jobId]) {
          // Update the order of stages
          state.jobWorkflows[jobId].forEach(stage => {
            const orderUpdate = stageOrders.find(o => o.id === stage.id);
            if (orderUpdate) {
              stage.order = orderUpdate.order;
            }
          });
          
          // Sort stages by order (handle undefined order values)
          state.jobWorkflows[jobId].sort((a, b) => (a.order || 0) - (b.order || 0));
        }
      })
      
      // Fetch templates
      .addCase(fetchWorkflowTemplates.pending, (state) => {
        state.templatesLoading = true;
      })
      .addCase(fetchWorkflowTemplates.fulfilled, (state, action) => {
        state.templatesLoading = false;
        state.templates = action.payload;
      })
      .addCase(fetchWorkflowTemplates.rejected, (state, action) => {
        state.templatesLoading = false;
        state.error = action.error.message || "Failed to fetch templates";
      })
      
      // Create template
      .addCase(createWorkflowTemplate.fulfilled, (state, action) => {
        state.templates.push(action.payload);
      })
      
      // Delete template
      .addCase(deleteWorkflowTemplate.fulfilled, (state, action) => {
        state.templates = state.templates.filter(t => t.id !== action.payload);
      })
      
      // Delete job workflow
      .addCase(deleteJobWorkflow.fulfilled, (state, action) => {
        const jobId = action.payload;
        delete state.jobWorkflows[jobId];
        delete state.lastFetched[jobId];
      });
  },
});

export const {
  setJobWorkflow,
  clearJobWorkflow,
  clearError,
  setInitialized,
} = workflowSlice.actions;

export default workflowSlice.reducer;
