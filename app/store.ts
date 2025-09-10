// app/store.ts
import { configureStore } from "@reduxjs/toolkit";
import applicationsReducer from "./features/applicationsSlice";
import candidateImportReducer from "./features/candidateImportSlice";
import candidatesReducer from "./features/candidatesSlice";
import categoriesReducer from "./features/categoriesSlice";
import clientsReducer from "./features/clientsSlice";
import interviewsReducer from "./features/interviewsSlice";
import jobsReducer from "./features/jobsSlice";
import stagesReducer from "./features/stagesSlice";
import tagsReducer from "./features/tagsSlice";
import workflowReducer from "./features/workflowSlice";

export const store = configureStore({
  reducer: {
    candidateImport: candidateImportReducer,
    candidates: candidatesReducer,
    clients: clientsReducer,
    jobs: jobsReducer,
    interviews: interviewsReducer,
    stages: stagesReducer,
    tags: tagsReducer,
    categories: categoriesReducer,
    applications: applicationsReducer,
    workflow: workflowReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore Firestore Timestamp serialization warnings
        ignoredActionsPaths: ['meta.arg.timestamp', 'meta.arg.createdAt', 'meta.arg.updatedAt'],
        ignoredStatePaths: [
          'jobs.jobs',
          'workflow.templates', 
          'workflow.jobWorkflows',
          'stages.stages'
        ],
        // Custom serialization check
        isSerializable: (value: any) => {
          // Allow Firestore Timestamps but convert them
          if (value && typeof value === 'object' && value.toDate) {
            return true;
          }
          return true;
        }
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
