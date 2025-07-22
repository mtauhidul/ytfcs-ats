// app/features/candidatesSlice.ts
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "~/lib/firebase";
import type { Candidate } from "~/types";

interface CandidatesState {
  candidates: Candidate[];
  selectedCandidates: string[];
  searchTerm: string;
  selectedStage: string;
  selectedCategory: string;
  loading: boolean;
  error: string | null;
}

const initialState: CandidatesState = {
  candidates: [],
  selectedCandidates: [],
  searchTerm: "",
  selectedStage: "all",
  selectedCategory: "all",
  loading: false,
  error: null,
};

// Async thunk for fetching candidates
export const fetchCandidates = createAsyncThunk(
  "candidates/fetchCandidates",
  async () => {
    const q = query(collection(db, "candidates"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Candidate[];
  }
);

export const candidatesSlice = createSlice({
  name: "candidates",
  initialState,
  reducers: {
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;
    },
    setSelectedStage: (state, action: PayloadAction<string>) => {
      state.selectedStage = action.payload;
    },
    setSelectedCategory: (state, action: PayloadAction<string>) => {
      state.selectedCategory = action.payload;
    },
    setSelectedCandidates: (state, action: PayloadAction<string[]>) => {
      state.selectedCandidates = action.payload;
    },
    toggleCandidateSelection: (state, action: PayloadAction<string>) => {
      const candidateId = action.payload;
      if (state.selectedCandidates.includes(candidateId)) {
        state.selectedCandidates = state.selectedCandidates.filter(
          (id) => id !== candidateId
        );
      } else {
        state.selectedCandidates.push(candidateId);
      }
    },
    clearSelection: (state) => {
      state.selectedCandidates = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCandidates.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCandidates.fulfilled, (state, action) => {
        state.loading = false;
        state.candidates = action.payload;
      })
      .addCase(fetchCandidates.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch candidates";
      });
  },
});

export const {
  setSearchTerm,
  setSelectedStage,
  setSelectedCategory,
  setSelectedCandidates,
  toggleCandidateSelection,
  clearSelection,
} = candidatesSlice.actions;

export default candidatesSlice.reducer;
