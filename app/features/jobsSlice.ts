// app/features/jobsSlice.ts
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "~/lib/firebase";
import type { Job } from "~/types";

interface JobsState {
  jobs: Job[];
  selectedJobs: string[];
  searchTerm: string;
  selectedStatus: string;
  selectedCategory: string;
  loading: boolean;
  error: string | null;
}

const initialState: JobsState = {
  jobs: [],
  selectedJobs: [],
  searchTerm: "",
  selectedStatus: "all",
  selectedCategory: "all",
  loading: false,
  error: null,
};

export const fetchJobs = createAsyncThunk("jobs/fetchJobs", async () => {
  const q = query(collection(db, "jobs"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Job[];
});

export const jobsSlice = createSlice({
  name: "jobs",
  initialState,
  reducers: {
    setJobs: (state, action: PayloadAction<Job[]>) => {
      state.jobs = action.payload;
    },
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;
    },
    setSelectedStatus: (state, action: PayloadAction<string>) => {
      state.selectedStatus = action.payload;
    },
    setSelectedCategory: (state, action: PayloadAction<string>) => {
      state.selectedCategory = action.payload;
    },
    setSelectedJobs: (state, action: PayloadAction<string[]>) => {
      state.selectedJobs = action.payload;
    },
    toggleJobSelection: (state, action: PayloadAction<string>) => {
      const jobId = action.payload;
      if (state.selectedJobs.includes(jobId)) {
        state.selectedJobs = state.selectedJobs.filter((id) => id !== jobId);
      } else {
        state.selectedJobs.push(jobId);
      }
    },
    clearSelection: (state) => {
      state.selectedJobs = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchJobs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchJobs.fulfilled, (state, action) => {
        state.loading = false;
        state.jobs = action.payload;
      })
      .addCase(fetchJobs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch jobs";
      });
  },
});

export const {
  setJobs,
  setSearchTerm,
  setSelectedStatus,
  setSelectedCategory,
  setSelectedJobs,
  toggleJobSelection,
  clearSelection,
} = jobsSlice.actions;

export default jobsSlice.reducer;
