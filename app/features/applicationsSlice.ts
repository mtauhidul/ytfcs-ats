import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { addDoc, collection, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "~/lib/firebase";
import type { Application } from "~/types";

interface ApplicationsState {
  applications: Application[];
  loading: boolean;
  error: string | null;
  selectedApplications: string[];
  searchTerm: string;
  selectedStatus: string;
}

const initialState: ApplicationsState = {
  applications: [],
  loading: false,
  error: null,
  selectedApplications: [],
  searchTerm: "",
  selectedStatus: "all",
};

export const addApplication = createAsyncThunk(
  "applications/addApplication",
  async (applicationData: Omit<Application, "id">) => {
    const docRef = await addDoc(collection(db, "applications"), applicationData);
    return { id: docRef.id, ...applicationData };
  }
);

export const updateApplication = createAsyncThunk(
  "applications/updateApplication",
  async ({ id, data }: { id: string; data: Partial<Application> }) => {
    await updateDoc(doc(db, "applications", id), data);
    return { id, data };
  }
);

export const deleteApplication = createAsyncThunk(
  "applications/deleteApplication",
  async (id: string) => {
    await deleteDoc(doc(db, "applications", id));
    return id;
  }
);

export const applicationsSlice = createSlice({
  name: "applications",
  initialState,
  reducers: {
    setApplications: (state, action: PayloadAction<Application[]>) => {
      state.applications = action.payload;
    },
    setSelectedApplications: (state, action: PayloadAction<string[]>) => {
      state.selectedApplications = action.payload;
    },
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;
    },
    setSelectedStatus: (state, action: PayloadAction<string>) => {
      state.selectedStatus = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(addApplication.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addApplication.fulfilled, (state, action) => {
        state.loading = false;
        state.applications.unshift(action.payload);
      })
      .addCase(addApplication.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to add application";
      })
      .addCase(updateApplication.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateApplication.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.applications.findIndex(app => app.id === action.payload.id);
        if (index !== -1) {
          state.applications[index] = { ...state.applications[index], ...action.payload.data };
        }
      })
      .addCase(updateApplication.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to update application";
      })
      .addCase(deleteApplication.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteApplication.fulfilled, (state, action) => {
        state.loading = false;
        state.applications = state.applications.filter(app => app.id !== action.payload);
      })
      .addCase(deleteApplication.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to delete application";
      });
  },
});

export const { 
  setApplications, 
  setSelectedApplications, 
  setSearchTerm, 
  setSelectedStatus, 
  clearError 
} = applicationsSlice.actions;
export default applicationsSlice.reducer;
