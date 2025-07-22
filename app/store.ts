// app/store.ts
import { configureStore } from "@reduxjs/toolkit";
import candidateImportReducer from "./features/candidateImportSlice";
import candidatesReducer from "./features/candidatesSlice";
import interviewsReducer from "./features/interviewsSlice";
import jobsReducer from "./features/jobsSlice";

export const store = configureStore({
  reducer: {
    candidateImport: candidateImportReducer,
    candidates: candidatesReducer,
    jobs: jobsReducer,
    interviews: interviewsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
