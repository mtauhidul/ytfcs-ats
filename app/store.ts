// app/store.ts
import { configureStore } from "@reduxjs/toolkit";
import candidateImportReducer from "./features/candidateImportSlice";

export const store = configureStore({
  reducer: {
    candidateImport: candidateImportReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
