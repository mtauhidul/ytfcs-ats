import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { addDoc, collection, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "~/lib/firebase";
import type { Stage } from "~/types";

interface StagesState {
  stages: Stage[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
  isInitialized: boolean;
}

const initialState: StagesState = {
  stages: [],
  loading: false,
  error: null,
  lastFetched: null,
  isInitialized: false,
};

export const addStage = createAsyncThunk(
  "stages/addStage",
  async (stageData: Omit<Stage, "id">) => {
    const docRef = await addDoc(collection(db, "stages"), stageData);
    return { id: docRef.id, ...stageData };
  }
);

export const updateStage = createAsyncThunk(
  "stages/updateStage",
  async ({ id, data }: { id: string; data: Partial<Stage> }) => {
    await updateDoc(doc(db, "stages", id), data);
    return { id, data };
  }
);

export const deleteStage = createAsyncThunk(
  "stages/deleteStage",
  async (id: string) => {
    await deleteDoc(doc(db, "stages", id));
    return id;
  }
);

export const stagesSlice = createSlice({
  name: "stages",
  initialState,
  reducers: {
    setStages: (state, action: PayloadAction<Stage[]>) => {
      state.stages = action.payload;
      state.lastFetched = Date.now();
      state.isInitialized = true;
      state.loading = false;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(addStage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addStage.fulfilled, (state, action) => {
        state.loading = false;
        state.stages.push(action.payload);
      })
      .addCase(addStage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to add stage";
      })
      .addCase(updateStage.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateStage.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.stages.findIndex(stage => stage.id === action.payload.id);
        if (index !== -1) {
          state.stages[index] = { ...state.stages[index], ...action.payload.data };
        }
      })
      .addCase(updateStage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to update stage";
      })
      .addCase(deleteStage.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteStage.fulfilled, (state, action) => {
        state.loading = false;
        state.stages = state.stages.filter(stage => stage.id !== action.payload);
      })
      .addCase(deleteStage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to delete stage";
      });
  },
});

export const { setStages, clearError } = stagesSlice.actions;
export default stagesSlice.reducer;
