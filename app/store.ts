// app/store.ts
import { configureStore } from "@reduxjs/toolkit";
import applicationsReducer from "./features/applicationsSlice";
import candidateImportReducer from "./features/candidateImportSlice";
import candidatesReducer from "./features/candidatesSlice";
import categoriesReducer from "./features/categoriesSlice";
import interviewsReducer from "./features/interviewsSlice";
import jobsReducer from "./features/jobsSlice";
import stagesReducer from "./features/stagesSlice";
import tagsReducer from "./features/tagsSlice";

export const store = configureStore({
  reducer: {
    candidateImport: candidateImportReducer,
    candidates: candidatesReducer,
    jobs: jobsReducer,
    interviews: interviewsReducer,
    stages: stagesReducer,
    tags: tagsReducer,
    categories: categoriesReducer,
    applications: applicationsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
